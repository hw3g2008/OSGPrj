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

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/backend-dev-server-selftest.XXXXXX")"
PORT="$(free_port)"
ADMIN_PREVIEW_PORT="$(free_port)"
PROTOTYPE_PORT="$(free_port)"
ENV_FILE="${TMP_DIR}/backend.env"
RUNTIME_CONTRACT="${TMP_DIR}/runtime-contract.dev.yaml"
SERVER_SCRIPT="${TMP_DIR}/backend-selftest-managed.py"
WARM_SERVER_SCRIPT="${TMP_DIR}/backend-selftest-managed-warm.py"
UNKNOWN_LOG="${TMP_DIR}/unknown.log"
PID_FILE="/tmp/osg-backend-dev-${PORT}.pid"
MANAGED_SUBSTRING="backend-selftest-managed"
UNKNOWN_PID=""
LAUNCHER_PID=""

cleanup() {
  if [[ -n "${LAUNCHER_PID}" ]]; then
    kill "${LAUNCHER_PID}" >/dev/null 2>&1 || true
    wait "${LAUNCHER_PID}" 2>/dev/null || true
  fi
  RUNTIME_CONTRACT_FILE="${RUNTIME_CONTRACT}" \
  BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING="${MANAGED_SUBSTRING}" \
  bash "${ROOT_DIR}/bin/backend-dev-server.sh" stop "${ENV_FILE}" >/dev/null 2>&1 || true
  if [[ -n "${UNKNOWN_PID}" ]]; then
    kill "${UNKNOWN_PID}" >/dev/null 2>&1 || true
    wait "${UNKNOWN_PID}" 2>/dev/null || true
  fi
  rm -f "${PID_FILE}"
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

cat > "${ENV_FILE}" <<'EOF'
BACKEND_SELFTEST=1
EOF

cat > "${RUNTIME_CONTRACT}" <<EOF
mode: local-backend-remote-deps
stack: springboot-vue
classpath_mode: workspace-reactor
env_file: ${ENV_FILE}
run_command: bash bin/run-backend-dev.sh ${ENV_FILE}
port: ${PORT}
base_url: http://127.0.0.1:${PORT}
health_url: http://127.0.0.1:${PORT}/actuator/health
proxy_target: http://127.0.0.1:${PORT}
deps:
  mysql: remote
  redis: remote
providers: {}
evidence_sinks: {}
evidence_paths: {}
EOF

cat > "${SERVER_SCRIPT}" <<'PY'
import http.server
import json
import socketserver
import sys

PORT = int(sys.argv[1])


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/actuator/health":
            body = json.dumps({"status": "UP"}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        body = b"backend-selftest-managed"
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, _format, *_args):
        return


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


with ReusableTCPServer(("127.0.0.1", PORT), Handler) as httpd:
    httpd.serve_forever()
PY

cat > "${WARM_SERVER_SCRIPT}" <<'PY'
import http.server
import json
import socketserver
import sys
import time

PORT = int(sys.argv[1])
READY_AFTER = time.time() + 2.5


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/actuator/health":
            if time.time() < READY_AFTER:
                body = json.dumps({"status": "STARTING"}).encode("utf-8")
                self.send_response(503)
            else:
                body = json.dumps({"status": "UP"}).encode("utf-8")
                self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        body = b"backend-selftest-managed"
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, _format, *_args):
        return


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


with ReusableTCPServer(("127.0.0.1", PORT), Handler) as httpd:
    httpd.serve_forever()
PY

set +e
status_output="$(
  RUNTIME_CONTRACT_FILE="${RUNTIME_CONTRACT}" \
  BACKEND_DEV_SERVER_START_CMD="exec python3 '${SERVER_SCRIPT}' '${PORT}'" \
  BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING="${MANAGED_SUBSTRING}" \
  bash "${ROOT_DIR}/bin/backend-dev-server.sh" status "${ENV_FILE}" 2>&1
)"
status_rc=$?
set -e

if (( status_rc == 0 )); then
  echo "FAIL: status should fail before managed backend starts"
  echo "${status_output}"
  exit 1
fi

start_output="$(
  RUNTIME_CONTRACT_FILE="${RUNTIME_CONTRACT}" \
  BACKEND_DEV_SERVER_START_CMD="exec python3 '${SERVER_SCRIPT}' '${PORT}'" \
  BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING="${MANAGED_SUBSTRING}" \
  bash "${ROOT_DIR}/bin/backend-dev-server.sh" start "${ENV_FILE}" 2>&1
)" || {
  echo "FAIL: start should launch managed backend wrapper"
  echo "${start_output}"
  exit 1
}

