# Codex CLI Handoff

## Scope

This handoff captures the important repository state at the end of the current plugin-based Codex session so a new terminal Codex instance can resume work quickly without re-deriving context.

Project root:
- `/Users/hw/workspace/OSGPrj`

Related docs repo:
- `/Users/hw/workspace/OSGPrj/osg-spec-docs`

Date:
- `2026-03-22`

## Current RPIV State

Primary workflow truth is in [STATE.yaml](/Users/hw/workspace/OSGPrj/osg-spec-docs/tasks/STATE.yaml).

Current values:
- `current_requirement: lead-mentor`
- `current_story: S-039`
- `current_ticket: null`
- `workflow.current_step: tickets_approved`
- `workflow.next_step: next`
- `completed_tickets: T-177 ~ T-183`

Important nuance:
- `S-039` had already been implemented and verified earlier in the session history, but the current `STATE.yaml` is back at `tickets_approved`.
- When resuming, trust the current file state and current deliverables in repo, not chat memory alone.

## Main Outcomes From This Session

### 1. `frontend-ui` framework was strengthened

These changes are already committed in the main repo:

- `437984fe` `feat(frontend-ui): add rule-class ticket payloads`
- `a40fa2b4` `feat(frontend-ui): add default tolerance for layout contracts`
- `5fec1130` `fix(frontend-ui): wait for host anchors before surface trigger`
- `937fedf0` `fix(workflow): stabilize runtime and test-asset ids`

Key improvements:
- `frontend-ui` tickets now include `ui_rule_classes`
- UI rule classes currently include:
  - `page-shell`
  - `overlay-surface-layout`
  - `control-box-model`
  - `form-spacing`
  - `action-content-alignment`
  - `iconography-consistency`
- splitter now extracts richer style/state payloads from prototype and visual contract
- coverage guards now require rule-class coverage for relevant UI tickets
- UI verification no longer hard-fails on tiny numeric layout drift by default
- surface trigger flow now waits for host-page anchors before triggering overlays

### 2. Default tolerance behavior is in place

Implemented in:
- [style-contract.ts](/Users/hw/workspace/OSGPrj/osg-frontend/tests/e2e/support/style-contract.ts)
- [visual-contract.ts](/Users/hw/workspace/OSGPrj/osg-frontend/tests/e2e/support/visual-contract.ts)
- [visual-contract.e2e.spec.ts](/Users/hw/workspace/OSGPrj/osg-frontend/tests/e2e/visual-contract.e2e.spec.ts)
- [ticket_splitter_engine.py](/Users/hw/workspace/OSGPrj/.claude/skills/ticket-splitter/scripts/ticket_splitter_engine.py)

Behavior:
- Numeric layout properties get a default `2px` tolerance
- Applies to properties like:
  - `width`
  - `height`
  - `max-width`
  - `max-height`
  - `min-height`
  - `padding*`
  - `margin*`
  - `gap`
  - `border-radius`
- Semantic properties remain strict
  - `justify-content`
  - `display`
  - text/icon identity
  - colors and other non-numeric semantics

Intent:
- avoid being blocked by meaningless 1-2px drift
- keep true UI rule violations visible

### 3. Surface trigger stability was generalized

Implemented in:
- [surface-trigger.ts](/Users/hw/workspace/OSGPrj/osg-frontend/tests/e2e/support/surface-trigger.ts)
- [surface-trigger.e2e.spec.ts](/Users/hw/workspace/OSGPrj/osg-frontend/tests/e2e/surface-trigger.e2e.spec.ts)

Behavior:
- before triggering a surface, the shared trigger helper now waits for the host page required anchors
- this fixes the class of race conditions where overlays were tested before the page shell fully settled

This specifically unblocked:
- `modal-forgot-password` visual compare in `lead-mentor`

### 4. `lead-mentor` ticket generation was regenerated with richer UI payloads

Docs repo committed earlier in the session:
- `027258e` `docs(lead-mentor): regenerate rule-class ui tickets`

Scope regenerated:
- Stories `S-039 ~ S-047`
- Tickets `T-177 ~ T-229`

The regenerated tickets now carry:
- `prototype_refs`
- `visual_checklist`
- `style_contracts`
- `state_cases`
- `ui_rule_classes`

## Verified Commands Already Run

