#!/usr/bin/env python3
"""Guard: verify story/ticket level test assets are complete and synchronized."""

from __future__ import annotations

import argparse
from pathlib import Path

import yaml

VALID_LEVELS = {"ticket", "story", "final"}


def load_yaml(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def load_stories(stories_dir: Path, story_id: str | None = None) -> dict[str, dict]:
    stories: dict[str, dict] = {}
    for path in sorted(stories_dir.glob("S-*.yaml")):
        data = load_yaml(path) or {}
        sid = data.get("id") or path.stem
        if not isinstance(sid, str) or not sid:
            continue
        if story_id and sid != story_id:
            continue
        stories[sid] = data
    return stories


def load_tickets(tickets_dir: Path, story_id: str | None = None) -> dict[str, dict]:
    tickets: dict[str, dict] = {}
    for path in sorted(tickets_dir.glob("T-*.yaml")):
        data = load_yaml(path) or {}
        tid = data.get("id") or path.stem
        sid = data.get("story_id")
        if not isinstance(tid, str) or not tid:
            continue
        if story_id and sid != story_id:
            continue
        tickets[tid] = data
    return tickets


def load_cases(cases_doc: Path, story_id: str | None = None) -> list[dict]:
    data = load_yaml(cases_doc) or []
    if not isinstance(data, list):
        raise ValueError(f"cases doc must be a list: {cases_doc}")
    result: list[dict] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        if story_id and item.get("story_id") != story_id:
            continue
        result.append(item)
    return result


def parse_matrix_rows(matrix_doc: Path) -> list[dict[str, str]]:
    content = matrix_doc.read_text(encoding="utf-8")
    rows: list[dict[str, str]] = []
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        cols = [c.strip() for c in stripped.split("|")[1:-1]]
        if len(cols) < 2:
            continue
        if cols[0] == "FR/AC" and cols[1] == "TC-ID":
            continue
        if all(set(col) <= {"-", ":"} for col in cols[:2]):
            continue
        ac_ref, tc_id = cols[0], cols[1]
        if not ac_ref or not tc_id or not tc_id.startswith("TC-"):
            continue
        rows.append({"ac_ref": ac_ref, "tc_id": tc_id})
    return rows


def _extract_story_case_entries(stories: dict[str, dict]) -> tuple[dict[str, dict[str, dict]], list[str]]:
    findings: list[str] = []
    result: dict[str, dict[str, dict]] = {}
    for sid, story in stories.items():
        story_cases = story.get("story_cases")
        if not isinstance(story_cases, list) or not story_cases:
            findings.append(f"story missing story_cases: {sid}")
            continue
        entries: dict[str, dict] = {}
        for idx, case in enumerate(story_cases):
            prefix = f"{sid}.story_cases[{idx}]"
            if not isinstance(case, dict):
                findings.append(f"{prefix} must be a mapping")
                continue
            ac_ref = case.get("ac_ref")
            story_case_id = case.get("story_case_id")
            if not isinstance(story_case_id, str) or not story_case_id.strip():
                findings.append(f"{prefix}.story_case_id must be a non-empty string")
                continue
            if not isinstance(ac_ref, str) or not ac_ref.strip():
                findings.append(f"{prefix}.ac_ref must be a non-empty string")
                continue
            entries[story_case_id] = case
        result[sid] = entries
    return result, findings


def _extract_ticket_test_case_entries(tickets: dict[str, dict]) -> tuple[dict[str, dict[str, dict]], list[str]]:
    findings: list[str] = []
    result: dict[str, dict[str, dict]] = {}
    for tid, ticket in tickets.items():
        test_cases = ticket.get("test_cases")
        if test_cases is None:
            test_cases = [
                {
                    "test_case_id": f"AUTO:{ac_ref}",
                    "ac_ref": ac_ref,
                    "case_kind": "ac",
                    "surface_id": None,
                    "state_variant": None,
                    "viewport_variant": None,
                }
                for ac_ref in ticket.get("covers_ac_refs") or []
            ]
        if not isinstance(test_cases, list) or not test_cases:
            findings.append(f"ticket missing test_cases: {tid}")
            continue
        entries: dict[str, dict] = {}
        for idx, case in enumerate(test_cases):
            prefix = f"{tid}.test_cases[{idx}]"
            if not isinstance(case, dict):
                findings.append(f"{prefix} must be a mapping")
                continue
            ac_ref = case.get("ac_ref")
            test_case_id = case.get("test_case_id")
            if not isinstance(test_case_id, str) or not test_case_id.strip():
                findings.append(f"{prefix}.test_case_id must be a non-empty string")
                continue
            if not isinstance(ac_ref, str) or not ac_ref.strip():
                findings.append(f"{prefix}.ac_ref must be a non-empty string")
                continue
            entries[test_case_id] = case
        result[tid] = entries
    return result, findings


def evaluate_test_asset_completeness(
    *,
    stories_dir: Path,
    tickets_dir: Path,
    cases_doc: Path,
    matrix_doc: Path,
    story_id: str | None = None,
) -> list[str]:
    findings: list[str] = []
    stories = load_stories(stories_dir, story_id)
    tickets = load_tickets(tickets_dir, story_id)
    cases = load_cases(cases_doc, story_id)
    matrix_rows = parse_matrix_rows(matrix_doc)

    if story_id and story_id not in stories:
        return [f"story not found: {story_id}"]

    story_case_entries, story_case_findings = _extract_story_case_entries(stories)
    findings.extend(story_case_findings)
    ticket_test_case_entries, ticket_test_case_findings = _extract_ticket_test_case_entries(tickets)
    findings.extend(ticket_test_case_findings)

    case_ids: set[str] = set()
    case_ids_by_story: dict[str, set[str]] = {}
    ticket_case_ids_by_ticket: dict[str, set[str]] = {}
    non_ticket_case_levels_by_story_case: dict[tuple[str, str], set[str]] = {}
    ticket_case_ids_by_ticket_case: dict[tuple[str, str], str] = {}
    case_by_id: dict[str, dict] = {}

    for idx, case in enumerate(cases):
        prefix = f"cases[{idx}]"
        tc_id = case.get("tc_id")
        level = case.get("level")
        sid = case.get("story_id")
        tid = case.get("ticket_id")
        ac_ref = case.get("ac_ref")
        story_case_id = case.get("story_case_id")
        test_case_id = case.get("test_case_id")

        if not isinstance(tc_id, str) or not tc_id.strip():
            findings.append(f"{prefix}.tc_id must be a non-empty string")
            continue
        if tc_id in case_ids:
            findings.append(f"duplicate tc_id: {tc_id}")
            continue
        case_ids.add(tc_id)
        case_by_id[tc_id] = case

        if level not in VALID_LEVELS:
            findings.append(f"{prefix}.level invalid: {level}")
            continue
        if not isinstance(sid, str) or not sid.strip():
            findings.append(f"{prefix}.story_id must be a non-empty string")
            continue
        if sid not in stories:
            findings.append(f"test case references unknown story: {tc_id} -> {sid}")
            continue
        case_ids_by_story.setdefault(sid, set()).add(tc_id)

        if not isinstance(ac_ref, str) or not ac_ref.strip():
            findings.append(f"{prefix}.ac_ref must be a non-empty string")
            continue
        if level == "ticket":
            if not isinstance(tid, str) or not tid.strip():
                findings.append(f"ticket-level test case missing ticket_id: {tc_id}")
                continue
            ticket = tickets.get(tid)
            if not ticket:
                findings.append(f"test case references unknown ticket: {tc_id} -> {tid}")
                continue
            actual_story_id = ticket.get("story_id")
            if actual_story_id != sid:
                findings.append(f"ticket/story mismatch in test case: {tc_id} -> {tid} story_id={sid} actual_story_id={actual_story_id}")
                continue
            ticket_case_ids_by_ticket.setdefault(tid, set()).add(tc_id)
            if isinstance(test_case_id, str) and test_case_id.strip():
                ticket_case_ids_by_ticket_case[(tid, test_case_id)] = tc_id
        else:
            if tid not in (None, ""):
                findings.append(f"non-ticket test case should not declare ticket_id: {tc_id}")
            if isinstance(story_case_id, str) and story_case_id.strip():
                non_ticket_case_levels_by_story_case.setdefault((sid, story_case_id), set()).add(level)

    matrix_tc_ids: set[str] = set()
    matrix_story_ids: set[str] = set()
    for row in matrix_rows:
        tc_id = row["tc_id"]
        ac_ref = row["ac_ref"]
        matrix_tc_ids.add(tc_id)
        case = case_by_id.get(tc_id)
        if not case:
            findings.append(f"traceability matrix references unknown test case: {tc_id}")
            continue
        matrix_story_ids.add(case["story_id"])
        case_ac_ref = case.get("ac_ref")
        if case_ac_ref != ac_ref:
            findings.append(f"traceability matrix ac_ref mismatch: {tc_id} matrix={ac_ref} case={case_ac_ref}")

    for sid, story in stories.items():
        story_entries = story_case_entries.get(sid, {})
        if not story_entries:
            continue
        missing_story_tests = sorted(
            story_case_id
            for story_case_id in story_entries
            if "story" not in non_ticket_case_levels_by_story_case.get((sid, story_case_id), set())
        )
        if missing_story_tests:
            findings.append(f"story missing story-level test cases: {sid} -> {missing_story_tests}")
        missing_final_tests = sorted(
            story_case_id
            for story_case_id in story_entries
            if "final" not in non_ticket_case_levels_by_story_case.get((sid, story_case_id), set())
        )
        if missing_final_tests:
            findings.append(f"story missing final-level test cases: {sid} -> {missing_final_tests}")
        if sid not in case_ids_by_story:
            findings.append(f"story missing test case assets: {sid}")
        if sid not in matrix_story_ids:
            findings.append(f"story missing traceability matrix assets: {sid}")

    for tid, _ticket in tickets.items():
        if tid not in ticket_case_ids_by_ticket:
            findings.append(f"ticket missing ticket-level test case coverage: {tid}")
        expected_ticket_cases = ticket_test_case_entries.get(tid, {})
        missing_ticket_cases = sorted(
            test_case_id for test_case_id in expected_ticket_cases if (tid, test_case_id) not in ticket_case_ids_by_ticket_case
        )
        if missing_ticket_cases:
            findings.append(f"ticket missing declared test_cases coverage: {tid} -> {missing_ticket_cases}")

    for tc_id in sorted(case_ids):
        if tc_id not in matrix_tc_ids:
            findings.append(f"test case missing traceability matrix row: {tc_id}")

    return findings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test asset completeness guard")
    parser.add_argument("--module", default="permission")
    parser.add_argument("--story-id")
    parser.add_argument("--stories-dir", default="osg-spec-docs/tasks/stories")
    parser.add_argument("--tickets-dir", default="osg-spec-docs/tasks/tickets")
    parser.add_argument("--cases")
    parser.add_argument("--matrix")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    stories_dir = Path(args.stories_dir)
    tickets_dir = Path(args.tickets_dir)
    cases_doc = Path(args.cases or f"osg-spec-docs/tasks/testing/{args.module}-test-cases.yaml")
    matrix_doc = Path(args.matrix or f"osg-spec-docs/tasks/testing/{args.module}-traceability-matrix.md")

    missing_paths = [str(path) for path in [stories_dir, tickets_dir, cases_doc, matrix_doc] if not path.exists()]
    if missing_paths:
        print("FAIL: test_asset_completeness_guard missing path(s)")
        for path in missing_paths:
            print(f"  - {path}")
        return 1

    findings = evaluate_test_asset_completeness(
        stories_dir=stories_dir,
        tickets_dir=tickets_dir,
        cases_doc=cases_doc,
        matrix_doc=matrix_doc,
        story_id=args.story_id,
    )
    if findings:
        print(
            "FAIL: test_asset_completeness_guard "
            f"story_id={args.story_id or 'ALL'} stories_dir={stories_dir} tickets_dir={tickets_dir}"
        )
        for item in findings:
            print(f"  - {item}")
        return 1

    print(
        "PASS: test_asset_completeness_guard "
        f"story_id={args.story_id or 'ALL'} stories_dir={stories_dir} tickets_dir={tickets_dir} cases={cases_doc} matrix={matrix_doc}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
