# Lead-Mentor 端标准化方案

> 创建时间：2026-04-19
> 类型：技术重构（非功能性需求）
> 参考标准：[`admin-ui-unification-plan.md`](./admin-ui-unification-plan.md)
> 状态：待业务/工程确认、未排期

---

## 〇、本文档定位

以 admin 为唯一参考标准，描述 lead-mentor 端需要对齐的内容。**务必先阅读** `admin-ui-unification-plan.md`，本文档只记录 lead-mentor 端独有的差异。

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

## 一、Lead-Mentor 端现状扫描（2026-04-19）

| 维度 | 现状 | 与 admin 标准差距 |
|---|---|---|
| 页面总数 | 17 个 `.vue` | — |
| 使用 `<a-table>` | 3 个页面 | 中等 — 其余 14 页面需要改 |
| 使用原生 `<table>` | 5 个页面 | 需全部替换 |
| 使用 `PageHeader` | 0 个页面 | 全部需要加 |
| 老字典硬编码 | 2 处（岗位 + 导师主攻方向） | 需清理 |

### 1.1 数据/字典层硬编码位置

**岗位页面（主要）** — `osg-frontend/packages/lead-mentor/src/views/career/positions/index.vue`

| 行号 | 内容 | 问题 |
|---|---|---|
| 466-494 | `INDUSTRY_UI_CONFIGS: Record<string, IndustryUiConfig> = { 'investment bank': {...}, 'consulting': {...}, 'tech': {...} }` | 3 项硬编码老 key 的 UI 配置表（icon/color/bgColor/borderColor 等）|
| 496 | `const FALLBACK_INDUSTRY_CONFIG: IndustryUiConfig = {...}` | fallback 配置本地定义，应该抽到 `useIndustryMeta` 的默认值 |
| 809 | `INDUSTRY_UI_CONFIGS[industry.trim().toLowerCase()] ?? FALLBACK_INDUSTRY_CONFIG` | fallback 写法正确，但 key 集不对 |
| CSS | `.industry-ib` / `.industry-consulting` / `.industry-tech` | 3 个分类配色，class 命名按 value ——应改按字典 `css_class` 字段 |

**导师主攻方向（独立字典）** — `osg-frontend/packages/lead-mentor/src/components/AssignMentorModal.vue`

| 行号 | 内容 | 问题 |
|---|---|---|
| 227 | `mainDirection = ref('ib')` | 表单默认值用老 key |

**说明**：导师主攻方向字典（`osg_mentor_direction` 或类似）**在语义上可能跟岗位字典不同**——导师可以"主攻 ib"或"主攻 consulting"，但这属于**人的方向**而非**公司类别**。需业务确认是否统一到 `osg_company_type`，还是保留独立字典。

---

## 二、UI 层重构清单（对齐 admin §一~§十）

17 个页面建议按以下优先级：

### Phase 1：核心业务页面（6 个，已扫描确认存在）
- `views/career/positions/index.vue` — 岗位库（**含字典硬编码**）
- `views/students/index.vue` — 学员管理
- `views/mentors/index.vue` — 导师管理
- `views/schedule/index.vue` — 导师分配日程
- `views/career/job-overview/index.vue` — 求职概览
- `views/home/index.vue` — 首页

### Phase 2：次要页面（11 个）
`views/dashboard` / `views/classes` / `views/reports` / `views/login` / `views/profile` / `views/profile/basic` / `views/profile/schedule` / `views/career/mock-practice` / `views/teaching/class-records`（含 `LeadMentorClassReportFlowModal.vue`）/ `views/teaching/students`，以及其他根级次要页

**改造要点**（参考 admin 标准）：
1. 页面头部：`import { PageHeader } from '@osg/shared/components'`（前置依赖见 §〇.1，禁止本地新建）
2. 原生 `<table>` → `<a-table>` + columns
3. 自定义遮罩弹窗：`import { OverlaySurfaceModal } from '@osg/shared/components'`（同上，禁止本地新建）
4. `App.vue` 配置 `colorPrimary` **对照 lead-mentor 原型 `--primary` 变量**

---

## 三、数据/字典层重构清单（对齐 admin §十一）

### 3.1 废除本地 INDUSTRY_UI_CONFIGS，改消费 useIndustryMeta（必须做）

