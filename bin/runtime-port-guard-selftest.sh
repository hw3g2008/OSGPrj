#!/usr/bin/env bash
set -euo pipefail

# Cross-platform Python 3 (python3 | py -3 | python)
source "$(dirname "${BASH_SOURCE[0]}")/lib-python.sh"
require_py3

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
free_port() {
  py3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
}

PORT="$(py3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
)"

TMP_DIR="$(mktemp -d)"
SERVER_LOG="${TMP_DIR}/http.log"
PROTOTYPE_ROOT="${TMP_DIR}/prototype"
PROTOTYPE_PORT="$(free_port)"
ADMIN_PREVIEW_PORT="$(free_port)"
BACKEND_PORT="$(free_port)"
BACKEND_BASE_URL="http://127.0.0.1:${BACKEND_PORT}"
BACKEND_HEALTH_URL="${BACKEND_BASE_URL}/actuator/health"
UNKNOWN_SERVER_PID=""

# Cross-platform process helpers
source "${ROOT_DIR}/bin/lib-process.sh"

cleanup() {
  PROTOTYPE_PORT="${PROTOTYPE_PORT}" PROTOTYPE_ROOT_DIR="${PROTOTYPE_ROOT}" \
    bash "${ROOT_DIR}/bin/prototype-server.sh" stop >/dev/null 2>&1 || true
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill_pid "${SERVER_PID}" || true
  fi
  if [[ -n "${UNKNOWN_SERVER_PID}" ]]; then
    kill_pid "${UNKNOWN_SERVER_PID}" || true
  fi
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

SERVER_PID="$(
  py3 - "${PORT}" <<'PY'
import subprocess
import sys

port = sys.argv[1]
proc = subprocess.Popen(
    [sys.executable, "-m", "http.server", port, "--bind", "127.0.0.1"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    start_new_session=True,
)
print(proc.pid)
PY
)"

for _ in {1..20}; do
  if curl -fsS --max-time 1 "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

set +e
occupied_output="$(
  bash "${ROOT_DIR}/bin/runtime-port-guard.sh" --mode require-free --port "${PORT}" --context selftest 2>&1
)"
occupied_rc=$?
set -e

if (( occupied_rc == 0 )); then
  echo "FAIL: require-free should fail when port is occupied"
  exit 1
fi
if [[ "${occupied_output}" != *"port ${PORT} already in use"* ]]; then
  echo "FAIL: occupied output missing port failure message"
  echo "${occupied_output}"
  exit 1
fi
if [[ "${occupied_output}" != *"http.server"* ]]; then
  echo "FAIL: occupied output missing listener command details"
  echo "${occupied_output}"
  exit 1
fi

kill_pid "${SERVER_PID}" || true
SERVER_PID=""

free_output="$(bash "${ROOT_DIR}/bin/runtime-port-guard.sh" --mode require-free --port "${PORT}" --context selftest 2>&1)"
if [[ "${free_output}" != *"PASS: port ${PORT} free"* ]]; then
  echo "FAIL: free output missing success message"
  echo "${free_output}"
  exit 1
fi

mkdir -p "${PROTOTYPE_ROOT}"
cat > "${PROTOTYPE_ROOT}/index.html" <<'EOF'
prototype selftest
EOF

managed_start_output="$(
  PROTOTYPE_PORT="${PROTOTYPE_PORT}" \
  PROTOTYPE_ROOT_DIR="${PROTOTYPE_ROOT}" \
  bash "${ROOT_DIR}/bin/prototype-server.sh" start 2>&1
)" || {
  echo "FAIL: prototype selftest server did not start"
  echo "${managed_start_output}"
  exit 1
}

set +e
converge_output="$(
  PROTOTYPE_PORT="${PROTOTYPE_PORT}" \
  ADMIN_PREVIEW_PORT="${ADMIN_PREVIEW_PORT}" \
  BACKEND_PORT="${BACKEND_PORT}" \
  BASE_URL="${BACKEND_BASE_URL}" \
  BASE_HEALTH_URL="${BACKEND_HEALTH_URL}" \
  E2E_API_PROXY_TARGET="${BACKEND_BASE_URL}" \
  PROTOTYPE_ROOT_DIR="${PROTOTYPE_ROOT}" \
  bash "${ROOT_DIR}/bin/runtime-port-guard.sh" \
    --mode converge-runtime \
    --target dev-local \
    --context selftest-managed-prototype 2>&1
)"
converge_rc=$?
set -e

if (( converge_rc != 0 )); then
  echo "FAIL: converge-runtime should stop managed prototype listeners for dev-local"
  echo "${converge_output}"
  exit 1
fi
if PROTOTYPE_PORT="${PROTOTYPE_PORT}" PROTOTYPE_ROOT_DIR="${PROTOTYPE_ROOT}" \
  bash "${ROOT_DIR}/bin/prototype-server.sh" status >/dev/null 2>&1; then
  echo "FAIL: converge-runtime should stop managed prototype server"
  exit 1
fi

py3 -m http.server "${PROTOTYPE_PORT}" --bind 127.0.0.1 --directory "${TMP_DIR}" >"${TMP_DIR}/unknown.log" 2>&1 &
UNKNOWN_SERVER_PID=$!
rm -f "/tmp/osg-prototype-server-${PROTOTYPE_PORT}.pid"
for _ in {1..20}; do
  if lsof -nP -iTCP:"${PROTOTYPE_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

set +e
unknown_output="$(
  PROTOTYPE_PORT="${PROTOTYPE_PORT}" \
  ADMIN_PREVIEW_PORT="${ADMIN_PREVIEW_PORT}" \
  BACKEND_PORT="${BACKEND_PORT}" \
  BASE_URL="${BACKEND_BASE_URL}" \
  BASE_HEALTH_URL="${BACKEND_HEALTH_URL}" \
  E2E_API_PROXY_TARGET="${BACKEND_BASE_URL}" \
  PROTOTYPE_ROOT_DIR="${PROTOTYPE_ROOT}" \
  bash "${ROOT_DIR}/bin/runtime-port-guard.sh" \
    --mode converge-runtime \
    --target dev-local \
    --context selftest-unknown-prototype 2>&1
)"
unknown_rc=$?
set -e

if (( unknown_rc == 0 )); then
  echo "FAIL: converge-runtime should fail on unknown prototype listener"
  echo "${unknown_output}"
  exit 1
fi
if [[ "${unknown_output}" != *"unknown listener"* ]]; then
  echo "FAIL: unknown listener output missing reason"
  echo "${unknown_output}"
  exit 1
fi
if [[ "${unknown_output}" != *"http.server"* ]]; then
  echo "FAIL: unknown listener output missing ps evidence"
  echo "${unknown_output}"
  exit 1
fi
if ! curl -fsS --max-time 1 "http://127.0.0.1:${PROTOTYPE_PORT}/" >/dev/null 2>&1; then
  echo "FAIL: unknown listener should remain reachable after failed converge-runtime"
  exit 1
fi

echo "PASS: runtime-port-guard-selftest"
