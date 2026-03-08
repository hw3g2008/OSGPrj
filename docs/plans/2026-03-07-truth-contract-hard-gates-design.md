# Truth Contract Hard Gates Design

> 日期：2026-03-07
> 范围：需求到交付全链路的真实性约束与关键 UI 约束
> 目标：消除“伪实现”“假通过”“跳步完成”，让后续模块在同一框架下稳定落地

---

## 1. 问题定义

当前框架已经补上了以下能力：

- `requirements -> story/test` 覆盖守卫
- `menu -> route -> view` 结构守卫
- `permission code` 一致性守卫
- `runtime contract` 运行时统一契约

这些能力已经能显著降低“需求漏拆”“运行口径漂移”“结构不一致”的风险。

但最新回源暴露出两类更深层的问题：

1. 功能真实性未被强制约束
- 典型案例：找回密码流程对外表现为“发送验证码”，但当前后端仅将验证码写入 Redis，并未真实发信。
- 这类问题能够在接口层和 E2E 层伪装成“流程可用”，但不满足真实业务交付要求。

2. 关键 UI 细节未被强制约束
- 典型案例：登录页验证码区域存在明显灰底与容器覆盖问题，但由于视觉门禁对整块区域做了 mask，且 style contract 未覆盖背景/裁剪/铺满关系，导致门禁未能拦截。

本质上，当前框架更擅长保证：
- 链路存在
- 资产一致
- 运行可通

但还不够擅长保证：
- 功能没有被降级实现
- UI 关键区域没有被局部掩盖
- AI 不能绕过契约直接进入下一阶段

---

## 2. 设计目标

### 2.1 必须达到

1. 任何模块、任何功能，不允许依赖预设功能名单做校验。
2. 所有关键能力必须按“属性”声明真实性要求，而不是按“功能名称”枚举。
3. 所有关键 UI 必须按“关键表面”声明不可 mask 区域与属性级断言。
4. 任一阶段缺少输入、状态、证据、覆盖四类约束之一，必须 fail。
5. AI 不得通过文本规则“自觉遵守”，而必须通过自动 guard 机制被硬性约束。
6. 新模块复用时，只需要提供模块 contract，不需要重写框架逻辑。

### 2.2 明确不做

1. 不在框架中硬编码 `login`、`forgot-password`、`payment` 等业务名称。
2. 不维护“邮件/短信/支付/回调”这类固定枚举名单作为主规则。
3. 不允许“开发/测试环境是假实现，只有正式环境才是真实现”的双轨制。
4. 不通过增加更多人工 checklist 解决问题。

---

## 3. 方案对比

### 方案 A：功能名单式校验

做法：
- 框架只对 `邮件/短信/上传/支付/回调` 等预设名单做检查。

优点：
- 上手简单。

缺点：
- 新能力会漏。
- 容易被规避：开发者只要说“这不属于那几类”就能绕过。

结论：
- 不采用。

### 方案 B：逻辑契约 + 分阶段 guard

做法：
- 引入逻辑层的 `delivery_contract` 与 `ui_critical_contract`
- 物理层由模块文件承载这些契约
- 在 `brainstorm -> story -> ticket -> implement -> verify -> final-gate` 各阶段做 fail-closed 检查

优点：
- 不依赖功能名称。
- 新模块可复用。
- 能同时覆盖功能真实性与 UI 真实性。

缺点：
- 需要补 contract schema、guard 与 workflow 接线。

结论：
- **采用**。

### 方案 C：只在 final-gate 兜底

做法：
- 所有新 guard 只接到 `final-gate`。

优点：
- 落地快。

缺点：
- 仍会允许 AI 和开发流程在中间阶段白做一大段错误工作。
- 不能真正防跳步，只能防最终假绿。

结论：
- 仅保留为最后一道兜底，不作为主策略。

---

## 4. 核心设计

## 4.1 逻辑 contract 与物理载体

为了避免增加新的真源分叉，本设计区分“逻辑 contract”和“物理文件载体”：

### 逻辑 contract

1. `delivery_contract`
- 描述功能/能力的真实性与证据要求。

2. `ui_critical_contract`
- 描述关键 UI 区域的不可掩盖、样式、状态与验收要求。

### 物理载体

1. `DELIVERY-CONTRACT.yaml`
- 新增，作为模块级功能真实性 contract 载体。

2. `UI-VISUAL-CONTRACT.yaml`
- 沿用现有文件，但扩展字段，使其物理上承载 `ui_critical_contract`。

