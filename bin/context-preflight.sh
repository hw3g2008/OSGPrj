#!/usr/bin/env bash
set -euo pipefail

# Cross-platform Python 3 (python3 | py -3 | python)
source "$(dirname "${BASH_SOURCE[0]}")/lib-python.sh"
require_py3

MODE=""
CONFIG_PATH=".claude/project/config.yaml"
RUNTIME_CONTRACT=""
ENV_FILE=""
ENTRYPOINT=""
REMOTE_HOST=""

usage() {
  cat <<'EOF'
Usage:
  bash bin/context-preflight.sh <dev|test|prod> [options]

Options:
  --config <path>             Override machine truth config path
  --runtime-contract <path>   Override runtime contract path
  --env-file <path>           Override env file path
  --entrypoint <name>         Human-facing entrypoint label
  --remote-host <host>        Expected remote host for test deploy flows

Examples:
  bash bin/context-preflight.sh dev
  bash bin/context-preflight.sh test --remote-host 47.94.213.128
EOF
}

if [[ $# -lt 1 ]]; then
  usage >&2
  exit 1
fi

MODE="$1"
shift

case "${MODE}" in
  dev|test|prod) ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    echo "FAIL: unsupported mode '${MODE}'" >&2
    usage >&2
    exit 1
    ;;
esac

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG_PATH="${2:-}"
      shift 2
      ;;
    --runtime-contract)
      RUNTIME_CONTRACT="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --entrypoint)
      ENTRYPOINT="${2:-}"
      shift 2
      ;;
    --remote-host)
      REMOTE_HOST="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "FAIL: unknown arg '$1'" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "${CONFIG_PATH}" ]]; then
  echo "FAIL: config not found: ${CONFIG_PATH}" >&2
  exit 1
fi

read_config_value() {
  local python_expr="$1"
  py3 - "${CONFIG_PATH}" "${python_expr}" <<'PY'
import pathlib
import sys
import yaml

config_path = pathlib.Path(sys.argv[1])
expr = sys.argv[2]
data = yaml.safe_load(config_path.read_text(encoding='utf-8'))
value = eval(expr, {"data": data})
if value is None:
    sys.exit(2)
if isinstance(value, bool):
    print("true" if value else "false")
elif isinstance(value, (list, dict)):
    import json
    print(json.dumps(value, ensure_ascii=False))
else:
    print(value)
PY
}

EXPECTED_RUNTIME_CONTRACT=""
EXPECTED_ENV_FILE=""
EXPECTED_BACKEND_PORT=""
EXPECTED_BASE_URL=""
EXPECTED_REMOTE_HOST=""
EXPECTED_MYSQL_HOST=""
EXPECTED_MYSQL_PORT=""
EXPECTED_REDIS_HOST=""
EXPECTED_REDIS_PORT=""
EXPECTED_TEST_BACKEND_PORT=""
EXPECTED_TEST_ADMIN_PORT=""
LOCAL_DOCKER_FORBIDDEN_AS_TEST_TRUTH=""

case "${MODE}" in
  dev)
    EXPECTED_RUNTIME_CONTRACT="$(read_config_value "data['runtime_model']['dev']['dependencies']['runtime_contract']")"
    EXPECTED_ENV_FILE="$(read_config_value "data['runtime_model']['dev']['dependencies']['env_file']")"
    EXPECTED_BACKEND_PORT="$(read_config_value "data['runtime_model']['dev']['backend']['port']")"
    EXPECTED_BASE_URL="$(read_config_value "data['runtime_model']['dev']['backend']['base_url']")"
    EXPECTED_REMOTE_HOST="$(read_config_value "data['environment_identity']['shared_remote_deps']['host']")"
    EXPECTED_MYSQL_HOST="${EXPECTED_REMOTE_HOST}"
    EXPECTED_MYSQL_PORT="$(read_config_value "data['environment_identity']['shared_remote_deps']['mysql']['port']")"
    EXPECTED_REDIS_HOST="${EXPECTED_REMOTE_HOST}"
    EXPECTED_REDIS_PORT="$(read_config_value "data['environment_identity']['shared_remote_deps']['redis']['port']")"
    ;;
  test)
    EXPECTED_RUNTIME_CONTRACT="$(read_config_value "data['runtime_model']['test']['dependencies']['runtime_contract']")"
    EXPECTED_ENV_FILE="$(read_config_value "data['runtime_model']['test']['dependencies']['env_file']")"
    EXPECTED_TEST_BACKEND_PORT="$(read_config_value "data['runtime_model']['test']['backend']['port']")"
    EXPECTED_BASE_URL="$(read_config_value "data['runtime_model']['test']['backend']['base_url']")"
    EXPECTED_REMOTE_HOST="$(read_config_value "data['environment_identity']['remote_test_stack']['host']")"
    EXPECTED_MYSQL_PORT="$(read_config_value "data['environment_identity']['shared_remote_deps']['mysql']['port']")"
    EXPECTED_REDIS_PORT="$(read_config_value "data['environment_identity']['shared_remote_deps']['redis']['port']")"
    EXPECTED_TEST_ADMIN_PORT="$(read_config_value "data['environment_identity']['remote_test_stack']['ports']['admin']")"
    LOCAL_DOCKER_FORBIDDEN_AS_TEST_TRUTH="$(read_config_value "data['environment_identity']['local_host']['docker_context_must_not_be_remote_test_truth']")"
    ;;
  prod)
    EXPECTED_ENV_FILE="${ENV_FILE:-}"
    ;;
