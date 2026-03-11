# UI Visual Post-Failure Allowance Framework Implementation Plan

> **For Claude:** Use project framework execution only. Do not use `superpowers` for normal business delivery.

**Goal:** Build a framework-level post-failure allowance module that works for all modules' page and surface visual cases, with `permission` as the first full proving ground.

**Architecture:** Add a reusable `post-failure-allowance.ts` support module for red-branch evaluation, reuse explicit `residual_regions` when present, and derive conservative `micro_spacing` safe boxes from page/surface roots when explicit regions are absent. Wire the module into both page and surface visual compare catch branches, then extend evidence validation so page and surface share the same audit semantics.

**Tech Stack:** TypeScript, Playwright, Vitest, Python 3, Bash, YAML

---

## Existing-Entrypoint Inventory

### Truth / Source Stage

1. `.claude/project/config.yaml`
2. `osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml`

### Runtime / Workflow

1. `bin/ui-visual-case-verify.sh`
2. `bin/ui-visual-gate.sh`
3. `bin/final-gate.sh`
4. `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`

### Existing Guards / Selftests

1. `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
2. `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py`
3. `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py`

### Existing Support Modules

1. `osg-frontend/tests/e2e/support/visual-contract.ts`
2. `osg-frontend/tests/e2e/support/visual-residual-classifier.ts`
3. `osg-frontend/tests/e2e/support/surface-trigger.ts`
4. `osg-frontend/packages/admin/src/__tests__/visual-residual-classifier.spec.ts`

## Guard Reuse / Collision Audit

### Contract Guard

- Reuse `ui_visual_contract_guard.py` unchanged.
- No new contract field is introduced, so adding schema validation would be fake complexity.

### Evidence Guard

- Reuse and extend `ui_critical_evidence_guard.py`.
- Extend only to validate residual classifier evidence inside surface `viewport_results[]`.
- Do not invent new report reason fields.

### Collision Decisions

- Do **not** add `ui_visual_allowance_guard.py`.
- Do **not** add `ui_visual_allowance_gate.sh`.
- Do **not** add a new contract artifact outside `UI-VISUAL-CONTRACT.yaml`.

## Source-Stage Integration Path

1. Primary truth remains `.claude/project/config.yaml` for residual policy.
2. Primary case truth remains `UI-VISUAL-CONTRACT.yaml`.
3. No new source-stage artifact is introduced.
4. The new allowance behavior appears first in runtime support code, not in final-gate planning.

## Stage-Regression Verification

The implementation is not complete until all levels below are proven:

1. Focused unit tests for `post-failure-allowance.ts`
2. Existing `visual-residual-classifier` unit tests still pass
3. Full single-case proving ground for `permission`:
   - 5 pages
   - 6 surfaces
4. `bash bin/ui-visual-gate.sh permission`
5. If needed, `bash bin/final-gate.sh permission`

## Test Harness Decision

Use `pnpm --dir osg-frontend/packages/admin test` as the unit-test runner.

Reason:

1. The repo already uses `osg-frontend/packages/admin/src/__tests__/visual-residual-classifier.spec.ts` to test e2e support code.
2. There is no root-level Vitest config for `osg-frontend/tests/e2e/support/`.
3. Reusing the existing admin Vitest runner is the smallest working path.

## Task 1: Create the Framework Support Module and Focused Tests

**Files:**
- Create: `osg-frontend/tests/e2e/support/post-failure-allowance.ts`
- Create: `osg-frontend/packages/admin/src/__tests__/post-failure-allowance.spec.ts`
- Read: `osg-frontend/tests/e2e/support/visual-residual-classifier.ts`
- Read: `osg-frontend/packages/admin/src/__tests__/visual-residual-classifier.spec.ts`

**Step 1: Write the failing tests**

Cover at least:

1. `deriveSafeMicroSpacingRegions(...)` excludes forbidden node types
2. `deriveSafeMicroSpacingRegions(...)` rejects near-root giant boxes
3. `deriveSafeMicroSpacingRegions(...)` deduplicates heavy overlaps
4. `evaluatePostFailureAllowance(...)` prefers explicit `residual_regions`
5. `evaluatePostFailureAllowance(...)` falls back to `derived_safe_boxes`
6. `evaluatePostFailureAllowance(...)` keeps `geometry_change / unknown / forbidden` as FAIL

Suggested scaffolding:

```ts
import { describe, expect, it } from 'vitest'
import {
  deriveSafeMicroSpacingRegions,
  evaluatePostFailureAllowance,
  type AllowanceNodeSnapshot,
} from '../../../../tests/e2e/support/post-failure-allowance'
```

**Step 2: Run the tests to prove they fail**

Run:

```bash
pnpm --dir osg-frontend/packages/admin test src/__tests__/post-failure-allowance.spec.ts src/__tests__/visual-residual-classifier.spec.ts
```

Expected:

- FAIL because `post-failure-allowance.ts` does not exist yet
- Existing residual-classifier assertions remain valid once imports resolve

**Step 3: Implement the minimal support module**

Add:

```ts
export interface AllowanceNodeSnapshot {
  tagName: string
  className: string
  role: string
  box: { x: number; y: number; width: number; height: number }
  display: string
  visibility: string
  opacity: number
  backgroundColor: string
  borderWidth: number
  borderRadius: number
  overflow: string
  childCount: number
}

