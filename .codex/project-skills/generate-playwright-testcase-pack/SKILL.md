---
name: generate-playwright-testcase-pack
description: "Generate a single-source, no-auxiliary-truth Playwright testcase pack for admin, student, mentor, lead-mentor, or assistant. Use when Codex needs final executable testcase assets that map one real business fact per case, keep clear boundaries, prefer gaps over guesses, and write outputs under <end>-test/."
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
- visible-element coverage before testcase generation
- admin final testcase standard as the only schema template

Do not silently mix prototype HTML with PRD, plans, old testcase tables, route files, API docs, or page source to “complete” the pack. If the chosen truth file does not express a fact clearly enough, record a gap.

Read the detailed output and anti-fake rules in:

- [`references/output-contract.md`](references/output-contract.md)
- [`references/visible-element-coverage.md`](references/visible-element-coverage.md)

Use the admin end's final testcase pack as the canonical output template for schema and quality only:

- [`/Users/hw/workspace/OSGPrj/admin-test/2026-03-27-admin-prototype-test-cases.tsv`](/Users/hw/workspace/OSGPrj/admin-test/2026-03-27-admin-prototype-test-cases.tsv)
- [`/Users/hw/workspace/OSGPrj/admin-test/2026-03-28-admin-acceptance-test-cases.tsv`](/Users/hw/workspace/OSGPrj/admin-test/2026-03-28-admin-acceptance-test-cases.tsv)
- [`/Users/hw/workspace/OSGPrj/admin-test/2026-03-28-admin-acceptance-trigger-links.tsv`](/Users/hw/workspace/OSGPrj/admin-test/2026-03-28-admin-acceptance-trigger-links.tsv)
- [`/Users/hw/workspace/OSGPrj/admin-test/2026-03-28-admin-acceptance-priority.tsv`](/Users/hw/workspace/OSGPrj/admin-test/2026-03-28-admin-acceptance-priority.tsv)
- [`/Users/hw/workspace/OSGPrj/admin-test/2026-03-28-admin-acceptance-execution-guide.md`](/Users/hw/workspace/OSGPrj/admin-test/2026-03-28-admin-acceptance-execution-guide.md)
- [`/Users/hw/workspace/OSGPrj/admin-test/2026-03-28-admin-interaction-boundary-test-cases.tsv`](/Users/hw/workspace/OSGPrj/admin-test/2026-03-28-admin-interaction-boundary-test-cases.tsv)
- [`/Users/hw/workspace/OSGPrj/admin-test/2026-03-28-admin-playwright-manifest.tsv`](/Users/hw/workspace/OSGPrj/admin-test/2026-03-28-admin-playwright-manifest.tsv)
- [`/Users/hw/workspace/OSGPrj/admin-test/2026-03-28-admin-playwright-execution-prompt.md`](/Users/hw/workspace/OSGPrj/admin-test/2026-03-28-admin-playwright-execution-prompt.md)

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

- `admin` -> [`osg-spec-docs/source/prototype/admin.html`](/Users/hw/workspace/OSGPrj/osg-spec-docs/source/prototype/admin.html)
- `student` -> [`osg-spec-docs/source/prototype/index.html`](/Users/hw/workspace/OSGPrj/osg-spec-docs/source/prototype/index.html)
- `mentor` -> [`osg-spec-docs/source/prototype/mentor.html`](/Users/hw/workspace/OSGPrj/osg-spec-docs/source/prototype/mentor.html)
- `lead-mentor` -> [`osg-spec-docs/source/prototype/lead-mentor.html`](/Users/hw/workspace/OSGPrj/osg-spec-docs/source/prototype/lead-mentor.html)
- `assistant` -> [`osg-spec-docs/source/prototype/assistant.html`](/Users/hw/workspace/OSGPrj/osg-spec-docs/source/prototype/assistant.html)

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

- `admin` -> `/Users/hw/workspace/OSGPrj/admin-test/`
- `student` -> `/Users/hw/workspace/OSGPrj/student-test/`
- `mentor` -> `/Users/hw/workspace/OSGPrj/mentor-test/`
- `lead-mentor` -> `/Users/hw/workspace/OSGPrj/lead-mentor-test/`
- `assistant` -> `/Users/hw/workspace/OSGPrj/assistant-test/`

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

## Workflow

1. Resolve the target end and single truth source.
2. Read only that truth source first. Do not read other candidate truth files unless the user explicitly replaced the truth source.
3. Enumerate:
   - visible pages or sections
   - clickable entries
   - modals and drawers
   - fields and options
   - uploads, filters, tabs, steps, status areas
   - visible abnormal or orphan entry points
