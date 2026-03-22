---
name: add-requirement
description: "Register a new requirement in this repository by following the existing /add-requirement command. Use when the user asks to run /add-requirement with a requirement id or requirement file path."
---

# Add Requirement

## Overview

Use this skill to execute the repository's real `/add-requirement` flow.

Keep the interface simple:

```text
/add-requirement REQ-001
/add-requirement docs/requirements/REQ-001.md
```

Do not invent a parallel registration path. Reuse the repository's existing command semantics.

## Workflow

1. Read `.claude/commands/add-requirement.md`.
2. Read `osg-spec-docs/tasks/STATE.yaml`.
3. Resolve the requirement id or requirement file path from user input.
4. Validate the target requirement file or id using the repository's standard rules.
5. Update repository state only in the way the command expects.
6. Report the registered requirement and the next recommended command.

## Required Repository Files

- `.claude/commands/add-requirement.md`
- `osg-spec-docs/tasks/STATE.yaml`

## Guardrails

- Do not guess a requirement id when the input is ambiguous.
- Do not invent a separate requirements registry.
- Do not mutate `STATE.yaml` in a way that conflicts with the command contract.

## Stop Conditions

Stop and report instead of continuing when:

- the requirement id or path cannot be resolved
- the target requirement file does not exist
- the current repository state cannot safely accept a new requirement
