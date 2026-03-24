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
FRONTEND_ONLY=0
BACKEND_ONLY=0
SELECTED_FRONTEND_APP=""
FRONTEND_API_BASE="${FRONTEND_API_BASE:-http://backend:8080}"

ALL_FRONTEND_APPS=(admin student mentor lead-mentor assistant)
TARGET_FRONTEND_APPS=("${ALL_FRONTEND_APPS[@]}")

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
  --frontend-app <app>        Deploy one frontend app only: admin|student|mentor|lead-mentor|assistant
  --frontend-only             Only deploy the selected frontend app, reusing an existing backend
  --backend-only              Only deploy backend artifact, without rebuilding or restarting frontend apps
  --frontend-api-base <url>   Runtime API proxy target for the selected frontend app (default: http://backend:8080)
  --skip-backend-build        Reuse existing local backend jar
  --skip-frontend-build       Reuse existing local frontend dist artifacts
  --skip-upload               Reuse already uploaded remote bundle for the release tag
  --skip-health-check         Skip remote HTTP health checks
  -h, --help                  Show help

Notes:
  - Local machine only builds jar/dist; it does not run Docker.
  - Remote host builds thin runtime images from uploaded artifacts and starts the test stack.
  - With --frontend-app and --frontend-only, only the selected frontend app is built and updated.
  - With --backend-only, only the backend artifact is built and updated.
EOF
}

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

cleanup() {
  rm -rf "${TMP_DIR:-}"
  unset SSHPASS || true
}

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    fail "missing required command: ${cmd}"
  fi
}

is_valid_frontend_app() {
  local candidate="$1"
  local app
  for app in "${ALL_FRONTEND_APPS[@]}"; do
    if [[ "${app}" == "${candidate}" ]]; then
      return 0
    fi
  done
  return 1
}

configure_target_frontend_apps() {
  if (( BACKEND_ONLY == 1 )); then
    TARGET_FRONTEND_APPS=()
    return 0
  fi

  if [[ -n "${SELECTED_FRONTEND_APP}" ]]; then
    TARGET_FRONTEND_APPS=("${SELECTED_FRONTEND_APP}")
  else
    TARGET_FRONTEND_APPS=("${ALL_FRONTEND_APPS[@]}")
  fi
}

api_proxy_var_name_for_app() {
  case "$1" in
    admin) printf '%s\n' 'ADMIN_API_PROXY_TARGET' ;;
    student) printf '%s\n' 'STUDENT_API_PROXY_TARGET' ;;
    mentor) printf '%s\n' 'MENTOR_API_PROXY_TARGET' ;;
    lead-mentor) printf '%s\n' 'LEAD_MENTOR_API_PROXY_TARGET' ;;
    assistant) printf '%s\n' 'ASSISTANT_API_PROXY_TARGET' ;;
    *) return 1 ;;
  esac
}

image_ref_for_app() {
  case "$1" in
    admin) printf '%s\n' "${ADMIN_IMAGE}" ;;
    student) printf '%s\n' "${STUDENT_IMAGE}" ;;
    mentor) printf '%s\n' "${MENTOR_IMAGE}" ;;
    lead-mentor) printf '%s\n' "${LEAD_MENTOR_IMAGE}" ;;
    assistant) printf '%s\n' "${ASSISTANT_IMAGE}" ;;
    *) return 1 ;;
  esac
}

port_for_app() {
  case "$1" in
    admin) printf '%s\n' "${ADMIN_PORT:-3005}" ;;
    student) printf '%s\n' "${STUDENT_PORT:-3001}" ;;
    mentor) printf '%s\n' "${MENTOR_PORT:-3002}" ;;
    lead-mentor) printf '%s\n' "${LEAD_MENTOR_PORT:-3003}" ;;
    assistant) printf '%s\n' "${ASSISTANT_PORT:-3004}" ;;
    *) return 1 ;;
  esac
}

parse_args() {
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
      --frontend-app)
        SELECTED_FRONTEND_APP="${2:-}"
        shift 2
        ;;
      --frontend-only)
        FRONTEND_ONLY=1
        shift
        ;;
      --backend-only)
        BACKEND_ONLY=1
        shift
        ;;
      --frontend-api-base)
        FRONTEND_API_BASE="${2:-}"
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
        usage >&2
        fail "unknown arg: $1"
        ;;
    esac
  done
}

