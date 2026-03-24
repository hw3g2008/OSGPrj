# OSG 五端 Curl 闭环设计稿

日期：2026-03-25  
主题：完成学生、导师、班主任、助教、后台五端核心主链的真实数据闭环  
状态：设计已确认，待进入实施计划

## 1. 背景

当前仓库已经具备五端页面、登录入口和后台主业务表，但并不是一条完整的五端单链路系统。

现状的核心问题不是缺少 `curl` 清单，而是存在两套并行数据面：

- 后台主业务面：`osg_student`、`osg_staff`、`osg_contract`、`osg_job_application`、`osg_coaching`、`osg_mock_practice`、`osg_class_record`
- 学生独立面：`osg_student_job_position_state`、`osg_student_mock_request`、`osg_student_course_record`、`osg_student_profile`

结果是：

- 后台、班主任、导师、助教之间可以围绕主业务表形成部分闭环
- 学生端可以在自己的独立表里形成单端自环
- 但学生端写入无法自然进入后台主业务链，导致五端 `curl` 串联测试无法真实闭环

产品口径已经由以下文档明确：

- `docs/osg-product-confirmation-checklist.md`
- `docs/osg-business-flow-target.md`
- `docs/osg-curl-chain-checklist.md`
- `docs/osg-data-flow-current-state.md`
- `docs/osg-data-bridge-fix-plan.md`

本设计的目标不是重写所有页面，而是让五端围绕同一条主业务真相表链路完成 `FLOW-A + FLOW-C + FLOW-D + FLOW-E` 的真实闭环。

## 2. 范围与目标

### 2.1 本轮范围

本轮只覆盖五端核心闭环所需的主链：

- `FLOW-A` 账号与主数据准备链
- `FLOW-C` 求职状态流转链
- `FLOW-D` 模拟应聘链
- `FLOW-E` 课程记录链

`FLOW-F` 个人中心与排期链继续作为上游前置数据源使用，但不作为本轮桥接改造中心。  
`GAP-BD-01` 基础数据管理是否成为统一真实字典源，明确后置，不阻塞本轮五端闭环。

### 2.2 成功标准

本轮完成标准固定为：

1. 后台通过真实主数据创建一组链路账号，五端都能以真实角色登录。
2. 学生发起求职动作后，班主任、助教、后台、导师可围绕同一条主申请记录协同。
3. 学生发起模拟应聘后，班主任或后台可以分配，导师能看到并处理自己的任务。
4. 导师、班主任或助教提交课程记录后，后台审核通过，学生能看到并评价同一条主记录。

### 2.3 明确不做

- 不在本轮删除旧学生独立表
- 不在本轮重做基础数据管理字典源
- 不在本轮新增新的外部 API 路径体系
- 不为了“兼容成功”继续保留学生写影子表但主链无感知的假闭环

## 3. 现有入口与依赖清单

本设计不改变前端路由和主控制器入口，只调整控制器背后的数据真相与桥接方式。

### 3.1 学生端入口

- `/student/position/*` 对应 `StudentPositionController`
- `/student/application/*` 对应 `OsgApplicationController`
- `/student/mock-practice/*` 对应 `StudentMockPracticeController`
- `/student/class-records/*` 对应 `OsgStudentClassRecordController`

### 3.2 管理与消费端入口

- `/lead-mentor/job-overview/*` 对应 `OsgLeadMentorJobOverviewController`
- `/lead-mentor/mock-practice/*` 对应 `OsgLeadMentorMockPracticeController`
- `/api/mentor/job-overview/*` 对应 `OsgJobOverviewController` 中导师相关入口
- `/admin/job-overview/*` 对应 `OsgJobOverviewController`
- `/admin/staff`、`/admin/student`、`/admin/contract`、`/admin/position` 等继续作为 `FLOW-A` 与上游管理入口

### 3.3 现有权限与守卫复用

本轮不改变权限模型，只复用既有守卫：

- 班主任端继续复用 `OsgLeadMentorAccessService`
- 后台继续复用 `@PreAuthorize`
- 学生端继续复用现有登录态与 `BaseController#getUserId`

这意味着本轮主要变更点在 service、mapper 和数据真相，不在鉴权边界。

## 4. 备选方案

### 4.1 方案 A：主表单真相切换

做法：

- 学生侧直接写后台主业务表
- 学生读取逐步切到后台主业务表
- 旧学生表退出主链职责

优点：

- 五端围绕同一套主表运转
- `curl` 闭环最干净
- 后续维护成本最低

缺点：

- 改动面最大
- 学生侧字段适配和回归范围更广

### 4.2 方案 B：写双轨、读逐步切主表

做法：

