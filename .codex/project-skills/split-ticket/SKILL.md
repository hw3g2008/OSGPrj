---
name: split-ticket
description: "Execute the repository's /split ticket flow. Use when the user asks to run /split ticket S-xxx by following the existing command, workflow, and ticket-splitter skill."
---

# Split Ticket

## Overview

Use this skill to execute the repository's real `/split ticket` flow.

Keep the interface simple:

```text
/split ticket S-xxx
```

Do not invent a parallel ticket-splitting path. Reuse the repository's existing command, workflow, and splitter skill.

## Workflow

1. Read `osg-spec-docs/tasks/STATE.yaml`.
2. Resolve the target story id from user input or current state.
3. Read `.claude/commands/split.md`.
4. Read `.windsurf/workflows/split-ticket.md`.
5. Read `.claude/skills/ticket-splitter/SKILL.md`.
6. Read `osg-spec-docs/tasks/stories/S-xxx.yaml`.
7. Execute the repository's standard ticket-splitting flow.
8. Report generated Ticket assets, guards, and next workflow impact.

## Required Repository Files

- `osg-spec-docs/tasks/STATE.yaml`
- `.claude/commands/split.md`
- `.windsurf/workflows/split-ticket.md`
- `.claude/skills/ticket-splitter/SKILL.md`
- `osg-spec-docs/tasks/stories/S-xxx.yaml`

## Guardrails

- Do not bypass the ticket-splitter engine.
- Do not skip traceability, proof, or test-asset generation expected by the repository.
- Do not mutate workflow state outside the repository transition rules.

## Stop Conditions

Stop and report instead of continuing when:

- the target story cannot be resolved
- the story file is missing
- the repository's ticket-splitting guards fail
