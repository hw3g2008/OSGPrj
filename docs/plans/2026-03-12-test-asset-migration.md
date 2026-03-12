# Test Asset Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a safe migration path that upgrades old Story/Ticket/test-case assets to the new scenario-obligation schema without mutating workflow state.

**Architecture:** Reuse `bin/sync-test-assets.py` as the single execution engine for asset migration. Add migration-specific normalization helpers, make module test-case writes upsert existing rows by `tc_id`, and expose the path through a dedicated `/migrate test-assets {module}` command/workflow that never calls `transition()`.

**Tech Stack:** Python 3, YAML, Markdown workflow docs, existing workflow-engine guards

---

## Existing-Entrypoint Inventory

- Source-stage Story generation: `.claude/skills/story-splitter/SKILL.md`
- Source-stage Ticket generation: `.claude/skills/ticket-splitter/SKILL.md`
- Existing asset sync script: `bin/sync-test-assets.py`
- Existing migration-like precedent: `.claude/skills/workflow-engine/tests/normalize_status_enum.py`
- Guard consuming migrated assets: `.claude/skills/workflow-engine/tests/test_asset_completeness_guard.py`
- Manual verify entrypoint: `.windsurf/workflows/verify.md`

## Guard Reuse / Collision Audit

- Reuse existing `test_asset_completeness_guard.py`; do not add a new guard.
- Migration command produces assets and then relies on the existing guard for acceptance.
- No naming collision if the new command is `migrate.md` and workflow alias is `migrate-test-assets.md`.

## Source-Stage Integration Path

- New modules still get obligations from `story-splitter` and `ticket-splitter`.
- Historical modules get the same fields via `bin/sync-test-assets.py`.
- Module test-cases remain the single machine-readable source for traceability-derived output.

## Stage-Regression Verification

- Script selftest proves migration behavior in isolation.
- Guard selftest proves schema consumer behavior.
- Real-module run against `permission` proves migration works before `/verify`.

### Task 1: Document the Migration Entry Path

**Files:**
- Create: `docs/plans/2026-03-12-test-asset-migration-design.md`
- Create: `docs/plans/2026-03-12-test-asset-migration.md`
- Create: `.claude/commands/migrate.md`
- Create: `.windsurf/workflows/migrate-test-assets.md`

**Step 1: Write the command/workflow docs**

- Define `/migrate test-assets {module}` as a non-stateful command.
- Document that it must not call `transition()` or write `STATE.yaml`.
- Document that it runs `bin/sync-test-assets.py` and then `test_asset_completeness_guard.py`.

**Step 2: Verify docs are aligned**

Run: `rg -n "/migrate test-assets|sync-test-assets.py|STATE.yaml|transition\\(" .claude/commands/migrate.md .windsurf/workflows/migrate-test-assets.md`
Expected: the command is documented as script-driven and state-free.

### Task 2: Add Failing Selftests for Migration Semantics

**Files:**
- Modify: `bin/sync-test-assets-selftest.py`

**Step 1: Write failing tests**

- Test that an old Story without `required_test_obligations` gets populated.
- Test that an old Ticket `test_cases` entry gets `category` and `scenario_obligation`.
- Test that an existing module-level case is updated in place with new fields while preserving `automation` and `latest_result`.

**Step 2: Run test to verify it fails**

Run: `python3 bin/sync-test-assets-selftest.py`
Expected: FAIL because the current script does not backfill the new fields.

### Task 3: Implement Migration Normalization in `sync-test-assets.py`

**Files:**
- Modify: `bin/sync-test-assets.py`

**Step 1: Add minimal helpers**

- Add config loading for obligation taxonomy.
- Add `ensure_required_test_obligations(...)`.
- Add AC label parsing and fallback obligation inference.
- Add Ticket test-case field normalization for `category` and `scenario_obligation`.

**Step 2: Implement module TC upsert**

- Replace append-only behavior with `tc_id`-based update/merge.
- Preserve `automation` and `latest_result` when the case already exists.

**Step 3: Run targeted selftest**

Run: `python3 bin/sync-test-assets-selftest.py`
Expected: PASS

### Task 4: Align Framework Docs with the Real Migration Engine

**Files:**
- Modify: `.claude/skills/story-splitter/SKILL.md`
- Modify: `.claude/skills/ticket-splitter/SKILL.md`

**Step 1: Update Story helper contract**

- Document `ensure_required_test_obligations(...)` as the shared wrapper over `infer_required_test_obligations(...)`.

**Step 2: Update Ticket asset generation contract**

- Replace append-only pseudocode with upsert semantics or explicit delegation to `bin/sync-test-assets.py`.

**Step 3: Verify docs mention upsert instead of append-only**

Run: `rg -n "append-only|upsert|ensure_required_test_obligations|sync-test-assets.py" .claude/skills/story-splitter/SKILL.md .claude/skills/ticket-splitter/SKILL.md`
Expected: migration-capable semantics are reflected in the docs.

### Task 5: Validate Against Real Guards

**Files:**
- Test: `.claude/skills/workflow-engine/tests/test_asset_completeness_guard.py`

**Step 1: Run guard selftests**

Run: `python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py`
Expected: PASS

**Step 2: Run migration on permission**

Run: `python3 bin/sync-test-assets.py --module permission`
Expected: PASS and rewritten Story/Ticket/module test assets.

**Step 3: Run real guard**

Run: `python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module permission`
Expected: either PASS or only genuine scenario coverage gaps, not schema-missing failures.
