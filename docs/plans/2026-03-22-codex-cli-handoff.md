# Codex CLI Handoff

## Scope

This handoff captures the current repository truth for reopening Codex in a new terminal window.

Project root:
- `/Users/hw/workspace/OSGPrj`

Primary workflow state:
- `/Users/hw/workspace/OSGPrj/osg-spec-docs/tasks/STATE.yaml`

Date:
- `2026-03-22`

## Current RPIV State

Read [STATE.yaml](/Users/hw/workspace/OSGPrj/osg-spec-docs/tasks/STATE.yaml) first.

Current values from repo truth:
- `current_requirement: lead-mentor`
- `current_story: S-040`
- `current_ticket: null`
- `workflow.current_step: story_verified`
- `workflow.next_step: null`
- `completed_stories: S-039`
- `completed_tickets: T-177 ~ T-186`

Practical meaning:
- `S-040` is sitting at `story_verified`
- the next workflow choice is:
  - `/approve` to continue directly
  - or `/cc-review` if cross-review is wanted first

## What Was Done In This Session

### 1. Added Codex project-skill wrappers for RPIV/framework commands

New Codex-facing wrappers were added under:
- [project-skills](/Users/hw/workspace/OSGPrj/.codex/project-skills)

These wrappers follow the same pattern as existing `next` and `verify`:
- recognize the command form
- read the existing `.claude/commands/*.md` and/or `.windsurf/workflows/*.md`
- reuse the real repository flow instead of inventing a parallel implementation

New wrappers added:
- `add-requirement`
- `approve`
- `brainstorm`
- `cc-review`
- `checkpoint`
- `compress`
- `final-closure`
- `init-project`
- `migrate`
- `ralph-loop`
- `restore`
- `retry`
- `review`
- `rollback`
- `save`
- `skip`
- `split`
- `split-story`
- `split-ticket`
- `status`
- `unblock`
- `worktree`

Previously existing wrappers kept:
- `next`
- `verify`
- `deploy-frontend`
- `deploy-full`

### 2. Explicitly removed immature Codex wrappers

Per user request, these two Codex wrapper entries were removed and should not be re-added casually:
- `ui-closure`
- `ui-team`

Important scope note:
- only the Codex `project-skills` wrappers were removed
- underlying framework files still exist in `.claude/commands/` and `.claude/skills/`
- the intent is: do not expose them as normal Codex-recognized shortcuts right now

## Current Working Tree

The repo is **not clean**.

New files from this session:
- the new `.codex/project-skills/*/SKILL.md` wrappers listed above

There are also pre-existing or in-progress code changes in the main worktree:
- `.claude/skills/workflow-engine/tests/behavior_contract_guard.py`
- `.claude/skills/workflow-engine/tests/behavior_contract_guard_selftest.py`
- `osg-frontend/packages/lead-mentor/src/layouts/MainLayout.vue`
- `osg-frontend/packages/lead-mentor/src/router/index.ts`
- `osg-frontend/packages/lead-mentor/vite.config.ts`
- `osg-frontend/tests/e2e/auth-config.spec.ts`
- `osg-frontend/tests/e2e/support/auth-config.ts`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorAuthController.java`
- `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgLeadMentorAuthControllerTest.java`
- `osg-frontend/packages/lead-mentor/src/__tests__/shell-home.spec.ts`
- `osg-frontend/packages/lead-mentor/src/__tests__/story-s040-regression.spec.ts`
- `osg-frontend/packages/lead-mentor/src/__tests__/upcoming-navigation-toast.spec.ts`
- `osg-frontend/packages/lead-mentor/src/__tests__/vite-proxy-entry.spec.ts`
- `osg-frontend/packages/lead-mentor/src/views/home/`
- `osg-frontend/tests/e2e/lead-mentor-upcoming-navigation.e2e.spec.ts`

Resume rule:
- do **not** revert any of those files blindly
- inspect before changing
- treat the `.codex/project-skills/` additions as the changes from this session

## Verification Already Performed For This Session

Only lightweight file-level verification was run for the wrapper work:
- listed all `SKILL.md` files under `.codex/project-skills`
- checked frontmatter presence with `rg` for `name:` and `description:`
- confirmed `ui-closure` and `ui-team` wrappers are absent

No runtime execution of RPIV commands was performed in this session.

## Recommended Resume Procedure

In the new terminal Codex session, do this first:

1. Read [handoff](/Users/hw/workspace/OSGPrj/docs/plans/2026-03-22-codex-cli-handoff.md)
2. Read [STATE.yaml](/Users/hw/workspace/OSGPrj/osg-spec-docs/tasks/STATE.yaml)
3. Run `git status --short`
4. Continue from repository truth, not from stale chat memory

Suggested prompt:

```text
Read docs/plans/2026-03-22-codex-cli-handoff.md and osg-spec-docs/tasks/STATE.yaml first. Then inspect git status and continue from the current repo truth. Do not use or recreate ui-closure/ui-team Codex wrappers.
```

If the immediate goal is to continue the RPIV mainline for `lead-mentor`:

```text
Read docs/plans/2026-03-22-codex-cli-handoff.md and osg-spec-docs/tasks/STATE.yaml first, then continue S-040 from story_verified. Default next action is /approve unless there is a reason to do /cc-review first.
```

## Short Version

If you only remember a few things:

- current RPIV truth is `lead-mentor / S-040 / story_verified`
- this session added a broad set of Codex `project-skills` wrappers modeled after `next` and `verify`
- `ui-closure` and `ui-team` wrappers were intentionally removed because they are not mature enough
- the worktree is dirty; do not blindly revert unrelated in-progress files
- start the new session by reading this file plus `STATE.yaml`
