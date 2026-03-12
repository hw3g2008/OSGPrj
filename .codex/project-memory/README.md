# Project Memory

This directory is the project-local memory area for Codex and other agents.

## Why this exists

- It keeps agent memory with the repository, so a new machine can recover context from `git clone`.
- It avoids mixing operational memory into `docs/`.
- It gives `AGENTS.md` a stable place to point to.

## Files

- `memory.md`: human-readable project summary and current state

## Historical source files

The summary in `memory.md` is derived from these repo files:

- `.claude/memory/decisions.yaml`
- `.claude/memory/project-audit.yaml`
- `.claude/memory/session.yaml`
- `.claude/project/config.yaml`
- `osg-spec-docs/tasks/STATE.yaml`

## Update rule

When major architecture, workflow, or delivery milestones change, update `memory.md` so new Codex sessions can bootstrap quickly.
