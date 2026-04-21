# Student 端标准化方案

> 创建时间：2026-04-19
> 类型：技术重构（非功能性需求）
> 参考标准：[`admin-ui-unification-plan.md`](./admin-ui-unification-plan.md)
> 状态：§三.1 岗位字典统一 ✅（2026-04-20）| §三.2 后端简化 ✅ 最小改动版（2026-04-20）| §三.3 面试题库字典 / §二 UI 层 待推进

---

## 〇、本文档定位

Admin 端已完成 UI 层（§一~§十）+ 数据/字典层（§十一~§十二）的完整标准化。本文档以 admin 为**唯一参考标准**，描述 student 端需要对齐的内容。

**务必先阅读** `admin-ui-unification-plan.md` 的全部章节，本文档只记录 student 端独有的差异和重构清单。

---

## 〇.1 前置共享包任务

本端重构启动前，必须先完成共享包前置任务（PageHeader / OverlaySurfaceModal 迁移、`useIndustryMeta` composable 新建、后端 meta 接口多端暴露）。

**前置任务方案与可执行细节详见**：`docs/plans/2026-04-19-shared-prerequisites-plan.md`

**本端启动的硬性前提**：前置任务 T1 / T2 / T4 任一未完成时，禁止在本端本地新建 PageHeader / OverlaySurfaceModal 副本，禁止本地写 `INDUSTRY_UI_CONFIGS` 或 industries 映射表。

消费姿势统一走主入口：
```ts
import { PageHeader, OverlaySurfaceModal, useIndustryMeta } from '@osg/shared'
import type { PositionMetaOption } from '@osg/shared'  // industries 元素类型（字段 { value, label, tone?, icon?, parent?, remark? }）
```

**禁止**使用 `from '@osg/shared/composables'`（package.json exports 未导出该子路径，会解析失败）。

---

## 一、Student 端现状扫描（2026-04-19）

| 维度 | 现状 | 与 admin 标准差距 |
|---|---|---|
| 页面总数 | 27 个 `.vue` | — |
| 使用 `<a-table>` | 4 个页面 | **大** — 其余 23 页面还用原生 table 或自定义组件 |
| 使用原生 `<table>` | 14 个页面 | 需全部替换 |
| 使用 `PageHeader` | 0 个页面 | 全部需要加 |
| 老字典硬编码 | 3 个页面（positions / questions / interview-bank） | 需全部清理 |

### 1.1 数据/字典层硬编码位置

**岗位页面（主要）** — `@osg-frontend/packages/student/src/views/positions/index.vue`

| 行号 | 内容 | 问题 |
|---|---|---|
| 619 | `type IndustryKey = PositionRecord['industry']` | 类型别名，依赖后端返回值 |
| 663 | `const activeCategories = ref(['ib'])` | 默认展开分类硬编码老 key |
| 706-713 | `COMPANY_TYPES = [{ value: 'ib', label: 'Investment Bank' }, ...]` | 4 项硬编码老字典（ib/consulting/tech/pevc）|
| 876-877 | `const groups = new Map<IndustryKey, ...>` + `key: IndustryKey` | 分组逻辑 |
| 910 | `const order: IndustryKey[] = ['ib', 'consulting', 'tech', 'pevc']` | 展示排序硬编码 |
| CSS | `.industry-ib` / `.industry-consulting` / `.industry-tech` / `.industry-pevc` | 4 个分类配色 |

**面试题库页面** — `@osg-frontend/packages/student/src/views/questions/index.vue`
- 行 241：`{ value: 'ib', label: 'Investment Banking' }` 等（**独立字典**：面试题库方向，跟岗位字典语义不同，需业务判断是否也统一到 `osg_company_type`）

**面试资料页面** — `@osg-frontend/packages/student/src/views/interview-bank/index.vue`
- 行 68-70：`{ value: 'ib', label: 'Investment Banking' }` 等（同上，独立字典）

### 1.2 后端 Student API 侧情况

`ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java` 里保留了 150+ 行 4 分类归类逻辑：
- `resolveIndustryValue` / `resolveIndustryLabel` / `fallbackIndustryLabel` / `fallbackIndustryIcon`
- `looksLikeConsulting` / `looksLikeTech` / `looksLikePevc` / `looksLikeIb`

这段逻辑**不需要归类代码**（按 admin 标准 §11.3，由业务在 admin 后台手选），可以大幅简化为"从 `osg_company_type` 字典直接查 label/icon，查不到走 fallback"。

