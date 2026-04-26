# Student 端接入 SSOT shared 共性勘察报告

**日期**：2026-04-26  
**勘察人**：Cascade  
**目标**：评估 student 端是否应纳入 SSOT 共享架构路线图，并交付一份可独立实施的执行报告。

---

## 📋 交接说明（READ FIRST）

本文档是**可独立交接的执行级勘察报告**，目标接收方为另一台开发机的工程师/AI。

### 工作分工

- **本机（出报告方）**：完成事实勘察、可行性分析、改动方案、diff 草案、验收命令清单。**不负责实施**。
- **接收方（实施方）**：基于本文档独立判断是否纳入自己的 roadmap 节点；若决定接入，可直接按 §9 执行级清单动手。**当前主开发线已转向 admin/mentor/lead-mentor 三端推进**，本任务不在本机推进队列内。

### 接收方使用顺序

1. 先读 §0 摘要 → 决策是否接入
2. 若决定接入：读 §9 执行级清单 → 按文件依赖顺序实施
3. 实施期间：按 §9.5 验收命令逐步检查 → 按 §10 交接 checklist 收尾

### 文档独立性保证

- 所有引用代码均含**绝对路径 + 行号**（见 §8.1）
- 所有改动均含 **before/after diff 草案**（见 §9.2、§9.4）
- 所有验收命令均**复制即可执行**（见 §9.5）
- 所有 schema 兼容性结论均**可在 git checkout 后用工具验证**（见 §4.1.2）

---

## 0. 摘要

### 0.1 关键修正：M0.1-M0.3 早已完成

之前基于 audit 文档（2026-04-24）误判了 M0 状态。实际 git log：

| Commit | 内容 |
|---|---|
| `5e72872c` | M0.1 日历 Controller 拆分（V1 修复） |
| `495980d6 + 74c332c1 + cc2071b4` | M0.2 Service 重命名/合并/切换（V4 修复） |
| `8a91777e` | TD-002 Service Bean 重命名 |

**M0.1 / M0.2 / M0.3 / TD-002 全部已交付**，audit 文档中"V1 严重 已列为 M0.1 目标"是历史描述。

### 0.2 audit 剩余债

| # | 违反项 | 现状 | 触发点 |
|---|---|---|---|
| **V2** | `OsgMockPracticeController` 残留 admin/mentor 端点 | LM/Asst/Student 端独立 Controller 已存在 | M3 启动前清 |
| **V3** | `OsgClassRecordController` 残留 admin/mentor/assistant 端点 | LM/Student 端独立 Controller 已存在 | M4 启动前清 |
| **V5** | Schedule Service 跨端借用 | 未核实 | M6（已决策不做） |

### 0.3 Student 端勘察结论

| 维度 | 数据 |
|---|---:|
| **Student 端 V1 视图总数** | 27 个 |
| **业务核心视图** | 6 个（applications / positions / courses / mock-practice / profile / schedule） |
| **学生独有视图** | 21 个 |
| **可接入 SSOT shared** | **1 个**（applications） |
| **预计瘦身** | ~250 行（applications 单文件） |
| **前置改动** | shared/InterviewCalendar 加 1 个 slot 或 prop |
| **后端改动** | 可选（清理冗余 schedule 字段） |
| **影响的辅导业务端** | 3 端（assistant / mentor / lead-mentor）需回归测试 |
| **影响 admin 端** | ❌ **零影响**（admin 不接入 InterviewCalendar） |

### 0.4 决策推荐

**推荐：student/applications 接入 5 个 shared 业务组件**

工作量约 **1 天**（前端零后端改动），具体接入哪个 milestone（M1.6 / M2.x / 独立 ticket）由接收方根据自己的 roadmap 决定。

不推荐扩展：positions / mock-practice / courses / profile / schedule（理由见 §4-§6）。

---

## 1. 勘察方法论

### 1.1 范围

| 模块 | 路径 |
|---|---|
| **shared 组件** | `osg-frontend/packages/shared/src/components/` |
| **shared 类型** | `osg-frontend/packages/shared/src/types/` |
| **shared API** | `osg-frontend/packages/shared/src/api/` |
| **Student view** | `osg-frontend/packages/student/src/views/` |
| **Asst SSOT 参考** | `assistant/src/views/career/job-overview/index.vue` |
| **后端** | `ruoyi-admin` + `ruoyi-system` |

### 1.2 评估维度

