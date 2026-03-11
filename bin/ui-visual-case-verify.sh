#!/usr/bin/env bash
# Strict single-case UI visual verification entrypoint.
# Usage:
#   bash bin/ui-visual-case-verify.sh <module> <page_id|surface_id>
set -euo pipefail

MODULE="${1:-}"
CASE_ID="${2:-}"
DEV_ENV_FILE="${DEV_ENV_FILE:-deploy/.env.dev}"

usage() {
  cat <<'EOF'
Usage:
  bash bin/ui-visual-case-verify.sh <module> <page_id|surface_id>

Examples:
  bash bin/ui-visual-case-verify.sh permission dashboard
  bash bin/ui-visual-case-verify.sh permission modal-reset-password
EOF
}

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

if [[ -z "${MODULE}" || -z "${CASE_ID}" ]]; then
  usage >&2
  exit 1
fi

CONTRACT_PATH="osg-spec-docs/docs/01-product/prd/${MODULE}/UI-VISUAL-CONTRACT.yaml"
[[ -f "${CONTRACT_PATH}" ]] || fail "contract not found: ${CONTRACT_PATH}"

CASE_KIND="$(
  python3 - "${CONTRACT_PATH}" "${CASE_ID}" <<'PY'
import sys
from pathlib import Path
import yaml

contract_path = Path(sys.argv[1])
case_id = sys.argv[2]
contract = yaml.safe_load(contract_path.read_text(encoding="utf-8")) or {}
pages = {
    (page or {}).get("page_id")
    for page in (contract.get("pages") or [])
    if isinstance(page, dict) and (page or {}).get("page_id")
}
surfaces = {
    (surface or {}).get("surface_id")
    for surface in (contract.get("surfaces") or [])
    if isinstance(surface, dict) and (surface or {}).get("surface_id")
}

in_pages = case_id in pages
in_surfaces = case_id in surfaces
if in_pages and in_surfaces:
    print("AMBIGUOUS")
elif in_pages:
    print("page")
elif in_surfaces:
    print("surface")
else:
    print("")
PY
)"

case "${CASE_KIND}" in
  page|surface) ;;
  AMBIGUOUS)
    fail "case id '${CASE_ID}' is ambiguous between page and surface"
    ;;
  *)
    fail "case id '${CASE_ID}' not found in ${CONTRACT_PATH}"
    ;;
esac

bash bin/context-preflight.sh dev --entrypoint ui-visual-case-verify --env-file "${DEV_ENV_FILE}"
bash bin/runtime-port-guard.sh --mode converge-runtime --target dev-local --context ui-visual-case-verify

export PW_E2E_REUSE_SERVER=1
if ! bash bin/admin-preview-server.sh restart; then
  fail "admin preview server restart failed"
fi

UI_VISUAL_GREP_TAG="${CASE_ID} visual compare @ui-visual" \
UI_VISUAL_SKIP_STATE=1 \
DEV_ENV_FILE="${DEV_ENV_FILE}" \
bash bin/ui-visual-baseline.sh "${MODULE}" --mode verify --source app
