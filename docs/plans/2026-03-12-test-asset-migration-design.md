# Test Asset Migration Design

**Context**

The framework now enforces `required_test_obligations`, `category`, and `scenario_obligation`, but historical `permission` assets still use the old schema. Re-running `/split story` or `/split ticket` is not a safe migration path because the workflow state is already terminal and `/split ticket` still carries stateful side effects.

**Decision**

Use a dedicated, non-stateful migration path backed by the existing `bin/sync-test-assets.py` script instead of reusing workflow state transitions.

**Design**

1. Add a dedicated `/migrate test-assets {module}` command and Windsurf workflow alias.
2. Extend `bin/sync-test-assets.py` to perform schema migration in place:
   - ensure Story `required_test_obligations`
   - ensure Ticket `test_cases.category` and `test_cases.scenario_obligation`
   - upsert module-level test cases by `tc_id` without losing `automation` or `latest_result`
   - regenerate traceability matrix from normalized cases
3. Keep migration outside the RPIV state machine:
   - no `transition()`
   - no `STATE.yaml` mutation
   - safe to run on completed modules
4. Reuse the same obligation taxonomy already defined in `.claude/project/config.yaml`.

**Entrypoints**

- Command docs: `.claude/commands/migrate.md`
- Workflow docs: `.windsurf/workflows/migrate-test-assets.md`
- Execution script: `bin/sync-test-assets.py`
- Validation: `.claude/skills/workflow-engine/tests/test_asset_completeness_guard.py`

**Non-Goals**

- No new guard
- No new truth source
- No workflow-state rollback/reset path
- No automatic mutation of implementation/test code outside test asset files

**Verification**

- `python3 bin/sync-test-assets-selftest.py`
- `python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py`
- `python3 bin/sync-test-assets.py --module permission`
- `python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module permission`
