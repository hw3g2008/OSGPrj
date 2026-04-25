# 公司类别字典统一（消除 osg_company_type 冗余）

**Goal:** 将 `osg_company_type` 和 `osg_position_industry` 两个重复字典合并为一个唯一数据源 `osg_position_industry`，消除全链路数据不一致风险。

**Architecture:** `osg_position_industry` 作为 SSOT（有 tone + icon），删除 `osg_company_type` 字典。后端所有读写 `companyType` / `DICT_COMPANY_TYPE` 的地方统一改为复用 `industry` / `DICT_POSITION_INDUSTRY`。前端表单"公司类别"下拉框改为读 `industries`。数据库表的 `company_type` 列不删（避免大改），但代码不再单独维护它的值——始终从 `industry` 同步。

**Tech Stack:** Java 21 / Spring Boot 3 / MyBatis / Vue 3 + TypeScript / Ant Design Vue 4

---

## 0. 问题描述

| 字典 | dict_type | tone/icon | 条目 |
|------|-----------|:---------:|------|
| 行业 | `osg_position_industry` | ✅ | Investment Bank, Consulting, Tech, PE/VC |
| 公司类别 | `osg_company_type` | ❌ | Investment Bank, Consulting, Tech, PE/VC |

两个字典存完全相同的 4 个值。`osg_position` 表的 `industry` 和 `company_type` 字段也存完全相同的值。Excel 导入时 `setIndustry(companyType)` 直接赋值，没有字典校验，导致脏数据（Finance、Quant）进入数据库。

**根因**: 有两个数据源，且导入没有校验。

---

## 1. 影响范围（全量扫描）

### 1.1 数据库

| 表 | 操作 |
|----|------|
| `sys_dict_data` WHERE dict_type='osg_company_type' | **删除全部条目**（已完成 Finance/Quant/PE/VC/Other 5条，剩余 4 条也删） |
| `sys_dict_type` WHERE dict_type='osg_company_type' | **删除字典类型定义**（如果存在） |
| `osg_position.company_type` | 不删列，保持与 `industry` 同步 |
| `osg_student_position.company_type` | 同上 |
| `osg_position` 脏数据 | **修正** Finance→Investment Bank, Quant→Tech（或删除） |

### 1.2 后端 Java（4 文件）

| # | 文件 | 改动点 | 说明 |
|---|------|--------|------|
| B1 | `OsgPositionServiceImpl.java:50` | 删除 `DICT_COMPANY_TYPE` 常量 | 不再需要 |
| B2 | `OsgPositionServiceImpl.java:208` | 删除 `meta.put("companyTypes", ...)` | 前端改为用 `industries` |
| B3 | `OsgPositionServiceImpl.java:454-460` | 删除 `DICT_COMPANY_TYPE` 的 7 条 DictSeed | 种子数据清理 |
| B4 | `OsgPositionServiceImpl.java:780` | `setCompanyType` 改为直接用 `industry` 值 | 新增/编辑时 |
| B5 | `OsgPositionServiceImpl.java:837-840` | Excel 导入改为只读 `industry` 列 + **字典校验** | 核心修复 |
| B6 | `OsgPositionServiceImpl.java:978` | Excel 列映射 "公司类别" → 保留映射但写入 industry | 兼容老模板 |
| B7 | `OsgStudentPositionServiceImpl.java:85,174,204,265` | `setCompanyType` 改为从 `industry` 同步 | 学生自添岗位 |
| B8 | `OsgLeadMentorPositionServiceImpl.java:57` | 删除 `companyTypes` 输出 | 班主任端不再需要 |
| B9 | `OsgLeadMentorPositionServiceImpl.java:142` | `companyType` 输出改为读 `industry` | 保持兼容 |
| B10 | `PositionServiceImpl.java:308` | `companyTypes` 筛选项已走 `industryDict`，无需改 | 确认无需改 |

### 1.3 前端（6 文件）

