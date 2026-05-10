# 按端需求索引与交付顺序

- **日期**：2026-05-09
- **目的**：把原始需求按端归档，避免同一个端反复返工
- **推荐交付策略**：先做一次全局底座，再按端闭环交付

---

## 1. 推荐策略

不要纯按业务域推进，也不要一开始就盲目纯按端推进。

最合适的方式是：

```text
Step 0：全局底座一次性打好
Step 1：学生端闭环
Step 2：班主任端闭环
Step 3：导师端闭环
Step 4：助教端闭环
Step 5：后台闭环
Step 6：跨端回归与验收
```

原因：

- `application -> coaching` 的建模修订是所有端共同依赖；
- `class_record.reference_type/reference_id` 的锚点修订也是所有端共同依赖；
- 这些底座如果不先做，按端做会反复返工；
- 底座完成后，每个端应一次性把该端相关页面、接口、测试、验收都闭环。

---

## 2. Step 0：全局底座

### 2.1 目标

只做跨端共享的基础能力，不做具体端页面细节。

### 2.2 范围

- 允许同一个 `application` 下存在多条 `coaching`；
- 明确 `coaching_id` 是阶段级辅导申请主键；
- 岗位辅导课消新口径为：

```text
course_type = job_coaching
reference_type = job_coaching
reference_id = coaching_id
```

- 修正 validator 的岗位辅导 reference 校验；
- 修正 reference candidates，使岗位辅导候选返回 `coaching_id`；
- 明确保留 S-053~S-056 已完成资产，不推倒重做。

### 2.3 对应文档

- `00-overview.md`
- `02-job-overview-coaching-anchor-revision.md`
- `03-class-report-reference-revision.md`

### 2.4 完成标准

- 后端模型和查询支持多 `coaching`；
- 新提交的岗位辅导课消绑定 `coaching_id`；
- 旧的 application 锚点不再作为新数据写入口；
- shared 弹窗和 validator 能识别 `job_coaching` reference。

### 2.5 Step 0 小 fix 状态跟踪

| 编号 | 小 fix | 状态 | 验证/备注 |
|---|---|---|---|
| Step0-F0 | 状态跟踪区 | ✅ 已完成 | 已建立本状态表，后续每个小 fix 完成后更新 |
| Step0-F1 | DB/Mapper 支持多 coaching | ✅ 已完成 | `mvn -pl ruoyi-system -DskipTests compile` BUILD SUCCESS；grep 确认普通索引、migration、新 mapper 查询 |
| Step0-F2 | OsgCoaching 阶段级字段 | ✅ 已完成 | `mvn -pl ruoyi-system -DskipTests compile` BUILD SUCCESS；grep 确认 domain/XML/SQL/migration 字段映射 |
| Step0-F3 | class_record 写入 reference_type/reference_id + 新增 job_coaching 常量 | ✅ 已完成 | `mvn -pl ruoyi-system -DskipTests compile` BUILD SUCCESS；insert/insertMentor 都已包含 reference 列；REFERENCE_TYPE_JOB_COACHING 常量已就位 |
| Step0-F4 | reference candidates 返回 coaching + shared 类型/StepReference 切换 | ✅ 已完成 | `mvn -pl ruoyi-system -DskipTests compile` BUILD SUCCESS；新增 `buildJobCoachingCandidates`；shared `ReferenceType` / `StepReference.vue` / `class-records.ts` label 已切换 |
| Step0-F5 | validator 接受 coaching_id（保留 application 兼容） | ✅ 已完成 | `mvn -pl ruoyi-system -DskipTests compile` BUILD SUCCESS；`expectedReferenceType('job_coaching')` 切到 job_coaching，新增 `isReferenceTypeAllowed` 兼容 application，ownership 增加 coaching_id 分支 |
| Step0-F6 | 总回归 | ✅ 已完成 | `mvn -pl ruoyi-system -DskipTests compile -q` ✅；`mvn -pl ruoyi-system test -Dtest=OsgClassReportConstantsTest -q` ✅；`pnpm --filter @osg/shared test` ✅ 29 files / 371 passed / 1 todo；ruoyi-system 全量单测与 ruoyi-admin controller 定向测试存在 baseline 失败（已用 stash 对照，非本次 Step 0 引入）：ruoyi-system 169 tests 中 3 failures / 4 errors；ruoyi-admin 存在测试上下文缺 bean 等既有失败 |

---

## 3. Step 1：学生端闭环

### 3.1 原始需求段

学生端【我的求职】：

- 我的求职列表展示学生已求职岗位；
- 岗位行显示岗位名称、公司、行业、岗位分类、地区、招聘周期、投递时间、求职状态；
- 操作区只有「申请辅导」按钮；
- 申请辅导可申请多个面试阶段；
- 申请后岗位行展开显示辅导申请记录；
- 辅导记录显示面试阶段、面试时间、城市、导师、最近评分；
- 操作包含查看详情、修改；
- 查看详情展示导师写的课消详情；
- 修改只允许修改面试时间和公司面试官。

### 3.2 一次性闭环范围

学生端做时应一次性完成：

- 我的求职主表字段；
- 申请辅导弹窗；
- 新增 `coaching` 申请；
- 同一岗位多条辅导申请；
- 展开行；
- 查看详情；
- 修改面试时间/公司面试官；
- 最近评分展示；
- 学生端接口与权限；
- 学生端测试。

### 3.3 不应留到后面再补的内容

- 不要只做「申请辅导」而不做展开行；
- 不要只写 `application.current_stage` 而不生成 `coaching`；
- 不要先按 `application_id` 查详情，后面再改 `coaching_id`；
- 不要把最近评分留到班主任端再统一补。

### 3.4 对应文档

- `01-student-applications.md`
- `03-class-report-reference-revision.md`

### 3.5 建议状态

第一优先级。

学生端是阶段级辅导申请的入口，建议在底座后第一个做。

### 3.6 Step 1 短审计（2026-05-09）

Current State:

