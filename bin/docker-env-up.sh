#!/usr/bin/env bash
set -euo pipefail

ENV_NAME="${1:-test}"
shift || true
PROFILE_CSV="deps"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      PROFILE_CSV="${2:-}"
      shift 2
      ;;
    --profile=*)
      PROFILE_CSV="${1#*=}"
      shift
      ;;
    *)
      echo "FAIL: 未识别参数 $1" >&2
      exit 1
      ;;
  esac
done

ENV_FILE="deploy/.env.${ENV_NAME}"
if [[ ! -f "${ENV_FILE}" ]]; then
  ENV_FILE="deploy/.env.${ENV_NAME}.example"
fi

bash bin/deploy-preflight.sh "${ENV_NAME}" --profile "${PROFILE_CSV}"

PROFILE_ARGS=()
IFS=',' read -r -a profiles <<< "${PROFILE_CSV}"
for p in "${profiles[@]}"; do
  p_trim="$(echo "${p}" | xargs)"
  [[ -z "${p_trim}" ]] && continue
  PROFILE_ARGS+=(--profile "${p_trim}")
done

docker compose \
  -f deploy/compose.base.yml \
  -f "deploy/compose.${ENV_NAME}.yml" \
  --env-file "${ENV_FILE}" \
  "${PROFILE_ARGS[@]}" up -d
