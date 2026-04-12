# 岗位数据标准化需求 v9

> SSOT: 前端"新增岗位"表单 (`PositionFormModal.vue`) + 原型 (`admin.html`)。
> 本文档为完整需求，涵盖数据清理 → 字典 → 搜索 → 表格 → 导入 → 菜单全链路。

---

## 1. 背景

### 1.1 问题

1. 公司名称无独立维护，从 `osg_position` 表动态去重，不利于管理和扩展
2. 数据库存在**两套字典体系**，需要统一：
   - **旧字典**（`sys_dict_type` 注册）：`osg_company_name`(6 条)、`osg_company_type`(17 条) 等
   - **新字典**（代码 seedStaticDicts 管理）：`osg_position_industry`、`osg_position_city` 等
3. 公司类别字典缺少业务实际分类（Elite Boutique / Bulge Bracket / Middle Market）
4. 下载模板 DTO (`PositionImportTemplate`) 还是旧的 8 列，需对齐新的 11 列模板
5. `osg_company_name` 现有 6 条数据的 `dict_value` 为小写下划线格式（`goldman_sachs`），与实际公司名（`Goldman Sachs`）不一致，属于脏数据需清理
6. `osg_company_type` 存在 3 批重叠脏数据（共 17 条）：第 1 批小写下划线 7 条（2026-03-20 codex）+ 第 2 批首字母大写 7 条（2026-04-05 codex）+ 手动添加 3 条（admin），其中 PE/VC 有 2 条完全重复
7. 侧边栏菜单名"字典管理"应改为"基础数据管理"，与原型设计一致

### 1.2 现有字典数据（数据库实际状态）

| dict_type | 条数 | 示例 | 注册于 sys_dict_type |
|-----------|------|------|---------------------|
| `osg_company_name` | 6 | Goldman Sachs, Morgan Stanley, JP Morgan, McKinsey, BCG, Google | ✅ (id=102) |
| `osg_company_type` | 17 | Investment Bank, Consulting, Tech, PE/VC, Bulge Bracket... | ✅ (id=101) |
| `osg_position_industry` | 4 | Investment Bank, Consulting, Tech, PE/VC (有 tone+icon) | ❌ (代码 seed) |
| `osg_position_city` | 12 | New York, London, Hong Kong... (有 region 关联) | ❌ (代码 seed) |
| `osg_position_category` | 5 | summer, fulltime, offcycle, spring, events | ❌ (代码 seed) |

### 1.3 决策

- **公司名称**：复用已有的 `osg_company_name` 字典类型，`company-options` API 改为从字典取数据
- **字典维护**：公司名称、公司类别、行业等字典数据全部由管理员在基础数据管理页面手动维护，代码不 seed
- **批量导入**：Excel 导入时新公司名自动追加到字典
- **旧字典不删除**：`osg_company_name` / `osg_company_type` 在 `sys_dict_type` 中的注册保留，方便管理员维护
- **数据清理**：执行前先清理脏数据：
  - `osg_company_name`：删除旧的 6 条小写下划线格式数据（dict_code=411~416），清空后由管理员手动添加
  - `osg_company_type`：删除第 1 批旧数据 7 条（dict_code=296~302，小写下划线）+ 重复 PE/VC 1 条（dict_code=475）
- **菜单改名**：侧边栏“字典管理” → “基础数据管理”（仅更新 `sys_menu` 表 menu_name）

---

## 2. 已完成改动

| # | 改动 | 文件 | 状态 |
|---|------|------|------|
| 1 | Excel 新模板生成（11 列新表头 + 填写说明 + 旧数据迁移） | `docs/岗位导入模板.xlsx` | ✅ |
| 2 | 后端 `HEADER_ALIAS` 对齐新模板 | `OsgPositionServiceImpl.java:960-978` | ✅ |
| 3 | 后端 `REQUIRED_HEADERS` 更新为 6 列必填 | `OsgPositionServiceImpl.java:1005-1007` | ✅ |
| 4 | 后端 `buildPositionFromRow` 更新 | `OsgPositionServiceImpl.java:828-839` | ✅ |
| 5 | 前端列表视图表头还原 | `index.vue:338` | ✅ |
| 6 | `buildDedupKey` 加入 `positionCategory` | `OsgPositionServiceImpl.java:1089-1096` | ✅ |

---

## 3. 需求描述

### REQ-1: 公司名称字典化

**输入**：管理员在「基础数据管理」页面维护公司名称字典（`osg_company_name`）

