#!/usr/bin/env bash
set -euo pipefail

ENV_NAME="${1:-test}"
PROFILE_CSV="deps"

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      PROFILE_CSV="${2:-}"
      shift 2
      ;;
    --profile=*)
      PROFILE_CSV="${1#*=}"
      shift
      ;;
    *)
      echo "FAIL: 未识别参数 $1" >&2
      exit 1
      ;;
  esac
done

case "${ENV_NAME}" in
  test|prod) ;;
  *)
    echo "FAIL: 环境仅支持 test|prod，当前=${ENV_NAME}" >&2
    exit 1
    ;;
esac

if [[ -z "${PROFILE_CSV}" ]]; then
  PROFILE_CSV="deps"
fi

ENV_FILE="deploy/.env.${ENV_NAME}"
if [[ ! -f "${ENV_FILE}" ]]; then
  ENV_FILE="deploy/.env.${ENV_NAME}.example"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "FAIL: 缺少环境文件 deploy/.env.${ENV_NAME} 或 deploy/.env.${ENV_NAME}.example" >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

version_ge() {
  local current="$1"
  local required="$2"
  [ "$(printf '%s\n%s\n' "$required" "$current" | sort -V | head -n1)" = "$required" ]
}

require_file_nonempty() {
  local file="$1"
  if [[ ! -f "${file}" ]]; then
    echo "FAIL: 缺少文件 ${file}" >&2
    exit 1
  fi
  if [[ ! -s "${file}" ]]; then
    echo "FAIL: 文件为空 ${file}" >&2
    exit 1
  fi
}

