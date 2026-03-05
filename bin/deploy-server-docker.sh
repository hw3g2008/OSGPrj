#!/usr/bin/env bash
set -euo pipefail

ENV_NAME="test"
if [[ $# -gt 0 && "${1:-}" != -* ]]; then
  ENV_NAME="${1}"
  shift
fi

PROFILE_CSV="core,frontends"
SKIP_HEALTH_CHECK=0
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-3}"

usage() {
  cat <<'EOF'
Usage:
  bash bin/deploy-server-docker.sh [env] [--profile core,frontends] [--skip-health-check]

Args:
  env                  test|prod (default: test)
  --profile            compose profiles csv (default: core,frontends)
  --skip-health-check  skip backend/admin readiness checks

Examples:
  bash bin/deploy-server-docker.sh test
  bash bin/deploy-server-docker.sh test --profile core,frontends
EOF
}

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
    --skip-health-check)
      SKIP_HEALTH_CHECK=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "FAIL: 未识别参数 $1" >&2
      usage
      exit 1
      ;;
  esac
done

case "${ENV_NAME}" in
  test|prod) ;;
  *)
    echo "FAIL: env 仅支持 test|prod，当前=${ENV_NAME}" >&2
    exit 1
    ;;
esac

ENV_FILE="deploy/.env.${ENV_NAME}"
if [[ ! -f "${ENV_FILE}" ]]; then
  ENV_FILE="deploy/.env.${ENV_NAME}.example"
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "FAIL: 环境文件不存在（deploy/.env.${ENV_NAME} 或 .example）" >&2
  exit 1
fi

echo "=== deploy-server-docker: env=${ENV_NAME} profile=${PROFILE_CSV} env_file=${ENV_FILE} ==="

# 1) preflight + compose up (复用已有脚本)
bash bin/docker-env-up.sh "${ENV_NAME}" --profile "${PROFILE_CSV}"

if (( SKIP_HEALTH_CHECK == 1 )); then
  echo "PASS: 部署完成（已跳过健康检查）"
  exit 0
fi

set -a
source "${ENV_FILE}"
set +a

BACKEND_PORT="${BACKEND_PORT:-8080}"
ADMIN_PORT="${ADMIN_PORT:-3005}"
HEALTH_PATH="${HEALTH_PATH:-/actuator/health}"

BACKEND_HEALTH_URL="http://127.0.0.1:${BACKEND_PORT}${HEALTH_PATH}"
ADMIN_LOGIN_URL="http://127.0.0.1:${ADMIN_PORT}/login"

wait_http_ok() {
  local url="$1"
  local timeout_s="$2"
  local interval_s="$3"
  local start_ts now elapsed
  start_ts="$(date +%s)"
  while true; do
    if curl -fsS --max-time 3 "${url}" >/dev/null 2>&1; then
      return 0
    fi
    now="$(date +%s)"
    elapsed=$(( now - start_ts ))
    if (( elapsed >= timeout_s )); then
      return 1
    fi
    sleep "${interval_s}"
  done
}

wait_http_status() {
  local url="$1"
  local timeout_s="$2"
  local interval_s="$3"
  local start_ts now elapsed code
  start_ts="$(date +%s)"
  while true; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 3 "${url}" || true)"
    if [[ "${code}" =~ ^2|3 ]]; then
      return 0
    fi
    now="$(date +%s)"
    elapsed=$(( now - start_ts ))
    if (( elapsed >= timeout_s )); then
      return 1
    fi
    sleep "${interval_s}"
  done
}

echo "INFO: wait backend health => ${BACKEND_HEALTH_URL}"
if ! wait_http_ok "${BACKEND_HEALTH_URL}" "${HEALTH_TIMEOUT}" "${HEALTH_INTERVAL}"; then
  echo "FAIL: backend health check timeout (${BACKEND_HEALTH_URL})"
  bash bin/docker-env-status.sh "${ENV_NAME}" --profile "${PROFILE_CSV}" || true
  exit 1
fi

echo "INFO: wait admin login => ${ADMIN_LOGIN_URL}"
if ! wait_http_status "${ADMIN_LOGIN_URL}" "${HEALTH_TIMEOUT}" "${HEALTH_INTERVAL}"; then
  echo "FAIL: admin login check timeout (${ADMIN_LOGIN_URL})"
  bash bin/docker-env-status.sh "${ENV_NAME}" --profile "${PROFILE_CSV}" || true
  exit 1
fi

echo "PASS: 部署成功"
echo "INFO: backend=${BACKEND_HEALTH_URL}"
echo "INFO: admin=${ADMIN_LOGIN_URL}"
bash bin/docker-env-status.sh "${ENV_NAME}" --profile "${PROFILE_CSV}"
