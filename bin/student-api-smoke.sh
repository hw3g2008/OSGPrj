#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:28080}"
STUDENT_USERNAME="${STUDENT_USERNAME:-student_demo}"
STUDENT_PASSWORD="${STUDENT_PASSWORD:-student123}"
REQUEST_TIMEOUT_SECONDS="${REQUEST_TIMEOUT_SECONDS:-20}"
SMOKE_TAG="${SMOKE_TAG:-student-api-smoke-$(date +%Y%m%d%H%M%S)}"
TODAY="${TODAY:-$(date +%F)}"

TOKEN=""

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

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "dependency" "missing command: $1"
}

request_json() {
  local method="$1"
  local path="$2"
  local body="${3-}"
  local url="${BASE_URL}${path}"
  local response_file
  local http_code
  response_file="$(mktemp "${TMPDIR:-/tmp}/student-api-smoke.response.XXXXXX")"

  local curl_args=(
    -sS
    --max-time "${REQUEST_TIMEOUT_SECONDS}"
    -X "${method}"
    -H "Accept: application/json"
    -o "${response_file}"
    -w "%{http_code}"
  )

  if [[ -n "${TOKEN}" ]]; then
    curl_args+=(-H "Authorization: Bearer ${TOKEN}")
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

jq_required() {
  local expression="$1"
  local input="$2"
  local value

  if ! value="$(jq -r "${expression}" <<<"${input}" 2>/dev/null)"; then
    fail "jq ${expression}" "${input}"
  fi

  if [[ -z "${value}" || "${value}" == "null" ]]; then
    fail "jq ${expression}" "${input}"
  fi

  printf '%s' "${value}"
}

retry_applications_until_present() {
  local expected_position_id="$1"
  local applications_response=""
  local count="0"

  for _ in {1..5}; do
    applications_response="$(request_json GET /student/application/list)"
    count="$(jq -r '.data.applications | length' <<<"${applications_response}")"
    if jq -e --argjson expectedId "${expected_position_id}" '.data.applications | map(.id) | index($expectedId)' \
      >/dev/null 2>&1 <<<"${applications_response}"; then
      printf '%s' "${applications_response}"
      return
    fi
    if [[ "${count}" != "0" ]]; then
      printf '%s' "${applications_response}"
      return
    fi
    sleep 1
  done

  fail "applications.list" "expected non-empty applications after apply"
}

require_cmd curl
require_cmd jq

echo "=== student api smoke ==="
echo "base=${BASE_URL}"
echo "user=${STUDENT_USERNAME}"
echo "tag=${SMOKE_TAG}"

login_payload="$(jq -cn \
  --arg username "${STUDENT_USERNAME}" \
  --arg password "${STUDENT_PASSWORD}" \
  '{username: $username, password: $password}')"
login_response="$(request_json POST /student/login "${login_payload}")"
TOKEN="$(jq_required '.token // .data.token' "${login_response}")"
pass "login" "user=${STUDENT_USERNAME}"

get_info_response="$(request_json GET /getInfo)"
logged_in_user="$(jq_required '.data.user.userName // .user.userName' "${get_info_response}")"
pass "getInfo" "user=${logged_in_user}"

positions_response="$(request_json GET /student/position/list)"
positions_count="$(jq_required '.data | length' "${positions_response}")"
if (( positions_count <= 0 )); then
  fail "positions.list" "position list is empty"
fi
pass "positions.list" "count=${positions_count}"

position_meta_response="$(request_json GET /student/position/meta)"
apply_method="$(jq_required '.data.filterOptions.applyMethods[0].value' "${position_meta_response}")"
progress_stage="$(jq_required '.data.filterOptions.progressStages[0].value' "${position_meta_response}")"
coaching_stage="$(jq_required '.data.filterOptions.coachingStages[0].value' "${position_meta_response}")"
mentor_count="$(jq_required '.data.filterOptions.mentorCounts[0].value' "${position_meta_response}")"
manual_category="$(jq_required '.data.filterOptions.categories[0].value' "${position_meta_response}")"
manual_location="$(
  jq -er '.data.filterOptions.locations[0].value // .data.filterOptions.locations[0].label' \
    <<<"${position_meta_response}" 2>/dev/null || true
)"
manual_location="${manual_location:-Hong Kong}"
pass "positions.meta" "applyMethod=${apply_method}"

