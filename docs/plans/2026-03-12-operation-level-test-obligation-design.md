# Operation-Level Test Obligation Design

**Context**

The current framework already enforces Story-level `required_test_obligations` and module-level traceability. That closes the broad "no test command" and "no scenario category" gaps, but it still allows CRUD pages to pass when only one mutation path is tested.

`permission/base-data` exposed the remaining blind spot:

- Story `S-006` requires `display/state_change/business_rule_reject/persist_effect`
- all those obligations are present somewhere in the Story's test assets
- guards pass
- but the page still ships with a missing `PUT /system/basedata` backend mapping, because no test asset explicitly required `edit success`

In other words, the framework currently proves **Story-level scenario coverage**, not **operation-level mutation coverage**.

## Problem Statement

The framework cannot currently answer these questions for CRUD-style pages:

1. Does `create` have a success-path test?
2. Does `edit` have a success-path test?
3. Does `status_toggle` have a success-path test?
4. Does a required reject-path belong to a specific operation?
5. Does a frontend-declared write API actually exist in backend controller mappings?

Because the answers are not machine-readable, guards only verify that a Story has at least one `state_change` / `persist_effect` / `business_rule_reject` case, not that each concrete operation is covered.

## Goals

1. Keep the existing single truth chain:
   - Story YAML
   - Ticket YAML
   - module `*-test-cases.yaml`
   - traceability matrix
2. Extend the framework so CRUD-style Stories can declare required operations explicitly.
3. Force structured test assets to record which operation a case covers.
4. Make guards fail early when required operations are missing.
5. Add a code-level parity check so frontend write APIs cannot exist without matching backend controller mappings.

## Non-Goals

1. Do not replace `scenario_obligation`.
2. Do not introduce a second test truth source outside existing Story/Ticket/test-case assets.
3. Do not require every page to become CRUD-aware; display-only pages should stay simple.
4. Do not depend on final-gate as the first place to detect these issues.

## Existing Chain

**Source stage**

- `.claude/project/config.yaml`
- `.claude/skills/story-splitter/SKILL.md`
- `.claude/skills/ticket-splitter/SKILL.md`
- `osg-spec-docs/tasks/stories/*.yaml`
- `osg-spec-docs/tasks/tickets/*.yaml`

**Derived assets**

- `osg-spec-docs/tasks/testing/{module}-test-cases.yaml`
- `osg-spec-docs/tasks/testing/{module}-traceability-matrix.md`
- `bin/sync-test-assets.py`

**Guards / workflow**

- `.claude/skills/workflow-engine/tests/test_asset_completeness_guard.py`
- `.claude/skills/verification/SKILL.md`
- `.claude/commands/verify.md`
- `.windsurf/workflows/verify.md`
- `bin/final-gate.sh`

The design must extend this chain instead of creating a parallel "operation matrix" artifact.

## Options

### Option A: Only add more E2E

Add mandatory CRUD E2E cases for create/edit/delete/status paths.

**Pros**

- Simple mental model
- Strong end-user confidence

**Cons**

- Slow and expensive
- Still does not machine-check whether frontend write APIs exist in backend
- Does not improve source-stage quality

### Option B: Extend current scenario obligations with operation-level structure

Keep `scenario_obligation`, but add `required_test_operations` at Story level and `operation` at Ticket/module test-case level.

**Pros**

- Reuses current assets and guards
- Detects missing CRUD paths earlier than final-gate
- Preserves existing scenario taxonomy

**Cons**

- Requires schema changes in Story/Ticket/module test cases
- Needs migration logic for historical assets

### Option C: Build a separate operation-matrix artifact

Introduce a new YAML/Markdown file for operation coverage.

**Pros**

- Explicit and isolated

**Cons**

- Creates a second truth source
- Sync cost and drift risk are high
- Repeats the same mistake already removed from test-asset migration design

## Decision

Choose **Option B**.

The framework should keep `scenario_obligation` as the semantic layer, and add an operation dimension on top of it:

- Story: `required_test_operations`
- Ticket / module test-cases: `operation`
- Guard: verify `operation + scenario_obligation`

