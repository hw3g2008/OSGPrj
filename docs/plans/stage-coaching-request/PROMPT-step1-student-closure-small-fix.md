# Prompt：Step 1 学生端闭环小 fix 高质量推进

请复制以下内容给下一个执行窗口。

---

```md
你现在接手 OSGPrj 项目，继续推进「阶段级辅导申请」主线。

当前 Step 0 全局底座已完成，并已在以下文档中标记：

```text
docs/plans/stage-coaching-request/06-requirement-index-by-end.md
```

Step 0 已完成内容包括：

- `osg_coaching` 支持同一 `application` 下多条 coaching；
- `OsgCoaching` 已补齐阶段级字段；
- `class_record` 新写入口支持 `reference_type=job_coaching` / `reference_id=coaching_id`；
- reference candidates 已可返回 coaching 候选；
- validator 已支持 coaching_id，并保留 application 旧数据兼容；
- 已有可复现验证：`ruoyi-system compile`、`OsgClassReportConstantsTest`、`@osg/shared test`。

本次进入：

```text
Step 1：学生端闭环
```

## 0. 工作方式

本次不要走完整 Story/Ticket YAML 拆分。

采用高质量小 fix / 小 PR 方式推进：

```text
短审计
→ 写 Step 1 小 fix 状态表和第一批 fix plan
→ 等用户确认
→ 逐个小 fix 实施
→ 每个 fix 独立验证
→ 每个 fix 更新状态标记
→ 不自动 git commit，除非用户明确要求
```

强制要求：

- 不降低质量；
- 不新增 Story YAML；
- 不新增 Ticket YAML；
- 不跳过根因分析；
- 不跳过验证；
- 不自动执行 git commit；
- 每批代码修改前必须先在计划文档写清楚方案，并等待用户确认；
- 每完成一个小 fix 必须更新状态标记；
- 不把班主任端、导师端、助教端、后台、模拟应聘、学生资料、课程排期混入本次。

优先使用 `/fix` workflow 执行每个小任务。执行 workflow 前必须先阅读对应 workflow 定义文件。

项目根目录：

```text
/Users/hw/workspace/OSGPrj
```

---

## 1. 必读文档

按顺序阅读：

1. `docs/plans/stage-coaching-request/06-requirement-index-by-end.md`
2. `docs/plans/stage-coaching-request/01-student-applications.md`
3. `docs/plans/stage-coaching-request/00-overview.md`
4. `docs/plans/stage-coaching-request/03-class-report-reference-revision.md`
5. `docs/plans/2026-05-09-lead-mentor-job-overview-and-class-report-plan.md`

只提取学生端闭环相关内容。不要扩散。

---

## 2. 产品口径

学生端「我的求职」现在的核心口径：

1. `application` 是岗位父记录；
2. `coaching` 是阶段级辅导申请子记录；
3. 一个 `application` 下允许多条 `coaching`；
4. 学生每次申请某个面试阶段的辅导，都应新增一条 `coaching`；
5. 不要再通过覆盖 `osg_job_application.current_stage/interview_time/coaching_status` 表达本次辅导申请；
6. 学生端主表按 `application_id` 展示岗位；
7. 展开行按 `coaching_id` 展示辅导申请；
8. 最近评分、查看详情、课消记录必须按 `coaching_id`；
9. 修改只允许改：
   - 面试时间；
   - 公司面试官。

---

## 3. 本次目标

完成学生端「我的求职」闭环。

一次性闭环范围：

- 我的求职主表字段；
- 申请辅导弹窗；
- 新增 `coaching` 申请；
- 同一岗位多条辅导申请；
- 岗位行展开；
- 辅导记录展示；
- 查看详情；
- 修改面试时间 / 公司面试官；
- 最近评分展示；
- 学生端接口与权限；
- 学生端相关测试。

不要留下这些返工点：

- 不要只做「申请辅导」而不做展开行；
- 不要只写 `application.current_stage` 而不生成 `coaching`；
- 不要先按 `application_id` 查详情，后面再改 `coaching_id`；
- 不要把最近评分留到班主任端再统一补。

---

## 4. 先做短审计

只读审计以下文件，确认当前实现差距。

后端重点：

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStudentClassRecordController.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentCourseRecordServiceImpl.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/domain/OsgCoaching.java`
- `ruoyi-system/src/main/resources/mapper/system/OsgCoachingMapper.xml`
- `ruoyi-system/src/main/resources/mapper/system/OsgJobApplicationMapper.xml`
- `ruoyi-system/src/main/resources/mapper/system/OsgClassRecordMapper.xml`

