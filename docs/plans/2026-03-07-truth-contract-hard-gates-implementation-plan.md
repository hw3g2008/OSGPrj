# Truth Contract Hard Gates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan in batches with repo-backed verification.

**Goal:** Build a generic, fail-closed truth-contract framework so future modules cannot pass with downgraded functionality, hidden UI drift, missing test assets, or stage-skipping workflow behavior.

**Architecture:** Use one module-level `DELIVERY-CONTRACT.yaml`, one extended `UI-VISUAL-CONTRACT.yaml`, and a staged set of guards. The primary strategy is **process-first generation + process-first blocking**:
- `brainstorm / split-story / split-ticket` generate contracts and test assets
- `implement / verify` enforce truth, content, UI, and test-asset integrity
- `final-gate` only performs reverse-coverage backstop checks
- 其中 `split-story` 必须生成 **story 级测试骨架**，`split-ticket` 必须生成 **ticket 级测试资产（test-cases / traceability / verification stub）**

**Tech Stack:** Python guard scripts, Bash gate wiring, YAML contracts, Windsurf/Claude workflow docs, Playwright evidence emitters.

---

### Task 1: Re-baseline docs and source-stage workflow truth

**Files:**
- Reference/Update: `docs/plans/2026-03-07-truth-contract-hard-gates-design.md`
- Reference/Update: `docs/plans/2026-03-07-truth-contract-hard-gates-implementation-plan.md`
- Modify: `docs/plans/2026-03-06-delivery-loop-audit-report.md`
- Modify: `.claude/skills/prototype-extraction/SKILL.md`
- Modify: `.claude/skills/brainstorming/SKILL.md`
- Modify: `.windsurf/workflows/brainstorm.md`

**Step 1: Re-confirm design baseline**

The design doc must explicitly state:
- `delivery_contract` includes `behavior_contract`, `content_contract`, `evidence_contract`
- contracts and test assets are generated in-process, not backfilled later
- `final-gate` is a backstop, not the normal place to discover missing assets

**Step 2: Re-confirm implementation baseline**

This plan must explicitly cover:
- entrypoint inventory
- source-stage generation path
- guard reuse/collision audit
- stage-regression coverage
- process-stage test asset generation

**Step 3: Update audit report**

Add a short section stating:
- previous misses were caused by stage-local generation/enforcement gaps
- the corrective strategy is process-first generation, process-first blocking, final-gate backstop

**Step 4: Update source-stage docs**

Document that:
- `prototype-extraction` Step 4 generates `DELIVERY-CONTRACT.yaml`
- `prototype-extraction` Step 4 initializes `critical_surfaces`
- `brainstorming` treats both contracts as hard prerequisites to `split-story`

**Step 5: Verify**

Run:
```bash
rg -n "DELIVERY-CONTRACT|critical_surfaces|behavior_contract|content_contract|evidence_contract|过程优先|兜底" docs/plans .claude/skills/prototype-extraction/SKILL.md .claude/skills/brainstorming/SKILL.md .windsurf/workflows/brainstorm.md
```

Expected:
- design/plan/audit and source-stage docs all reference the new process-first contract model

**Step 6: Commit**

```bash
git add docs/plans/2026-03-07-truth-contract-hard-gates-design.md docs/plans/2026-03-07-truth-contract-hard-gates-implementation-plan.md docs/plans/2026-03-06-delivery-loop-audit-report.md .claude/skills/prototype-extraction/SKILL.md .claude/skills/brainstorming/SKILL.md .windsurf/workflows/brainstorm.md
git commit -m "docs: tighten truth contract hard gate flow"
```

---

### Task 2: Add delivery contract schema and structural guard

**Files:**
- Create: `.claude/skills/workflow-engine/tests/delivery_contract_guard.py`
- Create: `.claude/skills/workflow-engine/tests/delivery_contract_guard_selftest.py`
- Create: `osg-spec-docs/docs/01-product/prd/permission/DELIVERY-CONTRACT.yaml`
- Modify: `.claude/skills/workflow-engine/SKILL.md`
- Modify: `bin/check-skill-artifacts.sh`
- Modify: `.claude/skills/prototype-extraction/SKILL.md`

**Step 1: Write failing self-tests**

Self-test must verify:
- missing `effect_scope` fails
- missing `effect_kind` fails
- `truth_mode != real` fails
- missing `behavior_contract` fails
- missing `content_contract` fails
- missing `evidence_contract` fails
- valid contract passes

**Step 2: Run failing self-test**

