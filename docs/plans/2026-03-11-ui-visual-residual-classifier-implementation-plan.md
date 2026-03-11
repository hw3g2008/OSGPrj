# UI Visual Residual Classifier Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.
>
> **Goal:** 在默认零容忍不变的前提下，为 page-level visual compare 增加一个可选的第二阶段 residual classifier，只允许 `micro_spacing` 与 `low_salience_text_icon_rasterization` 自动转绿，并继续禁止 `captcha/image` 等内容型残差。
>
> **Architecture:** 继续以 `.claude/project/config.yaml` 作为唯一机器真值；扩展 `UI-VISUAL-CONTRACT` 的可选 `residual_regions`，在 `ui_visual_contract_guard.py` 做最早 schema/blocking 校验，在 `visual-contract.e2e.spec.ts` 的 page screenshot failure 分支运行 classifier，并将 classifier 结果追加进现有 page report。第一版仅支持 page-level，不改 gate 编排和现有主链。
>
> **Tech Stack:** YAML, Python 3, TypeScript, Playwright E2E, existing framework guards under `.claude/skills/workflow-engine/tests/`
>
> **Design Doc:** `docs/plans/2026-03-11-ui-visual-residual-classifier-design.md`
>
> **Execution Order:** Config truth -> visual contract schema/guard -> classifier helper -> page compare wiring -> report/evidence guard -> synthetic regression -> login negative proving-ground -> gate regression -> framework-audit
>
> **DoD:** 默认 zero-tolerance 语义不变；未声明 `residual_regions` 的页面行为完全不变；声明了 `residual_regions` 的页面在 screenshot failure 后可运行 classifier；`captcha/image` 被 guard 最早拦住且不会自动转绿；`login-page` 在当前验证码仍不对齐时继续失败；新规则通过最早 choke point 自测、page-level proving-ground 和 gate 回归。
>
> Standard Baseline: `docs/plans/FOUR-PACK-STANDARD.md`

---

## 0.1 与上位标准关系（2026-03-11）

1. 本计划遵循 `docs/plans/FOUR-PACK-STANDARD.md` 的四件套治理与执行门禁要求。
2. 本计划对应 `docs/plans/2026-03-11-ui-visual-residual-classifier-design.md`，是该设计的唯一实现计划。
3. 如本计划与上位标准冲突，以上位标准为准，并先更新上位标准再回改本计划。

## Existing-Entrypoint Inventory

- 机器真值与 docs
  - `.claude/project/config.yaml`
  - `docs/一人公司框架/32_项目机器真值.md`
  - `docs/一人公司框架/31_项目配置.md`
- visual contract schema / guard
  - `osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml`
  - `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
  - `.claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py`
- visual compare execution
  - `osg-frontend/tests/e2e/support/visual-contract.ts`
  - `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
- report / gate consumption
  - `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py`
  - `bin/ui-visual-case-verify.sh`
  - `bin/ui-visual-baseline.sh`
  - `bin/ui-visual-gate.sh`
  - `bin/final-gate.sh`
  - `bin/final-closure.sh`

## Guard Reuse / Collision Audit

- 复用 `ui_visual_contract_guard.py`
  - 原因：`residual_regions` 属于 visual contract schema，应在这里最早被拦。
  - 禁止新建 `ui_visual_residual_policy_guard.py`。
- 复用 `ui_critical_evidence_guard.py`
  - 原因：classifier 一旦生效，需要确保 page report 中存在对应证据字段。
  - 禁止新建单独的 `ui_visual_classifier_evidence_guard.py`。
- 不新增新的 gate 脚本
  - 原因：残差分类应挂在现有 compare 执行点，而不是新增 `ui-visual-residual-gate.sh`。

## Source-Stage Integration Path

- 机器真值
  - 最早生成：`.claude/project/config.yaml`
  - 内容：classifier 开关、allowed/forbidden residual classes、edge-band 上限
- contract 派生
  - 最早生成：`UI-VISUAL-CONTRACT.yaml`
  - 内容：page-level `residual_regions`
- 最早阻断
  - `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
- 最早执行
  - `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
- 最早消费
  - `bin/ui-visual-case-verify.sh`
  - `bin/ui-visual-baseline.sh`
  - `bin/ui-visual-gate.sh`
- 不允许第一次出现在
  - `final-gate`
  - `final-closure`

## Stage-Regression Verification

- 最早 choke point：guard
  - 构造包含非法 `residual_regions` 的 fixture
  - 运行 `python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py`
  - 预期：直接 `FAIL`
