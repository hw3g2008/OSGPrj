#!/usr/bin/env bash
set -euo pipefail

MODE=""
PORT=""
CONTEXT=""

usage() {
  cat <<'EOF'
Usage:
  bash bin/runtime-port-guard.sh --mode require-free --port <port> [--context <name>]
  bash bin/runtime-port-guard.sh --mode describe --port <port>

Modes:
  require-free   Exit non-zero if the port already has a LISTEN process.
  describe       Print current LISTEN process details for the port (if any).
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

if [[ -z "${MODE}" || -z "${PORT}" ]]; then
  echo "FAIL: --mode and --port are required" >&2
  usage >&2
  exit 1
fi

if ! [[ "${PORT}" =~ ^[0-9]+$ ]]; then
  echo "FAIL: invalid port '${PORT}'" >&2
  exit 1
fi

listener_pids() {
  if ! command -v lsof >/dev/null 2>&1; then
    return 0
  fi
  lsof -tiTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null | sort -u
}

print_listener_details() {
  local pids pid
  pids="$(listener_pids || true)"
  if [[ -z "${pids}" ]]; then
    return 0
  fi

  if command -v lsof >/dev/null 2>&1; then
    echo "INFO: lsof listeners for port ${PORT}:"
    lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN || true
  fi

  while IFS= read -r pid; do
    [[ -z "${pid}" ]] && continue
    if ps_output="$(ps -o command= -p "${pid}" 2>/dev/null)"; then
      echo "INFO: ps pid=${pid} ${ps_output}"
    else
      echo "INFO: ps pid=${pid} <command unavailable>"
    fi
  done <<< "${pids}"
}

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
  *)
    echo "FAIL: unsupported mode '${MODE}'" >&2
    usage >&2
    exit 1
    ;;
esac
