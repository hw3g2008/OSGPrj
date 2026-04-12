---
name: deploy-frontend
description: "Deploy a single frontend app to the test environment in frontend-only mode, reusing an already running backend. Use when you need to update one of: admin, student, mentor, lead-mentor, or assistant without touching the backend."
metadata:
  invoked-by: "command"
---

# Deploy Frontend

## Overview

Use the repository's existing artifact deployment script to deploy one frontend app at a time while reusing an already running backend.

```text
/deploy-frontend test admin
```

Resolve the remote host and backend base URL from:

- `.claude/project/config.yaml`
- `deploy/.env.remote.local`

## Supported Apps

- `admin`
- `student`
- `mentor`
- `lead-mentor`
- `assistant`

## Supported Environments

Only `test`. If the user asks for `prod`, stop and say this skill currently only supports `test`.

## Workflow

1. Confirm the requested environment is `test`.
2. Confirm the target app is one of the supported app names.
3. Resolve from `.claude/project/config.yaml`:
   - host → `environment_identity.remote_test_stack.host`
   - backend URL → `runtime_model.test.backend.base_url`
4. Run from the repository root:

```bash
bash bin/deploy-test-artifacts.sh \
  --host <host> \
  --frontend-app <app> \
  --frontend-only \
  --frontend-api-base <backend-url>
```

5. Confirm the script exits successfully.
6. Verify the frontend login page is reachable.

## Example

```text
/deploy-frontend test mentor
```

Resolves to:

```bash
bash bin/deploy-test-artifacts.sh \
  --host 47.94.213.128 \
  --frontend-app mentor \
  --frontend-only \
  --frontend-api-base http://47.94.213.128:28080
```

## App Ports

| App | Port |
|---|---|
| admin | 3005 |
| student | 3001 |
| mentor | 3002 |
| lead-mentor | 3003 |
| assistant | 3004 |

## Verification

```bash
curl -I http://<host>:<port>/login
```

Deployment is not complete unless the login page returns HTTP 200.