1. 业务视角同构度（学生看自己 vs 工作人员看一群）
2. 数据 schema 兼容性
3. shared 组件硬编码项识别
4. 接入工作量（父组件 + shared 升级 + 后端）
5. 量化收益（瘦身行数 + 5 端 UI 一致性）

---

## 2. shared 组件清单

### 2.1 核心业务组件（6 个）

| 组件 | 行数 | 关键 prop |
|---|---:|---|
| **InterviewCalendar** | 478 | `events: InterviewEvent[]`, `title?`, `showMonthNav?`, `defaultExpanded?` |
| **StageTag** | 38 | `stage?`, `fallback?` |
| **CoachingStatusTag** | 71 | `status?`, `fallback?`, `textMode?` |
| **CompanyPositionCell** | 97 | `company?`, `position?`, `location?`, `metaMode?` |
| **InterviewTimeCell** | 75 | `time?`, `hint?`, `emphasizeOverdue?` |
| **StudentAvatarCell** | 111 | `name?`, `id?`, `backgroundColor?` |

### 2.2 Positions 子件（3 个）

| 组件 | 学生端可用性 |
|---|---|
| **PositionsListTable** | 🟡 含 studentCount 列（学生不需要，可父组件去除） |
| **PositionsDrilldown** | ❌ line 63 hard-code "我的学员: X 人" |
| **PositionsFooter** | 🟡 待评估 |

### 2.3 InterviewCalendar 关键限制（⚠️ 学生端阻塞点）

`shared/components/InterviewCalendar.vue:139-146` 本周事件卡 hard-code：

```
{{ item.studentName || '-' }} - {{ item.company || '-' }}
```

**问题**：学生端 `studentName` 为空 → UI 显示 `"- - 摩根士丹利"`，不可接受。

默认 title `"学员面试安排"` 也不适合学生端（可通过 prop 覆盖）。

**改造方案（推荐 A）**：
- A：增加 `#weekCard` slot 让父组件自定义渲染
- B：增加 `hideStudentName?: boolean` prop

A 更通用（学生 / mentor / asst 均可自定义）。

---

## 3. Student 端 V1 视图全量盘点

### 3.1 视图分类（27 个）

#### A. 求职业务核心（4 个）

| 视图 | 行数 | 业务定位 | 与 SSOT 关系 |
|---|---:|---|---|
| **applications** | 2374 | 看自己求职 + 含日历 | 🟢 与 job-overview 高度同构 |
| **positions** | 2298 | 浏览岗位 + 申请 + 收藏 | 🟡 视角不同 |
| **mock-practice** | 774 | 看自己练习 + 申请 | 🟡 视角不同 |
| **courses** | 1156 | 看自己课程 + 评分 | 🟡 视角完全不同 |

#### B. 个人信息（2 个）

| 视图 | 行数 | 与 SSOT 关系 |
|---|---:|---|
| **profile** | 516 | ❌ 模型不同（student / sys_user / staff） |
| **schedule** | 65 | ⚠️ stub，无业务 |

#### C. 学生独有（21 个 - 不在 SSOT 范围）

resume / ai-resume / ai-interview / interview-bank / online-test-bank / dashboard / career / restricted / feedback / complaint / netlog / faq / resources / notice / communication / report / questions / files / placeholder / login / forgot-password。

### 3.2 当前 shared 接入现状

- 23/27 业务页用 `OsgPageContainer`（基础容器）
- **0 个业务 shared 组件被使用**（StageTag / InterviewCalendar / 4 cells 全部未用）

---

## 4. 数据 schema 兼容性分析

### 4.1 applications：高度兼容（关键发现）

#### 4.1.1 数据流

```
后端 OsgApplicationController.list()
  → PositionServiceImpl.selectApplicationList()
  → 返回 List<Map<String, Object>>
  → 前端 StudentApplicationRecord[]

后端 OsgApplicationController.meta()
  → PositionServiceImpl.selectApplicationMeta()
  → 内部调 buildApplicationSchedule(applications)
  → 转换出 schedule items（dayLabel "12" / accentClass）
  → 前端 applicationsMeta.schedule
```

#### 4.1.2 schema 对比

**StudentApplicationRecord** 字段（学生记录）：
- ✅ `id`, `company`, `position`, `location` ← 直接兼容 InterviewEvent
- ✅ `coachingStatus: 'coaching' | 'pending' | 'none'` ← 兼容
- ✅ `stage` ← 可映射 `interviewStage`
- ✅ **`interviewAt: string`** ← **ISO 时间串**（后端 line 859 用 LocalDateTime.parse 验证）
- ⚠️ `interviewTime` ← 显示用，不一定 ISO
- ❌ 无 `studentName`（学生看自己）

