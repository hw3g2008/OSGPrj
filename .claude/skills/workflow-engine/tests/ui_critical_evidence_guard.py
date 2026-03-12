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


def _load_ui_delivery_policy(config_path: Path, errors: list[str]) -> dict[str, Any]:
    data = _load_yaml(config_path) if config_path.exists() else {}
    if not config_path.exists():
        _err(errors, f"project config not found: {config_path}")
        return {}
    workflow_policy = data.get("workflow_policy")
    if not isinstance(workflow_policy, dict):
        _err(errors, "project config workflow_policy must be mapping")
    ui_delivery_policy = data.get("ui_delivery_policy")
    if not isinstance(ui_delivery_policy, dict):
        _err(errors, "project config ui_delivery_policy must be mapping")
        return {}
    return ui_delivery_policy


def _is_non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and value.strip() != ""


def _is_concrete_artifact_ref(value: Any) -> bool:
    return _is_non_empty_string(value) and str(value).strip().lower() != "none"


def _require_failure_evidence(
    result: dict[str, Any],
    tag: str,
    stage: str,
    policy: dict[str, Any] | None,
    errors: list[str],
) -> None:
    if not isinstance(policy, dict) or policy.get("require_failure_evidence") is not True:
        return
    if stage not in VERIFY_LIKE_STAGES:
        return
    if result.get("result") == "PASS":
        return
    for key in ("baseline_ref", "actual_ref", "diff_ref"):
        if not _is_concrete_artifact_ref(result.get(key)):
            _err(
                errors,
                (
                    f"{tag}.{key} must be concrete artifact path when "
                    f"result!=PASS in {stage}"
                ),
            )


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


def _surface_style_contract_total(surface_contract: dict[str, Any]) -> int:
    total = 0
    for rule in surface_contract.get("style_contracts") or []:
        if not isinstance(rule, dict):
            continue
        css = rule.get("css")
        if isinstance(css, dict):
            total += len(css)
    return total


def _validate_page_residual_classifier_evidence(
    page_result: dict[str, Any],
    page_tag: str,
    errors: list[str],
) -> None:
    if page_result.get("residual_classifier_applied") is not True:
        return

    classifier_result = page_result.get("residual_classifier_result")
    if classifier_result not in {"PASS", "FAIL"}:
        _err(errors, f"{page_tag}.residual_classifier_result must be PASS|FAIL when classifier is applied")

    class_breakdown = page_result.get("residual_class_breakdown")
    if not isinstance(class_breakdown, dict) or len(class_breakdown) == 0:
        _err(errors, f"{page_tag}.residual_class_breakdown must be non-empty object when classifier is applied")

    forbidden_detected = page_result.get("forbidden_residual_detected")
    if not isinstance(forbidden_detected, bool):
        _err(errors, f"{page_tag}.forbidden_residual_detected must be boolean when classifier is applied")


def _surface_state_style_contract_total(surface_contract: dict[str, Any]) -> int:
    total = 0
    for contract in surface_contract.get("state_contracts") or []:
        if not isinstance(contract, dict):
            continue
        for rule in contract.get("style_contracts") or []:
            if not isinstance(rule, dict):
                continue
            css = rule.get("css")
            if isinstance(css, dict):
                total += len(css)
    return total


def _to_surface_map(report: dict[str, Any], errors: list[str]) -> dict[str, dict[str, Any]]:
    surfaces = report.get("surfaces")
    if not isinstance(surfaces, list):
        _err(errors, "page_report.surfaces must be a list")
        return {}

    surface_map: dict[str, dict[str, Any]] = {}
    for index, surface in enumerate(surfaces):
        tag = f"page_report.surfaces[{index}]"
        if not isinstance(surface, dict):
            _err(errors, f"{tag} must be object")
            continue
        surface_id = surface.get("surface_id")
        if not _is_non_empty_string(surface_id):
            _err(errors, f"{tag}.surface_id must be non-empty string")
            continue
        if surface_id in surface_map:
            _err(errors, f"{tag}.surface_id duplicated: {surface_id}")
            continue
        surface_map[surface_id] = surface
    return surface_map


