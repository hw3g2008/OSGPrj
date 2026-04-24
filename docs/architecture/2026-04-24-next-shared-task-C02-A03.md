# 下一项架构任务：抽 C-02 `useCoachingStatusMap` + A-03 `<CoachingStatusTag>`

> **对应路线图**：`docs/architecture/2026-04-24-shared-frontend-roadmap.md` §4.1 C-02 + §4.2 A-03
> **上一项已完成**：C-01 `useInterviewCalendar` + B-01 `<InterviewCalendar>`（3 端日历统一）
> **本项预计工作量**：1 个工作窗口（约 1.5–2 小时）
> **独立性**：✅ 可单独窗口推进，不依赖其他 ticket

---

## 一、为什么是它

### 1.1 现状重复度

跨 5 端搜索 `coachingStatus` 相关映射发现 **67 个文件** 在各自维护"状态 → 标签/颜色"的转换逻辑：

| 端 | 现状 | 典型片段 |
|---|---|---|
| **Mentor** | 硬编码 `if/else` + `statusLabelMap` + 自定义 class `pulse-tag/coaching-tag` | `@osg/mentor/views/job-overview/index.vue:83-87` |
| **Assistant** | 有 `coachingColor()` 函数，antd `<a-tag>`（**技术栈最新**） | `@osg/assistant/views/career/job-overview/index.vue:85` |
| **Lead-Mentor** | `resolveStatusTone()` 返回 tone 字段，另算颜色 | `@osg/lead-mentor/views/career/job-overview/index.vue:782` |
| **Admin** | 各模块各写（student/expense/complaints 等 20+ 处各有一份） | — |
| **Student** | dashboard / applications / profile 各一份 | — |

### 1.2 为什么抽这个（判据对照）

路线图 §2.2 Layer 4 抽取三判据：

1. ✅ 业务语义高度一致：全都是 `new/coaching/completed/cancelled/pending` → 显示友好标签 + 颜色
2. ✅ 跨端重复 ≥ 3 端（实际 5 端都有）
3. ✅ 有成熟 SSOT 参考（Mentor 标签最全、Assistant UI 最新）

### 1.3 为什么不选别的

| 候选 | 为什么不先做 |
|---|---|
| A-01 `<PageHeader>` | ROI 最高但涉及各端 page shell，需先跟产品对齐"是否所有页面都必须统一 header" |
| B-02 `<ForgotPasswordFlow>` | 涉及 5 端路由 + token store 差异，风险中，适合专项 |
| C-03 `useJobOverviewFilter` | 3 端筛选字段差异较大（LM 有 "assignedStatus"），需求未稳 |

**C-02 + A-03** 纯展示 + 纯逻辑，零业务耦合，风险最低，可当"热身"。

---

## 二、目标产出

### 2.1 新增文件

```
osg-frontend/packages/shared/src/
├── composables/
│   └── useCoachingStatusMap.ts         # C-02 映射逻辑
├── components/
│   └── CoachingStatusTag.vue           # A-03 展示组件
├── types/
│   └── coachingStatus.ts               # 枚举 + 映射表类型
└── __tests__/  (实际在 assistant/src/__tests__/shared/)
    ├── useCoachingStatusMap.spec.ts
    └── CoachingStatusTag.spec.ts
```

### 2.2 类型契约（首版）

```ts
// @osg/shared/types/coachingStatus.ts

/** 后端返回的英文枚举（canonical） */
export type CoachingStatusCode = 'new' | 'coaching' | 'pending' | 'completed' | 'cancelled'

/** UI 语义色（对齐 antd a-tag color） */
export type CoachingStatusTone = 'success' | 'processing' | 'warning' | 'error' | 'default'

export interface CoachingStatusView {
  code: CoachingStatusCode
  label: string        // 中文展示
  tone: CoachingStatusTone
  color: string        // antd a-tag color 值
  icon?: string        // 可选 mdi 图标名（Mentor 用）
}
```

### 2.3 Composable 签名

```ts
// @osg/shared/composables/useCoachingStatusMap.ts
import type { CoachingStatusCode, CoachingStatusView } from '../types/coachingStatus'

export function resolveCoachingStatus(raw: string | undefined | null): CoachingStatusView
export function useCoachingStatusMap(): {
  statusMap: Readonly<Record<CoachingStatusCode, CoachingStatusView>>
  resolve: (raw: string | undefined | null) => CoachingStatusView
}
```

### 2.4 组件签名

```ts
// @osg/shared/components/CoachingStatusTag.vue
interface Props {
  /** 可接英文枚举或中文；为空则显示 fallback */
  status?: string | null
  /** 空值 fallback 文案，默认 "未申请" */
  fallback?: string
  /** 是否显示图标（默认 false） */
  showIcon?: boolean
  /** 自定义额外 class */
  tagClass?: string
}
```

