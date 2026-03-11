# UI Visual Post-Failure Allowance Hook Design

> Date: 2026-03-12
> Status: Approved
> Owner: workflow-framework
> Standard Baseline: `docs/plans/FOUR-PACK-STANDARD.md`
> Scope: 在不改动现有 UI 严格交付主链的前提下，为视觉 compare 的失败分支增加一个“红后放行判断”钩子；钩子只在 strict screenshot compare 失败后执行，并读取 `UI-VISUAL-CONTRACT.yaml` 与现有机器真值中的放行标准决定当前 case 是否可转绿
> Non-goals: 不重排 `single_case_verify -> module_verify -> ui_visual_gate -> final_gate -> final_closure`；不引入第二真源文件；不新增人工审批产物；不把正常通过的 case 额外送入复杂判断；不新增独立 UI orchestrator

---

## 0.1 与上位标准关系（2026-03-12）

1. 本设计遵循 `docs/plans/FOUR-PACK-STANDARD.md` 的四件套治理与执行门禁要求。
2. 本设计不改写项目既有 UI 严格交付主链，只在 strict screenshot failure 后增加一个可重复进入的判定条件。
3. 如本设计与 `.claude/project/config.yaml` 或上位真源策略冲突，以机器真值为准，并先回改上位规则。

## 1. Problem Statement

当前项目已经具备：

1. 严格 UI compare 主链
   - `single_case_verify -> module_verify -> ui_visual_gate -> final_gate -> final_closure`
2. 机器真值中的允许/禁止 residual class
   - `micro_spacing`
   - `low_salience_text_icon_rasterization`
   - 禁止 `image_like / captcha_like / color_state / geometry_change / structure_change / unknown`
3. 现有 residual classifier 与报告字段

但当前接入方式过重：

1. 只有页面显式声明 `residual_regions` 时，failure 后才会进入 classifier。
2. 这要求页面或生成阶段显式展开大量 selector，维护成本高。
3. 用户需求并不是增加一条新流程，而是在“已经红了”的地方再插一个简单判断条件。

本次要解决的不是“重新定义放过标准”，而是把既有放过标准接到一个更轻的失败分支上：

- strict compare 仍然先跑
- 只有红了以后才进入放行判断
- 每次扫描、每次复审、每次重新失败时都可以再次进入
- 放行标准仍然来自现有机器真值与 `UI-VISUAL-CONTRACT.yaml`

## 2. Goals

### 2.1 必须达到

1. 现有 UI 主链顺序完全不变。
2. 只有 strict screenshot compare 失败后，才执行放行判断。
3. 放行判断可在同一轮扫描的多个失败 case 上重复执行。
4. 再次复审、再次扫描时，如果同一 case 再次失败，必须重新判定，不能记忆上一次“已放过”。
5. 放行标准继续复用现有 `config.yaml` 中的 allowed / forbidden residual classes。
6. 判断所需的可读策略继续收敛到 `UI-VISUAL-CONTRACT.yaml`，不新增第二文件。
7. 报告中必须明确区分：
   - strict compare 直接通过
   - strict compare 失败后被放行
   - strict compare 失败且未放行

### 2.2 明确不做

1. 不把正常通过的 case 额外送入第二阶段判断。
2. 不把“放行”做成一次性豁免或人工审批状态。
3. 不新增独立 gate、独立 orchestrator、独立 waiver 文件。
4. 不要求每个页面维护一大段 page-level `residual_regions`。
5. 不重新讨论“允许哪些 residual class”这一全局标准。

## 3. Approaches Considered

### 方案 A：维持当前 page-level `residual_regions`

做法：

- 继续要求页面显式声明 `residual_regions`
- strict compare failure 后只有声明过的页面才能进入 classifier

优点：

- 语义最显式

缺点：

- 页面维护成本高
- 自动化率低
- 与“只想在红后插一个判断条件”的目标不一致

结论：

- 不采用

### 方案 B：生成阶段自动给每页展开默认 `residual_regions`

做法：

- 在 `prototype-extraction` 生成 `UI-VISUAL-CONTRACT.yaml` 时，为每页自动灌默认 selector

优点：

- 自动化率更高

缺点：

- 生成逻辑复杂
- 需要 archetype 和 selector 模板
- 仍然会把复杂显式展开产物灌进每页

结论：

- 本轮不采用

### 方案 C：在 strict compare failure 分支插入 module-level allowance hook

做法：