esac

RUNTIME_CONTRACT="${RUNTIME_CONTRACT:-${EXPECTED_RUNTIME_CONTRACT}}"
ENV_FILE="${ENV_FILE:-${EXPECTED_ENV_FILE}}"

if [[ -n "${ENV_FILE}" && ! -f "${ENV_FILE}" ]]; then
  echo "FAIL: env file not found: ${ENV_FILE}" >&2
  exit 1
fi

if [[ -n "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

DOCKER_CONTEXT="unknown"
if command -v docker >/dev/null 2>&1; then
  DOCKER_CONTEXT="$(docker context show 2>/dev/null || echo unknown)"
fi

if [[ -n "${RUNTIME_CONTRACT}" ]]; then
  if [[ ! -f "${RUNTIME_CONTRACT}" ]]; then
    echo "FAIL: runtime contract not found: ${RUNTIME_CONTRACT}" >&2
    exit 1
  fi
  py3 .claude/skills/workflow-engine/tests/runtime_contract_guard.py --contract "${RUNTIME_CONTRACT}"
fi

extract_jdbc_host_port() {
  local url="$1"
  py3 - "$url" <<'PY'
import re
import sys
url = sys.argv[1]
m = re.search(r"jdbc:mysql://([^:/?#]+):(\d+)", url)
if not m:
    sys.exit(1)
print(m.group(1))
print(m.group(2))
PY
}

case "${MODE}" in
  dev)
    if [[ "${SERVER_PORT:-}" != "${EXPECTED_BACKEND_PORT}" ]]; then
      echo "FAIL: dev SERVER_PORT mismatch: env=${SERVER_PORT:-<unset>} expected=${EXPECTED_BACKEND_PORT}" >&2
      exit 1
    fi
    if [[ -z "${SPRING_DATASOURCE_DRUID_MASTER_URL:-}" ]]; then
      echo "FAIL: SPRING_DATASOURCE_DRUID_MASTER_URL missing" >&2
      exit 1
    fi
    jdbc_parts=()
    while IFS= read -r part; do
      jdbc_parts+=("${part}")
    done < <(extract_jdbc_host_port "${SPRING_DATASOURCE_DRUID_MASTER_URL}")
    jdbc_host="$(printf '%s' "${jdbc_parts[0]}" | tr -d '\r')"
    jdbc_port="$(printf '%s' "${jdbc_parts[1]}" | tr -d '\r')"
    if [[ "${jdbc_host}" != "${EXPECTED_MYSQL_HOST}" || "${jdbc_port}" != "${EXPECTED_MYSQL_PORT}" ]]; then
      echo "FAIL: dev MySQL target mismatch: actual=${jdbc_host}:${jdbc_port} expected=${EXPECTED_MYSQL_HOST}:${EXPECTED_MYSQL_PORT}" >&2
      exit 1
    fi
    redis_host_raw="${SPRING_DATA_REDIS_HOST:-}"
    redis_port_raw="${SPRING_DATA_REDIS_PORT:-}"
    redis_host="$(printf '%s' "${redis_host_raw}" | tr -d '\r')"
    redis_port="$(printf '%s' "${redis_port_raw}" | tr -d '\r')"
    if [[ "${redis_host}" != "${EXPECTED_REDIS_HOST}" || "${redis_port}" != "${EXPECTED_REDIS_PORT}" ]]; then
      echo "FAIL: dev Redis target mismatch: actual=${redis_host:-<unset>}:${redis_port:-<unset>} expected=${EXPECTED_REDIS_HOST}:${EXPECTED_REDIS_PORT}" >&2
      exit 1
    fi
    ;;
  test)
    if [[ "${TEST_DEPENDENCY_MODE:-}" != "shared" ]]; then
      echo "FAIL: test dependency mode must be shared, actual=${TEST_DEPENDENCY_MODE:-<unset>}" >&2
      exit 1
    fi
    if [[ "${BACKEND_PORT:-}" != "${EXPECTED_TEST_BACKEND_PORT}" ]]; then
      echo "FAIL: test BACKEND_PORT mismatch: env=${BACKEND_PORT:-<unset>} expected=${EXPECTED_TEST_BACKEND_PORT}" >&2
      exit 1
    fi
    if [[ "${MYSQL_SHARED_PORT:-}" != "${EXPECTED_MYSQL_PORT}" ]]; then
      echo "FAIL: test MYSQL_SHARED_PORT mismatch: env=${MYSQL_SHARED_PORT:-<unset>} expected=${EXPECTED_MYSQL_PORT}" >&2
      exit 1
    fi
    if [[ "${REDIS_SHARED_PORT:-}" != "${EXPECTED_REDIS_PORT}" ]]; then
      echo "FAIL: test REDIS_SHARED_PORT mismatch: env=${REDIS_SHARED_PORT:-<unset>} expected=${EXPECTED_REDIS_PORT}" >&2
      exit 1
    fi
    if [[ -n "${REMOTE_HOST}" && "${REMOTE_HOST}" != "${EXPECTED_REMOTE_HOST}" ]]; then
      echo "FAIL: remote host mismatch: actual=${REMOTE_HOST} expected=${EXPECTED_REMOTE_HOST}" >&2
      exit 1
    fi
    if [[ "${LOCAL_DOCKER_FORBIDDEN_AS_TEST_TRUTH}" == "true" && "${DOCKER_CONTEXT}" == "desktop-linux" ]]; then
      echo "INFO: local docker context=${DOCKER_CONTEXT} is not accepted as remote test truth; using declared Aliyun test host=${EXPECTED_REMOTE_HOST}"
    fi
    ;;
  prod)
    if [[ -z "${ENV_FILE}" ]]; then
      echo "FAIL: prod preflight requires --env-file or configured env file" >&2
      exit 1
    fi
    ;;
