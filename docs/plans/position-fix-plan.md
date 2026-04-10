# 岗位信息修复方案 v6

> 经过 5 轮 Codex 审查，累计修正 20 个问题。

## 0. 修正记录

### v1 → v2

| # | v1 错误 | v2 修正 |
|---|---------|---------|
| R1 | 把脏数据归因于 `buildPositionFromRow` | 真实来源是历史脚本 `scripts/import_excel_data.py:191-244` |
| R2 | 把 "公司行业" 映射到 `company_name` | Excel "公司行业" 是行业名，不能覆盖 `company_name` |
| R3 | 把 `region`/`project_year` 当可选 | 两者是全链路必填字段 |
| R4 | 导出和下载模板混为一改 | 需拆成两个 DTO |
| R5 | "清空重导"默认无关联 | 必须先检查 `osg_job_application` 外键关联 |

### v2 → v3

| # | v2 问题 | v3 修正 |
|---|---------|---------|
| R6 | `company_name` 用 industry 占位 | 导入模板必须包含"公司名称"列，缺列整批拒绝 |
| R7 | "地区"选填但 city 是硬约束 | 空值/非法值 → 失败行 |
| R8 | region 兜底 "unknown" | 推断失败 → 失败行，不兜底 |
| R9 | project_year 正则歧义 | 取第一个 4 位年份；无年份 → 失败行 |
| R10 | 预设 job_application = 0 | 改为运行时 SQL 检查 |

### v3 → v4

| # | v3 问题 | v4 修正 |
|---|---------|---------|
| R11 | 第 6 节数据统计与实际 Excel 不符（空 5 行→实 4 行，非法 5 行→实 12 行，合法 9 行→实 4 行） | 用脚本逐行核实，重写为精确数据 |
| R12 | 导入模板改为 9 列但没把"更新模板源文件"列为显式步骤 | 新增步骤：更新 `副本列表字段整理模板.xlsx` + `PositionImportTemplate` |
| R13 | failedRows 进入核心流程但变更清单漏掉 `PositionBatchUploadResult` 和前端提示 | 补充 `position.ts:138-143` 和 `index.vue:617-629` 到变更清单 |
| R14 | 批次级失败和行级失败混在一起 | 拆为两阶段：Phase A（缺列→整批拒绝）→ Phase B（补列后→逐行校验） |

### v4 → v5

| # | v4 问题 | v5 修正 |
|---|---------|---------|
| R15 | Phase A 必需列检查漏掉"地区"（city 是必填但表头校验没列入） | Phase A 必需列新增"地区" |
| R16 | 合法地区统计仍错（写 4 行，实际按当前字典精确匹配只有 2 行）且边界 case 没有落实到变更清单 | 按当前字典逐行重新核实；城市归一化规则写入变更清单 #12，落到 `OsgPositionServiceImpl.java:447-457` |
| R17 | "US"/"St Louis, MO"/"Hong Kong SAR, Singapore" 留作"实现时决定"，但没有对应代码入口 | 新增城市别名/归一化映射表，明确写入 `ensurePositionReferenceData` 或导入时的归一化函数 |

### v5 → v6

| # | v5 问题 | v6 修正 |
|---|---------|---------|
| R18 | 地区统计自相矛盾（"归一化后匹配 4 行"实际列了 5 行，注释在 6/7 行间来回切换） | 拆为三个互斥场景：场景 1 合法 2 行、场景 2 合法 6 行、场景 3 合法 7 行，方案明确采用场景 3 |
| R19 | 国家级别名的 city 落库规则写了"或"（保留原值 / 置为默认城市），导致唯一键和筛选不确定 | 定死为**保留 Excel 原值**，理由：city 参与唯一键，强制归一化会产生假重复 |
| R20 | 执行顺序 Phase A 摘要只举了"缺 company_name 列"，遗漏其他 5 个必需列 | 改为"缺任一必需列（岗位名称/公司名称/公司行业/岗位分类/地区/招聘周期）→ 整批拒绝" |

---

## 1. 两个独立问题

### 问题 A：历史脚本导致的 20 条脏数据