- 学生端「我的求职」列表接口当前为 `GET /student/application/list`，由 `OsgApplicationController` 调用 `PositionServiceImpl.selectApplicationList`。
- `selectApplicationList` 当前返回 `osg_job_application` 扁平记录，字段仍是岗位申请维度：`id` / `positionId` / `company` / `position` / `stage` / `interviewTime` / `coachingStatus` / `mentor` / `hoursFeedback` 等。
- 当前列表返回结构中没有 `coachings` 子列表，前端 `StudentApplicationRecord` 类型也没有 `coachings`。
- 学生端申请辅导主路径仍为 `POST /student/position/coaching`，前端 `requestStudentPositionCoaching` 仍提交 `positionId`。
- `PositionServiceImpl.requestCoaching` 当前会更新 `osg_job_application.current_stage/coaching_status/requested_mentor_count/remark`，没有新增 `osg_coaching` 作为阶段级辅导申请。
- `osg-frontend/packages/student/src/views/applications/index.vue` 当前表格没有展开行，操作仍围绕「更新状态 & 申请辅导」弹窗。
- 学生端查看详情当前只有面试日历详情弹窗，没有按 `coaching_id` 查询课消详情的入口。
- `OsgClassRecordMapper` 当前只有 `selectByApplicationReference(applicationId)`，没有按 `reference_type='job_coaching' AND reference_id=coaching_id` 查询学生端详情/最近评分的专用方法。
- 学生身份权限目前主要在 `getUserId()` → `identityResolver.resolveStudentIdByUserId(userId)` 与 `requireActiveStudentForPositionAccess(userId)` 路径内完成，新增 coaching 接口仍需显式校验 application/coaching 属于当前学生。

Reusable Assets:

- Step 0 已完成的 `OsgCoaching` 字段：`coachingId` / `applicationId` / `studentId` / `interviewStage` / `interviewTime` / `city` / `companyInterviewer` / `requestedMentorCount` / `requestNote` / `mentorIds` / `mentorNames` / `status`。
- `OsgCoachingMapper` 已有 `selectCoachingsByApplicationId`、`selectCoachingList`、`insertCoaching`、`updateCoaching`。
- `OsgClassRecordMapper` 已能读 approved 学生课消记录，insert 路径已支持 `reference_type/reference_id`。
- `@osg/shared/api/applications.ts` 已集中封装学生端 application API，可扩展类型与接口函数。
- 学生端 `applications.spec.ts` 已有源代码契约测试，可作为 Step 1 前端回归入口。

Gaps:

- G1：列表接口没有返回 application + coachings 的父子结构。
- G2：申请辅导没有新增 `osg_coaching`，仍通过覆盖 application 字段表达本次辅导申请。
- G3：缺少学生端按 `applicationId/coachingId` 修改 `interviewTime/companyInterviewer` 的白名单接口。
- G4：缺少学生端按 `coaching_id` 查询课消详情与最近评分的接口/Mapper。
- G5：前端没有展开行、coaching 子行、详情弹窗和修改弹窗。
- G6：现有测试仍锁定旧的扁平 application 口径，需要随 Step 1 小 fix 分批改为 `coaching_id` 口径。

Suggested Step 1 Small Fixes:

- Step1-F0：状态跟踪区 + 第一批 fix plan。
- Step1-F1：后端列表接口返回 application + coachings。
- Step1-F2：后端新增 coaching 申请接口。
- Step1-F3：后端修改 coaching 面试时间/公司面试官接口。
- Step1-F4：后端 coaching 详情/课消详情接口。
- Step1-F5：学生端我的求职主表 + 展开行。
- Step1-F6：学生端申请辅导弹窗接入新接口。
- Step1-F7：学生端查看详情 + 修改弹窗。
- Step1-F8：测试与回归。

### 3.7 Step 1 小 fix 状态跟踪

| 编号 | 小 fix | 状态 | 范围 | 验收/验证命令 |
|---|---|---|---|---|
| Step1-F0 | 状态跟踪区 + 第一批 fix plan | ✅ 已完成 | 本文档 §3.6~§3.8 | 已完成短审计并写入第一批方案；等待用户确认后改代码 |
| Step1-F1 | 后端列表接口返回 application + coachings | ✅ 已完成 | 后端列表结构、coaching 子项、最近评分/课消数 | `mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest -q` ✅；`mvn -pl ruoyi-system -DskipTests compile -q` ✅ |
| Step1-F2 | 后端新增 coaching 申请接口 | ✅ 已完成 | `POST /student/applications/{applicationId}/coachings` | `mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest -q` ✅；`mvn -pl ruoyi-admin -am test -Dtest=OsgApplicationControllerTest,StudentPositionControllerTest -Dsurefire.failIfNoSpecifiedTests=false -q` ✅；`mvn -pl ruoyi-admin -am -DskipTests compile -q` ✅ |
| Step1-F3 | 后端修改 coaching 面试时间/公司面试官接口 | ✅ 已完成 | `PUT /student/applications/{applicationId}/coachings/{coachingId}` | `mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest -q` ✅；`mvn -pl ruoyi-admin -am test -Dtest=OsgApplicationControllerTest,StudentPositionControllerTest -Dsurefire.failIfNoSpecifiedTests=false -q` ✅；`mvn -pl ruoyi-admin -am -DskipTests compile -q` ✅ |
| Step1-F4 | 后端 coaching 详情/课消详情接口 | ✅ 已完成 | `GET /student/applications/{applicationId}/coachings/{coachingId}/class-records` | `mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest -q` ✅；`mvn -pl ruoyi-admin -am test -Dtest=OsgApplicationControllerTest,StudentPositionControllerTest -Dsurefire.failIfNoSpecifiedTests=false -q` ✅；`mvn -pl ruoyi-admin -am -DskipTests compile -q` ✅ |
| Step1-F5 | 学生端我的求职主表 + 展开行 | ✅ 已完成 | `student/src/views/applications/index.vue` + shared 类型 | `pnpm --filter @osg/shared test -- applications-api.spec.ts` ✅；`pnpm --filter @osg/student exec vitest run src/__tests__/applications.spec.ts` ✅ |
| Step1-F6 | 学生端申请辅导弹窗接入新接口 | ✅ 已完成 | 弹窗字段、7 阶段、新增接口调用 | 学生页 grep 确认只调用 `requestStudentApplicationCoaching`，不再调用旧 `requestStudentPositionCoaching` ✅ |
| Step1-F7 | 学生端查看详情 + 修改弹窗 | ✅ 已完成 | 详情弹窗、修改弹窗、刷新对应行 | `getStudentApplicationCoachingClassRecords` / `updateStudentApplicationCoaching` 接入 ✅；过滤 `vue-tsc` 确认本次改动文件无 TS 错误 ✅ |
| Step1-F8 | 测试与回归 | ✅ 已完成 | 后端定向测试、学生端测试/类型检查、关键 grep | 后端定向测试/编译 ✅；前端目标契约测试 ✅；关键 grep ✅；student build 已收口：`pnpm --filter @osg/student build` ✅ |

### 3.8 第一批 fix plan：Step1-F1 后端列表接口返回 application + coachings

Root Cause / Current State:

