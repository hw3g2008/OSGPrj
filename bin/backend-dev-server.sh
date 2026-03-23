#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-status}"
ENV_FILE="${2:-}"
HEALTH_TIMEOUT_SECONDS="${BACKEND_DEV_SERVER_HEALTH_TIMEOUT_SECONDS:-15}"
START_WAIT_SECONDS="${BACKEND_DEV_SERVER_START_WAIT_SECONDS:-180}"

resolve_runtime() {
  eval "$(bash bin/resolve-runtime-contract.sh "${RUNTIME_CONTRACT_FILE:-}")"
  BACKEND_PORT="${RESOLVED_BACKEND_PORT}"
  BACKEND_BASE_URL="${RESOLVED_BASE_URL}"
  BACKEND_HEALTH_URL="${RESOLVED_BASE_HEALTH_URL}"
  RUNTIME_ENV_FILE="${RESOLVED_RUNTIME_ENV_FILE:-}"
  ENV_FILE="${ENV_FILE:-${RUNTIME_ENV_FILE:-deploy/.env.dev}}"
  PID_FILE="/tmp/osg-backend-dev-${BACKEND_PORT}.pid"
  LOG_FILE="${BACKEND_DEV_SERVER_LOG_FILE:-/tmp/osg-backend-dev-${BACKEND_PORT}.log}"
  MANAGED_COMMAND_SUBSTRING="${BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING:-ruoyi-admin.jar}"
}

usage() {
  cat <<'EOF'
Usage:
  bash bin/backend-dev-server.sh start [env_file]
  bash bin/backend-dev-server.sh stop [env_file]
  bash bin/backend-dev-server.sh status [env_file]
  bash bin/backend-dev-server.sh restart [env_file]
EOF
}

health_ok() {
  curl -fsS --max-time "${HEALTH_TIMEOUT_SECONDS}" "${BACKEND_HEALTH_URL}" >/dev/null 2>&1
}

listener_pids() {
  lsof -tiTCP:"${BACKEND_PORT}" -sTCP:LISTEN -n -P 2>/dev/null | sort -u
}

listener_pid() {
  listener_pids | head -n1
}

tracked_pid() {
  if [[ ! -f "${PID_FILE}" ]]; then
    return 0
  fi
  cat "${PID_FILE}" 2>/dev/null || true
}

managed_listener_pid() {
  local pid command
  while IFS= read -r pid; do
    [[ -z "${pid}" ]] && continue
    command="$(ps -o command= -p "${pid}" 2>/dev/null || true)"
    if [[ "${command}" == *"${MANAGED_COMMAND_SUBSTRING}"* ]]; then
      printf '%s\n' "${pid}"
      return 0
    fi
  done < <(listener_pids)
  return 1
}

adopt_existing_listener() {
  local pid
  pid="$(managed_listener_pid || true)"
  if [[ -z "${pid}" ]]; then
    return 1
  fi
  if ! health_ok; then
    return 1
  fi
  echo "${pid}" > "${PID_FILE}"
  return 0
}

wait_for_managed_listener_health() {
  local pid
  pid="$(managed_listener_pid || true)"
  if [[ -z "${pid}" ]]; then
    return 1
  fi

  for _ in {1..30}; do
    if adopt_existing_listener; then
      return 0
    fi
    if [[ -z "$(listener_pids || true)" ]]; then
      return 1
    fi
    if [[ -z "$(managed_listener_pid || true)" ]]; then
      return 1
    fi
    sleep 1
  done

  return 1
}

is_running() {
  local pid
  pid="$(tracked_pid)"
  if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1 && health_ok; then
    return 0
  fi
  adopt_existing_listener
}

fail_unknown_listener() {
  echo "FAIL: unknown listener on port ${BACKEND_PORT}" >&2
  bash bin/runtime-port-guard.sh --mode describe --port "${BACKEND_PORT}" >&2 || true
  exit 1
}

