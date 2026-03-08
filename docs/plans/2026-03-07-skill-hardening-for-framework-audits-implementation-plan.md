# Skill Hardening for Framework Audits Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the personal process skills so future framework/workflow changes cannot pass with missing source-stage integration, duplicate guards, or final-only verification.

**Architecture:** Modify the process skills that shape design, plan writing, and completion claims. Add explicit repo-entrypoint backtrace requirements, guard-reuse checks, and stage-regression verification. Then harden `writing-skills` so future skill edits are pressure-tested against the same failure modes.

**Tech Stack:** Skill Markdown, repo design docs, regression prompts, verification commands.

---

### Task 1: Update `brainstorming` to force repo-entrypoint backtrace for framework changes

**Files:**
- Modify: `/Users/huangxin/.codex/skills/brainstorming/SKILL.md`
- Reference: `docs/plans/2026-03-07-skill-hardening-for-framework-audits-design.md`

**Step 1: Identify the exact gap to close**

Update the skill so that when the task is about framework/workflow/guard/skill design, it must explicitly require:
- inventory of existing workflow entrypoints
- inventory of current guards/scripts/skills involved
- source-stage generation path for any new artifact/contract

**Step 2: Write the failing pressure scenario first**

Define a pressure scenario where the agent:
- proposes a new guard
- forgets to check existing guards
- forgets to check source-stage generation files
- tries to approve the design anyway

Expected baseline:
- current skill allows this gap

**Step 3: Patch the skill**

Add a framework-design branch to the checklist that requires:
- entrypoint inventory
- reuse/collision audit
- source-stage audit
before design approval

**Step 4: Verify the skill text contains the new hard requirements**

Run:
```bash
rg -n "entrypoint|reuse|collision|source-stage|framework/workflow/guard/skill" /Users/huangxin/.codex/skills/brainstorming/SKILL.md
```

Expected:
- all new requirements appear in the skill body

---

### Task 2: Update `writing-plans` to require source-stage integration and guard-reuse analysis

**Files:**
- Modify: `/Users/huangxin/.codex/skills/writing-plans/SKILL.md`
- Reference: `docs/plans/2026-03-07-skill-hardening-for-framework-audits-design.md`

**Step 1: Define the missing plan constraints**

The skill must require every framework/workflow plan to include:
- existing-entrypoint inventory
- guard reuse / collision audit
- source-stage integration path
- stage-regression verification commands

**Step 2: Write the failing pressure scenario first**

Define a scenario where a plan:
- introduces a new guard name already covered by an existing guard
- adds a new contract file without saying where it is generated
- only verifies final-gate

Expected baseline:
- current skill does not force the plan to block on these gaps

**Step 3: Patch the skill**

Add mandatory plan sections and rules:
- no new guard without reuse analysis
- no new artifact without source-stage generation path
- no “plan complete” without stage-regression verification steps

**Step 4: Verify the skill text**

Run:
```bash
rg -n "existing-entrypoint|reuse|collision|source-stage|stage-regression|artifact" /Users/huangxin/.codex/skills/writing-plans/SKILL.md
```

Expected:
- all new requirements appear

---

### Task 3: Update `verification-before-completion` with doc-plan completion mode

**Files:**
- Modify: `/Users/huangxin/.codex/skills/verification-before-completion/SKILL.md`
- Reference: `docs/plans/2026-03-07-skill-hardening-for-framework-audits-design.md`

**Step 1: Define the missing completion check**

The skill must distinguish:
- code completion claims
- doc/plan completion claims

For doc/plan completion claims, it must require:
- repo-entrypoint backtrace
- actual guard/script/workflow cross-check
- evidence before saying “文档已完善 / 方案可落地”

**Step 2: Write the failing pressure scenario first**

Define a scenario where the agent says:
- “文档已经完善”
without checking actual workflow files or existing guards.

Expected baseline:
- current skill does not force this backtrace strongly enough

**Step 3: Patch the skill**

Add a doc-plan verification branch with required commands/evidence categories.

**Step 4: Verify the skill text**

Run:
```bash
rg -n "doc-plan|entrypoint|workflow|guard|evidence before assertions|方案可落地|文档已完善" /Users/huangxin/.codex/skills/verification-before-completion/SKILL.md
```

Expected:
- doc-plan verification mode is explicit

---

