# 五端课程申请与课程记录统一流转实施计划

> Goal: 按 `docs/plans/2026-03-27-five-end-course-application-flow-alignment-design.md` 的统一定义，完成五端在“课程申请记录”和“课程记录”上的页面语义、权限边界、实现链路与测试口径收口。
>
> Design Doc: `docs/plans/2026-03-27-five-end-course-application-flow-alignment-design.md`
>
> Scope: 学生端、导师端、助教端、班主任端、后台端的申请追踪与课程记录职责对齐；不在本计划中一次性重做整套课程建模。
>
> DoD: 五端都能按同一口径解释“申请记录”和“课程记录”；助教端不再被实现为正式分配导师角色；学生端三页职责清晰；导师记录、后台审核、学生回看与评价链路可验证。

## 0. 与设计稿关系

1. 本计划是 `docs/plans/2026-03-27-five-end-course-application-flow-alignment-design.md` 的唯一实施计划。
2. 本计划先做“定义收口 -> 真源修正 -> 实现对齐 -> 测试闭环”，不允许跳过定义直接各端各自修页面。
3. 若某个原型或实现与本计划冲突，必须先回到设计稿确认，再统一修改，不允许端内自行解释。

## Existing Implementation Inventory

### Student Entrypoints

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java`
  - `GET /student/position/list`
  - `GET /student/position/meta`
  - `POST /student/position/apply`
  - `POST /student/position/progress`
  - `POST /student/position/coaching`
  - `POST /student/position/manual`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgApplicationController.java`
  - `GET /student/application/list`
  - `GET /student/application/meta`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentMockPracticeController.java`
  - `GET /student/mock-practice/overview`
  - `GET /student/mock-practice/meta`
  - `POST /student/mock-practice/practice-request`
  - `POST /student/mock-practice/class-request`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStudentClassRecordController.java`
  - `GET /student/class-records/meta`
  - `GET /student/class-records/list`
  - `POST /student/class-records/rate`

### Lead Mentor / Admin Entrypoints

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorJobOverviewController.java`
  - `GET /lead-mentor/job-overview/list`
  - `POST /lead-mentor/job-overview/{applicationId}/assign-mentor`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorMockPracticeController.java`
  - `GET /lead-mentor/mock-practice/list`
  - `POST /lead-mentor/mock-practice/{practiceId}/assign`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgJobOverviewController.java`
  - `GET /admin/job-overview/list`
  - `GET /admin/job-overview/unassigned`
  - `POST /admin/job-overview/assign-mentor`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgMockPracticeController.java`
  - `GET /admin/mock-practice/list`
  - `POST /admin/mock-practice/assign`

### Mentor / Assistant Carrier Entrypoints

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgJobOverviewController.java`
  - `GET /api/mentor/job-overview/list`
  - `GET /api/mentor/job-overview/calendar`
  - `PUT /api/mentor/job-overview/{id}/confirm`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgMockPracticeController.java`
  - `GET /api/mentor/mock-practice/list`
  - `PUT /api/mentor/mock-practice/{id}/confirm`

### Class Record Entrypoints

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgClassRecordController.java`
  - `GET /admin/class-record/list`
  - `GET /admin/class-record/stats`
  - `POST /api/mentor/class-records`
  - `POST /assistant/class-records`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorClassRecordController.java`
  - `POST /lead-mentor/class-records`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgAllClassesController.java`
  - `GET /admin/all-classes/list`
  - `GET /admin/all-classes/{recordId}/detail`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgReportController.java`
  - `GET /admin/report/list`
  - `GET /admin/report/{recordId}`
  - `PUT /admin/report/{recordId}/approve`
  - `PUT /admin/report/{recordId}/reject`
  - `PUT /admin/report/batch-approve`
  - `PUT /admin/report/batch-reject`

## Primary Truth Source

