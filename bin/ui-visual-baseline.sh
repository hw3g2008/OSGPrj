#!/usr/bin/env bash
# UI Visual baseline tool
# Usage:
#   bash bin/ui-visual-baseline.sh [module] --mode generate|verify --source prototype|app
set -euo pipefail

MODULE="${1:-permission}"
MODE="verify"
SOURCE=""
DEV_ENV_FILE="${DEV_ENV_FILE:-deploy/.env.dev}"
UI_VISUAL_GREP_TAG="${UI_VISUAL_GREP_TAG:-@ui-visual}"
UI_STATE_GREP_TAG="${UI_STATE_GREP_TAG:-@ui-state}"
UI_VISUAL_SKIP_STATE="${UI_VISUAL_SKIP_STATE:-0}"
if [[ "${MODULE}" == "--mode" ]]; then
  MODULE="permission"
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --mode=*)
      MODE="${1#*=}"
      shift
      ;;
    --source)
      SOURCE="${2:-}"
      shift 2
      ;;
    --source=*)
      SOURCE="${1#*=}"
      shift
      ;;
    *)
      MODULE="$1"
      shift
      ;;
  esac
done

case "${MODE}" in
  generate|verify) ;;
  *)
    echo "FAIL: --mode must be generate|verify, got '${MODE}'"
    exit 16
    ;;
esac

case "${SOURCE}" in
  ""|prototype|app) ;;
  *)
    echo "FAIL: --source must be prototype|app, got '${SOURCE}'"
    exit 16
    ;;
esac

if [[ -z "${SOURCE}" ]]; then
  if [[ "${MODE}" == "verify" ]]; then
    SOURCE="app"
  else
    echo "FAIL: mode=generate requires explicit --source prototype (app source forbidden)"
    exit 16
  fi
fi

if [[ "${MODE}" == "generate" && "${SOURCE}" != "prototype" ]]; then
  echo "FAIL: mode=generate only allows --source prototype (forbid self-baseline from app)"
  exit 16
fi

if [[ "${MODE}" == "verify" && "${SOURCE}" != "app" ]]; then
  echo "FAIL: mode=verify only allows --source app"
  exit 16
fi

case "${UI_VISUAL_SKIP_STATE}" in
  0|1) ;;
  *)
    echo "FAIL: UI_VISUAL_SKIP_STATE must be 0|1, got '${UI_VISUAL_SKIP_STATE}'"
    exit 16
    ;;
esac

DATE_STR="$(date +%Y-%m-%d)"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
AUDIT_DIR="osg-spec-docs/tasks/audit"
CONTRACT_PATH="osg-spec-docs/docs/01-product/prd/${MODULE}/UI-VISUAL-CONTRACT.yaml"
SUMMARY_JSON="${AUDIT_DIR}/ui-visual-contract-summary-${MODULE}-${DATE_STR}.json"
CONTRACT_JSON="${AUDIT_DIR}/ui-visual-contract-${MODULE}-${DATE_STR}.json"
PAGE_RESULTS_JSONL="${AUDIT_DIR}/ui-visual-page-results-${MODULE}-${DATE_STR}.jsonl"
STATE_RESULTS_JSONL="${AUDIT_DIR}/ui-state-results-${MODULE}-${DATE_STR}.jsonl"
PAGE_REPORT_JSON="${AUDIT_DIR}/ui-visual-page-report-${MODULE}-${DATE_STR}.json"
EVIDENCE_DIR="${AUDIT_DIR}/ui-visual-actual-${MODULE}-${DATE_STR}"
MANIFEST_JSON="${AUDIT_DIR}/ui-visual-baseline-manifest-${MODULE}-${RUN_ID}.json"
REPO_ROOT="$(pwd)"
PAGE_RESULTS_JSONL_ABS="${REPO_ROOT}/${PAGE_RESULTS_JSONL}"
STATE_RESULTS_JSONL_ABS="${REPO_ROOT}/${STATE_RESULTS_JSONL}"
EVIDENCE_DIR_ABS="${REPO_ROOT}/${EVIDENCE_DIR}"