### Task 4: Update `writing-skills` so skill edits are pressure-tested against framework-audit failure modes

**Files:**
- Modify: `/Users/huangxin/.codex/skills/writing-skills/SKILL.md`
- Reference: `docs/plans/2026-03-07-skill-hardening-for-framework-audits-design.md`

**Step 1: Define new pressure scenarios**

Add skill-testing scenarios for:
- missing source-stage integration
- duplicate guard creation instead of reuse
- logical-vs-physical guard drift
- final-only verification blind spot

**Step 2: Patch the skill**

Update the testing section so these scenarios are explicitly required when editing process skills.

**Step 3: Verify the skill text**

Run:
```bash
rg -n "source-stage|duplicate guard|reuse|logical|physical|final-only|blind spot|framework" /Users/huangxin/.codex/skills/writing-skills/SKILL.md
```

Expected:
- new pressure scenarios and testing expectations appear

---

### Task 5: Run one repo-backed regression proving the hardened skills would have caught this truth-contract plan gap

**Files:**
- Reference only; no repo code changes required
- Inputs:
  - `docs/plans/2026-03-07-truth-contract-hard-gates-design.md`
  - `docs/plans/2026-03-07-truth-contract-hard-gates-implementation-plan.md`
  - `.claude/skills/prototype-extraction/SKILL.md`
  - `.claude/skills/brainstorming/SKILL.md`
  - `.windsurf/workflows/brainstorm.md`
  - `.claude/skills/workflow-engine/tests/story_ticket_coverage_guard.py`

**Step 1: Re-run the same backtrace audit**

Run:
```bash
rg -n "DELIVERY-CONTRACT|delivery_contract|critical_surfaces|ui_critical_contract" .claude/skills/prototype-extraction .claude/skills/brainstorming .windsurf/workflows/brainstorm.md docs/plans/2026-03-07-truth-contract-hard-gates-design.md docs/plans/2026-03-07-truth-contract-hard-gates-implementation-plan.md
rg -n "story_ticket_coverage_guard|requirements_coverage_guard|delivery_truth_guard|ui_visual_contract_guard" .windsurf/workflows/approve.md bin/final-gate.sh .claude/skills/workflow-engine/tests docs/plans/2026-03-07-truth-contract-hard-gates-design.md docs/plans/2026-03-07-truth-contract-hard-gates-implementation-plan.md
```

**Step 2: Confirm the hardened skill criteria match the findings**

Expected:
- the new skill requirements would have forced discovery of:
  - missing source-stage integration
  - existing guard reuse conflict
  - logical vs physical guard ambiguity
  - missing stage-regression verification

---

## Verification

Run in order:

```bash
rg -n "entrypoint|reuse|collision|source-stage|framework/workflow/guard/skill" /Users/huangxin/.codex/skills/brainstorming/SKILL.md
rg -n "existing-entrypoint|reuse|collision|source-stage|stage-regression|artifact" /Users/huangxin/.codex/skills/writing-plans/SKILL.md
rg -n "doc-plan|entrypoint|workflow|guard|evidence before assertions|方案可落地|文档已完善" /Users/huangxin/.codex/skills/verification-before-completion/SKILL.md
rg -n "source-stage|duplicate guard|reuse|logical|physical|final-only|blind spot|framework" /Users/huangxin/.codex/skills/writing-skills/SKILL.md
rg -n "DELIVERY-CONTRACT|delivery_contract|critical_surfaces|ui_critical_contract" .claude/skills/prototype-extraction .claude/skills/brainstorming .windsurf/workflows/brainstorm.md docs/plans/2026-03-07-truth-contract-hard-gates-design.md docs/plans/2026-03-07-truth-contract-hard-gates-implementation-plan.md
rg -n "story_ticket_coverage_guard|requirements_coverage_guard|delivery_truth_guard|ui_visual_contract_guard" .windsurf/workflows/approve.md bin/final-gate.sh .claude/skills/workflow-engine/tests docs/plans/2026-03-07-truth-contract-hard-gates-design.md docs/plans/2026-03-07-truth-contract-hard-gates-implementation-plan.md
```

Expected:
- all four skills contain the hardened requirements
- the truth-contract docs still cross-reference correctly
- the new skill rules clearly cover the exact gap we just found

## Execution Handoff

Plan complete and saved to `docs/plans/2026-03-07-skill-hardening-for-framework-audits-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
