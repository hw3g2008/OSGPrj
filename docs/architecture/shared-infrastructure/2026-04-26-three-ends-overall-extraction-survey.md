# 三端 SSOT 整体抽取勘察报告（一次性整体方案）

**日期**：2026-04-26  
**勘察人**：Cascade  
**目标**：基于已有 quick assessment + 实测，对辅导业务三端（assistant / mentor / lead-mentor）剩余所有业务页做整体勘察，给出一次性推进方案，避免 milestone 一个一个走。

---

## 0. 摘要（一表通）

### 0.1 端范围基线（已校准）

- **业务组件抽取改造对象** = `assistant / mentor / lead-mentor` 三端
- **admin 永久剔除**（业务模型不同 = 后台管理流，仅消费 shared 原子层）
- **student 独立评估**（已有专门勘察报告 `2026-04-26-student-shared-integration-survey.md`，仅 applications 视图同源）

### 0.2 整体推进矩阵（一图看懂当前 + 未来）

| 业务模块 | 三端覆盖 | 当前状态 | 推进决策 | 优先级 |
|---|:---:|---|---|:---:|
| **M1 Job Overview** | asst / mentor / LM | ✅ **已完成**（6 组件 + composable） | — | — |
| **M2 Positions** | asst / LM（mentor 无） | ✅ **已完成**（3 组件） | — | — |
| **M3 Mock Practice** | asst / mentor / LM | ⚠️ **antd 化完成，P0 抽取被 enum 阻塞** | **阻塞** → 业务侧统一 status enum 后再抽 P0 | P1 |
| **M4 Class Records** | asst / mentor (`courses`) / LM | ⚠️ **三端均 antd 化，shared 抽取被 LM 后端阻塞** | **阻塞** → LM 后端补 list/stats GET 后启动 | P0 |
| **M5 Students** | asst / LM（mentor stub） | ⚠️ **被后端 schema 不对齐阻塞** | **阻塞** → 后端 OsgStudentBasic + Extension 后启动 | P0 |
| **M6 Login + Forgot Password** | asst / mentor / LM | ⏳ **未启动**（路线图候选 B-02 / C-04） | 立即可推进 | P2 |
| **profile** | asst / mentor / LM | 🚫 **业务模型不同，决策保留独立** | 不抽 | — |
| **schedule** | asst / mentor / LM | 🚫 **业务模型不同，决策保留独立** | 不抽 | — |
| ~~dashboard / home~~ | — | 🚫 **不在 V1 范围**（memory `2c14519e`） | 不勘察不抽 | — |

### 0.3 一次性整体决策

**第 1 批：立即可推进（无阻塞）**
- M6 / B-02 + C-04：登录 + 忘记密码 共享流程（5 端 V1 范围内）

**第 2 批：业务/后端解锁后推进（提清单等待）**
- M3 P0 PracticeStatusTag / PracticeTypeTag（待业务侧统一 status enum + DB migration）
- M4 ClassRecordStatusTag / ClassRecordTypeTag（待 LM 后端补 GET list/stats endpoints）
- M5 StudentStatusTag（待后端 OsgStudentBasic + Extension schema 落地）

**第 3 批：（原dashboard / home）已剔除（不在 V1 范围）**

**永久不做 / 不在范围**
- profile / schedule（业务模型差异本质不可调和）
- dashboard / home（不在 V1 范围，文件仅为路由占位）

---

## 1. 三端业务页全量盘点（修正版横向矩阵）

### 1.1 实测行数（仅辅导业务三端）

| 业务模块 | assistant | mentor | lead-mentor | 备注 |
|---|---:|---:|---:|---|
| job-overview | `career/job-overview` 415 | `job-overview` 691 | `career/job-overview` 1114 | M1 已完成 |
| positions | `career/positions` 839 | — | `career/positions` 1319 | M2 已完成（mentor 无该页） |
| mock-practice | `career/mock-practice` 620 | `mock-practice` 465 | `career/mock-practice` 1102 | 三端 antd，shared 接入被阻塞 |
| **class-records** | `class-records` 937 | **`courses` 805** | `teaching/class-records` 1488 | **mentor 用 courses 命名，业务=class-records** |
| students | `students` 623 | `students` 7（stub） | `students` 24（stub）+ `teaching/students` 671 | mentor 不参与 |
| profile | `profile` 809 | `profile` 270 | `profile/basic` 528 | 已决策保留独立 |
| schedule | `schedule` 709 | `schedule` 567 | `profile/schedule` 979 | 已决策保留独立 |
| ~~home~~ | `home` 581（不在 V1） | — | `home` 453（不在 V1） | **不在 V1 范围**，仅路由占位 |
| ~~dashboard~~ | `dashboard` 44 stub | `dashboard` 546（不在 V1） | `dashboard` 48 stub | **不在 V1 范围**，仅路由占位 |
| login | `login` 551 | `login` 271 | `login` 1128（含 forgot-password） | 未启动 |
| forgot-password | `forgot-password` 791 | `forgot-password` 259 | （合并到 login） | 未启动 |

