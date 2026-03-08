# Requirements Coverage Hard-Gates Implementation Plan

> **For Codex/Windsurf:** use `superpowers:executing-plans` when implementing this plan.  
> **Goal:** eliminate false-green delivery by adding source-of-truth cleanup and three hard guards: requirements coverage, menu/route/view consistency, permission-code consistency.

## 1. Problem Statement

Current workflow can pass for a self-consistent delivery subset while still missing source requirements or carrying config drift.

Confirmed root causes:
- source-of-truth conflict: `permission` module scope disagrees across PRD/SRS docs
- missing reverse coverage gate: no guard checks `requirements -> stories/tests`
- missing structural gate: no guard checks `menu -> route -> view`
- missing permission-code gate: frontend/router/menu strings, backend controllers, and menu seed SQL can drift silently

## 2. Scope

This plan is framework-only.

In scope:
- docs alignment for permission module scope
- new Python guards under `.claude/skills/workflow-engine/tests/`
- wiring into early workflow choke points and `bin/final-gate.sh`
- workflow doc updates so the same hard gates are enforced before story/ticket approval, not just at final closure

Out of scope:
- implementing business pages such as `mailjob/notice/complaints/logs`
- changing product behavior
- UI styling fixes

## 3. Design Decisions

### D1. Choose one source-of-truth hierarchy

Priority order:
1. module scope file: `osg-spec-docs/docs/01-product/prd/permission/MATRIX.md`
2. module SRS: `osg-spec-docs/docs/02-requirements/srs/permission.md`
3. supporting backend design doc: `osg-spec-docs/docs/02-requirements/srs/admin-permission-back.md`

Rule:
- if `MATRIX.md` says a menu group is out of scope for the module, downstream docs must not require its delivery in this module
- supporting docs must conform to module scope, not override it

### D2. Coverage guard checks only in-scope requirements

`requirements_coverage_guard.py` must not blindly enforce every string in every doc. It must:
- parse in-scope feature items from the chosen source documents
- compare them against Story/Test coverage
- fail only on in-scope unmapped items

### D3. Structural guard is module-aware

`menu_route_view_guard.py` must support:
- full-app mode: all menu items must map to route/view
- module-scoped mode: only routes declared as in-scope for current module must be enforced

For `permission`, current expected in-scope pages are:
- `/login`
- `/dashboard`
- `/permission/roles`
- `/permission/users`
- `/permission/base-data`

### D4. Permission-code guard must compare against chosen runtime source

Single-source rule:
- if frontend route/menu points to a backend-controlled page, permission string must match backend controller permission or approved adapter mapping
- if menu seed SQL is used as runtime permission source, it must match frontend/backend

No silent aliasing.
Any alias must be declared in one explicit mapping file or guard config.

### D5. Hard gates must be stage-specific, not only end-stage

Only running these guards in `final-gate` is not enough. That blocks false-green release, but still allows wasted downstream work.

Required choke points:
- before `/split story`: scope and SRS hard guards
- before `/approve stories`: `requirements -> stories`
- before `/approve tickets`: `story -> tickets`
- before `/final-gate`: `requirements -> stories -> tickets -> tests`, structure, permission-code consistency

Rule:
- upstream mismatch must fail early
- downstream steps must not continue on known structural drift

### D6. Fail-closed, not best-effort

All new guards must default to fail-closed:
- missing required input => FAIL
- ambiguous mapping => FAIL
- doc/config conflict => FAIL
- unclassified requirement item => FAIL

No “warn and continue” path in normal workflow.

## 4. Tasks

### Task 1: Resolve permission module scope documents

Files:
- modify `osg-spec-docs/docs/01-product/prd/permission/MATRIX.md`
- modify `osg-spec-docs/docs/02-requirements/srs/permission.md`
- modify `osg-spec-docs/docs/02-requirements/srs/admin-permission-back.md`

Steps:
1. decide whether `个人中心` belongs to current `permission` module
2. make all three docs consistent
3. add one explicit sentence describing why excluded items are excluded, if any

DoD:
- no scope contradiction remains across these three docs

### Task 2: Add `requirements_coverage_guard.py`

File:
- create `.claude/skills/workflow-engine/tests/requirements_coverage_guard.py`

Responsibilities:
- read module scope source docs
- derive in-scope functional items/pages
- read `stories/`, `tickets/`, `permission-test-cases.yaml`, `permission-traceability-matrix.md`
- fail when an in-scope page/capability is missing from Story/Test coverage

Modes:
- `requirements_to_stories`
- `requirements_to_story_tests`

