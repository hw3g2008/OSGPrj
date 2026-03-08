#!/usr/bin/env python3
"""Self-test for requirements_coverage_guard.py."""

from __future__ import annotations

import tempfile
from pathlib import Path

import yaml

from requirements_coverage_guard import evaluate_coverage


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _write_yaml(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


def _story(*, requirements: list[str], contract_refs: dict | None = None, story_cases: list | None = None) -> dict:
    return {
        "requirements": requirements,
        "contract_refs": contract_refs or {},
        "story_cases": story_cases if story_cases is not None else [{"story_case_id": "SC-S-001-001", "ac_ref": "AC-S-001-01"}],
    }


def test_missing_contract_page_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(
            root / "MATRIX.md",
            "### admin 端\n"
            "| # | 页面 ID | 页面名称 |\n"
            "|---|---------|---------|\n"
            "| 0 | login-page | 登录 |\n"
            "| 1 | roles | 权限配置 |\n",
        )
        _write(root / "permission.md", "### FR-001 登录\n### FR-002 角色\n")
        _write_yaml(root / "UI-VISUAL-CONTRACT.yaml", {"pages": [{"page_id": "login-page"}]})
        _write_yaml(root / "DELIVERY-CONTRACT.yaml", {"schema_version": 1, "module": "permission", "capabilities": []})
        _write_yaml(root / "stories/S-001.yaml", _story(requirements=["FR-001.1", "FR-002.1"]))
        findings = evaluate_coverage(
            mode="requirements_to_stories",
            scope_doc=root / "MATRIX.md",
            srs_doc=root / "permission.md",
            contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            stories_dir=root / "stories",
        )
        assert any("missing contract page coverage" in item for item in findings), findings


def test_missing_story_fr_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(
            root / "MATRIX.md",
            "### admin 端\n| # | 页面 ID | 页面名称 |\n|---|---------|---------|\n| 0 | login-page | 登录 |\n",
        )
        _write(root / "permission.md", "### FR-001 登录\n### FR-002 角色\n")
        _write_yaml(root / "UI-VISUAL-CONTRACT.yaml", {"pages": [{"page_id": "login-page"}]})
        _write_yaml(root / "DELIVERY-CONTRACT.yaml", {"schema_version": 1, "module": "permission", "capabilities": []})
        _write_yaml(root / "stories/S-001.yaml", _story(requirements=["FR-001.1"]))
        findings = evaluate_coverage(
            mode="requirements_to_stories",
            scope_doc=root / "MATRIX.md",
            srs_doc=root / "permission.md",
            contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            stories_dir=root / "stories",
        )
        assert any("missing story coverage" in item for item in findings), findings


def test_story_without_testcase_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(
            root / "MATRIX.md",
            "### admin 端\n| # | 页面 ID | 页面名称 |\n|---|---------|---------|\n| 0 | login-page | 登录 |\n",
        )
        _write(root / "permission.md", "### FR-001 登录\n")
        _write_yaml(root / "UI-VISUAL-CONTRACT.yaml", {"pages": [{"page_id": "login-page"}]})
        _write_yaml(root / "DELIVERY-CONTRACT.yaml", {"schema_version": 1, "module": "permission", "capabilities": []})
        _write_yaml(root / "stories/S-001.yaml", _story(requirements=["FR-001.1"]))
        _write_yaml(root / "cases.yaml", [])
        _write(
            root / "matrix.md",
            "# Matrix\n\n| FR/AC | TC-ID |\n|-------|-------|\n",
        )
        findings = evaluate_coverage(
            mode="requirements_to_story_tests",
            scope_doc=root / "MATRIX.md",
            srs_doc=root / "permission.md",
            contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            stories_dir=root / "stories",
            cases_doc=root / "cases.yaml",
            matrix_doc=root / "matrix.md",
        )
        assert any("story missing testcase coverage" in item for item in findings), findings


def test_story_without_matrix_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(
            root / "MATRIX.md",
            "### admin 端\n| # | 页面 ID | 页面名称 |\n|---|---------|---------|\n| 0 | login-page | 登录 |\n",
        )
        _write(root / "permission.md", "### FR-001 登录\n")
        _write_yaml(root / "UI-VISUAL-CONTRACT.yaml", {"pages": [{"page_id": "login-page"}]})
        _write_yaml(root / "DELIVERY-CONTRACT.yaml", {"schema_version": 1, "module": "permission", "capabilities": []})
        _write_yaml(root / "stories/S-001.yaml", _story(requirements=["FR-001.1"]))
        _write_yaml(root / "cases.yaml", [{"story_id": "S-001"}])
        _write(root / "matrix.md", "# Matrix\n")
        findings = evaluate_coverage(
            mode="requirements_to_story_tests",
            scope_doc=root / "MATRIX.md",
            srs_doc=root / "permission.md",
            contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            stories_dir=root / "stories",
            cases_doc=root / "cases.yaml",
            matrix_doc=root / "matrix.md",
        )
        assert any("story missing traceability matrix coverage" in item for item in findings), findings


def test_valid_story_mode_inputs_pass() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(
            root / "MATRIX.md",
            "### admin 端\n"
            "| # | 页面 ID | 页面名称 |\n"
            "|---|---------|---------|\n"
            "| 0 | login-page | 登录 |\n"
            "| 1 | roles | 权限配置 |\n",
        )
        _write(root / "permission.md", "### FR-001 登录\n### FR-002 角色\n")
        _write_yaml(
            root / "UI-VISUAL-CONTRACT.yaml",
            {"pages": [{"page_id": "login-page"}, {"page_id": "roles"}]},
        )
        _write_yaml(root / "DELIVERY-CONTRACT.yaml", {"schema_version": 1, "module": "permission", "capabilities": []})
        _write_yaml(root / "stories/S-001.yaml", _story(requirements=["FR-001.1"]))
        _write_yaml(root / "stories/S-002.yaml", _story(requirements=["FR-002.1"], story_cases=[{"story_case_id": "SC-S-002-001", "ac_ref": "AC-S-002-01"}]))
        findings = evaluate_coverage(
            mode="requirements_to_stories",
            scope_doc=root / "MATRIX.md",
            srs_doc=root / "permission.md",
            contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            stories_dir=root / "stories",
        )
        assert not findings, findings


def test_valid_story_test_mode_inputs_pass() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(
            root / "MATRIX.md",
            "### admin 端\n"
            "| # | 页面 ID | 页面名称 |\n"
            "|---|---------|---------|\n"
            "| 0 | login-page | 登录 |\n"
            "| 1 | roles | 权限配置 |\n",
        )
        _write(root / "permission.md", "### FR-001 登录\n### FR-002 角色\n")
        _write_yaml(
            root / "UI-VISUAL-CONTRACT.yaml",
            {"pages": [{"page_id": "login-page"}, {"page_id": "roles"}]},
        )
        _write_yaml(root / "DELIVERY-CONTRACT.yaml", {"schema_version": 1, "module": "permission", "capabilities": []})
        _write_yaml(root / "stories/S-001.yaml", _story(requirements=["FR-001.1"]))
        _write_yaml(root / "stories/S-002.yaml", _story(requirements=["FR-002.1"], story_cases=[{"story_case_id": "SC-S-002-001", "ac_ref": "AC-S-002-01"}]))
        _write_yaml(root / "cases.yaml", [{"story_id": "S-001"}, {"story_id": "S-002"}])
        _write(
            root / "matrix.md",
            "# Matrix\n\n"
            "| FR/AC | TC-ID |\n"
            "|-------|-------|\n"
            "| AC-S-001-01 | TC-PERM-S001-TICKET-POS-001 |\n"
            "| AC-S-002-01 | TC-PERM-S002-TICKET-POS-002 |\n",
        )
        findings = evaluate_coverage(
            mode="requirements_to_story_tests",
            scope_doc=root / "MATRIX.md",
            srs_doc=root / "permission.md",
            contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            stories_dir=root / "stories",
            cases_doc=root / "cases.yaml",
            matrix_doc=root / "matrix.md",
        )
        assert not findings, findings


def test_contract_capability_without_story_mapping_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(
            root / "MATRIX.md",
            "### admin 端\n| # | 页面 ID | 页面名称 |\n|---|---------|---------|\n| 0 | login-page | 登录 |\n",
        )
        _write(root / "permission.md", "### FR-001 登录\n")
        _write_yaml(
            root / "UI-VISUAL-CONTRACT.yaml",
            {"pages": [{"page_id": "login-page", "critical_surfaces": []}]},
        )
        _write_yaml(
            root / "DELIVERY-CONTRACT.yaml",
            {
                "schema_version": 1,
                "module": "permission",
                "capabilities": [
                    {
                        "capability_id": "login-success",
                        "source_refs": ["permission.md#FR-001"],
                        "effect_scope": "internal",
                        "effect_kind": "auth_session_established",
                        "truth_mode": "real",
                        "evidence_mode": "audit_event",
                        "verification_stage": "verify",
                        "required_artifacts": ["audit_event"],
                    }
                ],
            },
        )
        _write_yaml(root / "stories/S-001.yaml", _story(requirements=["FR-001.1"]))
        findings = evaluate_coverage(
            mode="requirements_to_stories",
            scope_doc=root / "MATRIX.md",
            srs_doc=root / "permission.md",
            contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            stories_dir=root / "stories",
        )
        assert any("capability missing story contract coverage" in item for item in findings), findings


def test_contract_item_without_source_refs_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(
            root / "MATRIX.md",
            "### admin 端\n| # | 页面 ID | 页面名称 |\n|---|---------|---------|\n| 0 | login-page | 登录 |\n",
        )
        _write(root / "permission.md", "### FR-001 登录\n")
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
        _write_yaml(
            root / "DELIVERY-CONTRACT.yaml",
            {"schema_version": 1, "module": "permission", "capabilities": []},
        )
        _write_yaml(
            root / "stories/S-001.yaml",
            _story(requirements=["FR-001.1"], contract_refs={"critical_surfaces": ["captcha-block"]}),
        )
        findings = evaluate_coverage(
            mode="requirements_to_stories",
            scope_doc=root / "MATRIX.md",
            srs_doc=root / "permission.md",
            contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            stories_dir=root / "stories",
        )
        assert any("contract item missing source_refs" in item for item in findings), findings


def test_dict_style_source_refs_pass() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(
            root / "MATRIX.md",
            "### admin 端\n| # | 页面 ID | 页面名称 |\n|---|---------|---------|\n| 0 | login-page | 登录 |\n",
        )
        _write(root / "permission.md", "### FR-001 登录\n")
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
                                "source_refs": [{"prd": "00-admin-login.md#4.1"}],
                            }
                        ],
                    }
                ]
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
                        "source_refs": [{"srs": "permission.md#FR-001"}],
                        "effect_scope": "internal",
                        "effect_kind": "auth_session_established",
                        "truth_mode": "real",
                        "evidence_mode": "audit_event",
                        "verification_stage": "verify",
                        "required_artifacts": ["audit_event"],
                    }
                ],
            },
        )
        _write_yaml(
            root / "stories/S-001.yaml",
            _story(
                requirements=["FR-001.1"],
                contract_refs={
                    "capabilities": ["login-success"],
                    "critical_surfaces": ["captcha-block"],
                },
            ),
        )
        findings = evaluate_coverage(
            mode="requirements_to_stories",
            scope_doc=root / "MATRIX.md",
            srs_doc=root / "permission.md",
            contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            stories_dir=root / "stories",
        )
        assert not findings, findings


