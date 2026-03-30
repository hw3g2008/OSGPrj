---
name: acceptance-ticket-splitter
description: "Generate acceptance-first ticket assets for the current five-end course application and class-record flow. Use when Codex needs to split Workstream C1/C2/C3/D/E/F into acceptance-grade ticket YAML drafts, detailed ticket.test_cases, and module testing entries while keeping pilot progress in docs/plans/five-end-course-flow/STATE.yaml and not touching the global workflow STATE.yaml."
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
- execution-ready test metadata that can be translated directly into Playwright / HTTP / service tests

Do not use this skill for unrelated modules or as a generic repository-wide ticket splitter.

This skill stops at ticket and test-asset generation. When a generated implementation ticket moves into coding, execution must hand off to:

- [`/Users/huangxin/.codex/skills/test-driven-development/SKILL.md`](/Users/huangxin/.codex/skills/test-driven-development/SKILL.md)

and follow `RED -> GREEN -> REFACTOR`. No production code is allowed before a failing test exists.

## Required Inputs

Always read these first:

- [`docs/plans/five-end-course-flow/STATE.yaml`](/Users/hw/workspace/OSGPrj/docs/plans/five-end-course-flow/STATE.yaml)
- [`docs/plans/five-end-course-flow/2026-03-27-five-end-course-application-flow-alignment-implementation-plan.md`](/Users/hw/workspace/OSGPrj/docs/plans/five-end-course-flow/2026-03-27-five-end-course-application-flow-alignment-implementation-plan.md)
- [`docs/plans/five-end-course-flow/2026-03-27-ticket落地新标准计划.md`](/Users/hw/workspace/OSGPrj/docs/plans/five-end-course-flow/2026-03-27-ticket%E8%90%BD%E5%9C%B0%E6%96%B0%E6%A0%87%E5%87%86%E8%AE%A1%E5%88%92.md)
- [`docs/plans/five-end-course-flow/README.md`](/Users/hw/workspace/OSGPrj/docs/plans/five-end-course-flow/README.md)

Then read the specific truth inputs needed by the requested workstream:

- HTML prototype truth
- current page / controller / service / mapper files
- existing executable test entrypoints and fixture / seed files for that workstream
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

## State Tracking

This pilot uses a local progress state file instead of the repository-wide RPIV state machine.

- The local progress truth source is:
  - [`docs/plans/five-end-course-flow/STATE.yaml`](/Users/hw/workspace/OSGPrj/docs/plans/five-end-course-flow/STATE.yaml)
- The repository-wide workflow state file:
  - [`osg-spec-docs/tasks/STATE.yaml`](/Users/hw/workspace/OSGPrj/osg-spec-docs/tasks/STATE.yaml)
  must remain untouched by this skill.

Before generating or updating any pilot asset set:

1. Read the local pilot `STATE.yaml`.
2. If it does not exist, initialize it under `docs/plans/five-end-course-flow/`.
3. If the requested workstream conflicts with the local pilot state, say so before generating assets.
4. After generating or advancing a pilot asset set, update the local pilot state with:
   - current workstream
   - current pilot
   - current ticket or active review focus
   - completed / in-progress ticket refs
   - latest evidence summary
   - next step
   - blockers
   - last context handoff note

## Workflow

1. Read the local pilot `STATE.yaml`, then read the implementation plan and identify the exact target workstream.
2. Read the matching source-truth and current-code files for that workstream.
3. Break the workstream into behavior units.
4. For each behavior unit, produce:
   - `test-design ticket`
   - `implementation ticket`
   - `acceptance / regression ticket` when needed
5. Enforce the AC coverage limit before finalizing each ticket draft.
6. Generate acceptance-grade `ticket.test_cases` for each ticket.
7. Generate or update the matching pilot testing entries.
8. Produce an anti-fake-assertion self-check for the generated asset set.
9. Update the local pilot `STATE.yaml` so a new context can resume from the same point.
10. When the user asks to execute a generated implementation ticket, explicitly switch to the `test-driven-development` skill and use the generated `execution_form` as the RED-phase test plan.

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

If a draft ticket needs more than `2` ACs to explain itself, it is too large and must be split again before output.

Do not mix these stages into one ticket:

- student request creation
- lead-mentor / admin assignment
- mentor class-record submission
- admin review
- student review / rating

For `Workstream C1`, do not bundle these action families into one implementation ticket:

- `apply`
- `progress`
- `coaching`

If two or more of these actions need distinct persistence, visibility, or rejection rules, split them into separate behavior tickets.

### Ticket Sequence

For each behavior unit, generate tickets in this order:

1. `test-design`
2. `backend` / `frontend` / `frontend-ui`
3. `acceptance` or `regression`

When ticket generation ends and implementation begins, the generated `implementation ticket` must be executed with the `test-driven-development` skill rather than ad-hoc coding.

### Ticket Content Contract

Every generated ticket must clearly state:

- behavior unit
- flow stage
- impacted page / API / service / read chain
- upstream input
- downstream consumer
- explicit non-goals
- fixture / seed sources used by the behavior unit when they already exist in the repo

## Test Case Rules

Generated `ticket.test_cases` must be detailed enough for direct acceptance execution.

Each case must include:

- objective
- preconditions
- test data
- action steps
- execution form
- expected results
- forbidden results
- evidence level
- branch coverage note
- boundary coverage note
- pass/fail rule

### Execution-Ready Case Contract

Human-readable `steps` may remain, but they are no longer sufficient by themselves.

Every generated case must include an `execution_form` block that is directly translatable into runnable tests:

- `execution_form.playwright`
  - route
  - selector / `getByRole` / `getByText` plan
  - required waits
  - assertion targets
- `execution_form.http`
  - method
  - endpoint
  - payload
  - expected response shape
- `execution_form.service`
  - target method
  - input object or fixture setup
  - persistence / state assertions

Choose only the execution form(s) that match the evidence level of the case.

### Fixture Binding Contract

Generated `test_data` must bind to real repo fixtures or seeds when they already exist.

Do not stop at business nicknames like `student_demo` or `Goldman Sachs` alone.

When fixture or seed support already exists, include:

- `fixture_ref`
- `seed_ref`
- `identity_ref`
- `entity_ref`

Examples of acceptable sources:

- e2e support seed files
- Java fixture classes
- contract tests that lock the seed or identity path
- existing Playwright real-integration specs

If the repo truly has no reusable fixture for the case, say so explicitly in the case and mark the missing fixture as a follow-up gap.

### Evidence Writeback Contract

`latest_result.evidence_ref` must point to real execution evidence when a case is no longer draft.

Allowed evidence targets:

- the actual spec file
- the actual unit / integration test file
- a Playwright screenshot / report / trace artifact
- a captured command log or evidence note file

When `latest_result.status` is `pass`, pointing only to the ticket YAML is not sufficient.

Use:

- `draft` when the case has not been executed
- `red` when a failing proof exists and is the current state
- `pass` when the case has a passing proof tied to executable evidence

`red` and `pass` transitions must come from a real TDD cycle:

- `red`: failing test observed first
- `pass`: minimal implementation turns the same test green
- `refactor`: optional cleanup keeps the same tests green

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
7. Generated implementation tickets must not be executed without invoking the `test-driven-development` skill first.
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
- local pilot `STATE.yaml` updates
- execution-form metadata
- fixture-binding metadata
- evidence writeback metadata

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
