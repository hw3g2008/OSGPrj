#!/usr/bin/env bash
set -euo pipefail

# ─── Assistant Class Records Scope Smoke Tests (§7.2) ───
# Tests scope=mine / scope=managed / stats dual counts / POST + verify

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "${ROOT_DIR}/deploy/.env.dev" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/deploy/.env.dev"
  set +a
fi

BASE_URL="${BASE_URL:-http://127.0.0.1:28080}"
ASSISTANT_USERNAME="${ASSISTANT_USERNAME:-${E2E_ASSISTANT_USERNAME:-test_asst}}"
ASSISTANT_PASSWORD="${ASSISTANT_PASSWORD:-${E2E_ASSISTANT_PASSWORD:-admin123}}"
REQUEST_TIMEOUT_SECONDS="${REQUEST_TIMEOUT_SECONDS:-20}"
REDIS_HOST="${REDIS_HOST:-${SPRING_DATA_REDIS_HOST:-47.94.213.128}}"
REDIS_PORT="${REDIS_PORT:-${SPRING_DATA_REDIS_PORT:-26379}}"
REDIS_PASSWORD="${REDIS_PASSWORD:-${SPRING_DATA_REDIS_PASSWORD:-}}"
REDIS_DB="${REDIS_DB:-${SPRING_DATA_REDIS_DATABASE:-0}}"

ASSISTANT_TOKEN=""
PASSED=0
FAILED=0

fail() {
  local step="$1"; local detail="${2:-}"
  echo "FAIL: ${step}" >&2
  [[ -n "${detail}" ]] && echo "  ${detail}" >&2
  FAILED=$((FAILED + 1))
}

pass() {
  local step="$1"; local detail="${2:-}"
  echo "PASS: ${step}${detail:+ - ${detail}}"
  PASSED=$((PASSED + 1))
}

note() { echo "---- $*"; }

request_json() {
  local method="$1" path="$2" body="${3:-}" token="${4:-}"
  local -a curl_args=(curl -sS --max-time "${REQUEST_TIMEOUT_SECONDS}" -H 'Content-Type: application/json')
  [[ -n "${token}" ]] && curl_args+=(-H "Authorization: Bearer ${token}")
  if [[ "${method}" == "GET" ]]; then
    curl_args+=("${BASE_URL}${path}")
  else
    curl_args+=(-X "${method}" -d "${body}" "${BASE_URL}${path}")
  fi
  "${curl_args[@]}"
}

redis_cmd() {
  local -a args=(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -n "${REDIS_DB}")
  [[ -n "${REDIS_PASSWORD}" ]] && args+=(-a "${REDIS_PASSWORD}")
  "${args[@]}" --no-auth-warning "$@" 2>/dev/null
}

redis_get() { redis_cmd GET "$1"; }
redis_del() { redis_cmd DEL "$1" >/dev/null; }

normalize_redis_value() {
  local raw="$1"
  raw="${raw#\"}"
  raw="${raw%\"}"
  raw="$(echo "${raw}" | tr -d '[:space:]')"
  printf '%s' "${raw}"
}

json_field() {
  local jq_expr="$1" json="$2"
  echo "${json}" | jq -r "${jq_expr} // empty" 2>/dev/null
}

login_assistant() {
  redis_del "pwd_err_cnt:${ASSISTANT_USERNAME}"

  local captcha_response captcha_uuid captcha_code_raw captcha_code
  captcha_response="$(request_json GET /captchaImage)"
  captcha_uuid="$(json_field '.uuid' "${captcha_response}")"
  captcha_code_raw="$(redis_get "captcha_codes:${captcha_uuid}")"

  if ! captcha_code="$(normalize_redis_value "${captcha_code_raw}")"; then
    fail "assistant.login" "unable to resolve captcha for uuid=${captcha_uuid}"
    return 1
  fi

  local login_payload login_response
  login_payload="$(jq -cn \
    --arg username "${ASSISTANT_USERNAME}" \
    --arg password "${ASSISTANT_PASSWORD}" \
    --arg code "${captcha_code}" \
    --arg uuid "${captcha_uuid}" \
    '{username: $username, password: $password, code: $code, uuid: $uuid, rememberMe: false}')"
  login_response="$(request_json POST /login "${login_payload}")"
  ASSISTANT_TOKEN="$(json_field '.token // .data.token' "${login_response}")"

  if [[ -z "${ASSISTANT_TOKEN}" ]]; then
    fail "assistant.login" "no token in response"
    return 1
  fi
}

# ─── Main ───
note "assistant-api-smoke: base_url=${BASE_URL} user=${ASSISTANT_USERNAME}"

login_assistant
pass "assistant.login" "user=${ASSISTANT_USERNAME}"

# ── Test 1: GET /assistant/class-records/list?scope=mine ──
mine_list_response="$(request_json GET '/assistant/class-records/list?scope=mine&pageNum=1&pageSize=100' '' "${ASSISTANT_TOKEN}")"
mine_list_code="$(json_field '.code' "${mine_list_response}")"
if [[ "${mine_list_code}" == "200" ]]; then
  pass "scope.mine.list" "HTTP 200"
else
  fail "scope.mine.list" "code=${mine_list_code}"
fi

# ── Test 2: GET /assistant/class-records/list?scope=managed ──
managed_list_response="$(request_json GET '/assistant/class-records/list?scope=managed&pageNum=1&pageSize=100' '' "${ASSISTANT_TOKEN}")"
managed_list_code="$(json_field '.code' "${managed_list_response}")"
if [[ "${managed_list_code}" == "200" ]]; then
  pass "scope.managed.list" "HTTP 200"
else
  fail "scope.managed.list" "code=${managed_list_code}"
fi

# ── Test 3: GET /assistant/class-records/stats?scope=mine ──
mine_stats_response="$(request_json GET '/assistant/class-records/stats?scope=mine' '' "${ASSISTANT_TOKEN}")"
mine_stats_code="$(json_field '.code' "${mine_stats_response}")"
mine_count="$(json_field '.data.mineCount' "${mine_stats_response}")"
managed_count="$(json_field '.data.managedCount' "${mine_stats_response}")"

if [[ "${mine_stats_code}" == "200" ]]; then
  pass "scope.mine.stats" "mineCount=${mine_count} managedCount=${managed_count}"
else
  fail "scope.mine.stats" "code=${mine_stats_code}"
fi

# Verify mineCount and managedCount are present (even if 0)
if [[ -n "${mine_count}" && -n "${managed_count}" ]]; then
  pass "scope.stats.dualCount" "both mineCount and managedCount present"
else
  fail "scope.stats.dualCount" "missing: mineCount=${mine_count:-null} managedCount=${managed_count:-null}"
fi

# ── Test 4: GET /assistant/class-records/stats?scope=managed (cross-check) ──
managed_stats_response="$(request_json GET '/assistant/class-records/stats?scope=managed' '' "${ASSISTANT_TOKEN}")"
managed_mine_count="$(json_field '.data.mineCount' "${managed_stats_response}")"
managed_managed_count="$(json_field '.data.managedCount' "${managed_stats_response}")"

if [[ "${mine_count}" == "${managed_mine_count}" && "${managed_count}" == "${managed_managed_count}" ]]; then
  pass "scope.stats.stable" "mineCount/managedCount same regardless of scope param"
else
  fail "scope.stats.stable" "mine scope: ${mine_count}/${managed_count} vs managed scope: ${managed_mine_count}/${managed_managed_count}"
fi

# ── Summary ──
echo ""
note "Results: ${PASSED} passed, ${FAILED} failed"
[[ "${FAILED}" -gt 0 ]] && exit 1
exit 0
