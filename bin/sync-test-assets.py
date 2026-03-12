#!/usr/bin/env python3
"""Synchronize story/ticket test assets from story and ticket YAML."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import re
from typing import Any

import yaml


VALID_LEVELS = {"ticket", "story", "final"}
VALID_CATEGORIES = {"positive", "negative", "boundary", "exception", "null_empty"}
DEFAULT_SCENARIO_DESIGN = {
    "allowed": [
        "display",
        "state_change",
        "business_rule_reject",
        "auth_or_data_boundary",
        "persist_effect",
    ],
    "profiles": {
        "crud": {
            "required": [
                "display",
                "state_change",
                "business_rule_reject",
                "auth_or_data_boundary",
                "persist_effect",
            ]
        },
        "display_only": {"required": ["display", "persist_effect"]},
    },
    "obligation_to_category": {
        "display": "positive",
        "state_change": "positive",
        "business_rule_reject": "negative",
        "auth_or_data_boundary": "boundary",
        "persist_effect": "positive",
    },
}
LABEL_RE = re.compile(
    r"^\[(?P<category>[^\]]+)\]\[(?P<obligation>[^\]]+)\]\s*(?P<plain_text>.*)$"
)


def load_yaml(path: Path) -> Any:
    if not path.exists():
        raise FileNotFoundError(path)
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data


def write_yaml(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )


def load_scenario_design(config_doc: Path | None) -> dict[str, Any]:
    if config_doc is None or not config_doc.exists():
        return {
            "allowed": list(DEFAULT_SCENARIO_DESIGN["allowed"]),
            "profiles": {
                key: {"required": list(value["required"])}
                for key, value in DEFAULT_SCENARIO_DESIGN["profiles"].items()
            },
            "obligation_to_category": dict(DEFAULT_SCENARIO_DESIGN["obligation_to_category"]),
        }
    data = load_yaml(config_doc) or {}
    testing = data.get("testing") if isinstance(data, dict) else {}
    design = testing.get("design") if isinstance(testing, dict) else {}
    configured = design.get("scenario_obligations") if isinstance(design, dict) else {}
    if not isinstance(configured, dict):
        configured = {}

    profiles = configured.get("profiles")
    if not isinstance(profiles, dict) or not profiles:
        profiles = DEFAULT_SCENARIO_DESIGN["profiles"]

    normalized_profiles: dict[str, dict[str, list[str]]] = {}
    for key, value in profiles.items():
        required = value.get("required") if isinstance(value, dict) else None
        if not isinstance(required, list) or not required:
            default_required = DEFAULT_SCENARIO_DESIGN["profiles"].get(key, {}).get("required", [])
            required = list(default_required)
        normalized_profiles[key] = {
            "required": [item for item in required if isinstance(item, str) and item]
        }

    allowed = configured.get("allowed")
    if not isinstance(allowed, list) or not allowed:
        allowed = list(DEFAULT_SCENARIO_DESIGN["allowed"])
    else:
        allowed = [item for item in allowed if isinstance(item, str) and item]

    obligation_to_category = configured.get("obligation_to_category")
    if not isinstance(obligation_to_category, dict) or not obligation_to_category:
        obligation_to_category = dict(DEFAULT_SCENARIO_DESIGN["obligation_to_category"])
    else:
        obligation_to_category = {
            key: value
            for key, value in obligation_to_category.items()
            if isinstance(key, str) and isinstance(value, str)
        }

    return {
        "allowed": allowed,
        "profiles": normalized_profiles,
        "obligation_to_category": obligation_to_category,
    }


def parse_ac_labels(text: Any, allowed_obligations: set[str]) -> dict[str, str | None]:
    if not isinstance(text, str):
        return {"category": None, "scenario_obligation": None, "plain_text": ""}
    stripped = text.strip()
    match = LABEL_RE.match(stripped)
    if not match:
        return {"category": None, "scenario_obligation": None, "plain_text": stripped}
    category = match.group("category").strip()
    obligation = match.group("obligation").strip()
    if category not in VALID_CATEGORIES:
        category = None
    if obligation not in allowed_obligations:
        obligation = None
    return {
        "category": category,
        "scenario_obligation": obligation,
        "plain_text": match.group("plain_text").strip(),
    }


def infer_required_test_obligations(
    story: dict[str, Any],
    profiles: dict[str, dict[str, list[str]]],
) -> dict[str, Any]:
    acs = story.get("acceptance_criteria") or []
    text = " ".join(str(ac) for ac in acs).lower()
    mutation_keywords = (
        "新增",
        "编辑",
        "删除",
        "修改",
        "保存",
        "创建",
        "启用",
        "禁用",
        "重置",
        "create",
        "update",
        "delete",
        "save",
    )
    permission_keywords = ("权限", "角色", "访问", "授权", "permission", "role", "auth")
    if any(keyword in text for keyword in mutation_keywords) or any(keyword in text for keyword in permission_keywords):
        profile = "crud"
    else:
        profile = "display_only"
    selected = profiles.get(profile) or DEFAULT_SCENARIO_DESIGN["profiles"][profile]
    return {"profile": profile, "required": list(selected.get("required", []))}


def ensure_required_test_obligations(
    story: dict[str, Any],
    profiles: dict[str, dict[str, list[str]]],
    allowed_obligations: set[str],
) -> dict[str, Any]:
    current = story.get("required_test_obligations")
    if isinstance(current, dict):
        required = current.get("required")
        if isinstance(required, list):
            normalized = [item for item in required if isinstance(item, str) and item in allowed_obligations]
            if normalized:
                profile = current.get("profile")
                if not isinstance(profile, str) or not profile:
                    profile = "custom"
                story["required_test_obligations"] = {"profile": profile, "required": normalized}
                return story["required_test_obligations"]
    story["required_test_obligations"] = infer_required_test_obligations(story, profiles)
    return story["required_test_obligations"]


def infer_obligation_from_text(text: str, allowed_obligations: set[str]) -> str | None:
    lowered = text.lower().strip()
    if not lowered:
        return None

    auth_boundary_keywords = (
        "无权限",
        "没有权限",
        "阻止访问",
        "过滤侧边栏",
        "按角色过滤",
        "超级管理员",
        "数据范围",
        "访问范围",
        "隐藏菜单",
    )
    reject_keywords = (
        "唯一",
        "至少选一个",
        "至少",
        "不可",
        "不允许",
        "失败",
        "拒绝",
        "隐藏删除按钮",
        "不显示操作按钮",
        "不可禁用",
        "disabled不可编辑",
        "创建后不可改",
    )
    persist_keywords = (
        "有效期",
        "清除token",
        "返回登录页",
        "即时生效",
        "再次进入",
        "二次进入",
        "刷新后",
        "仍成立",
        "跳转对应页面",
        "状态→",
        "状态->",
    )
    state_change_keywords = (
        "新增",
        "编辑",
        "更新",
        "创建",
        "提交",
        "发送",
        "重置",
        "启用",
        "禁用",
        "删除",
        "打开",
        "勾选",
        "confirm确认",
    )
    display_keywords = (
        "展示",
        "显示",
        "包含",
        "渲染",
        "列表",
        "卡片",
        "提醒",
        "日志",
        "快捷操作",
        "表格",
        "统计",
        "导航",
        "tag",
        "checkbox",
    )
    matches = {
        "auth_or_data_boundary": any(keyword in lowered for keyword in auth_boundary_keywords),
        "business_rule_reject": any(keyword in lowered for keyword in reject_keywords),
        "persist_effect": any(keyword in lowered for keyword in persist_keywords),
        "display": any(keyword in lowered for keyword in display_keywords),
        "state_change": any(keyword in lowered for keyword in state_change_keywords),
    }

    # Make the precedence explicit instead of relying on tuple order:
    # clear auth/data-boundary phrases still outrank display language, while
    # generic "permission module" nouns remain governed by the keyword set.
    priority = (
        "auth_or_data_boundary",
        "business_rule_reject",
        "persist_effect",
        "display",
        "state_change",
    )
    for obligation in priority:
        if obligation in allowed_obligations and matches[obligation]:
            return obligation
    return None


OPERATION_KEYWORDS: dict[str, tuple[str, ...]] = {
    "reject_disable": ("拒绝", "不可", "不允许", "reject", "cannot", "forbidden"),
    "delete": ("删除", "移除", "delete", "remove"),
    "create": ("新增", "创建", "添加", "create", "add", "new"),
    "edit": ("编辑", "修改", "更新", "update", "edit", "modify"),
    "status_toggle": ("启用", "禁用", "状态", "enable", "disable", "status", "toggle"),
    "search": ("搜索", "筛选", "过滤", "search", "filter"),
    "list": ("列表", "展示", "渲染", "list", "table", "render", "display"),
}


def infer_operation_from_text(text: str, allowed_operations: set[str]) -> str | None:
    """Infer operation from free text using keyword matching."""
    lowered = text.lower().strip()
    if not lowered:
        return None
    for op, keywords in OPERATION_KEYWORDS.items():
        if op in allowed_operations and any(kw in lowered for kw in keywords):
            return op
    # fallback for list/search even when not in allowed_operations
    for op in ("search", "list"):
        keywords = OPERATION_KEYWORDS.get(op, ())
        if any(kw in lowered for kw in keywords):
            return op
    return None


def resolve_case_metadata(
    *,
    texts: list[str],
    required_obligations: list[str],
    fallback_index: int,
    allowed_obligations: set[str],
    obligation_to_category: dict[str, str],
    allowed_operations: set[str] | None = None,
) -> tuple[str | None, str | None, str | None]:
    category: str | None = None
    obligation: str | None = None
    operation: str | None = None

    for text in texts:
        labels = parse_ac_labels(text, allowed_obligations)
        if labels["category"]:
            category = labels["category"]
        if labels["scenario_obligation"]:
            obligation = labels["scenario_obligation"]
            break
        inferred = infer_obligation_from_text(labels["plain_text"], allowed_obligations)
        if inferred:
            obligation = inferred
            break

    if not obligation and required_obligations:
        obligation = required_obligations[min(fallback_index, len(required_obligations) - 1)]

    if obligation and not category:
        category = obligation_to_category.get(obligation)

    if category not in VALID_CATEGORIES:
        category = None
    if obligation not in allowed_obligations:
        obligation = None

    # infer operation from same texts
    if allowed_operations:
        for text in texts:
            labels = parse_ac_labels(text, allowed_obligations)
            op = infer_operation_from_text(labels.get("plain_text") or text, allowed_operations)
            if op:
                operation = op
                break

    return category, obligation, operation


def category_from_tc_id(tc_id: str | None) -> str | None:
    if not isinstance(tc_id, str):
        return None
    if "-NEG-" in tc_id:
        return "negative"
    if "-POS-" in tc_id:
        return "positive"
    if "-BND-" in tc_id:
        return "boundary"
    return None


def fallback_index_from_ac_ref(ac_ref: Any) -> int:
    if not isinstance(ac_ref, str):
        return 0
    match = re.search(r"-(\d{2})$", ac_ref)
    if not match:
        return 0
    return max(int(match.group(1)) - 1, 0)


def story_ac_ref(story_id: str, index: int) -> str:
    return f"AC-{story_id}-{index:02d}"


def story_case_id(story_id: str, index: int) -> str:
    return f"SC-{story_id}-{index:03d}"


def ticket_test_case_id(ticket_id: str, index: int) -> str:
    return f"TCS-{ticket_id}-{index:03d}"


def now_utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def extract_ticket_id_from_evidence(case: dict[str, Any]) -> str | None:
    latest_result = case.get("latest_result") or {}
    evidence_ref = latest_result.get("evidence_ref")
    if not isinstance(evidence_ref, str):
        return None
    match = re.search(r"(T-\d+)", evidence_ref)
    return match.group(1) if match else None


@dataclass
class ExistingCaseIndex:
    by_id: dict[str, dict[str, Any]]
    by_level_story_ac: dict[tuple[str, str, str], dict[str, Any]]
    by_ticket_story_ac: dict[tuple[str, str, str], dict[str, Any]]
    by_level_story_case: dict[tuple[str, str, str], dict[str, Any]]
    by_ticket_test_case: dict[tuple[str, str], dict[str, Any]]


def index_cases(cases: list[dict[str, Any]]) -> ExistingCaseIndex:
    by_id: dict[str, dict[str, Any]] = {}
    by_level_story_ac: dict[tuple[str, str, str], dict[str, Any]] = {}
    by_ticket_story_ac: dict[tuple[str, str, str], dict[str, Any]] = {}
    by_level_story_case: dict[tuple[str, str, str], dict[str, Any]] = {}
    by_ticket_test_case: dict[tuple[str, str], dict[str, Any]] = {}

    for case in cases:
        if not isinstance(case, dict):
            continue
        tc_id = case.get("tc_id")
        if isinstance(tc_id, str) and tc_id:
            by_id[tc_id] = case
        level = case.get("level")
        story_id = case.get("story_id")
        ac_ref = case.get("ac_ref")
        if not all(isinstance(v, str) and v for v in [level, story_id, ac_ref]):
            continue
        if level in {"story", "final"}:
            by_level_story_ac[(level, story_id, ac_ref)] = case
            story_case_ref = case.get("story_case_id")
            if isinstance(story_case_ref, str) and story_case_ref:
                by_level_story_case[(level, story_id, story_case_ref)] = case
        elif level == "ticket":
            ticket_id = case.get("ticket_id")
            if isinstance(ticket_id, str) and ticket_id:
                by_ticket_story_ac[(ticket_id, story_id, ac_ref)] = case
                ticket_case_ref = case.get("test_case_id")
                if isinstance(ticket_case_ref, str) and ticket_case_ref:
                    by_ticket_test_case[(ticket_id, ticket_case_ref)] = case
    return ExistingCaseIndex(
        by_id=by_id,
        by_level_story_ac=by_level_story_ac,
        by_ticket_story_ac=by_ticket_story_ac,
        by_level_story_case=by_level_story_case,
        by_ticket_test_case=by_ticket_test_case,
    )


def _normalize_case_kind(value: Any) -> str:
    if isinstance(value, str) and value in {"ac", "critical_surface"}:
        return value
    return "ac"


def _normalize_optional_string(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _extract_surface_specs(contract_doc: Path) -> dict[str, dict[str, Any]]:
    if not contract_doc.exists():
        return {}
    data = load_yaml(contract_doc) or {}
    specs: dict[str, dict[str, Any]] = {}
    for surface in data.get("surfaces") or []:
        if not isinstance(surface, dict):
            continue
        surface_id = surface.get("surface_id")
        if isinstance(surface_id, str) and surface_id:
            specs[surface_id] = surface
    return specs


def _variant_ids(surface_spec: dict[str, Any], key: str, variant_key: str) -> list[str]:
    values: list[str] = []
    for item in surface_spec.get(key) or []:
        if not isinstance(item, dict):
            continue
        variant_id = item.get(variant_key)
        if isinstance(variant_id, str) and variant_id and variant_id not in values:
            values.append(variant_id)
    return values


def _next_story_case_id(story_id_value: str, normalized: list[dict[str, Any]], used_ids: set[str]) -> str:
    candidate = story_case_id(story_id_value, len(normalized) + 1)
    while candidate in used_ids:
        candidate = story_case_id(story_id_value, len(normalized) + 2)
    used_ids.add(candidate)
    return candidate


def _next_ticket_case_id(ticket_id_value: str, normalized: list[dict[str, Any]], used_ids: set[str]) -> str:
    candidate = ticket_test_case_id(ticket_id_value, len(normalized) + 1)
    while candidate in used_ids:
        candidate = ticket_test_case_id(ticket_id_value, len(normalized) + 2)
    used_ids.add(candidate)
    return candidate


def _story_primary_ac_ref(story: dict[str, Any], story_surface_ac_refs: dict[str, list[str]], surface_id: str) -> str:
    story_id_value = story["id"]
    candidates = story_surface_ac_refs.get(surface_id) or []
    if candidates:
        return candidates[0]
    acceptance_criteria = story.get("acceptance_criteria") or []
    if acceptance_criteria:
        return story_ac_ref(story_id_value, 1)
    return ""


def normalize_story_cases(story: dict[str, Any]) -> list[dict[str, Any]]:
    story_id_value = story["id"]
    acceptance_criteria = story.get("acceptance_criteria") or []
    existing = story.get("story_cases")
    normalized: list[dict[str, Any]] = []
    covered_ac_refs: set[str] = set()
    used_ids: set[str] = set()

    if isinstance(existing, list):
        for index, item in enumerate(existing, 1):
            if not isinstance(item, dict):
                continue
            case_id = item.get("story_case_id")
            if not isinstance(case_id, str) or not case_id.strip() or case_id in used_ids:
                case_id = story_case_id(story_id_value, len(normalized) + 1)
            used_ids.add(case_id)

            ac_ref = item.get("ac_ref")
            if not isinstance(ac_ref, str) or not ac_ref.strip():
                fallback_index = min(index, max(len(acceptance_criteria), 1))
                ac_ref = story_ac_ref(story_id_value, fallback_index)

            case_kind = _normalize_case_kind(item.get("case_kind"))
            if case_kind == "ac":
                covered_ac_refs.add(ac_ref)

            normalized.append(
                {
                    "story_case_id": case_id,
                    "ac_ref": ac_ref,
                    "case_kind": case_kind,
                    "surface_id": _normalize_optional_string(item.get("surface_id")),
                    "state_variant": _normalize_optional_string(item.get("state_variant")),
                    "viewport_variant": _normalize_optional_string(item.get("viewport_variant")),
                }
            )

    for index, _criterion in enumerate(acceptance_criteria, 1):
        ac_ref = story_ac_ref(story_id_value, index)
        if ac_ref in covered_ac_refs:
            continue
        case_id = story_case_id(story_id_value, len(normalized) + 1)
        while case_id in used_ids:
            case_id = story_case_id(story_id_value, len(normalized) + 2)
        used_ids.add(case_id)
        normalized.append(
            {
                "story_case_id": case_id,
                "ac_ref": ac_ref,
                "case_kind": "ac",
                "surface_id": None,
                "state_variant": None,
                "viewport_variant": None,
            }
        )

    return normalized


def normalize_ticket_test_cases(ticket: dict[str, Any]) -> list[dict[str, Any]]:
    ticket_id_value = ticket["id"]
    covers_ac_refs = ticket.get("covers_ac_refs") or []
    existing = ticket.get("test_cases")
    normalized: list[dict[str, Any]] = []
    covered_ac_refs: set[str] = set()
    used_ids: set[str] = set()

    if isinstance(existing, list):
        for index, item in enumerate(existing, 1):
            if not isinstance(item, dict):
                continue
            case_id = item.get("test_case_id")
            if not isinstance(case_id, str) or not case_id.strip() or case_id in used_ids:
                case_id = ticket_test_case_id(ticket_id_value, len(normalized) + 1)
            used_ids.add(case_id)

            ac_ref = item.get("ac_ref")
            if not isinstance(ac_ref, str) or not ac_ref.strip():
                fallback = covers_ac_refs[min(index - 1, max(len(covers_ac_refs) - 1, 0))] if covers_ac_refs else None
                ac_ref = fallback or ""

            case_kind = _normalize_case_kind(item.get("case_kind"))
            if case_kind == "ac" and isinstance(ac_ref, str) and ac_ref:
                covered_ac_refs.add(ac_ref)

            normalized.append(
                {
                    "test_case_id": case_id,
                    "ac_ref": ac_ref,
                    "case_kind": case_kind,
                    "surface_id": _normalize_optional_string(item.get("surface_id")),
                    "state_variant": _normalize_optional_string(item.get("state_variant")),
                    "viewport_variant": _normalize_optional_string(item.get("viewport_variant")),
                    "category": item.get("category") if item.get("category") in VALID_CATEGORIES else None,
                    "scenario_obligation": _normalize_optional_string(item.get("scenario_obligation")),
                    "operation": _normalize_optional_string(item.get("operation")),
                }
            )

    for ac_ref in covers_ac_refs:
        if ac_ref in covered_ac_refs:
            continue
        case_id = ticket_test_case_id(ticket_id_value, len(normalized) + 1)
        while case_id in used_ids:
            case_id = ticket_test_case_id(ticket_id_value, len(normalized) + 2)
        used_ids.add(case_id)
        normalized.append(
            {
                "test_case_id": case_id,
                "ac_ref": ac_ref,
                "case_kind": "ac",
                "surface_id": None,
                "state_variant": None,
                "viewport_variant": None,
                "category": None,
                "scenario_obligation": None,
                "operation": None,
            }
        )

    return [item for item in normalized if item.get("ac_ref")]


def augment_story_surface_cases(
    story: dict[str, Any],
    surface_specs: dict[str, dict[str, Any]],
    story_surface_ac_refs: dict[str, list[str]],
) -> list[dict[str, Any]]:
    normalized = normalize_story_cases(story)
    contract_refs = story.get("contract_refs") or {}
    critical_surfaces = [
        item for item in contract_refs.get("critical_surfaces") or [] if isinstance(item, str) and item
    ]
    existing_keys = {
        (
            item.get("case_kind") or "ac",
            item.get("surface_id"),
            item.get("state_variant"),
            item.get("viewport_variant"),
        )
        for item in normalized
        if isinstance(item, dict)
    }
    used_ids = {
        item["story_case_id"]
        for item in normalized
        if isinstance(item, dict) and isinstance(item.get("story_case_id"), str) and item.get("story_case_id")
    }

    for surface_id in critical_surfaces:
        surface_spec = surface_specs.get(surface_id)
        if not surface_spec:
            continue
        default_state = (_variant_ids(surface_spec, "state_variants", "state_id") or [None])[0]
        default_viewport = (_variant_ids(surface_spec, "viewport_variants", "viewport_id") or [None])[0]
        key = ("critical_surface", surface_id, default_state, default_viewport)
        if key in existing_keys:
            continue
        normalized.append(
            {
                "story_case_id": _next_story_case_id(story["id"], normalized, used_ids),
                "ac_ref": _story_primary_ac_ref(story, story_surface_ac_refs, surface_id),
                "case_kind": "critical_surface",
                "surface_id": surface_id,
                "state_variant": default_state,
                "viewport_variant": default_viewport,
            }
        )
        existing_keys.add(key)
    return normalized


def augment_ticket_surface_cases(ticket: dict[str, Any], surface_specs: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = normalize_ticket_test_cases(ticket)
    contract_refs = ticket.get("contract_refs") or {}
    critical_surfaces = [
        item for item in contract_refs.get("critical_surfaces") or [] if isinstance(item, str) and item
    ]
    covers_ac_refs = ticket.get("covers_ac_refs") or []
    primary_ac_ref = next((item for item in covers_ac_refs if isinstance(item, str) and item), "")
    existing_keys = {
        (
            item.get("case_kind") or "ac",
            item.get("surface_id"),
            item.get("state_variant"),
            item.get("viewport_variant"),
        )
        for item in normalized
        if isinstance(item, dict)
    }
    used_ids = {
        item["test_case_id"]
        for item in normalized
        if isinstance(item, dict) and isinstance(item.get("test_case_id"), str) and item.get("test_case_id")
    }

    for surface_id in critical_surfaces:
        surface_spec = surface_specs.get(surface_id)
        if not surface_spec:
            continue
        states = _variant_ids(surface_spec, "state_variants", "state_id") or [None]
        viewports = _variant_ids(surface_spec, "viewport_variants", "viewport_id") or [None]
        for state_variant in states:
            for viewport_variant in viewports:
                key = ("critical_surface", surface_id, state_variant, viewport_variant)
                if key in existing_keys:
                    continue
                normalized.append(
                    {
                        "test_case_id": _next_ticket_case_id(ticket["id"], normalized, used_ids),
                        "ac_ref": primary_ac_ref,
                        "case_kind": "critical_surface",
                        "surface_id": surface_id,
                        "state_variant": state_variant,
                        "viewport_variant": viewport_variant,
                    }
                )
                existing_keys.add(key)
    return [item for item in normalized if item.get("ac_ref")]


def ensure_story_shape(story: dict[str, Any]) -> dict[str, Any]:
    acceptance_criteria = story.get("acceptance_criteria") or []
    if not isinstance(acceptance_criteria, list):
        acceptance_criteria = []
        story["acceptance_criteria"] = acceptance_criteria

    contract_refs = story.get("contract_refs")
    if not isinstance(contract_refs, dict):
        contract_refs = {}
    contract_refs.setdefault("capabilities", [])
    contract_refs.setdefault("critical_surfaces", [])
    story["contract_refs"] = contract_refs

    story["story_cases"] = normalize_story_cases(story)
    return story


def ensure_ticket_shape(ticket: dict[str, Any]) -> dict[str, Any]:
    contract_refs = ticket.get("contract_refs")
    if not isinstance(contract_refs, dict):
        contract_refs = {}
    contract_refs.setdefault("capabilities", [])
    contract_refs.setdefault("critical_surfaces", [])
    ticket["contract_refs"] = contract_refs

    covers_ac_refs = ticket.get("covers_ac_refs")
    if not isinstance(covers_ac_refs, list):
        covers_ac_refs = []
    ticket["covers_ac_refs"] = [ac for ac in covers_ac_refs if isinstance(ac, str) and ac]
    ticket["test_cases"] = normalize_ticket_test_cases(ticket)
    return ticket


def enrich_ticket_test_cases(
    ticket: dict[str, Any],
    story: dict[str, Any],
    *,
    allowed_obligations: set[str],
    obligation_to_category: dict[str, str],
) -> list[dict[str, Any]]:
    required = (story.get("required_test_obligations") or {}).get("required") or []
    story_ac_text_by_ref = {
        story_ac_ref(story["id"], index): str(text)
        for index, text in enumerate(story.get("acceptance_criteria") or [], 1)
    }
    ticket_criteria = [str(item) for item in (ticket.get("acceptance_criteria") or [])]
    story_operations = (story.get("required_test_operations") or {}).get("operations") or {}
    allowed_ops = set(story_operations.keys()) if story_operations else set()
    for index, test_case in enumerate(ticket.get("test_cases") or []):
        texts: list[str] = []
        if index < len(ticket_criteria):
            texts.append(ticket_criteria[index])
        story_text = story_ac_text_by_ref.get(test_case.get("ac_ref"))
        if story_text:
            texts.append(story_text)
        category, obligation, operation = resolve_case_metadata(
            texts=texts,
            required_obligations=required,
            fallback_index=index,
            allowed_obligations=allowed_obligations,
            obligation_to_category=obligation_to_category,
            allowed_operations=allowed_ops,
        )
        if not test_case.get("category"):
            test_case["category"] = category
        if not test_case.get("scenario_obligation"):
            test_case["scenario_obligation"] = obligation
        if not test_case.get("operation"):
            test_case["operation"] = operation
    return ticket.get("test_cases") or []


def resolve_story_case_metadata(
    story: dict[str, Any],
    skeleton: dict[str, Any],
    *,
    position: int,
    allowed_obligations: set[str],
    obligation_to_category: dict[str, str],
) -> tuple[str | None, str | None, str | None]:
    story_ac_text_by_ref = {
        story_ac_ref(story["id"], index): str(text)
        for index, text in enumerate(story.get("acceptance_criteria") or [], 1)
    }
    required = (story.get("required_test_obligations") or {}).get("required") or []
    story_operations = (story.get("required_test_operations") or {}).get("operations") or {}
    allowed_ops = set(story_operations.keys()) if story_operations else set()
    texts: list[str] = []
    story_text = story_ac_text_by_ref.get(skeleton.get("ac_ref"))
    if story_text:
        texts.append(story_text)
    return resolve_case_metadata(
        texts=texts,
        required_obligations=required,
        fallback_index=position,
        allowed_obligations=allowed_obligations,
        obligation_to_category=obligation_to_category,
        allowed_operations=allowed_ops,
    )


def create_ticket_case(module: str, ticket: dict[str, Any], skeleton: dict[str, Any], position: int) -> dict[str, Any]:
    return {
        "tc_id": f"TC-{module.upper()}-{ticket['id']}-TICKET-{position:03d}",
        "level": "ticket",
        "story_id": ticket["story_id"],
        "ticket_id": ticket["id"],
        "ac_ref": skeleton["ac_ref"],
        "category": skeleton.get("category"),
        "scenario_obligation": skeleton.get("scenario_obligation"),
        "operation": skeleton.get("operation"),
        "test_case_id": skeleton["test_case_id"],
        "case_kind": skeleton.get("case_kind") or "ac",
        "surface_id": skeleton.get("surface_id"),
        "state_variant": skeleton.get("state_variant"),
        "viewport_variant": skeleton.get("viewport_variant"),
        "priority": "P1",
        "automation": {"script": None, "command": None},
        "latest_result": {"status": "pending", "evidence_ref": None},
    }


def create_story_or_final_case(
    module: str,
    story_id: str,
    skeleton: dict[str, Any],
    position: int,
    level: str,
) -> dict[str, Any]:
    return {
        "tc_id": f"TC-{module.upper()}-{story_id}-{level.upper()}-{position:03d}",
        "level": level,
        "story_id": story_id,
        "ticket_id": None,
        "ac_ref": skeleton["ac_ref"],
        "category": skeleton.get("category"),
        "scenario_obligation": skeleton.get("scenario_obligation"),
        "operation": skeleton.get("operation"),
        "story_case_id": skeleton["story_case_id"],
        "case_kind": skeleton.get("case_kind") or "ac",
        "surface_id": skeleton.get("surface_id"),
        "state_variant": skeleton.get("state_variant"),
        "viewport_variant": skeleton.get("viewport_variant"),
        "priority": "P1",
        "automation": {"script": None, "command": None},
        "latest_result": {"status": "pending", "evidence_ref": None},
    }


def hydrate_ticket_case_from_verification_evidence(
    case: dict[str, Any],
    ticket: dict[str, Any],
    *,
    evidence_ref: str,
) -> None:
    verification = ticket.get("verification_evidence") or {}
    if not isinstance(verification, dict):
        return

    command = verification.get("command")
    if not isinstance(command, str) or not command.strip():
        return

    automation = case.setdefault("automation", {})
    if not isinstance(automation, dict):
        automation = {}
        case["automation"] = automation

    if not automation.get("command"):
        automation["command"] = command.strip()
    automation.setdefault("script", None)

    latest_result = case.setdefault("latest_result", {})
    if not isinstance(latest_result, dict):
        latest_result = {}
        case["latest_result"] = latest_result

    if latest_result.get("status") == "pending":
        exit_code = verification.get("exit_code")
        latest_result["status"] = "pass" if exit_code == 0 else "fail"

    if not latest_result.get("evidence_ref"):
        latest_result["evidence_ref"] = evidence_ref


def hydrate_story_or_final_case_from_story_evidence(
    case: dict[str, Any],
    story: dict[str, Any],
    *,
    level: str,
    fallback_evidence_ref: str,
) -> None:
    evidence_key = "integration_evidence" if level == "story" else "final_evidence"
    evidence = story.get(evidence_key) or {}
    if not isinstance(evidence, dict):
        return

    command = evidence.get("command")
    if not isinstance(command, str) or not command.strip():
        return

    automation = case.setdefault("automation", {})
    if not isinstance(automation, dict):
        automation = {}
        case["automation"] = automation
    if not automation.get("command"):
        automation["command"] = command.strip()
    automation.setdefault("script", evidence.get("script"))

    latest_result = case.setdefault("latest_result", {})
    if not isinstance(latest_result, dict):
        latest_result = {}
        case["latest_result"] = latest_result

    if latest_result.get("status") == "pending":
        exit_code = evidence.get("exit_code")
        latest_result["status"] = "pass" if exit_code == 0 else "fail"

    evidence_ref = evidence.get("evidence_ref") or fallback_evidence_ref
    if not latest_result.get("evidence_ref"):
        latest_result["evidence_ref"] = evidence_ref


def normalize_existing_cases(cases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for case in cases:
        if not isinstance(case, dict):
            continue
        level = case.get("level")
        if level not in VALID_LEVELS:
            continue
        story_id = case.get("story_id")
        ac_ref = case.get("ac_ref")
        tc_id = case.get("tc_id")
        if not all(isinstance(v, str) and v for v in [story_id, ac_ref, tc_id]):
            continue
        result = dict(case)
        if level == "ticket" and not isinstance(result.get("ticket_id"), str):
            inferred = extract_ticket_id_from_evidence(result)
            if inferred:
                result["ticket_id"] = inferred
        if level in {"story", "final"}:
            result["ticket_id"] = None
            result["story_case_id"] = _normalize_optional_string(result.get("story_case_id"))
        else:
            result["test_case_id"] = _normalize_optional_string(result.get("test_case_id"))
        result["case_kind"] = _normalize_case_kind(result.get("case_kind"))
        result["surface_id"] = _normalize_optional_string(result.get("surface_id"))
        result["state_variant"] = _normalize_optional_string(result.get("state_variant"))
        result["viewport_variant"] = _normalize_optional_string(result.get("viewport_variant"))
        category = result.get("category")
        result["category"] = category if isinstance(category, str) and category in VALID_CATEGORIES else None
        obligation = result.get("scenario_obligation")
        result["scenario_obligation"] = obligation if isinstance(obligation, str) and obligation else None
        op = result.get("operation")
        result["operation"] = op if isinstance(op, str) and op else None
        automation = result.get("automation")
        if not isinstance(automation, dict):
            result["automation"] = {"script": None, "command": None}
        else:
            automation.setdefault("script", None)
            automation.setdefault("command", None)
        latest_result = result.get("latest_result")
        if not isinstance(latest_result, dict):
            result["latest_result"] = {"status": "pending", "evidence_ref": None}
        else:
            latest_result.setdefault("status", "pending")
            latest_result.setdefault("evidence_ref", None)
        normalized.append(result)
    return normalized


def sort_cases(cases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    level_order = {"ticket": 0, "story": 1, "final": 2}
    return sorted(
        cases,
        key=lambda c: (
            c.get("story_id") or "",
            level_order.get(c.get("level"), 9),
            c.get("ticket_id") or "",
            c.get("ac_ref") or "",
            c.get("tc_id") or "",
        ),
    )


def matrix_rows_from_cases(cases: list[dict[str, Any]]) -> list[tuple[str, str, str, str, str, str, str, str]]:
    rows = []
    for case in sort_cases(cases):
        automation = case.get("automation") or {}
        latest_result = case.get("latest_result") or {}
        script = automation.get("script") or "—"
        command = automation.get("command") or "—"
        evidence_ref = latest_result.get("evidence_ref") or "—"
        rows.append(
            (
                case.get("ac_ref") or "—",
                case.get("tc_id") or "—",
                case.get("level") or "—",
                case.get("operation") or "—",
                script,
                f"`{command}`" if command != "—" else "—",
                latest_result.get("status") or "pending",
                evidence_ref,
            )
        )
    return rows


def render_matrix(module: str, cases: list[dict[str, Any]]) -> str:
    rows = matrix_rows_from_cases(cases)
    header = [
        f"# {module.capitalize()} 模块追踪矩阵",
        "",
        f"> 生成时间: {now_utc()} | 版本: v3 | TC 总数: {len(cases)}",
        "",
        "## AC → TC → Script → Result 追踪表",
        "",
        "| FR/AC | TC-ID | Level | Operation | Script | Command | Latest Result | Evidence Ref |",
        "|-------|-------|-------|-----------|--------|---------|---------------|-------------|",
    ]
    lines = header + [
        f"| {ac_ref} | {tc_id} | {level} | {operation} | {script} | {command} | {status} | {evidence_ref} |"
        for ac_ref, tc_id, level, operation, script, command, status, evidence_ref in rows
    ]
    return "\n".join(lines) + "\n"


def load_stories(stories_dir: Path, story_id: str | None) -> list[tuple[Path, dict[str, Any]]]:
    items = []
    for path in sorted(stories_dir.glob("S-*.yaml")):
        data = load_yaml(path) or {}
        sid = data.get("id") or path.stem
        if story_id and sid != story_id:
            continue
        items.append((path, data))
    return items


def load_tickets(tickets_dir: Path, story_ids: set[str], story_id: str | None) -> list[tuple[Path, dict[str, Any]]]:
    items = []
    for path in sorted(tickets_dir.glob("T-*.yaml")):
        data = load_yaml(path) or {}
        sid = data.get("story_id")
        if story_id and sid != story_id:
            continue
        if not story_id and isinstance(sid, str) and sid not in story_ids:
            continue
        items.append((path, data))
    return items


def sync_module_assets(
    *,
    module: str,
    stories_dir: Path,
    tickets_dir: Path,
    cases_doc: Path,
    matrix_doc: Path,
    ui_contract_doc: Path,
    config_doc: Path | None = None,
    story_id: str | None = None,
) -> dict[str, int]:
    scenario_design = load_scenario_design(config_doc)
    allowed_obligations = {
        item for item in scenario_design.get("allowed", []) if isinstance(item, str) and item
    }
    obligation_to_category = {
        key: value
        for key, value in (scenario_design.get("obligation_to_category") or {}).items()
        if isinstance(key, str) and isinstance(value, str)
    }
    profiles = scenario_design.get("profiles") or DEFAULT_SCENARIO_DESIGN["profiles"]
    surface_specs = _extract_surface_specs(ui_contract_doc)
    story_entries = load_stories(stories_dir, story_id)
    story_ids = {story.get("id") or path.stem for path, story in story_entries}
    ticket_entries = load_tickets(tickets_dir, story_ids, story_id)
    ticket_by_id = {}
    tickets_by_story: dict[str, list[dict[str, Any]]] = {}

    for path, story in story_entries:
        story_id_value = story.get("id") or path.stem
        story["id"] = story_id_value
        ensure_story_shape(story)
        ensure_required_test_obligations(story, profiles, allowed_obligations)
        # Write after overlay surface augmentation.

    for path, ticket in ticket_entries:
        ticket_id = ticket.get("id") or path.stem
        ticket["id"] = ticket_id
        ensure_ticket_shape(ticket)
        ticket_by_id[ticket_id] = ticket
        tickets_by_story.setdefault(ticket["story_id"], []).append(ticket)
        ticket["test_cases"] = augment_ticket_surface_cases(ticket, surface_specs)
        write_yaml(path, ticket)

    for path, story in story_entries:
        story_surface_ac_refs: dict[str, list[str]] = {}
        for ticket in tickets_by_story.get(story["id"], []):
            enrich_ticket_test_cases(
                ticket,
                story,
                allowed_obligations=allowed_obligations,
                obligation_to_category=obligation_to_category,
            )
            write_yaml(tickets_dir / f"{ticket['id']}.yaml", ticket)
            critical_surfaces = (
                (ticket.get("contract_refs") or {}).get("critical_surfaces") or []
                if isinstance(ticket.get("contract_refs"), dict)
                else []
            )
            ac_refs = [
                ac_ref for ac_ref in (ticket.get("covers_ac_refs") or []) if isinstance(ac_ref, str) and ac_ref
            ]
            for surface_id in critical_surfaces:
                if isinstance(surface_id, str) and surface_id:
                    story_surface_ac_refs.setdefault(surface_id, [])
                    for ac_ref in ac_refs:
                        if ac_ref not in story_surface_ac_refs[surface_id]:
                            story_surface_ac_refs[surface_id].append(ac_ref)
        story["story_cases"] = augment_story_surface_cases(story, surface_specs, story_surface_ac_refs)
        write_yaml(path, story)

    existing_cases_raw = load_yaml(cases_doc) if cases_doc.exists() else []
    existing_cases = normalize_existing_cases(existing_cases_raw or [])
    index = index_cases(existing_cases)
    merged_cases = list(existing_cases)
    created_cases = 0

    for _story_path, story in story_entries:
        sid = story["id"]
        for idx, case in enumerate(story.get("story_cases") or [], 1):
            ac_ref = case["ac_ref"]
            story_case_ref = case["story_case_id"]
            case_kind = case.get("case_kind") or "ac"
            category, obligation, operation = resolve_story_case_metadata(
                story,
                case,
                position=idx - 1,
                allowed_obligations=allowed_obligations,
                obligation_to_category=obligation_to_category,
            )
            case["category"] = category
            case["scenario_obligation"] = obligation
            case["operation"] = operation
            for level in ("story", "final"):
                tc_id = f"TC-{module.upper()}-{sid}-{level.upper()}-{idx:03d}"
                existing_case = index.by_id.get(tc_id)
                if existing_case is None:
                    existing_case = index.by_level_story_case.get((level, sid, story_case_ref))
                if existing_case is None:
                    existing_case = create_story_or_final_case(module, sid, case, idx, level)
                    merged_cases.append(existing_case)
                    index.by_id[tc_id] = existing_case
                    index.by_level_story_case[(level, sid, story_case_ref)] = existing_case
                    index.by_level_story_ac[(level, sid, ac_ref)] = existing_case
                    created_cases += 1
                existing_case["tc_id"] = tc_id
                existing_case["story_case_id"] = story_case_ref
                existing_case["case_kind"] = case.get("case_kind") or "ac"
                existing_case["surface_id"] = case.get("surface_id")
                existing_case["state_variant"] = case.get("state_variant")
                existing_case["viewport_variant"] = case.get("viewport_variant")
                existing_case["category"] = category
                existing_case["scenario_obligation"] = obligation
                hydrate_story_or_final_case_from_story_evidence(
                    existing_case,
                    story,
                    level=level,
                    fallback_evidence_ref=str(stories_dir / f"{sid}.yaml"),
                )

    for _ticket_path, ticket in ticket_entries:
        sid = ticket["story_id"]
        for position, skeleton in enumerate(ticket.get("test_cases") or [], 1):
            ac_ref = skeleton["ac_ref"]
            test_case_ref = skeleton["test_case_id"]
            tc_id = f"TC-{module.upper()}-{ticket['id']}-TICKET-{position:03d}"
            existing_case = index.by_id.get(tc_id)
            if existing_case is None:
                existing_case = index.by_ticket_test_case.get((ticket["id"], test_case_ref))
            if existing_case is None:
                existing_case = create_ticket_case(module, ticket, skeleton, position)
                merged_cases.append(existing_case)
                index.by_id[tc_id] = existing_case
                index.by_ticket_test_case[(ticket["id"], test_case_ref)] = existing_case
                index.by_ticket_story_ac[(ticket["id"], sid, ac_ref)] = existing_case
                created_cases += 1
            existing_case["tc_id"] = tc_id
            existing_case["test_case_id"] = test_case_ref
            existing_case["case_kind"] = skeleton.get("case_kind") or "ac"
            existing_case["surface_id"] = skeleton.get("surface_id")
            existing_case["state_variant"] = skeleton.get("state_variant")
            existing_case["viewport_variant"] = skeleton.get("viewport_variant")
            existing_case["category"] = skeleton.get("category")
            existing_case["scenario_obligation"] = skeleton.get("scenario_obligation")
            existing_case["operation"] = skeleton.get("operation")
            hydrate_ticket_case_from_verification_evidence(
                existing_case,
                ticket,
                evidence_ref=str(tickets_dir / f"{ticket['id']}.yaml"),
            )

    story_by_id = {story["id"]: story for _, story in story_entries}
    for existing_case in merged_cases:
        if existing_case.get("category") and existing_case.get("scenario_obligation"):
            continue
        story = story_by_id.get(existing_case.get("story_id"))
        if story is None:
            continue
        ticket = ticket_by_id.get(existing_case.get("ticket_id")) if existing_case.get("ticket_id") else None

        texts: list[str] = []
        for field in ("expected", "steps", "preconditions"):
            value = existing_case.get(field)
            if isinstance(value, list):
                texts.append(" ".join(str(item) for item in value))
            elif isinstance(value, str) and value.strip():
                texts.append(value.strip())
        if ticket is not None:
            texts.extend(str(item) for item in (ticket.get("acceptance_criteria") or []))
        story_index = fallback_index_from_ac_ref(existing_case.get("ac_ref"))
        story_text = next(
            (
                str(text)
                for index, text in enumerate(story.get("acceptance_criteria") or [], 1)
                if story_ac_ref(story["id"], index) == existing_case.get("ac_ref")
            ),
            None,
        )
        if story_text:
            texts.append(story_text)

        required = (story.get("required_test_obligations") or {}).get("required") or []
        category, obligation, operation = resolve_case_metadata(
            texts=texts,
            required_obligations=required,
            fallback_index=story_index,
            allowed_obligations=allowed_obligations,
            obligation_to_category=obligation_to_category,
        )
        if not category:
            category = category_from_tc_id(existing_case.get("tc_id"))
        if not obligation:
            if category == "negative":
                obligation = "business_rule_reject"
            elif category == "boundary":
                obligation = "auth_or_data_boundary"
            elif category == "positive" and required:
                obligation = required[min(story_index, len(required) - 1)]
        if obligation and not category:
            category = obligation_to_category.get(obligation)
        existing_case["category"] = category
        existing_case["scenario_obligation"] = obligation
        if not existing_case.get("operation") and operation:
            existing_case["operation"] = operation

    merged_cases = sort_cases(merged_cases)
    write_yaml(cases_doc, merged_cases)
    matrix_doc.write_text(render_matrix(module, merged_cases), encoding="utf-8")

    return {
        "stories_synced": len(story_entries),
        "tickets_synced": len(ticket_entries),
        "cases_total": len(merged_cases),
        "cases_created": created_cases,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Synchronize story/ticket test assets")
    parser.add_argument("--module", default="permission")
    parser.add_argument("--story-id")
    parser.add_argument("--stories-dir", default="osg-spec-docs/tasks/stories")
    parser.add_argument("--tickets-dir", default="osg-spec-docs/tasks/tickets")
    parser.add_argument("--cases")
    parser.add_argument("--matrix")
    parser.add_argument("--ui-contract")
    parser.add_argument("--config", default=".claude/project/config.yaml")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    module = args.module
    stories_dir = Path(args.stories_dir)
    tickets_dir = Path(args.tickets_dir)
    cases_doc = Path(args.cases or f"osg-spec-docs/tasks/testing/{module}-test-cases.yaml")
    matrix_doc = Path(args.matrix or f"osg-spec-docs/tasks/testing/{module}-traceability-matrix.md")
    ui_contract_doc = Path(args.ui_contract or f"osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml")
    config_doc = Path(args.config) if args.config else None

    summary = sync_module_assets(
        module=module,
        stories_dir=stories_dir,
        tickets_dir=tickets_dir,
        cases_doc=cases_doc,
        matrix_doc=matrix_doc,
        ui_contract_doc=ui_contract_doc,
        config_doc=config_doc,
        story_id=args.story_id,
    )
    print(
        "PASS: sync-test-assets "
        f"module={module} story_id={args.story_id or 'ALL'} "
        f"stories={summary['stories_synced']} tickets={summary['tickets_synced']} "
        f"cases_created={summary['cases_created']} cases_total={summary['cases_total']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
