#!/usr/bin/env bash
set -euo pipefail

SCRIPT="bin/ui-visual-case-verify.sh"
BASELINE_SCRIPT="bin/ui-visual-baseline.sh"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

[[ -f "${SCRIPT}" ]] || fail "${SCRIPT} missing"
[[ -f "${BASELINE_SCRIPT}" ]] || fail "${BASELINE_SCRIPT} missing"

grep -q "context-preflight.sh dev" "${SCRIPT}" || fail "missing context-preflight dev wiring"
grep -q "runtime-port-guard.sh --mode converge-runtime --target dev-local --context ui-visual-case-verify" "${SCRIPT}" \
  || fail "missing runtime convergence wiring"
grep -q "UI_VISUAL_GREP_TAG=" "${SCRIPT}" || fail "missing visual grep override wiring"
grep -q "UI_VISUAL_SKIP_STATE=1" "${SCRIPT}" || fail "missing state skip wiring"
grep -q "bin/ui-visual-baseline.sh" "${SCRIPT}" || fail "missing baseline wrapper call"
if grep -q "update-snapshots" "${SCRIPT}"; then
  fail "single-case verify must not update snapshots"
fi

grep -q 'UI_VISUAL_GREP_TAG="${UI_VISUAL_GREP_TAG:-@ui-visual}"' "${BASELINE_SCRIPT}" \
  || fail "baseline script missing UI_VISUAL_GREP_TAG override"
grep -q 'UI_VISUAL_SKIP_STATE="${UI_VISUAL_SKIP_STATE:-0}"' "${BASELINE_SCRIPT}" \
  || fail "baseline script missing UI_VISUAL_SKIP_STATE override"

if bash "${SCRIPT}" permission >/tmp/ui-visual-case-verify-selftest.log 2>&1; then
  fail "script should reject missing case id"
fi
grep -q "Usage:" /tmp/ui-visual-case-verify-selftest.log || fail "missing usage output for invalid invocation"
rm -f /tmp/ui-visual-case-verify-selftest.log

echo "PASS: ui-visual-case-verify-selftest"