- 五端页面真源：
  - `osg-spec-docs/source/prototype/index.html`
  - `osg-spec-docs/source/prototype/mentor.html`
  - `osg-spec-docs/source/prototype/assistant.html`
  - `osg-spec-docs/source/prototype/lead-mentor.html`
  - `osg-spec-docs/source/prototype/admin.html`
- 统一定义稿：
  - `docs/plans/2026-03-27-five-end-course-application-flow-alignment-design.md`

## Derived Artifact Inventory

后续必须与本计划一起收口的派生产物：

- 五端前端页面与文案
- 五端共享类型与 API contract
- 后端服务与 mapper 语义
- Playwright / contract / curl / unit test
- 面向各端的流程说明与验收清单

## Current-State Inventory

### Student Page Baseline

- `岗位信息`
  - 当前是学生发起真实岗位相关动作的实际入口页
  - `投递 / 进度 / 申请辅导` 分别通过 `/student/position/apply`、`/student/position/progress`、`/student/position/coaching` 发起
  - 因此虽然统一定义稿重点收口的是 `我的求职 / 模拟应聘 / 课程记录` 三页职责，但实施时不能绕开 `岗位信息` 这一真实发起端
- `我的求职`
  - 当前已经是“申请追踪 + 摘要”形态
  - 现有共享对象 `StudentApplicationRecord` 已包含 `coachingStatus / mentor / hoursFeedback / feedback`
  - 页面当前偏差相对较小，主要是继续对齐正式主链与状态文案
- `模拟应聘`
  - 当前是学生端最主要偏差点
  - `/student/mock-practice/overview` 已返回两层对象：
    - `practiceRecords`
    - `requestRecords`
  - 但页面当前只消费 `practiceRecords`
  - 页面主表仍由 `导师 / 已上课时 / 课程反馈` 驱动，尚未把“申请记录”真正收成主列表
  - `/student/mock-practice/class-request` 入口仍保留，但页面未按统一定义消费这层记录
- `课程记录`
  - 当前已经直接读取 `osg_class_record` 审核通过记录
  - 学生评价也已经回写同一条课程记录
  - 当前偏差相对较小，主要是继续保持“唯一课程详情页”职责，不让申请页反向承接详情

### Service / Data Baseline

- `StudentMockPracticeServiceImpl`
  - `selectOverview` 同时返回 `practiceRecords` 与 `requestRecords`
  - `createPracticeRequest` 当前写主表 `osg_mock_practice`
  - `createClassRequest` 当前仍写旧请求表链
- `StudentCourseRecordServiceImpl`
  - 学生端只读取 `status = 'approved'` 的课程记录
  - 学生评价直接回写 `osg_class_record`
- `OsgClassRecordServiceImpl`
  - 后台审核当前通过 `approveRecord / rejectRecord / batchApprove / batchReject` 落地
- `OsgLeadMentorClassRecordController` / `OsgClassRecordController`
  - 当前系统已存在班主任补录与助教补录课时入口
- `OsgLeadMentorJobOverviewController` / `OsgLeadMentorMockPracticeController`
  - 当前已经是班主任分配入口
- `OsgJobOverviewController` / `OsgMockPracticeController`
  - 当前已经是后台分配入口
- `assistantCareer.ts`
  - 当前助教端 career 相关读取并未走独立 `/assistant/` 前缀
  - 而是复用 `/api/mentor/job-overview/list` 与 `/api/mentor/mock-practice/list` 这两个 carrier route
  - 后端当前不是“无过滤放行”，而是通过 assistant ownership 参与范围过滤

### Controller Name Clarification

- `StudentPositionController.java`
  - 学生端岗位信息与真实岗位辅导申请发起入口
- `OsgStudentPositionController.java`
  - 后台学生自添岗位审核入口
- 两者不是同一 controller，不允许在实施中混用职责

### Blocking Reality

实施时必须面对以下现实，而不能只看目标定义：

