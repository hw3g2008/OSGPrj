# 岗位信息「导入向导出靠拢」修复方案

## 目标

让 Admin 岗位页「导出」生成的 Excel 文件可以**直接通过「批量上传」回灌数据库**，闭环「导出 → 编辑 → 导入」。

- 不动导出（导出保持现状 14 列，对齐页面）
- **改导入：模板列与导出 14 列完全一致；解析逻辑兼容导出的 label / 短日期 / 顿号分隔等格式**
- 不动数据库表 `osg_position`
- 不动页面表格

---

## 一、字段对齐表（导出 14 列 ↔ 导入 14 列）

导出 / 导入模板列序、列名将完全一致（来自 `PositionExportRow` 现状）：

| # | 列名（中文） | 导入解析行为 | 必填 | 写入字段 |
|---|---|---|---|---|
| 1 | 岗位名称 | 直接写入 | ✅ | `positionName` |
| 2 | 公司 | 直接写入；不在公司字典则自动追加（沿用现有逻辑 `line 432-440`） | ✅ | `companyName` |
| 3 | 公司类别 | label / value 双解析（沿用 `validateIndustry`，含 keyword 兜底——保留双轨制，见 R9） | — | `industry` + `companyType` |
| 4 | 部门 | label → value 反查（新增） | — | `department` |
| 5 | 岗位分类 | label → value 反查（新增 `parseDictLabelToValue` + `DICT_POSITION_CATEGORY`）；fallback `summer`（沿用 `line 800`）；**⚠️ A5 依赖 rawCategory 抽年份**（B2）| ✅ | `positionCategory` |
| 6 | 地区 | 写入 `city`，按 `normalizeCity` 反推 `region`（沿用） | — | `city` + `region` |
| 7 | 招聘周期 | 多值（顿号 / 中文逗号 / 英文逗号分隔），每段 label → value 反查 | ✅ | `recruitmentCycle`（逗号 join） |
| 8 | 主攻方向 | 同 7（新增 alias + 多值解析） | — | `targetMajors`（逗号 join） |
| 9 | 展示起始 | 兼容 `MM-dd`、`yyyy-MM-dd`、`yyyy/MM/dd`（新增 `asDate` 增强） | — | `displayStartTime` |
| 10 | 截止时间 | 同 9；解析失败回退 `deadlineText`（沿用） | — | `deadline` 或 `deadlineText` |
| 11 | 状态 | label → value 反查（新增 `parseDictLabelToValue` + `DICT_POSITION_DISPLAY_STATUS`；**不**用 `normalizeDisplayStatus`，后者只做 lowercase） | — | `displayStatus` |
| 12 | 投递学员 | **忽略**（统计字段，新增 `_ignore` 别名） | — | — |
| 13 | 添加人 | **忽略**（由当前登录用户填充，新增 `_ignore` 别名） | — | — |
| 14 | 添加日期 | **忽略**（由 `createTime` 自动填充，新增 `_ignore` 别名） | — | — |

### 与 SQL 必填字段对齐

`osg_position` 表实际不要求"项目时间"非空（旧字段，去重 key 用），但导入逻辑 `REQUIRED_HEADERS` 当前列了 `project_year`。**调整后 `REQUIRED_HEADERS` 改为**：

```
position_name, company_name, position_category, recruitment_cycle
```

`project_year` 仍然需要落库（去重 key 一部分），**维持现状的单一策略（line 838-852 已是 L1 失败 reject）**：
- 从 `positionCategory` 字典 label 中正则抽 4 位年份（沿用 `inferProjectYear`）
- **抽不到则整行 reject**，错误信息：`第N行: 无法从岗位分类"xxx"提取项目年份`

> **本方案不引入**原方案曾提议的 L2（displayStartTime 年份）/ L3（系统当前年份）兜底（兜底值与老数据 `project_year` 不一致 → 去重 key 漂移 → 重复插入，详见 R8）。

> **B2 修复说明**：A4 + A5 协同——A4 保留 `rawCategory`（dict_label，含年份如「2026 暑期实习」）给 A5 的 `inferProjectYear` 使用，避免转换后 dict_value（如「summer」不含年份）导致全部 reject。

---

