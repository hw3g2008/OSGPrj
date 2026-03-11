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
ALLOWED_CRITICAL_STATE_CONTRACTS = {"focus", "hover", "loading", "empty", "error", "loaded"}
ALLOWED_DATA_MODES = {"live", "mock", "mask"}
ALLOWED_SURFACE_TYPES = {"page", "modal", "drawer", "popover", "panel", "wizard-step"}
ALLOWED_TRIGGER_TYPES = {"click", "keyboard", "route-param", "auto-open"}
ALLOWED_SURFACE_PART_IDS = {"backdrop", "shell", "header", "body", "footer", "close-control"}
MIN_REQUIRED_ANCHORS = 3
SURFACE_ID_PATTERN = re.compile(
    r"^\|\s*((?:modal|drawer|popover|panel|wizard-step)-[^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$",
    re.M,
)

# Generic selectors are too weak to serve as the only structural anchors.
WEAK_ANCHOR_PATTERNS = (
    r"^input(\\b|$)",
    r"^input\\[type=['\"]?(text|password|email|search|number|tel)['\"]?\\]$",
    r"^textarea(\\b|$)",
    r"^select(\\b|$)",
    r"^button(\\b|$)",
    r"^button\\[type=['\"]?submit['\"]?\\]$",
    r"^\\.(ant-input|ant-input-password|ant-btn|btn)\\b",
)

LOGIN_ANCHOR_GROUP_PATTERNS = {
    "role_selector": (r"role", r"角色"),
    "demo_hint": (r"demo", r"演示", r"示例账号", r"admin\\s*/\\s*", r"display-account"),
    "captcha_zone": (r"captcha", r"验证码", r"安全码", r"\\bcode\\b"),
}


def _err(errors: list[str], msg: str) -> None:
    errors.append(msg)


def _load_ui_delivery_policy(config_path: Path, errors: list[str]) -> dict[str, Any]:
    if not config_path.exists():
        _err(errors, f"project config not found: {config_path}")
        return {}
    try:
        data = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    except Exception as exc:  # noqa: BLE001
        _err(errors, f"cannot parse project config: {exc}")
        return {}
    if not isinstance(data, dict):
        _err(errors, "project config must parse to mapping")
        return {}
    workflow_policy = data.get("workflow_policy")
    if not isinstance(workflow_policy, dict):
        _err(errors, "project config workflow_policy must be mapping")
    ui_delivery_policy = data.get("ui_delivery_policy")
    if not isinstance(ui_delivery_policy, dict):
        _err(errors, "project config ui_delivery_policy must be mapping")
        return {}
    return ui_delivery_policy


def _normalize_policy_string_list(value: Any) -> set[str]:
    if not isinstance(value, list):
        return set()
    normalized: set[str] = set()
    for item in value:
        if isinstance(item, str) and item.strip():
            normalized.add(item.strip().lower())
    return normalized


def _page_multistate_widget_hits(page: dict[str, Any], widget_ids: set[str]) -> set[str]:
    hits: set[str] = set()
    critical_surfaces = page.get("critical_surfaces")
    if not isinstance(critical_surfaces, list):
        return hits
    for surface in critical_surfaces:
        if not isinstance(surface, dict):
            continue
        surface_id = surface.get("surface_id")
        if isinstance(surface_id, str) and surface_id.strip().lower() in widget_ids:
            hits.add(surface_id.strip().lower())
    return hits


def _surface_multistate_widget_hits(surface: dict[str, Any], widget_ids: set[str]) -> set[str]:
    hits: set[str] = set()
    content_parts = surface.get("content_parts")
    if not isinstance(content_parts, list):
        return hits
    for part in content_parts:
        if not isinstance(part, dict):
            continue
        part_id = part.get("part_id")
        if isinstance(part_id, str) and part_id.strip().lower() in widget_ids:
            hits.add(part_id.strip().lower())
    return hits


def _has_non_default_state_id(items: Any) -> bool:
    if not isinstance(items, list):
        return False
    for item in items:
        if not isinstance(item, dict):
            continue
        state_id = item.get("state_id")
        if isinstance(state_id, str) and state_id.strip() and state_id.strip().lower() != "default":
            return True
    return False


def _state_ids(items: Any) -> set[str]:
    if not isinstance(items, list):
        return set()
    result: set[str] = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        state_id = item.get("state_id")
        if isinstance(state_id, str) and state_id.strip():
            result.add(state_id.strip())
    return result


def _normalize_selector(selector: str) -> str:
    return re.sub(r"\s+", " ", selector.strip())


def _is_weak_anchor(anchor: str) -> bool:
    text = anchor.strip().lower()
    if not text:
        return False
    return any(re.search(pattern, text) for pattern in WEAK_ANCHOR_PATTERNS)


