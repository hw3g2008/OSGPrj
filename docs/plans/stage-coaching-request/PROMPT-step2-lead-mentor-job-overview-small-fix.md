# Prompt：Step 2-A 班主任端求职总览 coaching 锚点闭环小 fix 高质量推进

请复制以下内容给下一个执行窗口。

---

```md
你现在接手 OSGPrj 项目，继续推进「阶段级辅导申请」主线。

当前已完成：

```text
Step 0：全局底座完成
Step 1：学生端闭环完成
Student build 收口完成：pnpm --filter @osg/student build ✅
```

当前进入：

```text
Step 2-A：班主任端求职总览 coaching 锚点闭环
```

注意：本提示词只做班主任端「学员求职总览」；暂不做 Step2-B 模拟应聘管理。

项目根目录：

```text
/Users/hw/workspace/OSGPrj
```

---

## 0. 工作方式

本次不要走完整 Story/Ticket YAML 拆分。

采用高质量小 fix / 小 PR 方式推进：

```text
短审计
→ 写 Step 2-A 小 fix 状态表和第一批 fix plan
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
- 不把导师端、助教端、后台、学生端、模拟应聘、课程排期混入本次；
- 不用 `as any` 逃避类型检查；
- 新增/修改弹窗、提示、确认交互必须使用 Ant Design Vue，不使用 `window.alert/confirm/prompt`。

如使用 `/fix` workflow，执行前必须先读取：

```text
.windsurf/workflows/fix.md
```

并按 workflow 执行。

---

## 1. 必读文档

按顺序阅读：

1. `docs/plans/stage-coaching-request/06-requirement-index-by-end.md`
2. `docs/plans/stage-coaching-request/02-job-overview-coaching-anchor-revision.md`
3. `docs/plans/stage-coaching-request/03-class-report-reference-revision.md`
4. `docs/plans/2026-05-09-lead-mentor-job-overview-and-class-report-plan.md`
5. `docs/plans/stage-coaching-request/00-overview.md`

阅读时注意：

- `2026-05-09-lead-mentor-job-overview-and-class-report-plan.md` 中仍有旧口径：`application` 维度、`reference_type=application`。
- 本次必须以 `02-job-overview-coaching-anchor-revision.md` 为准。
- 新口径：求职总览行维度是 `coaching_id`，不是 `application_id`。

---

## 2. 产品口径

班主任端「学员求职总览」现在的核心口径：

1. 一个 `application` 下可以有多条 `coaching`；
2. 求职总览表格行维度必须是 `coaching`；
3. `applicationId` 只作为父记录字段，用于展示岗位、公司等父信息；
4. 最近评分按 `reference_type='job_coaching' + reference_id=coaching_id` 统计；
5. 已上报课消数按 `reference_type='job_coaching' + reference_id=coaching_id` 统计；
6. 查看详情只展示当前 `coaching_id` 下的课消记录；
7. 分配导师按 `coaching_id`，不是按 `application_id`；
8. 分配导师数量必须等于 `coaching.requested_mentor_count`；
9. 从「待辅导的学员」点击上报课消时，必须预填并锁定当前 `coaching_id`；
10. 班主任端三栏保留：
   - 我管理的学员；
   - 待辅导的学员；
   - 待分配导师。

---

## 3. 短审计要求

先审计现状，不要直接改代码。

重点查看：

```text
ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorJobOverviewController.java
ruoyi-system/src/main/java/com/ruoyi/system/service/IOsgUserJobOverviewService.java
ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgUserJobOverviewServiceImpl.java
ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java
ruoyi-system/src/main/resources/mapper/system/OsgCoachingMapper.xml
ruoyi-system/src/main/resources/mapper/system/OsgClassRecordMapper.xml
osg-frontend/packages/lead-mentor/src/views/career/job-overview/index.vue
osg-frontend/packages/lead-mentor/src/components/JobDetailModal.vue
osg-frontend/packages/lead-mentor/src/components/AssignMentorModal.vue
osg-frontend/packages/lead-mentor/src/__tests__/job-overview-shell.spec.ts
osg-frontend/packages/lead-mentor/src/__tests__/job-overview-real-flow.spec.ts
osg-frontend/packages/lead-mentor/src/__tests__/job-detail-modal.spec.ts
osg-frontend/packages/lead-mentor/src/__tests__/job-assign-mentor-modal.spec.ts
```

审计输出必须回答：

1. 现在列表接口是否仍按 application 返回行？
2. 现在 row key 是否仍是 applicationId？
3. 现在详情接口是否仍按 applicationId 查课消？
4. 现在分配导师接口是否仍按 applicationId？
5. 现在最近评分/课消数是否仍用 `reference_type=application`？
6. 前端是否已有 shared `ClassReportFlowModal` / 上报课消入口可以复用？
7. 现有测试 baseline 是什么？哪些失败属于本次必须修，哪些是既有噪音？

