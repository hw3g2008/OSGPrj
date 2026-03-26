# OSG Current-State Data Flow and Test Closure Map

Date: 2026-03-24

## 1. Executive Summary

当前仓库不是一条完整的“五端单链路系统”，而是三层并存的数据面：

1. 账号与权限面：`sys_user`、`sys_user_role`、密码重置 Redis key。
2. 后台主业务面：`osg_student`、`osg_staff`、`osg_contract`、`osg_staff_schedule`、`osg_position`、`osg_job_application`、`osg_coaching`、`osg_mock_practice`、`osg_class_record`。
3. 学生端独立面：`osg_student_profile`、`osg_student_profile_change`、`osg_student_job_position`、`osg_student_job_position_state`、`osg_student_mock_request`、`osg_student_course_record`。

结论不是“完全不可测”，而是：

- 可闭环主链：后台管理系统 -> 班主任端 -> 导师端 / 助教端。
- 独立闭环学生链：学生端自己的登录、忘记密码、个人资料、学生侧岗位页、学生侧模拟申请、学生侧课程记录。
- 当前不可作为一条单链测试的部分：学生端写入无法自然进入后台主业务链。

## 2. What Was Re-Verified

本次不是只看已有测试，而是重新对了代码、共享库现状和运行行为。

### 2.1 Shared DB Current Counts

- `osg_student`: 139
- `osg_staff`: 28
- `osg_position`: 110
- `osg_job_application`: 52
- `osg_coaching`: 93
- `osg_job_coaching`: 21
- `osg_mock_practice`: 120
- `osg_class_record`: 172
- `osg_contract`: 41
- `osg_staff_schedule`: 484
- `osg_student_job_position`: 11
- `osg_student_job_position_state`: 9
- `osg_student_mock_request`: 17
- `osg_student_course_record`: 6
- `osg_student_profile`: 2

这说明后台主业务面和学生端独立面是两套并行数据，不是同一条流水。

### 2.2 Standardized Portal Accounts

当前统一测试账号里：

- `mentor` 的 `sys_user.email` 已映射到 `osg_staff.staff_id=25`
- `assistant` 的 `sys_user.email` 已映射到 `osg_staff.staff_id=26`
- `lead_mentor` 的 `sys_user.email` 已映射到 `osg_staff.staff_id=50`
- `student` 只确认映射到了 `osg_student_profile.user_id=838`

对 `student` 账号的实际业务数据复核结果：

- `osg_student_profile where user_id=838`: 1
- `osg_student_course_record where user_id=838`: 0
- `osg_student_job_position_state where user_id=838`: 0
- `osg_student_mock_request where user_id=838`: 0
- `osg_job_application where student_id=838`: 0
- `osg_mock_practice where student_id=838`: 0
- `osg_class_record where student_id=838`: 0

所以当前统一学生账号不是后台主业务链里的学员主数据入口。

### 2.3 Runtime Stability Caveat

开发环境依赖共享远端 MySQL / Redis。2026-03-24 17:06 左右日志中出现过一次 `GetConnectionTimeoutException`，导致本地后端暂时不可用。这个问题来自共享依赖，不是业务代码本身，但会影响 `curl` 稳定性，测试时要单独记录。

## 3. Identity and Ownership Model

### 3.1 Auth Source

统一认证都落在 `sys_user`：

- 学生登录入口：[OsgStudentAuthController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStudentAuthController.java)
- 导师登录入口：[OsgMentorAuthController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgMentorAuthController.java)
- 班主任登录入口：[OsgLeadMentorAuthController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorAuthController.java)
- 助教登录入口：[OsgAssistantAuthController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgAssistantAuthController.java)

### 3.2 Admin Creates Business Rows and Login Accounts

后台新增学员 / 导师时，会自动创建 `sys_user` 登录账号，用户名默认是邮箱：

- 学员创建逻辑：[OsgStudentServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStudentServiceImpl.java)
- 导师创建逻辑：[OsgStaffServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStaffServiceImpl.java)

这条链是可闭环的，但它生成的账号默认是邮箱用户名，不是当前我们人工统一的 `student / mentor / lead_mentor / assistant`。

### 3.3 Identity Is Inconsistent Across Business Modules

当前系统里“员工身份”并不只有一种主键：