if ! curl -fsS --max-time 1 "http://127.0.0.1:${PORT}/actuator/health" >/dev/null 2>&1; then
  echo "FAIL: managed backend should answer health checks after start"
  exit 1
fi

rm -f "${PID_FILE}"
adopt_status_output="$(
  RUNTIME_CONTRACT_FILE="${RUNTIME_CONTRACT}" \
  BACKEND_DEV_SERVER_START_CMD="exec python3 '${SERVER_SCRIPT}' '${PORT}'" \
  BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING="${MANAGED_SUBSTRING}" \
  bash "${ROOT_DIR}/bin/backend-dev-server.sh" status "${ENV_FILE}" 2>&1
)" || {
  echo "FAIL: status should adopt managed backend listener when pid file is missing"
  echo "${adopt_status_output}"
  exit 1
}

[[ -f "${PID_FILE}" ]] || {
  echo "FAIL: status should recreate pid file after adopting managed backend"
  exit 1
}

stop_after_adopt_output="$(
  RUNTIME_CONTRACT_FILE="${RUNTIME_CONTRACT}" \
  BACKEND_DEV_SERVER_START_CMD="exec python3 '${SERVER_SCRIPT}' '${PORT}'" \
  BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING="${MANAGED_SUBSTRING}" \
  bash "${ROOT_DIR}/bin/backend-dev-server.sh" stop "${ENV_FILE}" 2>&1
)" || {
  echo "FAIL: stop should clean up managed backend before detach regression test"
  echo "${stop_after_adopt_output}"
  exit 1
}

LAUNCHER_PID="$(
  python3 - <<PY
import subprocess

