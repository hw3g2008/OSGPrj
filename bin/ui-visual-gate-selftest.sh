#!/usr/bin/env bash
set -euo pipefail

UI_VISUAL_GATE="bin/ui-visual-gate.sh"
FINAL_GATE="bin/final-gate.sh"
FINAL_CLOSURE="bin/final-closure.sh"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

[[ -f "${UI_VISUAL_GATE}" ]] || fail "${UI_VISUAL_GATE} missing"
[[ -f "${FINAL_GATE}" ]] || fail "${FINAL_GATE} missing"
[[ -f "${FINAL_CLOSURE}" ]] || fail "${FINAL_CLOSURE} missing"

grep -q "ui_visual_contract_guard.py" "${UI_VISUAL_GATE}" \
  || fail "ui-visual-gate missing contract guard"
grep -q "ui_critical_evidence_guard.py" "${UI_VISUAL_GATE}" \
  || fail "ui-visual-gate missing critical evidence guard"
grep -q "runtime-port-guard.sh --mode converge-runtime --target dev-local --context ui-visual-gate" "${UI_VISUAL_GATE}" \
  || fail "ui-visual-gate missing single runtime convergence"
grep -q 'DEV_ENV_FILE="${DEV_ENV_FILE:-deploy/.env.dev}"' "${UI_VISUAL_GATE}" \
  || fail "ui-visual-gate missing DEV_ENV_FILE default"
grep -q 'bash bin/backend-dev-server.sh start "${DEV_ENV_FILE}"' "${UI_VISUAL_GATE}" \
  || fail "ui-visual-gate missing backend start wiring"
grep -q "ui_delivery_required_repair_chain" "${UI_VISUAL_GATE}" \
  || fail "ui-visual-gate missing required repair chain wiring"

grep -q 'bash bin/ui-visual-gate.sh "${MODULE}"' "${FINAL_GATE}" \
  || fail "final-gate missing ui-visual-gate handoff"
grep -q "UI_VISUAL_PAGE_REPORT" "${FINAL_GATE}" \
  || fail "final-gate missing ui visual page report wiring"
grep -q "ui_critical_evidence_guard.py" "${FINAL_GATE}" \
  || fail "final-gate missing critical evidence guard"
grep -q "ui_delivery_required_repair_chain" "${FINAL_GATE}" \
  || fail "final-gate missing required repair chain wiring"
grep -q "UI_VISUAL_ALLOW_DOWNSTREAM" "${FINAL_GATE}" \
  || fail "final-gate missing manual ui adjudication env flag"
grep -q "ui_critical_evidence_guard skipped due to manual ui adjudication" "${FINAL_GATE}" \
  || fail "final-gate missing adjudicated ui evidence guard bypass"
grep -q "ui_visual_adjudication_status=" "${FINAL_GATE}" \
  || fail "final-gate missing ui adjudication status logging"
grep -q "ui_visual_adjudication_reason=" "${FINAL_GATE}" \
  || fail "final-gate missing ui adjudication reason logging"

grep -q "UI_VISUAL_GATE_LOG" "${FINAL_CLOSURE}" \
  || fail "final-closure missing ui visual gate artifact wiring"
grep -q "UI_VISUAL_PAGE_REPORT" "${FINAL_CLOSURE}" \
  || fail "final-closure missing ui visual page report wiring"
grep -q "ui_delivery_required_repair_chain" "${FINAL_CLOSURE}" \
  || fail "final-closure missing required repair chain wiring"
grep -q 'DEV_ENV_FILE="${DEV_ENV_FILE:-deploy/.env.dev}"' "${FINAL_CLOSURE}" \
  || fail "final-closure missing DEV_ENV_FILE default"
grep -q 'source "${DEV_ENV_FILE}"' "${FINAL_CLOSURE}" \
  || fail "final-closure missing DEV_ENV_FILE sourcing"
grep -q "UI_VISUAL_ALLOW_DOWNSTREAM" "${FINAL_CLOSURE}" \
  || fail "final-closure missing manual ui adjudication env flag"
grep -q "ui_visual_gate_status:" "${FINAL_CLOSURE}" \
  || fail "final-closure missing ui visual adjudication status report"
grep -q "ui_visual_adjudication_reason:" "${FINAL_CLOSURE}" \
  || fail "final-closure missing ui visual adjudication reason report"

grep -q "UI_VISUAL_ALLOW_DOWNSTREAM" "deploy/.env.dev.example" \
  || fail ".env.dev.example missing ui adjudication switch"

echo "PASS: ui-visual-gate-selftest"
