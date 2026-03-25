#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REQUEST_TIMEOUT_SECONDS="${REQUEST_TIMEOUT_SECONDS:-45}"
ADMIN_API_SMOKE_LIB=1
# shellcheck disable=SC1091
source "${ROOT_DIR}/bin/admin-api-smoke.sh"

LEAD_TOKEN=""
MENTOR_TOKEN=""
ASSISTANT_TOKEN=""
STUDENT_CHAIN_TOKEN=""

CLEAN_CHAIN_BEFORE="${CLEAN_CHAIN_BEFORE:-1}"
CLEAN_CHAIN_AFTER="${CLEAN_CHAIN_AFTER:-0}"

CHAIN_ID="${CHAIN_ID:-CHAIN_$(date +%Y%m%d%H%M%S)}"
CHAIN_PASSWORD="${CHAIN_PASSWORD:-Osg@2026}"
CHAIN_DATE="${CHAIN_DATE:-$(date +%F)}"
CHAIN_SCHEDULED_AT="${CHAIN_SCHEDULED_AT:-2030-01-02T10:00:00}"
CHAIN_CLASS_AT="${CHAIN_CLASS_AT:-2030-01-03T14:00:00+08:00}"
CHAIN_MENTOR_CLASS_AT="${CHAIN_MENTOR_CLASS_AT:-2030-01-04T16:00:00+08:00}"
CHAIN_MAILBOX="${CHAIN_MAILBOX:-${E2E_RESET_EMAIL:-}}"

CHAIN_LEAD_NAME="${CHAIN_LEAD_NAME:-${CHAIN_ID} Lead}"
CHAIN_MENTOR_NAME="${CHAIN_MENTOR_NAME:-${CHAIN_ID} Mentor}"
CHAIN_ASSISTANT_NAME="${CHAIN_ASSISTANT_NAME:-${CHAIN_ID} Assistant}"
CHAIN_STUDENT_NAME="${CHAIN_STUDENT_NAME:-${CHAIN_ID} Student}"
CHAIN_RUNTIME_NICK_TAG="${CHAIN_RUNTIME_NICK_TAG:-$(date +%m%d%H%M)}"

