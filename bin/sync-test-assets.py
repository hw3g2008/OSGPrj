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


def create_ticket_case(module: str, ticket: dict[str, Any], skeleton: dict[str, Any], position: int) -> dict[str, Any]:
    return {
        "tc_id": f"TC-{module.upper()}-{ticket['id']}-TICKET-{position:03d}",
        "level": "ticket",
        "story_id": ticket["story_id"],
        "ticket_id": ticket["id"],
        "ac_ref": skeleton["ac_ref"],
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


def matrix_rows_from_cases(cases: list[dict[str, Any]]) -> list[tuple[str, str, str, str, str, str, str]]:
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
        "| FR/AC | TC-ID | Level | Script | Command | Latest Result | Evidence Ref |",
        "|-------|-------|-------|--------|---------|---------------|-------------|",
    ]
    lines = header + [
        f"| {ac_ref} | {tc_id} | {level} | {script} | {command} | {status} | {evidence_ref} |"
        for ac_ref, tc_id, level, script, command, status, evidence_ref in rows
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
    story_id: str | None = None,
) -> dict[str, int]:
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

    existing_cases = normalize_existing_cases(load_yaml(cases_doc) or [])
    index = index_cases(existing_cases)
    merged_cases = list(existing_cases)
    created_cases = 0

    for _story_path, story in story_entries:
        sid = story["id"]
        for idx, case in enumerate(story.get("story_cases") or [], 1):
            ac_ref = case["ac_ref"]
            story_case_ref = case["story_case_id"]
            case_kind = case.get("case_kind") or "ac"
            for level in ("story", "final"):
                existing_case = index.by_level_story_case.get((level, sid, story_case_ref))
                if existing_case is None and case_kind == "ac":
                    existing_case = index.by_level_story_ac.get((level, sid, ac_ref))
                if existing_case is None:
                    existing_case = create_story_or_final_case(module, sid, case, idx, level)
                    merged_cases.append(existing_case)
                    index.by_level_story_case[(level, sid, story_case_ref)] = existing_case
                    index.by_level_story_ac[(level, sid, ac_ref)] = existing_case
                    created_cases += 1
                existing_case["story_case_id"] = story_case_ref
                existing_case["case_kind"] = case.get("case_kind") or "ac"
                existing_case["surface_id"] = case.get("surface_id")
                existing_case["state_variant"] = case.get("state_variant")
                existing_case["viewport_variant"] = case.get("viewport_variant")
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
            case_kind = skeleton.get("case_kind") or "ac"
            existing_case = index.by_ticket_test_case.get((ticket["id"], test_case_ref))
            if existing_case is None and case_kind == "ac":
                existing_case = index.by_ticket_story_ac.get((ticket["id"], sid, ac_ref))
            if existing_case is None:
                existing_case = create_ticket_case(module, ticket, skeleton, position)
                merged_cases.append(existing_case)
                index.by_ticket_test_case[(ticket["id"], test_case_ref)] = existing_case
                index.by_ticket_story_ac[(ticket["id"], sid, ac_ref)] = existing_case
                created_cases += 1
            existing_case["test_case_id"] = test_case_ref
            existing_case["case_kind"] = skeleton.get("case_kind") or "ac"
            existing_case["surface_id"] = skeleton.get("surface_id")
            existing_case["state_variant"] = skeleton.get("state_variant")
            existing_case["viewport_variant"] = skeleton.get("viewport_variant")
            hydrate_ticket_case_from_verification_evidence(
                existing_case,
                ticket,
                evidence_ref=str(tickets_dir / f"{ticket['id']}.yaml"),
            )

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
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    module = args.module
    stories_dir = Path(args.stories_dir)
    tickets_dir = Path(args.tickets_dir)
    cases_doc = Path(args.cases or f"osg-spec-docs/tasks/testing/{module}-test-cases.yaml")
    matrix_doc = Path(args.matrix or f"osg-spec-docs/tasks/testing/{module}-traceability-matrix.md")
    ui_contract_doc = Path(args.ui_contract or f"osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml")

    summary = sync_module_assets(
        module=module,
        stories_dir=stories_dir,
        tickets_dir=tickets_dir,
        cases_doc=cases_doc,
        matrix_doc=matrix_doc,
        ui_contract_doc=ui_contract_doc,
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