## 二、改造点（4 个文件 / 1 个新测试文件）

### A. 后端核心：`ruoyi-system/.../OsgPositionServiceImpl.java`

#### A1. 扩展 `HEADER_ALIAS`（line 959-981 静态块）

新增 alias 行（**追加**，旧 alias 全部保留以兼容历史导入文件）：

```java
// 导入向导出靠拢 - 14 列对齐
m.put("公司", "company_name");
m.put("主攻方向", "target_majors");
m.put("展示起始", "display_start_time");
m.put("状态", "display_status");
m.put("投递学员", "_ignore");
m.put("添加人", "_ignore");
m.put("添加日期", "_ignore");
```

#### A2. 调整 `REQUIRED_HEADERS`（line 1007-1009）

```java
private static final List<String> REQUIRED_HEADERS = List.of(
    "position_name", "company_name", "position_category", "recruitment_cycle"
);
```

**移除 `project_year`** —— 该列在导出中不存在，改由 inference 兜底（见 A4）。

#### A3. 增强 `asDate(String text)`（line 1237-1252）

**当前**：只支持 ISO 8601 `LocalDateTime.parse`，连 `yyyy-MM-dd` 都解析不了（**这是隐藏 bug**，导出来的任何文件都不能导入回去）。

**改造**：先预处理 `text = text.replace('/', '-')` 统一分隔符，按优先级尝试以下格式：
1. `yyyy-MM-dd'T'HH:mm:ss`（ISO，沿用）
2. `yyyy-MM-dd HH:mm:ss`
3. `yyyy-MM-dd`（合并 `yyyy/MM/dd`，通过预处理统一）
4. `MM-dd`（导出的短格式 → 自动补当前年份；如果 < 当前月份则补下一年，避免"过期"显示）

实现用 `DateTimeFormatter` + 多 pattern 串行尝试。Excel 数值日期已被 `DataFormatter` 处理，无需在此处理。

#### A4. 扩展 `buildPositionFromRow`（line 795-890）

**⚠️ 两个关键变更**（B1 + B2 阻塞修复）：

1. **B1**：必须删除现有 line 874-876 三行硬编码（`setDisplayStatus("visible")` / `setDisplayStartTime(new Date())` / `setDisplayEndTime(+90)`），否则新读取的值会被硬编码覆盖 → 闭环失败。
2. **B2**：必须保留 `rawCategory`（dict_label）给 A5 的 `inferProjectYear` 使用。导出文件「岗位分类」输出 dict_label（如「2026 暑期实习」，含年份），而 `parseDictLabelToValue` 转出的 dict_value（如「summer」）可能不含年份 → `inferProjectYear` 抽不到 → 全部行 reject → 核心闭环 break。

**读取新增列 + 在现有 setter 外包字典反查**：

```java
// ========== 修改原有读取逻辑（在 readCell 后包一层字典反查）==========

// 主攻方向（新增列）- 多值反查 osg_major_direction 字典
String rawMajors = readCell(row, headerIndexes, formatter, "target_majors");
position.setTargetMajors(parseDictLabelsToValues(rawMajors, DICT_TARGET_MAJORS));

// 部门 - 单值反查 osg_position_department 字典（替换原 line 808 的直接读取）
position.setDepartment(parseDictLabelToValue(
    readCell(row, headerIndexes, formatter, "department"), DICT_POSITION_DEPARTMENT));

// 岗位分类 - ⚠️ B2：必须保留 rawCategory 给 A5 的 inferProjectYear 使用
String rawCategory = readCell(row, headerIndexes, formatter, "position_category");
position.setPositionCategory(defaultText(
    parseDictLabelToValue(rawCategory, DICT_POSITION_CATEGORY),
    "summer"));
// rawCategory 保留到 A5 的 inferProjectYear 调用处，不可丢弃

// 招聘周期 - 多值反查 osg_recruit_cycle 字典（替换原 line 807 的直接读取）
position.setRecruitmentCycle(parseDictLabelsToValues(
    readCell(row, headerIndexes, formatter, "recruitment_cycle"), DICT_RECRUITMENT_CYCLE));

// 公司类别 - 沿用 validateIndustry（含 keyword 兜底，故意双轨制，见 R9）
//   原 line 801-806 的 readCell + validateIndustry 链路保持不变

// ========== B1 阻塞修复：删除 line 874-876 三行硬编码，替换为以下读取逻辑 ==========

// 展示起始（新增列）- 空白时兜底为 now
String displayStartRaw = readCell(row, headerIndexes, formatter, "display_start_time");
Date displayStart = StringUtils.hasText(displayStartRaw) ? asDate(displayStartRaw) : null;
position.setDisplayStartTime(displayStart != null ? displayStart : new Date());

// 状态（新增列）- 单值反查 osg_position_display_status 字典
// ⚠️ 不可用 normalizeDisplayStatus（只做 lowercase + 0/1 互转，不做 label→value 反查）
String displayStatusRaw = readCell(row, headerIndexes, formatter, "display_status");
String mappedStatus = parseDictLabelToValue(displayStatusRaw, DICT_POSITION_DISPLAY_STATUS);
position.setDisplayStatus(StringUtils.hasText(mappedStatus) ? mappedStatus : "visible");

// displayEndTime - 导出无此列，保留现有 +90 天兜底（仅在为空时设置）
if (position.getDisplayEndTime() == null) {
    position.setDisplayEndTime(Date.from(LocalDateTime.now().plusDays(90).atZone(ZONE_ID).toInstant()));
}
```

