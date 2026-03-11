# UI Strict Delivery Chain Design

> Date: 2026-03-11
> Status: Approved
> Owner: workflow-framework
> Standard Baseline: `docs/plans/FOUR-PACK-STANDARD.md`
> Scope: 将 UI 严格修复与收口规则补进项目全链路机器真值、现有 guard 与 gate 入口，避免通过宽豁免、绕过单项证据或跳过正式门禁来“修复” UI 问题
> Non-goals: 不新增第二真源；不重写现有 workflow state machine；不把 `superpowers` 引入任何正常业务开发主链；不改业务页面实现

---

## 0.1 与上位标准关系（2026-03-11）

1. 本设计遵循 `docs/plans/FOUR-PACK-STANDARD.md` 的四件套治理与执行门禁要求。
2. 本设计只定义 UI 严格交付链路的框架层规则，不重写现有运行态同构、真源同步、视觉契约演进等上位设计。
3. 如本设计与上位标准冲突，以上位标准为准，并先更新上位标准再回改本文。

## 1. Problem Statement

当前项目已经具备以下能力：

1. `HTML prototype -> PRD -> UI-VISUAL-CONTRACT` 的真源链路
2. `context-preflight` / `runtime-port-guard` 的运行态守卫
3. `ui-visual-baseline` / `ui-visual-gate` / `final-gate` / `final-closure` 的视觉与最终门禁
4. `ui_visual_contract_guard.py` 与 `ui_critical_evidence_guard.py` 的视觉契约与证据审计

但框架仍缺一个明确、机器可执行的 UI 严格交付政策：

- 哪些“视觉放宽”是被禁止的
- UI 修复是否必须先单项复现和回归
- 单项修复之后是否必须继续经过模块 gate 和最终 gate
- `superpowers` 在 UI 相关工作里是否允许进入正常交付主链

这会造成三类重复风险：

1. 同一个 UI 问题会在不同会话里被用不同方式处理
2. contract 宽豁免、mask、比例阈值等策略可能被当成 UI 修复手段
3. 单项问题即便修好，也可能跳过模块 gate / final gate，导致“局部绿、整体未收口”

本次设计目标不是新造一套 UI 流程，而是把现有全链路上的 UI 严格交付规则补齐，并让这些规则以 `config.yaml` 为单一机器真值。

## 2. Goals

### 2.1 必须达到

1. `superpowers` 的适用边界机器可读且无歧义
2. UI 严格交付政策进入单一机器真值
3. 视觉 contract 在最早阶段拦下宽豁免策略
4. UI 修复必须有单项证据入口，而不是只靠全量 gate
5. 正式收口仍然必须经过模块 gate、`final-gate` 和 `final-closure`
6. 新规则复用现有 guard 与 gate，不引入职责冲突

### 2.2 明确不做

1. 不允许把说明性文档升级为第二真源
2. 不把业务页面实现、UI 样式修复、API 修复等正常交付工作迁移到 `superpowers`
3. 不新增平行 orchestrator 去替代 `ui-visual-gate` 或 `final-gate`
4. 不允许 final stage 第一次“发明”新产物或新规则

## 3. Approaches Considered

### 方案 A：只补文档说明

做法：

- 在 `32_项目机器真值.md`、`31_项目配置.md` 中补充 UI 严格修复规则

优点：

- 改动最小

缺点：

- 只能提醒，不能阻断错误做法
- 后续仍然依赖会话记忆和人工执行

结论：

- 不推荐

### 方案 B：`config.yaml + 说明文档 + 现有 guard / gate 接入`

做法：

- 在 `config.yaml` 中新增 `normal_business_delivery_forbid_superpowers` 和 `ui_delivery_policy`
- 文档只解释，不成第二真源
- 让 `ui_visual_contract_guard.py`、`ui_critical_evidence_guard.py`、`ui-visual-gate`、`final-gate`、`final-closure` 复用这一政策
- 增加一个正式的单项 UI 验证入口

优点：

- 单一真值清晰
- 早期 guard 可拦错
- 复用现有 gate，职责边界清楚

缺点：

- 需要补少量入口接线与自测

结论：

- **推荐**

### 方案 C：新增独立 UI Repair Orchestrator

做法：

- 新建一套专门管理 UI 修复阶段的 orchestrator 和规则

优点：

- 理论上一致性最强

缺点：

- 与现有 gate 链路职责重叠
- 侵入性过大
- 会制造新的流程概念和维护成本

结论：

- 本轮不采用

## 4. Design Decision

采用 **方案 B：在 `config.yaml` 中固化 UI 严格交付政策，并通过现有 guard / gate 复用执行**。

本次设计只新增一类机器真值和一个单项入口：

1. 机器真值：
   - `workflow_policy.normal_business_delivery_forbid_superpowers: true`
   - `ui_delivery_policy.*`
2. 单项入口：
   - `bin/ui-visual-case-verify.sh`

