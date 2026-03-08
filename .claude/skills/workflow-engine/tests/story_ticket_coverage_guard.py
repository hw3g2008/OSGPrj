#!/usr/bin/env python3
"""Guard: verify every story has complete ticket decomposition before ticket approval/final gate."""

from __future__ import annotations

import argparse
from pathlib import Path

import yaml


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


def extract_critical_surface_ids(contract_doc: Path) -> set[str]:
    data = load_yaml(contract_doc) or {}
    surface_ids: set[str] = set()
    for page in data.get("pages") or []:
        if not isinstance(page, dict):
            continue
        for surface in page.get("critical_surfaces") or []:
            if not isinstance(surface, dict):
                continue
            surface_id = surface.get("surface_id")
            if isinstance(surface_id, str) and surface_id:
                surface_ids.add(surface_id)
    return surface_ids


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
    valid_surface_ids = extract_critical_surface_ids(ui_contract_doc)
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