build_chain_alias_email() {
  local prefix="$1"
  local tag="${prefix}$(date +%m%d%H%M)"
  if [[ -n "${CHAIN_MAILBOX}" && "${CHAIN_MAILBOX}" == *"@"* ]]; then
    local mailbox_local="${CHAIN_MAILBOX%@*}"
    local mailbox_domain="${CHAIN_MAILBOX#*@}"
    local reserved=$((1 + ${#tag} + 1 + ${#mailbox_domain}))
    local max_local=$((30 - reserved))
    if (( max_local > 0 )); then
      local trimmed_local="${mailbox_local:0:max_local}"
      printf '%s' "${trimmed_local}+${tag}@${mailbox_domain}"
      return
    fi
  fi
  printf '%s' "${prefix}$(date +%m%d%H%M%S)@o.sg"
}

CHAIN_LEAD_EMAIL="${CHAIN_LEAD_EMAIL:-$(build_chain_alias_email l)}"
CHAIN_MENTOR_EMAIL="${CHAIN_MENTOR_EMAIL:-$(build_chain_alias_email m)}"
CHAIN_ASSISTANT_EMAIL="${CHAIN_ASSISTANT_EMAIL:-$(build_chain_alias_email a)}"
CHAIN_STUDENT_EMAIL="${CHAIN_STUDENT_EMAIL:-$(build_chain_alias_email s)}"

CHAIN_POSITION_NAME="${CHAIN_POSITION_NAME:-${CHAIN_ID} Analyst}"
CHAIN_COMPANY_NAME="${CHAIN_COMPANY_NAME:-${CHAIN_ID} Capital}"
CHAIN_MANUAL_APPROVE_POSITION_NAME="${CHAIN_MANUAL_APPROVE_POSITION_NAME:-${CHAIN_ID} Manual Approve}"
CHAIN_MANUAL_APPROVE_COMPANY_NAME="${CHAIN_MANUAL_APPROVE_COMPANY_NAME:-${CHAIN_ID} ManualCoA}"
CHAIN_MANUAL_REJECT_POSITION_NAME="${CHAIN_MANUAL_REJECT_POSITION_NAME:-${CHAIN_ID} Manual Reject}"
CHAIN_MANUAL_REJECT_COMPANY_NAME="${CHAIN_MANUAL_REJECT_COMPANY_NAME:-${CHAIN_ID} ManualCoR}"

CHAIN_SHORT_TAG="$(date +%m%d%H)"
CHAIN_STUDENT_PHONE="${CHAIN_STUDENT_PHONE:-1380013${CHAIN_SHORT_TAG:0:4}}"
CHAIN_LEAD_PHONE="${CHAIN_LEAD_PHONE:-1380013${CHAIN_SHORT_TAG:0:4}}"
CHAIN_MENTOR_PHONE="${CHAIN_MENTOR_PHONE:-1380013${CHAIN_SHORT_TAG:0:4}}"
CHAIN_ASSISTANT_PHONE="${CHAIN_ASSISTANT_PHONE:-1380013${CHAIN_SHORT_TAG:0:4}}"
CHAIN_STUDENT_WECHAT="${CHAIN_STUDENT_WECHAT:-wx${CHAIN_SHORT_TAG}s}"
CHAIN_LEAD_WECHAT="${CHAIN_LEAD_WECHAT:-wx${CHAIN_SHORT_TAG}l}"
CHAIN_MENTOR_REMARK="${CHAIN_MENTOR_REMARK:-wx${CHAIN_SHORT_TAG}m}"
CHAIN_ASSISTANT_REMARK="${CHAIN_ASSISTANT_REMARK:-wx${CHAIN_SHORT_TAG}a}"

CHAIN_LEAD_USER_ID=""
CHAIN_MENTOR_USER_ID=""
CHAIN_ASSISTANT_USER_ID=""
CHAIN_STUDENT_USER_ID=""
CHAIN_STUDENT_ID=""
CHAIN_APPLICATION_ID=""
CHAIN_PRACTICE_ID=""
CHAIN_RECORD_ID=""
CHAIN_MENTOR_RECORD_ID=""
CHAIN_POSITION_ID=""
CHAIN_APPROVED_POSITION_ID=""
CHAIN_ADMIN_APPLICATION_ID=""
CHAIN_ADMIN_PRACTICE_ID=""
CHAIN_MENTOR_STAFF_ID=""
CHAIN_LEAD_STAFF_ID=""
CHAIN_ASSISTANT_STAFF_ID=""

CURRENT_WEEK_START=""
LAST_WEEK_START=""

SHARED_RESET_RATE_LIMIT_KEY="pwd_reset_code:127.0.0.1-com.ruoyi.web.controller.system.SysPasswordController-sendCode"
MENTOR_RESET_RATE_LIMIT_KEY="rate_limit:127.0.0.1-com.ruoyi.web.controller.osg.OsgForgotPasswordController-sendCode"

cleanup_local_artifacts() {
  rm -rf "${TEMP_DIR:-}"
}

trap cleanup_local_artifacts EXIT

week_start_for_offset() {
  python3 - "$1" <<'PY'
import datetime
import sys

offset = int(sys.argv[1])
today = datetime.date.today()
monday = today - datetime.timedelta(days=today.weekday()) + datetime.timedelta(weeks=offset)
print(monday.isoformat())
PY
}

CURRENT_WEEK_START="$(week_start_for_offset 0)"
LAST_WEEK_START="$(week_start_for_offset -1)"

login_portal() {
  local path="$1"
  local username="$2"
  local password="$3"
  local payload
  payload="$(jq -cn --arg username "${username}" --arg password "${password}" '{username: $username, password: $password}')"
  request_json POST "${path}" "${payload}"
}

login_student_with_password() {
  local password="$1"
  local payload
  payload="$(jq -cn --arg username "${CHAIN_STUDENT_EMAIL}" --arg password "${password}" '{username: $username, password: $password}')"
  request_json POST /student/login "${payload}"
}

portal_get_info() {
  local path="$1"
  local token="$2"
  request_json GET "${path}" "" "${token}"
}

student_get_info() {
  local token="$1"
  request_json GET /getInfo "" "${token}"
}

short_temp_password() {
  local prefix="$1"
  printf '%s' "${prefix}Temp26A1"
}

cleanup_chain_data() {
  local detail
  detail="$(python3 "${ROOT_DIR}/bin/osg_runtime_cleanup.py" --chain-id "${CHAIN_ID}" --env-file "${ROOT_DIR}/deploy/.env.dev" --apply)"
  pass "chain.cleanup" "chain=${CHAIN_ID}"
  printf '%s\n' "${detail}" >/dev/null
}

read_reset_code() {
  local email="$1"
  local raw
  raw="$(redis_get "pwd_reset_code:${email}")"
  normalize_redis_value "${raw}"
}

clear_reset_rate_limit() {
  local key="$1"
  redis_del "${key}"
}

relogin_lead() {
  local response
  local info
  response="$(login_portal /lead-mentor/login "${CHAIN_LEAD_EMAIL}" "$1")"
  LEAD_TOKEN="$(json_required '.token // .data.token' "${response}")"
  info="$(portal_get_info /lead-mentor/getInfo "${LEAD_TOKEN}")"
  CHAIN_LEAD_USER_ID="$(json_required '.user.userId // .data.user.userId' "${info}")"
}

relogin_mentor() {
  local response
  local info
  response="$(login_portal /mentor/login "${CHAIN_MENTOR_EMAIL}" "$1")"
  MENTOR_TOKEN="$(json_required '.token // .data.token' "${response}")"
  info="$(portal_get_info /mentor/getInfo "${MENTOR_TOKEN}")"
  CHAIN_MENTOR_USER_ID="$(json_required '.user.userId // .data.user.userId' "${info}")"
}

relogin_assistant() {
  local response
  local info
  response="$(login_portal /assistant/login "${CHAIN_ASSISTANT_EMAIL}" "$1")"
  ASSISTANT_TOKEN="$(json_required '.token // .data.token' "${response}")"
  info="$(portal_get_info /assistant/getInfo "${ASSISTANT_TOKEN}")"
  CHAIN_ASSISTANT_USER_ID="$(json_required '.user.userId // .data.user.userId' "${info}")"
}

relogin_student() {
  local response
  local info
  response="$(login_student_with_password "$1")"
  STUDENT_CHAIN_TOKEN="$(json_required '.token // .data.token' "${response}")"
  info="$(student_get_info "${STUDENT_CHAIN_TOKEN}")"
  CHAIN_STUDENT_USER_ID="$(json_required '.user.userId // .data.user.userId' "${info}")"
}

shared_password_roundtrip() {
  local step="$1"
  local email="$2"
  local temp_password="$3"
  local original_password="$4"
  local relogin_fn="$5"

  clear_reset_rate_limit "${SHARED_RESET_RATE_LIMIT_KEY}"
  request_json POST /system/password/sendCode "$(jq -cn --arg email "${email}" '{email: $email}')" >/dev/null
  local code
  code="$(read_reset_code "${email}")"
  if [[ -z "${code}" ]]; then
    fail "${step}" "missing redis code for ${email}"
  fi
  local verify_body
  verify_body="$(request_json POST /system/password/verify "$(jq -cn --arg email "${email}" --arg code "${code}" '{email: $email, code: $code}')")"
  local reset_token
  reset_token="$(json_required '.data.resetToken // .resetToken' "${verify_body}")"
  request_json POST /system/password/reset "$(jq -cn --arg email "${email}" --arg password "${temp_password}" --arg resetToken "${reset_token}" '{email: $email, password: $password, resetToken: $resetToken}')" >/dev/null
  "${relogin_fn}" "${temp_password}"

  clear_reset_rate_limit "${SHARED_RESET_RATE_LIMIT_KEY}"
  request_json POST /system/password/sendCode "$(jq -cn --arg email "${email}" '{email: $email}')" >/dev/null
  code="$(read_reset_code "${email}")"
  if [[ -z "${code}" ]]; then
    fail "${step}" "missing redis restore code for ${email}"
  fi
  verify_body="$(request_json POST /system/password/verify "$(jq -cn --arg email "${email}" --arg code "${code}" '{email: $email, code: $code}')")"
  reset_token="$(json_required '.data.resetToken // .resetToken' "${verify_body}")"
  request_json POST /system/password/reset "$(jq -cn --arg email "${email}" --arg password "${original_password}" --arg resetToken "${reset_token}" '{email: $email, password: $password, resetToken: $resetToken}')" >/dev/null
  "${relogin_fn}" "${original_password}"

  pass "${step}" "email=${email}"
}

mentor_password_roundtrip() {
  local step="$1"
  local email="$2"
  local temp_password="$3"
  local original_password="$4"

  clear_reset_rate_limit "${MENTOR_RESET_RATE_LIMIT_KEY}"
  request_json POST /mentor/forgot-password/send-code "$(jq -cn --arg email "${email}" '{email: $email}')" >/dev/null
  local code
  code="$(read_reset_code "${email}")"
  if [[ -z "${code}" ]]; then
    fail "${step}" "missing mentor redis code for ${email}"
  fi
  local verify_body
  verify_body="$(request_json POST /mentor/forgot-password/verify-code "$(jq -cn --arg email "${email}" --arg code "${code}" '{email: $email, code: $code}')")"
  local reset_token
  reset_token="$(json_required '.data.resetToken // .resetToken' "${verify_body}")"
  request_json POST /mentor/forgot-password/reset "$(jq -cn --arg email "${email}" --arg password "${temp_password}" --arg resetToken "${reset_token}" '{email: $email, password: $password, resetToken: $resetToken}')" >/dev/null
  relogin_mentor "${temp_password}"

  clear_reset_rate_limit "${MENTOR_RESET_RATE_LIMIT_KEY}"
  request_json POST /mentor/forgot-password/send-code "$(jq -cn --arg email "${email}" '{email: $email}')" >/dev/null
  code="$(read_reset_code "${email}")"
  if [[ -z "${code}" ]]; then
    fail "${step}" "missing mentor restore code for ${email}"
  fi
  verify_body="$(request_json POST /mentor/forgot-password/verify-code "$(jq -cn --arg email "${email}" --arg code "${code}" '{email: $email, code: $code}')")"
  reset_token="$(json_required '.data.resetToken // .resetToken' "${verify_body}")"
  request_json POST /mentor/forgot-password/reset "$(jq -cn --arg email "${email}" --arg password "${original_password}" --arg resetToken "${reset_token}" '{email: $email, password: $password, resetToken: $resetToken}')" >/dev/null
  relogin_mentor "${original_password}"

  pass "${step}" "email=${email}"
}

admin_password_roundtrip() {
  local email="$1"
  local temp_password
  temp_password="$(short_temp_password A)"

  clear_reset_rate_limit "${SHARED_RESET_RATE_LIMIT_KEY}"
  request_json POST /system/password/sendCode "$(jq -cn --arg email "${email}" '{email: $email}')" >/dev/null
  local code
  code="$(read_reset_code "${email}")"
  if [[ -z "${code}" ]]; then
    fail "admin.password.reset" "missing redis code for ${email}"
  fi
  local verify_body
  verify_body="$(request_json POST /system/password/verify "$(jq -cn --arg email "${email}" --arg code "${code}" '{email: $email, code: $code}')")"
  local reset_token
  reset_token="$(json_required '.data.resetToken // .resetToken' "${verify_body}")"
  request_json POST /system/password/reset "$(jq -cn --arg email "${email}" --arg password "${temp_password}" --arg resetToken "${reset_token}" '{email: $email, password: $password, resetToken: $resetToken}')" >/dev/null
  CURRENT_ADMIN_PASSWORD="${temp_password}"
  ADMIN_TOKEN=""
  login_admin_with_password "${CURRENT_ADMIN_PASSWORD}"

  clear_reset_rate_limit "${SHARED_RESET_RATE_LIMIT_KEY}"
  request_json POST /system/password/sendCode "$(jq -cn --arg email "${email}" '{email: $email}')" >/dev/null
  code="$(read_reset_code "${email}")"
  if [[ -z "${code}" ]]; then
    fail "admin.password.reset" "missing redis restore code for ${email}"
  fi
  verify_body="$(request_json POST /system/password/verify "$(jq -cn --arg email "${email}" --arg code "${code}" '{email: $email, code: $code}')")"
  reset_token="$(json_required '.data.resetToken // .resetToken' "${verify_body}")"
  request_json POST /system/password/reset "$(jq -cn --arg email "${email}" --arg password "${ORIGINAL_ADMIN_PASSWORD}" --arg resetToken "${reset_token}" '{email: $email, password: $password, resetToken: $resetToken}')" >/dev/null
  CURRENT_ADMIN_PASSWORD="${ORIGINAL_ADMIN_PASSWORD}"
  ADMIN_TOKEN=""
  login_admin_with_password "${CURRENT_ADMIN_PASSWORD}"

  pass "admin.password.reset" "email=${email}"
}

find_staff_row_by_email() {
  local email="$1"
  local staff_response
  staff_response="$(request_json GET "/admin/staff/list?pageNum=1&pageSize=100&email=$(uri_encode "${email}")" "" "${ADMIN_TOKEN}")"
  jq -c --arg email "${email}" '.rows[] | select(.email == $email)' <<<"${staff_response}" 2>/dev/null | head -n1
}

find_student_row_by_email() {
  local email="$1"
  local student_response
  student_response="$(request_json GET "/admin/student/list?pageNum=1&pageSize=100&email=$(uri_encode "${email}")" "" "${ADMIN_TOKEN}")"
  jq -c --arg email "${email}" '.rows[] | select(.email == $email)' <<<"${student_response}" 2>/dev/null | head -n1
}

upsert_staff() {
  local name="$1"
  local email="$2"
  local staff_type="$3"
  local city="$4"
  local rate="$5"
  local row

  row="$(find_staff_row_by_email "${email}" || true)"
  if [[ -z "${row}" ]]; then
    local payload
    payload="$(jq -cn \
      --arg staffName "${name}" \
      --arg email "${email}" \
      --arg phone "139$(date +%H%M%S)" \
      --arg staffType "${staff_type}" \
      --arg city "${city}" \
      --arg remark "${CHAIN_ID} runtime closure seed" \
      --argjson hourlyRate "${rate}" \
      '{
        staffName: $staffName,
        email: $email,
        phone: $phone,
        staffType: $staffType,
        majorDirection: "Finance",
        subDirection: "Advisory",
        region: "APAC",
        city: $city,
        hourlyRate: $hourlyRate,
        accountStatus: "0",
        remark: $remark
      }')"
    request_json POST /admin/staff "${payload}" "${ADMIN_TOKEN}" >/dev/null
    row="$(find_staff_row_by_email "${email}")"
  fi

  local staff_id
  staff_id="$(json_required '.staffId' "${row}")"
  local reset_payload
  reset_payload="$(jq -cn --argjson staffId "${staff_id}" '{staffId: $staffId}')"
  request_json POST /admin/staff/reset-password "${reset_payload}" "${ADMIN_TOKEN}" >/dev/null
  printf '%s' "${staff_id}"
}

upsert_student() {
  local lead_user_id="$1"
  local assistant_user_id="$2"
  local row

  row="$(find_student_row_by_email "${CHAIN_STUDENT_EMAIL}" || true)"
  if [[ -z "${row}" ]]; then
    local payload
    payload="$(jq -cn \
      --arg studentName "${CHAIN_STUDENT_NAME}" \
      --arg email "${CHAIN_STUDENT_EMAIL}" \
      --arg remark "${CHAIN_ID} runtime closure seed" \
      --argjson leadMentorId "${lead_user_id}" \
      --argjson assistantId "${assistant_user_id}" \
      '{
        studentName: $studentName,
        gender: "female",
        email: $email,
        school: "Runtime University",
        major: "Finance",
        graduationYear: 2027,
        targetRegion: "Hong Kong",
        recruitmentCycle: ["2026 Autumn"],
        majorDirections: ["Finance"],
        subDirection: "Investment Banking",
        leadMentorId: $leadMentorId,
        assistantId: $assistantId,
        contractAmount: 9800,
        totalHours: 24,
        startDate: "2030-01-01",
        endDate: "2030-03-31",
        remark: $remark
      }')"
    request_json POST /admin/student "${payload}" "${ADMIN_TOKEN}" >/dev/null
    row="$(find_student_row_by_email "${CHAIN_STUDENT_EMAIL}")"
  else
    local student_id
    student_id="$(json_required '.studentId' "${row}")"
    local payload
    payload="$(jq -cn \
      --argjson studentId "${student_id}" \
      --arg studentName "${CHAIN_STUDENT_NAME}" \
      --arg email "${CHAIN_STUDENT_EMAIL}" \
      --argjson leadMentorId "${lead_user_id}" \
      --argjson assistantId "${assistant_user_id}" \
      '{
        studentId: $studentId,
        studentName: $studentName,
        email: $email,
        school: "Runtime University",
        major: "Finance",
        majorDirection: "Finance",
        subDirection: "Investment Banking",
        targetRegion: "Hong Kong",
        recruitmentCycle: ["2026 Autumn"],
        leadMentorId: $leadMentorId,
        assistantId: $assistantId,
        gender: "female",
        accountStatus: "0"
      }')"
    request_json PUT /admin/student "${payload}" "${ADMIN_TOKEN}" >/dev/null
    row="$(find_student_row_by_email "${CHAIN_STUDENT_EMAIL}")"
  fi

  local student_id
  student_id="$(json_required '.studentId' "${row}")"
  local reset_payload
  reset_payload="$(jq -cn --argjson studentId "${student_id}" '{studentId: $studentId}')"
  request_json POST /admin/student/reset-password "${reset_payload}" "${ADMIN_TOKEN}" >/dev/null
  printf '%s' "${student_id}"
}