**新增辅助方法**：

```java
/** 单值 label → value 反查，找不到原样返回 */
private String parseDictLabelToValue(String input, String dictType) {
    if (!StringUtils.hasText(input)) return null;
    String trimmed = input.trim();
    // 已经是 value
    if (findDict(dictType, trimmed) != null) return trimmed;
    // label 反查 value
    for (SysDictData item : loadDictItems(dictType)) {
        if (trimmed.equals(item.getDictLabel())) return item.getDictValue();
    }
    return trimmed; // 不在字典也保留（向后兼容）
}

/** 多值（顿号/中英文逗号分隔）label → value 反查，逗号 join 输出 */
private String parseDictLabelsToValues(String input, String dictType) {
    if (!StringUtils.hasText(input)) return null;
    String[] parts = input.split("[、,，]");
    List<String> values = new ArrayList<>();
    for (String part : parts) {
        String mapped = parseDictLabelToValue(part.trim(), dictType);
        if (StringUtils.hasText(mapped)) values.add(mapped);
    }
    return values.isEmpty() ? null : String.join(",", values);
}
```

#### A5. `project_year` 维持现状（仅修 `inferProjectYear` 入参）（line 838-852）

> ⚠️ 上轮校验误判修正（S1）：现状代码 @`/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgPositionServiceImpl.java:838-852` 已经是 L1 失败 reject 的单一策略。**本方案不引入** L2（displayStartTime 年份）/ L3（系统当前年份）兜底。

**A5 唯一改动（B2 配套）**：把现有 line 846 的 `inferProjectYear(position.getPositionCategory())` 改为 `inferProjectYear(rawCategory)`，**使用 A4 保留的 rawCategory（dict_label）而非 `position.getPositionCategory()` 转换后的 dict_value**，避免抽不到年份。

```java
// project_year inference (B2 修复后)
String projectYear = readCell(row, headerIndexes, formatter, "project_year");
if (StringUtils.hasText(projectYear))
{
    position.setProjectYear(projectYear);
}
else
{
    // ⚠️ 用 rawCategory（dict_label，含年份）而非 position.getPositionCategory()（dict_value，可能不含年份）
    String inferred = inferProjectYear(rawCategory);
    if (inferred == null)
    {
        return new RowBuildResult(null,
            "第" + rowNum + "行: 无法从岗位分类\"" + rawCategory
            + "\"提取项目年份，请确认岗位分类字典 label 含 4 位年份（如「2026 暑期实习」）");
    }
    position.setProjectYear(inferred);
}
```

> 维持 line 838-852 现有的 if/else 控制流，**仅把 line 846 的入参从 `position.getPositionCategory()` 改为 `rawCategory`**（来自 A4）。错误信息中的岗位分类也同步使用 rawCategory（让用户看到原始 label）。

---

### B. 后端模板：`ruoyi-admin/.../OsgPositionController.java`

