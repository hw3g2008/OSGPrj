---
name: final-closure
description: "Execute the repository's /final-closure flow. Use when the user asks to run /final-closure for a module after all Stories are done by following the existing command, workflow, and shell entrypoint."
---

# Final Closure

## Overview

Use this skill to execute the repository's real `/final-closure` flow.

Keep the interface simple:

```text
/final-closure
/final-closure permission
```

Do not invent a separate end-of-module closure path. Reuse the repository's existing command, workflow, and script entrypoint.

## Workflow

1. Read `osg-spec-docs/tasks/STATE.yaml`.
2. Resolve the module from user input or repository state.
3. Read `.claude/commands/final-closure.md`.
4. Read `.windsurf/workflows/final-closure.md`.
5. Read `bin/final-closure.sh` as needed for the real execution contract.
6. Execute the repository's standard final-closure flow.
7. Report exit status, gate results, audit results, and produced artifacts.

## Required Repository Files

- `osg-spec-docs/tasks/STATE.yaml`
- `.claude/commands/final-closure.md`
- `.windsurf/workflows/final-closure.md`
- `bin/final-closure.sh`

## Guardrails

- Do not bypass `final-closure.sh`.
- Do not skip final gates, audit checks, or module asset checks.
- Do not claim module closure succeeded without command evidence.

## Stop Conditions

Stop and report instead of continuing when:

- the module cannot be resolved
- the current workflow state is not eligible for final closure
- the final-closure script or required gate artifacts are missing
