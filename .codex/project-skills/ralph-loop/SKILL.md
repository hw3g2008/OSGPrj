---
name: ralph-loop
description: "Execute the repository's /ralph-loop automation flow. Use when the user asks to run /ralph-loop with a completion promise or bounded autonomous loop by following the existing command and loop skill."
---

# Ralph Loop

## Overview

Use this skill to execute the repository's real `/ralph-loop` flow.

Keep the interface simple:

```text
/ralph-loop 完成 S-001
/ralph-loop 完成 S-001 --max-iterations 50
```

Do not invent a separate autonomous loop. Reuse the repository's existing command and loop skill.

## Workflow

1. Read `.claude/commands/ralph-loop.md`.
2. Read `.claude/skills/ralph-loop/SKILL.md`.
3. Read `osg-spec-docs/tasks/STATE.yaml`.
4. Resolve the completion promise and any loop options from user input.
5. Execute the repository's standard loop flow and safety limits.
6. Report completed work, stop reason, and next recommended command.

## Required Repository Files

- `.claude/commands/ralph-loop.md`
- `.claude/skills/ralph-loop/SKILL.md`
- `osg-spec-docs/tasks/STATE.yaml`

## Guardrails

- Do not run an unbounded loop.
- Do not ignore the repository's iteration and failure limits.
- Do not claim loop success without concrete completed work and evidence.

## Stop Conditions

Stop and report instead of continuing when:

- the completion promise is missing or ambiguous
- required loop prerequisites cannot be read
- the loop safety rules require termination
