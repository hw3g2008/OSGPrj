---
name: split-story
description: "Execute the repository's /split story flow. Use when the user asks to run /split story for the current requirement by following the existing command, workflow, and story-splitter skill."
---

# Split Story

## Overview

Use this skill to execute the repository's real `/split story` flow.

Keep the interface simple:

```text
/split story
```

Do not invent a parallel story-splitting path. Reuse the repository's existing command, workflow, and splitter skill.

## Workflow

1. Read `osg-spec-docs/tasks/STATE.yaml`.
2. Read `.claude/commands/split.md`.
3. Read `.windsurf/workflows/split-story.md`.
4. Read `.claude/skills/story-splitter/SKILL.md`.
5. Read the current requirement artifacts needed for execution.
6. Execute the repository's standard story-splitting flow.
7. Report generated Story assets, guards, and next workflow impact.

## Required Repository Files

- `osg-spec-docs/tasks/STATE.yaml`
- `.claude/commands/split.md`
- `.windsurf/workflows/split-story.md`
- `.claude/skills/story-splitter/SKILL.md`

## Guardrails

- Do not bypass the story-splitter flow with an ad hoc story list.
- Do not skip repository proof or coverage expectations.
- Do not rewrite workflow state outside the repository transition rules.

## Stop Conditions

Stop and report instead of continuing when:

- the current requirement cannot be resolved
- the required source requirement artifacts are missing
- the repository's story-splitting guards fail