### 1.2 关键修正点

| 修正项 | 内容 |
|---|---|
| **mentor/courses ≡ class-records** | mentor 用 `courses` 命名（asst 用 `class-records`，LM 用 `teaching/class-records`），但模板首行明确写"课程记录 Class Records"。原 M4 文档遗漏 mentor。三端范围修正为 `asst + mentor (courses) + LM` |
| **mentor 是 8 个真业务页 + 9 个 stub** | 占位 stub（7 行）：`communication / expense / faq / files / job-tracking / notice / qbank / settlement / students`。Stub 不在抽取范围 |
| **LM `login` 含 forgot-password 流程** | LM/login 1128 行（合并实现），asst/mentor 各自独立 forgot-password 页 |
| **mentor/dashboard 不在 V1 范围** | mentor/dashboard 546 行是变相首页实现，但按 V1 需求范围 mentor 端不含"首页/仪表盘"功能。退出本期勘察范围 |

### 1.3 mentor 端独有页（不在三端共性范围）

`courses`（实际 = class-records，归 M4） / `dashboard`（独有 546 行） / `students/communication/expense/faq/files/job-tracking/notice/qbank/settlement` 全是 stub。

---

## 2. 已抽取 milestone 详情

### 2.1 M1 Job Overview ✅ 已完成

**commit 链**：`e5bd8f56` → `4b0cf55f` → `97c7fb13` → `9224e4f2` → `b786d5b2` → `367eebfc`（close）

**已抽产出**（`packages/shared/src/components/`）：

| 组件 | 三端接入计数 | 测试 |
|---|---|---|
| `StageTag.vue` | LM/Asst/Mentor 共 14+12+8 处 import 引用 | ✅ |
| `CoachingStatusTag.vue` | 同上 | 8 tests |
| `StudentAvatarCell.vue` | 同上 | 14 tests |
| `CompanyPositionCell.vue` | 同上 | 11 tests |
| `InterviewTimeCell.vue` | 同上 | 10 tests |
| `InterviewCalendar.vue` | 同上 | ⚠️ **无测试**（学生勘察报告中已规划补 5 个 case） |
| `useInterviewCalendar.ts` (composable) | LM/Asst/Mentor 共用 | 24 tests |
| `jobOverviewTone.ts` (utils) | 共用 | 含 |

**当前状态**：M1.6 student/applications 接入 InterviewCalendar 已勘察并交接，等接收方实施。

### 2.2 M2 Positions ✅ 已完成

**commit 链**：`03084b56` → `b419c462`

**已抽产出**（`packages/shared/src/components/positions/`）：

| 组件 | 接入端 | 行数 |
|---|---|---:|
| `PositionsFooter.vue` | LM 已用，**Asst 未直接 import**（需核实） | ~80 |
| `PositionsListTable.vue` | LM + Asst | ~290 |
| `PositionsDrilldown.vue` | LM + Asst | ~370 |
| `positions/types.ts` | LM + Asst | ~140 |

**净瘦身**：LM −295 / Asst −163（总 −458 行）。

**端范围**：2 端（asst + LM），mentor 无该页。

**已知遗留**：
- 学生端 `student/positions/index.vue` 1872 行未接入（M2 文档明确"shared 抽取效益最低"）
- Asst 是否真用了 `PositionsFooter` 待核实（grep 无 match）

### 2.3 M3 Mock Practice ⚠️ Partial

**commit 链**：`b02e3d1d`（LM antd + 共享接入）+ `1c9d6961`（mentor antd 化）