这样做的原因是：
- 功能真实性目前没有现成承载文件，需要新增独立文件。
- UI 契约当前已有 `UI-VISUAL-CONTRACT.yaml`，继续沿用可以避免再引入一个重复真源文件。

---

## 4.2 delivery_contract 模型

`delivery_contract` 不是“功能是什么”，而是“这个能力具有什么真实性属性”。

建议字段：

```yaml
schema_version: 1
module: permission
capabilities:
  - capability_id: forgot-password-send-code
    source_refs:
      - prd: 00-admin-login.md#5.1
      - srs: permission.md#FR-001.3
    effect_scope: external
    effect_kind: email_reset_code
    truth_mode: real
    provider_class: smtp
    evidence_mode: mailbox
    verification_stage: verify
    required_artifacts:
      - provider_config
      - send_evidence
      - audit_event
    behavior_contract:
      scenarios:
        - scenario_id: known-identity
          input_class: known_identity
          expected_result: accepted
        - scenario_id: unknown-identity
          input_class: unknown_identity
          expected_result: accepted
      invariants:
        - same_observable_response_for:
            - known-identity
            - unknown-identity
    content_contract:
      forbidden_literals:
        - "null"
        - "undefined"
        - "[object Object]"
      required_tokens:
        - "验证码"
        - "5 分钟"
    evidence_contract:
      must_exist_for:
        - known-identity
      must_not_exist_for:
        - unknown-identity
```

字段说明：
- `capability_id`: 模块内唯一能力标识。
- `source_refs`: 回源到 PRD/SRS 的来源锚点。
- `effect_scope`:
  - `none`
  - `internal`
  - `external`
- `effect_kind`: 任意自由字符串，但必须声明。
- `truth_mode`: 当前设计只允许 `real`。
- `provider_class`: 对外能力的真实承载类别，如 `smtp`、`oss`、`payment-gateway`、`webhook-outbound`。
- `evidence_mode`: 如何证明此能力真实发生，如 `mailbox`、`provider_log`、`storage_object`、`callback_log`、`db_record`。
- `verification_stage`: 必须在哪个阶段前完成真实性校验。
- `required_artifacts`: 此能力必须落地的证据清单。
- `behavior_contract`: 不同输入场景下的可观察行为与不变量约束。
- `content_contract`: 对外输出内容的质量约束，不绑定邮件/短信等具体业务名称。
- `evidence_contract`: 哪些场景必须留下证据、哪些场景必须明确不留下证据。

### delivery_contract 铁律

1. 未声明 capability = fail
2. 未声明 effect_scope/effect_kind/evidence_mode = fail
3. `truth_mode != real` = fail
4. 在非测试桩目录中出现 `mock/fixed/noop/fake` 降级实现 = fail
5. 缺少声明要求的证据 = fail
6. 缺少 `behavior_contract` / `content_contract` / `evidence_contract` 中任一必需条目 = fail

---

## 4.3 ui_critical_contract 模型

逻辑上是 `ui_critical_contract`，物理上落在 `UI-VISUAL-CONTRACT.yaml` 扩展字段中。

建议扩展：

```yaml
pages:
  - page_id: login-page
    route: /login
    critical_surfaces:
      - surface_id: login-panel
        selector: ".login-box"
        mask_allowed: false
        required_anchors:
          - ".login-title"
          - ".login-btn"
      - surface_id: captcha-block
        selector: ".captcha-row .captcha-code"
        mask_allowed: false
        style_contracts:
          - property: background-color
            expected: rgb(241, 245, 249)
          - property: border-radius
            expected: 10px
        relation_contracts:
          - type: cover-container
            target: "img"
        state_contracts:
          - state: loaded
            assertions:
              - property: width
                expected: 120px
```

说明：
- `critical_surfaces`: 页面关键表面列表。
- `mask_allowed: false`: 关键区不得整体 mask。
- `style_contracts`: 静态属性断言。
- `relation_contracts`: 元素之间的覆盖/裁剪/对齐关系断言。
- `state_contracts`: 关键状态断言，如 `focus/hover/loading/error/loaded`。

### ui_critical_contract 铁律

1. 页面关键区域未声明 = fail
2. `mask_allowed: false` 的区域被整体 mask = fail
3. 缺少 `style_contracts` 或 `state_contracts` 中规定的必需断言 = fail
4. 关键 UI 只做截图 diff、没有属性级证据 = fail

