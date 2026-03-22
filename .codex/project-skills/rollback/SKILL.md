---
name: rollback
description: "Rollback repository state by following the existing /rollback command. Use when the user asks to run /rollback for a ticket, story, checkpoint, or the last checkpoint."
---

# Rollback

## Overview

Use this skill to execute the repository's real `/rollback` flow.

Keep the interface simple:

```text
/rollback T-xxx
/rollback S-xxx
/rollback CP-xxx
/rollback --last
```

Do not invent a parallel rollback path. Reuse the repository's checkpoint and rollback flow.

## Workflow

1. Read `.claude/commands/rollback.md`.
2. Read `.windsurf/workflows/rollback.md` when needed.
3. Read `.claude/skills/checkpoint-manager/SKILL.md`.
4. Resolve the rollback target from user input.
5. Execute the repository's standard rollback flow.
6. Report restored files, state changes, and next recommended action.

## Required Repository Files

- `.claude/commands/rollback.md`
- `.windsurf/workflows/rollback.md`
- `.claude/skills/checkpoint-manager/SKILL.md`
- `osg-spec-docs/tasks/STATE.yaml`

## Guardrails

- Treat rollback as destructive.
- Do not perform hidden hard resets outside the documented rollback flow.
- Do not claim rollback succeeded without command evidence.

## Stop Conditions

Stop and report instead of continuing when:

- the rollback target cannot be resolved
- the required checkpoint or rollback metadata is missing
- the rollback flow fails
