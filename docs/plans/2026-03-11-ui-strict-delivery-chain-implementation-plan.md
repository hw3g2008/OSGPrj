# UI Strict Delivery Chain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.
>
> **Goal:** 将 UI 严格修复与收口规则落进项目全链路机器真值、现有 guard 和 gate 入口，确保 UI 问题只能通过严格证据链和正式门禁收口。
>
> **Architecture:** 以 `.claude/project/config.yaml` 作为唯一机器真值，新增 `workflow_policy.normal_business_delivery_forbid_superpowers` 与 `ui_delivery_policy`。复用现有 `ui_visual_contract_guard.py`、`ui_critical_evidence_guard.py`、`ui-visual-gate.sh`、`final-gate.sh`、`final-closure.sh`，并补一个正式的单项 UI 验证入口 `bin/ui-visual-case-verify.sh`。规则在最早 choke point 触发，最终仍以模块 gate 和 final closure 收口。
>
> **Tech Stack:** Bash, Python 3, YAML, Playwright E2E, framework guards under `.claude/skills/workflow-engine/tests/`
>
> **Design Doc:** `docs/plans/2026-03-11-ui-strict-delivery-chain-design.md`
>
> **Execution Order:** Config and docs truth -> contract guard -> critical evidence guard -> single-case entrypoint -> gate wiring -> stage-regression verification -> framework-audit
>
> **DoD:** 新 policy 存在于 `config.yaml` 且文档解释一致；strict contract 在最早 guard 拦截宽豁免；失败证据缺失会被 evidence guard 拦截；存在正式单项 UI verify 入口；`ui-visual-gate`、`final-gate`、`final-closure` 按严格链路通过；框架审计通过。
>
> Standard Baseline: `docs/plans/FOUR-PACK-STANDARD.md`

---

## 0.1 与上位标准关系（2026-03-11）

1. 本计划遵循 `docs/plans/FOUR-PACK-STANDARD.md` 的四件套治理与执行门禁要求。
2. 本计划对应 `docs/plans/2026-03-11-ui-strict-delivery-chain-design.md` 的唯一实现计划，不与其他 UI 或运行态计划竞争真源。
3. 如本计划与上位标准冲突，以上位标准为准，并先更新上位标准再回改本计划。

## Existing-Entrypoint Inventory

- 真源与派生产物：
  - `osg-spec-docs/source/prototype/*.html`
  - `osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml`
  - `bin/check-skill-artifacts.sh`
- 运行态与视觉执行：
  - `bin/context-preflight.sh`
  - `bin/runtime-port-guard.sh`
  - `bin/ui-visual-baseline.sh`
  - `bin/ui-visual-gate.sh`
- 最终质量收口：
  - `bin/final-gate.sh`
  - `bin/final-closure.sh`
- 现有 UI 审计：
  - `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
  - `.claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py`
  - `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py`
  - `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py`
- 框架一致性终审：
  - `.claude/skills/framework-audit/SKILL.md`

## Guard Reuse / Collision Audit

- 复用 `ui_visual_contract_guard.py`
  - 原因：它已经承担 UI contract schema / baseline coverage 的最早 guard 职责，最适合新增 strict policy 校验。
  - 禁止新建平行 `ui-strict-policy-guard.py`。
- 复用 `ui_critical_evidence_guard.py`
  - 原因：它已经负责 verify-like 阶段的 UI 证据审计，最适合扩展“失败必须有 baseline / actual / diff”规则。
  - 禁止新建平行 `ui-failure-evidence-guard.py`。
- 保留 `ui-visual-gate.sh`、`final-gate.sh`、`final-closure.sh`
  - 原因：它们已经是正式门禁与最终收口入口。
  - 本轮只允许最小接线，不允许复制 policy 逻辑。
- 新增 `bin/ui-visual-case-verify.sh`
  - 这是唯一允许的新入口。
  - 责任限定为“单项 page / surface 严格复现与回归”。
  - 不得替代模块 verify、正式 gate 或 final closure。

## Source-Stage Integration Path

- `workflow_policy.normal_business_delivery_forbid_superpowers`
  - 最早生成阶段：`.claude/project/config.yaml`
  - 说明同步阶段：`docs/一人公司框架/32_项目机器真值.md`、`docs/一人公司框架/31_项目配置.md`
- `ui_delivery_policy`
  - 最早生成阶段：`.claude/project/config.yaml`
  - 最早执行阶段：`ui_visual_contract_guard.py`
- 单项 UI evidence
  - 最早生成阶段：`bin/ui-visual-case-verify.sh`
  - 不允许第一次出现在 `final-gate` 或 `final-closure`
- 模块与最终产物
  - 继续由 `bin/ui-visual-baseline.sh`、`bin/ui-visual-gate.sh`、`bin/final-gate.sh`、`bin/final-closure.sh` 产出

## Stage-Regression Verification

- 最早 choke point 验证：
  - 构造含 `diff_threshold` 的 contract fixture，预期 `ui_visual_contract_guard.py` 直接失败
  - 构造缺 `diff_ref` 的 page-report fixture，预期 `ui_critical_evidence_guard.py` 直接失败
- 单项入口验证：
  - 用 `bin/ui-visual-case-verify.sh permission modal-reset-password` 或等价单项 case 证明 evidence 在单项入口生成
- 模块级验证：
  - `bash bin/ui-visual-gate.sh permission`
- 最终级验证：
  - `bash bin/final-gate.sh permission`
  - `bash bin/final-closure.sh permission`
- 框架终审：
  - `.claude/` 文件变更后必须执行 `framework-audit`

## Task 1: Add machine-readable policy to config and framework docs

**Files:**
- Modify: `.claude/project/config.yaml`
- Modify: `docs/一人公司框架/32_项目机器真值.md`
- Modify: `docs/一人公司框架/31_项目配置.md`

**Step 1: Write the failing doc/config assertions**

- Add or extend a lightweight config/doc assertion test. If no existing test file fits cleanly, create:
  - `.claude/skills/workflow-engine/tests/ui_delivery_policy_config_selftest.py`
- Assert:
  - `workflow_policy.normal_business_delivery_forbid_superpowers` exists and is `true`
  - `ui_delivery_policy` exists with all required keys
  - docs mention the same boundary without becoming a second truth source

**Step 2: Run the assertion to verify it fails**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_delivery_policy_config_selftest.py
```