mkdir -p "${AUDIT_DIR}"
mkdir -p "${EVIDENCE_DIR}"
rm -f "${PAGE_RESULTS_JSONL}" "${PAGE_REPORT_JSON}"
rm -f "${STATE_RESULTS_JSONL}"

if [[ -f "${DEV_ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${DEV_ENV_FILE}"
  set +a
fi

REDIS_HOST="${REDIS_HOST:-${SPRING_DATA_REDIS_HOST:-}}"
REDIS_PORT="${REDIS_PORT:-${SPRING_DATA_REDIS_PORT:-}}"
REDIS_PASSWORD="${REDIS_PASSWORD:-${SPRING_DATA_REDIS_PASSWORD:-}}"

if [[ "${MODE}" == "generate" ]]; then
  python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py \
    --contract "${CONTRACT_PATH}" \
    --allow-missing-baseline \
    --output-json "${SUMMARY_JSON}"
else
  python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py \
    --contract "${CONTRACT_PATH}" \
    --output-json "${SUMMARY_JSON}"
fi

python3 - <<PY
import json, yaml
from pathlib import Path
contract = yaml.safe_load(Path("${CONTRACT_PATH}").read_text(encoding="utf-8")) or {}
Path("${CONTRACT_JSON}").write_text(json.dumps(contract, ensure_ascii=False, indent=2), encoding="utf-8")
PY

CONTRACT_FIXED_TIME="$(python3 - <<PY
import json
from pathlib import Path
contract = json.loads(Path("${CONTRACT_JSON}").read_text(encoding="utf-8"))
stability = contract.get("stability") or {}
value = stability.get("fixed_time") if isinstance(stability, dict) else ""
print(value or "")
PY
)"

HAS_STATE_CASES="$(python3 - <<PY
import json
from pathlib import Path
contract = json.loads(Path("${CONTRACT_JSON}").read_text(encoding="utf-8"))
pages = contract.get("pages", []) if isinstance(contract.get("pages"), list) else []
has_cases = any(bool((page or {}).get("state_cases")) for page in pages)
print("1" if has_cases else "0")
PY
)"

echo "INFO: module=${MODULE} mode=${MODE} source=${SOURCE} contract=${CONTRACT_PATH}"
echo "INFO: summary=${SUMMARY_JSON}"
echo "INFO: contract_json=${CONTRACT_JSON}"
echo "INFO: has_state_cases=${HAS_STATE_CASES}"
echo "INFO: visual_grep_tag=${UI_VISUAL_GREP_TAG}"
echo "INFO: state_grep_tag=${UI_STATE_GREP_TAG}"
echo "INFO: skip_state_cases=${UI_VISUAL_SKIP_STATE}"

STABILITY_TZ="${UI_VISUAL_STABILITY_TZ:-Asia/Shanghai}"
STABILITY_LOCALE="${UI_VISUAL_STABILITY_LOCALE:-zh-CN}"
STABILITY_ENFORCE_ZH="${UI_VISUAL_ENFORCE_ZH_LOCALE:-1}"
STABILITY_REQUIRE_FIXED_RAW="${UI_VISUAL_REQUIRE_FIXED_TIME:-}"
if [[ -z "${STABILITY_REQUIRE_FIXED_RAW}" ]]; then
  if [[ -n "${CONTRACT_FIXED_TIME}" ]]; then
    STABILITY_REQUIRE_FIXED="1"
  else
    STABILITY_REQUIRE_FIXED="0"
  fi
else
  STABILITY_REQUIRE_FIXED="${STABILITY_REQUIRE_FIXED_RAW}"
