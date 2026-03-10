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
        "surfaces": [
            {
                "surface_id": "modal-forgot-password",
                "surface_type": "modal",
                "host_page_id": "login-page",
                "prototype_selector": "#forgot-password-modal",
                "app_selector": "[data-surface-id='modal-forgot-password']",
                "surface_root_selector": "[data-surface-id='modal-forgot-password']",
                "backdrop_selector": "[data-surface-backdrop='modal-forgot-password']",
                "portal_host": "body",
                "trigger_action": {
                    "type": "click",
                    "selector": "[data-surface-trigger='modal-forgot-password']",
                },
                "required_anchors": [
                    "[data-surface-id='modal-forgot-password']",
                    "[data-surface-part='shell']",
                    "[data-surface-part='header']",
                ],
                "viewport_variants": [
                    {"viewport_id": "desktop", "width": 1440, "height": 900}
                ],
                "surface_parts": [
                    {
                        "part_id": "backdrop",
                        "selector": "[data-surface-backdrop='modal-forgot-password']",
                        "mask_allowed": False,
                    },
                    {
                        "part_id": "shell",
                        "selector": "[data-surface-part='shell']",
                        "mask_allowed": False,
                    },
                    {
                        "part_id": "header",
                        "selector": "[data-surface-part='header']",
                        "mask_allowed": False,
                    },
                ],
                "content_parts": [
                    {
                        "part_id": "title",
                        "selector": "[data-content-part='title']",
                        "required": True,
                    },
                    {
                        "part_id": "action-row",
                        "selector": "[data-content-part='action-row']",
                        "required": True,
                    },
                ],
                "style_contracts": [
                    {
                        "selector": "[data-surface-part='shell']",
                        "css": {
                            "border-radius": "20px",
                            "background-color": "rgb(255, 255, 255)",
                        },
                    }
                ],
                "state_contracts": [
                    {
                        "state_id": "step-email",
                        "required_anchors": ["[data-surface-step='email']"],
                        "style_contracts": [
                            {
                                "selector": "[data-surface-step='email']",
                                "css": {"display": "block"},
                            }
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
        "surfaces_total": 1,
        "surfaces_passed": 1,
        "surfaces_failed": 0,
        "surfaces_not_run": 0,
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
        "surfaces": [
            {
                "surface_id": "modal-forgot-password",
                "surface_type": "modal",
                "host_page_id": "login-page",
                "trigger_action_type": "click",
                "trigger_selector": "[data-surface-trigger='modal-forgot-password']",
                "portal_host": "body",
                "surface_root_selector": "[data-surface-id='modal-forgot-password']",
                "backdrop_selector": "[data-surface-backdrop='modal-forgot-password']",
                "viewport_variants_total": 1,
                "viewport_variants_executed": 1,
                "viewport_variants_failed": 0,
                "viewport_results": [
                    {
                        "viewport_id": "desktop",
                        "width": 1440,
                        "height": 900,
                        "baseline_ref": "osg-frontend/tests/e2e/visual-baseline/permission-surface-modal-forgot-password-1440x900.png",
                        "actual_ref": "osg-spec-docs/tasks/audit/ui-visual-actual-permission/surfaces/modal-forgot-password/desktop-1440x900.png",
                        "diff_ref": "none",
                        "diff_threshold": 0.03,
                        "surface_part_results": [
                            {
                                "part_id": "backdrop",
                                "selector": "[data-surface-backdrop='modal-forgot-password']",
                                "mask_allowed": False,
                                "exists": True,
                                "visible": True,
                                "result": "PASS",
                            },
                            {
                                "part_id": "shell",
                                "selector": "[data-surface-part='shell']",
                                "mask_allowed": False,
                                "exists": True,
                                "visible": True,
                                "result": "PASS",
                            },
                            {
                                "part_id": "header",
                                "selector": "[data-surface-part='header']",
                                "mask_allowed": False,
                                "exists": True,
                                "visible": True,
                                "result": "PASS",
                            },
                        ],
                        "content_part_results": [
                            {
                                "part_id": "title",
                                "selector": "[data-content-part='title']",
                                "required": True,
                                "exists": True,
                                "visible": True,
                                "result": "PASS",
                            },
                            {
                                "part_id": "action-row",
                                "selector": "[data-content-part='action-row']",
                                "required": True,
                                "exists": True,
                                "visible": True,
                                "result": "PASS",
                            },
                        ],
                        "style_contracts_total": 2,
                        "style_contracts_passed": 2,
                        "style_contracts_failed": 0,
                        "state_contracts_total": 1,
                        "state_contracts_executed": 1,
                        "state_contracts_passed": 1,
                        "state_contracts_failed": 0,
                        "state_style_contracts_total": 1,
                        "state_style_contracts_executed": 1,
                        "state_style_contracts_passed": 1,
                        "state_style_contracts_failed": 0,
                        "state_results": [
                            {
                                "state_id": "step-email",
                                "required_anchors_total": 1,
                                "required_anchors_passed": 1,
                                "style_contracts_total": 1,
                                "style_contracts_executed": 1,
                                "style_contracts_passed": 1,
                                "style_contracts_failed": 0,
                                "result": "PASS",
                            }
                        ],
                        "result": "PASS",
                    }
                ],
                "result": "PASS",
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


def test_missing_surface_viewport_evidence_fails(module) -> None:
    contract = build_contract()
    report = build_page_report()
    report["surfaces"][0]["viewport_results"] = []
    issues = collect_issues(module, contract, report)
    assert any("missing viewport result" in issue for issue in issues), issues


def test_missing_content_part_evidence_fails(module) -> None:
    contract = build_contract()
    report = build_page_report()
    del report["surfaces"][0]["viewport_results"][0]["content_part_results"]
    issues = collect_issues(module, contract, report)
    assert any("content_part_results" in issue or "content part" in issue for issue in issues), issues


def test_overlay_surface_evidence_passes(module) -> None:
    contract = build_contract()
    report = build_page_report()
    issues = collect_issues(module, contract, report)
    assert not issues, issues


def main() -> int:
    module = load_guard_module()
    tests = [
        test_masked_critical_surface_fails,
        test_missing_style_or_state_evidence_fails,
        test_complete_evidence_package_passes,
        test_next_stage_accepts_structure_but_blocks_mask,
        test_missing_surface_viewport_evidence_fails,
        test_missing_content_part_evidence_fails,
        test_overlay_surface_evidence_passes,
    ]
    for fn in tests:
        fn(module)
    print(f"PASS: ui_critical_evidence_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