```bash
python3 .claude/skills/workflow-engine/tests/delivery_contract_guard_selftest.py
```

Expected:
- FAIL because guard does not exist yet

**Step 3: Implement guard**

Guard responsibilities:
- load YAML
- validate required contract fields
- fail on ambiguity or missing declarations

**Step 4: Add initial module contract**

Create `permission/DELIVERY-CONTRACT.yaml` with capability entries that include:
- structural truth fields
- `behavior_contract`
- `content_contract`
- `evidence_contract`

**Step 5: Wire source-stage artifact gate**

Update source-stage rules so:
- `prototype-extraction` outputs `DELIVERY-CONTRACT.yaml`
- `bin/check-skill-artifacts.sh prototype-extraction ...` fails when it is missing or invalid

**Step 6: Verify**

```bash
python3 .claude/skills/workflow-engine/tests/delivery_contract_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/delivery_contract_guard.py --contract osg-spec-docs/docs/01-product/prd/permission/DELIVERY-CONTRACT.yaml
bash bin/check-skill-artifacts.sh prototype-extraction permission osg-spec-docs/docs/01-product/prd/permission
```

Expected:
- all PASS

**Step 7: Commit**

```bash
git add .claude/skills/workflow-engine/tests/delivery_contract_guard.py .claude/skills/workflow-engine/tests/delivery_contract_guard_selftest.py osg-spec-docs/docs/01-product/prd/permission/DELIVERY-CONTRACT.yaml .claude/skills/workflow-engine/SKILL.md bin/check-skill-artifacts.sh .claude/skills/prototype-extraction/SKILL.md
git commit -m "feat: add delivery contract schema guard"
```

---

### Task 3: Extend UI visual contract into critical-surface contract

**Files:**
- Modify: `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py`
- Modify: `osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml`
- Modify: `osg-frontend/tests/e2e/support/visual-contract.ts`

**Step 1: Write failing tests**

Cover:
- `critical_surfaces` schema required fields
- `mask_allowed: false` cannot overlap with page-level masks
- missing `style_contracts/state_contracts` fails

**Step 2: Run failing tests**

```bash
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
```

Expected:
- FAIL before support is added

**Step 3: Implement guard extension**

Extend guard to validate:
- `critical_surfaces[]`
- `mask_allowed`
- `relation_contracts`
- mandatory `style_contracts` / `state_contracts`

**Step 4: Update canary module contract**

Refactor permission login page so the captcha block is a `critical_surface` and no longer depends on a full mask.

**Step 5: Verify**

```bash
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py --contract osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml
```

Expected:
- PASS

**Step 6: Commit**

```bash
git add .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml osg-frontend/tests/e2e/support/visual-contract.ts
git commit -m "feat: extend critical UI contract schema"
```

---

### Task 4: Make split-story and split-ticket generate test assets in-process

**Files:**
- Modify: `.claude/skills/story-splitter/SKILL.md`
- Modify: `.claude/skills/ticket-splitter/SKILL.md`
- Modify: `.windsurf/workflows/split-story.md`
- Modify: `.windsurf/workflows/split-ticket.md`
- Modify: `.windsurf/workflows/approve.md`
- Modify: `.claude/skills/workflow-engine/tests/requirements_coverage_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/requirements_coverage_guard_selftest.py`
- Modify: `.claude/skills/workflow-engine/tests/story_ticket_coverage_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/story_ticket_coverage_guard_selftest.py`

**Step 1: Write failing self-tests**

Cover:
- requirement/contract item has no Story mapping
- Story has no `story_case` skeleton for declared capability/surface
- Story has no Ticket mapping for external effect or critical surface
- Ticket split did not generate TC/matrix/verification stub

**Step 2: Run failing tests**

```bash
python3 .claude/skills/workflow-engine/tests/requirements_coverage_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/story_ticket_coverage_guard_selftest.py
```

Expected:
- FAIL because current guards do not yet enforce generated test assets

**Step 3: Extend guards**

Implement rules:
- `requirements_coverage_guard.py`
  - every in-scope capability/surface must map to a Story
  - every Story must expose story-level test skeleton refs for declared capabilities/surfaces
- `story_ticket_coverage_guard.py`
  - every Story contract item must map to Tickets
  - external effects require implementation + verification coverage
  - critical surfaces require `frontend-ui` coverage
  - ticket split must generate TC/matrix/verification stubs

**Step 4: Wire split-story generation**