**当前状态**：
- ✅ 三端均已 antd 化（asst 原已是；LM `b02e3d1d`；mentor `1c9d6961`）
- ✅ LM 已接入 `PageHeader`
- ❌ **shared 业务组件 P0 未抽**：原计划 `PracticeTypeTag` + `PracticeStatusTag`，被 status enum 不一致阻塞

**enum 实测对比**（剥离 admin 后，仅看辅导三端）：

| 端 | status 取值 | 颜色映射 |
|---|---|---|
| **asst** | `new / new_assigned / completed / cancelled / ongoing / pending / scheduled` | `new/new_assigned → red` / `completed → green` / `cancelled → default` / `ongoing → blue` / `pending/scheduled → orange` |
| **mentor** | `new / pending / scheduled / confirmed / completed / cancelled` | 仅 label 映射（`pending/scheduled/confirmed → '待进行'`），**无 statusColor 函数** |
| **LM** | 后端给 `statusLabel + statusTone`（前端不直接处理颜色映射） | 由后端决定 tone |

**结论**：admin 剥离后**三端 enum 仍不一致**：
- asst 把 `pending` 和 `scheduled` 同色
- mentor 把 `pending/scheduled/confirmed` 同义
- LM 由后端决定颜色

→ M3 P0 仍**业务侧阻塞**，需先统一 status enum + 各端 DB migration。

### 2.4 M4 Class Records ⚠️ 后端阻塞 + 范围修正

**当前状态**：
- ✅ 三端 view 均已 antd 化（mentor `b93094c2/fcc208c6`，asst/LM 已是）
- ❌ **shared 抽取被 LM 后端阻塞**：LM 仅有 `createLeadMentorClassRecord` (POST 上报)，缺 `getLeadMentorClassRecordList` 和 `getLeadMentorClassRecordStats` GET endpoints
- ⚠️ **M4 quick assessment 文档漏掉 mentor/courses**（mentor 当时被认为"无 class-records 列表页"，但实测 `mentor/courses` 805 行就是 class-records 业务）

**修正后端覆盖**：
- asst `class-records/index.vue` 937 行
- mentor `courses/index.vue` 805 行（标题 "课程记录 Class Records"）
- LM `teaching/class-records/index.vue` 1488 行

**三端共总计**：3230 行 → P0 抽 ClassRecordStatusTag + ClassRecordTypeTag 后预计净瘦身 ~80 行（仅 Tag 组件，共性 25-35%）

### 2.5 M5 Students ⚠️ 后端 schema 阻塞

**当前状态**：
- ✅ `StudentAvatarCell.vue` 已抽（M1.1.3）
- ❌ **shared 抽取被后端 DTO 不重叠阻塞**

**字段对比**（`2026-04-26-lm-asst-commonality-quantification.md` §3.2）：

| 端 | 字段 |
|---|---|
| **LM** `LeadMentorStudentListItem` | `relations[]` / `applyCount` / `interviewCount` / `offerCount`（班主任视角：学员关系 + 求职数据） |
| **Asst** `StudentListItem` | `leadMentorName` / `contractStatus` / `isBlacklisted` / `pendingReview` / `jobCoachingCount` / `basicCourseCount` / `mockInterviewCount` / `remainingHours`（助教视角：合同 + 课程） |

**字段几乎不重叠** → 不能直接抽，需后端先做 `OsgStudentBasic` 基础 DTO + 各端 `OsgStudentExtension`。

**端范围**：mentor 无 students 真业务页（7 行 stub），M5 实际 = asst + LM 2 端。

---

## 3. 阻塞项分析与解锁路径

### 3.1 阻塞依赖关系图

```
M3 P0 PracticeStatusTag/TypeTag
  └─ 阻塞: 三端 status enum 业务定义不一致
     └─ 解锁: 业务侧确认 SSOT enum (建议 asst 为基准)
        └─ DB migration: 各端历史数据 enum 转换
           └─ 后端 API 改 + 前端 typeColor/statusColor 删除函数

M4 ClassRecordStatusTag/TypeTag  
  └─ 阻塞: LM 后端缺 GET list/stats
     └─ 解锁: 后端实现 IOsgUserClassRecordService.list/stats for LM
        └─ shared/api/class-records.ts 加 LM endpoint binding
           └─ 前端 LM view 切到 GET 端点 + 抽 Tag 组件

M5 StudentStatusTag
  └─ 阻塞: LM/Asst Student DTO schema 不重叠
     └─ 解锁: 后端定义 OsgStudentBasic + OsgStudentExtension
        └─ 前端 LM/Asst students view 改用新 DTO + 抽 Tag

M6/B-02 ForgotPasswordFlow
  └─ 不阻塞: 三端 forgot-password 业务流相同 (5 端规范)
     └─ 直接启动: 抽 useForgotPasswordFlow + ForgotPasswordFlow 组件
```