- 根因：学生端列表接口仍停留在旧 application 扁平模型，`selectStudentApplicationRecords` 只查 `osg_job_application`，没有组装该 application 下的 `osg_coaching` 子列表；最近评分和已上报课消数也没有从 `reference_type='job_coaching' + reference_id=coaching_id` 计算。

修改文件：

- `ruoyi-system/src/main/java/com/ruoyi/system/service/IPositionService.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/mapper/OsgClassRecordMapper.java`
- `ruoyi-system/src/main/resources/mapper/system/OsgClassRecordMapper.xml`
- `ruoyi-system/src/test/java/com/ruoyi/system/service/impl/PositionServiceImplTest.java`

具体修改：

- 在 `PositionServiceImpl` 注入 `OsgCoachingMapper` 与 `OsgClassRecordMapper`。
- `selectApplicationList` 保持父级 application 列表入口不变，但为每条 application 追加 `coachings` 数组。
- 每个 coaching 子项至少输出：`coachingId`、`applicationId`、`interviewStage`、`interviewStageLabel`、`interviewTime`、`city`、`cityLabel`、`companyInterviewer`、`mentorNames`、`status`、`latestRating`、`reportedLessonCount`。
- 新增按 coaching 批量读取课消记录的 Mapper 方法，过滤条件固定为 `reference_type='job_coaching' AND reference_id IN (...) AND del_flag='0'`。
- `latestRating` 只从 `member_status='normal'` 且 `rate` 非空的课消中，按 `class_date DESC` 取第一条。
- `reportedLessonCount` 统计当前 `coaching_id` 下全部 job_coaching 课消记录，包含旷课。
- 保持父级 `application_id` 行维度，不在 Step1-F1 改新增/修改接口和前端展开 UI。

影响范围：

- 影响学生端 `GET /student/application/list` 返回结构：在旧字段不删除的前提下新增 `coachings`，降低前端旧代码回归风险。
- 不改变 `POST /student/position/coaching`，该旧申请路径留到 Step1-F2 统一切换。
- 不改变班主任/导师/助教/后台接口。

验收标准：

- 同一个 application 下可返回多条 coaching。
- 每条 coaching 的 `latestRating` 与 `reportedLessonCount` 按当前 `coaching_id` 独立计算。
- 没有 coaching 的 application 返回 `coachings: []`。
- 学生只能看到自己的 application 及其下属 coachings。

验证命令：

```bash
mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest -q
mvn -pl ruoyi-system -DskipTests compile -q
```

确认门：

- 已确认并完成 Step1-F1。

执行记录（2026-05-09）：

- 已为 `PositionServiceImplTest` 增加 RED 用例 `selectApplicationListAttachesCoachingsWithRatingsByCoachingReference`。
- RED 证据：`mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest#selectApplicationListAttachesCoachingsWithRatingsByCoachingReference -q` 首次失败，原因是列表行缺少 `coachings`。
- 实现后 `GET /student/application/list` 的每条 application 追加 `coachings` 数组。
- coaching 子项输出 `coachingId`、`applicationId`、`interviewStage`、`interviewStageLabel`、`interviewTime`、`city`、`cityLabel`、`companyInterviewer`、`mentorNames`、`status`、`latestRating`、`reportedLessonCount` 等字段。
- `latestRating` 只从 `member_status='normal'` 且 `rate` 非空的记录中按 `class_date DESC` 取最新值。
- `reportedLessonCount` 统计当前 `coaching_id` 下 `reference_type='job_coaching'` 的 approved 课消记录，包含旷课。
- 实际实现未新增专用 batch mapper 方法，而是在既有 `selectClassRecordList` 增加 `studentId/referenceType/referenceId/delFlag` 过滤，并由 service 按 coaching 查询；后续如数据量上升，可在 Step1-F8 或性能收口批次补批量查询。
- 验证通过：`mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest -q`。
- 验证通过：`mvn -pl ruoyi-system -DskipTests compile -q`。

连续执行说明：

- 用户已授权 Step 1 后续小 fix 连续执行，不再逐批等待确认；仍按 TDD、验证、更新状态表推进。

### 3.9 Step1-F2 后端新增 coaching 申请接口

Root Cause / Current State:

- 根因：学生端旧申请辅导路径仍是 `POST /student/position/coaching` + `positionId`，会把辅导状态覆盖写回 application；缺少以 `application_id` 为父、以 `coaching_id` 为子记录的新建接口。

修改文件：

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgApplicationController.java`
- `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgApplicationControllerTest.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/IPositionService.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`
- `ruoyi-system/src/test/java/com/ruoyi/system/service/impl/PositionServiceImplTest.java`

具体修改：

- 新增 `POST /student/applications/{applicationId}/coachings`，同时保留现有 `/student/application` base path 兼容。
- 新增 `IPositionService.requestApplicationCoaching(applicationId, params, userId)`。
- 新接口按当前登录学生校验 application 归属，非本人 application 抛 `无权访问该求职申请`。
- 新接口创建 `osg_coaching` 子记录，写入 `applicationId`、`studentId`、`interviewStage`、`interviewTime`、`city`、`companyInterviewer`、`requestedMentorCount`、`requestNote`、`status='pending'`。
- 新接口不调用 `updateJobApplicationCoaching`，避免继续用 application 字段覆盖表达本次辅导申请。

验收标准：

- 同一 application 可连续生成多个不同 `coaching_id`。
- 非本人 application 被拒绝，且不插入 coaching。
- controller 能把 `{applicationId}` 与请求 body 委托到 service。

执行记录（2026-05-10）：

- RED 证据：`mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest#requestApplicationCoachingCreatesChildCoachingForOwnedApplication -q` 首次失败，原因是 `requestApplicationCoaching(...)` 方法不存在。
- GREEN 验证通过：`mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest#requestApplicationCoachingCreatesChildCoachingForOwnedApplication+requestApplicationCoachingRejectsOtherStudentApplication -q`。
- 后端 service 回归通过：`mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest -q`。
- controller 验证通过：`mvn -pl ruoyi-admin -am test -Dtest=OsgApplicationControllerTest,StudentPositionControllerTest -Dsurefire.failIfNoSpecifiedTests=false -q`。
- reactor 编译通过：`mvn -pl ruoyi-admin -am -DskipTests compile -q`。

### 3.10 Step1-F3 后端修改 coaching 面试时间/公司面试官接口

Root Cause / Current State:

- 根因：学生端缺少以 `application_id + coaching_id` 为锚点的白名单修改接口，不能安全地只修改阶段级辅导申请的可编辑字段。