`story-splitter` and `/split story` must:
- generate story-level test skeletons
- 也就是生成 **story 级测试骨架**
- record them in Story metadata
- fail before `story_split_done` if the skeleton set is incomplete

**Step 5: Wire split-ticket generation**

`ticket-splitter` and `/split ticket` must:
- generate/update `{module}-test-cases.yaml`
- generate/update traceability matrix rows
- generate ticket verification stubs
- 也就是在流程内自动生成 **ticket 级测试资产**
- fail before `ticket_split_done` if these assets are incomplete

**Step 6: Verify**

```bash
python3 .claude/skills/workflow-engine/tests/requirements_coverage_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/story_ticket_coverage_guard_selftest.py
rg -n "story_case|test skeleton|requirements_coverage_guard|contract_refs" .claude/skills/story-splitter/SKILL.md .windsurf/workflows/split-story.md
rg -n "test-cases|traceability|verification stub|story_ticket_coverage_guard" .claude/skills/ticket-splitter/SKILL.md .windsurf/workflows/split-ticket.md .windsurf/workflows/approve.md
```

Expected:
- PASS

**Step 7: Commit**

```bash
git add .claude/skills/story-splitter/SKILL.md .claude/skills/ticket-splitter/SKILL.md .windsurf/workflows/split-story.md .windsurf/workflows/split-ticket.md .windsurf/workflows/approve.md .claude/skills/workflow-engine/tests/requirements_coverage_guard.py .claude/skills/workflow-engine/tests/requirements_coverage_guard_selftest.py .claude/skills/workflow-engine/tests/story_ticket_coverage_guard.py .claude/skills/workflow-engine/tests/story_ticket_coverage_guard_selftest.py
git commit -m "feat: generate truth test assets during split flow"
```

---

### Task 5: Add test asset completeness guard

**Files:**
- Create: `.claude/skills/workflow-engine/tests/test_asset_completeness_guard.py`
- Create: `.claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py`
- Modify: `.windsurf/workflows/split-ticket.md`
- Modify: `.windsurf/workflows/approve.md`
- Modify: `.windsurf/workflows/verify.md`
- Modify: `.claude/skills/verification/SKILL.md`

**Step 1: Write failing self-tests**

Cover:
- contract item exists but no TC entry exists
- TC exists but no matrix row exists
- Story/Ticket refs and test asset refs diverge
- fully synchronized assets pass

**Step 2: Run failing self-test**

```bash
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py
```

Expected:
- FAIL because guard does not exist yet

**Step 3: Implement guard**

Guard responsibilities:
- compare contract items against:
  - story refs
  - ticket refs
  - `{module}-test-cases.yaml`
  - traceability matrix
- fail if any declared constraint lacks downstream test assets

**Step 4: Wire to process gates**

Add the guard to:
- `split-ticket` output gate
- `approve` before ticket/stories approval closes
- `verify` before execution evidence is accepted

**Step 5: Verify**

```bash
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py
rg -n "test_asset_completeness_guard" .windsurf/workflows/split-ticket.md .windsurf/workflows/approve.md .windsurf/workflows/verify.md .claude/skills/verification/SKILL.md
```

Expected:
- PASS

**Step 6: Commit**

```bash
git add .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py .claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py .windsurf/workflows/split-ticket.md .windsurf/workflows/approve.md .windsurf/workflows/verify.md .claude/skills/verification/SKILL.md
git commit -m "feat: add test asset completeness guard"
```

---

### Task 6: Add behavior contract guard

**Files:**
- Create: `.claude/skills/workflow-engine/tests/behavior_contract_guard.py`
- Create: `.claude/skills/workflow-engine/tests/behavior_contract_guard_selftest.py`
- Modify: `.windsurf/workflows/verify.md`
- Modify: `.claude/skills/verification/SKILL.md`
- Modify: `bin/final-gate.sh`

**Step 1: Write failing self-tests**

Cover:
- scenario invariant missing
- same-observable-response invariant violated
- expected result mismatch
- valid contract/scenario evidence passes

**Step 2: Run failing self-test**

```bash
python3 .claude/skills/workflow-engine/tests/behavior_contract_guard_selftest.py
```

Expected:
- FAIL because guard does not exist yet

**Step 3: Implement guard**

Guard responsibilities:
- execute declared scenarios
- compare observable responses
- enforce behavior invariants such as anti-enumeration without knowing business names

**Step 4: Wire to verify and final-gate**