1. `模拟应聘` 当前不是单对象页面，而是双对象并存
2. `class-request` 仍是现存入口，不允许在实施时假装不存在
3. 课程记录链当前已经以“审核通过后学生可见”为真实行为
4. 助教当前存在部分原型与接口能力残留，需要显式判断哪些是历史兼容、哪些是本轮要退出的职责
5. 助教端 career 数据读取当前复用了 `/api/mentor/*` carrier route，若不显式收口，很容易被误读为“助教 = 导师接口”

## Sync Gate Policy

在以下事项未完成前，不允许宣称五端已经对齐：

1. 助教端仍保留“正式分配导师”实现或测试预期
2. 学生端 `我的求职` / `模拟应聘` / `课程记录` 页面职责仍互相混用
3. 导师端提交的课程记录未明确要求后台审核后才进入学生端
4. 任何端仍把“课程申请记录”和“课程记录”作为同一个对象处理
5. `模拟应聘` 仍只消费 `practiceRecords` 而不明确 `requestRecords` 的正式职责
6. `class-request` 的去留、迁移或降级策略未写清楚

## Decision Locks

以下规则不是“待讨论项”，而是本计划的执行锁。任何实施、测试或原型修正都必须按此执行。

### 1. `模拟应聘` 的唯一可见主对象

- 学生端 `模拟应聘` 页面在本轮统一收口中，唯一可见主对象是 `practiceRecords`
- 对应正式主链是 `osg_mock_practice`
- 对应学生发起入口是 `POST /student/mock-practice/practice-request`
- `practice-request` 已覆盖：
  - `mock`
  - `networking`
  - `midterm`
  也就是本轮定义中的 `模拟面试 / 人际关系测试 / 期中考试`

### 2. `requestRecords` / `class-request` 的正式定位

- `requestRecords` 与 `POST /student/mock-practice/class-request` 属于历史兼容课程申请链
- 它们对应的是旧 `Staffing / Hirevue / OT` 语义，不属于本轮五端统一后的学生端可见主流程
- 本轮实施要求：
  - 学生端当前可见范围不得以 `requestRecords` 作为主表
  - 学生端当前可见范围不得恢复 `requestSection / requestTabs / requestCourseOptions` 可见壳子
  - 不允许新增任何以 `class-request` 为主入口的新需求实现
- 若后续需要迁移或清退该链，必须另开专项计划；本计划内只允许将其视为历史兼容对象，不允许再与当前五端统一流转并列

### 3. 课程记录提交流转的正式口径

- 正式主链仍定义为：`学生申请 -> 班主任/后台分配导师 -> 导师授课 -> 提交课程记录 -> 后台审核 -> 学生回看评价`
- 但根据 `docs/osg-product-confirmation-checklist.md` 与现有 HTML 真源，`班主任` 与 `助教` 的课程记录提交入口在本轮保留
- 执行口径固定为：
  - `POST /api/mentor/class-records`：主提交入口
  - `POST /lead-mentor/class-records`：班主任补录/兼容入口
  - `POST /assistant/class-records`：助教补录/兼容入口
- 班主任/助教的“可提交课程记录”能力，不得被解释为：
  - 他们拥有正式分配导师权
  - 学生端需要为其单独建立第二套课程记录语义
  - 审核前即可进入学生端
- 本轮补录记录执行锁：
  - `班主任 / 助教` 补录按“独立补录人提交”入链
  - 不在本轮中伪装为“代原导师署名补录”
  - 仍统一进入后台审核，再进入学生端可见范围

### 4. 助教端 carrier route 的正式口径

- 本轮不新增独立 `/assistant/career/*` 路径
- 助教端允许继续复用：
  - `/api/mentor/job-overview/list`
  - `/api/mentor/mock-practice/list`
  作为历史 carrier route
- 但执行上必须满足：
  - 后端服务层明确按 assistant ownership 过滤
  - contract / e2e 必须证明助教只看到自己名下学员
  - 文案、命名、测试中不得再把这两条 carrier route 解释为“助教拥有导师端同等数据权限”