**来源**：`scripts/import_excel_data.py` line 220-222

```python
company_name = f"{industry or 'Unknown'} - {pos_category or 'Other'}"
city = ''
```

**影响**：
- `company_name` = `"Consulting - Consulting FT"` 而非真实公司名
- `city` = `""` 空字符串
- `deadline` = NULL（line 225-227 只处理了非 Rolling 的，Rolling 的直接丢弃）
- `region` = Excel "地区" 列的原始值（如 "Beijing"、"it is a 2027SA"），但大部分为 `"unknown"`

### 问题 B：当前页面批量上传与模板不兼容

**现状**：
- 后端下载模板（`PositionExportRow`）列头是中文：`公司名称 | 岗位名称 | 大区 | 城市 | 项目时间 | 行业 | 岗位分类 | 展示状态 | 发布时间`
- 后端导入（`buildPositionFromRow`）按英文 key 查找：`company_name | position_name | region | city | project_year | industry | position_category`
- 测试用例（`OsgPositionControllerTest.java:544-575`）用的也是英文表头
- **用户实际 Excel**（`副本列表字段整理模板.xlsx`）表头是另一套中文：`岗位名称 | 公司行业 | 岗位分类 | 地区 | 招聘周期 | 发布时间 | 截止时间 | 学员数`

**结论**：三套表头互不匹配，无论用哪套 Excel 上传都不会正确导入。

---

## 2. 字段权威来源定义

核心决策：**数据模型（表结构 + 表单 + API）保持不变**，只修导入/导出的映射层。

### 2.1 数据库字段（osg_position 表 — 保持现状）

来源：`sql/osg_position_init.sql`

| 字段 | 类型 | NOT NULL | 角色 | 保留理由 |
|------|------|----------|------|---------|
| `company_name` | varchar(128) | YES | 去重键、筛选键、下钻分组键、公司自动补全 | 唯一键 `uk_osg_position_dedup` 包含此字段 |
| `industry` | varchar(64) | YES | 行业筛选、下钻第一层分组 | |
| `company_type` | varchar(64) | YES | 公司类别筛选 | |
| `region` | varchar(32) | YES | 大区筛选、city 的 parent | 前端表单级联选择依赖此字段 |
| `city` | varchar(64) | YES | 城市筛选 | 去重键包含此字段 |
| `project_year` | varchar(16) | YES | 项目年份筛选 | 去重键包含此字段 |
| `recruitment_cycle` | varchar(64) | YES | 招聘周期 | |
| `deadline` | datetime | NO | 截止日期，用于过期计算 | |

### 2.2 全链路字段消费点

| 字段 | 消费点 |
|------|--------|
| `company_name` | ① 唯一键去重 `uk_osg_position_dedup` ② 下钻分组 `ServiceImpl:142-147` ③ 公司筛选 `ServiceImpl:217-243` ④ 搜索 `Mapper.xml:157` |
| `region` | ① 唯一键 ② 创建校验 `ServiceImpl:762` ③ 元数据 `ServiceImpl:205` ④ 前端表单级联 `PositionFormModal:84-98` ⑤ 列表筛选 `Mapper.xml:170-171` |
| `project_year` | ① 唯一键 ② 创建校验 `ServiceImpl:765` ③ 元数据 `ServiceImpl:204` ④ 前端表单 `PositionFormModal:40-45` ⑤ 列表筛选 `Mapper.xml:182-183` |

### 2.3 Excel 规格（用户模板）vs 数据模型映射

| Excel 列 | 示例值 | → DB 字段 | 映射规则 |
|----------|--------|-----------|---------|
| 岗位名称 | Summer 2027 Analyst Intern | `position_name` | 直接映射，**必填** |
| 公司名称 | Goldman Sachs | `company_name` | 直接映射，**必填**（v3 新增列） |
| 公司行业 | Consulting / Elite Boutique | `industry` + `company_type` | 写入 industry 和 company_type，**必填** |
| 岗位分类 | USA 2026 SA (2027 Status) | `position_category` | 直接映射，**必填** |
| 地区 | Beijing / New York / (空) | `city` | 直接映射到 city，**必填**（空值→失败行） |
| 招聘周期 | Rolling / Fixed | `recruitment_cycle` | 直接映射，**必填** |
| 发布时间 | 2026-03-24 | `publish_time` | 日期解析，选填（默认今天） |
| 截止时间 | Rolling ASAP / 2026-05-30 | `deadline` + `deadline_text` | 日期→deadline，文本→deadline_text，选填 |
| 学员数 | 4 | (忽略) | 只读，由 job_application 联表计算 |

