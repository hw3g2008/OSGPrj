---
name: status
description: "Show repository progress by following the existing /status command. Use when the user asks to run /status or /status S-xxx."
---

# Status

## Overview

Use this skill to execute the repository's real `/status` flow.

Keep the interface simple:

```text
/status
/status S-xxx
```

Do not invent a separate progress-report path. Reuse the repository's existing command and status tracker flow.

## Workflow

1. Read `.claude/commands/status.md`.
2. Read `.windsurf/workflows/status.md` when needed.
3. Read `osg-spec-docs/tasks/STATE.yaml`.
4. Read `.claude/skills/progress-tracker/SKILL.md` when needed.
5. Resolve the requested scope from user input.
6. Execute the repository's standard status flow.
7. Report current position, progress, blockers, and next likely command.

## Required Repository Files

- `.claude/commands/status.md`
- `.windsurf/workflows/status.md`
- `osg-spec-docs/tasks/STATE.yaml`
- `.claude/skills/progress-tracker/SKILL.md`

## Guardrails

- Do not infer progress from memory when repository state can be read.
- Do not rewrite status data as part of a read-only status request.

## Stop Conditions

Stop and report instead of continuing when:

- the requested scope cannot be resolved
- required state files are missing
- the repository's status flow cannot read current progress safely