### 5. 当前阶段的 schema 决策

- 本轮默认不做数据库 schema 变更
- `课程申请记录` 的 5 态业务定义，在当前实现中压缩为 4 态可执行模型：
  - `已提交 + 待分配导师` 合并展示为 `待分配导师`
  - `已分配导师`
  - `辅导中`
  - `已完成 / 已取消`
- `osg_job_application`
  - 本轮不新增字段区分 `已提交` 与 `待分配导师`
- `osg_mock_practice`
  - 本轮通过服务层和前端映射统一 `pending / scheduled / confirmed / completed / cancelled`
  - 不在本轮新增状态字段
- `osg_class_record`
  - 本轮继续使用现有 `status / classStatus / rate`
  - 不新增学生可见状态字段
- 若后续必须把 `已提交` 与 `待分配导师` 在存储层分开，需另开 schema 专项计划，不在本轮实施计划中隐式扩展

## Execution Order

design-doc-confirmed -> current-state-inventory -> entrypoint-map -> state-mapping -> prototype-delta-list -> role-boundary-fix -> student-c1-applications -> student-c2-mock-practice -> student-c3-class-records -> mentor-record-chain-check -> backend-review-chain-check -> assistant-role-cleanup -> focused-tests -> five-end-alignment-review

## Cross-End Entrypoint Map

### Real Job Coaching Request

1. Student initiates:
   - `GET /student/position/list`
   - `GET /student/position/meta`
   - `POST /student/position/apply`
   - `POST /student/position/progress`
   - `POST /student/position/coaching`
   - `GET /student/application/list`
   - `GET /student/application/meta`
2. Lead mentor consumes and assigns:
   - `GET /lead-mentor/job-overview/list`
   - `POST /lead-mentor/job-overview/{applicationId}/assign-mentor`
3. Admin consumes and assigns:
   - `GET /admin/job-overview/unassigned`
   - `POST /admin/job-overview/assign-mentor`
4. Mentor consumes assigned result:
   - `GET /api/mentor/job-overview/list`
5. Mentor submits class record:
   - `POST /api/mentor/class-records`
6. Admin reviews class record:
   - `PUT /admin/report/{recordId}/approve`
   - `PUT /admin/report/{recordId}/reject`
7. Student reads approved records:
   - `GET /student/class-records/list`
   - `POST /student/class-records/rate`

### Mock Coaching Request

1. Student initiates current visible mainline:
   - `POST /student/mock-practice/practice-request`
   - `GET /student/mock-practice/overview`
   - historical compatibility only, excluded from current visible mainline:
     - `POST /student/mock-practice/class-request`
2. Lead mentor consumes and assigns:
   - `GET /lead-mentor/mock-practice/list`
   - `POST /lead-mentor/mock-practice/{practiceId}/assign`
3. Admin consumes and assigns:
   - `GET /admin/mock-practice/list`
   - `POST /admin/mock-practice/assign`
4. Mentor consumes assigned result:
   - `GET /api/mentor/mock-practice/list`
5. Mentor submits class record:
   - `POST /api/mentor/class-records`
6. Admin reviews class record:
   - `PUT /admin/report/{recordId}/approve`
   - `PUT /admin/report/{recordId}/reject`
7. Student reads approved records:
   - `GET /student/class-records/list`
   - `POST /student/class-records/rate`

## Unified State Mapping

本节用于把设计稿中的目标状态，映射到当前代码真实字段，避免实现阶段再次各自翻译。

### Application Record States

- 目标：`已提交`
  - 当前一期实现不单独展示
  - 在可执行模型中并入 `待分配导师`
- 目标：`待分配导师`
  - 真实岗位现字段：`assignStatus = pending`
  - 模拟类现字段：`status = pending`
  - 当前一期统一展示文案：`待分配导师`
- 目标：`已分配导师`
  - 真实岗位现字段：`assignStatus = assigned`
  - 模拟类现字段：`status in {scheduled, confirmed}`
  - 学生端统一展示文案：`已分配导师`
