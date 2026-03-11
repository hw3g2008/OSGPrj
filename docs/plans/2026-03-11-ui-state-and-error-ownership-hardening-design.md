# UI State And Error Ownership Hardening Design

> Date: 2026-03-11
> Status: Approved
> Owner: workflow-framework
> Standard Baseline: `docs/plans/FOUR-PACK-STANDARD.md`
> Scope: 将“多态 UI 状态语义必须被派生并验证”与“单错误单提示 owner”补进项目框架真值、现有 guard 与 verify 链，形成未来模块可复用的通用收口规则
> Non-goals: 不改单个业务模块实现；不新造第二真源；不把 forgot-password 特例硬编码进框架；不重写现有 workflow state machine

---

## 0.1 与上位标准关系（2026-03-11）

1. 本设计遵循 `docs/plans/FOUR-PACK-STANDARD.md` 的四件套治理与执行门禁要求。
2. 本设计只补“状态语义派生”与“错误提示 owner”两条通用框架规则，不改写现有单真源、运行态、严格视觉收口和最终 gate 的上位设计。
3. 如本设计与上位标准冲突，以上位标准为准，并先更新上位标准再回改本文。

## 1. Problem Statement

最近这轮 `permission` 模块修复里暴露出两类会反复出现的问题：

1. 多态 UI 状态语义在 `prototype -> component` 派生过程中丢失  
   典型表现是 forgot-password 第 3 步进度点，本应是“前两点已完成=绿色，当前点=蓝色，未到=灰色”，但组件实现把三态压成了二态。
2. 同一个错误被多个层级重复提示  
   典型表现是共享 request 拦截器已经弹了错误 toast，组件 `catch` 里又弹一次，用户最终看到两个相同错误提示。

这两类问题的共同点是：

- 都不是单个模块独有的问题
- 都不应该依赖人工 UI 巡检才发现
- 都有明确的“更早 choke point”可以拦

当前框架虽然已经具备：

- `HTML prototype -> PRD -> UI-VISUAL-CONTRACT / DELIVERY-CONTRACT`
- `ui_visual_contract_guard.py`
- `ui-state-contract.e2e.spec.ts`
- `delivery_contract_guard.py`
- `behavior_contract_guard.py`

但仍缺两条机器可执行的通用规则：

1. 多态部件必须显式声明状态覆盖并进入 verify
2. 单个失败路径必须只有一个用户可见错误 owner

## 2. Goals

### 2.1 必须达到

1. 未来任意模块的 stepper / progress dots / tabs / wizard-step / status chip 等多态部件，都必须在 contract 中显式声明状态覆盖
2. 现有 verify 链要能在最早阶段拦下“只有 default state、没有 completed/active/error 等状态语义”的 contract
3. 未来任意模块的失败路径，都必须有单错误单提示 owner 的机器规则
4. `DELIVERY-CONTRACT -> behavior report -> behavior_contract_guard` 要能表达并验证“只出现一个用户可见错误提示”
5. 两条规则都必须通用，不得做成 forgot-password 特例

### 2.2 明确不做

1. 不把单个组件 CSS/DOM 细节写死进框架
2. 不在 `final-gate` 第一次发明新规则
3. 不绕过现有 guard，新造平行 `ui-state-policy-guard` 或 `single-error-owner-guard`
4. 不把原型 truth source 之外的派生产物升级为第二真源

## 3. Approaches Considered

### 方案 A：只补文档约束

做法：

- 在 PRD / 测试用例 / 开发规范里写“多态组件必须校验状态”“错误提示不能重复”

优点：

- 改动最小

缺点：

- 只能提醒，不能阻断
- 未来下个模块依然会因为派生疏漏或 owner 冲突而重复犯错

结论：

- 不推荐

### 方案 B：两条通用框架规则，分别接入 UI strict chain 与 behavior chain

做法：

- 在 `config.yaml` 写入两类机器真值
- 复用 `ui_visual_contract_guard.py` + `ui-state-contract.e2e.spec.ts` 拦多态状态覆盖缺失
- 复用 `delivery_contract_guard.py` + `behavior_contract_guard.py` 拦重复错误提示 owner 缺失
- 使用 `permission` 的 forgot-password 作为 proving ground，但规则本身不绑定该模块

优点：

- 早期可拦
- 能覆盖未来模块
- 不引入第二条流程

缺点：

- 需要同时改 contract schema、guard、自测和 proving-ground 报告

结论：

- **推荐**