require_env_keys() {
  local requirements_file="$1"
  if [[ ! -f "${requirements_file}" ]]; then
    echo "FAIL: 缺少必填键清单 ${requirements_file}" >&2
    exit 1
  fi

  local missing=()
  while IFS= read -r line || [[ -n "${line}" ]]; do
    key="$(echo "${line}" | sed 's/#.*$//' | xargs)"
    [[ -z "${key}" ]] && continue
    value="${!key-}"
    if [[ -z "${value}" ]]; then
      missing+=("${key}")
    fi
  done < "${requirements_file}"

  if (( ${#missing[@]} > 0 )); then
    echo "FAIL: ${ENV_FILE} 缺少必填键或值为空：" >&2
    for k in "${missing[@]}"; do
      echo "  - ${k}" >&2
    done
    exit 1
  fi
}

check_prod_plaintext_secrets() {
  local forbidden=(
    MYSQL_ROOT_PASSWORD
    MYSQL_APP_PASSWORD
    REDIS_PASSWORD
    JWT_SECRET
  )

  local leaked=()
  for key in "${forbidden[@]}"; do
    value="${!key-}"
    if [[ -n "${value}" ]]; then
      leaked+=("${key}")
    fi
  done

  if (( ${#leaked[@]} > 0 )); then
    echo "FAIL: prod 环境检测到明文敏感键（必须走 deploy/secrets/*）：" >&2
    for k in "${leaked[@]}"; do
      echo "  - ${k}" >&2
    done
    exit 1
  fi
}

check_port_free() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    if lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "FAIL: 端口被占用 ${port}" >&2
      lsof -nP -iTCP:"${port}" -sTCP:LISTEN || true
      exit 1
    fi
    return 0
  fi
  if command -v ss >/dev/null 2>&1; then
    if ss -lnt "( sport = :${port} )" | tail -n +2 | grep -q .; then
      echo "FAIL: 端口被占用 ${port}" >&2
      ss -lntp "( sport = :${port} )" || true
      exit 1
    fi
    return 0
  fi
  echo "FAIL: 缺少端口检测工具（需要 lsof 或 ss）" >&2
  exit 1
}

check_port_listening() {
  local port="$1"
  local label="$2"
  if command -v lsof >/dev/null 2>&1; then
    if lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi
    echo "FAIL: ${label} 未监听端口 ${port}" >&2
    exit 1
  fi
  if command -v ss >/dev/null 2>&1; then
    if ss -lnt "( sport = :${port} )" | tail -n +2 | grep -q .; then
      return 0
    fi
    echo "FAIL: ${label} 未监听端口 ${port}" >&2
    exit 1
  fi
  echo "FAIL: 缺少端口检测工具（需要 lsof 或 ss）" >&2
  exit 1
}


check_topology_services() {
  local manage_deps="$1"
  local need_core="$2"
  local need_frontends="$3"
  shift 3
  local actual_file expected_file
  actual_file="$(mktemp)"
  expected_file="$(mktemp)"

  docker compose \
    -f deploy/compose.base.yml \
    -f "deploy/compose.${ENV_NAME}.yml" \
    --env-file "${ENV_FILE}" \
    "$@" \
    config --services | sed '/^$/d' | sort > "${actual_file}"

  {
    if [[ "${manage_deps}" == "true" ]]; then
      echo mysql
      echo redis
    fi
    if [[ "${need_core}" == "true" || "${need_frontends}" == "true" ]]; then
      echo backend
    fi
    if [[ "${need_frontends}" == "true" ]]; then
      echo admin
      echo assistant
      echo lead-mentor
      echo mentor
      echo student
    fi
  } | sed '/^$/d' | sort > "${expected_file}"

  if ! cmp -s "${actual_file}" "${expected_file}"; then
    echo "FAIL: 服务拓扑漂移，实际服务列表与当前环境/依赖模式不一致" >&2
    echo "--- expected ---" >&2
    cat "${expected_file}" >&2
    echo "--- actual ---" >&2
    cat "${actual_file}" >&2
    rm -f "${actual_file}" "${expected_file}"
    exit 1
  fi

  rm -f "${actual_file}" "${expected_file}"
}

echo "=== deploy-preflight: env=${ENV_NAME}, profile=${PROFILE_CSV}, env_file=${ENV_FILE} ==="

command -v docker >/dev/null 2>&1 || { echo "FAIL: 未安装 docker" >&2; exit 1; }

docker_server_ver="$(docker version --format '{{.Server.Version}}' 2>/dev/null || true)"
if [[ -z "${docker_server_ver}" ]]; then
  echo "FAIL: 无法获取 Docker Server 版本" >&2
  exit 1
fi
if ! version_ge "${docker_server_ver}" "24.0.0"; then
  echo "FAIL: Docker 版本过低，当前=${docker_server_ver}，要求>=24.0.0" >&2
  exit 1
fi

compose_ver_raw="$(docker compose version --short 2>/dev/null || true)"
compose_ver="${compose_ver_raw#v}"
if [[ -z "${compose_ver}" ]]; then
  echo "FAIL: 未检测到 Docker Compose Plugin (v2)" >&2
  exit 1
fi
if ! version_ge "${compose_ver}" "2.20.0"; then
  echo "FAIL: Docker Compose 版本过低，当前=${compose_ver_raw}，要求>=2.20.0" >&2
  exit 1
fi

avail_kb="$(df -Pk . | awk 'NR==2 {print $4}')"
if [[ -z "${avail_kb}" ]]; then
  echo "FAIL: 无法检测磁盘可用空间" >&2
  exit 1
fi
if (( avail_kb < 20 * 1024 * 1024 )); then
  echo "FAIL: 可用磁盘不足 20GB" >&2
  exit 1
fi

require_file_nonempty deploy/compose.base.yml
require_file_nonempty "deploy/compose.${ENV_NAME}.yml"
require_file_nonempty deploy/backend/Dockerfile
require_file_nonempty deploy/backend/docker-entrypoint.sh
require_file_nonempty deploy/frontend/Dockerfile.test
require_file_nonempty deploy/frontend/Dockerfile.prod
require_file_nonempty deploy/frontend/nginx.conf
require_file_nonempty bin/prepare-mysql-init.sh
require_file_nonempty ruoyi-admin/target/ruoyi-admin.jar
bash bin/prepare-mysql-init.sh --check >/dev/null

if ! docker compose \
  -f deploy/compose.base.yml \
  -f "deploy/compose.${ENV_NAME}.yml" \
  --env-file "${ENV_FILE}" \
  config >/dev/null; then
  echo "FAIL: docker compose 配置渲染失败（请检查 compose 文件与环境变量）" >&2
  exit 1
fi

for sql in \
  deploy/mysql-init/00_ry_20250522.sql \
  deploy/mysql-init/01_quartz.sql \
  deploy/mysql-init/02_osg_menu_init.sql \
  deploy/mysql-init/03_osg_role_init.sql \
  deploy/mysql-init/04_osg_role_menu_init.sql \
  deploy/mysql-init/05_osg_user_init.sql \
  deploy/mysql-init/06_osg_alter_user_first_login.sql; do
  require_file_nonempty "${sql}"
done

if [[ "${ENV_NAME}" == "prod" ]]; then
  require_env_keys deploy/requirements-prod.txt
  check_prod_plaintext_secrets
  for secret in \
    deploy/secrets/mysql_root_password \
    deploy/secrets/mysql_app_password \
    deploy/secrets/redis_password \
    deploy/secrets/jwt_secret; do
    require_file_nonempty "${secret}"
  done
else
  require_env_keys deploy/requirements-test.txt
fi

need_deps=false
need_core=false
need_frontends=false
shared_test_mode=false
if [[ "${ENV_NAME}" == "test" && "${TEST_DEPENDENCY_MODE:-isolated}" == "shared" ]]; then
  shared_test_mode=true
fi

IFS=',' read -r -a profiles <<< "${PROFILE_CSV}"
for p in "${profiles[@]}"; do
  p_trim="$(echo "${p}" | xargs)"
  case "${p_trim}" in
    deps) need_deps=true ;;
    core) need_deps=true; need_core=true ;;
    frontends) need_frontends=true ;;
    "") ;;
    *)
      echo "FAIL: profile 非法值 ${p_trim}（仅支持 deps|core|frontends）" >&2
      exit 1
      ;;
  esac
