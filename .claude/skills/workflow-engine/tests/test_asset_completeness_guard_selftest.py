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
            {"story_case_id": f"SC-{story_id}-{idx:03d}", "ac_ref": ac_ref, "case_kind": "ac"}
            for idx, ac_ref in enumerate(story_case_refs, 1)
        ],
    }


def _ticket(ticket_id: str, story_id: str, *, ac_refs: list[str] | None = None) -> dict:
    ac_refs = ac_refs or ["AC-S-001-01"]
    return {
        "id": ticket_id,
        "story_id": story_id,
        "type": "backend",
        "test_cases": [
            {
                "test_case_id": f"TCS-{ticket_id}-{idx:03d}",
                "ac_ref": ac_ref,
                "case_kind": "ac",
                "surface_id": None,
                "state_variant": None,
                "viewport_variant": None,
            }
            for idx, ac_ref in enumerate(ac_refs, 1)
        ],
    }


def _case(
    tc_id: str,
    *,
    level: str,
    story_id: str,
    ac_ref: str,
    ticket_id: str | None = None,
    story_case_id: str | None = None,
    test_case_id: str | None = None,
) -> dict:
    payload = {
        "tc_id": tc_id,
        "level": level,
        "story_id": story_id,
        "ticket_id": ticket_id,
        "ac_ref": ac_ref,
    }
    if level in {"story", "final"}:
        payload["story_case_id"] = story_case_id or "SC-S-001-001"
    if level == "ticket":
        payload["test_case_id"] = test_case_id or f"TCS-{ticket_id}-001"
    return payload