Expected:

- `FAIL` because the new keys and/or documentation references do not exist yet

**Step 3: Write minimal implementation**

- Add the new keys to `.claude/project/config.yaml`
- Update the two framework docs so they explain:
  - `superpowers` only applies to framework/process/guard/runtime/truth-source correction
  - `superpowers` must not enter any normal business delivery chain
  - UI strict delivery must follow single-case verify -> module verify -> ui-visual-gate -> final-gate -> final-closure

**Step 4: Run the assertion to verify it passes**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_delivery_policy_config_selftest.py
```

Expected:

- `PASS`

**Step 5: Commit**

```bash
git add .claude/project/config.yaml \
  docs/一人公司框架/32_项目机器真值.md \
  docs/一人公司框架/31_项目配置.md \
  .claude/skills/workflow-engine/tests/ui_delivery_policy_config_selftest.py
git commit -m "feat: add ui strict delivery policy machine truth"
```

## Task 2: Extend `ui_visual_contract_guard.py` to enforce strict UI policy

**Files:**
- Modify: `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py`
- Optional Create: `.claude/skills/workflow-engine/tests/fixtures/ui_visual_contract_strict_policy.yaml`

**Step 1: Write the failing selftest**

- Add cases that load a contract fixture containing:
  - non-zero `diff_threshold`
  - `snapshot_compare: false`
  - `mask_selectors`
  - `mask_allowed: true`
  - `data_mode: mask`
- Assert that with `ui_delivery_policy.strict_visual_contract=true`, validation fails with explicit field errors.

**Step 2: Run the selftest to verify it fails**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
```

Expected:

- `FAIL` because the guard does not yet enforce the new strict policy

**Step 3: Write minimal implementation**

- Add config loading to `ui_visual_contract_guard.py`
- Validate `ui_delivery_policy`
- Reject strict-policy forbidden fields with actionable error output
- Keep existing schema validation behavior intact for non-forbidden fields

**Step 4: Run the selftest to verify it passes**

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
  .claude/skills/workflow-engine/tests/fixtures/ui_visual_contract_strict_policy.yaml
git commit -m "feat: enforce strict ui visual contract policy"
```

## Task 3: Extend `ui_critical_evidence_guard.py` to require full failure evidence

**Files:**
- Modify: `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py`
- Optional Create: `.claude/skills/workflow-engine/tests/fixtures/ui_page_report_missing_diff.json`

**Step 1: Write the failing selftest**

- Add a verify-like page-report fixture where a failed case is missing `diff_ref`
- Add another fixture missing `actual_ref`
- Assert the guard fails when `ui_delivery_policy.require_failure_evidence=true`

**Step 2: Run the selftest to verify it fails**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py
```

Expected:

- `FAIL` because incomplete failure evidence is not yet rejected

**Step 3: Write minimal implementation**

- Load `config.yaml`
- Read `ui_delivery_policy.require_failure_evidence`
- For failed verify-like results, require `baseline_ref`, `actual_ref`, and `diff_ref`
- Preserve existing pass-path validation

