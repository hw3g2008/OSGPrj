# Project Machine Truth Memory Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `/.claude/project/config.yaml` the single machine-readable project memory entrypoint for environment identity, truth-source policy, workflow policy, and runtime contract references, while demoting prose docs to explanation-only indexes and enforcing that truth via a shared `context-preflight` entrypoint.

**Architecture:** Keep one machine truth file and align existing runtime contracts, deploy env files, and operator docs to it. Do not introduce a second truth source. Add only stable cross-workflow policy to config, create one thin human-readable index document that explicitly defers to machine truth, and add one executable `bin/context-preflight.sh` used by developer-facing entrypoints.

**Tech Stack:** YAML, Markdown, existing workflow-engine guards, deploy runtime contracts, Bash-based repo verification.

---

## Existing-Entrypoint Inventory

### Machine truth / runtime configuration
- `.claude/project/config.yaml`
- `deploy/runtime-contract.dev.yaml`
- `deploy/runtime-contract.test.yaml`
- `deploy/.env.dev`
- `deploy/.env.test`

### Human-readable operator docs
- `deploy/ENV-REQUIREMENTS.md`
- `deploy/SERVER-DEPLOY-CHECKLIST.md`
- `docs/一人公司框架/31_项目配置.md`

### Guards and workflows that depend on machine truth
- `.claude/skills/workflow-engine/tests/runtime_contract_guard.py`
- `.claude/skills/workflow-engine/tests/truth_sync_guard.py`
- `.claude/skills/workflow-engine/tests/prototype_derivation_consistency_guard.py`
- `bin/context-preflight.sh`
- `.windsurf/workflows/brainstorm.md`
- `.windsurf/workflows/approve.md`
- `.windsurf/workflows/split-story.md`
- `.windsurf/workflows/split-ticket.md`
- `.windsurf/workflows/verify.md`
- `bin/final-gate.sh`

## Guard Reuse / Collision Audit

- No new guard is needed.
- Existing guards already consume machine truth or should continue to do so.
- This task only clarifies and centralizes machine-readable policy in `config.yaml`, then aligns prose docs to that policy.
- Avoid adding any “memory guard” or second config file.

## Source-Stage Integration Path

- No new artifact is introduced.
- The earliest machine-readable declaration remains `/.claude/project/config.yaml`.
- Runtime contracts remain environment-specific referenced contracts, not competing truth sources.
- Human-readable memory doc is explanation-only and must point back to `config.yaml`.

## Stage-Regression Verification

Required proof before completion:
1. `config.yaml` contains explicit `runtime_model`, `environment_identity`, and `workflow_policy` blocks.
2. Runtime contracts and env files still match those declarations.
3. `bin/context-preflight.sh` can reconstruct and validate `dev` and `test` context directly from machine truth.
4. Human-readable docs explicitly defer to `config.yaml` and do not redefine conflicting rules.
5. Key human-facing entrypoints invoke `context-preflight.sh` before doing work.
6. Existing guards still parse and pass with the updated config.

### Task 1: Consolidate machine truth in `config.yaml`

**Files:**
- Modify: `.claude/project/config.yaml`

**Step 1: Add `runtime_model` section**

Define environment roles explicitly:
- `dev`: local app/backend + Aliyun shared MySQL/Redis
- `test`: Aliyun docker app/backend + Aliyun shared MySQL/Redis
- `prod`: reserved structure, values may remain placeholder if not yet live

**Step 2: Add `environment_identity` section**

Declare canonical hosts/ports and identity rules:
- local development backend: `127.0.0.1:28080`
- Aliyun shared deps: `47.94.213.128:23306` and `47.94.213.128:26379`
- remote test frontend ports: `3001-3005`
- explicit rule that local Docker state must not be treated as remote test truth

**Step 3: Add `workflow_policy` section**

Declare:
- normal project delivery uses project workflows
- `superpowers` is reserved for framework/process correction work
- `brainstorm/split-story/split-ticket/verify/final-gate` are the normal progression path