def _hit_login_group(anchor: str, patterns: tuple[str, ...]) -> bool:
    text = anchor.strip().lower()
    return any(re.search(pattern, text) for pattern in patterns)


def _selectors_overlap(left: str, right: str) -> bool:
    left_norm = _normalize_selector(left)
    right_norm = _normalize_selector(right)
    if not left_norm or not right_norm:
        return False
    return (
        left_norm == right_norm
        or left_norm in right_norm
        or right_norm in left_norm
    )


def _validate_style_contracts(page: dict[str, Any], tag: str, errors: list[str]) -> None:
    style_contracts = page.get("style_contracts", [])
    if style_contracts is None:
        style_contracts = []
    if not isinstance(style_contracts, list):
        _err(errors, f"{tag}.style_contracts must be list when provided")
        return

    for i, rule in enumerate(style_contracts):
        rtag = f"{tag}.style_contracts[{i}]"
        if not isinstance(rule, dict):
            _err(errors, f"{rtag} must be object")
            continue

        selector = rule.get("selector")
        if not isinstance(selector, str) or not selector.strip():
            _err(errors, f"{rtag}.selector must be non-empty string")

        prop = rule.get("property")
        if not isinstance(prop, str) or not prop.strip():
            _err(errors, f"{rtag}.property must be non-empty string")

        expected = rule.get("expected")
        if not isinstance(expected, str) or not expected.strip():
            _err(errors, f"{rtag}.expected must be non-empty string")

        tolerance = rule.get("tolerance")
        if tolerance is not None and (not isinstance(tolerance, (int, float)) or float(tolerance) < 0):
            _err(errors, f"{rtag}.tolerance must be number >= 0 when provided")


def _validate_state_cases(page: dict[str, Any], tag: str, errors: list[str]) -> None:
    state_cases = page.get("state_cases", [])
    if state_cases is None:
        state_cases = []
    if not isinstance(state_cases, list):
        _err(errors, f"{tag}.state_cases must be list when provided")
        return

    for i, case in enumerate(state_cases):
        ctag = f"{tag}.state_cases[{i}]"
        if not isinstance(case, dict):
            _err(errors, f"{ctag} must be object")
            continue

        state = case.get("state")
        if state not in ALLOWED_STATE_CASES:
            _err(errors, f"{ctag}.state must be one of {sorted(ALLOWED_STATE_CASES)}")

        target = case.get("target")
        if not isinstance(target, str) or not target.strip():
            _err(errors, f"{ctag}.target must be non-empty string")

        assertion = case.get("assertion")
        if not isinstance(assertion, dict):
            _err(errors, f"{ctag}.assertion must be object")
            continue

        atype = assertion.get("type")
        if atype not in ALLOWED_STATE_ASSERTIONS:
            _err(errors, f"{ctag}.assertion.type must be one of {sorted(ALLOWED_STATE_ASSERTIONS)}")
            continue

        if atype == "text":
            value = assertion.get("value")
            if not isinstance(value, str) or not value.strip():
                _err(errors, f"{ctag}.assertion.value must be non-empty string for text assertion")
        elif atype == "css":
            prop = assertion.get("property")
            value = assertion.get("value")
            if not isinstance(prop, str) or not prop.strip():
                _err(errors, f"{ctag}.assertion.property must be non-empty string for css assertion")
            if not isinstance(value, str) or not value.strip():
                _err(errors, f"{ctag}.assertion.value must be non-empty string for css assertion")


def _validate_surface_style_contracts(
    style_contracts: Any,
    tag: str,
    errors: list[str],
) -> None:
    if not isinstance(style_contracts, list) or len(style_contracts) == 0:
        _err(errors, f"{tag}.style_contracts must be non-empty list")
        return

    for i, rule in enumerate(style_contracts):
        rtag = f"{tag}.style_contracts[{i}]"
        if not isinstance(rule, dict):
            _err(errors, f"{rtag} must be object")
            continue

        target = rule.get("target")
        if target is not None and (not isinstance(target, str) or not target.strip()):
            _err(errors, f"{rtag}.target must be non-empty string when provided")

        prop = rule.get("property")
        if not isinstance(prop, str) or not prop.strip():
            _err(errors, f"{rtag}.property must be non-empty string")

        expected = rule.get("expected")
        if not isinstance(expected, str) or not expected.strip():
            _err(errors, f"{rtag}.expected must be non-empty string")

        tolerance = rule.get("tolerance")
        if tolerance is not None and (not isinstance(tolerance, (int, float)) or float(tolerance) < 0):
            _err(errors, f"{rtag}.tolerance must be number >= 0 when provided")


