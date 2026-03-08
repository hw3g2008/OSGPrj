#!/usr/bin/env bash
set -euo pipefail

ENV_NAME="${1:-test}"
shift || true
PROFILE_CSV="core"

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

PROFILE_ARGS=()
while IFS= read -r profile; do
  [[ -z "${profile}" ]] && continue
  PROFILE_ARGS+=(--profile "${profile}")
done < <(bash bin/resolve-compose-profiles.sh "${ENV_NAME}" "${PROFILE_CSV}" "${ENV_FILE}")

docker compose \
  -f deploy/compose.base.yml \
  -f "deploy/compose.${ENV_NAME}.yml" \
  --env-file "${ENV_FILE}" \
  "${PROFILE_ARGS[@]}" logs -f
