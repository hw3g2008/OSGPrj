#!/usr/bin/env bash
# UI visual gate
# Usage:
#   bash bin/ui-visual-gate.sh [module]
set -euo pipefail

MODULE="${1:-permission}"
DATE_STR="$(date +%Y-%m-%d)"
AUDIT_DIR="osg-spec-docs/tasks/audit"
CONTRACT_PATH="osg-spec-docs/docs/01-product/prd/${MODULE}/UI-VISUAL-CONTRACT.yaml"
SUMMARY_JSON="${AUDIT_DIR}/ui-visual-contract-summary-${MODULE}-${DATE_STR}.json"
PAGE_REPORT_JSON="${AUDIT_DIR}/ui-visual-page-report-${MODULE}-${DATE_STR}.json"
TRUTH_SUMMARY_JSON="${AUDIT_DIR}/ui-visual-truth-source-summary-${MODULE}-${DATE_STR}.json"
CRITICAL_EVIDENCE_SUMMARY_JSON="${AUDIT_DIR}/ui-critical-evidence-summary-${MODULE}-${DATE_STR}.json"
LOG_FILE="${UI_VISUAL_GATE_LOG:-${AUDIT_DIR}/ui-visual-gate-${MODULE}-${DATE_STR}.log}"

mkdir -p "${AUDIT_DIR}"

print_page_report_summary() {
  python3 - <<PY
import json
from pathlib import Path
report = json.loads(Path("${PAGE_REPORT_JSON}").read_text(encoding="utf-8"))
print(
    "INFO: page_report_summary "
    f"total={report.get('total_pages', 0)} "
    f"pass={report.get('pass_pages', 0)} "
    f"fail={report.get('fail_pages', 0)} "
    f"not_run={report.get('not_run_pages', 0)} "
    f"style_passed={report.get('style_assertions_passed', 0)} "
    f"style_failed={report.get('style_assertions_failed', 0)} "
    f"state_executed={report.get('state_cases_executed', 0)} "
    f"state_failed={report.get('state_cases_failed', 0)} "
    f"critical_total={report.get('critical_surfaces_total', 0)} "
    f"critical_failed={report.get('critical_surfaces_failed', 0)} "
    f"surfaces_total={report.get('surfaces_total', 0)} "
    f"surfaces_failed={report.get('surfaces_failed', 0)}"
)
for page in report.get("pages", []):
    print(
        "INFO: page_structured "
        f"page_id={page.get('page_id')} "
        f"baseline_ref={page.get('baseline_ref')} "
        f"actual_ref={page.get('actual_ref')} "
        f"diff_ref={page.get('diff_ref')} "
        f"diff_threshold={page.get('diff_threshold')} "
        f"data_mode={page.get('data_mode', 'live')} "
        f"fixture_route_count={page.get('fixture_route_count', 0)} "
        f"dynamic_region_count={page.get('dynamic_region_count', 0)} "
        f"style_assertions_passed={page.get('style_assertions_passed', 0)} "
        f"style_assertions_failed={page.get('style_assertions_failed', 0)} "
        f"state_cases_executed={page.get('state_cases_executed', 0)} "
        f"state_cases_failed={page.get('state_cases_failed', 0)} "
        f"critical_surfaces_total={len(page.get('critical_surface_results', []) or [])} "
        f"critical_surfaces_failed={sum(1 for s in (page.get('critical_surface_results', []) or []) if isinstance(s, dict) and s.get('result') == 'FAIL')} "
        f"result={page.get('result')}"
    )
for surface in report.get("surfaces", []):
    print(
        "INFO: surface_structured "
        f"surface_id={surface.get('surface_id')} "
        f"host_page_id={surface.get('host_page_id')} "
        f"surface_type={surface.get('surface_type')} "
        f"trigger_action_type={surface.get('trigger_action_type')} "
        f"viewport_variants_total={surface.get('viewport_variants_total', 0)} "
        f"viewport_variants_executed={surface.get('viewport_variants_executed', 0)} "
        f"viewport_variants_failed={surface.get('viewport_variants_failed', 0)} "
        f"result={surface.get('result')}"
    )
PY
}

