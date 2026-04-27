# OSG 五端辅导主链状态机收口设计稿

日期：2026-04-27  
状态：设计稿，待校验后进入实施计划  
范围：五端围绕 `osg_job_application + osg_mock_practice + osg_class_record` 三表的辅导主链业务态机、字段口径、跨端能力对齐

## 0. 关联文档

- `docs/plans/five-end-course-flow/2026-03-25-osg-five-end-curl-closure-design.md`（主链总体设计）
- `docs/plans/five-end-course-flow/2026-03-27-five-end-course-application-flow-alignment-design.md`（课程申请流转对齐设计）
- `docs/plans/five-end-course-flow/2026-03-27-student-formal-dataflow-closure-design.md`（学生端正式数据流收口）
- `docs/plans/five-end-course-flow/osg-four-paths-user-stories.md`（产品方四条主线用户故事，本轮业务真相来源）
- `osg-spec-docs/source/prototype/{index,mentor,assistant,lead-mentor,admin}.html`（五端原型，本轮 UI 真相来源）

## 1. 背景

学生端正式数据流已经收口（参见 `2026-03-27-student-formal-dataflow-closure-design.md`），学生发起的真实岗位辅导申请与模拟应聘辅导申请均已写入正式主链。但是后续辅导流转的状态机、跨端能力、字段口径仍存在以下问题：

- 学生端已经按 5 态业务语义对外呈现（`StudentMockPracticeServiceImpl.toPracticeStatusValue`），但 mentor / asst / lead-mentor / admin 四端**仍直接展示数据库 raw 字段**，跨端口径不一致
- 班主任分配导师后，后端代码直接把 `coachingStatus` 设为 `"辅导中"`（中文存值，且跳过"已分配导师"业务态）
- 课程记录审核通过后，**没有任何代码回写** `osg_mock_practice.completedHours` 与 `osg_coaching.totalHours`，导致状态机断链
- 三个辅导者端（mentor / asst / lead-mentor）在原型上能力完全对称，但后端接口能力**严重不对称**：asst 端缺 5 个辅导者动作接口，mentor 端缺 ack-stage-update 接口
- 模拟应聘的"已完成"既无显式按钮也无自动派生，原型上展示"已完成"实为静态占位
- 状态命名在 5 端原型中出现 5 套不同口径（待分配/新分配/待进行/进行中/已确认/已分配/已完成/已安排…）

本轮目标不是重构整个状态机，而是把现有"产品故事 + 原型 + 代码"三方一致认可的业务真相落地到一条统一主链上，并补齐能力缺口。

## 2. 业务真相

本轮以"产品故事 + 原型按钮存在性 + 代码现状"三方一致为准，确认以下业务口径。

### 2.1 五态业务态机（统一口径）

辅导主链统一使用以下 5 个业务态：

```
pending      → 待分配导师
assigned     → 已分配导师
coaching     → 辅导中
completed    → 已完成
cancelled    → 已取消
```

业务流转：

```
学生发起          班主任/admin 分配         辅导者确认
申请            ──────────────────▶      ─────────▶
  ↓                  ↓                       ↓
pending          assigned                  coaching
                                              ↓ 派生
                                              ↓ 课时累计达标
                                              ↓ 或 mentor 主动结案（暂不落地）
                                          completed

任意业务态 ─────▶ cancelled
```

来源：

- 产品故事二第六幕："状态从待分配逐步变化为已确认"（"已确认" 对应业务态 `coaching`）
- 产品故事三第五幕：mentor "进行确认"，确认后学生端可见状态更新
- 设计文档 §8.1 五态定义
- 学生端代码 `toPracticeStatusValue` 已实现 5 态映射

### 2.2 三辅导者端能力对称

mentor / assistant / lead-mentor 在产品故事与原型上都被设计为"辅导者"：

- 产品故事四（班主任）开篇明确："助教小赵的核心模块与班主任端一致，因此这条故事线也可以作为助教端的镜像路径"
- 助教原型 `page-job-overview` 副标题："**查看我辅导和管理的学员求职进度**"
- 助教原型 `page-mock-practice` 含 `我辅导的学员` + `我管理的学员` 双 Tab
- 班主任原型 `page-mock-practice` 含 `待分配导师` + `我辅导的学员` + `我管理的学员` 三 Tab
- **三端原型 sidebar 菜单栏结构对称**：`osg-spec-docs/source/prototype/{mentor,assistant,lead-mentor}.html` 三份原型左侧菜单都包含 `求职总览 / 我的辅导 / 模拟应聘 / 课程记录` 等核心条目（关键词出现次数：mentor 28 / asst 28 / LM 31，多 3 处为 LM 独有的「分配导师」相关字样），证明三端能力被产品视觉地宣告为对称
- **asst 原型上 [确认] 按钮的具体位置（以作本轮补 4 个接口的原型依据）**：
  - `osg-spec-docs/source/prototype/assistant.html:482` — 求职总览 / “新申请” 行，对应 `confirmCoaching`（最左侧 hover 表示待接受辅导）
  - `osg-spec-docs/source/prototype/assistant.html:523` — 求职总览 / “阶段更新通知” 行，对应 `acknowledgeStageUpdate`
  - `osg-spec-docs/source/prototype/assistant.html:644` — 求职总览另一 tab 内的 “阶段更新通知” 行（同上）
  - `osg-spec-docs/source/prototype/assistant.html:860` & `:873` — 模拟应聘 / “新分配” 行，对应 `confirmAssignment`

