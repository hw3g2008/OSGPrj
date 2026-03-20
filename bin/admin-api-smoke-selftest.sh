#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

# shellcheck disable=SC1090
ADMIN_API_SMOKE_LIB=1 source "${ROOT_DIR}/bin/admin-api-smoke.sh"

quoted_value="$(normalize_redis_value '"11"')"
if [[ "${quoted_value}" != "11" ]]; then
  fail "normalize_redis_value should strip double quotes, got=${quoted_value}"
fi

trimmed_value="$(normalize_redis_value $'  "AbC"\r\n')"
if [[ "${trimmed_value}" != "AbC" ]]; then
  fail "normalize_redis_value should trim whitespace and carriage returns, got=${trimmed_value}"
fi

if normalize_redis_value "(nil)" >/dev/null 2>&1; then
  fail "normalize_redis_value should reject (nil)"
fi

if normalize_redis_value "" >/dev/null 2>&1; then
  fail "normalize_redis_value should reject empty values"
fi

echo "PASS: admin-api-smoke-selftest"
