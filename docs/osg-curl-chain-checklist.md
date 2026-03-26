# OSG 5 端 Curl 串联测试清单

更新日期：2026-03-24  
目的：把已确认的目标业务流转拆成可执行的 `curl` 检查清单，后续统一按本文件推进 5 端串联测试。  
口径说明：业务要求以 [osg-business-flow-target.md](/Users/hw/workspace/OSGPrj/docs/osg-business-flow-target.md) 为准；若当前实现与业务要求不一致，应记录为实现缺口，不用当前实现反向修改测试目标。

## 1. 执行原则

1. 先跑主链，再跑支链，不按页面顺序散点冒烟。
2. 每个写操作至少回查 3 个视角：
   发起端视角、下游消费端视角、后台全局视角。
3. 登录冒烟可以使用统一账号：
   `admin`、`student`、`mentor`、`lead_mentor`、`assistant`，密码统一 `Osg@2026`。
4. 正式业务串联不要依赖上面的统一账号承载主业务数据。
   主链测试应在 `FLOW-A` 中新建一组带唯一标识的学员和 staff 数据。
5. 每条链都同时记录两类结果：
   `目标业务是否成立`、`当前实现是否打通`。
6. 如果命中已知断点，不算“测试设计错误”，应归类为实现缺口。

## 2. 统一测试变量

建议所有 `curl` 执行统一使用以下变量命名：

```bash
BASE_URL=http://127.0.0.1:28080
CHAIN_ID=CHAIN_20260324_01

ADMIN_USERNAME=admin
ADMIN_PASSWORD='Osg@2026'

CHAIN_STUDENT_EMAIL=chain.student.20260324.01@example.com
CHAIN_MENTOR_EMAIL=chain.mentor.20260324.01@example.com
CHAIN_LEAD_EMAIL=chain.lead.20260324.01@example.com
CHAIN_ASSISTANT_EMAIL=chain.assistant.20260324.01@example.com
CHAIN_PASSWORD='Osg@2026'

CHAIN_STUDENT_NAME='Chain Student 01'
CHAIN_MENTOR_NAME='Chain Mentor 01'
CHAIN_LEAD_NAME='Chain Lead 01'
CHAIN_ASSISTANT_NAME='Chain Assistant 01'

CHAIN_POSITION_NAME='Chain Analyst 01'
CHAIN_COMPANY_NAME='Chain Capital 01'
```

## 3. 建议执行顺序

1. `FLOW-A` 账号与主数据准备链
2. `FLOW-F` 个人中心与排期链
3. `FLOW-B` 岗位发布与曝光链
4. `FLOW-C` 求职状态流转链
5. `FLOW-D` 模拟应聘链
6. `FLOW-E` 课程记录链
7. `AUDIT-BD-01` 基础数据配置源专项验证

这样做的原因是：

- `FLOW-A` 和 `FLOW-F` 是其他链的前置数据源。
- `FLOW-B` 是求职链和模拟应聘链的共同上游。
- `FLOW-E` 依赖 `FLOW-F` 的排期和前置教学安排。

## 4. 主链清单

### FLOW-A 账号与主数据准备链

业务目标：后台创建完整业务主体，5 端都能以真实角色进入业务页面。

前置条件：

- 后台统一账号 `admin / Osg@2026` 可登录。
- 共享依赖可用，后端服务已启动。

`curl` 检查点：

1. 后台登录：
   `POST /login`
2. 后台获取全局身份：
   `GET /getInfo`
3. 后台创建导师、班主任、助教：
   `POST /admin/staff`
4. 后台回查 staff 列表：
   `GET /admin/staff/list`
5. 后台创建学员：
   `POST /admin/student`
6. 后台回查学员列表和详情：
   `GET /admin/student/list`
   `GET /admin/student/{studentId}`
7. 后台回查合同：
   `GET /admin/student/{studentId}/contracts`
   `GET /admin/contract/list`
8. 如自动生成密码不可控，则统一执行重置：
   `POST /admin/student/reset-password`
   `POST /admin/staff/reset-password`
