---
name: cc-review
description: "Execute the repository's /cc-review flow. Use when the user asks to run /cc-review for story, decision, issue, or final review by following the existing workflow and supporting review skills."
---

# CC Review

## Overview

Use this skill to execute the repository's real `/cc-review` flow.

Keep the interface simple:

```text
/cc-review
/cc-review story
/cc-review decision
/cc-review issue
/cc-review final
```

Do not invent a parallel cross-check path. Reuse the repository's existing workflow.

## Workflow

1. Read `osg-spec-docs/tasks/STATE.yaml`.
2. Read `.windsurf/workflows/cc-review.md`.
3. Resolve the requested review mode from user input.
4. Read supporting repository instructions as needed:
   - `.claude/skills/code-review/SKILL.md`
   - `.claude/skills/workflow-engine/SKILL.md`
5. Execute the repository's defined review path and follow-up transition behavior.
6. Report findings, pass/fail outcome, and workflow impact.

## Required Repository Files

- `osg-spec-docs/tasks/STATE.yaml`
- `.windsurf/workflows/cc-review.md`
- `.claude/skills/code-review/SKILL.md`
- `.claude/skills/workflow-engine/SKILL.md`

## Guardrails

- Do not bypass the pre-review guards documented in the workflow.
- Do not treat `/cc-review final` as a separate heavy flow; delegate to `/final-closure` when the workflow says to.
- Do not write workflow state outside the repository's transition rules.

## Stop Conditions

Stop and report instead of continuing when:

- the requested review mode is unsupported
- the current story or required state is missing
- required guards fail before CC review can run
