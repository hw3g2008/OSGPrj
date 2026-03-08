#!/usr/bin/env python3
"""Self-test for story_ticket_coverage_guard.py."""

from __future__ import annotations

import tempfile
from pathlib import Path

import yaml

from story_ticket_coverage_guard import evaluate_story_ticket_coverage


def _write_yaml(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


def _write_contracts(root: Path) -> None:
    _write_yaml(root / "DELIVERY-CONTRACT.yaml", {"schema_version": 1, "module": "permission", "capabilities": []})
    _write_yaml(root / "UI-VISUAL-CONTRACT.yaml", {"pages": []})


def test_story_without_tickets_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_contracts(root)
        _write_yaml(root / "stories/S-001.yaml", {"id": "S-001", "tickets": []})
        findings = evaluate_story_ticket_coverage(
            stories_dir=root / "stories",
            tickets_dir=root / "tickets",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            ui_contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
        )
        assert any("story missing tickets" in item for item in findings), findings


def test_missing_ticket_reference_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_contracts(root)
        _write_yaml(root / "stories/S-001.yaml", {"id": "S-001", "tickets": ["T-001"]})
        (root / "tickets").mkdir(parents=True, exist_ok=True)
        findings = evaluate_story_ticket_coverage(
            stories_dir=root / "stories",
            tickets_dir=root / "tickets",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            ui_contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
        )
        assert any("story references missing ticket" in item for item in findings), findings


def test_ticket_story_mismatch_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_contracts(root)
        _write_yaml(root / "stories/S-001.yaml", {"id": "S-001", "tickets": ["T-001"]})
        _write_yaml(root / "tickets/T-001.yaml", {"id": "T-001", "story_id": "S-002"})
        findings = evaluate_story_ticket_coverage(
            stories_dir=root / "stories",
            tickets_dir=root / "tickets",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            ui_contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
        )
        assert any("ticket story mismatch" in item for item in findings), findings


def test_disk_ticket_missing_from_story_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_contracts(root)
        _write_yaml(root / "stories/S-001.yaml", {"id": "S-001", "tickets": ["T-001"]})
        _write_yaml(root / "tickets/T-001.yaml", {"id": "T-001", "story_id": "S-001"})
        _write_yaml(root / "tickets/T-002.yaml", {"id": "T-002", "story_id": "S-001"})
        findings = evaluate_story_ticket_coverage(
            stories_dir=root / "stories",
            tickets_dir=root / "tickets",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            ui_contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
        )
        assert any("story missing disk ticket refs" in item for item in findings), findings


def test_story_id_scope_passes() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_contracts(root)
        _write_yaml(root / "stories/S-001.yaml", {"id": "S-001", "tickets": ["T-001"]})
        _write_yaml(root / "stories/S-002.yaml", {"id": "S-002", "tickets": []})
        _write_yaml(root / "tickets/T-001.yaml", {"id": "T-001", "story_id": "S-001"})
        findings = evaluate_story_ticket_coverage(
            stories_dir=root / "stories",
            tickets_dir=root / "tickets",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            ui_contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
            story_id="S-001",
        )
        assert not findings, findings


def test_valid_inputs_pass() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_contracts(root)
        _write_yaml(root / "stories/S-001.yaml", {"id": "S-001", "tickets": ["T-001", "T-002"]})
        _write_yaml(root / "stories/S-002.yaml", {"id": "S-002", "tickets": ["T-003"]})
        _write_yaml(root / "tickets/T-001.yaml", {"id": "T-001", "story_id": "S-001"})
        _write_yaml(root / "tickets/T-002.yaml", {"id": "T-002", "story_id": "S-001"})
        _write_yaml(root / "tickets/T-003.yaml", {"id": "T-003", "story_id": "S-002"})
        findings = evaluate_story_ticket_coverage(
            stories_dir=root / "stories",
            tickets_dir=root / "tickets",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            ui_contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
        )
        assert not findings, findings


def test_external_effect_requires_implementation_and_verification_ticket() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(
            root / "stories/S-001.yaml",
            {
                "id": "S-001",
                "tickets": ["T-001"],
                "contract_refs": {"capabilities": ["forgot-password-send-code"]},
            },
        )
        _write_yaml(
            root / "tickets/T-001.yaml",
            {
                "id": "T-001",
                "story_id": "S-001",
                "type": "backend",
                "contract_refs": {"capabilities": ["forgot-password-send-code"]},
            },
        )
        _write_yaml(
            root / "DELIVERY-CONTRACT.yaml",
            {
                "schema_version": 1,
                "module": "permission",
                "capabilities": [
                    {
                        "capability_id": "forgot-password-send-code",
                        "effect_scope": "external",
                    }
                ],
            },
        )
        _write_yaml(root / "UI-VISUAL-CONTRACT.yaml", {"pages": []})
        findings = evaluate_story_ticket_coverage(
            stories_dir=root / "stories",
            tickets_dir=root / "tickets",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            ui_contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
        )
        assert any("missing verification ticket coverage" in item for item in findings), findings


def test_critical_surface_requires_frontend_ui_ticket() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(
            root / "stories/S-001.yaml",
            {
                "id": "S-001",
                "tickets": ["T-001"],
                "contract_refs": {"critical_surfaces": ["captcha-block"]},
            },
        )
        _write_yaml(
            root / "tickets/T-001.yaml",
            {
                "id": "T-001",
                "story_id": "S-001",
                "type": "backend",
                "contract_refs": {"critical_surfaces": ["captcha-block"]},
            },
        )
        _write_yaml(root / "DELIVERY-CONTRACT.yaml", {"schema_version": 1, "module": "permission", "capabilities": []})
        _write_yaml(
            root / "UI-VISUAL-CONTRACT.yaml",
            {
                "pages": [
                    {
                        "page_id": "login-page",
                        "critical_surfaces": [
                            {
                                "surface_id": "captcha-block",
                                "selector": ".captcha-code",
                            }
                        ],
                    }
                ]
            },
        )
        findings = evaluate_story_ticket_coverage(
            stories_dir=root / "stories",
            tickets_dir=root / "tickets",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            ui_contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
        )
        assert any("missing frontend-ui ticket coverage" in item for item in findings), findings


def test_story_missing_contract_refs_fails_when_contracts_exist() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(
            root / "stories/S-001.yaml",
            {
                "id": "S-001",
                "tickets": ["T-001"],
            },
        )
        _write_yaml(
            root / "tickets/T-001.yaml",
            {
                "id": "T-001",
                "story_id": "S-001",
                "type": "backend",
            },
        )
        _write_yaml(
            root / "DELIVERY-CONTRACT.yaml",
            {
                "schema_version": 1,
                "module": "permission",
                "capabilities": [
                    {
                        "capability_id": "login-success",
                        "effect_scope": "internal",
                    }
                ],
            },
        )
        _write_yaml(root / "UI-VISUAL-CONTRACT.yaml", {"pages": []})
        findings = evaluate_story_ticket_coverage(
            stories_dir=root / "stories",
            tickets_dir=root / "tickets",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            ui_contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
            story_id="S-001",
        )
        assert any("story missing contract_refs" in item for item in findings), findings


def test_story_with_empty_contract_refs_passes_when_other_story_maps_contract_items() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(
            root / "stories/S-001.yaml",
            {
                "id": "S-001",
                "tickets": ["T-001", "T-002"],
                "contract_refs": {"capabilities": ["login-success"], "critical_surfaces": []},
            },
        )
        _write_yaml(
            root / "stories/S-002.yaml",
            {
                "id": "S-002",
                "tickets": ["T-003"],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
            },
        )
        _write_yaml(
            root / "tickets/T-001.yaml",
            {
                "id": "T-001",
                "story_id": "S-001",
                "type": "backend",
                "contract_refs": {"capabilities": ["login-success"], "critical_surfaces": []},
            },
        )
        _write_yaml(
            root / "tickets/T-002.yaml",
            {
                "id": "T-002",
                "story_id": "S-001",
                "type": "test",
                "contract_refs": {"capabilities": ["login-success"], "critical_surfaces": []},
            },
        )
        _write_yaml(
            root / "tickets/T-003.yaml",
            {
                "id": "T-003",
                "story_id": "S-002",
                "type": "frontend",
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
            },
        )
        _write_yaml(
            root / "DELIVERY-CONTRACT.yaml",
            {
                "schema_version": 1,
                "module": "permission",
                "capabilities": [
                    {
                        "capability_id": "login-success",
                        "effect_scope": "internal",
                    }
                ],
            },
        )
        _write_yaml(root / "UI-VISUAL-CONTRACT.yaml", {"pages": []})
        findings = evaluate_story_ticket_coverage(
            stories_dir=root / "stories",
            tickets_dir=root / "tickets",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            ui_contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
        )
        assert not findings, findings


def main() -> int:
    tests = [
        test_story_without_tickets_fails,
        test_missing_ticket_reference_fails,
        test_ticket_story_mismatch_fails,
        test_disk_ticket_missing_from_story_fails,
        test_story_id_scope_passes,
        test_valid_inputs_pass,
        test_external_effect_requires_implementation_and_verification_ticket,
        test_critical_surface_requires_frontend_ui_ticket,
        test_story_missing_contract_refs_fails_when_contracts_exist,
        test_story_with_empty_contract_refs_passes_when_other_story_maps_contract_items,
    ]
    for fn in tests:
        fn()
    print(f"PASS: story_ticket_coverage_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