三端共享如下辅导者动作：

- 接受新分配（confirm）
- 确认学生进度更新（ack-stage-update）
- 提交课时记录（class-record submit）
- 查看反馈

班主任额外拥有"分配导师"权（原型 line 991, 1002, 1013），admin 同样拥有；助教与导师**没有**分配权。

### 2.3 课程记录是辅导主链的唯一可见性来源

学生端可见课程记录的统一规则（沿用 `2026-03-27-student-formal-dataflow-closure-design.md` §6.4）：

- 只展示 `osg_class_record.status='approved'` 的记录
- 每条记录带来源标签（真实岗位辅导 / 模拟应聘辅导）
- "辅导中"的派生触发点是"已审核通过的课时数 > 0"

### 2.4 模拟应聘"已完成"采用派生展示

模拟应聘没有客观的完成事件，因此"已完成"采用派生展示：

- 派生输入：申请的约定课时数 + 已审核通过的课时数累计
- 派生规则：当已审核课时数 ≥ 约定课时数时，派生为 `completed`
- 不引入主动"结案"按钮（5 端原型一致没有该按钮）
- `osg_mock_practice.status='completed'` 字段仍保留，作为未来手动覆盖位

## 3. 设计目标

本轮固定目标如下：

1. 五端围绕同一主链共享同一套五态业务态语义
2. 状态机字段值统一为英文 enum，去除中文存值
3. 班主任分配导师后停在"已分配导师"，由辅导者主动 confirm 才进入"辅导中"
4. 课时记录审核通过后必须回写 `osg_mock_practice.completedHours` 与 `osg_coaching.totalHours`
5. 三辅导者端（mentor / asst / lead-mentor）的辅导动作接口能力对齐
6. 状态展示在所有前端通过同一个 shared composable 收口，不再由后端固化中文 statusLabel

## 4. 非目标

本轮明确不做以下事情：

- 不重构主链 schema（`osg_job_application` / `osg_mock_practice` / `osg_coaching` 主表结构保持不变，沿用 `2026-03-27-five-end-course-application-flow-alignment-design.md` §324"不动 schema 用映射收口"决策）
- 不引入"标记完成 / 结案"按钮
- 不引入"取消申请"按钮（取消触发路径暂不在本轮范围）
- **`cancelled` 状态本轮仅作历史展示用**：设计稿 §2.1 五态中列出 `cancelled`，但本轮无任何代码路径会产生新的 `cancelled` 写入。仅保留历史数据中的 `cancelled` 记录在 5 端正常展示（前端 composable 输出 `tone='default'`）。未来取消路径会在单独一轮补。
- **不补刷历史 `mock_practice.completedHours`**：详见 §5.F5 表述
- 不重构课程记录审核流
- 不重构岗位主链（job_application 的 currentStage / bucket 体系不动）
- 不动学生端已经实现的 `toPracticeStatusValue` 派生逻辑（仅做小幅修正以匹配新口径）

本轮**例外允许**的 schema 扩展：

- `osg_class_record` 增加 `practice_id BIGINT NULL` 与 `application_id BIGINT NULL` 两个 nullable 关联字段
- 该扩展是为了把"一条课时记录归属哪个申请"这一事实显式化，符合 SSOT 原则（详见 §5 F5 裁决）
- 该扩展属于非破坏性 schema 扩展（nullable + 不影响存量），不算违反"不重构主链 schema"约束

## 5. 八个不一致点的裁决

下列 F1-F8 是基于产品故事 + 原型 + 代码三方校验后已确认的不一致点。

### F1 班主任分配后状态推进

**裁决**：班主任 / admin 分配 mentor 后，仅设 `osg_job_application.assignStatus='assigned'`，**不**设 `coachingStatus`。直到任一被分配的辅导者主动 confirm，`coachingStatus` 才被置为 `coaching`。

**当前 bug**：`OsgUserJobOverviewServiceImpl.assignMentors()` 直接 `setCoachingStatus("辅导中")`，跳过"已分配导师"业务态。

**依据**：产品故事二第六幕"待分配 → 已确认"分两步流转，与设计文档 §8.1 一致。

**重新分配裁决**：班主任 / admin 对同一申请重新分配（替换辅导者）时，必须同步清理老辅导者的 confirm 记录，避免新辅导者看到“已确认”状态卡死：

- 必须重置 `osg_coaching.confirmedAt = null` + `osg_coaching.status = 'assigned'`
- 必须重置 `osg_job_application.coachingStatus = 'none'`（如以前已进入 `coaching` 态）
- 该重置动作与实施计划 A.2 step 1/step 2 一致

**并发场景裁决**（重新分配 vs 老辅导者提交课时）：老辅导者 A 在指令下发后 · 班主任重新分配为 B 之间可能发生并发提交。裁决：

- A 提交课时走 `OsgClassRecordServiceImpl.createMentorClassRecord` 路径，该路径会重新查询该申请的 `osg_coaching.mentor_ids`
- 如 A 已不在 mentor_ids 中（被LM 替换为 B），申请会被 `ServiceException("无权提交课时记录")` 拒绝
- A 在提交表单项上看到的下拉列表（`my-targets` 接口）在刷新后会不包含该申请（实时与后端一致）
- 并发隐护依赖事务隔离级别：建议 READ_COMMITTED 以上（MySQL 默认 REPEATABLE_READ 满足）
- 该场景不会导致数据不一致，是预期行为，不需额外补偿

### F2 字段值统一英文 enum

**裁决**：以下字段值统一为英文：