CLI:
- `--module permission`
- `--scope-doc ...`
- `--srs ...`
- `--stories-dir ...`
- `--tickets-dir ...`
- `--cases ...`
- `--matrix ...`
- `--mode requirements_to_stories|requirements_to_story_tests`

Output:
- PASS summary with covered/missing counts
- FAIL with explicit missing items list

DoD:
- can run before `/approve stories` with only Story assets
- can run before `/final-gate` with Story/Ticket/Test assets

### Task 3: Add `menu_route_view_guard.py`

File:
- create `.claude/skills/workflow-engine/tests/menu_route_view_guard.py`

Responsibilities:
- parse menu declarations from `MainLayout.vue`
- parse route declarations from `router/index.ts`
- verify route component targets exist
- support `--scope-path-prefix` or `--allowed-paths-file` to limit enforcement to current module

DoD:
- can fail on menu items that have no route
- can run in scoped mode for `permission`

### Task 4: Add `permission_code_consistency_guard.py`

File:
- create `.claude/skills/workflow-engine/tests/permission_code_consistency_guard.py`

Responsibilities:
- collect frontend permission strings from router/menu
- collect backend permission strings from `@PreAuthorize("@ss.hasPermi('...')")`
- optionally collect menu seed permission strings from `deploy/mysql-init/02_osg_menu_init.sql`
- compare by canonical page name or explicit mapping
- fail on unapproved mismatches

DoD:
- current `system:*` vs `admin:*` drift is detectable

### Task 5: Wire guards into early workflow choke points and final gate

Files:
- modify `bin/final-gate.sh`
- modify `.windsurf/workflows/split-story.md`
- modify `.windsurf/workflows/approve.md`
- optional: modify `.claude/commands/split.md`
- optional: modify `.claude/commands/approve.md`

Execution order:
1. `/split story` 前：
   - `srs_guard.py`
   - `decisions_guard.py`
   - source scope consistency check
2. `/approve stories` 前：
   - `requirements_coverage_guard.py --mode requirements_to_stories`
3. `final-gate` 前：
   - `requirements_coverage_guard.py --mode requirements_to_story_tests`
   - `menu_route_view_guard.py`
   - `permission_code_consistency_guard.py`

Rule:
- any failure blocks final gate
- any earlier failure blocks the corresponding approval/transition

### Task 6: Add `story_ticket_coverage_guard.py`

Files:
- create `.claude/skills/workflow-engine/tests/story_ticket_coverage_guard.py`
- modify `.windsurf/workflows/approve.md`

Responsibilities:
- verify every approved Story has at least one Ticket
- verify each Story acceptance scope is represented by Ticket coverage
- fail `/approve tickets` if a Story is partially ticketed

DoD:
- `ticket_split_done -> /approve tickets -> tickets_approved` cannot continue with partial ticket decomposition

### Task 7: Workflow doc alignment

Files:
- `.windsurf/workflows/split-story.md`
- `.windsurf/workflows/approve.md`
- `.windsurf/workflows/rpiv.md`

Add references so operators know:
- source scope must be aligned before story split
- story approval is invalid if requirements are not fully mapped to Stories
- ticket approval is invalid if Stories are not fully mapped to Tickets
- final closure is invalid if new hard guards fail

## 5. Verification

Run:

```bash
python3 .claude/skills/workflow-engine/tests/requirements_coverage_guard.py --module permission --mode requirements_to_stories
python3 .claude/skills/workflow-engine/tests/requirements_coverage_guard.py --module permission --mode requirements_to_story_tests
python3 .claude/skills/workflow-engine/tests/story_ticket_coverage_guard.py --module permission
python3 .claude/skills/workflow-engine/tests/menu_route_view_guard.py --module permission
python3 .claude/skills/workflow-engine/tests/permission_code_consistency_guard.py --module permission
bash -n bin/final-gate.sh
```

Then:

```bash
bash bin/final-gate.sh permission
```

Expected:
- before doc/code cleanup: guards fail with current known issues
- after cleanup: guards pass and final-gate only reflects real remaining implementation gaps
- `/approve stories` and `/approve tickets` must also fail early on missing coverage

## 6. Success Criteria

This plan is complete only when:
- source docs have no scope contradiction
- `/split story` cannot begin on unresolved scope conflict
- `/approve stories` cannot pass with missing Story coverage
- `/approve tickets` cannot pass with missing Ticket coverage
- missing in-scope requirements cannot bypass final-gate
- menu declarations without route/view cannot bypass final-gate
- permission-code drift cannot bypass final-gate
- the next module can no longer reach “false green” through partial coverage
