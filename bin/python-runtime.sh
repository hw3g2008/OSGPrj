#!/usr/bin/env bash

# Shared Python runtime resolver for gate scripts.

PYTHON_CMD="${PYTHON_CMD:-}"
PYTHON_BIN="${PYTHON_BIN:-}"

resolve_python_cmd() {
  if [[ -n "${PYTHON_CMD}" ]]; then
    if [[ -z "${PYTHON_BIN}" ]]; then
      PYTHON_BIN="${PYTHON_CMD}"
    fi
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="$(command -v python3)"
    PYTHON_BIN="${PYTHON_CMD}"
    return 0
  fi

  if command -v python >/dev/null 2>&1; then
    PYTHON_CMD="$(command -v python)"
    PYTHON_BIN="${PYTHON_CMD}"
    return 0
  fi

  return 1
}

require_python_cmd() {
  if ! resolve_python_cmd; then
    echo "FAIL: Python runtime not found (expected python3 or python)" >&2
    return 1
  fi
}

python_run() {
  require_python_cmd || return 1
  "${PYTHON_CMD}" "$@"
}