### 3.2 阻塞解锁优先级建议

| 阻塞 | 解锁工作量 | 解锁后收益 |
|---|---|---|
| **M4 LM 后端 list/stats** | 1-2 天后端 | 解锁 ~1500 行 LM class-records 前端共享化 |
| **M5 后端 schema 对齐** | 2-3 天后端 + 前端 | 解锁 ~600 行 students 共享化 |
| **M3 业务侧统一 enum** | 1 天业务对齐 + 1-2 天后端 migration | 解锁 ~50 行（仅 Tag 组件，价值偏低） |

**建议**：先做 M4 解锁（ROI 最高），再做 M5，M3 优先级最低（共性产出小）。

### 3.3 schedule / profile 永不解锁

按 `2026-04-26-lm-asst-commonality-quantification.md` §3.2 + §6.2 决策：
- profile：staff (LM) vs sys_user (asst) vs mentor 自实现 — **业务模型本质不同**，强合代价 > 收益
- schedule：slot-keys (LM) vs string (asst) vs mentor 自实现 — **数据粒度本质不同**，需统一模型 = 全端重构

**这两个永久保留独立，不再评估**。

---

## 4. 待启动 milestone：M6 / B-02 ForgotPasswordFlow

### 4.1 范围（5 端）

按 `2026-04-24-shared-frontend-roadmap.md` §4.3 line 138 + §6 关联 ticket：

| ID | 名称 | 第一使用方 |
|---|---|---|
| **B-02** | `<ForgotPasswordFlow>` | 5 端（admin / asst / mentor / LM / student） |
| **C-04** | `useForgotPasswordFlow` | 5 端 |

### 4.2 当前实测（行数）

| 端 | login | forgot-password |
|---|---:|---:|
| asst | 551 | 791 |
| mentor | 271 | 259 |
| LM | 1128（含合并） | — |

### 4.3 共性快速估算

- 三步流程：发送验证码 / 输入新密码 / 成功 — **5 端业务流完全一致**（按 roadmap §1.3）
- 文案/logo 差异，但骨架一致

→ 共性覆盖率预估 **70-80%**（按 §5.1.2 → "全量抽 + props 注入差异"档）

### 4.4 抽取方案（待执行 quick assessment）

| 资产 | 类型 | 估算 |
|---|---|---|
| `useForgotPasswordFlow.ts` | composable | ~150 行 |
| `ForgotPasswordFlow.vue` | 业务片段组件 | ~300 行 |
| 总计 5 端瘦身 | — | ~1500 行（每端节省 ~250 行） |

**前置**：本期 V1 是否包含五端忘记密码功能？需确认是否在 V1 范围内（参考 memory `2c14519e`：5 端均含"登录 / 忘记密码"）。

→ 在 V1 范围内 → 可立即启动。

---

## 5. 一次性整体推进路径图

### 5.1 推进路径（按依赖 + ROI 排序）

```
[现在] 
  │
  ├─ 第 1 批（立即推进）
  │   └─ M6 / B-02 ForgotPasswordFlow (3 端 + 可选 admin/student)
  │      预计 2-3 天，~1500 行瘦身
  │
  ├─ 第 2 批（并行后端解锁）
  │   ├─ 后端：LM ClassRecord GET list/stats endpoints
  │   │   └─ M4 ClassRecordStatusTag / TypeTag (3 端) 1-2 天
  │   │
  │   └─ 后端：OsgStudentBasic + Extension schema
  │       └─ M5 StudentStatusTag (2 端) 0.5 天
  │
  ├─ 第 3 批（业务侧解锁）
  │   └─ 业务：mock-practice status enum SSOT 统一
  │      └─ M3 PracticeTypeTag / StatusTag (3 端) 0.5 天
  │
  └─ 永久不做 / 不在范围
      ├─ profile (3 端业务模型本质不同)
      ├─ schedule (3 端业务模型本质不同)
      └─ dashboard / home (不在 V1 范围)
```

