---
name: skip
description: "Skip a repository ticket by following the existing /skip command. Use when the user asks to run /skip T-xxx with or without a reason."
---

# Skip

## Overview

Use this skill to execute the repository's real `/skip` flow.

Keep the interface simple:

```text
/skip T-xxx
/skip T-xxx 依赖外部接口未就绪
```

Do not invent a separate blocking path. Reuse the repository's existing command semantics.

## Workflow

1. Read `.claude/commands/skip.md`.
2. Read `osg-spec-docs/tasks/STATE.yaml`.
3. Resolve the target ticket and optional reason from user input.
4. Read the target ticket YAML and dependency data as needed.
5. Execute the repository's standard skip flow.
6. Report the blocked ticket, cascade impact, and the next available command.

## Required Repository Files

- `.claude/commands/skip.md`
- `osg-spec-docs/tasks/STATE.yaml`
- `osg-spec-docs/tasks/tickets/T-xxx.yaml`

## Guardrails

- Do not skip an unresolved ticket id.
- Do not ignore documented dependency propagation.
- Do not claim the ticket was blocked without recording the repository-defined status change.

## Stop Conditions

Stop and report instead of continuing when:

- the target ticket cannot be resolved
- the ticket file is missing
- the skip flow cannot safely apply the required state change