ensure_public_position() {
  local existing
  existing="$(request_json GET "/admin/position/list?pageNum=1&pageSize=100&keyword=$(uri_encode "${CHAIN_POSITION_NAME}")" "" "${ADMIN_TOKEN}")"
  local existing_id
  existing_id="$(jq -er --arg title "${CHAIN_POSITION_NAME}" '.rows[] | select(.positionName == $title) | .positionId' <<<"${existing}" 2>/dev/null | head -n1 || true)"
  if [[ -n "${existing_id}" ]]; then
    printf '%s' "${existing_id}"
    return
  fi

  local payload
  local created
  local created_id
  payload="$(jq -cn \
    --arg companyName "${CHAIN_COMPANY_NAME}" \
    --arg positionName "${CHAIN_POSITION_NAME}" \
    '{
      positionCategory: "summer",
      industry: "Investment Bank",
      companyName: $companyName,
      companyType: "Bulge Bracket",
      companyWebsite: "https://example.com",
      positionName: $positionName,
      department: "IBD",
      region: "ap",
      city: "Hong Kong",
      recruitmentCycle: "2026 Autumn",
      projectYear: "2026",
      displayStatus: "visible",
      positionUrl: "https://example.com/jobs/runtime"
    }')"
  created="$(request_json POST /admin/position "${payload}" "${ADMIN_TOKEN}")"
  created_id="$(jq -er '.data.positionId // empty' <<<"${created}" 2>/dev/null || true)"
  if [[ -n "${created_id}" ]]; then
    printf '%s' "${created_id}"
    return
  fi
  existing="$(request_json GET "/admin/position/list?pageNum=1&pageSize=100&keyword=$(uri_encode "${CHAIN_POSITION_NAME}")" "" "${ADMIN_TOKEN}")"
  json_required '.rows[0].positionId' "${existing}"
}

poll_student_visible_position() {
  local position_id="$1"
  local company="$2"
  local title="$3"
  local response=""
  local row=""

  for _ in {1..10}; do
    response="$(request_json GET /student/position/list "" "${STUDENT_CHAIN_TOKEN}")"
    row="$(jq -c \
      --arg company "${company}" \
      --arg title "${title}" \
      --argjson positionId "${position_id}" \
      '.data[] | select(.id == $positionId or (.company == $company and .title == $title))' \
      <<<"${response}" 2>/dev/null | head -n1 || true)"
    if [[ -n "${row}" ]]; then
      printf '%s' "${row}"
      return 0
    fi
    sleep 1
  done

  return 1
}

poll_student_position_review_row() {
  local status="$1"
  local title="$2"
  local company="$3"
  local response=""
  local row=""

  for _ in {1..10}; do
    response="$(request_json GET "/admin/student-position/list?status=${status}&keyword=$(uri_encode "${title}")" "" "${ADMIN_TOKEN}")"
    row="$(jq -c --arg title "${title}" --arg company "${company}" '.rows[] | select(.positionName == $title or .companyName == $company)' <<<"${response}" 2>/dev/null | head -n1 || true)"
    if [[ -n "${row}" ]]; then
      printf '%s' "${row}"
      return 0
    fi
    sleep 1
  done

  return 1
}

find_student_application_for() {
  local company="$1"
  local position="$2"
  local response
  response="$(request_json GET /student/application/list "" "${STUDENT_CHAIN_TOKEN}")"
  jq -c --arg company "${company}" --arg position "${position}" '.data.applications[] | select(.company == $company and .position == $position)' <<<"${response}" 2>/dev/null | head -n1
}

find_student_application() {
  find_student_application_for "${CHAIN_COMPANY_NAME}" "${CHAIN_POSITION_NAME}"
}

find_lead_job_row() {
  local scope="$1"
  local response
  response="$(request_json GET "/lead-mentor/job-overview/list?scope=${scope}&keyword=$(uri_encode "${CHAIN_COMPANY_NAME}")" "" "${LEAD_TOKEN}")"
  jq -c --arg company "${CHAIN_COMPANY_NAME}" '.rows[] | select(.companyName == $company)' <<<"${response}" 2>/dev/null | head -n1
}

find_admin_job_row_for() {
  local company="$1"
  local response
  response="$(request_json GET "/admin/job-overview/list?companyName=$(uri_encode "${company}")" "" "${ADMIN_TOKEN}")"
  jq -c --arg company "${company}" '.rows[] | select(.companyName == $company)' <<<"${response}" 2>/dev/null | head -n1
}

find_admin_job_row() {
  find_admin_job_row_for "${CHAIN_COMPANY_NAME}"
}

find_admin_unassigned_job_row_for() {
  local company="$1"
  local response
  response="$(request_json GET "/admin/job-overview/unassigned?companyName=$(uri_encode "${company}")" "" "${ADMIN_TOKEN}")"
  jq -c --arg company "${company}" '.rows[] | select(.companyName == $company)' <<<"${response}" 2>/dev/null | head -n1
}

find_admin_unassigned_job_row() {
  find_admin_unassigned_job_row_for "${CHAIN_COMPANY_NAME}"
}

find_mentor_job_row() {
  local response
  response="$(request_json GET "/api/mentor/job-overview/list?company=$(uri_encode "${CHAIN_COMPANY_NAME}")" "" "${MENTOR_TOKEN}")"
  jq -c --arg company "${CHAIN_COMPANY_NAME}" '.rows[] | select(.company == $company)' <<<"${response}" 2>/dev/null | head -n1
}

find_assistant_job_row() {
  local response
  response="$(request_json GET "/api/mentor/job-overview/list?company=$(uri_encode "${CHAIN_COMPANY_NAME}")" "" "${ASSISTANT_TOKEN}")"
  jq -c --arg company "${CHAIN_COMPANY_NAME}" '.rows[] | select(.company == $company)' <<<"${response}" 2>/dev/null | head -n1
}

find_lead_practice_row() {
  local scope="$1"
  local response
  response="$(request_json GET "/lead-mentor/mock-practice/list?scope=${scope}&keyword=$(uri_encode "${CHAIN_STUDENT_NAME}")" "" "${LEAD_TOKEN}")"
  jq -c --arg name "${CHAIN_STUDENT_NAME}" '.rows[] | select(.studentName == $name)' <<<"${response}" 2>/dev/null | head -n1
}

find_admin_mock_row_by_tab() {
  local tab="$1"
  local response
  response="$(request_json GET "/admin/mock-practice/list?tab=${tab}&keyword=$(uri_encode "${CHAIN_STUDENT_NAME}")" "" "${ADMIN_TOKEN}")"
  jq -c --arg name "${CHAIN_STUDENT_NAME}" '.rows[] | select(.studentName == $name)' <<<"${response}" 2>/dev/null | head -n1
}

find_admin_mock_row() {
  find_admin_mock_row_by_tab all
}

find_admin_pending_mock_row() {
  find_admin_mock_row_by_tab pending
}

find_admin_mock_row_by_id() {
  local practice_id="$1"
  local tab="${2:-all}"
  local response
  response="$(request_json GET "/admin/mock-practice/list?tab=${tab}&keyword=$(uri_encode "${CHAIN_STUDENT_NAME}")" "" "${ADMIN_TOKEN}")"
  jq -c --argjson practiceId "${practice_id}" '.rows[] | select(.practiceId == $practiceId)' <<<"${response}" 2>/dev/null | head -n1
}

find_mentor_practice_row() {
  local response
  response="$(request_json GET "/api/mentor/mock-practice/list?keyword=$(uri_encode "${CHAIN_STUDENT_NAME}")" "" "${MENTOR_TOKEN}")"
  jq -c --arg name "${CHAIN_STUDENT_NAME}" '.rows[] | select(.studentName == $name)' <<<"${response}" 2>/dev/null | head -n1
}

find_assistant_practice_row() {
  local response
  response="$(request_json GET "/api/mentor/mock-practice/list?keyword=$(uri_encode "${CHAIN_STUDENT_NAME}")" "" "${ASSISTANT_TOKEN}")"
  jq -c --arg name "${CHAIN_STUDENT_NAME}" '.rows[] | select(.studentName == $name)' <<<"${response}" 2>/dev/null | head -n1
}

find_student_class_record() {
  local record_id="$1"
  local response=""
  local row=""

  for _ in {1..8}; do
    response="$(request_json GET /student/class-records/list "" "${STUDENT_CHAIN_TOKEN}")"
    row="$(jq -c --arg recordId "${record_id}" '.data.records[] | select(.recordId == ("#" + $recordId) or .recordId == $recordId)' <<<"${response}" 2>/dev/null | head -n1 || true)"
    if [[ -n "${row}" ]]; then
      printf '%s' "${row}"
      return 0
    fi
    sleep 1
  done

  return 1
}

find_mentor_class_record_row() {
  local student_id="$1"
  local class_date="$2"
  local response
  response="$(request_json GET /api/mentor/class-records/list "" "${MENTOR_TOKEN}")"
  jq -c --argjson studentId "${student_id}" --arg classDate "${class_date}" '.rows[] | select(.studentId == $studentId and ((.classDate // "") | startswith($classDate)))' <<<"${response}" 2>/dev/null | head -n1
}

find_admin_schedule_row() {
  local staff_id="$1"
  local week="$2"
  local response
  response="$(request_json GET "/admin/schedule/list?pageNum=1&pageSize=200&week=${week}" "" "${ADMIN_TOKEN}")"
  jq -c --argjson staffId "${staff_id}" '.rows[] | select(.staffId == $staffId)' <<<"${response}" 2>/dev/null | head -n1
}

