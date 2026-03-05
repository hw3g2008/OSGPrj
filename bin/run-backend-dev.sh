#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-deploy/.env.dev}"

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

if [[ "${ENV_FILE}" == "-h" || "${ENV_FILE}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  if [[ "${ENV_FILE}" == "deploy/.env.dev" && -f "deploy/.env.dev.example" ]]; then
    echo "WARN: ${ENV_FILE} not found, fallback to deploy/.env.dev.example"
    ENV_FILE="deploy/.env.dev.example"
  else
    echo "FAIL: env file not found: ${ENV_FILE}" >&2
    exit 1
  fi
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

if [[ ! -f "ruoyi-admin/pom.xml" ]]; then
  echo "FAIL: ruoyi-admin/pom.xml not found (run from repo root)" >&2
  exit 1
fi

echo "=== run-backend-dev ==="
echo "INFO: env_file=${ENV_FILE}"
echo "INFO: profile=${SPRING_PROFILES_ACTIVE}"
echo "INFO: db=${SPRING_DATASOURCE_DRUID_MASTER_URL}"
echo "INFO: redis=${SPRING_DATA_REDIS_HOST}:${SPRING_DATA_REDIS_PORT}"

mkdir -p "${RUOYI_PROFILE:-./.local/uploadPath}" "${LOG_PATH:-./logs}"

exec mvn -f ruoyi-admin/pom.xml spring-boot:run \
  -Dspring-boot.run.profiles="${SPRING_PROFILES_ACTIVE}" \
  -Dspring-boot.run.jvmArguments="-Dserver.port=${SERVER_PORT:-8080} -Druoyi.profile=${RUOYI_PROFILE:-./.local/uploadPath} -DLOG_PATH=${LOG_PATH:-./logs}"