fi
STABILITY_FIXED_TIME="${E2E_FIXED_TIME:-${CONTRACT_FIXED_TIME:-}}"
STABILITY_DEVICE_SCALE_FACTOR="${UI_VISUAL_STABILITY_DEVICE_SCALE_FACTOR:-1}"
STABILITY_USER_AGENT="${UI_VISUAL_STABILITY_USER_AGENT:-Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36}"
STABILITY_FONT_FAMILY="${UI_VISUAL_STABILITY_FONT_FAMILY:-'Inter', -apple-system, BlinkMacSystemFont, sans-serif}"
STABILITY_DISABLE_ANIMATION="${UI_VISUAL_DISABLE_ANIMATION:-1}"
if [[ -z "${STABILITY_TZ}" ]]; then
  echo "FAIL: UI_VISUAL_STABILITY_TZ must not be empty"
  exit 19
fi
if [[ -z "${STABILITY_LOCALE}" ]]; then
  echo "FAIL: UI_VISUAL_STABILITY_LOCALE must not be empty"
  exit 19
fi
if [[ "${STABILITY_ENFORCE_ZH}" != "0" && "${STABILITY_LOCALE}" != "zh-CN" ]]; then
  echo "FAIL: locale must be zh-CN when UI_VISUAL_ENFORCE_ZH_LOCALE!=0, got '${STABILITY_LOCALE}'"
  exit 19
fi
if ! python3 - <<PY >/dev/null 2>&1
value = "${STABILITY_DEVICE_SCALE_FACTOR}".strip()
try:
    num = float(value)
except ValueError:
    raise SystemExit(1)
raise SystemExit(0 if num > 0 else 1)
PY
then
  echo "FAIL: UI_VISUAL_STABILITY_DEVICE_SCALE_FACTOR must be > 0, got '${STABILITY_DEVICE_SCALE_FACTOR}'"
  exit 19
fi
if [[ -z "${STABILITY_USER_AGENT}" ]]; then
  echo "FAIL: UI_VISUAL_STABILITY_USER_AGENT must not be empty"
  exit 19
fi
if [[ -z "${STABILITY_FONT_FAMILY}" ]]; then
  echo "FAIL: UI_VISUAL_STABILITY_FONT_FAMILY must not be empty"
  exit 19
fi
if [[ "${STABILITY_REQUIRE_FIXED}" == "1" && -z "${STABILITY_FIXED_TIME}" ]]; then
  echo "FAIL: UI_VISUAL_REQUIRE_FIXED_TIME=1 but E2E_FIXED_TIME is missing"
  exit 19
fi
echo "INFO: stability_tz=${STABILITY_TZ}"
echo "INFO: stability_locale=${STABILITY_LOCALE}"
echo "INFO: stability_enforce_zh_locale=${STABILITY_ENFORCE_ZH}"
echo "INFO: stability_device_scale_factor=${STABILITY_DEVICE_SCALE_FACTOR}"
echo "INFO: stability_disable_animation=${STABILITY_DISABLE_ANIMATION}"
echo "INFO: stability_user_agent=${STABILITY_USER_AGENT}"
echo "INFO: stability_font_family=${STABILITY_FONT_FAMILY}"
if [[ -n "${CONTRACT_FIXED_TIME}" ]]; then
  echo "INFO: contract_fixed_time=${CONTRACT_FIXED_TIME}"
fi
echo "INFO: stability_require_fixed_time=${STABILITY_REQUIRE_FIXED}"
if [[ -n "${STABILITY_FIXED_TIME}" ]]; then
  echo "INFO: stability_fixed_time=${STABILITY_FIXED_TIME}"
fi

