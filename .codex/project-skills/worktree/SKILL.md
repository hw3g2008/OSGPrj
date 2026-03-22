---
name: worktree
description: "Manage Git worktrees by following the existing /worktree command. Use when the user asks to run /worktree create, /worktree list, or /worktree switch."
---

# Worktree

## Overview

Use this skill to execute the repository's real `/worktree` flow.

Keep the interface simple:

```text
/worktree create feature-user
/worktree list
/worktree switch feature-order
```

Do not invent a separate worktree-management path. Reuse the repository's existing command and git-worktrees skill.

## Workflow

1. Read `.claude/commands/worktree.md`.
2. Read `.claude/skills/using-git-worktrees/SKILL.md`.
3. Resolve the requested subcommand and arguments from user input.
4. Execute the repository's standard worktree flow.
5. Report created/listed/switched worktrees and any required next shell action.

## Required Repository Files

- `.claude/commands/worktree.md`
- `.claude/skills/using-git-worktrees/SKILL.md`

## Guardrails

- Do not use destructive git operations outside the documented worktree flow.
- Do not guess a target worktree name when the request is ambiguous.
- Do not claim worktree creation or switching succeeded without command evidence.

## Stop Conditions

Stop and report instead of continuing when:

- the requested subcommand is invalid
- required git state or worktree prerequisites are missing
- the worktree flow fails
