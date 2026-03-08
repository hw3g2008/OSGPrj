#!/usr/bin/env python3
"""Guard for critical UI evidence emitted by visual contract execution."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import yaml

from ui_visual_contract_guard import validate_contract


VERIFY_LIKE_STAGES = {"verify", "ui-visual-gate", "final-gate", "final-closure"}
ALLOWED_STAGES = VERIFY_LIKE_STAGES | {"next"}


def _err(errors: list[str], message: str) -> None:
    errors.append(message)


def _load_yaml(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def _load_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def _is_non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and value.strip() != ""


def _to_page_map(report: dict[str, Any], errors: list[str]) -> dict[str, dict[str, Any]]:
    pages = report.get("pages")
    if not isinstance(pages, list):
        _err(errors, "page_report.pages must be a list")
        return {}

    page_map: dict[str, dict[str, Any]] = {}
    for index, page in enumerate(pages):
        tag = f"page_report.pages[{index}]"
        if not isinstance(page, dict):
            _err(errors, f"{tag} must be object")
            continue
        page_id = page.get("page_id")
        if not _is_non_empty_string(page_id):
            _err(errors, f"{tag}.page_id must be non-empty string")
            continue
        if page_id in page_map:
            _err(errors, f"{tag}.page_id duplicated: {page_id}")
            continue
        page_map[page_id] = page
    return page_map


def _expect_int(record: dict[str, Any], key: str, tag: str, errors: list[str]) -> int | None:
    value = record.get(key)
    if not isinstance(value, int) or value < 0:
        _err(errors, f"{tag}.{key} must be integer >= 0")
        return None
    return value


def _validate_surface_result(
    surface_contract: dict[str, Any],
    surface_result: dict[str, Any],
    page_tag: str,
    stage: str,
    errors: list[str],
) -> None:
    surface_id = surface_contract.get("surface_id", "unknown")
    stag = f"{page_tag}.critical_surface_results[{surface_id}]"

    selector = surface_result.get("selector")
    if not _is_non_empty_string(selector):
        _err(errors, f"{stag}.selector must be non-empty string")

    for key in ("baseline_ref", "actual_ref", "diff_ref"):
        if not _is_non_empty_string(surface_result.get(key)):
            _err(errors, f"{stag}.{key} must be non-empty string")

    mask_allowed = surface_contract.get("mask_allowed")
    if surface_result.get("mask_allowed") != mask_allowed:
        _err(errors, f"{stag}.mask_allowed must match contract ({mask_allowed})")

    mask_policy_applied = surface_result.get("mask_policy_applied")
    if not isinstance(mask_policy_applied, bool):
        _err(errors, f"{stag}.mask_policy_applied must be boolean")
    elif mask_allowed is False and mask_policy_applied:
        _err(errors, f"{stag}.mask_policy_applied must remain false when contract mask_allowed=false")

    if stage not in VERIFY_LIKE_STAGES:
        return

    style_total = _expect_int(surface_result, "style_contracts_total", stag, errors)
    style_passed = _expect_int(surface_result, "style_contracts_passed", stag, errors)
    style_failed = _expect_int(surface_result, "style_contracts_failed", stag, errors)
    expected_style_total = len(surface_contract.get("style_contracts") or [])
    if style_total is not None and style_total != expected_style_total:
        _err(errors, f"{stag}.style_contracts_total must equal contract count ({expected_style_total})")
    if None not in (style_total, style_passed, style_failed):
        if style_passed + style_failed != style_total:
            _err(errors, f"{stag}.style passed+failed must equal total")
        if style_failed != 0:
            _err(errors, f"{stag}.style_contracts_failed must be 0")

    state_total = _expect_int(surface_result, "state_contracts_total", stag, errors)
    state_executed = _expect_int(surface_result, "state_contracts_executed", stag, errors)
    state_passed = _expect_int(surface_result, "state_contracts_passed", stag, errors)
    state_failed = _expect_int(surface_result, "state_contracts_failed", stag, errors)
    expected_state_total = len(surface_contract.get("state_contracts") or [])
    if state_total is not None and state_total != expected_state_total:
        _err(errors, f"{stag}.state_contracts_total must equal contract count ({expected_state_total})")
    if None not in (state_total, state_executed):
        if state_executed != state_total:
            _err(errors, f"{stag}.state_contracts_executed must equal total")
    if None not in (state_total, state_passed, state_failed):
        if state_passed + state_failed != state_total:
            _err(errors, f"{stag}.state passed+failed must equal total")
        if state_failed != 0:
            _err(errors, f"{stag}.state_contracts_failed must be 0")

    relation_total = _expect_int(surface_result, "relation_contracts_total", stag, errors)
    relation_executed = _expect_int(surface_result, "relation_contracts_executed", stag, errors)
    relation_passed = _expect_int(surface_result, "relation_contracts_passed", stag, errors)
    relation_failed = _expect_int(surface_result, "relation_contracts_failed", stag, errors)
    expected_relation_total = len(surface_contract.get("relation_contracts") or [])
    if relation_total is not None and relation_total != expected_relation_total:
        _err(errors, f"{stag}.relation_contracts_total must equal contract count ({expected_relation_total})")
    if None not in (relation_total, relation_executed):
        if relation_executed != relation_total:
            _err(errors, f"{stag}.relation_contracts_executed must equal total")
    if None not in (relation_total, relation_passed, relation_failed):
        if relation_passed + relation_failed != relation_total:
            _err(errors, f"{stag}.relation passed+failed must equal total")
        if relation_failed != 0:
            _err(errors, f"{stag}.relation_contracts_failed must be 0")

    if surface_result.get("result") != "PASS":
        _err(errors, f"{stag}.result must be PASS in {stage}")


def validate_page_report(
    contract: dict[str, Any],
    report: dict[str, Any],
    errors: list[str],
    *,
    stage: str,
) -> None:
    if stage not in ALLOWED_STAGES:
        _err(errors, f"stage must be one of {sorted(ALLOWED_STAGES)}")
        return

    page_map = _to_page_map(report, errors)
    module = contract.get("module")
    if module and report.get("module") != module:
        _err(errors, f"page_report.module must match contract module ({module})")

    pages = contract.get("pages", [])
    if not isinstance(pages, list):
        _err(errors, "contract.pages must be list")
        return

    for index, page in enumerate(pages):
        tag = f"contract.pages[{index}]"
        if not isinstance(page, dict):
            continue
        critical_surfaces = page.get("critical_surfaces") or []
        if not critical_surfaces:
            continue
        page_id = page.get("page_id")
        page_result = page_map.get(page_id)
        if page_result is None:
            _err(errors, f"{tag} page_id={page_id} missing from page report")
            continue

        surface_results = page_result.get("critical_surface_results")
        if not isinstance(surface_results, list):
            _err(errors, f"page_report.pages[{page_id}].critical_surface_results must be list")
            continue
        surface_map: dict[str, dict[str, Any]] = {}
        for s_index, surface in enumerate(surface_results):
            rtag = f"page_report.pages[{page_id}].critical_surface_results[{s_index}]"
            if not isinstance(surface, dict):
                _err(errors, f"{rtag} must be object")
                continue
            surface_id = surface.get("surface_id")
            if not _is_non_empty_string(surface_id):
                _err(errors, f"{rtag}.surface_id must be non-empty string")
                continue
            if surface_id in surface_map:
                _err(errors, f"{rtag}.surface_id duplicated: {surface_id}")
                continue
            surface_map[surface_id] = surface

        for surface in critical_surfaces:
            if not isinstance(surface, dict):
                continue
            surface_id = surface.get("surface_id")
            if not _is_non_empty_string(surface_id):
                continue
            surface_result = surface_map.get(surface_id)
            if surface_result is None:
                _err(errors, f"page_report.pages[{page_id}] missing critical_surface_result for {surface_id}")
                continue
            _validate_surface_result(surface, surface_result, f"page_report.pages[{page_id}]", stage, errors)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate critical UI evidence against UI visual contract")
    parser.add_argument("--contract", required=True, help="Path to UI-VISUAL-CONTRACT.yaml")
    parser.add_argument("--page-report", required=True, help="Path to ui-visual-page-report-*.json")
    parser.add_argument("--stage", required=True, choices=sorted(ALLOWED_STAGES))
    parser.add_argument("--output-json", help="Optional path to write summary JSON")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    contract = _load_yaml(Path(args.contract))
    report = _load_json(Path(args.page_report))
    errors: list[str] = []
    validate_contract(contract, errors)
    validate_page_report(contract, report, errors, stage=args.stage)

    summary = {
        "contract": args.contract,
        "page_report": args.page_report,
        "stage": args.stage,
        "issues": errors,
    }
    if args.output_json:
        output_path = Path(args.output_json)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    if errors:
        print("FAIL: ui_critical_evidence_guard", file=sys.stderr)
        for issue in errors:
            print(f" - {issue}", file=sys.stderr)
        return 1

    print(
        "PASS: ui_critical_evidence_guard "
        f"module={contract.get('module', 'unknown')} stage={args.stage}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