---

## 4. 先写 Step 2-A 状态表和第一批 fix plan

在以下文档中新增 Step 2-A 状态跟踪区：

```text
docs/plans/stage-coaching-request/06-requirement-index-by-end.md
```

建议新增在 `## 4. Step 2：班主任端闭环` 下方。

状态表建议：

```text
| 编号 | 小 fix | 状态 | 范围 | 验证/备注 |
|---|---|---|---|---|
| Step2A-F0 | 短审计 + 状态跟踪区 | ⏳ 待开始 | 文档 | 审计当前 application/coaching 口径 |
| Step2A-F1 | 后端列表改为 coaching 行维度 | ⏳ 待开始 | backend | 三栏 list 返回 coachingId |
| Step2A-F2 | 后端详情按 coaching_id 查询课消 | ⏳ 待开始 | backend | 详情不串 application 下其他 coaching |
| Step2A-F3 | 后端分配导师按 coaching_id + 数量校验 | ⏳ 待开始 | backend | mentor count 必须等于 requestedMentorCount |
| Step2A-F4 | 班主任前端表格三栏接入 coaching 行 | ⏳ 待开始 | frontend | rowKey=coachingId，字段来自当前 coaching |
| Step2A-F5 | 查看详情弹窗按 coaching_id | ⏳ 待开始 | frontend | 详情只显示当前 coaching 课消 |
| Step2A-F6 | 分配导师弹窗按 coaching_id + 数量限制 | ⏳ 待开始 | frontend | 数量不一致不能提交 |
| Step2A-F7 | 上报课消入口预填 job_coaching/coaching_id | ⏳ 待开始 | frontend/shared integration | 从待辅导栏打开时锁定当前 coaching |
| Step2A-F8 | 测试与回归 | ⏳ 待开始 | all | backend/frontend/grep/build |
```

然后写第一批 fix plan。第一批建议只覆盖：

```text
Step2A-F0 + Step2A-F1
```

写完后必须停下来等用户确认，再改代码。

---

## 5. 小 fix 设计建议

### Step2A-F0：短审计 + 状态跟踪区

目标：

- 找出班主任求职总览当前 application 锚点残留；
- 建立状态表；
- 明确第一批只改后端列表，不碰前端和详情/分配。

验收：

- `06-requirement-index-by-end.md` 有 Step2A 状态表；
- 审计结果列出具体文件和旧口径证据；
- 用户确认后再进入代码修改。

### Step2A-F1：后端列表改为 coaching 行维度

目标：

- `GET /lead-mentor/job-overview/list` 三栏返回行粒度改为 `coaching`；
- 每行必须包含 `coachingId` 和 `applicationId`；
- 同一个 application 下多条 coaching 返回多行；
- `managed` 栏：当前班主任管理学生/application 下的 coachings；
- `coaching` 栏：当前班主任作为辅导者被分配的 coachings；
- `pending` 栏：当前班主任管理范围内未分配导师的 pending coachings；
- 最近评分、已上报课消数按 `job_coaching + coaching_id` 统计。

验收：

- 后端 service 单测覆盖：同一 application 多 coaching 返回多行；
- 后端 service 单测覆盖：最近评分不串 coaching；
- 后端 service 单测覆盖：lessonCount 不串 coaching；
- controller 定向测试通过；
- 后端编译通过。

建议命令：

```bash
mvn -pl ruoyi-system test -Dtest=OsgUserJobOverviewServiceImplTest -q
mvn -pl ruoyi-admin -am test -Dtest=OsgLeadMentorJobOverviewControllerTest -Dsurefire.failIfNoSpecifiedTests=false -q
mvn -pl ruoyi-admin -am -DskipTests compile -q
```

如果测试类名称不存在，先审计现有测试命名，再按项目现状选择或新增对应测试。

### Step2A-F2：后端详情按 coaching_id 查询课消

目标：

- 新增或调整详情接口，使其以 `coachingId` 为锚点；
- 详情只返回当前 `coaching_id` 下的 `job_coaching` 课消；
- 不同 coaching 即使属于同一 application，也不能互相串详情；
- 可以保留旧 applicationId 路径兼容，但内部必须能按 coachingId 定位。

验收：

- 单测覆盖同一 application 两条 coaching，详情只返回目标 coaching；
- grep 确认详情查询不再使用 `reference_type=application`。

### Step2A-F3：后端分配导师按 coaching_id + 数量校验

目标：

- 分配导师接口语义迁移到 `coachingId`；
- 后端强制 `mentorIds.size() == requestedMentorCount`；
- 分配后更新当前 coaching 的 mentorIds/mentorNames/status/assignedAt；
- 不覆盖同 application 下其他 coaching。

验收：

- 数量不足/超出都返回业务错误；
- 数量正确时只更新当前 coaching；
- 同 application 下其他 coaching 不受影响。

