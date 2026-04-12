---
name: deploy-full
description: "Deploy the full test stack: backend + all 5 frontend apps (admin, student, mentor, lead-mentor, assistant). Use when you need a complete environment refresh without specifying individual components."
metadata:
  invoked-by: "command"
---

# Deploy Full

## Overview

Full artifact deployment: backend plus all five frontend apps in one shot.

```text
/deploy-full test
```

Do not ask the user for the server IP. Read all environment details from:

- `.claude/project/config.yaml`
- `deploy/.env.remote.local`

## Supported Environments

Only `test`. If the user asks for `prod`, stop and say this skill currently only supports `test`.

## Workflow

1. Confirm the requested environment is `test`.
2. Read the test host from `.claude/project/config.yaml`:
   - `environment_identity.remote_test_stack.host`
3. Run from the repository root:

```bash
bash bin/deploy-test-artifacts.sh --host <resolved-test-host>
```

4. Wait for the script to finish and confirm it exits successfully.
5. Verify all services.

## Example

```text
/deploy-full test
```

Resolves to:

```bash
bash bin/deploy-test-artifacts.sh --host 47.94.213.128
```

## Verification

Run all checks after deployment:

```bash
curl -sS http://<host>:28080/actuator/health   # backend
curl -I http://<host>:3005/login               # admin
curl -I http://<host>:3001/login               # student
curl -I http://<host>:3002/login               # mentor
curl -I http://<host>:3003/login               # lead-mentor
curl -I http://<host>:3004/login               # assistant
```

Deployment is not complete unless backend health is `"status":"UP"` and all five login pages return HTTP 200.