echo "=== osg five-end runtime closure ==="
echo "base=${BASE_URL}"
echo "chain=${CHAIN_ID}"

if [[ "${CLEAN_CHAIN_BEFORE}" == "1" ]]; then
  cleanup_chain_data
fi

ensure_admin_token
admin_info_response="$(request_json GET /getInfo "" "${ADMIN_TOKEN}")"
pass "admin.login" "user=$(json_required '.user.userName // .data.user.userName' "${admin_info_response}")"

admin_profile_response="$(request_json GET /system/user/profile "" "${ADMIN_TOKEN}")"
admin_profile_email="$(json_optional '.data.email' "${admin_profile_response}")"
pass "admin.profile" "email=${admin_profile_email:-<empty>}"

CHAIN_MENTOR_STAFF_ID="$(upsert_staff "${CHAIN_MENTOR_NAME}" "${CHAIN_MENTOR_EMAIL}" "mentor" "Hong Kong" 680)"
pass "chain.staff.mentor" "staffId=${CHAIN_MENTOR_STAFF_ID}"

CHAIN_LEAD_STAFF_ID="$(upsert_staff "${CHAIN_LEAD_NAME}" "${CHAIN_LEAD_EMAIL}" "lead_mentor" "Shanghai" 620)"
pass "chain.staff.lead" "staffId=${CHAIN_LEAD_STAFF_ID}"

CHAIN_ASSISTANT_STAFF_ID="$(upsert_staff "${CHAIN_ASSISTANT_NAME}" "${CHAIN_ASSISTANT_EMAIL}" "assistant" "Shanghai" 580)"
pass "chain.staff.assistant" "staffId=${CHAIN_ASSISTANT_STAFF_ID}"

mentor_staff_row="$(find_staff_row_by_email "${CHAIN_MENTOR_EMAIL}")"
lead_staff_row="$(find_staff_row_by_email "${CHAIN_LEAD_EMAIL}")"
assistant_staff_row="$(find_staff_row_by_email "${CHAIN_ASSISTANT_EMAIL}")"
pass "admin.staff.list" "lead=$(json_required '.staffId' "${lead_staff_row}"), mentor=$(json_required '.staffId' "${mentor_staff_row}"), assistant=$(json_required '.staffId' "${assistant_staff_row}")"

CHAIN_STUDENT_ID="$(upsert_student "${CHAIN_LEAD_USER_ID:-0}" "${CHAIN_ASSISTANT_USER_ID:-0}")"

relogin_lead "${CHAIN_PASSWORD}"
pass "lead.login" "userId=${CHAIN_LEAD_USER_ID}"

relogin_assistant "${CHAIN_PASSWORD}"
pass "assistant.login" "userId=${CHAIN_ASSISTANT_USER_ID}"

relogin_mentor "${CHAIN_PASSWORD}"
pass "mentor.login" "userId=${CHAIN_MENTOR_USER_ID}"

CHAIN_STUDENT_ID="$(upsert_student "${CHAIN_LEAD_USER_ID}" "${CHAIN_ASSISTANT_USER_ID}")"
pass "chain.student" "studentId=${CHAIN_STUDENT_ID}"

student_row="$(find_student_row_by_email "${CHAIN_STUDENT_EMAIL}")"
CHAIN_STUDENT_ID="$(json_required '.studentId' "${student_row}")"
pass "admin.student.list" "studentId=${CHAIN_STUDENT_ID}"

student_detail_response="$(request_json GET "/admin/student/${CHAIN_STUDENT_ID}" "" "${ADMIN_TOKEN}")"
pass "admin.student.detail" "email=$(json_required '.data.email // .email' "${student_detail_response}")"

student_contracts_response="$(request_json GET "/admin/student/${CHAIN_STUDENT_ID}/contracts" "" "${ADMIN_TOKEN}")"
contract_count="$(json_required '.data.contracts | length' "${student_contracts_response}")"
if (( contract_count <= 0 )); then
  fail "admin.student.contracts" "student has no contract rows"
fi
pass "admin.student.contracts" "count=${contract_count}"

contract_list_response="$(request_json GET "/admin/contract/list?pageNum=1&pageSize=100&studentId=${CHAIN_STUDENT_ID}" "" "${ADMIN_TOKEN}")"
contract_row="$(jq -c --argjson studentId "${CHAIN_STUDENT_ID}" '.rows[] | select(.studentId == $studentId)' <<<"${contract_list_response}" 2>/dev/null | head -n1 || true)"
if [[ -z "${contract_row}" ]]; then
  fail "admin.contract.list" "missing contract row for studentId=${CHAIN_STUDENT_ID}"
fi
pass "admin.contract.list" "contractNo=$(json_required '.contractNo' "${contract_row}")"

relogin_student "${CHAIN_PASSWORD}"
pass "student.login" "userId=${CHAIN_STUDENT_USER_ID}"

student_info_response="$(student_get_info "${STUDENT_CHAIN_TOKEN}")"
pass "student.getInfo" "user=$(json_required '.user.userName // .data.user.userName' "${student_info_response}")"

shared_password_roundtrip "student.password.reset" "${CHAIN_STUDENT_EMAIL}" "$(short_temp_password S)" "${CHAIN_PASSWORD}" relogin_student
shared_password_roundtrip "lead.password.reset" "${CHAIN_LEAD_EMAIL}" "$(short_temp_password L)" "${CHAIN_PASSWORD}" relogin_lead
shared_password_roundtrip "assistant.password.reset" "${CHAIN_ASSISTANT_EMAIL}" "$(short_temp_password C)" "${CHAIN_PASSWORD}" relogin_assistant
mentor_password_roundtrip "mentor.password.reset" "${CHAIN_MENTOR_EMAIL}" "$(short_temp_password M)" "${CHAIN_PASSWORD}"
if [[ -n "${admin_profile_email}" ]]; then
  admin_password_roundtrip "${admin_profile_email}"
else
  warn "admin.password.reset" "admin profile email empty, skipped shared forgot-password verification"
fi

student_profile_response="$(request_json GET /student/profile "" "${STUDENT_CHAIN_TOKEN}")"
student_profile_update="$(jq -cn \
  --arg school "${CHAIN_ID} School" \
  --arg major "$(json_required '.data.profile.major' "${student_profile_response}")" \
  --arg graduationYear "$(json_required '.data.profile.graduationYear' "${student_profile_response}")" \
  --arg highSchool "$(json_required '.data.profile.highSchool' "${student_profile_response}")" \
  --arg postgraduatePlan "$(json_required '.data.profile.postgraduatePlan' "${student_profile_response}")" \
  --arg visaStatus "$(json_required '.data.profile.visaStatus' "${student_profile_response}")" \
  --arg recruitmentCycle "$(json_required '.data.profile.recruitmentCycle' "${student_profile_response}")" \
  --arg targetRegion "$(json_required '.data.profile.targetRegion' "${student_profile_response}")" \
  --arg primaryDirection "$(json_required '.data.profile.primaryDirection' "${student_profile_response}")" \
  --arg secondaryDirection "$(json_required '.data.profile.secondaryDirection' "${student_profile_response}")" \
  --arg phone "${CHAIN_STUDENT_PHONE}" \
  --arg wechatId "${CHAIN_STUDENT_WECHAT}" \
  '{
    school: $school,
    major: $major,
    graduationYear: $graduationYear,
    highSchool: $highSchool,
    postgraduatePlan: $postgraduatePlan,
    visaStatus: $visaStatus,
    recruitmentCycle: $recruitmentCycle,
    targetRegion: $targetRegion,
    primaryDirection: $primaryDirection,
    secondaryDirection: $secondaryDirection,
    phone: $phone,
    wechatId: $wechatId
  }')"
request_json PUT /student/profile "${student_profile_update}" "${STUDENT_CHAIN_TOKEN}" >/dev/null
student_profile_after="$(request_json GET /student/profile "" "${STUDENT_CHAIN_TOKEN}")"
if [[ "$(json_required '.data.profile.phone' "${student_profile_after}")" != "${CHAIN_STUDENT_PHONE}" ]]; then
  fail "student.profile.update" "phone did not persist"
fi
pass "student.profile.update" "pendingCount=$(json_required '.data.pendingCount' "${student_profile_after}")"

lead_profile_response="$(request_json GET /lead-mentor/profile "" "${LEAD_TOKEN}")"
lead_profile_payload="$(jq -cn \
  --argjson staffId "$(json_required '.data.profile.staffId' "${lead_profile_response}")" \
  --arg englishName "${CHAIN_ID} Lead Updated" \
  --arg genderLabel "$(json_required '.data.profile.genderLabel' "${lead_profile_response}")" \
  --arg phone "${CHAIN_LEAD_PHONE}" \
  --arg wechatId "${CHAIN_LEAD_WECHAT}" \
  --arg email "$(json_required '.data.profile.email' "${lead_profile_response}")" \
  --arg regionArea "$(json_required '.data.profile.regionArea' "${lead_profile_response}")" \
  --arg regionCity "Shanghai 上海" \
  --arg remark "${CHAIN_ID} lead profile change" \
  '{
    staffId: $staffId,
    englishName: $englishName,
    genderLabel: $genderLabel,
    phone: $phone,
    wechatId: $wechatId,
    email: $email,
    regionArea: $regionArea,
    regionCity: $regionCity,
    remark: $remark
  }')"
lead_profile_submit="$(request_json POST /lead-mentor/profile/change-request "${lead_profile_payload}" "${LEAD_TOKEN}")"
pass "lead.profile.change-request" "changeRequestId=$(json_required '.data.changeRequestId // .changeRequestId' "${lead_profile_submit}")"

mentor_profile_response="$(request_json GET /api/mentor/profile "" "${MENTOR_TOKEN}")"
mentor_profile_payload="$(jq -cn \
  --argjson userId "$(json_required '.data.userId // .userId' "${mentor_profile_response}")" \
  --arg userName "$(json_required '.data.userName // .userName' "${mentor_profile_response}")" \
  --arg nickName "Mentor ${CHAIN_RUNTIME_NICK_TAG}" \
  --arg email "$(json_required '.data.email // .email' "${mentor_profile_response}")" \
  --arg phonenumber "${CHAIN_MENTOR_PHONE}" \
  --arg sex "$(json_required '.data.sex // .sex' "${mentor_profile_response}")" \
  --arg remark "${CHAIN_MENTOR_REMARK}" \
  '{
    userId: $userId,
    userName: $userName,
    nickName: $nickName,
    email: $email,
    phonenumber: $phonenumber,
    sex: $sex,
    remark: $remark
  }')"
