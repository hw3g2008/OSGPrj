#!/usr/bin/env bash
# E2E API Gate
# 用法:
#   bash bin/e2e-api-gate.sh [module] [mode]
# mode:
#   full    -> pnpm test:e2e
#   api     -> pnpm test:e2e:api
#   ui-only -> pnpm test:e2e:ui-only
set -euo pipefail

MODULE="${1:-permission}"
MODE="${2:-full}"
BACKEND_PORT="${BACKEND_PORT:-28080}"
HEALTH_PATH="${HEALTH_PATH:-/actuator/health}"
BASE_URL="${BASE_URL:-}"
BASE_HEALTH_URL="${BASE_HEALTH_URL:-}"
DATE_STR="$(date +%Y-%m-%d)"
AUDIT_DIR="osg-spec-docs/tasks/audit"
DEFAULT_LOG="${AUDIT_DIR}/e2e-api-gate-${MODULE}-${DATE_STR}.log"
E2E_API_GATE_LOG="${E2E_API_GATE_LOG:-${DEFAULT_LOG}}"

mkdir -p "${AUDIT_DIR}"

resolve_backend_urls() {
  local base_url_default="http://127.0.0.1:${BACKEND_PORT}"
  if [[ -n "${BASE_HEALTH_URL}" ]]; then
    if [[ -z "${BASE_URL}" ]]; then
      case "${BASE_HEALTH_URL}" in
        */actuator/health) BASE_URL="${BASE_HEALTH_URL%/actuator/health}" ;;
      esac
    fi
  elif [[ -n "${BASE_URL}" ]]; then
    BASE_HEALTH_URL="${BASE_URL}${HEALTH_PATH}"
  else
    local candidate_urls=(
      "http://127.0.0.1:28080${HEALTH_PATH}"
      "${base_url_default}${HEALTH_PATH}"
      "http://127.0.0.1:8080${HEALTH_PATH}"
    )
    local candidate
    for candidate in "${candidate_urls[@]}"; do
      if curl -fsS --max-time 2 "${candidate}" >/dev/null 2>&1; then
        BASE_HEALTH_URL="${candidate}"
        break
      fi
    done
    if [[ -z "${BASE_HEALTH_URL}" ]]; then
      BASE_HEALTH_URL="${base_url_default}${HEALTH_PATH}"
    fi
    case "${BASE_HEALTH_URL}" in
      */actuator/health) BASE_URL="${BASE_HEALTH_URL%/actuator/health}" ;;
    esac
  fi

  if [[ -z "${BASE_URL}" ]]; then
    BASE_URL="${base_url_default}"
  fi
}

resolve_backend_urls

case "${MODE}" in
  full)
    E2E_SCRIPT="test:e2e"
    WORKER_POLICY="serial"
    ;;
  api)
    E2E_SCRIPT="test:e2e:api"
    WORKER_POLICY="serial"
    ;;
  ui-only)
    E2E_SCRIPT="test:e2e:ui-only"
    WORKER_POLICY="default"
    ;;
  *)
    echo "FAIL: unsupported mode '${MODE}', expected full|api|ui-only"
    exit 2
    ;;
esac

python3 .claude/skills/workflow-engine/tests/e2e_api_guard.py \
  --tests-dir osg-frontend/tests/e2e

: > "${E2E_API_GATE_LOG}"
echo "INFO: module=${MODULE} mode=${MODE} worker_policy=${WORKER_POLICY} base_url=${BASE_URL} health_url=${BASE_HEALTH_URL}" | tee -a "${E2E_API_GATE_LOG}"

E2E_CMD=(pnpm --dir osg-frontend "${E2E_SCRIPT}")
if [[ "${WORKER_POLICY}" == "serial" ]]; then
  E2E_CMD+=(--workers=1)
fi

set +e
E2E_API_PROXY_TARGET="${BASE_URL}" PW_E2E_REUSE_SERVER=0 "${E2E_CMD[@]}" 2>&1 | tee -a "${E2E_API_GATE_LOG}"
e2e_rc=${PIPESTATUS[0]}
set -e

if (( e2e_rc != 0 )); then
  echo "FAIL: E2E command failed (script=${E2E_SCRIPT}, exit=${e2e_rc})"
  echo "INFO: gate log=${E2E_API_GATE_LOG}"
  exit "${e2e_rc}"
fi

if grep -Eiq 'http proxy error|connect ECONNREFUSED|ECONNREFUSED|proxy error' "${E2E_API_GATE_LOG}"; then
  if [[ "${MODE}" == "ui-only" ]]; then
    echo "WARNING: detected proxy/backend connectivity error in UI-only fallback mode"
    echo "INFO: gate log=${E2E_API_GATE_LOG}"
  else
    echo "FAIL: detected proxy/backend connectivity error in E2E log"
    echo "INFO: gate log=${E2E_API_GATE_LOG}"
    exit 24
  fi
fi

echo "PASS: e2e-api-gate"
echo "INFO: gate log=${E2E_API_GATE_LOG}"