- `osg_job_application.coachingStatus`：`pending / assigned / coaching / completed / cancelled`（原中文 `"辅导中"` 迁移）
- `osg_job_application.assignStatus`：`pending / assigned`（已经是英文，保持）
- `osg_mock_practice.status`：`pending / scheduled / confirmed / completed / cancelled`（已经是英文，保持，但 `scheduled` 与 `confirmed` 的派生语义在 §6.2 修正）
- `osg_class_record.status`：`pending / approved / rejected`（已经是英文，保持）

**依据**：避免中文与英文混存导致的判等 bug；与字典体系一致。

### F3 辅导者 confirm 必须改业务态

**裁决**：

- 真实岗位：mentor / asst / lead-mentor 任一辅导者点 `[确认]` → 调 `confirm` 接口 → 后端写：
  - `osg_coaching.status='coaching'` + `osg_coaching.confirmedAt=now`
  - `osg_job_application.coachingStatus='coaching'`（首位辅导者 confirm 即触发；后续辅导者重复 confirm 抛业务错误）
- 模拟应聘：辅导者点 `[确认]` → 调 confirm 接口 → 后端把 `osg_mock_practice.status='confirmed'`

confirm 是辅导者必须的业务动作，不是"标记已读"提示。

**依据**：产品故事三第五幕"进行确认。确认之后，学员端也应看到状态已更新"。

### F4 模拟应聘"已完成"采用派生展示

**裁决**：本期不引入显式"完成 / 结案"按钮。"已完成"通过以下规则派生展示：

```
当 已审核课时数(approvedHours) >= 申请约定课时数(plannedHours)
→ 派生展示为 completed
否则按 raw status 派生
```

`plannedHours` 的来源（按优先级）：

1. `osg_mock_practice.requestedMentorCount × 标准课时（按 practiceType 配置）`
2. 申请提交时的 `expectedSessions` 字段（如有）
3. 兜底：`practiceType` 配置的默认课时

`osg_mock_practice.status='completed'` 字段保留，作为未来手动覆盖位（rawStatus = 'completed' 时优先于派生规则）。

**依据**：

- 5 端原型一致没有"完成"按钮
- 产品故事仅描述到 mentor 确认，未涉及主动结案
- 完成的事实存在于 class_record 累加和，符合 SSOT 原则

### F5 审核回写主链（实锤 bug 修复）

**裁决**：`OsgClassRecordServiceImpl.reviewRecord()` 在 `targetStatus='approved'` 分支中必须补充以下回写：

- 若 `class_record.practiceId != null`：`osg_mock_practice.completedHours += class_record.duration`
- 若 `class_record.applicationId != null`：`osg_coaching.totalHours += class_record.duration`（按 applicationId + mentorId 定位记录）

驳回（rejected）不影响 completedHours / totalHours。

**当前 bug**：`reviewRecord()` 仅更新 `osg_class_record` 自身字段，导致 `completedHours` 永远是 0，前端派生逻辑失效。

**依据**：

- `StudentMockPracticeServiceImpl.toPracticeStatusValue` 派生公式依赖 completedHours
- 原型 LM“我辅导”tab 表头明确有"已上课时"列
- 没有任何其他代码路径会写 completedHours，只能通过审核回写

**历史数据补刷判决**：本轮明确不补刷历史。

- 原因：历史 `osg_class_record` 不包含 `practice_id` / `application_id` 关联字段（A.0 才新增），重建关联需靠 student_id + 提交时间模糊匹配，准确性不可靠。强行补刷可能造成全量跨年史 mock_practice 误计。
- 影响面：历史已认为「完成」的模拟应聘记录在上线后可能被派生为 `coaching` 或 `assigned`（因为 `completedHours = 0 < plannedHours`）。设计稿 §8.3.2 提供学生端临时遇驶限制说明。
- 补偿措施：上线公告中需明确告知“上线前已完成的模拟应聘状态可能临时显示不准确，后续新增课时会逐步重建”。`status='completed'` raw 覆盖分支（§6.2 公式最后一行）作为底底保留：历史记录如果 raw status 已是 `completed`，则展示仍为 `completed`（不受派生公式影响）。

### F6 五端通过 shared composable 收口状态展示

**裁决**：

- 在 `osg-frontend/packages/shared` 引入两个 composable：
  - `useApplicationStatusDisplay(rawCoachingStatus, rawAssignStatus, hasApprovedHours)` — 真实岗位 5 态映射
  - `useMockPracticeStatusDisplay(rawStatus, completedHours, plannedHours)` — 模拟应聘 5 态映射
- 这两个 composable 输出 `{ value, label, tone }` 三元组
- 五端前端 mock-practice 列表 / 详情、job-overview 列表 / 详情统一引用这两个 composable
- 后端各端 controller 不再返回 `statusLabel + statusTone` 中文 + 颜色字段，只返回 raw 字段
- 学生端既有 `toPracticeStatusValue` 后端派生保留（学生端 service 层一直承担派生职责，沿用），但派生公式与新 composable 一致

**依据**：

- 学生端代码已经实现 5 态映射，是事实上的 SSOT
- 不收口的代价：5 端能看到 5 种不同标签，客服解释成本高，状态机变更要改 5 处
- 设计文档 §324 "不动 schema 用映射收口"决策的本意

### F7 班主任保留 mock-practice 分配权

**裁决**：班主任端保留模拟应聘 + 真实岗位的分配导师权。

**依据**：