- 资料页 / 排期页常通过 `sys_user.email -> osg_staff.staff_id` 做映射。
- 部分业务表直接用 `sys_user.user_id` 作为 `lead_mentor_id`、`mentor_id`、`assistant_id`。
- 管理后台的 staff 聚合又经常按 `osg_staff.staff_id` 反查学生数量。

相关代码：

- 班主任资料映射：[OsgLeadMentorProfileService.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorProfileService.java)
- 班主任排期映射：[OsgLeadMentorScheduleService.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorScheduleService.java)
- 班主任学员范围：[OsgLeadMentorStudentServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorStudentServiceImpl.java)
- Staff 聚合字段：[OsgStaffMapper.xml](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgStaffMapper.xml)

这意味着测试时必须区分：

- “登录身份”是否存在。
- “业务归属”是按 `user_id` 还是按 `staff_id`。
- “当前页面能不能读到数据”是不是被身份映射方式卡住。

## 4. Current Data Flow Map

### 4.1 Auth and Password Reset

起点：各端登录 / 忘记密码页面。

终点：`sys_user` 登录态建立，Redis 验证码链路通过。

状态：可测，可闭环。

关键代码：

- 登录控制器见 3.1。
- 学生 / 助教 / 班主任共用 `/system/password/*`。
- 导师端独立忘记密码：[OsgForgotPasswordController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgForgotPasswordController.java)

### 4.2 Admin User Center Master Data

起点：后台管理系统新增 / 编辑学员、导师、班主任、助教。

终点：`osg_student`、`osg_staff`、`osg_contract`、`sys_user` 同步更新。

状态：可测，可闭环。

关键代码：

- 学员控制器：[OsgStudentController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStudentController.java)
- 学员服务：[OsgStudentServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStudentServiceImpl.java)
- 导师控制器：[OsgStaffController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStaffController.java)
- 导师服务：[OsgStaffServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStaffServiceImpl.java)

### 4.3 Staff Schedule Flow

起点：后台管理系统维护导师排期，或班主任端维护本人下周排期。

终点：`osg_staff_schedule`。

下游读取：

- 后台管理系统导师排期页
- 班主任个人中心排期页
- 模拟应聘分配页里的导师可用性

状态：可测，可闭环。

关键代码：

- 后台排期控制器：[OsgStaffScheduleController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStaffScheduleController.java)
- 后台排期服务：[OsgStaffScheduleServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStaffScheduleServiceImpl.java)
- 班主任排期控制器：[OsgLeadMentorScheduleController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorScheduleController.java)
- 班主任排期服务：[OsgLeadMentorScheduleService.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorScheduleService.java)

### 4.4 Position and Job Overview Main Chain

起点：后台岗位库维护，或后台审核学生自添岗位后进入公共岗位库。

主表：

- `osg_position`
- `osg_student_position`
- `osg_job_application`
- `osg_coaching`

下游读取：

- 后台岗位信息 / 学生自添岗位 / 求职总览
- 班主任岗位信息 / 学员求职总览
- 部分导师求职总览

状态：部分可闭环。

真正连通的部分：

- 后台岗位库维护 -> `osg_position`
- 班主任求职总览 / 后台求职总览 -> `osg_job_application`
- 班主任分配导师 -> `osg_coaching` + `osg_job_application.assign_status/coaching_status`

关键代码：

- 后台岗位控制器：[OsgPositionController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgPositionController.java)
- 后台岗位服务：[OsgPositionServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgPositionServiceImpl.java)
- 班主任求职总览控制器：[OsgLeadMentorJobOverviewController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorJobOverviewController.java)
- 班主任求职总览服务：[OsgLeadMentorJobOverviewServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorJobOverviewServiceImpl.java)
- 后台求职总览服务：[OsgJobOverviewServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java)
- 申请表映射：[OsgJobApplicationMapper.xml](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgJobApplicationMapper.xml)
- 辅导表映射：[OsgCoachingMapper.xml](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgCoachingMapper.xml)

断点：

- 学生端岗位投递 / 进度 / 我的求职不写 `osg_job_application`，而是只写学生侧独立表。
- 导师求职总览读的是另一张表 `osg_job_coaching`，不是 `osg_coaching`。

相关代码：