This preserves the existing truth chain and closes the exact blind spot exposed by `S-006`.

## Proposed Model

### 1. Story-level operation truth

Add a new optional field:

```yaml
required_test_operations:
  profile: crud_minimal
  operations:
    create:
      required:
        - state_change
        - persist_effect
    edit:
      required:
        - state_change
        - persist_effect
    status_toggle:
      required:
        - state_change
        - persist_effect
    disable_reject:
      required:
        - business_rule_reject
```

Rules:

1. Display-only pages may omit the field entirely.
2. CRUD-like pages may use config-defined profiles or explicit `operations`.
3. `required_test_obligations` remains at Story level and still expresses broad semantic coverage.
4. `required_test_operations` refines the mutation granularity for Stories that need it.
5. Every `required_test_operations.*.required[]` value must be a member of `scenario_obligations.allowed`.

### 1.1 Story-splitter generation point

This field must not be introduced only as a contract comment. It needs an explicit source-stage generation step inside `split_stories()`.

Required order inside Story generation:

1. `ensure_required_test_obligations(story, obligation_profiles)`
2. `ensure_required_test_operations(story, operation_profiles, allowed_obligations)`
3. write normalized Story YAML

The operation helper must infer CRUD-like Stories from mutation-heavy AC text. At minimum, ACs containing create/edit/delete/enable/disable/save/reject-style mutations should route to a `crud_minimal` operation profile instead of leaving `required_test_operations` absent.

### 2. Ticket / module test-case structure

Add a structured `operation` field to each new-style test case:

```yaml
- test_case_id: TCS-T-041-001
  ac_ref: AC-S-006-03
  category: positive
  scenario_obligation: state_change
  operation: edit
```

Allowed examples:

- `list`
- `search`
- `create`
- `edit`
- `status_toggle`
- `delete`
- `reject_disable`
- `auth_filter`

The exact allowed vocabulary should live in `.claude/project/config.yaml`.

### 2.1 Ticket-splitter write points

`operation` must be written at the same concrete generation points that already write `category` and `scenario_obligation`:

1. ticket-level `desired_case`
2. story-level `desired_case`
3. final-level `desired_case`

If the plan does not identify these write points explicitly, implementers can update the helper contract and still miss the actual emitted test-case schema.

### 2.1.1 Shift-left completeness check

`ticket-splitter` should not stop at emitting `operation`. It should also perform a lightweight completeness check during its own Phase 2 quality loop when `required_test_operations` exists on the Story.

Required behavior:

1. preserve the existing Story-level `required_test_obligations` completeness check
2. add a second check that compares Story `required_test_operations.operations.keys()` against the operations covered by the generated Ticket set
3. fail early in splitter output when an operation such as `edit` is missing entirely

This does **not** replace `test_asset_completeness_guard.py`. The guard remains authoritative for stage blocking. The splitter-level check exists to shift obvious operation gaps left before handoff.

### 2.2 Traceability visibility

`operation` is not only a YAML-layer field. The synced traceability output must expose it as well, so human reviewers can audit which CRUD action each TC covers without opening raw `*-test-cases.yaml`.

Minimum requirement:

1. `matrix_rows_from_cases(...)` reads `case.get("operation")`
2. `render_matrix(...)` adds an `Operation` column
3. generated `*-traceability-matrix.md` displays `operation` alongside `TC-ID` / `Level`

Machine guards remain the source of enforcement, but the Markdown traceability matrix must remain a usable audit surface.

### 3. API operation parity

Introduce a focused code-level guard that checks:

1. frontend API declarations in the configured frontend API trees
2. backend controller mappings in `ruoyi-admin/src/main/java/**/Controller.java`
3. required write operations declared by Stories/Tickets

The target failure mode is:

- frontend declares `PUT /system/basedata`
- backend mapping missing
- guard fails before or during verify/final-gate

## Guard Strategy

### Reuse decision

**Reuse** `test_asset_completeness_guard.py` for operation completeness.

Why reuse is correct:

- It already owns Story/Ticket/module test-case completeness
- it already understands stage semantics (`split/approve/verify`)
- operation completeness is an extension of the same responsibility

