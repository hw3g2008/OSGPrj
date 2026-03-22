---
name: compress
description: "Compress the current repository context by following the existing /compress command. Use when the user asks to run /compress or manually reduce context while preserving work state."
---

# Compress

## Overview

Use this skill to execute the repository's real `/compress` flow.

Keep the interface simple:

```text
/compress
```

Do not invent a separate summarization path. Reuse the repository's context-compression flow.

## Workflow

1. Read `.claude/commands/compress.md`.
2. Read `osg-spec-docs/tasks/STATE.yaml`.
3. Read `.claude/skills/context-compression/SKILL.md`.
4. Execute the repository's standard compression flow.
5. Report retained context, dropped detail level, and any follow-up restore guidance.

## Required Repository Files

- `.claude/commands/compress.md`
- `osg-spec-docs/tasks/STATE.yaml`
- `.claude/skills/context-compression/SKILL.md`

## Guardrails

- Do not discard current workflow state.
- Do not replace command-driven compression with a freeform summary.

## Stop Conditions

Stop and report instead of continuing when:

- required compression inputs cannot be read
- the compression flow fails
