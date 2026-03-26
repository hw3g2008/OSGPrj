# OSG 五端 Curl 闭环实施计划

> Goal: 按 `docs/plans/2026-03-25-osg-five-end-curl-closure-design.md` 的单真相设计，完成 `FLOW-A + FLOW-C + FLOW-D + FLOW-E` 的五端真实数据闭环。
>
> Design Doc: `docs/plans/2026-03-25-osg-five-end-curl-closure-design.md`
>
> Architecture: 保持现有 controller 路径不变，在 `ruoyi-system` 中新增统一身份解析层，逐步把学生求职、学生模拟应聘、学生课程记录切到后台主业务表；同时把导师和班主任分配链统一到 `sys_user.user_id` 语义，并让导师求职总览退出旧 `osg_job_coaching` 链。
>
> Tech Stack: Java, Spring Boot, MyBatis XML, JUnit 5, MockMvc, Bash curl scripts
>
> Execution Order: implementation-plan -> identity resolver -> mentor id normalization -> job application bridge -> mentor overview bridge -> mock practice bridge -> class record bridge -> focused tests -> curl verification
>
> DoD: 学生端写入进入主表；班主任/后台分配导师统一写 `user_id`；导师能读到分配结果；学生端能读到后台审核通过的课程记录并评价同一条主记录；对应 controller/service 测试与 `FLOW-A/C/D/E` curl 验证通过。

## 0. 与设计稿关系

1. 本计划是 `docs/plans/2026-03-25-osg-five-end-curl-closure-design.md` 的唯一实施计划。
2. 若实施中发现计划与代码现实冲突，先以代码真实入口和已有 contract 为准，再回改设计与计划，不允许静默偏航。
3. 不允许跳过公共身份解析直接在业务 service 中散落临时映射逻辑。

## Existing-Entrypoint Inventory

- 学生侧入口：
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgApplicationController.java`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentMockPracticeController.java`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStudentClassRecordController.java`
- 班主任与导师：
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorJobOverviewController.java`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorMockPracticeController.java`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgJobOverviewController.java`
- 关键 service：
  - `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`
  - `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentMockPracticeServiceImpl.java`
  - `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentCourseRecordServiceImpl.java`
  - `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorJobOverviewServiceImpl.java`
  - `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java`
  - `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorMockPracticeServiceImpl.java`
  - `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgMockPracticeServiceImpl.java`
- 关键 mapper：
  - `StudentJobPositionMapper*`
  - `StudentMockPracticeMapper*`
  - `StudentCourseRecordMapper*`
  - `OsgJobApplicationMapper*`
  - `OsgCoachingMapper*`
  - `OsgMockPracticeMapper*`
  - `OsgClassRecordMapper*`
  - `OsgJobCoachingMapper*`

## Guard Reuse / Collision Audit

- 保持现有 controller 路径与权限守卫不变
  - 学生端继续复用 `BaseController#getUserId`
  - 班主任端继续复用 `OsgLeadMentorAccessService`
  - 后台端继续复用 `@PreAuthorize`
- 禁止新建一套“closure 专用 controller”
- 禁止保留“旧表写入 + 主表缺席”的兼容模式作为长期路径
- 允许短期保留旧 mapper 文件，但必须在本计划中明确退出主链职责

## Source-Stage Integration Path

- 身份解析：
  - 最早新增：统一 identity resolver 组件
  - 最早消费：`PositionServiceImpl`、`StudentMockPracticeServiceImpl`、`StudentCourseRecordServiceImpl`、导师分配 service
- 求职主链：
  - 最早写入：`StudentPositionController -> PositionServiceImpl -> OsgJobApplicationMapper`
  - 下游消费：`OsgLeadMentorJobOverviewServiceImpl`、`OsgJobOverviewServiceImpl`
- 模拟应聘主链：
  - 最早写入：`StudentMockPracticeController -> StudentMockPracticeServiceImpl -> OsgMockPracticeMapper`
  - 下游消费：`OsgLeadMentorMockPracticeServiceImpl`、`OsgMockPracticeServiceImpl`
- 课程记录主链：
  - 最早写入：导师 / 班主任 / 助教既有 class-record controller
  - 学生消费：`OsgStudentClassRecordController -> StudentCourseRecordServiceImpl -> OsgClassRecordMapper`
- 最早阻断点：
  - 身份解析失败时在 service 直接抛错
  - 不允许回退到旧表兜底

## Stage-Regression Verification

- 公共身份解析：
  - 新增 resolver 单元测试
  - 先看失败，再补实现
- 导师分配身份统一：
  - 先补 `OsgLeadMentorJobOverviewControllerTest` / `OsgLeadMentorMockPracticeControllerTest` 中 `staff_id -> user_id` 断言
  - 再改 service
