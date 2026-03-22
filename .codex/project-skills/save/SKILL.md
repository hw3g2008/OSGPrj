---
name: save
description: "Save repository state by following the existing /save command. Use when the user asks to run /save with or without a note. This is the checkpoint alias entrypoint."
---

# Save

## Overview

Use this skill to execute the repository's real `/save` flow.

Keep the interface simple:

```text
/save
/save 完成用户模块
```

Do not invent a separate save mechanism. Reuse the repository's existing save and checkpoint semantics.

## Workflow

1. Read `.claude/commands/save.md`.
2. Read `.windsurf/workflows/save.md` when needed.
3. Read `osg-spec-docs/tasks/STATE.yaml`.
4. Read `.claude/skills/checkpoint-manager/SKILL.md`.
5. Execute the repository's standard save flow.
6. Report the created checkpoint and restore guidance.

## Required Repository Files

- `.claude/commands/save.md`
- `.windsurf/workflows/save.md`
- `osg-spec-docs/tasks/STATE.yaml`
- `.claude/skills/checkpoint-manager/SKILL.md`

## Guardrails

- Treat `/save` as the repository-defined alias, not a new command.
- Do not bypass the checkpoint manager.
- Do not claim save succeeded without command evidence.

## Stop Conditions

Stop and report instead of continuing when:

- required checkpoint inputs cannot be read
- the save flow fails
