---
name: plan-deliver
description: "Execute the repository's /plan-deliver flow. Use when the user asks to start or resume the standard RPIV delivery chain by following the existing command, workflow, and plan-deliver skill."
---

# Plan Deliver

## Overview

Use this skill to execute the repository's real `/plan-deliver` flow.

Keep the interface simple:

```text
/plan-deliver
/plan-deliver admin
/plan-deliver REQ-001
/plan-deliver 用户管理模块
```

Do not invent a parallel orchestration path. Reuse the repository's existing command, workflow, and plan-deliver skill.

## Workflow

1. Read `osg-spec-docs/tasks/STATE.yaml`.
2. Read `.claude/project/config.yaml`.
3. Resolve the target module or requirement from user input or repository state.
4. Read `.claude/commands/plan-deliver.md`.
5. Read `.windsurf/workflows/plan-deliver.md`.
6. Read `.claude/skills/plan-deliver/SKILL.md`.
7. Dispatch only to the repository's existing RPIV commands, or stop at an existing pause state.
8. Report the dispatch target or the stop reason and next command.

## Required Repository Files

- `osg-spec-docs/tasks/STATE.yaml`
- `.claude/project/config.yaml`
- `.claude/commands/plan-deliver.md`
- `.windsurf/workflows/plan-deliver.md`
- `.claude/skills/plan-deliver/SKILL.md`
- `.claude/skills/workflow-engine/state-machine.yaml`

## Guardrails

- Do not implement a second workflow engine.
- Do not write `STATE.yaml` ad hoc.
- Do not bypass approval gates or existing pause states.
- For `story_verified`, honor `config.approval.story_done`: stop only when approval is required; otherwise dispatch the repository's existing story approval command.
- Do not directly perform `/final-closure`; only route the user there when the workflow has reached `all_stories_done`.
- Do not skip re-reading repository state before deciding the next command.

## Stop Conditions

Stop and report instead of continuing when:

- the target module or requirement cannot be resolved for a `not_started` flow
- the current workflow state is a defined pause state
- the current workflow state is not covered by the repository's plan-deliver rules
- a required repository command or workflow file is missing
