---
name: generate-playwright-testcase-pack
description: "Generate a single-source, no-auxiliary-truth Playwright testcase pack for admin, student, mentor, lead-mentor, or assistant. Use when Claude needs final executable testcase assets that map one real business fact per case, keep clear boundaries, prefer gaps over guesses, and write outputs under <end>-test/."
---

# Generate Playwright Testcase Pack

## Overview

Use this skill when the user wants a final Playwright testcase pack for one end and the pack must be generated from exactly one trusted source.

This skill is intentionally strict:

- one truth source only
- no auxiliary truth by default
- one business fact per case
- no assertion without a source anchor
- gap over guess
- admin final testcase standard as the only schema template

Do not silently mix prototype HTML with PRD, plans, old testcase tables, route files, API docs, or page source to "complete" the pack. If the chosen truth file does not express a fact clearly enough, record a gap.

Read the detailed output and anti-fake rules in:

- [`references/output-contract.md`](references/output-contract.md)

Use the admin end's final testcase pack as the canonical output template for schema and quality only:

- `admin-test/2026-03-27-admin-prototype-test-cases.tsv`
- `admin-test/2026-03-28-admin-acceptance-test-cases.tsv`
- `admin-test/2026-03-28-admin-acceptance-trigger-links.tsv`
- `admin-test/2026-03-28-admin-acceptance-priority.tsv`
- `admin-test/2026-03-28-admin-acceptance-execution-guide.md`
- `admin-test/2026-03-28-admin-interaction-boundary-test-cases.tsv`
- `admin-test/2026-03-28-admin-playwright-manifest.tsv`
- `admin-test/2026-03-28-admin-playwright-execution-prompt.md`

These admin files are schema and quality templates only. They are never business truth for other ends.

## Supported Ends

Support these ends:

- `admin`
- `student`
- `mentor`
- `lead-mentor`
- `assistant`

## Default Truth Map

If the user does not explicitly pass `truth=...`, resolve the default truth source by end:

- `admin` -> `${config.paths.docs.prototypes}/admin.html`
- `student` -> `${config.paths.docs.prototypes}/index.html`
- `mentor` -> `${config.paths.docs.prototypes}/mentor.html`
- `lead-mentor` -> `${config.paths.docs.prototypes}/lead-mentor.html`
- `assistant` -> `${config.paths.docs.prototypes}/assistant.html`

If the user provides `truth=/path/to/file`, treat that file as the only truth source and do not merge it with the default truth.

## Inputs

Support these user intents:

- generate testcase pack for one end using default truth
- generate testcase pack for one end using an explicit truth file
- regenerate or update an existing `<end>-test/` pack for the current date
- generate only a scoped subset when the user explicitly narrows the range

Required resolved inputs:

- target end
- single truth source path
- output directory

Optional inputs:

- explicit in-scope range within the chosen truth
- explicit date prefix override

If the target end is omitted, resolve it conservatively from context and say what was chosen.

## Output Directory

Always write the generated pack under the main repo using the fixed end-specific directory names below:

- `admin` -> `admin-test/`
- `student` -> `student-test/`
- `mentor` -> `mentor-test/`
- `lead-mentor` -> `lead-mentor-test/`
- `assistant` -> `assistant-test/`

Use the current date in filenames:

- `<date>-<end>-prototype-test-cases.tsv`
- `<date>-<end>-acceptance-test-cases.tsv`
- `<date>-<end>-acceptance-trigger-links.tsv`
- `<date>-<end>-acceptance-priority.tsv`
- `<date>-<end>-acceptance-execution-guide.md`
- `<date>-<end>-interaction-boundary-test-cases.tsv`
- `<date>-<end>-playwright-manifest.tsv`
- `<date>-<end>-playwright-execution-prompt.md`
- `<date>-<end>-gap-register.md`

If files with the same date and end already exist, update them in place rather than inventing a second naming scheme.

## Route Resolution

Before generating the manifest layer, resolve real route paths from the frontend source code. This is NOT auxiliary truth — it is runtime metadata needed to make the manifest executable.