if [[ "${MODE}" == "generate" && "${SOURCE}" == "prototype" ]]; then
  if ! bash bin/runtime-port-guard.sh --mode converge-runtime --target prototype-only --context ui-visual-baseline-generate; then
    echo "FAIL: single runtime convergence failed for prototype baseline"
    exit 17
  fi
  if ! bash bin/prototype-server.sh status >/dev/null 2>&1; then
    if ! bash bin/prototype-server.sh start; then
      echo "FAIL: cannot start prototype server"
      exit 17
    fi
  fi
  PROTOTYPE_BASE_URL="${UI_VISUAL_PROTOTYPE_BASE_URL:-http://127.0.0.1:${PROTOTYPE_PORT:-18090}}"
  echo "INFO: prototype_base_url=${PROTOTYPE_BASE_URL}"
fi

pick_api_proxy_target() {
  if [[ -n "${E2E_BACKEND_URL:-}" && -z "${E2E_API_PROXY_TARGET:-}" ]]; then
    export BASE_URL="${E2E_BACKEND_URL}"
    export E2E_API_PROXY_TARGET="${E2E_BACKEND_URL}"
  fi
  eval "$(bash bin/resolve-runtime-contract.sh)"
  printf '%s' "${RESOLVED_E2E_API_PROXY_TARGET}"
}

API_PROXY_TARGET="$(pick_api_proxy_target)"
echo "INFO: api_proxy_target=${API_PROXY_TARGET}"

run_playwright_suite() {
  local grep_tag="$1"
  shift || true
  (
    cd osg-frontend
    UI_VISUAL_MODE="${MODE}" \
    UI_VISUAL_SOURCE="${SOURCE}" \
    UI_VISUAL_CONTRACT_JSON="../${CONTRACT_JSON}" \
    UI_VISUAL_EVIDENCE_DIR="${EVIDENCE_DIR_ABS}" \
    UI_VISUAL_PAGE_RESULTS_FILE="${PAGE_RESULTS_JSONL_ABS}" \
    UI_STATE_RESULTS_FILE="${STATE_RESULTS_JSONL_ABS}" \
    UI_VISUAL_MODULE="${MODULE}" \
    UI_VISUAL_PROTOTYPE_BASE_URL="${PROTOTYPE_BASE_URL:-}" \
    UI_VISUAL_STABILITY_TZ="${STABILITY_TZ}" \
    UI_VISUAL_STABILITY_LOCALE="${STABILITY_LOCALE}" \
    UI_VISUAL_ENFORCE_ZH_LOCALE="${STABILITY_ENFORCE_ZH}" \
    UI_VISUAL_STABILITY_DEVICE_SCALE_FACTOR="${STABILITY_DEVICE_SCALE_FACTOR}" \
    UI_VISUAL_STABILITY_USER_AGENT="${STABILITY_USER_AGENT}" \
    UI_VISUAL_STABILITY_FONT_FAMILY="${STABILITY_FONT_FAMILY}" \
    UI_VISUAL_DISABLE_ANIMATION="${STABILITY_DISABLE_ANIMATION}" \
    UI_VISUAL_REQUIRE_FIXED_TIME="${STABILITY_REQUIRE_FIXED}" \
    E2E_FIXED_TIME="${STABILITY_FIXED_TIME}" \
    E2E_API_PROXY_TARGET="${API_PROXY_TARGET}" \
    E2E_ADMIN_USERNAME="${E2E_ADMIN_USERNAME:-}" \
    E2E_ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-}" \
    E2E_REDIS_HOST="${E2E_REDIS_HOST:-${REDIS_HOST:-}}" \
    E2E_REDIS_PORT="${E2E_REDIS_PORT:-${REDIS_PORT:-}}" \
    E2E_REDIS_PASSWORD="${E2E_REDIS_PASSWORD:-${REDIS_PASSWORD:-}}" \
    PW_VISUAL_SNAPSHOT_TEMPLATE="{testDir}/visual-baseline/{arg}{ext}" \
    TZ="${STABILITY_TZ}" \
    LANG="${LANG:-zh_CN.UTF-8}" \
    pnpm test:e2e --grep "${grep_tag}" --workers=1 "$@"
  )
}

