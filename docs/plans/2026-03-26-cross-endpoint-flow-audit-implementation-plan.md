# OSG 跨端数据流第二轮审计实施计划

> Goal: 按 `docs/plans/2026-03-26-cross-endpoint-flow-audit-design.md` 的设计，完成第二轮跨端数据流与审批必要性审计，并输出链路矩阵与 round2 主报告。
>
> Design Doc: `docs/plans/2026-03-26-cross-endpoint-flow-audit-design.md`
>
> Audit Strategy: 先做需求资产一致性校验，再建立链路矩阵基线；先把首轮已知问题标为 `已知-待修复`，再按 5 组链路进行静态取证；对新增或存疑的高风险项补做小范围运行时验证；最后输出不重复计数的 round2 审计报告。
>
> Tech Stack: Markdown, Bash, `rg`, Java/Spring Boot code inspection, Vue/TypeScript code inspection, PRD/DELIVERY-CONTRACT/DECISIONS 文档取证，必要时使用 `curl` 做针对性链路复核。
>
> Execution Order: requirement-inventory -> matrix-baseline -> profile-change audit -> teaching audit -> career/mock audit -> auth/dictionary audit -> targeted runtime spot-check -> round2 report -> verification -> commit
>
> DoD: 所有纳入范围的子链路都在矩阵中有结论；首轮问题保留为 `已知-待修复` 且不重复计数；新增问题按 `断链/错路/脏映射/能力缺口` 分类；每个 P0/P1 结论至少有需求证据 + 实现证据，必要时补运行时验证；最终生成 `docs/osg-cross-endpoint-flow-matrix.md` 与 `docs/osg-cross-endpoint-flow-audit-round2.md`。

## 0. 与设计稿关系

1. 本计划是 `docs/plans/2026-03-26-cross-endpoint-flow-audit-design.md` 的唯一执行计划。
2. 本计划是 `writing-plans` 不可用时的手工 fallback，不改变设计稿中的边界、方法和结论格式。
3. 本计划执行的是“审计工作”，不是代码修复工作；除产出文档和必要证据外，不主动修改业务实现。
4. 若执行中发现设计稿与仓库真实结构冲突，先以仓库中的真实入口和资产组织为准，再回改设计与计划，不允许静默偏航。

## Existing-Asset Inventory

- 首轮审计与现状文档：
  - `docs/osg-cross-endpoint-interaction-audit.md`
  - `docs/osg-curl-chain-checklist.md`
  - `docs/osg-data-flow-current-state.md`
  - `docs/osg-data-bridge-fix-plan.md`
- 产品确认与结论：
  - `docs/osg-product-confirmation-checklist.md`
  - `docs/osg-business-flow-target.md`
- PRD 资产根目录：
  - `osg-spec-docs/docs/01-product/prd/admin/`
  - `osg-spec-docs/docs/01-product/prd/career/`
  - `osg-spec-docs/docs/01-product/prd/lead-mentor/`
  - `osg-spec-docs/docs/01-product/prd/permission/`
- 当前设计稿：
  - `docs/plans/2026-03-26-cross-endpoint-flow-audit-design.md`

## Guard Reuse / Collision Audit

- 需求证据优先级固定为：
  - 产品确认清单
  - 明确裁决与机器约束（`DECISIONS`、`DELIVERY-CONTRACT` 等）
  - 链路相关 PRD 资产（页面 PRD、`MATRIX`、`SIDEBAR` 等）
  - `curl` 串联清单
  - 代码现状
- PRD 不自动视为绝对真值；若不同需求资产之间冲突，冲突本身进入审计结果。
- 首轮已确认问题不能在 round2 中重新作为“新增问题”计数，必须在矩阵中标记为 `已知-待修复`。
- “审批”与“分配/流转”必须拆开判定，禁止把角色交接误记为审批链。

## Source-Stage Integration Path

