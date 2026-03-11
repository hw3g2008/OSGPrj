#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
free_port() {
  python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
}

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/prototype-server-selftest.XXXXXX")"
PORT="${PROTOTYPE_SERVER_SELFTEST_PORT:-$(free_port)}"
BASE_URL="http://127.0.0.1:${PORT}"
PID_FILE="/tmp/osg-prototype-server-${PORT}.pid"
LAUNCHER_PID=""

cleanup() {
  if [[ -n "${LAUNCHER_PID}" ]]; then
    kill "${LAUNCHER_PID}" >/dev/null 2>&1 || true
    wait "${LAUNCHER_PID}" 2>/dev/null || true
  fi
  PROTOTYPE_PORT="${PORT}" PROTOTYPE_ROOT_DIR="${TMP_DIR}" \
    bash "${ROOT_DIR}/bin/prototype-server.sh" stop >/dev/null 2>&1 || true
  rm -f "${PID_FILE}"
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

cat > "${TMP_DIR}/index.html" <<'EOF'
prototype
EOF
cat > "${TMP_DIR}/admin.html" <<'EOF'
<html><body>prototype-admin</body></html>
EOF

set +e
status_output="$(
  PROTOTYPE_PORT="${PORT}" \
  PROTOTYPE_ROOT_DIR="${TMP_DIR}" \
  bash "${ROOT_DIR}/bin/prototype-server.sh" status 2>&1
)"
status_rc=$?
set -e

if (( status_rc == 0 )); then
  echo "FAIL: status should fail before prototype server starts"
  echo "${status_output}"
  exit 1
fi

start_output="$(
  PROTOTYPE_PORT="${PORT}" \
  PROTOTYPE_ROOT_DIR="${TMP_DIR}" \
  bash "${ROOT_DIR}/bin/prototype-server.sh" start 2>&1
)" || {
  echo "FAIL: start should launch prototype server"
  echo "${start_output}"
  exit 1
}

if ! curl -fsS --max-time 1 "${BASE_URL}/admin.html" >/dev/null 2>&1; then
  echo "FAIL: prototype server should serve admin.html after start"
  exit 1
fi

stop_output="$(
  PROTOTYPE_PORT="${PORT}" \
  PROTOTYPE_ROOT_DIR="${TMP_DIR}" \
  bash "${ROOT_DIR}/bin/prototype-server.sh" stop 2>&1
)" || {
  echo "FAIL: stop should stop prototype server"
  echo "${stop_output}"
  exit 1
}

if curl -fsS --max-time 1 "${BASE_URL}/admin.html" >/dev/null 2>&1; then
  echo "FAIL: prototype server should be unreachable after stop"
  exit 1
fi

LAUNCHER_PID="$(
  python3 - <<PY
import subprocess

cmd = """set -euo pipefail
PROTOTYPE_PORT='${PORT}' \\
PROTOTYPE_ROOT_DIR='${TMP_DIR}' \\
bash '${ROOT_DIR}/bin/prototype-server.sh' start
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
  if curl -fsS --max-time 1 "${BASE_URL}/admin.html" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

if ! curl -fsS --max-time 1 "${BASE_URL}/admin.html" >/dev/null 2>&1; then
  echo "FAIL: detached-launch regression setup should start prototype server"
  exit 1
fi

kill -TERM -"${LAUNCHER_PID}" >/dev/null 2>&1 || true
wait "${LAUNCHER_PID}" 2>/dev/null || true
LAUNCHER_PID=""
sleep 1

detach_status_output="$(
  PROTOTYPE_PORT="${PORT}" \
  PROTOTYPE_ROOT_DIR="${TMP_DIR}" \
  bash "${ROOT_DIR}/bin/prototype-server.sh" status 2>&1
)" || {
  echo "FAIL: prototype server should survive parent shell termination once started"
  echo "${detach_status_output}"
  exit 1
}

echo "PASS: prototype-server-selftest"