def _validate_surface_state_contracts(
    state_contracts: Any,
    tag: str,
    errors: list[str],
) -> None:
    if not isinstance(state_contracts, list) or len(state_contracts) == 0:
        _err(errors, f"{tag}.state_contracts must be non-empty list")
        return

    for i, contract in enumerate(state_contracts):
        ctag = f"{tag}.state_contracts[{i}]"
        if not isinstance(contract, dict):
            _err(errors, f"{ctag} must be object")
            continue

        state = contract.get("state")
        if state not in ALLOWED_CRITICAL_STATE_CONTRACTS:
            _err(errors, f"{ctag}.state must be one of {sorted(ALLOWED_CRITICAL_STATE_CONTRACTS)}")

        target = contract.get("target")
        if target is not None and (not isinstance(target, str) or not target.strip()):
            _err(errors, f"{ctag}.target must be non-empty string when provided")

        assertions = contract.get("assertions")
        if not isinstance(assertions, list) or len(assertions) == 0:
            _err(errors, f"{ctag}.assertions must be non-empty list")
            continue

        for j, assertion in enumerate(assertions):
            atag = f"{ctag}.assertions[{j}]"
            if not isinstance(assertion, dict):
                _err(errors, f"{atag} must be object")
                continue

            assertion_target = assertion.get("target")
            if assertion_target is not None and (
                not isinstance(assertion_target, str) or not assertion_target.strip()
            ):
                _err(errors, f"{atag}.target must be non-empty string when provided")

            prop = assertion.get("property")
            if not isinstance(prop, str) or not prop.strip():
                _err(errors, f"{atag}.property must be non-empty string")

            expected = assertion.get("expected")
            if not isinstance(expected, str) or not expected.strip():
                _err(errors, f"{atag}.expected must be non-empty string")


def _validate_relation_contracts(
    relation_contracts: Any,
    tag: str,
    errors: list[str],
) -> None:
    if relation_contracts is None:
        return
    if not isinstance(relation_contracts, list):
        _err(errors, f"{tag}.relation_contracts must be list when provided")
        return

    for i, relation in enumerate(relation_contracts):
        rtag = f"{tag}.relation_contracts[{i}]"
        if not isinstance(relation, dict):
            _err(errors, f"{rtag} must be object")
            continue

        relation_type = relation.get("type")
        if not isinstance(relation_type, str) or not relation_type.strip():
            _err(errors, f"{rtag}.type must be non-empty string")

        target = relation.get("target")
        if not isinstance(target, str) or not target.strip():
            _err(errors, f"{rtag}.target must be non-empty string")

        expected = relation.get("expected")
        if expected is not None and (not isinstance(expected, str) or not expected.strip()):
            _err(errors, f"{rtag}.expected must be non-empty string when provided")


def _validate_surface_schema_style_contracts(style_contracts: Any, tag: str, errors: list[str]) -> None:
    if not isinstance(style_contracts, list) or len(style_contracts) == 0:
        _err(errors, f"{tag}.style_contracts must be non-empty list")
        return
    for i, rule in enumerate(style_contracts):
        rtag = f"{tag}.style_contracts[{i}]"
        if not isinstance(rule, dict):
            _err(errors, f"{rtag} must be object")
            continue
        selector = rule.get("selector")
        if not isinstance(selector, str) or not selector.strip():
            _err(errors, f"{rtag}.selector must be non-empty string")
        prototype_selector = rule.get("prototype_selector")
        if prototype_selector is not None and (
            not isinstance(prototype_selector, str) or not prototype_selector.strip()
        ):
            _err(errors, f"{rtag}.prototype_selector must be non-empty string when provided")
        css = rule.get("css")
        if not isinstance(css, dict) or len(css) == 0:
            _err(errors, f"{rtag}.css must be non-empty object")
            continue
        for key, value in css.items():
            if not isinstance(key, str) or not key.strip():
                _err(errors, f"{rtag}.css keys must be non-empty strings")
            if not isinstance(value, str) or not value.strip():
                _err(errors, f"{rtag}.css[{key!r}] must be non-empty string")


