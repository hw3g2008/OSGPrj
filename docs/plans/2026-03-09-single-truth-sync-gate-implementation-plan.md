# Single Truth Sync Gate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce HTML prototype as the only UI truth source while blocking every downstream workflow stage when a confirmed UI-truth change has not yet been synchronized back into HTML.

**Architecture:** Add one dedicated guard for truth-sync blocking, extend decision record structure with explicit sync fields, and wire the guard into the earliest workflow choke points. Keep HTML as primary truth and keep decisions as authorization/blocking metadata only.

**Tech Stack:** Python guards, Markdown decision records, existing Windsurf workflow docs, existing workflow-engine tests.

---

## Existing-Entrypoint Inventory

Current entrypoints and guards already in play:

- `.windsurf/workflows/brainstorm.md`
- `.windsurf/workflows/approve.md`
- `.windsurf/workflows/split-story.md`
- `.windsurf/workflows/split-ticket.md`
- `.windsurf/workflows/verify.md`
- `bin/final-gate.sh`
- `.claude/skills/workflow-engine/tests/decisions_guard.py`
- `.claude/skills/workflow-engine/tests/prototype_derivation_consistency_guard.py`
- `.claude/project/config.yaml`

Current truth-source behavior:

- HTML prototype is declared as single truth source in `config.yaml`
- `prototype_derivation_consistency_guard.py` enforces HTML -> derived artifact consistency
- `decisions_guard.py` only checks decision completeness/resolution, not sync status

## Guard Reuse / Collision Audit

Existing guards are insufficient by design:

- extending `decisions_guard.py` would mix completeness with sync-block semantics
- extending `prototype_derivation_consistency_guard.py` would mix derivation drift with decision-state gating

New guard justified:

- `truth_sync_guard.py`

Single responsibility:

- detect confirmed UI truth changes whose HTML sync is incomplete
- block workflow progression before downstream derivation/execution proceeds

No new derivation artifact is introduced.

## Source-Stage Integration Path

No new truth source is created.

Data path:

1. HTML prototype remains primary truth
2. `DECISIONS.md` records UI-truth-changing decisions with sync metadata
3. `truth_sync_guard.py` blocks downstream stages until HTML is synchronized
4. once HTML is synchronized, existing source-stage generators and derivation guards continue as usual

Earliest stage that sets metadata:

- `brainstorm`

Earliest stage that enforces metadata:

- `brainstorm` rerun after decision capture

## Stage-Regression Verification

The implementation is incomplete unless all of these are proven:

1. `brainstorm` fails when `ui_truth_change=true` and `prototype_synced=false`
2. `split-story` fails on the same condition
3. `split-ticket` fails on the same condition
4. `verify` fails on the same condition
5. `final-gate` also fails as a backstop
6. when `prototype_synced=true`, all these stages stop failing on this specific rule

---

### Task 1: Define decision sync metadata contract

**Files:**
- Modify: `docs/plans/2026-03-09-single-truth-sync-gate-design.md`
- Modify: `.claude/project/config.yaml`
- Modify: `.windsurf/workflows/brainstorm.md`
- Modify: `.windsurf/workflows/approve.md`

**Step 1: Add explicit decision fields and machine config**

Document and require:

- `ui_truth_change: true|false`
- `prototype_synced: true|false`
- `truth_scope` (optional)
- `truth_artifact_ids` (optional)

Add machine-readable policy in `config.yaml`:

- `prd_process.truth_sync.enabled`
- `prd_process.truth_sync.required_decision_fields`
- `prd_process.truth_sync.enforced_entrypoints`

**Step 2: Define when fields are mandatory**

Rule:

- any confirmed UI structural/visual/surface change must include `ui_truth_change=true`
- if HTML is not yet updated, it must include `prototype_synced=false`

**Step 3: Define workflow semantics**

In workflow docs, specify:

- product confirmation does not unblock implementation by itself
- only HTML sync flips `prototype_synced` to true
- `/approve brainstorm` is not allowed to bypass stale UI truth

**Step 4: Verify documentation entrypoints mention these fields**

Run:
```bash
rg -n "ui_truth_change|prototype_synced|truth_sync|required_decision_fields|enforced_entrypoints" .claude/project/config.yaml .windsurf/workflows/brainstorm.md .windsurf/workflows/approve.md docs/plans/2026-03-09-single-truth-sync-gate-design.md
```
Expected:
- config and workflow docs contain both fields and blocking semantics

**Step 5: Commit**

```bash
git add .claude/project/config.yaml .windsurf/workflows/brainstorm.md .windsurf/workflows/approve.md docs/plans/2026-03-09-single-truth-sync-gate-design.md
git commit -m "docs: define ui truth sync metadata"
```

### Task 2: Add truth_sync_guard and selftests

**Files:**
- Create: `.claude/skills/workflow-engine/tests/truth_sync_guard.py`
- Create: `.claude/skills/workflow-engine/tests/truth_sync_guard_selftest.py`

**Step 1: Write failing selftests**

Cover at minimum:

- no UI truth decisions -> pass
- confirmed UI truth decision with `prototype_synced=false` -> fail
- confirmed UI truth decision with `prototype_synced=true` -> pass
- malformed decision block missing sync fields -> fail

**Step 2: Implement parser + evaluator**