修改文件：

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgApplicationController.java`
- `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgApplicationControllerTest.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/IPositionService.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`
- `ruoyi-system/src/test/java/com/ruoyi/system/service/impl/PositionServiceImplTest.java`

具体修改：

- 新增 `PUT /student/applications/{applicationId}/coachings/{coachingId}`。
- 新增 `IPositionService.updateApplicationCoaching(applicationId, coachingId, params, userId)`。
- 先校验 application 属于当前学生，再校验 coaching 属于同一 application 与同一 student。
- 只从请求体读取并 patch `interviewTime` 与 `companyInterviewer`。
- 忽略请求体里的 `interviewStage`、`requestedMentorCount`、`status` 等非白名单字段。

验收标准：

- 可修改当前学生自己的 coaching 的面试时间与公司面试官。
- 非当前 application 下的 coaching 被拒绝，且不调用 update。
- 非白名单字段不会被 patch。

执行记录（2026-05-10）：

- RED 证据：`mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest#updateApplicationCoachingOnlyPatchesInterviewTimeAndCompanyInterviewer -q` 首次失败，原因是 `updateApplicationCoaching(...)` 方法不存在。
- GREEN 验证通过：`mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest#updateApplicationCoachingOnlyPatchesInterviewTimeAndCompanyInterviewer+updateApplicationCoachingRejectsCoachingOutsideApplication -q`。
- 后端 service 回归通过：`mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest -q`。
- controller 验证通过：`mvn -pl ruoyi-admin -am test -Dtest=OsgApplicationControllerTest,StudentPositionControllerTest -Dsurefire.failIfNoSpecifiedTests=false -q`。
- reactor 编译通过：`mvn -pl ruoyi-admin -am -DskipTests compile -q`。

### 3.11 Step1-F4 后端 coaching 详情/课消详情接口

Root Cause / Current State:

- 根因：学生端缺少按 `coaching_id` 查询课消详情的接口，旧口径容易按 application 维度串到其他阶段辅导记录。

修改文件：

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgApplicationController.java`
- `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgApplicationControllerTest.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/IPositionService.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`
- `ruoyi-system/src/test/java/com/ruoyi/system/service/impl/PositionServiceImplTest.java`

具体修改：

- 新增 `GET /student/applications/{applicationId}/coachings/{coachingId}/class-records`。
- 新增 `IPositionService.selectApplicationCoachingClassRecords(applicationId, coachingId, userId)`。
- 先校验 application 属于当前学生，再校验 coaching 属于同一 application 与 student。
- 课消查询复用 `loadCoachingClassRecords`，固定 `reference_type='job_coaching'`、`reference_id=coaching_id`、`student_id=currentStudent`、`status='approved'`、`del_flag='0'`。
- 返回 `latestRating`、`reportedLessonCount` 与 `records` 列表。

验收标准：

- 只返回当前 `coaching_id` 下的 job_coaching 课消记录。
- 不同 coaching/application 不串。
- `latestRating` 只取 normal 且 rate 非空的最新评分；`reportedLessonCount` 包含旷课。

执行记录（2026-05-10）：

- RED 证据：`mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest#selectApplicationCoachingClassRecordsUsesCoachingReferenceOnly -q` 首次失败，原因是 `selectApplicationCoachingClassRecords(...)` 方法不存在。
- GREEN 验证通过：`mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest#selectApplicationCoachingClassRecordsUsesCoachingReferenceOnly+selectApplicationCoachingClassRecordsRejectsCoachingOutsideApplication -q`。
- 后端 service 回归通过：`mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest -q`。
- controller 验证通过：`mvn -pl ruoyi-admin -am test -Dtest=OsgApplicationControllerTest,StudentPositionControllerTest -Dsurefire.failIfNoSpecifiedTests=false -q`。
- reactor 编译通过：`mvn -pl ruoyi-admin -am -DskipTests compile -q`。

### 3.12 Step1-F5~F7 学生端展开行、新申请接口、详情/修改弹窗

Root Cause / Current State:

- 根因：学生端页面仍以 application 扁平行表达辅导状态，申请辅导仍使用旧 `positionId` 路径；缺少以 `coaching_id` 为锚点的展开行、详情和修改入口。

修改文件：

- `osg-frontend/packages/shared/src/api/applications.ts`
- `osg-frontend/packages/shared/src/__tests__/applications-api.spec.ts`
- `osg-frontend/packages/student/src/views/applications/index.vue`
- `osg-frontend/packages/student/src/__tests__/applications.spec.ts`

具体修改：

- shared API 增加 `StudentApplicationCoachingRecord`、`StudentApplicationCoachingClassRecord`、`coachings` 字段与 3 个 application-scoped coaching API：
  - `requestStudentApplicationCoaching(applicationId, payload)`
  - `updateStudentApplicationCoaching(applicationId, coachingId, payload)`
  - `getStudentApplicationCoachingClassRecords(applicationId, coachingId)`
- 学生端 application 表增加 `expanded-row-render="renderApplicationCoachings"`，展开行展示 `coachings` 子列表。
- 无 coaching 时显示 `暂无阶段辅导申请` 空态。
- 申请辅导从旧 `requestStudentPositionCoaching(positionId, ...)` 切到 `requestStudentApplicationCoaching(applicationId, ...)`。
- 新增 coaching 详情弹窗，按 `applicationId + coachingId` 拉取课消详情。
- 新增 coaching 修改弹窗，仅提交 `interviewTime` 与 `companyInterviewer`。

验收标准：

- 主表仍展示 application 父记录。
- 展开行展示同一 application 下多条 coaching。
- 连续申请多个阶段后，前端调用新接口生成多条 `coaching_id`。
- 查看详情和修改均按 `coaching_id`，不影响阶段/导师/状态/评分等非白名单字段。

执行记录（2026-05-10）：

- RED 证据：`pnpm --filter @osg/shared test -- applications-api.spec.ts` 首次失败，原因是 shared API 缺少 `StudentApplicationCoachingRecord` 与新 application-scoped endpoints。
- RED 证据：`pnpm --filter @osg/student test -- applications.spec.ts` 首次失败，包含本次新增 contract 缺失；同时暴露既有无关 `positions.spec.ts` 契约失败噪音。
- GREEN 验证通过：`pnpm --filter @osg/shared test -- applications-api.spec.ts`，30 files / 372 passed / 1 todo。
- GREEN 验证通过：`pnpm --filter @osg/student exec vitest run src/__tests__/applications.spec.ts`，1 file / 5 passed / 1 skipped。
- 关键 grep 通过：学生页只存在 `requestStudentApplicationCoaching`、`updateStudentApplicationCoaching`、`getStudentApplicationCoachingClassRecords`，不再出现旧 `requestStudentPositionCoaching`。
- `pnpm --filter @osg/student build` 失败，失败原因集中在既有无关文件：`ClassReportFlowModal/*`、`InterviewCalendar.vue`、`courses/index.vue`、`mock-practice/index.vue`、`positions/index.vue` 等 TS7006/TS6133/TS2322 问题。
- 过滤检查通过：`pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false 2>&1 | grep -E "src/views/applications/index.vue|shared/src/api/applications.ts" || true` 无输出，说明本次改动文件未产生 TS 错误。