- 目标：`辅导中`
  - 真实岗位现字段：`coachingStatus = coaching`
  - 模拟类现字段：`status in {scheduled, confirmed}` 且 `completedHours > 0`
  - 学生端统一展示文案：`辅导中`
- 目标：`已完成`
  - 真实岗位现字段：`bucket = completed`，对应 `currentStage in {offer, rejected}`
  - 模拟类现字段：`status = completed`
  - 学生端若存在 `cancelled`，统一展示为 `已取消`，不得并入 `已完成`

### Class Record States

- 目标：`导师已提交`
  - 真实字段：`osg_class_record.status = pending`
- 目标：`后台审核通过`
  - 真实字段：`osg_class_record.status = approved`
- 目标：`学生可见`
  - 真实读取规则：`selectStudentApprovedClassRecordList`
- 目标：`学生已评价`
  - 真实字段：`rate != null/empty`
  - 前端派生字段：`tab = evaluated`, `actionKind = detail`

### Implementation Rule

实施中不允许跳过这张映射表直接新增一套前端本地状态名。若发现字段不够表达目标状态，先补映射策略，再改代码。

## Workstream A: 列出五端真源差异与阻断项

**Goal**

把当前五端原型与统一定义稿之间的冲突逐条列出来，形成唯一待修清单。

**Files**

- Read: `osg-spec-docs/source/prototype/index.html`
- Read: `osg-spec-docs/source/prototype/mentor.html`
- Read: `osg-spec-docs/source/prototype/assistant.html`
- Read: `osg-spec-docs/source/prototype/lead-mentor.html`
- Read: `osg-spec-docs/source/prototype/admin.html`
- Write: `docs/plans/2026-03-27-five-end-course-application-flow-alignment-design.md`（如需补充）

**Tasks**

- 列出学生端三页职责与定义稿是否一致
- 列出助教端“分配导师”相关元素
- 列出班主任端、后台端的正式分配入口
- 列出导师端“上报课程记录 -> 后台审核 -> 学生回看”的页面证据

**Exit Criteria**

- 形成一份明确的差异清单
- 每条差异都能归类为“真源冲突”或“实现偏差”

## Workstream B: 修正五端角色与权限边界

**Goal**

把“谁能分配导师”收成唯一口径。

**Targets**

- 助教端：仅保留可见、跟进、管理语义
- 班主任端：保留正式分配导师语义
- 后台端：保留正式分配导师与课程审核语义
- 导师端：保留上课与提交课程记录语义

**Tasks**

- 清理助教端中会误导为正式分配权限的文案、按钮、测试预期
- 对班主任端与后台端保留分配导师操作语义
- 对导师端保留记录提交与审核反馈语义

**Exit Criteria**

- 五端没有第二套“正式分配导师角色”解释

## Workstream C1: 修正学生端 `我的求职`

**Goal**

让 `我的求职` 保持“真实岗位申请追踪 + 摘要”，并与正式主链状态保持一致。

**Current State**

- 当前页面结构已接近目标
- 当前共享对象已具备 `coachingStatus / mentor / hoursFeedback / feedback`
- 重点不在大改 UI，而在确认这些摘要字段都来自正确主链

**Targets**