### 方案 C：在 final-gate / final-closure 做兜底检查

做法：

- 保持前面链路不动，只在最终 gate 汇总时检查状态和重复提示

优点：

- 接线最少

缺点：

- 发现太晚
- 无法证明“最早 choke point 生效”
- 与当前框架要求相反

结论：

- 不采用

## 4. Design Decision

采用 **方案 B：将这两个问题分别固化为通用框架规则，并接入现有最早 guard / verify choke point**。

### 4.1 通用规则一：多态 UI 状态必须被派生并验证

新增机器真值，要求：

- 若 contract 声明了多态部件，例如：
  - `progress-indicator`
  - `stepper`
  - `tab-strip`
  - `status-indicator`
  - `wizard-step-indicator`
- 则必须声明对应状态覆盖：
  - 页面级：`state_cases`
  - surface 级：`state_variants + state_contracts`

框架语义是：

- `default` 不能再作为唯一状态
- “已完成 / 当前 / 未到 / 错误 / 禁用”等具有视觉差异的状态必须可执行、可验证

### 4.2 通用规则二：单个失败路径只能有一个用户可见错误 owner

新增机器真值，要求：

- 单个失败路径只能由一个层级负责用户可见错误提示
- 合法 owner 只有两类：
  - `shared_request_layer`
  - `component_local`
- 若组件选择本地 owner，必须显式禁止共享层重复弹错

框架语义是：

- “提示出现了”不够
- 必须能验证“只出现一次”
- 行为报告需要包含用户可观察的错误提示数量，而不是只记录 message 文案

## 5. Existing-Entrypoint Inventory

### 5.1 真源与派生产物

- `osg-spec-docs/source/prototype/*.html`
  - UI 唯一真源
- `osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml`
  - 视觉 contract 派生产物
- `osg-spec-docs/docs/01-product/prd/{module}/DELIVERY-CONTRACT.yaml`
  - 交付/行为 contract 派生产物

### 5.2 现有 UI 状态执行入口

- `osg-frontend/tests/e2e/ui-state-contract.e2e.spec.ts`
  - 页面级 `state_cases`
- `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
  - surface `state_contracts`
- `osg-frontend/tests/e2e/support/visual-contract.ts`
  - contract 类型定义

### 5.3 现有 guard

- `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
  - UI visual contract schema / strict policy / style-state guard
- `.claude/skills/workflow-engine/tests/delivery_contract_guard.py`
  - DELIVERY-CONTRACT schema guard
- `.claude/skills/workflow-engine/tests/behavior_contract_guard.py`
  - 行为报告与 invariants guard

### 5.4 现有行为报告生成与消费入口

- `osg-frontend/tests/e2e/support/behavior-report.ts`
  - 行为报告写入器
- `bin/e2e-api-gate.sh`
  - verify 阶段行为报告生成
- `bin/final-gate.sh`
  - behavior report 守卫消费入口

## 6. Guard Reuse / Collision Audit

### 6.1 多态状态规则为什么扩展 `ui_visual_contract_guard.py`

原因：

- 它已经是 UI contract 最早 schema / policy choke point
- 它本来就读取 `config.yaml` 的 UI policy
- 它最适合拦“有多态部件，但没有状态覆盖”的 contract

因此禁止新建：

- `ui_multistate_policy_guard.py`
- `state-coverage-blocker.py`

### 6.2 单错误 owner 规则为什么扩展现有 delivery / behavior guards

原因：

- `delivery_contract_guard.py` 已负责行为契约结构验证
- `behavior_contract_guard.py` 已负责行为报告 invariant 验证
- 只需扩一个新的 invariant 和 observable_response 字段约束即可

因此禁止新建：

- `single-error-owner-guard.py`
- `toast-dedup-guard.py`

### 6.3 为什么不把规则塞进 final-gate

- `final-gate` 应消费产物，不应成为第一发现点
- 两条规则都存在更早 choke point：
  - 多态状态：contract guard
  - 单错误 owner：delivery/behavior guard

## 7. Machine-Readable Policy

### 7.1 `ui_delivery_policy` 新增多态状态要求

在 [config.yaml](/Users/hw/workspace/OSGPrj/.claude/project/config.yaml) 中新增：

```yaml
ui_delivery_policy:
  require_state_coverage_for_multistate_widgets: true
  multistate_widget_part_ids:
    - progress-indicator
    - stepper
    - tab-strip
    - status-indicator
    - wizard-step-indicator
```

语义：