- 班主任原型 `page-mock-practice` line 991, 1002, 1013 三处 `[分配导师]` 按钮明确
- 后端 `POST /lead-mentor/mock-practice/{practiceId}/assign` 接口已实现并使用
- 设计文档 §5.4 班主任端职责包含"分配导师"
- 产品故事四第四幕未提分配权属于故事简化，原型与代码两方一致以原型为准

### F8 学生进度更新写主链且其他端可感知

**裁决**：`POST /student/position/progress` 现状已正确写入 `osg_job_application.currentStage` + `stageUpdated=true`，本轮保持。

学生进度更新后的跨端流转：

| 角色 | 看到 | 处理动作 | 接口 |
|---|---|---|---|
| 学生 | 自己的"我的求职"立即反映新进度 | — | — |
| mentor | 求职总览看到该条 + 红色 stageUpdated 提示 | `[已知悉]` | `POST /api/mentor/job-overview/{id}/ack-stage-update`（**当前缺失，需补**） |
| asst | 同 mentor | `[已知悉]` | `POST /assistant/job-overview/{id}/ack-stage-update`（**当前缺失，需补**） |
| lead-mentor | 同 mentor | `[已知悉]` | `POST /lead-mentor/job-overview/{id}/ack-stage-update`（已实现） |
| admin | 求职总览看到全部学员进度更新 | 可手动改 currentStage | `PUT /admin/job-overview/stage-update`（已实现） |

ack-stage-update 接口的统一语义：把 `osg_job_application.stageUpdated=false`，红色提示消失。

## 6. 目标流转设计

### 6.1 真实岗位辅导主链

```
学生申请                    LM/admin 分配                辅导者确认                  课时审核累加
─────────                  ─────────────                 ─────────                  ────────────
osg_job_application         osg_job_application          osg_job_application       osg_class_record
  assignStatus='pending'      assignStatus='assigned'      coachingStatus='coaching' status='approved'
  coachingStatus='none'       coachingStatus='none'        osg_coaching              osg_coaching
  currentStage='applied'                                     status='coaching'         totalHours += durationHours
                            osg_coaching                     confirmedAt=now           (按 application_id 累加)
                              mentorIds=[..]
                              status='assigned'             
                              assignedAt=now                
                                                          
业务态 (派生)                业务态 (派生)                业务态 (派生)              业务态 (派生)
  pending                     assigned                     coaching                  coaching
```

终态触发：`currentStage` 推进到 `'offer'` 或 `'rejected'` → `bucket='completed'` → 派生为 `completed`。

### 6.2 模拟应聘辅导主链

```
学生申请                    LM/admin 分配                辅导者确认                  课时审核累加              已完成（派生）
─────────                  ─────────────                 ─────────                  ────────────             ──────────
osg_mock_practice           osg_mock_practice            osg_mock_practice          osg_mock_practice         (无需写入)
  status='pending'            status='scheduled'           status='confirmed'         completedHours +=
  completedHours=0            mentorIds=[..]                                            class_record.durationHours
                              assignedAt=now                                            (按 practice_id 累加)
                                                          
业务态 (派生)                业务态 (派生)                业务态 (派生)              业务态 (派生)             业务态 (派生)
  pending                     assigned                     coaching                  coaching                  completed
                                                                                     (completedHours>0)         (completedHours>=plannedHours)
```

> **术语约定**：本设计稿中所有 `completedHours` 一律指 `osg_mock_practice.completedHours` 字段值，语义上即"该 mock_practice 名下已审核通过的课时累加值"。F5 修复后该字段由 `OsgClassRecordServiceImpl.reviewRecord()` 在审核通过时自动累加。

注意：`osg_mock_practice.status` 的 `scheduled` 与 `confirmed` 在前端派生中**统一映射为 coaching**（前提是 `completedHours > 0`），原 `StudentMockPracticeServiceImpl.toPracticeStatusValue` 中"`scheduled+completedHours==0` → `assigned`、`scheduled+completedHours>0` → `coaching`"派生公式的语义需要修正为：

```
status='pending'                                 → pending
status='scheduled'                               → assigned        (LM 已分配，辅导者未确认)
status='confirmed' AND completedHours==0         → assigned        (辅导者已确认但还没上课)
status='confirmed' AND 0<completedHours<planned  → coaching
status='confirmed' AND completedHours>=planned   → completed       (派生)
status='completed'                               → completed       (raw 覆盖)
status='cancelled'                               → cancelled
```

> **修正点**：辅导者 confirm 后是从 `scheduled → confirmed`，但只有上了第一节课且审核通过后才能派生到 `coaching`。这与原代码"`scheduled+completedHours>0 → coaching`"略有出入，本轮以新公式为准。

### 6.3 能力对齐矩阵（3 辅导者端 + admin 端）

本节用四态矩阵呈现四端 × 4 类辅导者动作的现状，分类标记：

- ✅ **已有且无 bug**：可直接复用，本轮零工作量
- 🟡 **已有但需修 bug**：保留路由，修改 service 实现
- 🔵 **已有但需改造**：保留路由，把底层 service 调用迁到统一共用方法
- ❌ **完全没有，需补**：新增 controller 路由 + 调用共用 service
- — **不适用**：该动作不在该端职责范围内

