---
name: acceptance-ticket-splitter
description: "Generate acceptance-first ticket assets for the current five-end course application and class-record flow. Use when Codex needs to split Workstream C1/C2/C3/D/E/F into acceptance-grade ticket YAML drafts, detailed ticket.test_cases, and module testing entries without touching STATE.yaml or workflow state."
---

# Acceptance Ticket Splitter

## Overview

Use this skill for the current `五端课程申请 / 课程记录流转` pilot when the user wants to split a workstream into ticket assets that are precise enough to drive test-first implementation and near-direct acceptance.

This skill does not replace the repository's existing `split-ticket` workflow. It is a project-local pilot splitter for the current five-end flow only.

Core output:

- acceptance-grade ticket YAML drafts
- detailed `ticket.test_cases`
- module-level `osg-spec-docs/tasks/testing/*` entries
- an anti-fake-assertion self-check

Do not use this skill for unrelated modules or as a generic repository-wide ticket splitter.

## Required Inputs

Always read these first:

- [`docs/plans/five-end-course-flow/2026-03-27-five-end-course-application-flow-alignment-implementation-plan.md`](/Users/hw/workspace/OSGPrj/docs/plans/five-end-course-flow/2026-03-27-five-end-course-application-flow-alignment-implementation-plan.md)
- [`docs/plans/five-end-course-flow/2026-03-27-ticket落地新标准计划.md`](/Users/hw/workspace/OSGPrj/docs/plans/five-end-course-flow/2026-03-27-ticket%E8%90%BD%E5%9C%B0%E6%96%B0%E6%A0%87%E5%87%86%E8%AE%A1%E5%88%92.md)
- [`docs/plans/five-end-course-flow/README.md`](/Users/hw/workspace/OSGPrj/docs/plans/five-end-course-flow/README.md)

Then read the specific truth inputs needed by the requested workstream:

- HTML prototype truth
- current page / controller / service / mapper files
- existing `osg-spec-docs/tasks/tickets/*.yaml`
- existing `osg-spec-docs/tasks/testing/*`

Supported workstreams:

- `C1`
- `C2`
- `C3`
- `D`
- `E`
- `F`

If the user does not specify the workstream, resolve it conservatively from context and say which one you picked.

## Workflow

1. Read the implementation plan and identify the exact target workstream.
2. Read the matching source-truth and current-code files for that workstream.
3. Break the workstream into behavior units.
4. For each behavior unit, produce:
   - `test-design ticket`
   - `implementation ticket`
   - `acceptance / regression ticket` when needed
5. Generate acceptance-grade `ticket.test_cases` for each ticket.
6. Generate or update the matching `osg-spec-docs/tasks/testing/*` entries.
7. Produce an anti-fake-assertion self-check for the generated asset set.

## Ticket Rules

### One Ticket = One Acceptance Behavior

Each generated ticket must represent one acceptance-ready behavior unit, not a large feature bucket and not a line-level patch.

Good examples:

- student can start a real-job coaching request from positions
- applications page shows summary only and does not absorb class-record detail
- mock page keeps `practiceRecords` as visible main object
- assistant carrier route remains ownership-scoped

### AC Coverage Limit

Each ticket may cover at most `1-2` tightly related ACs.

Do not mix these stages into one ticket:

- student request creation
- lead-mentor / admin assignment
- mentor class-record submission
- admin review
- student review / rating

### Ticket Sequence

For each behavior unit, generate tickets in this order:

1. `test-design`
2. `backend` / `frontend` / `frontend-ui`
3. `acceptance` or `regression`

### Ticket Content Contract

Every generated ticket must clearly state:

- behavior unit
- flow stage
- impacted page / API / service / read chain
- upstream input
- downstream consumer
- explicit non-goals

## Test Case Rules

Generated `ticket.test_cases` must be detailed enough for direct acceptance execution.

Each case must include:

- objective
- preconditions
- test data
- action steps
- expected results
- forbidden results
- evidence level
- branch coverage note
- boundary coverage note
- pass/fail rule

Required coverage set per behavior unit:

- `happy path`
- `auth_or_data_boundary`
- `business_rule_reject`
- `state_transition`
- `persist_effect`
- `visibility_boundary`

Use these design methods:

- equivalence partitioning
- boundary value analysis
- decision table testing
- state transition testing
- auth / data-boundary testing
- cross-end flow checkpoint validation

For field-level output expectations, follow:

- [`references/output-contract.md`](references/output-contract.md)

## Anti-Fake Assertion Guardrails

These are hard gates, not suggestions.

1. Every primary assertion must bind to a truth source.
2. Weak assertions like `toBeTruthy`, `toBeDefined`, `not.toBeNull`, or `length > 0` cannot serve as the main acceptance assertion.
3. Every case must include both expected results and forbidden results.
4. RED evidence is mandatory: generated tests must be able to fail before implementation.
5. Do not mock away permissions, state transitions, review visibility, or ownership filtering.
6. Cross-end cases must bind concrete entities: student, request, route, record, and status.
7. Page assertions must respect page responsibility boundaries.
8. Do not invent texts, statuses, or fields that are not present in truth sources or approved plans.

Always append a self-check that answers:

- are primary assertions truth-bound?
- are any weak assertions acting as acceptance conclusions?
- does every case include forbidden results?
- is RED required?
- are boundary and branch cases present?
- are cross-end cases bound to concrete entities?

## Output Scope

This skill may produce:

- ticket YAML drafts
- `ticket.test_cases`
- module-level testing entries
- self-check notes

V1 must not produce:

- `verification_evidence`
- final verify commands
- `STATE.yaml` changes

## Repository Boundaries

Do not modify workflow state or framework rules.

Do not touch:

- `osg-spec-docs/tasks/STATE.yaml`
- workflow-engine state-machine or command mappings
- existing `split-ticket` / `deliver-ticket` / `verify` skill semantics

If a request would require changing framework behavior, stop and say so.

## Pilot Scope Only

This skill is only for the current five-end course-flow pilot.

Do not reuse it for unrelated modules unless the user explicitly asks to extend the pilot.
