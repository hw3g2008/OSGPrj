# Operation-Level Test Obligation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the framework from Story-level scenario obligations to operation-level CRUD coverage and add frontend/backend write-API parity checks.

**Architecture:** Reuse the current Story -> Ticket -> module test-case -> traceability chain. Add `required_test_operations` at Story level, add `operation` to structured test cases, extend `test_asset_completeness_guard.py` to verify operation completeness, and add one focused `api_operation_parity_guard.py` for frontend/backend mapping parity.

**Tech Stack:** YAML, Python 3, Bash, Markdown, TypeScript source scanning, existing RPIV workflow docs

---

## Existing-Entrypoint Inventory

### Truth / Source Stage

1. `.claude/project/config.yaml`
2. `.claude/skills/story-splitter/SKILL.md`
3. `.claude/skills/ticket-splitter/SKILL.md`
4. `osg-spec-docs/tasks/stories/*.yaml`
5. `osg-spec-docs/tasks/tickets/*.yaml`

### Derived Asset Stage

1. `bin/sync-test-assets.py`
2. `osg-spec-docs/tasks/testing/{module}-test-cases.yaml`
3. `osg-spec-docs/tasks/testing/{module}-traceability-matrix.md`

### Verification / Gate Stage

1. `.claude/skills/workflow-engine/tests/test_asset_completeness_guard.py`
2. `.claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py`
3. `.claude/skills/verification/SKILL.md`
4. `.claude/commands/verify.md`
5. `.windsurf/workflows/verify.md`
6. `bin/final-gate.sh`

## Guard Reuse / Collision Audit

### Reuse

Reuse `test_asset_completeness_guard.py` for operation completeness because:

1. It already validates Story/Ticket/module test-case completeness.
2. It already understands `split/approve/verify` stage semantics.
3. Missing operation coverage is an asset completeness failure, not a separate domain.

### New Guard

Add `api_operation_parity_guard.py` because:

1. It inspects frontend API declarations and backend controller mappings.
2. That responsibility does not belong in `test_asset_completeness_guard.py`.
3. Reuse would mix YAML completeness and source-code parity into one noisy guard.

### Collision Decision

- Do **not** create a second operation matrix artifact.
- Do **not** create a second asset completeness guard.
- Do **not** overload `requirements_coverage_guard.py` with code-parity logic.

## Source-Stage Integration Path

1. `.claude/project/config.yaml` becomes the machine truth for allowed operation vocabulary and profiles.
2. `story-splitter` generates or normalizes `required_test_operations` at Story stage.
3. `ticket-splitter` generates `operation` into Ticket `test_cases`.
4. `bin/sync-test-assets.py` propagates `operation` into module test-cases and traceability output.
5. `test_asset_completeness_guard.py` becomes the earliest choke point for missing operations.
6. `api_operation_parity_guard.py` runs at verify/final-gate after source-stage artifacts already exist.

## Stage-Regression Verification

The implementation is not complete until all of these are demonstrated:

1. A splitter-level fixture proves CRUD Story generation emits `required_test_operations`.
2. A ticket-level fixture proves `operation` is written into `test_cases`.
3. A sync fixture proves `operation` reaches module test-cases.
4. `test_asset_completeness_guard.py --stage split` fails when a required operation is missing.
5. `test_asset_completeness_guard.py --stage verify` fails when the operation exists but latest_result is still pending.
6. `api_operation_parity_guard.py` fails on a fixture where frontend declares `PUT /system/basedata` and backend mapping is absent.

## Task 1: Add Operation Truth to Config and Story Splitter Contract

**Files:**
- Modify: `.claude/project/config.yaml`
- Modify: `.claude/skills/story-splitter/SKILL.md`
- Test: repo backtrace against `.claude/project/config.yaml` and Story examples

**Step 1: Add operation vocabulary to config**

Extend `config.testing.design` with:

```yaml
operation_obligations:
  allowed:
    - list
    - search
    - create
    - edit
    - status_toggle
    - delete
    - reject_disable
    - auth_filter
  profiles:
    crud_minimal:
      operations:
        create:
          required: [state_change, persist_effect]
        edit:
          required: [state_change, persist_effect]
        status_toggle:
          required: [state_change, persist_effect]
        reject_disable:
          required: [business_rule_reject]
```

Add one hard validation rule to the config contract:

1. every `operation_obligations.profiles.*.operations.*.required[]` entry must be a member of `scenario_obligations.allowed`

**Step 2: Extend Story splitter contract**

Document helper behavior in `story-splitter/SKILL.md`:

- `infer_required_test_operations(story, config)`
- `ensure_required_test_operations(story, config)`

