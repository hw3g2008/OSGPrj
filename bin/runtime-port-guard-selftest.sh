#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
)"

TMP_DIR="$(mktemp -d)"
SERVER_LOG="${TMP_DIR}/http.log"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

python3 -m http.server "${PORT}" --bind 127.0.0.1 >"${SERVER_LOG}" 2>&1 &
SERVER_PID=$!

for _ in {1..20}; do
  if lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
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

kill "${SERVER_PID}" >/dev/null 2>&1 || true
wait "${SERVER_PID}" 2>/dev/null || true
SERVER_PID=""

free_output="$(bash "${ROOT_DIR}/bin/runtime-port-guard.sh" --mode require-free --port "${PORT}" --context selftest 2>&1)"
if [[ "${free_output}" != *"PASS: port ${PORT} free"* ]]; then
  echo "FAIL: free output missing success message"
  echo "${free_output}"
  exit 1
fi

echo "PASS: runtime-port-guard-selftest"
