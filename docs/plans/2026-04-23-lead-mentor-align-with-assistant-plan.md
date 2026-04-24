# Lead-Mentor 端按 Assistant 对齐蓝图

> 日期：2026-04-23
> 源头（SSOT）：Assistant 端 2026-04-22/04-23 的 antd-alignment 重构 + class-records absent 契约实施
> 目标：把 Lead-Mentor 端 10 个 V1 页面的"框架 / 组件 / 交互 / 测试"对齐到 Assistant，唯一业务差异为"模拟应聘管理"多一个**待分配导师** Tab
> 适用：此蓝图设计为在**新窗口**（新 Cascade/CC 对话）里按页逐个执行

---

## 一、对齐原则（读第一遍即可）

1. **以 Assistant 为 SSOT，单向搬到 Lead-Mentor**。Assistant 刚完成新一轮 antd 重构 + class-records absent 契约落地，LM 尚未跟上。
2. **业务差异只有 1 处**："模拟应聘管理 `/career/mock-practice`"页面 LM 端额外多一个"**待分配导师**" Tab（班主任才有分配权限），其余 9 页纯 UI/框架对齐。
3. **URL 不强制统一**：保留 LM 现有 `/teaching/students` / `/teaching/class-records` / `/profile/basic` / `/profile/schedule`。只对齐**页面内部实现**，URL 层不动（改动面小、测试/导航影响小）。
4. **LM 独有的 `/classes`、`/mentors`、`/reports`**：属 V1 范围外历史遗留，本次**不改、不删、不对齐**；只在相关 router/sidebar 配置处确认 `hidden: true`（若未 hidden 应补上）。
5. **颜色 tone 保留 LM 自身**：结构对齐 Assistant，色系保留（与 Assistant 对齐 admin 时留各自 tone 是同一规则）。
6. **文档先行**：每页对齐前先确认"目标差异"，避免单页爆炸式改动。

---

## 二、页面对齐矩阵

| # | 页面 | Assistant 源 | LM 目标 | URL 差异 | 业务差异 | 源 Plan 文档 | 建议顺序 |
|---|---|---|---|---|---|---|---|
| 1 | 课程记录 | `osg-frontend/packages/assistant/src/views/class-records/index.vue` + `AssistantClassReportFlowModal.vue` | `osg-frontend/packages/lead-mentor/src/views/teaching/class-records/index.vue` + 已有 `LeadMentorClassReportFlowModal.vue` | ⚠️ `/class-records` → `/teaching/class-records` | absent 契约 + 附件必填差异（LM 原要求必填，可对齐到非必填） | `docs/plans/class-records-fix/2026-04-23-absent-contract-implementation.md` + `docs/plans/class-records-fix/lead-mentor.md` | ①（热） |
| 2 | 模拟应聘管理 | `osg-frontend/packages/assistant/src/views/career/mock-practice/index.vue` | `osg-frontend/packages/lead-mentor/src/views/career/mock-practice/index.vue` | 一致 | **多"待分配导师" Tab**（见 §V） | `docs/plans/2026-04-22-assistant-mock-practice-antd-alignment-plan.md` | ② |
| 3 | 岗位信息 | `osg-frontend/packages/assistant/src/views/career/positions/index.vue` | `osg-frontend/packages/lead-mentor/src/views/career/positions/index.vue` | 一致 | 无 | `docs/plans/2026-04-22-assistant-positions-antd-alignment.md` | ③ |
| 4 | 学员求职总览 | `osg-frontend/packages/assistant/src/views/career/job-overview/index.vue` | `osg-frontend/packages/lead-mentor/src/views/career/job-overview/index.vue` | 一致 | 无 | `docs/plans/2026-04-19-assistant-standardization-plan.md`（job-overview 段） | ④ |
| 5 | 学员列表 | `osg-frontend/packages/assistant/src/views/students/index.vue` | `osg-frontend/packages/lead-mentor/src/views/teaching/students/index.vue`（或 `views/students/`，任选） | ⚠️ `/students` → `/teaching/students` | 无（班主任视角下的备注/排序可能略有差异，对齐时逐字段确认） | `docs/plans/2026-04-22-assistant-student-list-antd-alignment-plan.md` | ⑤ |
| 6 | 首页 | `osg-frontend/packages/assistant/src/views/home/index.vue` | `osg-frontend/packages/lead-mentor/src/views/home/index.vue` | 一致 | 称谓（"助教" → "班主任"） + 快捷入口配置（4 个 quick link 可能不同） | `docs/plans/2026-04-19-assistant-standardization-plan.md`（home 段） | ⑥ |
| 7 | 基本信息 | `osg-frontend/packages/assistant/src/views/profile/index.vue` | `osg-frontend/packages/lead-mentor/src/views/profile/basic/index.vue` | ⚠️ `/profile` → `/profile/basic` | 无 | `docs/plans/2026-04-19-assistant-standardization-plan.md`（profile 段） | ⑦ |
| 8 | 课程排期 | `osg-frontend/packages/assistant/src/views/schedule/index.vue` | `osg-frontend/packages/lead-mentor/src/views/profile/schedule/index.vue` | ⚠️ `/schedule` → `/profile/schedule` | 无 | `docs/plans/2026-04-19-assistant-standardization-plan.md`（schedule 段） | ⑧ |
| 9 | 登录 | `osg-frontend/packages/assistant/src/views/login/index.vue` | `osg-frontend/packages/lead-mentor/src/views/login/index.vue` | 一致 | API endpoint 不同（`/assistant/login` → `/lead-mentor/login`） | 无独立 plan，对齐框架即可 | ⑨ |
| 10 | 忘记密码 | `osg-frontend/packages/assistant/src/views/forgot-password/index.vue` | 需确认 LM 是否已有 | 一致 | API endpoint 不同 | 无独立 plan | ⑩ |

