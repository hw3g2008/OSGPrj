# Output Contract

This skill must generate a complete testcase pack, not a loose note set.

The admin end's final testcase pack is the canonical schema template. Other ends must reuse the same artifact types and the same TSV headers. End-specific content may differ, but schema must not drift.

## Required Outputs

For target end `<end>` and date `<date>`, generate under the fixed directory for that end:

- `admin` -> `<repo>/admin-test/`
- `student` -> `<repo>/student-test/`
- `mentor` -> `<repo>/mentor-test/`
- `lead-mentor` -> `<repo>/lead-mentor-test/`
- `assistant` -> `<repo>/assistant-test/`

Then write:

1. `<date>-<end>-prototype-test-cases.tsv`
2. `<date>-<end>-acceptance-test-cases.tsv`
3. `<date>-<end>-acceptance-trigger-links.tsv`
4. `<date>-<end>-acceptance-priority.tsv`
5. `<date>-<end>-acceptance-execution-guide.md`
6. `<date>-<end>-interaction-boundary-test-cases.tsv`
7. `<date>-<end>-playwright-manifest.tsv`
8. `<date>-<end>-playwright-execution-prompt.md`
9. `<date>-<end>-gap-register.md`

## Table Shapes

Keep the current repository convention.
Keep the admin convention exactly.

### Trigger Layer

Columns:

- `Item`
- `Version`
- `端`
- `模块`
- `子模块`
- `分类`
- `CheckPoint`
- `Result`
- `Note`
- `Date`

Do not replace these with end-specific names like `prototype_case_id` or `source_anchor`.

### Acceptance Layer

Columns:

- `Item`
- `Version`
- `端`
- `模块`
- `子模块`
- `TriggerItem`
- `验收维度`
- `CheckPoint`
- `ExpectedAdminResult`
- `ExpectedCrossEndResult`
- `ExpectedEvidence`
- `Result`
- `Note`
- `Date`

Do not replace these with end-specific names like `acceptance_id`, `business_fact`, or `truth_anchor`.

### Trigger Link Layer

Columns:

- `AcceptanceItem`
- `AcceptanceModule`
- `AcceptanceSubmodule`
- `AcceptanceDimension`
- `TriggerItem`
- `TriggerModule`
- `TriggerSubmodule`
- `TriggerCategory`
- `TriggerCheckPoint`

Do not turn this into a steps table. Execution steps belong elsewhere.

### Priority Layer

Columns:

- `AcceptanceItem`
- `模块`
- `子模块`
- `验收维度`
- `Priority`
- `GateRule`

Do not collapse this into a simplified three-column priority table.

### Acceptance Execution Guide

Required markdown file aligned to the admin canonical execution guide.

It must include:

- scope
- asset inventory
- execution order
- result statuses
- evidence requirements
- priority policy
- release gates
- special rules
- usage guidance

It must also enforce one execution gate policy:

- run `P0` first
- if `P0` is not `100% Pass`, stop before `P1`
- when stopped at `P0`, final reporting must mark `P1` as `Not Run` / `未执行`
- no `P1 Pass/Fail/Block` totals may be claimed if `P1` was never executed

### Boundary Layer

Columns:

- `Item`
- `Version`
- `端`
- `模块`
- `子模块`
- `TriggerItem`
- `AcceptanceRefs`
- `分类`
- `BoundaryType`
- `CheckPoint`
- `Action`
- `ExpectedSuccess`
- `ExpectedBoundary`
- `ExpectedEvidence`
- `Priority`
- `Result`
- `Note`
- `Date`

### Playwright Manifest

Columns:

- `ManifestItem`
- `BoundaryItem`
- `AcceptanceRefs`
- `TriggerItem`
- `模块`
- `子模块`
- `RoutePath`
- `RouteName`
- `PermissionKey`
- `RoleProfile`
- `NegativeRoleProfile`
- `Precondition`
- `ActionType`
- `LocatorHint`
- `InputProfile`
- `ExpectedPrimary`
- `ExpectedSecondary`
- `EvidenceMode`
- `CanRunInSmoke`
- `CanRunInRegression`
- `DependsOn`
- `StateIsolation`
- `Priority`
- `Result`
- `Date`

Do not replace this schema with a compact spec-specific manifest. Fields like route, role, evidence mode, smoke flag, regression flag, dependency, and state isolation are required.

### Playwright Execution Prompt

The generated prompt must not contain conflicting gate instructions.

It must say:

- execute `P0` first
- do not enter `P1` when `P0` is not fully passed
- if `P0` fails, final output must contain:
  - `P0` totals
  - `P1 not run` conclusion
  - blockers / defects

It must not require:

- `P1` totals
- `P1 Pass/Fail/Block` metrics
- `P1` result percentages

when `P1` never started.

## Anti-Fake-Assertion Contract

Every generated case must satisfy all rules below.

### Rule 1: One Fact Per Case

Each case maps to exactly one business fact.

Bad:

- open modal + fill fields + save + refresh list

Good:

- modal opens
- name field accepts valid text
- save action commits one change
- list reflects committed change

### Rule 2: Truth Anchor Required

If the fact cannot be pointed back to the chosen truth source, the case is not executable and must go into the gap register.

### Rule 3: Boundary Type Mandatory

Every interactive or validation case must carry an explicit boundary type such as:

- positive
- empty
- invalid_format
- invalid_linkage
- duplicate
- orphan_entry
- unbound_action
- state_conflict
- unsupported_flow

### Rule 4: Honest Runtime Fields

When a runtime field is not present in truth:

- use conservative placeholders like `menu://...` or `UNSPECIFIED_IN_TRUTH`
- do not fabricate exact route names, permission keys, or APIs

### Rule 5: Gap Register Is Mandatory

If no gap exists, write an explicit “no unresolved truth gaps” note.

If gaps exist, each gap must include:

- scope
- missing fact
- impact on Playwright executability
- why it cannot be derived from the chosen truth source

## Recommended Manifest Semantics

### RoutePath

Allowed values:

- real route path, e.g. `/users/students`
- menu semantic path, e.g. `menu://用户中心/学员列表`
- surface semantic path, e.g. `surface://课程记录/审核弹窗`

### PermissionKey

Allowed values:

- explicit permission key from truth
- `UNSPECIFIED_IN_TRUTH`

### ExpectedPrimary / ExpectedSecondary

These must be business-result statements, not vague UI descriptions.

Bad:

- “页面正常”
- “数据应该正确”

Good:

- “当前弹窗被正确关闭，背景页状态不被污染，未提交数据不落地”
- “空值时必须阻止提交并给出明确提示，不得假成功”

## Validation Checklist

Generation is incomplete unless all checks pass:

- no duplicate ids
- no empty required cells
- no broken refs across tables
- no manifest row without a business fact
- no manifest row without a boundary class when boundary applies
- no unresolved truth gap left undocumented
- headers exactly match the admin canonical artifact headers
- the pack includes `acceptance-execution-guide.md`
- no custom end-specific schema drift is introduced
- execution guide and execution prompt use the same `P0 gate before P1` rule