request_json PUT /api/mentor/profile "${mentor_profile_payload}" "${MENTOR_TOKEN}" >/dev/null
mentor_profile_after="$(request_json GET /api/mentor/profile "" "${MENTOR_TOKEN}")"
if [[ "$(json_required '.data.nickName // .nickName' "${mentor_profile_after}")" != "Mentor ${CHAIN_RUNTIME_NICK_TAG}" ]]; then
  fail "mentor.profile.update" "nickName did not persist"
fi
pass "mentor.profile.update" "phone=$(json_required '.data.phonenumber // .phonenumber' "${mentor_profile_after}")"

assistant_profile_response="$(request_json GET /api/mentor/profile "" "${ASSISTANT_TOKEN}")"
assistant_profile_payload="$(jq -cn \
  --argjson userId "$(json_required '.data.userId // .userId' "${assistant_profile_response}")" \
  --arg userName "$(json_required '.data.userName // .userName' "${assistant_profile_response}")" \
  --arg nickName "Assistant ${CHAIN_RUNTIME_NICK_TAG}" \
  --arg email "$(json_required '.data.email // .email' "${assistant_profile_response}")" \
  --arg phonenumber "${CHAIN_ASSISTANT_PHONE}" \
  --arg sex "$(json_required '.data.sex // .sex' "${assistant_profile_response}")" \
  --arg remark "${CHAIN_ASSISTANT_REMARK}" \
  '{
    userId: $userId,
    userName: $userName,
    nickName: $nickName,
    email: $email,
    phonenumber: $phonenumber,
    sex: $sex,
    remark: $remark
  }')"
request_json PUT /api/mentor/profile "${assistant_profile_payload}" "${ASSISTANT_TOKEN}" >/dev/null
assistant_profile_after="$(request_json GET /api/mentor/profile "" "${ASSISTANT_TOKEN}")"
if [[ "$(json_required '.data.nickName // .nickName' "${assistant_profile_after}")" != "Assistant ${CHAIN_RUNTIME_NICK_TAG}" ]]; then
  fail "assistant.profile.update" "nickName did not persist"
fi
pass "assistant.profile.update" "phone=$(json_required '.data.phonenumber // .phonenumber' "${assistant_profile_after}")"

request_json GET "/lead-mentor/schedule?weekScope=current" "" "${LEAD_TOKEN}" >/dev/null
lead_schedule_status="$(request_json GET /lead-mentor/schedule/status "" "${LEAD_TOKEN}")"
pass "lead.schedule.status" "nextWeekFilled=$(json_optional '.data.nextWeekFilled' "${lead_schedule_status}")"

lead_schedule_save_payload="$(jq -cn '{availableHours: 18, selectedSlotKeys: ["1-morning", "3-evening"], note: "CHAIN lead schedule next"}')"
request_json PUT /lead-mentor/schedule/next "${lead_schedule_save_payload}" "${LEAD_TOKEN}" >/dev/null
lead_schedule_next="$(request_json GET "/lead-mentor/schedule?weekScope=next" "" "${LEAD_TOKEN}")"
if [[ "$(json_required '(.data.availableHours | tonumber | floor | tostring)' "${lead_schedule_next}")" != "18" ]]; then
  fail "lead.schedule.next" "expected availableHours=18"
fi
pass "lead.schedule.next" "selectedSlots=$(json_required '.data.selectedSlotKeys | length' "${lead_schedule_next}")"

admin_schedule_next_row="$(find_admin_schedule_row "${CHAIN_LEAD_STAFF_ID}" next || true)"
if [[ -z "${admin_schedule_next_row}" ]]; then
  fail "admin.schedule.list" "lead next-week schedule missing from admin list"
fi
pass "admin.schedule.list" "staffId=$(json_required '.staffId' "${admin_schedule_next_row}")"

admin_schedule_edit_payload="$(jq -cn \
  --argjson staffId "${CHAIN_LEAD_STAFF_ID}" \
  '{staffId: $staffId, week: "next", availableHours: 12, reason: "CHAIN admin edit", notifyStaff: false, selectedSlotKeys: ["2-afternoon", "4-evening"]}')"
request_json PUT /admin/schedule/edit "${admin_schedule_edit_payload}" "${ADMIN_TOKEN}" >/dev/null
lead_schedule_next_after_admin="$(request_json GET "/lead-mentor/schedule?weekScope=next" "" "${LEAD_TOKEN}")"
if [[ "$(json_required '(.data.availableHours | tonumber | floor | tostring)' "${lead_schedule_next_after_admin}")" != "12" ]]; then
  fail "admin.schedule.edit" "lead schedule did not reflect admin edit"
fi
pass "admin.schedule.edit" "availableHours=12"

mentor_schedule_payload="$(jq -cn \
  --arg weekStartDate "${CURRENT_WEEK_START}" \
  '{weekStartDate: $weekStartDate, totalHours: 9, monday: "morning,evening", tuesday: "", wednesday: "afternoon", thursday: "", friday: "", saturday: "", sunday: ""}')"
request_json PUT /api/mentor/schedule "${mentor_schedule_payload}" "${MENTOR_TOKEN}" >/dev/null
mentor_schedule_current="$(request_json GET /api/mentor/schedule "" "${MENTOR_TOKEN}")"
if [[ "$(json_required '(.data.totalHours // .totalHours | tonumber | floor | tostring)' "${mentor_schedule_current}")" != "9" ]]; then
  fail "mentor.schedule.update" "totalHours did not persist"
fi
request_json GET /api/mentor/schedule/last-week "" "${MENTOR_TOKEN}" >/dev/null
pass "mentor.schedule.update" "weekStart=${CURRENT_WEEK_START}"

assistant_schedule_payload="$(jq -cn \
  --arg weekStartDate "${CURRENT_WEEK_START}" \
  '{weekStartDate: $weekStartDate, totalHours: 6, monday: "", tuesday: "afternoon", wednesday: "", thursday: "", friday: "evening", saturday: "", sunday: ""}')"
request_json PUT /api/mentor/schedule "${assistant_schedule_payload}" "${ASSISTANT_TOKEN}" >/dev/null
assistant_schedule_current="$(request_json GET /api/mentor/schedule "" "${ASSISTANT_TOKEN}")"
if [[ "$(json_required '(.data.totalHours // .totalHours | tonumber | floor | tostring)' "${assistant_schedule_current}")" != "6" ]]; then
  fail "assistant.schedule.update" "totalHours did not persist"
fi
request_json GET /api/mentor/schedule/last-week "" "${ASSISTANT_TOKEN}" >/dev/null
pass "assistant.schedule.update" "weekStart=${CURRENT_WEEK_START}"

CHAIN_POSITION_ID="$(ensure_public_position)"
pass "chain.position" "positionId=${CHAIN_POSITION_ID}"

position_meta_response="$(request_json GET /admin/position/meta "" "${ADMIN_TOKEN}")"
pass "admin.position.meta" "categories=$(json_required '.data.categories | length' "${position_meta_response}")"
request_json GET /admin/position/stats "" "${ADMIN_TOKEN}" >/dev/null
pass "admin.position.stats" "company=${CHAIN_COMPANY_NAME}"
request_json GET /admin/position/drill-down "" "${ADMIN_TOKEN}" >/dev/null
pass "admin.position.drill-down" "company=${CHAIN_COMPANY_NAME}"

student_position_meta_response="$(request_json GET /student/position/meta "" "${STUDENT_CHAIN_TOKEN}")"
manual_category="$(json_required '.data.filterOptions.categories[0].value' "${student_position_meta_response}")"
manual_location="$(json_required '.data.filterOptions.locations[0].value // .data.filterOptions.locations[0].label' "${student_position_meta_response}")"
apply_method="$(json_required '.data.filterOptions.applyMethods[0].value' "${student_position_meta_response}")"
progress_stage="$(json_required '.data.filterOptions.progressStages[0].value' "${student_position_meta_response}")"
coaching_stage="$(json_required '.data.filterOptions.coachingStages[0].value' "${student_position_meta_response}")"
mentor_count="$(python3 "${ROOT_DIR}/bin/osg_runtime_meta_picker.py" <<<"${student_position_meta_response}")"
pass "student.position.meta" "applyMethod=${apply_method}"

student_visible_position="$(poll_student_visible_position "${CHAIN_POSITION_ID}" "${CHAIN_COMPANY_NAME}" "${CHAIN_POSITION_NAME}" || true)"
if [[ -z "${student_visible_position}" ]]; then
  fail "student.position.list" "student cannot see public positionId=${CHAIN_POSITION_ID}"
fi
pass "student.position.list" "positionId=$(json_required '.id' "${student_visible_position}")"

original_favorited="$(jq -r '.favorited' <<<"${student_visible_position}")"
if [[ "${original_favorited}" != "true" && "${original_favorited}" != "false" ]]; then
  fail "student.position.favorite" "unexpected favorited=${original_favorited}"
fi
favorite_toggle="true"
if [[ "${original_favorited}" == "true" ]]; then
  favorite_toggle="false"
fi
favorite_toggle_payload="$(jq -cn --argjson positionId "${CHAIN_POSITION_ID}" --argjson favorited "${favorite_toggle}" '{positionId: $positionId, favorited: $favorited}')"
favorite_restore_payload="$(jq -cn --argjson positionId "${CHAIN_POSITION_ID}" --argjson favorited "${original_favorited}" '{positionId: $positionId, favorited: $favorited}')"
request_json POST /student/position/favorite "${favorite_toggle_payload}" "${STUDENT_CHAIN_TOKEN}" >/dev/null
request_json POST /student/position/favorite "${favorite_restore_payload}" "${STUDENT_CHAIN_TOKEN}" >/dev/null
pass "student.position.favorite" "positionId=${CHAIN_POSITION_ID}"

lead_positions_meta="$(request_json GET /lead-mentor/positions/meta "" "${LEAD_TOKEN}")"
pass "lead.position.meta" "regions=$(json_required '.data.regions | length' "${lead_positions_meta}")"
lead_positions_list="$(request_json GET "/lead-mentor/positions/list?keyword=$(uri_encode "${CHAIN_COMPANY_NAME}")" "" "${LEAD_TOKEN}")"
lead_position_row="$(jq -c --arg company "${CHAIN_COMPANY_NAME}" '.rows[] | select(.companyName == $company)' <<<"${lead_positions_list}" 2>/dev/null | head -n1 || true)"
if [[ -z "${lead_position_row}" ]]; then
  fail "lead.position.list" "lead cannot see public position"
