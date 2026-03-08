#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=""
CHECK_ONLY=0
PRINT_RUNTIME=0

usage() {
  cat <<'EOF'
Usage:
  bash bin/run-backend-dev.sh [env_file]

Examples:
  bash bin/run-backend-dev.sh
  bash bin/run-backend-dev.sh deploy/.env.dev

Behavior:
  - Runs ruoyi-admin locally (no local Docker mysql/redis required)
  - Connects to the shared test DB/Redis defined in env file
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --check-only)
      CHECK_ONLY=1
      shift
      ;;
    --print-runtime)
      PRINT_RUNTIME=1
      shift
      ;;
    *)
      if [[ -z "${ENV_FILE}" ]]; then
        ENV_FILE="$1"
        shift
      else
        echo "FAIL: unknown arg '$1'" >&2
        exit 1
      fi
      ;;
  esac
done

ENV_FILE="${ENV_FILE:-deploy/.env.dev}"

eval "$(bash bin/resolve-runtime-contract.sh)"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "FAIL: env file not found: ${ENV_FILE}" >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

required_keys=(
  SPRING_PROFILES_ACTIVE
  SPRING_DATASOURCE_DRUID_MASTER_URL
  SPRING_DATASOURCE_DRUID_MASTER_USERNAME
  SPRING_DATASOURCE_DRUID_MASTER_PASSWORD
  SPRING_DATA_REDIS_HOST
  SPRING_DATA_REDIS_PORT
  SPRING_DATA_REDIS_PASSWORD
  TOKEN_SECRET
)

missing=()
for k in "${required_keys[@]}"; do
  if [[ -z "${!k-}" ]]; then
    missing+=("${k}")
  fi
done
if (( ${#missing[@]} > 0 )); then
  echo "FAIL: missing required keys in ${ENV_FILE}:" >&2
  for k in "${missing[@]}"; do
    echo "  - ${k}" >&2
  done
  exit 1
fi

SERVER_PORT="${SERVER_PORT:-}"
if [[ -z "${SERVER_PORT}" ]]; then
  echo "FAIL: SERVER_PORT missing in ${ENV_FILE}" >&2
  exit 1
fi
if [[ "${SERVER_PORT}" != "${RESOLVED_BACKEND_PORT}" ]]; then
  echo "FAIL: SERVER_PORT mismatch: env=${SERVER_PORT}, contract=${RESOLVED_BACKEND_PORT}" >&2
  exit 1
fi

START_MODE=""
case "${RESOLVED_RUNTIME_CLASSPATH_MODE:-}" in
  workspace-reactor)
    START_MODE="reactor"
    ;;
  "")
    echo "FAIL: runtime contract missing RESOLVED_RUNTIME_CLASSPATH_MODE" >&2
    exit 1
    ;;
  *)
    echo "FAIL: unsupported classpath mode for run-backend-dev: ${RESOLVED_RUNTIME_CLASSPATH_MODE}" >&2
    exit 1
    ;;
esac

if [[ ! -f "ruoyi-admin/pom.xml" ]]; then
  echo "FAIL: ruoyi-admin/pom.xml not found (run from repo root)" >&2
  exit 1
fi

if (( PRINT_RUNTIME == 1 )); then
  cat <<EOF
ENV_FILE=${ENV_FILE}
PORT=${RESOLVED_BACKEND_PORT}
BASE_URL=${RESOLVED_BASE_URL}
HEALTH_URL=${RESOLVED_BASE_HEALTH_URL}
PROXY_TARGET=${RESOLVED_E2E_API_PROXY_TARGET}
RUN_COMMAND=${RESOLVED_RUNTIME_RUN_COMMAND}
START_MODE=${START_MODE}
BUILD_STRATEGY=reactor-package-then-jar
EOF
  exit 0
fi

if (( CHECK_ONLY == 1 )); then
  bash bin/runtime-port-guard.sh --mode require-free --port "${SERVER_PORT}" --context run-backend-dev-check-only
  echo "PASS: run-backend-dev check-only env_file=${ENV_FILE} port=${RESOLVED_BACKEND_PORT} start_mode=${START_MODE}"
  exit 0
fi

echo "=== run-backend-dev ==="
echo "INFO: env_file=${ENV_FILE}"
echo "INFO: profile=${SPRING_PROFILES_ACTIVE}"
echo "INFO: db=${SPRING_DATASOURCE_DRUID_MASTER_URL}"
echo "INFO: redis=${SPRING_DATA_REDIS_HOST}:${SPRING_DATA_REDIS_PORT}"
echo "INFO: port=${RESOLVED_BACKEND_PORT}"
echo "INFO: base_url=${RESOLVED_BASE_URL}"
echo "INFO: health_url=${RESOLVED_BASE_HEALTH_URL}"
echo "INFO: start_mode=${START_MODE}"
echo "INFO: build_strategy=reactor-package-then-jar"

bash bin/runtime-port-guard.sh --mode require-free --port "${SERVER_PORT}" --context run-backend-dev

mkdir -p "${RUOYI_PROFILE:-./.local/uploadPath}" "${LOG_PATH:-./logs}"

echo "INFO: building latest workspace reactor artifacts for ruoyi-admin"
mvn -f pom.xml -pl ruoyi-admin -am -DskipTests package

JAR_PATH="ruoyi-admin/target/ruoyi-admin.jar"
if [[ ! -f "${JAR_PATH}" ]]; then
  echo "FAIL: backend jar not found after reactor build: ${JAR_PATH}" >&2
  exit 1
fi

exec java \
  -Dserver.port="${SERVER_PORT}" \
  -Druoyi.profile="${RUOYI_PROFILE:-./.local/uploadPath}" \
  -DLOG_PATH="${LOG_PATH:-./logs}" \
  -jar "${JAR_PATH}" \
  --spring.profiles.active="${SPRING_PROFILES_ACTIVE}"