def test_missing_story_test_assets_fail() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(root / "stories/S-001.yaml", _story("S-001", ticket_ids=["T-001"], story_case_refs=["AC-S-001-01"]))
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001", ac_refs=["AC-S-001-01"]))
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
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001", ac_refs=["AC-S-001-01"]))
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
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001", ac_refs=["AC-S-001-01"]))
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
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001", ac_refs=["AC-S-001-01"]))
        _write_yaml(root / "tickets/T-002.yaml", _ticket("T-002", "S-001", ac_refs=["AC-S-001-02"]))
        _write_yaml(
            root / "cases.yaml",
            [
                _case("TC-001", level="ticket", story_id="S-001", ticket_id="T-001", ac_ref="AC-S-001-01", test_case_id="TCS-T-001-001"),
                _case("TC-002", level="ticket", story_id="S-001", ticket_id="T-002", ac_ref="AC-S-001-02", test_case_id="TCS-T-002-001"),
                _case("TC-003", level="story", story_id="S-001", ac_ref="AC-S-001-01", story_case_id="SC-S-001-001"),
                _case("TC-004", level="story", story_id="S-001", ac_ref="AC-S-001-02", story_case_id="SC-S-001-002"),
                _case("TC-005", level="final", story_id="S-001", ac_ref="AC-S-001-01", story_case_id="SC-S-001-001"),
                _case("TC-006", level="final", story_id="S-001", ac_ref="AC-S-001-02", story_case_id="SC-S-001-002"),
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


def test_declared_ticket_test_case_without_generated_tc_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(root / "stories/S-001.yaml", _story("S-001", ticket_ids=["T-001"], story_case_refs=["AC-S-001-01"]))
        _write_yaml(
            root / "tickets/T-001.yaml",
            {
                "id": "T-001",
                "story_id": "S-001",
                "type": "frontend-ui",
                "test_cases": [
                    {
                        "test_case_id": "TCS-T-001-001",
                        "ac_ref": "AC-S-001-01",
                        "case_kind": "critical_surface",
                        "surface_id": "modal-forgot-password",
                        "state_variant": "default",
                        "viewport_variant": "desktop",
                    },
                    {
                        "test_case_id": "TCS-T-001-002",
                        "ac_ref": "AC-S-001-01",
                        "case_kind": "critical_surface",
                        "surface_id": "modal-forgot-password",
                        "state_variant": "success",
                        "viewport_variant": "desktop",
                    },
                ],
            },
        )
        _write_yaml(
            root / "cases.yaml",
            [
                _case("TC-001", level="ticket", story_id="S-001", ticket_id="T-001", ac_ref="AC-S-001-01"),
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
        assert any("missing declared test_cases coverage" in item for item in findings), findings


def test_pending_obligation_blocked_only_in_verify_stage() -> None:
    """pending TC should only be flagged in verify stage, not split/approve."""
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        story = _story("S-001", ticket_ids=["T-001"], story_case_refs=["AC-S-001-01"])
        story["required_test_obligations"] = {"profile": "display_only", "required": ["display"]}
        story["acceptance_criteria"] = ["页面展示"]
        _write_yaml(root / "stories/S-001.yaml", story)
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001", ac_refs=["AC-S-001-01"]))
        cases = [
            {**_case("TC-001", level="ticket", story_id="S-001", ticket_id="T-001", ac_ref="AC-S-001-01"),
             "category": "positive", "scenario_obligation": "display",
             "latest_result": {"status": "pending", "evidence_ref": None}},
            {**_case("TC-002", level="story", story_id="S-001", ac_ref="AC-S-001-01"),
             "category": "positive", "scenario_obligation": "display",
             "latest_result": {"status": "pending", "evidence_ref": None}},
            {**_case("TC-003", level="final", story_id="S-001", ac_ref="AC-S-001-01"),
             "category": "positive", "scenario_obligation": "display",
             "latest_result": {"status": "pending", "evidence_ref": None}},
        ]
        _write_yaml(root / "cases.yaml", cases)
        _write_matrix(root / "matrix.md", [("AC-S-001-01", "TC-001"), ("AC-S-001-01", "TC-002"), ("AC-S-001-01", "TC-003")])

        # split stage: pending should NOT be flagged
        findings_split = evaluate_test_asset_completeness(
            stories_dir=root / "stories", tickets_dir=root / "tickets",
            cases_doc=root / "cases.yaml", matrix_doc=root / "matrix.md", stage="split",
        )
        assert not any("obligation pending" in f for f in findings_split), f"split should not flag pending: {findings_split}"

        # verify stage: pending SHOULD be flagged
        findings_verify = evaluate_test_asset_completeness(
            stories_dir=root / "stories", tickets_dir=root / "tickets",
            cases_doc=root / "cases.yaml", matrix_doc=root / "matrix.md", stage="verify",
        )
        assert any("obligation pending" in f for f in findings_verify), f"verify should flag pending: {findings_verify}"


def test_missing_category_with_obligation_fails() -> None:
    """TC with scenario_obligation but no category should be flagged."""
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        story = _story("S-001", ticket_ids=["T-001"], story_case_refs=["AC-S-001-01"])
        story["required_test_obligations"] = {"profile": "display_only", "required": ["display"]}
        story["acceptance_criteria"] = ["页面展示"]
        _write_yaml(root / "stories/S-001.yaml", story)
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001", ac_refs=["AC-S-001-01"]))
        cases = [
            {**_case("TC-001", level="ticket", story_id="S-001", ticket_id="T-001", ac_ref="AC-S-001-01"),
             "scenario_obligation": "display",  # category intentionally missing
             "latest_result": {"status": "pass", "evidence_ref": "x"}},
            _case("TC-002", level="story", story_id="S-001", ac_ref="AC-S-001-01"),
            _case("TC-003", level="final", story_id="S-001", ac_ref="AC-S-001-01"),
        ]
        _write_yaml(root / "cases.yaml", cases)
        _write_matrix(root / "matrix.md", [("AC-S-001-01", "TC-001"), ("AC-S-001-01", "TC-002"), ("AC-S-001-01", "TC-003")])
        findings = evaluate_test_asset_completeness(
            stories_dir=root / "stories", tickets_dir=root / "tickets",
            cases_doc=root / "cases.yaml", matrix_doc=root / "matrix.md",
        )
        assert any("missing category" in f for f in findings), f"should flag missing category: {findings}"


def test_both_category_and_obligation_missing_fails() -> None:
    """TC missing both category and scenario_obligation should be flagged."""
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        story = _story("S-001", ticket_ids=["T-001"], story_case_refs=["AC-S-001-01"])
        story["required_test_obligations"] = {"profile": "display_only", "required": ["display"]}
        story["acceptance_criteria"] = ["页面展示"]
        _write_yaml(root / "stories/S-001.yaml", story)
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001", ac_refs=["AC-S-001-01"]))
        # TC-001 has both fields, TC-002 has neither (the bad data)
        cases = [
            {**_case("TC-001", level="ticket", story_id="S-001", ticket_id="T-001", ac_ref="AC-S-001-01"),
             "category": "positive", "scenario_obligation": "display",
             "latest_result": {"status": "pass", "evidence_ref": "x"}},
            {**_case("TC-002", level="story", story_id="S-001", ac_ref="AC-S-001-01")},
            {**_case("TC-003", level="final", story_id="S-001", ac_ref="AC-S-001-01")},
        ]
        _write_yaml(root / "cases.yaml", cases)
        _write_matrix(root / "matrix.md", [("AC-S-001-01", "TC-001"), ("AC-S-001-01", "TC-002"), ("AC-S-001-01", "TC-003")])
        findings = evaluate_test_asset_completeness(
            stories_dir=root / "stories", tickets_dir=root / "tickets",
            cases_doc=root / "cases.yaml", matrix_doc=root / "matrix.md",
        )
        assert any("missing both" in f for f in findings), f"should flag both missing: {findings}"


def test_story_id_filter_does_not_cross_contaminate() -> None:
    """When --story-id is specified, matrix rows from other stories should not cause false positives."""
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(root / "stories/S-001.yaml", _story("S-001", ticket_ids=["T-001"], story_case_refs=["AC-S-001-01"]))
        _write_yaml(root / "stories/S-002.yaml", _story("S-002", ticket_ids=["T-002"], story_case_refs=["AC-S-002-01"]))
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001", ac_refs=["AC-S-001-01"]))
        _write_yaml(root / "tickets/T-002.yaml", _ticket("T-002", "S-002", ac_refs=["AC-S-002-01"]))
        cases = [
            _case("TC-001", level="ticket", story_id="S-001", ticket_id="T-001", ac_ref="AC-S-001-01", test_case_id="TCS-T-001-001"),
            _case("TC-002", level="story", story_id="S-001", ac_ref="AC-S-001-01", story_case_id="SC-S-001-001"),
            _case("TC-003", level="final", story_id="S-001", ac_ref="AC-S-001-01", story_case_id="SC-S-001-001"),
            _case("TC-004", level="ticket", story_id="S-002", ticket_id="T-002", ac_ref="AC-S-002-01", test_case_id="TCS-T-002-001"),
            _case("TC-005", level="story", story_id="S-002", ac_ref="AC-S-002-01", story_case_id="SC-S-002-001"),
            _case("TC-006", level="final", story_id="S-002", ac_ref="AC-S-002-01", story_case_id="SC-S-002-001"),
        ]
        _write_yaml(root / "cases.yaml", cases)
        _write_matrix(root / "matrix.md", [
            ("AC-S-001-01", "TC-001"), ("AC-S-001-01", "TC-002"), ("AC-S-001-01", "TC-003"),
            ("AC-S-002-01", "TC-004"), ("AC-S-002-01", "TC-005"), ("AC-S-002-01", "TC-006"),
        ])
        # Filter to S-001 only — should not see S-002's matrix rows as errors
        findings = evaluate_test_asset_completeness(
            stories_dir=root / "stories", tickets_dir=root / "tickets",
            cases_doc=root / "cases.yaml", matrix_doc=root / "matrix.md",
            story_id="S-001",
        )
        assert not any("unknown test case" in f for f in findings), f"should not cross-contaminate: {findings}"


def _op_case(
    tc_id: str,
    *,
    level: str,
    story_id: str,
    ac_ref: str,
    ticket_id: str | None = None,
    story_case_id: str | None = None,
    test_case_id: str | None = None,
    category: str | None = None,
    scenario_obligation: str | None = None,
    operation: str | None = None,
    status: str = "pending",
) -> dict:
    payload = _case(tc_id, level=level, story_id=story_id, ac_ref=ac_ref,
                    ticket_id=ticket_id, story_case_id=story_case_id, test_case_id=test_case_id)
    payload["category"] = category
    payload["scenario_obligation"] = scenario_obligation
    payload["operation"] = operation
    payload["latest_result"] = {"status": status, "evidence_ref": None}
    return payload


def test_missing_edit_operation_at_split_stage_fails() -> None:
    """Story requires create+edit operations, but TCs only cover create → operation gap reported."""
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        story = _story("S-001", ticket_ids=["T-001"], story_case_refs=["AC-S-001-01", "AC-S-001-02"])
        story["required_test_obligations"] = {"profile": "crud", "required": ["display", "state_change"]}
        story["required_test_operations"] = {
            "profile": "crud_minimal",
            "operations": {
                "create": {"required": ["state_change"]},
                "edit": {"required": ["state_change"]},
            },
        }
        story["acceptance_criteria"] = ["新增成功", "编辑成功"]
        _write_yaml(root / "stories/S-001.yaml", story)
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001", ac_refs=["AC-S-001-01", "AC-S-001-02"]))
        cases = [
            _op_case("TC-001", level="ticket", story_id="S-001", ticket_id="T-001", ac_ref="AC-S-001-01",
                     category="positive", scenario_obligation="state_change", operation="create"),
            _op_case("TC-002", level="story", story_id="S-001", ac_ref="AC-S-001-01",
                     story_case_id="SC-S-001-001", category="positive", scenario_obligation="state_change", operation="create"),
            _op_case("TC-003", level="final", story_id="S-001", ac_ref="AC-S-001-01",
                     story_case_id="SC-S-001-001", category="positive", scenario_obligation="state_change", operation="create"),
            _op_case("TC-004", level="story", story_id="S-001", ac_ref="AC-S-001-02",
                     story_case_id="SC-S-001-002", category="positive", scenario_obligation="display"),
            _op_case("TC-005", level="final", story_id="S-001", ac_ref="AC-S-001-02",
                     story_case_id="SC-S-001-002", category="positive", scenario_obligation="display"),
        ]
        _write_yaml(root / "cases.yaml", cases)
        _write_matrix(root / "matrix.md", [(c["ac_ref"], c["tc_id"]) for c in cases])
        findings = evaluate_test_asset_completeness(
            stories_dir=root / "stories", tickets_dir=root / "tickets",
            cases_doc=root / "cases.yaml", matrix_doc=root / "matrix.md", stage="split",
        )
        assert any("operation obligation gap" in f and "'edit'" in f for f in findings), \
            f"should report missing edit operation: {findings}"


def test_missing_status_toggle_at_approve_stage_fails() -> None:
    """Story requires status_toggle, no TC covers it → operation gap at approve stage."""
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        story = _story("S-001", ticket_ids=["T-001"], story_case_refs=["AC-S-001-01"])
        story["required_test_obligations"] = {"profile": "crud", "required": ["state_change"]}
        story["required_test_operations"] = {
            "profile": "crud_minimal",
            "operations": {
                "create": {"required": ["state_change"]},
                "status_toggle": {"required": ["state_change"]},
            },
        }
        story["acceptance_criteria"] = ["新增成功"]
        _write_yaml(root / "stories/S-001.yaml", story)
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001", ac_refs=["AC-S-001-01"]))
        cases = [
            _op_case("TC-001", level="ticket", story_id="S-001", ticket_id="T-001", ac_ref="AC-S-001-01",
                     category="positive", scenario_obligation="state_change", operation="create"),
            _op_case("TC-002", level="story", story_id="S-001", ac_ref="AC-S-001-01",
                     story_case_id="SC-S-001-001", category="positive", scenario_obligation="state_change", operation="create"),
            _op_case("TC-003", level="final", story_id="S-001", ac_ref="AC-S-001-01",
                     story_case_id="SC-S-001-001", category="positive", scenario_obligation="state_change", operation="create"),
        ]
        _write_yaml(root / "cases.yaml", cases)
        _write_matrix(root / "matrix.md", [(c["ac_ref"], c["tc_id"]) for c in cases])
        findings = evaluate_test_asset_completeness(
            stories_dir=root / "stories", tickets_dir=root / "tickets",
            cases_doc=root / "cases.yaml", matrix_doc=root / "matrix.md", stage="approve",
        )
        assert any("operation obligation gap" in f and "'status_toggle'" in f for f in findings), \
            f"should report missing status_toggle: {findings}"


def test_edit_present_but_pending_at_verify_stage_fails() -> None:
    """edit TC exists but status=pending at verify stage → operation pending reported."""
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        story = _story("S-001", ticket_ids=["T-001"], story_case_refs=["AC-S-001-01"])
        story["required_test_obligations"] = {"profile": "crud", "required": ["state_change"]}
        story["required_test_operations"] = {
            "profile": "crud_minimal",
            "operations": {"edit": {"required": ["state_change"]}},
        }
        story["acceptance_criteria"] = ["编辑成功"]
        _write_yaml(root / "stories/S-001.yaml", story)
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001", ac_refs=["AC-S-001-01"]))
        cases = [
            _op_case("TC-001", level="ticket", story_id="S-001", ticket_id="T-001", ac_ref="AC-S-001-01",
                     category="positive", scenario_obligation="state_change", operation="edit", status="pending"),
            _op_case("TC-002", level="story", story_id="S-001", ac_ref="AC-S-001-01",
                     story_case_id="SC-S-001-001", category="positive", scenario_obligation="state_change", operation="edit", status="pending"),
            _op_case("TC-003", level="final", story_id="S-001", ac_ref="AC-S-001-01",
                     story_case_id="SC-S-001-001", category="positive", scenario_obligation="state_change", operation="edit", status="pending"),
        ]
        _write_yaml(root / "cases.yaml", cases)
        _write_matrix(root / "matrix.md", [(c["ac_ref"], c["tc_id"]) for c in cases])

        # split: should NOT report pending
        findings_split = evaluate_test_asset_completeness(
            stories_dir=root / "stories", tickets_dir=root / "tickets",
            cases_doc=root / "cases.yaml", matrix_doc=root / "matrix.md", stage="split",
        )
        assert not any("operation obligation pending" in f for f in findings_split), \
            f"split should not flag operation pending: {findings_split}"

        # verify: SHOULD report pending
        findings_verify = evaluate_test_asset_completeness(
            stories_dir=root / "stories", tickets_dir=root / "tickets",
            cases_doc=root / "cases.yaml", matrix_doc=root / "matrix.md", stage="verify",
        )
        assert any("operation obligation pending" in f and "'edit'" in f for f in findings_verify), \
            f"verify should flag operation pending for edit: {findings_verify}"


def test_no_operation_check_when_story_lacks_required_test_operations() -> None:
    """Story without required_test_operations should not trigger operation checks."""
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        story = _story("S-001", ticket_ids=["T-001"], story_case_refs=["AC-S-001-01"])
        story["acceptance_criteria"] = ["页面展示"]
        _write_yaml(root / "stories/S-001.yaml", story)
        _write_yaml(root / "tickets/T-001.yaml", _ticket("T-001", "S-001", ac_refs=["AC-S-001-01"]))
        cases = [
            _op_case("TC-001", level="ticket", story_id="S-001", ticket_id="T-001", ac_ref="AC-S-001-01",
                     category="positive", scenario_obligation="display", status="pass"),
            _op_case("TC-002", level="story", story_id="S-001", ac_ref="AC-S-001-01",
                     story_case_id="SC-S-001-001", category="positive", scenario_obligation="display", status="pass"),
            _op_case("TC-003", level="final", story_id="S-001", ac_ref="AC-S-001-01",
                     story_case_id="SC-S-001-001", category="positive", scenario_obligation="display", status="pass"),
        ]
        _write_yaml(root / "cases.yaml", cases)
        _write_matrix(root / "matrix.md", [(c["ac_ref"], c["tc_id"]) for c in cases])
        findings = evaluate_test_asset_completeness(
            stories_dir=root / "stories", tickets_dir=root / "tickets",
            cases_doc=root / "cases.yaml", matrix_doc=root / "matrix.md", stage="verify",
        )
        assert not any("operation obligation" in f for f in findings), \
            f"should not check operations when story lacks required_test_operations: {findings}"


def main() -> int:
    tests = [
        test_missing_story_test_assets_fail,
        test_case_without_matrix_row_fails,
        test_story_ticket_ref_divergence_fails,
        test_fully_synchronized_assets_pass,
        test_declared_ticket_test_case_without_generated_tc_fails,
        test_pending_obligation_blocked_only_in_verify_stage,
        test_missing_category_with_obligation_fails,
        test_both_category_and_obligation_missing_fails,
        test_story_id_filter_does_not_cross_contaminate,
        test_missing_edit_operation_at_split_stage_fails,
        test_missing_status_toggle_at_approve_stage_fails,
        test_edit_present_but_pending_at_verify_stage_fails,
        test_no_operation_check_when_story_lacks_required_test_operations,
    ]
    for fn in tests:
        fn()
    print(f"PASS: test_asset_completeness_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
