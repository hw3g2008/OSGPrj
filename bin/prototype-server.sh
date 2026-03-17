#!/usr/bin/env bash
# Prototype static server lifecycle
# Usage:
#   bash bin/prototype-server.sh start|stop|status
set -euo pipefail

# Cross-platform Python 3 (python3 | py -3 | python)
source "$(dirname "${BASH_SOURCE[0]}")/lib-python.sh"
require_py3

# Cross-platform process helpers
source "$(dirname "${BASH_SOURCE[0]}")/lib-process.sh"

ACTION="${1:-status}"
PORT="${PROTOTYPE_PORT:-18090}"
ROOT_DIR="${PROTOTYPE_ROOT_DIR:-osg-spec-docs/source/prototype}"
PID_FILE="/tmp/osg-prototype-server-${PORT}.pid"
LOG_FILE="/tmp/osg-prototype-server-${PORT}.log"
BASE_URL="http://127.0.0.1:${PORT}"

is_running() {
  if [[ ! -f "${PID_FILE}" ]]; then
    return 1
  fi
  local pid
  pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [[ -z "${pid}" ]]; then
    return 1
  fi
  if ! pid_alive "${pid}"; then
    return 1
  fi
  if ! curl -fsS --max-time 2 "${BASE_URL}/" >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

start_server() {
  local launcher_pid
  if [[ ! -d "${ROOT_DIR}" ]]; then
    echo "FAIL: prototype root dir not found: ${ROOT_DIR}"
    exit 17
  fi
  bash bin/runtime-port-guard.sh --mode converge-runtime --target prototype-only --context prototype-server-start >/dev/null
  if is_running; then
    echo "INFO: prototype server already running at ${BASE_URL} (pid=$(cat "${PID_FILE}"))"
    return 0
  fi
  launcher_pid="$(
    PROTOTYPE_SERVER_PORT="${PORT}" \
    PROTOTYPE_SERVER_ROOT_DIR="${ROOT_DIR}" \
    PROTOTYPE_SERVER_LOG_FILE="${LOG_FILE}" \
    py3 - <<'PY'
import os
import subprocess
import sys

port = os.environ["PROTOTYPE_SERVER_PORT"]
root_dir = os.environ["PROTOTYPE_SERVER_ROOT_DIR"]
log_file = os.environ["PROTOTYPE_SERVER_LOG_FILE"]

with open(log_file, "ab", buffering=0) as stream:
    proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", port, "--directory", root_dir],
        stdin=subprocess.DEVNULL,
        stdout=stream,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    print(proc.pid)
PY
  )"
  echo "${launcher_pid}" > "${PID_FILE}"
  for _ in {1..20}; do
    if curl -fsS --max-time 2 "${BASE_URL}/" >/dev/null 2>&1; then
      echo "PASS: prototype server started at ${BASE_URL} (pid=${launcher_pid})"
      return 0
    fi
    if ! pid_alive "${launcher_pid}"; then
      break
    fi
    sleep 0.2
  done
  echo "FAIL: prototype server failed to start at ${BASE_URL}"
  echo "INFO: log=${LOG_FILE}"
  exit 17
}

stop_server() {
  # Cross-platform stop: use tracked PID if possible; otherwise fall back to port-based termination.
  local pid=""
  if [[ -f "${PID_FILE}" ]]; then
    pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
  fi

  if [[ -n "${pid}" ]]; then
    # Prefer Windows-friendly termination.
    MSYS2_ARG_CONV_EXCL='*' MSYS_NO_PATHCONV=1 taskkill.exe /F /T /PID "${pid}" >/dev/null 2>&1 || kill "${pid}" >/dev/null 2>&1 || true
    sleep 0.4
  fi

  # If still listening, use runtime-port-guard to surface/stop managed listeners.
  if ! bash bin/runtime-port-guard.sh --mode require-free --port "${PORT}" --context prototype-server-stop >/dev/null 2>&1; then
    # Best-effort: if it is a managed listener, stop_runtime_if_managed will clear it.
    bash bin/runtime-port-guard.sh --mode converge-runtime --target dev-local --context prototype-server-stop >/dev/null 2>&1 || true
    bash bin/runtime-port-guard.sh --mode converge-runtime --target prototype-only --context prototype-server-stop >/dev/null 2>&1 || true
  fi

  rm -f "${PID_FILE}"
  if bash bin/runtime-port-guard.sh --mode require-free --port "${PORT}" --context prototype-server-stop >/dev/null 2>&1; then
    echo "PASS: prototype server stopped"
    return 0
  fi

  echo "FAIL: prototype server stop did not free port ${PORT}" >&2
  bash bin/runtime-port-guard.sh --mode describe --port "${PORT}" >&2 || true
  exit 1
}

status_server() {
  if is_running; then
    echo "PASS: prototype server running at ${BASE_URL} (pid=$(cat "${PID_FILE}"))"
    return 0
  fi
  echo "FAIL: prototype server not running at ${BASE_URL}"
  return 1
}

case "${ACTION}" in
  start) start_server ;;
  stop) stop_server ;;
  status) status_server ;;
  *)
    echo "FAIL: unknown action '${ACTION}', expected start|stop|status"
    exit 16
    ;;
esac
