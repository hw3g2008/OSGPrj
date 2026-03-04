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


def main() -> int:
    tests = [
        test_valid_style_and_state_clauses_pass,
        test_invalid_style_clause_fails,
        test_invalid_state_case_enum_fails,
        test_invalid_state_assertion_type_fails,
    ]
    for fn in tests:
        fn()
    print(f"PASS: ui_visual_contract_guard_style_state_test ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