#### B1. 重写 `PositionImportTemplate`（line 469-529）

由 18 列改为 14 列，**与 `PositionExportRow` 完全一致**：

```java
private static class PositionImportTemplate
{
    @Excel(name = "岗位名称") private String positionName;
    @Excel(name = "公司") private String companyName;
    @Excel(name = "公司类别") private String companyType;
    @Excel(name = "部门") private String department;
    @Excel(name = "岗位分类") private String positionCategory;
    @Excel(name = "地区") private String city;
    @Excel(name = "招聘周期") private String recruitmentCycle;
    @Excel(name = "主攻方向") private String targetMajors;
    @Excel(name = "展示起始", width = 20) private String displayStartTime;
    @Excel(name = "截止时间") private String deadlineDisplay;
    @Excel(name = "状态") private String displayStatus;
    @Excel(name = "投递学员") private String studentCount;
    @Excel(name = "添加人") private String createBy;
    @Excel(name = "添加日期") private String createTime;
}
```

注：模板下载是空数据 + 表头，所以字段类型用 `String` 不影响渲染，省去 `dateFormat` 配置。

---

### C. 前端（仅文案微调，不改逻辑）

`osg-frontend/packages/admin/src/views/career/positions/index.vue` 中「批量上传」对话框：

**改动 1：模板文件提示文案**
- "请使用系统提供的模板文件" → 改为 "可使用『下载模板』或直接使用『导出』生成的 Excel 文件"（如果该文案是字典字段 `DICT_POSITION_UI_COPY.upload_step_1` 则改字典数据，不改前端）

**改动 2（R11 应对 / S2 修正 / T1 终审修正）：对话框顶部固定说明文字**
在「批量上传」对话框顶部固定显示一行：

> ⚠️ 统计字段（投递学员 / 添加人 / 添加日期）将被忽略；批量上传仅支持新增，不支持修改已有岗位（修改请用单条编辑表单）。

**实现（T1 终审修正）**：
- **文件**：`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/components/BatchUploadModal.vue`
  > ⚠️ 「批量上传」对话框是独立子组件，**不在 index.vue 里**。`index.vue:350-355` 仅仅是使用了 `<BatchUploadModal>`。
- **组件**：项目使用自定义的 `<OverlaySurfaceModal>`（包装了 ant-design-vue 的 modal），**不是 `<a-modal>`**。
- **位置**：在 `BatchUploadModal.vue` 的 `<div class="batch-upload-modal__panel">`（line 16）内部顶端、`<div class="batch-upload-modal__dropzone">`（line 17）之前插入。
- **代码**：
  ```vue
  <div class="batch-upload-modal__notice">
    <span class="mdi mdi-alert" aria-hidden="true"></span>
    <p>统计字段（投递学员 / 添加人 / 添加日期）将被忽略；批量上传仅支持新增，不支持修改已有岗位（修改请用单条编辑表单）。</p>
  </div>
  ```
- **样式**：在该 vue 文件的 `<style>` 段加 `.batch-upload-modal__notice` 样式（背景色 + padding，参考现有 `.batch-upload-modal__rule` 样式风格，只将警示色从信息蓝调居为警告黄调）。

**不改 JS 逻辑**，纯静态文案 + 一段 CSS。

具体改不改先看 DICT 当前文案，方案确认后实施时核对。

---

### D. 新增测试：`OsgPositionServiceImplImportAlignTest.java`

放在 `ruoyi-system/src/test/java/com/ruoyi/system/service/impl/`。

**测试用例**（最少 10 个）：