---

## 三、每页对齐通用 SOP

执行单页对齐时，**逐项**过下面 12 项。建议以每页为一个 PR，保持改动面可 review。

### 步骤

1. **读源文档**（Assistant Plan + class-records-fix/lead-mentor.md 对应段）
2. **对照 prototype**：`docs/一人公司框架/` 或 `lead-mentor.html` 的对应锚点
3. **备份**：在 LM 目标文件上保留 git baseline（不用先 stash，分支里干）
4. **复制 template + script**：把 Assistant 版本的 `<template>` / `<script setup>` 整段搬过来
5. **替换 import 路径**：`@/views/class-records/...` → `@/views/teaching/class-records/...` 等
6. **替换 API namespace**：
   - `@osg/shared/api/assistantClassRecords` → `@osg/shared/api/leadMentorClassRecords`
   - `getAssistantXxx()` → `getLeadMentorXxx()`
7. **替换 `router-link :to` / `router.push()` 里的 URL**：按 §II URL 差异列
8. **替换文案**：`助教` → `班主任`（整个文件 replace，注意排除"助教辅助"之类的动宾短语）
9. **对齐组件导入**：`PageHeader` 等 shared 组件确认 LM 侧有（没有就从 Assistant 拷一份到 `packages/lead-mentor/src/components/`）
10. **处理业务差异**：本页如有 §II"业务差异"列标记（目前仅 mock-practice），按 §V 单独处理
11. **更新测试**：把 `packages/assistant/src/__tests__/xxx.spec.ts` 拷到 `packages/lead-mentor/src/__tests__/`，批量替换 URL / API 名 / 文案
12. **本地自测**：
    - `npx vitest run` —— 测试全绿
    - `pnpm --filter @osg/lead-mentor dev`（端口 3003）—— 人眼过一遍

### 特别注意

- **sidebar / menu 配置**：Assistant 的 `MainLayout.vue` 里 nav 定义是 assistant 版；LM 有自己的 `MainLayout.vue`，**不要替换整个 Layout**，只对齐内部组件风格。
- **localStorage setup**：LM 的 `vitest.config.ts` 如果也踩 Node 25 localStorage 坑，按 `docs/plans/class-records-fix/2026-04-23-absent-contract-implementation.md` §3 Phase 附加 一节照抄 setup.ts + `exclude: ['tests/e2e/**']`。

---

## 四、URL / 命名空间 / 文件路径映射总表