**InterviewEvent** 字段：`id`, `interviewTime?`, `studentName?`, `company?`, `position?`, `location?`, `interviewStage?`, `coachingStatus?`

#### 4.1.3 映射方案（前端零后端改动）

```ts
const calendarEvents = computed<InterviewEvent[]>(() => 
  applications.value
    .filter(r => r.interviewAt)
    .map(r => ({
      id: r.id,
      interviewTime: r.interviewAt,  // ⚠️ 用 interviewAt
      company: r.company,
      position: r.position,
      location: r.location,
      coachingStatus: r.coachingStatus,
      interviewStage: r.stage,
    }))
)
```

**结论**：✅ **数据 100% 兼容**，零后端改动。

#### 4.1.4 schedule 字段冗余分析

后端 `PositionServiceImpl.buildApplicationSchedule()`（line 853-907，~50 行）：
- 从 applications 提取最多 2 条有 interviewAt 的记录
- 转换为 dayLabel / shortLabel / accentClass / timeLabel 等

接入 InterviewCalendar 后此字段冗余，**可清理后端 ~50 行**（或保留向后兼容）。

### 4.2 positions：部分兼容但有阻塞

**字段映射**（需 adapter）：
- `id ↔ positionId`
- `title ↔ positionName`
- `url ↔ positionUrl`
- `company ↔ companyName`

**阻塞项**：
1. PositionsDrilldown line 63 hard-code "我的学员: X 人"
2. PositionsListTable 含 studentCount 列（可父组件去除）
3. 学生有"申请投递 / 收藏 / 申请辅导"操作（shared table 无此设计，需 slot 透传）

**结论**：🟡 接入需 shared 改造（drilldown 加 prop + table actions slot），ROI 低。

### 4.3 mock-practice / courses / profile / schedule

| 视图 | 阻塞 |
|---|---|
| **mock-practice** | shared 无 mock-practice 业务组件（M3 未完工） |
| **courses** | 业务流完全不同（学生评分 vs 工作人员写报告 + 审核） |
| **profile** | 3 端模型不同（roadmap §4.6 已决策"不做"） |
| **schedule** | 65 行 stub，无业务 |

---

## 5. 候选接入清单（按可行性）

### 5.1 applications（推荐接入）

| Shared 组件 | 接入难度 | 改动 | 瘦身行数 |
|---|---|---|---:|
| `InterviewCalendar` | 🟡 中 | 父组件 events 派生 + shared 加 `#weekCard` slot | ~115 行 |
| `StageTag` | 🟢 易 | 替换 stage-tag span + stageToneMap | ~12 行 |
| `CoachingStatusTag` | 🟢 易 | 替换 coaching-tag-school | ~7 行 |
| `CompanyPositionCell` | 🟢 易 | 替换 job-cell | ~5 行 |
| `InterviewTimeCell` | 🟢 易 | 替换 interview-cell | ~5 行 |
| `StudentAvatarCell` | ❌ | 不适用（学生看自己） | — |

**额外瘦身**：
- 删除 schedule meta + scheduleItems / scheduleWeekCells / calendarMonthCells / monthlyCount / weeklyCount computed：~120 行

**applications 总瘦身**：**~250 行**（2374 → ~2120）

### 5.2 positions / mock-practice / courses / profile / schedule

**不推荐接入**，理由见 §4.2-§4.3。

---

## 6. 量化共性覆盖率

按 roadmap §5.1.3 公式估算：

| 维度 | 数据 |
|---|---:|
| Student 端业务页总行数 | ~7,180 行（applications + positions + courses + mock-practice + profile + schedule） |
| 可接入 shared 的视图数 | 1 / 6 = 17% |
| 可瘦身行数 | ~250 / 7,180 = 3.5% |
| 5 端 UI 一致性提升 | 仅 applications 的日历 + 4 cells |

**视角差异是主要原因**：
- Student 端有 21/27 = 78% 视图是学生独有（resume / ai-* / 题库 / 反馈等）
- 业务核心 6 个视图中有 5 个视角差异大或阻塞

---

## 7. 决策建议

### 7.1 推荐方案