### 3.13 Step1-F8 测试与回归

最终回归范围：

- 后端 service 定向回归。
- 后端 controller 定向回归。
- 后端 reactor 编译。
- 前端 shared API contract。
- 前端 student applications contract。
- 关键 grep：确认学生端 application 主路径不再使用旧 position-scoped coaching API。
- 关键 grep：确认后端课消口径为 `job_coaching + coaching_id`。

执行记录（2026-05-10）：

- `mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest -q && echo "PositionServiceImplTest exit=0"`：通过，输出 `PositionServiceImplTest exit=0`。
- `mvn -pl ruoyi-admin -am test -Dtest=OsgApplicationControllerTest,StudentPositionControllerTest -Dsurefire.failIfNoSpecifiedTests=false -q && echo "application controller tests exit=0"`：通过，输出 `application controller tests exit=0`。
- `mvn -pl ruoyi-admin -am -DskipTests compile -q && echo "ruoyi-admin reactor compile exit=0"`：通过，输出 `ruoyi-admin reactor compile exit=0`。
- `pnpm --filter @osg/shared test -- applications-api.spec.ts && echo "shared applications-api contract exit=0"`：通过，30 files / 372 passed / 1 todo，输出 `shared applications-api contract exit=0`。
- `pnpm --filter @osg/student exec vitest run src/__tests__/applications.spec.ts && echo "student applications contract exit=0"`：通过，1 file / 5 passed / 1 skipped，输出 `student applications contract exit=0`。
- `pnpm --filter @osg/student build`：已收口通过，输出 `✓ built in 12.38s`；仅有 Vite chunk size warning。
- 学生页 grep：`requestStudentPositionCoaching` 与 `/student/position/coaching` 在 `student/src/views/applications/index.vue` 中无匹配；新路径 `requestStudentApplicationCoaching`、`updateStudentApplicationCoaching`、`getStudentApplicationCoachingClassRecords` 均存在。
- shared API grep：`StudentApplicationCoachingRecord`、`coachings: StudentApplicationCoachingRecord[]`、`/student/applications/${applicationId}/coachings`、`/student/applications/${applicationId}/coachings/${coachingId}`、`/student/applications/${applicationId}/coachings/${coachingId}/class-records` 均存在。
- 后端 service grep：`REFERENCE_TYPE_JOB_COACHING`、`loadCoachingClassRecords`、`requestApplicationCoaching`、`updateApplicationCoaching`、`selectApplicationCoachingClassRecords` 均存在。
- 后端 controller grep：`POST /{applicationId}/coachings`、`PUT /{applicationId}/coachings/{coachingId}`、`GET /{applicationId}/coachings/{coachingId}/class-records` 均存在。

结论：

- Step 1 学生端阶段级辅导申请闭环（application 父记录 + coaching 子记录 + coaching_id 详情/修改/课消）已完成。
- student 全量 build 阻塞已在 Build 收口批次修复，Step 1 学生端闭环具备可构建交付证据。

---

## 4. Step 2：班主任端闭环

### 4.1 原始需求段

班主任端包含两类需求：

1. 求职总览；
2. 模拟应聘管理。

### 4.2 求职总览一次性闭环范围

- 三栏：我管理的学员 / 待辅导的学员 / 待分配导师；
- 默认打开我管理的学员；
- 面试日历只在我管理的学员中显示；
- 删除顶部不需要的筛选；
- 行维度使用 `coaching_id`；
- 最近评分按 `coaching_id`；
- 已上报课消数按 `coaching_id`；
- 查看详情按 `coaching_id`；
- 分配导师按 `coaching_id`；
- 分配导师数量必须等于申请导师数量；
- 上报课消预填当前 `coaching_id`；
- 班主任端求职总览测试。

### 4.3 模拟应聘管理一次性闭环范围

- 删除统计卡片；
- 三栏：我管理的学员 / 待辅导的学员 / 待分配导师；
- 默认第一栏；
- 类型筛选；
- 课消详情；
- 上报课消；
- 分配导师数量限制；
- 班主任端模拟应聘测试。

### 4.4 对应文档

- `02-job-overview-coaching-anchor-revision.md`
- `04-mock-practice-management.md`

### 4.5 建议状态

第二优先级。

班主任端是分配导师和管理视角的核心端，应在学生端之后闭环。

### 4.6 Step 2-A 短审计（2026-05-10）

Current State:

- `GET /lead-mentor/job-overview/list` 仍由 `OsgLeadMentorJobOverviewController.list` 调用 `IOsgUserJobOverviewService.listByLeadMentor(scope, query, userId)`，返回结构只约定 `applicationId`，没有 `coachingId`。
- `OsgUserJobOverviewServiceImpl.selectOverviewListInternal` 当前先查 `OsgJobApplication` 列表，再用 `selectCoachingMap()` 以 `applicationId -> OsgCoaching` 取单条 coaching；`selectCoachingMap()` 对同一 application 多条 coaching 会按 `applicationId` 覆盖，只保留一条。
- `toOverviewPayload(application, coaching)` 当前输出父 application 字段为主：`applicationId`、`currentStage`、`interviewTime`、`requestedMentorCount`、`submittedAt`；未输出 `coachingId`，且阶段、城市、面试时间、申请导师数仍优先来自 application。
- 三栏 scope 仍围绕 application 过滤：`pending/managed` 用 `leadMentorId` 查 application，`coaching` 用 `resolveCoachingApplicationIds(currentUserId)` 得到 applicationId set 后再回查 application。
- `GET /lead-mentor/job-overview/{applicationId}` 仍按 applicationId 调 `detailForLeadMentor(applicationId, userId)`；详情内部 `detailForCoachingUser` 使用 `coachingMapper.selectCoachingByApplicationId(applicationId)`，只取该 application 最新一条 coaching。
- `POST /lead-mentor/job-overview/{applicationId}/assign-mentor` 仍按 applicationId 调 `assignMentors(applicationId, ...)`；内部用 `selectCoachingByApplicationId(applicationId)`，找不到时还会新建 coaching，不符合学生端 Step 1 已建立的“一次申请一条 coaching”口径。
- 最近评分、已上报课消数、详情分组仍使用 `classRecordMapper.selectByApplicationReference(applicationId)`；该 mapper 固定 `reference_type='application' AND reference_id=applicationId`。
- 班主任前端 `career/job-overview/index.vue` 三张表的 `row-key` 均为 `applicationId`，`OverviewRow/PendingRow` 类型也没有 `coachingId`。
- 班主任前端详情、分配导师、阶段确认主路径仍传 `applicationId`：`getLeadMentorJobOverviewDetail(row.applicationId)`、`assignLeadMentorJobOverviewMentor(activeAssignApplicationId, payload)`、`acknowledgeLeadMentorJobOverviewStage(row.applicationId)`。
- 班主任前端「待辅导的学员」上报课消入口已有可复用 shared 包装：`LeadMentorClassReportFlowModal` 包装 `@osg/shared/components/ClassReportFlowModal`；但当前预填仍是 `prefilledReferenceType: 'application'`、`prefilledReferenceId: record.applicationId`。
- 现有测试仍锁定旧口径：`OsgLeadMentorJobOverviewControllerTest` 断言列表/详情/分配返回 `applicationId`，`OsgUserJobOverviewServiceImplTest` 直接测试 `computeApplicationStats(applicationId)` 与 `selectByApplicationReference`，前端 `job-overview-shell/real-flow/detail-modal/assign-mentor-modal` mock 数据也只有 `applicationId`。