export function deriveSafeMicroSpacingRegions(...) { /* pure */ }
export async function collectAllowanceNodeSnapshots(...) { /* runtime */ }
export async function evaluatePostFailureAllowance(...) { /* orchestration */ }
```

Implementation rules:

1. Explicit `residual_regions` win.
2. Fallback only emits `micro_spacing`.
3. Do not use `style_contracts`.
4. Exclude forbidden / risky node types.
5. Fail closed when no stable safe boxes remain.

**Step 4: Re-run the tests**

Run:

```bash
pnpm --dir osg-frontend/packages/admin test src/__tests__/post-failure-allowance.spec.ts src/__tests__/visual-residual-classifier.spec.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add osg-frontend/tests/e2e/support/post-failure-allowance.ts \
  osg-frontend/packages/admin/src/__tests__/post-failure-allowance.spec.ts
git commit -m "feat: add framework post-failure allowance module"
```

## Task 2: Wire the Allowance Module into Page and Surface Red Branches

**Files:**
- Modify: `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
- Read: `osg-frontend/tests/e2e/support/post-failure-allowance.ts`

**Step 1: Add a failing regression expectation**

Define the target behavior:

1. page fullpage catch uses the new allowance module
2. page clip catch uses the new allowance module
3. surface viewport catch uses the new allowance module
4. surface viewport results emit residual classifier evidence when applied

**Step 2: Run the focused unit tests again**

Run:

```bash
pnpm --dir osg-frontend/packages/admin test src/__tests__/post-failure-allowance.spec.ts
```

Expected:

- PASS for pure module tests
- No runtime wiring proven yet

**Step 3: Implement the page/surface wiring**

Rules:

1. Replace private page-only fallback orchestration with `evaluatePostFailureAllowance(...)`
2. Keep strict compare first
3. Keep explicit `residual_regions` priority
4. In surface catch, resolve `surfaceRoot` and call the same allowance entrypoint
5. Add residual classifier evidence to each failing or allowed surface viewport result

Minimal shape:

```ts
const allowanceResult = await evaluatePostFailureAllowance({
  caseKind: 'surface',
  rootLocator: surfaceRoot,
  diffRef: capturedDiffRef,
  explicitResidualRegions: [],
  captureOrigin,
})
```

**Step 4: Re-run the focused unit tests**

Run:

```bash
pnpm --dir osg-frontend/packages/admin test src/__tests__/post-failure-allowance.spec.ts src/__tests__/visual-residual-classifier.spec.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add osg-frontend/tests/e2e/visual-contract.e2e.spec.ts
git commit -m "feat: wire post-failure allowance into page and surface compares"
```

## Task 3: Extend Surface Evidence Validation

**Files:**
- Modify: `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py`

**Step 1: Write the failing selftest coverage**

Add coverage for:

1. surface `viewport_results[]` with `residual_classifier_applied=true`
2. missing `residual_classifier_result` must fail
3. missing `residual_class_breakdown` must fail
4. missing `forbidden_residual_detected` must fail

**Step 2: Run the selftest to verify it fails**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py
```

Expected:

- FAIL because surface residual evidence is not validated yet

**Step 3: Implement the minimal guard extension**

Extend surface viewport validation to mirror the existing page residual evidence checks.

**Step 4: Re-run the selftest**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add .claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py \
  .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py
git commit -m "feat: validate surface allowance evidence"
```

## Task 4: Run the Full Permission Proving Ground

**Files:**
- No planned source edits in this task

**Step 1: Run page single-case verification**

Run:

```bash
bash bin/ui-visual-case-verify.sh permission login-page
bash bin/ui-visual-case-verify.sh permission dashboard
bash bin/ui-visual-case-verify.sh permission roles
bash bin/ui-visual-case-verify.sh permission admins
bash bin/ui-visual-case-verify.sh permission base-data
```

Expected:

- red cases can enter the framework allowance path
- green cases bypass it

**Step 2: Run surface single-case verification**

Run:

```bash
bash bin/ui-visual-case-verify.sh permission modal-forgot-password
bash bin/ui-visual-case-verify.sh permission modal-new-role
bash bin/ui-visual-case-verify.sh permission modal-edit-role
bash bin/ui-visual-case-verify.sh permission modal-add-admin
bash bin/ui-visual-case-verify.sh permission modal-edit-admin
bash bin/ui-visual-case-verify.sh permission modal-reset-password
```

Expected:

- surface red cases can enter the same allowance path
- surface evidence contains residual classifier fields when applied

**Step 3: Run the module gate**

Run:

```bash
bash bin/ui-visual-gate.sh permission
```

Expected:

- full `permission` page + surface matrix passes gate

**Step 4: Run final gate if needed**

Run:

```bash
bash bin/final-gate.sh permission
```

Expected:

- no stage-regression in final gate

**Step 5: Commit**

```bash
git commit --allow-empty -m "chore: prove framework allowance on permission"
```