| 接口能力 | mentor | asst | lead-mentor | admin |
|---|:---:|:---:|:---:|:---:|
| **真实岗位** | | | | |
| `confirm`（接受新分配） | 🟡 已有但有 2 个 bug | ❌ **补** | ❌ **补**（原型有按钮后端缺） | —（管理者不辅导） |
| `ack-stage-update`（确认学生进度更新） | ❌ **补** | ❌ **补** | ✅ 已有 | — |
| `stage-update`（主动改阶段） | ❌（保留学生主动） | ❌（保留学生主动） | ✅ 已有 | ✅ 已有 |
| `assign-mentor`（分配辅导者） | — | — | ✅ 已有（§F1 需修 bug） | 🟡 已有但需修 F1 bug |
| `review-class-record`（审核课时） | — | — | — | 🟡 已有但需修 F5 bug |
| **模拟应聘** | | | | |
| `confirm`（接受新分配） | 🔵 已有但 service 独立 | ❌ **补** | 🔵 已有 ack-assignment 但 service 独立 | — |
| `assign-mentor` | — | — | ✅ 已有 | ✅ 已有 |

#### 6.3.0 admin 端的两个隐藏 bug

admin 端使用的 service 与三辅导者端 **不是同一个**：

- 三辅导者端（mentor / asst / LM）走 `OsgUserJobOverviewServiceImpl.assignMentors()`（`@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgUserJobOverviewServiceImpl.java:91-154`）
- admin 端走 `OsgJobOverviewServiceImpl.assignMentors()`（`@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java:146-225`）

两个 service **都**存在 F1 bug（直接设 `coachingStatus='辅导中'`），本轮修复需**同步修两处**，请参§5.F1 / 实施计划 A.2。

#### 6.3.1 mentor 端 `confirm` 的两个 bug

现有 `OsgUserJobOverviewServiceImpl.confirmCoaching()`（`@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgUserJobOverviewServiceImpl.java:181-216`）存在以下问题：

1. **不写 `osg_job_application.coachingStatus`**：仅更新 `osg_coaching` 表，导致 F1 修复后（`assignMentors` 不再写 `coachingStatus`）状态机断在这一步
2. **不防重复 confirm**：第二个 mentor 再次调用会覆盖 `confirmedAt`；应在 `confirmedAt` 非 null 时抛 `'该申请已被确认'` 业务错误

#### 6.3.2 "已有但 service 独立"两处需要改造

现状：

- mentor 模拟应聘 `confirm`：路由 `PUT /api/mentor/mock-practice/{id}/confirm` 已存在，调用 `OsgMockPracticeServiceImpl.confirmMentorMockPractice()`（独立 service）
- LM 模拟应聘 `ack-assignment`：路由 `POST /lead-mentor/mock-practice/{id}/ack-assignment` 已存在，调用 `IOsgLeadMentorMockPracticeService.acknowledgeAssignment()`（另一独立 service）

改造目标：保留路由不变（前端不感知），把两端的底层 service 调用都迁到共用方法 `IOsgMockPracticeService.confirmAssignment(practiceId, userId, operator)`。

#### 6.3.3 本轮工作量分类汇总

| 分类 | 数量 | 具体动作 |
|---|---|---|
| 修 | 1 处 | mentor 真实岗位 `confirm` 现有实现的 2 个 bug |
| 改造 | 2 处 | mentor 模拟应聘 `confirm` + LM 模拟应聘 `ack-assignment`，二者底层 service 均迁至共用方法 |
| 补 | 6 个 | 见下方清单 |

需补 6 个接口：

1. `POST /api/mentor/job-overview/{id}/ack-stage-update`
2. `PUT /assistant/job-overview/{id}/confirm`
3. `POST /assistant/job-overview/{id}/ack-stage-update`
4. `PUT /assistant/mock-practice/{id}/confirm`
5. `POST /assistant/mock-practice/{id}/ack-assignment`
6. `PUT /lead-mentor/job-overview/{id}/confirm`（原型上有 [确认] 按钮，后端缺）

#### 6.3.4 复用方式：service 共用 + controller access guard 隔离

后端实现使用**共用 service 方法**：

- `IOsgUserJobOverviewService.confirmCoaching(applicationId, userId, operator)` — 真实岗位辅导者确认
- `IOsgUserJobOverviewService.acknowledgeStageUpdate(applicationId, userId, operator)` — 真实岗位 ack 进度更新
- `IOsgMockPracticeService.confirmAssignment(practiceId, userId, operator)` — 模拟应聘辅导者确认
- `IOsgMockPracticeService.acknowledgeAssignment(practiceId, userId, operator)` — 模拟应聘 ack 分配

三个端的 controller 仅负责：

1. 路由前缀（`/api/mentor/...` / `/assistant/...` / `/lead-mentor/...`）
2. access guard（`mentorAccessService` / `assistantAccessService` / `leadMentorAccessService`）
3. 调用同一个 service 方法

业务逻辑（写表、状态校验、抛业务错误）100% 在 service 层共用 1 份。controller 层每端 5-10 行模板代码。

## 7. 数据库字段口径

主链三表（`osg_job_application` / `osg_mock_practice` / `osg_coaching`）不修改 schema，仅修改值的语义；`osg_class_record` 按 §4 例外允许新增 2 个 nullable 关联字段（详见 §7.4）。

### 7.1 `osg_job_application`

| 字段 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `assignStatus` | varchar | `pending / assigned` | 是否已分配辅导者 |
| `coachingStatus` | varchar | `none / coaching / completed / cancelled` | 辅导者是否已确认接受；中文值 `"辅导中"` 必须迁移；`none` 表示尚未进入辅导态（学生发起 + LM 已分配但辅导者未 confirm 都用 `none`） |
| `currentStage` | varchar | 字典定义 | 求职阶段（学生 + 辅导者 + admin 都可改） |
| `bucket` | varchar | `tracking / completed` | 终态聚合 |
| `stageUpdated` | boolean | true/false | 学生改进度后置 true，辅导者点已知悉置 false |