**student/applications 接入 5 个 shared 业务组件**（接入位置由接收方判断，可作为新增子节点或独立 ticket）

#### 7.1.1 工作量分解（~1 天）

| 任务 | 工作量 |
|---|---:|
| **shared/InterviewCalendar 增加 `#weekCard` slot** | 0.2 天 |
| **shared/InterviewCalendar 写测试覆盖学生场景** | 0.1 天 |
| **student/applications 派生 calendarEvents + 接入 InterviewCalendar** | 0.3 天 |
| **替换 StageTag / CoachingStatusTag / CompanyPositionCell / InterviewTimeCell** | 0.2 天 |
| **本地验证（npm test + Playwright）** | 0.2 天 |

#### 7.1.2 前置约束

- 不动后端（applications 数据 100% 兼容 InterviewEvent）
- 保持 schedule meta 字段（向后兼容，前端不再使用）
- 不强合学生独有业务（"申请辅导"、"标记已投递" Modal 全部留在 view）

#### 7.1.3 后续（可选）

后端清理冗余 `buildApplicationSchedule()` ~50 行（独立 ticket，非阻塞）。

### 7.2 不推荐扩展项

| 视图 | 原因 |
|---|---|
| **positions** | shared 组件 hard-code "我的学员"，业务视角差异大，ROI 低 |
| **mock-practice** | shared 无对应组件（M3 未完工） |
| **courses** | 业务流完全不同（评分 vs 写报告 + 审核） |
| **profile** | 3 端模型不同（roadmap §4.6 已决策"不做"） |
| **schedule** | 65 行 stub，无业务 |

### 7.3 Roadmap 范围更新建议（供接收方参考）

#### 7.3.1 roadmap 主文档当前的语义两层（澄清）

`docs/architecture/2026-04-24-shared-frontend-roadmap.md` 把"端范围"分成两层：

| 层级 | roadmap 章节 | 范围 | 含义 |
|---|---|---|---|
| **物理覆盖** | §0.4 line 6 | `student / mentor / lead-mentor / assistant / admin`（**5 端**） | `@osg/shared` 包被哪些端引用（含 utils / api / 原子组件） |
| **业务组件抽取对象** | §4.3 line 137 / §5.1 | `assistant / mentor / lead-mentor`（**3 端**） | 业务级 shared 组件（如 `<InterviewCalendar>`）的实际改造端 |

**student 当前位置**：在物理覆盖范围内（已用 shared/utils），但**未在业务组件抽取对象中**。  
**admin 永久位置**：在物理覆盖范围内（已用 shared/utils + 部分原子组件），但**永远不在业务组件抽取对象中**（admin 业务模型 = 后台管理流，与辅导业务流根本不同）。

#### 7.3.2 若接收方决定接入 student/applications

需要更新 roadmap 的**两个位置**：

1. **§4.3 Layer 4 业务片段组件表 - B-01 InterviewCalendar 行**：
   - 当前：`第一使用方 = 3 端`
   - 更新为：`第一使用方 = 4 端（assistant / mentor / lead-mentor / student）`

2. **§5.1 Scope 三端接入说明**：
   - 当前：`三端接入：Assistant（SSOT）→ LM → Mentor`
   - 追加：`+ Student（applications 视图，本期接入）`

> **决策依据**：按 §2 Layer 4 选择性判据，纯视觉组件（InterviewCalendar / StageTag / 4 cells）可共享，但页面级业务流（"申请辅导"、"评分课程"等学生特有）保留在端内。
>
> **接入后业务端覆盖**：assistant / mentor / lead-mentor / **student** = **4 端业务对象**（admin 永不参与 InterviewCalendar）。

#### 7.3.3 接入位置选项（由接收方判断）

- 选项 A：作为 M1 Job Overview Epic 的尾节点 M1.6
- 选项 B：作为独立 mini-epic（不挂在 M1 下）
- 选项 C：作为独立 ticket，不挂 milestone

### 7.4 风险与缓解

| 风险 | 缓解 |
|---|---|
| InterviewCalendar `useInterviewCalendar` 的 monthOffset 语义与学生端 `calendarMonthOffset` 略有差异 | 接入时统一切月逻辑，写单元测试覆盖"切月 + 今天高亮"场景 |
| 学生端"今天"判定 / "本月本周" 统计与 SSOT 默认逻辑可能差异 | 通过 emit 'month-change' 让父组件感知 |
| 后端 `interviewAt` 字段格式不规范（部分 ISO，部分空） | 前端 filter 已兜底（`r.interviewAt` 为空跳过） |

