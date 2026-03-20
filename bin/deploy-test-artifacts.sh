#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_REMOTE_ENV_FILE="${LOCAL_REMOTE_ENV_FILE:-deploy/.env.remote.local}"

if [[ -f "${ROOT_DIR}/${LOCAL_REMOTE_ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ROOT_DIR}/${LOCAL_REMOTE_ENV_FILE}"
  set +a
fi

REMOTE_HOST="${REMOTE_HOST:-}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_PORT="${REMOTE_PORT:-22}"
REMOTE_DIR="${REMOTE_DIR:-/opt/OSGPrj}"
SSH_PASSWORD="${SSH_PASSWORD:-}"
SSH_KEY="${SSH_KEY:-}"
RELEASE_TAG="${RELEASE_TAG:-$(date +%Y%m%d%H%M%S)}"
NODE_CHANNEL="${NODE_CHANNEL:-latest-v20.x}"
SKIP_HEALTH_CHECK=0
SKIP_BACKEND_BUILD=0
SKIP_FRONTEND_BUILD=0
SKIP_UPLOAD=0

FRONTEND_APPS=(admin student mentor lead-mentor assistant)
TMP_DIR=""
NODE_BIN_DIR=""

usage() {
  cat <<'EOF'
Usage:
  bash bin/deploy-test-artifacts.sh [options]

Options:
  --host <ip_or_domain>       Remote host (required unless deploy/.env.remote.local sets REMOTE_HOST)
  --user <user>               SSH user (default: root)
  --port <port>               SSH port (default: 22)
  --remote-dir <dir>          Remote project dir (default: /opt/OSGPrj)
  --key <path>                SSH private key path
  --tag <release_tag>         Release tag for remote-built artifact images (default: current timestamp)
  --skip-backend-build        Reuse existing local backend jar
  --skip-frontend-build       Reuse existing local frontend dist artifacts
  --skip-upload               Reuse already uploaded remote bundle for the release tag
  --skip-health-check         Skip remote HTTP health checks
  -h, --help                  Show help

Notes:
  - Local machine only builds jar/dist; it does not run Docker.
  - Remote host builds thin runtime images from uploaded artifacts and starts the test stack.
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
    --key)
      SSH_KEY="${2:-}"
      shift 2
      ;;
    --tag)
      RELEASE_TAG="${2:-}"
      shift 2
      ;;
    --skip-backend-build)
      SKIP_BACKEND_BUILD=1
      shift
      ;;
    --skip-frontend-build)
      SKIP_FRONTEND_BUILD=1
      shift
      ;;
    --skip-upload)
      SKIP_UPLOAD=1
      shift
      ;;
    --skip-health-check)
      SKIP_HEALTH_CHECK=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "FAIL: unknown arg: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${REMOTE_HOST}" ]]; then
  echo "FAIL: REMOTE_HOST is required (set in ${LOCAL_REMOTE_ENV_FILE} or pass --host)" >&2
  exit 1
fi

cleanup() {
  rm -rf "${TMP_DIR:-}"
  unset SSHPASS || true
}
trap cleanup EXIT

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "FAIL: missing required command: ${cmd}" >&2
    exit 1
  fi
}

detect_node_platform() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"

  case "${os}" in
    Darwin) os="darwin" ;;
    Linux) os="linux" ;;
    *)
      echo "FAIL: unsupported OS for local Node runtime bootstrap: ${os}" >&2
      exit 1
      ;;
  esac

  case "${arch}" in
    x86_64|amd64) arch="x64" ;;
    arm64|aarch64) arch="arm64" ;;
    *)
      echo "FAIL: unsupported arch for local Node runtime bootstrap: ${arch}" >&2
      exit 1
      ;;
  esac

  printf '%s-%s\n' "${os}" "${arch}"
}