validate_args() {
  if [[ -z "${REMOTE_HOST}" ]]; then
    fail "REMOTE_HOST is required (set in ${LOCAL_REMOTE_ENV_FILE} or pass --host)"
  fi

  if [[ -n "${SELECTED_FRONTEND_APP}" ]] && ! is_valid_frontend_app "${SELECTED_FRONTEND_APP}"; then
    fail "invalid --frontend-app: ${SELECTED_FRONTEND_APP}"
  fi

  if (( FRONTEND_ONLY == 1 && BACKEND_ONLY == 1 )); then
    fail "--frontend-only and --backend-only cannot be used together"
  fi

  if (( FRONTEND_ONLY == 1 )) && [[ -z "${SELECTED_FRONTEND_APP}" ]]; then
    fail "--frontend-only requires --frontend-app"
  fi

  if (( BACKEND_ONLY == 1 )) && [[ -n "${SELECTED_FRONTEND_APP}" ]]; then
    fail "--backend-only cannot be combined with --frontend-app"
  fi

  if [[ "${FRONTEND_API_BASE}" != "http://backend:8080" ]] && [[ -z "${SELECTED_FRONTEND_APP}" ]]; then
    fail "--frontend-api-base requires --frontend-app"
  fi

  if (( BACKEND_ONLY == 1 )) && [[ "${FRONTEND_API_BASE}" != "http://backend:8080" ]]; then
    fail "--backend-only cannot be combined with --frontend-api-base"
  fi

  if (( FRONTEND_ONLY == 1 )); then
    SKIP_BACKEND_BUILD=1
  fi

  if (( BACKEND_ONLY == 1 )); then
    SKIP_FRONTEND_BUILD=1
  fi

  configure_target_frontend_apps
}

detect_node_platform() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"

  case "${os}" in
    Darwin) os="darwin" ;;
    Linux) os="linux" ;;
    *) fail "unsupported OS for local Node runtime bootstrap: ${os}" ;;
  esac

  case "${arch}" in
    x86_64|amd64) arch="x64" ;;
    arm64|aarch64) arch="arm64" ;;
    *) fail "unsupported arch for local Node runtime bootstrap: ${arch}" ;;
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
    fail "could not resolve Node 20 archive for ${platform} from ${shasums_url}"
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

ensure_target_frontend_dists() {
  local app
  for app in "${TARGET_FRONTEND_APPS[@]}"; do
    if [[ ! -d "${ROOT_DIR}/osg-frontend/packages/${app}/dist" ]]; then
      fail "frontend dist missing: osg-frontend/packages/${app}/dist"
    fi
  done
}

render_artifact_runtime_env() {
  local output_file="$1"
  : > "${output_file}"

  if [[ -n "${SELECTED_FRONTEND_APP}" ]]; then
    local proxy_var
    proxy_var="$(api_proxy_var_name_for_app "${SELECTED_FRONTEND_APP}")"
    printf '%s=%s\n' "${proxy_var}" "${FRONTEND_API_BASE}" >> "${output_file}"
  fi
}

prepare_artifact_bundle() {
  local bundle_root="$1"
  local app

  mkdir -p "${bundle_root}/deploy"

  if (( FRONTEND_ONLY == 0 )); then
    mkdir -p \
      "${bundle_root}/deploy/backend" \
      "${bundle_root}/backend-context"
    cp "${ROOT_DIR}/deploy/backend/Dockerfile.artifact" "${bundle_root}/deploy/backend/Dockerfile.artifact"
    cp "${ROOT_DIR}/deploy/backend/docker-entrypoint.sh" "${bundle_root}/backend-context/docker-entrypoint.sh"
    cp "${ROOT_DIR}/ruoyi-admin/target/ruoyi-admin.jar" "${bundle_root}/backend-context/ruoyi-admin.jar"
  fi

  cp "${ROOT_DIR}/deploy/compose.test.artifact.yml" "${bundle_root}/deploy/compose.test.artifact.yml"
  cp "${ROOT_DIR}/deploy/.env.test" "${bundle_root}/deploy/.env.test"
  bash "${ROOT_DIR}/bin/render-test-artifact-image-env.sh" "${RELEASE_TAG}" > "${bundle_root}/artifact-images.env"
  render_artifact_runtime_env "${bundle_root}/artifact-runtime.env"

  if (( BACKEND_ONLY == 0 )); then
    mkdir -p \
      "${bundle_root}/deploy/frontend" \
      "${bundle_root}/frontend-contexts"
    cp "${ROOT_DIR}/deploy/frontend/Dockerfile.artifact" "${bundle_root}/deploy/frontend/Dockerfile.artifact"

    for app in "${TARGET_FRONTEND_APPS[@]}"; do
      mkdir -p "${bundle_root}/frontend-contexts/${app}/dist"
      cp "${ROOT_DIR}/deploy/frontend/nginx.conf" "${bundle_root}/frontend-contexts/${app}/nginx.conf"
      cp "${ROOT_DIR}/deploy/frontend/docker-entrypoint.sh" "${bundle_root}/frontend-contexts/${app}/docker-entrypoint.sh"
      cp -R "${ROOT_DIR}/osg-frontend/packages/${app}/dist/." "${bundle_root}/frontend-contexts/${app}/dist/"
    done
  fi
}

