# Mentor 端标准化方案

> 创建时间：2026-04-19
> 类型：技术重构（非功能性需求）
> 参考标准：[`admin-ui-unification-plan.md`](./admin-ui-unification-plan.md)
> 状态：待业务/工程确认、未排期

---

## 〇、本文档定位

以 admin 为唯一参考标准，描述 mentor（导师端）需要对齐的内容。**务必先阅读** `admin-ui-unification-plan.md`，本文档只记录 mentor 端独有的差异。

---

## 〇.1 前置共享包任务

本端重构启动前，必须先完成共享包前置任务（PageHeader / OverlaySurfaceModal 迁移、`useIndustryMeta` composable 新建、后端 meta 接口多端暴露）。

**前置任务方案与可执行细节详见**：`docs/plans/2026-04-19-shared-prerequisites-plan.md`

**本端启动的硬性前提**：前置任务 T1 / T2 / T4 任一未完成时，禁止在本端本地新建 PageHeader / OverlaySurfaceModal 副本，禁止本地写 `INDUSTRY_UI_CONFIGS` 或 industries 映射表。

消费姿势统一走主入口：
```ts
import { PageHeader, OverlaySurfaceModal, useIndustryMeta, usePagination, useStandardClientPagination } from '@osg/shared'
import type { PositionMetaOption } from '@osg/shared'  // industries 元素类型（字段 { value, label, tone?, icon?, parent?, remark? }）
```

**禁止**使用 `from '@osg/shared/composables'`（package.json exports 未导出该子路径，会解析失败）。`usePagination` / `useStandardClientPagination` 已存在于 shared 包，可直接复用。

---

## 一、Mentor 端现状扫描（2026-04-19）

| 维度 | 现状 | 与 admin 标准差距 |
|---|---|---|
| 页面总数 | 18 个 `.vue` | — |
| 使用 `<a-table>` | 0 个页面 | **最大** — 全量需要改 |
| 使用原生 `<table>` | 4 个页面 | 需全部替换 |
| 使用 `PageHeader` | 0 个页面 | 全部需要加 |
| 老字典硬编码 | 未发现 | 干净（主要原因：`job-tracking` 是 `PlaceholderPage`，尚未实装）|

### 1.1 特殊情况：`job-tracking` 尚未实装

`@osg-frontend/packages/mentor/src/views/job-tracking/index.vue` 目前仅为 `PlaceholderPage` 占位组件。这意味着：

- **机会**：可以**直接按 admin 标准设计**，不走"先做老的再改新的"弯路
- **决策点**：job-tracking 实装节奏和本文档描述的标准化如何协同？建议**一次到位**，实装时就按新标准落地

---

## 二、UI 层重构清单（对齐 admin §一~§十）

18 个页面建议按以下优先级：

### Phase 1：核心页面（6 个，已扫描确认存在）
- `views/students/index.vue` — 学员列表
- `views/schedule/index.vue` — 日程
- `views/mock-practice/index.vue` — 模拟面试
- `views/courses/index.vue` — 课程管理（含 `components/ReportModal.vue`）
- `views/job-overview/index.vue` — 求职概览
- `views/dashboard/index.vue` — 首页（mentor 端用 dashboard，不是 home）

### Phase 2：次要页面（11 个）
`views/profile` / `views/notice` / `views/files` / `views/qbank` / `views/expense` / `views/settlement` / `views/communication` / `views/faq` / `views/login` / `views/forgot-password` / `views/job-tracking`（最后一个走 Phase 3 实装）

### Phase 3（独立）：`job-tracking` 实装
- 按 admin `career/positions/index.vue` 为样板设计
- UI 结构：`PageHeader` + 筛选栏 `a-card` + `a-table` + `OverlaySurfaceModal`
- 数据/字典层：从一开始就消费 `osg_company_type` 字典 7 项

**改造要点**（参考 admin 标准）：
1. 页面头部：`import { PageHeader } from '@osg/shared/components'`（前置依赖见 §〇.1，禁止本地新建）
2. 原生 `<table>` → `<a-table>` + columns
3. 自定义遮罩弹窗：`import { OverlaySurfaceModal } from '@osg/shared/components'`（同上，禁止本地新建）
4. `App.vue` 配置 `colorPrimary` **对照 mentor 原型 `--primary` 变量**

---

## 三、数据/字典层重构清单（对齐 admin §十一）

### 3.1 现状干净，保持新项实装时遵循标准

**目标**：mentor 端当前没有老字典硬编码，未来新功能（job-tracking、模拟面试评分等）如需使用公司类别字段，**直接消费 `osg_company_type` 字典 7 项**。

**原则**（复用 admin §11.1-11.5）：
- 所有端的"公司类别"字段只用 `osg_company_type`（单一真源）
- mentor 端 service 只读字典，**不允许** upsert 回写
- 前端不做关键词猜分类，从字典 meta 拉 label/icon
- 老数据 fallback 走灰色默认显示

### 3.2 如果 job-tracking 实装时涉及岗位展示

需要后端提供 `MentorPositionService.selectPositionMeta` 之类的接口，返回 `osg_company_type` 字典的 7 项（含 css_class/list_class/dict_label）。前端消费方式参考 admin `positions/index.vue` 的 `meta.industries` 处理逻辑。