拷贝时需要**批量替换**的 token：

| 维度 | Assistant | Lead-Mentor |
|---|---|---|
| 包名 | `@osg/assistant` | `@osg/lead-mentor` |
| dev 端口 | `3004` | `3003` |
| 后端 API 前缀 | `/assistant/` | `/lead-mentor/` |
| 课程记录路由 | `/class-records` | `/teaching/class-records` |
| 学员列表路由 | `/students` | `/teaching/students` |
| 基本信息路由 | `/profile` | `/profile/basic` |
| 课程排期路由 | `/schedule` | `/profile/schedule` |
| 课程记录 API 层 | `@osg/shared/api/assistantClassRecords` | `@osg/shared/api/leadMentorClassRecords`（需确认已存在） |
| 上报弹窗组件名 | `AssistantClassReportFlowModal` | `LeadMentorClassReportFlowModal` |
| MainLayout 导航配置 | assistant 版 navGroups | lead-mentor 版 navGroups（已有） |
| 角色文案 | "助教" | "班主任" |
| 用户角色 role | `assistant` | `lead_mentor` |

**tip**：搬单个页面时可用如下顺序替换，减少误伤：

```
1. @osg/assistant        → @osg/lead-mentor
2. /assistant/           → /lead-mentor/
3. Assistant             → LeadMentor         （PascalCase 组件名）
4. assistant             → leadMentor         （camelCase 变量/API 名）
5. 助教                  → 班主任             （UI 文案，最后处理避免干扰上面）
6. 路由 URL              → 按 §IV 表逐一替换
```

---

## 五、唯一业务差异详解 —— "待分配导师" Tab

### 背景

LM 端 `/career/mock-practice` 页面顶部有 **3 个 Tab**（见截图）：

1. **待分配导师**（红色高亮，徽标 3） ← **LM 独有**
2. 我辅导的学员（徽标 5）
3. 我管理的学员（徽标 8）

Assistant 端只有 Tab 2 和 Tab 3。

### 实施指引

对齐 mock-practice 页面时，在对齐完 Assistant 版 UI 后，**额外**加回 LM 已有的"待分配导师" Tab：

- **Tab 结构**：Ant Design `<a-tabs>` 或 pill 风格（对齐 Assistant 的视觉）
- **数据源**：调用已有的"待分配导师学员列表" API（查 LM 现有 mock-practice/index.vue 里现有实现）
- **权限限制**：确保只有 `lead_mentor` 角色能看到此 Tab（已由路由权限保证，但在组件层 `v-if="hasLeadMentorRole"` 再兜底一层更稳）
- **交互**：点击某条学员 → 打开"分配导师"弹窗（已有组件，对齐 UI 但保留业务逻辑）

### 测试

- 单元测试 spec 新增 3 个 case：
  1. 默认进入 `/career/mock-practice` 应展示 3 个 Tab
  2. "待分配导师" Tab 应显示红色徽标（或等价的视觉强调）
  3. 切换到"待分配导师"应请求对应 API（`getLeadMentorPendingAssignmentList()` 类的接口名，以实际为准）
- 不应把 Assistant 端 mock-practice 的 2-Tab 断言原样搬——会引入错误。

---

## 六、分页对齐 Ticket 清单（供新窗口逐个执行）

每个 ticket 建议：**一个分支 / 一个 PR**，粒度为"单页面对齐"。执行时先读 §III SOP。

| TID | 页面 | 建议分支 | 预估工时 | 依赖 |
|---|---|---|---|---|
| LM-ALIGN-01 | 课程记录（最热、刚落 absent 契约） | `feat/lm-align-class-records` | 1.5h | absent 契约文档 |
| LM-ALIGN-02 | 模拟应聘管理（含待分配导师 Tab） | `feat/lm-align-mock-practice` | 2h | §V |
| LM-ALIGN-03 | 岗位信息 | `feat/lm-align-positions` | 1h | assistant positions plan |
| LM-ALIGN-04 | 学员求职总览 | `feat/lm-align-job-overview` | 1h | - |
| LM-ALIGN-05 | 学员列表 | `feat/lm-align-student-list` | 1h | assistant student-list plan |
| LM-ALIGN-06 | 首页 | `feat/lm-align-home` | 0.5h | - |
| LM-ALIGN-07 | 基本信息 | `feat/lm-align-profile-basic` | 0.5h | - |
| LM-ALIGN-08 | 课程排期 | `feat/lm-align-schedule` | 0.5h | - |
| LM-ALIGN-09 | 登录 | `feat/lm-align-login` | 0.3h | - |
| LM-ALIGN-10 | 忘记密码 | `feat/lm-align-forgot-password` | 0.3h | 先确认 LM 是否已有页面 |

