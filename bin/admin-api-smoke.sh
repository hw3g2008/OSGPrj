#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "${ROOT_DIR}/deploy/.env.dev" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/deploy/.env.dev"
  set +a
fi

BASE_URL="${BASE_URL:-http://127.0.0.1:28080}"
ADMIN_USERNAME="${ADMIN_USERNAME:-${E2E_ADMIN_USERNAME:-admin}}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-${E2E_ADMIN_PASSWORD:-Osg@2025}}"
STUDENT_USERNAME="${STUDENT_USERNAME:-${E2E_STUDENT_USERNAME:-student_demo}}"
STUDENT_PASSWORD="${STUDENT_PASSWORD:-${E2E_STUDENT_PASSWORD:-student123}}"
REQUEST_TIMEOUT_SECONDS="${REQUEST_TIMEOUT_SECONDS:-20}"
SMOKE_TAG="${SMOKE_TAG:-admin-api-smoke-$(date +%Y%m%d%H%M%S)}"
REDIS_HOST="${REDIS_HOST:-${SPRING_DATA_REDIS_HOST:-47.94.213.128}}"
REDIS_PORT="${REDIS_PORT:-${SPRING_DATA_REDIS_PORT:-26379}}"
REDIS_PASSWORD="${REDIS_PASSWORD:-${SPRING_DATA_REDIS_PASSWORD:-}}"
REDIS_DB="${REDIS_DB:-${SPRING_DATA_REDIS_DATABASE:-0}}"

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/admin-api-smoke.XXXXXX")"

ADMIN_TOKEN=""
STUDENT_TOKEN=""
ORIGINAL_ADMIN_PASSWORD="${ADMIN_PASSWORD}"
CURRENT_ADMIN_PASSWORD="${ADMIN_PASSWORD}"
PROFILE_BEFORE_JSON=""
PROFILE_DIRTY=0

TEMP_ROLE_ID=""
TEMP_USER_ID=""
TEMP_ROLE_KEY="autotest_admin_api_role"
TEMP_ROLE_NAME="AUTOTEST Admin API Role"
TEMP_USER_NAME="autotest_api_user"
TEMP_USER_EMAIL="autotest.admin.api.user@osg.local"
TEMP_USER_CREATE_PHONE="13800000001"
TEMP_USER_UPDATE_PHONE="13800000002"
TEMP_USER_PASSWORD="TempUser123"
TEMP_USER_RESET_PASSWORD="TempUser456"

AUTOTEST_STAFF_NAME="AUTOTEST Mentor API"
AUTOTEST_STAFF_EMAIL="autotest.mentor.api@osg.local"
AUTOTEST_STAFF_PHONE="13900000001"
AUTOTEST_STUDENT_NAME="AUTOTEST Student API"
AUTOTEST_STUDENT_EMAIL="autotest.student.api@osg.local"
AUTOTEST_BASE_DATA_NAME="AUTOTEST City API ${SMOKE_TAG}"
AUTOTEST_MANUAL_POSITION_TITLE="AUTOTEST Manual Position ${SMOKE_TAG}"
AUTOTEST_MANUAL_POSITION_COMPANY="AUTOTEST Manual Company ${SMOKE_TAG}"
AUTOTEST_JOB_COACHING_NOTE="AUTOTEST Coaching ${SMOKE_TAG}"
AUTOTEST_MOCK_REMARK="AUTOTEST Mock ${SMOKE_TAG}"
AUTOTEST_CONTRACT_REASON="AUTOTEST Contract Renewal"
AUTOTEST_CONTRACT_START="2030-01-01"
AUTOTEST_CONTRACT_END="2030-03-31"
AUTOTEST_CONTRACT_AMOUNT="7777"
AUTOTEST_CONTRACT_HOURS="33"
TEMP_ADMIN_PASSWORD="AdminTemp2026A1"

fail() {
  local step="$1"
  local detail="${2:-}"
  echo "FAIL: ${step}" >&2
  if [[ -n "${detail}" ]]; then
    echo "${detail}" >&2
  fi
  exit 1
}

pass() {
  local step="$1"
  local detail="${2:-}"
  if [[ -n "${detail}" ]]; then
    echo "PASS: ${step} - ${detail}"
    return
  fi
  echo "PASS: ${step}"
}

warn() {
  local step="$1"
  local detail="${2:-}"
  if [[ -n "${detail}" ]]; then
    echo "WARN: ${step} - ${detail}"
    return
  fi
  echo "WARN: ${step}"
}

note() {
  local message="$1"
  echo "INFO: ${message}"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "dependency" "missing command: $1"
}

json_required() {
  local expression="$1"
  local input="$2"
  local value

  if ! value="$(jq -er "${expression}" <<<"${input}" 2>/dev/null)"; then
    fail "jq ${expression}" "${input}"
  fi

  if [[ -z "${value}" || "${value}" == "null" ]]; then
    fail "jq ${expression}" "${input}"
  fi

  printf '%s' "${value}"
}

json_optional() {
  local expression="$1"
  local input="$2"
  jq -er "${expression} // empty" <<<"${input}" 2>/dev/null || true
}

uri_encode() {
  local value="$1"
  jq -nr --arg value "${value}" '$value|@uri'
}

request_json() {
  local method="$1"
  local path="$2"
  local body="${3-}"
  local token="${4-}"
  local url="${BASE_URL}${path}"
  local response_file
  local http_code
  response_file="$(mktemp "${TEMP_DIR}/response.XXXXXX")"

  local curl_args=(
    -sS
    --max-time "${REQUEST_TIMEOUT_SECONDS}"
    -X "${method}"
    -H "Accept: application/json"
    -o "${response_file}"
    -w "%{http_code}"
  )

  if [[ -n "${token}" ]]; then
    curl_args+=(-H "Authorization: Bearer ${token}")
  fi

  if [[ -n "${body}" ]]; then
    curl_args+=(-H "Content-Type: application/json" --data "${body}")
  fi

  set +e
  http_code="$(curl "${curl_args[@]}" "${url}")"
  local curl_rc=$?
  set -e

  local response_body
  response_body="$(cat "${response_file}")"
  rm -f "${response_file}"

  if (( curl_rc != 0 )); then
    fail "${method} ${path}" "curl rc=${curl_rc}"
  fi

  if [[ ! "${http_code}" =~ ^2 ]]; then
    fail "${method} ${path}" "http=${http_code}
${response_body}"
  fi

  if ! jq -e '.code == 200' >/dev/null 2>&1 <<<"${response_body}"; then
    fail "${method} ${path}" "${response_body}"
  fi

  printf '%s' "${response_body}"
}

request_binary() {
  local method="$1"
  local path="$2"
  local output_file="$3"
  local token="${4-}"
  local url="${BASE_URL}${path}"
  local http_code

  local curl_args=(
    -sS
    --max-time "${REQUEST_TIMEOUT_SECONDS}"
    -X "${method}"
    -H "Accept: */*"
    -o "${output_file}"
    -w "%{http_code}"
  )

  if [[ -n "${token}" ]]; then
    curl_args+=(-H "Authorization: Bearer ${token}")
  fi

  set +e
  http_code="$(curl "${curl_args[@]}" "${url}")"
  local curl_rc=$?
  set -e

  if (( curl_rc != 0 )); then
    fail "${method} ${path}" "curl rc=${curl_rc}"
  fi

  if [[ ! "${http_code}" =~ ^2 ]]; then
    local preview
    preview="$(head -c 200 "${output_file}" 2>/dev/null || true)"
    fail "${method} ${path}" "http=${http_code}
${preview}"
  fi
}

redis_get() {
  local key="$1"
  if [[ -n "${REDIS_PASSWORD}" ]]; then
    REDISCLI_AUTH="${REDIS_PASSWORD}" \
      redis-cli --raw -h "${REDIS_HOST}" -p "${REDIS_PORT}" -n "${REDIS_DB}" GET "${key}" 2>/dev/null || true
    return
  fi

  redis-cli --raw -h "${REDIS_HOST}" -p "${REDIS_PORT}" -n "${REDIS_DB}" GET "${key}" 2>/dev/null || true
}