**关键变化**（v3 vs v2）：
- **新增"公司名称"列**：`company_name` 是唯一键/下钻键/筛选键，不能用行业名占位
- **"地区"改为必填**：空值或非法值（如 "Handshake"、"Event"、"it is a 2027SA"）→ 整行标记为失败行
- `region` 和 `project_year` 仍不在 Excel 列中，由系统自动推断（推断失败 → 失败行）

---

## 3. 修复方案

### 3.1 问题 A 修复：清理历史脚本脏数据

**前提**：`osg_job_application.position_id` 有外键指向 `osg_position`（见 `osg_job_application_init.sql:26`）。

**执行前必须运行**（不可跳过）：
```sql
SELECT COUNT(*) AS linked_count FROM osg_job_application WHERE position_id IS NOT NULL;
```

**分支处理**：

| linked_count | 方案 |
|-------------|------|
| = 0 | `TRUNCATE TABLE osg_position;` 然后用修复后的导入重新导入 |
| > 0 | **禁止 TRUNCATE**。改用 UPDATE 逐条修正 company_name/city/region 等字段，或先清理关联后再 TRUNCATE（需业务确认） |

⚠️ 文档不对 `linked_count` 的当前值做任何断言。每次执行前必须实际运行 SQL 确认。

### 3.2 问题 B 修复：统一导入模板与解析

#### 3.2.1 新增 `deadline_text` 字段

**数据库**：
```sql
ALTER TABLE osg_position ADD COLUMN deadline_text VARCHAR(64) DEFAULT NULL COMMENT '截止时间文本描述(如Rolling ASAP)' AFTER deadline;
```

**文件变更**：
| 文件 | 改动 |
|------|------|
| `OsgPosition.java` | 新增 `deadlineText` 字段 + getter/setter |
| `OsgPositionMapper.xml` | resultMap 加 `deadline_text` 映射，insert/update 加字段 |
| `OsgPositionServiceImpl.java` `toPositionMap` | 返回值加 `deadlineText` |
| `position.ts` `PositionListItem` | 加 `deadlineText?: string` |

#### 3.2.2 导入模板（下载模板）— 新建 `PositionImportTemplate` DTO

当前 `PositionExportRow` 被导出和模板共用。需要拆分。

**文件**：`OsgPositionController.java`

```
新增 PositionImportTemplate 内部类（9 列，v3 新增公司名称列）：
  @Excel(name = "岗位名称")      → positionName      (必填)
  @Excel(name = "公司名称")      → companyName       (必填) — v3 新增
  @Excel(name = "公司行业")      → industry          (必填)
  @Excel(name = "岗位分类")      → positionCategory  (必填)
  @Excel(name = "地区")          → city              (必填)
  @Excel(name = "招聘周期")      → recruitmentCycle  (必填)
  @Excel(name = "发布时间")      → publishTime       (选填，默认今天)
  @Excel(name = "截止时间")      → deadlineRaw       (选填，文本)
  @Excel(name = "学员数")        → (忽略，不读)

现有 PositionExportRow 保持不变（导出用，含完整字段）。
```

**export 接口修改**：`template=true` 时用 `PositionImportTemplate`，`template=false` 时用 `PositionExportRow`。

#### 3.2.3 导入解析 — 重写 `buildPositionFromRow`

**文件**：`OsgPositionServiceImpl.java` line 787-810

核心改动：

1. **中英文别名映射**：`readCell` 增加别名查找表