done

manage_deps=true
if [[ "${shared_test_mode}" == "true" ]]; then
  manage_deps=false
fi

PROFILE_ARGS=()
while IFS= read -r profile; do
  [[ -z "${profile}" ]] && continue
  PROFILE_ARGS+=(--profile "${profile}")
done < <(bash bin/resolve-compose-profiles.sh "${ENV_NAME}" "${PROFILE_CSV}" "${ENV_FILE}")

check_topology_services "${manage_deps}" "${need_core}" "${need_frontends}" "${PROFILE_ARGS[@]}"

if [[ "${manage_deps}" == true && "${need_deps}" == true ]]; then
  if [[ "${ENV_NAME}" == "prod" ]]; then
    echo "INFO: prod 环境 mysql/redis 端口默认不暴露，跳过端口占用检查"
  else
    check_port_free "${MYSQL_PORT:-3306}"
    check_port_free "${REDIS_PORT:-6379}"
  fi
elif [[ "${shared_test_mode}" == "true" && "${need_core}" == "true" ]]; then
  check_port_listening "${MYSQL_SHARED_PORT:-23306}" "shared mysql"
  check_port_listening "${REDIS_SHARED_PORT:-26379}" "shared redis"
fi
if [[ "${need_core}" == true || "${need_frontends}" == true ]]; then
  check_port_free "${BACKEND_PORT:-8080}"
fi
if [[ "${need_frontends}" == true ]]; then
  check_port_free "${STUDENT_PORT:-3001}"
  check_port_free "${MENTOR_PORT:-3002}"
  check_port_free "${LEAD_MENTOR_PORT:-3003}"
  check_port_free "${ASSISTANT_PORT:-3004}"
  check_port_free "${ADMIN_PORT:-3005}"
fi

echo "PASS: deploy-preflight 通过"