fi
pass "lead.position.list" "positionId=$(json_required '.positionId' "${lead_position_row}")"

request_json GET /admin/position/stats "" "${ASSISTANT_TOKEN}" >/dev/null
pass "assistant.position.stats" "assistant can read reused position stats"
request_json GET /admin/position/drill-down "" "${ASSISTANT_TOKEN}" >/dev/null
pass "assistant.position.drill-down" "assistant can read reused position drill-down"

manual_approve_payload="$(jq -cn \
  --arg category "${manual_category}" \
  --arg title "${CHAIN_MANUAL_APPROVE_POSITION_NAME}" \
  --arg company "${CHAIN_MANUAL_APPROVE_COMPANY_NAME}" \
  --arg location "${manual_location}" \
  '{category: $category, title: $title, company: $company, location: $location}')"
request_json POST /student/position/manual "${manual_approve_payload}" "${STUDENT_CHAIN_TOKEN}" >/dev/null
pass "student.position.manual.approveSeed" "title=${CHAIN_MANUAL_APPROVE_POSITION_NAME}"

manual_reject_payload="$(jq -cn \
  --arg category "${manual_category}" \
  --arg title "${CHAIN_MANUAL_REJECT_POSITION_NAME}" \
  --arg company "${CHAIN_MANUAL_REJECT_COMPANY_NAME}" \
  --arg location "${manual_location}" \
  '{category: $category, title: $title, company: $company, location: $location}')"
request_json POST /student/position/manual "${manual_reject_payload}" "${STUDENT_CHAIN_TOKEN}" >/dev/null
pass "student.position.manual.rejectSeed" "title=${CHAIN_MANUAL_REJECT_POSITION_NAME}"

approve_row="$(poll_student_position_review_row pending "${CHAIN_MANUAL_APPROVE_POSITION_NAME}" "${CHAIN_MANUAL_APPROVE_COMPANY_NAME}" || true)"
if [[ -z "${approve_row}" ]]; then
  fail "admin.student-position.pending.approve" "missing pending manual-approve row"
fi
reject_row="$(poll_student_position_review_row pending "${CHAIN_MANUAL_REJECT_POSITION_NAME}" "${CHAIN_MANUAL_REJECT_COMPANY_NAME}" || true)"
if [[ -z "${reject_row}" ]]; then
  fail "admin.student-position.pending.reject" "missing pending manual-reject row"
fi
pass "admin.student-position.list" "approveId=$(json_required '.studentPositionId' "${approve_row}"), rejectId=$(json_required '.studentPositionId' "${reject_row}")"

approve_position_payload="$(jq -cn \
  --argjson row "${approve_row}" \
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
approve_position_response="$(request_json PUT "/admin/student-position/$(json_required '.studentPositionId' "${approve_row}")/approve" "${approve_position_payload}" "${ADMIN_TOKEN}")"
CHAIN_APPROVED_POSITION_ID="$(json_required '.data.positionId // .positionId' "${approve_position_response}")"
pass "admin.student-position.approve" "positionId=${CHAIN_APPROVED_POSITION_ID}"

request_json PUT "/admin/student-position/$(json_required '.studentPositionId' "${reject_row}")/reject" '{"reason":"CHAIN reject path","note":"runtime reject"}' "${ADMIN_TOKEN}" >/dev/null
rejected_position_row="$(poll_student_position_review_row rejected "${CHAIN_MANUAL_REJECT_POSITION_NAME}" "${CHAIN_MANUAL_REJECT_COMPANY_NAME}" || true)"
if [[ -z "${rejected_position_row}" ]]; then
  fail "admin.student-position.reject" "reject row not found after review"
fi
pass "admin.student-position.reject" "studentPositionId=$(json_required '.studentPositionId' "${rejected_position_row}")"

approved_public_position="$(poll_student_visible_position "${CHAIN_APPROVED_POSITION_ID}" "${CHAIN_MANUAL_APPROVE_COMPANY_NAME}" "${CHAIN_MANUAL_APPROVE_POSITION_NAME}" || true)"
if [[ -z "${approved_public_position}" ]]; then
  fail "student.position.approvedVisible" "approved manual position missing from student view"
fi
pass "student.position.approvedVisible" "positionId=$(json_required '.id' "${approved_public_position}")"

rejected_public_position_list="$(request_json GET "/admin/position/list?pageNum=1&pageSize=100&keyword=$(uri_encode "${CHAIN_MANUAL_REJECT_POSITION_NAME}")" "" "${ADMIN_TOKEN}")"
if jq -e --arg title "${CHAIN_MANUAL_REJECT_POSITION_NAME}" '.rows[] | select(.positionName == $title)' <<<"${rejected_public_position_list}" >/dev/null 2>&1; then
  fail "admin.position.rejectIsolation" "rejected manual position leaked into public pool"
fi
pass "admin.position.rejectIsolation" "title=${CHAIN_MANUAL_REJECT_POSITION_NAME}"

student_application_meta="$(request_json GET /student/application/meta "" "${STUDENT_CHAIN_TOKEN}")"
pass "student.application.meta" "stages=$(json_required '.data.stageOptions | length' "${student_application_meta}")"

apply_payload="$(jq -cn --argjson positionId "${CHAIN_POSITION_ID}" --arg method "${apply_method}" --arg date "${CHAIN_DATE}" '{positionId: $positionId, applied: true, date: $date, method: $method, note: "runtime apply"}')"
request_json POST /student/position/apply "${apply_payload}" "${STUDENT_CHAIN_TOKEN}" >/dev/null
pass "student.position.apply" "positionId=${CHAIN_POSITION_ID}"

progress_payload="$(jq -cn --argjson positionId "${CHAIN_POSITION_ID}" --arg stage "${progress_stage}" '{positionId: $positionId, stage: $stage, notes: "runtime progress"}')"
request_json POST /student/position/progress "${progress_payload}" "${STUDENT_CHAIN_TOKEN}" >/dev/null
pass "student.position.progress" "stage=${progress_stage}"

coaching_payload="$(jq -cn --argjson positionId "${CHAIN_POSITION_ID}" --arg stage "${coaching_stage}" --arg mentorCount "${mentor_count}" '{positionId: $positionId, stage: $stage, mentorCount: $mentorCount, note: "runtime coaching"}')"
request_json POST /student/position/coaching "${coaching_payload}" "${STUDENT_CHAIN_TOKEN}" >/dev/null
pass "student.position.coaching" "positionId=${CHAIN_POSITION_ID}"

lead_position_students="$(request_json GET "/lead-mentor/positions/${CHAIN_POSITION_ID}/students" "" "${LEAD_TOKEN}")"
if ! jq -e --arg name "${CHAIN_STUDENT_NAME}" '.data[]? | select(.studentName == $name)' <<<"${lead_position_students}" >/dev/null 2>&1; then
  fail "lead.position.students" "lead cannot see managed student on applied position"
fi
pass "lead.position.students" "student=${CHAIN_STUDENT_NAME}"

lead_students_meta="$(request_json GET /lead-mentor/students/meta "" "${LEAD_TOKEN}")"
pass "lead.students.meta" "schools=$(json_required '.data.schools | length' "${lead_students_meta}")"
lead_students_list="$(request_json GET "/lead-mentor/students/list?keyword=$(uri_encode "${CHAIN_STUDENT_NAME}")&relation=managed" "" "${LEAD_TOKEN}")"
if ! jq -e --arg name "${CHAIN_STUDENT_NAME}" '.rows[] | select(.studentName == $name)' <<<"${lead_students_list}" >/dev/null 2>&1; then
  fail "lead.students.list" "lead cannot see managed student"
fi
pass "lead.students.list" "student=${CHAIN_STUDENT_NAME}"

assistant_students_list="$(request_json GET "/admin/student/list?pageNum=1&pageSize=100&studentName=$(uri_encode "${CHAIN_STUDENT_NAME}")" "" "${ASSISTANT_TOKEN}")"
if ! jq -e --arg name "${CHAIN_STUDENT_NAME}" '.rows[] | select(.studentName == $name)' <<<"${assistant_students_list}" >/dev/null 2>&1; then
  fail "assistant.students.list" "assistant cannot see owned student"
fi
pass "assistant.students.list" "student=${CHAIN_STUDENT_NAME}"

student_application_row="$(find_student_application)"
CHAIN_APPLICATION_ID="$(json_required '.id' "${student_application_row}")"
pass "student.application.list" "applicationId=${CHAIN_APPLICATION_ID}"

lead_pending_row="$(find_lead_job_row pending)"
if [[ -z "${lead_pending_row}" ]]; then
  fail "lead.job.pending" "missing pending row for ${CHAIN_COMPANY_NAME}"
fi
pass "lead.job.pending" "applicationId=$(json_required '.applicationId' "${lead_pending_row}")"

request_json GET "/lead-mentor/job-overview/${CHAIN_APPLICATION_ID}" "" "${LEAD_TOKEN}" >/dev/null
pass "lead.job.detail" "applicationId=${CHAIN_APPLICATION_ID}"

request_json GET /admin/job-overview/stats "" "${ADMIN_TOKEN}" >/dev/null
pass "admin.job.stats" "company=${CHAIN_COMPANY_NAME}"
request_json GET /admin/job-overview/funnel "" "${ADMIN_TOKEN}" >/dev/null
pass "admin.job.funnel" "company=${CHAIN_COMPANY_NAME}"
request_json GET /admin/job-overview/hot-companies "" "${ADMIN_TOKEN}" >/dev/null
pass "admin.job.hot-companies" "company=${CHAIN_COMPANY_NAME}"

admin_unassigned_job_row="$(find_admin_unassigned_job_row || true)"
if [[ -z "${admin_unassigned_job_row}" ]]; then
  fail "admin.job.unassigned" "missing unassigned row for ${CHAIN_COMPANY_NAME}"
fi
pass "admin.job.unassigned" "applicationId=$(json_required '.applicationId' "${admin_unassigned_job_row}")"

assign_job_payload="$(jq -cn \
  --argjson mentorId "${CHAIN_MENTOR_STAFF_ID}" \
  --arg mentorName "${CHAIN_MENTOR_NAME}" \
  '{mentorIds: [$mentorId], mentorNames: [$mentorName], assignNote: "runtime assign mentor"}')"
