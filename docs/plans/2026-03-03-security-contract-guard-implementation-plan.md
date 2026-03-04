# Security Contract Guard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

Date: 2026-03-03  
Status: Completed (Validated on 2026-03-03)  
Owner: workflow-framework  
Design Doc: `docs/plans/2026-03-03-security-contract-guard-design.md`

**Goal:** Build a cross-project security contract guard for Spring Boot + Vue that blocks unresolved/contradictory security intent at brainstorm and final-gate.

**Architecture:** Introduce a project-level contract source (`contracts/security-contract.yaml`), generate/refresh it via code scanning (`security_contract_init.py`), and enforce it through a guard (`security_contract_guard.py`) at two gates (`/brainstorm` and `final-gate`). Keep business logic in app code; framework only validates declared intent vs implementation.

**Tech Stack:** Python 3 (guard scripts), Bash (gate integration), Spring Boot endpoint/security metadata parsing, Vue API route scanning.

---

## Execution Snapshot (2026-03-03)

Completed and verified:
1. Contract source and schema validator are present (`contracts/security-contract.yaml`, `security_contract_schema.py`).
2. Initializer and guard are present (`security_contract_init.py`, `security_contract_guard.py`).
3. Self-tests and schema/init tests pass.
4. `final-gate` and `final-closure` include security contract audit fields and checks.

Verification commands (latest run):
1. `python3 .claude/skills/workflow-engine/tests/security_contract_schema_test.py` -> PASS
2. `python3 .claude/skills/workflow-engine/tests/security_contract_init_test.py` -> PASS
3. `python3 .claude/skills/workflow-engine/tests/security_contract_guard_selftest.py` -> PASS
4. `bash bin/final-closure.sh permission --cc-mode off` -> PASS

---

## Task 1: Define Contract Schema and Seed Source

**Files:**
- Create: `contracts/security-contract.yaml`
- Create: `.claude/skills/workflow-engine/tests/security_contract_schema.py`
- Test: `.claude/skills/workflow-engine/tests/security_contract_schema_test.py`

**Step 1: Write failing schema test**

```python
def test_contract_requires_schema_version_and_endpoints():
    # load sample contract
    # assert required root keys and endpoint required fields
    # expect validation error when auth_mode missing
    ...
```

**Step 2: Run test to verify fail**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/security_contract_schema_test.py
```

Expected: FAIL with missing validator/module.

**Step 3: Implement schema validator**

```python
REQUIRED_ROOT = {"schema_version", "project_type", "endpoints"}
REQUIRED_ENDPOINT = {"id", "method", "path", "auth_mode", "decision_required"}
```

Implement strict enum checks and uniqueness for `method+path`.

**Step 4: Add initial contract seed**

Create `contracts/security-contract.yaml` with:
- `schema_version: 1`
- `project_type: springboot-vue`
- at least one endpoint entry for password reset flow.

**Step 5: Re-run schema test**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/security_contract_schema_test.py
```

Expected: PASS.

**Step 6: Commit**

```bash
git add contracts/security-contract.yaml \
  .claude/skills/workflow-engine/tests/security_contract_schema.py \
  .claude/skills/workflow-engine/tests/security_contract_schema_test.py
git commit -m "feat: add security contract schema and seed file"
```

---

## Task 2: Build Spring Boot + Vue Contract Initializer

**Files:**
- Create: `.claude/skills/workflow-engine/tests/security_contract_init.py`
- Test: `.claude/skills/workflow-engine/tests/security_contract_init_test.py`
- Reference: `ruoyi-framework/src/main/java/com/ruoyi/framework/config/SecurityConfig.java`
- Reference: `ruoyi-admin/src/main/java/**/controller/**/*.java`
- Reference: `osg-frontend/packages/**/src/api/**/*.ts`

**Step 1: Write failing init test**

Test should assert:
1. controller mappings produce endpoint entries
2. anonymous sources (`@Anonymous` or `permitAll`) are detected
3. unresolved endpoints are marked `decision_required=true`.

**Step 2: Run failing test**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/security_contract_init_test.py
```

Expected: FAIL.

**Step 3: Implement minimal parser**

Implement:
1. Java controller mapping extraction
2. security whitelist extraction from `SecurityConfig.java`
3. simple Vue API path extraction for mismatch hints.

**Step 4: Implement `--mode sync`**

`sync` behavior:
1. read existing `contracts/security-contract.yaml`
2. merge discovered endpoints
3. preserve manually adjudicated fields
4. mark unknowns as `decision_required=true`.

**Step 5: Re-run init tests**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/security_contract_init_test.py
```

Expected: PASS.

**Step 6: Commit**

```bash
git add .claude/skills/workflow-engine/tests/security_contract_init.py \
  .claude/skills/workflow-engine/tests/security_contract_init_test.py
git commit -m "feat: add security contract initializer for springboot-vue"
```

---

## Task 3: Implement Contract Guard (Fail-Closed)

**Files:**
- Create: `.claude/skills/workflow-engine/tests/security_contract_guard.py`
- Create: `.claude/skills/workflow-engine/tests/security_contract_guard_selftest.py`
- Modify: `.claude/skills/workflow-engine/tests/story_integration_assertions.py`

**Step 1: Write failing guard selftest**

Selftest cases:
1. missing contract entry -> fail
2. unresolved decision -> fail
3. auth drift -> fail
4. clean case -> pass.