**合计预估：8.6h**（不含 review/returning-test 时间）

---

## 七、新窗口开工模板（建议首条消息）

新 Cascade/CC 窗口可以把下面这段作为首条指令：

```
请按 docs/plans/2026-04-23-lead-mentor-align-with-assistant-plan.md
执行 Ticket LM-ALIGN-01（课程记录页面）：

1. 阅读该 plan 的 §II（第 1 行）、§III SOP、§IV 映射表、
   以及 Assistant 源文档：
   - docs/plans/class-records-fix/2026-04-23-absent-contract-implementation.md
   - docs/plans/2026-04-23-assistant-class-records-antd-alignment-plan.md
2. 把 Assistant 版 views/class-records/index.vue 和 AssistantClassReportFlowModal.vue
   的实现/测试，按 SOP 搬到 packages/lead-mentor/src/views/teaching/class-records/
   和 LeadMentorClassReportFlowModal.vue。
3. URL、API、文案、角色按 §IV 表批量替换。
4. 处理 §V 的业务差异（本 ticket 无差异）。
5. 跑 `npx vitest run` 和 `pnpm --filter @osg/lead-mentor dev` 验证。
6. 完成后回到本 plan 勾掉 LM-ALIGN-01，进入 LM-ALIGN-02。

文档先行：改动前先给我看清单，我确认后再动代码。
```

---

## 八、进度追踪

- [ ] LM-ALIGN-01 课程记录
- [ ] LM-ALIGN-02 模拟应聘管理（含待分配导师 Tab）
- [ ] LM-ALIGN-03 岗位信息
- [ ] LM-ALIGN-04 学员求职总览
- [ ] LM-ALIGN-05 学员列表
- [ ] LM-ALIGN-06 首页
- [ ] LM-ALIGN-07 基本信息
- [ ] LM-ALIGN-08 课程排期
- [ ] LM-ALIGN-09 登录
- [ ] LM-ALIGN-10 忘记密码

---

## 九、反向对齐项（LM → Assistant，搬回去）

> 本次工作**不是完全单向**。以下是 LM 已做得更完整、Assistant 需要反向吸收的点。新增 ticket 前缀 `LM→A`，在 §VI 的 10 张 ticket 之外独立追踪。

### LM→A-01：Assistant 端 `job-overview` "学员面试安排"折叠态修复（使用 antd 实现）

> **⚠️ 先前误判修正**：Assistant 端**并不缺**展开态 —— 骨架（`isCalendarExpanded` / `month-view` / `week-schedule`）在 L39-74 已有。真正的问题是**折叠态（非展开态）逻辑错误**。**本次先做折叠态**，展开态（`monthCells` 假 mock `i % 3 === 0`）**暂不动，紧接着下一步做**（LM→A-01b）。

---

#### 两端实现范式对比（事实）

| 数据 | LM 实现 | Assistant 现状 | 本次是否修 |
|---|---|---|---|
| `compactDays`（折叠态 7 天日历） | 硬编码 7 项 | `source.slice(0, 7).map(...)` 把前 7 条面试日期塞进 7 格 ❌ | **修** |
| `summaryEvents`（折叠态右侧胶囊） | 硬编码 2 项 | `slice(0, 3).map(...)` + 旧 tone 会生成 warning 橙 ⚠️ | **修** |
| 月份显示 | `<span class="calendar-month">1月</span>` | 仅有"本周"二字 | **修** |
| `monthCells`（展开态月网格） | 硬编码 28 项 | `i % 3 === 0` 假联动 ❌ | **本次不动** |
| `calendarItems`（展开态本周列表） | 硬编码 3 项 `weeklySchedule` | computed filter.sort.slice(0, 4) ✅ | **不动** |