9. 班主任登录并获取身份：
   `POST /lead-mentor/login`
   `GET /lead-mentor/getInfo`
10. 助教登录并获取身份：
    `POST /assistant/login`
    `GET /assistant/getInfo`
11. 导师登录并获取身份：
    `POST /mentor/login`
    `GET /mentor/getInfo`
12. 学生登录：
    `POST /student/login`

必须断言：

- 新建学员已进入后台学员列表。
- 新建导师、班主任、助教已进入后台 staff 列表。
- 学员与 staff 的邮箱、姓名、角色都带有同一个 `CHAIN_ID` 标识。
- 合同记录可在后台学员详情或合同列表回查到。
- 5 端都能用这组链路账号成功登录。

已知风险：

- 统一冒烟账号不等于真实主业务账号，不能直接拿来验证主链流转。

### FLOW-F 个人中心与排期链

业务目标：个人资料和排期应能影响后续课程分配、模拟应聘分配和信息展示。

`curl` 检查点：

1. 学生读取资料：
   `GET /student/profile`
2. 学生修改资料：
   `PUT /student/profile`
3. 导师读取和保存资料：
   `GET /api/mentor/profile`
   `PUT /api/mentor/profile`
4. 班主任读取资料并提交变更申请：
   `GET /lead-mentor/profile`
   `POST /lead-mentor/profile/change-request`
5. 导师读取和保存排期：
   `GET /api/mentor/schedule`
   `PUT /api/mentor/schedule`
   `GET /api/mentor/schedule/last-week`
6. 助教读取和保存排期：
   助教前端当前复用导师排期面
   `GET /api/mentor/schedule`
   `PUT /api/mentor/schedule`
7. 班主任读取和保存排期：
   `GET /lead-mentor/schedule`
   `GET /lead-mentor/schedule/status`
   `PUT /lead-mentor/schedule/next`
8. 后台回查排期：
   `GET /admin/schedule/list`
9. 后台编辑排期或催填：
   `PUT /admin/schedule/edit`
   `POST /admin/schedule/remind-all`

必须断言：

- 导师、班主任、助教的排期修改后能在后台排期管理中回查到。
- 学生资料修改后的即时字段能回查到；需要审核的字段应形成待审核记录。
- 后续 `FLOW-D` 和 `FLOW-E` 的分配动作要优先使用这一步写入的排期数据。

已知风险：

- 助教端当前并不是独立排期数据面，实际复用的是导师排期接口。

### FLOW-B 岗位发布与曝光链

业务目标：后台岗位库和学生自添岗位审批应共同形成学生、班主任、助教可见的岗位池。

`curl` 检查点：

1. 后台新增岗位：
   `POST /admin/position`
2. 后台回查岗位：
   `GET /admin/position/list`
   `GET /admin/position/meta`
   `GET /admin/position/stats`
3. 学生回查岗位池：
   `GET /student/position/meta`
   `GET /student/position/list`
4. 班主任回查岗位池：
   `GET /lead-mentor/positions/meta`
   `GET /lead-mentor/positions/list`
5. 助教回查岗位池：
   助教前端当前复用后台岗位 drill-down 面
   `GET /admin/position/stats`
   `GET /admin/position/drill-down`
6. 学生手动新增岗位：
   `POST /student/position/manual`
7. 后台回查待审核学生自添岗位：
   `GET /admin/student-position/list`
8. 后台审核通过学生自添岗位：
   `PUT /admin/student-position/{studentPositionId}/approve`
9. 后台驳回场景补测：
   `PUT /admin/student-position/{studentPositionId}/reject`
10. 审核通过后重新回查学生、班主任、助教视角。

必须断言：

- 后台新增岗位能被学生和班主任看到。
- 学生自添岗位在后台待审核列表可见。
- 学生自添岗位审核通过后进入公共岗位池。
- 班主任和助教可读取到审核通过后的岗位。

已知风险：