def _validate_surface_schema_state_contracts(state_contracts: Any, tag: str, errors: list[str]) -> None:
    if not isinstance(state_contracts, list) or len(state_contracts) == 0:
        _err(errors, f"{tag}.state_contracts must be non-empty list")
        return
    for i, contract in enumerate(state_contracts):
        ctag = f"{tag}.state_contracts[{i}]"
        if not isinstance(contract, dict):
            _err(errors, f"{ctag} must be object")
            continue
        state_id = contract.get("state_id")
        if not isinstance(state_id, str) or not state_id.strip():
            _err(errors, f"{ctag}.state_id must be non-empty string")
        anchors = contract.get("required_anchors")
        if not isinstance(anchors, list) or len(anchors) == 0:
            _err(errors, f"{ctag}.required_anchors must be non-empty list")
        else:
            for j, anchor in enumerate(anchors):
                if not isinstance(anchor, str) or not anchor.strip():
                    _err(errors, f"{ctag}.required_anchors[{j}] must be non-empty string")
        prototype_anchors = contract.get("prototype_required_anchors")
        if prototype_anchors is not None:
            if not isinstance(prototype_anchors, list) or len(prototype_anchors) == 0:
                _err(errors, f"{ctag}.prototype_required_anchors must be non-empty list when provided")
            else:
                for j, anchor in enumerate(prototype_anchors):
                    if not isinstance(anchor, str) or not anchor.strip():
                        _err(errors, f"{ctag}.prototype_required_anchors[{j}] must be non-empty string")
        _validate_surface_schema_style_contracts(contract.get("style_contracts"), ctag, errors)


