# Workflow Closure Minimal Hard-Gates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the remaining workflow gaps from story split to final closure by adding independent SRS/DECISIONS guards and wiring them into enforceable gates.

**Architecture:** Add two standalone Python guards under workflow-engine tests (`srs_guard.py`, `decisions_guard.py`) and invoke them in key choke points. Keep implementation framework-only (scripts/workflow docs), avoid any business-page code changes.

**Tech Stack:** Python 3, Bash, Windsurf workflow markdown, existing workflow-engine guard patterns.

---

### Task 1: Add independent SRS quality guard

**Files:**
- Create: `.claude/skills/workflow-engine/tests/srs_guard.py`

**Step 1: Implement guard CLI**

Add arguments:
- `--module` (required)
- `--srs-dir` (default `osg-spec-docs/docs/02-requirements/srs`)
- `--min-lines` (default `100`)

Checks:
1. `{module}.md` exists
2. line count >= min-lines
3. required anchors exist in file content:
   - `## §2 功能需求`
   - `## §3 非功能需求`
   - `## §5 接口清单`
   - at least one `FR-` token
4. On pass print `PASS: srs_guard ...`; on fail print `FAIL: ...` and exit non-zero.

**Step 2: Verify guard on permission module**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/srs_guard.py --module permission
```

Expected: PASS.

---

### Task 2: Add independent DECISIONS completeness guard

**Files:**
- Create: `.claude/skills/workflow-engine/tests/decisions_guard.py`

**Step 1: Implement guard CLI**

Add arguments:
- `--module` (required)
- `--decisions-dir` (default `osg-spec-docs/docs/02-requirements/srs`)
- `--allow-missing` (default false)

Checks for `{module}-DECISIONS.md`:
1. file exists (unless `--allow-missing`)
2. count records by `## DEC-`
3. reject if any `**状态**: pending`
4. reject if any `**状态**: resolved` with `**已应用**: false`
5. pass when all decision records are closed (`resolved+已应用:true` or `rejected`)
6. output summary counts in PASS line.

**Step 2: Verify guard on permission module**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/decisions_guard.py --module permission
```

Expected: PASS.

---

### Task 3: Wire guards into enforced gates

**Files:**
- Modify: `bin/final-gate.sh`
- Modify: `.windsurf/workflows/split-story.md`
- Modify: `.windsurf/workflows/rpiv.md`

**Step 1: Add guards into final-gate preflight**

In `bin/final-gate.sh`, after `plan_standard_guard` and before runtime/story checks:
1. run `srs_guard.py --module "${MODULE}"`
2. run `decisions_guard.py --module "${MODULE}" --allow-missing`

Rationale for `--allow-missing` at final-gate:
- modules with no decision log should not be blocked
- if decision file exists, unresolved items must block

**Step 2: Strengthen split-story workflow preconditions**

In `.windsurf/workflows/split-story.md`, add mandatory pre-step:
- run `srs_guard.py --module {module}`
- run `decisions_guard.py --module {module} --allow-missing`
- any failure blocks split.

**Step 3: Correct RPIV terminal guidance**

In `.windsurf/workflows/rpiv.md`, replace the current `all_stories_done` suggestion that points to manual Playwright with:
1. execute `/final-closure {module}` as the only completion entrance
2. completion judged by final-closure result and audit artifacts.

---

### Task 4: Verification and handoff

**Files:**
- No new files required (uses runtime logs/artifacts)

**Step 1: Run targeted verification**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/srs_guard.py --module permission
python3 .claude/skills/workflow-engine/tests/decisions_guard.py --module permission
bash -n bin/final-gate.sh
```

Expected:
- two guards PASS
- shell syntax check PASS

**Step 2: Run baseline framework guards**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/plan_standard_guard.py
python3 .claude/skills/workflow-engine/tests/story_runtime_guard.py \
  --state osg-spec-docs/tasks/STATE.yaml \
  --config .claude/project/config.yaml \
  --state-machine .claude/skills/workflow-engine/state-machine.yaml \
  --stories-dir osg-spec-docs/tasks/stories \
  --tickets-dir osg-spec-docs/tasks/tickets \
  --proofs-dir osg-spec-docs/tasks/proofs \
  --events osg-spec-docs/tasks/workflow-events.jsonl
```

Expected: PASS.