除此之外，其余执行链继续复用既有入口与 guard。

## 5. Existing-Entrypoint Inventory

### 5.1 真源与派生产物入口

- `osg-spec-docs/source/prototype/*.html`
  - UI 唯一真源
- `osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml`
  - 视觉契约派生产物
- `bin/check-skill-artifacts.sh`
  - 负责 PRD / contract / truth-source 审计

### 5.2 运行态与视觉执行入口

- `bin/context-preflight.sh`
  - 运行态模式真值校验
- `bin/runtime-port-guard.sh`
  - 单运行态收敛与端口环境守卫
- `bin/ui-visual-baseline.sh`
  - 模块级 baseline `generate / verify`
- `bin/ui-visual-gate.sh`
  - 模块级正式视觉 gate

### 5.3 最终质量收口入口

- `bin/final-gate.sh`
  - 汇总所有 verify-like gate
- `bin/final-closure.sh`
  - 最终收口与审计报告生成

### 5.4 现有视觉 guard

- `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
  - contract schema / baseline coverage / style-state 约束
- `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py`
  - verify-like 阶段 critical UI evidence 审计
- `.claude/skills/framework-audit/SKILL.md`
  - 框架改动后的全局一致性终审

## 6. Guard Reuse / Collision Audit

### 6.1 为什么复用现有 guard

当前 UI 相关职责已经被拆开：

- `ui_visual_contract_guard.py` 负责“contract 是否合法”
- `ui_critical_evidence_guard.py` 负责“失败证据是否完整”
- `ui-visual-gate.sh` 负责“模块级正式视觉门禁”
- `final-gate.sh` / `final-closure.sh` 负责“最终收口”

这意味着本次应扩展这些现有节点，而不是新建：

- `ui-strict-policy-guard.py`
- `ui-repair-orchestrator.sh`
- `ui-waiver-blocker.py`

否则会直接造成命名和职责重叠。

### 6.2 现有 guard 的扩展责任

- `ui_visual_contract_guard.py`
  - 读取 `ui_delivery_policy`
  - 负责拦宽豁免策略
- `ui_critical_evidence_guard.py`
  - 读取 `ui_delivery_policy`
  - 负责拦“失败无证据”或“证据不完整”
- `ui-visual-gate.sh`
  - 不承载策略真值，只继续串接 contract guard、critical evidence guard、运行态收敛
- `final-gate.sh` / `final-closure.sh`
  - 不重复定义 UI policy，只验证正式 gate 产物齐全且严格

### 6.3 新入口为什么允许存在

本轮唯一新增入口 `bin/ui-visual-case-verify.sh` 不与现有 gate 冲突，因为它只负责：

1. 单项 page / surface 的严格复现与回归
2. 生成完整 `baseline / actual / diff / summary` 证据
3. 作为“修复中间态”的正式入口

它不替代：

- `ui-visual-baseline.sh` 的模块级 verify
- `ui-visual-gate.sh` 的正式门禁
- `final-gate.sh` / `final-closure.sh` 的最终收口

## 7. Machine-Readable Policy

### 7.1 `workflow_policy` 新增边界

在 `config.yaml` 中新增：

```yaml
workflow_policy:
  normal_business_delivery_forbid_superpowers: true
```

语义：

- `superpowers` 仅用于框架补丁、流程补丁、guard/runtime/truth-source 策略修正
- `superpowers` 不得进入任何正常业务交付主链
- 正常业务交付包括：
  - UI 页面/组件实现与修复
  - backend/API/数据库实现与修复
  - 正常需求开发、测试修复、验证与收口

### 7.2 `ui_delivery_policy` 新增严格政策

在 `config.yaml` 中新增：

```yaml
ui_delivery_policy:
  strict_visual_contract: true
  forbid_diff_threshold_relaxation: true
  forbid_snapshot_bypass: true
  forbid_mask_waiver: true
  require_failure_evidence: true
  require_single_runtime_before_visual_gate: true
  required_repair_chain:
    - single_case_verify
    - module_verify
    - ui_visual_gate
    - final_gate
    - final_closure