前端重点：

- `osg-frontend/packages/student/src/views/applications/index.vue`
- `osg-frontend/packages/student/src/api/positions.ts`
- `osg-frontend/packages/shared/src/api/class-records.ts`

重点确认：

- 我的求职列表接口当前返回什么结构；
- 是否已有 `coachings` 子列表；
- `requestCoaching` 当前是否仍只更新 `application`；
- 学生端是否已有申请辅导弹窗；
- 申请辅导弹窗是否支持 7 个面试阶段；
- 展开行是否存在；
- 查看详情是否按 `coaching_id`；
- 修改入口是否存在；
- 最近评分是否按 `coaching_id`；
- 学生身份和权限校验在哪里做。

短审计输出格式：

```text
Current State:
- ...

Reusable Assets:
- ...

Gaps:
- ...

Suggested Step 1 Small Fixes:
- Step1-F0 ...
- Step1-F1 ...
```

短审计后，先写计划文档状态区和第一批 fix plan，等用户确认后再改代码。

---

## 5. Step 1 小 fix 建议拆分

请按下面顺序推进。可按实际代码微调，但必须保持小范围、可验证、可回滚。

### Step1-F0：学生端状态跟踪区 + 第一批 fix plan

修改：

- `docs/plans/stage-coaching-request/06-requirement-index-by-end.md`

新增或更新 Step 1 状态表：

```text
Step1-F0：状态跟踪区 + 第一批 fix plan
Step1-F1：后端列表接口返回 application + coachings
Step1-F2：后端新增 coaching 申请接口
Step1-F3：后端修改 coaching 面试时间/公司面试官接口
Step1-F4：后端 coaching 详情/课消详情接口
Step1-F5：学生端我的求职主表 + 展开行
Step1-F6：学生端申请辅导弹窗接入新接口
Step1-F7：学生端查看详情 + 修改弹窗
Step1-F8：测试与回归
```

要求：

- 写清楚每个 fix 的范围、文件、验收、验证命令；
- 写完后停下，等待用户确认；
- 不要直接改业务代码。

### Step1-F1：后端列表接口返回 application + coachings

目标：

- 学生端我的求职列表按 `application_id` 返回岗位父记录；
- 每个 application 附带该岗位下 `coachings` 子列表；
- coaching 子项至少包含：
  - `coachingId`
  - `interviewStage`
  - `interviewStageLabel`
  - `interviewTime`
  - `city` / `cityLabel`
  - `companyInterviewer`
  - `mentorNames`
  - `status`
  - `latestRating`
  - `reportedLessonCount` 或等价课消数

验收：

- 同一个 application 下能返回多条 coaching；
- latestRating 按 `reference_type=job_coaching` + `reference_id=coaching_id`；
- 不同 coaching 不串数据；
- 学生只能看到自己的 application / coaching。

### Step1-F2：后端新增 coaching 申请接口

建议接口：

```text
POST /student/applications/{applicationId}/coachings
```

目标：

- 新增一条 `osg_coaching`；
- 绑定当前学生和当前 application；
- 写入面试阶段、面试时间、城市、公司面试官、申请导师数量、申请备注；
- 初始状态为待分配/待辅导的现有枚举等价状态；
- 不覆盖 application 父记录来表达本次辅导申请。

验收：

- 同一个 application 可连续申请多个阶段；
- 每次申请生成不同 `coaching_id`；
- 非本人 application 被拒绝。

### Step1-F3：后端修改 coaching 面试时间/公司面试官接口

建议接口：

```text
PUT /student/applications/{applicationId}/coachings/{coachingId}
```

目标：

- 只允许修改：
  - `interviewTime`
  - `companyInterviewer`
- 不允许修改面试阶段、导师、状态、评分、课消；
- 校验 coaching 属于当前 application 和当前学生。

验收：

- 合法更新成功；
- 修改非白名单字段无效或被拒绝；
- 非本人 coaching 被拒绝。

### Step1-F4：后端 coaching 详情/课消详情接口

建议接口：

```text
GET /student/applications/{applicationId}/coachings/{coachingId}/class-records
```

目标：

- 返回当前 `coaching_id` 下的全部课消记录；
- 查询条件使用：