The guard must:

- read `{module}-DECISIONS.md`
- parse decision records
- find confirmed UI-truth-changing records
- fail when sync is incomplete
- print decision IDs and affected artifacts

**Step 3: Keep separation from decisions_guard**

`decisions_guard.py` should remain completeness-only.
Do not merge semantics and do not modify its responsibility in this task.

**Step 4: Run selftests**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/truth_sync_guard_selftest.py
```
Expected:
- PASS

**Step 5: Commit**

```bash
git add .claude/skills/workflow-engine/tests/truth_sync_guard.py .claude/skills/workflow-engine/tests/truth_sync_guard_selftest.py
git commit -m "feat: add truth sync guard for ui source changes"
```

### Task 3: Wire brainstorm and split stages

**Files:**
- Modify: `.windsurf/workflows/brainstorm.md`
- Modify: `.windsurf/workflows/approve.md`
- Modify: `.windsurf/workflows/split-story.md`
- Modify: `.windsurf/workflows/split-ticket.md`

**Step 1: Add guard to brainstorm**

Before Phase 1 can proceed, run:
```bash
python3 .claude/skills/workflow-engine/tests/truth_sync_guard.py --module {module}
```

**Step 2: Add guard to approve brainstorm**

`/approve brainstorm` must not transition normal flow when `prototype_synced=false`.

**Step 3: Add guard to split-story**

Treat failure as hard stop before story derivation.

**Step 4: Add guard to split-ticket**

Treat failure as hard stop before ticket/test skeleton expansion.

**Step 5: Verify workflow entrypoints are wired**

Run:
```bash
rg -n "truth_sync_guard" .windsurf/workflows/brainstorm.md .windsurf/workflows/approve.md .windsurf/workflows/split-story.md .windsurf/workflows/split-ticket.md
```
Expected:
- all four entrypoints reference the guard as hard gate

**Step 6: Commit**

```bash
git add .windsurf/workflows/brainstorm.md .windsurf/workflows/approve.md .windsurf/workflows/split-story.md .windsurf/workflows/split-ticket.md
git commit -m "feat: block upstream workflows on truth sync drift"
```

### Task 4: Wire verify and final-gate backstops

**Files:**
- Modify: `.windsurf/workflows/verify.md`
- Modify: `.claude/skills/verification/SKILL.md`
- Modify: `bin/final-gate.sh`

**Step 1: Add verify-stage gate**

`verify` must fail before verification logic if truth sync is incomplete.

**Step 2: Add final-gate backstop**

`final-gate` must also run the guard and fail clearly.

**Step 3: Verify all downstream entrypoints are wired**

Run:
```bash
rg -n "truth_sync_guard" .windsurf/workflows/verify.md .claude/skills/verification/SKILL.md bin/final-gate.sh
```
Expected:
- all three files reference the guard

**Step 4: Commit**

```bash
git add .windsurf/workflows/verify.md .claude/skills/verification/SKILL.md bin/final-gate.sh
git commit -m "feat: add truth sync backstops to verify and final gate"
```

### Task 5: Add blocking-state guidance and operator recovery path

**Files:**
- Modify: `docs/plans/2026-03-09-single-truth-sync-gate-design.md`
- Modify: `docs/plans/2026-03-09-single-truth-sync-gate-implementation-plan.md`

**Step 1: Document the only recovery path**

The only valid recovery path is:

1. update HTML prototype
2. update `prototype_synced=true`
3. regenerate/revalidate derived artifacts
4. rerun guard

**Step 2: State that decisions are not derivation input**

Make this explicit in both truth-sync docs.

**Step 3: Verify docs state recovery path clearly**

Run:
```bash
rg -n "prototype_synced=true|update HTML prototype|not derivation input|single truth source" docs/plans/2026-03-09-single-truth-sync-gate-design.md docs/plans/2026-03-09-single-truth-sync-gate-implementation-plan.md
```
Expected:
- all concepts present

**Step 4: Commit**

```bash
git add docs/plans/2026-03-09-single-truth-sync-gate-design.md docs/plans/2026-03-09-single-truth-sync-gate-implementation-plan.md
git commit -m "docs: define single truth sync recovery path"
```

---

## Final Verification

Run all of the following:

```bash
python3 .claude/skills/workflow-engine/tests/truth_sync_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/truth_sync_guard.py --module permission
rg -n "truth_sync_guard" .windsurf/workflows/brainstorm.md .windsurf/workflows/approve.md .windsurf/workflows/split-story.md .windsurf/workflows/split-ticket.md .windsurf/workflows/verify.md .claude/skills/verification/SKILL.md bin/final-gate.sh
rg -n "ui_truth_change|prototype_synced|required_decision_fields|enforced_entrypoints" .claude/project/config.yaml .windsurf/workflows/brainstorm.md .windsurf/workflows/approve.md docs/plans/2026-03-09-single-truth-sync-gate-design.md
```

Expected:
- selftest PASS
- module guard returns correct status for current decisions file
- all intended entrypoints are wired
- metadata fields are documented consistently
- machine-readable config policy is present

## Notes

- HTML remains the only UI truth source.
- `DECISIONS.md` is blocking metadata, not derivation input.
- This plan is complete only when the earliest stage (`brainstorm`) blocks before downstream derivation continues.