redis_del() {
  local key="$1"
  if [[ -n "${REDIS_PASSWORD}" ]]; then
    REDISCLI_AUTH="${REDIS_PASSWORD}" \
      redis-cli --raw -h "${REDIS_HOST}" -p "${REDIS_PORT}" -n "${REDIS_DB}" DEL "${key}" >/dev/null 2>&1 || true
    return
  fi

  redis-cli --raw -h "${REDIS_HOST}" -p "${REDIS_PORT}" -n "${REDIS_DB}" DEL "${key}" >/dev/null 2>&1 || true
}

normalize_redis_value() {
  local raw="${1-}"
  raw="$(printf '%s' "${raw}" | tr -d '\r')"
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw%"${raw##*[![:space:]]}"}"
  if [[ -z "${raw}" || "${raw}" == "(nil)" ]]; then
    return 1
  fi
  if [[ "${raw}" == \"*\" && "${raw}" == *\" ]]; then
    raw="${raw:1:${#raw}-2}"
  fi
  printf '%s' "${raw}"
}

request_captcha() {
  local captcha_response
  local captcha_uuid
  local captcha_code_raw
  local captcha_code

  captcha_response="$(request_json GET /captchaImage)"
  captcha_uuid="$(json_required '.uuid' "${captcha_response}")"
  captcha_code_raw="$(redis_get "captcha_codes:${captcha_uuid}")"

  if ! captcha_code="$(normalize_redis_value "${captcha_code_raw}")"; then
    fail "captcha" "unable to resolve captcha value for uuid=${captcha_uuid}"
  fi

  printf '%s|%s' "${captcha_uuid}" "${captcha_code}"
}

login_admin_with_password() {
  local password="$1"
  local captcha
  local captcha_uuid
  local captcha_code
  local login_payload
  local login_response

  redis_del "pwd_err_cnt:${ADMIN_USERNAME}"

  captcha="$(request_captcha)"
  captcha_uuid="${captcha%%|*}"
  captcha_code="${captcha##*|}"

  login_payload="$(jq -cn \
    --arg username "${ADMIN_USERNAME}" \
    --arg password "${password}" \
    --arg code "${captcha_code}" \
    --arg uuid "${captcha_uuid}" \
    '{username: $username, password: $password, code: $code, uuid: $uuid, rememberMe: false}')"
  login_response="$(request_json POST /login "${login_payload}")"
  ADMIN_TOKEN="$(json_required '.token // .data.token' "${login_response}")"
  CURRENT_ADMIN_PASSWORD="${password}"
}

login_student() {
  local login_payload
  local login_response

  login_payload="$(jq -cn \
    --arg username "${STUDENT_USERNAME}" \
    --arg password "${STUDENT_PASSWORD}" \
    '{username: $username, password: $password}')"
  login_response="$(request_json POST /student/login "${login_payload}")"
  STUDENT_TOKEN="$(json_required '.token // .data.token' "${login_response}")"
}

ensure_admin_token() {
  if [[ -n "${ADMIN_TOKEN}" ]]; then
    return
  fi
  login_admin_with_password "${CURRENT_ADMIN_PASSWORD}"
}

ensure_student_token() {
  if [[ -n "${STUDENT_TOKEN}" ]]; then
    return
  fi
  login_student
}

cleanup_temp_user_and_role() {
  set +e
  ensure_admin_token >/dev/null 2>&1 || true

  if [[ -n "${ADMIN_TOKEN}" ]]; then
    if [[ -z "${TEMP_USER_ID}" ]]; then
      TEMP_USER_ID="$(find_temp_user_id 2>/dev/null || true)"
    fi
    if [[ -n "${TEMP_USER_ID}" ]]; then
      request_json DELETE "/system/user/${TEMP_USER_ID}" "" "${ADMIN_TOKEN}" >/dev/null 2>&1 || true
      TEMP_USER_ID=""
    fi

    if [[ -z "${TEMP_ROLE_ID}" ]]; then
      TEMP_ROLE_ID="$(find_role_id_by_key "${TEMP_ROLE_KEY}" 2>/dev/null || true)"
    fi
    if [[ -n "${TEMP_ROLE_ID}" ]]; then
      request_json DELETE "/system/role/${TEMP_ROLE_ID}" "" "${ADMIN_TOKEN}" >/dev/null 2>&1 || true
      TEMP_ROLE_ID=""
    fi
  fi
  set -e
}

restore_profile_if_needed() {
  if (( PROFILE_DIRTY == 0 )); then
    return
  fi

  if [[ -z "${PROFILE_BEFORE_JSON}" ]]; then
    return
  fi

  ensure_admin_token

  local nick_name
  local email
  local phone
  local sex
  local restore_payload

  nick_name="$(json_required '.data.nickName' "${PROFILE_BEFORE_JSON}")"
  email="$(json_required '.data.email // ""' "${PROFILE_BEFORE_JSON}")"
  phone="$(json_optional '.data.phonenumber' "${PROFILE_BEFORE_JSON}")"
  sex="$(json_optional '.data.sex' "${PROFILE_BEFORE_JSON}")"

  restore_payload="$(jq -cn \
    --arg nickName "${nick_name}" \
    --arg email "${email}" \
    --arg phonenumber "${phone}" \
    --arg sex "${sex:-0}" \
    '{nickName: $nickName, email: $email, phonenumber: $phonenumber, sex: $sex}')"
  request_json PUT /system/user/profile "${restore_payload}" "${ADMIN_TOKEN}" >/dev/null
  PROFILE_DIRTY=0
}

restore_admin_password_if_needed() {
  if [[ "${CURRENT_ADMIN_PASSWORD}" == "${ORIGINAL_ADMIN_PASSWORD}" ]]; then
    return
  fi

  set +e
  login_admin_with_password "${CURRENT_ADMIN_PASSWORD}" >/dev/null 2>&1
  if [[ -n "${ADMIN_TOKEN}" ]]; then
    local restore_payload
    restore_payload="$(jq -cn \
      --arg oldPassword "${CURRENT_ADMIN_PASSWORD}" \
      --arg newPassword "${ORIGINAL_ADMIN_PASSWORD}" \
      '{oldPassword: $oldPassword, newPassword: $newPassword}')"
    request_json PUT /system/user/profile/updatePwd "${restore_payload}" "${ADMIN_TOKEN}" >/dev/null 2>&1 || true
  fi
  CURRENT_ADMIN_PASSWORD="${ORIGINAL_ADMIN_PASSWORD}"
  ADMIN_TOKEN=""
  set -e
}

cleanup() {
  local exit_code=$?
  set +e
  cleanup_temp_user_and_role
  restore_profile_if_needed
  restore_admin_password_if_needed
  rm -rf "${TEMP_DIR}"
  exit "${exit_code}"
}

if [[ "${ADMIN_API_SMOKE_LIB:-0}" == "1" ]]; then
  return 0 2>/dev/null || exit 0
fi

trap cleanup EXIT

find_role_id_by_key() {
  local role_key="$1"
  local roles_response
  roles_response="$(request_json GET "/system/role/list?pageNum=1&pageSize=100&roleKey=${role_key}" "" "${ADMIN_TOKEN}")"
  jq -er --arg roleKey "${role_key}" '.rows[] | select(.roleKey == $roleKey) | .roleId' <<<"${roles_response}" 2>/dev/null | head -n1
}

find_user_id_by_username() {
  local user_name="$1"
  local users_response
  users_response="$(request_json GET "/system/user/list?pageNum=1&pageSize=100&userName=${user_name}" "" "${ADMIN_TOKEN}")"
  jq -er --arg userName "${user_name}" '.rows[] | select(.userName == $userName) | .userId' <<<"${users_response}" 2>/dev/null | head -n1
}

find_temp_user_id() {
  local users_response
  users_response="$(request_json GET "/system/user/list?pageNum=1&pageSize=100" "" "${ADMIN_TOKEN}")"
  jq -er \
    --arg userName "${TEMP_USER_NAME}" \
    --arg email "${TEMP_USER_EMAIL}" \
    --arg createPhone "${TEMP_USER_CREATE_PHONE}" \
    --arg updatePhone "${TEMP_USER_UPDATE_PHONE}" \
    '.rows[] | select(
      .userName == $userName or
      .email == $email or
      .phonenumber == $createPhone or
      .phonenumber == $updatePhone
    ) | .userId' <<<"${users_response}" 2>/dev/null | head -n1
}

