---
name: checkpoint
description: "Create a repository checkpoint by following the existing /checkpoint command. Use when the user asks to run /checkpoint or manually save a state checkpoint."
---

# Checkpoint

## Overview

Use this skill to execute the repository's real `/checkpoint` flow.

Keep the interface simple:

```text
/checkpoint
/checkpoint 完成登录模块
```

Do not invent a separate save mechanism. Reuse the repository's checkpoint flow.

## Workflow

1. Read `.claude/commands/checkpoint.md`.
2. Read `.windsurf/workflows/checkpoint.md` when needed.
3. Read `osg-spec-docs/tasks/STATE.yaml`.
4. Read `.claude/skills/checkpoint-manager/SKILL.md`.
5. Execute the repository's standard checkpoint creation flow.
6. Report the checkpoint id, saved state, and restore command.

## Required Repository Files

- `.claude/commands/checkpoint.md`
- `.windsurf/workflows/checkpoint.md`
- `osg-spec-docs/tasks/STATE.yaml`
- `.claude/skills/checkpoint-manager/SKILL.md`

## Guardrails

- Do not invent a custom checkpoint file location.
- Do not mutate checkpoint metadata outside the manager flow.
- Do not claim a checkpoint was created without command evidence.

## Stop Conditions

Stop and report instead of continuing when:

- the checkpoint manager prerequisites are missing
- the repository state cannot be read safely
- checkpoint creation fails
