#!/usr/bin/env bash
set -euo pipefail

# Cross-platform Python 3 (python3 | py -3 | python)
source "$(dirname "${BASH_SOURCE[0]}")/lib-python.sh"
require_py3

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Cross-platform process helpers
source "${ROOT_DIR}/bin/lib-process.sh"

free_port() {
  py3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
}

PORT="${ADMIN_PREVIEW_SELFTEST_PORT:-$(free_port)}"
BASE_URL="http://127.0.0.1:${PORT}"
PID_FILE="/tmp/osg-admin-preview-${PORT}.pid"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/admin-preview-selftest.XXXXXX")"
SERVER_PID=""
PROTOTYPE_PORT="$(free_port)"
BACKEND_PORT="$(free_port)"
PREVIEW_PORT="$(free_port)"
PREVIEW_BASE_URL="http://127.0.0.1:${PREVIEW_PORT}"
PREVIEW_PID_FILE="/tmp/osg-admin-preview-${PREVIEW_PORT}.pid"
PROTOTYPE_ROOT="${TMP_DIR}/prototype"
PREVIEW_ROOT="${TMP_DIR}/preview"
LAUNCHER_PID=""

cleanup() {
  if [[ -n "${LAUNCHER_PID}" ]]; then
    kill_tree_pid "${LAUNCHER_PID}" >/dev/null 2>&1 || true
    LAUNCHER_PID=""
  fi
  if [[ -n "${SERVER_PID}" ]]; then
    kill_pid "${SERVER_PID}" >/dev/null 2>&1 || true
    SERVER_PID=""
  fi
  rm -f "${PID_FILE}"
  ADMIN_PREVIEW_PORT="${PREVIEW_PORT}" bash "${ROOT_DIR}/bin/admin-preview-server.sh" stop >/dev/null 2>&1 || true
  PROTOTYPE_PORT="${PROTOTYPE_PORT}" PROTOTYPE_ROOT_DIR="${PROTOTYPE_ROOT}" \
    bash "${ROOT_DIR}/bin/prototype-server.sh" stop >/dev/null 2>&1 || true
  rm -f "${PREVIEW_PID_FILE}"
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

mkdir -p "${PROTOTYPE_ROOT}" "${PREVIEW_ROOT}"
cat > "${TMP_DIR}/login" <<'EOF'
ok
EOF
cat > "${PROTOTYPE_ROOT}/index.html" <<'EOF'
prototype
EOF
cat > "${PREVIEW_ROOT}/login" <<'EOF'
preview
EOF

SERVER_PID="$(
  py3 - "${PORT}" "${TMP_DIR}" <<'PY'
import subprocess
import sys

port = sys.argv[1]
root = sys.argv[2]
proc = subprocess.Popen(
    [sys.executable, "-m", "http.server", port, "--bind", "127.0.0.1", "--directory", root],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    start_new_session=True,
)
print(proc.pid)
PY
)"

for _ in {1..50}; do
  if curl -fsS --max-time 1 "${BASE_URL}/login" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

if ! curl -fsS --max-time 1 "${BASE_URL}/login" >/dev/null 2>&1; then
  echo "FAIL: selftest server did not start"
  exit 1
fi

rm -f "${PID_FILE}"

status_output="$(ADMIN_PREVIEW_PORT="${PORT}" bash "${ROOT_DIR}/bin/admin-preview-server.sh" status 2>&1)" || {
  printf '%s\n' "${status_output}"
  echo "FAIL: status should adopt healthy listener without pid file"
  exit 1
}
printf '%s\n' "${status_output}" | grep -q "PASS: admin preview running" || {
  printf '%s\n' "${status_output}"
  echo "FAIL: status output missing PASS marker"
  exit 1
}

[[ -f "${PID_FILE}" ]] || {
  echo "FAIL: status should recreate pid file after adoption"
  exit 1
}

stop_output="$(ADMIN_PREVIEW_PORT="${PORT}" bash "${ROOT_DIR}/bin/admin-preview-server.sh" stop 2>&1)" || {
  printf '%s\n' "${stop_output}"
  echo "FAIL: stop should stop adopted listener"
  exit 1
}
printf '%s\n' "${stop_output}" | grep -q "PASS: admin preview stopped" || {
  printf '%s\n' "${stop_output}"
  echo "FAIL: stop output missing PASS marker"
  exit 1
}

if curl -fsS --max-time 1 "${BASE_URL}/login" >/dev/null 2>&1; then
  echo "FAIL: adopted listener still reachable after stop"
  exit 1
fi

prototype_start_output="$(
  PROTOTYPE_PORT="${PROTOTYPE_PORT}" \
  PROTOTYPE_ROOT_DIR="${PROTOTYPE_ROOT}" \
  bash "${ROOT_DIR}/bin/prototype-server.sh" start 2>&1
)" || {
  printf '%s\n' "${prototype_start_output}"
  echo "FAIL: prototype server should start for convergence selftest"
  exit 1
}