- 求职主链：
  - 新增 `PositionServiceImpl` 行为测试
  - 新增或修改导师端总览测试，确保不再依赖 `osg_job_coaching`
- 模拟应聘主链：
  - 新增 `StudentMockPracticeServiceImpl` 行为测试
  - 回归班主任 / 导师读取
- 课程记录主链：
  - 新增 `StudentCourseRecordServiceImpl` 行为测试
  - 确认学生评价回写主表
- 最终阶段：
  - 跑针对性 JUnit
  - 跑 `FLOW-A/C/D/E` curl 子链

## Task 1: Write failing tests for shared identity resolution and mentor user-id normalization

**Files:**
- Create: `ruoyi-admin/src/test/java/com/ruoyi/system/service/impl/OsgIdentityResolverTest.java`
- Modify: `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgLeadMentorJobOverviewControllerTest.java`
- Modify: `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgLeadMentorMockPracticeControllerTest.java`

**Step 1: Write failing tests**

- 为学生解析补测试：
  - 通过 `sys_user.user_name/email -> osg_student.email` 能解析到 `student_id`
  - 缺失映射时抛业务错误
- 为导师分配补测试：
  - 班主任传入 `mentorIds=[staffId]` 后，持久化到 `mentor_ids` 的值必须是 `user_id`
  - 不再允许测试里直接把 `staff_id` 当成最终存储值

**Step 2: Run tests to verify RED**

Run:

```bash
./mvnw -pl ruoyi-admin -Dtest=OsgLeadMentorJobOverviewControllerTest,OsgLeadMentorMockPracticeControllerTest test
```

Expected:

- 新断言失败，因为当前实现仍把前端 `staff_id` 直接写入 `mentor_ids`

## Task 2: Implement shared identity resolver

**Files:**
- Create: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgIdentityResolver.java`
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/mapper/OsgStudentMapper.java`
- Modify: `ruoyi-system/src/main/resources/mapper/system/OsgStudentMapper.xml`
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/mapper/OsgStaffMapper.java`
- Modify: `ruoyi-system/src/main/resources/mapper/system/OsgStaffMapper.xml`

**Step 1: Implement minimal resolver**

- 提供：
  - `resolveStudentByUserId`
  - `resolveStudentIdByUserId`
  - `resolveUserIdByStaffId`
  - `resolveUserIdsByStaffIds`
- 学生解析路径：
  - `sys_user.user_name/email -> osg_student.email`
- staff 解析路径：
  - `staff_id -> osg_staff.email -> sys_user.user_name -> user_id`

**Step 2: Run targeted tests**

Run:

```bash
./mvnw -pl ruoyi-admin -Dtest=OsgIdentityResolverTest test
```

Expected:

- `PASS`

## Task 3: Normalize mentor assignment IDs to user_id

**Files:**
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorJobOverviewServiceImpl.java`
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java`
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorMockPracticeServiceImpl.java`
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgMockPracticeServiceImpl.java`

**Step 1: Update assignment writes**

- 所有分配入口先把 `staff_id` 转成 `user_id`
- `osg_coaching.mentor_id / mentor_ids` 统一写 `user_id`
- `osg_mock_practice.mentor_ids` 统一写 `user_id`

**Step 2: Keep read side stable**

- 导师端已有 `SecurityUtils.getUserId()` 读取逻辑保留
- `matchesMentorRelation` 和 `FIND_IN_SET(currentMentorId, mentor_ids)` 继续工作

**Step 3: Run tests**

Run:

```bash
./mvnw -pl ruoyi-admin -Dtest=OsgLeadMentorJobOverviewControllerTest,OsgLeadMentorMockPracticeControllerTest test
```

Expected:

- `PASS`

## Task 4: Bridge student apply/progress/coaching into osg_job_application

**Files:**
- Modify: `ruoyi-admin/src/test/java/com/ruoyi/system/service/impl/PositionServiceImplTest.java` (new if absent)
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/mapper/OsgJobApplicationMapper.java`
- Modify: `ruoyi-system/src/main/resources/mapper/system/OsgJobApplicationMapper.xml`
- Modify: `ruoyi-system/src/main/resources/mapper/student/StudentJobPositionMapper.xml` (only for remaining compatibility paths)

**Step 1: Write failing tests**

- 学生投递岗位后创建或更新 `osg_job_application`
- 学生更新进度后更新 `current_stage`
- 学生申请辅导后更新 `coaching_status`、`requested_mentor_count`
- 缺失 `student_id` 解析时直接失败

**Step 2: Implement minimal bridge**

- 写操作直接写主表
- 旧学生状态表若短期仍保留，仅限兼容，不作为断言真相

**Step 3: Run tests**

Run:

```bash
./mvnw -pl ruoyi-admin -Dtest=PositionServiceImplTest test
```

