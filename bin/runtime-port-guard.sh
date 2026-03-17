#!/usr/bin/env bash
set -euo pipefail

MODE=""
PORT=""
CONTEXT=""
TARGET=""
TARGET_BACKEND_PORT=""
TARGET_ADMIN_PREVIEW_PORT=""
TARGET_PROTOTYPE_PORT=""

usage() {
  cat <<'EOF'
Usage:
  bash bin/runtime-port-guard.sh --mode require-free --port <port> [--context <name>]
  bash bin/runtime-port-guard.sh --mode describe --port <port>
  bash bin/runtime-port-guard.sh --mode converge-runtime --target <dev-local|prototype-only|test-docker> [--context <name>]

Modes:
  require-free   Exit non-zero if the port already has a LISTEN process.
  describe       Print current LISTEN process details for the port (if any).
  converge-runtime
                 Stop conflicting project-managed runtimes and fail on unknown listeners.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --port)
      PORT="${2:-}"
      shift 2
      ;;
    --context)
      CONTEXT="${2:-}"
      shift 2
      ;;
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "FAIL: unknown arg '$1'" >&2
      usage >&2
      exit 1
      ;;
  esac
done

listener_pids_for_port() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null | sort -u
    return 0
  fi

  # Windows / Git Bash fallback
  if command -v netstat >/dev/null 2>&1; then
    netstat -ano -p tcp 2>/dev/null \
      | tr -d '\r' \
      | awk -v p=":${port}" '$1=="TCP" && $4=="LISTENING" && $2 ~ (p"$") {print $5}' \
      | sort -u
    return 0
  fi

  return 0
}

listener_pids() {
  listener_pids_for_port "${PORT}"
}

listener_primary_pid() {
  local port="$1"
  listener_pids_for_port "${port}" | head -n1
}

tracked_pid_from_file() {
  local path="$1"
  if [[ ! -f "${path}" ]]; then
    return 0
  fi
  cat "${path}" 2>/dev/null || true
}

pid_command() {
  local pid="$1"

  # Prefer POSIX ps when available and PID space matches.
  local out
  out="$(ps -o command= -p "${pid}" 2>/dev/null || true)"
  if [[ -n "${out}" ]]; then
    printf '%s\n' "${out}"
    return 0
  fi

  # Windows PID fallback: use PowerShell to fetch command line.
  local ps_bin=""
  if command -v powershell.exe >/dev/null 2>&1; then
    ps_bin="powershell.exe"
  elif command -v pwsh >/dev/null 2>&1; then
    ps_bin="pwsh"
  fi
  if [[ -z "${ps_bin}" ]]; then
    return 0
  fi

  out="$(${ps_bin} -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \"ProcessId=${pid}\" | Select-Object -ExpandProperty CommandLine)" 2>/dev/null | tr -d '\r' | head -n 1)"
  if [[ -n "${out}" ]]; then
    printf '%s\n' "${out}"
  fi
}

print_listener_details_for_port() {
  local port="$1"
  local pids pid
  pids="$(listener_pids_for_port "${port}" || true)"
  if [[ -z "${pids}" ]]; then
    return 0
  fi

  if command -v lsof >/dev/null 2>&1; then
    echo "INFO: lsof listeners for port ${port}:"
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN || true
  elif command -v netstat >/dev/null 2>&1; then
    echo "INFO: netstat listeners for port ${port}:"
    netstat -ano -p tcp 2>/dev/null | tr -d '\r' | awk -v p=":${port}" '$1=="TCP" && $4=="LISTENING" && $2 ~ (p"$")'
  fi

  while IFS= read -r pid; do
    [[ -z "${pid}" ]] && continue
    if ps_output="$(pid_command "${pid}")" && [[ -n "${ps_output}" ]]; then
      echo "INFO: ps pid=${pid} ${ps_output}"
    else
      echo "INFO: ps pid=${pid} <command unavailable>"
    fi
  done <<< "${pids}"
}

print_listener_details() {
  print_listener_details_for_port "${PORT}"
}

resolve_runtime_ports() {
  eval "$(bash bin/resolve-runtime-contract.sh "${RUNTIME_CONTRACT_FILE:-}")"
  TARGET_BACKEND_PORT="${RESOLVED_BACKEND_PORT}"
  TARGET_ADMIN_PREVIEW_PORT="${ADMIN_PREVIEW_PORT:-4173}"
  TARGET_PROTOTYPE_PORT="${PROTOTYPE_PORT:-18090}"
}

runtime_port() {
  local runtime="$1"
  case "${runtime}" in
    backend) printf '%s' "${TARGET_BACKEND_PORT}" ;;
    admin-preview) printf '%s' "${TARGET_ADMIN_PREVIEW_PORT}" ;;
    prototype) printf '%s' "${TARGET_PROTOTYPE_PORT}" ;;
    *)
      echo "FAIL: unknown runtime '${runtime}'" >&2
      exit 1
      ;;
  esac
}

runtime_pid_file() {
  local runtime="$1"
  local port
  port="$(runtime_port "${runtime}")"
  case "${runtime}" in
    backend) printf '/tmp/osg-backend-dev-%s.pid' "${port}" ;;
    admin-preview) printf '/tmp/osg-admin-preview-%s.pid' "${port}" ;;
    prototype) printf '/tmp/osg-prototype-server-%s.pid' "${port}" ;;
    *)
      echo "FAIL: unknown runtime '${runtime}'" >&2
      exit 1
      ;;
  esac
}