---

## 4.4 分阶段约束模型

框架不允许再依赖“最后一关才发现问题”。约束必须前移。

### 阶段 1：brainstorm / PRD-SRS

输入：
- PRD
- SRS
- 原型

必须产出：
- `DELIVERY-CONTRACT.yaml`
- 扩展后的 `UI-VISUAL-CONTRACT.yaml`

规则：
- 只要存在关键能力或关键 UI，就必须先声明 contract。
- 未声明 contract，不允许进入 `split-story`。

物理落点与职责：
- `prototype-extraction`
  - 负责根据原型/PRD 首次生成或更新模块级 `DELIVERY-CONTRACT.yaml`
  - 负责在 `UI-VISUAL-CONTRACT.yaml` 中生成页面级 `critical_surfaces` 初稿
- `brainstorming`
  - 负责补全 `source_refs`、`verification_stage`、`required_artifacts`、`style_contracts/state_contracts`
  - 负责把无法自动判定的 contract 缺口写入 `DECISIONS.md`
- `.windsurf/workflows/brainstorm.md`
  - 必须把 contract 生成与门控写成 Phase 0/1 的显式步骤
  - contract 缺失或未闭合时，禁止进入 `split-story`

### 阶段 2：split-story

输入：
- requirement docs
- delivery/ui contracts

必须校验：
- 每个 in-scope requirement 项都映射到 Story。
- 每个 Story 都标明承接哪些 `capability_id` / `surface_id`。
- 每个 Story 都必须同步生成 story 级测试骨架，覆盖：
  - capability 对应的行为场景
  - content_contract 的关键输出约束
  - critical surface 的 style/state 约束

规则：
- requirement 无 story 覆盖 = fail
- contract 无 story 承接 = fail
- Story 已生成但缺少 story 级测试骨架 = fail

### 阶段 3：split-ticket

输入：
- approved stories
- delivery/ui contracts

必须校验：
- Story 下所有 contract 要求都拆到 Ticket。
- `external/internal critical effect` 必须存在“真实性实现 Ticket”和“真实性验证 Ticket/AC”。
- `critical surface` 必须存在“UI 契约落地 Ticket”。
- 必须同步生成/更新：
  - `{module}-test-cases.yaml` 中的 TC 骨架
  - traceability matrix 映射
  - Ticket 级 verification/evidence stub

规则：
- Story 只拆了功能流程，没拆真实能力/关键 UI = fail
- Ticket 已拆分但测试资产未同步生成 = fail

### 阶段 4：implement

输入：
- approved tickets
- contracts

必须校验：
- 生产代码与正式配置中不得出现降级实现。
- 关键 UI 不得通过整体 mask 掩盖。
- 只能补实现代码、验证命令和证据路径。
- 不允许在 implement 阶段临时发明缺失的 test case / traceability 资产。

物理落点：
- `.windsurf/workflows/next.md`
- `.claude/skills/deliver-ticket/SKILL.md`

规则：
- 代码扫描发现 `fixed/mock/fake/noop` 降级实现 = fail
- 关键 surface 被整体 mask = fail
- implement 阶段发现上游缺少测试资产，应回退到生成该资产的阶段，而不是现场补写后继续

### 阶段 5：verify

输入：
- implementation
- contracts
- generated evidence

必须校验：
- `delivery_contract` 所需真实证据存在并格式正确。
- `ui_critical_contract` 所需 style/state evidence 存在并通过。
- `behavior_contract` 在不同输入场景下的行为不变量成立。
- `content_contract` 的输出内容质量成立。
- test assets 与 contract/story/ticket 保持完整映射。

物理落点：
- `.windsurf/workflows/verify.md`
- `.claude/skills/verification/SKILL.md`

规则：
- 接口 200 但无真实副作用证据 = fail
- 页面截图接近，但关键样式证据缺失 = fail
- 场景响应语义不满足 `behavior_contract` = fail
- 输出内容命中 `forbidden_literals` 或缺少 `required_tokens` = fail
- contract 已声明但 test asset 未生成/未映射 = fail

### 阶段 6：final-gate

职责：
- 反向全覆盖兜底。

必须反查：
- requirements -> contracts
- contracts -> stories
- stories -> tickets
- tickets -> tests/evidence
- pages -> critical surfaces -> visual evidence

规则：
- 任一链路断裂 = fail
- 在 final-gate 才发现“测试资产未生成”“行为契约未承接”“内容契约未承接”，应判定为前置阶段门禁缺失，而不是把回补当常态