- classifier synthetic choke point
  - 对 helper 提供 `micro_spacing`、`low_salience_text_icon_rasterization`、`captcha_like`、`geometry_change` synthetic 输入
  - 运行 page-level unit test / focused Playwright helper test
  - 预期：允许类 `PASS`，禁止类 `FAIL`
- proving-ground
  - `bash bin/ui-visual-case-verify.sh permission login-page`
  - 当前预期：仍 `FAIL`，原因是 `captcha_like`
- gate regression
  - `bash bin/ui-visual-baseline.sh permission --mode verify --source app`
  - `bash bin/ui-visual-gate.sh permission`
  - 证明 classifier 不会改变未声明页面的行为，且不会吞掉 `captcha_like`

## Task 1: Add machine truth and docs for page-level residual classifier

**Files:**
- Modify: `.claude/project/config.yaml`
- Modify: `docs/一人公司框架/32_项目机器真值.md`
- Modify: `docs/一人公司框架/31_项目配置.md`
- Modify: `.claude/skills/workflow-engine/tests/ui_delivery_policy_config_selftest.py`

**Step 1: Write the failing selftest**

- Extend the existing config selftest to require:
  - classifier enable flag
  - allowed residual classes
  - forbidden residual classes
  - `micro_spacing.max_edge_band_px`
- Add doc assertions that docs explain these keys without turning docs into a second truth source.

**Step 2: Run test to verify it fails**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_delivery_policy_config_selftest.py
```

Expected:

- `FAIL` because residual classifier machine truth is not yet present

**Step 3: Write minimal implementation**

- Add residual classifier policy keys to `.claude/project/config.yaml`
- Update framework docs to describe:
  - default zero tolerance remains
  - classifier is second-stage only
  - `captcha/image` stays outside the generic allowlist

**Step 4: Run test to verify it passes**

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
git commit -m "feat: add ui visual residual classifier machine truth"
```

## Task 2: Extend visual contract schema and guard for `residual_regions`

**Files:**
- Modify: `osg-frontend/tests/e2e/support/visual-contract.ts`
- Modify: `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py`
- Create: `.claude/skills/workflow-engine/tests/fixtures/ui_visual_residual_regions_invalid.yaml`

**Step 1: Write the failing selftest**

- Add fixture cases for:
  - invalid `residual_regions.class`
  - selector that targets `.captcha-code img`
  - empty selector list
- Add TypeScript contract type expectation by extending tests that load contract JSON if needed.

**Step 2: Run test to verify it fails**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
```

Expected:

- `FAIL` because guard does not yet validate `residual_regions`

**Step 3: Write minimal implementation**

- Add optional page-level `residual_regions` type to `visual-contract.ts`
- Extend `ui_visual_contract_guard.py` to enforce:
  - legal residual classes
  - non-empty selectors
  - forbidden selector targets (`img`, `.captcha-code`, `canvas`, status color blocks if representable)

**Step 4: Run test to verify it passes**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
```

Expected:

- `PASS`

**Step 5: Commit**

```bash
git add osg-frontend/tests/e2e/support/visual-contract.ts \
  .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py \
  .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py \
  .claude/skills/workflow-engine/tests/fixtures/ui_visual_residual_regions_invalid.yaml
git commit -m "feat: add residual region schema and guard enforcement"
```

## Task 3: Add a page-level residual classifier helper with synthetic regression tests

**Files:**
- Create: `osg-frontend/tests/e2e/support/visual-residual-classifier.ts`
- Create: `osg-frontend/tests/e2e/support/__tests__/visual-residual-classifier.spec.ts`

**Step 1: Write the failing tests**

- Add synthetic classifier tests for:
  - `micro_spacing` thin edge band => `PASS`
  - `low_salience_text_icon_rasterization` => `PASS`
  - `captcha_like` => `FAIL`
  - `geometry_change` / large solid block => `FAIL`
  - unknown pixels outside declared regions => `FAIL`

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm --dir osg-frontend test --run tests/e2e/support/__tests__/visual-residual-classifier.spec.ts
```

Expected:

- `FAIL` because helper does not yet exist

**Step 3: Write minimal implementation**

- Build a pure classifier helper that:
  - ingests diff buffer or diff metadata + region declarations
  - classifies residuals into allowed/forbidden/unknown buckets
  - exposes a structured result for reports
- Keep it page-level only and independent from gate scripts

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm --dir osg-frontend test --run tests/e2e/support/__tests__/visual-residual-classifier.spec.ts
```

Expected:

- `PASS`

**Step 5: Commit**

