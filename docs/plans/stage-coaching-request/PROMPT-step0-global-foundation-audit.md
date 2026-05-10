# Prompt：Step 0 全局底座现状审计与最小改造切分

> **已更新推进策略**：如果目标是更快开发且不降低质量，请优先使用：
>
> `docs/plans/stage-coaching-request/PROMPT-step0-small-fix-pr-workflow.md`
>
> 该新版提示词采用「小 fix / 小 PR」方式：不走完整 Story/Ticket 拆分，但每个小任务独立根因分析、独立验证、独立状态标记、独立 commit。

请复制以下内容给 Claude Code 执行。

---

```md
你现在接手 OSGPrj 项目。请从「阶段级辅导申请」主线的 Step 0 开始。

项目根目录：

/Users/hw/workspace/OSGPrj

## 当前背景

现有主线方案文档是：

```text
docs/plans/2026-05-09-lead-mentor-job-overview-and-class-report-plan.md
```

该主线已支撑 S-053~S-056 的 Story/Ticket 和大量实现，不能推倒重来。

我后来补充了新的方案目录：

```text
docs/plans/stage-coaching-request/
```

请按顺序阅读：

1. `docs/plans/stage-coaching-request/00-overview.md`
2. `docs/plans/stage-coaching-request/06-requirement-index-by-end.md`
3. `docs/plans/stage-coaching-request/01-student-applications.md`
4. `docs/plans/stage-coaching-request/02-job-overview-coaching-anchor-revision.md`
5. `docs/plans/stage-coaching-request/03-class-report-reference-revision.md`
6. `docs/plans/stage-coaching-request/04-mock-practice-management.md`
7. `docs/plans/stage-coaching-request/05-admin-and-student-profile-followups.md`

## 核心产品口径

产品经理已确认：

1. `application` 是学生已求职/已投递的岗位父记录。
2. `coaching` 是学生针对某个岗位、某个面试阶段发起的一次辅导申请。
3. 同一个 `application` 下允许多条 `coaching`。
4. 不同 `coaching` 可以分配不同导师。
5. 岗位辅导的导师、课消详情、最近评分、已上报课消数、查看详情，都应该锚定 `coaching_id`。
6. 新的岗位辅导课消口径应是：

```text
course_type = job_coaching
reference_type = job_coaching
reference_id = coaching_id
```

不是：

```text
reference_type = application
reference_id = application_id
```

## 本次任务目标

本次只做 Step 0：全局底座现状审计 + 最小改造切分。

不要直接开始做学生端页面。

不要直接大改代码。

先确认现在代码、DB、Story/Ticket 已经做到什么程度，再输出一个可执行的 Step 0 实施计划。

## 本次任务必须产出

请新增一份审计与切分文档：

```text
docs/plans/stage-coaching-request/07-step0-global-foundation-audit.md
```

文档必须包含以下内容。

---

# 1. 当前 Story/Ticket 状态

请读取并总结：

- `osg-spec-docs/tasks/STATE.yaml`
- `osg-spec-docs/tasks/stories/S-053.yaml`
- `osg-spec-docs/tasks/stories/S-054.yaml`
- `osg-spec-docs/tasks/stories/S-055.yaml`
- `osg-spec-docs/tasks/stories/S-056.yaml`
- `osg-spec-docs/tasks/stories/S-057.yaml`

重点说明：

- 哪些已经 done / approved；
- 哪些是 pending；
- 哪些 Story/Ticket 明确写死了 `application` 锚点；
- 哪些实现资产可以复用，不能推倒重来。

重点抽样读取这些 ticket：

- `osg-spec-docs/tasks/tickets/T-433.yaml`
- `osg-spec-docs/tasks/tickets/T-500.yaml`
- `osg-spec-docs/tasks/tickets/T-503.yaml`
- `osg-spec-docs/tasks/tickets/T-504.yaml`
- `osg-spec-docs/tasks/tickets/T-520.yaml`
- `osg-spec-docs/tasks/tickets/T-521.yaml`
- `osg-spec-docs/tasks/tickets/T-529.yaml`
- `osg-spec-docs/tasks/tickets/T-530.yaml`

---

# 2. 当前代码锚点审计

请只读审计以下代码，不要修改。

## 后端重点文件

- `ruoyi-system/src/main/java/com/ruoyi/system/domain/OsgCoaching.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/domain/OsgJobApplication.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgUserJobOverviewServiceImpl.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgClassRecordServiceImpl.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgClassReportValidator.java`
- `ruoyi-system/src/main/resources/mapper/system/OsgCoachingMapper.xml`
- `ruoyi-system/src/main/resources/mapper/system/OsgJobApplicationMapper.xml`
- `ruoyi-system/src/main/resources/mapper/system/OsgClassRecordMapper.xml`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorJobOverviewController.java`

## 前端重点文件

