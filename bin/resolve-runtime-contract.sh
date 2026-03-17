#!/usr/bin/env bash
set -euo pipefail

# Cross-platform Python 3 (python3 | py -3 | python)
source "$(dirname "${BASH_SOURCE[0]}")/lib-python.sh"
require_py3

CONTRACT_FILE="${1:-${RUNTIME_CONTRACT_FILE:-}}"
CONTRACT_SCAN_DIR="${RUNTIME_CONTRACT_SCAN_DIR:-deploy}"
ALLOW_FALLBACK="${RUNTIME_CONTRACT_ALLOW_FALLBACK:-0}"

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "FAIL: resolve-runtime-contract requires '${cmd}'" >&2
    exit 1
  fi
}

require_py3

eval "$({
py3 - "${CONTRACT_FILE}" "${CONTRACT_SCAN_DIR}" "${ALLOW_FALLBACK}" <<'PY'
import json
import os
import shlex
import subprocess
import sys
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

import yaml

contract_arg = sys.argv[1].strip()
scan_dir = Path(sys.argv[2])
allow_fallback = sys.argv[3] == "1"

overrides = {
    key: os.environ.get(key)
    for key in ("BASE_URL", "BASE_HEALTH_URL", "E2E_API_PROXY_TARGET", "BACKEND_PORT")
}


def shell_assignment(key: str, value: str) -> str:
    return f"{key}={shlex.quote(value)}"


def load_contract(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def probe_env_equals(probe: dict, _data: dict) -> bool:
    name = str(probe.get("name") or "").strip()
    expected = str(probe.get("value") or "").strip()
    return bool(name) and os.environ.get(name) == expected


def probe_docker_container_running(probe: dict, _data: dict) -> bool:
    container = str(probe.get("container") or "").strip()
    if not container:
        return False
    try:
        output = subprocess.check_output(
            ["docker", "ps", "--format", "{{.Names}}"],
            stderr=subprocess.DEVNULL,
            text=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False
    names = {line.strip() for line in output.splitlines() if line.strip()}
    return container in names


def probe_http_ok(probe: dict, data: dict) -> bool:
    url = str(probe.get("url") or data.get("health_url") or "").strip()
    if not url:
        return False
    timeout_ms = probe.get("timeout_ms")
    try:
        timeout = max(float(timeout_ms) / 1000.0, 0.2) if timeout_ms is not None else 2.0
    except (TypeError, ValueError):
        timeout = 2.0
    request = Request(url, method="GET")
    try:
        with urlopen(request, timeout=timeout) as response:
            return 200 <= getattr(response, "status", 0) < 300
    except (URLError, OSError, ValueError):
        return False


PROBE_HANDLERS = {
    "env_equals": probe_env_equals,
    "docker_container_running": probe_docker_container_running,
    "http_ok": probe_http_ok,
}


def evaluate_candidate(path: Path) -> dict:
    data = load_contract(path)
    selection = data.get("selection") or {}
    if not isinstance(selection, dict):
        selection = {}
    try:
        priority = int(selection.get("priority", 0))
    except (TypeError, ValueError):
        priority = 0
    default = bool(selection.get("default", False))
    probes = selection.get("probes") or []
    matched = True
    if probes:
        for probe in probes:
            if not isinstance(probe, dict):
                matched = False
                break
            probe_type = str(probe.get("type") or "").strip()
            handler = PROBE_HANDLERS.get(probe_type)
            if handler is None or not handler(probe, data):
                matched = False
                break
    return {
        "path": path,
        "data": data,
        "priority": priority,
        "default": default,
        "matched": matched,
    }


def fail(message: str) -> None:
    print(f"echo {shlex.quote(message)} >&2")
    print("exit 1")
    sys.exit(0)


def pick_contract() -> tuple[Path, dict]:
    if contract_arg:
        explicit = Path(contract_arg)
        if explicit.exists():
            return explicit, load_contract(explicit)
        if not allow_fallback:
            fail(f"FAIL: runtime contract missing: {explicit}")
        return explicit, {}

    candidates = sorted(scan_dir.glob("runtime-contract*.yaml")) if scan_dir.exists() else []
    if not candidates:
        fallback = Path("deploy/runtime-contract.dev.yaml")
        if fallback.exists():
            return fallback, load_contract(fallback)
        if not allow_fallback:
            fail(f"FAIL: runtime contract scan dir has no runtime-contract*.yaml: {scan_dir}")
        return fallback, {}

    evaluations = [evaluate_candidate(path) for path in candidates]
    matched = [item for item in evaluations if item["matched"]]
    if matched:
        picked = sorted(matched, key=lambda item: (item["priority"], str(item["path"])), reverse=True)[0]
        return picked["path"], picked["data"]

    defaults = [item for item in evaluations if item["default"]]
    if defaults:
        picked = sorted(defaults, key=lambda item: (item["priority"], str(item["path"])), reverse=True)[0]
        return picked["path"], picked["data"]

    if not allow_fallback:
        fail(f"FAIL: no runtime contract matched selection probes under {scan_dir}")
    picked = sorted(evaluations, key=lambda item: (item["priority"], str(item["path"])), reverse=True)[0]
    return picked["path"], picked["data"]


contract_path, data = pick_contract()

port = overrides["BACKEND_PORT"] or str(data.get("port") or "")
base_url = overrides["BASE_URL"] or str(data.get("base_url") or "")
health_url = overrides["BASE_HEALTH_URL"] or str(data.get("health_url") or "")
proxy_target = overrides["E2E_API_PROXY_TARGET"] or str(data.get("proxy_target") or "")
runtime_env_file = str(data.get("env_file") or "")
run_command = str(data.get("run_command") or "")
classpath_mode = str(data.get("classpath_mode") or "")
mode = str(data.get("mode") or "")
tool_env = data.get("tool_env") or {}
if not isinstance(tool_env, dict):
    tool_env = {}
tool_env = {
    str(key): str(value)
    for key, value in tool_env.items()
    if str(key).strip() and str(value).strip()
}

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
    fail("FAIL: runtime contract incomplete: " + ", ".join(missing))

for key, value in {
    "RESOLVED_BACKEND_PORT": port,
    "RESOLVED_BASE_URL": base_url,
    "RESOLVED_BASE_HEALTH_URL": health_url,
    "RESOLVED_E2E_API_PROXY_TARGET": proxy_target,
    "RESOLVED_RUNTIME_CONTRACT_FILE": str(contract_path),
    "RESOLVED_RUNTIME_ENV_FILE": runtime_env_file,
    "RESOLVED_RUNTIME_RUN_COMMAND": run_command,
    "RESOLVED_RUNTIME_CLASSPATH_MODE": classpath_mode,
    "RESOLVED_RUNTIME_MODE": mode,
    "RESOLVED_RUNTIME_TOOL_ENV_JSON": json.dumps(tool_env, ensure_ascii=False, separators=(",", ":")),
}.items():
    print(shell_assignment(key, value))
PY
})"