run_remote_deploy() {
  local remote_artifact_dir="$1"
  local selected_app_arg="${SELECTED_FRONTEND_APP:-}"

  echo "INFO: build runtime images and deploy on remote host"
  "${SSH_CMD[@]}" bash -s -- \
    "${REMOTE_DIR}" \
    "${remote_artifact_dir}" \
    "${SKIP_UPLOAD}" \
    "${SKIP_HEALTH_CHECK}" \
    "${FRONTEND_ONLY}" \
    "${BACKEND_ONLY}" \
    "${selected_app_arg}" <<'REMOTE_SH'
set -euo pipefail

REMOTE_DIR="${1:-}"
REMOTE_ARTIFACT_DIR="${2:-}"
SKIP_UPLOAD="${3:-0}"
SKIP_HEALTH_CHECK="${4:-0}"
FRONTEND_ONLY="${5:-0}"
BACKEND_ONLY="${6:-0}"
SELECTED_FRONTEND_APP="${7:-}"

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
if [[ -f "${REMOTE_ARTIFACT_DIR}/artifact-runtime.env" ]]; then
  source "${REMOTE_ARTIFACT_DIR}/artifact-runtime.env"
fi
set +a

image_ref_for_app() {
  case "$1" in
    admin) printf '%s\n' "${ADMIN_IMAGE}" ;;
    student) printf '%s\n' "${STUDENT_IMAGE}" ;;
    mentor) printf '%s\n' "${MENTOR_IMAGE}" ;;
    lead-mentor) printf '%s\n' "${LEAD_MENTOR_IMAGE}" ;;
    assistant) printf '%s\n' "${ASSISTANT_IMAGE}" ;;
    *) return 1 ;;
  esac
}

port_for_app() {
  case "$1" in
    admin) printf '%s\n' "${ADMIN_PORT:-3005}" ;;
    student) printf '%s\n' "${STUDENT_PORT:-3001}" ;;
    mentor) printf '%s\n' "${MENTOR_PORT:-3002}" ;;
    lead-mentor) printf '%s\n' "${LEAD_MENTOR_PORT:-3003}" ;;
    assistant) printf '%s\n' "${ASSISTANT_PORT:-3004}" ;;
    *) return 1 ;;
  esac
}

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

if (( FRONTEND_ONLY == 0 )); then
  echo "INFO: docker build ${BACKEND_IMAGE}"
  docker build -t "${BACKEND_IMAGE}" \
    -f "${REMOTE_ARTIFACT_DIR}/deploy/backend/Dockerfile.artifact" \
    "${REMOTE_ARTIFACT_DIR}/backend-context"
fi

declare -a TARGET_FRONTEND_APPS=()

if (( BACKEND_ONLY == 1 )); then
  TARGET_FRONTEND_APPS=()
elif [[ -n "${SELECTED_FRONTEND_APP}" ]]; then
  TARGET_FRONTEND_APPS=("${SELECTED_FRONTEND_APP}")
else
  TARGET_FRONTEND_APPS=(admin student mentor lead-mentor assistant)
fi