def test_story_without_story_case_skeleton_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(
            root / "MATRIX.md",
            "### admin 端\n| # | 页面 ID | 页面名称 |\n|---|---------|---------|\n| 0 | login-page | 登录 |\n",
        )
        _write(root / "permission.md", "### FR-001 登录\n")
        _write_yaml(root / "UI-VISUAL-CONTRACT.yaml", {"pages": [{"page_id": "login-page"}]})
        _write_yaml(root / "DELIVERY-CONTRACT.yaml", {"schema_version": 1, "module": "permission", "capabilities": []})
        _write_yaml(root / "stories/S-001.yaml", _story(requirements=["FR-001.1"], story_cases=[]))
        findings = evaluate_coverage(
            mode="requirements_to_stories",
            scope_doc=root / "MATRIX.md",
            srs_doc=root / "permission.md",
            contract_doc=root / "UI-VISUAL-CONTRACT.yaml",
            delivery_contract_doc=root / "DELIVERY-CONTRACT.yaml",
            stories_dir=root / "stories",
        )
        assert any("story missing story_case" in item for item in findings), findings


def main() -> int:
    tests = [
        test_missing_contract_page_fails,
        test_missing_story_fr_fails,
        test_story_without_testcase_fails,
        test_story_without_matrix_fails,
        test_valid_story_mode_inputs_pass,
        test_valid_story_test_mode_inputs_pass,
        test_contract_capability_without_story_mapping_fails,
        test_contract_item_without_source_refs_fails,
        test_dict_style_source_refs_pass,
        test_story_without_story_case_skeleton_fails,
    ]
    for fn in tests:
        fn()
    print(f"PASS: requirements_coverage_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