ensure_frontend_node_runtime() {
  local platform archive_name archive_path install_parent install_dir shasums_url download_url

  if [[ -n "${NODE_BIN_DIR}" ]]; then
    return 0
  fi

  platform="$(detect_node_platform)"
  install_parent="${ROOT_DIR}/.local/tools"
  install_dir="${install_parent}/node-v20-${platform}"

  if [[ -x "${install_dir}/bin/node" ]]; then
    NODE_BIN_DIR="${install_dir}/bin"
    return 0
  fi

  mkdir -p "${install_parent}"
  shasums_url="https://nodejs.org/dist/${NODE_CHANNEL}/SHASUMS256.txt"
  archive_name="$(curl -fsSL "${shasums_url}" | awk "/node-v20\\..*-${platform}\\.tar\\.xz$/ {print \$2; exit}")"
  if [[ -z "${archive_name}" ]]; then
    echo "FAIL: could not resolve Node 20 archive for ${platform} from ${shasums_url}" >&2
    exit 1
  fi

  archive_path="${TMP_DIR}/${archive_name}"
  download_url="https://nodejs.org/dist/${NODE_CHANNEL}/${archive_name}"
  echo "INFO: download local Node runtime => ${download_url}"
  curl -fsSL "${download_url}" -o "${archive_path}"

  rm -rf "${install_dir}"
  tar -xJf "${archive_path}" -C "${install_parent}"
  mv "${install_parent}/${archive_name%.tar.xz}" "${install_dir}"
  NODE_BIN_DIR="${install_dir}/bin"
}

run_frontend_builder() {
  local inner_cmd="$1"
  ensure_frontend_node_runtime
  (
    export PATH="${NODE_BIN_DIR}:$PATH"
    cd "${ROOT_DIR}/osg-frontend"
    corepack enable >/dev/null 2>&1
    corepack prepare pnpm@10.26.0 --activate >/dev/null 2>&1
    set -a
    source "${ROOT_DIR}/deploy/.env.test"
    set +a
    eval "${inner_cmd}"
  )
}

run_frontend_build() {
  local app="$1"
  echo "INFO: build frontend ${app}"
  # This deployment path only needs production bundles. Some package-level
  # build scripts prepend vue-tsc, which is currently incompatible with the
  # pinned frontend toolchain on this machine. Build the Vite bundles directly.
  run_frontend_builder "pnpm --filter @osg/${app} exec vite build"
}

prepare_artifact_bundle() {
  local app bundle_root
  bundle_root="$1"

  mkdir -p \
    "${bundle_root}/deploy/backend" \
    "${bundle_root}/deploy/frontend" \
    "${bundle_root}/backend-context" \
    "${bundle_root}/frontend-contexts"

  cp "${ROOT_DIR}/deploy/backend/Dockerfile.artifact" "${bundle_root}/deploy/backend/Dockerfile.artifact"
  cp "${ROOT_DIR}/deploy/backend/docker-entrypoint.sh" "${bundle_root}/backend-context/docker-entrypoint.sh"
  cp "${ROOT_DIR}/ruoyi-admin/target/ruoyi-admin.jar" "${bundle_root}/backend-context/ruoyi-admin.jar"

  cp "${ROOT_DIR}/deploy/frontend/Dockerfile.artifact" "${bundle_root}/deploy/frontend/Dockerfile.artifact"
  cp "${ROOT_DIR}/deploy/compose.test.artifact.yml" "${bundle_root}/deploy/compose.test.artifact.yml"
  cp "${ROOT_DIR}/deploy/.env.test" "${bundle_root}/deploy/.env.test"
  bash "${ROOT_DIR}/bin/render-test-artifact-image-env.sh" "${RELEASE_TAG}" > "${bundle_root}/artifact-images.env"

  for app in "${FRONTEND_APPS[@]}"; do
    mkdir -p "${bundle_root}/frontend-contexts/${app}/dist"
    cp "${ROOT_DIR}/deploy/frontend/nginx.conf" "${bundle_root}/frontend-contexts/${app}/nginx.conf"
    cp -R "${ROOT_DIR}/osg-frontend/packages/${app}/dist/." "${bundle_root}/frontend-contexts/${app}/dist/"
  done
}

echo "=== deploy-test-artifacts ==="
echo "INFO: remote=${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PORT}"
echo "INFO: remote_dir=${REMOTE_DIR}"
echo "INFO: release_tag=${RELEASE_TAG}"

require_cmd bash
require_cmd curl
require_cmd gzip
require_cmd mvn
require_cmd scp
require_cmd ssh
require_cmd tar

bash "${ROOT_DIR}/bin/context-preflight.sh" test \
  --entrypoint deploy-test-artifacts \
  --env-file "${ROOT_DIR}/deploy/.env.test" \
  --runtime-contract "${ROOT_DIR}/deploy/runtime-contract.test.yaml" \
  --remote-host "${REMOTE_HOST}"