---

## 4.5 Guard 架构

建议新增或扩展以下 guard：

1. `delivery_contract_guard.py`
- 校验 `DELIVERY-CONTRACT.yaml` 结构完整性、声明完整性。

2. `requirements_coverage_guard.py`（扩展现有）
- 在现有 `requirements -> stories/tests` 之外，新增 `requirements -> contracts` 覆盖检查。
- 负责“需求项是否已经声明为 capability / critical surface”。

3. `story_ticket_coverage_guard.py`（扩展现有）
- 复用现有 guard，不再重复拆成两个新文件。
- 负责：
  - Story 是否承接所有 contract 项
  - Ticket 是否完整拆解 Story 的 contract 约束
  - `external effect` 是否同时有实现与验证 coverage
  - `critical surface` 是否有 UI 落地 Ticket

4. `delivery_truth_guard.py`
- 校验实现中不存在降级模式。
- 校验真实 provider 配置与真实证据存在。
- `delivery_evidence_guard` 的职责并入本 guard，避免职责分裂。
- 物理接线必须同时覆盖：
  - `deliver-ticket / next`（实现阶段静态与配置前置检查）
  - `verify`（真实性证据检查）
  - `final-gate`（最终反向兜底）

5. `ui_visual_contract_guard.py`（扩展现有）
- 逻辑上承担 `ui_critical_contract_guard` 角色，物理上继续复用现有文件。
- 强制关键 surface 不可整体 mask、必须具备 style/state/relation contract。

6. `ui_critical_evidence_guard.py`
- 校验关键 UI 样式和状态证据。
- 物理接线必须同时覆盖：
  - `deliver-ticket / next`（关键 surface 不得整体 mask 的前置检查）
  - `verify`（style/state evidence 完整性检查）
  - `ui-visual-gate / final-gate`（最终视觉收口）

说明：
- `ui_critical_contract_guard` 是逻辑名称，不新增物理文件。
- 物理实现统一落在现有 `ui_visual_contract_guard.py` 中，避免 guard 名称与实现文件分叉。

7. `behavior_contract_guard.py`
- 按 contract 中声明的场景与不变量主动执行接口/能力验证。
- 逻辑上不识别业务名称，只识别：
  - `input_class`
  - `expected_result`
  - `same_observable_response_for`
- 物理接线必须覆盖：
  - `verify`
  - `final-gate`

8. `delivery_content_guard.py`
- 校验所有外部输出内容满足 `content_contract`。
- 不局限于邮件，可覆盖短信、导出文件、webhook payload、通知正文等。
- 物理接线必须覆盖：
  - `verify`
  - `final-gate`

9. `test_asset_completeness_guard.py`
- 校验 contract 约束是否已经在 story/ticket/test-case/matrix 中被完整承接。
- 物理接线必须覆盖：
  - `split-ticket`
  - `approve`
  - `verify`

---

## 4.6 Fail-Closed 原则

全链路统一遵循 fail-closed：

- 缺输入 = fail
- 缺声明 = fail
- 缺证据 = fail
- 缺映射 = fail
- 有降级实现 = fail
- 有关键 UI 掩盖 = fail
- 有模糊/歧义 = fail
- 缺少阶段内应生成的测试资产 = fail

没有 “warn and continue”。

### 4.6.1 过程优先、兜底阻断

本设计明确拒绝“先开发，后人工补测试资产”的工作方式。

正确顺序是：

1. `brainstorm / split-story`
- 先生成 contract 与 story 级测试骨架

2. `split-ticket`
- 再生成 ticket 级 TC、traceability、verification stub

3. `implement`
- 只允许补实现与证据，不允许补缺失资产

4. `verify`
- 校验行为、内容、UI、测试资产完整性

5. `final-gate`
- 仅做全链反查兜底

因此，final-gate 发现缺失时的正确动作是：
- 视为前置阶段门禁缺失
- 修框架流程
- 回退到应生成该资产的阶段重新生成

而不是把“后补”当成框架常态。

---

## 5. 通用性设计

为了让下一个模块、下一个同类项目直接复用，本设计只抽象以下稳定概念：

- capability
- effect_scope
- effect_kind
- truth_mode
- provider_class
- evidence_mode
- critical_surface
- mask_allowed
- style_contracts
- state_contracts
- relation_contracts

这些概念不依赖：
- 登录页
- 验证码
- 邮件
- 支付
- 权限模块