- 学生写入同时进入旧表和主表
- 管理侧和导师侧继续读主表
- 学生侧列表逐步切换到主表

优点：

- 风险更平衡
- 可以更快打通五端主链

缺点：

- 会引入一段双写过渡期
- 如果边界不严，后续容易继续形成双真相

### 4.3 方案 C：适配层桥接，不切学生现有数据面

做法：

- 学生侧维持旧表写入
- 在桥接层同步或投影到主表
- 学生读取继续尽量依赖旧表结构

优点：

- 短期改动最小

缺点：

- 长期最差
- 逻辑最绕
- 后续几乎必然返工

### 4.4 最终决策

正式采用：

- 架构上采用方案 A：后台主业务表是唯一真相
- 落地节奏上借用方案 B：按链路分阶段切换，控制风险

总原则：

- 单真相，不接受双主链
- 对外接口路径尽量不变
- 学生旧表只允许保留短期兼容或历史展示价值，不再承载新的主链写入

## 5. 单真相与数据归属设计

### 5.1 主真相表

五端主链统一围绕以下表运转：

- `osg_student`
- `osg_staff`
- `osg_contract`
- `osg_job_application`
- `osg_coaching`
- `osg_mock_practice`
- `osg_class_record`

### 5.2 兼容表与历史表

以下表不再承担主链真相职责：

- `osg_student_job_position_state`
- `osg_student_mock_request`
- `osg_student_course_record`

处理规则：

- 不在本轮物理删除
- 不再允许新的主链写入只落这些表
- 如仍保留读取，仅限短期兼容或历史数据过渡

### 5.3 源数据与下游消费路径

本轮统一的数据传播路径为：

1. 学生、班主任、后台在入口控制器发起业务动作
2. service 层先做身份解析
3. 新写入直接落到主真相表
4. 班主任、导师、后台、学生的后续读取都围绕同一主真相表回查

这意味着“主表写成功但学生页继续只读旧表”的状态必须逐步退出，否则闭环仍然是假的。

### 5.4 阻塞与同步策略

为避免继续产生影子数据，本轮同步策略固定为：

- 如果学生 `user_id -> student_id` 解析失败，学生主链写操作直接失败
- 如果 staff `staff_id -> user_id` 解析失败，分配导师动作直接失败
- 不允许因为映射缺失而退回影子表写入
- 不允许学生侧假成功、下游不可见的静默降级

## 6. 身份模型与解析层

### 6.1 身份模型

系统内存在两类不同用途的主键：

- 登录身份：`sys_user.user_id`
- 学生业务实体：`osg_student.student_id`
- staff 管理实体：`osg_staff.staff_id`

跨端业务表统一规则：

- 学生主业务关联统一存 `student_id`
- 导师、班主任、助教关联统一存 `sys_user.user_id`

### 6.2 公共身份解析组件

新增一个统一身份解析组件，职责至少包含：

- `resolveStudentIdByUserId(userId)`
- `resolveStudentByUserId(userId)`
- `resolveUserIdByStaffId(staffId)`
- `resolveUserIdsByStaffIds(staffIds)`

建议解析路径：

- 学生：`sys_user.user_name(email) -> osg_student.email -> student_id`
- staff：`osg_staff.staff_id -> osg_staff.email -> sys_user.user_name -> user_id`

### 6.3 使用原则

- 所有学生主链写入都必须先经由统一解析组件拿到 `student_id`
- 所有导师分配写入都必须先把前端传入的 `staff_id` 转为 `user_id`
- 不允许各个 service 自行复制粘贴身份解析逻辑

## 7. 分链设计

### 7.1 GAP-D-02：导师分配身份统一

问题：

- 班主任或后台分配导师时，前端传入的是 `staff_id`
- 导师读取任务时，用的是 `SecurityUtils.getUserId()`
- 现有 `mentor_ids` 中混入 `staff_id`，会导致“已分配但导师读不到”

设计：

- `osg_mock_practice.mentor_ids` 改为存 `user_id` 串
- `osg_coaching.mentor_id / mentor_ids` 改为存 `user_id`
- 分配写入前统一把 `staff_id` 转为 `user_id`
- 导师读取逻辑保留按 `SecurityUtils.getUserId()` 查询

结果：

- 查询侧无需大改
- 存储语义统一后，导师端自然可读

### 7.2 GAP-C-01：学生求职进入 `osg_job_application`

问题：

- 学生投递、更新进度、申请辅导目前主要写 `osg_student_job_position_state`
- 班主任、后台求职总览读 `osg_job_application`
- 学生动作无法进入主链

设计：