```

语义：

- 视觉修复不允许通过宽阈值、截图旁路、mask 豁免来过门禁
- UI 问题必须先产出单项证据，再进入模块级与最终级收口
- 正式视觉门禁前必须满足单运行态

## 8. Source-Stage Integration Path

### 8.1 真值生成阶段

最早阶段仍然是：

1. `HTML prototype`
2. 派生 `PRD / UI-VISUAL-CONTRACT`
3. `bin/check-skill-artifacts.sh` 与 `ui_visual_contract_guard.py`

任何 UI 严格政策都必须在这一阶段可被读取与执行，不能等到 final-gate 才第一次出现。

### 8.2 单项修复阶段

新增 `bin/ui-visual-case-verify.sh`，作为最早的“修复中间态”入口。

输入：

- `module`
- `page_id` 或 `surface_id`
- 现有 `UI-VISUAL-CONTRACT.yaml`

输出：

- 单项 `baseline / actual / diff`
- 对应 summary 与 audit 产物

约束：

- 不得改 baseline
- 不得绕开 contract guard
- 必须经过 `context-preflight + runtime-port-guard`

### 8.3 模块级与最终级阶段

单项通过后，正式链路固定为：

1. `bin/ui-visual-baseline.sh {module} --mode verify --source app`
2. `bin/ui-visual-gate.sh {module}`
3. `bin/final-gate.sh {module}`
4. `bin/final-closure.sh {module}`

任何一个后续阶段失败，都表示“尚未正式收口”，不能因为单项已过而宣布完成。

## 9. Gate Behavior Changes

### 9.1 `ui_visual_contract_guard.py`

新增能力：

1. 从 `config.yaml` 读取 `ui_delivery_policy`
2. 当 `strict_visual_contract=true` 时，拒绝以下宽豁免：
   - 非零 `diff_threshold`
   - `snapshot_compare: false`
   - `mask_selectors`
   - `mask_allowed: true`
   - 动态区域 mask 或等价豁免字段
3. 输出明确违规字段与页面/Surface 定位

### 9.2 `ui_critical_evidence_guard.py`

新增能力：

1. 从 `config.yaml` 读取 `require_failure_evidence`
2. 在 verify-like stages 中，失败必须伴随：
   - `baseline_ref`
   - `actual_ref`
   - `diff_ref`
3. 缺任何一项即 fail

### 9.3 `ui-visual-gate.sh`

保持职责不变，只继续确保：

1. contract guard 先执行
2. 单运行态先收敛
3. 执行模块 verify
4. critical evidence guard 必须通过

### 9.4 `final-gate.sh` / `final-closure.sh`

保持职责不变，只要求：

1. 读取模块视觉产物
2. 继续执行 critical evidence guard
3. 记录第一失败证据
4. 不允许 baseline 在 gate 期间发生变化

## 10. Documentation Changes

### 10.1 `32_项目机器真值.md`

补充：

- `superpowers` 的业务边界
- `ui_delivery_policy` 的解释
- UI 修复必须经过单项证据、模块 gate、最终 gate 的链路说明

### 10.2 `31_项目配置.md`

补充：

- `workflow_policy.normal_business_delivery_forbid_superpowers`
- `ui_delivery_policy` 字段说明
- `config.yaml` 是唯一真值，说明文档只做解释

## 11. Stage-Regression Verification

### 11.1 Guard 自测

必须补：

- `ui_visual_contract_guard` 新 policy 的 selftest
- `ui_critical_evidence_guard` 新证据要求的 selftest

证明：

- 宽豁免会在最早 contract guard 阶段失败
- 失败无证据会在 critical evidence guard 阶段失败

### 11.2 入口烟测

必须覆盖：

1. 单项入口：
   - 故意指向一个合法 surface
   - 证明能生成单项证据
2. 模块入口：
   - `ui-visual-gate` 在严格 policy 下通过
3. 最终入口：
   - `final-gate` / `final-closure` 能继续消费同一套视觉产物

### 11.3 最早 choke point 证明

必须证明新规则不是只在最终阶段才触发：

1. 构造一个含 `diff_threshold` 的 contract fixture
   - 预期在 `ui_visual_contract_guard.py` 直接 fail
2. 构造一个缺 `diff_ref` 的 page-report fixture
   - 预期在 `ui_critical_evidence_guard.py` 直接 fail
3. 运行 `ui-visual-case-verify.sh`
   - 预期单项证据最先生成于单项入口，而不是 final-gate

## 12. Risks and Mitigations

### 风险 1：strict policy 过早阻断既有 contract

缓解：

- 先补 fixture/selftest，再对真实 contract 运行 guard
- 让错误信息明确到具体字段，避免大面积定位成本

### 风险 2：单项入口和模块 gate 产物结构不一致

缓解：

- 复用现有 `ui-visual-baseline` 审计目录和证据命名模式
- 不发明第二套 evidence schema

### 风险 3：`superpowers` 边界只写文档、不被执行

缓解：

- 先进入 `config.yaml`
- 后续由 framework 流程与审计读取这一边界，而不是只在说明文档里声明

## 13. Success Criteria

当以下条件同时满足时，本次框架补充视为完成：

1. `config.yaml` 中存在机器可读的 UI 严格交付政策
2. 文档与真值一致，但不形成第二真源
3. `ui_visual_contract_guard.py` 能在最早阶段拦截宽豁免
4. `ui_critical_evidence_guard.py` 能拦截失败证据不完整
5. 存在正式单项 UI 回归入口
6. `ui-visual-gate -> final-gate -> final-closure` 继续保持正式收口角色
7. `.claude/` 改动后的 `framework-audit` 通过