def _validate_surface_schema(contract: dict[str, Any], page_ids: set[str], errors: list[str]) -> None:
    surfaces = contract.get("surfaces")
    if surfaces is None:
        return
    if not isinstance(surfaces, list):
        _err(errors, "surfaces must be list when provided")
        return

    seen_surface_ids: set[str] = set()
    for i, surface in enumerate(surfaces):
        stag = f"surfaces[{i}]"
        if not isinstance(surface, dict):
            _err(errors, f"{stag} must be object")
            continue

        surface_id = surface.get("surface_id")
        if not isinstance(surface_id, str) or not surface_id.strip():
            _err(errors, f"{stag}.surface_id must be non-empty string")
        elif surface_id in seen_surface_ids:
            _err(errors, f"{stag}.surface_id duplicated: {surface_id}")
        else:
            seen_surface_ids.add(surface_id)

        surface_type = surface.get("surface_type")
        if surface_type not in ALLOWED_SURFACE_TYPES:
            _err(errors, f"{stag}.surface_type must be one of {sorted(ALLOWED_SURFACE_TYPES)}")

        host_page_id = surface.get("host_page_id")
        if not isinstance(host_page_id, str) or not host_page_id.strip():
            _err(errors, f"{stag}.host_page_id must be non-empty string")
        elif host_page_id not in page_ids:
            _err(errors, f"{stag}.host_page_id references unknown page_id: {host_page_id}")

        for field in ("prototype_selector", "app_selector", "surface_root_selector", "backdrop_selector"):
            value = surface.get(field)
            if not isinstance(value, str) or not value.strip():
                _err(errors, f"{stag}.{field} must be non-empty string")

        source_ref = surface.get("source_ref")
        if not isinstance(source_ref, str) or not source_ref.strip():
            _err(errors, f"{stag}.source_ref must be non-empty string")

        portal_host = surface.get("portal_host")
        if portal_host is not None and (not isinstance(portal_host, str) or not portal_host.strip()):
            _err(errors, f"{stag}.portal_host must be non-empty string when provided")

        trigger_action = surface.get("trigger_action")
        if not isinstance(trigger_action, dict):
            _err(errors, f"{stag}.trigger_action must be object")
        else:
            trigger_type = trigger_action.get("type")
            if trigger_type not in ALLOWED_TRIGGER_TYPES:
                _err(errors, f"{stag}.trigger_action.type must be one of {sorted(ALLOWED_TRIGGER_TYPES)}")
            trigger_selector = trigger_action.get("selector")
            prototype_trigger_selector = trigger_action.get("prototype_selector")
            trigger_script = trigger_action.get("script")
            prototype_trigger_script = trigger_action.get("prototype_script")
            if trigger_type in {"click", "keyboard"} and (
                not isinstance(trigger_selector, str) or not trigger_selector.strip()
            ):
                _err(errors, f"{stag}.trigger_action.selector must be non-empty string for interactive triggers")
            if prototype_trigger_selector is not None and (
                not isinstance(prototype_trigger_selector, str) or not prototype_trigger_selector.strip()
            ):
                _err(errors, f"{stag}.trigger_action.prototype_selector must be non-empty string when provided")
            if trigger_script is not None and (
                not isinstance(trigger_script, str) or not trigger_script.strip()
            ):
                _err(errors, f"{stag}.trigger_action.script must be non-empty string when provided")
            if prototype_trigger_script is not None and (
                not isinstance(prototype_trigger_script, str) or not prototype_trigger_script.strip()
            ):
                _err(errors, f"{stag}.trigger_action.prototype_script must be non-empty string when provided")

        anchors = surface.get("required_anchors")
        if not isinstance(anchors, list) or len(anchors) == 0:
            _err(errors, f"{stag}.required_anchors must be non-empty list")
        else:
            for j, anchor in enumerate(anchors):
                if not isinstance(anchor, str) or not anchor.strip():
                    _err(errors, f"{stag}.required_anchors[{j}] must be non-empty string")
        prototype_anchors = surface.get("prototype_required_anchors")
        if prototype_anchors is not None:
            if not isinstance(prototype_anchors, list) or len(prototype_anchors) == 0:
                _err(errors, f"{stag}.prototype_required_anchors must be non-empty list when provided")
            else:
                for j, anchor in enumerate(prototype_anchors):
                    if not isinstance(anchor, str) or not anchor.strip():
                        _err(errors, f"{stag}.prototype_required_anchors[{j}] must be non-empty string")

        viewport_variants = surface.get("viewport_variants")
        if not isinstance(viewport_variants, list) or len(viewport_variants) == 0:
            _err(errors, f"{stag}.viewport_variants must be non-empty list")
        else:
            for j, viewport in enumerate(viewport_variants):
                vtag = f"{stag}.viewport_variants[{j}]"
                if not isinstance(viewport, dict):
                    _err(errors, f"{vtag} must be object")
                    continue
                viewport_id = viewport.get("viewport_id")
                if not isinstance(viewport_id, str) or not viewport_id.strip():
                    _err(errors, f"{vtag}.viewport_id must be non-empty string")
                for dim in ("width", "height"):
                    value = viewport.get(dim)
                    if not isinstance(value, int) or value <= 0:
                        _err(errors, f"{vtag}.{dim} must be positive int")

        state_variants = surface.get("state_variants")
        if not isinstance(state_variants, list) or len(state_variants) == 0:
            _err(errors, f"{stag}.state_variants must be non-empty list")
        else:
            for j, variant in enumerate(state_variants):
                vtag = f"{stag}.state_variants[{j}]"
                if not isinstance(variant, dict):
                    _err(errors, f"{vtag} must be object")
                    continue
                state_id = variant.get("state_id")
                if not isinstance(state_id, str) or not state_id.strip():
                    _err(errors, f"{vtag}.state_id must be non-empty string")

        surface_parts = surface.get("surface_parts")
        if not isinstance(surface_parts, list) or len(surface_parts) == 0:
            _err(errors, f"{stag}.surface_parts must be non-empty list")
        else:
            seen_parts: set[str] = set()
            for j, part in enumerate(surface_parts):
                ptag = f"{stag}.surface_parts[{j}]"
                if not isinstance(part, dict):
                    _err(errors, f"{ptag} must be object")
                    continue
                part_id = part.get("part_id")
                if part_id not in ALLOWED_SURFACE_PART_IDS:
                    _err(errors, f"{ptag}.part_id must be one of {sorted(ALLOWED_SURFACE_PART_IDS)}")
                elif part_id in seen_parts:
                    _err(errors, f"{ptag}.part_id duplicated: {part_id}")
                else:
                    seen_parts.add(part_id)
                selector = part.get("selector")
                if not isinstance(selector, str) or not selector.strip():
                    _err(errors, f"{ptag}.selector must be non-empty string")
                prototype_selector = part.get("prototype_selector")
                if prototype_selector is not None and (
                    not isinstance(prototype_selector, str) or not prototype_selector.strip()
                ):
                    _err(errors, f"{ptag}.prototype_selector must be non-empty string when provided")
                mask_allowed = part.get("mask_allowed")
                if not isinstance(mask_allowed, bool):
                    _err(errors, f"{ptag}.mask_allowed must be boolean")

        content_parts = surface.get("content_parts")
        if content_parts is not None:
            if not isinstance(content_parts, list) or len(content_parts) == 0:
                _err(errors, f"{stag}.content_parts must be non-empty list when provided")
            else:
                seen_content_parts: set[str] = set()
                for j, part in enumerate(content_parts):
                    ptag = f"{stag}.content_parts[{j}]"
                    if not isinstance(part, dict):
                        _err(errors, f"{ptag} must be object")
                        continue
                    part_id = part.get("part_id")
                    if not isinstance(part_id, str) or not part_id.strip():
                        _err(errors, f"{ptag}.part_id must be non-empty string")
                    elif part_id in seen_content_parts:
                        _err(errors, f"{ptag}.part_id duplicated: {part_id}")
                    else:
                        seen_content_parts.add(part_id)
                    selector = part.get("selector")
                    if not isinstance(selector, str) or not selector.strip():
                        _err(errors, f"{ptag}.selector must be non-empty string")
                    prototype_selector = part.get("prototype_selector")
                    if prototype_selector is not None and (
                        not isinstance(prototype_selector, str) or not prototype_selector.strip()
                    ):
                        _err(errors, f"{ptag}.prototype_selector must be non-empty string when provided")
                    required = part.get("required")
                    if required is not None and not isinstance(required, bool):
                        _err(errors, f"{ptag}.required must be boolean when provided")

        _validate_surface_schema_style_contracts(surface.get("style_contracts"), stag, errors)
        _validate_surface_schema_state_contracts(surface.get("state_contracts"), stag, errors)


