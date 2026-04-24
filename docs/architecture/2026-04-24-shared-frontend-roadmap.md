# 前端五端共享资产路线图（Shared Frontend Roadmap）

- **作者**：Cascade（与用户协作制定）
- **日期**：2026-04-24
- **状态**：✅ 已确认（α 方案 + 增量抽取策略）
- **适用范围**：`osg-frontend/packages/{student,mentor,lead-mentor,assistant,admin}`
- **SSOT**：Assistant（最新 antd 化 + 语义清晰）

---

## 一、背景与诊断

### 1.1 现状

当前 `osg-frontend` 采用 monorepo + pnpm workspace，已拆出 5 个业务端 + 1 个共享包 `@osg/shared`：

```
osg-frontend/packages/
├── admin/        后台管理
├── assistant/    助教端
├── lead-mentor/  班主任端
├── mentor/       导师端
├── student/      学生端
└── shared/       共享包
```

### 1.2 `@osg/shared` 共享现状

| 层 | 已共享 | 空缺 |
|---|:---|:---|
| `api/` | ✅ 12 个模块（三端都用） | — |
| `utils/` | ✅ download / format / request / storage / permissionColors | — |
| `types/` | ✅ common / course / user / auth | — |
| `composables/` | ⚠️ 仅 2 个（useIndustryMeta / usePagination） | **严重空缺** |
| `components/` | ❌ **空**（只有 index.ts） | **严重空缺** |
| `styles/` | — | 待评估 |

### 1.3 问题症状

**"同一业务在多端被重复实现 N 次"**：

| 业务 | 重复程度 | 典型问题 |
|---|---|---|
| 学员求职总览日历块 | 3 端各写（Mentor 954 / Assistant 734 / LM 1866 行） | Mentor 颜色规则与统计卡漂移；LM 纯硬编码 mock；Assistant 无切月 |
| 登录页 | 5 端各写 | 文案/logo 差异，但骨架一致 |
| 忘记密码页 | 5 端各写 | 业务流完全一致 |
| 模拟应聘列表 | 4 端各写 | UI 差异在于色系 |
| 课程记录表 | 4 端各写 | 列差异极小 |
| 个人基本信息 | 5 端各写 | 字段基本一致 |
| 课程排期 | 3 端各写 | 日历展示高度一致 |

---

## 二、分层策略（5 Layer）

我们把"共享"按抽象层级分成 5 层，**逐层评估该不该做 / 风险 / ROI**：

| Layer | 名称 | 例子 | 策略 | 理由 |
|:-:|---|---|:-:|---|
| 1 | **纯逻辑层**：API / utils / types | `getAssistantJobOverviewList` / `formatMonthDay` | ✅ **已做** | 无争议，继续深化 |
| 2 | **业务 composable**：逻辑单元 | `useInterviewCalendar` / `useCoachingStatusMap` | ✅ **大力推** | 纯逻辑、易测试、各端 UI 仍可独立 |
| 3 | **原子 UI 组件**：无业务 | `<PageHeader>` / `<StatCard>` / `<CoachingStatusTag>` | ✅ **大力推** | 视觉一致性高收益，props 简单 |
| 4 | **业务片段组件**：小业务耦合 | `<InterviewCalendar>` / `<ForgotPasswordFlow>` | ⚠️ **选择性推** | 业务高度一致且 ROI 明显才做 |
| 5 | **整页共享**：一整页 | `<SharedJobOverviewPage>` | ❌ **不做** | 业务差异吸收成本过高，props/slot 膨胀失控 |

### 2.1 Layer 5 为什么不做

- 三端 `job-overview` 的**页面级差异**较大（Mentor 有统计卡+确认收徒 / Assistant 双 Tab / LM 待分配 Tab + 分配导师按钮）
- 一旦某端新增独立需求，`<SharedJobOverviewPage>` 的 props 和 slot 会膨胀，最终沦为"if-else 大杂烩"
- **零漂移的代价是零灵活**，得不偿失

### 2.2 Layer 4 的"选择性"判据

候选项必须满足 **3 个条件** 才抽：

1. ✅ 业务语义在 3+ 端**几乎完全一致**（差异 ≤ 1 个 emit / 1 个 prop）
2. ✅ 组件规模 **≥ 80 行 template** 或 **涉及跨端视觉漂移风险**
3. ✅ 已经至少**有一个端做到了成熟形态**（可作 SSOT 参考）

---

## 三、推进原则

### 3.1 增量抽取，不做一次性大重构