**Step 4: Validate YAML structure**

Run:
```bash
python3 - <<'PY'
from pathlib import Path
import yaml
p = Path('.claude/project/config.yaml')
data = yaml.safe_load(p.read_text(encoding='utf-8'))
assert 'runtime_model' in data
assert 'environment_identity' in data
assert 'workflow_policy' in data
assert data['prd_process']['truth_source']['single_source_of_truth'] is True
print('PASS')
PY
```
Expected: `PASS`

### Task 2: Implement machine-truth context preflight

**Files:**
- Create: `bin/context-preflight.sh`
- Create: `bin/context-preflight-selftest.sh`

**Step 1: Read machine truth, runtime contract, and env file**

The script must:
- accept `dev|test|prod`
- resolve default runtime contract and env file from `/.claude/project/config.yaml`
- allow explicit overrides for selftest and controlled scripts:
  - `--config`
  - `--runtime-contract`
  - `--env-file`
  - `--entrypoint`
  - `--remote-host`

**Step 2: Print one stable context summary**

The summary must include:
- target mode
- machine truth path
- runtime contract path
- env file path
- backend base URL
- MySQL host/port
- Redis host/port
- current Docker context if available
- an explicit statement that local Docker is not remote-test truth when `mode=test`

**Step 3: Validate fixed environment identity**

For `dev`, fail unless:
- runtime contract passes `runtime_contract_guard.py`
- env file exists
- backend port is `28080`
- MySQL target resolves to `47.94.213.128:23306`
- Redis target resolves to `47.94.213.128:26379`

For `test`, fail unless:
- runtime contract passes `runtime_contract_guard.py`
- env file exists
- `TEST_DEPENDENCY_MODE=shared`
- backend port is `28080`
- shared MySQL/Redis target resolves to `23306/26379`
- if `--remote-host` is provided, it matches configured Aliyun test host

For `prod`, keep validation conservative:
- config has a `prod` block
- env file exists when one is supplied

**Step 4: Add selftest**

Run:
```bash
bash bin/context-preflight-selftest.sh
```
Expected: `PASS: context-preflight-selftest`

### Task 3: Create one thin human-readable memory index

**Files:**
- Create: `docs/一人公司框架/32_项目机器真值.md`

**Step 1: Write the document as an index, not a second rule source**

The document must:
- state that `/.claude/project/config.yaml` is the only machine truth
- summarize dev/test/prod identity from config
- summarize truth-source and workflow boundary from config
- link to runtime contracts and env files as referenced artifacts
- explicitly say prose docs must not override `config.yaml`

**Step 2: Keep it short**

Target: one concise doc, easy to re-read, no duplicated business rules.

**Step 3: Verify it defers to config**

Run:
```bash
rg -n "唯一机器真值|config.yaml|不得覆盖|runtime-contract|环境身份|superpowers" docs/一人公司框架/32_项目机器真值.md
```
Expected: all key phrases are present.

### Task 4: Align existing operator docs to the machine truth entrypoint

**Files:**
- Modify: `deploy/ENV-REQUIREMENTS.md`
- Modify: `deploy/SERVER-DEPLOY-CHECKLIST.md`
- Modify: `docs/一人公司框架/31_项目配置.md`

**Step 1: Add explicit references to `config.yaml`**

Each doc must clearly say:
- `/.claude/project/config.yaml` is the canonical machine-readable source
- env/runtime docs are operational projections of that source

**Step 2: Remove or avoid any contradictory prose**

Do not restate rules in ways that could drift from config.
Use short references instead.

**Step 3: Verify consistency markers**

Run:
```bash
rg -n "config.yaml|唯一机器真值|machine truth|运行契约|环境身份" deploy/ENV-REQUIREMENTS.md deploy/SERVER-DEPLOY-CHECKLIST.md docs/一人公司框架/31_项目配置.md
```
Expected: each file references `config.yaml` as authoritative.

### Task 5: Wire key human-facing entrypoints to context preflight