| # | 文件 | 改动点 | 说明 |
|---|------|--------|------|
| F1 | `shared/api/admin/position.ts:67` | 删除 `companyTypes` 类型定义 | 不再需要 |
| F2 | `shared/api/positions.ts:85,111,193` | 删除/注释 `companyType` 可选字段 | 或保留为 `industry` 别名 |
| F3 | `admin/positions/components/PositionFormModal.vue:79,242` | 下拉框从 `companyTypes` 改为 `industries` | **核心 UI 改动** |
| F4 | `admin/positions/components/PositionFormModal.vue:327-329` | submit 时 `industry` 直接用 form 值，不再单独传 `companyType` | |
| F5 | `admin/positions/index.vue:327-333` | 删除 `industryToneToColor`（已不再使用） | 清理 |
| F6 | `admin/permission/base-data/index.vue:177` | 删除 `osg_company_type` tab | 基础数据页不再展示此字典 |
| F7 | `admin/permission/base-data/components/BaseDataModal.vue:80,144` | 删除 `osg_company_type` 相关特殊处理 | |

### 1.4 MyBatis XML（确认不改）

`OsgPositionMapper.xml` 和 `OsgStudentPositionMapper.xml` 中 `company_type` 是普通字段映射，不涉及字典引用，**无需改动**——后端赋值时会从 `industry` 同步。

### 1.5 SQL 初始化脚本

| 文件 | 改动 |
|------|------|
| `deploy/mysql-init/12_osg_position_init.sql` | 确保 `company_type` 和 `industry` 值一致 |
| `deploy/mysql-init/13_osg_student_position_init.sql` | 同上 |

---

## 2. 不动的部分（明确边界）

| 内容 | 原因 |
|------|------|
| `osg_position.company_type` 数据库列 | 不删列，避免大范围 DDL 和 XML 改动 |
| `osg_student_position.company_type` 列 | 同上 |
| `OsgPosition.java` domain 类的 `companyType` 字段 | 保留 getter/setter，后端赋值时同步 |
| `OsgStudentPosition.java` domain 类 | 同上 |
| MyBatis XML 映射 | 列还在，映射不变 |
| `PositionServiceImpl.java` 的 `companyType` 处理 | 它已经用 `industryDict` 查配色，逻辑正确 |
| 前端 TS 类型里的 `companyType?` 可选字段 | 保留为可选，后端仍返回 |
| `applications.ts` 的 `companyType` | 求职总览用的是 `PositionServiceImpl`，已用 `industryDict` |
| Lead-mentor/Student/Assistant 前端组件里读 `companyType` 的地方 | 后端仍返回此字段（值=industry），不影响 |

---

## 3. 执行步骤

### Task 1: 清理数据库脏数据

**操作**: SQL（阿里云 47.94.213.128:23306）

```sql
-- 1. 修正 osg_position 脏数据
UPDATE osg_position SET industry = 'Investment Bank', company_type = 'Investment Bank'
  WHERE industry = 'Finance';
UPDATE osg_position SET industry = 'Tech', company_type = 'Tech'
  WHERE industry = 'Quant';

-- 2. 删除 osg_company_type 字典条目（剩余 4 条）
DELETE FROM sys_dict_data WHERE dict_type = 'osg_company_type';

-- 3. 删除 osg_company_type 字典类型定义（如果存在）
DELETE FROM sys_dict_type WHERE dict_type = 'osg_company_type';

-- 4. 验证
SELECT DISTINCT industry, company_type FROM osg_position ORDER BY industry;
SELECT * FROM sys_dict_data WHERE dict_type = 'osg_position_industry' ORDER BY dict_sort;
SELECT COUNT(*) FROM sys_dict_data WHERE dict_type = 'osg_company_type';  -- 应为 0
```

**验收**: industry 只有 Investment Bank/Consulting/Tech/PE/VC 四个值，company_type 与 industry 完全一致，`osg_company_type` 字典为空。

---

### Task 2: 后端 — OsgPositionServiceImpl.java