---

## 8. 附录

### 8.1 关键文件引用

- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/components/InterviewCalendar.vue:139-146` — hard-code studentName + company
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/components/positions/PositionsDrilldown.vue:63` — hard-code "我的学员: X 人"
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/api/applications.ts:3-27` — StudentApplicationRecord 含 `interviewAt: string`
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/student/src/views/applications/index.vue:13-115` — 自实现日历（115 行）
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/student/src/views/applications/index.vue:725-763` — calendarMonthCells computed
- `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java:853-907` — buildApplicationSchedule（可清理）
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant/src/views/career/job-overview/index.vue:13` — `<InterviewCalendar :events="calendarRecords" />` 接入参考

### 8.2 git log 验证（M0 状态）

```
5cbf8435  docs(arch): M0.0 全量存量违反项审计
5e72872c  refactor(backend): M0.1 日历 Controller 拆分 - admin/mentor 硬独立
495980d6  refactor(backend): M0.2a 新建 IOsgUserJobOverviewService 三端共用接口
74c332c1  refactor(backend): M0.2b 合并 LM+Mentor impl 实现新 IOsgUserJobOverviewService
cc2071b4  refactor(backend): M0.2c+d+e 三端 Controller 切换 + 删除旧 Service + 测试迁移
8a91777e  fix(backend): rename leadMentorJobOverviewService → userJobOverviewService (TD-002)
```

### 8.3 接收方下一步（实施流程参考）

接收方独立判断后选择以下任一路径：

**路径 A：纳入接收方 roadmap 节点（如 M1.6）**
1. 接收方更新自己的主路线图（§7.3 提供 3 个选项）
2. 走接收方常规 RPIV 流程：`/brainstorm` → `/split-story` → `/split-ticket` → `/next`
3. 实施时按 §9 执行级清单逐文件改动

**路径 B：作为独立 ticket（不挂 milestone）**
1. 直接按 §9 执行级清单实施
2. 实施完成后按 §9.5 验收命令清单逐项验证
3. 按 §10 交接 checklist 收尾

**路径 C：归档本文档，暂不接入**
1. 本文档作为参考资料长期归档
2. 后续端范围有变更时再启用

---

## 9. 执行级实施清单

> 本章节为实施方提供文件级 + 行号级的可执行改动方案。所有 diff 草案基于 commit `8a91777e`（M0.3+TD-002 收尾）后的 working tree。

### 9.1 改动文件清单（按依赖顺序）

| 序号 | 文件 | 改动类型 | 行数预估 |
|---|---|---|---:|
| 1 | `packages/shared/src/components/InterviewCalendar.vue` | 加 `#weekCard` slot，保持向后兼容 | +12 / -8 |
| 2 | `packages/shared/src/components/InterviewCalendar.spec.ts` | 新建测试文件（当前不存在） | +120 |
| 3 | `packages/student/src/views/applications/index.vue` | 接入 InterviewCalendar + 4 cell 组件 | +50 / -250 |
| 4 | `packages/student/src/__tests__/applications.behavior.spec.ts` | 调整选择器 + 新增 InterviewCalendar 集成断言 | +30 / -20 |
| 5（可选） | `ruoyi-system/.../PositionServiceImpl.java` | 清理 `buildApplicationSchedule()` 冗余字段 | -50 |

### 9.2 shared/InterviewCalendar slot 改造

**文件**：`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/components/InterviewCalendar.vue`

**改动 1**：模板第 124-147 行 — 把 hard-code 的 weekCard 内容包装成 slot

#### Before（line 124-147）

```vue
<div
  v-for="item in calendarItems"
  :key="item.id"
  class="osg-ic__week-card"
  :class="`osg-ic__week-card--${item.tone}`"
  @click="emit('event-click', item)"
>
  <div
    class="osg-ic__week-date"
    :class="`osg-ic__week-date--${item.tone}`"
  >
    <div class="osg-ic__week-date-num">{{ item.dateNum }}</div>
    <div class="osg-ic__week-date-weekday">{{ item.weekday }}</div>
  </div>
  <div class="osg-ic__week-meta">
    <div class="osg-ic__week-meta-title">
      {{ item.studentName || '-' }} - {{ item.company || '-' }}
    </div>
    <div class="osg-ic__week-meta-sub">
      {{ formatHourMinute(item.interviewTime) }} · {{ item.position || '-' }}<template v-if="item.location"> · {{ item.location }}</template>
    </div>
  </div>
  <a-tag :color="item.tagColor" class="osg-ic__week-tag">{{ item.tag }}</a-tag>
</div>
```

