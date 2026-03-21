---
name: deploy-full
description: "Deploy the full test stack for this repository by using the existing artifact deployment script. Use when Codex needs to publish backend plus all frontend apps to the test environment without asking the user for IP addresses."
---

# Deploy Full

## Overview

Use the repository's full artifact deployment flow to publish the test stack: backend, admin, student, mentor, lead-mentor, and assistant.

Keep the interface simple. The user should only need to provide the environment name, for example:

```text
/deploy-full test
```

Do not ask the user for the server IP in normal use. Read the environment host and ports from the project machine-truth file:

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
- backend URL
- frontend ports

Resolve those from:

- `.claude/project/config.yaml`
- `deploy/.env.remote.local`

## Workflow

1. Confirm the requested environment is `test`.
2. Read the test host from `.claude/project/config.yaml`:
   - `environment_identity.remote_test_stack.host`
3. Use the existing test full deployment script from the repository root:

```bash
bash bin/deploy-test-artifacts.sh --host <resolved-test-host>
```

4. Wait for the script to finish and confirm it exits successfully.
5. Run external checks against the resolved test host.

## Recommended Example

If the user says:

```text
/deploy-full test
```

resolve the host from `.claude/project/config.yaml` and then run:

```bash
bash bin/deploy-test-artifacts.sh --host 47.94.213.128
```

## Verification

After deployment, verify all of these against the resolved test host:

```bash
curl -sS http://<host>:28080/actuator/health
curl -I http://<host>:3005/login
curl -I http://<host>:3001/login
curl -I http://<host>:3002/login
curl -I http://<host>:3003/login
curl -I http://<host>:3004/login
```

The deployment is not complete unless backend health is `UP` and all five frontend login pages are reachable.