**文件**: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgPositionServiceImpl.java`

**Step 2.1**: 删除 `DICT_COMPANY_TYPE` 常量（line 50）

**Step 2.2**: 删除 `meta.put("companyTypes", ...)` 行（line 208）

**Step 2.3**: 删除 DictSeed 中 `DICT_COMPANY_TYPE` 的 7 条（line 454-460）

**Step 2.4**: 新增/编辑时 companyType 直接同步 industry（line 780）
```java
// 改前
position.setCompanyType(defaultText(asText(body.get("companyType")), position.getIndustry()));
// 改后
position.setCompanyType(position.getIndustry());
```

**Step 2.5**: Excel 导入加字典校验（line 836-840）
```java
// 改前
String companyType = defaultText(readCell(row, headerIndexes, formatter, "company_type"),
    defaultText(readCell(row, headerIndexes, formatter, "industry"), "Other"));
position.setCompanyType(companyType);
position.setIndustry(companyType);

// 改后
String rawIndustry = defaultText(
    readCell(row, headerIndexes, formatter, "company_type"),
    defaultText(readCell(row, headerIndexes, formatter, "industry"), ""));
String validatedIndustry = validateIndustry(rawIndustry);
position.setIndustry(validatedIndustry);
position.setCompanyType(validatedIndustry);
```

新增 `validateIndustry()` 方法：
```java
private Set<String> validIndustryValues;

private String validateIndustry(String raw) {
    if (validIndustryValues == null) {
        validIndustryValues = loadDictItems(DICT_POSITION_INDUSTRY).stream()
            .map(SysDictData::getDictValue)
            .collect(Collectors.toSet());
    }
    if (validIndustryValues.contains(raw)) {
        return raw;
    }
    // 模糊匹配: finance/ib/bank → Investment Bank, quant → Tech, etc.
    String lower = raw.toLowerCase(Locale.ROOT);
    if (lower.contains("bank") || lower.contains("ib") || lower.contains("finance")) return "Investment Bank";
    if (lower.contains("consult")) return "Consulting";
    if (lower.contains("tech") || lower.contains("quant")) return "Tech";
    if (lower.contains("pe") || lower.contains("vc")) return "PE/VC";
    return "Investment Bank";  // 默认
}
```

**验收**: 编译通过，Excel 导入 Finance → Investment Bank。

---

### Task 3: 后端 — OsgStudentPositionServiceImpl.java

**文件**: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStudentPositionServiceImpl.java`

**Step 3.1**: line 85 — 保持不变（从 merged 同步，merged 里 industry 和 companyType 已一致）

**Step 3.2**: line 174 — 保持不变（resolveText 从 payload 或 request 读）

**Step 3.3**: line 204 — 改为直接同步
```java
// 改前
position.setCompanyType(defaultText(request.getCompanyType(), request.getIndustry()));
// 改后
position.setCompanyType(request.getIndustry());
```

**验收**: 编译通过。

---

### Task 4: 后端 — OsgLeadMentorPositionServiceImpl.java