**Step 4: Run the selftest to verify it passes**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py
```

Expected:

- `PASS`

**Step 5: Commit**

```bash
git add .claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py \
  .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py \
  .claude/skills/workflow-engine/tests/fixtures/ui_page_report_missing_diff.json
git commit -m "feat: require complete ui failure evidence"
```

## Task 4: Add `bin/ui-visual-case-verify.sh` for strict single-case verification

**Files:**
- Create: `bin/ui-visual-case-verify.sh`
- Modify: `bin/ui-visual-baseline.sh`
- Modify: `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
- Optional Create: `bin/ui-visual-case-verify-selftest.sh`

**Step 1: Write the failing selftest**

- Add a shell selftest or fixture-driven smoke test asserting:
  - the script requires `module` plus a single `page_id` or `surface_id`
  - it calls `context-preflight` and `runtime-port-guard`
  - it writes evidence into the same audit directory pattern used by visual baseline runs
  - it does not update baseline snapshots

**Step 2: Run the selftest to verify it fails**

Run:

```bash
bash bin/ui-visual-case-verify-selftest.sh
```

Expected:

- `FAIL` because the entrypoint does not exist yet

**Step 3: Write minimal implementation**

- Create `bin/ui-visual-case-verify.sh`
- Reuse existing environment bootstrapping from `ui-visual-baseline.sh`
- Scope Playwright execution to one page/surface case
- Emit `baseline / actual / diff / summary` into the normal audit tree
- Ensure the script uses verify-only mode and never updates snapshots

**Step 4: Run the selftest to verify it passes**

Run:

```bash
bash bin/ui-visual-case-verify-selftest.sh
```

Expected:

- `PASS`

**Step 5: Commit**

```bash
git add bin/ui-visual-case-verify.sh \
  bin/ui-visual-case-verify-selftest.sh \
  bin/ui-visual-baseline.sh \
  osg-frontend/tests/e2e/visual-contract.e2e.spec.ts
git commit -m "feat: add strict ui visual single-case verify entrypoint"
```

## Task 5: Wire policy through existing gate entrypoints without duplicating logic

**Files:**
- Modify: `bin/ui-visual-gate.sh`
- Modify: `bin/final-gate.sh`
- Modify: `bin/final-closure.sh`

**Step 1: Write the failing regression assertions**

- Add shell assertions or small fixture checks proving:
  - `ui-visual-gate.sh` still calls contract guard and critical evidence guard
  - `final-gate.sh` still rejects baseline mutation and consumes the same page report
  - `final-closure.sh` still reports visual evidence correctly
- If no existing selftest exists, create:
  - `bin/ui-visual-gate-selftest.sh`
  - or extend an existing shell regression script

**Step 2: Run the regression assertion to verify it fails**

Run:

```bash
bash bin/ui-visual-gate-selftest.sh
```

Expected:

- `FAIL` if the new policy wiring is missing or the new single-case chain is not referenced as intended

**Step 3: Write minimal implementation**

- Keep policy truth in `config.yaml`
- Add only the minimum entrypoint wiring needed so:
  - `ui-visual-gate.sh` respects strict policy and single runtime
  - `final-gate.sh` / `final-closure.sh` continue consuming the same evidence model
- Do not duplicate contract policy parsing in shell scripts if Python guards already own that responsibility

**Step 4: Run the regression assertion to verify it passes**

Run:

```bash
bash bin/ui-visual-gate-selftest.sh
```

Expected:

- `PASS`

**Step 5: Commit**

```bash
git add bin/ui-visual-gate.sh \
  bin/final-gate.sh \
  bin/final-closure.sh \
  bin/ui-visual-gate-selftest.sh
git commit -m "feat: wire strict ui delivery policy through gates"
```

## Task 6: Run stage-regression verification and framework audit

**Files:**
- No new product files
- Possible audit artifacts under: `osg-spec-docs/tasks/audit/`

**Step 1: Run the earliest choke-point verification**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py
bash bin/ui-visual-case-verify-selftest.sh
```

Expected:

- all `PASS`
- proves the new rules trigger before module gate and final gate

**Step 2: Run module-level and final-stage verification**

Run:

```bash
bash bin/ui-visual-gate.sh permission
bash bin/final-gate.sh permission
bash bin/final-closure.sh permission
```

Expected:

- all `PASS`
- no baseline mutation
- no evidence gap

**Step 3: Run framework audit**

Use the `framework-audit` skill and complete the full 7-dimension audit loop until 7/7 passes.

Expected:

- `framework-audit` passes all dimensions in a full rerun

**Step 4: Commit**

```bash
git add .claude/CLAUDE.md .claude/project/config.yaml docs/一人公司框架 \
  .claude/skills/workflow-engine/tests bin docs/plans
git commit -m "feat: harden ui strict delivery chain"
```