PLAYWRIGHT_RC=0
set +e
if [[ "${MODE}" == "generate" ]]; then
  run_playwright_suite "${UI_VISUAL_GREP_TAG}" --update-snapshots=all
else
  run_playwright_suite "${UI_VISUAL_GREP_TAG}"
fi
VISUAL_RC=$?
if (( VISUAL_RC != 0 )); then
  PLAYWRIGHT_RC=${VISUAL_RC}
fi

STATE_RC=0
if [[ "${HAS_STATE_CASES}" == "1" && "${UI_VISUAL_SKIP_STATE}" != "1" ]]; then
  run_playwright_suite "${UI_STATE_GREP_TAG}"
  STATE_RC=$?
  if (( STATE_RC != 0 && PLAYWRIGHT_RC == 0 )); then
    PLAYWRIGHT_RC=${STATE_RC}
  fi
fi
set -e

if [[ "${HAS_STATE_CASES}" == "1" && "${UI_VISUAL_SKIP_STATE}" != "1" ]]; then
  STATE_EXECUTED_COUNT="$(python3 - <<PY
from pathlib import Path
path = Path("${STATE_RESULTS_JSONL}")
if not path.exists():
    print(0)
else:
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    print(len(lines))
PY
)"
  echo "INFO: state_cases_executed=${STATE_EXECUTED_COUNT}"
  if [[ "${STATE_EXECUTED_COUNT}" == "0" ]]; then
    echo "FAIL: state_cases declared but none executed (@ui-state)"
    exit 18
  fi
elif [[ "${HAS_STATE_CASES}" == "1" ]]; then
  echo "INFO: state_cases_skipped=1"
fi

python3 - <<PY
import json
import yaml
from pathlib import Path

contract = yaml.safe_load(Path("${CONTRACT_PATH}").read_text(encoding="utf-8")) or {}
pages = contract.get("pages", []) if isinstance(contract.get("pages"), list) else []
result_path = Path("${PAGE_RESULTS_JSONL}")

state_result_path = Path("${STATE_RESULTS_JSONL}")
state_map = {}
state_total = 0
state_failed = 0
if state_result_path.exists():
    for line in state_result_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        record = json.loads(line)
        page_id = record.get("page_id")
        if page_id:
            bucket = state_map.setdefault(page_id, {"executed": 0, "failed": 0})
            bucket["executed"] += 1
            if record.get("result") == "FAIL":
                bucket["failed"] += 1
        state_total += 1
        if record.get("result") == "FAIL":
            state_failed += 1

page_records = {}
surface_records = {}
if result_path.exists():
    for line in result_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        record = json.loads(line)
        record_type = record.get("record_type", "page")
        if record_type == "surface":
            surface_id = record.get("surface_id")
            if surface_id:
                surface_records[surface_id] = record
            continue
        page_id = record.get("page_id")
        if page_id:
            page_records[page_id] = record

page_rows = []
for page in pages:
    page_id = page.get("page_id", "")
    result = page_records.get(page_id, {})
    state_bucket = state_map.get(page_id, {"executed": 0, "failed": 0})
    row = {
        "page_id": page_id,
        "baseline_ref": page.get("baseline_ref", "none"),
        "actual_ref": result.get("actual_ref", "none"),
        "diff_ref": result.get("diff_ref", "none"),
        "diff_threshold": page.get("diff_threshold"),
        "data_mode": result.get("data_mode", page.get("data_mode", "live")),
        "fixture_route_count": result.get("fixture_route_count", len(page.get("fixture_routes", []) or [])),
        "dynamic_region_count": result.get("dynamic_region_count", len(page.get("dynamic_regions", []) or [])),
        "style_assertions_passed": result.get("style_assertions_passed", 0),
        "style_assertions_failed": result.get("style_assertions_failed", 0),
        "state_cases_executed": state_bucket.get("executed", 0),
        "state_cases_failed": state_bucket.get("failed", 0),
        "critical_surface_results": result.get("critical_surface_results", []),
        "result": result.get("result", "NOT_RUN"),
    }
    page_rows.append(row)