- **不**成立"前端基础建设专项"整季度重构
- **每次业务对齐 ticket（如 LM-ALIGN-04）同步评估是否产生可抽共享资产**
- 每抽一个新组件，在本文档表格追加一行（形成滚动清单）

### 3.2 SSOT 选型原则

> **逻辑以功能最成熟端为参考，UI 以技术栈最新端（Assistant，antd 化）为参考**

- 例：日历 composable = Mentor 成熟逻辑（`buildCalendarWeek` + 可切月）+ Assistant UI（antd a-tag + 4 态 tone + 42 格月视图）
- 首次抽出时如果 SSOT 端本身有欠缺（如 Assistant 无可切月），**先补齐 SSOT，再抽**，避免把残缺固化

### 3.3 TDD 原则

- composable 必须带 `*.spec.ts` 单元测试，100% 覆盖核心计算
- 组件必须带 snapshot + 交互测试
- 三端接入后必须做浏览器实拍对比验证

### 3.4 不动 Layer 5 = 不跨端"同步改动三端业务逻辑"

- 共享组件只负责 UI + 通用逻辑
- 跨端业务差异（如"确认收徒"、"分配导师"）永远留在各端 `views/xxx/index.vue` 里

---

## 四、候选清单（滚动更新）

### 4.1 Layer 2：业务 composables

| ID | 名称 | 状态 | 第一使用方 | 价值 | 备注 |
|:-:|---|:-:|---|:-:|---|
| C-01 | `useInterviewCalendar` | 🏗️ **本次做** | Assistant / LM / Mentor | ⭐⭐⭐ | 吸纳 Mentor 可切月 + Assistant 4 态 tone |
| C-02 | `useCoachingStatusMap` | ⏳ 待做 | 多端 | ⭐⭐⭐ | 状态→颜色/文案的单一映射 |
| C-03 | `useJobOverviewFilter` | ⏳ 待做 | 3 端 | ⭐⭐ | rows + filter 状态/防抖搜索 |
| C-04 | `useForgotPasswordFlow` | ⏳ 待做 | 5 端 | ⭐⭐⭐ | 三步流程：验证码/新密码/成功 |
| C-05 | `useClassRecordForm` | ⏳ 待做 | 4 端 | ⭐⭐ | 上课报告表单状态 |
| C-06 | `useMockPracticeList` | ⏳ 待做 | 4 端 | ⭐⭐ | 模拟应聘列表状态/筛选 |

### 4.2 Layer 3：原子 UI 组件

| ID | 名称 | 状态 | 第一使用方 | 价值 | 备注 |
|:-:|---|:-:|---|:-:|---|
| A-01 | `<PageHeader>` | ⏳ 待做 | 5 端 | ⭐⭐⭐ | 标题+副标题+英文名+右侧按钮 |
| A-02 | `<StatCard>` | ⏳ 待做 | Mentor / Admin | ⭐⭐ | 数字+标签+色值 |
| A-03 | `<CoachingStatusTag>` | ⏳ 待做 | 多端 | ⭐⭐⭐ | 状态 tag（复用 C-02） |
| A-04 | `<OsgPage>` | ⏳ 待做（各端自建中） | 5 端 | ⭐⭐ | 页面容器骨架，当前已在各端自建 |
| A-05 | `<StudentAvatar>` | ⏳ 待做 | 多端 | ⭐⭐ | 头像+姓名+副信息 |

### 4.3 Layer 4：业务片段组件

| ID | 名称 | 状态 | 第一使用方 | 价值 | 备注 |
|:-:|---|:-:|---|:-:|---|
| B-01 | `<InterviewCalendar>` | 🏗️ **本次做** | 3 端 | ⭐⭐⭐ | 与 C-01 配套 |
| B-02 | `<ForgotPasswordFlow>` | ⏳ 待做 | 5 端 | ⭐⭐⭐ | 三步流程组件 |
| B-03 | `<ClassRecordsTable>` | ⏳ 待做 | 4 端 | ⭐⭐ | 课程记录列表表 |
| B-04 | `<MockPracticeList>` | ⏳ 待做 | 4 端 | ⭐⭐ | 模拟应聘列表卡 |
| B-05 | `<SchedulePanel>` | ⏳ 待做 | 3 端 | ⭐⭐ | 课程排期日历 |

---

## 五、首次范例：日历组件抽取（本次执行）

### 5.1 Scope

- **抽出**：`@osg/shared/composables/useInterviewCalendar.ts`（C-01）+ `@osg/shared/components/InterviewCalendar.vue`（B-01）
- **三端接入**：Assistant（SSOT）→ LM → Mentor
- **后端补齐**：`/lead-mentor/job-overview/calendar` endpoint（复用 Mentor `toLegacyCalendarEvent` 逻辑）

