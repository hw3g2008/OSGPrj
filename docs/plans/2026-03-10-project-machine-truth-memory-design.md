# Project Machine Truth Memory Design

**Problem**

The repository already has a strong machine-readable policy core in `/.claude/project/config.yaml`, plus environment-specific runtime contracts and operator docs. The remaining failure mode is execution drift: a new window, a new machine, or a tired operator can still run the right command against the wrong environment because the project does not yet enforce a single context preflight before developer-facing entrypoints.

This is not a second-truth problem. The machine truth already exists. The gap is that the machine truth is not yet used as a mandatory execution gate for the most common human-invoked commands.

**Decision**

Keep `/.claude/project/config.yaml` as the single machine-readable project truth. Do not introduce a second memory file. Add one new enforcement layer:

- a single `bin/context-preflight.sh` that reads `config.yaml` plus the referenced runtime contract and env file
- a small number of human-facing entrypoints that call `context-preflight.sh` before doing work

This keeps the architecture simple:

- `config.yaml` = policy truth
- `runtime-contract.*.yaml` = environment contract projections
- `.env.*` = environment values
- prose docs = explanation only
- `context-preflight.sh` = execution guard against human/environment drift

**Non-Goals**

- No new guard family beyond context preflight
- No second truth source
- No migration of all scripts to a new wrapper layer
- No business logic changes

## Why This Is The Right Shape

### Single Machine Truth, Not Memory By Prose

The failure mode we want to eliminate is not "lack of documentation". It is "correct documentation, but humans still run commands in the wrong context". The answer is to make context validation executable, not to add more prose.

### Fixed Environment Identity

The project has already converged on a stable environment model:

- `dev` = local backend/frontends + Aliyun shared MySQL/Redis
- `test` = Aliyun Docker backend/frontends + Aliyun shared MySQL/Redis

That model is stable enough to enforce. The preflight should refuse to proceed when the active command contradicts that model.

### Smallest Useful Enforcement Surface

We do not need to wire every shell script in the repository. The useful first-order enforcement surface is the set of scripts most likely to be invoked directly by a human or a fresh session:

- `bin/run-backend-dev.sh`
- `bin/run-dev-shared.sh`
- `bin/deploy-test-remote.sh`
- `bin/deploy-server-docker.sh`

If these commands always print and validate context before execution, a new window or new machine can rehydrate the project model from code instead of guessing.

## Context Preflight Contract

`bin/context-preflight.sh` should provide two things:

1. **Context summary**
   - target mode (`dev` or `test`)
   - machine truth file path
   - runtime contract file path
   - env file path
   - backend base URL
   - MySQL / Redis target host and port
   - explicit statement whether local Docker may be used as truth for this mode

2. **Hard validation**
   - runtime contract exists and passes `runtime_contract_guard.py`
   - `config.yaml` contains the required environment identity for the requested mode
   - env file exists
   - env file values match the declared model where the project treats them as fixed
   - for `dev`, remote deps must resolve to `47.94.213.128:23306` and `47.94.213.128:26379`
   - for `test`, runtime contract mode must be `docker-backend-shared-deps`
   - if the active Docker context is clearly local-only (`desktop-linux`) during a remote-test deployment flow, fail fast unless the command is explicitly local

This is not a deployment preflight replacement. It is a **project identity preflight**.

## Entrypoint Policy

The preflight should be required at these entrypoints:

- `run-backend-dev`
- `run-dev-shared`
- `deploy-test-remote`
- `deploy-server-docker`

Behavior:

- each script runs `context-preflight.sh` first
- preflight prints the machine-truth summary
- on mismatch, the script exits before doing work

This prevents a new session from silently using the wrong database, the wrong redis, the wrong runtime contract, or the wrong execution identity.

## Documentation Policy

The project already has:

- `docs/一人公司框架/32_项目机器真值.md`
- `deploy/ENV-REQUIREMENTS.md`
- `deploy/SERVER-DEPLOY-CHECKLIST.md`

These should remain explanation-only. They should reference:

- `/.claude/project/config.yaml`
- `bin/context-preflight.sh`

and explicitly instruct operators to run preflight before major commands.

## Verification Strategy

This change is only useful if it is verified in the same way a new session would use it.

Required verification:

1. direct preflight for `dev`
2. direct preflight for `test`
3. `run-backend-dev --check-only` still works, but now emits/uses context preflight
4. `deploy-test-remote` and `deploy-server-docker` parse and call preflight without syntax errors
5. docs and config remain aligned

## Expected Outcome

After this change:

- a new window can reconstruct the project environment model from `config.yaml` and `context-preflight.sh`
- a new machine that has the repo can run the same preflight and see the same truth
- the most common environment mistakes stop before real work begins
- the project stays single-truth and does not gain a second memory system
