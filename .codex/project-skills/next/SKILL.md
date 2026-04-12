---
name: next
description: "Execute the next RPIV ticket for this repository. Use when the user asks to run /next, continue the current lead story, resume the current ticket, or automatically pick the next pending ticket from osg-spec-docs/tasks/STATE.yaml and implement it by following the repository's next workflow and deliver-ticket rules."
---

# Next

## Overview

Use this skill to execute the repository's RPIV `/next` flow.

Keep the interface simple:

```text
/next
/next T-177
```

Default behavior:

- read `osg-spec-docs/tasks/STATE.yaml`
- if a ticket id is provided, use it
- else if `current_ticket` is set, continue that ticket
- otherwise ask the repository scheduler to pick a runnable ticket from the current story
- read the target ticket contract before implementation
- stop if the ticket is missing executable contract fields required by `/next`
- follow the workflow in `.windsurf/workflows/next.md`
- execute the ticket by following `.claude/skills/deliver-ticket/SKILL.md`

Do not invent a second workflow authority. Reuse the repository's real RPIV flow, where workflow state stays in `workflow.*` and execution runtime stays in `execution.*`.

## Inputs

Support only these forms:

- `/next`
- `/next T-xxx`

If a ticket id is provided, use that ticket.
If no ticket id is provided, resolve it from `STATE.yaml` plus scheduler rules.

## Workflow

1. Read `osg-spec-docs/tasks/STATE.yaml`.
2. Resolve the target ticket:
   - continue `current_ticket` when present
   - otherwise use the repository scheduler to select a runnable ticket from the current story
   - runnable means pending, dependencies satisfied, and not blocked by active lease/path conflicts
   - if no runnable ticket exists but remaining tickets still exist, stop and report that the flow is waiting on dependencies or lease release
   - if none remain, stop and tell the user the story is ready for `/verify` or `/approve`
3. Read the ticket YAML from `osg-spec-docs/tasks/tickets/T-xxx.yaml`.
4. Read these repository instructions before implementation:
   - `.windsurf/workflows/next.md`
   - `.claude/skills/deliver-ticket/SKILL.md`
5. Confirm the ticket is an executable contract before implementation:
   - `covers_ac_refs` exists and is non-empty
   - `contract_refs` exists
   - `test_cases` exists and is non-empty
   - every `test_case` has `ac_ref`, `category`, `scenario_obligation`, and `operation`
   - every `covers_ac_refs` item is covered by at least one `test_case`
   - if any check fails, stop and report that the ticket must be reconciled before `/next`
6. Implement the ticket using the repository's standard flow for its `type`.
   - for `frontend` / `frontend-ui`, honor `config.frontend_preflight`
   - `mode=auto` means run the repository's frontend preflight before the existing frontend flow
   - `mode=manual` means stop and report that frontend preflight must run first
7. Run the required verification before claiming success.
8. Update workflow state only through the repository's normal RPIV transition path. Execution runtime may be updated in `STATE.execution.*`, but do not invent ad hoc state semantics.

## Required Repository Files

Read these as needed:

- `osg-spec-docs/tasks/STATE.yaml`
- `osg-spec-docs/tasks/tickets/T-xxx.yaml`
- `.windsurf/workflows/next.md`
- `.claude/skills/deliver-ticket/SKILL.md`

For framework context, also read when necessary:

- `.claude/project/config.yaml`
- `.claude/templates/ticket.yaml`

## Guardrails

- Do not ask the user to choose the next ticket unless the repository state is genuinely ambiguous.
- Do not skip verification.
- Do not mark work complete without command evidence.
- Do not rewrite `STATE.yaml` in an ad hoc way that conflicts with the repo workflow.
- Do not continue when the ticket is missing executable-contract fields required by `/next`.
- Respect `allowed_paths`.
- For `frontend-ui` tickets, consume `prototype_refs`, `visual_checklist`, `style_contracts`, and `state_cases`.
- Treat `execution.*` as runtime projection, not as a replacement for `workflow.*`.

## Recommended Use

When the user types:

```text
/next
```

resolve the ticket from `STATE.yaml` and the repository scheduler, then continue implementation.

When the user types:

```text
/next T-177
```

execute that exact ticket if it exists.

## Stop Conditions

Stop and report instead of continuing when:

- there is no pending ticket in the current story
- the target ticket file does not exist
- the target ticket is missing executable-contract fields (`covers_ac_refs`, `contract_refs`, `test_cases`, or required test_case fields)
- a required guard or verification fails
- the work is blocked by missing real backend dependencies and would require fake data
- there are remaining tickets but none are currently runnable because of dependencies, lease ownership, or path conflicts
