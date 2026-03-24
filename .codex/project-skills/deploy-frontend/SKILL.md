---
name: deploy-frontend
description: "Deploy a single frontend app for this repository by using the existing artifact deployment script in frontend-only mode. Use when Codex needs to deploy only one frontend app, reuse an already running backend, avoid rebuilding or restarting backend, and target one of: admin, student, mentor, lead-mentor, or assistant."
---

# Deploy Frontend

## Overview

Use the repository's existing artifact deployment script to deploy one frontend app at a time while reusing an already running backend. Keep the flow minimal: collect the required inputs, run the single-frontend deploy command from the repo root, then verify the frontend login page is reachable.

## Required Inputs

Collect only these values before running the deploy command:

- Environment name
- Frontend app name

For now the only supported environment is `test`, so normal use looks like:

```text
/deploy-frontend test lead-mentor
```

Resolve the remote host and backend base URL from:

- `.claude/project/config.yaml`
- `deploy/.env.remote.local`

## Supported Apps

Only use one app at a time:

- `admin`
- `student`
- `mentor`
- `lead-mentor`
- `assistant`

## Command Pattern

Run the deployment from the repository root with this exact pattern:

```bash
bash bin/deploy-test-artifacts.sh \
  --host <server> \
  --frontend-app <app> \
  --frontend-only \
  --frontend-api-base <backend-url>
```

Recommended example for mentor:

```bash
bash bin/deploy-test-artifacts.sh \
  --host 47.94.213.128 \
  --frontend-app mentor \
  --frontend-only \
  --frontend-api-base http://47.94.213.128:28080
```

## Workflow

1. Confirm the requested environment is `test`.
2. Confirm the target app is one of the supported app names.
3. Resolve the backend URL from `.claude/project/config.yaml` test runtime:
   - `runtime_model.test.backend.base_url`
3. Run the deploy command from the repository root.
4. Read the command output and ensure the script finishes without errors.
5. Verify the target frontend login page is reachable.

Do not use this skill for:

- full-stack deployment
- backend deployment
- restarting backend
- deploying multiple frontend apps in one command

## Verification

After deployment, run at least one reachability check for the deployed app:

```bash
curl -I http://<server>:<frontend-port>/login
```

Use the app's configured port:

- `admin`: `3005`
- `student`: `3001`
- `mentor`: `3002`
- `lead-mentor`: `3003`
- `assistant`: `3004`
