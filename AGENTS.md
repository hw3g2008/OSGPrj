# OSGPrj Agent Guide

## Read First

Before substantial analysis, implementation, or review work, read:

1. `.codex/project-memory/memory.md`
2. `.claude/memory/decisions.yaml`
3. `.claude/memory/project-audit.yaml`
4. `.claude/project/config.yaml`
5. `osg-spec-docs/tasks/STATE.yaml`

## Purpose

- Treat `.codex/project-memory/` as the project-local memory entrypoint for Codex.
- Treat `docs/` as product, design, and delivery documentation. Do not mix agent-operational memory into `docs/`.
- Treat `~/.codex/memories/...` as machine-local cache only, not the project source of truth.

## Maintenance

- When architecture, workflow, or current delivery status changes materially, update `.codex/project-memory/memory.md`.
- Keep repo memory human-readable and repo-relative where possible.
- Do not store local machine secrets, auth state, or personal paths in project memory unless they are required and safe to share.