Add the guard to:
- `.windsurf/workflows/verify.md`
- `.claude/skills/verification/SKILL.md`
- `bin/final-gate.sh`

**Step 5: Verify**

```bash
python3 .claude/skills/workflow-engine/tests/behavior_contract_guard_selftest.py
rg -n "behavior_contract_guard" .windsurf/workflows/verify.md .claude/skills/verification/SKILL.md bin/final-gate.sh
```

Expected:
- PASS

**Step 6: Commit**

```bash
git add .claude/skills/workflow-engine/tests/behavior_contract_guard.py .claude/skills/workflow-engine/tests/behavior_contract_guard_selftest.py .windsurf/workflows/verify.md .claude/skills/verification/SKILL.md bin/final-gate.sh
git commit -m "feat: add behavior contract guard"
```

---

### Task 7: Add delivery truth and delivery content guards

**Files:**
- Create: `.claude/skills/workflow-engine/tests/delivery_truth_guard.py`
- Create: `.claude/skills/workflow-engine/tests/delivery_truth_guard_selftest.py`
- Create: `.claude/skills/workflow-engine/tests/delivery_content_guard.py`
- Create: `.claude/skills/workflow-engine/tests/delivery_content_guard_selftest.py`
- Modify: `.claude/skills/workflow-engine/tests/runtime_contract_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/runtime_contract_guard_selftest.py`
- Modify: `.windsurf/workflows/next.md`
- Modify: `.windsurf/workflows/verify.md`
- Modify: `.claude/skills/deliver-ticket/SKILL.md`
- Modify: `.claude/skills/verification/SKILL.md`
- Modify: `bin/final-gate.sh`
- Modify: `.windsurf/workflows/final-closure.md`
- Modify: `deploy/runtime-contract.dev.yaml`
- Modify: `deploy/.env.dev`
- Modify: `deploy/.env.test.example`
- Reference/Update: `docs/plans/2026-03-06-backend-runtime-contract-design.md`
- Reference/Update: `docs/plans/2026-03-06-backend-runtime-contract-implementation-plan.md`

**Step 1: Write failing self-tests**

`delivery_truth_guard` must cover:
- downgraded implementation patterns
- missing provider/evidence declarations
- `truth_mode != real`
- valid real implementation passes

`delivery_content_guard` must cover:
- forbidden literals appear in provider evidence
- required tokens missing
- valid content passes

`runtime_contract_guard` must now also cover:
- missing `providers / evidence_sinks / evidence_paths`
- invalid provider declaration shapes

**Step 2: Run failing self-tests**

```bash
python3 .claude/skills/workflow-engine/tests/delivery_truth_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/delivery_content_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/runtime_contract_guard_selftest.py
```

Expected:
- FAIL before implementation

**Step 3: Implement guards**

`delivery_truth_guard`:
- block downgraded implementations
- require declared providers and real evidence

`delivery_content_guard`:
- inspect real provider evidence
- reject `null`, `undefined`, or missing required tokens according to contract

**Step 4: Extend runtime contract truth source**

Update runtime contract and env truth so active environments declare:
- provider inventory
- evidence sink type
- evidence path / mailbox / provider log target

**Step 5: Wire to next / verify / final**

Add:
- `delivery_truth_guard` to `next`, `verify`, `final-gate`
- `delivery_content_guard` to `verify`, `final-gate`

Rules:
- `next` blocks downgraded implementations and missing runtime/provider declarations
- `verify` blocks missing truth evidence and invalid output content
- `final-gate` remains reverse-coverage backstop

**Step 6: Verify**

```bash
python3 .claude/skills/workflow-engine/tests/delivery_truth_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/delivery_content_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/runtime_contract_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/runtime_contract_guard.py --contract deploy/runtime-contract.dev.yaml
rg -n "delivery_truth_guard|delivery_content_guard" .windsurf/workflows/next.md .windsurf/workflows/verify.md .claude/skills/deliver-ticket/SKILL.md .claude/skills/verification/SKILL.md .windsurf/workflows/final-closure.md bin/final-gate.sh
rg -n "providers|evidence_sinks|evidence_paths" deploy/runtime-contract.dev.yaml deploy/.env.dev deploy/.env.test.example
bash -n bin/final-gate.sh
```

Expected:
- PASS

**Step 7: Commit**

