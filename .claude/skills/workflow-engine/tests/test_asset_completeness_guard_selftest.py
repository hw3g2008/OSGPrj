#!/usr/bin/env python3
"""Self-test for test_asset_completeness_guard.py."""

from __future__ import annotations

import tempfile
from pathlib import Path

import yaml

from test_asset_completeness_guard import evaluate_test_asset_completeness


def _write_yaml(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


def _write_matrix(path: Path, rows: list[tuple[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "| FR/AC | TC-ID | Level | Script | Command | Latest Result | Evidence Ref |",
        "|-------|-------|-------|--------|---------|---------------|-------------|",
    ]
    for ac_ref, tc_id in rows:
        lines.append(f"| {ac_ref} | {tc_id} | ticket | demo | `echo ok` | pending | — |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _story(story_id: str, *, ticket_ids: list[str], story_case_refs: list[str]) -> dict:
    return {
        "id": story_id,
        "tickets": ticket_ids,
        "story_cases": [
            {"story_case_id": f"SC-{story_id}-{idx:03d}", "ac_ref": ac_ref}
            for idx, ac_ref in enumerate(story_case_refs, 1)
        ],
    }


def _ticket(ticket_id: str, story_id: str) -> dict:
    return {"id": ticket_id, "story_id": story_id, "type": "backend"}


def _case(tc_id: str, *, level: str, story_id: str, ac_ref: str, ticket_id: str | None = None) -> dict:
    payload = {
        "tc_id": tc_id,
        "level": level,
        "story_id": story_id,
        "ticket_id": ticket_id,
        "ac_ref": ac_ref,
    }
    return payload


def test_missing_story_test_assets_fail() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(root / "stories/S-001.yaml", _story("S-001", ticket_ids=["T-001"], story_case_refs=["AC-S-001-01"]))
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001"))
        _write_yaml(
            root / "cases.yaml",
            [
                _case("TC-001", level="ticket", story_id="S-001", ticket_id="T-001", ac_ref="AC-S-001-01"),
                _case("TC-002", level="final", story_id="S-001", ac_ref="AC-S-001-01"),
            ],
        )
        _write_matrix(root / "matrix.md", [("AC-S-001-01", "TC-001"), ("AC-S-001-01", "TC-002")])
        findings = evaluate_test_asset_completeness(
            stories_dir=root / "stories",
            tickets_dir=root / "tickets",
            cases_doc=root / "cases.yaml",
            matrix_doc=root / "matrix.md",
        )
        assert any("story missing story-level test cases" in item for item in findings), findings


def test_case_without_matrix_row_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(root / "stories/S-001.yaml", _story("S-001", ticket_ids=["T-001"], story_case_refs=["AC-S-001-01"]))
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001"))
        _write_yaml(
            root / "cases.yaml",
            [
                _case("TC-001", level="ticket", story_id="S-001", ticket_id="T-001", ac_ref="AC-S-001-01"),
                _case("TC-002", level="story", story_id="S-001", ac_ref="AC-S-001-01"),
                _case("TC-003", level="final", story_id="S-001", ac_ref="AC-S-001-01"),
            ],
        )
        _write_matrix(root / "matrix.md", [("AC-S-001-01", "TC-001"), ("AC-S-001-01", "TC-002")])
        findings = evaluate_test_asset_completeness(
            stories_dir=root / "stories",
            tickets_dir=root / "tickets",
            cases_doc=root / "cases.yaml",
            matrix_doc=root / "matrix.md",
        )
        assert any("test case missing traceability matrix row: TC-003" in item for item in findings), findings


def test_story_ticket_ref_divergence_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(root / "stories/S-001.yaml", _story("S-001", ticket_ids=["T-001"], story_case_refs=["AC-S-001-01"]))
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001"))
        _write_yaml(
            root / "cases.yaml",
            [
                _case("TC-001", level="ticket", story_id="S-001", ticket_id="T-999", ac_ref="AC-S-001-01"),
                _case("TC-002", level="story", story_id="S-001", ac_ref="AC-S-001-01"),
                _case("TC-003", level="final", story_id="S-001", ac_ref="AC-S-001-01"),
            ],
        )
        _write_matrix(
            root / "matrix.md",
            [("AC-S-001-01", "TC-001"), ("AC-S-001-01", "TC-002"), ("AC-S-001-01", "TC-003")],
        )
        findings = evaluate_test_asset_completeness(
            stories_dir=root / "stories",
            tickets_dir=root / "tickets",
            cases_doc=root / "cases.yaml",
            matrix_doc=root / "matrix.md",
        )
        assert any("test case references unknown ticket" in item for item in findings), findings


def test_fully_synchronized_assets_pass() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(root / "stories/S-001.yaml", _story("S-001", ticket_ids=["T-001", "T-002"], story_case_refs=["AC-S-001-01", "AC-S-001-02"]))
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001"))
        _write_yaml(root / "tickets/T-002.yaml", _ticket("T-002", "S-001"))
        _write_yaml(
            root / "cases.yaml",
            [
                _case("TC-001", level="ticket", story_id="S-001", ticket_id="T-001", ac_ref="AC-S-001-01"),
                _case("TC-002", level="ticket", story_id="S-001", ticket_id="T-002", ac_ref="AC-S-001-02"),
                _case("TC-003", level="story", story_id="S-001", ac_ref="AC-S-001-01"),
                _case("TC-004", level="story", story_id="S-001", ac_ref="AC-S-001-02"),
                _case("TC-005", level="final", story_id="S-001", ac_ref="AC-S-001-01"),
                _case("TC-006", level="final", story_id="S-001", ac_ref="AC-S-001-02"),
            ],
        )
        _write_matrix(
            root / "matrix.md",
            [
                ("AC-S-001-01", "TC-001"),
                ("AC-S-001-02", "TC-002"),
                ("AC-S-001-01", "TC-003"),
                ("AC-S-001-02", "TC-004"),
                ("AC-S-001-01", "TC-005"),
                ("AC-S-001-02", "TC-006"),
            ],
        )
        findings = evaluate_test_asset_completeness(
            stories_dir=root / "stories",
            tickets_dir=root / "tickets",
            cases_doc=root / "cases.yaml",
            matrix_doc=root / "matrix.md",
        )
        assert not findings, findings


def main() -> int:
    tests = [
        test_missing_story_test_assets_fail,
        test_case_without_matrix_row_fails,
        test_story_ticket_ref_divergence_fails,
        test_fully_synchronized_assets_pass,
    ]
    for fn in tests:
        fn()
    print(f"PASS: test_asset_completeness_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