request_json POST "/lead-mentor/job-overview/${CHAIN_APPLICATION_ID}/assign-mentor" "${assign_job_payload}" "${LEAD_TOKEN}" >/dev/null
pass "lead.job.assign" "applicationId=${CHAIN_APPLICATION_ID}"

request_json POST "/lead-mentor/job-overview/${CHAIN_APPLICATION_ID}/ack-stage-update" "" "${LEAD_TOKEN}" >/dev/null
pass "lead.job.ack" "applicationId=${CHAIN_APPLICATION_ID}"

admin_apply_payload="$(jq -cn --argjson positionId "${CHAIN_APPROVED_POSITION_ID}" --arg method "${apply_method}" --arg date "${CHAIN_DATE}" '{positionId: $positionId, applied: true, date: $date, method: $method, note: "runtime admin apply"}')"
request_json POST /student/position/apply "${admin_apply_payload}" "${STUDENT_CHAIN_TOKEN}" >/dev/null
admin_progress_payload="$(jq -cn --argjson positionId "${CHAIN_APPROVED_POSITION_ID}" --arg stage "${progress_stage}" '{positionId: $positionId, stage: $stage, notes: "runtime admin progress"}')"
request_json POST /student/position/progress "${admin_progress_payload}" "${STUDENT_CHAIN_TOKEN}" >/dev/null
admin_coaching_payload="$(jq -cn --argjson positionId "${CHAIN_APPROVED_POSITION_ID}" --arg stage "${coaching_stage}" --arg mentorCount "${mentor_count}" '{positionId: $positionId, stage: $stage, mentorCount: $mentorCount, note: "runtime admin coaching"}')"
request_json POST /student/position/coaching "${admin_coaching_payload}" "${STUDENT_CHAIN_TOKEN}" >/dev/null
admin_application_row="$(find_student_application_for "${CHAIN_MANUAL_APPROVE_COMPANY_NAME}" "${CHAIN_MANUAL_APPROVE_POSITION_NAME}" || true)"
if [[ -z "${admin_application_row}" ]]; then
  fail "student.application.admin-seed" "missing admin-assign seed application"
fi
CHAIN_ADMIN_APPLICATION_ID="$(json_required '.id' "${admin_application_row}")"
pass "student.application.admin-seed" "applicationId=${CHAIN_ADMIN_APPLICATION_ID}"
admin_unassigned_seed_row="$(find_admin_unassigned_job_row_for "${CHAIN_MANUAL_APPROVE_COMPANY_NAME}" || true)"
if [[ -z "${admin_unassigned_seed_row}" ]]; then
  fail "admin.job.unassigned.seed" "missing admin assign seed row"
fi
pass "admin.job.unassigned.seed" "applicationId=$(json_required '.applicationId' "${admin_unassigned_seed_row}")"
admin_assign_payload="$(jq -cn \
  --argjson applicationId "${CHAIN_ADMIN_APPLICATION_ID}" \
  --argjson mentorId "${CHAIN_MENTOR_STAFF_ID}" \
  --arg mentorName "${CHAIN_MENTOR_NAME}" \
  '{applicationId: $applicationId, mentorIds: [$mentorId], mentorNames: [$mentorName], assignNote: "runtime admin assign mentor"}')"
request_json POST /admin/job-overview/assign-mentor "${admin_assign_payload}" "${ADMIN_TOKEN}" >/dev/null
admin_assigned_row="$(find_admin_job_row_for "${CHAIN_MANUAL_APPROVE_COMPANY_NAME}" || true)"
if [[ -z "${admin_assigned_row}" ]]; then
  fail "admin.job.assign" "admin assigned row missing"
fi
pass "admin.job.assign" "applicationId=$(json_required '.applicationId' "${admin_assigned_row}")"

admin_stage_update_payload="$(jq -cn --argjson applicationId "${CHAIN_APPLICATION_ID}" '{applicationId: $applicationId, currentStage: "second_round", stageUpdated: true, interviewTime: "2030-01-05T09:00:00", note: "runtime admin update"}')"
request_json PUT /admin/job-overview/stage-update "${admin_stage_update_payload}" "${ADMIN_TOKEN}" >/dev/null
pass "admin.job.stage-update" "applicationId=${CHAIN_APPLICATION_ID}"

admin_job_row="$(find_admin_job_row)"
if [[ -z "${admin_job_row}" ]]; then
  fail "admin.job.list" "admin cannot see chain application"
fi
pass "admin.job.list" "stage=$(json_required '.currentStage' "${admin_job_row}")"

student_application_after_admin="$(find_student_application)"
if [[ "$(json_required '.stage' "${student_application_after_admin}")" != "second_round" ]]; then
  fail "student.application.stage-sync" "student did not see admin stage update"
fi
pass "student.application.stage-sync" "stage=second_round"

mentor_job_row="$(find_mentor_job_row)"
if [[ -z "${mentor_job_row}" ]]; then
  fail "mentor.job.list" "mentor cannot see assigned application"
fi
pass "mentor.job.list" "applicationId=$(json_required '.id' "${mentor_job_row}")"

request_json GET /api/mentor/job-overview/calendar "" "${MENTOR_TOKEN}" >/dev/null
pass "mentor.job.calendar" "applicationId=${CHAIN_APPLICATION_ID}"
request_json PUT "/api/mentor/job-overview/${CHAIN_APPLICATION_ID}/confirm" "" "${MENTOR_TOKEN}" >/dev/null
pass "mentor.job.confirm" "applicationId=${CHAIN_APPLICATION_ID}"

assistant_job_row="$(find_assistant_job_row)"
if [[ -z "${assistant_job_row}" ]]; then
  fail "assistant.job.list" "assistant cannot see owned application"
fi
pass "assistant.job.list" "applicationId=$(json_required '.id' "${assistant_job_row}")"
request_json GET /api/mentor/job-overview/calendar "" "${ASSISTANT_TOKEN}" >/dev/null
pass "assistant.job.calendar" "applicationId=${CHAIN_APPLICATION_ID}"

mock_meta_response="$(request_json GET /student/mock-practice/meta "" "${STUDENT_CHAIN_TOKEN}")"
mock_type="$(json_required '.data.practiceCards[0].id' "${mock_meta_response}")"
mock_mentor_count="$(json_required '.data.practiceForm.mentorCountOptions[0].value' "${mock_meta_response}")"
pass "student.mock.meta" "type=${mock_type}"

practice_request_payload="$(jq -cn --arg type "${mock_type}" --arg mentorCount "${mock_mentor_count}" '{type: $type, reason: "runtime mock", mentorCount: $mentorCount, preferredMentor: "", excludedMentor: "", remark: "runtime mock"}')"
practice_request_response="$(request_json POST /student/mock-practice/practice-request "${practice_request_payload}" "${STUDENT_CHAIN_TOKEN}")"
CHAIN_PRACTICE_ID="$(json_required '.data.requestId // .requestId' "${practice_request_response}")"
pass "student.mock.request" "practiceId=${CHAIN_PRACTICE_ID}"

request_course_type="$(python3 "${ROOT_DIR}/bin/osg_runtime_meta_picker.py" request-course-type <<<"${mock_meta_response}")"
request_company="$(json_required '.data.requestForm.companyOptions[0].value' "${mock_meta_response}")"
request_status="$(json_required '.data.requestForm.jobStatusOptions[0].value' "${mock_meta_response}")"
class_request_payload="$(jq -cn --arg courseType "${request_course_type}" --arg company "${request_company}" --arg status "${request_status}" '{courseType: $courseType, company: $company, status: $status, remark: "runtime class-request"}')"
request_json POST /student/mock-practice/class-request "${class_request_payload}" "${STUDENT_CHAIN_TOKEN}" >/dev/null
pass "student.mock.class-request" "courseType=${request_course_type}"

student_mock_overview="$(request_json GET /student/mock-practice/overview "" "${STUDENT_CHAIN_TOKEN}")"
if ! jq -e --arg recordId "$(printf 'MP%03d' "${CHAIN_PRACTICE_ID}")" '.data.practiceRecords[]? | select(.id == $recordId)' <<<"${student_mock_overview}" >/dev/null 2>&1; then
  warn "student.mock.overview" "new practice record not yet visible in student overview"
else
  pass "student.mock.overview" "practiceId=${CHAIN_PRACTICE_ID}"
fi

request_json GET /admin/mock-practice/stats "" "${ADMIN_TOKEN}" >/dev/null
pass "admin.mock.stats" "student=${CHAIN_STUDENT_NAME}"

lead_mock_pending_row="$(find_lead_practice_row pending)"
if [[ -z "${lead_mock_pending_row}" ]]; then
  fail "lead.mock.pending" "missing pending practice row for ${CHAIN_STUDENT_NAME}"
fi
pass "lead.mock.pending" "practiceId=$(json_required '.practiceId' "${lead_mock_pending_row}")"
request_json GET "/lead-mentor/mock-practice/${CHAIN_PRACTICE_ID}" "" "${LEAD_TOKEN}" >/dev/null
pass "lead.mock.detail" "practiceId=${CHAIN_PRACTICE_ID}"

lead_mock_stats_response="$(request_json GET "/lead-mentor/mock-practice/stats?keyword=$(uri_encode "${CHAIN_STUDENT_NAME}")" "" "${LEAD_TOKEN}")"
pass "lead.mock.stats" "pendingCount=$(json_required '.data.pendingCount // .pendingCount' "${lead_mock_stats_response}")"

admin_pending_mock_row="$(find_admin_pending_mock_row || true)"
if [[ -z "${admin_pending_mock_row}" ]]; then
  fail "admin.mock.pending" "missing admin pending mock row for ${CHAIN_STUDENT_NAME}"
fi
pass "admin.mock.pending" "practiceId=$(json_required '.practiceId' "${admin_pending_mock_row}")"

assign_mock_payload="$(jq -cn \
  --argjson mentorId "${CHAIN_MENTOR_STAFF_ID}" \
  --arg mentorName "${CHAIN_MENTOR_NAME}" \
  --arg scheduledAt "${CHAIN_SCHEDULED_AT}" \
  '{mentorIds: [$mentorId], mentorNames: [$mentorName], mentorBackgrounds: ["Runtime Mentor"], scheduledAt: $scheduledAt, note: "runtime mock assign"}')"
request_json POST "/lead-mentor/mock-practice/${CHAIN_PRACTICE_ID}/assign" "${assign_mock_payload}" "${LEAD_TOKEN}" >/dev/null
pass "lead.mock.assign" "practiceId=${CHAIN_PRACTICE_ID}"