SSH_OPTS=(-p "${REMOTE_PORT}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)
SCP_OPTS=(-P "${REMOTE_PORT}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)
if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS+=(-i "${SSH_KEY}")
  SCP_OPTS+=(-i "${SSH_KEY}")
fi

SSH_TARGET="${REMOTE_USER}@${REMOTE_HOST}"
SSH_CMD=(ssh "${SSH_OPTS[@]}" "${SSH_TARGET}")
SCP_CMD=(scp "${SCP_OPTS[@]}")

if [[ -n "${SSH_PASSWORD}" ]]; then
  require_cmd sshpass
  export SSHPASS="${SSH_PASSWORD}"
  SSH_CMD=(sshpass -e "${SSH_CMD[@]}")
  SCP_CMD=(sshpass -e "${SCP_CMD[@]}")
fi

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/deploy-test-artifacts.XXXXXX")"
ARTIFACT_DIR="${TMP_DIR}/bundle"
REMOTE_ARTIFACT_DIR="${REMOTE_DIR}/.deploy-artifacts/${RELEASE_TAG}"
mkdir -p "${ARTIFACT_DIR}"

if (( SKIP_BACKEND_BUILD == 0 )); then
  echo "INFO: build backend jar"
  (
    cd "${ROOT_DIR}"
    mvn -DskipTests package
  )
fi

if [[ ! -f "${ROOT_DIR}/ruoyi-admin/target/ruoyi-admin.jar" ]]; then
  echo "FAIL: backend jar missing: ruoyi-admin/target/ruoyi-admin.jar" >&2
  exit 1
fi

if (( SKIP_FRONTEND_BUILD == 0 )); then
  echo "INFO: install frontend deps with local Node 20 runtime"
  run_frontend_builder "pnpm install --frozen-lockfile"
  for app in "${FRONTEND_APPS[@]}"; do
    run_frontend_build "${app}"
  done
fi

for app in "${FRONTEND_APPS[@]}"; do
  if [[ ! -d "${ROOT_DIR}/osg-frontend/packages/${app}/dist" ]]; then
    echo "FAIL: frontend dist missing: osg-frontend/packages/${app}/dist" >&2
    exit 1
  fi
done

prepare_artifact_bundle "${ARTIFACT_DIR}"

if (( SKIP_UPLOAD == 0 )); then
  BUNDLE_ARCHIVE="${TMP_DIR}/artifact-bundle.tar.gz"
  echo "INFO: pack artifact bundle"
  COPYFILE_DISABLE=1 COPY_EXTENDED_ATTRIBUTES_DISABLE=1 tar \
    --disable-copyfile \
    --no-xattrs \
    --no-mac-metadata \
    -C "${ARTIFACT_DIR}" \
    -czf "${BUNDLE_ARCHIVE}" .

  echo "INFO: upload artifact bundle => ${REMOTE_ARTIFACT_DIR}"
  "${SSH_CMD[@]}" "mkdir -p '${REMOTE_ARTIFACT_DIR}'"
  "${SCP_CMD[@]}" "${BUNDLE_ARCHIVE}" "${SSH_TARGET}:${REMOTE_ARTIFACT_DIR}/artifact-bundle.tar.gz"
fi

echo "INFO: build runtime images and deploy on remote host"
"${SSH_CMD[@]}" bash -s -- \
  "${REMOTE_DIR}" \
  "${REMOTE_ARTIFACT_DIR}" \
  "${SKIP_UPLOAD}" \
  "${SKIP_HEALTH_CHECK}" <<'REMOTE_SH'
set -euo pipefail

REMOTE_DIR="${1:-}"
REMOTE_ARTIFACT_DIR="${2:-}"
SKIP_UPLOAD="${3:-0}"
SKIP_HEALTH_CHECK="${4:-0}"

if [[ ! -d "${REMOTE_DIR}" ]]; then
  mkdir -p "${REMOTE_DIR}"
fi

mkdir -p "${REMOTE_ARTIFACT_DIR}"

if (( SKIP_UPLOAD == 0 )); then
  if [[ ! -f "${REMOTE_ARTIFACT_DIR}/artifact-bundle.tar.gz" ]]; then
    echo "FAIL: uploaded artifact bundle missing: ${REMOTE_ARTIFACT_DIR}/artifact-bundle.tar.gz" >&2
    exit 1
  fi

  find "${REMOTE_ARTIFACT_DIR}" -mindepth 1 -maxdepth 1 ! -name artifact-bundle.tar.gz -exec rm -rf {} +
  tar -xzf "${REMOTE_ARTIFACT_DIR}/artifact-bundle.tar.gz" -C "${REMOTE_ARTIFACT_DIR}"
fi

if [[ ! -f "${REMOTE_ARTIFACT_DIR}/artifact-images.env" ]]; then
  echo "FAIL: artifact image env missing: ${REMOTE_ARTIFACT_DIR}/artifact-images.env" >&2
  exit 1
fi

set -a
source "${REMOTE_ARTIFACT_DIR}/deploy/.env.test"
source "${REMOTE_ARTIFACT_DIR}/artifact-images.env"
set +a

echo "INFO: docker build ${BACKEND_IMAGE}"
docker build -t "${BACKEND_IMAGE}" \
  -f "${REMOTE_ARTIFACT_DIR}/deploy/backend/Dockerfile.artifact" \
  "${REMOTE_ARTIFACT_DIR}/backend-context"

for app in admin student mentor lead-mentor assistant; do
  case "${app}" in
    admin) image_ref="${ADMIN_IMAGE}" ;;
    student) image_ref="${STUDENT_IMAGE}" ;;
    mentor) image_ref="${MENTOR_IMAGE}" ;;
    lead-mentor) image_ref="${LEAD_MENTOR_IMAGE}" ;;
    assistant) image_ref="${ASSISTANT_IMAGE}" ;;
  esac
  echo "INFO: docker build ${image_ref}"
  docker build -t "${image_ref}" \
    -f "${REMOTE_ARTIFACT_DIR}/deploy/frontend/Dockerfile.artifact" \
    "${REMOTE_ARTIFACT_DIR}/frontend-contexts/${app}"
