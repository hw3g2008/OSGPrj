# Overlay Surface Visual Contract Implementation Plan

## 1. Scope

Implement generic overlay-surface support in the visual contract pipeline so that PRD-declared surfaces automatically enter:

- contract generation
- test skeleton generation
- evidence generation
- workflow gates

This plan extends existing framework pieces. It does not introduce business-specific guards.

## 2. Baseline

Current baseline problems proven by repo backtrace:

1. `MATRIX.md` declares 7 `modal-*` surfaces for `permission`.
2. `UI-VISUAL-CONTRACT.yaml` contains none of them.
3. current tests only provide smoke coverage for forgot-password modal.
4. current visual gates treat pages as first-class targets but not overlay surfaces.

## 3. Task 1: Reference and Update Existing Design Assets

### Goal

Reference existing truth-contract and visual-contract design assets, then update them to include overlay surface scope.

### Files

- `docs/plans/2026-03-07-truth-contract-hard-gates-design.md`
- `docs/plans/2026-03-07-truth-contract-hard-gates-implementation-plan.md`
- `docs/plans/2026-03-08-overlay-surface-visual-contract-design.md`
- `docs/plans/2026-03-08-overlay-surface-visual-contract-implementation-plan.md`

### Verification

1. `rg -n "surface|modal|drawer|popover|wizard-step" docs/plans/2026-03-07-truth-contract-hard-gates-design.md docs/plans/2026-03-07-truth-contract-hard-gates-implementation-plan.md docs/plans/2026-03-08-overlay-surface-visual-contract-design.md docs/plans/2026-03-08-overlay-surface-visual-contract-implementation-plan.md`

## 4. Task 2: Run Repository-Wide Overlay Inventory Audit

### Goal

Prove that the generic overlay surface model covers every currently declared overlay-like delivery surface across the repository before treating any single module as sufficient proof.

### Files

- `osg-spec-docs/docs/01-product/prd/*`
- `osg-spec-docs/docs/02-requirements/srs/*`
- `osg-spec-docs/source/prototype/*`
- `osg-spec-docs/tasks/audit/overlay-surface-inventory-latest.md`
- `docs/plans/2026-03-08-overlay-surface-visual-contract-design.md`
- `docs/plans/2026-03-08-overlay-surface-visual-contract-implementation-plan.md`

### Required Changes

1. Inventory all currently declared overlay surfaces across PRD, SRS, and prototype sources.
2. Classify each discovered surface using the generic model:
   - `surface_type`
   - `trigger_action`
   - `surface_parts`
   - `content_parts`
   - `viewport_variants`
   - `state_contracts`
3. Persist the audit result into `osg-spec-docs/tasks/audit/overlay-surface-inventory-latest.md`, including:
   - source file
   - discovered surface identifier
   - inferred surface type
   - inferred trigger mode
   - coverage status under the current generic model
4. Record any currently declared overlay type that cannot be represented without business-specific logic.
5. Fail the implementation plan if repository inventory reveals a surface pattern that the generic model cannot represent.
6. Use `permission` only as a proof case after the repository-wide audit passes.

### Verification

1. `find osg-spec-docs/docs/01-product/prd -maxdepth 3 -type f | sort`
2. `rg -n "modal-|drawer-|popover-|wizard|step-|弹窗|抽屉|浮层|步骤|dialog|overlay" osg-spec-docs/docs/01-product/prd osg-spec-docs/docs/02-requirements/srs osg-spec-docs/source/prototype -S`
3. `test -f osg-spec-docs/tasks/audit/overlay-surface-inventory-latest.md`
4. Confirm the design and implementation plan explicitly require repository-wide overlay inventory before module proof-case closure.

## 5. Task 3: Extend Source-Stage Generation

### Goal

Make source-stage generation create overlay surface skeletons automatically.

### Files

- `.claude/skills/prototype-extraction/SKILL.md`
- `.claude/skills/brainstorming/SKILL.md`
- `.windsurf/workflows/brainstorm.md`
- `bin/check-skill-artifacts.sh`
- `osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml`
- `osg-spec-docs/docs/01-product/prd/permission/DESIGN-SYSTEM.md`

### Required Changes

1. `prototype-extraction` must read:
   - `MATRIX.md`
   - `DESIGN-SYSTEM.md`
   - PRD sections for overlays
   - prototype HTML IDs/selectors
2. It must generate `surfaces:` skeletons in `UI-VISUAL-CONTRACT.yaml`.
3. It must annotate generated content-part roles in a generic, reusable way rather than copying business copy into contract fields.
4. It must prefill shell-level surface parts using design-system defaults:
   - `backdrop`
   - `shell`
   - `header`
   - `body`
   - `footer`
   - `close-control`
4. It must prefill generic `content_parts` skeletons using prototype structure and design-system tokens for:
   - `title`
   - `supporting-text`
   - `progress-indicator`
   - `field-group`
   - `action-row`
   - `status-banner`
   - `helper-text`