Root Cause:

- 根因不是单个接口漏字段，而是班主任求职总览主链仍把 `application` 当业务行，`coaching` 只作为 application 的附加状态读取；Step 1 学生端已允许一个 application 下多条 coaching 后，该主链会天然丢行、串统计、串详情和误分配。

Audit Answers:

1. 现在列表接口是否仍按 application 返回行？是。`selectOverviewListInternal` 主列表是 `List<OsgJobApplication>`，再拼一条 coaching。
2. 现在 row key 是否仍是 applicationId？是。三张 `<a-table>` 均使用 `r.applicationId`。
3. 现在详情接口是否仍按 applicationId 查课消？是。路径是 `/{applicationId}`，详情分组用 `selectByApplicationReference(applicationId)`。
4. 现在分配导师接口是否仍按 applicationId？是。路径和 service 签名都是 `applicationId`，内部按 application 查/建 coaching。
5. 现在最近评分/课消数是否仍用 `reference_type=application`？是。`computeApplicationStats` 固定调用 `selectByApplicationReference(applicationId)`。
6. 前端是否已有 shared `ClassReportFlowModal` / 上报课消入口可以复用？有。班主任页已接入 `LeadMentorClassReportFlowModal`，但预填 reference 仍需从 application 改为 `job_coaching + coachingId`。
7. 现有测试 baseline 是什么？测试资产存在但锁旧口径；本次第一批必须先新增/改后端 service/controller 定向测试来暴露“同一 application 多 coaching 多行、评分/课消按 coaching 隔离”的失败。前端旧 mock 只含 applicationId，属于后续 F4~F7 需同步修的旧口径测试，不属于 F1 第一批必须改。

### 4.7 Step 2-A 小 fix 状态跟踪

| 编号 | 小 fix | 状态 | 范围 | 验证/备注 |
|---|---|---|---|---|
| Step2A-F0 | 短审计 + 状态跟踪区 | ✅ 已完成 | 文档 | 已审计当前 application/coaching 口径残留，并写入本状态表与第一批方案；代码修改等待用户确认 |
| Step2A-F1 | 后端列表改为 coaching 行维度 | ✅ 已完成 | backend | `mvn -pl ruoyi-system test -Dtest=OsgUserJobOverviewServiceImplTest -q` ✅；`mvn -pl ruoyi-admin -am test -Dtest=OsgLeadMentorJobOverviewControllerTest -Dsurefire.failIfNoSpecifiedTests=false -q` ✅；`mvn -pl ruoyi-admin -am -DskipTests compile -q` ✅ |
| Step2A-F2 | 后端详情按 coaching_id 查询课消 | ✅ 已完成 | backend | `detailForLeadMentor` 内部按 `coachingId` 查 `job_coaching` 课消；新增 `/lead-mentor/job-overview/coaching/{coachingId}`；service/controller 定向测试与编译 ✅ |
| Step2A-F3 | 后端分配导师按 coaching_id + 数量校验 | ✅ 已完成 | backend | 新增 `/lead-mentor/job-overview/coaching/{coachingId}/assign-mentor`；强制 `mentorIds.size()==requestedMentorCount`；只更新目标 coaching；service/controller 定向测试与编译 ✅ |
| Step2A-F4 | 班主任前端表格三栏接入 coaching 行 | ✅ 已完成 | frontend | 三栏表格 `rowKey` 改为 `coachingId ?? applicationId`；补同 application 多 coaching row RED；同步 shared 类型与 LM 课消 modal 调用契约；`job-overview-shell + story-s042` 8/8、`vue-tsc --noEmit`、`pnpm --filter @osg/lead-mentor build` ✅ |
| Step2A-F5 | 查看详情弹窗按 coaching_id | ✅ 已完成 | frontend | 课消详情抽屉按 `coachingId` 优先调用 `/lead-mentor/job-overview/coaching/{coachingId}`，保留 application fallback；新增 F5 RED 并转绿；`job-overview-shell + story-s042` 9/9、`vue-tsc --noEmit`、`pnpm --filter @osg/lead-mentor build` ✅ |
| Step2A-F6 | 分配导师弹窗按 coaching_id + 数量限制 | ⏳ 待开始 | frontend | 数量不一致不能提交 |
| Step2A-F7 | 上报课消入口预填 job_coaching/coaching_id | ⏳ 待开始 | frontend/shared integration | 从待辅导栏打开时锁定当前 coaching |
| Step2A-F8 | 测试与回归 | ⏳ 待开始 | all | backend/frontend/grep/build |

### 4.8 第一批 fix plan：Step2A-F0 + Step2A-F1

#### Step2A-F0：短审计 + 状态跟踪区

Root Cause / Current State:

- 当前班主任求职总览仍是 application 行模型，关键旧口径证据见 §4.6。

已完成内容：

- 已完成短审计。
- 已建立 Step2A-F0~F8 状态表。
- 已将第一批代码修改范围限定为后端列表 F1，不碰前端、详情、分配导师、上报课消、模拟应聘管理。

确认门：

- F0 文档工作已完成；下一步 F1 代码修改必须等待用户确认。

#### Step2A-F1：后端列表改为 coaching 行维度

Root Cause / Current State:

