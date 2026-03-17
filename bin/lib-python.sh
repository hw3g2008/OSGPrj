#!/usr/bin/env bash
# ------------------------------------------------------------
# Cross-platform Python 3 launcher helpers (Git Bash friendly)
#
# Goal:
# - Prefer `python3` when available
# - On Windows, fall back to Python Launcher: `py -3`
# - Last resort: `python` if it is Python 3
#
# Usage (in bash scripts):
#   source "$(dirname "$0")/lib-python.sh"
#   require_py3
#   py3 -c 'print("hi")'
#   py3 - <<'PY'
#   print("hi")
#   PY
# ------------------------------------------------------------

set -euo pipefail

# Populated by detect_py3(). Intentionally global.
PY3_CMD=()

_detect_py3_python() {
  if ! command -v python >/dev/null 2>&1; then
    return 1
  fi
  # Ensure `python` is Python 3 (and not a stub).
  python -c 'import sys; raise SystemExit(0 if sys.version_info >= (3,0) else 1)' >/dev/null 2>&1
}

# Detect a usable Python 3 command.
# Sets global array PY3_CMD.
detect_py3() {
  if [[ ${#PY3_CMD[@]} -gt 0 ]]; then
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    # On Windows, python3 may exist as a Microsoft Store alias stub.
    # Validate it can actually run Python 3.
    if python3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3,0) else 1)' >/dev/null 2>&1; then
      PY3_CMD=(python3)
      return 0
    fi
  fi

  # Windows Python Launcher (preferred fallback on Windows)
  if command -v py >/dev/null 2>&1; then
    if py -3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3,0) else 1)' >/dev/null 2>&1; then
      PY3_CMD=(py -3)
      return 0
    fi
  fi

  if _detect_py3_python; then
    PY3_CMD=(python)
    return 0
  fi

  return 1
}

py3() {
  detect_py3
  "${PY3_CMD[@]}" "$@"
}

py3_shell() {
  # Print a shell-escaped command string for embedding into other commands.
  # Example output: python3   OR   py\ -3
  detect_py3
  local out=()
  local part
  for part in "${PY3_CMD[@]}"; do
    out+=("$(printf '%q' "$part")")
  done
  printf '%s' "${out[*]}"
}

require_py3() {
  if ! detect_py3; then
    echo "FAIL: Python 3 not found. Install Python 3 or ensure 'python3' / 'py -3' / 'python' (py3) is available." >&2
    exit 1
  fi
}