**文件**: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorPositionServiceImpl.java`

**Step 4.1**: line 57 — 删除 `companyTypes` 输出行
```java
// 删除这行
payload.put("companyTypes", buildOptions(rows, OsgPosition::getCompanyType));
```

**Step 4.2**: line 142 — 改为读 industry
```java
// 改前
row.put("companyType", defaultText(position.getCompanyType()));
// 改后
row.put("companyType", defaultText(position.getIndustry()));
```

**验收**: 编译通过。

---

### Task 5: 前端 — PositionFormModal.vue

**文件**: `osg-frontend/packages/admin/src/views/career/positions/components/PositionFormModal.vue`

**Step 5.1**: line 242 — 下拉数据源从 companyTypes 改为 industries
```typescript
// 改前
const companyTypeOptions = computed(() => props.meta.companyTypes || [])
// 改后
const companyTypeOptions = computed(() => props.meta.industries || [])
```

**Step 5.2**: line 327-329 — submit 时 industry 直接用表单值
```typescript
// 改前
industry: form.companyType || 'Other',
companyName: form.companyName,
companyType: form.companyType || undefined,
// 改后
industry: form.companyType || 'Investment Bank',
companyName: form.companyName,
companyType: form.companyType || undefined,
```

**验收**: 新增弹窗"公司类别"下拉显示带 tone 的 4 个选项。

---

### Task 6: 前端 — 基础数据页删除公司类别 tab

**文件**: `osg-frontend/packages/admin/src/views/permission/base-data/index.vue`

**Step 6.1**: line 177 — 删除 `osg_company_type` 条目
```typescript
// 删除这行
osg_company_type: { createLabel: '公司/银行类别', nameHeader: '类别名称' },
```

**文件**: `osg-frontend/packages/admin/src/views/permission/base-data/components/BaseDataModal.vue`

**Step 6.2**: line 80 — 删除 `v-if="props.tab === 'osg_company_type'"` 的整个 form-item

**Step 6.3**: line 144 — 删除 `osg_company_type` 条目

**验收**: 基础数据页不再显示"公司/银行类别" tab。

---

### Task 7: 前端 — 清理 TS 类型（可选）

**文件**: `osg-frontend/packages/shared/src/api/admin/position.ts`

**Step 7.1**: line 67 — 删除 `companyTypes` 类型
```typescript
// 删除这行
companyTypes: PositionMetaOption[]
```

**验收**: TypeScript 编译无报错。

---

### Task 8: SQL 初始化脚本同步

检查 `deploy/mysql-init/12_osg_position_init.sql` 和 `13_osg_student_position_init.sql`，确保 `company_type` 列值与 `industry` 一致，且只使用字典中的 4 个值。

---

## 4. 验收标准

- [ ] AC1: `sys_dict_data` 中无 `osg_company_type` 条目
- [ ] AC2: `osg_position` 表 industry 只有 4 个合法值
- [ ] AC3: `osg_position` 表 company_type 与 industry 完全一致
- [ ] AC4: 后端编译通过（`mvn compile -pl ruoyi-system`）
- [ ] AC5: Admin 岗位管理下钻视图：每个行业有颜色 + 图标
- [ ] AC6: Admin 新增岗位弹窗"公司类别"下拉框显示 4 个选项
- [ ] AC7: Admin 基础数据页无"公司/银行类别" tab
- [ ] AC8: Excel 导入 Finance → 自动映射为 Investment Bank
- [ ] AC9: 前端编译无 TS 报错

---

## 5. 风险

| 风险 | 缓解 |
|------|------|
| 其他端(student/mentor/lead-mentor/assistant)用到 companyType | 后端仍返回 companyType 字段（值=industry），不影响 |
| Excel 模板有"公司类别"列 | 导入代码保留"公司类别"列映射，只是校验+归一化 |
| osg_position 现有 22 条数据被改 | Finance→IB, Quant→Tech，业务语义合理 |

---

## 6. Defense-in-Depth 校验报告

### Layer 1: 数据流全链路追踪

**发现 3 套独立的行业字典体系**：

| dict_type | value 风格 | 使用者 | css_class 含义 |
|-----------|-----------|--------|---------------|
| `osg_position_industry` | 全称 (Investment Bank) | Admin 端 `OsgPositionServiceImpl` | **tone** (gold/violet/blue/amber) |
| `osg_company_type` | 全称 (Investment Bank) | Admin 端（冗余，要删） | 无 |
| `osg_student_position_industry` | 简写 (ib/consulting/tech/pevc) | 学生端 `PositionServiceImpl` | **icon key** (bank/bulb/code/fund) |

**结论**: `osg_student_position_industry` 是学生端独立体系，value 是小写简写，跟 admin 端完全分开——**本次不动它**。方案 B10 判断正确：`PositionServiceImpl.java` 不需要改。

### Layer 2: setCompanyType 全量写入点核查

| # | 文件:行 | 当前逻辑 | 方案覆盖 | 问题 |
|---|---------|---------|---------|------|
| W1 | `OsgPositionServiceImpl:780` | `setCompanyType(defaultText(body.companyType, industry))` | B4 ✅ | |
| W2 | `OsgPositionServiceImpl:839` | `setCompanyType(companyType)` from Excel | B5 ✅ | |
| W3 | `OsgStudentPositionServiceImpl:85` | `setCompanyType(merged.getCompanyType())` | 方案说不改 ✅ | merged 来自已校验数据 |
| W4 | `OsgStudentPositionServiceImpl:174` | `setCompanyType(resolveText(payload, "companyType", ...))` | 方案说不改 | ⚠️ 用户可通过 payload 传入任意值 |
| W5 | `OsgStudentPositionServiceImpl:204` | `setCompanyType(defaultText(request, industry))` | B7 ✅ | |
| **W6** | **`PositionServiceImpl:531`** | `setCompanyType(normalizedCompanyType)` | **❌ 方案未覆盖** | 学生自添岗位入口 |

**W6 分析**: `PositionServiceImpl:531` 是学生端自添岗位流程。`normalizedCompanyType` (line 517) 来自 `resolveIndustryLabel()`，返回的是**全称**（Investment Bank/Consulting/Tech/PE/VC）——查的是 `osg_student_position_industry` 的 dict_label。所以写入 `company_type` 和 `industry` 的值实际都是全称，**与 admin 字典一致，无需改**。

**W4 分析**: `OsgStudentPositionServiceImpl:174` 的 `resolveText` 从 admin 审核页面 payload 读 `companyType`，审核页面的下拉框走 `industries` 元数据（改完后来自 `osg_position_industry`），**值域受控，无需额外校验**。

### Layer 3: 前端消费点核查

| 前端 | 读什么 | 来源 | 改后影响 |
|------|--------|------|---------|
| Admin 新增弹窗 | `meta.companyTypes` | 后端 `OsgPositionServiceImpl` | F3 改为读 `meta.industries` ✅ |
| Admin 基础数据 | `osg_company_type` tab | 后端字典 API | F6 删除 tab ✅ |
| Admin 下钻视图 | `industry` + `companyType` | 后端返回 | `companyType` 仍返回（值=industry）✅ |
| Lead-mentor 岗位 | `meta.companyTypes` | `OsgLeadMentorPositionServiceImpl` | B8 删除 ⚠️ |
| Student 岗位 | `companyType` | `PositionServiceImpl` 用 `osg_student_position_industry` | 不受影响 ✅ |
| Assistant 岗位 | 同 Admin | 同 Admin | 同 Admin ✅ |

**Lead-mentor ⚠️**: B8 删除了 `companyTypes` 输出，需确认 lead-mentor 前端是否使用这个字段作为筛选器。

### Layer 4: Lead-mentor 前端 companyTypes 使用检查

方案 B8 说删除 `payload.put("companyTypes", ...)`，需验证前端是否依赖它：

Lead-mentor 前端 `positions.ts:111` 定义了 `companyTypes: LeadMentorPositionMetaOption[]`。如果删掉后端输出，前端读到 undefined，computed fallback `|| []` 会返回空数组——**筛选器会丢失"公司类别"选项**。

**修正**: B8 不应直接删除，应改为读 `industries`：
```java
// 改前
payload.put("companyTypes", buildOptions(rows, OsgPosition::getCompanyType));
// 改后
payload.put("companyTypes", buildOptions(rows, OsgPosition::getIndustry));
```

这样 lead-mentor 前端无需改动，筛选器仍有数据。

---

## 7. 校验结论

| 维度 | 结果 | 说明 |
|------|------|------|
| 写入点全覆盖 | ✅ | 6 个 setCompanyType 写入点全部分析，无遗漏 |
| 字典体系隔离 | ✅ | 学生端 `osg_student_position_industry` 独立，不受影响 |
| 前端消费兼容 | ⚠️ → ✅ | B8 需修正为改读 `industry` 而非直接删除 |
| 脏数据 | ✅ | osg_student_position 空表，无历史脏数据 |

### 方案修正项

| 原方案 | 修正 |
|--------|------|
| B8: 删除 `payload.put("companyTypes", ...)` | **改为**: `payload.put("companyTypes", buildOptions(rows, OsgPosition::getIndustry))` |
| B10: PositionServiceImpl 无需改 | ✅ 确认正确，学生端独立字典体系 |
| 缺失: W4 OsgStudentPositionServiceImpl:174 | ✅ 确认无需改，值域受审核页面控制 |