```text
reference_type = job_coaching
reference_id = coaching_id
```

- 按上课日期倒序；
- 只允许学生查看自己的 coaching。

验收：

- 不同 coaching 的详情不串；
- 旧 application reference 数据不作为新详情主路径；
- 返回字段满足前端详情展示。

### Step1-F5：学生端我的求职主表 + 展开行

目标：

- 主表按 application 展示岗位字段：
  - 岗位名称
  - 公司
  - 行业
  - 岗位分类
  - 地区
  - 招聘周期
  - 投递时间
  - 求职状态
- 操作区只显示「申请辅导」；
- 支持展开行展示 coachings；
- coaching 行展示：
  - 面试阶段
  - 面试时间
  - 城市
  - 导师
  - 最近评分
  - 操作：查看详情、修改

验收：

- 无 coaching 时展开区域有合理空态；
- 多条 coaching 正确显示；
- UI 使用 Ant Design Vue，不使用浏览器原生 alert/confirm/prompt。

### Step1-F6：学生端申请辅导弹窗接入新接口

目标：

- 点击「申请辅导」打开弹窗；
- 支持 7 个面试阶段；
- 表单字段包含：
  - 面试阶段
  - 面试时间
  - 城市
  - 公司面试官
  - 申请导师数量
  - 备注/辅导需求
  - 偏好导师/排除导师，如当前后端字段支持则接入，否则明确标记后续
- 提交调用新增 coaching 接口；
- 成功后刷新当前 application 的 coachings。

验收：

- 连续申请多个阶段后列表能看到多条 coaching；
- 表单校验合理；
- 不再调用旧的只更新 application 的申请辅导路径作为主路径。

### Step1-F7：学生端查看详情 + 修改弹窗

目标：

- 查看详情按 `coaching_id` 拉取课消详情；
- 修改弹窗只展示并提交面试时间、公司面试官；
- 修改成功后刷新对应 coaching 行。

验收：

- 详情不串 coaching；
- 修改不影响阶段、导师、状态、评分；
- 弹窗使用 Ant Design Vue。

### Step1-F8：测试与回归

至少验证：

```text
后端相关 compile / 定向测试
学生端相关 test / type-check / build 中至少一种可执行验证
shared 不退化验证，如涉及 shared 类型
关键 grep：确认学生端新申请主路径不再只更新 application
```

建议场景：

1. 同一 application 创建 First Round coaching；
2. 同一 application 再创建 Second Round coaching；
3. 两条 coaching 都出现在展开行；
4. 修改其中一条 coaching 的 interviewTime / companyInterviewer；
5. 另一条 coaching 不受影响；
6. 查看详情按当前 coaching_id 查询。

完成后更新 `06-requirement-index-by-end.md`：

```text
✅ Step 1 学生端闭环完成
```

如果未完全完成，必须标记为：

```text
⚠️ Step 1 部分完成：剩余问题是 ...
```

---

## 6. 禁止事项

本轮禁止：

- 不要新增 Story YAML；
- 不要新增 Ticket YAML；
- 不要自动 git commit；
- 不要跳过文档方案确认直接改代码；
- 不要改班主任端完整求职总览；
- 不要改导师端 / 助教端闭环；
- 不要改后台；
- 不要做模拟应聘管理；
- 不要做学生资料字段字典化；
- 不要做课程排期；
- 不要做无关 shared 抽取。

---

## 7. 每个小 fix 的输出格式

每个小 fix 完成后输出：

```text
Fix:
- Step1-Fx 名称

Root Cause / Current State:
- ...

Changed Files:
- ...

Verification:
- 命令：...
- 结果：...

Status Marker:
- 已更新 docs/plans/stage-coaching-request/06-requirement-index-by-end.md 对应行

Next:
- 下一小 fix 是 ...
```

如果需要 commit，只输出建议 commit message，等待用户明确指令。

---

## 8. 最终输出

Step 1 完成后输出：

1. Step1-F0~F8 状态表；
2. 修改文件清单；
3. 后端接口变化；
4. 前端页面变化；
5. coaching_id 口径验证；
6. 实际验证命令和结果；
7. 状态标记更新位置；
8. 是否存在 baseline 失败；
9. 下一步建议：进入 Step 2 班主任端闭环。

请记住：

```text
Step 1 的目标是学生端一次闭环。
速度来自小 fix 串行推进，不来自降低质量。
```
```
