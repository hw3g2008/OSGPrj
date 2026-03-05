#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_PORT="${REMOTE_PORT:-22}"
REMOTE_DIR="${REMOTE_DIR:-/opt/OSGPrj}"
ENV_NAME="${ENV_NAME:-test}"
PROFILE_CSV="${PROFILE_CSV:-core,frontends}"
SSH_PASSWORD="${SSH_PASSWORD:-}"
SSH_KEY="${SSH_KEY:-}"
SKIP_HEALTH_CHECK=0
UPDATE_CODE=0
GIT_REF="${GIT_REF:-}"
NO_STRICT_HOST_KEY_CHECK=1

usage() {
  cat <<'EOF'
Usage:
  bash bin/deploy-remote-server.sh --host <ip_or_domain> [options]

Options:
  --host <host>             Remote host (required unless REMOTE_HOST set)
  --user <user>             SSH user (default: root)
  --port <port>             SSH port (default: 22)
  --remote-dir <dir>        Remote project directory (default: /opt/OSGPrj)
  --env <test|prod>         Deploy environment (default: test)
  --profile <csv>           Compose profiles (default: core,frontends)
  --password <password>     SSH password (or set SSH_PASSWORD)
  --key <path>              SSH private key path (or set SSH_KEY)
  --update-code             Run git pull (and optional checkout) before deploy
  --git-ref <ref>           Git branch/tag/commit to checkout when --update-code
  --skip-health-check       Pass through to remote deploy script
  --strict-host-key-check   Enable strict host key checking (default: disabled)
  -h, --help                Show help

Examples:
  bash bin/deploy-remote-server.sh --host 172.17.119.10 --user root --password '***'
  bash bin/deploy-remote-server.sh --host 172.17.119.10 --key ~/.ssh/id_rsa --update-code --git-ref main
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
    --port)
      REMOTE_PORT="${2:-}"
      shift 2
      ;;
    --remote-dir)
      REMOTE_DIR="${2:-}"
      shift 2
      ;;
    --env)
      ENV_NAME="${2:-}"
      shift 2
      ;;
    --profile)
      PROFILE_CSV="${2:-}"
      shift 2
      ;;
    --password)
      SSH_PASSWORD="${2:-}"
      shift 2
      ;;
    --key)
      SSH_KEY="${2:-}"
      shift 2
      ;;
    --update-code)
      UPDATE_CODE=1
      shift
      ;;
    --git-ref)
      GIT_REF="${2:-}"
      shift 2
      ;;
    --skip-health-check)
      SKIP_HEALTH_CHECK=1
      shift
      ;;
    --strict-host-key-check)
      NO_STRICT_HOST_KEY_CHECK=0
      shift
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
  echo "FAIL: --host is required (or set REMOTE_HOST)" >&2
  exit 1
fi

case "${ENV_NAME}" in
  test|prod) ;;
  *)
    echo "FAIL: --env must be test|prod, got '${ENV_NAME}'" >&2
    exit 1
    ;;
esac

SSH_OPTS=(-p "${REMOTE_PORT}")
if (( NO_STRICT_HOST_KEY_CHECK == 1 )); then
  SSH_OPTS+=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)
fi
if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS+=(-i "${SSH_KEY}")
fi

SSH_TARGET="${REMOTE_USER}@${REMOTE_HOST}"
SSH_CMD=(ssh "${SSH_OPTS[@]}" "${SSH_TARGET}")
if [[ -n "${SSH_PASSWORD}" ]]; then
  if ! command -v sshpass >/dev/null 2>&1; then
    echo "FAIL: sshpass not found, please install it or use --key" >&2
    exit 1
  fi
  # Avoid exposing password in process args (`ps`)
  export SSHPASS="${SSH_PASSWORD}"
  SSH_CMD=(sshpass -e "${SSH_CMD[@]}")
fi

echo "=== deploy-remote-server ==="
echo "INFO: target=${SSH_TARGET}:${REMOTE_PORT}"
echo "INFO: remote_dir=${REMOTE_DIR}"
echo "INFO: env=${ENV_NAME} profile=${PROFILE_CSV} update_code=${UPDATE_CODE}"

"${SSH_CMD[@]}" bash -s -- \
  "${REMOTE_DIR}" \
  "${ENV_NAME}" \
  "${PROFILE_CSV}" \
  "${SKIP_HEALTH_CHECK}" \
  "${UPDATE_CODE}" \
  "${GIT_REF}" <<'REMOTE_SH'
set -euo pipefail

REMOTE_DIR="${1:-}"
ENV_NAME="${2:-test}"
PROFILE_CSV="${3:-core,frontends}"
SKIP_HEALTH_CHECK="${4:-0}"
UPDATE_CODE="${5:-0}"
GIT_REF="${6:-}"

if [[ -z "${REMOTE_DIR}" ]]; then
  echo "FAIL: remote dir argument missing" >&2
  exit 1
fi

if [[ ! -d "${REMOTE_DIR}" ]]; then
  echo "FAIL: remote dir not found: ${REMOTE_DIR}" >&2
  exit 1
fi

cd "${REMOTE_DIR}"

if (( UPDATE_CODE == 1 )); then
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "FAIL: ${REMOTE_DIR} is not a git repository, cannot --update-code" >&2
    exit 1
  fi
  git fetch --all --prune
  if [[ -n "${GIT_REF}" ]]; then
    git checkout "${GIT_REF}"
  fi
  git pull --ff-only
fi

CMD=(bash bin/deploy-server-docker.sh "${ENV_NAME}" --profile "${PROFILE_CSV}")
if (( SKIP_HEALTH_CHECK == 1 )); then
  CMD+=(--skip-health-check)
fi

"${CMD[@]}"
REMOTE_SH

unset SSHPASS || true
echo "PASS: remote deploy finished"