#### After

```vue
<div
  v-for="item in calendarItems"
  :key="item.id"
  class="osg-ic__week-card"
  :class="`osg-ic__week-card--${item.tone}`"
  @click="emit('event-click', item)"
>
  <slot name="weekCard" :item="item" :format-hour-minute="formatHourMinute">
    <!-- 默认渲染（保持原有 assistant / mentor / lead-mentor 三端兼容） -->
    <div
      class="osg-ic__week-date"
      :class="`osg-ic__week-date--${item.tone}`"
    >
      <div class="osg-ic__week-date-num">{{ item.dateNum }}</div>
      <div class="osg-ic__week-date-weekday">{{ item.weekday }}</div>
    </div>
    <div class="osg-ic__week-meta">
      <div class="osg-ic__week-meta-title">
        {{ item.studentName || '-' }} - {{ item.company || '-' }}
      </div>
      <div class="osg-ic__week-meta-sub">
        {{ formatHourMinute(item.interviewTime) }} · {{ item.position || '-' }}<template v-if="item.location"> · {{ item.location }}</template>
      </div>
    </div>
    <a-tag :color="item.tagColor" class="osg-ic__week-tag">{{ item.tag }}</a-tag>
  </slot>
</div>
```

**关键点**：
- slot 名称：`weekCard`
- slot props：`item`（CalendarItem 全字段）+ `formatHourMinute`（格式化助手）
- 默认 fallback 内容**与原有完全一致** → 不破坏 `assistant / mentor / lead-mentor` 三端现有接入
- `admin` 端不依赖 `InterviewCalendar`（admin 端 `career/job-overview` 是后台管理流），**零影响**

**改动 2**：title 默认值保留 "学员面试安排"（学生端通过 prop 覆盖为 "我的求职日历" 或类似）

### 9.3 shared/InterviewCalendar 测试补充

**文件（新建）**：`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/components/InterviewCalendar.spec.ts`

**最少测试用例**（5 个）：

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import InterviewCalendar from './InterviewCalendar.vue'
import type { InterviewEvent } from '../types/interviewCalendar'

const today = new Date()
const isoTodayAt10 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString()

const baseEvents: InterviewEvent[] = [
  {
    id: 1,
    interviewTime: isoTodayAt10,
    studentName: '张三',
    company: '高盛',
    position: '量化分析师',
    location: '北京',
    interviewStage: 'behavioral',
    coachingStatus: 'coaching',
  },
]