def _validate_surface_result(
    surface_contract: dict[str, Any],
    surface_result: dict[str, Any],
    page_tag: str,
    stage: str,
    policy: dict[str, Any] | None,
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

    _require_failure_evidence(surface_result, stag, stage, policy, errors)

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


def _validate_overlay_surface_result(
    surface_contract: dict[str, Any],
    surface_result: dict[str, Any],
    stage: str,
    policy: dict[str, Any] | None,
    errors: list[str],
) -> None:
    surface_id = surface_contract.get("surface_id", "unknown")
    stag = f"page_report.surfaces[{surface_id}]"

    for key in ("surface_type", "host_page_id", "surface_root_selector"):
        if not _is_non_empty_string(surface_result.get(key)):
            _err(errors, f"{stag}.{key} must be non-empty string")

    if surface_result.get("surface_type") != surface_contract.get("surface_type"):
        _err(errors, f"{stag}.surface_type must match contract ({surface_contract.get('surface_type')})")
    if surface_result.get("host_page_id") != surface_contract.get("host_page_id"):
        _err(errors, f"{stag}.host_page_id must match contract ({surface_contract.get('host_page_id')})")
    if surface_result.get("surface_root_selector") != surface_contract.get("surface_root_selector"):
        _err(errors, f"{stag}.surface_root_selector must match contract")
    if (surface_result.get("backdrop_selector") or "") != (surface_contract.get("backdrop_selector") or ""):
        _err(errors, f"{stag}.backdrop_selector must match contract")
    if (surface_result.get("portal_host") or "") != (surface_contract.get("portal_host") or ""):
        _err(errors, f"{stag}.portal_host must match contract")

    viewport_total = _expect_int(surface_result, "viewport_variants_total", stag, errors)
    viewport_executed = _expect_int(surface_result, "viewport_variants_executed", stag, errors)
    viewport_failed = _expect_int(surface_result, "viewport_variants_failed", stag, errors)
    expected_viewport_total = len(surface_contract.get("viewport_variants") or [])
    if viewport_total is not None and viewport_total != expected_viewport_total:
        _err(errors, f"{stag}.viewport_variants_total must equal contract count ({expected_viewport_total})")
    if None not in (viewport_total, viewport_executed) and viewport_executed != viewport_total:
        _err(errors, f"{stag}.viewport_variants_executed must equal total")

    viewport_results = surface_result.get("viewport_results")
    if not isinstance(viewport_results, list):
        _err(errors, f"{stag}.viewport_results must be list")
        return

    viewport_map: dict[str, dict[str, Any]] = {}
    for index, viewport in enumerate(viewport_results):
        vtag = f"{stag}.viewport_results[{index}]"
        if not isinstance(viewport, dict):
            _err(errors, f"{vtag} must be object")
            continue
        viewport_id = viewport.get("viewport_id")
        if not _is_non_empty_string(viewport_id):
            _err(errors, f"{vtag}.viewport_id must be non-empty string")
            continue
        if viewport_id in viewport_map:
            _err(errors, f"{vtag}.viewport_id duplicated: {viewport_id}")
            continue
        viewport_map[viewport_id] = viewport

    expected_style_total = _surface_style_contract_total(surface_contract)
    expected_state_total = len(surface_contract.get("state_contracts") or [])
    expected_state_style_total = _surface_state_style_contract_total(surface_contract)
    expected_parts = surface_contract.get("surface_parts") or []
    expected_content_parts = surface_contract.get("content_parts") or []
    expected_state_contracts = surface_contract.get("state_contracts") or []

    for viewport_contract in surface_contract.get("viewport_variants") or []:
        if not isinstance(viewport_contract, dict):
            continue
        viewport_id = viewport_contract.get("viewport_id")
        if not _is_non_empty_string(viewport_id):
            continue
        viewport_result = viewport_map.get(viewport_id)
        if viewport_result is None:
            _err(errors, f"{stag} missing viewport result for {viewport_id}")
            continue

        vtag = f"{stag}.viewport_results[{viewport_id}]"
        for key in ("baseline_ref", "actual_ref", "diff_ref"):
            if not _is_non_empty_string(viewport_result.get(key)):
                _err(errors, f"{vtag}.{key} must be non-empty string")
        _require_failure_evidence(viewport_result, vtag, stage, policy, errors)
        if viewport_result.get("width") != viewport_contract.get("width"):
            _err(errors, f"{vtag}.width must match contract ({viewport_contract.get('width')})")
        if viewport_result.get("height") != viewport_contract.get("height"):
            _err(errors, f"{vtag}.height must match contract ({viewport_contract.get('height')})")

        style_total = _expect_int(viewport_result, "style_contracts_total", vtag, errors)
        style_passed = _expect_int(viewport_result, "style_contracts_passed", vtag, errors)
        style_failed = _expect_int(viewport_result, "style_contracts_failed", vtag, errors)
        if style_total is not None and style_total != expected_style_total:
            _err(errors, f"{vtag}.style_contracts_total must equal contract count ({expected_style_total})")
        if None not in (style_total, style_passed, style_failed):
            if style_passed + style_failed != style_total:
                _err(errors, f"{vtag}.style passed+failed must equal total")
            if stage in VERIFY_LIKE_STAGES and style_failed != 0:
                _err(errors, f"{vtag}.style_contracts_failed must be 0")

        state_total = _expect_int(viewport_result, "state_contracts_total", vtag, errors)
        state_executed = _expect_int(viewport_result, "state_contracts_executed", vtag, errors)
        state_passed = _expect_int(viewport_result, "state_contracts_passed", vtag, errors)
        state_failed = _expect_int(viewport_result, "state_contracts_failed", vtag, errors)
        if state_total is not None and state_total != expected_state_total:
            _err(errors, f"{vtag}.state_contracts_total must equal contract count ({expected_state_total})")
        if None not in (state_total, state_executed) and state_executed != state_total:
            _err(errors, f"{vtag}.state_contracts_executed must equal total")
        if None not in (state_total, state_passed, state_failed):
            if state_passed + state_failed != state_total:
                _err(errors, f"{vtag}.state passed+failed must equal total")
            if stage in VERIFY_LIKE_STAGES and state_failed != 0:
                _err(errors, f"{vtag}.state_contracts_failed must be 0")

        state_style_total = _expect_int(viewport_result, "state_style_contracts_total", vtag, errors)
        state_style_executed = _expect_int(viewport_result, "state_style_contracts_executed", vtag, errors)
        state_style_passed = _expect_int(viewport_result, "state_style_contracts_passed", vtag, errors)
        state_style_failed = _expect_int(viewport_result, "state_style_contracts_failed", vtag, errors)
        if state_style_total is not None and state_style_total != expected_state_style_total:
            _err(
                errors,
                f"{vtag}.state_style_contracts_total must equal contract count ({expected_state_style_total})",
            )
        if None not in (state_style_total, state_style_executed) and state_style_executed != state_style_total:
            _err(errors, f"{vtag}.state_style_contracts_executed must equal total")
        if None not in (state_style_total, state_style_passed, state_style_failed):
            if state_style_passed + state_style_failed != state_style_total:
                _err(errors, f"{vtag}.state-style passed+failed must equal total")
            if stage in VERIFY_LIKE_STAGES and state_style_failed != 0:
                _err(errors, f"{vtag}.state_style_contracts_failed must be 0")

        part_results = viewport_result.get("surface_part_results")
        if not isinstance(part_results, list):
            _err(errors, f"{vtag}.surface_part_results must be list")
        else:
            part_map: dict[str, dict[str, Any]] = {}
            for index, part_result in enumerate(part_results):
                ptag = f"{vtag}.surface_part_results[{index}]"
                if not isinstance(part_result, dict):
                    _err(errors, f"{ptag} must be object")
                    continue
                part_id = part_result.get("part_id")
                if not _is_non_empty_string(part_id):
                    _err(errors, f"{ptag}.part_id must be non-empty string")
                    continue
                if part_id in part_map:
                    _err(errors, f"{ptag}.part_id duplicated: {part_id}")
                    continue
                part_map[part_id] = part_result

            for part_contract in expected_parts:
                if not isinstance(part_contract, dict):
                    continue
                part_id = part_contract.get("part_id")
                if not _is_non_empty_string(part_id):
                    continue
                part_result = part_map.get(part_id)
                if part_result is None:
                    _err(errors, f"{vtag} missing surface_part_result for {part_id}")
                    continue
                ptag = f"{vtag}.surface_part_results[{part_id}]"
                if part_result.get("selector") != part_contract.get("selector"):
                    _err(errors, f"{ptag}.selector must match contract")
                if part_result.get("mask_allowed") != part_contract.get("mask_allowed"):
                    _err(errors, f"{ptag}.mask_allowed must match contract")
                for key in ("exists", "visible"):
                    if not isinstance(part_result.get(key), bool):
                        _err(errors, f"{ptag}.{key} must be boolean")
                if stage in VERIFY_LIKE_STAGES and part_result.get("result") != "PASS":
                    _err(errors, f"{ptag}.result must be PASS in {stage}")

        content_part_results = viewport_result.get("content_part_results")
        if expected_content_parts:
            if not isinstance(content_part_results, list):
                _err(errors, f"{vtag}.content_part_results must be list")
            else:
                content_part_map: dict[str, dict[str, Any]] = {}
                for index, part_result in enumerate(content_part_results):
                    ptag = f"{vtag}.content_part_results[{index}]"
                    if not isinstance(part_result, dict):
                        _err(errors, f"{ptag} must be object")
                        continue
                    part_id = part_result.get("part_id")
                    if not _is_non_empty_string(part_id):
                        _err(errors, f"{ptag}.part_id must be non-empty string")
                        continue
                    if part_id in content_part_map:
                        _err(errors, f"{ptag}.part_id duplicated: {part_id}")
                        continue
                    content_part_map[part_id] = part_result

                for part_contract in expected_content_parts:
                    if not isinstance(part_contract, dict):
                        continue
                    part_id = part_contract.get("part_id")
                    if not _is_non_empty_string(part_id):
                        continue
                    part_result = content_part_map.get(part_id)
                    if part_result is None:
                        _err(errors, f"{vtag} missing content_part_result for {part_id}")
                        continue
                    ptag = f"{vtag}.content_part_results[{part_id}]"
                    if part_result.get("selector") != part_contract.get("selector"):
                        _err(errors, f"{ptag}.selector must match contract")
                    expected_required = part_contract.get("required", True)
                    if part_result.get("required") != expected_required:
                        _err(errors, f"{ptag}.required must match contract")
                    for key in ("exists", "visible"):
                        if not isinstance(part_result.get(key), bool):
                            _err(errors, f"{ptag}.{key} must be boolean")
                    if stage in VERIFY_LIKE_STAGES and expected_required and part_result.get("result") != "PASS":
                        _err(errors, f"{ptag}.result must be PASS in {stage}")

        state_results = viewport_result.get("state_results")
        if not isinstance(state_results, list):
            _err(errors, f"{vtag}.state_results must be list")
        else:
            state_map: dict[str, dict[str, Any]] = {}
            for index, state_result in enumerate(state_results):
                stag2 = f"{vtag}.state_results[{index}]"
                if not isinstance(state_result, dict):
                    _err(errors, f"{stag2} must be object")
                    continue
                state_id = state_result.get("state_id")
                if not _is_non_empty_string(state_id):
                    _err(errors, f"{stag2}.state_id must be non-empty string")
                    continue
                if state_id in state_map:
                    _err(errors, f"{stag2}.state_id duplicated: {state_id}")
                    continue
                state_map[state_id] = state_result

            for state_contract in expected_state_contracts:
                if not isinstance(state_contract, dict):
                    continue
                state_id = state_contract.get("state_id")
                if not _is_non_empty_string(state_id):
                    continue
                state_result = state_map.get(state_id)
                if state_result is None:
                    _err(errors, f"{vtag} missing state_result for {state_id}")
                    continue
                stag2 = f"{vtag}.state_results[{state_id}]"
                expected_anchor_total = len(state_contract.get("required_anchors") or [])
                expected_state_style = 0
                for rule in state_contract.get("style_contracts") or []:
                    if isinstance(rule, dict) and isinstance(rule.get("css"), dict):
                        expected_state_style += len(rule["css"])
                anchor_total = _expect_int(state_result, "required_anchors_total", stag2, errors)
                anchor_passed = _expect_int(state_result, "required_anchors_passed", stag2, errors)
                if anchor_total is not None and anchor_total != expected_anchor_total:
                    _err(errors, f"{stag2}.required_anchors_total must equal contract count ({expected_anchor_total})")
                if None not in (anchor_total, anchor_passed) and anchor_passed > anchor_total:
                    _err(errors, f"{stag2}.required_anchors_passed cannot exceed total")
                sc_total = _expect_int(state_result, "style_contracts_total", stag2, errors)
                sc_exec = _expect_int(state_result, "style_contracts_executed", stag2, errors)
                sc_pass = _expect_int(state_result, "style_contracts_passed", stag2, errors)
                sc_fail = _expect_int(state_result, "style_contracts_failed", stag2, errors)
                if sc_total is not None and sc_total != expected_state_style:
                    _err(errors, f"{stag2}.style_contracts_total must equal contract count ({expected_state_style})")
                if None not in (sc_total, sc_exec) and sc_exec != sc_total:
                    _err(errors, f"{stag2}.style_contracts_executed must equal total")
                if None not in (sc_total, sc_pass, sc_fail):
                    if sc_pass + sc_fail != sc_total:
                        _err(errors, f"{stag2}.style passed+failed must equal total")
                    if stage in VERIFY_LIKE_STAGES and sc_fail != 0:
                        _err(errors, f"{stag2}.style_contracts_failed must be 0")
                if stage in VERIFY_LIKE_STAGES and state_result.get("result") != "PASS":
                    _err(errors, f"{stag2}.result must be PASS in {stage}")

        _validate_page_residual_classifier_evidence(viewport_result, vtag, errors)

        if stage in VERIFY_LIKE_STAGES and viewport_result.get("result") != "PASS":
            _err(errors, f"{vtag}.result must be PASS in {stage}")

    if None not in (viewport_total, viewport_failed) and stage in VERIFY_LIKE_STAGES and viewport_failed != 0:
        _err(errors, f"{stag}.viewport_variants_failed must be 0")
    if stage in VERIFY_LIKE_STAGES and surface_result.get("result") != "PASS":
        _err(errors, f"{stag}.result must be PASS in {stage}")


def validate_page_report(
    contract: dict[str, Any],
    report: dict[str, Any],
    errors: list[str],
    *,
    stage: str,
    policy: dict[str, Any] | None = None,
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
        page_id = page.get("page_id")
        page_result = page_map.get(page_id)
        if page_result is None:
            _err(errors, f"{tag} page_id={page_id} missing from page report")
            continue

        if isinstance(page_result, dict):
            page_tag = f"page_report.pages[{page_id}]"
            _require_failure_evidence(page_result, page_tag, stage, policy, errors)
            _validate_page_residual_classifier_evidence(page_result, page_tag, errors)

        critical_surfaces = page.get("critical_surfaces") or []
        if not critical_surfaces:
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
            _validate_surface_result(
                surface,
                surface_result,
                f"page_report.pages[{page_id}]",
                stage,
                policy,
                errors,
            )

    surfaces = contract.get("surfaces") or []
    if surfaces:
        surface_map = _to_surface_map(report, errors)
        for index, surface in enumerate(surfaces):
            tag = f"contract.surfaces[{index}]"
            if not isinstance(surface, dict):
                continue
            surface_id = surface.get("surface_id")
            if not _is_non_empty_string(surface_id):
                continue
            surface_result = surface_map.get(surface_id)
            if surface_result is None:
                _err(errors, f"{tag} surface_id={surface_id} missing from page report")
                continue
            _validate_overlay_surface_result(surface, surface_result, stage, policy, errors)


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
    policy = _load_ui_delivery_policy(Path.cwd() / ".claude/project/config.yaml", errors)
    validate_contract(contract, errors, policy=policy)
    validate_page_report(contract, report, errors, stage=args.stage, policy=policy)

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