- 助教端当前复用了后台岗位数据面，实际权限边界需要额外关注。
- 基础数据管理当前不是实际字典源，岗位 `meta` 相关字段需要专项核对。

### FLOW-C 求职状态流转链

业务目标：学生、班主任、助教、后台应共享同一份学员求职主状态；导师只查看已分配对象。

`curl` 检查点：

1. 学生标记岗位申请：
   `POST /student/position/apply`
2. 学生更新进度：
   `POST /student/position/progress`
3. 学生发起辅导申请：
   `POST /student/position/coaching`
4. 学生读取“我的求职”：
   `GET /student/application/list`
5. 班主任读取求职总览：
   `GET /lead-mentor/job-overview/list`
6. 班主任为记录分配导师：
   `POST /lead-mentor/job-overview/{applicationId}/assign-mentor`
7. 班主任确认阶段更新：
   `POST /lead-mentor/job-overview/{applicationId}/ack-stage-update`
8. 后台读取求职总览：
   `GET /admin/job-overview/list`
   `GET /admin/job-overview/stats`
9. 后台修改主状态：
   `PUT /admin/job-overview/stage-update`
10. 导师读取已分配求职总览：
    `GET /api/mentor/job-overview/list`
    `GET /api/mentor/job-overview/calendar`
11. 助教读取求职总览：
    助教前端当前复用导师求职总览面
    `GET /api/mentor/job-overview/list`

目标业务断言：

- 学生发起和更新的求职状态，应进入班主任、助教、后台、导师可读的同一条主线。
- 班主任和后台修改状态后，学生端应能看到更新后的统一状态。

当前实现断点：

- `GAP-C-01` 学生端岗位投递和进度当前只写学生独立表，不进入后台 `osg_job_application` 主链。
- `GAP-C-02` 导师与助教当前读取的是 `/api/mentor/job-overview/*`，而导师端底层仍存在旧表读取风险。

执行要求：

- 本链要同时记录“学生侧独立链是否成立”和“主业务共享链是否成立”。
- 若第 1 到 4 步成功，但第 5 到 11 步看不到同一条记录，应归类为实现缺口，不算测试失败设计。

### FLOW-D 模拟应聘链

业务目标：学生发起模拟应聘，班主任或助教分配导师，导师确认并反馈，学生和管理侧回收结果。

`curl` 检查点：

1. 学生读取模拟应聘元数据和总览：
   `GET /student/mock-practice/meta`
   `GET /student/mock-practice/overview`
2. 学生发起模拟应聘申请：
   `POST /student/mock-practice/practice-request`
3. 学生发起课程申请类请求：
   `POST /student/mock-practice/class-request`
4. 班主任读取模拟应聘管理：
   `GET /lead-mentor/mock-practice/stats`
   `GET /lead-mentor/mock-practice/list`
5. 班主任查看详情：
   `GET /lead-mentor/mock-practice/{practiceId}`
6. 班主任分配导师：
   `POST /lead-mentor/mock-practice/{practiceId}/assign`
7. 班主任确认分配结果：
   `POST /lead-mentor/mock-practice/{practiceId}/ack-assignment`
8. 后台读取和补充分配：
   `GET /admin/mock-practice/stats`
   `GET /admin/mock-practice/list`
   `POST /admin/mock-practice/assign`
9. 导师读取任务并确认：
   `GET /api/mentor/mock-practice/list`
   `PUT /api/mentor/mock-practice/{id}/confirm`
10. 助教读取模拟应聘列表：
    助教前端当前复用导师模拟应聘面
    `GET /api/mentor/mock-practice/list`
11. 学生重新读取总览，验证状态和反馈。

目标业务断言：

- 学生申请应进入班主任、助教、后台的待处理列表。
- 分配导师后，导师端应能读到并确认。
- 导师确认后，学生端应能看到状态变化和反馈结果。

当前实现断点：

- `GAP-D-01` 学生端申请当前写的是 `osg_student_mock_request`，后台和班主任读的是 `osg_mock_practice`。
- `GAP-D-02` 班主任分配时使用 `staff_id`，导师读取时按 `sys_user_id` 匹配，存在“已分配但导师读不到”的风险。

