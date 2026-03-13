#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="sql"
OUT_DIR="deploy/mysql-init"
MODE="${1:-generate}"
MANIFEST_PATH="${OUT_DIR}/manifest.sha256"
CHARSET_PREAMBLE='SET NAMES utf8mb4;'

if [[ "${MODE}" != "generate" && "${MODE}" != "--check" ]]; then
  echo "FAIL: 未识别参数 ${MODE}（仅支持: generate | --check）" >&2
  exit 1
fi

declare -a MAPPINGS=(
  "00:ry_20250522.sql"
  "01:quartz.sql"
  "02:osg_menu_init.sql"
  "03:osg_role_init.sql"
  "04:osg_role_menu_init.sql"
  "05:osg_user_init.sql"
  "06:osg_alter_user_first_login.sql"
  # === admin 端业务表 ===
  "07:osg_student_init.sql"
  "08:osg_contract_init.sql"
  "09:osg_student_change_request_init.sql"
  "10:osg_staff_init.sql"
  "11:osg_staff_schedule_init.sql"
  "12:osg_position_init.sql"
  "13:osg_student_position_init.sql"
  "14:osg_job_application_init.sql"
  "15:osg_mock_practice_init.sql"
  "16:osg_class_record_init.sql"
  "17:osg_finance_settlement_init.sql"
  "18:osg_expense_init.sql"
  "19:osg_file_init.sql"
  "20:osg_test_bank_init.sql"
  "21:osg_interview_bank_init.sql"
  "22:osg_interview_question_init.sql"
  "23:osg_notice_init.sql"
  "24:osg_mailjob_init.sql"
  "25:osg_complaint_init.sql"
)

hash_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    echo "FAIL: 未找到 sha256sum/shasum，无法生成或校验 manifest" >&2
    exit 1
  fi
}

write_wrapped_sql() {
  local src_file="$1"
  local out_file="$2"
  printf '%s\n\n' "${CHARSET_PREAMBLE}" > "${out_file}"
  cat "${src_file}" >> "${out_file}"
}

verify_wrapped_sql() {
  local src_file="$1"
  local out_file="$2"
  local expected_file
  expected_file="$(mktemp)"
  printf '%s\n\n' "${CHARSET_PREAMBLE}" > "${expected_file}"
  cat "${src_file}" >> "${expected_file}"
  if ! cmp -s "${expected_file}" "${out_file}"; then
    rm -f "${expected_file}"
    return 1
  fi
  rm -f "${expected_file}"
  return 0
}

for mapping in "${MAPPINGS[@]}"; do
  prefix="${mapping%%:*}"
  src_file="${mapping##*:}"
  src_path="${SRC_DIR}/${src_file}"
  out_path="${OUT_DIR}/${prefix}_${src_file}"

  if [[ ! -f "${src_path}" ]]; then
    echo "FAIL: 缺少 SQL 文件 ${src_path}" >&2
    exit 1
  fi
  if [[ ! -s "${src_path}" ]]; then
    echo "FAIL: SQL 文件为空 ${src_path}" >&2
    exit 1
  fi

  if [[ "${MODE}" == "--check" ]]; then
    if [[ ! -f "${out_path}" ]]; then
      echo "FAIL: 缺少生成文件 ${out_path}" >&2
      exit 1
    fi
    if [[ ! -s "${out_path}" ]]; then
      echo "FAIL: 生成文件为空 ${out_path}" >&2
      exit 1
    fi
    if ! verify_wrapped_sql "${src_path}" "${out_path}"; then
      echo "FAIL: 生成文件与源文件不一致，请先执行: bash bin/prepare-mysql-init.sh" >&2
      echo "      src=${src_path}" >&2
      echo "      out=${out_path}" >&2
      exit 1
    fi
  fi
done

if [[ "${MODE}" != "--check" ]]; then
  mkdir -p "${OUT_DIR}"
  rm -f "${OUT_DIR}"/[0-9][0-9]_*.sql

  for mapping in "${MAPPINGS[@]}"; do
    prefix="${mapping%%:*}"
    src_file="${mapping##*:}"
    src_path="${SRC_DIR}/${src_file}"
    out_path="${OUT_DIR}/${prefix}_${src_file}"
    write_wrapped_sql "${src_path}" "${out_path}"
    echo "generated: ${out_path}"
  done

  : > "${MANIFEST_PATH}"
  for mapping in "${MAPPINGS[@]}"; do
    prefix="${mapping%%:*}"
    src_file="${mapping##*:}"
    out_file="${prefix}_${src_file}"
    out_path="${OUT_DIR}/${out_file}"
    printf "%s  %s\n" "$(hash_file "${out_path}")" "${out_file}" >> "${MANIFEST_PATH}"
  done
  echo "generated: ${MANIFEST_PATH}"
fi

expected_count="${#MAPPINGS[@]}"
count="$(find "${OUT_DIR}" -maxdepth 1 -type f -name '[0-9][0-9]_*.sql' | wc -l | tr -d ' ')"
if [[ "${count}" != "${expected_count}" ]]; then
  echo "FAIL: 生成数量异常，期望 ${expected_count}，实际 ${count}" >&2
  exit 1
fi

if [[ "${MODE}" == "--check" ]]; then
  if [[ ! -f "${MANIFEST_PATH}" ]]; then
    echo "FAIL: 缺少 manifest 文件 ${MANIFEST_PATH}" >&2
    exit 1
  fi
  if [[ ! -s "${MANIFEST_PATH}" ]]; then
    echo "FAIL: manifest 文件为空 ${MANIFEST_PATH}" >&2
    exit 1
  fi

  expected_manifest="$(mktemp)"
  cleanup() { rm -f "${expected_manifest}"; }
  trap cleanup EXIT
  : > "${expected_manifest}"
  for mapping in "${MAPPINGS[@]}"; do
    prefix="${mapping%%:*}"
    src_file="${mapping##*:}"
    out_file="${prefix}_${src_file}"
    out_path="${OUT_DIR}/${out_file}"
    printf "%s  %s\n" "$(hash_file "${out_path}")" "${out_file}" >> "${expected_manifest}"
  done

  if ! cmp -s "${MANIFEST_PATH}" "${expected_manifest}"; then
    echo "FAIL: manifest 与当前 deploy/mysql-init 文件不一致，请先执行: bash bin/prepare-mysql-init.sh" >&2
    exit 1
  fi
fi

if [[ "${MODE}" == "--check" ]]; then
  echo "PASS: deploy/mysql-init 与 sql/ 源文件一致（${#MAPPINGS[@]} 个），manifest 校验通过"
else
  echo "PASS: deploy/mysql-init 已生成 ${#MAPPINGS[@]} 个初始化 SQL + manifest"
fi
