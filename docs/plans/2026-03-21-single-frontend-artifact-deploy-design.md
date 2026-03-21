# Single-Frontend Artifact Deploy Design

**Problem**

The current artifact-based `test` deployment path supports local builds and remote thin-image packaging, but it only works as an all-frontends deployment flow.

Today:

- `bin/deploy-test-artifacts.sh` always builds all five frontend apps
- the artifact bundle always includes all frontend `dist` trees
- the remote host always builds all frontend images
- the remote host always brings up the full frontend stack
- frontend runtime Nginx always proxies `/api` to `http://backend:8080`

That is too coarse for the next rollout step. We want to deploy a single frontend app first, while reusing an already-running shared backend on the server.

For this first iteration, "single frontend deploy" means:

- deploy one selected frontend app
- do not rebuild or restart backend
- let the deployed frontend point `/api` at an explicit existing backend base URL
- keep the current full-stack artifact flow intact for existing operators

**Decision**

Extend the existing artifact deployment path rather than creating a separate deployment script.

Add a new single-frontend mode to `bin/deploy-test-artifacts.sh`:

- `--frontend-app <admin|student|mentor|lead-mentor|assistant>`
- `--frontend-only`
- `--frontend-api-base <url>`

This mode will:

- locally build only the selected frontend package
- prepare an artifact bundle that only contains the selected frontend `dist`
- remotely build only that frontend image
- remotely update only that frontend service
- skip backend build and backend service restart
- inject a configurable `/api` proxy target into the frontend Nginx runtime

The existing full artifact deployment flow remains the default when these new flags are absent.

**Non-Goals**

- No support for deploying multiple frontend apps in one command
- No automatic discovery of the remote backend URL
- No change to backend deployment logic beyond skipping it in frontend-only mode
- No change to business code
- No automatic rollback orchestration

## Architecture

### Deployment Modes

The script will support two modes:

1. **Full artifact mode**
   - default behavior
   - builds backend jar
   - builds all frontend packages
   - packages all runtime artifacts
   - remotely builds all images
   - remotely starts the full stack

2. **Single-frontend artifact mode**
   - enabled by `--frontend-app ... --frontend-only`
   - builds one frontend package only
   - packages one frontend `dist`
   - remotely builds one frontend image only
   - remotely updates one frontend service only
   - expects backend to already exist and be reachable from the frontend container

### Frontend Runtime Proxy Strategy

The artifact frontend image will stop hard-coding `proxy_pass http://backend:8080/`.

Instead:

- the shipped Nginx config becomes a template
- the container entrypoint renders the template using `API_PROXY_TARGET`
- the default remains `http://backend:8080`

This keeps full-stack behavior unchanged while allowing a single deployed frontend to point to any existing backend base URL.

### Bundle Strategy

The artifact bundle should only contain what the selected mode needs.

In full mode:

- backend artifact files
- all frontend `dist` trees
- deployment templates
- compose file
- image env file

In single-frontend mode:

- only the selected frontend `dist`
- frontend deployment templates
- compose file
- image env file

The bundle must not require unrelated frontend `dist` directories to exist.

### Remote Runtime Strategy

In full mode, the remote behavior remains unchanged:

- build backend image
- build all frontend images
- `docker compose up -d --force-recreate --remove-orphans`

In single-frontend mode:

- build only the selected frontend image
- run `docker compose up -d --force-recreate <selected-service>`
- do not bring `backend` down or up
- do not touch unrelated frontend services

## CLI Design

New flags:

- `--frontend-app <app>`
  - valid values: `admin`, `student`, `mentor`, `lead-mentor`, `assistant`
- `--frontend-only`
  - requires `--frontend-app`
- `--frontend-api-base <url>`
  - optional in full mode
  - in frontend-only mode it becomes the explicit runtime proxy target
  - default remains `http://backend:8080`

Examples:

```bash
# existing full flow
bash bin/deploy-test-artifacts.sh --host <server>

# single frontend deploy
bash bin/deploy-test-artifacts.sh \
  --host <server> \
  --frontend-app mentor \
  --frontend-only \
  --frontend-api-base http://47.94.213.128:28080
```

## File Changes

Primary files:

- `bin/deploy-test-artifacts.sh`
- `deploy/compose.test.artifact.yml`
- `deploy/frontend/nginx.conf`
- `deploy/frontend/Dockerfile.artifact`

New file:

- `deploy/frontend/docker-entrypoint.sh`

Test coverage:

- extend `bin/deploy-test-artifacts-selftest.sh`

## Compatibility

- Existing full-stack artifact deploy commands must keep working unchanged.
- Existing `deploy/compose.test.artifact.yml` must still render successfully in full mode.
- Existing frontend images must keep using the same static-file layout.
- Existing full deploy default proxy target remains `http://backend:8080`.

## Failure Handling

- Invalid `--frontend-app` value fails fast
- `--frontend-only` without `--frontend-app` fails fast
- missing selected frontend `dist` fails fast
- missing backend image is allowed in frontend-only mode because backend is out of scope
- missing `API_PROXY_TARGET` falls back to default

## Rollback

Single-frontend rollback is intentionally simple:

- keep previous frontend image tags on the server
- rerun the compose update for the selected service with the prior tag

Because backend and data stores are untouched in this mode, rollback remains limited to the selected frontend artifact version.

## Verification

This change is only complete with fresh evidence for:

1. existing self-test still passes
2. compose render still works in default mode
3. frontend runtime proxy template renders with a custom `API_PROXY_TARGET`
4. single-frontend bundle mode includes only the selected app
5. mentor frontend still builds with `vite build`
6. mentor frontend tests still pass

## Why This Shape

This is the smallest useful generalization of the current deployment path.

- It preserves the proven artifact-deploy structure.
- It avoids maintaining a second deployment script.
- It gives operators a clean first step: deploy one frontend app without touching backend.
- It keeps future extension straightforward if we later add multi-app selective deploys.
