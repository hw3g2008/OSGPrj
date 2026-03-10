#!/usr/bin/env python3
"""Self-test for truth_sync_guard.py."""

from __future__ import annotations

import tempfile
from pathlib import Path

import yaml

from truth_sync_guard import evaluate_truth_sync


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _write_yaml(path: Path, data: object) -> None:
    _write(path, yaml.safe_dump(data, allow_unicode=True, sort_keys=False))


def _base_config() -> dict:
    return {
        "paths": {
            "docs": {
                "prd": "osg-spec-docs/docs/01-product/prd/",
                "srs": "osg-spec-docs/docs/02-requirements/srs/",
            }
        },
        "prd_process": {
            "truth_source": {
                "type": "html_prototype",
                "root": "osg-spec-docs/source/prototype/",
                "single_source_of_truth": True,
                "forbid_source_absent_derivation": True,
            },
            "truth_sync": {
                "enabled": True,
                "required_decision_fields": [
                    "ui_truth_change",
                    "prototype_synced",
                ],
                "enforced_entrypoints": [
                    "brainstorm",
                    "approve_brainstorm",
                    "split_story",
                    "split_ticket",
                    "verify",
                    "final_gate",
                ],
            },
        },
    }


def _prepare_repo(root: Path, decisions_content: str | None) -> tuple[Path, Path]:
    repo = root / "repo"
    config_path = repo / ".claude/project/config.yaml"
    _write_yaml(config_path, _base_config())
    decisions_path = repo / "osg-spec-docs/docs/02-requirements/srs/permission-DECISIONS.md"
    if decisions_content is not None:
        _write(decisions_path, decisions_content)
    return repo, config_path


def _decision_doc(extra_fields: str = "", status: str = "resolved", applied: str = "true") -> str:
    return f"""# permission 模块 — 决策日志

## DEC-001

- **状态**: {status}
- **已应用**: {applied}
- **来源**: phase4
- **类型**: V
{extra_fields}

**问题**: 示例问题

**裁决**: 示例裁决

**影响**: 示例影响
"""


def test_no_ui_truth_decision_passes() -> None:
    with tempfile.TemporaryDirectory() as td:
        repo_root, config_path = _prepare_repo(
            Path(td),
            _decision_doc(extra_fields="- **ui_truth_change**: false\n"),
        )
        findings, summary = evaluate_truth_sync(
            module="permission",
            repo_root=repo_root,
            config_path=config_path,
        )
        assert not findings, findings
        assert summary["blocking_decisions"] == 0, summary


def test_unsynced_ui_truth_decision_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        repo_root, config_path = _prepare_repo(
            Path(td),
            _decision_doc(
                extra_fields=(
                    "- **ui_truth_change**: true\n"
                    "- **prototype_synced**: false\n"
                    "- **truth_artifact_ids**: [modal-force-change-pwd]\n"
                )
            ),
        )
        findings, summary = evaluate_truth_sync(
            module="permission",
            repo_root=repo_root,
            config_path=config_path,
        )
        assert any("prototype_synced=false" in item for item in findings), findings
        assert summary["blocking_decisions"] == 1, summary


def test_synced_ui_truth_decision_passes() -> None:
    with tempfile.TemporaryDirectory() as td:
        repo_root, config_path = _prepare_repo(
            Path(td),
            _decision_doc(
                extra_fields=(
                    "- **ui_truth_change**: true\n"
                    "- **prototype_synced**: true\n"
                )
            ),
        )
        findings, summary = evaluate_truth_sync(
            module="permission",
            repo_root=repo_root,
            config_path=config_path,
        )
        assert not findings, findings
        assert summary["blocking_decisions"] == 0, summary


def test_missing_required_sync_field_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        repo_root, config_path = _prepare_repo(
            Path(td),
            _decision_doc(extra_fields="- **ui_truth_change**: true\n"),
        )
        findings, _summary = evaluate_truth_sync(
            module="permission",
            repo_root=repo_root,
            config_path=config_path,
        )
        assert any("missing_required_field=prototype_synced" in item for item in findings), findings


def main() -> int:
    tests = [
        test_no_ui_truth_decision_passes,
        test_unsynced_ui_truth_decision_fails,
        test_synced_ui_truth_decision_passes,
        test_missing_required_sync_field_fails,
    ]
    for fn in tests:
        fn()
    print(f"PASS: truth_sync_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