find_staff_row_by_name() {
  local name="$1"
  local staff_response
  staff_response="$(request_json GET "/admin/staff/list?pageNum=1&pageSize=100&staffName=$(uri_encode "${name}")" "" "${ADMIN_TOKEN}")"
  jq -c --arg name "${name}" '.rows[] | select(.staffName == $name)' <<<"${staff_response}" 2>/dev/null | head -n1
}

find_student_row_by_name() {
  local name="$1"
  local student_response
  student_response="$(request_json GET "/admin/student/list?pageNum=1&pageSize=100&studentName=$(uri_encode "${name}")" "" "${ADMIN_TOKEN}")"
  jq -c --arg name "${name}" '.rows[] | select(.studentName == $name)' <<<"${student_response}" 2>/dev/null | head -n1
}

poll_student_position_row() {
  local title="$1"
  local company="$2"
  local response=""
  local row=""

  for _ in {1..8}; do
    response="$(request_json GET "/admin/student-position/list?status=pending&keyword=$(uri_encode "${title}")" "" "${ADMIN_TOKEN}")"
    row="$(jq -c --arg title "${title}" --arg company "${company}" \
      '.rows[] | select(.positionName == $title or .companyName == $company)' \
      <<<"${response}" 2>/dev/null | head -n1 || true)"
    if [[ -n "${row}" ]]; then
      printf '%s' "${row}"
      return 0
    fi
    sleep 1
  done

  return 1
}

poll_job_overview_unassigned_row() {
  local company="$1"
  local title="$2"
  local response=""
  local row=""

  for _ in {1..8}; do
    response="$(request_json GET "/admin/job-overview/unassigned?companyName=$(uri_encode "${company}")" "" "${ADMIN_TOKEN}")"
    row="$(jq -c --arg company "${company}" --arg title "${title}" \
      '.rows[] | select(.companyName == $company and .positionName == $title)' \
      <<<"${response}" 2>/dev/null | head -n1 || true)"
    if [[ -n "${row}" ]]; then
      printf '%s' "${row}"
      return 0
    fi
    sleep 1
  done

  return 1
}

poll_mock_practice_row() {
  local practice_id="$1"
  local response=""
  local row=""

  for _ in {1..8}; do
    response="$(request_json GET "/admin/mock-practice/list?tab=pending" "" "${ADMIN_TOKEN}")"
    row="$(jq -c --argjson practiceId "${practice_id}" '.rows[] | select(.practiceId == $practiceId)' \
      <<<"${response}" 2>/dev/null | head -n1 || true)"
    if [[ -n "${row}" ]]; then
      printf '%s' "${row}"
      return 0
    fi
    sleep 1
  done

  return 1
}

require_cmd curl
require_cmd jq
require_cmd redis-cli

note "base=${BASE_URL}"
note "admin=${ADMIN_USERNAME}"
note "student=${STUDENT_USERNAME}"
note "tag=${SMOKE_TAG}"

login_admin_with_password "${ORIGINAL_ADMIN_PASSWORD}"
pass "admin.login" "user=${ADMIN_USERNAME}"

admin_info_response="$(request_json GET /getInfo "" "${ADMIN_TOKEN}")"
admin_user_name="$(json_required '.user.userName // .data.user.userName' "${admin_info_response}")"
pass "admin.getInfo" "user=${admin_user_name}"

PROFILE_BEFORE_JSON="$(request_json GET /system/user/profile "" "${ADMIN_TOKEN}")"
pass "profile.read" "captured original admin profile"

initial_logs_response="$(request_json GET /admin/log/list "" "${ADMIN_TOKEN}")"
initial_log_count="$(json_required '.rows | length' "${initial_logs_response}")"
pass "logs.initial" "count=${initial_log_count}"

dept_list_response="$(request_json GET /system/dept/list "" "${ADMIN_TOKEN}")"
default_dept_id="$(json_required '.data[0].deptId' "${dept_list_response}")"
pass "dept.list" "deptId=${default_dept_id}"

