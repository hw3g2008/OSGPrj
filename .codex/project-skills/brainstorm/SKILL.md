---
name: brainstorm
description: "Execute the repository's RPIV /brainstorm flow. Use when the user asks to run /brainstorm for a module, requirement, or requirement idea by following the existing command, workflow, and brainstorming skill."
---

# Brainstorm

## Overview

Use this skill to execute the repository's real `/brainstorm` flow.

Keep the interface simple:

```text
/brainstorm
/brainstorm admin
/brainstorm REQ-001
/brainstorm 用户登录模块
```

Do not invent a parallel requirements-analysis path. Reuse the repository's existing command, workflow, and brainstorming skill.

## Workflow

1. Read `osg-spec-docs/tasks/STATE.yaml`.
2. Read `.claude/project/config.yaml`.
3. Resolve the target module or requirement from user input or repository state.
4. Read `.claude/commands/brainstorm.md`.
5. Read `.windsurf/workflows/brainstorm.md`.
6. Read `.claude/skills/brainstorming/SKILL.md`.
7. Execute the repository's standard brainstorm flow, including any decisions-file stops.
8. Report generated outputs, blockers, and next workflow impact.

## Required Repository Files

- `osg-spec-docs/tasks/STATE.yaml`
- `.claude/project/config.yaml`
- `.claude/commands/brainstorm.md`
- `.windsurf/workflows/brainstorm.md`
- `.claude/skills/brainstorming/SKILL.md`

## Guardrails

- Do not bypass the repository's DECISIONS.md approval semantics.
- Do not replace the existing brainstorm stages with an ad hoc summary.
- Do not claim brainstorm completed if the flow is blocked in `brainstorm_pending_confirm`.

## Stop Conditions

Stop and report instead of continuing when:

- the target module or requirement cannot be resolved
- the repository's brainstorm prerequisites are missing
- a required decisions file or upstream dependency gate blocks progress