### 5.2 各批次工作量估算

| 批次 | 工作量 | 净瘦身估算 | 阻塞 |
|---|---|---|---|
| **第 1 批** M6/B-02 | 2-3 天前端 | ~1500 行 | 无 |
| **第 2 批** M4 + M5 | 3-5 天后端 + 1-2 天前端 | ~2000 行 | 后端 |
| **第 3 批** M3 | 1-2 天业务对齐 + 1-2 天后端 + 0.5 天前端 | ~50 行 | 业务侧 |
| **总计可达** | ~10-15 天 | **~3500 行** | — |

### 5.3 推进节奏建议

**并行**：
- 前端推第 1 批（无后端依赖）
- 同时催后端做 M4/M5 schema 对齐（第 2 批的前置）

**串行**：
- 第 2 批 M4 优先 M5（M4 ROI 更高）
- 第 3 批等业务侧决策（不阻塞前端进度）

---

## 6. 端范围最终矩阵（修正版）

### 6.1 各 milestone 实际改造对象端

| Milestone | asst | mentor | LM | student | admin | 端数 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **M1 Job Overview** | ✅ | ✅ | ✅ | （勘察建议加入） | ❌ | 3 |
| **M2 Positions** | ✅ | — | ✅ | （勘察 1872 行 ROI 低） | ❌ | 2 |
| **M3 Mock Practice** | ✅ | ✅ | ✅ | （独立勘察） | ❌ | 3 |
| **M4 Class Records** | ✅ | ✅ (`courses`) | ✅ | — | ❌ | 3 |
| **M5 Students** | ✅ | — (stub) | ✅ | — | ❌ | 2 |
| **M6 Login/ForgotPassword** | ✅ | ✅ | ✅ | ✅ | ✅（B-02 是 5 端原子层） | 5 |

### 6.2 端范围语义重申

- **物理覆盖**（`@osg/shared` 包被 import）：5 端
- **业务组件抽取改造对象**：本表所列各 milestone 的 ✅ 端
- **admin 永久剔除**（业务模型不同）
- **B-02 ForgotPasswordFlow** 是例外：因为是"原子流程组件"而非"业务组件"，5 端可共用（含 admin）

---

## 7. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 前端推第 1 批时后端 M4/M5 进度未跟上 | 把后端 ticket 单独提给后端组，不阻塞前端 |
| M6 抽 ForgotPasswordFlow 时五端文案不一致 | 用 props 注入端文案（如 `appName: 'OSG 助教端'`），骨架 + 流程不变 |
| M3 业务侧 enum 统一推不动（业务方分歧大） | 长期保持现状，不强制推（M3 收益本就小） |
| mentor/courses 与 class-records 业务字段是否真同源未实测 | 启动 M4 时第一步实测 mentor/courses 的 ClassRecordRow schema |

---

## 8. 行动建议（给本机决策）

### 8.1 立即推进

**启动 M6 / B-02 ForgotPasswordFlow 抽取**（按本报告 §4 范围）：

1. 写 `ForgotPasswordFlow` quick assessment 文档（参考其他 epic-overview 模板）
2. 抽 `useForgotPasswordFlow.ts` 到 `shared/composables/`
3. 抽 `ForgotPasswordFlow.vue` 到 `shared/components/`
4. 三端接入 + Asst（SSOT）→ Mentor → LM
5. （可选）admin / student 接入

### 8.2 同时催后端

**给后端组开两个 ticket**：

1. **后端 ticket A**：LM `OsgClassRecordController` 补 `getList` + `getStats` endpoints
2. **后端 ticket B**：定义 `OsgStudentBasic` + `OsgStudentExtension` DTO，asst/LM 各自取超集

### 8.3 业务侧推动

**给业务方开一个对齐会议**：

- 议题：mock-practice status enum SSOT 收敛（建议 asst 为基准）
- 输出：`docs/architecture/mock-practice-unification/01-enum-alignment.md`

### 8.4 决策不做

**本机宣告 profile / schedule / dashboard / home 永不抽**：

- profile / schedule：业务模型本质不同，在 `2026-04-24-shared-frontend-roadmap.md` §4.3 表格 "B-05 SchedulePanel" 行加 ❌ 永久跳过决策；在 §1.2 共享现状表 "schedule" "profile" 行加注 "已决策保留独立"
- dashboard / home：不在 V1 需求范围（memory `2c14519e`），现有文件仅为路由占位，**不勘察不抽**

