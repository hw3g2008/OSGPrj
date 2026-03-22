---
name: restore
description: "Restore repository state from a checkpoint by following the existing /restore command. Use when the user asks to run /restore latest or /restore CP-xxx."
---

# Restore

## Overview

Use this skill to execute the repository's real `/restore` flow.

Keep the interface simple:

```text
/restore latest
/restore CP-xxx
```

Do not invent a parallel restore mechanism. Reuse the repository's checkpoint restore flow.

## Workflow

1. Read `.claude/commands/restore.md`.
2. Read `.windsurf/workflows/restore.md` when needed.
3. Read `.claude/skills/checkpoint-manager/SKILL.md`.
4. Resolve the requested checkpoint id or latest alias.
5. Execute the repository's standard restore flow.
6. Report restored state and the next recommended command.

## Required Repository Files

- `.claude/commands/restore.md`
- `.windsurf/workflows/restore.md`
- `.claude/skills/checkpoint-manager/SKILL.md`
- `osg-spec-docs/tasks/STATE.yaml`

## Guardrails

- Do not restore from an inferred checkpoint that the user did not request.
- Do not bypass the checkpoint manager's restore contract.
- Do not claim restore succeeded without command evidence.

## Stop Conditions

Stop and report instead of continuing when:

- the target checkpoint cannot be resolved
- required checkpoint data is missing
- restore execution fails
