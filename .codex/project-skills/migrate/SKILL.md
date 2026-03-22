---
name: migrate
description: "Execute the repository's /migrate flow for test assets. Use when the user asks to run /migrate test-assets for a module or story by following the existing command and migration workflow."
---

# Migrate

## Overview

Use this skill to execute the repository's real `/migrate` flow.

Keep the interface simple:

```text
/migrate test-assets permission
/migrate test-assets permission S-001
```

Do not invent a parallel migration path. Reuse the repository's existing command, workflow, and scripts.

## Workflow

1. Read `.claude/commands/migrate.md`.
2. Read `.windsurf/workflows/migrate-test-assets.md` when needed.
3. Resolve the module and optional story id from user input.
4. Read the migration scripts and guards referenced by the command.
5. Execute the repository's standard migration flow.
6. Report updated assets, guard results, and any remaining coverage gaps.

## Required Repository Files

- `.claude/commands/migrate.md`
- `.windsurf/workflows/migrate-test-assets.md`
- `bin/sync-test-assets.py`
- `.claude/skills/workflow-engine/tests/test_asset_completeness_guard.py`

## Guardrails

- Do not write ad hoc schema conversions outside the migration flow.
- Do not update `STATE.yaml` unless the command explicitly requires it.
- Do not claim migration succeeded without running the documented guards.

## Stop Conditions

Stop and report instead of continuing when:

- the module or story id cannot be resolved
- required migration scripts or guards are missing
- migration or guard execution fails
