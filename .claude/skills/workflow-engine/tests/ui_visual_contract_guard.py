#!/usr/bin/env python3
"""UI visual contract schema and baseline coverage guard."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

import yaml


REQUIRED_ROOT = {"schema_version", "module", "pages"}
REQUIRED_PAGE_FIELDS = {
    "page_id",
    "route",
    "prototype_file",
    "prototype_selector",
    "viewport",
    "auth_mode",
    "snapshot_name",
    "baseline_ref",
    "diff_threshold",
    "stable_wait_ms",
    "required_anchors",
}
ALLOWED_AUTH_MODES = {"public", "protected"}
ALLOWED_CAPTURE_MODES = {"clip", "fullpage"}
ALLOWED_STATE_CASES = {"focus", "hover", "loading", "empty", "error"}
ALLOWED_STATE_ASSERTIONS = {"visible", "text", "css"}
MIN_REQUIRED_ANCHORS = 3

# Generic selectors are too weak to serve as the only structural anchors.
WEAK_ANCHOR_PATTERNS = (
    r"^input(\b|$)",
    r"^input\[type=['\"]?(text|password|email|search|number|tel)['\"]?\]$",
    r"^textarea(\b|$)",
    r"^select(\b|$)",
    r"^button(\b|$)",
    r"^button\[type=['\"]?submit['\"]?\]$",
    r"^\.(ant-input|ant-input-password|ant-btn|btn)\b",
)

LOGIN_ANCHOR_GROUP_PATTERNS = {
    "role_selector": (r"role", r"角色"),
    "demo_hint": (r"demo", r"演示", r"示例账号", r"admin\s*/\s*", r"display-account"),
    "captcha_zone": (r"captcha", r"验证码", r"安全码", r"\bcode\b"),
}


def _err(errors: list[str], msg: str) -> None:
    errors.append(msg)


def _is_weak_anchor(anchor: str) -> bool:
    text = anchor.strip().lower()
    if not text:
        return False
    return any(re.search(pattern, text) for pattern in WEAK_ANCHOR_PATTERNS)


def _hit_login_group(anchor: str, patterns: tuple[str, ...]) -> bool:
    text = anchor.strip().lower()
    return any(re.search(pattern, text) for pattern in patterns)


def validate_contract(contract: dict[str, Any], errors: list[str]) -> None:
    missing_root = REQUIRED_ROOT - set(contract.keys())
    if missing_root:
        _err(errors, f"missing root fields: {sorted(missing_root)}")

    if contract.get("schema_version") != 1:
        _err(errors, "schema_version must be 1")

    module = contract.get("module")
    if not isinstance(module, str) or not module.strip():
        _err(errors, "module must be non-empty string")

    pages = contract.get("pages")
    if not isinstance(pages, list) or not pages:
        _err(errors, "pages must be non-empty list")
        return

    seen_page_ids: set[str] = set()
    for i, page in enumerate(pages):
        tag = f"pages[{i}]"
        if not isinstance(page, dict):
            _err(errors, f"{tag} must be object")
            continue

        missing = REQUIRED_PAGE_FIELDS - set(page.keys())
        if missing:
            _err(errors, f"{tag} missing fields: {sorted(missing)}")

        page_id = page.get("page_id")
        if not isinstance(page_id, str) or not page_id.strip():
            _err(errors, f"{tag}.page_id must be non-empty string")
        elif page_id in seen_page_ids:
            _err(errors, f"{tag}.page_id duplicated: {page_id}")
        else:
            seen_page_ids.add(page_id)

        route = page.get("route")
        if not isinstance(route, str) or not route.startswith("/"):
            _err(errors, f"{tag}.route must start with '/'")

        auth_mode = page.get("auth_mode")
        if auth_mode not in ALLOWED_AUTH_MODES:
            _err(errors, f"{tag}.auth_mode must be one of {sorted(ALLOWED_AUTH_MODES)}")

        viewport = page.get("viewport")
        if not isinstance(viewport, dict):
            _err(errors, f"{tag}.viewport must be object with width/height")
        else:
            w = viewport.get("width")
            h = viewport.get("height")
            if not isinstance(w, int) or w <= 0:
                _err(errors, f"{tag}.viewport.width must be positive int")
            if not isinstance(h, int) or h <= 0:
                _err(errors, f"{tag}.viewport.height must be positive int")

        diff_threshold = page.get("diff_threshold")
        if not isinstance(diff_threshold, (int, float)) or not (0 <= float(diff_threshold) <= 1):
            _err(errors, f"{tag}.diff_threshold must be number in [0,1]")

        stable_wait_ms = page.get("stable_wait_ms")
        if not isinstance(stable_wait_ms, int) or stable_wait_ms < 0:
            _err(errors, f"{tag}.stable_wait_ms must be int >= 0")

        required_anchors = page.get("required_anchors")
        if not isinstance(required_anchors, list) or len(required_anchors) == 0:
            _err(errors, f"{tag}.required_anchors must be non-empty list")
        else:
            if len(required_anchors) < MIN_REQUIRED_ANCHORS:
                _err(
                    errors,
                    f"{tag}.required_anchors must contain at least {MIN_REQUIRED_ANCHORS} anchors",
                )
            weak_count = 0
            for j, anchor in enumerate(required_anchors):
                if not isinstance(anchor, str) or not anchor.strip():
                    _err(errors, f"{tag}.required_anchors[{j}] must be non-empty string")
                    continue
                if _is_weak_anchor(anchor):
                    weak_count += 1
            if weak_count == len(required_anchors):
                _err(
                    errors,
                    f"{tag}.required_anchors cannot be all weak generic selectors",
                )

            required_anchors_any_of = page.get("required_anchors_any_of", [])
            if required_anchors_any_of is None:
                required_anchors_any_of = []
            if not isinstance(required_anchors_any_of, list):
                _err(errors, f"{tag}.required_anchors_any_of must be list[list[str]] when provided")
                required_anchors_any_of = []
            normalized_any_of: list[list[str]] = []
            for g, group in enumerate(required_anchors_any_of):
                if not isinstance(group, list) or len(group) == 0:
                    _err(errors, f"{tag}.required_anchors_any_of[{g}] must be non-empty list")
                    continue
                normalized_group: list[str] = []
                for j, anchor in enumerate(group):
                    if not isinstance(anchor, str) or not anchor.strip():
                        _err(
                            errors,
                            f"{tag}.required_anchors_any_of[{g}][{j}] must be non-empty string",
                        )
                        continue
                    normalized_group.append(anchor)
                if normalized_group:
                    normalized_any_of.append(normalized_group)

            if page_id == "login-page":
                login_anchor_pool = list(required_anchors)
                for group in normalized_any_of:
                    login_anchor_pool.extend(group)
                hit_groups = 0
                for patterns in LOGIN_ANCHOR_GROUP_PATTERNS.values():
                    if any(
                        isinstance(anchor, str) and _hit_login_group(anchor, patterns)
                        for anchor in login_anchor_pool
                    ):
                        hit_groups += 1
                if hit_groups == 0:
                    _err(
                        errors,
                        (
                            f"{tag}.required_anchors for login-page must include at least one "
                            "recognizable anchor group: role selector / demo hint / captcha zone"
                        ),
                    )

        capture_mode = page.get("capture_mode", "clip")
        if capture_mode not in ALLOWED_CAPTURE_MODES:
            _err(errors, f"{tag}.capture_mode must be one of {sorted(ALLOWED_CAPTURE_MODES)}")
        if capture_mode == "clip" and not isinstance(page.get("clip_selector"), str):
            # Allow prototype_selector as fallback for clip; clip_selector can be omitted.
            if not isinstance(page.get("prototype_selector"), str):
                _err(errors, f"{tag}.clip mode requires clip_selector or prototype_selector")

        mask_selectors = page.get("mask_selectors", [])
        if not isinstance(mask_selectors, list):
            _err(errors, f"{tag}.mask_selectors must be list")

        style_contracts = page.get("style_contracts", [])
        if style_contracts is None:
            style_contracts = []
        if not isinstance(style_contracts, list):
            _err(errors, f"{tag}.style_contracts must be list when provided")
            style_contracts = []
        for s, rule in enumerate(style_contracts):
            style_tag = f"{tag}.style_contracts[{s}]"
            if not isinstance(rule, dict):
                _err(errors, f"{style_tag} must be object")
                continue
            selector = rule.get("selector")
            prop = rule.get("property")
            expected = rule.get("expected")
            tolerance = rule.get("tolerance")
            if not isinstance(selector, str) or not selector.strip():
                _err(errors, f"{style_tag}.selector must be non-empty string")
            if not isinstance(prop, str) or not prop.strip():
                _err(errors, f"{style_tag}.property must be non-empty string")
            if not isinstance(expected, str) or not expected.strip():
                _err(errors, f"{style_tag}.expected must be non-empty string")
            if tolerance is not None and (
                not isinstance(tolerance, (int, float)) or float(tolerance) < 0
            ):
                _err(errors, f"{style_tag}.tolerance must be number >= 0 when provided")

        state_cases = page.get("state_cases", [])
        if state_cases is None:
            state_cases = []
        if not isinstance(state_cases, list):
            _err(errors, f"{tag}.state_cases must be list when provided")
            state_cases = []
        for c, case in enumerate(state_cases):
            case_tag = f"{tag}.state_cases[{c}]"
            if not isinstance(case, dict):
                _err(errors, f"{case_tag} must be object")
                continue
            state = case.get("state")
            target = case.get("target")
            assertion = case.get("assertion")
            if state not in ALLOWED_STATE_CASES:
                _err(errors, f"{case_tag}.state must be one of {sorted(ALLOWED_STATE_CASES)}")
            if not isinstance(target, str) or not target.strip():
                _err(errors, f"{case_tag}.target must be non-empty string")
            if not isinstance(assertion, dict):
                _err(errors, f"{case_tag}.assertion must be object")
                continue
            assertion_type = assertion.get("type")
            if assertion_type not in ALLOWED_STATE_ASSERTIONS:
                _err(
                    errors,
                    f"{case_tag}.assertion.type must be one of {sorted(ALLOWED_STATE_ASSERTIONS)}",
                )
                continue
            if assertion_type == "text":
                value = assertion.get("value")
                if not isinstance(value, str) or not value.strip():
                    _err(errors, f"{case_tag}.assertion.value must be non-empty string for text")
            elif assertion_type == "css":
                prop = assertion.get("property")
                value = assertion.get("value")
                if not isinstance(prop, str) or not prop.strip():
                    _err(errors, f"{case_tag}.assertion.property must be non-empty string for css")
                if not isinstance(value, str) or not value.strip():
                    _err(errors, f"{case_tag}.assertion.value must be non-empty string for css")
            else:
                if "value" in assertion and (
                    not isinstance(assertion.get("value"), str) or not assertion.get("value").strip()
                ):
                    _err(errors, f"{case_tag}.assertion.value must be non-empty string when provided")


def main() -> int:
    parser = argparse.ArgumentParser(description="UI visual contract guard")
    parser.add_argument("--contract", required=True, help="Path to UI-VISUAL-CONTRACT.yaml")
    parser.add_argument(
        "--allow-missing-baseline",
        action="store_true",
        help="Allow missing baseline files (for generate mode).",
    )
    parser.add_argument("--output-json", help="Write summary JSON to this path.")
    args = parser.parse_args()

    contract_path = Path(args.contract)
    if not contract_path.exists():
        print(f"FAIL: contract file not found: {contract_path}")
        return 1

    try:
        contract = yaml.safe_load(contract_path.read_text(encoding="utf-8")) or {}
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL: cannot parse contract yaml: {exc}")
        return 1

    errors: list[str] = []
    validate_contract(contract, errors)

    repo_root = Path.cwd()
    pages: list[dict[str, Any]] = contract.get("pages", []) if isinstance(contract.get("pages"), list) else []
    baseline_missing: list[str] = []
    baseline_existing = 0
    for page in pages:
        ref = page.get("baseline_ref")
        if not isinstance(ref, str) or not ref.strip():
            continue
        baseline_path = (repo_root / ref).resolve()
        if baseline_path.exists():
            baseline_existing += 1
        else:
            baseline_missing.append(ref)

    summary = {
        "contract": str(contract_path),
        "module": contract.get("module"),
        "total_pages": len(pages),
        "baseline_existing": baseline_existing,
        "baseline_missing": len(baseline_missing),
        "baseline_missing_refs": baseline_missing,
        "errors": errors,
    }

    if args.output_json:
        out = Path(args.output_json)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    if errors:
        print("FAIL: UI visual contract schema validation failed:")
        for err in errors:
            print(f"  - {err}")
        return 1

    print(
        "INFO: ui_visual_contract_guard "
        f"module={summary['module']} pages={summary['total_pages']} "
        f"baseline_existing={summary['baseline_existing']} baseline_missing={summary['baseline_missing']}"
    )

    if baseline_missing and not args.allow_missing_baseline:
        print("FAIL: missing visual baselines:")
        for ref in baseline_missing:
            print(f"  - {ref}")
        return 1

    print("PASS: ui_visual_contract_guard")
    return 0


if __name__ == "__main__":
    sys.exit(main())