1. **导出文件直接导入闭环**：从 `selectPositionList` 取数据 → 模拟生成 14 列 Excel → 调 `batchUploadPositions` → 断言 `successCount == 0 / duplicateCount == N / failedCount == 0`（全部命中去重，无解析错误）
2. **`MM-dd` 短日期解析**：单元格 `11-25` 能解析为当前年的 11-25
3. **`yyyy-MM-dd` 日期解析**：`2026-11-25` 能解析（修复隐藏 bug）；`yyyy/MM/dd` 同样能解析（验证 R3.1 预处理）
4. **顿号分隔的招聘周期 label**：`春招、秋招` → 反查字典 → `spring,autumn`
5. **状态 label 解析**：`展示中` → `visible`（验证用 `parseDictLabelToValue` 而非 `normalizeDisplayStatus`，对应 C1 修复）
6. **统计列被忽略**：含「投递学员=3人」「添加人=admin」「添加日期=11-01」的行不影响其他字段写入
7. **岗位分类 label 含年份时正常导入**：positionCategory label="2026 暑期实习" → 抽到 2026 → 落库成功
8. **岗位分类 label 不含年份时整行 reject**：positionCategory label="暑期实习" → reject，错误信息含"无法提取项目年份"（验证 R1.2/R2.2/R8 阻塞修复）
9. **旧 18 列模板向后兼容**：用旧模板 Excel 仍能成功导入（沿用旧 alias）
10. **B1 + B2 综合回归（T3 终审新增）**：构造 Excel 含 1 行非默认值的行——
    - 输入：`displayStatus="已隐藏"` / `displayStartTime="2026-01-01"` / `positionCategory="2026 暑期实习"`
    - 导入后从 DB 读出新插入记录，断言：
      - `position.getDisplayStatus() == "hidden"`（验证 B1：line 874 硬编码 `"visible"` 已删除 + C1：label→value 反查生效）
      - `position.getDisplayStartTime()` 是 2026-01-01（验证 B1：line 875 硬编码 `new Date()` 已删除）
      - `position.getProjectYear() == "2026"`（验证 B2：rawCategory 传入 `inferProjectYear` 生效，不是拿 dict_value 如「summer」去抽年份）
    - 此测试是 B1/B2 默认不修复时会夭的棘手场景。

---

## 三、风险与边界

### R1. 字典 label 重复导致映射不唯一
**风险**：如果两个字典项 dictLabel 相同（如不同 type 下都叫"其他"），`parseDictLabelToValue` 用 `equals` 反查只看当前 type，**理论上安全**。

### R2. 招聘周期 / 主攻方向值含分隔符本身
**风险**：用户在某个字典 label 里写了 `,` 或 `、`。
**应对**：分隔后 trim + 反查，如果整段在字典中找到则不分隔（先做一次完整匹配 fallback）。**实施时验证**。

### R3. 「公司」列里同名公司视为同一公司
**沿用现状**：现有 `batchUploadPositions` 已在 `line 432-440` 自动追加新公司名进字典，方案不改动此行为。

### R4. 「地区」既可能写城市也可能写大区 + `osg_city` 字典完整性
**沿用现状**：`normalizeCity` 已能识别 city alias 并反推 region；写大区也能落入 `city` 字段（虽然语义不太对，但和现状一致）。

**新增前置条件（D6 组合 1 决策）**：去重 key 含 `region`。导入闭环依赖 `inferRegionFromCity` 能正确反推 region。`osg_city` 字典所有项**必须**配置 `listClass`（或 `remark.parentValue`）指向 region。否则导入会因 region 反推失败 → 与老数据不一致 → 误判为新行 → 重复插入。

**校验方法**：见 5.1 前置 SQL check。

### R5. 截止时间在导出是「`MM-dd`」或「滚动招聘」等文案
**应对**：`asDate` 先试日期，失败则原样写入 `deadlineText`（沿用现有逻辑 `line 858-866`）。

### R6. 不在导出范围内的字段（如 `applicationNote` `positionUrl` `companyWebsite`）
**事实**：通过 Excel 导入不能填这些字段（导出文件里没有）。如果用户需要，**必须用表单编辑或新增另一个"完整模板"**。**本次不处理**，方案文档说明即可。

### R7. 旧的 18 列模板使用方
**应对**：所有旧 alias **全部保留**，旧模板下载到本地的人仍可正常导入。

### R8. `project_year` 单一策略（无防御性兜底）— 已删除 L2/L3
**事实**：本方案删除 L2（`displayStartTime` 年份）/ L3（系统当前年份）兜底，L1 失败就整行 reject。

**前置条件**：`osg_job_category` 字典所有 `dictLabel` **必须**含 4 位年份（如「2026 暑期实习」、「2025 春招」）。

