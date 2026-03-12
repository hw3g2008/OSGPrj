#!/usr/bin/env python3
"""Self-test for module_readiness_guard.py."""

from __future__ import annotations

import tempfile
from pathlib import Path

import yaml

from module_readiness_guard import evaluate_module_readiness


def _write_yaml(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


def test_valid_ready_module_passes() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        srs = root / "osg-spec-docs/docs/02-requirements/srs/permission.md"
        srs.parent.mkdir(parents=True, exist_ok=True)
        srs.write_text("# Permission SRS", encoding="utf-8")
        _write_yaml(root / "readiness.yaml", {
            "modules": {
                "permission": {
                    "delivery_state": "all_stories_done",
                    "hard_dependency_ready": True,
                    "srs_path": "osg-spec-docs/docs/02-requirements/srs/permission.md",
                    "prd_path": "osg-spec-docs/docs/01-product/prd/permission/",
                    "updated_from_event": "/approve story",
                    "last_updated_at": "2026-03-12T00:00:00Z",
                }
            }
        })
        findings = evaluate_module_readiness(readiness_doc=root / "readiness.yaml", srs_base=root)
        assert not findings, findings


def test_ready_but_wrong_state_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(root / "readiness.yaml", {
            "modules": {
                "permission": {
                    "delivery_state": "implementing",
                    "hard_dependency_ready": True,
                    "srs_path": "some.md",
                }
            }
        })
        findings = evaluate_module_readiness(readiness_doc=root / "readiness.yaml")
        assert any("hard_dependency_ready=true but delivery_state=implementing" in f for f in findings), findings


def test_ready_but_missing_srs_path_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(root / "readiness.yaml", {
            "modules": {
                "permission": {
                    "delivery_state": "all_stories_done",
                    "hard_dependency_ready": True,
                }
            }
        })
        findings = evaluate_module_readiness(readiness_doc=root / "readiness.yaml")
        assert any("srs_path is missing" in f for f in findings), findings


def test_not_ready_module_passes() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(root / "readiness.yaml", {
            "modules": {
                "career": {
                    "delivery_state": "brainstorm_done",
                    "hard_dependency_ready": False,
                    "srs_path": None,
                }
            }
        })
        findings = evaluate_module_readiness(readiness_doc=root / "readiness.yaml")
        assert not findings, findings


def test_missing_file_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        findings = evaluate_module_readiness(readiness_doc=root / "readiness.yaml")
        assert any("does not exist" in f for f in findings), findings


def main() -> int:
    tests = [
        test_valid_ready_module_passes,
        test_ready_but_wrong_state_fails,
        test_ready_but_missing_srs_path_fails,
        test_not_ready_module_passes,
        test_missing_file_fails,
    ]
    for fn in tests:
        fn()
    print(f"PASS: module_readiness_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
