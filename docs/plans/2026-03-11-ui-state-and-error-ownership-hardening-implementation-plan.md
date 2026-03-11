# UI State And Error Ownership Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.
>
> **Goal:** 将“多态 UI 状态必须被派生并验证”与“单个失败路径只能有一个用户可见错误 owner”落进项目框架真值、既有 guard 和 verify 链路，形成未来模块可复用的通用收口规则。
>
> **Architecture:** 以 `.claude/project/config.yaml` 作为唯一机器真值，分别扩展 `ui_visual_contract_guard.py` 和 `delivery_contract_guard.py` / `behavior_contract_guard.py`。继续复用 `ui-state-contract.e2e.spec.ts`、`visual-contract.e2e.spec.ts`、`behavior-report.ts`、`e2e-api-gate.sh`、`final-gate.sh`；使用 `permission` 的 forgot-password 作为 proving ground，但不将规则做成模块特例。
>
> **Tech Stack:** YAML, Python 3, Bash, TypeScript, Playwright E2E, framework guards under `.claude/skills/workflow-engine/tests/`
>
> **Design Doc:** `docs/plans/2026-03-11-ui-state-and-error-ownership-hardening-design.md`
>
> **Execution Order:** Config truth -> UI contract guard -> delivery/behavior guard -> proving-ground contracts -> behavior report generation -> stage-regression verification -> framework-audit
>
> **DoD:** `config.yaml` 中存在两条通用机器规则；多态 widget 缺少状态覆盖时 `ui_visual_contract_guard.py` 最早失败；行为报告缺少单错误 owner 证据或 `visible_error_message_count != 1` 时 `behavior_contract_guard.py` 最早失败；`permission` forgot-password 作为 proving ground 跑通；`.claude/` 改动通过 `framework-audit`。
>
> Standard Baseline: `docs/plans/FOUR-PACK-STANDARD.md`

---

## 0.1 与上位标准关系（2026-03-11）

1. 本计划遵循 `docs/plans/FOUR-PACK-STANDARD.md` 的四件套治理与执行门禁要求。
2. 本计划对应 `docs/plans/2026-03-11-ui-state-and-error-ownership-hardening-design.md`，是该设计的唯一实现计划。
3. 如本计划与上位标准冲突，以上位标准为准，并先更新上位标准再回改本计划。

## Existing-Entrypoint Inventory

- 真源与派生产物：
  - `osg-spec-docs/source/prototype/*.html`
  - `osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml`
  - `osg-spec-docs/docs/01-product/prd/{module}/DELIVERY-CONTRACT.yaml`
- UI 状态执行入口：
  - `osg-frontend/tests/e2e/ui-state-contract.e2e.spec.ts`
  - `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
  - `osg-frontend/tests/e2e/support/visual-contract.ts`
- 行为报告与 gate：
  - `osg-frontend/tests/e2e/support/behavior-report.ts`
  - `osg-frontend/tests/e2e/forgot-password.e2e.spec.ts`
  - `bin/e2e-api-gate.sh`
  - `bin/final-gate.sh`
- 现有 guard：
  - `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
  - `.claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py`
  - `.claude/skills/workflow-engine/tests/delivery_contract_guard.py`
  - `.claude/skills/workflow-engine/tests/delivery_contract_guard_selftest.py`
  - `.claude/skills/workflow-engine/tests/behavior_contract_guard.py`
  - `.claude/skills/workflow-engine/tests/behavior_contract_guard_selftest.py`

## Guard Reuse / Collision Audit

- 复用 `ui_visual_contract_guard.py`
  - 原因：它已经是 UI contract 最早 choke point，最适合新增“多态部件必须声明状态覆盖”的规则。
  - 禁止新建 `ui_multistate_policy_guard.py`。
- 复用 `delivery_contract_guard.py`
  - 原因：新行为 invariant 必须先被 contract schema guard 接受，否则行为 guard 永远到不了。
  - 禁止新建 `single-error-owner-contract-guard.py`。
- 复用 `behavior_contract_guard.py`
  - 原因：它已经负责验证 behavior report invariants，最适合新增“单错误单提示”检查。
  - 禁止新建 `toast-dedup-guard.py`。
- 复用 `ui-state-contract.e2e.spec.ts` 和 `visual-contract.e2e.spec.ts`
  - 原因：状态执行器已经存在，只缺 contract 真值和 guard 强制。
