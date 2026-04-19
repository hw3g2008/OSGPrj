# 岗位行业字典统一方案

**日期**：2026-04-19
**作者**：Windsurf
**目标**：全端统一使用 `osg_company_type` 字典（字典管理 UI 唯一暴露的真源），废弃 `osg_position_industry` 和 `osg_student_position_industry` 两个遗留字典。

---

## 1. 现状

### 1.1 三个字典并存

| 字典 key | 数据 | 业务使用 |
|---|---|---|
| `osg_position_industry` | 4 项：Investment Bank / Consulting / Tech / PE/VC | ✅ **22 条岗位全用它** |
| `osg_company_type` | 7 项：Bulge Bracket / Elite Boutique / Middle Market / Buyside / Consulting / SWE/PM / Other Company | ❌ **0 条业务数据** |
| `osg_student_position_industry` | 4 项：ib / consulting / tech / pevc | ❌ 学生自添岗位 0 条数据 |

### 1.2 业务数据分布（`osg_position` 表 22 条）

| industry | company_type | 条数 | 映射到 osg_company_type |
|---|---|---|---|
| Investment Bank | Investment Bank | 14 | → `other_company`（精准映射需靠公司名） |
| Consulting | Consulting | 6 | → `consulting` |
| Tech | Tech | 2 | → `swe_pm` |

**前端当前 bug**：`PositionFormModal.vue` 提交时写死 `industry: form.companyType \|\| 'Investment Bank'`，导致 industry 和 company_type 列值完全一样。

### 1.3 字典管理 UI

admin 字典管理页 "公司/银行类别" tab **直接使用 `osg_company_type`**，其他两个 key 在 `sys_dict_type` 表中**没有类型定义**（只有 sys_dict_data 里的数据行），UI 不可见。这确认 `osg_company_type` 是产品端真源。

---

## 2. 方案对比

### 方案 A（推荐）— Java 常量改值，代码结构保持

**核心思路**：Java 常量 `DICT_POSITION_INDUSTRY` 的值从 `"osg_position_industry"` 改为 `"osg_company_type"`。其他代码/DB 列名/变量名保持不变（仅语义从"行业"升级为"公司类别"）。

**优点**：
- 改动量最小，5 端代码仅改 2~3 个常量
- 无需数据库 schema 变更
- 历史 industry 字段保留，向后兼容

**缺点**：
- 代码里 "industry" 命名与字典 "company_type" 有轻微语义错配（但不影响功能）

### 方案 B — 完全重命名（industry → companyType）

把后端实体、Service、Controller、前端全部把 industry 改成 companyType。

**优点**：语义一致

**缺点**：改动量大，5 端 20+ 文件，性价比低

**决策**：选 **方案 A**（用户要"最方便"）。

---

## 3. 方案 A 改动清单

### 3.1 数据库迁移（1 个 SQL 脚本）

```sql
-- 1. 删除两个遗留字典的 data
DELETE FROM sys_dict_data WHERE dict_type IN ('osg_position_industry', 'osg_student_position_industry');

-- 2. 迁移 osg_position 22 条数据（粗值 → 细值）
UPDATE osg_position SET industry = 'other_company', company_type = 'other_company'
  WHERE industry = 'Investment Bank';
UPDATE osg_position SET industry = 'consulting', company_type = 'consulting'
  WHERE industry = 'Consulting';
UPDATE osg_position SET industry = 'swe_pm', company_type = 'swe_pm'
  WHERE industry = 'Tech';
UPDATE osg_position SET industry = 'buyside', company_type = 'buyside'
  WHERE industry = 'PE/VC';

-- 3. 迁移 osg_interview_bank industry_name（当前全空，无影响）
```

**备份**：执行前先 mysqldump 整个 `sys_dict_data` + `osg_position` 表到 `sql/backups/2026-04-19-industry-dict-snapshot.sql`

**映射规则**（需用户确认）：
- Investment Bank → `other_company`（留人工细分 Bulge Bracket/Elite Boutique/Middle Market）
- Consulting → `consulting`
- Tech → `swe_pm`
- PE/VC → `buyside`

### 3.2 后端 Java（3 个文件，约 4 处改动）