- 学生岗位页服务：[PositionServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java)
- 学生岗位页表映射：[StudentJobPositionMapper.xml](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentJobPositionMapper.xml)
- 导师求职总览控制器：[OsgJobOverviewController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgJobOverviewController.java)
- 导师求职总览旧表映射：[OsgJobCoachingMapper.xml](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgJobCoachingMapper.xml)

### 4.5 Mock Practice Main Chain

起点：当前主业务链里的 `osg_mock_practice` 记录。

主表：`osg_mock_practice`

下游读取：

- 后台模拟应聘管理
- 班主任模拟应聘管理
- 导师模拟应聘管理

状态：部分可闭环。

真正连通的部分：

- 班主任分配导师 -> `osg_mock_practice.status=scheduled`
- 导师确认 -> `osg_mock_practice.status=confirmed`
- 后台 / 班主任 / 导师都读 `osg_mock_practice`

关键代码：

- 后台 / 导师模拟应聘控制器：[OsgMockPracticeController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgMockPracticeController.java)
- 后台模拟应聘服务：[OsgMockPracticeServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgMockPracticeServiceImpl.java)
- 班主任模拟应聘控制器：[OsgLeadMentorMockPracticeController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorMockPracticeController.java)
- 班主任模拟应聘服务：[OsgLeadMentorMockPracticeServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorMockPracticeServiceImpl.java)
- 表映射：[OsgMockPracticeMapper.xml](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgMockPracticeMapper.xml)

断点：

- 学生端“模拟应聘申请”写的是 `osg_student_mock_request`，不是 `osg_mock_practice`。
- 班主任分配导师时，导师候选项来自 `osg_staff.staff_id`。
- 导师端读取时却按 `SecurityUtils.getUserId()` 去匹配 `mentor_ids`。

这意味着：

- 班主任把模拟应聘分给 staff id，并不保证导师端能按 sys user id 读到。

### 4.6 Class Record and Contract Consumption Main Chain

起点：

- 导师端新增课程记录
- 班主任端新增课程记录

主表：

- `osg_class_record`
- `osg_contract`

下游读取：

- 后台教学中心课程记录
- 后台课时报表 / 审核
- 合同剩余课时

状态：可闭环。

关键代码：

- 导师 / 后台课程记录控制器：[OsgClassRecordController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgClassRecordController.java)
- 班主任课程记录控制器：[OsgLeadMentorClassRecordController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorClassRecordController.java)
- 课时审核控制器：[OsgReportController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgReportController.java)
- 课时服务：[OsgClassRecordServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgClassRecordServiceImpl.java)
- 合同服务：[OsgContractServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgContractServiceImpl.java)
- 表映射：[OsgClassRecordMapper.xml](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgClassRecordMapper.xml)

特别说明：

- 合同已用课时不是直接写回合同表，而是后台列表读取时通过已审核的 `osg_class_record.status='approved'` 动态汇总。

### 4.7 Student Portal Independent Chains

学生端当前是独立子系统，不是后台主业务前台入口。

#### Student Profile

起点：学生修改个人资料。

终点：`osg_student_profile` 即时字段更新，`osg_student_profile_change` 记录待审核项。

状态：独立可测，但不进入 `osg_student` 主数据。

关键代码：

- 控制器：[OsgStudentProfileController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStudentProfileController.java)
- 服务：[StudentProfileServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentProfileServiceImpl.java)
- 表映射：[StudentProfileMapper.xml](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentProfileMapper.xml)

#### Student Job Center

起点：学生查看岗位、收藏岗位、投递岗位、记录进度、手动新增岗位。

终点：

- `osg_student_job_position`
- `osg_student_job_position_state`

状态：独立可测，不进入后台 `osg_position / osg_job_application` 主链。

关键代码：

- 控制器：[StudentPositionController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java)
- 学生求职列表控制器：[OsgApplicationController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgApplicationController.java)
- 服务：[PositionServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java)
- 表映射：[StudentJobPositionMapper.xml](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentJobPositionMapper.xml)

#### Student Mock Practice / Class Request

起点：学生提交模拟应聘申请、课程申请。

终点：`osg_student_mock_request`

状态：独立可测，不进入后台 `osg_mock_practice` 主链。

关键代码：

- 控制器：[StudentMockPracticeController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentMockPracticeController.java)
- 服务：[StudentMockPracticeServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentMockPracticeServiceImpl.java)
- 表映射：[StudentMockPracticeMapper.xml](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentMockPracticeMapper.xml)