使用示例：

```vue
<CoachingStatusTag :status="row.coachingStatus" />
<CoachingStatusTag :status="row.coachingStatus" fallback="未跟进" show-icon />
```

---

## 三、SSOT 标准映射表（权威来源）

> 语义来自 Mentor（最完整），色值来自 Assistant（antd 化最规范）

| code | label | tone | color | icon | 来源端 |
|:-:|:-:|:-:|:-:|:-:|---|
| `new` | 新申请 | `warning` | `orange` | `mdi-bell-ring` | Mentor |
| `coaching` | 辅导中 | `processing` | `blue` | `mdi-school` | Mentor + LM |
| `pending` | 待处理 | `default` | `default` | — | LM |
| `completed` | 已完成 | `success` | `green` | `mdi-check-circle` | Mentor |
| `cancelled` | 已取消 | `error` | `red` | `mdi-close-circle` | Mentor |

**Fallback 规则**：
- `raw` 为空/null/undefined → `{ code: 'pending', label: fallback, tone: 'default', color: 'default' }`
- `raw` 已是中文（`'辅导中'` 等） → 反查 label 匹配到 code，无匹配则走 fallback
- 大小写不敏感、首尾空格忽略

---

## 四、执行步骤（严格 TDD）

### Step 1：写类型 + composable + 单测（Red → Green）

1. 新建 `@osg/shared/types/coachingStatus.ts`
2. 新建 `@osg/shared/composables/useCoachingStatusMap.ts`（先写空函数，只导出签名）
3. 在 `@osg/assistant/__tests__/shared/useCoachingStatusMap.spec.ts` 写全覆盖单测：
   - 5 个 code 正向映射
   - 中文反查（`辅导中` → `coaching`）
   - 大小写/空格容错（`'  Coaching '` → `coaching`）
   - 空值 fallback
   - 未知 raw 走 fallback
4. `pnpm --filter @osg/assistant test useCoachingStatusMap` 确认全红
5. 实现 composable 逻辑，确认全绿

### Step 2：写组件 + 组件测试

1. 新建 `@osg/shared/components/CoachingStatusTag.vue`，内部调 `resolveCoachingStatus`，渲染 `<a-tag>`
2. 在 `@osg/assistant/__tests__/shared/CoachingStatusTag.spec.ts` 写：
   - 渲染 `new` → 文案 `新申请`、color `orange`
   - 空 status → fallback 文案
   - `showIcon=true` → 含 `<i class="mdi mdi-...">`
3. 确认全绿

### Step 3：在 `@osg/shared/components/index.ts` + `composables/index.ts` 导出

```ts
// shared/src/components/index.ts
export { default as CoachingStatusTag } from './CoachingStatusTag.vue'
export { default as InterviewCalendar } from './InterviewCalendar.vue'

// shared/src/composables/index.ts
export * from './useCoachingStatusMap'
export * from './useInterviewCalendar'
```

### Step 4：首端接入（Assistant，SSOT）

- 替换 `@osg/assistant/views/career/job-overview/index.vue:85,127` 的 `<a-tag :color="coachingColor(...)">` → `<CoachingStatusTag :status="..." />`
- 删除本地 `coachingColor()` 函数
- 跑 `pnpm --filter @osg/assistant test`，确保 106/106 依然全绿

### Step 5：LM 接入

- 替换 `@osg/lead-mentor/views/career/job-overview/index.vue:782` 的 `resolveStatusTone` 逻辑
- 删除 LM 本地映射
- 跑 `pnpm --filter @osg/lead-mentor test`，确保 115/115 全绿

### Step 6：Mentor 接入

- 替换 `@osg/mentor/views/job-overview/index.vue:83-87` 的 `v-if/v-else-if` tag 块 → `<CoachingStatusTag :status="row.coachingStatus" show-icon />`
- 删除本地 `statusLabelMap`（L338-344）
- 删除 CSS `.pulse-tag / .coaching-tag`
- 跑 `pnpm --filter @osg/mentor test`，确保回到 baseline（5 pre-existing failed 不变，其他全绿）

### Step 7：全链路验证

- 跑 `pnpm --filter @osg/shared...` 三端测试 + `mvn -pl ruoyi-admin,ruoyi-system -am compile`
- 更新路线图文档 §4.1 C-02 / §4.2 A-03 状态为 ✅

---

## 五、范围边界（不做什么）

