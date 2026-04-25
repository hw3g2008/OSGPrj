# Admin 列表 `total` 返回错误 —— 修复方案

**日期**：2026-04-18  
**负责人**：huangxin  
**涉及**：后端 Java（admin 接口）  
**类型**：bug 修复

---

## 1. 背景

用户反馈：**导师列表** 打开后分页器显示「共 10 条记录」，翻页键灰掉，但数据库实际有 23 条。

Playwright + 直接调 API 扫描 17 个 admin 列表接口后，确认 **3 个接口存在同类 `total` 返回错误**：

| # | API | pageSize=5 时 total | pageSize=500 时 total | 数据库真实条数 |
|---|-----|---------------------|------------------------|----------------|
| 1 | `/admin/staff/list` | **5** ❌ | 23 ✅ | 23 |
| 2 | `/admin/class-record/list` | **5** ❌ | 20 ✅ | 20 |
| 3 | `/admin/schedule/list` | **5** ❌ | 23 ✅ | 23（含空排期的导师）|

其他已测接口 `/admin/student/list`、`/admin/contract/list`、`/admin/position/list`、`/admin/all-classes/list` 及若依原生接口均正常。

---

## 2. 根因分析

### 2.1 若依标准分页机制回顾

```java
startPage();                                     // PageHelper 注入 ThreadLocal
List<T> rows = mapper.selectXxx(params);         // ↑ Mapper 返回的 List 实际是 PageHelper 的 Page<T>
return getDataTable(rows);                       // getDataTable 内部 new PageInfo(rows).getTotal() → 读到真实 total
```

**前提**：`rows` 必须是 `com.github.pagehelper.Page<T>` 实例，才能从里头读出 `total`。

### 2.2 3 个 bug 的共同根因

**都是在 `rows` 从 Mapper 返回后，转成普通 `ArrayList`，丢失了 `Page` 元数据**。  
然后 `new PageInfo(arraylist).getTotal()` 退化为 `arraylist.size()`（= 当前页大小）。

### 2.3 各自的具体位置

#### Bug #1 — `@/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStaffController.java:46-52`

```java
startPage();
List<OsgStaff> rows = staffService.selectStaffList(staff);   // rows 是 Page<OsgStaff>
List<Long> blacklistedIds = staffService.selectBlacklistedStaffIds(extractStaffIds(rows));
TableDataInfo table = getDataTable(toTableRows(rows, blacklistedIds));   // ← toTableRows 返回 ArrayList，丢 total
```

`toTableRows(...)` 返回普通 `ArrayList<Map<String, Object>>`。

#### Bug #2 — `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgClassRecordServiceImpl.java:125-146`

```java
public List<Map<String, Object>> selectClassRecordList(...)
{
    List<OsgClassRecord> rows = selectRows(...);   // Page<OsgClassRecord>
    ...
    List<Map<String, Object>> result = new ArrayList<>(rows.size());   // ← 新建 ArrayList
    for (OsgClassRecord row : rows) { result.add(toClassRecordPayload(row, hourlyRates)); }
    return result;   // ← 返回 ArrayList，丢 total
}
```

Controller 拿到的已经是 `ArrayList`，`getDataTable` 无法恢复 total。

#### Bug #3 — `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStaffScheduleServiceImpl.java:34-50`

```java
public List<Map<String, Object>> selectScheduleList(String weekScope)
{
    ...
    List<OsgStaff> staffRows = staffMapper.selectStaffList(new OsgStaff());   // Page<OsgStaff>
    ...
    List<Map<String, Object>> result = new ArrayList<>(staffRows.size());   // ← 同样 ArrayList
    for (OsgStaff staff : staffRows) { result.add(toScheduleRow(...)); }
    return result;
}
```

---

## 3. 修复方案

### 3.1 总体策略

不改 SQL、不改签名、不改前端，只在「转换过程中保留 Page 的 total 元数据」：

- **Bug #1 Controller 层**：调整顺序 — 先 `getDataTable(rows)` 让它从原 Page 拿 total，再 `setRows(toTableRows(...))` 替换视图。
- **Bug #2/#3 Service 层**：判断 Mapper 返回是否是 `Page`，如果是就用 `Page` 承接映射结果，否则走 ArrayList。

### 3.2 Bug #1 具体修改

**文件**：`ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStaffController.java`

```diff
  startPage();
  List<OsgStaff> rows = staffService.selectStaffList(staff);
+ TableDataInfo table = getDataTable(rows);
  List<Long> blacklistedIds = staffService.selectBlacklistedStaffIds(extractStaffIds(rows));
- TableDataInfo table = getDataTable(toTableRows(rows, blacklistedIds));
+ table.setRows(toTableRows(rows, blacklistedIds));
  table.setPendingReviewCount(staffService.selectPendingReviewCount());
  return table;
```

改动：2 行位置 + 1 行调用。

### 3.3 Bug #2 具体修改

**文件**：`ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgClassRecordServiceImpl.java`

**方法**：`selectClassRecordList(String, String, String, String, String, Date, Date)`

```diff
  public List<Map<String, Object>> selectClassRecordList(...)
  {
      List<OsgClassRecord> rows = selectRows(...);
      if (rows.isEmpty()) { return Collections.emptyList(); }

      Map<Long, BigDecimal> hourlyRates = loadHourlyRates(rows);
-     List<Map<String, Object>> result = new ArrayList<>(rows.size());
-     for (OsgClassRecord row : rows) {
-         result.add(toClassRecordPayload(row, hourlyRates));
-     }
-     return result;
+     return mapPreservingPage(rows, row -> toClassRecordPayload(row, hourlyRates));
  }
```