```
"岗位名称" / "position_name"    → positionName
"公司名称" / "company_name"     → companyName       ← v3: 必填列
"公司行业" / "industry"         → industry
"岗位分类" / "position_category" → positionCategory
"地区"     / "city"             → city
"招聘周期" / "recruitment_cycle" → recruitmentCycle
"发布时间" / "publish_time"     → publishTime
"截止时间" / "deadline"         → deadlineRaw（文本）
"大区"     / "region"           → region（兼容英文模板）
"项目时间" / "project_year"     → projectYear（兼容英文模板）
```

2. **缺失必填字段推断 + 失败行处理**：

| 字段 | 推断规则 | 推断失败处理 |
|------|---------|-------------|
| `company_name` | **必须在 Excel 中存在**，不支持推断 | 缺列 → 整批拒绝；单行为空 → 该行标记失败 |
| `region` | **先归一化 city**（见下方归一化规则），再查 `osg_position_city` 字典的 parent 字段推断 | 归一化后仍查不到 → **该行标记失败**（不兜底 "unknown"，合法值仅 na/eu/ap/cn） |
| `project_year` | 从 `position_category` 提取**第一个** 4 位年份（正则 `(\d{4})`，取 group(1)） | 提取不到 → **该行标记失败** |
| `company_type` | 如果 Excel 没有此列：`company_type = industry` | industry 为空时同步失败 |

> **project_year 多年份消歧**：如 "USA 2026 SA (2027 Status)" 取第一个 `2026`。
> 理由：position_category 命名惯例是 `地区 + 项目启动年 + 类型 (毕业状态年)`，
> 第一个年份是项目启动年，第二个是毕业状态年。`project_year` 语义为项目年份。

**失败行汇总**：所有失败行收集到返回结果的 `failedRows` 数组中，包含行号和失败原因，不静默跳过。

2.5. **城市归一化规则**（`normalizeCity` 函数，在 region 推断前执行）：

当前内置城市字典（`OsgPositionServiceImpl.java:447-457`）只有 11 个精确值：
New York, San Francisco, Chicago, Boston, London, Frankfurt, Hong Kong, Singapore, Tokyo, Shanghai, Beijing

导入时 city 值可能是非标准写法，需要先归一化再查字典：

```
归一化步骤：
  a. trim + 去除多余空格
  b. 查别名映射表（case-insensitive）：

     别名映射表（新增，写入 buildPositionFromRow 或独立常量）：
     ┌───────────────────────────────┬──────────────────┬──────┐
     │ 输入（case-insensitive）       │ 归一化为          │ region│
     ├───────────────────────────────┼──────────────────┼──────┤
     │ "Hong Kong SAR, Singapore"    │ "Hong Kong"      │ ap   │ ← 取逗号前第一个城市
     │ "Hong Kong SAR"               │ "Hong Kong"      │ ap   │
     │ "St Louis, MO" / "St. Louis" │ "St Louis"       │ na   │ ← 新增到城市字典
     │ "US" / "USA"                  │ → 直接映射 region │ na   │ ← 国家级别名，不映射到城市
     │ "UK"                          │ → 直接映射 region │ eu   │
     │ "APAC"                        │ → 直接映射 region │ ap   │
     └───────────────────────────────┴──────────────────┴──────┘

  c. 如果别名命中国家级别名（US/USA/UK/APAC）：
     → city 保留 Excel 原值不做替换，region 直接赋值，跳过字典查找
     理由：city 参与唯一键 uk_osg_position_dedup，保留原值可避免
     不同岗位因 city 被强制归一化而产生假重复。前端筛选和元数据
     选项以实际入库值为准，不依赖内置字典的精确值。
  d. 如果别名命中城市别名：
     → city 替换为归一化值，继续正常字典查找
  e. 如果别名未命中：
     → 用原始 city 值查字典，查不到 → 失败行
```

**代码入口**：`OsgPositionServiceImpl.java` `buildPositionFromRow` 方法中，在 `readCell("地区")` 之后、region 推断之前调用。

**字典扩展**：如果归一化后的城市（如 "St Louis"）不在现有 11 个城市中，需同时在 `ensurePositionReferenceData`（line 447-457）中新增对应 `DictSeed`。

3. **deadline 处理**：