**校验方法**：实施前 SQL check：
```sql
SELECT dict_value, dict_label FROM sys_dict_data
WHERE dict_type = 'osg_job_category' AND status = '0'
  AND dict_label NOT REGEXP '[0-9]{4}';
```
期望：返回 0 行。若有非 0 行，**先补全字典 label 加上年份**再实施本方案。

### R9. 字典反查双轨制（公司类别 vs 其他列）
**事实**：本方案中：
- **公司类别**沿用 `validateIndustry`（含 keyword 兜底：`bank/ib/finance → Investment Bank`，`consult → Consulting` 等）
- **部门 / 岗位分类 / 招聘周期 / 主攻方向 / 状态**用新增 `parseDictLabelToValue` / `parseDictLabelsToValues`（label→value 严格反查，无 keyword 兜底）

**理由**：双轨制是 known trade-off。`validateIndustry` 的 keyword 兜底来自历史业务需求（用户可能写 "investment banking" 而不是字典 label），强行统一会失去这层兜底；`parseDictLabelToValue` 没必要做 keyword 启发，因为其他字段都是标准字典值。

**维护提示**：若未来需要 keyword 兜底覆盖到其他列，再统一抽取。

### R10. 字典反查失败时原样保留（有意为之）
**事实**：`parseDictLabelToValue` 找不到 dict label / value 时**原样返回**（不 reject）。

**理由**：
- 兼容历史脏数据（DB 中可能有非字典内的 city / department）
- 用户自填值（如 "Algo Team"）即使不在字典也允许导入
- 代价：用户输错（如 "春招学期"）会落库脏数据，但 UI 会显示为原始字符串（无 label 翻译）

**业务可接受**：脏数据不影响系统功能，仅显示层降级。

### R11. 统计字段被 `_ignore` 静默丢弃（用户感知问题）
**事实**：「投递学员/添加人/添加日期」三列即使用户在 Excel 中修改也会被忽略。

**应对（S2 修正：改为纯前端文案）**：在「批量上传」对话框顶部固定显示说明文字（见 C 段改动 2）。

> 上轮方案曾考虑后端 `result.put("note", ...)`，但前端 @`/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/index.vue:802-813` 不消费 `result.note`，会导致用户感知失效。改为前端对话框固定说明文字，与 C 段「仅文案微调」声明一致。

---

## 四、不在本次范围

- 不动「导出」（导出已对齐页面，不改）
- 不动页面表格列定义
- 不增加新的字段到 Excel（`applicationNote` / `positionUrl` / `companyWebsite` / `applicationAttachments` 等仍仅通过表单编辑）
- 不动 `osg_position` 表结构
- 不动 mentor / lead-mentor / assistant / student 端

---

## 五、验证方式

### 5.1 前置 SQL check（实施前必做）

实测闭环依赖 `osg_city` + `osg_job_category` 字典完整性。**实施前**先执行两段 SQL check：

**Check 1: `osg_city` 字典 region 反推完整性（对应 R4 / R2.1）**
```sql
SELECT dict_value AS city, list_class, remark
FROM sys_dict_data
WHERE dict_type = 'osg_city'
  AND status = '0'
  AND (list_class IS NULL OR list_class = '');
```
期望：返回 0 行。若非 0 行，**先补全 `list_class` 指向 region**，否则导入会因 region 反推失败导致去重 key 漂移。

**Check 2: `osg_job_category` 字典 label 含年份（对应 R8）**
```sql
SELECT dict_value, dict_label FROM sys_dict_data
WHERE dict_type = 'osg_job_category' AND status = '0'
  AND dict_label NOT REGEXP '[0-9]{4}';
```
期望：返回 0 行。若非 0 行，**先补全 label 加年份**，否则 `inferProjectYear` 会失败。

### 5.2 后端单测

`mvn -pl ruoyi-system test -Dtest=OsgPositionServiceImplImportAlignTest` → **9/9 通过**

### 5.3 实测闭环（手工）