4. Build a working visible-element ledger before generating any testcase artifact. Follow [`references/visible-element-coverage.md`](references/visible-element-coverage.md) exactly.
5. Map every visible interactive element to an observable outcome class before generating triggers. Do not let page-shell cases absorb child controls.
6. Generate the trigger layer using the admin canonical table shape exactly.
7. Convert each trigger into a single business fact and generate the acceptance layer using the admin canonical table shape exactly.
8. Generate the explicit trigger-links layer using the admin canonical table shape exactly.
9. Generate the acceptance priority layer using the admin canonical table shape exactly.
10. Generate the acceptance execution guide aligned to the admin canonical execution guide structure.
11. Expand interactive triggers into the boundary layer using the admin canonical table shape exactly.
12. Translate the boundary layer into the final Playwright manifest using the admin canonical table shape exactly.
13. Generate the execution prompt.
14. Generate the gap register for every unresolved or unanchored fact.
15. Validate structure, references, duplication, schema equality, and visible-element coverage against the admin standard before reporting completion.

## Execution Gate Policy

Generated execution assets must use one gate policy only:

- execute `P0` first
- if any `P0` item is not `Pass`, stop immediately
- do not execute `P1`
- in the final summary, report `P1` as `Not Run` / `未执行`, not as pass/fail/block counts

Only when `P0` is `100% Pass` may the generated prompt or guide allow `P1` execution and `P1` metrics.

## Hard Guardrails

### No Auxiliary Truth

Do not use these as silent supplements:

- PRD
- docs/plans
- old testcase files
- API specs
- router files
- frontend page source

The only exception is when the user explicitly tells you that one of those files is the truth source. Even then, it replaces the default truth source instead of joining it.

Admin testcase assets are the only allowed auxiliary input, and only for schema and quality comparison. They must never be used to import business facts, route facts, permission facts, or expected outcomes into another end.

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

### Visible-Element Coverage Gate

Before generating testcase files, you must build a working visible-element ledger for the chosen truth scope.

The ledger is mandatory even when it is not delivered as an output artifact.

Every visible semantic element must be assigned to exactly one of:

- `shell_contract`
- `structure_contract`
- `interaction_contract`
- `business_flow`
- `gap`

Rules:

- visible interactive elements default to executable coverage, not gap
- page-shell cases may cover only page shell facts, not child controls
- if an interactive element has no observable outcome anchored in truth, record an explicit gap for the missing outcome
- if an interactive element is visible and outcome is anchored, generation fails unless a case is created

Read the exact ledger fields and per-widget coverage rules in [`references/visible-element-coverage.md`](references/visible-element-coverage.md).

### Page Boundary First

Assign every visible element to a single page or surface before case generation.

Do not mix assets across pages that share similar widgets.

If similar widgets appear on multiple pages, repeat the coverage per page. Shared styling is not shared coverage.

### No Coverage Collapse

The following collapses are forbidden:

- page shell covering toolbar controls
- page shell covering calendar strip controls
- table existence covering table headers
- table-header existence covering sortable-header behavior
- action-column existence covering row-action behavior
- modal existence covering submit or validation behavior
- page existence covering calendar navigation or event-entry behavior

### No Assertion Without Anchor

If a behavior, result, permission rule, or cross-end consequence cannot be anchored to the truth source, do not generate an executable assertion for it. Move it to the gap register.

### Gap Over Guess

When the truth source is silent, do not infer from habit or “likely implementation”.

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

- `RoutePath`
  - real path when explicit
  - `menu://...` when only menu navigation is explicit
  - `surface://...` when only visible surface navigation is explicit
- `PermissionKey`
  - real permission key only if explicit in truth
  - otherwise `UNSPECIFIED_IN_TRUTH`
- `NegativeRoleProfile`
  - blank when the truth source does not express a permission contrast

Do not fabricate:

- precise permission codes
- precise API endpoints
- route names
- state machine semantics

## Validation Rules

Before finishing:

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
- every visible semantic element in scope must appear in the working visible-element ledger
- every visible interactive element must have a mapped outcome and testcase coverage unless it is explicitly recorded as an outcome gap
- every visible table header must have structure coverage, and every interactive header must also have interaction coverage
- every visible toolbar control, tab, filter, search box, calendar control, row action, and modal trigger must have explicit coverage
- generation fails if a page-shell case is used to claim coverage for child controls

## Stop Conditions

Stop and report instead of pretending completion when:

- the target end cannot be resolved
- the truth source file does not exist
- the truth source is not specific enough to derive the requested scope
- the generated manifest would need fabricated assertions to look “complete”

When blocked, report:

- chosen end
- chosen truth source
- exact unresolved gaps
- what can still be generated safely