admin_mock_row="$(find_admin_mock_row)"
if [[ -z "${admin_mock_row}" ]]; then
  fail "admin.mock.list" "admin cannot see chain practice"
fi
pass "admin.mock.list" "practiceId=$(json_required '.practiceId' "${admin_mock_row}")"

admin_practice_request_payload="$(jq -cn --arg type "${mock_type}" --arg mentorCount "${mock_mentor_count}" '{type: $type, reason: "runtime admin mock", mentorCount: $mentorCount, preferredMentor: "", excludedMentor: "", remark: "runtime admin mock"}')"
admin_practice_request_response="$(request_json POST /student/mock-practice/practice-request "${admin_practice_request_payload}" "${STUDENT_CHAIN_TOKEN}")"
CHAIN_ADMIN_PRACTICE_ID="$(json_required '.data.requestId // .requestId' "${admin_practice_request_response}")"
pass "student.mock.request.admin-seed" "practiceId=${CHAIN_ADMIN_PRACTICE_ID}"
admin_pending_seed_mock_row="$(find_admin_mock_row_by_id "${CHAIN_ADMIN_PRACTICE_ID}" pending || true)"
if [[ -z "${admin_pending_seed_mock_row}" ]]; then
  fail "admin.mock.pending.seed" "missing admin assign seed mock row"
fi
pass "admin.mock.pending.seed" "practiceId=$(json_required '.practiceId' "${admin_pending_seed_mock_row}")"
admin_assign_mock_payload="$(jq -cn \
  --argjson practiceId "${CHAIN_ADMIN_PRACTICE_ID}" \
  --argjson mentorId "${CHAIN_MENTOR_STAFF_ID}" \
  --arg mentorName "${CHAIN_MENTOR_NAME}" \
  --arg scheduledAt "${CHAIN_SCHEDULED_AT}" \
  '{practiceId: $practiceId, mentorIds: [$mentorId], mentorNames: [$mentorName], mentorBackgrounds: ["Runtime Mentor"], scheduledAt: $scheduledAt, note: "runtime admin mock assign"}')"
request_json POST /admin/mock-practice/assign "${admin_assign_mock_payload}" "${ADMIN_TOKEN}" >/dev/null
admin_assigned_mock_row="$(find_admin_mock_row_by_id "${CHAIN_ADMIN_PRACTICE_ID}" all || true)"
if [[ -z "${admin_assigned_mock_row}" ]]; then
  fail "admin.mock.assign" "admin assigned mock row missing"
fi
pass "admin.mock.assign" "practiceId=$(json_required '.practiceId' "${admin_assigned_mock_row}")"

mentor_mock_row="$(find_mentor_practice_row)"
if [[ -z "${mentor_mock_row}" ]]; then
  fail "mentor.mock.list" "mentor cannot see assigned practice"
fi
pass "mentor.mock.list" "practiceId=$(json_required '.practiceId' "${mentor_mock_row}")"
request_json PUT "/api/mentor/mock-practice/${CHAIN_PRACTICE_ID}/confirm" "" "${MENTOR_TOKEN}" >/dev/null
pass "mentor.mock.confirm" "practiceId=${CHAIN_PRACTICE_ID}"

assistant_mock_row="$(find_assistant_practice_row)"
if [[ -z "${assistant_mock_row}" ]]; then
  fail "assistant.mock.list" "assistant cannot see owned practice"
fi
pass "assistant.mock.list" "practiceId=$(json_required '.practiceId' "${assistant_mock_row}")"

mentor_class_record_payload="$(jq -cn \
  --argjson studentId "${CHAIN_STUDENT_ID}" \
  --arg classDate "${CHAIN_MENTOR_CLASS_AT}" \
  '{
    studentId: $studentId,
    courseType: "mock_practice",
    classStatus: "mock_interview",
    classDate: $classDate,
    durationHours: 1.0,
    topics: "runtime mentor topics",
    comments: "runtime mentor comments",
    feedbackContent: "runtime mentor feedback"
  }')"
request_json GET "/api/mentor/students/list?keyword=$(uri_encode "${CHAIN_STUDENT_NAME}")" "" "${MENTOR_TOKEN}" >/dev/null
pass "mentor.students.list" "student=${CHAIN_STUDENT_NAME}"
mentor_class_record_response="$(request_json POST /api/mentor/class-records "${mentor_class_record_payload}" "${MENTOR_TOKEN}")"
if [[ "$(json_required '.msg' "${mentor_class_record_response}")" != "操作成功" ]]; then
  fail "mentor.class-record.create" "mentor class record create did not succeed"
fi
mentor_class_record_row="$(find_mentor_class_record_row "${CHAIN_STUDENT_ID}" "${CHAIN_MENTOR_CLASS_AT%%+*}" || true)"
if [[ -z "${mentor_class_record_row}" ]]; then
  fail "mentor.class-record.list" "mentor cannot see created class record"
fi
CHAIN_MENTOR_RECORD_ID="$(json_required '.recordId' "${mentor_class_record_row}")"
pass "mentor.class-record.list" "recordId=${CHAIN_MENTOR_RECORD_ID}"
mentor_class_record_detail="$(request_json GET "/api/mentor/class-records/${CHAIN_MENTOR_RECORD_ID}" "" "${MENTOR_TOKEN}")"
if [[ "$(json_required '.data.recordId // .recordId' "${mentor_class_record_detail}")" != "${CHAIN_MENTOR_RECORD_ID}" ]]; then
  fail "mentor.class-record.detail" "unexpected mentor class record detail"
fi
pass "mentor.class-record.detail" "recordId=${CHAIN_MENTOR_RECORD_ID}"

class_record_payload="$(jq -cn \
  --argjson studentId "${CHAIN_STUDENT_ID}" \
  --arg classDate "${CHAIN_CLASS_AT}" \
  '{
    studentId: $studentId,
    courseType: "position_coaching",
    classStatus: "case_prep",
    classDate: $classDate,
    durationHours: 1.5,
    topics: "runtime topics",
    comments: "runtime comments",
    feedbackContent: "runtime feedback"
  }')"
class_record_response="$(request_json POST /lead-mentor/class-records "${class_record_payload}" "${LEAD_TOKEN}")"
CHAIN_RECORD_ID="$(json_required '.data.recordId // .recordId' "${class_record_response}")"
pass "lead.class-record.create" "recordId=${CHAIN_RECORD_ID}"

request_json GET /admin/class-record/list "" "${ADMIN_TOKEN}" >/dev/null
pass "admin.class-record.list" "student=${CHAIN_STUDENT_NAME}"
request_json GET /admin/class-record/stats "" "${ADMIN_TOKEN}" >/dev/null
pass "admin.class-record.stats" "student=${CHAIN_STUDENT_NAME}"

assistant_class_list="$(request_json GET "/admin/class-record/list?keyword=$(uri_encode "${CHAIN_STUDENT_NAME}")" "" "${ASSISTANT_TOKEN}")"
assistant_class_row="$(jq -c --arg name "${CHAIN_STUDENT_NAME}" '.rows[] | select(.studentName == $name)' <<<"${assistant_class_list}" 2>/dev/null | head -n1 || true)"
if [[ -z "${assistant_class_row}" ]]; then
  fail "assistant.class-record.list" "assistant cannot see owned class record"
fi
pass "assistant.class-record.list" "recordId=$(json_required '.recordId' "${assistant_class_row}")"

request_json GET "/admin/class-record/stats?keyword=$(uri_encode "${CHAIN_STUDENT_NAME}")" "" "${ASSISTANT_TOKEN}" >/dev/null
pass "assistant.class-record.stats" "student=${CHAIN_STUDENT_NAME}"

admin_report_detail_before="$(request_json GET "/admin/report/${CHAIN_RECORD_ID}" "" "${ADMIN_TOKEN}")"
pass "admin.report.detail" "recordId=$(json_required '.data.recordId // .recordId' "${admin_report_detail_before}")"
mentor_report_reject_response="$(request_json PUT "/admin/report/${CHAIN_MENTOR_RECORD_ID}/reject" '{"remark":"runtime reject"}' "${ADMIN_TOKEN}")"
if [[ "$(jq -r '.status // .data.status // empty' <<<"${mentor_report_reject_response}")" != "rejected" ]]; then
  fail "admin.report.reject" "mentor record reject did not persist"
fi
pass "admin.report.reject" "recordId=${CHAIN_MENTOR_RECORD_ID}"
request_json PUT "/admin/report/${CHAIN_RECORD_ID}/approve" '{"remark":"runtime approve"}' "${ADMIN_TOKEN}" >/dev/null
pass "admin.report.approve" "recordId=${CHAIN_RECORD_ID}"

student_class_meta="$(request_json GET /student/class-records/meta "" "${STUDENT_CHAIN_TOKEN}")"
pass "student.class-record.meta" "tags=$(json_required '.data.ratingDialog.tagOptions | length' "${student_class_meta}")"
student_class_row="$(find_student_class_record "${CHAIN_RECORD_ID}" || true)"
if [[ -z "${student_class_row}" ]]; then
  fail "student.class-record.list" "student cannot see approved class record"
fi
student_visible_record_id="$(json_required '.recordId' "${student_class_row}")"
pass "student.class-record.list" "recordId=${student_visible_record_id}"

rate_payload="$(jq -cn --arg recordId "${student_visible_record_id}" --arg tag "$(json_required '.data.ratingDialog.tagOptions[0].value' "${student_class_meta}")" '{recordId: $recordId, rating: 5, tags: [$tag], feedback: "runtime rated"}')"
request_json POST /student/class-records/rate "${rate_payload}" "${STUDENT_CHAIN_TOKEN}" >/dev/null
pass "student.class-record.rate" "recordId=${student_visible_record_id}"

admin_report_list="$(request_json GET "/admin/report/list?keyword=$(uri_encode "${CHAIN_STUDENT_NAME}")" "" "${ADMIN_TOKEN}")"
admin_report_row="$(jq -c --arg name "${CHAIN_STUDENT_NAME}" '.rows[] | select(.studentName == $name)' <<<"${admin_report_list}" 2>/dev/null | head -n1 || true)"
if [[ -z "${admin_report_row}" ]]; then
  fail "admin.report.list" "admin cannot see approved class record"
fi
pass "admin.report.list" "recordId=$(json_required '.recordId' "${admin_report_row}")"

if [[ "${CLEAN_CHAIN_AFTER}" == "1" ]]; then
  cleanup_chain_data
fi

echo "=== osg five-end runtime closure: complete ==="