Expected:

- `PASS`

## Task 5: Switch student application reads and mentor overview to main chain

**Files:**
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java`
- Modify: `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgJobOverviewController.java`
- Modify: `ruoyi-system/src/main/resources/mapper/system/OsgCoachingMapper.xml`
- Keep but deprecate: `ruoyi-system/src/main/resources/mapper/system/OsgJobCoachingMapper.xml`

**Step 1: Write failing tests**

- 学生“我的求职”读取主表
- 导师端 `/api/mentor/job-overview/list` 不再依赖旧 `osg_job_coaching`
- 被分配导师后，导师端能看到班主任/后台写入的主链记录

**Step 2: Implement**

- 学生列表 read path 切到 `osg_job_application`
- 导师总览 read path 切到 `osg_coaching + osg_job_application`

**Step 3: Run tests**

Run:

```bash
./mvnw -pl ruoyi-admin -Dtest=OsgJobOverviewControllerTest,OsgLeadMentorJobOverviewControllerTest,PositionServiceImplTest test
```

Expected:

- `PASS`

## Task 6: Bridge student practice request into osg_mock_practice

**Files:**
- Modify: `ruoyi-admin/src/test/java/com/ruoyi/system/service/impl/StudentMockPracticeServiceImplTest.java` (new if absent)
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentMockPracticeServiceImpl.java`
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/mapper/OsgMockPracticeMapper.java`
- Modify: `ruoyi-system/src/main/resources/mapper/system/OsgMockPracticeMapper.xml`
- Keep but de-scope: `ruoyi-system/src/main/resources/mapper/student/StudentMockPracticeMapper.xml`

**Step 1: Write failing tests**

- 学生发起 practice request 后创建 `osg_mock_practice`
- 学生 overview 读取 `osg_mock_practice`
- 解析不到 `student_id` 时直接失败

**Step 2: Implement**

- `practice-request` 写主表
- 记录页读主表
- `class-request` 暂保留原链，但不得影响模拟应聘主闭环

**Step 3: Run tests**

Run:

```bash
./mvnw -pl ruoyi-admin -Dtest=StudentMockPracticeServiceImplTest,OsgLeadMentorMockPracticeControllerTest test
```

Expected:

- `PASS`

## Task 7: Bridge student class-record reads and ratings into osg_class_record

**Files:**
- Modify: `ruoyi-admin/src/test/java/com/ruoyi/system/service/impl/StudentCourseRecordServiceImplTest.java` (new if absent)
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/domain/OsgClassRecord.java`
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentCourseRecordServiceImpl.java`
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/mapper/OsgClassRecordMapper.java`
- Modify: `ruoyi-system/src/main/resources/mapper/system/OsgClassRecordMapper.xml`
- Keep but de-scope: `ruoyi-system/src/main/resources/mapper/student/StudentCourseRecordMapper.xml`

**Step 1: Write failing tests**

- 学生端只读取属于自己的已审核或可见主记录
- 学生评分写回主表
- 写回后重新读取可以看到评分结果

**Step 2: Implement**

- 在 `OsgClassRecord` 增加学生评价字段
- mapper 增加按 `student_id` 查询与学生评分更新
- `StudentCourseRecordServiceImpl` 从主表投影旧页面 shape

**Step 3: Run tests**

Run:

```bash
./mvnw -pl ruoyi-admin -Dtest=StudentCourseRecordServiceImplTest test
```

Expected:

- `PASS`

## Task 8: Run focused regression suite and curl chain verification

**Files:**
- Modify if needed: `docs/osg-curl-chain-checklist.md`
- Modify or create if needed: `bin/student-api-smoke.sh` or dedicated closure curl script

**Step 1: Run focused unit/controller regression**

Run:

```bash
./mvnw -pl ruoyi-admin -Dtest=OsgIdentityResolverTest,PositionServiceImplTest,StudentMockPracticeServiceImplTest,StudentCourseRecordServiceImplTest,OsgLeadMentorJobOverviewControllerTest,OsgLeadMentorMockPracticeControllerTest,OsgJobOverviewControllerTest test
```

Expected:

- `PASS`

**Step 2: Run curl subchains**

Run:

- `FLOW-A`
- `FLOW-C`
- `FLOW-D`
- `FLOW-E`

Expected:

- 学生写入能在管理侧和消费侧回查
- 导师能读到被分配记录
- 学生能读到审核通过后的课程主记录并评价

## Final Verification Checklist

- 新增主链写入都经过统一身份解析
- `mentor_ids` 不再写 `staff_id`
- 学生求职读写主表
- 学生模拟应聘读写主表
- 学生课程记录读主表、评价写主表
- 导师总览退出旧 `osg_job_coaching` 主链
- 目标测试与 curl 验证有 fresh evidence
