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
- if `current_ticket` is set, continue that ticket
- otherwise pick the first `pending` ticket from the current story
- follow the workflow in `.windsurf/workflows/next.md`
- execute the ticket by following `.claude/skills/deliver-ticket/SKILL.md`

Do not invent a parallel implementation path. Reuse the repository's real RPIV flow.

## Inputs

Support only these forms:

- `/next`
- `/next T-xxx`

If a ticket id is provided, use that ticket.
If no ticket id is provided, resolve it from `STATE.yaml`.

## Workflow

1. Read `osg-spec-docs/tasks/STATE.yaml`.
2. Resolve the target ticket:
   - continue `current_ticket` when present
   - otherwise use the first pending ticket from the current story's `tickets`
   - if none remain, stop and tell the user the story is ready for `/verify` or `/approve`
3. Read the ticket YAML from `osg-spec-docs/tasks/tickets/T-xxx.yaml`.
4. Read these repository instructions before implementation:
   - `.windsurf/workflows/next.md`
   - `.claude/skills/deliver-ticket/SKILL.md`
5. Implement the ticket using the repository's standard flow for its `type`.
6. Run the required verification before claiming success.
7. Update state only through the repository's normal workflow expectations. Do not bypass RPIV semantics.

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
- Respect `allowed_paths`.
- For `frontend-ui` tickets, consume `prototype_refs`, `visual_checklist`, `style_contracts`, and `state_cases`.

## Recommended Use

When the user types:

```text
/next
```

resolve the ticket from `STATE.yaml` and continue implementation.

When the user types:

```text
/next T-177
```

execute that exact ticket if it exists.

## Stop Conditions

Stop and report instead of continuing when:

- there is no pending ticket in the current story
- the target ticket file does not exist
- a required guard or verification fails
- the work is blocked by missing real backend dependencies and would require fake data
