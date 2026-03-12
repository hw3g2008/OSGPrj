# Test Asset Migration Review Packet

## Review Goal

Review the framework-side changes that add a historical test-asset migration path for scenario-obligation schema enforcement, and verify that the remaining `permission` guard failures are real coverage gaps rather than framework wiring bugs.

## Scope

Framework / workflow / guard / migration assets touched:

- [bin/sync-test-assets.py](/Users/hw/workspace/OSGPrj/bin/sync-test-assets.py)
- [bin/sync-test-assets-selftest.py](/Users/hw/workspace/OSGPrj/bin/sync-test-assets-selftest.py)
- [.claude/commands/migrate.md](/Users/hw/workspace/OSGPrj/.claude/commands/migrate.md)
- [.windsurf/workflows/migrate-test-assets.md](/Users/hw/workspace/OSGPrj/.windsurf/workflows/migrate-test-assets.md)
- [.claude/skills/story-splitter/SKILL.md](/Users/hw/workspace/OSGPrj/.claude/skills/story-splitter/SKILL.md)
- [.claude/skills/ticket-splitter/SKILL.md](/Users/hw/workspace/OSGPrj/.claude/skills/ticket-splitter/SKILL.md)

Context docs:

- [docs/plans/2026-03-12-test-asset-migration-design.md](/Users/hw/workspace/OSGPrj/docs/plans/2026-03-12-test-asset-migration-design.md)
- [docs/plans/2026-03-12-test-asset-migration.md](/Users/hw/workspace/OSGPrj/docs/plans/2026-03-12-test-asset-migration.md)
- [docs/test-scenario-obligation-fix-plan.md](/Users/hw/workspace/OSGPrj/docs/test-scenario-obligation-fix-plan.md)

Consumer / verification points:

- [.claude/skills/workflow-engine/tests/test_asset_completeness_guard.py](/Users/hw/workspace/OSGPrj/.claude/skills/workflow-engine/tests/test_asset_completeness_guard.py)
- [.claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py](/Users/hw/workspace/OSGPrj/.claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py)
- [.claude/skills/verification/SKILL.md](/Users/hw/workspace/OSGPrj/.claude/skills/verification/SKILL.md)

## Problem Statement

The framework now requires:

- Story-level `required_test_obligations`
- Ticket/module test-case `category`
- Ticket/module test-case `scenario_obligation`

But historical `permission` assets were generated before this schema existed. Re-running `/split story` or `/split ticket` is not a safe migration path because:

- the module is already in terminal workflow state
- `/split ticket` carries `STATE.yaml` side effects
- old module test-cases used append-only generation and could not be updated in place

## Implemented Approach

### 1. Dedicated migration entrypoint

Added a state-free command/workflow:

- [.claude/commands/migrate.md](/Users/hw/workspace/OSGPrj/.claude/commands/migrate.md)
- [.windsurf/workflows/migrate-test-assets.md](/Users/hw/workspace/OSGPrj/.windsurf/workflows/migrate-test-assets.md)

Design constraints:

- no `transition()`
- no `STATE.yaml` mutation
- safe on completed modules

### 2. Reuse existing sync engine instead of adding a new guard

Extended [bin/sync-test-assets.py](/Users/hw/workspace/OSGPrj/bin/sync-test-assets.py) to:

- backfill Story `required_test_obligations`
- backfill Ticket `test_cases.category/scenario_obligation`
- upsert module-level test cases by `tc_id`
- preserve `automation` and `latest_result`
- rebuild traceability matrix
- infer metadata for legacy custom cases without declared `test_case_id/story_case_id`

### 3. Align source-stage docs with migration semantics

Updated skill docs to document:

- `ensure_required_test_obligations(...)` wrapper in story-splitter
- module TC write semantics are upsert, not append-only
- historical migration should use `/migrate test-assets {module}`, not `/split`

## Verification Already Run

### Selftests

Passed:

- `python3 bin/sync-test-assets-selftest.py`
  - current result: `PASS: sync-test-assets-selftest (5 tests)`
- `python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py`
  - current result: `PASS: test_asset_completeness_guard_selftest (9 tests)`

### Real-module migration

Ran:

```bash
python3 bin/sync-test-assets.py --module permission
```

Observed result:

```text
PASS: sync-test-assets module=permission story_id=ALL stories=7 tickets=50 cases_created=0 cases_total=228
```

### Real-module guard

Single-story check that previously failed now passes:

```bash
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module permission --story-id S-001
```

Observed result:

```text
PASS: test_asset_completeness_guard story_id=S-001 ...
```

Full-module check still fails, but only with `scenario obligation gap` findings:

```bash
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module permission
```

Current remaining findings:

- `S-002` missing `auth_or_data_boundary`
- `S-003` missing `state_change`, `business_rule_reject`, `persist_effect`
- `S-004` missing `persist_effect`
- `S-005` missing `persist_effect`
- `S-006` missing `auth_or_data_boundary`, `persist_effect`
- `S-007` missing `business_rule_reject`, `auth_or_data_boundary`

No remaining findings of these types:

- `missing both category and scenario_obligation`
- `duplicate tc_id`
- `ticket missing declared test_cases coverage`
- `story missing story-level/final-level test cases`

## What To Review

Please review from these angles:

1. Framework chain integration
   - Is the migration path truly independent from RPIV state transitions?
   - Are there any remaining workflow or command collisions?

2. Upsert semantics
   - Does `sync-test-assets.py` update canonical module test-cases safely by `tc_id`?
   - Does it preserve execution evidence correctly?

3. Legacy-case compatibility
   - Are there edge cases where legacy custom TC rows could still miss metadata?
   - Are any inference rules too aggressive and likely to misclassify obligations?

4. Source-stage coherence
   - Do story/ticket skill docs now match the actual migration engine?
   - Is there any mismatch between split-time semantics and migrate-time semantics?

5. Remaining guard failures
   - Do the remaining `scenario obligation gap` findings look like real coverage gaps?
   - Or do any of them still look like framework inference mistakes / over-strict Story obligations?

## Expected Review Output

Please return findings ordered by severity:

1. Framework bug
2. Migration logic risk
3. Documentation / contract mismatch
4. Remaining real product/test gap

For each finding, include:

- severity
- file reference
- why it is wrong or risky
- whether it should be fixed in framework code or in `permission` assets/tests