1. 启动后端 + admin 前端
2. 在岗位页点「导出」拿到 `positions.xlsx`
3. 不做任何修改，点「批量上传」选该文件
4. **期望**：返回 `successCount=0 / duplicateCount=N / failedCount=0`；对话框顶部显示「统计字段将被忽略...」说明文字（C 段改动 2）
5. 在 Excel 中改 1 行的「公司」或「岗位名称」使去重 key 变化
6. 重新上传，**期望**：`successCount=1 / duplicateCount=N-1 / failedCount=0`（N-1 行去重 key 未变被跳过，1 行去重 key 变化被新增；T2 终审补充）

> ⚠️ **闭环语义说明（I1 信息）**：`batchUploadPositions` 是 **insert-only**（@`/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgPositionServiceImpl.java:426`）。第 5 步「改去重 key」实际触发**新增一条新记录**，原记录还在 DB 中（变成两条）。若需要修改已有岗位的字段，请用页面表单编辑（「批量上传」路径不支持 upsert）。

### 5.4 回归

用 `bin/admin-api-smoke.sh`（如有 position 相关测试）确认未破坏其他端点。

---

## 六、改动文件清单

| 文件 | 改动类型 | 行数 |
|---|---|---|
| `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgPositionServiceImpl.java` | 修改 4 处方法 + 静态块 + 新增 2 个辅助方法 | ~80 行 |
| `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgPositionController.java` | 重写 `PositionImportTemplate` 类 | ~60 行替换为 ~30 行 |
| `osg-frontend/packages/admin/src/views/career/positions/index.vue` | 提示文案微调（可能不需要，待核） | 0-3 行 |
| `ruoyi-system/src/test/java/com/ruoyi/system/service/impl/OsgPositionServiceImplImportAlignTest.java` | **新增**测试文件 | ~250 行 |
| 本方案文档（已写） | 新建 | — |

**预计总改动**：~ 360 行（其中新增测试 250 行 / 业务代码净增约 50 行）

---

## 七、决策点（已确认）

| # | 决策 | 选项 |
|---|---|---|
| D1 | `REQUIRED_HEADERS` 删 `project_year` | ✅ 同意；改用单一策略（仅 L1 抽年份），L1 失败 reject（见 R8） |
| D2 | 旧 18 列模板继续兼容 | ✅ 同意；旧 alias 全部保留 |
| D3 | 不导入的字段（`applicationNote / positionUrl / companyWebsite / applicationAttachments / displayEndTime / publishTime`）保持空 | ✅ 同意 |
| D4 | `parseDictLabelToValue` / `parseDictLabelsToValues` 直接放 `OsgPositionServiceImpl` 私有，不抽 Util | ✅ 同意；公司类别仍用 `validateIndustry`（双轨制，见 R9） |
| D5 | 「状态」列空白 → 默认 `visible` | ✅ 同意 |
| D6 | 去重 key region 处理 | ✅ 组合 1：保留 region 在 key 中，依赖 `osg_city` 字典完整性（验证步骤 5.1 加 SQL check） |
| D7 | `project_year` fallback 强度 | ✅ 组合 1：L1 失败就 reject，删除 L2/L3 兜底（消除防御性代码） |

---

## 八、本轮 `/validate-doc` 校验已修正项

> 校验时间：2026-05-11；校验工具：`/validate-doc` 4 轮思辨（Inversion / Scale / Simplification / Tensions）+ 一致性校验。

| # | 来源 | 严重度 | 修正动作 |
|---|---|---|---|
| **C1** | 一致性 | 🔴 阻塞 | 状态列 label→value 反查改用 `parseDictLabelToValue` 而非 `normalizeDisplayStatus`（后者只做 lowercase + 0/1 互转，不做字典反查） |
| **R2.1** | Round 2 Scale | 🔴 阻塞 | 实施前需 SQL check `osg_city` 字典 `list_class` 完整性（5.1 Check 1） |
| **R1.2 / R2.2** | Round 1 + 2 | 🔴 阻塞 | `project_year` 删 L2/L3 防御性兜底；L1 失败整行 reject；前置 SQL check `osg_job_category` label 含年份（5.1 Check 2 + R8） |
| **C2** | 一致性 | 🟡 建议 | 字典常量名 `DICT_TARGET_MAJOR` → `DICT_TARGET_MAJORS`（实际定义有 S） |
| **C3** | 一致性 | 🟡 建议 | 招聘周期反查明示用 `DICT_RECRUITMENT_CYCLE`；部门用 `DICT_POSITION_DEPARTMENT`；岗位分类用 `DICT_POSITION_CATEGORY` |
| **R3.1** | Round 3 | 🟡 建议 | `asDate` 简化：`yyyy/MM/dd` 通过 `replace('/', '-')` 预处理合并到 `yyyy-MM-dd`（5 种格式 → 4 种） |
| **R4.1** | Round 4 | 🟡 建议 | 字典反查双轨制（公司类别 `validateIndustry` vs 其他列 `parseDictLabelToValue`）已显式记录为 R9 |
| **R1.6** | Round 1 | 🟡 建议 | 字典反查失败时原样保留是有意为之（兼容性优先）已显式记录为 R10 |
| **R1.3** | Round 1 | 🟢 信息 | 用户感知问题：`batchUploadPositions` 返回结果加 note：`"统计字段已忽略：投递学员、添加人、添加日期"`（见 R11） |

