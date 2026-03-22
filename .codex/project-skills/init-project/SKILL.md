---
name: init-project
description: "Initialize this framework in a repository by following the existing /init-project command. Use when the user asks to run /init-project with a project name or stack."
---

# Init Project

## Overview

Use this skill to execute the repository's real `/init-project` flow.

Keep the interface simple:

```text
/init-project my-project
/init-project my-project --stack java-vue
```

Do not invent a parallel bootstrap path. Reuse the repository's existing command semantics.

## Workflow

1. Read `.claude/commands/init-project.md`.
2. Resolve the requested project name and stack from user input.
3. Read any repository bootstrap files needed for execution.
4. Execute the repository's standard initialization flow.
5. Report created files, directories, and next recommended setup steps.

## Required Repository Files

- `.claude/commands/init-project.md`

## Guardrails

- Do not scaffold a custom structure that diverges from the framework command.
- Do not overwrite existing project files silently.

## Stop Conditions

Stop and report instead of continuing when:

- required init arguments are missing
- the target repository is already initialized and the overwrite path is unsafe
- initialization fails
