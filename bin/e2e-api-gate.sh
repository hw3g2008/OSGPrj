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
HEALTH_PATH="${HEALTH_PATH:-/actuator/health}"
BASE_URL="${BASE_URL:-}"
BASE_HEALTH_URL="${BASE_HEALTH_URL:-}"
E2E_FRONTEND_BASE_URL="${E2E_FRONTEND_BASE_URL:-}"
DATE_STR="$(date +%Y-%m-%d)"
AUDIT_DIR="osg-spec-docs/tasks/audit"
DEFAULT_LOG="${AUDIT_DIR}/e2e-api-gate-${MODULE}-${DATE_STR}.log"
E2E_API_GATE_LOG="${E2E_API_GATE_LOG:-${DEFAULT_LOG}}"
BEHAVIOR_CONTRACT_REPORT="${BEHAVIOR_CONTRACT_REPORT:-${AUDIT_DIR}/behavior-contract-${MODULE}-${DATE_STR}.json}"

mkdir -p "${AUDIT_DIR}"

load_runtime_contract() {
  eval "$(bash bin/resolve-runtime-contract.sh)"
  BASE_URL="${RESOLVED_BASE_URL}"
  BASE_HEALTH_URL="${RESOLVED_BASE_HEALTH_URL}"
}

load_runtime_contract

# Clear login error counter to prevent account lockout during E2E
if command -v redis-cli &>/dev/null; then
  source deploy/.env.dev 2>/dev/null || true
  _REDIS_HOST="${SPRING_DATA_REDIS_HOST:-47.94.213.128}"
  _REDIS_PORT="${SPRING_DATA_REDIS_PORT:-26379}"
  _REDIS_PWD="${SPRING_DATA_REDIS_PASSWORD:-}"
  redis-cli -h "${_REDIS_HOST}" -p "${_REDIS_PORT}" ${_REDIS_PWD:+-a "${_REDIS_PWD}"} DEL "pwd_err_cnt:admin" 2>/dev/null || true
  unset _REDIS_HOST _REDIS_PORT _REDIS_PWD
fi

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

EXTRA_E2E_ARGS=()

case "${MODULE}" in
  lead-mentor)
    # lead-mentor tickets are verified through module-scoped Playwright specs.
    # This prevents unrelated admin recovery/backfill suites from blocking a
    # login-shell ticket while still keeping the command on the real e2e path.
    E2E_SCRIPT="test:e2e"
    WORKER_POLICY="serial"
    EXTRA_E2E_ARGS+=(--grep "@lead-mentor")
    if [[ -z "${E2E_FRONTEND_BASE_URL}" ]]; then
      for candidate in "http://127.0.0.1:3003" "http://localhost:3003"; do
        if curl -fsS --max-time 2 "${candidate}/login" >/dev/null 2>&1; then
          E2E_FRONTEND_BASE_URL="${candidate}"
          break
        fi
      done
    fi
    ;;
esac

python3 .claude/skills/workflow-engine/tests/e2e_api_guard.py \
  --tests-dir osg-frontend/tests/e2e

: > "${E2E_API_GATE_LOG}"
rm -f "${BEHAVIOR_CONTRACT_REPORT}"
echo "INFO: module=${MODULE} mode=${MODE} worker_policy=${WORKER_POLICY} base_url=${BASE_URL} health_url=${BASE_HEALTH_URL}" | tee -a "${E2E_API_GATE_LOG}"
if [[ -n "${E2E_FRONTEND_BASE_URL}" ]]; then
  echo "INFO: frontend_base_url=${E2E_FRONTEND_BASE_URL}" | tee -a "${E2E_API_GATE_LOG}"
fi

E2E_CMD=(pnpm --dir osg-frontend "${E2E_SCRIPT}")
if [[ "${WORKER_POLICY}" == "serial" ]]; then
  E2E_CMD+=(--workers=1)
fi
if [[ ${#EXTRA_E2E_ARGS[@]} -gt 0 ]]; then
  E2E_CMD+=("${EXTRA_E2E_ARGS[@]}")
fi

set +e
E2E_MODULE="${MODULE}" \
E2E_API_PROXY_TARGET="${BASE_URL}" \
E2E_FRONTEND_BASE_URL="${E2E_FRONTEND_BASE_URL}" \
BEHAVIOR_CONTRACT_REPORT="${BEHAVIOR_CONTRACT_REPORT}" \
PW_E2E_REUSE_SERVER="${PW_E2E_REUSE_SERVER:-1}" \
"${E2E_CMD[@]}" 2>&1 | tee -a "${E2E_API_GATE_LOG}"
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