---

#### 折叠态最终方案（使用 Ant Design Vue 实现）

**配色语义**（3 个状态 + 1 个默认）：

| 状态 | 触发条件 | antd 实现 | 视觉 |
|---|---|---|---|
| **今天** | `day.getTime() === today.getTime()` | `<a-tag>` + 自定义 style（`background: var(--primary); color: #fff; border: none`） | 深蓝实心 + 白字 |
| **面试日** | 当天有 record 且 `!/辅导\|coach/i.test(coachingStatus)` | `<a-tag color="red">` | 浅红底 + 深红字（antd `red` preset） |
| **辅导日** | 当天有 record 且 `/辅导\|coach/i.test(coachingStatus)` | `<a-tag color="processing">` 或 `color="blue"` | 浅蓝底 + 蓝字（antd `blue` preset） |
| **默认（无事件）** | 其他 | `<a-tag>` 不传 color | 灰底默认 |

> **关键区分**：今天 vs 辅导日都是蓝色系，但今天是 **primary 实心深蓝 + 白字**（视觉层级最高），辅导日是 **antd 预设浅蓝**，一眼能分清。

---

#### 5 处精确改动（目标文件：`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant/src/views/career/job-overview/index.vue`）

**A · Template L14-19：把"本周"换成月份文本**

```vue
<!-- 旧 -->
<span style="font-size: 12px; color: var(--muted);">本周</span>

<!-- 新 -->
<span class="calendar-month">{{ currentMonthLabel }}</span>
```

**B · Template L23-28：calendar-days 7 格改用 `<a-tag>`**

```vue
<div class="calendar-days">
  <a-tag
    v-for="day in compactDays"
    :key="day.key"
    :color="day.tagColor"
    :bordered="false"
    :style="day.tagStyle"
    class="calendar-day-tag"
  >
    <div class="calendar-day-tag__inner">
      <div class="calendar-day-tag__week">{{ day.weekday }}</div>
      <div class="calendar-day-tag__date">{{ day.date }}</div>
    </div>
  </a-tag>
</div>
```

`day.tagColor` / `day.tagStyle` 在 compactDays computed 里直接算出（见 D）。

**C · Template L32-37：calendar-summary 胶囊改用 `<a-tag>`**

```vue
<div class="calendar-summary">
  <a-tag
    v-for="item in summaryEvents"
    :key="item.label"
    :color="item.tagColor"
    class="summary-tag"
  >
    <span class="summary-tag__label">{{ item.label }}</span>
    <span class="summary-tag__student">{{ item.student }}</span>
  </a-tag>
</div>
```

**D · Script：重写 compactDays / summaryEvents + 新增 currentMonthLabel**

```ts
// 新增：月份文本
const currentMonthLabel = computed(() => `${new Date().getMonth() + 1}月`)

// 重写：本周 7 天（周日为首，与 LM 对齐）
const compactDays = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTime = today.getTime()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())

  const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六']

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    const iso = day.toISOString().slice(0, 10)
    const event = calendarRecords.value.find(
      r => r.interviewTime && String(r.interviewTime).slice(0, 10) === iso,
    )

    let tagColor = ''  // 默认（空）
    let tagStyle: Record<string, string> = {}
    if (day.getTime() === todayTime) {
      tagColor = ''  // 自定义 style 优先
      tagStyle = { background: 'var(--primary)', color: '#fff', border: 'none' }
    } else if (event) {
      const isCoaching = /辅导|coach/i.test(event.coachingStatus ?? '')
      tagColor = isCoaching ? 'processing' : 'red'
    }

    return {
      key: `day-${iso}`,
      weekday: WEEKDAY_CN[day.getDay()],
      date: String(day.getDate()),
      tagColor,
      tagStyle,
    }
  })
})

// 重写：本周范围内最多 3 条
const summaryEvents = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  return calendarRecords.value
    .filter(r => {
      if (!r.interviewTime) return false
      const t = new Date(r.interviewTime)
      return t >= weekStart && t < weekEnd
    })
    .sort((a, b) => String(a.interviewTime).localeCompare(String(b.interviewTime)))
    .slice(0, 3)
    .map(r => {
      const isCoaching = /辅导|coach/i.test(r.coachingStatus ?? '')
      return {
        label: formatMonthDay(r.interviewTime),
        student: r.studentName || '-',
        tagColor: isCoaching ? 'processing' : 'red',
      }
    })
})
```