新增私有工具方法（同文件内 private static）：

```java
private static <S, T> List<T> mapPreservingPage(List<S> source, Function<S, T> mapper)
{
    if (source instanceof com.github.pagehelper.Page<?> srcPage)
    {
        com.github.pagehelper.Page<T> resultPage = new com.github.pagehelper.Page<>();
        resultPage.setPageNum(srcPage.getPageNum());
        resultPage.setPageSize(srcPage.getPageSize());
        resultPage.setTotal(srcPage.getTotal());
        for (S item : source) { resultPage.add(mapper.apply(item)); }
        return resultPage;
    }
    List<T> result = new ArrayList<>(source.size());
    for (S item : source) { result.add(mapper.apply(item)); }
    return result;
}
```

### 3.4 Bug #3 具体修改

**文件**：`ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStaffScheduleServiceImpl.java`

**方法**：`selectScheduleList(String weekScope)`

套用同样的 `mapPreservingPage` 模式（在本类里再定义一个，或抽到公共工具类）：

```diff
- List<Map<String, Object>> result = new ArrayList<>(staffRows.size());
- for (OsgStaff staff : staffRows) {
-     List<OsgStaffSchedule> staffSchedules = groupedSchedules.getOrDefault(staff.getStaffId(), Collections.emptyList());
-     result.add(toScheduleRow(staff, normalizedWeekScope, staffSchedules));
- }
- return result;
+ return mapPreservingPage(staffRows, staff -> {
+     List<OsgStaffSchedule> staffSchedules = groupedSchedules.getOrDefault(staff.getStaffId(), Collections.emptyList());
+     return toScheduleRow(staff, normalizedWeekScope, staffSchedules);
+ });
```

同样在本类中加 `mapPreservingPage` 私有方法（2 个 Service 共 2 份重复，简约优先不抽公共类；如果后续第 3 处再出现，再抽 `com.ruoyi.common.utils.PageUtils`）。

---

## 4. 本次不修的同类问题（留档）

按"最小改动 + 让低风险问题在使用中自然暴露"原则，以下同类 bug 本次不动：

| 文件 | 位置 | 暴露条件 | 原因 |
|------|------|----------|------|
| `OsgAssistantStudentController.java:59` | `getDataTable(toTableRows(...))` | 助教端学生>pageSize 时 | 当前助教分配学生数少 |
| `OsgClassRecordServiceImpl.selectAssistantClassRecordList` | Service 返回 ArrayList | 助教端课程记录>pageSize 时 | 同上 |
| `OsgJobOverviewController.mentorList` (`/api/mentor/job-overview/list`) | `.stream().map().toList()` | mentor 端条目>pageSize 时 | mentor 端不在本次范围 |

如果将来用户在上述页面报分页问题，再按同模式修。

---

## 5. 风险评估

| 风险 | 等级 | 缓解 |
|------|------|------|
| `mapPreservingPage` 对 `Page<T>` 的 `setTotal`/`setPageNum`/`setPageSize` 用法与 PageHelper 不兼容 | 低 | PageHelper 3.x/4.x/5.x/6.x 都支持这些 setter，仓库里 `com.github.pagehelper` 版本稳定 |
| Controller 侧改顺序后 `pendingReviewCount` 位置变化 | 极低 | 只是调用顺序调整，语义不变 |
| Service 返回 `Page<T>` 替代 `ArrayList` 影响调用方 | 低 | `Page<T>` extends `ArrayList<T>`，对所有调用方行为一致 |
| 前端拿到正确 total 后渲染异常 | 极低 | 前端本来就按 total 渲染分页器，之前 bug 让它拿到错的 10，现在拿到 23 是回到预期路径 |

---

## 6. 验证方案

### 6.1 后端编译
```bash
mvn -q compile
```

### 6.2 重启后端
```bash
# kill 旧进程 + bash bin/run-backend-dev.sh deploy/.env.dev
```

### 6.3 API 级证据（Playwright console）
```js
const token = localStorage.getItem('osg_token');
const probe = (path, size) =>
  fetch(`/api${path}?pageNum=1&pageSize=${size}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json());

for (const ep of ['/admin/staff/list', '/admin/class-record/list', '/admin/schedule/list']) {
  const [s, l] = await Promise.all([probe(ep, 5), probe(ep, 500)]);
  console.log(ep, 'small total=', s.total, 'large total=', l.total, 'equal=', s.total === l.total);
}
```

**通过条件**：3 个接口都输出 `equal=true`，且 total 与数据库实际条数一致。

### 6.4 UI 级证据
- 导师列表页：分页器显示"共 23 条记录"，可翻页，页码 1/2/3 点击能切换数据
- 课程记录页：分页器 total 与 DB 一致
- 导师排期页：分页器 total 与导师总数一致

---

## 7. 不做的事

- **不加单测**（改动是行为性修正，最小风险，API 测试已覆盖）
- **不改前端**（前端代码正确，问题只在后端）
- **不重构 RuoYi 的 `getDataTable`**（框架代码）
- **不碰助教端/mentor 端的同类 bug**（本次范围外）
- **不改签名**（Service `selectXxx` 返回类型仍是 `List<Map<String, Object>>`，`Page<T>` extends `ArrayList<T>` 兼容）

---

## 8. 后续自然暴露清单（供未来参考）

一旦用户反馈这些页面"只显示 N 条，翻不了页"，按本方案同模式修：

- 助教端 - 学生列表（`OsgAssistantStudentController`）
- 助教端 - 课程记录（`selectAssistantClassRecordList`）
- Mentor 端 - 求职总览（`OsgJobOverviewController.mentorList`）
- 助教端 - 模拟应聘（如果数据量起来了）