**目标**：删除本地定义的 `INDUSTRY_UI_CONFIGS`（行 466-494）和 `FALLBACK_INDUSTRY_CONFIG`（行 496），改为统一调用 `useIndustryMeta`（见前置文档 T4）。

```ts
// 改造前（行 466-494 + 496）：本地硬编码三项老 key 的 icon/color/bgColor...
// 【禁止】任何端再本地写 INDUSTRY_UI_CONFIGS

// 改造后：从 shared composable 读字典元数据
import { useIndustryMeta } from '@osg/shared'
const { meta, load } = useIndustryMeta()
onMounted(load)
// meta.value 类型为 PositionMetaOption[]，每项有 value/label/tone/icon 等字段

// 行 809 fallback 改为
const match = meta.value.find(m => m.value === industry?.trim())
const config = match ?? { value: 'other_company', label: '未归类', tone: 'slate', icon: 'mdi-briefcase' }
```

**为什么不在前端写具体 icon 值**：迁移脚本 `sql/migrations/2026-04-19-industry-dict-to-company-type.sql` 已为字典 7 项分配好 `css_class`（gold/violet/blue/amber/teal/indigo/slate——映射到 `PositionMetaOption.tone`）和 `list_class`（mdi-trophy/mdi-diamond-stone/mdi-city/mdi-currency-usd/mdi-lightbulb/mdi-laptop/mdi-briefcase——映射到 `PositionMetaOption.icon`）。后端 meta 接口直接返回，前端一行不必硬编码。未来业务改图标/配色时，**只改字典不改前端代码**。

### 3.2 CSS class 命名规则（绑定 `css_class` 字段，不绑定 value）

```scss
// 改造前：包含老 key 的 class 名
.industry-ib { ... }
.industry-consulting { ... }
.industry-tech { ... }

// 改造后：按字典 css_class 字段命名（7 个色系 token）
.industry-gold   { ... }  // 对应 bulge_bracket
.industry-violet { ... }  // 对应 elite_boutique
.industry-blue   { ... }  // 对应 middle_market
.industry-amber  { ... }  // 对应 buyside
.industry-teal   { ... }  // 对应 consulting
.industry-indigo { ... }  // 对应 swe_pm
.industry-slate  { ... }  // 对应 other_company
```

模板里用：`:class="\`industry-${config.tone}\`"`（`PositionMetaOption.tone` 对应字典 `css_class`）。

**为什么按 `tone`（= 字典 `css_class`）而不按 value**：未来字典新增一项，若它复用现有色系（如也用 `gold`），前端一行不用改；按 value 命名则必须每次改字典同时改 CSS。

### 3.3 导师主攻方向（需业务决策）

`AssignMentorModal.vue:227` 的 `mainDirection = ref('ib')`：
- **选项 A**：导师主攻方向也统一到 `osg_company_type`（7 项复用）
- **选项 B**：保留独立字典 `osg_mentor_direction`，单独处理

**建议**：保留独立字典（选项 B）。因为导师的"主攻方向"可能有粒度更细的需求（如"Bulge Bracket IB 方向"/"Consulting Strategy 方向"），跟岗位的 7 项公司分类不一定完全对应。**需业务确认**。

无论选 A 还是 B，行 227 的默认值 `'ib'` 都必须删除（老字典 value）。选 A 改为 `ref('')` 等 meta 加载后用 `meta.value[0]?.value`；选 B 改为新字典的第一项 value。

### 3.4 审计字段

规则（统一，不因端而异）：**凡是该端有写入接口（POST/PUT），必须遵循 admin §11.4 审计字段规范**。

Lead-Mentor 端已知的写入场景：
- `views/teaching/class-records/LeadMentorClassReportFlowModal.vue` — lead-mentor 对课程报告的审核/驳回（操作时后端强制取当前 lead-mentor ID 作为 `update_by`；列表展示时 updateBy/updateTime 列放操作列前）
- `components/AssignMentorModal.vue` — lead-mentor 给学员分配导师（同上）
- `views/schedule/index.vue` — lead-mentor 调整导师日程（同上）

---

## 四、测试同步

