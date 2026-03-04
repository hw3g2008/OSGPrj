# UI Visual Contract 12.7 Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Land all six enhancements in `§12.7` (`style_contracts`, guard, executor, report, state cases, data stability) as enforceable framework behavior rather than guidance text.

**Architecture:** Extend the existing contract-driven visual pipeline (`UI-VISUAL-CONTRACT.yaml -> guard -> Playwright executor -> ui-visual-gate -> final-gate`) with two new contract dimensions: `style_contracts` and `state_cases`. Keep business logic untouched; all changes stay in framework scripts, contract schema/validator, and E2E harness.

**Tech Stack:** Python 3 (contract guards/validators), Bash (gate scripts), Playwright + TypeScript (executor/state assertions), YAML/JSON (contract/report artifacts).

---

## Scope and Constraints

1. Only framework files are in scope; do not modify business pages under `osg-frontend/packages/admin/src/views/**`.
2. All acceptance must run via gate scripts; no “raw playwright pass” claims.
3. Backward compatibility rule:
   - existing contracts without `style_contracts/state_cases` still pass schema;
   - once a module declares them, they become hard checks.

---

### Task 1: Extend Contract Schema with `style_contracts` and `state_cases`

**Files:**
- Modify: `osg-frontend/tests/e2e/support/visual-contract.ts`
- Modify: `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
- Test: `.claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py`

**Step 1: Write failing guard test**

Create tests for:
1. valid `style_contracts` shape passes
2. invalid style rule (missing selector/property/expected) fails
3. valid `state_cases` shape passes
4. invalid state case (unsupported state/assertion) fails

**Step 2: Run test to verify fail**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
```

Expected: FAIL before schema extension.

**Step 3: Add TS contract types**

In `visual-contract.ts`, add optional fields on `VisualPageContract`:
1. `style_contracts?: Array<{ selector: string; property: string; expected: string; tolerance?: number }>`
2. `state_cases?: Array<{ state: 'focus'|'hover'|'loading'|'empty'|'error'; target: string; assertion: { type: 'visible'|'text'|'css'; value?: string; property?: string } }>`

**Step 4: Add guard validation rules**

In `ui_visual_contract_guard.py`:
1. validate `style_contracts` list structure and non-empty required keys
2. validate `state_cases` list structure and enum values
3. fail on malformed declarations

**Step 5: Re-run tests**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
```

Expected: PASS.

**Step 6: Commit**

```bash
git add osg-frontend/tests/e2e/support/visual-contract.ts \
  .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py \
  .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
git commit -m "feat: extend visual contract schema with style/state clauses"
```

---

### Task 2: Implement `style_contracts` executor in Playwright

**Files:**
- Modify: `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
- Test: `osg-frontend/tests/e2e/visual-contract-style.spec.ts`

**Step 1: Write failing executor test**

Add a focused test file to verify:
1. declared style contract is read
2. computed style mismatch fails with clear page/selector/property message

**Step 2: Run test to verify fail**

Run:
```bash
cd osg-frontend && pnpm playwright test tests/e2e/visual-contract-style.spec.ts --project=chromium
```

Expected: FAIL (executor not implemented yet).

**Step 3: Implement style assertions**

In `visual-contract.e2e.spec.ts`:
1. parse `pageContract.style_contracts || []`
2. for each rule, locate target and read `getComputedStyle`
3. assert exact/tolerance match
4. include failure context: `page_id`, `selector`, `property`, `expected`, `actual`

**Step 4: Re-run test**

Run:
```bash
cd osg-frontend && pnpm playwright test tests/e2e/visual-contract-style.spec.ts --project=chromium
```

Expected: PASS.

**Step 5: Commit**

```bash
git add osg-frontend/tests/e2e/visual-contract.e2e.spec.ts \
  osg-frontend/tests/e2e/visual-contract-style.spec.ts
git commit -m "feat: add style_contracts runtime assertions"
```

---

### Task 3: Add style assertion statistics to visual gate reports

**Files:**
- Modify: `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
- Modify: `bin/ui-visual-baseline.sh`
- Modify: `bin/ui-visual-gate.sh`

**Step 1: Add failing report assertion**

Add a small shell/python assertion block in gate flow that expects:
1. `style_assertions_passed`
2. `style_assertions_failed`
in `ui-visual-page-report-*.json`.

**Step 2: Run verify to observe fail**

Run:
```bash
bash bin/ui-visual-baseline.sh permission --mode verify --source app
```

Expected: FAIL or missing fields.

**Step 3: Emit structured counters**

Implement:
1. executor writes style assertion outcomes per page
2. baseline aggregator computes totals
3. gate prints summary line with pass/fail counts

**Step 4: Re-run verify**

Run:
```bash
bash bin/ui-visual-baseline.sh permission --mode verify --source app
bash bin/ui-visual-gate.sh permission
```

Expected: page report contains style counters; gate log prints them.

**Step 5: Commit**

```bash
git add osg-frontend/tests/e2e/visual-contract.e2e.spec.ts \
  bin/ui-visual-baseline.sh \
  bin/ui-visual-gate.sh
git commit -m "feat: add style assertion metrics to visual reports"
```

---

### Task 4: Implement `state_cases` execution path

**Files:**
- Create: `osg-frontend/tests/e2e/ui-state-contract.e2e.spec.ts`
- Modify: `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
- Modify: `bin/ui-visual-baseline.sh`

