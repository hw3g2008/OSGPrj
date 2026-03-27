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

## Sync Gate Policy

在以下事项未完成前，不允许宣称五端已经对齐：

1. 助教端仍保留“正式分配导师”实现或测试预期
2. 学生端 `我的求职` / `模拟应聘` / `课程记录` 页面职责仍互相混用
3. 导师端提交的课程记录未明确要求后台审核后才进入学生端
4. 任何端仍把“课程申请记录”和“课程记录”作为同一个对象处理

## Execution Order

design-doc-confirmed -> prototype-delta-list -> role-boundary-fix -> student-page-semantics-fix -> mentor-record-chain-check -> backend-review-chain-check -> assistant-role-cleanup -> focused-tests -> five-end-alignment-review

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

## Workstream C: 修正学生端三页职责

**Goal**

把学生端页面语义完全收成：

- `我的求职`：真实岗位申请追踪 + 摘要
- `模拟应聘`：模拟类申请追踪 + 摘要
- `课程记录`：统一课消详情 + 学生评价

**Targets**

- `osg-frontend/packages/student/src/views/applications/index.vue`
- `osg-frontend/packages/student/src/views/mock-practice/index.vue`
- `osg-frontend/packages/student/src/views/courses/index.vue`
- 对应 shared API type 与 contract 测试

**Tasks**

- 识别并移除把课程记录详情塞进申请页的实现
- 保留允许展示的摘要字段
- 确保课程详情与学生评价统一落在课程记录页

**Exit Criteria**

- 三页职责与定义稿一致
- 前端页面不再用错误对象承担错误职责

## Workstream D: 校正导师提交与后台审核链

**Goal**

把课程记录链明确为：

导师提交 -> 后台审核 -> 学生回看 -> 学生评价

**Targets**

- 导师端页面与服务实现
- 后台审核入口与学生课程记录读取链

**Tasks**

- 确认导师端每次上课提交一条课程记录
- 确认后台审核是学生可见的前置条件
- 确认学生评价作用在同一条已审核课程记录上

**Exit Criteria**

- 不再出现“未审核课程记录已进入学生端”的路径

## Workstream E: 助教端实现与测试去误导

**Goal**

让助教端与统一定义稿一致，不再扮演班主任级别分配角色。

**Targets**

- 助教端原型差异清单
- 助教端页面实现
- 助教端相关 contract / e2e / fixture

**Tasks**

- 去掉或重命名会被误读为正式分配权限的助教操作
- 确保助教端保留“查看、跟进、管理、协同”语义
- 修正测试数据与断言，避免默认助教可以分配导师

**Exit Criteria**

- 助教端不再作为正式导师分配角色出现在实现和测试中

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