#### Student Course Record

起点：学生查看课程记录、评价课程。

终点：`osg_student_course_record`

状态：独立可测，不消费后台 `osg_class_record`。

关键代码：

- 控制器：[OsgStudentClassRecordController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStudentClassRecordController.java)
- 服务：[StudentCourseRecordServiceImpl.java](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentCourseRecordServiceImpl.java)
- 表映射：[StudentCourseRecordMapper.xml](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentCourseRecordMapper.xml)

### 4.8 Base Data

后台基础数据管理当前不是共享基础数据中心。

状态：当前不可作为真实流转源。

原因：

- [OsgBaseDataController.java](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java) 直接用内存 `seedRows()`，没有读写 `sys_dict_data`。
- 但学生岗位、学生课程、学生模拟应聘、后台岗位 meta 等很多页面却真的在读 `sys_dict_data`。

因此当前“后台基础数据 -> 各端筛选项”这条业务流转在实现上并未打通。

## 5. Feasibility Decision

### 5.1 Feasible Now

以下链路现在可以作为重点 `curl` 闭环测试对象：

1. 后台新增 / 编辑学员 -> 合同生成 -> 后台学员列表 / 合同列表回读。
2. 后台新增 / 编辑 staff -> 登录账号生成 -> 班主任 / 导师 / 助教登录与个人中心回读。
3. 后台排期维护 -> 班主任排期页 / 模拟应聘导师可用性回读。
4. 班主任新增课程记录 -> 后台课时报表审核 -> 合同剩余课时变动。
5. 班主任求职总览分配导师 -> 后台求职总览回读。
6. 班主任模拟应聘分配 -> 后台模拟应聘回读。

### 5.2 Not Feasible as a Single 5-Portal Chain

以下“单链想象”当前不成立：

1. 学生端投递岗位 -> 班主任端求职总览看到新增申请。
2. 学生端申请模拟应聘 -> 班主任端模拟应聘管理看到新增申请。
3. 学生端课程记录 / 评价 -> 后台教学中心课程记录联动。
4. 后台基础数据修改 -> 学生端筛选项立刻跟着变。
5. 班主任给 mentor 分配模拟应聘 staff id -> 导师端按 sys user id 稳定可见。
6. 班主任给 mentor 分配求职辅导写 `osg_coaching` -> 导师端旧求职总览 `osg_job_coaching` 稳定可见。

## 6. How We Should Test Next

### Loop A: Access and Master Data

起点：后台新增学员 / 导师 / 助教 / 班主任。

终点：`osg_student` / `osg_staff` / `sys_user` / `osg_contract` 完整落库，并能登录对应端。

### Loop B: Staff Schedule

起点：后台管理系统或班主任端更新排期。

终点：`osg_staff_schedule` 落库，排期页和导师可用性一致。

### Loop C: Class Record -> Report -> Contract

起点：导师端或班主任端新增课时。

终点：后台报表审核通过后，合同剩余课时重新汇总。

### Loop D: Job Overview Main Chain

起点：现有 `osg_job_application` 样本或后台补充样本。

终点：班主任端 / 后台读到同一条申请；导师端视图单独验证 `osg_job_coaching` 兼容性。

### Loop E: Mock Practice Main Chain

起点：现有 `osg_mock_practice` 样本或补充样本。

终点：班主任分配 -> 导师确认 -> 后台 / 班主任 / 导师三侧回读一致。

### Loop F: Student Portal Independent Chain

起点：学生端页面动作。

终点：学生端独立表落库并能被学生端自己回读。

这条链要单独记账，不要和后台主业务链混看。

## 7. Recommendation

后续测试不应再按“5 个端逐页扫接口”推进，而应按下面的口径执行：

1. 先测后台主业务链闭环。
2. 再测学生端独立链闭环。
3. 把所有跨链断点单独列为实现缺口，而不是测试失败。

如果要实现真正的“五端单链路”测试，至少要补三类桥接：

1. 学生端岗位 / 求职 -> `osg_job_application`。
2. 学生端模拟申请 -> `osg_mock_practice`。
3. 学生端课程记录 -> `osg_class_record`。

在这三类桥接没有补之前，最合理的测试目标是：

- “4 端主业务链闭环 + 学生端独立闭环 + 跨链缺口清单”。