These were run successfully during this session:

- `python3 .claude/skills/ticket-splitter/scripts/ticket_splitter_engine_selftest.py`
- `python3 .claude/skills/workflow-engine/tests/story_ticket_coverage_guard_selftest.py`
- `python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py`
- `python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py --contract osg-spec-docs/docs/01-product/prd/lead-mentor/UI-VISUAL-CONTRACT.yaml`
- `python3 bin/sync-test-assets-selftest.py`
- `python3 .claude/skills/workflow-engine/tests/story_runtime_guard.py --state osg-spec-docs/tasks/STATE.yaml`
- `pnpm --dir osg-frontend exec playwright test tests/e2e/visual-contract-style.spec.ts --workers=1`
- `pnpm --dir osg-frontend exec playwright test tests/e2e/surface-trigger.e2e.spec.ts --workers=1`
- `pnpm --dir osg-frontend/packages/lead-mentor exec vite build`
- `PW_E2E_REUSE_SERVER=1 E2E_MODULE=lead-mentor pnpm --dir osg-frontend exec playwright test tests/e2e/module-login-shell.e2e.spec.ts --workers=1`
- `UI_VISUAL_SKIP_STATE=1 E2E_BACKEND_URL=http://47.94.213.128:28080 bash bin/ui-visual-baseline.sh lead-mentor --mode verify --source app --story-id S-039`

## Skills Available In This Repo

Project-installed Codex skills:
- `/next`
- `/deploy-frontend`
- `/deploy-full`

Notes:
- `deploy-frontend` is for one frontend only, reusing an existing backend
- `deploy-full test` reads test target configuration from project files and deploys the full test stack

## Current Repo Status

### Main repo

Status:
- clean

Recent commits:
- `937fedf0` `fix(workflow): stabilize runtime and test-asset ids`
- `5fec1130` `fix(frontend-ui): wait for host anchors before surface trigger`
- `a40fa2b4` `feat(frontend-ui): add default tolerance for layout contracts`
- `437984fe` `feat(frontend-ui): add rule-class ticket payloads`

### `osg-spec-docs` repo

Status:
- still dirty

Important warning:
- there is a large batch of older story/ticket YAML changes still present in the docs repo worktree
- these are mostly outside the current `lead-mentor` mainline and were intentionally not mixed into main repo commits
- examples include:
  - `tasks/stories/S-013.yaml ~ S-038.yaml`
  - many historical tickets such as `T-021`, `T-064`, `T-096 ~ T-176`

Recommendation:
- do not auto-commit the docs repo blindly
- inspect/partition those changes before committing

## Recommended Resume Procedure For CLI Codex

In a new terminal Codex instance, do this first:

1. Read this handoff file
2. Read [STATE.yaml](/Users/hw/workspace/OSGPrj/osg-spec-docs/tasks/STATE.yaml)
3. Read latest main repo commits
4. Continue from current RPIV truth, not from stale chat assumptions

Suggested prompt:

```text
Read docs/plans/2026-03-22-codex-cli-handoff.md and osg-spec-docs/tasks/STATE.yaml first, then continue from the current RPIV truth without redoing completed work.
```

If continuing the RPIV mainline directly:

```text
/next
```

## Practical Cautions

- The plugin session discovered and fixed a class of UI verification failures; do not revert the new tolerance or trigger-wait behavior casually.
- The docs repo is not clean; keep main-repo work and docs-repo cleanup separate unless there is a deliberate migration pass.
- If multiple Codex instances are opened at the same time, avoid parallel edits to:
  - `osg-spec-docs/tasks/STATE.yaml`
  - ticket/story YAMLs
  - shared workflow guards

## Local URLs Often Used During This Session

- lead-mentor app preview: `http://127.0.0.1:4174/login`
- lead-mentor prototype: `http://127.0.0.1:18090/lead-mentor.html`
- mentor app preview: `http://127.0.0.1:4175/login`
- mentor prototype: `http://127.0.0.1:18090/mentor.html`

## Short Version

If you only remember one thing:

- main repo is clean
- docs repo is not clean
- `frontend-ui` framework is stronger now
- UI checks tolerate tiny numeric drift but still enforce semantic alignment
- overlay visual checks now wait for host-page readiness
- new CLI Codex should start by reading this file plus `STATE.yaml`, then continue