- `osg-frontend/packages/student/src/views/applications/index.vue`
- `osg-frontend/packages/shared/src/api/class-records.ts`
- `osg-frontend/packages/shared/src/components/ClassReportFlowModal/`
- `osg-frontend/packages/shared/src/composables/useReferenceFinder.ts`
- `osg-frontend/packages/lead-mentor/src/views/career/job-overview/index.vue`
- `osg-frontend/packages/mentor/src/views/`
- `osg-frontend/packages/assistant/src/views/`

请重点搜索并列出：

- `reference_type = application`
- `referenceType: 'application'`
- `referenceType === 'application'`
- `applicationId`
- `assignMentors(applicationId`
- `confirmCoaching(applicationId`
- `selectByApplicationId`
- `selectCoachingByApplicationId`
- `uk_coaching_application`
- `requestCoaching`
- `reference_id = application_id`
- `job_coaching -> application`

---

# 3. 输出差异矩阵

请在文档中输出表格：

| 模块 | 文件 | 当前实现/口径 | 目标口径 | 风险 | 是否属于 Step 0 |
|---|---|---|---|---|---|

重点分类：

## A. DB / Mapper

确认：

- `osg_coaching.application_id` 是否有唯一约束；
- 是否存在 `uk_coaching_application`；
- 当前 mapper 是否按 `application_id` upsert 单条 coaching；
- 要支持多条 coaching 需要改哪些 SQL。

## B. Domain / DTO

确认：

- `OsgCoaching` 是否已有面试阶段、面试时间、城市、公司面试官、申请导师数量等字段；
- 缺字段时建议补哪些；
- 哪些字段现在放在 `OsgJobApplication` 上但语义应迁到 `OsgCoaching`。

## C. 学生申请辅导

确认：

- 现在 `requestCoaching` 是不是只更新 `osg_job_application`；
- 是否会新增 `osg_coaching`；
- 是否允许同一 application 多次申请。

## D. 求职总览

确认：

- 当前行 key 是 `applicationId` 还是 `coachingId`；
- 最近评分/课消数/详情按什么统计；
- 分配导师接口按什么 ID。

## E. 三端课消上报

确认：

- shared 弹窗岗位辅导 reference 当前是 application 还是 coaching；
- candidates 返回的是 application 还是 coaching；
- validator 是否写死 job_coaching -> application。

---

# 4. Step 0 最小实施包建议

请给出一个最小 Step 0 实施包，但不要执行。

实施包建议按以下顺序拆：

## Step0-T1：DB/Mapper 支持 application 下多 coaching

目标：

- 取消/替换 `application_id` 唯一约束；
- 保留普通索引；
- mapper 不再用 `application_id` upsert 唯一 coaching；
- 支持按 `coaching_id` 查询、更新、分配导师。

## Step0-T2：OsgCoaching 阶段字段补齐

目标：

- 明确面试阶段、面试时间、城市、公司面试官、申请导师数量归属 `OsgCoaching`；
- 不再依赖 `OsgJobApplication.currentStage/interviewTime` 表达每次辅导申请。

## Step0-T3：岗位辅导 reference 常量修订

目标：

- `job_coaching` 对应 `reference_type=job_coaching`；
- 新提交不再写 `reference_type=application`。

## Step0-T4：reference candidates 返回 coaching

目标：

- 岗位辅导候选返回 `coaching_id`；
- 展示文案仍为公司/岗位/阶段/面试时间。

## Step0-T5：validator 改为校验 coaching_id

目标：

- `job_coaching -> job_coaching`；
- 校验 `coaching.student_id`；
- 校验当前上报人是否有权限操作该 coaching。

## Step0-T6：兼容策略

目标：

- 明确旧数据 `reference_type=application` 是否只读兼容；
- 新数据一律使用 `job_coaching`；
- 不自动迁移无法判断归属的旧课消。

---

# 5. 第一批后续端闭环建议

在 Step 0 后，请建议下一步从学生端开始，原因：

- 学生端是 coaching 的创建入口；
- 没有学生端创建多 coaching，后面班主任/导师端无法完整验收；
- 学生端做完应一次性闭环，不要只做申请按钮。

学生端闭环范围参考：

```text
docs/plans/stage-coaching-request/01-student-applications.md
```

---

# 6. 明确禁止事项

本轮禁止：

- 不要修改业务代码；
- 不要修改 DB migration；
- 不要修改 Story/Ticket YAML；
- 不要重写既有 5/9 主文档；
- 不要推翻 S-053~S-056；
- 不要开始做学生端 UI；
- 不要把模拟应聘、学生资料、排期问题混进 Step 0 实施包。

---

# 7. 完成标准

完成后请输出：

1. 新增文档路径；
2. 当前已完成资产摘要；
3. application 锚点差异矩阵摘要；
4. Step 0 最小实施包；
5. Step 0 后建议第一个端闭环为学生端；
6. 仍需产品确认的问题清单。

请务必给出清晰、可执行、可拆票的结论。
```