```
deadlineRaw = readCell("截止时间")
if deadlineRaw 能解析为日期 → deadline = 日期, deadline_text = null
else if deadlineRaw 非空  → deadline = null, deadline_text = deadlineRaw（如 "Rolling ASAP"）
else                      → deadline = null, deadline_text = null
```

4. **publish_time 处理**：保持现有逻辑，Excel 没填则默认当前时间。

5. **两阶段校验策略**：

```
Phase A — 批次级校验（表头检查）：
  a. 解析 Excel 表头，构建列名→索引映射
  b. 检查必须存在的列：岗位名称、公司名称、公司行业、岗位分类、地区、招聘周期
  c. 缺少任一必须列 → 整批拒绝，返回错误信息说明缺少哪些列，不进入逐行处理

Phase B — 逐行校验（仅 Phase A 通过后执行）：
  d. 读取 Excel 行原始值
  e. 执行自动推断（region from city, project_year from category）
  f. 推断后执行必填校验（company_name/city/region/project_year 等）
  g. 任一必填字段为空/非法 → 标记为失败行，记录行号+原因，继续处理下一行
  h. 全部校验通过 → 写入数据库
```

失败行**不**中断整批导入，但**不**写入数据库。返回结果包含 `successCount` 和 `failedRows: Array<{row, reason}>`。

#### 3.2.4 前端列表 — 合并"公司"和"行业"列

**文件**：`positions/index.vue` line 331-343 + `columns.ts`

```diff
listColumns:
- { title: '公司', dataIndex: 'companyName', ... },
- { title: '行业', dataIndex: 'industry', ... },
+ { title: '公司行业', dataIndex: 'companyIndustry', ... },
```

`companyIndustry` 为计算列，显示逻辑：
- 如果 `companyName !== industry`：显示 `"companyName · industry"`
- 如果 `companyName === industry`：显示 `industry`（避免重复显示）

截止时间列显示逻辑：
- 优先显示 `deadlineText`（如 "Rolling ASAP"）
- 没有则格式化 `deadline` 日期
- 都没有则显示 `—`

#### 3.2.5 测试用例同步

**文件**：`OsgPositionControllerTest.java` line 544-575

现有测试用英文表头，**保留不改**（兼容性测试）。新增一组用中文表头的测试用例。

---

## 4. 完整文件变更清单

| # | 文件 | 改动类型 | 内容 |
|---|------|---------|------|
| 1 | `ALTER TABLE` SQL | DDL | 加 `deadline_text` 字段 |
| 2 | `OsgPosition.java` | Domain | 加 `deadlineText` 字段 |
| 3 | `OsgPositionMapper.xml` | Mapper | resultMap/insert/update 加 `deadline_text` |
| 4 | `OsgPositionServiceImpl.java` | Service | ① `buildPositionFromRow` 重写列名映射+别名+推断+失败行收集 ② 新增 `normalizeCity` 城市归一化函数（别名表+国家级映射） ③ deadline 文本处理 ④ `toPositionMap` 加 deadlineText ⑤ `batchUploadPositions` 返回 failedRows ⑥ `ensurePositionReferenceData`(line 447-457) 扩展城市字典（如 St Louis→na） |
| 5 | `OsgPositionController.java` | Controller | ① 新增 `PositionImportTemplate` DTO ② export 接口拆分 template/export 两套 DTO |
| 6 | `position.ts` (line 138-143) | 前端 API 类型 | ① `PositionListItem` 加 `deadlineText` ② `PositionBatchUploadResult` 加 `failedRows: Array<{row: number, reason: string}>` |
| 7 | `positions/index.vue` (line 617-629) | 前端页面 | ① listColumns 合并公司行业列 ② deadline 显示逻辑 ③ `handleBatchUpload` 增加 failedRows 提示（显示失败行号和原因） |
| 8 | `positions/columns.ts` | 前端列定义 | 同步合并 |
| 9 | `OsgPositionControllerTest.java` | 测试 | 新增中文表头导入测试用例（含失败行场景） |
| 10 | `副本列表字段整理模板.xlsx` | 模板源文件 | 岗位列表 Sheet 新增"公司名称"列（第 2 列），从 8 列变 9 列 |
| 11 | 数据清理 SQL | 一次性 | 运行时检查关联 → TRUNCATE 或 UPDATE → 重新导入 |