surface_rows = []
for surface in contract.get("surfaces", []) if isinstance(contract.get("surfaces"), list) else []:
    if not isinstance(surface, dict):
        continue
    surface_id = surface.get("surface_id", "")
    result = surface_records.get(surface_id, {})
    viewport_results = result.get("viewport_results", []) if isinstance(result.get("viewport_results"), list) else []
    row = {
        "surface_id": surface_id,
        "surface_type": surface.get("surface_type", "unknown"),
        "host_page_id": surface.get("host_page_id", ""),
        "trigger_action_type": result.get("trigger_action_type", surface.get("trigger_action", {}).get("type", "")),
        "trigger_selector": result.get("trigger_selector", surface.get("trigger_action", {}).get("selector", "")),
        "portal_host": result.get("portal_host", surface.get("portal_host", "")),
        "surface_root_selector": result.get("surface_root_selector", surface.get("surface_root_selector", "")),
        "backdrop_selector": result.get("backdrop_selector", surface.get("backdrop_selector", "")),
        "viewport_variants_total": result.get("viewport_variants_total", len(surface.get("viewport_variants", []) or [])),
        "viewport_variants_executed": result.get("viewport_variants_executed", 0),
        "viewport_variants_failed": result.get("viewport_variants_failed", 0),
        "viewport_results": viewport_results,
        "result": result.get("result", "NOT_RUN"),
    }
    surface_rows.append(row)

critical_total = sum(len(x.get("critical_surface_results", []) or []) for x in page_rows)
critical_pass = sum(
    1
    for page in page_rows
    for surface in (page.get("critical_surface_results", []) or [])
    if isinstance(surface, dict) and surface.get("result") == "PASS"
)
critical_fail = sum(
    1
    for page in page_rows
    for surface in (page.get("critical_surface_results", []) or [])
    if isinstance(surface, dict) and surface.get("result") == "FAIL"
)
surface_total = len(surface_rows)
surface_pass = sum(1 for x in surface_rows if x.get("result") == "PASS")
surface_fail = sum(1 for x in surface_rows if x.get("result") == "FAIL")
surface_not_run = sum(1 for x in surface_rows if x.get("result") == "NOT_RUN")

summary = {
    "module": contract.get("module", "${MODULE}"),
    "mode": "${MODE}",
    "total_pages": len(page_rows),
    "pass_pages": sum(1 for x in page_rows if x.get("result") == "PASS"),
    "fail_pages": sum(1 for x in page_rows if x.get("result") == "FAIL"),
    "not_run_pages": sum(1 for x in page_rows if x.get("result") == "NOT_RUN"),
    "style_assertions_passed": sum(int(x.get("style_assertions_passed", 0) or 0) for x in page_rows),
    "style_assertions_failed": sum(int(x.get("style_assertions_failed", 0) or 0) for x in page_rows),
    "state_cases_executed": state_total,
    "state_cases_failed": state_failed,
    "critical_surfaces_total": critical_total,
    "critical_surfaces_passed": critical_pass,
    "critical_surfaces_failed": critical_fail,
    "surfaces_total": surface_total,
    "surfaces_passed": surface_pass,
    "surfaces_failed": surface_fail,
    "surfaces_not_run": surface_not_run,
    "pages": page_rows,
    "surfaces": surface_rows,
}
page_report_path = Path("${PAGE_REPORT_JSON}")
page_report_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"INFO: page_report={page_report_path}")
for row in page_rows:
    print(
        "INFO: page_result "
        f"page_id={row['page_id']} "
        f"baseline_ref={row['baseline_ref']} "
        f"actual_ref={row['actual_ref']} "
        f"diff_ref={row['diff_ref']} "
        f"diff_threshold={row['diff_threshold']} "
        f"data_mode={row['data_mode']} "
        f"fixture_route_count={row['fixture_route_count']} "
        f"dynamic_region_count={row['dynamic_region_count']} "
        f"style_assertions_passed={row['style_assertions_passed']} "
        f"style_assertions_failed={row['style_assertions_failed']} "
        f"state_cases_executed={row['state_cases_executed']} "
        f"state_cases_failed={row['state_cases_failed']} "
        f"critical_surfaces_total={len(row.get('critical_surface_results', []) or [])} "
        f"critical_surfaces_failed={sum(1 for s in (row.get('critical_surface_results', []) or []) if isinstance(s, dict) and s.get('result') == 'FAIL')} "
        f"result={row['result']}"
    )