restart_output="$(
  ADMIN_PREVIEW_PORT="${PREVIEW_PORT}" \
  ADMIN_PREVIEW_APP_DIR="${PREVIEW_ROOT}" \
  ADMIN_PREVIEW_BUILD_CMD="true" \
  ADMIN_PREVIEW_START_CMD="cd '${PREVIEW_ROOT}' && exec $(py3_shell) -m http.server '${PREVIEW_PORT}' --bind 127.0.0.1 --directory '${PREVIEW_ROOT}'" \
  PROTOTYPE_PORT="${PROTOTYPE_PORT}" \
  PROTOTYPE_ROOT_DIR="${PROTOTYPE_ROOT}" \
  BACKEND_PORT="${BACKEND_PORT}" \
  BASE_URL="http://127.0.0.1:${BACKEND_PORT}" \
  BASE_HEALTH_URL="http://127.0.0.1:${BACKEND_PORT}/actuator/health" \
  E2E_API_PROXY_TARGET="http://127.0.0.1:${BACKEND_PORT}" \
  bash "${ROOT_DIR}/bin/admin-preview-server.sh" restart 2>&1
)" || {
  printf '%s\n' "${restart_output}"
  echo "FAIL: restart should converge runtime and start preview"
  exit 1
}

if PROTOTYPE_PORT="${PROTOTYPE_PORT}" PROTOTYPE_ROOT_DIR="${PROTOTYPE_ROOT}" \
  bash "${ROOT_DIR}/bin/prototype-server.sh" status >/dev/null 2>&1; then
  echo "FAIL: restart should stop prototype residue before preview start"
  exit 1
fi
if ! curl -fsS --max-time 1 "${PREVIEW_BASE_URL}/login" >/dev/null 2>&1; then
  echo "FAIL: preview should be reachable after restart"
  exit 1
fi

ADMIN_PREVIEW_PORT="${PREVIEW_PORT}" bash "${ROOT_DIR}/bin/admin-preview-server.sh" stop >/dev/null 2>&1 || true

LAUNCHER_PID="$(
  py3 - <<PY
import subprocess

cmd = """set -euo pipefail
ADMIN_PREVIEW_PORT='${PREVIEW_PORT}' \\
ADMIN_PREVIEW_APP_DIR='${PREVIEW_ROOT}' \\
ADMIN_PREVIEW_BUILD_CMD='true' \\
ADMIN_PREVIEW_START_CMD=\\"cd '${PREVIEW_ROOT}' && exec $(py3_shell) -m http.server '${PREVIEW_PORT}' --bind 127.0.0.1 --directory '${PREVIEW_ROOT}'\\" \\
PROTOTYPE_PORT='${PROTOTYPE_PORT}' \\
PROTOTYPE_ROOT_DIR='${PROTOTYPE_ROOT}' \\
BACKEND_PORT='${BACKEND_PORT}' \\
BASE_URL='http://127.0.0.1:${BACKEND_PORT}' \\
BASE_HEALTH_URL='http://127.0.0.1:${BACKEND_PORT}/actuator/health' \\
E2E_API_PROXY_TARGET='http://127.0.0.1:${BACKEND_PORT}' \\
bash '${ROOT_DIR}/bin/admin-preview-server.sh' start
sleep 300
"""
proc = subprocess.Popen(
    ["bash", "-lc", cmd],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    start_new_session=True,
)
print(proc.pid)
PY
)"

for _ in {1..40}; do
  if curl -fsS --max-time 1 "${PREVIEW_BASE_URL}/login" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

if ! curl -fsS --max-time 1 "${PREVIEW_BASE_URL}/login" >/dev/null 2>&1; then
  echo "FAIL: detached-launch regression setup should start preview"
  exit 1
fi

kill -TERM -"${LAUNCHER_PID}" >/dev/null 2>&1 || true
wait "${LAUNCHER_PID}" 2>/dev/null || true
LAUNCHER_PID=""
sleep 1

detach_status_output="$(
  ADMIN_PREVIEW_PORT="${PREVIEW_PORT}" \
  ADMIN_PREVIEW_APP_DIR="${PREVIEW_ROOT}" \
  ADMIN_PREVIEW_BUILD_CMD="true" \
  ADMIN_PREVIEW_START_CMD="cd '${PREVIEW_ROOT}' && exec $(py3_shell) -m http.server '${PREVIEW_PORT}' --bind 127.0.0.1 --directory '${PREVIEW_ROOT}'" \
  bash "${ROOT_DIR}/bin/admin-preview-server.sh" status 2>&1
)" || {
  echo "FAIL: admin preview should survive parent shell termination once started"
  echo "${detach_status_output}"
  exit 1
}

echo "PASS: admin-preview-server-selftest"