## 5. 执行顺序

```
Phase 1: 数据库 + Domain
  1.1 执行 ALTER TABLE 加 deadline_text
  1.2 OsgPosition.java 加字段
  1.3 OsgPositionMapper.xml 加映射

Phase 2: 后端导入/导出
  2.1 OsgPositionServiceImpl 重写 buildPositionFromRow：
      - 中英文别名映射
      - Phase A 缺列检测：缺任一必需列（岗位名称/公司名称/公司行业/岗位分类/地区/招聘周期）→ 整批拒绝
      - Phase B 逐行校验：normalizeCity 归一化 → region/project_year 推断 → 必填校验 → 失败行收集
      - deadline 文本处理
      - 返回结果包含 successCount + failedRows
  2.2 OsgPositionServiceImpl toPositionMap 加 deadlineText
  2.3 OsgPositionController 新增 PositionImportTemplate，拆分 export

Phase 3: 前端
  3.1 position.ts：PositionListItem 加 deadlineText，PositionBatchUploadResult 加 failedRows
  3.2 index.vue：listColumns 合并公司行业列 + deadline 显示 + handleBatchUpload 显示 failedRows
  3.3 columns.ts 同步

Phase 4: 模板 + 测试
  4.1 更新 副本列表字段整理模板.xlsx：岗位列表 Sheet 新增"公司名称"列
  4.2 新增中文表头测试用例（含 Phase A 整批拒绝 + Phase B 失败行场景）

Phase 5: 数据修复
  5.1 运行 SQL 检查 osg_job_application 关联数（不可跳过）
       → = 0: TRUNCATE osg_position
       → > 0: 走 UPDATE 路径或先清理关联（需业务确认）
  5.2 人工修正 Excel（补公司名称、修正地区值、补年份）
  5.3 用修复后的导入功能重新导入
  5.4 检查 failedRows 返回，确认失败原因合理
  5.5 页面验证
```

## 6. 当前 Excel 数据的预期导入结果

基于 `副本列表字段整理模板.xlsx` 岗位列表 Sheet 的 20 条数据，使用脚本逐行核实。

### Phase A：批次级校验（缺列 → 整批拒绝）

当前 Excel **只有 8 列**，缺少"公司名称"列。按 v6 方案 Phase A 校验（必需列：岗位名称、公司名称、公司行业、岗位分类、地区、招聘周期），系统会**整批拒绝**，不进入逐行校验。

> 必须先在 Excel 中补充"公司名称"列（第 2 列），填入真实公司名后才能继续。

### Phase B：逐行校验（补列后的预期结果）

假设"公司名称"列已补充，以下是逐行校验的预期：

**地区分类**（20 行）— 三个互斥场景，按实现深度递增：

**场景 1：仅当前字典（不实现 normalizeCity）**

| 分类 | 行数 | 明细 |
|------|------|------|
| 空地区 → 失败行 | 4 行 | #1, #2, #10, #12 |
| 字典精确匹配 → 合法 | **2 行** | #4 "Beijing"→cn, #5 "Beijing"→cn |
| 非法地区 → 失败行 | **14 行** | #3, #6, #7, #8, #9, #11, #13, #14~#20 |

**场景 2：实现 normalizeCity（国家别名 + 城市别名），不扩展字典**

新增合法行：#6/#7/#9 "US"→na（国家别名）、#8 "Hong Kong SAR, Singapore"→"Hong Kong"→ap（城市别名）

| 分类 | 行数 | 明细 |
|------|------|------|
| 空地区 → 失败行 | 4 行 | #1, #2, #10, #12 |
| 合法（精确+归一化） | **6 行** | #4, #5（精确）+ #6, #7, #9（国家别名）+ #8（城市别名） |
| 非法地区 → 失败行 | **10 行** | #3, #11, #13, #14~#20（#11 "St Louis" 不在现有字典中） |

**场景 3：实现 normalizeCity + 扩展字典（加 St Louis→na）**