- `listByLeadMentor` 当前把 application 当行，`selectCoachingMap()` 以 `applicationId` 聚合到单条 coaching；同一 application 下多条 coaching 会被覆盖，列表无法返回多行。
- `toOverviewPayload` 未输出 `coachingId`，统计仍按 `applicationId` 查 `reference_type='application'`，会导致最近评分和课消数在同一岗位不同阶段之间串数据。

修改文件：

- `ruoyi-system/src/main/java/com/ruoyi/system/service/IOsgUserJobOverviewService.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgUserJobOverviewServiceImpl.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/mapper/OsgClassRecordMapper.java`
- `ruoyi-system/src/main/resources/mapper/system/OsgClassRecordMapper.xml`
- `ruoyi-system/src/test/java/com/ruoyi/system/service/impl/OsgUserJobOverviewServiceImplTest.java`
- `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgLeadMentorJobOverviewControllerTest.java`

具体修改：

- 新增或改造后端列表组装逻辑：以 `OsgCoaching` 为主行，按每条 coaching 的 `applicationId` 补 application 父字段。
- 每行至少输出：`coachingId`、`applicationId`、`studentId`、`studentName`、`companyName`、`positionName`、`currentStage/interviewStage`、`interviewTime`、`city/cityLabel`、`requestedMentorCount`、`mentorNames`、`coachingStatus`、`submittedAt`、`latestRating`、`lessonCount`、`lessonReported`。
- 三栏列表语义改为：
  - `managed`：当前班主任管理的 application 下所有 coachings。
  - `coaching`：当前班主任作为辅导者被分配的 coachings。
  - `pending`：当前班主任管理范围内 `status='pending'` 且未分配导师的 coachings。
- 列表筛选改为作用在 coaching 行：公司仍来自 application；阶段、面试时间、城市、申请导师数优先来自 coaching；`lessonReported` 按当前 coaching 的 `lessonCount` 判断。
- 新增按 `reference_type='job_coaching' AND reference_id=coachingId` 查询课消记录的 Mapper/service 方法；F1 只用于列表统计，不改详情接口。
- `latestRating` 只取当前 `coachingId` 下 `member_status='normal'` 且 `rate` 非空的最新评分。
- `lessonCount` 统计当前 `coachingId` 下全部 `job_coaching` 课消记录，包含旷课。
- 保留 `applicationId` 作为父字段，避免后续 F4 前端接入时丢失父岗位信息。
- 不新增 `as any`，不修改导师端/助教端/后台/学生端，不触碰 Step2-B 模拟应聘管理。

影响范围：

- 影响 `GET /lead-mentor/job-overview/list` 的返回结构：新增 `coachingId` 并把行维度从 application 改为 coaching。
- 不改变 F1 之外接口：`GET /lead-mentor/job-overview/{applicationId}`、`POST /assign-mentor`、上报课消预填仍留到 F2~F7。
- Mentor 端当前 `listByMentor` 复用 `selectOverviewListInternal(SCOPE_COACHING, ...)`，F1 实施时必须避免把导师端行为作为本批交付范围；如共享方法不可避免影响导师端，需要在测试/说明中标注并保持兼容字段。

验收标准：

- 同一 application 下两条 coaching 在 `managed` 列表返回两行，且 `applicationId` 相同、`coachingId` 不同。
- `pending` 只返回未分配导师的 pending coaching，而不是所有 `requestedMentorCount > 0` 的 application。
- `coaching` 只返回当前班主任在 `mentor_ids` 中的 coaching。
- `latestRating` 和 `lessonCount` 按当前 `coachingId` 独立统计，不串同一 application 下其它 coaching。
- `lessonReported=false/true` 按当前 coaching 的课消数过滤。
- controller 定向测试仍通过，并新增断言 `rows[*].coachingId`。

建议 RED 用例：

- `listByLeadMentorReturnsOneRowPerCoachingForSameApplication`
- `listByLeadMentorComputesStatsByJobCoachingReference`
- `listByLeadMentorPendingScopeUsesPendingUnassignedCoaching`
- `listControllerReturnsCoachingIdForLeadMentorRows`

验证命令：

```bash
mvn -pl ruoyi-system test -Dtest=OsgUserJobOverviewServiceImplTest -q
mvn -pl ruoyi-admin -am test -Dtest=OsgLeadMentorJobOverviewControllerTest -Dsurefire.failIfNoSpecifiedTests=false -q
mvn -pl ruoyi-admin -am -DskipTests compile -q
```

确认门：

- 已确认并完成 Step2A-F1。

完成证据：

- RED：新增 service/controller 定向用例后，旧实现失败 3 个预期断言：同一 application 多 coaching 只返回 1 行、`coachingId` 为空、pending 仍按 application 判断。
- GREEN：`GET /lead-mentor/job-overview/list` 后端组装改为优先输出 coaching 行；每个 coaching row 返回 `coachingId`，阶段/面试时间/城市/申请导师数优先来自 coaching。
- 统计：coaching 行的 `latestRating`、`lessonCount`、`lessonReported` 改为按 `reference_type='job_coaching' + reference_id=coachingId` 查询；无 coaching 的 legacy fallback 行仍保留 application reference 兼容旧数据。
- 验证：后端 service 定向测试、controller 定向测试、admin 聚合编译均通过。

---

## 5. Step 3：导师端闭环

### 5.1 原始需求段

导师端包含：

- 求职总览待辅导学员；
- 模拟应聘管理；
- 上报课消；
- 课程排期按钮显示问题。

### 5.2 求职总览一次性闭环范围

- 只显示一栏「待辅导的学员」；
- 行维度使用 `coaching_id`；
- 显示学生 ID、姓名、岗位、公司、城市、面试阶段、面试时间、已上报课消数；
- 操作：上报课消；
- 上报课消预填当前 `coaching_id`；
- 已上报课消数按当前 `coaching_id` 统计。

### 5.3 模拟应聘管理一次性闭环范围

- 删除统计卡片；
- 筛选：公司、面试阶段、面试时间、是否上报课消；
- 列：学生 ID、学生姓名、类型、分配时间、已上报课消数；
- 操作：上报课消；
- 数据范围只包含当前导师被分配记录。

### 5.4 课程排期问题

导师端课程排期按钮显示问题建议作为导师端闭环内的独立 UI fix 处理。

如果排期强制弹窗也要做，需与班主任端共享规则，不能只在导师端做一半。

### 5.5 对应文档

- `02-job-overview-coaching-anchor-revision.md`
- `03-class-report-reference-revision.md`
- `04-mock-practice-management.md`
- `05-admin-and-student-profile-followups.md`

### 5.6 建议状态

第三优先级。

导师端强依赖前面的 `coaching_id` 与 shared 课消弹窗底座。