Rules:

1. display-only stories may omit `required_test_operations`
2. CRUD-like stories infer `crud_minimal`
3. explicit Story YAML remains authoritative if already present
4. `split_stories()` must explicitly assign `story["required_test_operations"]` after `ensure_required_test_obligations(...)`

Required pseudocode shape:

```python
story["required_test_obligations"] = ensure_required_test_obligations(...)
story["required_test_operations"] = ensure_required_test_operations(
    story,
    config.testing.design.operation_obligations.profiles,
    config.testing.design.scenario_obligations.allowed,
)
```

**Step 3: Verify repo consistency**

Run:

```bash
rg -n "operation_obligations|required_test_operations" .claude/project/config.yaml .claude/skills/story-splitter/SKILL.md
```

Expected:

- operation truth exists in config
- Story splitter references it explicitly

**Step 4: Commit**

```bash
git add .claude/project/config.yaml .claude/skills/story-splitter/SKILL.md
git commit -m "feat: define operation-level obligation truth"
```

## Task 2: Extend Ticket Splitter to Emit Structured `operation`

**Files:**
- Modify: `.claude/skills/ticket-splitter/SKILL.md`
- Read: `.claude/skills/story-splitter/SKILL.md`
- Test: repo backtrace on ticket generation contract

**Step 1: Define the helper contract**

Add or document:

```python
def infer_operation_from_ac(ac_text: str, story_operations: dict) -> str | None:
    ...
```

Required heuristics:

1. create/add/new => `create`
2. edit/update/修改 => `edit`
3. enable/disable/status => `status_toggle`
4. reject/cannot disable/不可禁用 => `reject_disable`
5. list/table/render => `list`
6. search/filter => `search`

**Step 2: Extend generated test case fields**

Document that every new-pipeline test case now writes:

```yaml
category:
scenario_obligation:
operation:
```

for:

1. Ticket-level test cases
2. Story-level cases
3. final-level cases

This step must name the exact write points inside the current `ticket-splitter` pseudocode:

1. ticket-level `desired_case` block
2. story/final `desired_case` block

Required pseudocode shape:

```python
"operation": infer_operation_from_ac(matching_ac, story_operations)
```

and for story/final fallback:

```python
"operation": infer_operation_from_ac(_ac, story_operations)
```

**Step 3: Add splitter-level operation completeness check**

Update `.claude/skills/ticket-splitter/SKILL.md` Phase 2 so the quality checklist expands from 9 items to 10 items.

New check:

- `操作完整性`
- Question: when Story defines `required_test_operations`, does the generated Ticket set cover every required operation at least once?
- Pass: all required operations are present
- Fail: any required operation is absent from the Ticket set

Required pseudocode shape, immediately after the existing Story-level `required_test_obligations` completeness block:

```python
story_operations = story.get("required_test_operations", {}).get("operations", {})
covered_operations = set()
for ticket in tickets:
    for ac in ticket.get("acceptance_criteria", []):
        op = infer_operation_from_ac(parse_ac_labels(ac).get("plain_text", ac), story_operations)
        if op:
            covered_operations.add(op)

missing_operations = [op for op in story_operations.keys() if op not in covered_operations]
if missing_operations:
    quality_issues.append(
        f"操作完整性缺失: Story {story_id} 要求操作 {sorted(story_operations.keys())}，"
        f"但 Ticket 集合只覆盖了 {sorted(covered_operations)}，缺少: {missing_operations}"
    )
```

This is a shift-left check only. Do not remove or weaken the later `test_asset_completeness_guard.py` stage enforcement.

**Step 4: Verify source-stage generation path**

Run:

```bash
rg -n "infer_operation_from_ac|operation:|操作完整性|required_test_operations" .claude/skills/ticket-splitter/SKILL.md
```

Expected:

- Ticket splitter is now the earliest stage that creates `operation`
- Ticket splitter Phase 2 also fails early when required operations are missing

**Step 5: Commit**

```bash
git add .claude/skills/ticket-splitter/SKILL.md
git commit -m "feat: extend ticket splitter with operation field"
```

## Task 3: Propagate `operation` Through Sync and Module Test Cases

**Files:**
- Modify: `bin/sync-test-assets.py`
- Modify: `bin/sync-test-assets-selftest.py`
- Test: `bin/sync-test-assets-selftest.py`

**Step 1: Write failing selftests**

Add tests that fail until sync propagates `operation`:

1. ticket case with `operation: edit` must preserve it in module case
2. story/final case inferred from AC must carry `operation`
3. old assets without `operation` should be compatibly inferred when possible
4. traceability matrix rows must render `operation`