不同项目只需要：
- 换模块 contract 内容
- 不需要改 guard 逻辑

首轮通用范围：
- Spring Boot + Vue 项目

后续如需扩展到其他栈，只需要替换代码扫描器与证据适配器，不需要推翻 contract 模型。

---

## 5.1 源头集成要求

为了保证下一个模块直接复用，本设计不允许 contract 只在最终阶段补写。源头阶段必须接线：

- `.claude/skills/prototype-extraction/SKILL.md`
  - Step 4 输出清单必须显式包含 `DELIVERY-CONTRACT.yaml`
  - `UI-VISUAL-CONTRACT.yaml` 必须显式包含 `critical_surfaces` 初稿
- `.claude/skills/brainstorming/SKILL.md`
  - Phase 0/1/4 必须把 contract 生成、补全、决策闭环写入伪代码与门控
- `.windsurf/workflows/brainstorm.md`
  - 必须把 contract 作为 Phase 0/1 的硬前置，不允许“先写 SRS，后补 contract”
- `bin/check-skill-artifacts.sh`
  - `prototype-extraction` 门控必须校验上述两个 contract 文件存在且基本结构有效

这部分不落地，后续模块仍然会出现“最终 gate 才发现 contract 缺失”的晚发现问题。

---

## 5.2 Runtime Contract 与真实证据集成要求

`delivery_contract` 只定义能力属性，不承载具体环境密钥、服务地址、证据路径。

为了让“真实副作用”在开发/测试/预发布链路中可验证，必须把以下信息接入运行时真源：

- `deploy/runtime-contract.dev.yaml`
- 对应环境文件（如 `deploy/.env.dev`、`deploy/.env.test.example`）

至少需要补入的运行时字段：

- `providers`
  - 例如 `smtp`、`oss`、`payment-gateway`
- `evidence_sinks`
  - 例如 `mailbox`、`provider_log`、`callback_log`
- `evidence_paths`
  - 当前环境下用于验证真实副作用的路径/地址/收件箱

约束关系：

- `DELIVERY-CONTRACT.yaml` 里的 `provider_class` / `evidence_mode`
  必须能在 runtime contract 中找到对应 provider 与 evidence sink。
- runtime contract 未声明 provider/evidence path = fail
- 环境文件缺失对应配置 = fail
- 仍依赖固定验证码、假回执、空实现 = fail

这部分不落地，后续模块会继续出现“设计要求真实发信，但运行时真源没有 provider/evidence 落点”的悬空状态。

---

## 6. 验收标准

框架完成后的验收标准：

1. 任一新模块在 `brainstorm` 后必须生成完整 delivery/ui contracts。
2. 未声明 contract 的需求项无法进入 Story/Ticket 流程。
3. 含外部副作用或关键状态变更的能力，如果没有真实 provider 与真实 evidence，无法通过 `next/verify/final-gate`。
4. 关键 UI 区域如果依赖整体 mask、缺失 style/state/relation contract，无法通过 `next/verify/ui-visual-gate/final-gate`。
5. final-gate 必须能够反查并定位“需求漏项”“能力降级实现”“关键 UI 漏检”。
6. `prototype-extraction -> brainstorming -> split-story -> split-ticket -> next -> verify -> final-gate` 七个阶段必须都能触发相应 guard，而不是只在 `final-gate` 兜底。
7. 现有 guard 复用边界明确，不允许新增 guard 与现有 guard 职责重叠、命名冲突或双轨并存。

---

## 7. 对当前 permission 模块的直接影响

框架落地后，当前 permission 模块会立即暴露并要求修复以下问题：

1. 找回密码必须接入真实邮件发送，不能继续依赖 `resetCodeFixed`。
2. 当前验证码区域不能继续整体 mask，必须以关键 surface 方式重新定义 contract。
3. 登录页验证码区域灰底/裁剪/铺满问题必须通过属性级 guard 才能过。
4. 后续任何模块若存在“看起来实现了，但实际降级”的能力，都会被相同机制拦住。

---

## 8. 结论

最终采用：
- **属性驱动 contract + 分阶段 fail-closed guard**
- 而不是固定功能名单，也不是仅 final-gate 兜底

这套设计的核心收益是：
- 不再依赖 AI“自觉”不跳步
- 不再依赖人眼最后发现伪实现
- 不再因为新功能不在名单里而漏检
- 为后续模块提供真正可复用、可验证、可阻断的稳定框架