| 不做 | 理由 |
|---|---|
| Admin / Student 端的所有 coachingStatus 替换 | 本任务只覆盖 3 端 job-overview；其他页面由对应对齐 ticket 产生（见路线图 §6） |
| class-records / mock-practice 的状态映射 | 它们的状态枚举不同（`approved/rejected/pending` 等），属于 C-05/C-06 另外做 |
| 修改后端 `coachingStatus` 字段 | 前端适配层兼容英文枚举 + 中文，后端不动 |
| 改 `<a-tag>` 为自定义组件 | 坚持用 antd 原语，shared 组件只做语义映射 |

---

## 六、验证清单

- [ ] `@osg/shared/composables/useCoachingStatusMap.spec.ts` 通过，覆盖所有 5 个 code + fallback + 容错
- [ ] `@osg/shared/components/CoachingStatusTag.spec.ts` 通过
- [ ] Assistant 106 → 仍 106 passed
- [ ] Lead-Mentor 115 → 仍 115 passed
- [ ] Mentor: baseline 5 failed 不变，其他全绿
- [ ] Maven `ruoyi-admin + ruoyi-system` 编译通过（此任务后端 0 改动，顺带 smoke）
- [ ] 路线图文档 §4.1 C-02 / §4.2 A-03 状态更新为 ✅
- [ ] 浏览器实拍对比：3 端 job-overview 页面 `coachingStatus` 列 tag 视觉一致（颜色/文案）

---

## 七、风险与应对

| 风险 | 应对 |
|---|---|
| 后端返回的 `coachingStatus` 既有英文又有中文（LM 返回 `'辅导中'`，Mentor 返回 `'coaching'`） | `resolveCoachingStatus` 同时支持英中反查，写单测覆盖两种输入 |
| Mentor 原本有 `.pulse-tag` 脉冲动画，迁移到 antd 后动画消失 | 在 CoachingStatusTag.vue 内为 `new` 状态保留 `animate-pulse` class，用 CSS 实现 |
| Assistant 有个"未申请" fallback（和 Mentor 不同） | 用 props `fallback` 参数兼容，各端传入自己的 fallback 文案 |
| LM 有 `stageUpdated` 影响 tone | 这个业务差异不抽到 shared，保留在 LM 页面用 CSS class 外套（比如 `<div :class="{ 'stage-updated': row.stageUpdated }"><CoachingStatusTag ... /></div>`） |

---

## 八、参考文件速查表

### 读 SSOT
- `@osg/mentor/views/job-overview/index.vue:83-87`（UI 标签最全）
- `@osg/mentor/views/job-overview/index.vue:338-344`（statusLabelMap）
- `@osg/assistant/views/career/job-overview/index.vue:85,127`（antd 用法）

### 要改
- `@osg/shared/src/types/coachingStatus.ts`（新建）
- `@osg/shared/src/composables/useCoachingStatusMap.ts`（新建）
- `@osg/shared/src/components/CoachingStatusTag.vue`（新建）
- `@osg/shared/src/components/index.ts`（加导出）
- `@osg/shared/src/composables/index.ts`（加导出）
- `@osg/assistant/src/__tests__/shared/useCoachingStatusMap.spec.ts`（新建）
- `@osg/assistant/src/__tests__/shared/CoachingStatusTag.spec.ts`（新建）
- `@osg/assistant/views/career/job-overview/index.vue`（替换 + 删 coachingColor）
- `@osg/lead-mentor/views/career/job-overview/index.vue`（替换 + 删 resolveStatusTone）
- `@osg/mentor/views/job-overview/index.vue`（替换 + 删 statusLabelMap + CSS）
- `docs/architecture/2026-04-24-shared-frontend-roadmap.md`（更新 §4.1 C-02 / §4.2 A-03）

### 参考前一项做法（相同模式）
- `@osg/shared/src/types/interviewCalendar.ts`（类型定义范例）
- `@osg/shared/src/composables/useInterviewCalendar.ts`（composable 范例）
- `@osg/shared/src/components/InterviewCalendar.vue`（组件范例）
- `@osg/assistant/src/__tests__/shared/useInterviewCalendar.spec.ts`（单测范例）

---

## 九、给 Cascade 新窗口的启动 Prompt（可直接复制）

```
请执行架构路线图下一项：抽 C-02 `useCoachingStatusMap` + A-03 `<CoachingStatusTag>`。

完整任务书在：docs/architecture/2026-04-24-next-shared-task-C02-A03.md
请先读完任务书再动手，严格按 §四 的 7 步 TDD 顺序推进，每完成一步更新 todo_list。
范围边界见 §五，不要越界。

开干前确认：
1. 读 §一 理解为什么选这个
2. 读 §三 SSOT 标准映射表 —— 这是权威来源，不要自己编
3. 读 §八 参考文件速查表 —— 按这个表操作，别到处乱搜

推进过程中任何代码修改前必须先征求用户确认（遵守 user rules）。
```