**Step 2: Run selftests to prove failure**

Run:

```bash
python3 bin/sync-test-assets-selftest.py
```

Expected:

- FAIL because `operation` is missing from normalized output

**Step 3: Implement minimal sync changes**

Extend the sync script to:

1. read Ticket `operation`
2. infer Story/final `operation` when absent
3. write `operation` into module test-cases
4. render `operation` into Markdown traceability output
5. keep existing `automation/latest_result/evidence_ref` preservation behavior

The implementation must call out the concrete functions touched, not just the script name. At minimum:

1. `resolve_case_metadata(...)`
2. `resolve_story_case_metadata(...)`
3. `normalize_ticket_test_cases(...)`
4. `enrich_ticket_test_cases(...)`
5. `create_ticket_case(...)`
6. `create_story_or_final_case(...)`
7. `normalize_existing_cases(...)`
8. `matrix_rows_from_cases(...)`
9. `render_matrix(...)`

Traceability output is part of the required propagation path. `operation` is not considered fully landed if it exists only in `*-test-cases.yaml` but is absent from generated `*-traceability-matrix.md`.

**Step 4: Re-run selftests**

Run:

```bash
python3 bin/sync-test-assets-selftest.py
```

Expected:

- PASS
- generated traceability matrix includes an `Operation` column

**Step 5: Commit**

```bash
git add bin/sync-test-assets.py bin/sync-test-assets-selftest.py
git commit -m "feat: propagate operation into synced test assets"
```

## Task 4: Extend Asset Completeness Guard to Check Operation Completeness

**Files:**
- Modify: `.claude/skills/workflow-engine/tests/test_asset_completeness_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py`
- Modify: `.claude/skills/verification/SKILL.md`
- Modify: `.claude/commands/verify.md`
- Modify: `.windsurf/workflows/verify.md`

**Step 1: Add failing selftests**

Add selftests for:

1. missing required `edit` operation at `split` stage
2. missing `status_toggle` operation at `approve` stage
3. required `edit` present but `latest_result.status=pending` at `verify` stage
4. operation field missing when asset is already in new schema

**Step 2: Run selftests to prove failure**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py
```

Expected:

- FAIL because operation completeness is not yet checked

**Step 3: Implement minimal guard changes**

Rules:

1. If Story has no `required_test_operations`, preserve current behavior.
2. If Story has `required_test_operations`, require at least one TC per `operation + obligation`.
3. At `verify` stage, require `latest_result.status != pending`.
4. Reuse existing compatibility behavior for old assets where appropriate.

Implementation must switch from one-dimensional obligation coverage to a two-dimensional structure. Required internal shape:

```python
covered_operation_obligations: dict[str, set[str]] = {}
pending_operation_obligations: dict[str, list[str]] = {}
```

The guard must:

1. read `operation` and `scenario_obligation` from each TC
2. populate `covered_operation_obligations[operation].add(obligation)`
3. compare each Story `required_test_operations.operations[operation].required[]`
4. report missing combinations precisely as `operation + obligation` gaps

Do not collapse back to a single `covered_obligations` set when `required_test_operations` exists.

**Step 4: Update verify docs**

Make `verification` and `/verify` explicitly state:

- scenario completeness now includes operation completeness
- verify blocks when required operations are unexecuted

**Step 5: Re-run selftests**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py
```

Expected:

- PASS

**Step 6: Commit**

```bash
git add .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py \
  .claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py \
  .claude/skills/verification/SKILL.md \
  .claude/commands/verify.md \
  .windsurf/workflows/verify.md
git commit -m "feat: enforce operation completeness in asset guard"
```

## Task 5: Add API Operation Parity Guard

**Files:**
- Create: `.claude/skills/workflow-engine/tests/api_operation_parity_guard.py`
- Create: `.claude/skills/workflow-engine/tests/api_operation_parity_guard_selftest.py`
- Modify: `.claude/skills/verification/SKILL.md`
- Modify: `.claude/commands/verify.md`
- Modify: `.windsurf/workflows/verify.md`
- Modify: `bin/final-gate.sh`

**Step 1: Write failing selftests**

Cover at least:

1. frontend declares `PUT /system/basedata`, backend mapping missing => FAIL
2. frontend/backend both declare same method/path => PASS
3. read-only GET API mismatch does not block if not part of required write operations