for row in surface_rows:
    print(
        "INFO: surface_result "
        f"surface_id={row['surface_id']} "
        f"host_page_id={row['host_page_id']} "
        f"surface_type={row['surface_type']} "
        f"trigger_action_type={row['trigger_action_type']} "
        f"viewport_variants_total={row['viewport_variants_total']} "
        f"viewport_variants_executed={row['viewport_variants_executed']} "
        f"viewport_variants_failed={row['viewport_variants_failed']} "
        f"result={row['result']}"
    )
PY

if (( PLAYWRIGHT_RC != 0 )); then
  echo "FAIL: ui-visual-baseline (${MODE}) exit=${PLAYWRIGHT_RC}"
  exit "${PLAYWRIGHT_RC}"
fi

if [[ "${MODE}" == "generate" && "${SOURCE}" == "prototype" ]]; then
  python3 - <<PY
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import yaml

contract_path = Path("${CONTRACT_PATH}")
contract = yaml.safe_load(contract_path.read_text(encoding="utf-8")) or {}
pages = contract.get("pages", []) if isinstance(contract.get("pages"), list) else []
prototype_root = Path("osg-spec-docs/source/prototype")

def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

prototype_files = sorted({
    page.get("prototype_file")
    for page in pages
    if isinstance(page, dict) and isinstance(page.get("prototype_file"), str) and page.get("prototype_file")
})

manifest_pages = []
for page in pages:
    if not isinstance(page, dict):
        continue
    manifest_pages.append(
        {
            "page_id": page.get("page_id"),
            "prototype_file": page.get("prototype_file"),
            "baseline_ref": page.get("baseline_ref"),
        }
    )

prototype_hashes = []
for file_name in prototype_files:
    file_path = prototype_root / file_name
    if not file_path.exists():
        raise SystemExit(f"FAIL: prototype file missing for manifest: {file_path}")
    prototype_hashes.append(
        {
            "file": file_name,
            "sha256": sha256_file(file_path),
        }
    )

prototype_fingerprint = "\n".join(
    f"{item['file']}:{item['sha256']}" for item in prototype_hashes
)
prototype_sha256 = hashlib.sha256(prototype_fingerprint.encode("utf-8")).hexdigest() if prototype_fingerprint else ""

manifest = {
    "module": contract.get("module", "${MODULE}"),
    "source": "prototype",
    "contract_path": "${CONTRACT_PATH}",
    "contract_sha256": sha256_file(contract_path),
    "prototype_sha256": prototype_sha256,
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "generated_by": "bin/ui-visual-baseline.sh",
    "prototype_base_url": "${PROTOTYPE_BASE_URL:-http://127.0.0.1:${PROTOTYPE_PORT:-18090}}",
    "prototype_files": prototype_hashes,
    "pages": manifest_pages,
}

manifest_path = Path("${MANIFEST_JSON}")
manifest_path.parent.mkdir(parents=True, exist_ok=True)
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"INFO: manifest_ref={manifest_path}")
print(f"INFO: contract_sha256={manifest['contract_sha256']}")
print(f"INFO: prototype_sha256={manifest['prototype_sha256']}")
PY
fi

echo "PASS: ui-visual-baseline (${MODE})"