5. It must prefill `viewport_variants` for desktop/tablet at minimum.
6. `.claude/skills/brainstorming/SKILL.md` must treat `surface inventory + first-pass surface contract skeleton` as required source-stage inputs for framework/UI work.
7. `.windsurf/workflows/brainstorm.md` must fail before approval if either `surface inventory` or generated overlay skeletons are missing.
8. `check-skill-artifacts.sh` must fail if declared surfaces are missing from generated artifacts.
9. Source-stage validation must fail if generated overlay skeletons exist but omit required defaults:
   - `surface_parts`
   - `content_parts`
   - `viewport_variants`

### Verification

1. `rg -n "surface|modal|drawer|popover|wizard" .claude/skills/prototype-extraction/SKILL.md .claude/skills/brainstorming/SKILL.md .windsurf/workflows/brainstorm.md`
2. `bash bin/check-skill-artifacts.sh prototype-extraction permission osg-spec-docs/docs/01-product/prd/permission`
3. `python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py --contract osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml`

## 6. Task 4: Extend Visual Contract Schema and Guard

### Goal

Add generic `surfaces` support to the visual contract model and fail when declared overlays are missing.

### Files

- `osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml`
- `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
- `.claude/skills/workflow-engine/tests/ui_visual_contract_guard_selftest.py`

### Required Changes

1. Introduce root-level `surfaces:` schema.
2. Require:
   - `surface_id`
   - `surface_type`
   - `host_page_id`
   - `trigger_action`
   - `required_anchors`
   - `surface_parts`
   - `content_parts`
   - `viewport_variants`
   - `surface_root_selector`
   - `backdrop_selector`
   - `state_contracts` with per-state `style_contracts`
3. Extend guard to compare PRD/MATRIX-declared surface IDs with contract surface IDs.
4. Reject contracts where declared overlay surfaces are missing.
5. Reject contracts missing shell-level style contracts for required parts.
6. Reject contracts missing content-level style coverage for declared `content_parts`.
7. Reject contracts where declared `state_contracts` omit state-specific `style_contracts`.

### Verification

1. `python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_selftest.py`
2. `python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py --contract osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml`

## 7. Task 5: Extend Overlay Evidence Execution

### Goal

Make `ui-visual-gate` and Playwright evidence emitters capture overlay surfaces and state variants.

### Files

- `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
- `osg-frontend/tests/e2e/support/visual-contract.ts`
- `osg-frontend/tests/e2e/support/prototype-contract.ts`
- `bin/ui-visual-gate.sh`
- `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py`
- `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py`

### Required Changes

1. Visual executor must support:
   - host page navigation
   - `trigger_action`
   - surface capture
   - state variant capture
   - portal-host capture
   - backdrop capture
   - viewport-variant capture
   - keyboard-triggered surfaces
   - route-param-triggered surfaces
   - initially auto-open surfaces
2. Page report must include surface-level evidence metadata.
3. Page report must include surface-part evidence metadata.
4. Page report must include content-part evidence metadata.
5. Page report must include viewport-variant evidence metadata.
6. Overlay execution must support:
   - scroll-locked shell states
   - nested or stacked surfaces when explicitly declared
   - animation-stable capture after transition completion
6. Page report must include state-style evidence metadata for each declared state contract.
7. `ui_critical_evidence_guard` must validate overlay surface evidence.

### Verification

1. `python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py`
2. `bash bin/ui-visual-gate.sh permission`
3. Confirm emitted report contains:
   - surface-level entries
   - surface-part entries
   - viewport-variant entries
   - state-style entries for every declared state contract
   - trigger metadata for `click|keyboard|route-param|auto-open`
   - animation-stable capture markers when transitions are declared

## 8. Task 6: Generate Overlay Test Skeletons During Split Phases

### Goal

Ensure overlay UI tests are generated during normal workflow stages, not manually backfilled later.

### Files

- `.windsurf/workflows/split-story.md`
- `.windsurf/workflows/split-ticket.md`
- `.windsurf/workflows/approve.md`
- `.claude/skills/workflow-engine/tests/story_ticket_coverage_guard.py`
- `.claude/skills/workflow-engine/tests/story_ticket_coverage_guard_selftest.py`
- `.claude/skills/workflow-engine/tests/traceability_guard.py`

### Required Changes

1. `split-story` must generate story-level surface test skeletons.
2. `split-ticket` must generate:
   - ticket-level verification stubs
   - traceability rows for surface states
   - traceability rows for viewport variants when declared
   - traceability rows for content-part critical checks when declared
3. `approve` and coverage guards must fail if declared surfaces have no generated test skeletons.

### Verification

