#!/usr/bin/env bash
# ------------------------------------------------------------
# Cross-platform process helpers (Git Bash / Windows friendly)
#
# Provides:
# - pid_alive <pid>
# - kill_pid <pid>
# - kill_tree_pid <pid>
#
# On Windows, Git Bash may report different PIDs for background jobs.
# Prefer using PIDs returned by subprocess.Popen (Windows PID).
# ------------------------------------------------------------

set -euo pipefail

_pick_ps() {
  if command -v powershell.exe >/dev/null 2>&1; then
    printf '%s' powershell.exe
    return 0
  fi
  if command -v pwsh >/dev/null 2>&1; then
    printf '%s' pwsh
    return 0
  fi
  return 1
}

pid_alive() {
  local pid="${1:-}"
  if [[ -z "${pid}" ]]; then
    return 1
  fi

  if kill -0 "${pid}" >/dev/null 2>&1; then
    return 0
  fi

  local ps_bin
  ps_bin="$(_pick_ps || true)"
  if [[ -z "${ps_bin}" ]]; then
    return 1
  fi

  "${ps_bin}" -NoProfile -Command "if (Get-Process -Id ${pid} -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >/dev/null 2>&1
}

kill_pid() {
  local pid="${1:-}"
  if [[ -z "${pid}" ]]; then
    return 0
  fi

  # On Windows under Git Bash, `kill` may not terminate a Windows PID.
  # Prefer taskkill when available.
  if command -v taskkill.exe >/dev/null 2>&1; then
    # Use taskkill.exe from Git Bash; flags must come before /PID.
    MSYS2_ARG_CONV_EXCL='*' MSYS_NO_PATHCONV=1 taskkill.exe /F /T /PID "${pid}" >/dev/null 2>&1 || true
    sleep 0.4
    return 0
  fi

  kill "${pid}" >/dev/null 2>&1 || true
  sleep 0.4

  if ! pid_alive "${pid}"; then
    return 0
  fi

  local ps_bin
  ps_bin="$(_pick_ps || true)"
  if [[ -n "${ps_bin}" ]]; then
    "${ps_bin}" -NoProfile -Command "Stop-Process -Id ${pid} -Force" >/dev/null 2>&1 || true
  fi
}

kill_tree_pid() {
  # Best-effort terminate a process tree.
  local pid="${1:-}"
  if [[ -z "${pid}" ]]; then
    return 0
  fi

  if command -v taskkill.exe >/dev/null 2>&1; then
    MSYS2_ARG_CONV_EXCL='*' MSYS_NO_PATHCONV=1 taskkill.exe /F /T /PID "${pid}" >/dev/null 2>&1 || true
    sleep 0.4
    return 0
  fi

  # POSIX: try process group first
  kill -TERM -"${pid}" >/dev/null 2>&1 || kill "${pid}" >/dev/null 2>&1 || true
  sleep 0.5
  if pid_alive "${pid}"; then
    kill -9 -"${pid}" >/dev/null 2>&1 || kill -9 "${pid}" >/dev/null 2>&1 || true
  fi
}
