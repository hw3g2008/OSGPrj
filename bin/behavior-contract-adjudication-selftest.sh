#!/usr/bin/env bash
set -euo pipefail

FINAL_GATE="bin/final-gate.sh"
FINAL_CLOSURE="bin/final-closure.sh"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

[[ -f "${FINAL_GATE}" ]] || fail "${FINAL_GATE} missing"
[[ -f "${FINAL_CLOSURE}" ]] || fail "${FINAL_CLOSURE} missing"

grep -q "BEHAVIOR_CONTRACT_ALLOW_DOWNSTREAM" "${FINAL_GATE}" \
  || fail "final-gate missing manual behavior adjudication env flag"
grep -q "behavior_contract_adjudication_status=" "${FINAL_GATE}" \
  || fail "final-gate missing behavior adjudication status logging"
grep -q "behavior_contract_adjudication_reason=" "${FINAL_GATE}" \
  || fail "final-gate missing behavior adjudication reason logging"
grep -q "behavior_contract_guard failed" "${FINAL_GATE}" \
  || fail "final-gate missing behavior adjudication warning branch"
if grep -q 'rm -f "${BEHAVIOR_CONTRACT_REPORT}"' "bin/e2e-api-gate.sh"; then
  fail "e2e-api-gate must not delete behavior contract report before full e2e"
fi

grep -q "BEHAVIOR_CONTRACT_ALLOW_DOWNSTREAM" "${FINAL_CLOSURE}" \
  || fail "final-closure missing manual behavior adjudication env flag"
grep -q "behavior_contract_status:" "${FINAL_CLOSURE}" \
  || fail "final-closure missing behavior adjudication status report"
grep -q "behavior_contract_adjudication_reason:" "${FINAL_CLOSURE}" \
  || fail "final-closure missing behavior adjudication reason report"

echo "PASS: behavior-contract-adjudication-selftest"
