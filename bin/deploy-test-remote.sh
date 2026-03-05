#!/usr/bin/env bash
set -euo pipefail

LOCAL_REMOTE_ENV_FILE="${LOCAL_REMOTE_ENV_FILE:-deploy/.env.remote.local}"
if [[ -f "${LOCAL_REMOTE_ENV_FILE}" ]]; then
  set -a
  source "${LOCAL_REMOTE_ENV_FILE}"
  set +a
fi

REMOTE_HOST="${REMOTE_HOST:-}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/opt/OSGPrj}"
ENV_NAME="${ENV_NAME:-test}"
PROFILE_CSV="${PROFILE_CSV:-core,frontends}"
SSH_PASSWORD="${SSH_PASSWORD:-}"
SSH_KEY="${SSH_KEY:-}"
EXTRA_ARGS=()

usage() {
  cat <<'EOF'
Usage:
  bash bin/deploy-test-remote.sh [--host <ip_or_domain>] [--user <user>] [--key <path>] [--update-code] [--git-ref <ref>] [--skip-health-check]

Env overrides:
  LOCAL_REMOTE_ENV_FILE (default: deploy/.env.remote.local)
  REMOTE_HOST   (required if not set in local env file)
  REMOTE_USER   (default: root)
  REMOTE_DIR    (default: /opt/OSGPrj)
  ENV_NAME      (default: test)
  PROFILE_CSV   (default: core,frontends)
  SSH_PASSWORD  (optional; if empty and no SSH_KEY, will prompt securely)
  SSH_KEY       (optional; use ssh key instead of password)

Examples:
  # 方式1：本地 .env.remote.local 中放 REMOTE_HOST/REMOTE_USER
  bash bin/deploy-test-remote.sh

  # 方式2：命令行传 host + key
  bash bin/deploy-test-remote.sh --host <server-ip> --user root --key ~/.ssh/id_rsa
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      REMOTE_HOST="${2:-}"
      shift 2
      ;;
    --user)
      REMOTE_USER="${2:-}"
      shift 2
      ;;
    --key)
      SSH_KEY="${2:-}"
      shift 2
      ;;
    --update-code|--skip-health-check)
      EXTRA_ARGS+=("$1")
      shift
      ;;
    --git-ref)
      if [[ -z "${2:-}" ]]; then
        echo "FAIL: --git-ref requires value" >&2
        exit 1
      fi
      EXTRA_ARGS+=("$1" "$2")
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "FAIL: unknown arg: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${REMOTE_HOST}" ]]; then
  echo "FAIL: REMOTE_HOST is required (set in ${LOCAL_REMOTE_ENV_FILE} or pass --host)" >&2
  exit 1
fi

if [[ -z "${SSH_KEY}" && -z "${SSH_PASSWORD}" ]]; then
  read -rsp "SSH password for ${REMOTE_USER}@${REMOTE_HOST}: " SSH_PASSWORD
  echo
fi

echo "=== deploy-test-remote ==="
echo "INFO: ${REMOTE_USER}@${REMOTE_HOST} env=${ENV_NAME} profile=${PROFILE_CSV} remote_dir=${REMOTE_DIR}"
if [[ -n "${SSH_KEY}" ]]; then
  echo "INFO: auth=ssh-key (${SSH_KEY})"
else
  echo "INFO: auth=password (env only, not args)"
fi
CMD=(bash bin/deploy-remote-server.sh \
  --host "${REMOTE_HOST}" \
  --user "${REMOTE_USER}" \
  --remote-dir "${REMOTE_DIR}" \
  --env "${ENV_NAME}" \
  --profile "${PROFILE_CSV}")

if [[ -n "${SSH_KEY}" ]]; then
  CMD+=(--key "${SSH_KEY}")
fi

if (( ${#EXTRA_ARGS[@]} > 0 )); then
  CMD+=("${EXTRA_ARGS[@]}")
fi

if [[ -n "${SSH_PASSWORD}" ]]; then
  SSH_PASSWORD="${SSH_PASSWORD}" exec "${CMD[@]}"
else
  exec "${CMD[@]}"
fi
