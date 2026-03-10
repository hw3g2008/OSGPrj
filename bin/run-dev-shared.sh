#!/usr/bin/env bash
set -euo pipefail

if [[ "${CONTEXT_PREFLIGHT_DONE:-0}" != "1" ]]; then
  bash bin/context-preflight.sh dev \
    --entrypoint run-dev-shared \
    --env-file deploy/.env.dev \
    --runtime-contract deploy/runtime-contract.dev.yaml
  export CONTEXT_PREFLIGHT_DONE=1
fi

exec bash bin/run-backend-dev.sh deploy/.env.dev