def _apply_strict_policy_to_page(
    page: dict[str, Any],
    tag: str,
    policy: dict[str, Any] | None,
    errors: list[str],
) -> None:
    if not isinstance(policy, dict) or policy.get("strict_visual_contract") is not True:
        return

    if policy.get("forbid_diff_threshold_relaxation") is True:
        diff_threshold = page.get("diff_threshold")
        if isinstance(diff_threshold, (int, float)) and float(diff_threshold) != 0:
            _err(
                errors,
                (
                    f"{tag}.diff_threshold must be 0 when "
                    "ui_delivery_policy.forbid_diff_threshold_relaxation=true"
                ),
            )

    if policy.get("forbid_snapshot_bypass") is True and page.get("snapshot_compare") is False:
        _err(
            errors,
            (
                f"{tag}.snapshot_compare=false is forbidden when "
                "ui_delivery_policy.forbid_snapshot_bypass=true"
            ),
        )

    if policy.get("forbid_mask_waiver") is True:
        mask_selectors = page.get("mask_selectors")
        if isinstance(mask_selectors, list) and len(mask_selectors) > 0:
            _err(
                errors,
                (
                    f"{tag}.mask_selectors must be empty when "
                    "ui_delivery_policy.forbid_mask_waiver=true"
                ),
            )

        dynamic_regions = page.get("dynamic_regions")
        if isinstance(dynamic_regions, list) and len(dynamic_regions) > 0:
            _err(
                errors,
                (
                    f"{tag}.dynamic_regions must be empty when "
                    "ui_delivery_policy.forbid_mask_waiver=true"
                ),
            )

        if page.get("data_mode") == "mask":
            _err(
                errors,
                (
                    f"{tag}.data_mode=mask is forbidden when "
                    "ui_delivery_policy.forbid_mask_waiver=true"
                ),
            )

        critical_surfaces = page.get("critical_surfaces")
        if isinstance(critical_surfaces, list):
            for i, surface in enumerate(critical_surfaces):
                if isinstance(surface, dict) and surface.get("mask_allowed") is True:
                    _err(
                        errors,
                        (
                            f"{tag}.critical_surfaces[{i}].mask_allowed=true is forbidden when "
                            "ui_delivery_policy.forbid_mask_waiver=true"
                        ),
                    )

    if policy.get("require_state_coverage_for_multistate_widgets") is True:
        widget_ids = _normalize_policy_string_list(policy.get("multistate_widget_part_ids"))
        hits = sorted(_page_multistate_widget_hits(page, widget_ids))
        if hits:
            state_cases = page.get("state_cases")
            if not isinstance(state_cases, list) or len(state_cases) == 0:
                _err(
                    errors,
                    (
                        f"{tag}.state_cases must be non-empty for multistate widgets {hits} when "
                        "ui_delivery_policy.require_state_coverage_for_multistate_widgets=true"
                    ),
                )


