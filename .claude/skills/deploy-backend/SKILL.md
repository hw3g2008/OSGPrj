---
name: deploy-backend
description: "Deploy only the backend service to the test environment using backend-only mode. Use when you need to publish a fresh backend artifact without rebuilding or restarting frontend apps."
metadata:
  invoked-by: "command"
---

# Deploy Backend

## Overview

Use the repository's backend-only artifact deployment flow to publish the test backend while leaving all frontend containers untouched.

Keep the interface simple. The user should only need to provide the environment name:

```text
/deploy-backend test
```

Do not ask the user for the server IP in normal use. Read the environment host from the project machine-truth file:

- `.claude/project/config.yaml`

Read SSH connection details from the local operator file:

- `deploy/.env.remote.local`

## Supported Environments

Currently support only:

- `test`

If the user asks for `prod` or any other environment, stop and say this skill currently only supports `test`.

## Required Inputs

Collect only:

- environment name

Resolve the following automatically:

- remote IP → `environment_identity.remote_test_stack.host` in `.claude/project/config.yaml`
- SSH credentials → `deploy/.env.remote.local`

Do not ask for: remote IP, backend port, frontend app name.

## Workflow

1. Confirm the requested environment is `test`.
2. Read the test host from `.claude/project/config.yaml`:
   - `environment_identity.remote_test_stack.host`
3. Run from the repository root:

```bash
bash bin/deploy-test-artifacts.sh --host <resolved-test-host> --backend-only
```

4. Wait for the script to finish and confirm it exits successfully.
5. Verify backend health.

## Example

```text
/deploy-backend test
```

Resolves to:

```bash
bash bin/deploy-test-artifacts.sh --host 47.94.213.128 --backend-only
```

## Verification

```bash
curl -sS http://<host>:28080/actuator/health
```

Deployment is not complete unless the result is `"status":"UP"`.