### New guard decision

Add a separate `api_operation_parity_guard.py`.

Why a separate guard is justified:

- `test_asset_completeness_guard.py` validates YAML assets
- API parity is a source-code contract check across frontend and backend
- combining them would mix asset completeness with code introspection and create noisy failure reasons

This is not a naming collision:

- `test_asset_completeness_guard.py` => asset truth completeness
- `api_operation_parity_guard.py` => code contract parity

### 3.1 Frontend scan scope

The guard must not hardcode only one frontend API directory. In this repo, write APIs exist in both:

1. shared API path from `.claude/project/config.yaml -> paths.frontend.api`
2. module-local API files such as `osg-frontend/packages/admin/src/api/*.ts`

Likewise, method extraction must support the actual wrapper style used in this repo:

- `http.post(...)`
- `http.put(...)`
- `http.delete(...)`

rather than assuming a different wrapper name.

## Source-Stage Integration Path

1. **Earliest truth source**
   - `.claude/project/config.yaml` defines allowed operations and profiles
2. **Story generation**
   - `story-splitter` ensures `required_test_operations` for Stories that infer as CRUD-like
   - this must happen inside `split_stories()` immediately after `required_test_obligations` normalization
3. **Ticket generation**
   - `ticket-splitter` writes structured `operation` into `test_cases`
4. **Derived asset sync**
   - `bin/sync-test-assets.py` propagates `operation` into module `*-test-cases.yaml`
   - `bin/sync-test-assets.py` also renders `operation` into `*-traceability-matrix.md`
5. **Early guard**
   - `test_asset_completeness_guard.py` checks operation completeness during split/approve/verify
6. **Code parity**
   - `api_operation_parity_guard.py` checks frontend/backend mappings during verify/final-gate

No new artifact appears first in final-gate.

`deliver-ticket` is intentionally not part of `operation` metadata generation. It records execution evidence against already-generated Ticket/test-case assets; it must not infer or rewrite source-stage `operation` truth.

## How This Would Have Caught S-006

With this design in place:

1. `S-006` would declare:
   - `create -> state_change + persist_effect`
   - `edit -> state_change + persist_effect`
   - `status_toggle -> state_change + persist_effect`
   - `disable_reject -> business_rule_reject`
2. `T-041` would need `operation: create` and/or `operation: edit`
3. `base-data.e2e.spec.ts` or another real test would need to bind a case to `edit`
4. `test_asset_completeness_guard.py` would fail if `edit` had no executed case
5. `api_operation_parity_guard.py` would fail because frontend declares `PUT /system/basedata` but backend has no matching mapping

That means the issue would be blocked before manual page validation.

## Rollout Strategy

### Phase 0: framework schema extension

- add operation vocabulary to config
- document Story/Ticket/module test-case schema changes

### Phase 1: source-stage generation

- `story-splitter` emits `required_test_operations`
- `ticket-splitter` emits `operation`

### Phase 2: asset propagation and guarding

- `sync-test-assets.py` propagates `operation`
- `test_asset_completeness_guard.py` enforces operation completeness

### Phase 3: code parity guard

- add `api_operation_parity_guard.py`
- wire it into verify/final-gate

### Phase 4: pilot on permission CRUD stories

- `S-004 roles`
- `S-005 admins/users`
- `S-006 base-data`

## Verification Strategy

The design is only successful if all levels below are demonstrably covered:

1. splitter-level selftests prove `required_test_operations` and `operation` generation
2. sync selftests prove `operation` propagates into module test-cases
3. asset guard selftests prove missing `edit/create/status_toggle` fail at `split/approve/verify`
4. asset guard implementation uses a two-dimensional operation/obligation coverage structure instead of flattening back to one-dimensional obligation coverage
5. API parity selftests prove missing backend mappings fail
6. permission pilot proves `S-006` catches the exact missing `PUT /system/basedata` defect

## Expected Outcome

After implementation, the framework will be able to say:

- not just "this Story has a `state_change` case"
- but "this CRUD Story has covered `create`, `edit`, `status_toggle`, and reject paths as required"

That is the missing capability exposed by the current `base-data` defect.
