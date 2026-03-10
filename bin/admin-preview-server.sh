#!/usr/bin/env bash
# Admin app preview server lifecycle for visual gates
# Usage:
#   bash bin/admin-preview-server.sh start|stop|status|restart
set -euo pipefail

ACTION="${1:-status}"
PORT="${ADMIN_PREVIEW_PORT:-4173}"
APP_DIR="${ADMIN_PREVIEW_APP_DIR:-osg-frontend}"
PID_FILE="/tmp/osg-admin-preview-${PORT}.pid"
LOG_FILE="/tmp/osg-admin-preview-${PORT}.log"
BASE_URL="http://127.0.0.1:${PORT}"

health_ok() {
  curl -fsS --max-time 2 "${BASE_URL}/login" >/dev/null 2>&1
}

listener_pid() {
  lsof -tiTCP:"${PORT}" -sTCP:LISTEN -n -P 2>/dev/null | head -n1 || true
}

tracked_pid() {
  if [[ ! -f "${PID_FILE}" ]]; then
    return 0
  fi
  cat "${PID_FILE}" 2>/dev/null || true
}

adopt_existing_listener() {
  local pid
  pid="$(listener_pid)"
  if [[ -z "${pid}" ]]; then
    return 1
  fi
  if ! health_ok; then
    return 1
  fi
  echo "${pid}" > "${PID_FILE}"
  return 0
}

is_running() {
  local pid
  pid="$(tracked_pid)"
  if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1 && health_ok; then
    return 0
  fi
  adopt_existing_listener
}

build_bundle() {
  (
    cd "${APP_DIR}"
    pnpm --dir packages/admin build
  )
}

start_server() {
  if [[ ! -d "${APP_DIR}" ]]; then
    echo "FAIL: admin preview app dir not found: ${APP_DIR}"
    exit 17
  fi

  if is_running; then
    echo "INFO: admin preview already running at ${BASE_URL} (pid=$(tracked_pid))"
    return 0
  fi

  bash bin/runtime-port-guard.sh --mode require-free --port "${PORT}" --context admin-preview-start >/dev/null

  echo "INFO: building admin preview bundle"
  build_bundle

  echo "INFO: starting admin preview at ${BASE_URL}"
  nohup bash -lc "cd '${APP_DIR}' && exec pnpm --dir packages/admin preview -- --host 127.0.0.1 --port ${PORT} --strictPort" >"${LOG_FILE}" 2>&1 &
  local launcher_pid=$!

  for _ in {1..100}; do
    if adopt_existing_listener; then
      echo "PASS: admin preview started at ${BASE_URL} (pid=$(tracked_pid))"
      return 0
    fi
    sleep 0.2
  done

  echo "FAIL: admin preview failed to start at ${BASE_URL}"
  echo "INFO: log=${LOG_FILE}"
  if kill -0 "${launcher_pid}" >/dev/null 2>&1; then
    kill "${launcher_pid}" >/dev/null 2>&1 || true
  fi
  bash bin/runtime-port-guard.sh --mode describe --port "${PORT}" || true
  exit 17
}

stop_server() {
  local pid
  pid="$(tracked_pid)"
  if [[ -z "${pid}" ]]; then
    pid="$(listener_pid)"
  fi
  if [[ -z "${pid}" ]]; then
    rm -f "${PID_FILE}"
    echo "INFO: admin preview not running"
    return 0
  fi
  if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
    kill "${pid}" >/dev/null 2>&1 || true
    sleep 0.2
    if kill -0 "${pid}" >/dev/null 2>&1; then
      kill -9 "${pid}" >/dev/null 2>&1 || true
    fi
  fi

  rm -f "${PID_FILE}"
  echo "PASS: admin preview stopped"
}

status_server() {
  if is_running; then
    echo "PASS: admin preview running at ${BASE_URL} (pid=$(tracked_pid))"
    return 0
  fi
  echo "FAIL: admin preview not running at ${BASE_URL}"
  return 1
}

case "${ACTION}" in
  start) start_server ;;
  stop) stop_server ;;
  restart)
    stop_server
    start_server
    ;;
  status) status_server ;;
  *)
    echo "FAIL: unknown action '${ACTION}', expected start|stop|status|restart"
    exit 16
    ;;
esac
