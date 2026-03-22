---
name: approve
description: "Execute the repository's RPIV approve flow. Use when the user asks to run /approve, /approve brainstorm, /approve stories, /approve tickets, /approve S-xxx, or /approve T-xxx by following the existing command and workflow."
---

# Approve

## Overview

Use this skill to execute the repository's real RPIV `/approve` flow.

Keep the interface simple:

```text
/approve
/approve brainstorm
/approve stories
/approve tickets
/approve S-xxx
/approve T-xxx
```

Do not invent a parallel approval path. Reuse the repository's existing command and workflow.

## Workflow

1. Read `osg-spec-docs/tasks/STATE.yaml`.
2. Resolve the approval target from user input and current workflow state.
3. Read `.claude/commands/approve.md`.
4. Read `.windsurf/workflows/approve.md`.
5. Read `.claude/project/config.yaml`.
6. Read any target files needed for execution:
   - `osg-spec-docs/tasks/stories/S-xxx.yaml`
   - `osg-spec-docs/tasks/tickets/T-xxx.yaml`
   - the current decisions file when approving brainstorm
7. Execute the repository's standard guards, transitions, and follow-up behavior.
8. Report the approval result, blocking guards, and workflow impact.

## Required Repository Files

- `osg-spec-docs/tasks/STATE.yaml`
- `.claude/commands/approve.md`
- `.windsurf/workflows/approve.md`
- `.claude/project/config.yaml`
- `.claude/skills/workflow-engine/SKILL.md`

## Guardrails

- Do not bypass approval guards, truth-sync checks, or coverage checks.
- Do not rewrite `STATE.yaml` ad hoc.
- Do not skip required target files or proofs.
- Do not claim approval succeeded without command evidence.

## Stop Conditions

Stop and report instead of continuing when:

- the approval target cannot be resolved
- the current workflow state is incompatible with the requested approval
- required decisions, story, ticket, or proof assets are missing
- a guard or transition fails
