# Assistant 端标准化方案

> 创建时间：2026-04-19
> 类型：技术重构（非功能性需求）
> 参考标准：[`admin-ui-unification-plan.md`](./admin-ui-unification-plan.md)
> 状态：§三 数据/字典层 3.1+3.2 ✅ 已完成（2026-04-20）| §四 测试同步 ✅ | §二 UI 层 🚫 受阻于 T1/T2

---

## 〇、本文档定位

以 admin 为唯一参考标准，描述 assistant（助教端）需要对齐的内容。**务必先阅读** `admin-ui-unification-plan.md`，本文档只记录 assistant 端独有的差异。

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

## 一、Assistant 端现状扫描（2026-04-19）

| 维度 | 现状 | 与 admin 标准差距 |
|---|---|---|
| 页面总数 | 15 个 `.vue` | — |
| 使用 `<a-table>` | 2 个页面 | 大 — 其余 13 个需要改 |
| 使用原生 `<table>` | 5 个页面 | 需全部替换 |
| 使用 `PageHeader` | 0 个页面 | 全部需要加 |
| 含 `ghost-button` / `primary-button` | 2 个页面 | 需清理自定义按钮 class |
| 老字典硬编码 | 隐式（关键词匹配）| 需重构逻辑 |

### 1.1 数据/字典层硬编码位置

**岗位页面（主要）** — `osg-frontend/packages/assistant/src/views/career/positions/index.vue`

该页面**没有老 4 分类的 key 硬编码**，但走了另一种反模式：**用关键词匹配 industry 字符串**。

| 行号 | 内容 | 问题 |
|---|---|---|
| 619-631 | `industryTone(industry)` — `if (normalized.includes('bank')) return 'industry-bank'` 等 | 按英文关键词 `bank/consult/tech` 推断 CSS class，老字典语义 |
| 633-645 | `industryIcon(industry)` — 同上，返回 `mdi-bank/mdi-lightbulb/mdi-laptop` | 同上 |
| 647-659 | `industryColor(industry)` — 返回 3 种颜色 | 同上 |
| 661-676 | `industryGradient(industry)` — 返回 3 种渐变 | 同上 |
| 1170-1183 | CSS `.industry-bank` / `.industry-consulting` / `.industry-tech` | 老 3 项配色 |

**本质问题**：`industryTone/Icon/Color/Gradient` 4 个函数复刻了 admin 后端老代码里 `looksLikeConsulting/Tech` 的**反模式**——从字符串中猜分类，而不是消费字典元数据。

---

## 二、UI 层重构清单（对齐 admin §一~§十）

15 个页面建议按以下优先级：

### Phase 1：核心业务页面（6 个，已扫描确认存在）
- `views/career/positions/index.vue` — 岗位信息（含字典反模式）
- `views/career/job-overview/index.vue` — 求职概览
- `views/career/mock-practice/index.vue` — 模拟面试
- `views/students/index.vue` — 学员管理
- `views/class-records/index.vue` — 上课记录（已部分用 Ant）
- `views/home/index.vue` — 首页

### Phase 2：次要页面（9 个）
`views/schedule` / `views/profile` / `views/login` / `views/forgot-password` / `views/feedback` / `views/materials` / `views/dashboard` / `views/placeholder` / `views/_shared/AssistantPlaceholderShell.vue`

**改造要点**（参考 admin 标准）：
1. 页面头部：`import { PageHeader } from '@osg/shared/components'`（前置依赖见 §〇.1，禁止本地新建）
2. 原生 `<table>` → `<a-table>` + columns
3. 自定义遮罩弹窗：`import { OverlaySurfaceModal } from '@osg/shared/components'`（同上，禁止本地新建）
4. `ghost-button` / `primary-button` 自定义 class → `<a-button>`
5. `App.vue` 配置 `colorPrimary` **对照 assistant 原型 `--primary` 变量**

---

## 三、数据/字典层重构清单（对齐 admin §十一）

### 3.1 ✅ 废除"关键词匹配"反模式，改为消费 useIndustryMeta

> **完成于** 2026-04-20 | commit `3be4d041`