cmd = """set -euo pipefail
RUNTIME_CONTRACT_FILE='${RUNTIME_CONTRACT}' \\
BACKEND_DEV_SERVER_START_CMD=\\"exec python3 '${SERVER_SCRIPT}' '${PORT}'\\" \\
BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING='${MANAGED_SUBSTRING}' \\
bash '${ROOT_DIR}/bin/backend-dev-server.sh' start '${ENV_FILE}'
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
  if curl -fsS --max-time 1 "http://127.0.0.1:${PORT}/actuator/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

if ! curl -fsS --max-time 1 "http://127.0.0.1:${PORT}/actuator/health" >/dev/null 2>&1; then
  echo "FAIL: detached-launch regression setup should start managed backend"
  exit 1
fi

kill -TERM -"${LAUNCHER_PID}" >/dev/null 2>&1 || true
wait "${LAUNCHER_PID}" 2>/dev/null || true
LAUNCHER_PID=""
sleep 1

detach_status_output="$(
  RUNTIME_CONTRACT_FILE="${RUNTIME_CONTRACT}" \
  BACKEND_DEV_SERVER_START_CMD="exec python3 '${SERVER_SCRIPT}' '${PORT}'" \
  BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING="${MANAGED_SUBSTRING}" \
  bash "${ROOT_DIR}/bin/backend-dev-server.sh" status "${ENV_FILE}" 2>&1
)" || {
  echo "FAIL: managed backend should survive parent shell termination once started"
  echo "${detach_status_output}"
  exit 1
}

converge_output="$(
  RUNTIME_CONTRACT_FILE="${RUNTIME_CONTRACT}" \
  BACKEND_DEV_SERVER_START_CMD="exec python3 '${SERVER_SCRIPT}' '${PORT}'" \
  BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING="${MANAGED_SUBSTRING}" \
  ADMIN_PREVIEW_PORT="${ADMIN_PREVIEW_PORT}" \
  PROTOTYPE_PORT="${PROTOTYPE_PORT}" \
  bash "${ROOT_DIR}/bin/runtime-port-guard.sh" \
    --mode converge-runtime \
    --target prototype-only \
    --context backend-selftest 2>&1
)" || {
  echo "FAIL: converge-runtime should stop managed backend when entering prototype-only"
  echo "${converge_output}"
  exit 1
}

set +e
post_converge_status="$(
  RUNTIME_CONTRACT_FILE="${RUNTIME_CONTRACT}" \
  BACKEND_DEV_SERVER_START_CMD="exec python3 '${SERVER_SCRIPT}' '${PORT}'" \
  BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING="${MANAGED_SUBSTRING}" \
  bash "${ROOT_DIR}/bin/backend-dev-server.sh" status "${ENV_FILE}" 2>&1
)"
post_converge_rc=$?
set -e
if (( post_converge_rc == 0 )); then
  echo "FAIL: converge-runtime prototype-only should stop managed backend"
  echo "${post_converge_status}"
  exit 1
fi

start_again_output="$(
  RUNTIME_CONTRACT_FILE="${RUNTIME_CONTRACT}" \
  BACKEND_DEV_SERVER_START_CMD="exec python3 '${SERVER_SCRIPT}' '${PORT}'" \
  BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING="${MANAGED_SUBSTRING}" \
  bash "${ROOT_DIR}/bin/backend-dev-server.sh" start "${ENV_FILE}" 2>&1
)" || {
  echo "FAIL: start should relaunch backend after convergence stop"
  echo "${start_again_output}"
  exit 1
}

OLD_PID="$(cat "${PID_FILE}")"
restart_output="$(
  RUNTIME_CONTRACT_FILE="${RUNTIME_CONTRACT}" \
  BACKEND_DEV_SERVER_START_CMD="exec python3 '${SERVER_SCRIPT}' '${PORT}'" \
  BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING="${MANAGED_SUBSTRING}" \
  bash "${ROOT_DIR}/bin/backend-dev-server.sh" restart "${ENV_FILE}" 2>&1
)" || {
  echo "FAIL: restart should recycle managed backend"
  echo "${restart_output}"
  exit 1
}
NEW_PID="$(cat "${PID_FILE}")"
if [[ "${OLD_PID}" == "${NEW_PID}" ]]; then
  echo "FAIL: restart should replace managed backend pid"
  exit 1
fi

stop_output="$(
  RUNTIME_CONTRACT_FILE="${RUNTIME_CONTRACT}" \
  BACKEND_DEV_SERVER_START_CMD="exec python3 '${SERVER_SCRIPT}' '${PORT}'" \
  BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING="${MANAGED_SUBSTRING}" \
  bash "${ROOT_DIR}/bin/backend-dev-server.sh" stop "${ENV_FILE}" 2>&1
)" || {
  echo "FAIL: stop should stop managed backend"
  echo "${stop_output}"
  exit 1
}

if curl -fsS --max-time 1 "http://127.0.0.1:${PORT}/actuator/health" >/dev/null 2>&1; then
  echo "FAIL: managed backend should be unreachable after stop"
  exit 1
fi

python3 -m http.server "${PORT}" --bind 127.0.0.1 --directory "${TMP_DIR}" >"${UNKNOWN_LOG}" 2>&1 &
UNKNOWN_PID=$!
for _ in {1..20}; do
  if lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

set +e
unknown_stop_output="$(
  RUNTIME_CONTRACT_FILE="${RUNTIME_CONTRACT}" \
  BACKEND_DEV_SERVER_START_CMD="exec python3 '${SERVER_SCRIPT}' '${PORT}'" \
  BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING="${MANAGED_SUBSTRING}" \
  bash "${ROOT_DIR}/bin/backend-dev-server.sh" stop "${ENV_FILE}" 2>&1
)"
unknown_stop_rc=$?
set -e

if (( unknown_stop_rc == 0 )); then
  echo "FAIL: stop should reject unknown listeners on backend port"
  echo "${unknown_stop_output}"
  exit 1
fi
if [[ "${unknown_stop_output}" != *"unknown listener"* ]]; then
  echo "FAIL: unknown listener stop output missing reason"
  echo "${unknown_stop_output}"
  exit 1
fi
if [[ "${unknown_stop_output}" != *"http.server"* ]]; then
  echo "FAIL: unknown listener stop output missing ps evidence"
  echo "${unknown_stop_output}"
  exit 1
fi
if ! curl -fsS --max-time 1 "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
  echo "FAIL: unknown listener should remain reachable after rejected stop"
  exit 1
fi

kill "${UNKNOWN_PID}" >/dev/null 2>&1 || true
wait "${UNKNOWN_PID}" 2>/dev/null || true
UNKNOWN_PID=""

warm_start_output="$(
  RUNTIME_CONTRACT_FILE="${RUNTIME_CONTRACT}" \
  BACKEND_DEV_SERVER_START_CMD="exec python3 '${WARM_SERVER_SCRIPT}' '${PORT}'" \
  BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING="${MANAGED_SUBSTRING}" \
  bash "${ROOT_DIR}/bin/backend-dev-server.sh" start "${ENV_FILE}" 2>&1
)" || {
  echo "FAIL: start should wait for managed listener health before failing unknown-listener checks"
  echo "${warm_start_output}"
  exit 1
}

if ! curl -fsS --max-time 1 "http://127.0.0.1:${PORT}/actuator/health" >/dev/null 2>&1; then
  echo "FAIL: warm listener should eventually become healthy after managed start"
  exit 1
fi

echo "PASS: backend-dev-server-selftest"