- `osg-frontend/packages/student/src/views/positions/index.vue`
- `osg-frontend/packages/shared/src/api/positions.ts`
- `osg-frontend/packages/student/src/views/applications/index.vue`
- `osg-frontend/packages/shared/src/api/applications.ts`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgApplicationController.java`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStudentPositionController.java`（仅用于区分后台审核入口，不参与学生发起链实现）
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`

**Tasks**

- 确认 `岗位信息` 仍是学生发起真实岗位辅导申请的唯一入口
- 确认 `岗位信息 -> 我的求职` 的状态流转是一条链，而不是两套本地状态
- 明确页面允许展示的摘要字段边界
- 确认 `导师 / 课时/反馈` 摘要不承担课程详情页职责
- 确认真实岗位申请状态与班主任/后台分配链口径一致
- 补页面契约测试，防止后续把课程详情重新塞回此页

**Exit Criteria**

- `岗位信息` 与 `我的求职` 对真实岗位申请的发起/追踪职责边界清晰
- `我的求职` 与定义稿一致
- 页面仍可展示摘要，但不承担课程记录详情职责

## Workstream C2: 修正学生端 `模拟应聘`

**Goal**

把 `模拟应聘` 从当前“混合结果表”收成“模拟类申请追踪 + 摘要”页面，并明确 `practiceRecords / requestRecords / class-request` 的角色。

**Current State**

- 当前页面只消费 `practiceRecords`
- `requestRecords` 虽然已由后端返回，但页面未使用
- `class-request` 入口仍存在于后端 contract
- 当前是学生端最主要偏差点

**Targets**

- `osg-frontend/packages/student/src/views/mock-practice/index.vue`
- `osg-frontend/packages/shared/src/api/mock-practice.ts`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentMockPracticeController.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentMockPracticeServiceImpl.java`

**Tasks**

- 锁定 `practiceRecords` 为页面唯一可见主对象
- 明确 `practice-request` 是当前可见范围内唯一学生发起入口
- 将 `requestRecords / requestSection / requestTabs / requestCourseOptions / class-request` 统一视为历史兼容链，不在当前可见范围恢复
- 页面主表改为以“申请记录”语义为中心
- `导师 / 已上课时 / 课程反馈` 只作为摘要字段保留，不再充当主对象定义
- 仅对 `practice-request` 补当前主链 contract 与页面断言
- 对 `class-request` 补“保持隐藏/不参与当前主流程”的防回归断言
- 统一学生端 mock 状态文案：
  - `pending` -> `待分配导师`
  - `scheduled/confirmed` -> `已分配导师`
  - `scheduled/confirmed + completedHours > 0` -> `辅导中`
  - `completed` -> `已完成`
  - `cancelled` -> `已取消`

**Exit Criteria**

- `模拟应聘` 页面不再依赖混合对象讲完整故事
- `practiceRecords / requestRecords / class-request` 去留已经被代码与测试锁定
- 页面职责与定义稿一致

## Workstream C3: 修正学生端 `课程记录`

**Goal**

把 `课程记录` 固定为唯一的课消详情与学生评价页，并确保其读取规则与审核链严格一致。

**Current State**

- 当前已读取审核通过课程记录
- 当前已支持学生评价
- 当前偏差主要在于继续防止被其他申请页挪用职责

**Targets**

- `osg-frontend/packages/student/src/views/courses/index.vue`
- `osg-frontend/packages/shared/src/api/class-records.ts`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStudentClassRecordController.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentCourseRecordServiceImpl.java`
- `ruoyi-system/src/main/resources/mapper/system/OsgClassRecordMapper.xml`

**Tasks**

- 保持学生读取仅限 `approved` 课程记录
- 保持学生评价回写同一条主记录
- 明确 `pending / evaluated` 前端 tab 与 `approved + rated` 真实字段的映射
- 补页面契约测试，防止申请页挪用课程详情职责

**Exit Criteria**

- `课程记录` 保持唯一详情页职责
- 学生评价与审核后的主记录一一对应

## Workstream D: 校正导师提交与后台审核链

**Goal**

把课程记录链明确为：

导师提交 -> 后台审核 -> 学生回看 -> 学生评价

**Targets**

- 导师端页面与服务实现
- 后台审核入口与学生课程记录读取链
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgJobOverviewController.java`（mentor-facing job overview carrier route）
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgMockPracticeController.java`（mentor-facing mock-practice carrier route）
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgClassRecordController.java`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorClassRecordController.java`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgReportController.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgClassRecordServiceImpl.java`
- `ruoyi-system/src/main/resources/mapper/system/OsgClassRecordMapper.xml`