### Step2A-F4：班主任前端表格三栏接入 coaching 行

目标：

- row key 改为 `coachingId`；
- 三栏字段来自当前 coaching + application 父字段；
- 保留三栏结构和默认「我管理的学员」；
- 面试日历只在「我管理的学员」显示；
- 删除顶部不需要的筛选，保留公司、面试阶段、面试时间等有效筛选。

验收：

- 前端测试覆盖同一 application 多 coaching 多行展示；
- 关键 grep 确认 rowKey 不再用 applicationId；
- `pnpm --filter @osg/lead-mentor exec vitest run ...` 通过。

### Step2A-F5：查看详情弹窗按 coaching_id

目标：

- 点击详情传 `coachingId`；
- 弹窗请求 coaching-scoped 详情；
- 详情只展示当前 coaching 下课消记录；
- 最近评分与课消明细不串。

验收：

- `job-detail-modal.spec.ts` 或相关测试覆盖 coachingId；
- 旧 application-only 请求不再是主路径。

### Step2A-F6：分配导师弹窗按 coaching_id + 数量限制

目标：

- 弹窗接收 `coachingId`、`requestedMentorCount`；
- 选择数量不等于申请导师数量时，禁用提交或明确提示；
- 提交 payload 使用 coachingId；
- 不再把 applicationId 当分配主键。

验收：

- `job-assign-mentor-modal.spec.ts` 覆盖数量限制；
- 前端提交 payload 含 coachingId；
- 后端错误能正常展示。

### Step2A-F7：上报课消入口预填 job_coaching/coaching_id

目标：

- 「待辅导的学员」栏点击上报课消时，打开 shared 课消弹窗；
- 预填并锁定：
  - `courseType=job_coaching`
  - `referenceType=job_coaching`
  - `referenceId=coachingId`
  - 当前学员
  - 当前关联申请/辅导记录
- 不回退到 application reference。

验收：

- 前端测试覆盖打开弹窗时 referenceId 为 coachingId；
- grep 确认没有新增 `reference_type=application` 或 application-scoped 课消写入。

### Step2A-F8：测试与回归

最终必须执行：

```bash
mvn -pl ruoyi-system test -Dtest=OsgUserJobOverviewServiceImplTest -q
mvn -pl ruoyi-admin -am test -Dtest=OsgLeadMentorJobOverviewControllerTest -Dsurefire.failIfNoSpecifiedTests=false -q
mvn -pl ruoyi-admin -am -DskipTests compile -q
pnpm --filter @osg/shared test
pnpm --filter @osg/lead-mentor exec vitest run src/__tests__/job-overview-shell.spec.ts src/__tests__/job-detail-modal.spec.ts src/__tests__/job-assign-mentor-modal.spec.ts
pnpm --filter @osg/lead-mentor build
```

并做关键 grep：

```bash
grep -R "reference_type.*application\|referenceType.*application" -n ruoyi-system/src/main ruoyi-admin/src/main osg-frontend/packages/lead-mentor/src || true
grep -R "rowKey.*applicationId\|applicationId.*assign" -n osg-frontend/packages/lead-mentor/src/views/career/job-overview osg-frontend/packages/lead-mentor/src/components || true
grep -R "coachingId" -n osg-frontend/packages/lead-mentor/src/views/career/job-overview osg-frontend/packages/lead-mentor/src/components
```

如果存在历史兼容代码，必须在报告中说明它不是主路径，且不会影响新 coaching_id 口径。

---

## 6. 禁止事项

本次禁止：

- 不做 Step2-B 模拟应聘管理；
- 不改导师端；
- 不改助教端；
- 不改后台；
- 不改学生端已完成主路径；
- 不做课程排期；
- 不做学生资料字段字典化；
- 不做无关 shared 抽取；
- 不用 applicationId 继续作为求职总览行主键；
- 不用 `reference_type=application` 作为新课消统计/详情口径；
- 不自动 git commit。

---

## 7. 每个小 fix 完成后的输出格式

```text
Fix:
- Step2A-Fx 名称

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

---

## 8. Step 2-A 最终完成输出格式

最终报告必须包含：

1. Step2A-F0~F8 状态表；
2. 后端接口变化清单；
3. 前端页面/组件变化清单；
4. `coaching_id` 口径确认：
   - 列表；
   - 详情；
   - 最近评分；
   - 已上报课消数；
   - 分配导师；
   - 上报课消预填；
5. 分配导师数量限制验证；
6. 测试命令和实际输出；
7. `pnpm --filter @osg/lead-mentor build` 实际结果；
8. 下一步建议：进入 Step2-B 班主任端模拟应聘管理闭环。

请记住：

```text
这一步的目标不是“做完所有班主任端需求”，而是先把班主任端求职总览从 application 锚点彻底收口到 coaching_id。
```
```