### 5.2 组件签名（首版）

```ts
// @osg/shared/types/interviewCalendar.ts
export interface InterviewEvent {
  id: number
  interviewTime: string            // ISO string
  studentName?: string
  company?: string
  position?: string
  location?: string
  interviewStage?: string
  coachingStatus?: 'coaching' | 'new' | 'completed' | 'cancelled' | string
}

// @osg/shared/composables/useInterviewCalendar.ts
export function useInterviewCalendar(events: Ref<InterviewEvent[]>) {
  const monthOffset = ref(0)
  const currentDate = computed(() => addMonths(new Date(), monthOffset.value))
  const currentMonthLabel = computed(() => `${currentDate.value.getMonth() + 1}月`)
  const compactDays: ComputedRef<CompactDay[]>     // 折叠态 7 格
  const monthCells: ComputedRef<MonthCell[]>       // 展开态 42 格
  const calendarItems: ComputedRef<CalendarItem[]> // 本周事件列表
  const shiftMonth = (offset: number) => void
  return { monthOffset, currentMonthLabel, compactDays, monthCells, calendarItems, shiftMonth }
}

// @osg/shared/components/InterviewCalendar.vue
interface Props {
  events: InterviewEvent[]
  showMonthNav?: boolean        // 默认 true
  defaultExpanded?: boolean     // 默认 false
}
interface Emits {
  (e: 'event-click', event: InterviewEvent): void
  (e: 'month-change', offset: number): void
}
// slots: #empty（默认渲染"本周暂无面试或辅导安排"）
```

### 5.3 色彩语义 token（统一标准）

| tone | 含义 | a-tag color | 背景色 | 前景色 |
|:-:|---|:-:|:-:|:-:|
| `today` | 今天 | `blue`（强调） | `var(--primary)` 深蓝 | `#fff` |
| `danger` | 面试日 | `red` | `#FEE2E2` | `#B91C1C` |
| `info` | 辅导日 | `processing` | `#DBEAFE` | `#1D4ED8` |
| `default` | 普通日 | `''`（灰） | `#F8FAFC` | `#64748b` |

Mentor 页面的"4 色统计卡"与日历 tone **解耦**，统计卡色彩属于 StatCard 组件（未来 A-02），不强制与日历一致。但**文档中应注明两者色彩语义区分**，避免用户混淆。

### 5.4 推进步骤

1. 📝 **Step 1（本文档）**：架构方针文档 ← **你正在读**
2. 🔧 **Step 2**：Assistant 补可切月能力 → 成为完整 SSOT
3. 📦 **Step 3**：抽 composable + 组件到 shared
4. ✅ **Step 4**：Assistant 改用 → 自验证（vitest + 浏览器实拍）
5. 🔌 **Step 5**：补 LM 后端 endpoint + shared API + LM 改用
6. 🔄 **Step 6**：Mentor 改用（保留统计卡 + 确认收徒业务）

---

## 六、未来对齐 ticket 与本方针的联动

| 对齐 ticket | 触发产生的共享资产 |
|---|---|
| LM-ALIGN-04（job-overview 整页） | A-01 PageHeader / A-03 CoachingStatusTag |
| LM-ALIGN-06（mock-practice） | B-04 MockPracticeList / C-06 useMockPracticeList |
| LM-ALIGN-08（class-records） | B-03 ClassRecordsTable / C-05 useClassRecordForm |
| 五端 forgot-password 对齐 | B-02 ForgotPasswordFlow / C-04 useForgotPasswordFlow |

---

## 七、反模式（禁止）

| 反模式 | 正确做法 |
|---|---|
| 把整页抽成 `<SharedXxxPage>` 用 props 吸收差异 | 只抽片段组件，业务差异留在各端 |
| 在 composable 里硬编码端名判断（`if (currentEnd === 'mentor')`） | 差异用 props/options 传入 |
| 组件内部发 HTTP 请求 | 组件纯展示，数据由各端通过 prop 传入 |
| 为单端特殊需求在 shared 组件加 prop | 先考虑 slot 降级，真不行就保留各端自维护 |
| 一次性抽 10+ 个共享资产 | 严格增量，每次对齐 ticket 产出 1~2 个 |

---

## 八、审计与演进

- **每季度** 对齐本文档一次
- **每次对齐 ticket** 追加候选清单
- **每次抽出新共享资产** 在 §4 追加一行 + 在 §6 记录触发的 ticket

---

**本方针通过后，立即进入 Step 2（Assistant 补可切月）。**