done

COMPOSE_CMD=(
  docker compose
  --env-file "${REMOTE_ARTIFACT_DIR}/deploy/.env.test"
  --env-file "${REMOTE_ARTIFACT_DIR}/artifact-images.env"
  -f "${REMOTE_ARTIFACT_DIR}/deploy/compose.test.artifact.yml"
)
"${COMPOSE_CMD[@]}" down --remove-orphans || true
"${COMPOSE_CMD[@]}" up -d --force-recreate --remove-orphans

if (( SKIP_HEALTH_CHECK == 1 )); then
  "${COMPOSE_CMD[@]}" ps
  exit 0
fi

BACKEND_URL="http://127.0.0.1:${BACKEND_PORT:-28080}/actuator/health"
ADMIN_URL="http://127.0.0.1:${ADMIN_PORT:-3005}/login"
HEALTH_TIMEOUT=180
HEALTH_INTERVAL=3

wait_http_ok() {
  local url="$1"
  local timeout_s="$2"
  local interval_s="$3"
  local start_ts now elapsed
  start_ts="$(date +%s)"
  while true; do
    if curl -fsS --max-time 5 "${url}" >/dev/null 2>&1; then
      return 0
    fi
    now="$(date +%s)"
    elapsed=$(( now - start_ts ))
    if (( elapsed >= timeout_s )); then
      return 1
    fi
    sleep "${interval_s}"
  done
}

wait_http_status() {
  local url="$1"
  local timeout_s="$2"
  local interval_s="$3"
  local start_ts now elapsed code
  start_ts="$(date +%s)"
  while true; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "${url}" || true)"
    if [[ "${code}" =~ ^2|3 ]]; then
      return 0
    fi
    now="$(date +%s)"
    elapsed=$(( now - start_ts ))
    if (( elapsed >= timeout_s )); then
      return 1
    fi
    sleep "${interval_s}"
  done
}

echo "INFO: wait backend => ${BACKEND_URL}"
if ! wait_http_ok "${BACKEND_URL}" "${HEALTH_TIMEOUT}" "${HEALTH_INTERVAL}"; then
  "${COMPOSE_CMD[@]}" ps || true
  "${COMPOSE_CMD[@]}" logs backend || true
  echo "FAIL: backend health check timeout" >&2
  exit 1
fi

echo "INFO: wait admin => ${ADMIN_URL}"
if ! wait_http_status "${ADMIN_URL}" "${HEALTH_TIMEOUT}" "${HEALTH_INTERVAL}"; then
  "${COMPOSE_CMD[@]}" ps || true
  "${COMPOSE_CMD[@]}" logs admin || true
  echo "FAIL: admin readiness check timeout" >&2
  exit 1
fi

"${COMPOSE_CMD[@]}" ps
REMOTE_SH

echo "PASS: deploy-test-artifacts finished"