runtime_managed_command_substring() {
  local runtime="$1"
  case "${runtime}" in
    backend) printf '%s' "${BACKEND_DEV_SERVER_MANAGED_COMMAND_SUBSTRING:-ruoyi-admin.jar}" ;;
    *)
      printf ''
      ;;
  esac
}

runtime_is_managed_listener() {
  local runtime="$1"
  local port pid_file tracked_pid pids pid command pattern
  port="$(runtime_port "${runtime}")"
  pids="$(listener_pids_for_port "${port}" || true)"
  if [[ -z "${pids}" ]]; then
    return 1
  fi

  pid_file="$(runtime_pid_file "${runtime}")"
  tracked_pid="$(tracked_pid_from_file "${pid_file}")"
  if [[ -n "${tracked_pid}" ]] && grep -qx "${tracked_pid}" <<< "${pids}"; then
    return 0
  fi

  pattern="$(runtime_managed_command_substring "${runtime}")"
  if [[ -z "${pattern}" ]]; then
    return 1
  fi

  while IFS= read -r pid; do
    [[ -z "${pid}" ]] && continue
    command="$(pid_command "${pid}")"
    if [[ "${command}" == *"${pattern}"* ]]; then
      return 0
    fi
  done <<< "${pids}"

  return 1
}

fail_unknown_listener() {
  local runtime="$1"
  local port
  port="$(runtime_port "${runtime}")"
  echo "FAIL: unknown listener on port ${port} for runtime ${runtime}${CONTEXT:+ (context=${CONTEXT})}" >&2
  print_listener_details_for_port "${port}" >&2
  exit 1
}

ensure_runtime_slot_safe() {
  local runtime="$1"
  local port
  port="$(runtime_port "${runtime}")"
  if [[ -z "$(listener_pids_for_port "${port}" || true)" ]]; then
    return 0
  fi
  if runtime_is_managed_listener "${runtime}"; then
    echo "INFO: runtime ${runtime} already present on port ${port}"
    return 0
  fi
  fail_unknown_listener "${runtime}"
}

stop_runtime_if_managed() {
  local runtime="$1"
  local port stop_cmd
  port="$(runtime_port "${runtime}")"

  if [[ -z "$(listener_pids_for_port "${port}" || true)" ]]; then
    return 0
  fi
  if ! runtime_is_managed_listener "${runtime}"; then
    fail_unknown_listener "${runtime}"
  fi

  case "${runtime}" in
    backend)
      stop_cmd=(bash bin/backend-dev-server.sh stop)
      ;;
    admin-preview)
      stop_cmd=(bash bin/admin-preview-server.sh stop)
      ;;
    prototype)
      stop_cmd=(bash bin/prototype-server.sh stop)
      ;;
    *)
      echo "FAIL: unknown runtime '${runtime}'" >&2
      exit 1
      ;;
  esac

  if ! "${stop_cmd[@]}" >/dev/null; then
    echo "FAIL: failed to stop runtime ${runtime}${CONTEXT:+ (context=${CONTEXT})}" >&2
    exit 1
  fi

  if [[ -n "$(listener_pids_for_port "${port}" || true)" ]]; then
    fail_unknown_listener "${runtime}"
  fi
  echo "INFO: converged runtime ${runtime} -> stopped"
}

converge_runtime() {
  resolve_runtime_ports

  case "${TARGET}" in
    dev-local)
      ensure_runtime_slot_safe backend
      ensure_runtime_slot_safe admin-preview
      stop_runtime_if_managed prototype
      ;;
    prototype-only)
      ensure_runtime_slot_safe prototype
      stop_runtime_if_managed admin-preview
      stop_runtime_if_managed backend
      ;;
    test-docker)
      echo "INFO: converge-runtime target=test-docker delegates to docker-env-down.sh"
      bash bin/docker-env-down.sh test --profile core,frontends >/dev/null 2>&1 || true
      ;;
    *)
      echo "FAIL: unsupported target '${TARGET}'" >&2
      usage >&2
      exit 1
      ;;
  esac

  echo "PASS: runtime target satisfied (target=${TARGET}${CONTEXT:+, context=${CONTEXT}})"
}

case "${MODE}" in
  require-free|describe)
    if [[ -z "${PORT}" ]]; then
      echo "FAIL: --port is required for mode '${MODE}'" >&2
      usage >&2
      exit 1
    fi
    if ! [[ "${PORT}" =~ ^[0-9]+$ ]]; then
      echo "FAIL: invalid port '${PORT}'" >&2
      exit 1
    fi
    ;;
  converge-runtime)
    if [[ -z "${TARGET}" ]]; then
      echo "FAIL: --target is required for mode 'converge-runtime'" >&2
      usage >&2
      exit 1
    fi
    ;;
  *)
    if [[ -z "${MODE}" ]]; then
      echo "FAIL: --mode is required" >&2
    else
      echo "FAIL: unsupported mode '${MODE}'" >&2
    fi
    usage >&2
    exit 1
    ;;
esac

case "${MODE}" in
  describe)
    print_listener_details
    ;;
  require-free)
    pids="$(listener_pids || true)"
    if [[ -n "${pids}" ]]; then
      if [[ -n "${CONTEXT}" ]]; then
        echo "FAIL: port ${PORT} already in use (context=${CONTEXT})" >&2
      else
        echo "FAIL: port ${PORT} already in use" >&2
      fi
      print_listener_details >&2
      exit 1
    fi
    echo "PASS: port ${PORT} free${CONTEXT:+ (context=${CONTEXT})}"
    ;;
  converge-runtime)
    converge_runtime
    ;;
esac