def _apply_strict_policy_to_surfaces(
    contract: dict[str, Any],
    policy: dict[str, Any] | None,
    errors: list[str],
) -> None:
    if not isinstance(policy, dict) or policy.get("strict_visual_contract") is not True:
        return

    surfaces = contract.get("surfaces")
    if not isinstance(surfaces, list):
        return

    for i, surface in enumerate(surfaces):
        if not isinstance(surface, dict):
            continue
        if policy.get("forbid_mask_waiver") is True:
            surface_parts = surface.get("surface_parts")
            if isinstance(surface_parts, list):
                for j, part in enumerate(surface_parts):
                    if isinstance(part, dict) and part.get("mask_allowed") is True:
                        _err(
                            errors,
                            (
                                f"surfaces[{i}].surface_parts[{j}].mask_allowed=true is forbidden when "
                                "ui_delivery_policy.forbid_mask_waiver=true"
                            ),
                        )

        if policy.get("require_state_coverage_for_multistate_widgets") is not True:
            continue

        widget_ids = _normalize_policy_string_list(policy.get("multistate_widget_part_ids"))
        hits = sorted(_surface_multistate_widget_hits(surface, widget_ids))
        if not hits:
            continue

        state_variants = surface.get("state_variants")
        state_contracts = surface.get("state_contracts")
        tag = f"surfaces[{i}]"
        if not isinstance(state_variants, list) or len(state_variants) == 0 or not _has_non_default_state_id(state_variants):
            _err(
                errors,
                (
                    f"{tag}.state_variants must include at least one non-default state for multistate widgets {hits} when "
                    "ui_delivery_policy.require_state_coverage_for_multistate_widgets=true"
                ),
            )
        if not isinstance(state_contracts, list) or len(state_contracts) == 0 or not _has_non_default_state_id(state_contracts):
            _err(
                errors,
                (
                    f"{tag}.state_contracts must include at least one non-default state for multistate widgets {hits} when "
                    "ui_delivery_policy.require_state_coverage_for_multistate_widgets=true"
                ),
            )
        variant_ids = _state_ids(state_variants)
        contract_ids = _state_ids(state_contracts)
        if variant_ids and contract_ids and not variant_ids.issubset(contract_ids):
            missing_ids = sorted(variant_ids - contract_ids)
            _err(
                errors,
                (
                    f"{tag}.state_contracts missing state ids {missing_ids} for multistate widgets {hits} when "
                    "ui_delivery_policy.require_state_coverage_for_multistate_widgets=true"
                ),
            )


def _collect_surface_ids(contract: dict[str, Any]) -> set[str]:
    surfaces = contract.get("surfaces")
    if not isinstance(surfaces, list):
        return set()
    result: set[str] = set()
    for surface in surfaces:
        if isinstance(surface, dict):
            surface_id = surface.get("surface_id")
            if isinstance(surface_id, str) and surface_id.strip():
                result.add(surface_id.strip())
    return result


def _load_declared_surface_ids(contract_path: Path) -> set[str]:
    matrix_path = contract_path.with_name("MATRIX.md")
    if not matrix_path.exists():
        return set()

    text = matrix_path.read_text(encoding="utf-8")
    return {match.group(1).strip() for match in SURFACE_ID_PATTERN.finditer(text)}


def _validate_critical_surfaces(
    page: dict[str, Any],
    tag: str,
    mask_selectors: list[Any],
    errors: list[str],
) -> None:
    critical_surfaces = page.get("critical_surfaces", [])
    if critical_surfaces is None:
        critical_surfaces = []
    if not isinstance(critical_surfaces, list):
        _err(errors, f"{tag}.critical_surfaces must be list when provided")
        return

    seen_surface_ids: set[str] = set()
    for i, surface in enumerate(critical_surfaces):
        stag = f"{tag}.critical_surfaces[{i}]"
        if not isinstance(surface, dict):
            _err(errors, f"{stag} must be object")
            continue

        surface_id = surface.get("surface_id")
        if not isinstance(surface_id, str) or not surface_id.strip():
            _err(errors, f"{stag}.surface_id must be non-empty string")
        elif surface_id in seen_surface_ids:
            _err(errors, f"{stag}.surface_id duplicated: {surface_id}")
        else:
            seen_surface_ids.add(surface_id)

        selector = surface.get("selector")
        if not isinstance(selector, str) or not selector.strip():
            _err(errors, f"{stag}.selector must be non-empty string")

        mask_allowed = surface.get("mask_allowed")
        if not isinstance(mask_allowed, bool):
            _err(errors, f"{stag}.mask_allowed must be boolean")

        required_anchors = surface.get("required_anchors")
        if not isinstance(required_anchors, list) or len(required_anchors) == 0:
            _err(errors, f"{stag}.required_anchors must be non-empty list")
        else:
            for j, anchor in enumerate(required_anchors):
                if not isinstance(anchor, str) or not anchor.strip():
                    _err(errors, f"{stag}.required_anchors[{j}] must be non-empty string")

        _validate_surface_style_contracts(surface.get("style_contracts"), stag, errors)
        _validate_surface_state_contracts(surface.get("state_contracts"), stag, errors)
        _validate_relation_contracts(surface.get("relation_contracts"), stag, errors)

        if mask_allowed is False and isinstance(selector, str) and selector.strip():
            for j, mask_selector in enumerate(mask_selectors):
                if not isinstance(mask_selector, str) or not mask_selector.strip():
                    continue
                if _selectors_overlap(mask_selector, selector):
                    _err(
                        errors,
                        (
                            f"{stag}.mask_allowed=false conflicts with "
                            f"{tag}.mask_selectors[{j}]={mask_selector!r}"
                        ),
                    )


