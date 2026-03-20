# Local-Build Artifact Test Deploy Design

**Problem**

The current `test` deployment flow is close to the desired target but still violates the operator requirement for this rollout: all code compilation must happen on the local machine, and the Aliyun test host should only receive finished artifacts before starting containers from those artifacts.

Today:

- backend already fits the model reasonably well because `ruoyi-admin.jar` is built locally before sync
- frontend does not fit because `deploy/frontend/Dockerfile.prod` still runs `pnpm install` and `vite build` during image build
- the existing remote deployment flow also assumes the remote host can build business images from synced source
- the local machine does not have a usable Docker daemon, so any new deployment path must avoid local Docker entirely

For this test release, that is the wrong boundary. We need a deployment path that preserves the current shared-deps `test` topology while removing remote code compilation and keeping Docker off the local machine.

**Decision**

Add one new, explicit `test` deployment path that builds business artifacts locally, ships those artifacts to Aliyun, builds thin runtime images there, and starts the stack there with Compose.

The existing default path remains unchanged for now.

The new path will:

- keep the machine-truth `test` identity from `/.claude/project/config.yaml`
- keep `test` shared dependencies unchanged:
  - MySQL on `47.94.213.128:23306`
  - Redis on `47.94.213.128:26379`
- build these artifacts locally:
  - `ruoyi-admin/target/ruoyi-admin.jar`
  - frontend `dist` for `admin`, `student`, `mentor`, `lead-mentor`, `assistant`
- upload those artifacts plus minimal deployment files to `/opt/OSGPrj/.deploy-artifacts/<release-tag>/`
- build thin runtime images on the remote host from the uploaded artifacts
- start them via `docker compose`

**Non-Goals**

- No change to the default `bin/deploy-test-remote.sh` workflow in this iteration
- No change to the test environment topology or ports
- No remote `mvn` or remote `pnpm build`
- No local Docker image build or `docker save`
- No automatic rollback orchestration in the first rollout

## Architecture

### Local Build Boundary

Local build becomes the only place where code compilation happens:

- backend build: Maven package generates `ruoyi-admin.jar`
- frontend dependency install: the deploy script bootstraps a local Node 20 runtime under `.local/tools/` when the host Node is incompatible with the pinned frontend toolchain
- frontend build: workspace commands generate each package `dist`
- frontend bundling uses direct `vite build` for this rollout path because some package `build` scripts prepend `vue-tsc`, which is currently incompatible with the local toolchain

This preserves Docker as the runtime unit while moving all code compilation off the server and keeping Docker off the local machine.

### Remote Runtime Boundary

The remote host only performs packaging and runtime operations:

- receive uploaded files
- run thin `docker build` steps that only package the uploaded `jar` and `dist` artifacts
- stop the old business stack
- start the new business stack with the existing `test` env file, a generated image-tag env file, and a dedicated artifact runtime Compose file
- run health checks

### Compose Strategy

Do not mutate the existing default `test` Compose chain for this trial flow.

Instead, add one dedicated artifact runtime file:

- `deploy/compose.test.artifact.yml`

It explicitly describes the six business services for the shared-deps `test` runtime and uses fixed `image:` references. It contains no business `build:` directives, so Compose cannot accidentally rebuild from source.

The deployment script passes both `.env.test` and `artifact-images.env` to Compose explicitly with `--env-file`, which keeps operational commands reproducible.

## Image Strategy

Each runtime image gets a deterministic deployment tag, for example a timestamp-based release tag.

The deployment script will render image references for:

- `osg-test-artifact-backend:<tag>`
- `osg-test-artifact-admin:<tag>`
- `osg-test-artifact-student:<tag>`
- `osg-test-artifact-mentor:<tag>`
- `osg-test-artifact-lead-mentor:<tag>`
- `osg-test-artifact-assistant:<tag>`

The remote thin-image build and the artifact Compose file both use the same tag so the remote start command is explicit and reproducible.

## Dockerfile Strategy

Backend uses a dedicated artifact Dockerfile that copies the local `jar` into a runtime image without Maven.

Frontend uses a dedicated artifact-oriented Dockerfile:

- it must not run `pnpm install`
- it must not run `vite build`
- it must copy a prebuilt package `dist` directory into Nginx

Those Dockerfiles only package already-built artifacts into runtime images.

## Execution Flow

1. Run `context-preflight.sh test` against the declared Aliyun host.
2. Build backend jar locally.
3. Build all five frontend packages locally.
4. Prepare one artifact bundle containing the backend `jar`, five frontend `dist` trees, artifact Dockerfiles, Compose file, and rendered image-tag env file.
5. Upload the bundle to `/opt/OSGPrj/.deploy-artifacts/<release-tag>/`.
6. On Aliyun:
   - extract the bundle
   - build six thin runtime images from those uploaded artifacts
   - bring down the old business stack if present
   - bring up the stack with `deploy/compose.test.artifact.yml`
7. Verify backend and admin readiness, then verify all expected containers are up.

## Failure Handling

- Any local build failure stops the flow before upload.
- Any remote image build or compose failure stops immediately and prints diagnostic output.
- Health-check failure prints container status and relevant logs, then exits non-zero.
- Uploaded bundles are left in place for debugging; the first rollout favors recoverability over aggressive cleanup.

## Rollback

Automatic rollback is intentionally out of scope for the first rollout.

Operationally, rollback will rely on:

- keeping previously built image tags available on the server
- re-running the remote `docker compose up` with the prior tag when needed

This keeps the first implementation simple while still allowing a controlled manual revert.

## Verification

This flow must not be called successful without fresh evidence for:

1. local backend build success
2. local frontend build success for all five apps
3. successful remote thin-image `docker build`
4. successful remote `docker compose up -d`
5. backend health at `http://127.0.0.1:28080/actuator/health`
6. admin readiness at `http://127.0.0.1:3005/login`
7. expected service presence in `docker compose ps`

## Why This Shape

This is the smallest change that actually satisfies the operator requirement.

- It preserves the current `test` runtime contract.
- It does not depend on remote source builds or any local Docker daemon.
- It does not rewrite the existing deployment chain before the new path is proven.
- If it works well in practice, the same artifact-based approach can later replace the default `test` deployment path cleanly.