```bash
git add .claude/skills/workflow-engine/tests/delivery_truth_guard.py .claude/skills/workflow-engine/tests/delivery_truth_guard_selftest.py .claude/skills/workflow-engine/tests/delivery_content_guard.py .claude/skills/workflow-engine/tests/delivery_content_guard_selftest.py .claude/skills/workflow-engine/tests/runtime_contract_guard.py .claude/skills/workflow-engine/tests/runtime_contract_guard_selftest.py .windsurf/workflows/next.md .windsurf/workflows/verify.md .claude/skills/deliver-ticket/SKILL.md .claude/skills/verification/SKILL.md bin/final-gate.sh .windsurf/workflows/final-closure.md deploy/runtime-contract.dev.yaml deploy/.env.dev deploy/.env.test.example docs/plans/2026-03-06-backend-runtime-contract-design.md docs/plans/2026-03-06-backend-runtime-contract-implementation-plan.md
git commit -m "feat: add truth and content delivery guards"
```

---

### Task 8: Extend critical UI evidence guard and Playwright evidence emitters

**Files:**
- Modify: `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py`
- Modify: `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
- Modify: `.windsurf/workflows/next.md`
- Modify: `.windsurf/workflows/verify.md`
- Modify: `.claude/skills/deliver-ticket/SKILL.md`
- Modify: `.claude/skills/verification/SKILL.md`
- Modify: `bin/ui-visual-gate.sh`
- Modify: `bin/final-gate.sh`

**Step 1: Extend self-tests and reconcile existing guard coverage**

Cover:
- critical surface still masked
- missing style/state evidence JSON fields
- complete evidence package passes

**Step 2: Run self-tests**

```bash
python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py
```

Expected:
- PASS when existing guard + self-tests cover:
  - critical surface still masked
  - missing style/state evidence JSON fields
  - complete evidence package
  - `next` stage structural validation without verify-only counters

**Step 3: Extend Playwright evidence**

Emit per critical surface:
- surface id
- style assertions passed/failed
- state cases executed/passed/failed
- mask policy applied/not applied
- baseline/actual/diff refs

**Step 4: Extend guard / emitter only if repo-backtrace shows missing evidence fields**

Validate emitted evidence against `critical_surfaces`, `style_contracts`, `state_contracts`, and `relation_contracts`.
If existing guard already satisfies the contract, do not fork or recreate it; only patch aggregation or emitted fields that are still missing.

**Step 5: Wire to process and gates**

Add the guard to:
- `.windsurf/workflows/next.md`
- `.claude/skills/deliver-ticket/SKILL.md`
- `.windsurf/workflows/verify.md`
- `.claude/skills/verification/SKILL.md`
- `bin/ui-visual-gate.sh`
- `bin/final-gate.sh`

**Step 6: Verify**

```bash
python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py
rg -n "ui_critical_evidence_guard|critical_surfaces|mask_allowed" .windsurf/workflows/next.md .windsurf/workflows/verify.md .claude/skills/deliver-ticket/SKILL.md .claude/skills/verification/SKILL.md
rg -n "ui_critical_evidence_guard|critical_surfaces|mask_allowed" bin/ui-visual-gate.sh bin/final-gate.sh
bash bin/ui-visual-gate.sh permission
```

Expected:
- PASS

**Step 7: Commit**

```bash
git add .claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py osg-frontend/tests/e2e/visual-contract.e2e.spec.ts .windsurf/workflows/next.md .windsurf/workflows/verify.md .claude/skills/deliver-ticket/SKILL.md .claude/skills/verification/SKILL.md bin/ui-visual-gate.sh bin/final-gate.sh
git commit -m "feat: enforce critical UI evidence"
```

---

### Task 9: Apply framework to permission canary and prove process-first blocking

**Files:**
- Modify: `ruoyi-framework/pom.xml`
- Modify: `ruoyi-framework/src/main/java/com/ruoyi/framework/web/service/SysPasswordService.java`
- Create: `ruoyi-framework/src/main/java/com/ruoyi/framework/config/PasswordResetMailConfig.java`
- Create: `ruoyi-framework/src/main/java/com/ruoyi/framework/web/service/PasswordResetMailSender.java`
- Modify: `ruoyi-admin/src/main/resources/application-docker.yml`
- Modify: `osg-frontend/packages/admin/src/views/login/index.vue`
- Modify: `osg-spec-docs/tasks/testing/permission-test-cases.yaml`
- Modify: `osg-spec-docs/tasks/testing/permission-traceability-matrix.md`
- Modify: relevant Story/Ticket YAML files if new contract-driven cases are generated

**Step 1: Write failing tests first**

Add/update tests so they fail if:
- forgot-password still uses fixed code instead of real delivery
- behavior contract leaks account enumeration
- mail content contract emits forbidden literals
- login captcha block still relies on mask or bad critical-surface styling

**Step 2: Run failing tests**

```bash
pnpm --dir osg-frontend exec playwright test tests/e2e/auth-login.e2e.spec.ts tests/e2e/forgot-password.e2e.spec.ts --project=chromium
mvn -pl ruoyi-framework -Dtest=SysPasswordServiceTest,PasswordResetMailSenderTest test
```

Expected:
- FAIL before canary changes

**Step 3: Apply framework-driven fixes**

Implement only what the new staged framework requires:
- real mail sender path
- anti-enumeration behavior
- content-safe outbound message body
- critical-surface-compliant login captcha block
- synchronized TC / matrix / verification stubs generated under the new flow

**Step 4: Re-run targeted tests and gates**

```bash
pnpm --dir osg-frontend exec playwright test tests/e2e/auth-login.e2e.spec.ts tests/e2e/forgot-password.e2e.spec.ts --project=chromium
bash bin/ui-visual-gate.sh permission
bash bin/final-gate.sh permission
```

Expected:
- targeted auth tests PASS
- login critical surface PASS
- final-gate moves through the new truth/content/UI/test-asset stages

**Step 5: Commit**

```bash
git add ruoyi-framework/pom.xml ruoyi-framework/src/main/java/com/ruoyi/framework/config/PasswordResetMailConfig.java ruoyi-framework/src/main/java/com/ruoyi/framework/web/service/PasswordResetMailSender.java ruoyi-framework/src/main/java/com/ruoyi/framework/web/service/SysPasswordService.java ruoyi-admin/src/main/resources/application-docker.yml osg-frontend/packages/admin/src/views/login/index.vue osg-spec-docs/tasks/testing/permission-test-cases.yaml osg-spec-docs/tasks/testing/permission-traceability-matrix.md
git commit -m "feat: apply truth contract hard gates to permission canary"
```

---

## Verification

Run in order:

```bash
python3 .claude/skills/workflow-engine/tests/delivery_contract_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/delivery_contract_guard.py --contract osg-spec-docs/docs/01-product/prd/permission/DELIVERY-CONTRACT.yaml
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard_style_state_test.py
python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py --contract osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml
python3 .claude/skills/workflow-engine/tests/requirements_coverage_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/story_ticket_coverage_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/behavior_contract_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/delivery_truth_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/delivery_content_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/runtime_contract_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/runtime_contract_guard.py --contract deploy/runtime-contract.dev.yaml
bash bin/check-skill-artifacts.sh prototype-extraction permission osg-spec-docs/docs/01-product/prd/permission
python3 .claude/skills/workflow-engine/tests/requirements_coverage_guard.py --module permission --mode requirements_to_stories
python3 .claude/skills/workflow-engine/tests/story_ticket_coverage_guard.py --story-id S-001
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module permission
rg -n "story_case|test skeleton|requirements_coverage_guard|contract_refs" .claude/skills/story-splitter/SKILL.md .windsurf/workflows/split-story.md
rg -n "test-cases|traceability|verification stub|story_ticket_coverage_guard|test_asset_completeness_guard" .claude/skills/ticket-splitter/SKILL.md .windsurf/workflows/split-ticket.md .windsurf/workflows/approve.md .windsurf/workflows/verify.md
rg -n "behavior_contract_guard|delivery_truth_guard|delivery_content_guard|ui_critical_evidence_guard" .windsurf/workflows/next.md .windsurf/workflows/verify.md .claude/skills/deliver-ticket/SKILL.md .claude/skills/verification/SKILL.md
rg -n "delivery_truth_guard|delivery_content_guard|ui_critical_evidence_guard|providers|evidence_sinks|evidence_paths" bin/final-gate.sh .windsurf/workflows/final-closure.md deploy/runtime-contract.dev.yaml deploy/.env.dev deploy/.env.test.example
bash bin/ui-visual-gate.sh permission
bash bin/final-gate.sh permission
```

Expected:
- all self-tests PASS
- contracts validate
- source-stage artifact gate PASS
- split-story / split-ticket generate and gate test assets
- verify blocks behavior/content/UI/test-asset regressions
- final-gate only acts as reverse-coverage backstop

## Execution Handoff

Plan complete and saved to `docs/plans/2026-03-07-truth-contract-hard-gates-implementation-plan.md`.

Recommended execution order:
1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7
8. Task 8
9. Task 9
