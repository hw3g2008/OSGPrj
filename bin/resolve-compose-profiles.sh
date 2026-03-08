#!/usr/bin/env bash
set -euo pipefail

ENV_NAME="${1:-test}"
PROFILE_CSV="${2:-deps}"
ENV_FILE="${3:-deploy/.env.${ENV_NAME}}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

shared_test_mode=false
if [[ "${ENV_NAME}" == "test" && "${TEST_DEPENDENCY_MODE:-isolated}" == "shared" ]]; then
  shared_test_mode=true
fi

resolved=()

add_profile() {
  local profile="$1"
  local existing
  [[ -z "${profile}" ]] && return 0
  for existing in "${resolved[@]:-}"; do
    if [[ "${existing}" == "${profile}" ]]; then
      return 0
    fi
  done
  resolved+=("${profile}")
}

IFS=',' read -r -a raw_profiles <<< "${PROFILE_CSV}"
for p in "${raw_profiles[@]}"; do
  p_trim="$(echo "${p}" | xargs)"
  [[ -z "${p_trim}" ]] && continue
  case "${p_trim}" in
    deps|core|frontends)
      if [[ "${p_trim}" == "core" && "${shared_test_mode}" != "true" ]]; then
        add_profile "deps"
      fi
      add_profile "${p_trim}"
      ;;
    *)
      echo "FAIL: unsupported profile ${p_trim}" >&2
      exit 1
      ;;
  esac
done

printf '%s\n' "${resolved[@]}"
