# Four-Pack Standard (Design + Plan)

Date: 2026-03-03  
Status: Active  
Owner: workflow-framework

## 1. 目标

把框架级改造统一为“四件套”治理，避免“只有计划没有设计”或“设计与执行脱节”。

## 2. 四件套定义

每个改造周期（同一主题窗口）必须包含 4 份文档：

1. Track A Design（架构与决策）
2. Track A Plan（实施清单与验收）
3. Track B Design（架构与决策）
4. Track B Plan（实施清单与验收）

说明：
1. `design` 负责“为什么这样做 + 约束与边界”。
2. `plan` 负责“怎么做 + 改哪些文件 + 怎么验收”。
3. `plan` 必须显式引用对应 `design`，没有 design 不允许进入执行。

## 3. 命名规范

1. `docs/plans/YYYY-MM-DD-<topic>-design.md`
2. `docs/plans/YYYY-MM-DD-<topic>-<plan-type>-plan.md`

`<plan-type>` 推荐：`implementation` / `fix` / `evolution`。

## 4. 必填元信息

`design` 与 `plan` 顶部都必须有：

1. `Date`
2. `Status`
3. `Owner`
4. `Scope / Non-goal`（可分节）

`plan` 额外必须有：

1. `Design Doc`（指向唯一对应 design）
2. `Execution Order`
3. `DoD`

## 5. 执行门禁

1. 无对应 `design`：计划不得执行。
2. `plan` 未写 `Design Doc`：判定为无效计划。
3. 验收结论必须以最新审计产物为准（不允许用旧日志替代）。

## 6. 当前周期映射（2026-03-02）

Track A（Anti False Green）：
1. Design: `docs/plans/2026-03-02-e2e-framework-anti-false-green-design.md`
2. Plan: `docs/plans/2026-03-02-e2e-framework-anti-false-green-fix-plan.md`

Track B（PRD Visual Contract）：
1. Design: `docs/plans/2026-03-02-prd-visual-contract-evolution-design.md`
2. Plan: `docs/plans/2026-03-02-prd-visual-contract-evolution-plan.md`

## 7. 统一视觉验收策略（全模块默认）

以下策略为框架级默认口径；各模块计划可补充，但不得弱化：

1. 基线真源（SSOT）：
   - 视觉基线仅以仓库内文件为验收输入。
   - 固定路径：`osg-frontend/tests/e2e/visual-baseline/`。
   - 对象存储仅用于审计归档，不参与 gate 判定。

2. 阈值分级（禁止单一全局阈值）：
   - 登录/鉴权页面：`diff_threshold=0.03`
   - 常规管理页面（列表/表单/详情）：`diff_threshold=0.05`
   - 高噪声页面允许上浮至 `<=0.08`，但必须在 `UI-VISUAL-DECISIONS.md` 留痕审批。

3. `@ui-visual` 覆盖下限：
   - 每个模块的 P0/P1 页面必须纳入 `@ui-visual`。
   - P2 页面默认可选；若进入关键验收链路，则升级为必跑并补基线。

4. 偏差放行审批：
   - 基线更新、阈值上调、视觉偏差放行统一采用“PM + 前端负责人双签”。
   - 单签无效；审批记录必须写入 `UI-VISUAL-DECISIONS.md`，并关联审计产物。

5. 失败语义（强制）：
   - 页面缺失 baseline 或 diff 超阈值：`visual gate FAIL (EXIT 12)`
   - contract 与 PRD 页面覆盖不一致：`contract guard FAIL (EXIT 13)`

## 8. 反漂移要求

1. 后续新计划若与第 7 节冲突，必须先更新本标准，再更新模块计划。
2. `docs/plans/2026-03-02-prd-visual-contract-evolution-plan.md` 第 10 节作为本标准的首个落地实例，后续应以本标准为准。
3. `docs/plans/2026-03-02-e2e-framework-anti-false-green-fix-plan.md` 作为运行态防假绿链路的并行实例，必须显式引用本标准并保持一致。
4. `docs/plans/2026-03-01-docker-runtime-architecture-design.md` 作为环境同构与交付闭环实例，必须显式引用本标准并保持一致。