### 7.2 `osg_mock_practice`

| 字段 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `status` | varchar | `pending / scheduled / confirmed / completed / cancelled` | raw 状态机 |
| `completedHours` | int | ≥ 0 | 由审核回写累加 |
| `requestedMentorCount` | int | ≥ 1 | 学生申请时的导师数（用于推算 plannedHours） |

### 7.3 `osg_coaching`（真实岗位辅导关系表）

| 字段 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `status` | varchar | `assigned / coaching / completed / cancelled` | 中文值需迁移 |
| `totalHours` | decimal | ≥ 0 | 由审核回写累加 |
| `confirmedAt` | timestamp | nullable | 辅导者 confirm 时间。重新分配场景必须重置为 null（§F1 重新分配裁决） |

### 7.4 `osg_class_record`

| 字段 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `status` | varchar | `pending / approved / rejected` | 审核状态 |
| `application_id` | bigint | nullable | **本轮新增**：关联真实岗位申请 `osg_job_application.application_id` |
| `practice_id` | bigint | nullable | **本轮新增**：关联模拟应聘申请 `osg_mock_practice.practice_id` |
| `durationHours` | double | > 0 | 课时数（沿用现有字段） |
| `studentId` | bigint | not null | 关联学生 |
| `mentorId` | bigint | not null | 关联辅导者用户 ID |
| `courseSource` | varchar | `mentor / clerk / assistant` | 标记是哪一端创建的（不区分 job vs mock） |

约束：
- 业务约束：`application_id` 与 `practice_id` **必有且仅有一个非空**
- 后端 service 在 `createXxxClassRecord` 时强制校验该约束
- 前端 mentor / asst / lead-mentor 三端的提交课时表单必须让用户先选"为哪个申请提交课时"，从而填充 `application_id` 或 `practice_id`
- 历史数据兼容：迁移前已存在的 class_record 两个字段都是 NULL，本轮不回填

## 8. 前端 SSOT 收口

### 8.1 Composable 定义

`osg-frontend/packages/shared/src/composables/useCoachingStatusDisplay.ts`：

```typescript
export interface CoachingStatusDisplay {
  value: 'pending' | 'assigned' | 'coaching' | 'completed' | 'cancelled'
  label: string  // 中文展示
  tone: 'default' | 'info' | 'success' | 'warning' | 'danger'
}

export function useApplicationStatusDisplay(input: {
  assignStatus: string | null
  coachingStatus: string | null
  bucket: string | null
  approvedHours: number
}): CoachingStatusDisplay

export function useMockPracticeStatusDisplay(input: {
  rawStatus: string | null
  completedHours: number
  plannedHours: number
}): CoachingStatusDisplay
```

**五态映射表**（value → label → tone，后端 + 前端 + fixtures 三者必须一致）：

| value | label | tone | 业务含义 |
|---|---|---|---|
| `pending` | 待分配导师 | `danger` | 学生申请、LM 未分配 |
| `assigned` | 已分配导师 | `warning` | LM 已分配、辅导者未 confirm |
| `coaching` | 辅导中 | `info` | 首位辅导者已 confirm、课时 < plannedHours |
| `completed` | 已完成 | `success` | 课时 ≥ plannedHours 或 raw status 是 completed |
| `cancelled` | 已取消 | `default` | 仅历史展示（§4 裁决）、不走新起状态机 |

> **label 取词依据**：`已取消` 与产品故事二第六幕“已取消”用语一致。其他 4 个与原型中一致。fixtures 需覆盖 5 个 value 全枚举。

### 8.2 五端引用规则

- 列表页 status 列单元格：通过 composable 输出渲染 tag
- 详情页头部 status badge：同上
- 筛选下拉的 option 也用 composable 输出生成
- 后端 controller 不再返回 `statusLabel / statusTone`，只返回 `assignStatus / coachingStatus / bucket / approvedHours`（应用申请）或 `rawStatus / completedHours / plannedHours`（模拟应聘）

#### 8.2.1 展示口径 vs 过滤口径分管

本轮 composable 只管**展示口径**（status 返回什么 label / tone），**不管过滤口径**（筛选下拉的选项集）。

- 学生端现有过滤下拉为 3 态归并（`pending` / `ongoing←[assigned, coaching]` / `completed`），本轮**保留不动**
- mentor / asst / LM / admin 端的过滤下拉 5 态与展示一致
- 实际上这意味着学生看到的过滤选项与其他端不同，但**同一条记录在五端看到的 status 展示仍一致**（F6 所保证）
- 过滤口径下沉为五端统一不在本轮范围，后续可考虑。

### 8.3 学生端保留服务端派生

学生端既有 `StudentMockPracticeServiceImpl.toPracticeStatusValue` 暂时保留（学生端 service 层承担派生职责的历史决策），但内部公式按 §6.2 修正。后续可考虑下沉到 composable 收口，但本轮不强制。

#### 8.3.2 历史数据临时在达联需限制（学生端可见）

§5.F5 明确不补刷历史，这临时会在学生端产生以下现象：

