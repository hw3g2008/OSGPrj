---
name: split
description: "Execute the repository's /split command family. Use when the user asks to run /split story or /split ticket S-xxx by following the existing command, workflows, and splitter skills."
---

# Split

## Overview

Use this skill to execute the repository's real `/split` command family.

Keep the interface simple:

```text
/split story
/split ticket S-xxx
```

Do not invent a parallel splitting path. Reuse the repository's existing command, workflows, and splitter skills.

## Workflow

1. Read `.claude/commands/split.md`.
2. Read `osg-spec-docs/tasks/STATE.yaml`.
3. Resolve whether the request targets `story` or `ticket`.
4. For `/split story`, also read:
   - `.windsurf/workflows/split-story.md`
   - `.claude/skills/story-splitter/SKILL.md`
5. For `/split ticket`, also read:
   - `.windsurf/workflows/split-ticket.md`
   - `.claude/skills/ticket-splitter/SKILL.md`
   - the target Story YAML
6. Execute the repository's standard split flow for the resolved mode.
7. Report generated assets, guards, and next workflow impact.

## Required Repository Files

- `.claude/commands/split.md`
- `osg-spec-docs/tasks/STATE.yaml`
- `.windsurf/workflows/split-story.md`
- `.windsurf/workflows/split-ticket.md`
- `.claude/skills/story-splitter/SKILL.md`
- `.claude/skills/ticket-splitter/SKILL.md`

## Guardrails

- Do not generate freeform Stories or Tickets outside the repository splitter flows.
- Do not skip the mode-specific proofs, guards, or transitions.
- Do not mutate workflow state outside the repository's standard split path.

## Stop Conditions

Stop and report instead of continuing when:

- the split mode cannot be resolved
- required requirement or Story assets are missing
- the corresponding splitter flow fails