**E · Style 新增 / 调整**

```css
.calendar-month {
  font-size: 12px;
  font-weight: 600;
  color: var(--text2);
  margin-left: 4px;
}

.calendar-day-tag {
  min-width: 36px;
  padding: 4px 8px;
  border-radius: 6px;
  margin-right: 0;  /* antd a-tag 默认有 margin-right: 8px，日历条靠 gap 控制 */
}

.calendar-day-tag__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.calendar-day-tag__week { font-size: 9px; opacity: 0.85; }
.calendar-day-tag__date { font-size: 14px; font-weight: 700; }

.summary-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  margin-right: 0;
}
.summary-tag__label { font-size: 11px; font-weight: 600; }
.summary-tag__student { font-size: 11px; }
```

**F · 清理（可选，可留在独立 ticket）**：L558-578 的旧 `.calendar-day--*` / `.summary-pill--*` class 可删除，但因展开态 `week-schedule__card` 还用类似命名，本次**先保留**避免误伤。

---

#### 影响范围

- **仅动** `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant/src/views/career/job-overview/index.vue`
- 展开态 `month-view` / `monthCells` / `calendarItems` **不动**（C2 缺陷留作独立 ticket）
- 单元测试 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant/src/__tests__/job-overview-shell.spec.ts` **本次不补**（等跑起来看视觉 OK 再决定是否补断言）

#### 空数据表现

- 无本周面试：7 格全为 default 灰，今天格仍标 `today` 蓝实心；summary 胶囊区为空
- 有本周面试：对应日期红（面试）或蓝（辅导）；summary 显示 1~3 条 `<a-tag>`

#### 工时估计

~40 min（template 替换 + script 重写 + CSS 补充 + 浏览器肉眼确认）

#### 待办

- **LM→A-01b**（**✅ 已完成 2026-04-23**）：展开态 `monthCells` 重写为 42 格跨月整周 + tone 联动真实事件；`calendarItems` 重写为本周全部事件 + 距离标签；新增"本周学员面试安排"标题和空态；CSS 新增 `.month-grid__cell--today/danger/info/outside` 与 `.week-schedule__title/__date--{tone}/__card--today` 系列
- **LM→A-01c**（后续）：考虑抽 `@osg/shared/composables/useInterviewCalendar.ts` 供两端共用

---

### LM→A-02～04：其余候选反向对齐项（待决策）

这些 LM 先行、Assistant 未做，**是否反向对齐需用户定**（默认**不做**，保留 Assistant 简版，除非明确要求对齐）：

| ID | 页面 | LM 现状 | 候选判断 |
|---|---|---|---|
| LM→A-02 | 登录 `/login` | LM 1129 行、已 antd 化 | Assistant 552 行原生 form，若要统一 antd 风格→反向对齐 |
| LM→A-03 | 基本信息 Profile | LM 529 行 antd | Assistant 815 行原生，若要统一→反向对齐 |
| LM→A-04 | 课程排期 Schedule | LM 983 行 antd | Assistant 713 行原生，若要统一→反向对齐 |

---

## 十、未决 / 待在新窗口开工前核对的 3 件事

1. LM 是否已有 `forgot-password` 页面？看 `packages/lead-mentor/src/views/` 无该目录，但 router 可能已注册占位；开工前先 `grep -r "forgot-password" packages/lead-mentor/src`。
2. LM 的 `packages/shared/src/api/leadMentorXxx.ts` 是否已全套存在？若缺，需要先补 shared API 再对齐前端。
3. LM 的 `vitest.config.ts` 是否跟 Assistant 同样有 Node 25 localStorage 坑？开工 LM-ALIGN-01 前先跑一次 `npx vitest run` 看是否飘红，飘红就先复用 Assistant 的 setup.ts 方案。