esac

echo "=== context-preflight ==="
echo "mode=${MODE}"
echo "entrypoint=${ENTRYPOINT:-<unspecified>}"
echo "machine_truth=${CONFIG_PATH}"
echo "runtime_contract=${RUNTIME_CONTRACT:-<none>}"
echo "env_file=${ENV_FILE:-<none>}"
echo "backend_base_url=${EXPECTED_BASE_URL:-<n/a>}"
case "${MODE}" in
  dev)
    echo "mysql_target=${EXPECTED_MYSQL_HOST}:${EXPECTED_MYSQL_PORT}"
    echo "redis_target=${EXPECTED_REDIS_HOST}:${EXPECTED_REDIS_PORT}"
    ;;
  test)
    echo "mysql_target=${EXPECTED_REMOTE_HOST}:${EXPECTED_MYSQL_PORT} (via shared test deps)"
    echo "redis_target=${EXPECTED_REMOTE_HOST}:${EXPECTED_REDIS_PORT} (via shared test deps)"
    echo "admin_port=${EXPECTED_TEST_ADMIN_PORT}"
    echo "remote_test_truth_host=${EXPECTED_REMOTE_HOST}"
    echo "local_docker_is_not_test_truth=${LOCAL_DOCKER_FORBIDDEN_AS_TEST_TRUTH}"
    ;;
  prod)
    echo "mysql_target=<prod-managed>"
    echo "redis_target=<prod-managed>"
    ;;
esac
echo "docker_context=${DOCKER_CONTEXT}"
echo "PASS: context-preflight mode=${MODE} entrypoint=${ENTRYPOINT:-<unspecified>}"
