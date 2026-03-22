---
name: unblock
description: "Unblock repository tickets by following the existing /unblock command. Use when the user asks to run /unblock T-xxx, /unblock --list, or /unblock T-xxx --cascade."
---

# Unblock

## Overview

Use this skill to execute the repository's real `/unblock` flow.

Keep the interface simple:

```text
/unblock T-xxx
/unblock --list
/unblock T-xxx --cascade
```

Do not invent a separate unblock mechanism. Reuse the repository's existing command semantics.

## Workflow

1. Read `.claude/commands/unblock.md`.
2. Read `osg-spec-docs/tasks/STATE.yaml`.
3. Resolve the requested list or ticket target from user input.
4. Read the target ticket YAML and dependency data as needed.
5. Execute the repository's standard unblock flow.
6. Report status changes, cascade effects, and next recommended command.

## Required Repository Files

- `.claude/commands/unblock.md`
- `osg-spec-docs/tasks/STATE.yaml`
- `osg-spec-docs/tasks/tickets/T-xxx.yaml`

## Guardrails

- Do not unblock a ticket that is not actually blocked.
- Do not ignore cascade semantics when the command requests them.
- Do not mutate unrelated ticket state.

## Stop Conditions

Stop and report instead of continuing when:

- the target ticket cannot be resolved
- the requested unblock mode is invalid
- the repository state cannot safely apply the unblock change