**Step 2: Run selftest (expect fail first)**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/security_contract_guard_selftest.py
```

Expected: FAIL before implementation.

**Step 3: Implement guard classifications**

Output classes:
1. `missing_contract_entry`
2. `auth_mode_drift`
3. `rate_limit_drift`
4. `anti_enumeration_drift`
5. `decision_required_unresolved`

Exit behavior:
- any finding -> non-zero
- clean -> zero

**Step 4: Add integration assertion hook**

Update `story_integration_assertions.py` expected script list to include:
- `security_contract_guard.py`

**Step 5: Re-run selftest**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/security_contract_guard_selftest.py
```

Expected: PASS.

**Step 6: Commit**

```bash
git add .claude/skills/workflow-engine/tests/security_contract_guard.py \
  .claude/skills/workflow-engine/tests/security_contract_guard_selftest.py \
  .claude/skills/workflow-engine/tests/story_integration_assertions.py
git commit -m "feat: add fail-closed security contract guard"
```

---

## Task 4: Integrate Guard into Final Gate

**Files:**
- Modify: `bin/final-gate.sh`
- Modify: `bin/final-closure.sh`
- Modify: `.windsurf/workflows/final-closure.md`

**Step 1: Insert guard step in final-gate fixed order**

Add after login lock precheck and before captcha baseline:
```bash
python3 .claude/skills/workflow-engine/tests/security_contract_guard.py \
  --contract contracts/security-contract.yaml \
  --stage final-gate \
  --audit "osg-spec-docs/tasks/audit/security-contract-${MODULE}-${DATE_STR}.md"
```

**Step 2: Apply exit semantics**

On guard failure:
- print first finding line
- `exit 12`.

**Step 3: Extend final-closure artifact checks**

Require:
- security contract audit file exists
- report fields:
  - `security_contract_log`
  - `security_first_failure_evidence`

Missing -> `EXIT 15`.

**Step 4: Update workflow doc**

Reflect new mandatory gate step and report fields in `.windsurf/workflows/final-closure.md`.

**Step 5: Validate gate script behavior**

Run:
```bash
bash bin/final-gate.sh permission
```

Expected:
- contract drift/unresolved -> EXIT 12
- clean -> continue to next steps.

**Step 6: Commit**

```bash
git add bin/final-gate.sh bin/final-closure.sh .windsurf/workflows/final-closure.md
git commit -m "feat: enforce security contract guard in final gate"
```

---

## Task 5: Integrate Guard into Brainstorm Flow

**Files:**
- Modify: `.windsurf/workflows/brainstorm.md`
- Modify: `.claude/skills/brainstorming/SKILL.md`
- Modify: `bin/check-skill-artifacts.sh`

**Step 1: Add brainstorm stage invocation**

At brainstorm early stage:
```bash
python3 .claude/skills/workflow-engine/tests/security_contract_init.py --mode sync
python3 .claude/skills/workflow-engine/tests/security_contract_guard.py --stage brainstorm
```

**Step 2: Define fail-closed behavior**

If unresolved/drift exists:
1. write findings to decisions log
2. stop brainstorm progression.

**Step 3: Add artifact check**

`bin/check-skill-artifacts.sh` verifies:
- `contracts/security-contract.yaml` exists
- schema valid.

**Step 4: Validate brainstorm doc consistency**

Run:
```bash
rg -n "security_contract_(init|guard)|contracts/security-contract.yaml" \
  .windsurf/workflows/brainstorm.md .claude/skills/brainstorming/SKILL.md bin/check-skill-artifacts.sh
```

Expected: all three files include consistent references.

**Step 5: Commit**

```bash
git add .windsurf/workflows/brainstorm.md .claude/skills/brainstorming/SKILL.md bin/check-skill-artifacts.sh
git commit -m "feat: add security contract checks to brainstorm gate"
```

---

## Task 6: End-to-End Verification and Regression

**Files:**
- Modify: `docs/plans/2026-03-02-e2e-framework-anti-false-green-fix-plan.md`
- Create: `osg-spec-docs/tasks/audit/security-contract-verification-{date}.md`

**Step 1: Run static guards**

```bash
python3 .claude/skills/workflow-engine/tests/security_contract_schema_test.py
python3 .claude/skills/workflow-engine/tests/security_contract_init_test.py
python3 .claude/skills/workflow-engine/tests/security_contract_guard_selftest.py
python3 .claude/skills/workflow-engine/tests/e2e_api_guard.py --tests-dir osg-frontend/tests/e2e
```

Expected: all PASS.

**Step 2: Run gate path**

```bash
bash bin/final-gate.sh permission
bash bin/final-closure.sh permission --cc-mode optional
```

Expected:
1. no unresolved contract -> proceed
2. report contains security fields
3. missing security audit file path triggers EXIT 15 (negative test).

**Step 3: Record verification evidence**

Write audit summary with:
1. executed commands
2. exit codes
3. first failure evidence extraction proof.

**Step 4: Update plan status**

Mark implemented sections and unresolved follow-ups in plan doc.

**Step 5: Final commit**

```bash
git add docs/plans/2026-03-02-e2e-framework-anti-false-green-fix-plan.md \
  osg-spec-docs/tasks/audit/security-contract-verification-*.md
git commit -m "chore: verify security contract guard end-to-end"
```

---

## Notes

1. YAGNI:
   - v1 only supports Spring Boot + Vue.
   - no dynamic runtime instrumentation beyond current gates.
2. DRY:
   - single contract source at `contracts/security-contract.yaml`.
3. TDD:
   - schema/init/guard all start with failing tests.
4. Compatibility:
   - do not introduce new exit codes; reuse existing `12` and `15`.

---

Plan complete and saved to `docs/plans/2026-03-03-security-contract-guard-implementation-plan.md`.

Two execution options:

1. Subagent-Driven (this session) — I dispatch fresh subagent per task, review between tasks, fast iteration.
2. Parallel Session (separate) — Open new session with executing-plans, batch execution with checkpoints.

Which approach?