**目标**：删除 `industryTone/Icon/Color/Gradient` 4 个本地函数（行 619-676），改为从 `@osg/shared/composables/useIndustryMeta` 统一读字典。

```ts
// 改造前（反模式：字符串关键词匹配）
function industryTone(industry?: string) {
  const normalized = String(industry || '').toLowerCase()
  if (normalized.includes('bank')) return 'industry-bank'
  if (normalized.includes('consult')) return 'industry-consulting'
  if (normalized.includes('tech')) return 'industry-tech'
  return 'neutral'
}
// industryIcon / industryColor / industryGradient 类似，全从字符串猜
// 【禁止】任何端再写“猜分类”逻辑

// 改造后：从 shared composable 直接拿字典元数据
import { useIndustryMeta } from '@osg/shared'
import type { PositionMetaOption } from '@osg/shared'
const { meta, load } = useIndustryMeta()
onMounted(load)

function configFor(industry?: string): PositionMetaOption {
  if (!industry) return { value: '', label: '未归类', tone: 'slate', icon: 'mdi-briefcase' }
  return meta.value.find(m => m.value === industry)
      ?? { value: '', label: '未归类', tone: 'slate', icon: 'mdi-briefcase' }
}
// 模板里直接 :class="`industry-${configFor(industry).tone ?? 'slate'}`"
//           :icon="`mdi ${configFor(industry).icon ?? 'mdi-briefcase'}`"
```

**为什么删四个函数而不是“改四个函数”**：color / gradient / tone / icon 在字典里只需要两个字段（`css_class` / `list_class`，对应 `PositionMetaOption.tone` / `PositionMetaOption.icon`）就够表达。嵌套定义 4 个函数是原来反模式的产物，不应被保留。

**实现步骤**：
1. 后端 meta 接口返回 `osg_company_type` 字典 7 项（含 `css_class`/`list_class`/`dict_label`，映射为 `PositionMetaOption` 的 `tone`/`icon`/`label`），具体多端暴露策略见前置文档 T3
2. 前端 `useIndustryMeta` 从 shared 读，进程内缓存，一个页面生命周期只拉一次
3. 所有页面的 icon/color/bgColor/borderColor/gradient 都按 `tone` 映射到预先定义的 7 个色系 token
4. 字典缺失时走 fallback（灰色 `slate` + `mdi-briefcase`，与 admin 保持一致）

### 3.2 ✅ CSS class 命名规则（绑定 `css_class` 字段，不绑定 value）

> **完成于** 2026-04-20 | commit `3be4d041`

```scss
// 改造前（7 项反模式 class 名）
.industry-bank { ... }
.industry-consulting { ... }
.industry-tech { ... }
// 还有 .industry-bank__gradient / industry-consulting__gradient 等嵌套命名

// 改造后：按字典 css_class 字段命名（7 个色系 token）
.industry-gold   { ... }  // 对应 bulge_bracket
.industry-violet { ... }  // 对应 elite_boutique
.industry-blue   { ... }  // 对应 middle_market
.industry-amber  { ... }  // 对应 buyside
.industry-teal   { ... }  // 对应 consulting
.industry-indigo { ... }  // 对应 swe_pm
.industry-slate  { ... }  // 对应 other_company
```

模板里用：`:class="\`industry-${configFor(industry).tone ?? 'slate'}\`"`（`PositionMetaOption.tone` 对应字典 `css_class`）。

**为什么按 `tone`（= 字典 `css_class`）而不按 value**：未来字典新增一项，若它复用现有色系（如也用 `gold`），前端一行不用改；按 value 命名则必须每次改字典同时改 CSS。

### 3.3 审计字段

规则（统一，不因端而异）：**凡是该端有写入接口（POST/PUT），必须遵循 admin §11.4 审计字段规范**。

Assistant 端已知的写入场景：
- `views/class-records/index.vue` — 助教录入/编辑上课记录（提交时后端强制取当前用户作为 `create_by` / `update_by`；列表展示时 createBy/updateBy 列放操作列前）
- `views/feedback/index.vue` — 反馈提交（同上）
- `views/career/mock-practice/index.vue` — 模拟面试记录提交（同上）