printf 'RESOLVED_BACKEND_PORT=%q\n' "${RESOLVED_BACKEND_PORT}"
printf 'RESOLVED_BASE_URL=%q\n' "${RESOLVED_BASE_URL}"
printf 'RESOLVED_BASE_HEALTH_URL=%q\n' "${RESOLVED_BASE_HEALTH_URL}"
printf 'RESOLVED_E2E_API_PROXY_TARGET=%q\n' "${RESOLVED_E2E_API_PROXY_TARGET}"
printf 'RESOLVED_RUNTIME_CONTRACT_FILE=%q\n' "${RESOLVED_RUNTIME_CONTRACT_FILE:-}"
printf 'RESOLVED_RUNTIME_ENV_FILE=%q\n' "${RESOLVED_RUNTIME_ENV_FILE:-}"
printf 'RESOLVED_RUNTIME_RUN_COMMAND=%q\n' "${RESOLVED_RUNTIME_RUN_COMMAND:-}"
printf 'RESOLVED_RUNTIME_CLASSPATH_MODE=%q\n' "${RESOLVED_RUNTIME_CLASSPATH_MODE:-}"
printf 'RESOLVED_RUNTIME_MODE=%q\n' "${RESOLVED_RUNTIME_MODE:-}"
printf "RESOLVED_RUNTIME_TOOL_ENV_JSON='%s'\n" "${RESOLVED_RUNTIME_TOOL_ENV_JSON:-}"