---

## 二、UI 层重构清单（对齐 admin §一~§十）

按 admin 标准对 27 个页面逐个改造。建议按以下优先级分批：

### Phase 1：核心业务页面（8 个）
- `views/positions/index.vue` — 岗位信息
- `views/applications/index.vue` — 我的求职
- `views/interview/index.vue` — 面试
- `views/questions/index.vue` — 面试题目
- `views/interview-bank/index.vue` — 面试资料
- `views/resume/index.vue` — 简历
- `views/mentors/index.vue` — 导师
- `views/home/index.vue` — 首页

### Phase 2：次要页面（其余 19 个）

**改造要点**（每页都要做）：
1. 页面头部：`import { PageHeader } from '@osg/shared/components'`（前置依赖见 §〇.1，shared 未抽出前禁止本地新建）
2. 原生 `<table>` → `<a-table>` + columns 定义
3. 原生 `<input>`/`<select>` → `<a-input>` / `<a-select>`
4. 自定义按钮 class → `<a-button>` 各 type
5. 自定义遮罩弹窗：`import { OverlaySurfaceModal } from '@osg/shared/components'`（同上，禁止本地新建）
6. `App.vue` 配置 `<a-config-provider :theme="{ token: { colorPrimary: '#xxx' } }">`（**colorPrimary 值需要业务方对照 student 端原型 `--primary` 提供**）

---

## 三、数据/字典层重构清单（对齐 admin §十一）

### 3.1 ✅ 岗位字典统一（必须做）

> **完成于** 2026-04-20 | commit `80785ab6`
>
> 实际执行同时带上了 `shared/api/positions.ts`：将 `StudentPositionRecord.industry` 从 4-值老 union 扩宽为 `string`（后端现在返回 `osg_company_type` 字典 7 项 value）。

**目标**：删除 4 项老字典（`ib/consulting/tech/pevc`）硬编码，改为消费 `osg_company_type` 新字典 7 项。

| 文件 | 改动 |
|---|---|
| `views/positions/index.vue` 行 706-713 | 删除本地 `COMPANY_TYPES` 数组；改为 `const { meta, load } = useIndustryMeta()` + `onMounted(load)`，`meta.value` 类型为 `PositionMetaOption[]` |
| 行 619 | `type IndustryKey = PositionRecord['industry']` **保留不动**（从接口推导，本身就是动态的，无需改）|
| 行 663 | `activeCategories = ref<string[]>([])`，初始值改为 `meta.value[0]?.value` 或空数组（不再硬编码 `'ib'`）|
| 行 910 | 删除硬编码 `order` 数组；改用 `meta.value.map(m => m.value)`（字典 `dict_sort` 已决定顺序）|
| CSS `.industry-*` | 按字典 `css_class` 字段值定义：`.industry-gold / .industry-violet / .industry-blue / .industry-amber / .industry-teal / .industry-indigo / .industry-slate`（迁移脚本已为 7 项分配色系 token），模板里用 `:class="\`industry-${configFor(industry).tone ?? 'slate'}\`"`（`PositionMetaOption.tone` 对应字典 `css_class`）|

### 3.2 ✅ 后端 PositionServiceImpl 简化（最小改动版）

> **完成于** 2026-04-20 | commit `746f3656`
>
> **已删**：
> - `line 516` 硬编码 `"Investment Bank"` fallback → `""`
> - `resolveIndustryLabel` switch default `"Investment Bank"` → 返原值
> - `fallbackIndustryLabel` 4-分类 switch → 返原始 industry 字符串
> - `fallbackIndustryIcon` 4-分类 switch → 返空，前端 `useIndustryMeta` 走 FALLBACK
>
> **保留**（待数据暴露问题再决定）：
> - `resolveIndustryValue` — 导出逻辑 line 1670/1716 仍在用
> - `normalizeApplicationCompanyType` + `looksLikeIb/Consulting/Tech/Pevc` — 申请分桶归类逻辑，涉及现有数据兼容
>
> 遵循“最短路径 + 不过度工程”原则。

按 admin §11.3（**后端 derive 而非硬编码**）：

- 删除 `resolveIndustryValue` / `looksLikeConsulting/Tech/Pevc/Ib` — 不需要从公司名推断
- 简化 `fallbackIndustryLabel` / `fallbackIndustryIcon`：从 `osg_company_type` 字典查，查不到返回 `other_company` 样式
- 删除 line 517 `resolveProfileField(userId, "primaryDirection", "Investment Bank")` 硬编码 `"Investment Bank"` fallback

