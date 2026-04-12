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

Allowed `分类` values (matching admin canonical): 页面, 字段, 按钮, 表格, 表格操作, 弹窗, 选项, 校验, 状态流转, 异常, 筛选, tab, 流程, 视图切换, 外部链接, 统计区域. Do not invent new category names.

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

Note on `ExpectedAdminResult` column name: This column name is a fixed schema name inherited from the admin canonical template. For non-admin ends, this column still contains the expected result for the TARGET end (not the admin end). The column name does not change — only the content changes to reflect the target end's expected behavior.

Allowed `验收维度` values (matching admin canonical): 页面结果, 弹窗结果, 业务处理, 数据结果, 权限角色, 异常边界. Do not invent new dimension names.

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

## Test Scope

This skill tests element existence and interaction completeness. It does NOT test visual/UI styling.

- Element existence: every element in the prototype must exist on the actual page. Missing = Fail.
- Interaction completeness: every clickable element must produce a result. "Button exists but does nothing" = Fail.
- Visual styling: colors, fonts, spacing, alignment, responsive layout are NOT tested.

Assertions must cover visibility and interaction response. Assertions must NOT cover visual appearance.

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

- For `RoutePath`: use real route path from the router file (see Rule 7). Only fall back to `menu://...` when no router entry exists.
- For `PermissionKey`: use `UNSPECIFIED_IN_TRUTH`
- For `RouteName`: use the router file's named route. If not available, leave empty and record in gap register.
- do not fabricate exact permission keys or APIs

### Rule 5: Gap Register Is Mandatory

If no gap exists, write an explicit "no unresolved truth gaps" note.

If gaps exist, each gap must include:

- scope
- missing fact
- impact on Playwright executability
- why it cannot be derived from the chosen truth source

### Rule 6: Negative Boundary Coverage Mandatory

Every interactive trigger (字段, 按钮, 筛选, 状态流转, 表格操作) must produce at least one negative boundary case in addition to the positive case. The boundary layer must contain at least 3 distinct BoundaryType values. A boundary layer with only `positive` cases is incomplete and must not pass validation.

### Rule 7: Real Route Paths Required

The manifest `RoutePath` must use real route paths extracted from the frontend router file (e.g., `/career/positions`), not semantic paths like `menu://求职中心/岗位信息`. The `RouteName` must match the router file's named route. Semantic paths (`menu://...`) are only allowed as fallback when the router file does not define a route for the module, and this must be recorded in the gap register.

### Rule 8: No Prototype HTML Selectors

The manifest `LocatorHint` must not contain element IDs or CSS selectors from the prototype HTML file (e.g., `#page-myclass`, `.mentor-table`). These selectors do not exist in the live application DOM. Use structured locator patterns based on visible text, labels, and semantic roles instead.

## Recommended Manifest Semantics

### RoutePath

Allowed values (in priority order):

1. real route path from the frontend router file, e.g. `/career/positions`, `/teaching/students` — always preferred
2. menu semantic path, e.g. `menu://求职中心/岗位信息` — only when no router entry exists, must be recorded in gap register
3. surface semantic path, e.g. `surface://课程记录/审核弹窗` — only for sub-page surfaces like modals within a page

### PermissionKey

Allowed values:

- explicit permission key from truth
- `UNSPECIFIED_IN_TRUTH`

### ExpectedPrimary / ExpectedSecondary

These must be business-result statements, not vague UI descriptions.

Bad:

- "页面正常"
- "数据应该正确"

Good:

- "当前弹窗被正确关闭，背景页状态不被污染，未提交数据不落地"
- "空值时必须阻止提交并给出明确提示，不得假成功"

## Validation Checklist

Generation is incomplete unless all checks pass:

Element completeness:
- every page/section in the truth source has at least one trigger
- every modal has triggers for: open, close (X + cancel), every field, submit
- every table (including tables inside modals) has triggers for: column headers, row actions
- every filter/search control has a trigger
- every view mode toggle has a trigger, and elements within each view mode are independently covered
- every cascading/linked field has a linkage trigger
- every visual state variant (color, strikethrough, tag) has a trigger
- no module has fewer than 10 triggers without explicit justification in the gap register
- pages with multiple view modes have independent element coverage for EACH mode

Cross-layer integrity:
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

Boundary quality:
- boundary layer row count >= 2x trigger layer row count
- boundary layer contains at least 3 distinct BoundaryType values (not all `positive`)

Manifest quality:
- manifest `RoutePath` uses real route paths for all navigable routes (no `menu://...` when router entry exists)
- manifest `RouteName` matches the router file's named route
- manifest `LocatorHint` contains zero prototype HTML element IDs or CSS class selectors
- manifest `InputProfile` must only use allowed typed patterns (no_input, default_click_fixture, valid_default + invalid_empty + invalid_boundary, etc.) — no custom abstract placeholders like `valid_form_payload`
- placeholder / "coming soon" routes are excluded from executable cases and recorded in gap register
