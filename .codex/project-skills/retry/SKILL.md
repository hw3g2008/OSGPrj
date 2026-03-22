---
name: retry
description: "Retry a failed or blocked ticket by following the existing /retry command. Use when the user asks to run /retry T-xxx."
---

# Retry

## Overview

Use this skill to execute the repository's real `/retry` flow.

Keep the interface simple:

```text
/retry T-xxx
```

Do not invent a separate retry path. Reuse the repository's command semantics and ticket-delivery flow.

## Workflow

1. Read `.claude/commands/retry.md`.
2. Read `osg-spec-docs/tasks/STATE.yaml`.
3. Resolve the target ticket from user input.
4. Read the target ticket YAML and any needed checkpoint data.
5. Read `.claude/skills/deliver-ticket/SKILL.md`.
6. Execute the repository's standard retry flow.
7. Report restore/retry outcome, evidence, and next workflow impact.

## Required Repository Files

- `.claude/commands/retry.md`
- `osg-spec-docs/tasks/STATE.yaml`
- `osg-spec-docs/tasks/tickets/T-xxx.yaml`
- `.claude/skills/deliver-ticket/SKILL.md`

## Guardrails

- Do not retry a ticket that is not eligible under the command rules.
- Do not bypass the checkpoint restore step when the command requires it.
- Do not mark the ticket recovered without command evidence.

## Stop Conditions

Stop and report instead of continuing when:

- the target ticket cannot be resolved
- the ticket is not in a retryable state
- the required checkpoint is missing
- the retry flow fails