menu_tree_response="$(request_json GET /system/menu/treeselect "" "${ADMIN_TOKEN}")"
leaf_menu_ids_csv="$(json_required '[.data[] | recurse(.children[]?) | select((.children | length? // 0) == 0) | .id] | .[:4] | join(",")' "${menu_tree_response}")"
IFS=',' read -r -a leaf_menu_ids <<<"${leaf_menu_ids_csv}"
if (( ${#leaf_menu_ids[@]} < 3 )); then
  fail "permission.menuTree" "expected at least 3 leaf menu ids"
fi
pass "permission.menuTree" "leafCount=${#leaf_menu_ids[@]}"

cleanup_temp_user_and_role

role_list_response="$(request_json GET "/system/role/list?pageNum=1&pageSize=100" "" "${ADMIN_TOKEN}")"
role_count="$(json_required '.rows | length' "${role_list_response}")"
pass "permission.roles.list" "count=${role_count}"

temp_role_payload="$(jq -cn \
  --arg roleName "${TEMP_ROLE_NAME}" \
  --arg roleKey "${TEMP_ROLE_KEY}" \
  --arg remark "AUTOTEST role created by ${SMOKE_TAG}" \
  --argjson roleSort 91 \
  --argjson menuIds "$(printf '%s\n' "${leaf_menu_ids[@]:0:2}" | jq -R . | jq -s .)" \
  '{roleName: $roleName, roleKey: $roleKey, remark: $remark, roleSort: $roleSort, status: "0", menuIds: $menuIds}')"
request_json POST /system/role "${temp_role_payload}" "${ADMIN_TOKEN}" >/dev/null
TEMP_ROLE_ID="$(find_role_id_by_key "${TEMP_ROLE_KEY}")"
if [[ -z "${TEMP_ROLE_ID}" ]]; then
  fail "permission.roles.create" "unable to locate role ${TEMP_ROLE_KEY}"
fi
pass "permission.roles.create" "roleId=${TEMP_ROLE_ID}"

role_menu_response="$(request_json GET "/system/menu/roleMenuTreeselect/${TEMP_ROLE_ID}" "" "${ADMIN_TOKEN}")"
checked_menu_count="$(json_required '.checkedKeys | length' "${role_menu_response}")"
pass "permission.roles.menuBinding" "checkedKeys=${checked_menu_count}"

updated_role_payload="$(jq -cn \
  --argjson roleId "${TEMP_ROLE_ID}" \
  --arg roleName "${TEMP_ROLE_NAME}" \
  --arg roleKey "${TEMP_ROLE_KEY}" \
  --arg remark "AUTOTEST role updated by ${SMOKE_TAG}" \
  --argjson roleSort 92 \
  --argjson menuIds "$(printf '%s\n' "${leaf_menu_ids[@]:0:3}" | jq -R . | jq -s .)" \
  '{roleId: $roleId, roleName: $roleName, roleKey: $roleKey, remark: $remark, roleSort: $roleSort, status: "0", menuIds: $menuIds}')"
request_json PUT /system/role "${updated_role_payload}" "${ADMIN_TOKEN}" >/dev/null
role_options_response="$(request_json GET /system/role/optionselect "" "${ADMIN_TOKEN}")"
role_option_present="$(jq -er --argjson roleId "${TEMP_ROLE_ID}" '.data[] | select(.roleId == $roleId) | .roleId' <<<"${role_options_response}" 2>/dev/null | head -n1 || true)"
if [[ -z "${role_option_present}" ]]; then
  fail "permission.roles.update" "updated role missing from optionselect"
fi
pass "permission.roles.update" "roleId=${TEMP_ROLE_ID}"

user_list_response="$(request_json GET "/system/user/list?pageNum=1&pageSize=100" "" "${ADMIN_TOKEN}")"
user_count="$(json_required '.rows | length' "${user_list_response}")"
pass "permission.users.list" "count=${user_count}"

temp_user_payload="$(jq -cn \
  --arg userName "${TEMP_USER_NAME}" \
  --arg nickName "AUTOTEST Admin User" \
  --arg email "${TEMP_USER_EMAIL}" \
  --arg phonenumber "${TEMP_USER_CREATE_PHONE}" \
  --arg password "${TEMP_USER_PASSWORD}" \
  --argjson deptId "${default_dept_id}" \
  --argjson roleIds "$(jq -cn --argjson roleId "${TEMP_ROLE_ID}" '[$roleId]')" \
  '{userName: $userName, nickName: $nickName, email: $email, phonenumber: $phonenumber, password: $password, deptId: $deptId, roleIds: $roleIds, status: "0"}')"
request_json POST /system/user "${temp_user_payload}" "${ADMIN_TOKEN}" >/dev/null
TEMP_USER_ID="$(find_user_id_by_username "${TEMP_USER_NAME}")"
if [[ -z "${TEMP_USER_ID}" ]]; then
  fail "permission.users.create" "unable to locate temp user ${TEMP_USER_NAME}"
fi
pass "permission.users.create" "userId=${TEMP_USER_ID}"

user_detail_response="$(request_json GET "/system/user/${TEMP_USER_ID}" "" "${ADMIN_TOKEN}")"
temp_user_detail_name="$(json_required '.data.userName' "${user_detail_response}")"
pass "permission.users.detail" "userName=${temp_user_detail_name}"

updated_user_payload="$(jq -cn \
  --argjson userId "${TEMP_USER_ID}" \
  --arg userName "${TEMP_USER_NAME}" \
  --arg nickName "AUTOTEST Admin User Updated" \
  --arg email "${TEMP_USER_EMAIL}" \
  --arg phonenumber "${TEMP_USER_UPDATE_PHONE}" \
  --argjson deptId "${default_dept_id}" \
  --argjson roleIds "$(jq -cn --argjson roleId "${TEMP_ROLE_ID}" '[$roleId]')" \
  '{userId: $userId, userName: $userName, nickName: $nickName, email: $email, phonenumber: $phonenumber, deptId: $deptId, roleIds: $roleIds, status: "0"}')"
request_json PUT /system/user "${updated_user_payload}" "${ADMIN_TOKEN}" >/dev/null
pass "permission.users.update" "userId=${TEMP_USER_ID}"

reset_user_payload="$(jq -cn \
  --argjson userId "${TEMP_USER_ID}" \
  --arg password "${TEMP_USER_RESET_PASSWORD}" \
  '{userId: $userId, password: $password}')"
request_json PUT /system/user/resetPwd "${reset_user_payload}" "${ADMIN_TOKEN}" >/dev/null
pass "permission.users.resetPassword" "userId=${TEMP_USER_ID}"

disable_user_payload="$(jq -cn --argjson userId "${TEMP_USER_ID}" '{userId: $userId, status: "1"}')"
request_json PUT /system/user/changeStatus "${disable_user_payload}" "${ADMIN_TOKEN}" >/dev/null
enable_user_payload="$(jq -cn --argjson userId "${TEMP_USER_ID}" '{userId: $userId, status: "0"}')"
request_json PUT /system/user/changeStatus "${enable_user_payload}" "${ADMIN_TOKEN}" >/dev/null
pass "permission.users.statusToggle" "userId=${TEMP_USER_ID}"

temp_user_captcha="$(request_captcha)"
temp_user_uuid="${temp_user_captcha%%|*}"
temp_user_code="${temp_user_captcha##*|}"
temp_user_login_payload="$(jq -cn \
  --arg username "${TEMP_USER_NAME}" \
  --arg password "${TEMP_USER_RESET_PASSWORD}" \
  --arg code "${temp_user_code}" \
  --arg uuid "${temp_user_uuid}" \
  '{username: $username, password: $password, code: $code, uuid: $uuid, rememberMe: false}')"
temp_user_login_response="$(request_json POST /login "${temp_user_login_payload}")"
temp_user_token="$(json_required '.token // .data.token' "${temp_user_login_response}")"
temp_user_info_response="$(request_json GET /getInfo "" "${temp_user_token}")"
temp_user_logged_in_name="$(json_required '.user.userName // .data.user.userName' "${temp_user_info_response}")"
if [[ "${temp_user_logged_in_name}" != "${TEMP_USER_NAME}" ]]; then
  fail "permission.users.loginAfterReset" "unexpected logged-in user ${temp_user_logged_in_name}"
fi
pass "permission.users.loginAfterReset" "user=${temp_user_logged_in_name}"

request_json DELETE "/system/user/${TEMP_USER_ID}" "" "${ADMIN_TOKEN}" >/dev/null
pass "permission.users.cleanup" "deleted userId=${TEMP_USER_ID}"
TEMP_USER_ID=""

request_json DELETE "/system/role/${TEMP_ROLE_ID}" "" "${ADMIN_TOKEN}" >/dev/null
pass "permission.roles.cleanup" "deleted roleId=${TEMP_ROLE_ID}"
TEMP_ROLE_ID=""

base_data_list_response="$(request_json GET "/system/basedata/list?pageNum=1&pageSize=100&tab=city" "" "${ADMIN_TOKEN}")"
base_data_count="$(json_required '.rows | length' "${base_data_list_response}")"
pass "base-data.list" "count=${base_data_count}"

create_base_data_payload="$(jq -cn \
  --arg name "${AUTOTEST_BASE_DATA_NAME}" \
  '{name: $name, category: "job", tab: "city", sort: 88, status: "0"}')"
request_json POST /system/basedata "${create_base_data_payload}" "${ADMIN_TOKEN}" >/dev/null
base_data_after_create="$(request_json GET "/system/basedata/list?pageNum=1&pageSize=100&name=$(uri_encode "${AUTOTEST_BASE_DATA_NAME}")&tab=city" "" "${ADMIN_TOKEN}")"
base_data_id="$(json_required '.rows[0].id' "${base_data_after_create}")"
pass "base-data.create" "id=${base_data_id}"

update_base_data_payload="$(jq -cn \
  --argjson id "${base_data_id}" \
  --arg name "${AUTOTEST_BASE_DATA_NAME} Updated" \
  '{id: $id, name: $name, sort: 89, status: "0"}')"
request_json PUT /system/basedata "${update_base_data_payload}" "${ADMIN_TOKEN}" >/dev/null
pass "base-data.update" "id=${base_data_id}"

disable_base_data_payload="$(jq -cn --argjson id "${base_data_id}" '{id: $id, status: "1"}')"
request_json PUT /system/basedata/changeStatus "${disable_base_data_payload}" "${ADMIN_TOKEN}" >/dev/null
pass "base-data.disable" "id=${base_data_id}"

staff_list_response="$(request_json GET "/admin/staff/list?pageNum=1&pageSize=100" "" "${ADMIN_TOKEN}")"
staff_count="$(json_required '.rows | length' "${staff_list_response}")"
pass "staff.list" "count=${staff_count}"

staff_row="$(find_staff_row_by_name "${AUTOTEST_STAFF_NAME}")"
if [[ -z "${staff_row}" ]]; then
  create_staff_payload="$(jq -cn \
    --arg staffName "${AUTOTEST_STAFF_NAME}" \
    --arg email "${AUTOTEST_STAFF_EMAIL}" \
    --arg phone "${AUTOTEST_STAFF_PHONE}" \
    '{staffName: $staffName, email: $email, phone: $phone, staffType: "mentor", majorDirection: "金融", subDirection: "Investment Banking", region: "亚太", city: "Hong Kong", hourlyRate: 600, accountStatus: "0"}')"
  request_json POST /admin/staff "${create_staff_payload}" "${ADMIN_TOKEN}" >/dev/null
  staff_row="$(find_staff_row_by_name "${AUTOTEST_STAFF_NAME}")"
fi

if [[ -z "${staff_row}" ]]; then
  fail "staff.upsert" "unable to locate dedicated AUTOTEST staff"
fi

autotest_staff_id="$(json_required '.staffId' "${staff_row}")"
pass "staff.upsert" "staffId=${autotest_staff_id}"

staff_detail_response="$(request_json GET "/admin/staff/${autotest_staff_id}" "" "${ADMIN_TOKEN}")"
staff_detail_name="$(json_required '.data.staffName // .staffName' "${staff_detail_response}")"
pass "staff.detail" "staffName=${staff_detail_name}"

update_staff_payload="$(jq -cn \
  --argjson staffId "${autotest_staff_id}" \
  --arg staffName "${AUTOTEST_STAFF_NAME}" \
  --arg email "${AUTOTEST_STAFF_EMAIL}" \
  --arg phone "${AUTOTEST_STAFF_PHONE}" \
  '{staffId: $staffId, staffName: $staffName, email: $email, phone: $phone, staffType: "mentor", majorDirection: "金融", subDirection: "Asset Management", region: "亚太", city: "Singapore", hourlyRate: 650, accountStatus: "0"}')"
request_json PUT /admin/staff "${update_staff_payload}" "${ADMIN_TOKEN}" >/dev/null
pass "staff.update" "staffId=${autotest_staff_id}"

reset_staff_payload="$(jq -cn --argjson staffId "${autotest_staff_id}" '{staffId: $staffId}')"
reset_staff_response="$(request_json POST /admin/staff/reset-password "${reset_staff_payload}" "${ADMIN_TOKEN}")"
reset_staff_password="$(json_required '.data.defaultPassword // .defaultPassword' "${reset_staff_response}")"
if [[ "${reset_staff_password}" != "Osg@2025" ]]; then
  fail "staff.resetPassword" "unexpected default password ${reset_staff_password}"
fi
pass "staff.resetPassword" "staffId=${autotest_staff_id}"

freeze_staff_payload="$(jq -cn --argjson staffId "${autotest_staff_id}" '{staffId: $staffId, action: "freeze"}')"
restore_staff_payload="$(jq -cn --argjson staffId "${autotest_staff_id}" '{staffId: $staffId, action: "restore"}')"
request_json PUT /admin/staff/status "${freeze_staff_payload}" "${ADMIN_TOKEN}" >/dev/null
request_json PUT /admin/staff/status "${restore_staff_payload}" "${ADMIN_TOKEN}" >/dev/null
pass "staff.statusToggle" "staffId=${autotest_staff_id}"

student_list_response="$(request_json GET "/admin/student/list?pageNum=1&pageSize=100" "" "${ADMIN_TOKEN}")"
student_count="$(json_required '.rows | length' "${student_list_response}")"
pass "students.list" "count=${student_count}"

student_row="$(find_student_row_by_name "${AUTOTEST_STUDENT_NAME}")"
if [[ -z "${student_row}" ]]; then
  create_student_payload="$(jq -cn \
    --arg studentName "${AUTOTEST_STUDENT_NAME}" \
    --arg email "${AUTOTEST_STUDENT_EMAIL}" \
    --argjson leadMentorId "${autotest_staff_id}" \
    --argjson assistantId "${autotest_staff_id}" \
    '{
      studentName: $studentName,
      gender: "female",
      email: $email,
      school: "AUTOTEST University",
      major: "Finance",
      graduationYear: 2027,
      studyPlan: "normal",
      targetRegion: "Hong Kong",
      recruitmentCycle: ["2026 Autumn"],
      majorDirections: ["金融"],
      subDirection: "Investment Banking",
      leadMentorId: $leadMentorId,
      assistantId: $assistantId,
      contractAmount: 9800,
      totalHours: 24,
      startDate: "2026-04-01",
      endDate: "2026-06-30",
      remark: "AUTOTEST student bootstrap"
    }')"
  request_json POST /admin/student "${create_student_payload}" "${ADMIN_TOKEN}" >/dev/null
  student_row="$(find_student_row_by_name "${AUTOTEST_STUDENT_NAME}")"
fi

if [[ -z "${student_row}" ]]; then
  fail "students.upsert" "unable to locate dedicated AUTOTEST student"
fi

autotest_student_id="$(json_required '.studentId' "${student_row}")"
pass "students.upsert" "studentId=${autotest_student_id}"

update_student_payload="$(jq -cn \
  --argjson studentId "${autotest_student_id}" \
  --arg studentName "${AUTOTEST_STUDENT_NAME}" \
  --arg email "${AUTOTEST_STUDENT_EMAIL}" \
  '{studentId: $studentId, studentName: $studentName, email: $email, school: "AUTOTEST University Updated", major: "Finance", majorDirection: "金融", subDirection: "Private Equity", targetRegion: "Hong Kong", recruitmentCycle: ["2026 Autumn"], leadMentorId: null, assistantId: null, gender: "female"}')"
request_json PUT /admin/student "${update_student_payload}" "${ADMIN_TOKEN}" >/dev/null
pass "students.update" "studentId=${autotest_student_id}"

reset_student_payload="$(jq -cn --argjson studentId "${autotest_student_id}" '{studentId: $studentId}')"
reset_student_response="$(request_json POST /admin/student/reset-password "${reset_student_payload}" "${ADMIN_TOKEN}")"
reset_student_password="$(json_required '.data.defaultPassword // .defaultPassword' "${reset_student_response}")"
if [[ "${reset_student_password}" != "Osg@2025" ]]; then
  fail "students.resetPassword" "unexpected default password ${reset_student_password}"
fi
pass "students.resetPassword" "studentId=${autotest_student_id}"

freeze_student_payload="$(jq -cn --argjson studentId "${autotest_student_id}" '{studentId: $studentId, action: "freeze"}')"
restore_student_payload="$(jq -cn --argjson studentId "${autotest_student_id}" '{studentId: $studentId, action: "restore"}')"
request_json PUT /admin/student/status "${freeze_student_payload}" "${ADMIN_TOKEN}" >/dev/null
request_json PUT /admin/student/status "${restore_student_payload}" "${ADMIN_TOKEN}" >/dev/null
pass "students.statusToggle" "studentId=${autotest_student_id}"

contract_list_response="$(request_json GET "/admin/contract/list?pageNum=1&pageSize=100&studentName=$(uri_encode "${AUTOTEST_STUDENT_NAME}")" "" "${ADMIN_TOKEN}")"
contract_list_count="$(json_required '.rows | length' "${contract_list_response}")"
pass "contracts.list" "count=${contract_list_count}"

contract_stats_response="$(request_json GET "/admin/contract/stats?studentName=$(uri_encode "${AUTOTEST_STUDENT_NAME}")" "" "${ADMIN_TOKEN}")"
contract_total="$(json_required '.data.totalContracts' "${contract_stats_response}")"
pass "contracts.stats" "total=${contract_total}"

student_contract_detail_response="$(request_json GET "/admin/student/${autotest_student_id}/contracts" "" "${ADMIN_TOKEN}")"
student_contract_detail_count="$(json_required '.data.contracts | length' "${student_contract_detail_response}")"
pass "contracts.detail" "count=${student_contract_detail_count}"

existing_contract_signature="$(jq -er \
  --arg reason "${AUTOTEST_CONTRACT_REASON}" \
  --arg startDate "${AUTOTEST_CONTRACT_START}" \
  --arg endDate "${AUTOTEST_CONTRACT_END}" \
  '.data.contracts[] | select((.renewalReason // "") == $reason and (.startDate // "")[0:10] == $startDate and (.endDate // "")[0:10] == $endDate) | .contractId' \
  <<<"${student_contract_detail_response}" 2>/dev/null | head -n1 || true)"
if [[ -z "${existing_contract_signature}" ]]; then
  renew_contract_payload="$(jq -cn \
    --argjson studentId "${autotest_student_id}" \
    --arg contractAmount "${AUTOTEST_CONTRACT_AMOUNT}" \
    --arg totalHours "${AUTOTEST_CONTRACT_HOURS}" \
    --arg startDate "${AUTOTEST_CONTRACT_START}" \
    --arg endDate "${AUTOTEST_CONTRACT_END}" \
    --arg renewalReason "其他原因" \
    --arg otherReason "${AUTOTEST_CONTRACT_REASON}" \
    --arg remark "${AUTOTEST_CONTRACT_REASON}" \
    '{
      studentId: $studentId,
      contractAmount: ($contractAmount | tonumber),
      totalHours: ($totalHours | tonumber),
      startDate: $startDate,
      endDate: $endDate,
      renewalReason: $renewalReason,
      otherReason: $otherReason,
      remark: $remark
    }')"
  renew_contract_response="$(request_json POST /admin/contract/renew "${renew_contract_payload}" "${ADMIN_TOKEN}")"
  renewed_contract_id="$(json_required '.data.contractId // .contractId' "${renew_contract_response}")"
  pass "contracts.renew" "contractId=${renewed_contract_id}"
else
  pass "contracts.renew" "existingSignatureContractId=${existing_contract_signature}"
fi

schedule_list_response="$(request_json GET "/admin/schedule/list?pageNum=1&pageSize=200&week=current" "" "${ADMIN_TOKEN}")"
schedule_row="$(jq -c --argjson staffId "${autotest_staff_id}" '.rows[] | select(.staffId == $staffId)' <<<"${schedule_list_response}" 2>/dev/null | head -n1 || true)"
if [[ -z "${schedule_row}" ]]; then
  fail "schedule.list" "AUTOTEST mentor missing from schedule list"
fi
pass "schedule.list" "staffId=${autotest_staff_id}"

schedule_edit_payload="$(jq -cn \
  --argjson staffId "${autotest_staff_id}" \
  '{staffId: $staffId, week: "current", availableHours: 12, reason: "AUTOTEST schedule edit", notifyStaff: false, selectedSlotKeys: ["1-morning", "4-afternoon"]}')"
request_json PUT /admin/schedule/edit "${schedule_edit_payload}" "${ADMIN_TOKEN}" >/dev/null
schedule_verify_response="$(request_json GET "/admin/schedule/list?pageNum=1&pageSize=200&week=current" "" "${ADMIN_TOKEN}")"
schedule_hours="$(jq -er --argjson staffId "${autotest_staff_id}" '.rows[] | select(.staffId == $staffId) | .availableHours' <<<"${schedule_verify_response}" 2>/dev/null | head -n1 || true)"
if ! awk -v actual="${schedule_hours:-}" 'BEGIN { exit ((actual + 0) == 12 ? 0 : 1) }'; then
  fail "schedule.edit" "expected availableHours=12, got ${schedule_hours:-<empty>}"
fi
pass "schedule.edit" "staffId=${autotest_staff_id}"

schedule_export_file="${TEMP_DIR}/schedule-export.xlsx"
request_binary GET "/admin/schedule/export?week=current" "${schedule_export_file}" "${ADMIN_TOKEN}"
schedule_export_size="$(wc -c < "${schedule_export_file}")"
if (( schedule_export_size <= 0 )); then
  fail "schedule.export" "empty export file"
fi
pass "schedule.export" "bytes=${schedule_export_size}"

position_list_response="$(request_json GET "/admin/position/list?pageNum=1&pageSize=100" "" "${ADMIN_TOKEN}")"
position_count="$(json_required '.rows | length' "${position_list_response}")"
pass "positions.list" "count=${position_count}"

position_stats_response="$(request_json GET "/admin/position/stats" "" "${ADMIN_TOKEN}")"
position_total="$(json_required '.data.totalPositions' "${position_stats_response}")"
pass "positions.stats" "total=${position_total}"

position_drill_response="$(request_json GET "/admin/position/drill-down" "" "${ADMIN_TOKEN}")"
position_industry_count="$(json_required '.data | length' "${position_drill_response}")"
pass "positions.drilldown" "industries=${position_industry_count}"

ensure_student_token
pass "student.login" "user=${STUDENT_USERNAME}"

student_info_response="$(request_json GET /getInfo "" "${STUDENT_TOKEN}")"
student_display_name="$(json_optional '.user.nickName // .data.user.nickName' "${student_info_response}")"
student_display_name="${student_display_name:-${STUDENT_USERNAME}}"
pass "student.getInfo" "user=${student_display_name}"

student_position_meta_response="$(request_json GET /student/position/meta "" "${STUDENT_TOKEN}")"
manual_category="$(json_required '.data.filterOptions.categories[0].value' "${student_position_meta_response}")"
manual_location="$(json_required '.data.filterOptions.locations[0].value // .data.filterOptions.locations[0].label' "${student_position_meta_response}")"
apply_method="$(json_required '.data.filterOptions.applyMethods[0].value' "${student_position_meta_response}")"
progress_stage="$(json_required '.data.filterOptions.progressStages[0].value' "${student_position_meta_response}")"
coaching_stage="$(json_required '.data.filterOptions.coachingStages[0].value' "${student_position_meta_response}")"
mentor_count="$(json_required '.data.filterOptions.mentorCounts[0].value' "${student_position_meta_response}")"
pass "student.positions.meta" "manualCategory=${manual_category}"

manual_position_payload="$(jq -cn \
  --arg category "${manual_category}" \
  --arg title "${AUTOTEST_MANUAL_POSITION_TITLE}" \
  --arg company "${AUTOTEST_MANUAL_POSITION_COMPANY}" \
  --arg location "${manual_location}" \
  '{category: $category, title: $title, company: $company, location: $location}')"
manual_position_response="$(request_json POST /student/position/manual "${manual_position_payload}" "${STUDENT_TOKEN}")"
manual_position_id="$(json_required '.data.positionId' "${manual_position_response}")"
pass "student.positions.manual" "positionId=${manual_position_id}"

student_positions_list_response="$(request_json GET /student/position/list "" "${STUDENT_TOKEN}")"
manual_position_visible="$(jq -c \
  --arg title "${AUTOTEST_MANUAL_POSITION_TITLE}" \
  --arg company "${AUTOTEST_MANUAL_POSITION_COMPANY}" \
  '.data[] | select(.title == $title and .company == $company)' \
  <<<"${student_positions_list_response}" 2>/dev/null | head -n1 || true)"
if [[ -z "${manual_position_visible}" ]]; then
  fail "student.positions.manualVisible" "manual position missing from student position list"
fi
manual_position_source_type="$(json_required '.sourceType' "${manual_position_visible}")"
pass "student.positions.manualVisible" "sourceType=${manual_position_source_type}"

manual_public_position_list="$(request_json GET "/admin/position/list?pageNum=1&pageSize=100&keyword=$(uri_encode "${AUTOTEST_MANUAL_POSITION_TITLE}")" "" "${ADMIN_TOKEN}")"
manual_public_position_present="$(jq -er --arg title "${AUTOTEST_MANUAL_POSITION_TITLE}" '.rows[] | select(.positionName == $title) | .positionId' <<<"${manual_public_position_list}" 2>/dev/null | head -n1 || true)"
if [[ -n "${manual_public_position_present}" ]]; then
  warn "student.positions.manualReviewBridge" "manual position bypassed /admin/student-position/list and is already visible in /admin/position/list as positionId=${manual_public_position_present}"
fi

student_position_admin_row="$(poll_student_position_row "${AUTOTEST_MANUAL_POSITION_TITLE}" "${AUTOTEST_MANUAL_POSITION_COMPANY}" || true)"
if [[ -z "${student_position_admin_row}" ]]; then
  pending_student_positions_response="$(request_json GET /admin/student-position/list "" "${ADMIN_TOKEN}")"
  pending_student_position_count="$(json_required '.rows | length' "${pending_student_positions_response}")"
  pass "student-positions.list" "pendingCount=${pending_student_position_count}"
  student_position_admin_row="$(jq -c '.rows[0] // empty' <<<"${pending_student_positions_response}" 2>/dev/null | head -n1 || true)"
  if [[ -n "${student_position_admin_row}" ]]; then
    warn "student-positions.approveTarget" "using existing pending row because student /manual does not feed admin review queue"
  else
    warn "student-positions.approve" "no pending rows available; approval flow skipped"
  fi
fi

if [[ -n "${student_position_admin_row}" ]]; then
  student_position_id="$(json_required '.studentPositionId' "${student_position_admin_row}")"
  review_position_name="$(json_required '.positionName' "${student_position_admin_row}")"
  approve_position_payload="$(jq -cn \
    --argjson row "${student_position_admin_row}" \
    '{
      positionCategory: ($row.positionCategory // "summer"),
      industry: ($row.industry // "Investment Bank"),
      companyName: ($row.companyName // "AUTOTEST Company"),
      companyType: ($row.companyType // "Bulge Bracket"),
      companyWebsite: ($row.companyWebsite // "https://autotest.example.com"),
      positionName: ($row.positionName // "AUTOTEST Position"),
      department: ($row.department // "AUTOTEST Desk"),
      region: ($row.region // "ap"),
      city: ($row.city // "Hong Kong"),
      recruitmentCycle: ($row.recruitmentCycle // "2026 Summer"),
      projectYear: ($row.projectYear // "2026"),
      positionUrl: ($row.positionUrl // "https://autotest.example.com/jobs/manual")
    }')"
  approve_position_response="$(request_json PUT "/admin/student-position/${student_position_id}/approve" "${approve_position_payload}" "${ADMIN_TOKEN}")"
  approved_position_id="$(json_required '.data.positionId // .positionId' "${approve_position_response}")"
  pass "student-positions.approve" "studentPositionId=${student_position_id}, positionId=${approved_position_id}"

  approved_position_list="$(request_json GET "/admin/position/list?pageNum=1&pageSize=100&keyword=$(uri_encode "${review_position_name}")" "" "${ADMIN_TOKEN}")"
  approved_position_present="$(jq -er --arg title "${review_position_name}" '.rows[] | select(.positionName == $title) | .positionId' <<<"${approved_position_list}" 2>/dev/null | head -n1 || true)"
  if [[ -z "${approved_position_present}" ]]; then
    fail "student-positions.positionPromotion" "approved student-position row missing from admin positions"
  fi
  pass "student-positions.positionPromotion" "positionId=${approved_position_present}"
fi

target_position_json="$(jq -c '(.data | map(select(.applied == false)) | .[0]) // empty' <<<"${student_positions_list_response}")"
if [[ -z "${target_position_json}" ]]; then
  fail "student.positions.availableForApply" "no unapplied student position available"
fi

target_position_id="$(json_required '.id' "${target_position_json}")"
target_position_title="$(json_required '.title' "${target_position_json}")"
target_position_company="$(json_required '.company' "${target_position_json}")"

apply_position_payload="$(jq -cn \
  --argjson positionId "${target_position_id}" \
  --arg method "${apply_method}" \
  --arg note "${SMOKE_TAG} apply" \
  '{positionId: $positionId, applied: true, date: "2026-03-20", method: $method, note: $note}')"
request_json POST /student/position/apply "${apply_position_payload}" "${STUDENT_TOKEN}" >/dev/null
pass "student.positions.apply" "positionId=${target_position_id}"

progress_payload="$(jq -cn \
  --argjson positionId "${target_position_id}" \
  --arg stage "${progress_stage}" \
  --arg notes "${SMOKE_TAG} progress" \
  '{positionId: $positionId, stage: $stage, notes: $notes}')"
request_json POST /student/position/progress "${progress_payload}" "${STUDENT_TOKEN}" >/dev/null
pass "student.positions.progress" "stage=${progress_stage}"

coaching_payload="$(jq -cn \
  --argjson positionId "${target_position_id}" \
  --arg stage "${coaching_stage}" \
  --arg mentorCount "${mentor_count}" \
  --arg note "${AUTOTEST_JOB_COACHING_NOTE}" \
  '{positionId: $positionId, stage: $stage, mentorCount: $mentorCount, note: $note}')"
request_json POST /student/position/coaching "${coaching_payload}" "${STUDENT_TOKEN}" >/dev/null
pass "student.positions.coaching" "positionId=${target_position_id}"

student_application_list_response="$(request_json GET /student/application/list "" "${STUDENT_TOKEN}")"
student_application_row="$(jq -c \
  --arg company "${target_position_company}" \
  --arg position "${target_position_title}" \
  '.data.applications[] | select(.company == $company and .position == $position)' \
  <<<"${student_application_list_response}" 2>/dev/null | head -n1 || true)"
if [[ -z "${student_application_row}" ]]; then
  fail "student.applications.list" "applied position missing from student application list"
fi
student_application_stage="$(json_required '.stage' "${student_application_row}")"
pass "student.applications.list" "stage=${student_application_stage}"

job_overview_target_stats_response="$(request_json GET "/admin/job-overview/stats?companyName=$(uri_encode "${target_position_company}")" "" "${ADMIN_TOKEN}")"
job_overview_target_applied_count="$(json_required '.data.appliedCount' "${job_overview_target_stats_response}")"
if (( job_overview_target_applied_count > 0 )); then
  pass "job-overview.targetBridge" "applied=${job_overview_target_applied_count}"
else
  warn "job-overview.targetBridge" "student apply/coaching did not create an admin job-overview row for company=${target_position_company}"
fi

job_overview_stats_response="$(request_json GET /admin/job-overview/stats "" "${ADMIN_TOKEN}")"
job_overview_applied_count="$(json_required '.data.appliedCount' "${job_overview_stats_response}")"
pass "job-overview.stats" "applied=${job_overview_applied_count}"

job_overview_funnel_response="$(request_json GET /admin/job-overview/funnel "" "${ADMIN_TOKEN}")"
job_overview_funnel_count="$(json_required '.data | length' "${job_overview_funnel_response}")"
pass "job-overview.funnel" "nodes=${job_overview_funnel_count}"

job_overview_unassigned_row="$(poll_job_overview_unassigned_row "${target_position_company}" "${target_position_title}" || true)"
if [[ -z "${job_overview_unassigned_row}" ]]; then
  job_overview_unassigned_response="$(request_json GET /admin/job-overview/unassigned "" "${ADMIN_TOKEN}")"
  job_overview_unassigned_count="$(json_required '.rows | length' "${job_overview_unassigned_response}")"
  pass "job-overview.unassigned.list" "count=${job_overview_unassigned_count}"
  job_overview_unassigned_row="$(jq -c '.rows[0] // empty' <<<"${job_overview_unassigned_response}" 2>/dev/null | head -n1 || true)"
  if [[ -n "${job_overview_unassigned_row}" ]]; then
    warn "job-overview.unassignedTarget" "using existing unassigned row because student apply/coaching does not feed admin job overview"
  else
    warn "job-overview.assignMentor" "no unassigned rows available; mentor assignment skipped"
  fi
fi

if [[ -n "${job_overview_unassigned_row}" ]]; then
  job_overview_application_id="$(json_required '.applicationId' "${job_overview_unassigned_row}")"
  job_overview_company_name="$(json_required '.companyName' "${job_overview_unassigned_row}")"
  pass "job-overview.unassigned" "applicationId=${job_overview_application_id}"

  assign_mentor_payload="$(jq -cn \
    --argjson applicationId "${job_overview_application_id}" \
    --argjson mentorId "${autotest_staff_id}" \
    --arg mentorName "${AUTOTEST_STAFF_NAME}" \
    --arg assignNote "${SMOKE_TAG} assign mentor" \
    '{applicationId: $applicationId, mentorIds: [$mentorId], mentorNames: [$mentorName], assignNote: $assignNote}')"
  request_json POST /admin/job-overview/assign-mentor "${assign_mentor_payload}" "${ADMIN_TOKEN}" >/dev/null
  job_overview_all_response="$(request_json GET "/admin/job-overview/list?companyName=$(uri_encode "${job_overview_company_name}")" "" "${ADMIN_TOKEN}")"
  assigned_mentor_name="$(jq -er --argjson applicationId "${job_overview_application_id}" '.rows[] | select(.applicationId == $applicationId) | .mentorName' <<<"${job_overview_all_response}" 2>/dev/null | head -n1 || true)"
  if [[ "${assigned_mentor_name}" != "${AUTOTEST_STAFF_NAME}" ]]; then
    fail "job-overview.assignMentor" "expected mentor=${AUTOTEST_STAFF_NAME}, got ${assigned_mentor_name:-<empty>}"
  fi
  pass "job-overview.assignMentor" "applicationId=${job_overview_application_id}"
fi

mock_meta_response="$(request_json GET /student/mock-practice/meta "" "${STUDENT_TOKEN}")"
mock_type="$(json_required '.data.practiceCards[0].id' "${mock_meta_response}")"
mock_mentor_count="$(json_required '.data.practiceForm.mentorCountOptions[0].value' "${mock_meta_response}")"
pass "student.mock.meta" "type=${mock_type}"

mock_request_payload="$(jq -cn \
  --arg type "${mock_type}" \
  --arg reason "${AUTOTEST_MOCK_REMARK}" \
  --arg mentorCount "${mock_mentor_count}" \
  --arg preferredMentor "${AUTOTEST_STAFF_NAME}" \
  --arg excludedMentor "" \
  --arg remark "${AUTOTEST_MOCK_REMARK}" \
  '{type: $type, reason: $reason, mentorCount: $mentorCount, preferredMentor: $preferredMentor, excludedMentor: $excludedMentor, remark: $remark}')"
mock_request_response="$(request_json POST /student/mock-practice/practice-request "${mock_request_payload}" "${STUDENT_TOKEN}")"
mock_practice_id="$(json_required '.data.requestId' "${mock_request_response}")"
pass "student.mock.createPracticeRequest" "practiceId=${mock_practice_id}"

student_mock_overview_response="$(request_json GET /student/mock-practice/overview "" "${STUDENT_TOKEN}")"
student_mock_record_id="$(printf 'MP%03d' "${mock_practice_id}")"
student_mock_record_present="$(jq -er --arg practiceRecordId "${student_mock_record_id}" \
  '(.data.practiceRecords[]? | select((.id // "") == $practiceRecordId)) // empty' \
  <<<"${student_mock_overview_response}" 2>/dev/null | head -n1 || true)"
if [[ -z "${student_mock_record_present}" ]]; then
  warn "student.mock.overview" "new practice request not yet reflected in student overview id=${student_mock_record_id}"
else
  pass "student.mock.overview" "request visible in student overview"
fi

mock_practice_target_stats_response="$(request_json GET "/admin/mock-practice/stats?keyword=$(uri_encode "${STUDENT_USERNAME}")" "" "${ADMIN_TOKEN}")"
mock_target_pending_count="$(json_required '.data.pendingCount' "${mock_practice_target_stats_response}")"
if (( mock_target_pending_count > 0 )); then
  pass "mock-practice.targetBridge" "pending=${mock_target_pending_count}"
else
  warn "mock-practice.targetBridge" "student mock practice request did not create an admin pending row for keyword=${STUDENT_USERNAME}"
fi

mock_practice_stats_response="$(request_json GET /admin/mock-practice/stats "" "${ADMIN_TOKEN}")"
mock_pending_count="$(json_required '.data.pendingCount' "${mock_practice_stats_response}")"
pass "mock-practice.stats" "pending=${mock_pending_count}"

mock_practice_row="$(poll_mock_practice_row "${mock_practice_id}" || true)"
if [[ -z "${mock_practice_row}" ]]; then
  mock_pending_response="$(request_json GET "/admin/mock-practice/list?tab=pending" "" "${ADMIN_TOKEN}")"
  mock_pending_list_count="$(json_required '.rows | length' "${mock_pending_response}")"
  pass "mock-practice.list" "pendingCount=${mock_pending_list_count}"
  mock_practice_row="$(jq -c '.rows[0] // empty' <<<"${mock_pending_response}" 2>/dev/null | head -n1 || true)"
  if [[ -n "${mock_practice_row}" ]]; then
    warn "mock-practice.assignTarget" "using existing pending row because student practice request does not feed admin mock-practice queue"
  else
    warn "mock-practice.assign" "no pending rows available; mentor assignment skipped"
  fi
fi

if [[ -n "${mock_practice_row}" ]]; then
  mock_row_id="$(json_required '.practiceId' "${mock_practice_row}")"
  mock_assign_payload="$(jq -cn \
    --argjson practiceId "${mock_row_id}" \
    --argjson mentorId "${autotest_staff_id}" \
    --arg mentorName "${AUTOTEST_STAFF_NAME}" \
    --arg mentorBackground "AUTOTEST Finance Mentor" \
    --arg scheduledAt "2030-01-02T10:00" \
    --arg note "${AUTOTEST_MOCK_REMARK}" \
    '{practiceId: $practiceId, mentorIds: [$mentorId], mentorNames: [$mentorName], mentorBackgrounds: [$mentorBackground], scheduledAt: $scheduledAt, note: $note}')"
  request_json POST /admin/mock-practice/assign "${mock_assign_payload}" "${ADMIN_TOKEN}" >/dev/null
  mock_all_response="$(request_json GET "/admin/mock-practice/list?tab=all" "" "${ADMIN_TOKEN}")"
  mock_assigned_name="$(jq -er --argjson practiceId "${mock_row_id}" '.rows[] | select(.practiceId == $practiceId) | .mentorNames' <<<"${mock_all_response}" 2>/dev/null | head -n1 || true)"
  if [[ "${mock_assigned_name}" != *"${AUTOTEST_STAFF_NAME}"* ]]; then
    fail "mock-practice.assign" "assigned mentor missing from response"
  fi
  pass "mock-practice.assign" "practiceId=${mock_row_id}"
fi

class_record_list_response="$(request_json GET "/admin/class-record/list" "" "${ADMIN_TOKEN}")"
class_record_count="$(json_required '.rows | length' "${class_record_list_response}")"
pass "class-records.list" "count=${class_record_count}"

class_record_stats_response="$(request_json GET "/admin/class-record/stats" "" "${ADMIN_TOKEN}")"
class_record_total="$(json_required '.data.totalCount' "${class_record_stats_response}")"
pass "class-records.stats" "total=${class_record_total}"

profile_update_payload="$(jq -cn \
  --arg nickName "管理员 Smoke" \
  --arg email "admin+${SMOKE_TAG}@osg.local" \
  --arg phonenumber "" \
  --arg sex "0" \
  '{nickName: $nickName, email: $email, phonenumber: $phonenumber, sex: $sex}')"
request_json PUT /system/user/profile "${profile_update_payload}" "${ADMIN_TOKEN}" >/dev/null
PROFILE_DIRTY=1
updated_profile_response="$(request_json GET /system/user/profile "" "${ADMIN_TOKEN}")"
updated_profile_email="$(json_required '.data.email' "${updated_profile_response}")"
if [[ "${updated_profile_email}" != "admin+${SMOKE_TAG}@osg.local" ]]; then
  fail "profile.update" "unexpected email ${updated_profile_email}"
fi
pass "profile.update" "email=${updated_profile_email}"

restore_profile_if_needed
restored_profile_response="$(request_json GET /system/user/profile "" "${ADMIN_TOKEN}")"
restored_profile_email="$(json_required '.data.email // ""' "${restored_profile_response}")"
original_profile_email="$(json_required '.data.email // ""' "${PROFILE_BEFORE_JSON}")"
if [[ "${restored_profile_email}" != "${original_profile_email}" ]]; then
  fail "profile.restore" "expected email=${original_profile_email}, got ${restored_profile_email}"
fi
pass "profile.restore" "email=${restored_profile_email}"

change_password_payload="$(jq -cn \
  --arg oldPassword "${CURRENT_ADMIN_PASSWORD}" \
  --arg newPassword "${TEMP_ADMIN_PASSWORD}" \
  '{oldPassword: $oldPassword, newPassword: $newPassword}')"
request_json PUT /system/user/profile/updatePwd "${change_password_payload}" "${ADMIN_TOKEN}" >/dev/null
CURRENT_ADMIN_PASSWORD="${TEMP_ADMIN_PASSWORD}"
ADMIN_TOKEN=""
login_admin_with_password "${CURRENT_ADMIN_PASSWORD}"
pass "profile.changePassword.loginTemp" "password updated and login succeeded"

restore_password_payload="$(jq -cn \
  --arg oldPassword "${CURRENT_ADMIN_PASSWORD}" \
  --arg newPassword "${ORIGINAL_ADMIN_PASSWORD}" \
  '{oldPassword: $oldPassword, newPassword: $newPassword}')"
request_json PUT /system/user/profile/updatePwd "${restore_password_payload}" "${ADMIN_TOKEN}" >/dev/null
CURRENT_ADMIN_PASSWORD="${ORIGINAL_ADMIN_PASSWORD}"
ADMIN_TOKEN=""
login_admin_with_password "${CURRENT_ADMIN_PASSWORD}"
pass "profile.changePassword.restore" "original password restored"

final_logs_response="$(request_json GET /admin/log/list "" "${ADMIN_TOKEN}")"
final_log_count="$(json_required '.rows | length' "${final_logs_response}")"
if (( final_log_count < initial_log_count )); then
  fail "logs.final" "final log count ${final_log_count} < initial ${initial_log_count}"
fi
pass "logs.final" "count=${final_log_count}"

log_export_response="$(request_json GET /admin/log/export "" "${ADMIN_TOKEN}")"
log_export_count="$(json_required '.exportCount // .data.exportCount' "${log_export_response}")"
pass "logs.export" "exportCount=${log_export_count}"

note "admin api smoke completed successfully"