- 不新增新的最终 gate
  - 原因：两条规则都必须在最早阶段触发，而不是等到 `final-gate`。

## Source-Stage Integration Path

- 多态状态机器真值
  - 最早生成：`.claude/project/config.yaml`
  - 最早派生：`UI-VISUAL-CONTRACT.yaml`
  - 最早阻断：`ui_visual_contract_guard.py`
  - 最早执行：`ui-state-contract.e2e.spec.ts` 或 `visual-contract.e2e.spec.ts`
- 单错误 owner 机器真值
  - 最早生成：`.claude/project/config.yaml`
  - 最早派生：`DELIVERY-CONTRACT.yaml`
  - 最早阻断：`delivery_contract_guard.py`
  - 最早执行/验证：`behavior-report.ts` 生成的 `behavior-contract-*.json` + `behavior_contract_guard.py`
- proving-ground 产物
  - `permission` forgot-password 的 `state_contracts` 和 behavior report 字段，必须在 verify 阶段生成
  - 不允许第一次出现在 `final-gate`

## Stage-Regression Verification

- 多态状态最早 choke point：
  - 构造包含 `progress-indicator` 但只有 `default` 状态的 visual contract fixture
  - 运行 `python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py ...`
  - 预期：直接 `FAIL`
- 行为 owner 最早 choke point：
  - 构造包含 `single_observable_error_message_for` 的 delivery contract fixture
  - 提供 `visible_error_message_count=2` 的 behavior report fixture
  - 运行 `python3 .claude/skills/workflow-engine/tests/behavior_contract_guard.py ...`
  - 预期：直接 `FAIL`
- proving-ground 回归：
  - `pnpm --dir osg-frontend test:e2e tests/e2e/ui-state-contract.e2e.spec.ts --grep "modal-forgot-password"`
  - `pnpm --dir osg-frontend test:e2e tests/e2e/forgot-password.e2e.spec.ts --grep "invalid-code"`
- 最终回归：
  - `bash bin/e2e-api-gate.sh permission full`
  - `bash bin/final-gate.sh permission`
  - `.claude/` 变更后 `framework-audit`

## Task 1: Add generic machine truth for multistate widgets and single error owner

**Files:**
- Modify: `.claude/project/config.yaml`
- Modify: `docs/一人公司框架/32_项目机器真值.md`
- Modify: `docs/一人公司框架/31_项目配置.md`
- Create: `.claude/skills/workflow-engine/tests/ui_state_error_policy_selftest.py`

**Step 1: Write the failing selftest**

- Add assertions that `config.yaml` contains:
  - `ui_delivery_policy.require_state_coverage_for_multistate_widgets`
  - `ui_delivery_policy.multistate_widget_part_ids`
  - `frontend_feedback_policy.single_error_owner`
  - `frontend_feedback_policy.require_visible_error_message_count_in_behavior_report`
- Assert framework docs describe these keys without becoming a second truth source.

**Step 2: Run test to verify it fails**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_state_error_policy_selftest.py
```

Expected:

- `FAIL` because the new machine-readable keys and doc references do not yet exist

**Step 3: Write minimal implementation**

- Add the two policy groups to `.claude/project/config.yaml`
- Update framework docs to explain:
  - multistate widget state coverage is mandatory
  - single error owner is mandatory
  - these are generic framework rules, not forgot-password special cases

**Step 4: Run test to verify it passes**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_state_error_policy_selftest.py
```

Expected:

- `PASS`

**Step 5: Commit**

```bash
git add .claude/project/config.yaml \
  docs/一人公司框架/32_项目机器真值.md \
  docs/一人公司框架/31_项目配置.md \
  .claude/skills/workflow-engine/tests/ui_state_error_policy_selftest.py
git commit -m "feat: add ui state and error ownership machine truth"
```

## Task 2: Extend `ui_visual_contract_guard.py` to require state coverage for multistate widgets

**Files:**
- Modify: `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py`
- Create: `.claude/skills/workflow-engine/tests/fixtures/ui_visual_contract_multistate_missing_state.yaml`

**Step 1: Write the failing selftest**

- Add a fixture that declares a surface content part `progress-indicator` but only provides:
  - `state_variants: [default]`
  - `state_contracts: [default]`
- Add another fixture that declares `tab-strip` with no `state_cases`
- Assert the guard fails with an actionable error that state coverage is missing.