if (( ${#TARGET_FRONTEND_APPS[@]} > 0 )); then
  for app in "${TARGET_FRONTEND_APPS[@]}"; do
    image_ref="$(image_ref_for_app "${app}")"
    echo "INFO: docker build ${image_ref}"
    docker build -t "${image_ref}" \
      -f "${REMOTE_ARTIFACT_DIR}/deploy/frontend/Dockerfile.artifact" \
      "${REMOTE_ARTIFACT_DIR}/frontend-contexts/${app}"
  done
fi

COMPOSE_CMD=(
  docker compose
  --env-file "${REMOTE_ARTIFACT_DIR}/deploy/.env.test"
  --env-file "${REMOTE_ARTIFACT_DIR}/artifact-images.env"
  --env-file "${REMOTE_ARTIFACT_DIR}/artifact-runtime.env"
  -f "${REMOTE_ARTIFACT_DIR}/deploy/compose.test.artifact.yml"
)

if (( BACKEND_ONLY == 1 )); then
  "${COMPOSE_CMD[@]}" up -d --force-recreate backend
elif [[ -z "${SELECTED_FRONTEND_APP}" ]] && (( FRONTEND_ONLY == 0 )); then
  "${COMPOSE_CMD[@]}" down --remove-orphans || true
  "${COMPOSE_CMD[@]}" up -d --force-recreate --remove-orphans
else
  SERVICES=()
  if (( FRONTEND_ONLY == 0 )); then
    SERVICES+=(backend)
  fi
  if (( ${#TARGET_FRONTEND_APPS[@]} > 0 )); then
    SERVICES+=("${TARGET_FRONTEND_APPS[@]}")
  fi

  if (( FRONTEND_ONLY == 1 )); then
    "${COMPOSE_CMD[@]}" up -d --force-recreate --no-deps "${SERVICES[@]}"
  else
    "${COMPOSE_CMD[@]}" up -d --force-recreate "${SERVICES[@]}"
  fi
fi

if (( SKIP_HEALTH_CHECK == 1 )); then
  "${COMPOSE_CMD[@]}" ps
  exit 0
fi

HEALTH_TIMEOUT=180
HEALTH_INTERVAL=3

if (( BACKEND_ONLY == 1 )); then
  BACKEND_URL="http://127.0.0.1:${BACKEND_PORT:-28080}/actuator/health"
  echo "INFO: wait backend => ${BACKEND_URL}"
  if ! wait_http_ok "${BACKEND_URL}" "${HEALTH_TIMEOUT}" "${HEALTH_INTERVAL}"; then
    "${COMPOSE_CMD[@]}" ps || true
    "${COMPOSE_CMD[@]}" logs backend || true
    echo "FAIL: backend health check timeout" >&2
    exit 1
  fi
elif [[ -z "${SELECTED_FRONTEND_APP}" ]] && (( FRONTEND_ONLY == 0 )); then
  BACKEND_URL="http://127.0.0.1:${BACKEND_PORT:-28080}/actuator/health"
  ADMIN_URL="http://127.0.0.1:${ADMIN_PORT:-3005}/login"

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
else
  APP_URL="http://127.0.0.1:$(port_for_app "${TARGET_FRONTEND_APPS[0]}")/login"
  echo "INFO: wait frontend => ${APP_URL}"
  if ! wait_http_status "${APP_URL}" "${HEALTH_TIMEOUT}" "${HEALTH_INTERVAL}"; then
    "${COMPOSE_CMD[@]}" ps || true
    "${COMPOSE_CMD[@]}" logs "${TARGET_FRONTEND_APPS[0]}" || true
    echo "FAIL: frontend readiness check timeout" >&2
    exit 1
  fi
fi

"${COMPOSE_CMD[@]}" ps
REMOTE_SH
}

main() {
  parse_args "$@"
  validate_args

  trap cleanup EXIT

  echo "=== deploy-test-artifacts ==="
  echo "INFO: remote=${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PORT}"
  echo "INFO: remote_dir=${REMOTE_DIR}"
  echo "INFO: release_tag=${RELEASE_TAG}"
  if [[ -n "${SELECTED_FRONTEND_APP}" ]]; then
    echo "INFO: selected_frontend_app=${SELECTED_FRONTEND_APP}"
  fi
  if (( FRONTEND_ONLY == 1 )); then
    echo "INFO: frontend_only=1"
    echo "INFO: frontend_api_base=${FRONTEND_API_BASE}"
  fi
  if (( BACKEND_ONLY == 1 )); then
    echo "INFO: backend_only=1"
  fi

  require_cmd bash
  require_cmd curl
  require_cmd gzip
  require_cmd scp
  require_cmd ssh
  require_cmd tar
  if (( SKIP_BACKEND_BUILD == 0 )); then
    require_cmd mvn
  fi

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

  if (( FRONTEND_ONLY == 0 )) && [[ ! -f "${ROOT_DIR}/ruoyi-admin/target/ruoyi-admin.jar" ]]; then
    fail "backend jar missing: ruoyi-admin/target/ruoyi-admin.jar"
  fi

  if (( SKIP_FRONTEND_BUILD == 0 )); then
    echo "INFO: install frontend deps with local Node 20 runtime"
    run_frontend_builder "pnpm install --frozen-lockfile"
    for app in "${TARGET_FRONTEND_APPS[@]}"; do
      run_frontend_build "${app}"
    done
  fi

  if (( BACKEND_ONLY == 0 )); then
    ensure_target_frontend_dists
  fi

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

  run_remote_deploy "${REMOTE_ARTIFACT_DIR}"

  echo "PASS: deploy-test-artifacts finished"
}

if [[ "${DEPLOY_TEST_ARTIFACTS_SOURCE_ONLY:-0}" == "1" ]]; then
  return 0 2>/dev/null || exit 0
fi

main "$@"
