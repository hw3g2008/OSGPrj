#!/usr/bin/env python3
"""Self-check for ui_critical_evidence_guard.py."""

from __future__ import annotations

import importlib.util
from copy import deepcopy
from pathlib import Path


def load_guard_module():
    guard_path = Path(__file__).with_name("ui_critical_evidence_guard.py")
    spec = importlib.util.spec_from_file_location("ui_critical_evidence_guard", guard_path)
    if spec is None or spec.loader is None or not guard_path.exists():
        raise AssertionError("ui_critical_evidence_guard.py must exist for selftest")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if not hasattr(module, "validate_page_report"):
        raise AssertionError("ui_critical_evidence_guard.py must export validate_page_report")
    return module


def build_contract() -> dict:
    return {
        "schema_version": 1,
        "module": "permission",
        "pages": [
            {
                "page_id": "login-page",
                "route": "/login",
                "prototype_file": "admin.html",
                "prototype_selector": "#login-page",
                "viewport": {"width": 1440, "height": 900},
                "auth_mode": "public",
                "snapshot_name": "login-page",
                "baseline_ref": "osg-frontend/tests/e2e/visual-baseline/permission-login-page-1440x900.png",
                "diff_threshold": 0.03,
                "stable_wait_ms": 300,
                "required_anchors": [".login", ".login__form", ".login__submit"],
                "critical_surfaces": [
                    {
                        "surface_id": "captcha-block",
                        "selector": ".captcha-code",
                        "mask_allowed": False,
                        "required_anchors": [".captcha-code", ".captcha-code img", ".captcha-input"],
                        "style_contracts": [
                            {"target": ".captcha-code", "property": "border-radius", "expected": "12px"},
                            {"target": ".captcha-code img", "property": "border-radius", "expected": "12px"},
                        ],
                        "state_contracts": [
                            {
                                "state": "loaded",
                                "assertions": [
                                    {
                                        "target": ".captcha-code img",
                                        "property": "display",
                                        "expected": "block",
                                    }
                                ],
                            }
                        ],
                        "relation_contracts": [
                            {"type": "cover-container", "target": ".captcha-code img"},
                        ],
                    }
                ],
            }
        ],
    }


def build_page_report() -> dict:
    return {
        "module": "permission",
        "mode": "verify",
        "total_pages": 1,
        "pass_pages": 1,
        "fail_pages": 0,
        "not_run_pages": 0,
        "style_assertions_passed": 2,
        "style_assertions_failed": 0,
        "state_cases_executed": 0,
        "state_cases_failed": 0,
        "pages": [
            {
                "page_id": "login-page",
                "baseline_ref": "osg-frontend/tests/e2e/visual-baseline/permission-login-page-1440x900.png",
                "actual_ref": "osg-spec-docs/tasks/audit/ui-visual-actual-permission/login-page/1440x900.png",
                "diff_ref": "none",
                "diff_threshold": 0.03,
                "data_mode": "live",
                "fixture_route_count": 0,
                "dynamic_region_count": 0,
                "style_assertions_passed": 2,
                "style_assertions_failed": 0,
                "state_cases_executed": 0,
                "state_cases_failed": 0,
                "result": "PASS",
                "critical_surface_results": [
                    {
                        "surface_id": "captcha-block",
                        "selector": ".captcha-code",
                        "mask_allowed": False,
                        "mask_policy_applied": False,
                        "baseline_ref": "osg-frontend/tests/e2e/visual-baseline/permission-login-page-1440x900.png",
                        "actual_ref": "osg-spec-docs/tasks/audit/ui-visual-actual-permission/login-page/1440x900.png",
                        "diff_ref": "none",
                        "style_contracts_total": 2,
                        "style_contracts_passed": 2,
                        "style_contracts_failed": 0,
                        "state_contracts_total": 1,
                        "state_contracts_executed": 1,
                        "state_contracts_passed": 1,
                        "state_contracts_failed": 0,
                        "relation_contracts_total": 1,
                        "relation_contracts_executed": 1,
                        "relation_contracts_passed": 1,
                        "relation_contracts_failed": 0,
                        "result": "PASS",
                    }
                ],
            }
        ],
    }


def collect_issues(module, contract: dict, report: dict, stage: str = "verify") -> list[str]:
    issues: list[str] = []
    module.validate_page_report(contract, report, issues, stage=stage)
    return issues


def test_masked_critical_surface_fails(module) -> None:
    contract = build_contract()
    report = build_page_report()
    report["pages"][0]["critical_surface_results"][0]["mask_policy_applied"] = True
    issues = collect_issues(module, contract, report)
    assert any("mask_policy_applied" in issue for issue in issues), issues


def test_missing_style_or_state_evidence_fails(module) -> None:
    contract = build_contract()
    report = build_page_report()
    del report["pages"][0]["critical_surface_results"][0]["style_contracts_total"]
    del report["pages"][0]["critical_surface_results"][0]["state_contracts_total"]
    issues = collect_issues(module, contract, report)
    assert any("style_contracts_total" in issue or "state_contracts_total" in issue for issue in issues), issues


def test_complete_evidence_package_passes(module) -> None:
    contract = build_contract()
    report = build_page_report()
    issues = collect_issues(module, contract, report)
    assert not issues, issues


def test_next_stage_accepts_structure_but_blocks_mask(module) -> None:
    contract = build_contract()
    report = build_page_report()
    issues = collect_issues(module, contract, report, stage="next")
    assert not issues, issues
    masked_report = deepcopy(report)
    masked_report["pages"][0]["critical_surface_results"][0]["mask_policy_applied"] = True
    issues = collect_issues(module, contract, masked_report, stage="next")
    assert any("mask_policy_applied" in issue for issue in issues), issues


def main() -> int:
    module = load_guard_module()
    tests = [
        test_masked_critical_surface_fails,
        test_missing_style_or_state_evidence_fails,
        test_complete_evidence_package_passes,
        test_next_stage_accepts_structure_but_blocks_mask,
    ]
    for fn in tests:
        fn(module)
    print(f"PASS: ui_critical_evidence_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