---

## 四、测试同步

基于实际扫描到的 `src/__tests__/` 文件（`positions.spec.ts` 不存在）：

| 真实测试文件 | 改动要点 |
|---|---|
| `osg-frontend/packages/assistant/src/__tests__/career-pages.spec.ts` | mock `meta.industries` 改新 7 项 `PositionMetaOption[]`（含 tone/icon 字段）；断言产出 CSS class 采用 `industry-{tone}` 格式 |
| `osg-frontend/packages/assistant/src/__tests__/career-api-contract.spec.ts` | meta 接口返回契约测试，确保后端 `css_class`/`list_class` 字段被正确映射为前端 `PositionMetaOption.tone` / `PositionMetaOption.icon` |
| `osg-frontend/packages/assistant/src/__tests__/product-copy-guard.spec.ts` | 若涉及岗位文案，同步更新端侧文案到新字典 |

---

## 五、未决问题

| # | 问题 | 谁决策 |
|---|---|---|
| 1 | 7 种公司分类各自的图标/配色规则？ | 业务 + 设计 |
| 2 | 后端 AssistantPositionService 的 meta API 是否已返回 css_class/list_class？不行要扩字段 | 工程 |
| 3 | assistant 端 `colorPrimary` 主题色？ | 设计 |
| 4 | UI 改造 Phase 排期（15 页面预估 4-5 个工作日）？ | 工程排期 |

---

## 六、风险与注意事项

1. **`industryTone` 被岗位列表的每行 render 调用**：改造时注意性能（meta 只加载一次，不要每次调用都 fetch）
2. **迁移后数据状态实际为空字符串**（校正原描述）：迁移脚本 `sql/migrations/2026-04-19-industry-dict-to-company-type.sql` 第 9 行 `UPDATE osg_position SET industry = '', company_type = ''` 把 22 条岗位清空为空串，**不是映射到新 value**。assistant 端看到的是空值，需 fallback 显示"未归类"（灰色 `slate` + `mdi-briefcase`）；业务需在 admin 字典管理 UI 手动重新归类
3. **4 个关键词匹配函数调用点较多**：grep `industryTone|industryIcon|industryColor|industryGradient` 在页面里出现约 10+ 次，需全量替换并统一为 `configFor(industry)` 调用

---

## 七、验收

禁词采用**精确匹配**而非模糊 grep，避免误伤合法英文单词（如 `tech stack`）。

```bash
# 1. 关键词匹配反模式（assistant 特有）
rg "normalized\.includes\(['\"](bank|consult|tech)['\"]\)" osg-frontend/packages/assistant/src | wc -l  # 应为 0

# 2. 老字典 value 作为字面量
rg "value:\s*['\"](ib|pevc|tech)['\"]" osg-frontend/packages/assistant/src --glob '!**/*.spec.ts' | wc -l  # 应为 0

# 3. 老字典 label（Investment Bank 等）
rg -i "['\"]investment bank['\"]" osg-frontend/packages/assistant/src --glob '!**/*.spec.ts' | wc -l  # 应为 0

# 4. 老 CSS class（按 value 命名的）
rg "\.industry-(ib|pevc|bank|tech)\b" osg-frontend/packages/assistant/src | wc -l  # 应为 0

# 5. 原生 table / 自定义按钮 class
rg "<table\s" osg-frontend/packages/assistant/src/views | wc -l  # 应为 0
rg "ghost-button|primary-button" osg-frontend/packages/assistant/src | wc -l  # 应为 0

# 6. 本地映射表和 4 个反模式函数（禁止）
rg "INDUSTRY_UI_CONFIGS|COMPANY_TYPES\s*=" osg-frontend/packages/assistant/src --glob '!**/*.spec.ts' | wc -l  # 应为 0
rg "^function industry(Tone|Icon|Color|Gradient)\b" osg-frontend/packages/assistant/src/views | wc -l  # 应为 0

# 7. PageHeader 来自 shared（禁止本地）
rg "^import.*PageHeader.*from" osg-frontend/packages/assistant/src/views | rg -v "'@osg/shared" | wc -l  # 应为 0
```
