#!/usr/bin/env bash
set -euo pipefail

CONTRACT_FILE="${1:-${RUNTIME_CONTRACT_FILE:-deploy/runtime-contract.dev.yaml}}"
ALLOW_FALLBACK="${RUNTIME_CONTRACT_ALLOW_FALLBACK:-0}"

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "FAIL: resolve-runtime-contract requires '${cmd}'" >&2
    exit 1
  fi
}

require_cmd python3

eval "$(
python3 - "${CONTRACT_FILE}" "${ALLOW_FALLBACK}" <<'PY'
import shlex
import sys
from pathlib import Path

import yaml

contract_path = Path(sys.argv[1])
allow_fallback = sys.argv[2] == "1"

env = {
    "BASE_URL": None,
    "BASE_HEALTH_URL": None,
    "E2E_API_PROXY_TARGET": None,
    "BACKEND_PORT": None,
}

import os
for key in env:
    value = os.environ.get(key)
    if value:
        env[key] = value

data = {}
if contract_path.exists():
    data = yaml.safe_load(contract_path.read_text(encoding="utf-8")) or {}
elif not allow_fallback:
    print(f"echo {shlex.quote(f'FAIL: runtime contract missing: {contract_path}')} >&2")
    print("exit 1")
    sys.exit(0)

port = env["BACKEND_PORT"] or str(data.get("port") or "")
base_url = env["BASE_URL"] or str(data.get("base_url") or "")
health_url = env["BASE_HEALTH_URL"] or str(data.get("health_url") or "")
proxy_target = env["E2E_API_PROXY_TARGET"] or str(data.get("proxy_target") or "")
runtime_env_file = str(data.get("env_file") or "")
run_command = str(data.get("run_command") or "")
classpath_mode = str(data.get("classpath_mode") or "")

if allow_fallback:
    fallback_port = port or "28080"
    fallback_base = base_url or f"http://127.0.0.1:{fallback_port}"
    fallback_health = health_url or f"{fallback_base}/actuator/health"
    fallback_proxy = proxy_target or fallback_base
    print("echo 'WARN: using deprecated runtime fallback' >&2")
    port = fallback_port
    base_url = fallback_base
    health_url = fallback_health
    proxy_target = fallback_proxy

missing = []
for key, value in {
    "BACKEND_PORT": port,
    "BASE_URL": base_url,
    "BASE_HEALTH_URL": health_url,
    "E2E_API_PROXY_TARGET": proxy_target,
}.items():
    if not value:
        missing.append(key)

if missing:
    print(f"echo {shlex.quote('FAIL: runtime contract incomplete: ' + ', '.join(missing))} >&2")
    print("exit 1")
    sys.exit(0)

for key, value in {
    "RESOLVED_BACKEND_PORT": port,
    "RESOLVED_BASE_URL": base_url,
    "RESOLVED_BASE_HEALTH_URL": health_url,
    "RESOLVED_E2E_API_PROXY_TARGET": proxy_target,
    "RESOLVED_RUNTIME_CONTRACT_FILE": str(contract_path),
    "RESOLVED_RUNTIME_ENV_FILE": runtime_env_file,
    "RESOLVED_RUNTIME_RUN_COMMAND": run_command,
    "RESOLVED_RUNTIME_CLASSPATH_MODE": classpath_mode,
}.items():
    print(f"{key}={shlex.quote(value)}")
PY
)"

printf 'RESOLVED_BACKEND_PORT=%q\n' "${RESOLVED_BACKEND_PORT}"
printf 'RESOLVED_BASE_URL=%q\n' "${RESOLVED_BASE_URL}"
printf 'RESOLVED_BASE_HEALTH_URL=%q\n' "${RESOLVED_BASE_HEALTH_URL}"
printf 'RESOLVED_E2E_API_PROXY_TARGET=%q\n' "${RESOLVED_E2E_API_PROXY_TARGET}"
printf 'RESOLVED_RUNTIME_CONTRACT_FILE=%q\n' "${RESOLVED_RUNTIME_CONTRACT_FILE:-}"
printf 'RESOLVED_RUNTIME_ENV_FILE=%q\n' "${RESOLVED_RUNTIME_ENV_FILE:-}"
printf 'RESOLVED_RUNTIME_RUN_COMMAND=%q\n' "${RESOLVED_RUNTIME_RUN_COMMAND:-}"
printf 'RESOLVED_RUNTIME_CLASSPATH_MODE=%q\n' "${RESOLVED_RUNTIME_CLASSPATH_MODE:-}"