describe('InterviewCalendar', () => {
  it('默认 weekCard 渲染：显示 studentName + company', () => {
    const wrapper = mount(InterviewCalendar, {
      props: { events: baseEvents, defaultExpanded: true },
      global: { plugins: [Antd] },
    })
    expect(wrapper.text()).toContain('张三 - 高盛')
  })

  it('weekCard slot 自定义渲染：替换默认布局', () => {
    const wrapper = mount(InterviewCalendar, {
      props: { events: baseEvents, defaultExpanded: true },
      slots: {
        weekCard: '<template #weekCard="{ item }"><div class="custom">CUSTOM-{{ item.company }}</div></template>',
      },
      global: { plugins: [Antd] },
    })
    expect(wrapper.text()).toContain('CUSTOM-高盛')
    expect(wrapper.text()).not.toContain('张三 - 高盛')
  })

  it('weekCard slot 接收 item 全字段 + formatHourMinute', () => {
    let receivedItem: any
    let receivedFormat: any
    mount(InterviewCalendar, {
      props: { events: baseEvents, defaultExpanded: true },
      slots: {
        weekCard: (props: any) => {
          receivedItem = props.item
          receivedFormat = props.formatHourMinute
          return ''
        },
      },
      global: { plugins: [Antd] },
    })
    expect(receivedItem).toMatchObject({ id: 1, company: '高盛', position: '量化分析师' })
    expect(typeof receivedFormat).toBe('function')
    expect(receivedFormat(isoTodayAt10)).toBe('10:00')
  })

  it('studentName 缺失时默认显示 "- - 公司名"（向后兼容）', () => {
    const eventsNoName: InterviewEvent[] = [{ ...baseEvents[0], studentName: undefined }]
    const wrapper = mount(InterviewCalendar, {
      props: { events: eventsNoName, defaultExpanded: true },
      global: { plugins: [Antd] },
    })
    expect(wrapper.text()).toContain('- - 高盛')
  })

  it('title prop 覆盖默认 "学员面试安排"', () => {
    const wrapper = mount(InterviewCalendar, {
      props: { events: baseEvents, title: '我的求职日历' },
      global: { plugins: [Antd] },
    })
    expect(wrapper.text()).toContain('我的求职日历')
    expect(wrapper.text()).not.toContain('学员面试安排')
  })
})
```

### 9.4 student/applications 改造步骤

**文件**：`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/student/src/views/applications/index.vue`

#### Step 1：新增 import

```ts
// 在 <script setup> 顶部 import 区域新增
import { InterviewCalendar } from '@osg/shared/components'
import type { InterviewEvent } from '@osg/shared/types/interviewCalendar'
import { StageTag, CoachingStatusTag, CompanyPositionCell, InterviewTimeCell } from '@osg/shared/components'
```

#### Step 2：新增 calendarEvents computed（建议放在 scheduleItems 附近，约 line 671）

```ts
const calendarEvents = computed<InterviewEvent[]>(() =>
  applications.value
    .filter((r) => !!r.interviewAt)
    .map((r) => ({
      id: r.id,
      interviewTime: r.interviewAt,           // ← 关键映射：interviewAt → interviewTime
      company: r.company,
      position: r.position,
      location: r.location,
      coachingStatus: r.coachingStatus,
      interviewStage: r.stage,
      // studentName 留 undefined（学生看自己）
    }))
)
```

#### Step 3：替换日历模板（line 13-115，~103 行）

**Before**（line 13-115，整个 `<a-card class="schedule-card">`）：
- 月份导航按钮
- summary chips（本月 X 场 / 本周 X 场）
- 周视图 7 个 day-chip
- 横向 a-tag 列表
- "展开/收起" 按钮 + 月视图（cal-grid）
- 月视图下方 expanded-list

**After**：

```vue
<InterviewCalendar
  :events="calendarEvents"
  title="我的求职日历"
  :default-expanded="false"
  @event-click="(event) => openInterviewModal(event.id)"
>
  <template #weekCard="{ item, formatHourMinute }">
    <!-- 学生端不显示 studentName，只显示 company -->
    <div class="osg-ic__week-date" :class="`osg-ic__week-date--${item.tone}`">
      <div class="osg-ic__week-date-num">{{ item.dateNum }}</div>
      <div class="osg-ic__week-date-weekday">{{ item.weekday }}</div>
    </div>
    <div class="osg-ic__week-meta">
      <div class="osg-ic__week-meta-title">{{ item.company || '-' }}</div>
      <div class="osg-ic__week-meta-sub">
        {{ formatHourMinute(item.interviewTime) }} · {{ item.position || '-' }}<template v-if="item.location"> · {{ item.location }}</template>
      </div>
    </div>
    <a-tag :color="item.tagColor" class="osg-ic__week-tag">{{ item.tag }}</a-tag>
  </template>
</InterviewCalendar>
```

#### Step 4：删除冗余 computed（line 671-763 + 889-891）

待删除项：
- `scheduleMonthLabel` (line 672-676)
- `scheduleWeekAnchor` (line 678-682)
- `scheduleWeekCells` (line 684-713)
- `monthlyCount` (line 715-718)
- `weeklyCount` (line 720-723)
- `calendarMonthCells` (line 725-763)
- `shiftCalendarMonth` (line 889-891)
- `calendarMonthOffset` ref (line 579) — 仍可保留供其他地方用（确认无引用后删）
- `calendarExpanded` ref (line 578) — 删（InterviewCalendar 内置展开状态）

预计删除 **~120 行**。

#### Step 5：在 a-table columns 中替换 cell 组件

**applications 表格的 customRender** 中，分别用：
- `StageTag` 替换原 `<span class="stage-tag stage-tag--xxx">{{ stageLabel }}</span>`
- `CoachingStatusTag` 替换原 `<span class="coaching-tag-school">{{ coachingStatusLabel }}</span>`
- `CompanyPositionCell` 替换原 `<div class="job-cell">…</div>`
- `InterviewTimeCell` 替换原 `<div class="interview-cell">…</div>`

具体替换点需在实施时按 a-table columns 定义逐项调整（5-10 处）。

#### Step 6：删除冗余样式

删除 `.schedule-card / .day-chip / .cal-grid / .cal-cell / .expanded-list / .stage-tag-* / .coaching-tag-*` 等样式块（~30 行）。

### 9.5 验收命令清单

```bash
# Phase 1：shared 包改动验收
cd /Users/hw/workspace/OSGPrj/osg-frontend/packages/shared
pnpm test InterviewCalendar    # 期望：5 tests pass
pnpm typecheck                  # 期望：无错误