- 学生“投递岗位”时，直接 upsert `osg_job_application`
- 学生“更新进度”时，更新同一条 `osg_job_application.current_stage`
- 学生“申请辅导”时，更新 `coaching_status`、`requested_mentor_count`、`preferred_mentor_names`
- 学生“我的求职”页改读 `osg_job_application`

表字段原则：

- `student_id` 来源于统一身份解析
- `company_name`、`position_name`、`region`、`city` 等从岗位主数据或对应记录补齐
- `assign_status`、`coaching_status` 由同一条主记录贯穿后续管理动作

### 7.3 GAP-C-02：导师求职总览切到主链

问题：

- 导师端当前还在读旧表 `osg_job_coaching`
- 班主任、后台分配导师写的是 `osg_coaching`
- 导师求职总览与主链脱节

设计：

- 导师求职总览改为读 `osg_job_application + osg_coaching`
- `OsgJobOverviewController` 中导师相关 `/api/mentor/job-overview/*` 入口逐步摆脱旧 `IOsgJobCoachingService`
- `OsgJobCoachingMapper.xml` 不在本轮删除，但退出主链职责

结果：

- `FLOW-C` 中学生、班主任、后台、导师围绕同一条申请与辅导记录协同

### 7.4 GAP-D-01：学生模拟应聘进入 `osg_mock_practice`

问题：

- 学生申请写 `osg_student_mock_request`
- 班主任、后台、导师读 `osg_mock_practice`
- 学生动作无法进入管理主链

设计：

- 学生发起模拟面试、人际关系测试、期中考试时，直接写 `osg_mock_practice`
- 学生自己的模拟应聘记录页也改读 `osg_mock_practice`
- 班主任与后台继续围绕 `osg_mock_practice` 分配和查看
- 导师依赖 `GAP-D-02` 修复后的 `mentor_ids=user_id` 读取任务

必填字段：

- `student_id`
- `student_name`
- `practice_type`
- `request_content`
- `requested_mentor_count`
- `preferred_mentor_names`
- `status = pending`
- `submitted_at`

### 7.5 GAP-E-01：学生课程记录消费 `osg_class_record`

问题：

- 学生课程记录页读 `osg_student_course_record`
- 导师提交、后台审核走 `osg_class_record`
- 学生无法自然消费后台审核通过的课程主记录

设计：

- 学生课程记录列表改为按 `student_id` 读取 `osg_class_record`
- 学生评价改为回写主记录，不再写独立学生课程记录表
- 学生页显示字段通过 service 层转换，保持前端返回结构尽量稳定

要求：

- 学生只能看到属于自己的课程记录
- 后台审核通过后的记录必须出现在学生端
- 学生评价必须回写到主表而非影子表

## 8. 接口边界与契约策略

### 8.1 路径保持不变

本轮不新增新的外部业务路径，优先维持现有 controller 入口：

- 学生求职：`/student/position/*`、`/student/application/*`
- 学生模拟应聘：`/student/mock-practice/*`
- 学生课程记录：`/student/class-records/*`
- 班主任：`/lead-mentor/job-overview/*`、`/lead-mentor/mock-practice/*`
- 导师：`/api/mentor/job-overview/*`
- 后台：`/admin/job-overview/*`

### 8.2 返回结构保持兼容

本轮不把数据库字段直接暴露给前端，而是在 service 层做 DTO 映射。

规则：

- 尽量保持学生页当前响应 shape 不变
- 允许 service 内部从主表字段映射出旧页面需要的展示字段
- 不因为切到主表就强迫前端整体改协议

## 9. 错误处理策略

本轮采用“显式失败优先”。

### 9.1 阻塞类错误

以下情况直接返回业务错误，不允许继续假成功：

- 学生登录身份无法解析到 `student_id`
- 分配导师时 `staff_id` 无法解析到 `user_id`
- 访问主链记录时目标记录不存在
- 当前账号无权访问或操作记录

### 9.2 不允许的降级行为

- 不允许因为解析失败而只写影子表
- 不允许因为导师 ID 解析失败而写入错误 `mentor_ids`
- 不允许学生页面继续显示“写成功”，而下游任何管理端都看不到记录

### 9.3 历史数据策略

- 本轮不做复杂运行时双语义兼容
- 对历史数据的兼容优先通过一次性数据修正或接受历史列表局部不一致
- 新数据必须遵循统一 ID 语义和主表真相

## 10. 验证设计

### 10.1 测试分层

本轮验证分为四层：

- 公共身份解析单元测试
- service/mapper 行为测试
- controller 回归测试
- `curl` 主链闭环测试

### 10.2 每条链的验证重点

`FLOW-A`

- 后台创建真实 student / mentor / lead-mentor / assistant / admin 账号与主数据
- 五端真实账号登录成功