---

## 6. Step 4：助教端闭环

### 6.1 原始需求段

助教端包含：

- 求职总览我管理的学员；
- 模拟应聘管理我管理的学员；
- 查看详情；
- 课消详情复用。

### 6.2 求职总览一次性闭环范围

- 只显示一栏「我管理的学员」；
- 行维度使用 `coaching_id`；
- 显示学生 ID、姓名、岗位、公司、城市、面试阶段、面试时间、导师、最近评分；
- 操作：查看详情；
- 最近评分按 `coaching_id`；
- 详情按 `coaching_id`。

### 6.3 模拟应聘管理一次性闭环范围

- 删除统计卡片；
- 只显示一栏「我管理的学员」；
- 筛选：类型；
- 列：学生 ID、学生姓名、类型、申请时间、辅导老师、已上报课消数；
- 操作：详情；
- 详情展示导师上报的多条课消反馈。

### 6.4 对应文档

- `02-job-overview-coaching-anchor-revision.md`
- `04-mock-practice-management.md`

### 6.5 建议状态

第四优先级。

助教端主要是管理视角和详情视角，建议在学生端、班主任端、导师端稳定后做。

---

## 7. Step 5：后台闭环

### 7.1 原始需求段

后台包含：

- 模拟应聘管理默认显示全部记录；
- 学生自添岗位审核；
- 导师列表审核不了变更信息。

### 7.2 模拟应聘管理一次性闭环范围

- 默认显示全部记录；
- 保留筛选；
- 支持查看详情；
- 若后台也有分配导师能力，则同样执行导师数量限制。

### 7.3 学生自添岗位审核一次性闭环范围

- 学生提交自添岗位后生成待审核记录；
- 后台可合并已有岗位；
- 后台可新增岗位；
- 审核结果回写学生求职记录；
- 保留审核人、审核时间、目标岗位。

### 7.4 导师变更信息审核

该项建议先按 bug 单独定位。

闭环内容：

- 找到变更信息来源；
- 修复审核入口或接口；
- 补权限和状态校验；
- 补回归测试。

### 7.5 对应文档

- `04-mock-practice-management.md`
- `05-admin-and-student-profile-followups.md`

### 7.6 建议状态

第五优先级。

后台需求相对独立，建议在核心五端辅导链路稳定后处理。

---

## 8. Step 6：跨端回归与验收

按端闭环后，最后做跨端回归。

### 8.1 必测主链

```text
学生端申请岗位阶段辅导
→ 班主任端待分配看到该 coaching
→ 班主任端按申请导师数量分配导师
→ 导师端待辅导看到该 coaching
→ 导师端上报课消
→ 学生端展开行看到最近评分和详情
→ 班主任/助教端详情口径一致
```

### 8.2 必测隔离

同一个 application 下创建两条 coaching：

- First Round
- Second Round

分别分配不同导师并上报课消。

验证：

- 两条 coaching 的课消数不串；
- 最近评分不串；
- 详情不串；
- 导师端只看到自己被分配的 coaching。

---

## 9. 原始需求按端索引

| 端 | 原始需求段 | 对应文档 | 建议阶段 | 备注 |
|---|---|---|---|---|
| 学生端 | 我的求职列表、申请辅导、展开辅导记录、查看详情、修改 | `01-student-applications.md` | Step 1 | 第一优先级，一次做完 |
| 学生端 | 修改信息页面字段走字典 | `05-admin-and-student-profile-followups.md` | Step 5 或独立 Story | 不属于辅导主链 |
| 学生端 | 自添岗位提交后后台审核 | `05-admin-and-student-profile-followups.md` | Step 5 | 与后台审核一起闭环 |
| 班主任端 | 求职总览三栏、分配导师、查看详情、上报课消 | `02-job-overview-coaching-anchor-revision.md` | Step 2 | 需要 coaching 锚点修订 |
| 班主任端 | 模拟应聘管理三栏、详情、上报课消、分配导师 | `04-mock-practice-management.md` | Step 2 | 可与班主任求职总览同批 |
| 班主任端 | 未填写课程排期强制弹窗 | `05-admin-and-student-profile-followups.md` | Step 3 或独立 Story | 需与导师端共享规则 |
| 导师端 | 求职总览待辅导、上报课消 | `02-job-overview-coaching-anchor-revision.md` | Step 3 | 依赖 shared 课消弹窗 |
| 导师端 | 模拟应聘管理、上报课消 | `04-mock-practice-management.md` | Step 3 | 按导师被分配范围 |
| 导师端 | 课程排期按钮显示问题 | `05-admin-and-student-profile-followups.md` | Step 3 或独立 fix | UI 问题单独验收 |
| 导师端 | 未填写课程排期强制弹窗 | `05-admin-and-student-profile-followups.md` | Step 3 或独立 Story | 与班主任端同规则 |
| 助教端 | 求职总览我管理的学员、查看详情 | `02-job-overview-coaching-anchor-revision.md` | Step 4 | 管理视角 |
| 助教端 | 模拟应聘管理我管理的学员、详情 | `04-mock-practice-management.md` | Step 4 | 管理视角 |
| 三端共用 | 课消上报弹窗、reference 修订、validator | `03-class-report-reference-revision.md` | Step 0 + 各端验收 | 作为底座先修，端内再验收 |
| 后台 | 模拟应聘管理默认全部记录 | `04-mock-practice-management.md` | Step 5 | 后台独立闭环 |
| 后台 | 学生自添岗位审核：合并/新增 | `05-admin-and-student-profile-followups.md` | Step 5 | 独立审核流 |
| 后台 | 导师列表审核不了变更信息 | `05-admin-and-student-profile-followups.md` | Step 5 或独立 fix | 先定位 bug |

---

## 10. 执行建议

### 10.1 不建议的方式

不建议这样做：

```text
先只做学生端 UI
后面做班主任端时再回来改学生端接口
再做课消时又回来改学生端详情
```

这样会导致一个端做两遍甚至三遍。

### 10.2 推荐方式

推荐这样做：

```text
先完成全局底座
然后学生端一次性闭环
然后班主任端一次性闭环
然后导师端一次性闭环
然后助教端一次性闭环
最后后台和跨端回归
```

每个端闭环标准：

- 页面完成；
- 接口完成；
- 权限完成；
- 统计口径完成；
- 详情完成；
- 测试完成；
- 不留下已知需要回头补的主链功能。

---

## 11. 总结

最合适的交付方式是：

```text
全局底座先行，按端闭环交付。
```

这样既避免跨端底座重复返工，也满足“做完一个端，这个端就直接完事”的目标。