**Step 2: Run test to verify it fails**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
```

Expected:

- `FAIL` because the guard currently validates structure but does not enforce multistate coverage

**Step 3: Write minimal implementation**

- Load `ui_delivery_policy.multistate_widget_part_ids`
- For page contracts:
  - if a multistate widget is present, require non-empty `state_cases`
- For surface contracts:
  - if `content_parts` contains a multistate widget, require:
    - non-empty `state_variants`
    - at least one non-`default` state
    - matching `state_contracts`
- Keep generic rule wording so it applies to any module

**Step 4: Run test to verify it passes**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
```

Expected:

- `PASS`

**Step 5: Commit**

```bash
git add .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py \
  .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py \
  .claude/skills/workflow-engine/tests/fixtures/ui_visual_contract_multistate_missing_state.yaml
git commit -m "feat: require multistate ui state coverage in visual contract guard"
```

## Task 3: Add proving-ground state coverage to `permission` forgot-password contract and verify chain

**Files:**
- Modify: `osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml`
- Modify: `osg-frontend/tests/e2e/ui-state-contract.e2e.spec.ts`
- Modify: `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
- Modify: `osg-frontend/packages/admin/src/__tests__/forgot-password.spec.ts`

**Step 1: Write the failing test**

- Add a contract-backed assertion that `modal-forgot-password` step-3 progress indicator exposes completed and active states.
- Add a unit-level assertion that step 3 shows:
  - dot1 green
  - dot2 green
  - dot3 blue

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm --dir osg-frontend/packages/admin test --run src/__tests__/forgot-password.spec.ts
pnpm --dir osg-frontend test:e2e tests/e2e/ui-state-contract.e2e.spec.ts --grep "modal-forgot-password" --workers=1
```

Expected:

- First command fails if state assertion not yet encoded
- Second command skips or fails because contract lacks required state coverage

**Step 3: Write minimal implementation**

- Update `UI-VISUAL-CONTRACT.yaml` so `modal-forgot-password` declares:
  - explicit non-default `state_variants`
  - matching `state_contracts`
  - progress-indicator state semantics for step 3
- If needed, adjust state runner labeling so the proving-ground state is discoverable in reports

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm --dir osg-frontend/packages/admin test --run src/__tests__/forgot-password.spec.ts
pnpm --dir osg-frontend test:e2e tests/e2e/ui-state-contract.e2e.spec.ts --grep "modal-forgot-password" --workers=1
```

Expected:

- `PASS`

**Step 5: Commit**

```bash
git add osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml \
  osg-frontend/tests/e2e/ui-state-contract.e2e.spec.ts \
  osg-frontend/tests/e2e/visual-contract.e2e.spec.ts \
  osg-frontend/packages/admin/src/__tests__/forgot-password.spec.ts
git commit -m "feat: prove multistate ui coverage with forgot-password contract"
```

## Task 4: Extend delivery and behavior guards for single observable error message invariants

**Files:**
- Modify: `.claude/skills/workflow-engine/tests/delivery_contract_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/delivery_contract_guard_selftest.py`
- Modify: `.claude/skills/workflow-engine/tests/behavior_contract_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/behavior_contract_guard_selftest.py`

**Step 1: Write the failing selftests**

- Add a delivery contract selftest that includes:
  - `single_observable_error_message_for: [invalid-code, expired-code]`
- Add a behavior guard selftest where:
  - `observable_response.visible_error_message_count = 2`
  - invariant should fail

**Step 2: Run test to verify it fails**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/delivery_contract_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/behavior_contract_guard_selftest.py
```

Expected:

- Both fail because the new invariant is not yet recognized

**Step 3: Write minimal implementation**

- Update `delivery_contract_guard.py` so the new invariant is allowed and scenario references are validated
- Update `behavior_contract_guard.py` to support:
  - `single_observable_error_message_for`
  - validation of `observable_response.visible_error_message_count`
- Keep existing same/distinct invariants unchanged

**Step 4: Run test to verify it passes**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/delivery_contract_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/behavior_contract_guard_selftest.py
```

Expected:

- `PASS`

**Step 5: Commit**

```bash
git add .claude/skills/workflow-engine/tests/delivery_contract_guard.py \
  .claude/skills/workflow-engine/tests/delivery_contract_guard_selftest.py \
  .claude/skills/workflow-engine/tests/behavior_contract_guard.py \
  .claude/skills/workflow-engine/tests/behavior_contract_guard_selftest.py