- 上线前已完成且课时记录在 `osg_class_record` 中的模拟应聘：
  - 若 raw `osg_mock_practice.status='completed'`：§6.2 公式最后一行走 raw 覆盖分支，仍展示 `completed` ✅
  - 若 raw `osg_mock_practice.status='confirmed'` 且 `completedHours=0`：会被派生为 `assigned`，与“学生记忆中已完成”不一致 ⚠️
- 补偿措施：上线公告中明示“历史记录状态临时可能不准确，仅以后续新增课时为准”
- 为外部云克服提供口径说明：如遇“历史已做完但现在显示辅导中”投诉，说明是上线遇驶现象，会随业务进展逐步重建

#### 8.3.1 双写一致性保障：共享 fixtures

保留双写带来的风险是公式漂移（前后端各自演进，几个月后某次只改一边）。本轮采用**“同一份 JSON 为唯一真相”方案**强制约束：

**设计决策**：不维护 TS 与 JSON 两份镜像。反向：**JSON 当唯一真相，TS 通过 import JSON 使用**，避免两份不同步。

- 在 `ruoyi-system/src/test/resources/coaching-status-fixtures.json` 定义共享 fixtures：
  ```json
  {
    "mockPracticeStatus": [
      { "input": { "rawStatus": "pending", "completedHours": 0, "plannedHours": 4 },
        "expected": { "value": "pending", "label": "待分配导师", "tone": "danger" } },
      { "input": { "rawStatus": "scheduled", "completedHours": 0, "plannedHours": 4 },
        "expected": { "value": "assigned", "label": "已分配导师", "tone": "warning" } },
      { "input": { "rawStatus": "confirmed", "completedHours": 0, "plannedHours": 4 },
        "expected": { "value": "assigned", "label": "已分配导师", "tone": "warning" } },
      { "input": { "rawStatus": "confirmed", "completedHours": 2, "plannedHours": 4 },
        "expected": { "value": "coaching", "label": "辅导中", "tone": "info" } },
      { "input": { "rawStatus": "confirmed", "completedHours": 4, "plannedHours": 4 },
        "expected": { "value": "completed", "label": "已完成", "tone": "success" } },
      { "input": { "rawStatus": "cancelled", "completedHours": 0, "plannedHours": 4 },
        "expected": { "value": "cancelled", "label": "已取消", "tone": "default" } }
    ],
    "applicationStatus": [ /* 同样全枚举 */ ]
  }
  ```
- 前端 `osg-frontend/packages/shared/src/__tests__/coaching-status.fixtures.ts` 中：
  ```typescript
  import fixtures from '../../../../../ruoyi-system/src/test/resources/coaching-status-fixtures.json'
  export const MOCK_PRACTICE_STATUS_FIXTURES = fixtures.mockPracticeStatus
  export const APPLICATION_STATUS_FIXTURES = fixtures.applicationStatus
  ```
  （import 路径可通过 monorepo 的根路径 alias 或相对路径；build 阶段 esbuild 默认支持 import json）
- 前端 `useMockPracticeStatusDisplay.spec.ts` import 该 fixtures，遍历断言
- 后端 `StudentMockPracticeServiceImplTest` 通过 `getClass().getResourceAsStream("/coaching-status-fixtures.json")` 加载同份 JSON，遍历断言
- **CI 保障**：fixtures 修改后，同一次 commit 必须覆盖两端测试能跑过（事实上会走到，因为只改一边的公式后，fixtures 未同步会让另一端测试失败）。**不需要额外的 git diff 检查脚本**。

## 9. 错误处理原则

沿用 `2026-03-27-student-formal-dataflow-closure-design.md` §8 错误处理原则：

- 不出现假成功
- 不出现静默降级
- 主链失败必须明确失败

新增辅导动作（confirm / ack-stage-update / approve）的错误处理要求：

- 重复 confirm 同一申请：返回明确业务错误"该申请已被确认"，不静默成功
- 非授权辅导者 confirm：返回 403 而不是 500
- 审核回写 completedHours 失败：必须回滚整条审核事务，不允许"审核成功但 completedHours 没加"

## 10. 跨端一致性要求

本轮验收必须满足：

- 同一条 `osg_mock_practice` 记录，5 端展示的业务态 label / tone 完全一致
- 同一条 `osg_job_application` 记录，5 端展示的业务态完全一致
- 学生端"已审核课时数"与 mentor / lead-mentor / asst / admin 端展示一致
- 班主任分配导师后，学生端 + 辅导者端立即看到 `assigned`，**不**会看到 `coaching`
- 辅导者 confirm 后，学生端立即看到 `coaching`（前提是已有审核通过的课时记录；否则仍为 `assigned`）

## 11. 测试与验收

### 11.1 必测闭环

至少验证以下两条完整链路：

1. 真实岗位辅导申请闭环
   - 学生发起辅导 → assignStatus='pending' → 业务态 pending
   - LM 分配 mentor → assignStatus='assigned' → 业务态 assigned
   - mentor confirm → coachingStatus='coaching' → 业务态 coaching
   - mentor 提交课时 → class_record.status='pending'
   - admin 审核通过 → class_record.status='approved' + coaching.totalHours += duration
   - 学生端课程记录页可见
   - currentStage 推到 'offer' → bucket='completed' → 业务态 completed

2. 模拟应聘辅导申请闭环
   - 学生发起 → mock_practice.status='pending' → 业务态 pending
   - admin 分配 → status='scheduled' → 业务态 assigned
   - mentor confirm → status='confirmed' → 业务态 assigned（completedHours 仍为 0）
   - mentor 提交课时 → class_record.status='pending'
   - admin 审核通过 → mock_practice.completedHours += duration → 业务态 coaching
   - 累计课时达到 plannedHours → 业务态 completed（派生）