target_position_json="$(
  jq -c '(.data | map(select(.applied == false)) | .[0]) // .data[0]' <<<"${positions_response}"
)"
target_position_id="$(jq_required '.id' "${target_position_json}")"
target_position_title="$(jq_required '.title' "${target_position_json}")"
target_position_company="$(jq_required '.company' "${target_position_json}")"
original_favorited="$(jq_required '.favorited' "${target_position_json}")"

toggle_favorited="true"
if [[ "${original_favorited}" == "true" ]]; then
  toggle_favorited="false"
fi

favorite_toggle_payload="$(jq -cn \
  --argjson positionId "${target_position_id}" \
  --argjson favorited "${toggle_favorited}" \
  '{positionId: $positionId, favorited: $favorited}')"
favorite_restore_payload="$(jq -cn \
  --argjson positionId "${target_position_id}" \
  --argjson favorited "${original_favorited}" \
  '{positionId: $positionId, favorited: $favorited}')"
request_json POST /student/position/favorite "${favorite_toggle_payload}" >/dev/null
request_json POST /student/position/favorite "${favorite_restore_payload}" >/dev/null
pass "positions.favorite" "positionId=${target_position_id}"

apply_payload="$(jq -cn \
  --argjson positionId "${target_position_id}" \
  --arg date "${TODAY}" \
  --arg method "${apply_method}" \
  --arg note "${SMOKE_TAG} apply" \
  '{positionId: $positionId, applied: true, date: $date, method: $method, note: $note}')"
request_json POST /student/position/apply "${apply_payload}" >/dev/null
pass "positions.apply" "positionId=${target_position_id}"

progress_payload="$(jq -cn \
  --argjson positionId "${target_position_id}" \
  --arg stage "${progress_stage}" \
  --arg notes "${SMOKE_TAG} progress" \
  '{positionId: $positionId, stage: $stage, notes: $notes}')"
request_json POST /student/position/progress "${progress_payload}" >/dev/null
pass "positions.progress" "stage=${progress_stage}"

coaching_payload="$(jq -cn \
  --argjson positionId "${target_position_id}" \
  --arg stage "${coaching_stage}" \
  --arg mentorCount "${mentor_count}" \
  --arg note "${SMOKE_TAG} coaching" \
  '{positionId: $positionId, stage: $stage, mentorCount: $mentorCount, note: $note}')"
request_json POST /student/position/coaching "${coaching_payload}" >/dev/null
pass "positions.coaching" "mentorCount=${mentor_count}"

manual_title="Smoke Position ${SMOKE_TAG}"
manual_payload="$(jq -cn \
  --arg category "${manual_category}" \
  --arg title "${manual_title}" \
  --arg company "Smoke Company" \
  --arg location "${manual_location}" \
  '{category: $category, title: $title, company: $company, location: $location}')"
manual_response="$(request_json POST /student/position/manual "${manual_payload}")"
manual_position_id="$(jq_required '.data.positionId' "${manual_response}")"
pass "positions.manual" "positionId=${manual_position_id}"

applications_response="$(retry_applications_until_present "${target_position_id}")"
applications_count="$(jq_required '.data.applications | length' "${applications_response}")"
pass "applications.list" "count=${applications_count}"

applications_meta_response="$(request_json GET /student/application/meta)"
applications_all_count="$(jq_required '.data.tabCounts.all' "${applications_meta_response}")"
pass "applications.meta" "all=${applications_all_count}"

mock_overview_response="$(request_json GET /student/mock-practice/overview)"
practice_records_count="$(jq_required '.data.practiceRecords | length' "${mock_overview_response}")"
request_records_count="$(jq_required '.data.requestRecords | length' "${mock_overview_response}")"
pass "mock-practice.overview" "practice=${practice_records_count}, requests=${request_records_count}"