- 设计稿决定了本轮的审计输出：
  - `docs/osg-cross-endpoint-flow-matrix.md`
  - `docs/osg-cross-endpoint-flow-audit-round2.md`
- 审计输入路径固定为：
  - 需求资产
  - 代码入口
  - 数据落点
  - 下游读取和审批闭环
  - 运行时 spot-check 结果
- 最早阻断点：
  - 若链路无法明确“写入口 -> 落点 -> 下游读取方”，该链路不能给出“通过”结论
  - 若需求资产冲突且未能定夺，链路直接进入 `存疑` 或 `需求冲突`

## Stage-Regression Verification

- 每个阶段都要验证：
  - 是否遗漏相关 PRD 资产
  - 是否把首轮已知问题错误当成新问题
  - 是否把审批、分配、自动生效混为一谈
  - 是否为高严重度问题保留了足够证据
- 最终验证要求：
  - 矩阵覆盖全部纳入范围的子链路
  - round2 主报告与矩阵口径一致
  - `已知-待修复`、`本轮新增问题`、`需求冲突问题` 三类可区分

## Task 1: Build requirement inventory and seed the matrix baseline

**Files:**
- Create: `docs/osg-cross-endpoint-flow-matrix.md`
- Reference: `docs/plans/2026-03-26-cross-endpoint-flow-audit-design.md`
- Reference: `docs/osg-cross-endpoint-interaction-audit.md`
- Reference: `docs/osg-product-confirmation-checklist.md`
- Reference: `docs/osg-curl-chain-checklist.md`

**Step 1: Enumerate requirement assets**

- 为 5 组链路逐一列出相关 PRD 资产，不限于示例文件
- 同时补齐 `MATRIX`、`SIDEBAR`、`DECISIONS`、`DELIVERY-CONTRACT`
- 为每个子链路建立“需求资产列表”

**Step 2: Create matrix skeleton**

- 先建固定列：
  - `链路名`
  - `子链路`
  - `写入口`
  - `持久化目标`
  - `下游读取方`
  - `是否应审批`
  - `是否已具备审批闭环`
  - `最终状态/正式数据回写点`
  - `当前状态`
  - `问题类型`
  - `严重度`
  - `证据`

**Step 3: Seed known findings**

- 把首轮已确认问题写入矩阵
- 统一状态为 `已知-待修复`
- 必须保留原问题编号或等价映射，避免后续重复计数

**Step 4: Verify baseline**

Run:

```bash
rg -n "已知-待修复|Profile|课程记录|课时上报|模拟应聘|忘记密码" docs/osg-cross-endpoint-flow-matrix.md
```

Expected:

- 矩阵已存在首轮问题基线和本轮全部子链路占位

## Task 2: Audit requirement consistency before reading code

**Files:**
- Modify: `docs/osg-cross-endpoint-flow-matrix.md`
- Create/Modify: `docs/osg-cross-endpoint-flow-audit-round2.md`
- Reference: `osg-spec-docs/docs/01-product/prd/**`

**Step 1: Compare requirement assets**

- 对每个子链路进行“需求资产一致性校验”
- 检查：
  - 产品确认清单是否有明确结论
  - `DECISIONS` 是否有更高优先级裁决
  - 页面 PRD、`MATRIX`、`SIDEBAR`、`DELIVERY-CONTRACT` 是否一致

**Step 2: Record conflicts explicitly**

- 若发现冲突，不做静默裁决
- 在矩阵中标记 `需求冲突`
- 在主报告中增加“需求冲突”章节

**Step 3: Verify requirement coverage**

Run:

```bash
find osg-spec-docs/docs/01-product/prd -maxdepth 2 -type f | rg "(profile|staff|student|report|class|mock|position|job|login|forgot|schedule|matrix|sidebar|decisions|DELIVERY-CONTRACT)"
```

Expected:

- 每组链路都能对应到一组需求资产

## Task 3: Audit profile / change-request / approval chain

