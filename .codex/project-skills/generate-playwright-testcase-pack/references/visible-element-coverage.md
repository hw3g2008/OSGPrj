# Visible Element Coverage Gate

This reference defines the mandatory coverage gate that runs before testcase generation.

The generator must:

- discover every visible semantic element
- classify it correctly
- force every interactive element to map to an observable outcome
- prevent broad shell cases from hiding missing coverage

## Required Working Artifact

Before generating trigger, acceptance, boundary, or manifest files, build a working `visible-element-ledger`.

This ledger may be transient unless the user explicitly asks to export it, but it is mandatory.

Each ledger row must include:

- `PageId`
- `SurfaceId`
- `ElementId`
- `VisibleLabel`
- `ElementType`
- `Interactive`
- `TriggerType`
- `ExpectedOutcome`
- `OutcomeClass`
- `TruthAnchor`
- `MappedCaseId`

## What Counts As An Element

An element is the smallest user-visible semantic unit that a tester can notice or interact with.

Examples:

- page title
- section header
- toolbar
- tab
- button
- icon button
- search input
- filter dropdown
- date control
- table header
- sortable header
- row action
- status badge
- calendar title
- previous-month button
- next-month button
- expand or collapse button
- calendar event pill
- modal trigger
- modal primary action
- modal cancel action
- upload entry

Do not use raw DOM-node counting. Use visible tester-facing semantics.

## Mandatory Classification

Every element must be classified into exactly one `ElementType`:

- `shell`
- `display_only`
- `navigation`
- `toggle`
- `filter`
- `search`
- `sort`
- `modal_trigger`
- `modal_action`
- `input`
- `submit`
- `row_action`
- `calendar_nav`
- `calendar_event`
- `external_link`
- `pagination`

## Mandatory Outcome Rule

If `Interactive=Y`, then all fields below are mandatory:

- `TriggerType`
- `ExpectedOutcome`
- `OutcomeClass`
- `MappedCaseId`

Allowed `OutcomeClass` values:

- `page_switch`
- `container_toggle`
- `sort_change`
- `filter_change`
- `modal_open`
- `modal_close`
- `field_visibility_change`
- `validation_block`
- `submit_success`
- `state_writeback`
- `style_writeback`
- `link_navigation`
- `list_refresh`
- `upload_bind`
- `calendar_month_change`
- `calendar_event_modal`

If an interactive element is visible in truth but the outcome cannot be anchored, record an explicit gap for the missing outcome. Do not hide it inside a shell case.

## Coverage Mapping Rules

Every visible element must map to exactly one of:

- `shell_contract`
- `structure_contract`
- `interaction_contract`
- `business_flow`
- `gap`

Use these rules:

- page titles, section shells, static banners -> `shell_contract`
- visible table headers, visible badges, visible layout regions -> `structure_contract`
- tabs, toggles, filters, search, sortable headers, calendar navigation, modal openers -> `interaction_contract`
- submits, confirmations, successful writeback, validation blocks -> `business_flow`
- unresolved visible facts with no anchored outcome -> `gap`

## Forbidden Coverage Collapse

The generator must reject any attempt to collapse coverage in these ways:

- page shell covering toolbar controls
- page shell covering calendar strip controls
- page shell covering filters or search boxes
- table existence covering table headers
- table-header existence covering sortable-header behavior
- action-column existence covering row-action behavior
- modal existence covering submit or validation behavior
- list-view existence covering publish-time sorting behavior

## Per-Widget Minimum Coverage

### Page Shell

Each page may have one shell case for:

- page title
- page subtitle
- top-level container visibility

It must not claim coverage for child controls.

### Toolbar

Every visible toolbar must have:

- one structure case for toolbar presence
- one interaction case per interactive child control

### Table

Every visible table must have:

- one structure case for the table region
- one structure case for every visible header
- one interaction case for every sortable header
- one interaction or business-flow case for every row action

### Tabs

Every visible tab group must have:

- one structure case for tab strip presence
- one interaction case per tab-switch behavior set

### Filters And Search

Every visible filter or search control must have:

- one interaction case proving result-set change
- one reset case if a reset control is visible

### Calendar

Every visible calendar surface must have separate coverage for:

- `calendar_shell`
- `expand_collapse` if present
- `prev_month` if present
- `next_month` if present
- each distinct event-entry type
- each event modal

## Page Boundary Rule

Assign every element to a page or surface before generating any testcase.

Shared styling does not mean shared coverage.

If two pages both have a filter bar, each page gets its own ledger rows and its own coverage.

## Fail Conditions

Generation must fail if any of the following is true:

- a visible semantic element is missing from the ledger
- an interactive visible element has no outcome mapping
- a visible table header has no coverage
- a visible toolbar control has no coverage
- a visible calendar control has no coverage
- a visible modal trigger has no open case
- a visible submit action has no success or validation case
- a child control is claimed as covered only by a page-shell case