每条闭环都要校验 5 端 status 展示一致。

### 11.2 后端服务测试

- `OsgUserJobOverviewServiceImplTest`
  - assignMentors 后 coachingStatus 仍为 `'none'`（不再被设为 `'coaching'`；F1 修复后状态推进权交给 confirmCoaching）
  - confirmCoaching 后 coachingStatus='coaching'
  - confirmCoaching 重复调用返回业务错误
  - 重新分配后（§F1 重新分配裁决）：osg_coaching.confirmedAt=null + status='assigned'，osg_job_application.coachingStatus='none'
- `OsgClassRecordServiceImplTest`
  - approveRecord 后 mock_practice.completedHours 累加
  - approveRecord 后 coaching.totalHours 累加
  - rejectRecord 不影响累加
  - approveRecord 失败时事务回滚
- 三辅导者端新增接口的 access guard 测试

### 11.3 前端单元测试

- `useApplicationStatusDisplay` 五态映射全覆盖
- `useMockPracticeStatusDisplay` 五态映射全覆盖（含 completedHours 边界）
- 五端列表页 status 列渲染快照测试

### 11.4 跨端 Playwright 验证

至少跑两条 e2e 闭环，覆盖五端 status 展示一致性断言。

## 12. 实施顺序建议

1. **P0 - schema 升级 + 前端表单改造（F5 前置，必须先做）**
   - `osg_class_record` 新增 `practice_id` / `application_id` 两个 nullable 字段
   - 三辅导者端提交课时表单增加"为哪个申请提交"下拉
   - 后端 service 强制校验两字段必有且仅有一个非空
2. **P0 - bug 修复**
   - F5：`reviewRecord()` 补回写 completedHours / totalHours（依赖步骤 1）
   - F1：`assignMentors()` 不再设 coachingStatus
3. **P0 - 字段口径统一**
   - F2：`coachingStatus` 中文值数据迁移 + 代码全量改英文 + NULL 归一为 `'none'`
4. **P1 - 三端能力对齐**（详见 §6.3.3 工作量分类汇总）
   - **修 1 处**：mentor 真实岗位 `confirm` 现有实现的 2 个 bug（§6.3.1）
   - **改造 2 处**：mentor 模拟应聘 `confirm` + LM 模拟应聘 `ack-assignment` 迁到共用 service（§6.3.2）
   - **补 6 个接口**：mentor 1 个 + asst 4 个 + LM 1 个
   - **前端接入**：三端页面接入按钮 + 调用 API client
   - service 层方法复用，controller 层做 access guard
5. **P1 - 前端 SSOT 收口**
   - F6：shared composable + 五端引用 + 后端去除 statusLabel
6. **P2 - 派生展示逻辑**
   - F4：`useMockPracticeStatusDisplay` 实现 plannedHours 派生公式
   - 学生端 `toPracticeStatusValue` 内部公式按 §6.2 修正

## 13. 风险与回滚

### 13.1 主要风险

- **schema 升级风险**：`osg_class_record` 新增两字段是本轮唯一的 schema 变更，nullable 字段不破坏存量数据，但若三辅导者端提交课时表单未同步上线，会导致提交被 service 拒绝；需控制 schema + 后端校验 + 前端表单同时上线
- **数据迁移风险**：`coachingStatus="辅导中"` → `"coaching"`、`NULL` → `"none"` 需要一次性 SQL 迁移，迁移失败会破坏 LM/admin 求职总览展示
- **审核回写并发**：`completedHours +=` 是非幂等操作，并发审核同一 mock_practice 的多条 class_record 时需要用 SQL `UPDATE ... SET col = COALESCE(col, 0) + ?` 而不是先查后写
- **接口 access guard 误判**：mentor / asst / lead-mentor 三端 access service 当前各自独立，复用同一 service 方法时需要保证 guard 不跨权
- **前端 composable 与学生端 service 层派生公式不一致**：必须用同一组测试用例校验两边
- **前端"为哪个申请提交课时"下拉数据源**：依赖后端提供"该用户名下主动辅导中的申请列表"接口（可能需新增一个 GET 接口或在已有接口上扩展），需要查询 `osg_coaching.mentor_ids` 字段（CSV 串）以及 `osg_mock_practice.mentor_ids` 字段中包含当前 userId 的活跃记录

### 13.2 回滚策略

- schema 升级：`ALTER TABLE ... DROP COLUMN` 可回滚两个新增字段，但需同步 revert 后端实体 + service 校验代码与前端表单改造（建议作为一组 atomic commit）
- 数据迁移：保留迁移前的备份表，发现 LM 端展示异常时可一键回滚
- 接口能力：新增接口可独立 feature flag 控制，回滚时关闭 flag 即可，不影响存量
- 前端 composable：通过 prop 控制是否启用，回滚时降级为后端 statusLabel

## 14. 设计结论

本轮收口固定如下：

- 五端围绕 `osg_job_application + osg_mock_practice + osg_class_record` 三表共享同一套五态业务态
- 字段值统一英文 enum，去除中文存值
- 班主任 / admin 分配 → 已分配；辅导者 confirm → 辅导中；课时审核回写驱动派生
- 三辅导者端能力对称，service 复用 + controller 权限隔离
- 前端 status 展示通过 shared composable 收口，后端不固化 statusLabel
- 模拟应聘"已完成"采用派生展示，本轮不引入主动结案按钮