For each supported end, the router file location is:

- `admin` -> `osg-frontend/packages/admin/src/router/index.ts`
- `student` -> `osg-frontend/packages/student/src/router/index.ts`
- `mentor` -> `osg-frontend/packages/mentor/src/router/index.ts`
- `lead-mentor` -> `osg-frontend/packages/lead-mentor/src/router/index.ts`
- `assistant` -> `osg-frontend/packages/assistant/src/router/index.ts`

Extract from the router file:

- `path` -> use as `RoutePath` in the manifest
- `name` -> use as `RouteName` in the manifest
- `meta.title` -> use for cross-referencing with truth source module names

If a route path cannot be matched to a truth source module, use `menu://...` as fallback and record the mismatch in the gap register.

Additionally, read the `MainLayout.vue` for the target end to identify:

- which routes are actually navigable (vs "coming soon" / placeholder)
- navigation group structure (sidebar sections)
- badge indicators on menu items

Routes that are placeholder / "coming soon" must not generate executable test cases. Record them in the gap register as "not yet navigable".

## Workflow

1. Resolve the target end and single truth source.
2. Read only that truth source first. Do not read other candidate truth files unless the user explicitly replaced the truth source.
3. Read the router file and MainLayout for the target end to extract real route paths, route names, and navigable status.
4. Enumerate from the truth source with exhaustive element-level extraction. Every visible element must become an independent trigger. The extraction must cover:

   Page level:
   - page shell (title, breadcrumb, main area)
   - navigation tabs within the page
   - view mode toggles (e.g., drilldown view vs list view — each mode is a separate trigger, and elements within each mode must be independently enumerated)
   - filter/search controls (each filter is a separate trigger; each filter's option set is a separate trigger if options are enumerated in truth)
   - table columns (each column header is a separate trigger; if a page has multiple view modes with different table structures, enumerate columns for EACH view mode)
   - sortable columns (each sortable column's sort toggle is a separate trigger)
   - table row actions (each action button per row is a separate trigger)
   - table row data variants (e.g., clickable link vs plain text in the same column — each variant is a separate trigger)
   - pagination controls
   - batch action buttons (e.g., batch export, batch delete)
   - status indicators / badges / statistics areas (each distinct indicator is a separate trigger)
   - external link buttons (e.g., "官网" links)
   - expandable/collapsible sections (each level of hierarchy expand/collapse is a separate trigger)

   Visual state level:
   - conditional visual states on data cells (e.g., normal text vs danger-colored vs strikethrough for deadline dates — each visual state rule is a separate trigger)
   - tag/badge color variants that represent different business states (e.g., 面试中=yellow, 已投递=blue, 获得Offer=green — each state tag is a separate trigger)
   - required field markers (fields marked with * must be noted as required in the trigger)

   Modal / Drawer level (for each modal or drawer found):
   - modal open trigger (the button/link that opens it)
   - modal close triggers (X button, cancel button — each is a separate trigger)
   - info banners / warning text inside the modal (each is a separate trigger)
   - read-only notices (e.g., "如需修改请联系后台文员" — each is a separate trigger)
   - every form field inside the modal (each field is a separate trigger)
   - every select/dropdown/radio/checkbox inside the modal (each is a separate trigger)
   - every option set within a select (if the truth source enumerates options, each option set is a trigger)
   - cascading/linked fields (each linkage relationship is a separate trigger — e.g., 大区→城市 cascading select)
   - submit/save/confirm button inside the modal
   - upload controls inside the modal (each is a separate trigger)
   - section dividers / sub-headers within the modal (e.g., "可修改信息" section badge)

   Table-in-modal level:
   - if a modal contains a table, enumerate its column headers and row actions the same way as page-level tables
   - status tags within modal table cells (each distinct status is a separate trigger)

   State / Flow level:
   - each status transition visible in the truth source
   - each action that changes state (approve, reject, assign, etc.)
   - cross-end consequences visible in the truth source

   Abnormal / Orphan level:
   - duplicate element IDs
   - buttons/links with no visible target
   - modals referenced but not defined
   - unreachable entry points

5. After enumeration, run a completeness self-check:
   - For each page section in the truth source, count the elements found
   - For each modal, verify that open + close + every field + submit are all present
   - For each table (including tables inside modals), verify that column headers + row actions are all present
   - For each page with multiple view modes, verify that BOTH modes have independent element coverage
   - For each cascading/linked field, verify that the linkage trigger exists
   - For each visual state variant (color, strikethrough, tag), verify that a trigger exists
   - If any module has fewer than 10 triggers, stop and investigate — a real module with filters, tables, and modals should have 20+ triggers minimum
   - Record the element count per module/submodule in the trigger layer Note column for auditability

6. Generate the trigger layer using the admin canonical table shape exactly.
7. Convert each trigger into a single business fact and generate the acceptance layer using the admin canonical table shape exactly.
8. Generate the explicit trigger-links layer using the admin canonical table shape exactly.
9. Generate the acceptance priority layer using the admin canonical table shape exactly.
10. Generate the acceptance execution guide aligned to the admin canonical execution guide structure.
11. Expand interactive triggers into the boundary layer using the admin canonical table shape exactly. Apply the mandatory negative boundary expansion rules (see below).
12. Translate the boundary layer into the final Playwright manifest using the admin canonical table shape exactly. Apply route resolution results to fill `RoutePath` and `RouteName` with real values.
13. Generate the execution prompt.
14. Generate the gap register for every unresolved or unanchored fact.
15. Run the validation checklist. If any check fails, fix and re-validate before reporting completion.

## Test Scope Clarification

This skill tests two things and explicitly excludes one:

Tested — Element existence:
- Every element visible in the truth source prototype must exist on the actual page
- If an element is missing, it is a Fail, not N/A
- "Product didn't implement it" is not an excuse — if it's in the prototype, it must be on the page

Tested — Interaction completeness:
- Every clickable element must produce a result when clicked (open modal, navigate, submit, filter, etc.)
- Every form field must be fillable and participate in the submit chain
- Every filter must affect the displayed data
- Every expand/collapse must toggle its content
- "Button exists but does nothing" is a Fail
- "Modal opens but fields are missing" is a Fail
- "Filter is visible but doesn't filter" is a Fail

NOT tested — Visual/UI styling:
- Colors, fonts, spacing, alignment, responsive layout
- Pixel-perfect match to prototype
- CSS class names or styling implementation details
- Animation or transition effects

This means the boundary layer and manifest must generate assertions for:
- element visibility (does it exist on the page?)
- interaction response (does clicking it produce the expected result?)

But must NOT generate assertions for:
- visual appearance (is it the right color/size/position?)

## Execution Gate Policy

Generated execution assets must use one gate policy only:

- execute `P0` first
- if any `P0` item is not `Pass`, stop immediately
- do not execute `P1`
- in the final summary, report `P1` as `Not Run` / `未执行`, not as pass/fail/block counts

Only when `P0` is `100% Pass` may the generated prompt or guide allow `P1` execution and `P1` metrics.

## Hard Guardrails

### No Auxiliary Truth

Do not use these as silent supplements to derive business facts, expected outcomes, or permission rules:

- PRD
- docs/plans
- old testcase files
- API specs
- frontend page source

The only exception is when the user explicitly tells you that one of those files is the truth source. Even then, it replaces the default truth source instead of joining it.

Admin testcase assets are the only allowed auxiliary input, and only for schema and quality comparison. They must never be used to import business facts, route facts, permission facts, or expected outcomes into another end.

Router files and MainLayout are allowed as runtime metadata sources (see Route Resolution section) for extracting route paths, route names, and navigable status. They must NOT be used to derive business facts, expected outcomes, or test assertions.

### One Business Fact Per Case

Each case must express one fact only.

Examples:

- a page shell is visible
- a modal opens
- a modal closes
- one field accepts or rejects a class of input
- one action changes one state
- one error path blocks one invalid action

Do not merge chained behavior into one case.

### Mandatory Negative Boundary Expansion

The boundary layer must not contain only `positive` cases. For every interactive trigger, generate both positive and negative boundary cases according to the trigger's category:

Note: The boundary layer has two classification columns that serve different purposes:
- `分类` column: uses the admin canonical Chinese category names (页面入口, 点击功能, 弹窗开关, 字段交互, 选项集联动, 状态联动, 筛选切换, 视图切换, 遗留异常). These describe WHAT the interaction is.
- `BoundaryType` column: uses English boundary type names (positive, empty, invalid_format, invalid_boundary, invalid_linkage, duplicate, orphan_entry, unbound_action, state_conflict, unsupported_flow). These describe WHICH boundary condition is being tested.

Every positive boundary case must use the same `分类` value as the admin canonical pattern for that trigger type. Negative boundary cases inherit the same `分类` but use a different `BoundaryType`.

| Trigger 分类 | Required Positive BoundaryType | Required Negative BoundaryTypes |
|---|---|---|
| 字段 (text input) | positive | empty, invalid_format, invalid_boundary (max length) |
| 字段 (select/dropdown) | positive | empty (no selection), invalid_linkage (orphan option) |
| 字段 (date picker) | positive | empty, invalid_format (future/past constraint) |
| 字段 (upload) | positive | empty, invalid_format (wrong file type), invalid_boundary (oversize) |
| 按钮 (submit/save) | positive | empty (required fields missing), state_conflict (double submit) |
| 按钮 (delete/remove) | positive | state_conflict (already deleted), unbound_action (no selection) |
| 弹窗 (modal open) | positive | (positive only — open is binary) |
| 弹窗 (modal close) | positive | unsupported_flow (close with unsaved changes) |
| 筛选 (filter) | positive | empty (no results), invalid_format (special characters) |
| 状态流转 | positive | state_conflict (invalid transition), duplicate (repeat action) |
| 表格操作 | positive | unbound_action (no row selected), state_conflict (row locked) |

When the truth source does not specify the exact validation rule for a negative case, still generate the boundary case but:
- set `ExpectedBoundary` to a conservative generic assertion (e.g., "必须阻止提交并给出明确提示，不得假成功")
- record the specific validation rule as a gap in the gap register

The boundary layer row count should be 2x-4x the trigger layer row count. If the ratio is below 2x, the generation is incomplete.

### Concrete InputProfile Rules

The manifest `InputProfile` column must use typed fixture descriptors that a Playwright code generator can resolve. The following are the allowed typed patterns (matching the admin canonical manifest):

Allowed typed patterns (these are NOT abstract placeholders):
- `no_input` — for open_page, no interaction needed
- `default_click_fixture` — for click_action, open_modal, close_modal — a single click with no data input
- `valid_default + invalid_empty + invalid_boundary` — for fill_field — must include concrete examples when truth source provides them (e.g., valid="张三", empty="", boundary="A×256")
- `default_option + alternate_option + invalid_linkage_check` — for select_option
- `single_filter + combined_filter + reset` — for apply_filter
- `valid_submit_fixture` — for submit_action — all required fields filled with valid values
- `state_transition_fixture` — for assert_transition
- `legacy_entry_or_invalid_path_fixture` — for assert_exception

Prohibited abstract placeholders (these are too vague to execute):
- `valid_form_payload`
- `valid_resubmit_payload`
- `valid_this_week_schedule`
- `valid_next_week_schedule`
- any custom placeholder that does not match the allowed typed patterns above

When the truth source specifies field labels, option values, or placeholder text, embed those real values in the InputProfile alongside the typed pattern. When not specified, use the typed pattern alone and record the missing concrete values in the gap register.

### LocatorHint Quality Rules

The `LocatorHint` column must use structured locator patterns that a Playwright code generator can resolve, not raw CSS selectors from prototype HTML (which do not exist in the live DOM).

Allowed LocatorHint patterns:

- `page heading or stable title text for {页面名称}` — for open_page
- `button/link/menu item by visible text from: {按钮文字}` — for click_action
- `modal title or trigger related to: {弹窗标题}` — for open_modal / close_modal
- `form field by label/placeholder matching: {字段标签}` — for fill_field
- `select/checkbox/radio options for: {字段标签}` — for select_option
- `filter controls on {页面名称} matching: {筛选描述}` — for apply_filter
- `table row action by visible text from: {操作名称}` — for table actions
- `action control and resulting state badge/section for: {状态描述}` — for assert_transition
- `visible legacy/abnormal entry, modal, or control described by: {异常描述}` — for assert_exception
- `download/export trigger by visible text from: {按钮文字}` — for download_action

Do NOT use:
- prototype HTML element IDs (e.g., `#page-myclass`, `#modal-report`)
- CSS class selectors from prototype (e.g., `.mentor-table`)
- XPath expressions
- data-testid values that have not been verified in the live codebase

### No Assertion Without Anchor

If a behavior, result, permission rule, or cross-end consequence cannot be anchored to the truth source, do not generate an executable assertion for it. Move it to the gap register.

### Gap Over Guess

When the truth source is silent, do not infer from habit or "likely implementation".

Use gaps for:

- unspecified business results
- unspecified permissions
- unspecified replay / retry behavior
- unspecified upload format limits
- unspecified route identity
- unspecified cross-end writeback

## Manifest Rules

The final manifest is the primary delivery artifact, but it must stay honest to the truth source.

Allowed conservative values:

- `RoutePath` (in priority order)
  1. real path from the router file — always preferred for navigable routes
  2. `menu://...` — only when no router entry exists, must be recorded in gap register
  3. `surface://...` — only for sub-page surfaces like modals within a page
- `PermissionKey`
  - real permission key only if explicit in truth
  - otherwise `UNSPECIFIED_IN_TRUTH`
- `NegativeRoleProfile`
  - blank when the truth source does not express a permission contrast

Do not fabricate:

- precise permission codes
- precise API endpoints
- state machine semantics

## Validation Rules

Before finishing:

Element completeness checks:
- every page/section in the truth source must have at least one trigger
- every modal in the truth source must have triggers for: open, close (X + cancel), every field, submit
- every table in the truth source (including tables inside modals) must have triggers for: column headers, row actions
- every filter/search control in the truth source must have a trigger
- every view mode toggle must have a trigger, and elements within each view mode must be independently covered
- every cascading/linked field must have a linkage trigger
- every visual state variant (color, strikethrough, tag) must have a trigger
- if a module has fewer than 10 triggers, it must be justified in the gap register — a real module with filters, tables, and modals should have 20+ triggers minimum
- pages with multiple view modes must have independent element coverage for EACH mode

Cross-layer integrity checks:
- required fields must have zero empty values
- primary ids must have zero duplicates
- trigger to acceptance links must be complete
- boundary to acceptance refs must be complete
- manifest to boundary refs must be complete
- every manifest row must represent one business fact
- every unresolved fact must appear in the gap register
- every generated file header must match the admin canonical schema for the corresponding artifact
- the generated pack must include the acceptance execution guide, not only the prompt
- generation fails if it invents a custom schema for any end
- boundary layer row count must be >= 2x trigger layer row count (negative boundary expansion check)
- boundary layer must contain at least 3 distinct BoundaryType values (not all `positive`)
- manifest `RoutePath` must use real route paths from the router file, not `menu://...`, for all navigable routes
- manifest `RouteName` must match the router file's route name for all navigable routes
- manifest `LocatorHint` must not contain prototype HTML element IDs or CSS class selectors
- manifest `InputProfile` must only use allowed typed patterns (no_input, default_click_fixture, valid_default + invalid_empty + invalid_boundary, etc.) — no custom abstract placeholders like `valid_form_payload`
- every placeholder route must be excluded from executable cases and recorded in the gap register

## Stop Conditions

Stop and report instead of pretending completion when:

- the target end cannot be resolved
- the truth source file does not exist
- the truth source is not specific enough to derive the requested scope
- the generated manifest would need fabricated assertions to look "complete"

When blocked, report:

- chosen end
- chosen truth source
- exact unresolved gaps
- what can still be generated safely
