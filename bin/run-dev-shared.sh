#!/usr/bin/env bash
set -euo pipefail

if [[ "${CONTEXT_PREFLIGHT_DONE:-0}" != "1" ]]; then
  bash bin/context-preflight.sh dev \
    --entrypoint run-dev-shared \
    --env-file deploy/.env.dev \
    --runtime-contract deploy/runtime-contract.dev.yaml
  export CONTEXT_PREFLIGHT_DONE=1
fi

bash bin/runtime-port-guard.sh --mode converge-runtime --target dev-local --context run-dev-shared >/dev/null

exec bash bin/run-backend-dev.sh deploy/.env.dev