`FLOW-C`

- 学生投递岗位
- 学生更新阶段与辅导申请
- 班主任看到同一条求职主记录
- 后台看到同一条求职主记录
- 导师在被分配后看到同一条辅导主记录

`FLOW-D`

- 学生发起模拟应聘
- 班主任或后台看到待分配记录
- 分配导师
- 导师看到属于自己的任务

`FLOW-E`

- 导师、班主任或助教提交课程记录
- 后台审核通过
- 学生看到同一条课程记录并提交评价

### 10.3 通过标准

通过不以 HTTP 200 为准，而以以下断言为准：

1. 同一业务对象至少能从 3 个视角回查
2. 下游看到的是同一条主链记录，不是影子记录
3. 导师端可读到分配后的记录，证明 `staff_id/user_id` 问题已消除
4. 学生端可读到后台审核通过后的课程记录并回写评价，证明 `FLOW-E` 真实闭环

### 10.4 阶段回归策略

每完成一个 GAP，都必须跑对应子链验证，而不是等全部改完再一次性验收：

- 完成 `GAP-D-02` 后立即验证导师是否能读取分配任务
- 完成 `GAP-C-01/C-02` 后立即验证求职主链
- 完成 `GAP-D-01` 后立即验证模拟应聘链
- 完成 `GAP-E-01` 后立即验证课程记录链

## 11. 实施顺序

建议按以下顺序实施：

1. 公共身份解析层
2. `GAP-D-02` 导师分配身份统一
3. `GAP-C-01` 学生求职进入 `osg_job_application`
4. `GAP-C-02` 导师求职总览切到主链
5. `GAP-D-01` 学生模拟应聘进入 `osg_mock_practice`
6. `GAP-E-01` 学生课程记录切到 `osg_class_record`

这样安排的原因：

- 身份解析与导师 ID 统一是所有跨端链的前置
- `FLOW-C` 的求职主链打通后，`FLOW-D` 和 `FLOW-E` 的上下游更稳定
- 课程记录链依赖前面主数据、导师分配与主记录语义稳定

## 12. 受影响文件范围

### 12.1 学生求职

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgApplicationController.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/IPositionService.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`
- `ruoyi-system/src/main/resources/mapper/student/StudentJobPositionMapper.xml`
- `ruoyi-system/src/main/resources/mapper/system/OsgJobApplicationMapper.xml`
- `ruoyi-system/src/main/resources/mapper/system/OsgCoachingMapper.xml`

### 12.2 求职管理与导师视角

- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorJobOverviewServiceImpl.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorJobOverviewController.java`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgJobOverviewController.java`
- `ruoyi-system/src/main/resources/mapper/system/OsgJobCoachingMapper.xml`

### 12.3 学生模拟应聘

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentMockPracticeController.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/IStudentMockPracticeService.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentMockPracticeServiceImpl.java`
- `ruoyi-system/src/main/resources/mapper/student/StudentMockPracticeMapper.xml`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgMockPracticeServiceImpl.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorMockPracticeServiceImpl.java`
- `ruoyi-system/src/main/resources/mapper/system/OsgMockPracticeMapper.xml`

### 12.4 学生课程记录

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStudentClassRecordController.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/IStudentCourseRecordService.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentCourseRecordServiceImpl.java`
- `ruoyi-system/src/main/resources/mapper/student/StudentCourseRecordMapper.xml`
- `ruoyi-system/src/main/resources/mapper/system/OsgClassRecordMapper.xml`

### 12.5 公共身份层

- 新增统一 identity resolver 组件
- 视需要补充 `OsgStudentMapper`、`OsgStaffMapper` 或对应查询方法

## 13. 风险与延期项

### 13.1 主要风险

- 学生页字段 shape 变化引发前端回归
- 导师端旧 `osg_job_coaching` 依赖切换不完整
- 历史数据中存在旧 ID 语义导致局部显示不一致

### 13.2 控制方式

- 不改外部路由路径
- 响应结构尽量兼容
- 优先新增主表读取逻辑，不急于物理删除旧 mapper 和旧表
- 每完成一条链就执行对应 controller + `curl` 子链验证

### 13.3 明确后置

以下内容明确不阻塞本轮闭环，但必须记录：

- `GAP-BD-01` 基础数据管理切换为统一字典真源
- 旧学生独立表的物理清理与迁移收尾
- 历史数据的一次性修正脚本

## 14. 下一步

本设计确认后的下一步应为实施计划拆解，输出逐步实现顺序、测试补齐项和每步验证命令。

如果后续计划编写技能不可用，则应基于本设计稿使用仓库现有工作流做等价的手工实施计划，而不是直接跳过计划阶段进入编码。