- strict compare 仍然先跑
- 只有 red case 才进入 allowance hook
- hook 读取：
  - `.claude/project/config.yaml` 的 allowed / forbidden residual classes
  - `UI-VISUAL-CONTRACT.yaml` 中的 module-level allowance policy
- 判断当前 case 是否可放行

优点：

- 不改主链顺序
- 不要求每页维护大量 selector
- 与用户想要的“红了以后再判一次”完全一致

缺点：

- 需要在 contract 顶层引入一段轻量 allowance policy
- 需要扩展报告字段与 guard 校验

结论：

- **推荐**

## 4. Design Decision

采用 **方案 C：在 strict screenshot compare failure 分支加入可重复进入的 allowance hook**。

执行语义固定为：

1. 先执行当前 strict compare
2. 若通过，当前 case 直接结束
3. 若失败，立即进入 allowance hook
4. 若 allowance hook 判定可放行，则当前 case 转为 `PASS`
5. 若 allowance hook 判定不可放行，则当前 case 维持 `FAIL`
6. 进入下一个 case

该语义在以下情况下重复成立：

1. 同一轮扫描中多个 case 分别失败
2. 同一 case 在下一次复审中再次失败
3. module verify / ui visual gate / final gate 在不同阶段再次遇到失败 case

本设计不引入记忆豁免；每次 red 都重新按同一标准判定一次。

## 5. Existing-Entrypoint Inventory

### 5.1 真值与派生产物

- `.claude/project/config.yaml`
  - UI residual allowed / forbidden policy 机器真值
- `osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml`
  - 模块级 visual contract 派生产物

### 5.2 现有执行入口

- `bin/ui-visual-case-verify.sh`
- `bin/ui-visual-baseline.sh`
- `bin/ui-visual-gate.sh`
- `bin/final-gate.sh`
- `bin/final-closure.sh`

### 5.3 现有 compare 与分类实现

- `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
- `osg-frontend/tests/e2e/support/visual-contract.ts`
- `osg-frontend/tests/e2e/support/visual-residual-classifier.ts`

### 5.4 现有 guard

- `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
- `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py`

## 6. Guard Reuse / Collision Audit

### 6.1 为什么复用 `ui_visual_contract_guard.py`

原因：

1. allowance policy 仍属于 visual contract schema 的一部分。
2. 它最适合在最早 choke point 拦住：
   - 顶层字段缺失
   - 非法 class
   - 与 `config.yaml` allowed / forbidden policy 冲突

因此不新建：

- `ui_visual_allowance_guard.py`
- `ui_visual_red_branch_guard.py`

### 6.2 为什么不新建独立 allowance gate

原因：

1. 用户要求只是“插入流程中的一个判断条件”。
2. 现有真实 compare 执行点已经在 `visual-contract.e2e.spec.ts`。
3. 若新增独立 gate，会改变主链心理模型并增加维护面。

### 6.3 `ui_critical_evidence_guard.py` 的角色

继续复用，用于审计 failure / allowance evidence 是否完整，至少要能区分：

1. strict pass
2. strict fail but allowed
3. strict fail and rejected

## 7. Source-Stage Integration Path

### 7.1 唯一策略真值

- `.claude/project/config.yaml`
  - 继续定义 allowed / forbidden residual classes

### 7.2 模块级 contract 接入点

最早接入文件：

- `osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml`

本轮不要求页面级显式 `residual_regions`；改为在 contract 顶层新增轻量 policy，例如：

- `post_failure_allowance`
  - `enabled`
  - `repeat_on_each_failure`
  - `scope`
  - 轻量 selector / matching policy

该顶层 block 仍属于同一 visual contract 文件，不形成第二真源。

### 7.3 真源链不变

- `prototype-extraction` 继续生成 `UI-VISUAL-CONTRACT.yaml`
- 只是扩展生成结果或后续维护结果中的顶层 allowance policy
- 不允许 final gate 第一次“发明” allowance policy

## 8. Architecture

### 8.1 Contract 结构

`UI-VISUAL-CONTRACT.yaml` 顶层增加轻量 policy，页面与 surface 结构尽量不变：

1. `post_failure_allowance.enabled`
2. `post_failure_allowance.repeat_on_each_failure`
3. `post_failure_allowance.mode = strict_red_branch_only`
4. `post_failure_allowance` 中仅保存这次 hook 需要读取的轻量标准

不再要求：

1. 每个页面重复维护大段 `residual_regions`
2. 生成阶段把复杂 selector 全量展开到所有页面

### 8.2 Compare 失败分支