- 若 page / surface contract 出现以上部件之一，必须声明可执行状态覆盖
- page 走 `state_cases`
- surface 走 `state_variants + state_contracts`

### 7.2 `frontend_feedback_policy` 新增单错误 owner 要求

在 [config.yaml](/Users/hw/workspace/OSGPrj/.claude/project/config.yaml) 中新增：

```yaml
frontend_feedback_policy:
  single_error_owner: true
  forbid_duplicate_user_visible_errors: true
  allowed_error_owners:
    - shared_request_layer
    - component_local
  require_visible_error_message_count_in_behavior_report: true
```

语义：

- 同一失败路径只能有一个错误提示 owner
- behavior report 必须携带 `visible_error_message_count`
- invariant 可以对数量进行验证

## 8. Source-Stage Integration Path

### 8.1 多态状态规则

- 最早真值生成阶段：
  - `.claude/project/config.yaml`
- 最早派生产物阶段：
  - `UI-VISUAL-CONTRACT.yaml`
- 最早阻断阶段：
  - `ui_visual_contract_guard.py`
- 最早执行阶段：
  - `ui-state-contract.e2e.spec.ts` 或 `visual-contract.e2e.spec.ts`

### 8.2 单错误 owner 规则

- 最早真值生成阶段：
  - `.claude/project/config.yaml`
- 最早派生产物阶段：
  - `DELIVERY-CONTRACT.yaml`
- 最早阻断阶段：
  - `delivery_contract_guard.py`
- 最早执行与验证阶段：
  - `forgot-password.e2e.spec.ts` 等行为用例生成 `behavior-contract-*.json`
  - `behavior_contract_guard.py`

### 8.3 关键限制

1. `state_cases / state_contracts` 不允许第一次出现在 `final-gate`
2. `visible_error_message_count` 不允许第一次出现在 `final-gate`
3. proving-ground 可以先用 `permission` 模块，但规则与字段必须模块无关

## 9. Generic Proving Ground

本次落地使用 `permission` 模块的 forgot-password 作为 proving ground，仅用于证明规则可执行：

- 多态状态 proving ground：
  - `modal-forgot-password`
  - `progress-indicator`
  - 第 3 步“前两点绿、当前点蓝、其余灰”
- 单错误 owner proving ground：
  - `forgot-password-verify-code`
  - `invalid-code`
  - `visible_error_message_count = 1`

验证通过后，规则本身不保留 forgot-password 专属命名。

## 10. Expected Framework Behavior After Hardening

落地后，未来任何模块若出现以下情况，都应在最早阶段失败：

1. 原型里有 stepper / tabs / progress dots，但派生 contract 只保留 default state
2. surface 声明了 `progress-indicator`，却没有任何 completed / active / error 的状态覆盖
3. DELIVERY-CONTRACT 试图声明“错误提示”行为，但 behavior report 不记录可见错误数量
4. 真实 verify 里同一错误出现两条 toast，而 contract / report 没有把它视为失败

## 11. Stage-Regression Verification Approach

### 11.1 多态状态最早 choke point

- 构造含 `progress-indicator` 但缺少非 default 状态覆盖的 contract fixture
- 运行 `ui_visual_contract_guard.py`
- 预期：guard 直接失败，不进入后续 visual verify

### 11.2 单错误 owner 最早 choke point

- 构造含 `single_observable_error_message_for` 的 DELIVERY-CONTRACT fixture
- 提供 `visible_error_message_count = 2` 的 behavior report fixture
- 运行 `behavior_contract_guard.py`
- 预期：guard 直接失败，不等待 final closure 才发现

### 11.3 proving-ground 回归

- `modal-forgot-password` 的 step-3 状态 contract 必须执行通过
- `forgot-password-verify-code invalid-code` 行为报告必须记录：
  - `visible_error_message_count: 1`
  - invariant PASS

### 11.4 终审

- `.claude/` 级文件改动后必须继续运行 `framework-audit`

## 12. Open Decisions Closed By This Design

1. “是不是 PRD 里没有？”  
   - 多态状态：不是，原型真源已有，漏在派生 contract 和 verify  
   - 单错误提示：部分是行为要求没写透，所以需要在 DELIVERY-CONTRACT 层补成机器规则
2. “要不要做成模块特例？”  
   - 不做。必须是通用框架规则
3. “在哪一步拦最合适？”  
   - 多态状态：`ui_visual_contract_guard.py`
   - 单错误 owner：`delivery_contract_guard.py` + `behavior_contract_guard.py`