| 分类 | 行数 | 明细 |
|------|------|------|
| 空地区 → 失败行 | 4 行 | #1, #2, #10, #12 |
| 合法（精确+归一化+扩展） | **7 行** | 场景 2 的 6 行 + #11 "St Louis, MO"→"St Louis"→na |
| 非法地区 → 失败行 | **9 行** | #3, #13, #14~#20 |

> **v6 方案采用场景 3**（完整实现 normalizeCity + 扩展 St Louis 字典）。

**年份分类**（20 行）：

| 分类 | 行数 | 明细 |
|------|------|------|
| 无年份 → 失败行 | 7 行 | #1 "Consulting FT", #2 "Consulting FT", #5 "APAC Off Cycle", #8 "SWE/PM", #9 "Consulting Intern", #12 "Consulting Intern", #13 "Consulting Intern" |
| 有年份 → 取第一个 | 13 行 | 如 #3 "USA 2026 SA (2027 Status)"→2026, #10 "UK Spring Week + Events(2028 Status)"→2028 |

**综合预期**（地区+年份两个维度叠加，假设归一化已实现）：

| # | 地区 | city 值 | 归一化→region | 年份 | category 值 | 提取 year | 综合 |
|---|------|---------|--------------|------|-------------|-----------|------|
| 1 | 空 | — | — | 无 | Consulting FT | — | ✗✗ |
| 2 | 空 | — | — | 无 | Consulting FT | — | ✗✗ |
| 3 | 非法 | it is a 2027SA | — | 有 | USA 2026 SA... | 2026 | ✗✓ |
| 4 | **✓** | Beijing | cn | 有 | APAC 2026 SA... | 2026 | **✓✓** |
| 5 | **✓** | Beijing | cn | 无 | APAC Off Cycle | — | ✓✗ |
| 6 | **✓** | US | na（国家别名） | 有 | US 2026 FT... | 2026 | **✓✓** |
| 7 | **✓** | US | na（国家别名） | 有 | US 2026 FT... | 2026 | **✓✓** |
| 8 | **✓** | Hong Kong SAR... | ap（归一化） | 无 | SWE/PM | — | ✓✗ |
| 9 | **✓** | US | na（国家别名） | 无 | Consulting Intern | — | ✓✗ |
| 10 | 空 | — | — | 有 | UK Spring Week... | 2028 | ✗✓ |
| 11 | **✓** | St Louis, MO | na（归一化+扩展） | 有 | USA 2026 SA... | 2026 | **✓✓** |
| 12 | 空 | — | — | 无 | Consulting Intern | — | ✗✗ |
| 13 | 非法 | Event | — | 无 | Consulting Intern | — | ✗✗ |
| 14~20 | 非法 | Handshake × 7 | — | 有 | 各有年份 | 各年 | ✗✓ |

**汇总**：两项都通过 = **4 行**（#4, #6, #7, #11），至少一项失败 = **16 行**。

### 结论

当前 Excel 直接导入**不可行**。需要先人工修正：

1. **新增"公司名称"列**，填入真实公司名（如 Goldman Sachs、McKinsey 等）— 否则 Phase A 整批拒绝
2. **修正非法地区值**：Handshake → 实际城市，Event → 删除或修正，"it is a 2027SA" → 实际城市
3. **补充空地区行**的城市信息（#1, #2, #10, #12）
4. **无年份的 position_category** 有两个选择：
   - 在 Excel 中添加"项目时间"列显式指定（英文表头 project_year 同样兼容）
   - 或修正分类名使其包含年份（如 "Consulting FT 2026"）

## 7. 不改动的部分（明确排除）

- `osg_position` 表结构（除了加 `deadline_text`），所有 NOT NULL 字段保持
- `PositionFormModal.vue` 表单（region/city/projectYear 级联逻辑不变）
- 唯一键 `uk_osg_position_dedup (company_name, position_name, region, city, project_year)` 不变
- 现有 `buildPosition`（API 创建/更新）逻辑不变
- 现有英文表头导入兼容性保留
- `PositionExportRow` 导出列保留（只新增 `PositionImportTemplate`）