git commit -m "feat: add single observable error message invariants"
```

## Task 5: Extend behavior report generation and `permission` proving ground

**Files:**
- Modify: `osg-frontend/tests/e2e/support/behavior-report.ts`
- Modify: `osg-frontend/tests/e2e/forgot-password.e2e.spec.ts`
- Modify: `osg-spec-docs/docs/01-product/prd/permission/DELIVERY-CONTRACT.yaml`

**Step 1: Write the failing test**

- Extend forgot-password invalid-code scenario to record:
  - `visible_error_message_count`
  - owner-relevant observable response fields
- Add a behavior contract expectation for `forgot-password-verify-code`:
  - `single_observable_error_message_for: [invalid-code, expired-code]`

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm --dir osg-frontend test:e2e tests/e2e/forgot-password.e2e.spec.ts --grep "invalid-code|expired-code" --workers=1
python3 .claude/skills/workflow-engine/tests/behavior_contract_guard.py \
  --contract osg-spec-docs/docs/01-product/prd/permission/DELIVERY-CONTRACT.yaml \
  --report osg-spec-docs/tasks/audit/behavior-contract-permission-$(date +%F).json \
  --stage verify
```

Expected:

- E2E generates a report that does not yet satisfy the new invariant
- Guard fails on missing or invalid `visible_error_message_count`

**Step 3: Write minimal implementation**

- Extend `behavior-report.ts` to persist the new observable field without breaking existing records
- Update forgot-password E2E to capture visible error message count from the page
- Update `permission` DELIVERY-CONTRACT to declare the new invariant for relevant rejected scenarios

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm --dir osg-frontend test:e2e tests/e2e/forgot-password.e2e.spec.ts --grep "invalid-code|expired-code" --workers=1
python3 .claude/skills/workflow-engine/tests/behavior_contract_guard.py \
  --contract osg-spec-docs/docs/01-product/prd/permission/DELIVERY-CONTRACT.yaml \
  --report osg-spec-docs/tasks/audit/behavior-contract-permission-$(date +%F).json \
  --stage verify
```

Expected:

- `PASS`

**Step 5: Commit**

```bash
git add osg-frontend/tests/e2e/support/behavior-report.ts \
  osg-frontend/tests/e2e/forgot-password.e2e.spec.ts \
  osg-spec-docs/docs/01-product/prd/permission/DELIVERY-CONTRACT.yaml
git commit -m "feat: prove single error owner through behavior reports"
```

## Task 6: Run stage-regression verification and final framework audit

**Files:**
- Modify if needed: `docs/一人公司框架/31_项目配置.md`
- Modify if needed: `docs/一人公司框架/32_项目机器真值.md`
- No new source files expected

**Step 1: Run earliest choke-point regressions**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_state_error_policy_selftest.py
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
python3 .claude/skills/workflow-engine/tests/delivery_contract_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/behavior_contract_guard_selftest.py
```

Expected:

- All `PASS`

**Step 2: Run proving-ground regressions**

Run:

```bash
pnpm --dir osg-frontend/packages/admin test --run src/__tests__/forgot-password.spec.ts
pnpm --dir osg-frontend test:e2e tests/e2e/ui-state-contract.e2e.spec.ts --grep "modal-forgot-password" --workers=1
pnpm --dir osg-frontend test:e2e tests/e2e/forgot-password.e2e.spec.ts --grep "invalid-code|expired-code" --workers=1
```

Expected:

- All `PASS`

**Step 3: Run full verify/gate chain**

Run:

```bash
bash bin/e2e-api-gate.sh permission full
bash bin/final-gate.sh permission
```

Expected:

- New rules trigger no false red on the proving-ground module

**Step 4: Run framework audit**

Run:

```bash
# 按 framework-audit skill 要求执行
```

Expected:

- `7/7` 通过

**Step 5: Commit**

```bash
git add .claude/project/config.yaml \
  .claude/skills/workflow-engine/tests \
  osg-frontend/tests/e2e/support/behavior-report.ts \
  osg-frontend/tests/e2e/forgot-password.e2e.spec.ts \
  osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml \
  osg-spec-docs/docs/01-product/prd/permission/DELIVERY-CONTRACT.yaml \
  docs/一人公司框架/31_项目配置.md \
  docs/一人公司框架/32_项目机器真值.md
git commit -m "feat: harden ui state and error ownership framework rules"
```
