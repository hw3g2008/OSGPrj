# Admin 导师列表卡死与信息变更审核修复方案

## 背景

用户反馈：导师列表相关页面点击后卡死；此前排查路径为：导师列表 → 任一导师 → 详情 → 信息变更 tab → 通过/驳回。

## 实测证据

### 后端运行态

- `/run-backend-dev` 已按 workflow 重启本地后端。
- 健康检查：`curl -fsS http://127.0.0.1:28080/actuator/health` 返回 `{"status":"UP"}`。

### 导师列表页面异常

进入 `http://127.0.0.1:3005/users/staff` 后，浏览器控制台持续出现：

```text
TypeError: Cannot read properties of undefined (reading 'find')
    at dictLabel (.../src/views/users/staff/index.vue:35:51)
    at .../src/views/users/staff/index.vue:240:29
    at Array.map (<anonymous>)
    at Proxy.formatCompaniesTooltip (.../src/views/users/staff/index.vue:240:18)
```

点击“立即处理”打开待审核导师详情后，弹窗停留在“正在加载导师详情...”，控制台出现：

```text
TypeError: Cannot read properties of undefined (reading 'value')
    at ComputedRefImpl.fn (.../StaffDetailModal.vue:45:39)
```

### 导出接口实测

精确点击当前导师列表页面的可见“导出”按钮后：

- 请求：`GET /api/admin/staff/export?tab=normal`
- 响应：`200`
- 耗时：约 `190ms`
- 下载文件：`导师列表.xlsx`
- 页面提示：`导师列表导出成功`

因此后端导出接口本身未卡死；用户看到的“卡死”更可能是导师列表页面渲染异常造成的交互中断/假死。

### 信息变更审批接口实测

数据库当前待审核数据：

```text
request_id=317 field_key=regionArea status=pending
request_id=318 field_key=regionCity status=pending
```

调用通过接口：

```bash
PUT /admin/staff/change-request/318/approve
```

返回：

```json
{"code":400,"msg":"暂不支持该字段审核: regionCity"}
```

DB 状态保持 `pending`，未误改数据。

## 根因

### 根因 1：`useIndustryMeta()` 返回结构误用

真实返回结构：

```ts
const { meta, loading, load } = useIndustryMeta()
```

导师列表和导师详情中错误写成：

```ts
const { items: industryItems, load: loadIndustry } = useIndustryMeta()
```

导致 `industryItems` 为 `undefined`，后续调用：

```ts
industryItems.value.find(...)
dictLabel(industryItems, ...)
```

触发 Vue 渲染异常，使导师列表和详情弹窗进入不稳定状态。

影响文件：

- `osg-frontend/packages/admin/src/views/users/staff/index.vue`
- `osg-frontend/packages/admin/src/views/users/staff/components/StaffDetailModal.vue`

### 根因 2：后端审批字段映射缺失

班主任端提交资料变更时使用字段：

- `regionArea` → 对应 `osg_staff.region`
- `regionCity` → 对应 `osg_staff.city`

后端审批应用变更时只支持：

- `region`
- `city`

不支持 `regionArea/regionCity`，所以点击“通过”返回 400。

影响文件：

- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStaffServiceImpl.java`
- `ruoyi-system/src/test/java/com/ruoyi/system/service/impl/OsgStaffServiceImplChangeRequestTest.java`

## 最小修复方案

### Step 1：前端修复 `useIndustryMeta()` 解构

将两个导师页面中的：

```ts
const { items: industryItems, load: loadIndustry } = useIndustryMeta()
```

改为：

```ts
const { meta: industryItems, load: loadIndustry } = useIndustryMeta()
```

不改业务逻辑，不新增防御性 fallback。

### Step 2：后端补齐审批字段映射

在 `applyChangeToStaff` 中增加字段别名：

```java
case "region", "regionArea" -> staff.setRegion(request.getAfterValue());
case "city", "regionCity" -> staff.setCity(request.getAfterValue());
```

### Step 3：补后端单测

在 `OsgStaffServiceImplChangeRequestTest` 增加用例覆盖：

- `regionArea` 通过后写入 `staff.region`
- `regionCity` 通过后写入 `staff.city`

### Step 4：验证

建议执行：

```bash
mvn -pl ruoyi-system -Dtest=OsgStaffServiceImplChangeRequestTest test
pnpm --dir osg-frontend --filter @osg/admin typecheck
```

并用 Playwright 手工验证：

1. 进入导师列表不再出现 `industryItems undefined` 控制台错误。
2. 点击“立即处理”后详情弹窗能正常从加载态进入内容态。
3. 信息变更 tab 显示待审核项。
4. 点击“通过”不再返回 `暂不支持该字段审核: regionCity`。
5. 导师列表“导出”仍能下载 `导师列表.xlsx`。

## 需要确认

是否按以上方案修改代码？
