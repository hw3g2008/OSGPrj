#!/usr/bin/env bash
set -euo pipefail

FINAL_GATE="bin/final-gate.sh"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

[[ -f "${FINAL_GATE}" ]] || fail "${FINAL_GATE} missing"
[[ -f "bin/redis-cli" ]] || fail "bin/redis-cli missing"

grep -q "apply_module_login_contract_defaults()" "${FINAL_GATE}" \
  || fail "final-gate missing module login contract resolver"
grep -q 'assistant)' "${FINAL_GATE}" \
  || fail "final-gate missing assistant login contract branch"
grep -q 'LOGIN_PATH="${LOGIN_PATH:-/assistant/login}"' "${FINAL_GATE}" \
  || fail "final-gate missing assistant login path default"
grep -q 'lead-mentor)' "${FINAL_GATE}" \
  || fail "final-gate missing lead-mentor login contract branch"
grep -q 'E2E_ADMIN_USERNAME="${E2E_ADMIN_USERNAME:-student_demo}"' "${FINAL_GATE}" \
  || fail "final-gate missing lead-mentor username default"
grep -q 'E2E_ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-student123}"' "${FINAL_GATE}" \
  || fail "final-gate missing lead-mentor password default"
grep -q 'LOGIN_PATH="${LOGIN_PATH:-/lead-mentor/login}"' "${FINAL_GATE}" \
  || fail "final-gate missing lead-mentor login path default"
grep -q 'export PATH="${SCRIPT_DIR}:${PATH}"' "${FINAL_GATE}" \
  || fail "final-gate missing repo bin PATH bootstrap"

echo "PASS: final-gate-login-contract-selftest"