**处理**：
1. 新增常量 `DICT_POSITION_COMPANY = "osg_company_name"`（复用已有字典类型）
2. `selectPositionCompanyOptions` 数据源从 position 表换成**字典**：
   - 加载 `osg_company_name` 字典全部条目
   - keyword 过滤：case-insensitive contains
   - 按字母排序
   - 返回格式：`[{value, label}]`
3. `batchUploadPositions` 批量导入时，自动将字典中不存在的公司名追加到字典（upsert，失败静默跳过）
4. 新增岗位弹窗中公司名称字段为**搜索自动补全**（`a-auto-complete`），已实现
5. 列表筛选器中公司字段为下拉选择（`a-select`），已实现

**输出**：
- `/admin/position/company-options` API 返回字典中的公司列表
- 手动新增岗位：管理员需先在「基础数据管理」页面添加公司
- Excel 批量导入：新公司自动追加到字典

**约束**：
- 公司数据只从字典来，不从 position 表反向提取
- 字典管理页面可直接编辑/删除公司，删除不影响已有岗位数据

**验收标准**：
- AC1: 调用 `GET /admin/position/company-options` 返回字典中的公司列表
- AC2: 调用 `GET /admin/position/company-options?keyword=gold` 返回包含 "Goldman Sachs"（前提：字典中已有）
- AC3: Excel 导入含新公司名后，该公司自动出现在字典中
- AC4: 管理员可在基础数据管理页面添加/编辑/删除字典条目，前端表单下拉实时反映变更

### REQ-2: 下载模板 DTO 对齐

**输入**：`OsgPositionController.java` 中 `PositionImportTemplate` 内部类

**处理**：将旧的 8 列替换为新的 11 列：

```
岗位分类 | 岗位名称 | 公司名称 | 公司类别 | 城市 | 招聘周期 | 项目时间 | 截止时间 | 部门 | 岗位链接 | 公司官网
```

**输出**：`GET /admin/position/export?template=true` 下载的模板为 11 列

**验收标准**：
- AC5: 下载模板 Excel 包含 11 列，列名与新模板一致

### REQ-3: 数据清理（前置步骤）

**输入**：数据库中存在的脏数据

**处理**：执行 SQL 清理脚本（见 §3.2 清理 SQL）：
1. 删除 `osg_company_name` 中旧的 6 条小写下划线数据（dict_code=411~416）
2. 删除 `osg_company_type` 中第 1 批旧数据 7 条（dict_code=296~302，小写下划线格式）
3. 删除 `osg_company_type` 中重复的 PE/VC 1 条（dict_code=475）

**输出**：
- `osg_company_name` 清空（0 条），由管理员在基础数据管理页面手动添加
- `osg_company_type` 从 17 条减少到 9 条（首字母大写 7 条 + admin 手动 2 条）

**约束**：
- `osg_position` 表中 `company_name` 字段存的是明文公司名（如 "Goldman Sachs"），不依赖 dict_code，所以删除字典条目不影响已有岗位数据
- 此步骤必须在业务使用前执行

**验收标准**：
- AC6: 清理后 `osg_company_name` 中无小写下划线格式数据
- AC7: 清理后 `osg_company_type` 中无重复条目

### REQ-4: 菜单名称更新

**输入**：`sys_menu` 表中 id=2013 的菜单记录

**处理**：
```sql
UPDATE sys_menu SET menu_name = '基础数据管理' WHERE menu_id = 2013;
```

**输出**：侧边栏菜单从"字典管理"变为"基础数据管理"

**验收标准**：
- AC8: 登录管理后台，侧边栏显示“基础数据管理”而非“字典管理”

---

## 3.2 清理 SQL

```sql
-- 1. 删除 osg_company_name 旧的 6 条小写下划线数据
DELETE FROM sys_dict_data WHERE dict_code IN (411, 412, 413, 414, 415, 416);

-- 2. 删除 osg_company_type 第 1 批旧数据（小写下划线格式，2026-03-20 codex 创建）
DELETE FROM sys_dict_data WHERE dict_code IN (296, 297, 298, 299, 300, 301, 302);

-- 3. 删除 osg_company_type 重复的 PE/VC（dict_code=475，与 480 重复）
DELETE FROM sys_dict_data WHERE dict_code = 475;

-- 4. 菜单改名
UPDATE sys_menu SET menu_name = '基础数据管理' WHERE menu_id = 2013;
```

---

## 4. 三方对齐验证

### 新增表单 vs Excel模板 vs 列表视图