def _validate_fixture_routes(page: dict[str, Any], tag: str, errors: list[str]) -> int:
    fixture_routes = page.get("fixture_routes", [])
    if fixture_routes is None:
        fixture_routes = []
    if not isinstance(fixture_routes, list):
        _err(errors, f"{tag}.fixture_routes must be list when provided")
        return 0

    valid_count = 0
    for i, route in enumerate(fixture_routes):
        rtag = f"{tag}.fixture_routes[{i}]"
        if not isinstance(route, dict):
            _err(errors, f"{rtag} must be object")
            continue
        url = route.get("url")
        if not isinstance(url, str) or not url.strip() or "/" not in url:
            _err(errors, f"{rtag}.url must be non-empty string path")
        method = route.get("method")
        if method is not None and (not isinstance(method, str) or not method.strip()):
            _err(errors, f"{rtag}.method must be non-empty string when provided")
        response_ref = route.get("response_ref")
        if not isinstance(response_ref, str) or not response_ref.strip():
            _err(errors, f"{rtag}.response_ref must be non-empty string")
        status = route.get("status")
        if status is not None and (not isinstance(status, int) or status < 100 or status > 599):
            _err(errors, f"{rtag}.status must be valid HTTP status code when provided")
        headers = route.get("headers")
        if headers is not None:
            if not isinstance(headers, dict) or not all(
                isinstance(k, str) and isinstance(v, str) for k, v in headers.items()
            ):
                _err(errors, f"{rtag}.headers must be string map when provided")
        valid_count += 1
    return valid_count


def _validate_data_strategy(page: dict[str, Any], tag: str, errors: list[str]) -> None:
    data_mode = page.get("data_mode")
    dynamic_regions = page.get("dynamic_regions", [])
    if dynamic_regions is None:
        dynamic_regions = []
    if dynamic_regions and not isinstance(dynamic_regions, list):
        _err(errors, f"{tag}.dynamic_regions must be list when provided")
        dynamic_regions = []
    elif isinstance(dynamic_regions, list):
        for i, selector in enumerate(dynamic_regions):
            if not isinstance(selector, str) or not selector.strip():
                _err(errors, f"{tag}.dynamic_regions[{i}] must be non-empty string")

    fixture_count = _validate_fixture_routes(page, tag, errors)

    auth_mode = page.get("auth_mode")
    capture_mode = page.get("capture_mode", "clip")
    needs_deterministic_strategy = auth_mode == "protected" and capture_mode == "fullpage"

    if data_mode is not None and data_mode not in ALLOWED_DATA_MODES:
        _err(errors, f"{tag}.data_mode must be one of {sorted(ALLOWED_DATA_MODES)}")
        return

    if needs_deterministic_strategy and data_mode is None:
        _err(
            errors,
            (
                f"{tag}.data_mode is required for protected fullpage pages; "
                "declare mock or mask explicitly to avoid live-data false negatives"
            ),
        )
        return

    if data_mode == "mock" and fixture_count == 0:
        _err(errors, f"{tag}.fixture_routes must be non-empty when data_mode=mock")

    if data_mode == "mask" and len(dynamic_regions) == 0:
        _err(errors, f"{tag}.dynamic_regions must be non-empty when data_mode=mask")


def validate_contract(
    contract: dict[str, Any],
    errors: list[str],
    declared_surface_ids: set[str] | None = None,
    policy: dict[str, Any] | None = None,
) -> None:
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

        prototype_page_key = page.get("prototype_page_key")
        if prototype_page_key is not None and (
            not isinstance(prototype_page_key, str) or not prototype_page_key.strip()
        ):
            _err(errors, f"{tag}.prototype_page_key must be non-empty string when provided")

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
            mask_selectors = []

        _validate_style_contracts(page, tag, errors)
        _validate_state_cases(page, tag, errors)
        _validate_critical_surfaces(page, tag, mask_selectors, errors)
        _validate_data_strategy(page, tag, errors)
        _apply_strict_policy_to_page(page, tag, policy, errors)

    _validate_surface_schema(contract, seen_page_ids, errors)
    _apply_strict_policy_to_surfaces(contract, policy, errors)

    declared_surface_ids = declared_surface_ids or set()
    contract_surface_ids = _collect_surface_ids(contract)
    missing_declared_surfaces = sorted(declared_surface_ids - contract_surface_ids)
    for surface_id in missing_declared_surfaces:
        _err(
            errors,
            (
                "declared overlay surface missing from contract.surfaces: "
                f"{surface_id}"
            ),
        )


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
    declared_surface_ids = _load_declared_surface_ids(contract_path)
    policy = _load_ui_delivery_policy(Path.cwd() / ".claude/project/config.yaml", errors)
    validate_contract(contract, errors, declared_surface_ids=declared_surface_ids, policy=policy)

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