```bash
git add osg-frontend/tests/e2e/support/visual-residual-classifier.ts \
  osg-frontend/tests/e2e/support/__tests__/visual-residual-classifier.spec.ts
git commit -m "feat: add page-level visual residual classifier helper"
```

## Task 4: Wire the classifier into page screenshot failure handling and reports

**Files:**
- Modify: `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
- Modify: `osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml`
- Modify: `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py`

**Step 1: Write the failing tests**

- Add one focused verify case that declares `residual_regions` for `login-page` and expects classifier fields in page report.
- Add evidence-guard selftest that fails when `residual_classifier_applied=true` but breakdown fields are missing.

**Step 2: Run test to verify it fails**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py
bash bin/ui-visual-case-verify.sh permission login-page
```

Expected:

- Evidence selftest fails because classifier report fields do not exist
- `login-page` verify still fails without classifier integration

**Step 3: Write minimal implementation**

- In `visual-contract.e2e.spec.ts` page compare path:
  - keep strict screenshot first
  - on failure, if no `residual_regions`, preserve current failure behavior
  - on failure with `residual_regions`, run classifier
  - if classifier returns allowed-only residuals and no forbidden residual, record `PASS`
  - otherwise preserve failure
- Add `residual_regions` only to `permission/login-page` as proving-ground declaration
- Extend `ui_critical_evidence_guard.py` to require classifier evidence fields when applied

**Step 4: Run test to verify it passes**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py
bash bin/ui-visual-case-verify.sh permission login-page
```

Expected:

- Evidence selftest `PASS`
- `login-page` currently still `FAIL`, but with explicit reason that `captcha_like` remains forbidden

**Step 5: Commit**

```bash
git add osg-frontend/tests/e2e/visual-contract.e2e.spec.ts \
  osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml \
  .claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py \
  .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py
git commit -m "feat: wire residual classifier through page visual compare"
```

## Task 5: Lock the login negative proving-ground and stage-regression behavior

**Files:**
- Modify: `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
- Modify: `osg-frontend/packages/admin/src/__tests__/login.spec.ts`
- Modify: `docs/plans/2026-03-11-ui-visual-residual-classifier-design.md` (if behavior notes need sync)

**Step 1: Write the failing tests**

- Add a proving-ground assertion that `login-page` classifier report contains:
  - allowed residual classes for text/icon and spacing
  - forbidden residual detection for captcha
- Add unit-level guardrail assertions if needed so login selectors used by `residual_regions` remain stable.

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm --dir osg-frontend/packages/admin test --run src/__tests__/login.spec.ts
bash bin/ui-visual-case-verify.sh permission login-page
```

Expected:

- At least one assertion fails because the negative proving-ground fields are not yet locked

**Step 3: Write minimal implementation**

- Lock the current negative behavior:
  - classifier may run
  - page still fails because `captcha_like` is not whitelisted
- Avoid introducing any captcha special case

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm --dir osg-frontend/packages/admin test --run src/__tests__/login.spec.ts
bash bin/ui-visual-case-verify.sh permission login-page
```

Expected:

- Unit tests `PASS`
- `login-page` still `FAIL` for the correct reason

**Step 5: Commit**

```bash
git add osg-frontend/tests/e2e/visual-contract.e2e.spec.ts \
  osg-frontend/packages/admin/src/__tests__/login.spec.ts \
  docs/plans/2026-03-11-ui-visual-residual-classifier-design.md
git commit -m "test: lock login negative proving ground for residual classifier"
```

## Task 6: Run module-level and final regression, then framework-audit

**Files:**
- Modify only if regressions expose gaps

**Step 1: Run earliest choke-point verification**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_delivery_policy_config_selftest.py
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py
pnpm --dir osg-frontend test --run tests/e2e/support/__tests__/visual-residual-classifier.spec.ts
```

Expected:

- All `PASS`

**Step 2: Run proving-ground verification**

Run:

```bash
bash bin/ui-visual-case-verify.sh permission login-page
```

Expected:

- `FAIL`
- Failure reason specifically reports `captcha_like` / forbidden residual, not generic screenshot mismatch

**Step 3: Run module and final regression**

Run:

```bash
bash bin/ui-visual-baseline.sh permission --mode verify --source app
bash bin/ui-visual-gate.sh permission
bash bin/final-gate.sh permission
```

Expected:

- No pages without `residual_regions` change behavior
- `login-page` still fails until captcha aligns
- gate artifacts contain classifier evidence when applied

**Step 4: Run framework audit**

Run the required `.claude` framework terminal audit after code changes.

Expected:

- All framework audit dimensions pass

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add low-intrusion ui visual residual classifier"
```