1. `rg -n "surface|overlay|visual skeleton|state variant" .windsurf/workflows/split-story.md .windsurf/workflows/split-ticket.md .windsurf/workflows/approve.md`
2. `python3 .claude/skills/workflow-engine/tests/story_ticket_coverage_guard_selftest.py`

## 9. Task 7: Permission Proof-Case Backfill Through Framework Paths

### Goal

Use the framework outputs to bring `permission` into alignment. This is validation of the framework, not a one-off business patch.

### Files

- `osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml`
- `osg-frontend/tests/e2e/forgot-password.e2e.spec.ts`
- `osg-frontend/tests/e2e/*`

### Required Changes

1. Populate contract surface entries for all 7 declared permission overlays.
2. Ensure generated test skeletons exist for:
   - `modal-forgot-password`
   - `modal-new-role`
   - `modal-edit-role`
   - `modal-add-admin`
   - `modal-edit-admin`
   - `modal-reset-password`
   - `modal-force-change-pwd`
3. Prove the framework catches omissions before implementation completion.
4. Prove shell-level style parts and generic content parts are generated for these surfaces.
5. Prove state-style evidence is emitted for every declared surface state.
6. Prove content-part evidence is emitted for every declared surface that declares `content_parts`.

### Verification

1. `python3 - <<'PY'\nfrom pathlib import Path\nimport re\nm=Path('osg-spec-docs/docs/01-product/prd/permission/MATRIX.md').read_text()\nids=re.findall(r'\\|\\s*(modal-[^|\\s]+)\\s*\\|',m)\nc=Path('osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml').read_text()\nmissing=[sid for sid in ids if sid not in c]\nprint('missing=',missing)\nraise SystemExit(1 if missing else 0)\nPY`
2. `bash bin/ui-visual-gate.sh permission`

## 10. Task 8: Final Gate Integration

### Goal

Ensure overlay omissions are process failures and final-gate only backstops.

### Files

- `.windsurf/workflows/verify.md`
- `.claude/skills/verification/SKILL.md`
- `bin/final-gate.sh`
- `.windsurf/workflows/final-closure.md`

### Required Changes

1. `verify` must require overlay evidence when overlay surfaces are declared.
2. `final-gate` must confirm:
   - declared surfaces exist in contract
   - declared surfaces have generated tests
   - declared surfaces have evidence
   - declared surface parts have evidence
   - declared content parts have evidence
   - declared viewport variants have evidence

### Verification

1. `rg -n "surface|overlay|ui_critical_evidence_guard|ui_visual_contract_guard" .windsurf/workflows/verify.md .claude/skills/verification/SKILL.md bin/final-gate.sh .windsurf/workflows/final-closure.md`
2. `bash bin/final-gate.sh permission`

## 11. Acceptance Criteria

The implementation is complete only when:

1. A PRD/MATRIX-declared overlay surface automatically appears in source-stage outputs.
2. Missing overlay contract coverage fails before implementation completion.
3. Split phases generate overlay UI test skeletons automatically.
4. Verify fails on missing overlay evidence before final-gate.
5. Final-gate passes only when page and overlay evidence are both complete.
6. Overlay shell styles are generated from design-system defaults and validated as contract parts.
7. Generic content-layer styles are generated and validated as contract parts.
8. State-specific style drift and viewport-specific drift are both detectable.
9. Repository-wide overlay inventory passes before any module proof case is accepted as framework closure.
10. Repository-wide inventory emits a persistent audit artifact that can be re-read and diffed in later validation rounds.

## 12. Regression Checklist

Run after implementation:

1. `bash bin/check-skill-artifacts.sh prototype-extraction permission osg-spec-docs/docs/01-product/prd/permission`
2. `find osg-spec-docs/docs/01-product/prd -maxdepth 3 -type f | sort`
3. `rg -n "modal-|drawer-|popover-|wizard|step-|弹窗|抽屉|浮层|步骤|dialog|overlay" osg-spec-docs/docs/01-product/prd osg-spec-docs/docs/02-requirements/srs osg-spec-docs/source/prototype -S`
4. `test -f osg-spec-docs/tasks/audit/overlay-surface-inventory-latest.md`
5. `python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_selftest.py`
6. `python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py --contract osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml`
7. `python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py`
8. `python3 .claude/skills/workflow-engine/tests/story_ticket_coverage_guard_selftest.py`
9. `bash bin/ui-visual-gate.sh permission`
10. `python3 - <<'PY'
from pathlib import Path
text=Path('osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml').read_text()
assert 'content_parts:' in text
print('PASS: content_parts present in permission contract')
PY`
11. `bash bin/final-gate.sh permission`

## 13. Commit Boundary

Recommended split:

1. source-stage generation and skill/workflow updates
2. repository-wide overlay inventory audit and model coverage corrections
3. visual contract guard/schema changes
4. overlay evidence execution changes
5. split-story / split-ticket asset generation changes
6. permission proof-case regeneration and gate verification