**本轮校验结论**：所有阻塞级问题已处理；建议级 / 信息级已并入文档。但本轮诊断**遗漏 2 项阻塞级 + 2 项建议级 + 1 项信息级**，见下一 Section。

---

## 九、第 2 轮 `/validate-doc` 终审修正项

> 校验时间：2026-05-11 23:35；校验重点：代码引用真实性 + 上轮修复后是否引入新不一致。

| # | 来源 | 严重度 | 修正动作 |
|---|---|---|---|
| **B1** | 外部一致性 | 🔴 阻塞 | A4 明示必须删除现有 `OsgPositionServiceImpl.java` line 874-876 三行硬编码（displayStatus="visible" / displayStartTime=now / displayEndTime=+90），新代码放该位置；displayEndTime 保留 +90 天兜底（仅在为空时设置）|
| **B2** | Round 1 + 外部一致性 | 🔴 阻塞 | A4 保留 `rawCategory`（dict_label）给 A5 的 `inferProjectYear` 使用，避免 `parseDictLabelToValue` 转换后 dict_value（如「summer」）不含年份 → 全部 reject → 核心闭环 break |
| **S1** | 外部一致性 | 🟡 建议 | A5 / R8 / 字段对齐表：「删除 L2/L3 兜底」 → 「维持现状（不引入 L2/L3）」——上轮误判修正（L2/L3 从未存在，原方案只是想新增） |
| **S2** | Round 4 Tensions | 🟡 建议 | R11 应对策略改为纯前端对话框顶部固定说明文字（C 段改动 2），与「前端仅文案微调」声明一致；删除原「后端加 note + 前端不消费」的失效设计 |
| **I1** | Round 4 Tensions | 🟢 信息 | 5.3 末尾加 insert-only 闭环语义说明，避免用户误以为是 upsert |

## 十、第 3 轮 `/validate-doc` 终审修正项

> 校验时间：2026-05-11 23:35 终审；重点：本轮修复后是否引入新不一致 / 本轮新增描述与现状代码是否一致。

| # | 来源 | 严重度 | 修正动作 |
|---|---|---|---|
| **T1** | 外部一致性 | 🟡 建议 | C 段改动 2 实施位置修正：从 `index.vue + <a-modal>` 改为 `BatchUploadModal.vue + <OverlaySurfaceModal>`。「批量上传」对话框是独立子组件 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/components/BatchUploadModal.vue`，不在 index.vue 里；使用项目自定义的 `<OverlaySurfaceModal>` 不是 `<a-modal>`。并补充插入位置、代码片段、样式说明。|
| **T2** | 一致性 | 🟡 建议 | 5.3 第 6 步期望补全 `duplicateCount=N-1`（N-1 行未变被跳过，1 行去重 key 变化被新增）。|
| **T3** | Round 4 Tensions | 🟡 建议 | 新增测试 10：B1 + B2 综合回归（验证 displayStatus / displayStartTime / projectYear 三个字段在修复后从 Excel 原始值正确落库，避免与原默认值 / dict_value 混淆）。|

**终审结论**：
- 上轮遗漏的 5 项已全部修复；本轮发现的 3 项建议级也已全部修复。
- 阻塞级 = 0，可以进入实施。