| 文件 | 改动 |
|---|---|
| `OsgPositionServiceImpl.java` | `DICT_POSITION_INDUSTRY = "osg_position_industry"` → `"osg_company_type"`（1 处）；`selectPositionMeta` 里 `meta.put("industries", ...)` 改为 `meta.put("companyTypes", ...)` |
| `PositionServiceImpl.java` (学生端) | `DICT_TYPE_POSITION_INDUSTRY = "osg_student_position_industry"` → `"osg_company_type"`（1 处） |
| `OsgInterviewBankController.java` | industry_name 字段字典引用切换（若有）|

**不改**：
- 实体类 `OsgPosition.industry` / `OsgPosition.companyType` 字段保留
- 字段名、变量名、DB 列名全部不动

### 3.3 前端 admin（3 个文件）

| 文件 | 改动 |
|---|---|
| `PositionFormModal.vue` | 第 242 行 `companyTypeOptions = computed(() => props.meta.industries \|\| [])` → `props.meta.companyTypes \|\| []`；第 327 行移除 `industry: form.companyType \|\| 'Investment Bank'` 兜底 |
| `positions/index.vue` | `industryMap` 重构用 `meta.companyTypes`，`getIndustryTone/Icon/Label` 对照新字典的 css_class/remark 字段。drill-down 分组保持 industry 字段但源值已是新字典 key |
| `columns.ts` | 表格列标题 "行业" 改为 "公司类别"（可选） |

### 3.4 前端其他 4 端（6 个源文件 + 4 个测试）

学生端 / 导师端 / 班主任端 / 助教端对 industry 字典的使用都是**读**（展示过滤、分组），字典 key 换了之后内容自动切换。无需逐文件改。但单测里的 mock 数据需同步。

### 3.5 测试同步

| 测试 | 改动 |
|---|---|
| `OsgPositionServiceImplTest.java` | dict mock 的 key 从 osg_position_industry 改为 osg_company_type，value 换成 bulge_bracket 等 |
| `OsgPositionControllerTest.java` | 同上 |
| `admin positions.spec.ts` | 断言中 "Investment Bank" 文案改为 "Bulge Bracket" 或对应值 |
| student / lead-mentor / assistant 单测 | 若 mock 涉及行业字典，同步换 key |

### 3.6 管理 UI "公司/银行类别" tab 继续用 osg_company_type

字典管理页不需要改（它本来就用 osg_company_type）。

---

## 4. 改动影响量估算

| 维度 | 数量 |
|---|---|
| DB 脚本 | 1 个（删字典 + 迁数据） |
| 后端 Java 文件 | 3 个，约 5 处改动 |
| 前端 admin 文件 | 3 个，约 8 处改动 |
| 前端其他 4 端文件 | 仅 mock 同步，不改业务代码 |
| 测试文件 | 4~6 个，约 20 处 mock/断言 |
| 工作量 | **半天**（实施 + 测试 + 部署） |

---

## 5. 风险与回滚

### 风险
1. **映射歧义**：Investment Bank → other_company 后，学员看到的是 "Other Company"，真实 BB 岗位会被归错。**缓解**：部署前可用公司名做精准映射（GS/MS/JPM→bulge_bracket，Moelis/Evercore→elite_boutique），需用户提供映射表
2. **学生端 0 数据但代码路径**：osg_student_position 暂无数据，新代码未经业务数据验证。**缓解**：保留 mock 测试
3. **面试题库 industry_name 空**：当前无影响，但未来填数据时需遵循 osg_company_type

### 回滚
1. 保留 `sql/backups/2026-04-19-industry-dict-snapshot.sql` 全量备份
2. 回滚 SQL：恢复 sys_dict_data + osg_position 两张表即可
3. 代码回滚：`git revert` 本次 commit

---

## 6. 执行计划

1. **用户确认本方案** + 映射规则
2. DB 备份 + 写迁移 SQL
3. 后端 + 前端 + 测试 一次性提交
4. 本地 `mvn test` + `pnpm test` 全通过
5. 本地 Playwright 验证岗位列表/编辑弹框
6. commit + push origin/main
7. 远端部署：`deploy-backend` + `deploy-frontend admin`
8. Playwright 远端回归验证

---

## 7. 等待决策

- [ ] 同意方案 A？
- [ ] 映射规则用"默认 other_company + 人工精细化"还是"基于公司名精确映射"？
- [ ] 本轮是否走 RPIV 主流程（/brainstorm → /split → /next），还是作为扩展的 /fix 一次性完成？