**Tasks**

- 确认导师端每次上课提交一条课程记录
- 确认导师读取已分配任务的 carrier route 实际定义在 `OsgJobOverviewController` / `OsgMockPracticeController`，不误以为存在独立 mentor controller
- 确认后台审核是学生可见的前置条件
- 确认学生评价作用在同一条已审核课程记录上
- 保留 `POST /lead-mentor/class-records` 与 `POST /assistant/class-records` 作为补录/兼容入口
- 明确补录入口不改变“班主任/后台分配导师、后台审核后学生可见”的主链定义
- 明确补录记录按当前提交人身份入链，不伪装为原导师记录
- 确认 admin review 使用真实 `approved/rejected` 状态，不允许出现学生端提前可见
- 明确助教补录课时不会被扩展为导师分配权限或第二套学生端记录语义

**Exit Criteria**

- 不再出现“未审核课程记录已进入学生端”的路径
- 课程记录提交角色边界已被实现和测试统一

## Workstream E: 助教端实现与测试去误导

**Goal**

让助教端与统一定义稿一致，不再扮演班主任级别分配角色。

**Targets**

- 助教端原型差异清单
- 助教端页面实现
- `osg-frontend/packages/shared/src/api/assistantCareer.ts`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgJobOverviewController.java`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgMockPracticeController.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorJobOverviewServiceImpl.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgMockPracticeServiceImpl.java`
- 助教端相关 contract / e2e / fixture

**Tasks**

- 审计助教端所有复用 `/api/mentor/*` 的 career 读取路径
- 明确这些路径在本轮中属于 carrier route，而不是助教拥有导师端同等权限的证据
- 为 carrier route 补服务层与 e2e 断言，证明助教只看到 assistant ownership 范围内的学员
- 去掉或重命名会被误读为正式分配权限的助教操作
- 确保助教端保留“查看、跟进、管理、协同”语义
- 修正测试数据与断言，避免默认助教可以分配导师

**Exit Criteria**

- 助教端不再作为正式导师分配角色出现在实现和测试中
- 助教端通过 `/api/mentor/*` carrier route 读取的数据范围已被测试锁定为 assistant ownership

## Workstream F: 验证与验收

**Goal**

用最少但关键的验证路径，证明五端已按同一需求流转工作。

**Focused Checks**

1. 学生发起真实岗位辅导申请
   - 班主任/后台可见并可分配导师
   - 助教可见但不可作为正式分配角色
   - 导师收到分配结果
   - 导师提交课程记录
   - 后台审核
   - 学生在课程记录页回看并评价

2. 学生发起模拟类辅导申请
   - 班主任/后台可见并可分配导师
   - 助教可见但不可作为正式分配角色
   - 导师收到分配结果
   - 多次上课形成多条课程记录
   - 后台审核
   - 学生在课程记录页统一回看并评价

3. 页面职责核验
   - `我的求职` 不承担课程记录详情页职责
   - `模拟应聘` 不承担课程记录详情页职责
   - `课程记录` 统一承接课程记录详情与评价

4. 当前双对象问题核验
   - `模拟应聘` 页面明确消费哪一类主对象
   - `requestRecords` 的历史兼容职责已被验证，且未重新进入当前可见主流程
   - `class-request` 的隐藏/兼容定位已在代码与测试中体现一致

**Suggested Verification Layers**

- 前端页面契约测试
- 后端服务测试
- Playwright / curl 跨端真实流转验证

## Final Exit Criteria

当以下条件同时成立，本计划才算完成：

1. 五端对“课程申请记录”和“课程记录”的定义一致
2. 助教端不再被实现为正式分配导师角色
3. 班主任与后台被实现为正式分配角色
4. 导师端只承担上课与记录提交职责
5. 学生端三页职责清晰且无语义重叠
6. 导师提交、后台审核、学生回看与评价闭环通过验证