| # | 字段 | 新增表单 | Excel模板 | 列表视图 | DB 字段 |
|---|------|---------|----------|---------|---------|
| 1 | 岗位分类 | ✅ 必填下拉 | ✅ 必填 | ✅ | position_category |
| 2 | 岗位名称 | ✅ 必填输入 | ✅ 必填 | ✅ | position_name |
| 3 | 公司名称 | ✅ 必填搜索（字典） | ✅ 必填 | 下钻分组 | company_name |
| 4 | 公司类别 | ✅ 下拉 | ✅ 必填 | — | company_type |
| 5 | 部门 | ✅ 输入 | ✅ 选填 | ✅ | department |
| 6 | 大区 | ✅ 必填下拉 | —（系统推断） | — | region |
| 7 | 城市 | ✅ 必填下拉 | ✅ 必填 | ✅ | city |
| 8 | 项目时间 | ✅ 必填下拉 | ✅ 必填 | — | project_year |
| 9 | 招聘周期 | ✅ 必填多选 | ✅ 必填 | ✅ | recruitment_cycle |
| 10 | 截止日期 | ✅ 选填日期 | ✅ 选填 | ✅ | deadline |
| 11 | 公司官网 | ✅ 输入 | ✅ 选填 | — | company_website |
| 12 | 岗位链接 | ✅ 输入 | ✅ 选填 | — | position_url |
| 13 | 展示时间 | ✅ 开始/结束 | —（系统自动） | ✅ | display_start/end_time |
| 14 | 投递备注 | ✅ 文本域 | — | — | application_note |
| 15 | 岗位状态 | ✅ 编辑时隐藏/激活 | — | ✅ | display_status |

---

## 5. 文件变更清单

| # | 文件 | 内容 |
|---|------|------|
| 0 | `sql/osg_dict_cleanup.sql` | 清理脏数据 + 菜单改名（§3.2 SQL） |
| 1 | `OsgPositionServiceImpl.java` | ① 新增 `DICT_POSITION_COMPANY` 常量 ② `selectPositionCompanyOptions` 数据源换成字典 ③ `batchUploadPositions` 导入时新公司自动追加字典 |
| 2 | `OsgPositionController.java` | `PositionImportTemplate` 改为 11 列 |

---

## 6. 执行计划

```
Step 0: 数据清理 + 菜单改名 (REQ-3 + REQ-4)
  0.1 执行 sql/osg_dict_cleanup.sql（清理脏数据 + 菜单改名）
  0.2 验证 AC6 + AC7 + AC8

Step 1: 公司名称字典化 (REQ-1)
  1.1 新增 DICT_POSITION_COMPANY 常量
  1.2 selectPositionCompanyOptions 数据源换成字典
  1.3 batchUploadPositions 导入时新公司自动追加字典
  1.4 编译验证

Step 2: 下载模板 DTO 对齐 (REQ-2)
  2.1 PositionImportTemplate 改为 11 列
  2.2 编译验证

Step 3: 集成验证
  3.1 启动后端，验证 AC1~AC8
  3.2 启动前端，验证新增岗位弹窗公司搜索
  3.3 验证侧边栏菜单名为"基础数据管理"
```

---

## 7. 异常处理

| 场景　　　　　　　　　　　　　　　　　　　　　　　 | 处理方式　　　　　　　　　　　　 |
| ----------------------------------------------------| ----------------------------------|
| 公司名大小写差异（Goldman sachs vs Goldman Sachs） | 字典中按原样存入，管理员自行维护 |
| 管理员在字典管理中删除公司　　　　　　　　　　　　 | 不影响已有岗位的 company_name　　|
| 两个管理员同时添加同名公司　　　　　　　　　　　　 | upsert 幂等，不会重复　　　　　　|

---

## 8. 时间字段说明

| 字段　　　　　　　 | 含义　　　　　　　 | 来源　　　　　　　　　|
| --------------------| --------------------| -----------------------|
| project_year　　　 | 招聘项目所属年份　 | Excel 必填 / 表单必填 |
| recruitment_cycle　| 招聘批次　　　　　 | Excel 必填 / 表单必填 |
| deadline　　　　　 | 岗位申请截止日期　 | Excel 选填 / 表单选填 |
| publish_time　　　 | 岗位上线时间　　　 | 系统自动　　　　　　　|
| display_start_time | 学员端开始展示时间 | 系统自动　　　　　　　|
| display_end_time　 | 学员端停止展示时间 | 系统自动（90 天后）　 |
