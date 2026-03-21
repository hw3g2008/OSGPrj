#!/usr/bin/env python3
"""Guard: verify every story has complete ticket decomposition before ticket approval/final gate."""

from __future__ import annotations

import argparse
from pathlib import Path

import yaml

OVERLAY_SURFACE_TYPES = {"modal", "drawer", "popover", "panel", "wizard-step"}

def load_yaml(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def extract_delivery_capability_scopes(contract_doc: Path) -> dict[str, str]:
    data = load_yaml(contract_doc) or {}
    result: dict[str, str] = {}
    for capability in data.get("capabilities") or []:
        if not isinstance(capability, dict):
            continue
        capability_id = capability.get("capability_id")
        effect_scope = capability.get("effect_scope")
        if isinstance(capability_id, str) and capability_id and isinstance(effect_scope, str) and effect_scope:
            result[capability_id] = effect_scope
    return result


def extract_surface_specs(contract_doc: Path) -> dict[str, dict]:
    data = load_yaml(contract_doc) or {}
    specs: dict[str, dict] = {}
    for surface in data.get("surfaces") or []:
        if not isinstance(surface, dict):
            continue
        surface_id = surface.get("surface_id")
        if isinstance(surface_id, str) and surface_id:
            specs[surface_id] = surface
    for page in data.get("pages") or []:
        if not isinstance(page, dict):
            continue
        for surface in page.get("critical_surfaces") or []:
            if not isinstance(surface, dict):
                continue
            surface_id = surface.get("surface_id")
            if isinstance(surface_id, str) and surface_id:
                specs.setdefault(surface_id, surface)
    return specs


def extract_contract_refs(node: dict | None) -> tuple[set[str], set[str]]:
    if not isinstance(node, dict):
        return set(), set()
    contract_refs = node.get("contract_refs") or {}
    if not isinstance(contract_refs, dict):
        return set(), set()
    capabilities = {item for item in contract_refs.get("capabilities") or [] if isinstance(item, str) and item}
    critical_surfaces = {
        item for item in contract_refs.get("critical_surfaces") or [] if isinstance(item, str) and item
    }
    return capabilities, critical_surfaces


def has_contract_refs(node: dict | None) -> bool:
    if not isinstance(node, dict):
        return False
    contract_refs = node.get("contract_refs")
    return isinstance(contract_refs, dict)


def extract_story_surface_cases(node: dict | None) -> dict[str, list[dict]]:
    if not isinstance(node, dict):
        return {}
    story_cases = node.get("story_cases") or []
    if not isinstance(story_cases, list):
        return {}
    result: dict[str, list[dict]] = {}
    for case in story_cases:
        if not isinstance(case, dict):
            continue
        surface_id = case.get("surface_id")
        if isinstance(surface_id, str) and surface_id:
            result.setdefault(surface_id, []).append(case)
    return result


def extract_ticket_surface_cases(node: dict | None) -> dict[str, list[dict]]:
    if not isinstance(node, dict):
        return {}
    test_cases = node.get("test_cases") or []
    if not isinstance(test_cases, list):
        return {}
    result: dict[str, list[dict]] = {}
    for case in test_cases:
        if not isinstance(case, dict):
            continue
        surface_id = case.get("surface_id")
        if isinstance(surface_id, str) and surface_id:
            result.setdefault(surface_id, []).append(case)
    return result


def _variant_ids(surface_spec: dict, key: str, variant_key: str) -> set[str]:
    values: set[str] = set()
    for item in surface_spec.get(key) or []:
        if not isinstance(item, dict):
            continue
        variant_id = item.get(variant_key)
        if isinstance(variant_id, str) and variant_id:
            values.add(variant_id)
    return values


def validate_frontend_ui_ticket_payload(
    *,
    ticket: dict | None,
    surface_spec: dict | None = None,
) -> list[str]:
    if not isinstance(ticket, dict):
        return ["ticket is not a mapping"]

    missing_parts: list[str] = []
    prototype_refs = ticket.get("prototype_refs") or []
    visual_checklist = ticket.get("visual_checklist") or []
    style_contracts = ticket.get("style_contracts") or []
    if not isinstance(prototype_refs, list) or not prototype_refs:
        missing_parts.append("prototype_refs")
    if not isinstance(visual_checklist, list) or not visual_checklist:
        missing_parts.append("visual_checklist")
    if not isinstance(style_contracts, list) or not style_contracts:
        missing_parts.append("style_contracts")

    if surface_spec:
        state_cases = ticket.get("state_cases") or []
        if not isinstance(state_cases, list) or not state_cases:
            missing_parts.append("state_cases")
        required_states = _variant_ids(surface_spec, "state_variants", "state_id")
        provided_states = {
            item.get("state_id")
            for item in state_cases
            if isinstance(item, dict) and isinstance(item.get("state_id"), str) and item.get("state_id")
        }
        missing_state_ids = sorted(state_id for state_id in required_states if state_id not in provided_states)
        if missing_state_ids:
            missing_parts.append(f"state_cases[{','.join(missing_state_ids)}]")

    return missing_parts


def evaluate_story_ticket_coverage(
    *,
    stories_dir: Path,
    tickets_dir: Path,
    delivery_contract_doc: Path,
    ui_contract_doc: Path,
    story_id: str | None = None,
) -> list[str]:
    findings: list[str] = []
    capability_scopes = extract_delivery_capability_scopes(delivery_contract_doc)
    surface_specs = extract_surface_specs(ui_contract_doc)
    valid_surface_ids = set(surface_specs)
    stories: dict[str, dict] = {}
    for path in sorted(stories_dir.glob("S-*.yaml")):
        data = load_yaml(path) or {}
        sid = data.get("id") or path.stem
        if story_id and sid != story_id:
            continue
        stories[sid] = data

    if story_id and story_id not in stories:
        return [f"story not found: {story_id}"]

    disk_tickets_by_story: dict[str, set[str]] = {}
    for path in sorted(tickets_dir.glob("T-*.yaml")):
        data = load_yaml(path) or {}
        sid = data.get("story_id")
        tid = data.get("id") or path.stem
        if not isinstance(sid, str) or not sid:
            findings.append(f"ticket missing story_id: {path.name}")
            continue
        if story_id and sid != story_id:
            continue
        disk_tickets_by_story.setdefault(sid, set()).add(tid)

    for sid, story in stories.items():
        declared = story.get("tickets") or []
        declared_ids = [item for item in declared if isinstance(item, str)]
        declared_set = set(declared_ids)
        story_capabilities, story_surfaces = extract_contract_refs(story)
        story_surface_cases = extract_story_surface_cases(story)
        if not declared_ids:
            findings.append(f"story missing tickets: {sid}")
            continue
        if len(declared_ids) != len(declared_set):
            findings.append(f"story has duplicate ticket refs: {sid}")
        if (capability_scopes or valid_surface_ids) and not has_contract_refs(story):
            findings.append(f"story missing contract_refs: {sid}")

        for tid in declared_ids:
            ticket_path = tickets_dir / f"{tid}.yaml"
            if not ticket_path.exists():
                findings.append(f"story references missing ticket: {sid} -> {tid}")
                continue
            ticket = load_yaml(ticket_path) or {}
            actual_story_id = ticket.get("story_id")
            if actual_story_id != sid:
                findings.append(
                    f"ticket story mismatch: {tid} declared_by={sid} actual_story_id={actual_story_id}"
                )
            if (ticket.get("type") or "") == "frontend-ui":
                missing_parts = validate_frontend_ui_ticket_payload(ticket=ticket)
                if missing_parts:
                    findings.append(
                        f"frontend-ui ticket missing visual payload: {sid} -> {tid} -> {missing_parts}"
                    )

        for capability_id in sorted(story_capabilities):
            if capability_id not in capability_scopes:
                findings.append(f"story references unknown capability: {sid} -> {capability_id}")
                continue
            mapped_tickets: list[dict] = []
            for tid in declared_ids:
                ticket_path = tickets_dir / f"{tid}.yaml"
                if not ticket_path.exists():
                    continue
                ticket = load_yaml(ticket_path) or {}
                ticket_capabilities, _ = extract_contract_refs(ticket)
                if capability_id in ticket_capabilities:
                    mapped_tickets.append(ticket)
            if not mapped_tickets:
                findings.append(f"story capability missing ticket coverage: {sid} -> {capability_id}")
                continue
            if capability_scopes.get(capability_id) == "external":
                if not any((ticket.get("type") or "") != "test" for ticket in mapped_tickets):
                    findings.append(f"external capability missing implementation ticket coverage: {sid} -> {capability_id}")
                if not any((ticket.get("type") or "") == "test" for ticket in mapped_tickets):
                    findings.append(f"external capability missing verification ticket coverage: {sid} -> {capability_id}")

        for surface_id in sorted(story_surfaces):
            if surface_id not in valid_surface_ids:
                findings.append(f"story references unknown critical surface: {sid} -> {surface_id}")
                continue
            surface_spec = surface_specs.get(surface_id) or {}
            mapped_tickets: list[dict] = []
            for tid in declared_ids:
                ticket_path = tickets_dir / f"{tid}.yaml"
                if not ticket_path.exists():
                    continue
                ticket = load_yaml(ticket_path) or {}
                _, ticket_surfaces = extract_contract_refs(ticket)
                if surface_id in ticket_surfaces:
                    mapped_tickets.append(ticket)
            if not mapped_tickets:
                findings.append(f"story critical surface missing ticket coverage: {sid} -> {surface_id}")
                continue
            if not any((ticket.get("type") or "") == "frontend-ui" for ticket in mapped_tickets):
                findings.append(f"critical surface missing frontend-ui ticket coverage: {sid} -> {surface_id}")
            if surface_spec.get("surface_type") in OVERLAY_SURFACE_TYPES:
                if not story_surface_cases.get(surface_id):
                    findings.append(f"overlay critical surface missing story_cases skeleton: {sid} -> {surface_id}")
                ui_tickets = [ticket for ticket in mapped_tickets if (ticket.get("type") or "") == "frontend-ui"]
                for ticket in ui_tickets:
                    missing_parts = validate_frontend_ui_ticket_payload(ticket=ticket, surface_spec=surface_spec)
                    if missing_parts:
                        findings.append(
                            f"critical surface frontend-ui ticket missing visual payload: {sid} -> {ticket.get('id')} -> {surface_id} -> {missing_parts}"
                        )
                ticket_surface_cases: list[dict] = []
                for ticket in ui_tickets:
                    ticket_surface_cases.extend(extract_ticket_surface_cases(ticket).get(surface_id, []))
                if not ticket_surface_cases:
                    findings.append(f"overlay critical surface missing ticket test_cases skeleton: {sid} -> {surface_id}")
                    continue
                required_states = _variant_ids(surface_spec, "state_variants", "state_id")
                covered_states = {
                    case.get("state_variant")
                    for case in ticket_surface_cases
                    if isinstance(case.get("state_variant"), str) and case.get("state_variant")
                }
                missing_states = sorted(state for state in required_states if state not in covered_states)
                if missing_states:
                    findings.append(
                        f"overlay critical surface missing state_variant coverage: {sid} -> {surface_id} -> {missing_states}"
                    )
                required_viewports = _variant_ids(surface_spec, "viewport_variants", "viewport_id")
                covered_viewports = {
                    case.get("viewport_variant")
                    for case in ticket_surface_cases
                    if isinstance(case.get("viewport_variant"), str) and case.get("viewport_variant")
                }
                missing_viewports = sorted(view for view in required_viewports if view not in covered_viewports)
                if missing_viewports:
                    findings.append(
                        f"overlay critical surface missing viewport_variant coverage: {sid} -> {surface_id} -> {missing_viewports}"
                    )

        disk_ids = disk_tickets_by_story.get(sid, set())
        missing_from_story = sorted(tid for tid in disk_ids if tid not in declared_set)
        if missing_from_story:
            findings.append(f"story missing disk ticket refs: {sid} -> {missing_from_story}")

    orphan_story_ids = sorted(sid for sid in disk_tickets_by_story if sid not in stories)
    if orphan_story_ids:
        findings.append(f"tickets reference unknown story ids: {orphan_story_ids}")

    return findings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Story ticket coverage guard")
    parser.add_argument("--module")
    parser.add_argument("--story-id")
    parser.add_argument("--stories-dir", default="osg-spec-docs/tasks/stories")
    parser.add_argument("--tickets-dir", default="osg-spec-docs/tasks/tickets")
    parser.add_argument("--delivery-contract")
    parser.add_argument("--ui-contract")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    module = args.module or "permission"
    stories_dir = Path(args.stories_dir)
    tickets_dir = Path(args.tickets_dir)
    delivery_contract_doc = Path(
        args.delivery_contract or f"osg-spec-docs/docs/01-product/prd/{module}/DELIVERY-CONTRACT.yaml"
    )
    ui_contract_doc = Path(
        args.ui_contract or f"osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml"
    )
    missing_paths = [str(path) for path in [stories_dir, tickets_dir, delivery_contract_doc, ui_contract_doc] if not path.exists()]
    if missing_paths:
        print("FAIL: story_ticket_coverage_guard missing path(s)")
        for path in missing_paths:
            print(f"  - {path}")
        return 1

    findings = evaluate_story_ticket_coverage(
        stories_dir=stories_dir,
        tickets_dir=tickets_dir,
        delivery_contract_doc=delivery_contract_doc,
        ui_contract_doc=ui_contract_doc,
        story_id=args.story_id,
    )
    if findings:
        print(
            "FAIL: story_ticket_coverage_guard "
            f"story_id={args.story_id or 'ALL'}"
        )
        for item in findings:
            print(f"  - {item}")
        return 1

    print(
        "PASS: story_ticket_coverage_guard "
        f"story_id={args.story_id or 'ALL'} stories_dir={stories_dir} tickets_dir={tickets_dir}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
