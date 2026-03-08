#!/usr/bin/env python3
"""
Self-check for style_contracts/state_cases validation in ui_visual_contract_guard.py.
"""

from __future__ import annotations

from copy import deepcopy

from ui_visual_contract_guard import validate_contract


def build_base_contract() -> dict:
    return {
        "schema_version": 1,
        "module": "permission",
        "pages": [
            {
                "page_id": "dashboard",
                "route": "/dashboard",
                "prototype_file": "admin.html",
                "prototype_selector": "#home-page",
                "viewport": {"width": 1440, "height": 900},
                "auth_mode": "protected",
                "snapshot_name": "dashboard-main",
                "baseline_ref": "osg-frontend/tests/e2e/visual-baseline/permission-dashboard-1440x900.png",
                "diff_threshold": 0.05,
                "stable_wait_ms": 300,
                "required_anchors": [".dashboard", ".dashboard__title", ".dashboard__welcome"],
                "mask_selectors": [],
                "capture_mode": "fullpage",
                "data_mode": "mock",
                "fixture_routes": [
                    {
                        "url": "/api/dashboard/stats",
                        "method": "GET",
                        "response_ref": "osg-frontend/tests/e2e/fixtures/permission/dashboard/stats.json",
                    }
                ],
            }
        ],
    }


def collect_issues(contract: dict) -> list[str]:
    issues: list[str] = []
    validate_contract(contract, issues)
    return issues


def test_valid_style_and_state_clauses_pass() -> None:
    contract = build_base_contract()
    contract["pages"][0]["style_contracts"] = [
        {
            "selector": ".dashboard__title",
            "property": "font-size",
            "expected": "40px",
        }
    ]
    contract["pages"][0]["state_cases"] = [
        {
            "state": "focus",
            "target": ".search-input",
            "assertion": {
                "type": "css",
                "property": "border-color",
                "value": "rgb(79, 70, 229)",
            },
        }
    ]

    issues = collect_issues(contract)
    assert not issues, issues


def test_invalid_style_clause_fails() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0]["style_contracts"] = [
        {
            "selector": ".dashboard__title",
            # property missing on purpose
            "expected": "40px",
        }
    ]

    issues = collect_issues(contract)
    assert any("style_contracts" in issue for issue in issues), issues


def test_invalid_state_case_enum_fails() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0]["state_cases"] = [
        {
            "state": "blink",
            "target": ".search-input",
            "assertion": {"type": "visible"},
        }
    ]

    issues = collect_issues(contract)
    assert any("state_cases" in issue for issue in issues), issues


def test_invalid_state_assertion_type_fails() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0]["state_cases"] = [
        {
            "state": "focus",
            "target": ".search-input",
            "assertion": {"type": "unknown"},
        }
    ]

    issues = collect_issues(contract)
    assert any("state_cases" in issue for issue in issues), issues


def test_missing_data_mode_for_protected_fullpage_fails() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0].pop("data_mode", None)
    contract["pages"][0].pop("fixture_routes", None)

    issues = collect_issues(contract)
    assert any(".data_mode is required" in issue for issue in issues), issues


def test_mock_mode_requires_fixture_routes() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0]["data_mode"] = "mock"
    contract["pages"][0]["fixture_routes"] = []

    issues = collect_issues(contract)
    assert any("fixture_routes must be non-empty when data_mode=mock" in issue for issue in issues), issues


def test_mask_mode_requires_dynamic_regions() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0]["data_mode"] = "mask"
    contract["pages"][0].pop("fixture_routes", None)
    contract["pages"][0]["dynamic_regions"] = []

    issues = collect_issues(contract)
    assert any("dynamic_regions must be non-empty when data_mode=mask" in issue for issue in issues), issues


def test_critical_surface_overlap_with_mask_fails() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0]["critical_surfaces"] = [
        {
            "surface_id": "hero-panel",
            "selector": ".dashboard__hero",
            "mask_allowed": False,
            "required_anchors": [".dashboard__hero-title", ".dashboard__hero-cta"],
            "style_contracts": [
                {"property": "border-radius", "expected": "12px"},
            ],
            "state_contracts": [
                {
                    "state": "loaded",
                    "assertions": [
                        {"property": "opacity", "expected": "1"},
                    ],
                }
            ],
        }
    ]
    contract["pages"][0]["mask_selectors"] = [".dashboard__hero"]

    issues = collect_issues(contract)
    assert any("critical_surfaces" in issue or "mask_allowed" in issue for issue in issues), issues


def test_critical_surface_requires_style_and_state_contracts() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0]["critical_surfaces"] = [
        {
            "surface_id": "hero-panel",
            "selector": ".dashboard__hero",
            "mask_allowed": False,
            "required_anchors": [".dashboard__hero-title", ".dashboard__hero-cta"],
        }
    ]

    issues = collect_issues(contract)
    assert any("critical_surfaces" in issue for issue in issues), issues


def test_critical_surface_required_structure_fails() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0]["critical_surfaces"] = [
        {
            # surface_id missing on purpose
            "selector": ".dashboard__hero",
            "mask_allowed": False,
            "required_anchors": [".dashboard__hero-title", ".dashboard__hero-cta"],
            "style_contracts": [
                {"property": "border-radius", "expected": "12px"},
            ],
            "state_contracts": [
                {
                    "state": "loaded",
                    "assertions": [
                        {"property": "opacity", "expected": "1"},
                    ],
                }
            ],
        }
    ]

    issues = collect_issues(contract)
    assert any("critical_surfaces" in issue for issue in issues), issues


def main() -> int:
    tests = [
        test_valid_style_and_state_clauses_pass,
        test_invalid_style_clause_fails,
        test_invalid_state_case_enum_fails,
        test_invalid_state_assertion_type_fails,
        test_missing_data_mode_for_protected_fullpage_fails,
        test_mock_mode_requires_fixture_routes,
        test_mask_mode_requires_dynamic_regions,
        test_critical_surface_overlap_with_mask_fails,
        test_critical_surface_requires_style_and_state_contracts,
        test_critical_surface_required_structure_fails,
    ]
    for fn in tests:
        fn()
    print(f"PASS: ui_visual_contract_guard_style_state_test ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