---

## 9. 附录：本报告引用的已有文档

| 文档 | 内容 |
|---|---|
| `docs/architecture/2026-04-24-shared-frontend-roadmap.md` | 主路线图（§4.3 候选清单 + §5 首次范例） |
| `docs/architecture/2026-04-26-lm-asst-commonality-quantification.md` | LM-Asst 双端共性量化（§3.2 schedule/profile/students/class-records 决策） |
| `docs/architecture/positions-unification/00-epic-overview.md` | M2 quick assessment（已完成） |
| `docs/architecture/mock-practice-unification/00-epic-overview.md` | M3 quick assessment（被 enum 阻塞） |
| `docs/architecture/class-records-unification/00-epic-overview.md` | M4 quick assessment（漏 mentor，本报告补） |
| `docs/architecture/students-unification/00-epic-overview.md` | M5 quick assessment（被 schema 阻塞） |
| `docs/architecture/shared-infrastructure/2026-04-26-student-shared-integration-survey.md` | Student 端 applications 接入勘察（独立交接） |

### 9.1 git log 关键 commit 串

```
ebf55f67  test(mentor): adapt cross-page specs after antd migration
7d0cd94e  feat(mentor/profile): antd migration + 3 chained modals
d9f5c808  feat(mentor/schedule): antd migration of schedule page
fcc208c6  feat(mentor/courses): antd migration of ReportModal subcomponent
b93094c2  feat(mentor/courses): antd migration of main page + 3 inline modals
1c9d6961  feat(mentor/mock-practice): antd migration
3e72e777  chore(mentor): register antd polyfill in vitest setup
433e9664  docs(roadmap): update m2/m3 status + lm-asst commonality quantification
b02e3d1d  feat(lm/mock-practice): antd migration + shared component adoption
b419c462  feat(positions): adopt shared components in lm/asst + fix antd table overflow
03084b56  feat(shared): extract positions list/drilldown/footer shared components
953663f8  docs(M2-M5): create quick assessment for remaining 4 sub-epics
367eebfc  docs(M1): close M1 sub-epic — P0 done, P1/M1.4 skip per coverage downgrade
2142506b  feat(shared): M1.1.5 抽取 InterviewTimeCell + 三端接入（P0 全部完成）
7944fc64  feat(shared): M1.1.4 抽取 CompanyPositionCell + 三端接入
c487e04b  feat(shared): M1.1.3 抽取 StudentAvatarCell + 三端接入
93762d17  feat(shared): M1.1.2 抽取 CoachingStatusTag + Assistant/Mentor 接入
```

---

## 10. 决策入口与具体执行文档

按"全面推进（3 项并行）"决策已输出 4 份具体执行文档：

| 路径 | 文档 | 接收方 |
|---|---|---|
| **Path 1** 前端立即推进 | [`forgot-password-unification/00-epic-overview.md`](../forgot-password-unification/00-epic-overview.md) | 本机 RPIV 流程 |
| **Path 2** 后端 Ticket A | [`class-records-unification/01-backend-ticket-A-lm-list-stats.md`](../class-records-unification/01-backend-ticket-A-lm-list-stats.md) | 后端组（解锁 M4） |
| **Path 3** 后端 Ticket B | [`students-unification/01-backend-ticket-B-schema-alignment.md`](../students-unification/01-backend-ticket-B-schema-alignment.md) | 后端组（解锁 M5） |
| **Path 4** 业务侧对齐 brief | [`mock-practice-unification/01-business-enum-alignment.md`](../mock-practice-unification/01-business-enum-alignment.md) | 业务方（解锁 M3） |

### 10.1 待用户决策（4 个）

1. **是否启动 Path 1 M6 / B-02 ForgotPasswordFlow 抽取？**（前端独立工作）
2. **是否把 Path 2 + Path 3 ticket 发给后端组？**
3. **是否把 Path 4 brief 发给业务方？**
4. **是否同意 profile / schedule / dashboard / home 永不抽的最终决策？**（已写入 §3.3 + §8.4）

### 10.2 4 份文档自检

每份文档均含：
- 范围 + 共性估算 + 工作量 + 验收标准 + 关联文档
- 可独立交接给接收方（含端点 / DTO / SQL / 测试 case 等执行级细节）