在 `visual-contract.e2e.spec.ts` 的 strict compare `catch` 分支中追加 allowance hook：

1. 读取当前 module contract
2. 检查 `post_failure_allowance.enabled`
3. 若未启用，维持当前失败行为
4. 若启用，按现有 classifier 标准对本次 diff 做一次 allowance judgement
5. 根据 judgement 结果决定当前 case 的最终结果

### 8.3 可重复进入语义

allowance hook 没有记忆状态：

1. 本轮扫描中每个 red case 独立判断
2. 下一轮复审若再次 red，则再次判断
3. 不保存“上次已放过”的缓存文件

## 9. Data Flow

### 9.1 正常通过路径

1. 读取 contract
2. strict compare pass
3. 直接写入 pass report

### 9.2 红后放行路径

1. 读取 contract
2. strict compare fail
3. 读取 `post_failure_allowance`
4. 复用现有 residual classifier 标准做 allowance judgement
5. 若通过，写入 `strict_failed_but_allowed`
6. 当前 case 返回 pass

### 9.3 红后不放行路径

1. 读取 contract
2. strict compare fail
3. allowance judgement fail
4. 写入 `strict_failed_and_rejected`
5. 当前 case 保持 fail

## 10. Error Handling

### 10.1 Contract 缺失或非法

行为：

- 直接 fail-closed
- 不允许因为 allowance policy 缺失而默认放行

### 10.2 Allowance judgement 自身报错

行为：

- 当前 case 维持 strict failure
- 报告记录 allowance hook error
- 不允许“判断器坏了就默认放过”

### 10.3 配置与 contract 冲突

行为：

- 由 `ui_visual_contract_guard.py` 最早阻断
- 例如 contract 试图允许 `unknown` 或 `captcha_like`

## 11. Testing Strategy

### 11.1 单元测试

新增或扩展：

1. `visual-residual-classifier` 现有分类测试
2. 新增 allowance policy 解析测试
3. 新增 strict failure -> allowance pass / reject 分支测试

### 11.2 Guard 自测

扩展：

1. `ui_visual_contract_guard.py` fixture
2. 非法顶层 allowance policy schema
3. allowance policy 与 config policy 冲突

### 11.3 运行链回归

必须验证：

1. `single_case_verify` 中 red case 能进入 allowance hook
2. `module_verify` 中多个 red case 可分别进入 allowance hook
3. `ui_visual_gate` / `final_gate` 不需要重新编排也能保留此行为
4. 正常 strict pass case 不会额外进入 allowance hook

## 12. Stage-Regression Verification

### 12.1 最早 choke point

必须先证明 schema / policy 在 contract guard 就能被拦住：

```bash
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py \
  --contract osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml \
  --output-json osg-spec-docs/tasks/audit/ui-visual-contract-summary-permission-$(date +%F).json
```

### 12.2 单项 red-branch proving ground

```bash
bash bin/ui-visual-case-verify.sh permission dashboard
```

要求看到：

1. strict compare 先失败
2. allowance hook 被调用
3. 最终结果有明确 evidence

### 12.3 模块级重复进入验证

```bash
bash bin/ui-visual-gate.sh permission
```

要求看到：

1. 多个 red case 可分别进入 allowance judgement
2. 报告字段能区分 allowed / rejected

### 12.4 最终 gate 回归

```bash
bash bin/final-gate.sh permission
```

要求看到：

1. 主链顺序无变化
2. allowance 只存在于 strict failure 分支
3. final evidence 仍完整可审计

## 13. Open Risks

1. 若 contract 顶层 allowance policy 过宽，可能让 red-branch 判断吞掉真实问题。
2. 若 allowance report 字段不够清晰，会让“严格通过”和“失败后放过”混在一起。
3. 若 failure 分支的 hook 写得过深，后续 page / surface 行为可能出现不一致。

因此本轮必须坚持：

1. fail-closed
2. 主链顺序不变
3. 只在 red branch 生效
4. 每次 red 重新判定

## 14. Decision Summary

最终方案：

1. 不改变现有 UI 严格交付主链
2. 不要求每页维护大段 `residual_regions`
3. 不新增第二真源文件
4. 在 strict screenshot failure 后插入一个 allowance judgement hook
5. hook 每次 red 都重新执行
6. 标准继续复用 `config.yaml` 与 `UI-VISUAL-CONTRACT.yaml`
7. evidence 必须能区分：
   - strict pass
   - strict fail but allowed
   - strict fail and rejected
