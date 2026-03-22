---
name: review
description: "Execute the repository's /review flow. Use when the user asks to run /review for the current ticket or /review T-xxx by following the existing command, workflow, and code-review skill."
---

# Review

## Overview

Use this skill to execute the repository's real `/review` flow.

Keep the interface simple:

```text
/review
/review T-xxx
```

Do not invent a parallel review path. Reuse the repository's existing command, workflow, and review skill.

## Workflow

1. Read `.claude/commands/review.md`.
2. Read `.windsurf/workflows/review.md` when needed.
3. Read `osg-spec-docs/tasks/STATE.yaml`.
4. Resolve the target ticket from user input or current state.
5. Read `.claude/skills/code-review/SKILL.md`.
6. Read the target ticket YAML and changed files as needed.
7. Execute the repository's standard review flow.
8. Report findings first, then overall review result and next workflow impact.

## Required Repository Files

- `.claude/commands/review.md`
- `.windsurf/workflows/review.md`
- `.claude/skills/code-review/SKILL.md`
- `osg-spec-docs/tasks/STATE.yaml`
- `osg-spec-docs/tasks/tickets/T-xxx.yaml`

## Guardrails

- Do not replace the repository's review flow with a generic summary.
- Do not claim review passed without checking the actual target and evidence.
- Findings must stay primary when issues exist.

## Stop Conditions

Stop and report instead of continuing when:

- the target ticket cannot be resolved
- the target ticket file is missing
- the repository's review prerequisites cannot be satisfied