# Phase 2：student 包改动验收
cd /Users/hw/workspace/OSGPrj/osg-frontend/packages/student
pnpm test applications          # 期望：行为测试通过
pnpm typecheck                  # 期望：无错误
pnpm lint                       # 期望：无错误

# Phase 3：辅导业务三端回归（确认 weekCard 默认行为不变）
# 注：admin 端不依赖 InterviewCalendar，无需回归
cd /Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant
pnpm test job-overview          # 期望：原测试全部通过

cd /Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor
pnpm test job-overview          # 期望：原测试全部通过

cd /Users/hw/workspace/OSGPrj/osg-frontend/packages/mentor
pnpm test job-overview          # 期望：原测试全部通过

# Phase 4：student 端 dev server 手测
cd /Users/hw/workspace/OSGPrj/osg-frontend
pnpm --filter @osg/student dev
# 浏览器打开 http://localhost:4000/applications
# 验证：日历正常切月、本周事件卡不显示 "-" 占位、点击事件能弹 modal
```

### 9.6 端到端验证（Playwright）

学生端 `applications` 页 5 个关键断言：

| # | 操作 | 期望 |
|---|---|---|
| 1 | 进入 `/applications` | 看到"我的求职日历"标题 |
| 2 | 查看本周事件卡 | 显示 `公司名` 而非 `"- - 公司名"` |
| 3 | 点击月份切换按钮 `<` / `>` | 月份标签变化 |
| 4 | 点击本周事件 chip | 弹出面试详情 modal |
| 5 | 点击"展开" | 月视图显示，今天高亮，事件圆点正确 |

---

## 10. 交接 checklist

实施完成后接收方需逐项确认：

### 10.1 代码改动确认

- [ ] `shared/InterviewCalendar.vue` 已加 `#weekCard` slot，默认 fallback 与原行为一致
- [ ] `shared/InterviewCalendar.spec.ts` 新建并 5 个 case 全通过
- [ ] `student/applications/index.vue` 已接入 InterviewCalendar + 4 个 cell 组件
- [ ] 已删除 `scheduleWeekCells / calendarMonthCells / scheduleMonthLabel` 等冗余 computed
- [ ] 已删除冗余样式块
- [ ] `student/applications.behavior.spec.ts` 测试已调整并全部通过

### 10.2 回归确认

- [ ] `assistant/job-overview` 测试全部通过（默认 weekCard 行为不变）
- [ ] `lead-mentor/job-overview` 测试全部通过
- [ ] `mentor/job-overview` 测试全部通过
- [ ] 辅导业务三端 typecheck + lint 全部通过
- [ ] **admin 端不需要回归 `job-overview`**（admin 不接入 InterviewCalendar）

### 10.3 视觉确认（dev server 手测）

- [ ] 学生端日历切月按钮、今天高亮、本月统计正确
- [ ] 学生端本周事件卡**不再出现** `"- - 公司名"` 占位
- [ ] 助教/班主任/导师三端 job-overview 日历视觉**完全无变化**（默认 fallback 兜底）

### 10.4 后端确认（可选）

- [ ] 若清理后端 `buildApplicationSchedule()`：确认 `/student/application/meta` 接口仍正常返回，前端无依赖 `meta.schedule` 字段

### 10.5 文档归档

- [ ] 实施完成后在本文档末尾追加"实施记录"小节（实施日期 / commit hash / 实测瘦身行数 / 偏差项）
- [ ] 若决定纳入 roadmap，在 `2026-04-24-shared-frontend-roadmap.md` §0.4 端范围 + §1.x 子节点 + §7.5 端参与度矩阵三处同步更新

---

## 11. 实施记录（接收方实施完成后填写）

> 待填写

| 字段 | 值 |
|---|---|
| 实施日期 | — |
| 实施方 | — |
| commit hash | — |
| 实测瘦身行数 | — |
| 实测工作量 | — |
| 与方案偏差项 | — |
| 备注 | — |