mock_meta_response="$(request_json GET /student/mock-practice/meta)"
practice_type="$(jq_required '.data.practiceCards[0].id' "${mock_meta_response}")"
practice_mentor_count="$(jq_required '.data.practiceForm.mentorCountOptions[0].value' "${mock_meta_response}")"
request_course_type="$(jq_required '.data.requestCourseOptions[0].value' "${mock_meta_response}")"
request_company="$(jq_required '.data.requestForm.companyOptions[0].value' "${mock_meta_response}")"
request_status="$(jq_required '.data.requestForm.jobStatusOptions[0].value' "${mock_meta_response}")"
pass "mock-practice.meta" "practiceType=${practice_type}"

practice_request_payload="$(jq -cn \
  --arg type "${practice_type}" \
  --arg reason "${SMOKE_TAG} reason" \
  --arg mentorCount "${practice_mentor_count}" \
  --arg preferredMentor "" \
  --arg excludedMentor "" \
  --arg remark "${SMOKE_TAG} practice" \
  '{type: $type, reason: $reason, mentorCount: $mentorCount, preferredMentor: $preferredMentor, excludedMentor: $excludedMentor, remark: $remark}')"
practice_request_response="$(request_json POST /student/mock-practice/practice-request "${practice_request_payload}")"
practice_request_id="$(jq_required '.data.requestId' "${practice_request_response}")"
pass "mock-practice.practice-request" "requestId=${practice_request_id}"

class_request_payload="$(jq -cn \
  --arg courseType "${request_course_type}" \
  --arg company "${request_company}" \
  --arg status "${request_status}" \
  --arg remark "${SMOKE_TAG} class-request" \
  '{courseType: $courseType, company: $company, status: $status, remark: $remark}')"
class_request_response="$(request_json POST /student/mock-practice/class-request "${class_request_payload}")"
class_request_id="$(jq_required '.data.requestId' "${class_request_response}")"
pass "mock-practice.class-request" "requestId=${class_request_id}"

class_records_meta_response="$(request_json GET /student/class-records/meta)"
class_records_list_response="$(request_json GET /student/class-records/list)"
class_records_count="$(jq_required '.data.records | length' "${class_records_list_response}")"
pass "class-records.list" "count=${class_records_count}"

rate_record_json="$(
  jq -c '(.data.records | map(select(.actionKind == "rate")) | .[0]) // .data.records[0] // empty' \
    <<<"${class_records_list_response}"
)"
if [[ -z "${rate_record_json}" ]]; then
  fail "class-records.rate" "class records list is empty"
fi

rate_record_id="$(jq_required '.recordId' "${rate_record_json}")"
rate_tag_value="$(jq_required '.data.ratingDialog.tagOptions[0].value' "${class_records_meta_response}")"
rate_payload="$(jq -cn \
  --arg recordId "${rate_record_id}" \
  --arg tag "${rate_tag_value}" \
  --arg feedback "${SMOKE_TAG} feedback" \
  '{recordId: $recordId, rating: 5, tags: [$tag], feedback: $feedback}')"
request_json POST /student/class-records/rate "${rate_payload}" >/dev/null
pass "class-records.rate" "recordId=${rate_record_id}"

profile_response="$(request_json GET /student/profile)"
profile_payload="$(jq -c '.data.profile | {
  school,
  major,
  graduationYear,
  highSchool,
  postgraduatePlan,
  visaStatus,
  recruitmentCycle,
  targetRegion,
  primaryDirection,
  secondaryDirection,
  phone,
  wechatId
}' <<<"${profile_response}")"
if [[ -z "${profile_payload}" || "${profile_payload}" == "null" ]]; then
  fail "profile.get" "profile payload is empty"
fi
pass "profile.get" "studentCode=$(jq_required '.data.profile.studentCode' "${profile_response}")"

request_json PUT /student/profile "${profile_payload}" >/dev/null
pass "profile.update" "positionTarget=${target_position_company} / ${target_position_title}"

echo "=== student api smoke: complete ==="