{
  echo "=== UI Visual Gate: module=${MODULE} ==="
  echo "INFO: contract=${CONTRACT_PATH}"
  echo "INFO: source=app (verify)"

  MANIFEST_JSON="$(python3 - <<PY
from pathlib import Path
audit = Path("${AUDIT_DIR}")
files = sorted(
    audit.glob("ui-visual-baseline-manifest-${MODULE}-*.json"),
    key=lambda p: p.stat().st_mtime,
    reverse=True,
)
print(str(files[0]) if files else "")
PY
)"
  if [[ -z "${MANIFEST_JSON}" ]]; then
    echo "VISUAL_FAIL: no ui visual manifest found for module=${MODULE} in ${AUDIT_DIR}"
    exit 12
  fi
  echo "INFO: manifest_ref=${MANIFEST_JSON}"

  if ! python3 .claude/skills/workflow-engine/tests/ui_visual_truth_source_guard.py \
    --manifest "${MANIFEST_JSON}" \
    --contract "${CONTRACT_PATH}" \
    --output-json "${TRUTH_SUMMARY_JSON}"; then
    echo "VISUAL_FAIL: ui_visual_truth_source_guard failed"
    exit 12
  fi

  read -r manifest_source contract_sha256 prototype_sha256 <<EOF
$(python3 - <<PY
import json
from pathlib import Path
data = json.loads(Path("${TRUTH_SUMMARY_JSON}").read_text(encoding="utf-8"))
print(data.get("source", ""), data.get("contract_sha256", ""), data.get("prototype_sha256", ""))
PY
)
EOF
  echo "INFO: manifest_source=${manifest_source}"
  echo "INFO: contract_sha256=${contract_sha256}"
  echo "INFO: prototype_sha256=${prototype_sha256}"

  if ! python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py \
    --contract "${CONTRACT_PATH}" \
    --output-json "${SUMMARY_JSON}"; then
    echo "VISUAL_FAIL: ui_visual_contract_guard failed"
    exit 12
  fi

  read -r total_pages baseline_existing baseline_missing <<EOF
$(python3 - <<PY
import json
from pathlib import Path
data = json.loads(Path("${SUMMARY_JSON}").read_text(encoding="utf-8"))
print(data.get("total_pages", 0), data.get("baseline_existing", 0), data.get("baseline_missing", 0))
PY
)
EOF

  echo "INFO: baseline_coverage=${baseline_existing}/${total_pages}"
  echo "INFO: baseline_missing=${baseline_missing}"
  if [[ "${baseline_missing}" != "0" ]]; then
    echo "VISUAL_FAIL: missing baseline files (${baseline_missing})"
    exit 12
  fi

  if ! bash bin/ui-visual-baseline.sh "${MODULE}" --mode verify --source app; then
    if [[ -f "${PAGE_REPORT_JSON}" ]]; then
      echo "INFO: page_report=${PAGE_REPORT_JSON}"
      print_page_report_summary
    fi
    echo "VISUAL_FAIL: ui-visual-baseline verify failed"
    exit 12
  fi

  if [[ ! -f "${PAGE_REPORT_JSON}" ]]; then
    echo "VISUAL_FAIL: missing page report (${PAGE_REPORT_JSON})"
    exit 12
  fi

  if ! python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py \
    --contract "${CONTRACT_PATH}" \
    --page-report "${PAGE_REPORT_JSON}" \
    --stage ui-visual-gate \
    --output-json "${CRITICAL_EVIDENCE_SUMMARY_JSON}"; then
    echo "VISUAL_FAIL: ui_critical_evidence_guard failed"
    exit 12
  fi

  echo "INFO: page_report=${PAGE_REPORT_JSON}"
  print_page_report_summary

  echo "PASS: ui-visual-gate"
} 2>&1 | tee "${LOG_FILE}"
