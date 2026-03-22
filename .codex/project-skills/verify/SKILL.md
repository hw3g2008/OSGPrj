---
name: verify
description: "Execute the repository's RPIV verify flow. Use when the user asks to run /verify, verify a Story, verify a Ticket, or resume verification work by following the repository's existing verification command and skill."
---

# Verify

## Overview

Use this skill to execute the repository's real RPIV `/verify` flow.

Keep the interface simple:

```text
/verify S-xxx
/verify T-xxx
verify S-xxx
verify T-xxx
```

Do not invent a parallel verification path. Reuse the repository's existing command and verification engine.

## Inputs

Support these forms:

- `/verify S-xxx`
- `/verify T-xxx`
- `verify S-xxx`
- `verify T-xxx`

If the target id is omitted, resolve it conservatively from `osg-spec-docs/tasks/STATE.yaml` and tell the user what was chosen.

## Workflow

1. Read `osg-spec-docs/tasks/STATE.yaml`.
2. Resolve the target Story or Ticket.
3. Read `.claude/commands/verify.md`.
4. Read `.claude/skills/verification/SKILL.md`.
5. Read any target YAML needed for execution:
   - `osg-spec-docs/tasks/stories/S-xxx.yaml`
   - `osg-spec-docs/tasks/tickets/T-xxx.yaml`
6. Execute verification using the repository's standard guards, tests, and workflow rules.
7. Report evidence first:
   - commands run
   - pass/fail results
   - blocking guards
   - workflow/state impact

## Required Repository Files

Read these as needed:

- `osg-spec-docs/tasks/STATE.yaml`
- `.claude/commands/verify.md`
- `.claude/skills/verification/SKILL.md`
- `.claude/skills/workflow-engine/SKILL.md`
- `osg-spec-docs/tasks/stories/S-xxx.yaml`
- `osg-spec-docs/tasks/tickets/T-xxx.yaml`

## Guardrails

- Do not bypass `verification` skill logic with an ad hoc test checklist.
- Do not claim verified without command evidence.
- Do not skip guard failures such as `test_asset_completeness_guard.py`.
- Do not rewrite workflow state in a way that conflicts with the repository's event rules.
- When verify is blocked, report the blocker and the concrete missing asset or failing guard.

## Recommended Use

When the user types:

```text
/verify S-040
```

run the Story-level verification flow and report whether it passed or what blocked it.

When the user types:

```text
/verify T-184
```

run the Ticket-level verification path for that specific Ticket.

## Stop Conditions

Stop and report instead of continuing when:

- the target Story or Ticket does not exist
- required guards fail
- required test assets are missing
- workflow state is inconsistent and cannot be resolved safely from repository truth