**Step 1: Write failing state-case test**

Define at least one focus/error case for login page contract and assert execution hook is called.

**Step 2: Run test to verify fail**

Run:
```bash
cd osg-frontend && pnpm playwright test tests/e2e/ui-state-contract.e2e.spec.ts --project=chromium
```

Expected: FAIL (new state executor missing).

**Step 3: Implement state executor**

Rules:
1. `focus`: call `locator.focus()` then evaluate assertion
2. `hover`: call `locator.hover()` then evaluate assertion
3. `loading/empty/error`: evaluate by declared selector/assertion contract only (no business hardcode)

**Step 4: Wire into baseline verify**

In `ui-visual-baseline.sh`:
1. run `@ui-visual` as today
2. run `@ui-state` when contract contains any `state_cases`
3. fail if state cases defined but not executed

**Step 5: Re-run state tests**

Run:
```bash
cd osg-frontend && pnpm playwright test tests/e2e/ui-state-contract.e2e.spec.ts --project=chromium
```

Expected: PASS.

**Step 6: Commit**

```bash
git add osg-frontend/tests/e2e/ui-state-contract.e2e.spec.ts \
  osg-frontend/tests/e2e/visual-contract.e2e.spec.ts \
  bin/ui-visual-baseline.sh
git commit -m "feat: add state_cases execution and gate integration"
```

---

### Task 5: Enforce data-stability protocol in framework runtime

**Files:**
- Modify: `bin/ui-visual-baseline.sh`
- Modify: `osg-frontend/playwright.config.ts`
- Create: `osg-frontend/tests/e2e/support/test-stability.ts`

**Step 1: Add failing stability check**

Add a check that verify mode prints/fails when required stability env is missing:
1. fixed timezone
2. fixed locale
3. fixed clock seed (if configured by contract)

**Step 2: Run to verify fail**

Run:
```bash
bash bin/ui-visual-baseline.sh permission --mode verify --source app
```

Expected: FAIL with missing stability prerequisites.

**Step 3: Implement stability injector**

1. baseline script exports canonical env (`TZ`, `LANG`, optional `E2E_FIXED_TIME`)
2. `test-stability.ts` applies deterministic runtime hooks in Playwright context
3. config consumes these hooks for both visual and state suites

**Step 4: Re-run verify**

Run:
```bash
bash bin/ui-visual-baseline.sh permission --mode verify --source app
```

Expected: prerequisites printed and satisfied (runtime failures only if true visual/state mismatch).

**Step 5: Commit**

```bash
git add bin/ui-visual-baseline.sh \
  osg-frontend/playwright.config.ts \
  osg-frontend/tests/e2e/support/test-stability.ts
git commit -m "feat: enforce deterministic data stability protocol for visual gate"
```

---

### Task 6: Final gate integration and audit closure

**Files:**
- Modify: `bin/final-gate.sh`
- Modify: `bin/final-closure.sh`
- Modify: `docs/plans/2026-03-02-prd-visual-contract-evolution-plan.md`

**Step 1: Add failing integration assertion**

Add checks that final closure must include:
1. style assertion counters
2. state case execution summary

**Step 2: Run final closure to verify fail first**

Run:
```bash
bash bin/final-gate.sh permission
bash bin/final-closure.sh permission --cc-mode off --backend-policy docker_only
```

Expected: FAIL until new fields are wired.

**Step 3: Wire final-gate/final-closure outputs**

1. final-gate prints visual+style+state summaries
2. final-closure records artifact refs and first failure evidence for style/state
3. update evolution plan status references from “建议” to “已接入计划执行”

**Step 4: Re-run full chain**

Run:
```bash
bash bin/check-skill-artifacts.sh prototype-extraction permission osg-spec-docs/docs/01-product/prd/permission
bash bin/ui-visual-baseline.sh permission --mode generate --source prototype
bash bin/ui-visual-gate.sh permission
bash bin/final-gate.sh permission
bash bin/final-closure.sh permission --cc-mode off --backend-policy docker_only
```

Expected:
1. command chain all pass in healthy env
2. audit artifacts include style/state dimensions

**Step 5: Commit**

```bash
git add bin/final-gate.sh \
  bin/final-closure.sh \
  docs/plans/2026-03-02-prd-visual-contract-evolution-plan.md
git commit -m "feat: close visual framework with style/state gate evidence"
```

---

## Verification Checklist (must pass before close)

1. Schema/guard tests:
```bash
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
```
2. Visual executor tests:
```bash
cd osg-frontend && pnpm playwright test tests/e2e/visual-contract-style.spec.ts --project=chromium
```
3. State executor tests:
```bash
cd osg-frontend && pnpm playwright test tests/e2e/ui-state-contract.e2e.spec.ts --project=chromium
```
4. Framework gates:
```bash
bash bin/ui-visual-gate.sh permission
bash bin/final-gate.sh permission
bash bin/final-closure.sh permission --cc-mode off --backend-policy docker_only
```

---

## Rollback Plan

1. If Task 2/4 causes unstable false negatives, keep schema fields but gate them behind module opt-in (`style_contracts/state_cases` absent => skip).
2. If Task 5 introduces cross-env breakage, preserve hard fail in CI and downgrade local to warning behind explicit env flag (documented in final-closure report).
3. Never rollback truth-source constraints (`generate=prototype`, `verify=app`); these remain non-negotiable.