**Files:**
- Modify: `docs/osg-cross-endpoint-flow-matrix.md`
- Modify: `docs/osg-cross-endpoint-flow-audit-round2.md`
- Reference:
  - `osg-frontend/packages/shared/src/api/profile.ts`
  - `osg-frontend/packages/shared/src/api/assistantProfile.ts`
  - `osg-frontend/packages/mentor/src/views/profile/index.vue`
  - `osg-frontend/packages/assistant/src/views/profile/index.vue`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStudentProfileController.java`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStudentChangeRequestController.java`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorProfileController.java`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgMentorProfileController.java`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStaffController.java`

**Step 1: Trace write/read/approve chain**

- Student
- Mentor
- Lead-Mentor
- Assistant
- Admin 查看与审批入口

**Step 2: Judge approval necessity**

- 区分：
  - 直接写入
  - 发起申请 + 自动生效
  - 发起申请 + 必须审批
  - 不是审批，而是信息流转

**Step 3: Mark gaps**

- 判断是否出现：
  - 写入与审核读取不在同一真相表
  - 错端点复用
  - 字段语义滥用
  - 审批闭环缺失

**Step 4: Verify targeted evidence**

Run:

```bash
rg -n "profile|change-request|approve|reject|pending|remark|loginIp|wechatId" ruoyi-admin ruoyi-system osg-frontend/packages -g '!**/dist/**'
```

Expected:

- 每条 profile 子链都有矩阵结论

## Task 4: Audit teaching chain as two separate subchains

**Files:**
- Modify: `docs/osg-cross-endpoint-flow-matrix.md`
- Modify: `docs/osg-cross-endpoint-flow-audit-round2.md`
- Reference:
  - `osg-spec-docs/docs/01-product/prd/admin/11-admin-class-records.md`
  - `osg-spec-docs/docs/01-product/prd/admin/05-admin-reports.md`
  - `docs/osg-curl-chain-checklist.md`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgClassRecordController.java`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgReportController.java`

**Step 1: Audit course-record chain**

- 检查 Student / Mentor / Lead-Mentor / Assistant / Admin 是否围绕同一条课程记录读取
- 检查课程记录是否只是展示投影，还是正式业务链

**Step 2: Audit report-review chain**

- 检查 Mentor / Lead-Mentor / Assistant 提交是否进入后台审核
- 检查 Admin 审核后是否回写到学生端、统计口径与结算链

**Step 3: Judge approval necessity**

- `课程记录` 与 `课时审核` 分开判定
- 不允许把“可查看课程记录”误判成“必须审批”

**Step 4: Verify targeted evidence**

Run:

```bash
rg -n "class-record|report|approve|reject|review|rate|settlement|finance" ruoyi-admin ruoyi-system osg-frontend/packages osg-spec-docs/docs/01-product/prd -g '!**/dist/**'
```

Expected:

- 教学链在矩阵中至少拆成两条子链并有独立结论

## Task 5: Audit positions / job-overview / mock-practice chain

**Files:**
- Modify: `docs/osg-cross-endpoint-flow-matrix.md`
- Modify: `docs/osg-cross-endpoint-flow-audit-round2.md`
- Reference:
  - `osg-spec-docs/docs/01-product/prd/admin/07-admin-student-positions.md`
  - `osg-spec-docs/docs/01-product/prd/admin/08-admin-job-overview.md`
  - `osg-spec-docs/docs/01-product/prd/admin/13-admin-mock-practice.md`
  - `osg-spec-docs/docs/01-product/prd/lead-mentor/03-lead-mentor-job-overview.md`
  - `osg-spec-docs/docs/01-product/prd/lead-mentor/04-lead-mentor-mock-practice.md`
  - `docs/osg-curl-chain-checklist.md`

**Step 1: Audit position approval chain**

- 后台岗位发布
- 学生自添岗位
- Admin 审核
- 班主任 / 助教回看

**Step 2: Audit job-overview and coaching flow**

- 学生申请、进度更新、辅导申请
- Admin / Lead-Mentor / Assistant / Mentor 的共享读取
- 审批与分配是否混用

**Step 3: Audit mock-practice flow**

- 学生申请
- 班主任或后台分配
- 导师确认
- 学生回看反馈

**Step 4: Verify targeted evidence**

Run:

```bash
rg -n "position|job-overview|application|coaching|mock-practice|assign|approve|reject|confirm" ruoyi-admin ruoyi-system osg-frontend/packages osg-spec-docs/docs/01-product/prd -g '!**/dist/**'
```

Expected:

- 岗位、求职、模拟应聘三条子链都有独立矩阵结论

## Task 6: Audit auth / recovery / dictionary-driven fields

**Files:**
- Modify: `docs/osg-cross-endpoint-flow-matrix.md`
- Modify: `docs/osg-cross-endpoint-flow-audit-round2.md`
- Reference:
  - `osg-frontend/packages/shared/src/api/password.ts`
  - `osg-frontend/packages/mentor/src/api/auth.ts`
  - `osg-frontend/packages/shared/src/api/assistantProfile.ts`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgForgotPasswordController.java`
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgAssistantAuthController.java`

**Step 1: Audit auth and recovery chain**

- 核对 Student / Mentor / Lead-Mentor / Assistant 是否打到正确命名空间
- 判断这类链路是否存在错误端点复用或错误角色边界

**Step 2: Audit dictionary fields**

- 地区
- 主攻方向 / 子方向
- 状态枚举

**Step 3: Judge approval necessity**

- 这类链路通常不要求审批
- 如果实现中出现“被审批化”，需明确标记

**Step 4: Verify targeted evidence**

Run:

```bash
rg -n "forgot-password|sendCode|verify|reset|assistant/profile|mentor/profile|north-america|europe|asia-pacific|china|region|direction" ruoyi-admin ruoyi-system osg-frontend/packages osg-spec-docs/docs/01-product/prd -g '!**/dist/**'
```

Expected:

- 身份恢复链和字典字段链各自有矩阵结论

## Task 7: Run targeted runtime spot-checks for new P0 / P1 candidates

**Files:**
- Modify: `docs/osg-cross-endpoint-flow-audit-round2.md`
- Reference: `docs/osg-curl-chain-checklist.md`

**Step 1: Select only high-risk deltas**

- 只对“本轮新增”或“首轮表述需要纠偏”的 P0 / P1 做 spot-check
- 不重复执行首轮已完全验证的问题，除非要确认问题是否已扩散

**Step 2: Run minimal runtime checks**

- 优先使用已有 `curl` 检查点
- 运行时证据只做高风险补强，不代替静态链路取证

**Step 3: Record evidence**

- 在主报告中明确标出：
  - 静态证据
  - 运行时证据
  - 是否是首轮问题延续

## Task 8: Finalize round2 report, verify non-duplication, and commit

**Files:**
- Create/Modify: `docs/osg-cross-endpoint-flow-matrix.md`
- Create/Modify: `docs/osg-cross-endpoint-flow-audit-round2.md`

**Step 1: Consolidate final categories**

- `已知-待修复`
- `本轮新增问题`
- `需求冲突问题`
- `存疑`

**Step 2: Verify report integrity**

Run:

```bash
rg -n "已知-待修复|本轮新增问题|需求冲突|存疑|P0|P1|P2|P3" docs/osg-cross-endpoint-flow-matrix.md docs/osg-cross-endpoint-flow-audit-round2.md
git diff --check
```

Expected:

- 矩阵和主报告术语一致
- 没有把已知问题重复当成新增问题
- 文档格式无基础错误

**Step 3: Commit**

```bash
git add docs/osg-cross-endpoint-flow-matrix.md docs/osg-cross-endpoint-flow-audit-round2.md docs/plans/2026-03-26-cross-endpoint-flow-audit-implementation-plan.md
git commit -m "docs: add round2 cross-endpoint audit plan"
```