**Files:**
- Modify: `bin/run-backend-dev.sh`
- Modify: `bin/run-dev-shared.sh`
- Modify: `bin/deploy-test-remote.sh`
- Modify: `bin/deploy-server-docker.sh`

**Step 1: Run preflight before real work**

Required entrypoint behavior:
- `run-backend-dev.sh` calls `context-preflight.sh dev`
- `run-dev-shared.sh` calls `context-preflight.sh dev`
- `deploy-test-remote.sh` calls `context-preflight.sh test --remote-host <resolved host>`
- `deploy-server-docker.sh test` calls `context-preflight.sh test`

`prod` may call `context-preflight.sh prod` with best-effort validation; it must not be forced to consume a non-existent prod runtime contract.

**Step 2: Keep existing specialized guards**

Do not remove:
- `runtime_contract_guard.py`
- `deploy-preflight.sh`
- `runtime-port-guard.sh`

`context-preflight.sh` is identity preflight, not a replacement for deployment/runtime/port guards.

**Step 3: Verify entrypoint wiring**

Run:
```bash
rg -n "context-preflight\\.sh" bin/run-backend-dev.sh bin/run-dev-shared.sh bin/deploy-test-remote.sh bin/deploy-server-docker.sh
```
Expected: each file is wired.

### Task 6: Run repo-backed consistency verification

**Files:**
- No file changes required unless verification fails

**Step 1: Verify runtime contracts still match config intent**

Run:
```bash
python3 - <<'PY'
from pathlib import Path
import yaml
cfg = yaml.safe_load(Path('.claude/project/config.yaml').read_text(encoding='utf-8'))
dev = yaml.safe_load(Path('deploy/runtime-contract.dev.yaml').read_text(encoding='utf-8'))
test = yaml.safe_load(Path('deploy/runtime-contract.test.yaml').read_text(encoding='utf-8'))
assert cfg['runtime_model']['dev']['backend']['port'] == dev['port']
assert cfg['runtime_model']['test']['backend']['port'] == test['port']
assert cfg['environment_identity']['shared_remote_deps']['mysql']['port'] == 23306
assert cfg['environment_identity']['shared_remote_deps']['redis']['port'] == 26379
print('PASS')
PY
```
Expected: `PASS`

**Step 2: Verify env files still match config intent**

Run:
```bash
python3 - <<'PY'
from pathlib import Path
cfg = Path('.claude/project/config.yaml').read_text(encoding='utf-8')
dev = Path('deploy/.env.dev').read_text(encoding='utf-8')
test = Path('deploy/.env.test').read_text(encoding='utf-8')
assert '47.94.213.128' in dev
assert '23306' in dev and '26379' in dev
assert 'TEST_DEPENDENCY_MODE=shared' in test
assert 'BACKEND_PORT=28080' in test
print('PASS')
PY
```
Expected: `PASS`

**Step 3: Verify existing guards still pass**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/runtime_contract_guard.py --contract deploy/runtime-contract.dev.yaml
python3 .claude/skills/workflow-engine/tests/truth_sync_guard.py --module permission
python3 .claude/skills/workflow-engine/tests/prototype_derivation_consistency_guard.py --module-dir osg-spec-docs/docs/01-product/prd/permission
bash bin/context-preflight.sh dev
bash bin/context-preflight.sh test --remote-host 47.94.213.128
bash bin/context-preflight-selftest.sh
```
Expected: all `PASS`

**Step 4: Commit**

```bash
git add .claude/project/config.yaml docs/一人公司框架/32_项目机器真值.md deploy/ENV-REQUIREMENTS.md deploy/SERVER-DEPLOY-CHECKLIST.md docs/一人公司框架/31_项目配置.md bin/context-preflight.sh bin/context-preflight-selftest.sh bin/run-backend-dev.sh bin/run-dev-shared.sh bin/deploy-test-remote.sh bin/deploy-server-docker.sh
git commit -m "docs: centralize project machine truth entrypoint"
```
