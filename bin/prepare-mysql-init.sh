#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="sql"
OUT_DIR="deploy/mysql-init"
MODE="${1:-generate}"
MANIFEST_PATH="${OUT_DIR}/manifest.sha256"

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
    if ! cmp -s "${src_path}" "${out_path}"; then
      echo "FAIL: 生成文件与源文件不一致，请先执行: bash bin/prepare-mysql-init.sh" >&2
      echo "      src=${src_path}" >&2
      echo "      out=${out_path}" >&2
      exit 1
    fi
  fi
done

if [[ "${MODE}" != "--check" ]]; then
  mkdir -p "${OUT_DIR}"
  rm -f "${OUT_DIR}"/0[0-6]_*.sql

  for mapping in "${MAPPINGS[@]}"; do
    prefix="${mapping%%:*}"
    src_file="${mapping##*:}"
    src_path="${SRC_DIR}/${src_file}"
    out_path="${OUT_DIR}/${prefix}_${src_file}"
    cp "${src_path}" "${out_path}"
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

count="$(find "${OUT_DIR}" -maxdepth 1 -type f -name '0[0-6]_*.sql' | wc -l | tr -d ' ')"
if [[ "${count}" != "7" ]]; then
  echo "FAIL: 生成数量异常，期望 7，实际 ${count}" >&2
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
  echo "PASS: deploy/mysql-init 与 sql/ 源文件一致（7 个），manifest 校验通过"
else
  echo "PASS: deploy/mysql-init 已生成 7 个初始化 SQL + manifest"
fi