**Step 2: Run selftests to prove failure**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/api_operation_parity_guard_selftest.py
```

Expected:

- FAIL because guard file does not exist yet

**Step 3: Implement minimal parity guard**

Implementation shape:

1. read frontend scan roots from repo conventions:
   - `.claude/project/config.yaml -> paths.frontend.api`
   - module-local `osg-frontend/packages/*/src/api/*.ts` files
2. parse frontend `http.post/http.put/http.delete` declarations
3. read backend controller scan root from `.claude/project/config.yaml -> paths.backend.controllers`
4. parse backend `@PostMapping/@PutMapping/@DeleteMapping`
5. compare normalized method/path pairs
6. optionally narrow blocking scope to operations required by the target Story/module

**Step 4: Wire into verify and final-gate**

Add the guard after asset completeness succeeds, before final E2E confidence is claimed.

**Step 5: Re-run selftests**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/api_operation_parity_guard_selftest.py
```

Expected:

- PASS

**Step 6: Commit**

```bash
git add .claude/skills/workflow-engine/tests/api_operation_parity_guard.py \
  .claude/skills/workflow-engine/tests/api_operation_parity_guard_selftest.py \
  .claude/skills/verification/SKILL.md \
  .claude/commands/verify.md \
  .windsurf/workflows/verify.md \
  bin/final-gate.sh
git commit -m "feat: add frontend backend api operation parity guard"
```

## Task 6: Pilot the Model on Permission CRUD Stories

**Files:**
- Modify: `osg-spec-docs/tasks/stories/S-004.yaml`
- Modify: `osg-spec-docs/tasks/stories/S-005.yaml`
- Modify: `osg-spec-docs/tasks/stories/S-006.yaml`
- Modify: selected `osg-spec-docs/tasks/tickets/T-*.yaml`
- Modify: `osg-spec-docs/tasks/testing/permission-test-cases.yaml` via sync
- Modify: `osg-spec-docs/tasks/testing/permission-traceability-matrix.md` via sync

**Step 0: Pilot asset preflight**

Before modifying pilot data, verify:

```bash
test -f osg-spec-docs/tasks/stories/S-004.yaml
test -f osg-spec-docs/tasks/stories/S-005.yaml
test -f osg-spec-docs/tasks/stories/S-006.yaml
test -f osg-spec-docs/tasks/tickets/T-040.yaml
test -f osg-spec-docs/tasks/tickets/T-041.yaml
test -f osg-spec-docs/tasks/tickets/T-042.yaml
```

Expected:

- all pilot Story/Ticket files exist
- schema remains compatible with current test-asset fields

**Step 1: Add explicit operation truth to pilot Stories**

At minimum:

- `S-004`: create/edit/delete-reject or status operations as applicable
- `S-005`: create/edit/status_toggle
- `S-006`: create/edit/status_toggle/reject_disable

**Step 2: Backfill Ticket test cases with `operation`**

Do not hand-edit module test-cases first.
Update Ticket YAML or rely on source-stage derivation, then sync.

**Step 3: Run sync**

Run:

```bash
python3 bin/sync-test-assets.py --module permission
```

Expected:

- module test-cases regenerated with `operation`

**Step 4: Run early-stage guard regression**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module permission --story-id S-006 --stage split
```

Expected:

- FAIL until `edit/create/status_toggle` are all represented correctly

**Step 5: Run verify-stage regression**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module permission --story-id S-006 --stage verify
python3 .claude/skills/workflow-engine/tests/api_operation_parity_guard.py --module permission --story-id S-006
```

Expected:

- parity guard fails against current missing `PUT /system/basedata` until backend or asset truth is fixed

**Step 6: Commit**

```bash
git add osg-spec-docs/tasks/stories/S-004.yaml \
  osg-spec-docs/tasks/stories/S-005.yaml \
  osg-spec-docs/tasks/stories/S-006.yaml \
  osg-spec-docs/tasks/tickets \
  osg-spec-docs/tasks/testing/permission-test-cases.yaml \
  osg-spec-docs/tasks/testing/permission-traceability-matrix.md
git commit -m "docs: pilot operation-level obligations for permission crud stories"
```

## Task 7: Final Regression Proof

**Files:**
- No new files

**Step 1: Run selftests**

```bash
python3 bin/sync-test-assets-selftest.py
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/api_operation_parity_guard_selftest.py
```

Expected:

- all PASS

**Step 2: Run permission pilot checks**

```bash
python3 bin/sync-test-assets.py --module permission
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module permission
python3 .claude/skills/workflow-engine/tests/api_operation_parity_guard.py --module permission
```

Expected:

- operation completeness and API parity reflect real defects precisely

**Step 3: Run final-gate only after pilot is green**

```bash
bash bin/final-gate.sh permission
```

Expected:

- no operation-level blind spots remain

**Step 4: Commit**

```bash
git add -A
git commit -m "test: harden framework with operation-level test obligations"
```