### 3.3 审计字段

规则（统一，不因端而异）：**凡是该端有写入接口（POST/PUT），必须遵循 admin §11.4 审计字段规范**。

Mentor 端已知的写入场景：
- `views/courses/components/ReportModal.vue` — 导师提交课程报告（提交时后端强制取当前 mentor ID 作为 `create_by`，前端不传；列表展示时 createBy / createTime 列放操作列前）
- `views/schedule/index.vue` — 导师创建/修改日程（同上）
- `views/mock-practice/index.vue` — 导师提交模拟评分（同上）

若 job-tracking 实装时有导师录入文档/备注等写入，同规则适用。

---

## 四、测试同步

Mentor 端是唯一有完整 `src/__tests__/` 目录的端（扫描到 16 个 spec 文件）。重构时需同步更新的关键测试：

| 真实测试文件 | 改动要点 |
|---|---|
| `osg-frontend/packages/mentor/src/__tests__/schedule.behavior.spec.ts` | schedule 页 UI 改造后的交互断言 |
| `osg-frontend/packages/mentor/src/__tests__/courses.behavior.spec.ts` | courses 页 UI 改造后的交互断言，含 ReportModal 壳子迁移 |
| `osg-frontend/packages/mentor/src/__tests__/mock-practice.behavior.spec.ts` | mock-practice 页 UI 改造后的交互断言 |
| `osg-frontend/packages/mentor/src/__tests__/job-overview.behavior.spec.ts` | job-overview 页 UI 改造后的交互断言 |
| `osg-frontend/packages/mentor/src/__tests__/page-smoke.spec.ts` | 所有页面 smoke 测试，重构后选器可能变化 |
| `osg-frontend/packages/mentor/src/__tests__/page-interactions.spec.ts` | 同上 |

Job-tracking 实装时需新写对应的 `.behavior.spec.ts`。

---

## 五、未决问题

| # | 问题 | 谁决策 |
|---|---|---|
| 1 | `job-tracking` 实装排期？（决定 Phase 3 何时启动） | 业务 |
| 2 | mentor 端 `colorPrimary` 主题色？ | 设计 |
| 3 | UI 改造 Phase 排期（18 页面预估 5-7 个工作日，不含 job-tracking 实装） | 工程排期 |

---

## 六、风险与注意事项

1. **mentor 是 UI 基础最弱的端（0 个 a-table）**：改造工作量等同于"从零搭建"
2. **PlaceholderPage 的业务逻辑缺失**：实装 job-tracking 时需要**先设计业务交互**，再按标准编码，不要反过来
3. **mentor 可以作为"标准落地的试验田"**：因为基础弱、少历史债，新做的一定符合标准；其他 3 端改造时可参考 mentor 端的新代码作为"活的样板"

---

## 七、验收

禁词采用**精确匹配**而非模糊 grep。

```bash
# 1. 老字典 value 作为字面量（对象的 value 字段）
rg "value:\s*['\"](ib|pevc|tech)['\"]" osg-frontend/packages/mentor/src --glob '!**/*.spec.ts' | wc -l  # 应为 0

# 2. 老字典 label（Investment Bank 等）作为字面量
rg -i "['\"]investment bank['\"]" osg-frontend/packages/mentor/src --glob '!**/*.spec.ts' | wc -l  # 应为 0

# 3. 老 CSS class、原生 table、自定义按钮 class
rg "\.industry-(ib|pevc|bank|tech)\b" osg-frontend/packages/mentor/src | wc -l  # 应为 0
rg "<table\s" osg-frontend/packages/mentor/src/views | wc -l  # 应为 0
rg "permission-button|ghost-button|primary-button" osg-frontend/packages/mentor/src | wc -l  # 应为 0

# 4. 本地映射表（禁止）
rg "INDUSTRY_UI_CONFIGS|COMPANY_TYPES\s*=" osg-frontend/packages/mentor/src --glob '!**/*.spec.ts' | wc -l  # 应为 0

# 5. PageHeader 来自 shared（禁止本地）
rg "^import.*PageHeader.*from" osg-frontend/packages/mentor/src/views | rg -v "'@osg/shared" | wc -l  # 应为 0
```

---

## 八、建议

考虑到 mentor 端改造量是"从零开始"且 `job-tracking` 尚未实装：

1. **不要急着按 18 页面逐个改**，而是先完成 §〇.1 **前置共享包任务**（详见 `docs/plans/2026-04-19-shared-prerequisites-plan.md`）：
   - 将 admin 的 PageHeader / OverlaySurfaceModal 抽到 `@osg/shared/components`（前置文档 T1 / T2）
   - 新建 `useIndustryMeta` composable（前置文档 T4）；**类型复用现有 `PositionMetaOption`（`osg-frontend/packages/shared/src/api/admin/position.ts:51`），不新建 `IndustryMeta`**
   - `packages/shared/src/composables/usePagination.ts` 已存在（含 `usePagination` / `useStandardClientPagination`），直接复用，无需新抽
2. **再配置 mentor 端 `App.vue` 的 colorPrimary**
3. **先实装 job-tracking**（作为"标杆页面"，从一开始就消费 `useIndustryMeta()`）
4. **再迁移存量 17 页面**

这样避免"先写一堆不标准的 job-tracking，再返工改造"的浪费。