start_server() {
  local start_cmd launcher_pid
  if is_running; then
    echo "INFO: backend already running at ${BACKEND_BASE_URL} (pid=$(tracked_pid))"
    return 0
  fi

  if wait_for_managed_listener_health; then
    echo "INFO: backend adopted existing warming listener at ${BACKEND_BASE_URL} (pid=$(tracked_pid))"
    return 0
  fi

  if [[ -n "$(listener_pids || true)" ]]; then
    fail_unknown_listener
  fi

  bash bin/runtime-port-guard.sh --mode require-free --port "${BACKEND_PORT}" --context backend-dev-start >/dev/null

  if [[ -n "${BACKEND_DEV_SERVER_START_CMD:-}" ]]; then
    start_cmd="${BACKEND_DEV_SERVER_START_CMD}"
  else
    start_cmd="exec bash bin/run-backend-dev.sh '${ENV_FILE}'"
  fi

  launcher_pid="$(
    BACKEND_DEV_SERVER_START_CMD_EFFECTIVE="${start_cmd}" \
    BACKEND_DEV_SERVER_START_LOG_FILE="${LOG_FILE}" \
    python3 - <<'PY'
import os
import subprocess

start_cmd = os.environ["BACKEND_DEV_SERVER_START_CMD_EFFECTIVE"]
log_file = os.environ["BACKEND_DEV_SERVER_START_LOG_FILE"]

with open(log_file, "ab", buffering=0) as stream:
    proc = subprocess.Popen(
        ["bash", "-lc", start_cmd],
        stdin=subprocess.DEVNULL,
        stdout=stream,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    print(proc.pid)
PY
  )"

  for ((attempt=1; attempt<=START_WAIT_SECONDS; attempt++)); do
    if adopt_existing_listener; then
      echo "PASS: backend started at ${BACKEND_BASE_URL} (pid=$(tracked_pid))"
      return 0
    fi
    if ! kill -0 "${launcher_pid}" >/dev/null 2>&1 && [[ -z "$(listener_pids || true)" ]]; then
      break
    fi
    sleep 1
  done

  if kill -0 "${launcher_pid}" >/dev/null 2>&1; then
    kill "${launcher_pid}" >/dev/null 2>&1 || true
    wait "${launcher_pid}" 2>/dev/null || true
  fi
  echo "FAIL: backend failed to start at ${BACKEND_BASE_URL}" >&2
  echo "INFO: waited_seconds=${START_WAIT_SECONDS}" >&2
  echo "INFO: log=${LOG_FILE}" >&2
  bash bin/runtime-port-guard.sh --mode describe --port "${BACKEND_PORT}" >&2 || true
  exit 17
}

stop_server() {
  local pid managed_pid
  pid="$(tracked_pid)"
  if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
    kill "${pid}" >/dev/null 2>&1 || true
    sleep 1
    if kill -0 "${pid}" >/dev/null 2>&1; then
      kill -9 "${pid}" >/dev/null 2>&1 || true
    fi
  else
    managed_pid="$(managed_listener_pid || true)"
    if [[ -n "${managed_pid}" ]]; then
      kill "${managed_pid}" >/dev/null 2>&1 || true
      sleep 1
      if kill -0 "${managed_pid}" >/dev/null 2>&1; then
        kill -9 "${managed_pid}" >/dev/null 2>&1 || true
      fi
    elif [[ -n "$(listener_pids || true)" ]]; then
      fail_unknown_listener
    fi
  fi

  rm -f "${PID_FILE}"
  if [[ -n "$(listener_pids || true)" ]]; then
    fail_unknown_listener
  fi
  echo "PASS: backend stopped"
}

status_server() {
  if is_running; then
    echo "PASS: backend running at ${BACKEND_BASE_URL} (pid=$(tracked_pid))"
    return 0
  fi
  echo "FAIL: backend not running at ${BACKEND_BASE_URL}"
  return 1
}

resolve_runtime

case "${ACTION}" in
  start) start_server ;;
  stop) stop_server ;;
  status) status_server ;;
  restart)
    stop_server
    start_server
    ;;
  -h|--help)
    usage
    ;;
  *)
    echo "FAIL: unknown action '${ACTION}', expected start|stop|status|restart" >&2
    exit 16
    ;;
esac
