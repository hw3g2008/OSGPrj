---
name: deploy-backend
description: "Deploy only the backend service for this repository by using the existing artifact deployment script in backend-only mode. Use when Codex needs to publish a fresh backend artifact to the shared test environment without rebuilding or restarting frontend apps."
---

# Deploy Backend

## Overview

Use the repository's backend-only artifact deployment flow to publish the test backend while leaving all frontend containers untouched.

Keep the interface simple. The user should only need to provide the environment name, for example:

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

For now that means the user says `test`.

Do not ask for:

- remote IP
- backend port
- frontend app name

Resolve those from:

- `.claude/project/config.yaml`
- `deploy/.env.remote.local`

## Workflow

1. Confirm the requested environment is `test`.
2. Read the test host from `.claude/project/config.yaml`:
   - `environment_identity.remote_test_stack.host`
3. Use the existing backend-only artifact deployment command from the repository root:

```bash
bash bin/deploy-test-artifacts.sh --host <resolved-test-host> --backend-only
```

4. Wait for the script to finish and confirm it exits successfully.
5. Run an external backend health check against the resolved test host.

## Recommended Example

If the user says:

```text
/deploy-backend test
```

resolve the host from `.claude/project/config.yaml` and then run:

```bash
bash bin/deploy-test-artifacts.sh --host 47.94.213.128 --backend-only
```

## Verification

After deployment, verify backend health against the resolved test host:

```bash
curl -sS http://<host>:28080/actuator/health
```

The deployment is not complete unless the backend health result is `UP`.