### 3.3 面试题库字典（需业务决策）

`questions/index.vue` 行 241 和 `interview-bank/index.vue` 行 68-70 的 `{ value: 'ib', label: 'Investment Banking' }` 等是**面试题库方向字典**，语义上跟岗位的公司类别不完全一样：
- **选项 A**：也统一到 `osg_company_type`（7 项复用）
- **选项 B**：单独维护 `osg_interview_bank_industry` 字典（面试题库独立语义）

**建议**：保留独立字典（选项 B），因为"面试题库按方向分"和"岗位按公司类别分"是两个维度。**需业务确认**。

### 3.4 审计字段

规则（统一，不因端而异）：**凡是该端有写入接口（POST/PUT），必须遵循 admin §11.4 审计字段规范**。

Student 端当前识别到的写入场景：
- `views/positions/index.vue` 的"手动添加岗位"（提交后进入 admin 审核）— 提交时后端强制取当前 student ID 作为 `create_by`，前端不传

---

## 四、测试同步

Student 端**无 `src/__tests__/` 目录**（扫描确认），所有测试集中在 `e2e/` 下。

| 真实测试文件 | 改动 |
|---|---|
| `osg-frontend/packages/student/e2e/positions.e2e.spec.ts` | 断言 `company_type` 值域从老字典（`Investment Bank` 等）→ 新字典 7 项 label |
| `osg-frontend/packages/student/e2e/applications.e2e.spec.ts` | 同上 |

若新增 positions 组件的单元测试，在 `src/` 下新建 `__tests__/` 目录。

---

## 五、未决问题

| # | 问题 | 谁决策 |
|---|---|---|
| 1 | 7 种公司分类各自的图标/配色/排序规则？ | 业务 + 设计 |
| 2 | 面试题库的"方向"字典是否也统一到 `osg_company_type`？ | 业务（§3.3） |
| 3 | student 端 `colorPrimary` 主题色？（对照 student 原型） | 设计 |
| 4 | UI 改造 Phase 排期（27 页面预估 7-10 个工作日）？ | 工程排期 |

---

## 六、风险与注意事项

1. **student 是学员直接使用的端，UI 改动可见度高**：每批改完后必须浏览器回归
2. **API 契约向后兼容**：后端 PositionServiceImpl 简化时如果改返回字段名会破坏 student 前端；优先保持字段名，只改值域
3. **CSS 老 class `.industry-ib` 等被多处引用**：grep 后一次性替换，避免遗漏
4. **admin 迁移后数据状态**：迁移脚本 `sql/migrations/2026-04-19-industry-dict-to-company-type.sql` 第 9 行 `UPDATE osg_position SET industry = '', company_type = ''` 把 22 条岗位清空为空串，**业务需手动在 admin 字典管理 UI 重新归类**。student 端在业务补齐前看到的是空值，走 fallback 显示"未归类"（灰色 `slate` + `mdi-briefcase`）

---

## 七、验收

禁词采用**精确匹配**而非模糊 grep，避免误伤合法英文单词（如 `tech stack`）。

```bash
# 1. 老字典 value 作为字面量（对象的 value 字段）
rg "value:\s*['\"](ib|pevc|tech)['\"]" osg-frontend/packages/student/src --glob '!**/*.spec.ts' | wc -l  # 应为 0

# 2. 老字典 label（Investment Bank 等）作为字面量
rg -i "['\"]investment bank['\"]" osg-frontend/packages/student/src --glob '!**/*.spec.ts' | wc -l  # 应为 0

# 3. 老 CSS class（按 value 命名的）
rg "\.industry-(ib|pevc|bank|tech)\b" osg-frontend/packages/student/src | wc -l  # 应为 0

# 4. 原生 table
rg "<table\s" osg-frontend/packages/student/src/views | wc -l  # 应为 0

# 5. 自定义按钮 class
rg "permission-button|ghost-button|primary-button" osg-frontend/packages/student/src | wc -l  # 应为 0

# 6. 本地映射表（禁止）
rg "INDUSTRY_UI_CONFIGS|COMPANY_TYPES\s*=" osg-frontend/packages/student/src --glob '!**/*.spec.ts' | wc -l  # 应为 0
```