基于实际扫描到的 `src/__tests__/` 文件（`positions-real-flow.spec.ts` / `story-s041-regression.spec.ts` / `mentor-assign.spec.ts` 不存在）：

| 真实测试文件 | 改动要点 |
|---|---|
| `osg-frontend/packages/lead-mentor/src/__tests__/positions-shell.spec.ts` | mock `meta.industries` 改新 7 项 `PositionMetaOption[]`（含 tone/icon 字段）；断言 CSS class 采用 `industry-{tone}` 格式 |
| `osg-frontend/packages/lead-mentor/src/__tests__/job-assign-mentor-modal.spec.ts` | AssignMentorModal 的 mainDirection 默认值断言跟随§3.3 决策更新 |
| `osg-frontend/packages/lead-mentor/src/__tests__/story-s045-regression.spec.ts` | 若涉及岗位字典或 CSS class，同步更新 |
| `osg-frontend/packages/lead-mentor/src/__tests__/story-s046-regression.spec.ts` | 同上 |

---

## 五、未决问题

| # | 问题 | 谁决策 |
|---|---|---|
| 1 | 7 种公司分类各自的图标/配色规则？（可从 admin 字典复用） | 业务 + 设计 |
| 2 | 导师主攻方向字典是否统一到 `osg_company_type`？ | 业务（§3.3） |
| 3 | lead-mentor 端 `colorPrimary` 主题色？ | 设计 |
| 4 | UI 改造 Phase 排期（17 页面预估 4-6 个工作日）？ | 工程排期 |

---

## 六、风险与注意事项

1. **迁移后数据状态实际为空字符串**（校正原描述）：迁移脚本 `sql/migrations/2026-04-19-industry-dict-to-company-type.sql` 第 9 行 `UPDATE osg_position SET industry = '', company_type = ''` 把 22 条岗位清空为空串，**不是映射到新 value**。lead-mentor 端看到的是空值，需 fallback 显示"未归类"（灰色 `slate` + `mdi-briefcase`）；业务需在 admin 字典管理 UI 手动重新归类
2. **历史老数据（如 `"Investment Bank"` 字符串）在 lead-mentor 侧不会被 admin 的迁移脚本清理**：要确保 fallback 分支能处理任何字符串，不报错
3. **`INDUSTRY_UI_CONFIGS` key 大小写敏感**：改造前是 `'investment bank'`（空格+小写），后端返回是 `bulge_bracket`（下划线+小写）。改用 `useIndustryMeta` 后这个问题自然解决（处理换成 value 精确匹配）

---

## 七、验收

禁词采用**精确匹配**而非模糊 grep，避免误伤合法英文单词（如 `tech stack`）。

```bash
# 1. 老字典 value 作为字面量（对象的 value 字段）
rg "value:\s*['\"](ib|pevc|tech)['\"]" osg-frontend/packages/lead-mentor/src --glob '!**/*.spec.ts' | wc -l  # 应为 0

# 2. 老字典 label（Investment Bank 等）作为字面量
rg -i "['\"]investment bank['\"]" osg-frontend/packages/lead-mentor/src --glob '!**/*.spec.ts' | wc -l  # 应为 0

# 3. 老 CSS class（按 value 命名的）
rg "\.industry-(ib|pevc|bank|tech)\b" osg-frontend/packages/lead-mentor/src --glob '!**/*.spec.ts' | wc -l  # 应为 0
# 注：spec.ts 里可能存在 `expect(...querySelector('.industry-bank')).toBeFalsy()` 这类防御性断言，属合法引用

# 4. 原生 table / 自定义按钮 class
rg "<table\s" osg-frontend/packages/lead-mentor/src/views | wc -l  # 应为 0
rg "permission-button|ghost-button|primary-button" osg-frontend/packages/lead-mentor/src | wc -l  # 应为 0

# 5. 本地映射表（禁止）
rg "INDUSTRY_UI_CONFIGS|FALLBACK_INDUSTRY_CONFIG" osg-frontend/packages/lead-mentor/src --glob '!**/*.spec.ts' | wc -l  # 应为 0

# 6. PageHeader 来自 shared（禁止本地）
rg "^import.*PageHeader.*from" osg-frontend/packages/lead-mentor/src/views | rg -v "'@osg/shared" | wc -l  # 应为 0
```