执行要求：

- 本链需要分开记录“学生发起链是否成功”和“管理分配链是否成功”。
- 如果学生端申请后，班主任和后台完全看不到记录，应直接记为 `GAP-D-01`。

### FLOW-E 课程记录链

业务目标：导师、班主任、助教可提交课程记录，后台审核，学生看到结果并评价，合同课时同步反映。

前置条件：

- 本链默认建立在 `FLOW-F` 排期已存在、且课程已被安排的前提上。

`curl` 检查点：

1. 导师读取可上报对象：
   `GET /api/mentor/students/list`
2. 导师提交课程记录：
   `POST /api/mentor/class-records`
3. 导师回查课程记录：
   `GET /api/mentor/class-records/list`
   `GET /api/mentor/class-records/{id}`
4. 班主任提交课程记录：
   `POST /lead-mentor/class-records`
5. 后台读取课程记录列表和统计：
   `GET /admin/class-record/list`
   `GET /admin/class-record/stats`
6. 后台读取审核视角：
   `GET /admin/report/list`
   `GET /admin/report/{recordId}`
7. 后台审核通过：
   `PUT /admin/report/{recordId}/approve`
8. 后台驳回场景补测：
   `PUT /admin/report/{recordId}/reject`
9. 学生读取课程记录：
   `GET /student/class-records/meta`
   `GET /student/class-records/list`
10. 学生评价课程：
    `POST /student/class-records/rate`
11. 后台重新读取合同或学员详情：
    `GET /admin/student/{studentId}/contracts`
    `GET /admin/contract/list`

目标业务断言：

- 导师、班主任、助教提交的记录都应进入后台审核。
- 审核通过后，学生端应看到对应课程记录并可评价。
- 合同剩余课时或课时统计应体现已审核记录的消耗结果。

当前实现断点：

- `GAP-E-01` 学生端课程记录当前读的是独立表 `osg_student_course_record`，不消费后台 `osg_class_record`。

执行要求：

- 后台审核链是当前必须实跑的强校验链。
- 学生回看链若读不到已审核记录，应归类为 `GAP-E-01`。

## 5. 基础数据专项

### AUDIT-BD-01 基础数据配置源验证

业务目标：后台基础数据管理应成为岗位、学校、方向、地区、招聘周期、课程类型等配置项的统一来源。

`curl` 检查点：

1. 后台读取基础数据列表：
   `GET /system/basedata/list`
2. 后台新增或修改一项基础数据：
   `POST /system/basedata`
   `PUT /system/basedata`
   `PUT /system/basedata/changeStatus`
3. 重新读取下游 `meta`：
   `GET /admin/position/meta`
   `GET /student/position/meta`
   `GET /student/mock-practice/meta`
   `GET /student/class-records/meta`

目标业务断言：

- 基础数据修改后，下游 `meta` 和筛选项应同步变化。

当前实现断点：

- `GAP-BD-01` 后台基础数据管理当前是内存 `seedRows()`，不是各端真实字典数据源。

## 6. 已知缺口编号

- `GAP-C-01` 学生求职中心未接入后台求职总览主链
- `GAP-C-02` 导师求职总览存在旧表读取风险
- `GAP-D-01` 学生模拟应聘申请未接入后台模拟应聘主链
- `GAP-D-02` 模拟应聘导师分配使用 staff id 与导师读取使用 sys user id 不一致
- `GAP-E-01` 学生课程记录未消费后台课程记录主链
- `GAP-BD-01` 基础数据管理未作为统一配置源生效

## 7. 执行产出要求

每次正式 `curl` 串联执行后，至少要产出下面 4 类结果：

1. 每条链的实际请求清单和响应摘要
2. 每条链的业务结论：
   `符合目标业务 / 不符合目标业务 / 被实现缺口阻塞`
3. 发现的新缺口编号或对既有缺口的补充证据
4. 下一轮需要继续追的阻塞点
