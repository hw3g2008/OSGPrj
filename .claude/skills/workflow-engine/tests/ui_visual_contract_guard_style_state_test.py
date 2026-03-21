#!/usr/bin/env python3
"""
Self-check for style_contracts/state_cases validation in ui_visual_contract_guard.py.
"""

from __future__ import annotations

from copy import deepcopy
from pathlib import Path

import yaml

from ui_visual_contract_guard import validate_contract


FIXTURES_DIR = Path(__file__).with_name("fixtures")


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


def collect_issues_with_policy(contract: dict, policy: dict) -> list[str]:
    issues: list[str] = []
    validate_contract(contract, issues, policy=policy)
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


def test_valid_overlay_surface_schema_passes() -> None:
    contract = deepcopy(build_base_contract())
    contract["surfaces"] = [
        {
            "surface_id": "modal-forgot-password",
            "surface_type": "modal",
            "host_page_id": "dashboard",
            "prototype_selector": "#forgot-password-modal",
            "app_selector": ".forgot-password-modal",
            "surface_root_selector": ".ant-modal-root .forgot-password-modal",
            "backdrop_selector": ".ant-modal-mask",
            "portal_host": "body",
            "source_ref": "00-admin-login.md#modal-forgot-password",
            "trigger_action": {
                "type": "click",
                "selector": ".forgot-password-link",
            },
            "required_anchors": [
                ".forgot-password-modal__header",
                ".forgot-password-modal__steps",
                ".forgot-password-modal__content",
            ],
            "viewport_variants": [
                {"viewport_id": "desktop", "width": 1440, "height": 900},
                {"viewport_id": "tablet", "width": 1024, "height": 900},
            ],
            "state_variants": [
                {"state_id": "step-email"},
                {"state_id": "step-success"},
            ],
            "surface_parts": [
                {"part_id": "backdrop", "selector": ".ant-modal-mask", "mask_allowed": False},
                {"part_id": "shell", "selector": ".forgot-password-modal", "mask_allowed": False},
                {"part_id": "header", "selector": ".forgot-password-modal__header", "mask_allowed": False},
                {"part_id": "body", "selector": ".forgot-password-modal__body", "mask_allowed": False},
                {"part_id": "footer", "selector": ".forgot-password-modal__footer", "mask_allowed": False},
                {"part_id": "close-control", "selector": ".forgot-password-modal__close", "mask_allowed": False},
            ],
            "style_contracts": [
                {
                    "selector": ".forgot-password-modal",
                    "css": {
                        "max-width": "450px",
                        "border-radius": "20px",
                        "background-color": "rgb(255, 255, 255)",
                    },
                },
                {
                    "selector": ".forgot-password-modal__header",
                    "css": {
                        "padding": "22px 26px",
                        "border-bottom-width": "1px",
                    },
                },
                {
                    "selector": ".forgot-password-modal__body",
                    "css": {
                        "padding": "26px",
                    },
                },
                {
                    "selector": ".forgot-password-modal__group",
                    "css": {
                        "margin-bottom": "16px",
                    },
                },
                {
                    "selector": ".forgot-password-modal__email-input",
                    "css": {
                        "height": "44px",
                    },
                },
                {
                    "selector": ".forgot-password-modal__send-code",
                    "css": {
                        "justify-content": "flex-start",
                    },
                },
            ],
            "state_contracts": [
                {
                    "state_id": "step-email",
                    "required_anchors": [
                        ".forgot-password-modal__email-input",
                        ".forgot-password-modal__send-code",
                    ],
                    "style_contracts": [
                        {
                            "selector": ".forgot-password-modal__steps .is-active",
                            "css": {"background-color": "rgb(99, 102, 241)"},
                        }
                    ],
                },
                {
                    "state_id": "step-success",
                    "required_anchors": [
                        ".forgot-password-modal__success-badge",
                        ".forgot-password-modal__done",
                    ],
                    "style_contracts": [
                        {
                            "selector": ".forgot-password-modal__success-badge",
                            "css": {"background-color": "rgb(34, 197, 94)"},
                        }
                    ],
                },
            ],
        }
    ]

    issues = collect_issues(contract)
    assert not issues, issues


def test_overlay_form_surface_missing_archetype_rules_fails() -> None:
    contract = deepcopy(build_base_contract())
    contract["surfaces"] = [
        {
            "surface_id": "modal-forgot-password",
            "surface_type": "modal",
            "host_page_id": "dashboard",
            "prototype_selector": "#forgot-password-modal",
            "app_selector": ".forgot-password-modal",
            "surface_root_selector": ".ant-modal-root .forgot-password-modal",
            "backdrop_selector": ".ant-modal-mask",
            "portal_host": "body",
            "source_ref": "00-admin-login.md#modal-forgot-password",
            "trigger_action": {"type": "click", "selector": ".forgot-password-link"},
            "required_anchors": [
                ".forgot-password-modal__header",
                ".forgot-password-modal__steps",
                ".forgot-password-modal__content",
            ],
            "viewport_variants": [
                {"viewport_id": "desktop", "width": 1440, "height": 900},
            ],
            "state_variants": [
                {"state_id": "step-email"},
            ],
            "surface_parts": [
                {"part_id": "backdrop", "selector": ".ant-modal-mask", "mask_allowed": False},
                {"part_id": "shell", "selector": ".forgot-password-modal", "mask_allowed": False},
                {"part_id": "header", "selector": ".forgot-password-modal__header", "mask_allowed": False},
                {"part_id": "body", "selector": ".forgot-password-modal__body", "mask_allowed": False},
                {"part_id": "footer", "selector": ".forgot-password-modal__footer", "mask_allowed": False},
                {"part_id": "close-control", "selector": ".forgot-password-modal__close", "mask_allowed": False},
            ],
            "style_contracts": [
                {
                    "selector": ".forgot-password-modal",
                    "css": {"border-radius": "20px"},
                }
            ],
            "state_contracts": [
                {
                    "state_id": "step-email",
                    "required_anchors": [
                        ".forgot-password-modal__email-input",
                        ".forgot-password-modal__send-code",
                    ],
                    "style_contracts": [
                        {
                            "selector": ".forgot-password-modal__steps .is-active",
                            "css": {"background-color": "rgb(99, 102, 241)"},
                        }
                    ],
                }
            ],
        }
    ]

    issues = collect_issues(contract)
    assert any("overlay form surface missing body layout contract" in issue for issue in issues), issues
    assert any("overlay form surface missing control box model contract" in issue for issue in issues), issues
    assert any("overlay form surface missing action alignment contract" in issue for issue in issues), issues


def test_overlay_surface_schema_missing_required_blocks_fails() -> None:
    contract = deepcopy(build_base_contract())
    contract["surfaces"] = [
        {
            "surface_id": "modal-forgot-password",
            "surface_type": "modal",
            "host_page_id": "dashboard",
            "prototype_selector": "#forgot-password-modal",
            "app_selector": ".forgot-password-modal",
            "surface_root_selector": ".forgot-password-modal",
            "backdrop_selector": ".ant-modal-mask",
            "source_ref": "00-admin-login.md#modal-forgot-password",
            "trigger_action": {"type": "click", "selector": ".forgot-password-link"},
            "required_anchors": [".forgot-password-modal__header"],
            "state_variants": [{"state_id": "step-email"}],
            "style_contracts": [
                {
                    "selector": ".forgot-password-modal",
                    "css": {"border-radius": "20px"},
                }
            ],
        }
    ]

    issues = collect_issues(contract)
    assert any("surfaces[0].viewport_variants" in issue for issue in issues), issues
    assert any("surfaces[0].surface_parts" in issue for issue in issues), issues
    assert any("surfaces[0].state_contracts" in issue for issue in issues), issues


def test_declared_overlay_surface_missing_from_contract_fails() -> None:
    contract = deepcopy(build_base_contract())

    issues: list[str] = []
    validate_contract(contract, issues, declared_surface_ids={"modal-forgot-password"})
    assert any("declared overlay surface missing from contract.surfaces" in issue for issue in issues), issues


def test_declared_overlay_surface_present_in_contract_passes() -> None:
    contract = deepcopy(build_base_contract())
    contract["surfaces"] = [
        {
            "surface_id": "modal-forgot-password",
            "surface_type": "modal",
            "host_page_id": "dashboard",
            "prototype_selector": "#forgot-password-modal",
            "app_selector": ".forgot-password-modal",
            "surface_root_selector": ".ant-modal-root .forgot-password-modal",
            "backdrop_selector": ".ant-modal-mask",
            "portal_host": "body",
            "source_ref": "00-admin-login.md#modal-forgot-password",
            "trigger_action": {"type": "click", "selector": ".forgot-password-link"},
            "required_anchors": [
                ".forgot-password-modal__header",
                ".forgot-password-modal__steps",
                ".forgot-password-modal__content",
            ],
            "viewport_variants": [
                {"viewport_id": "desktop", "width": 1440, "height": 900},
            ],
            "state_variants": [{"state_id": "default"}],
            "surface_parts": [
                {"part_id": "backdrop", "selector": ".ant-modal-mask", "mask_allowed": False},
                {"part_id": "shell", "selector": ".forgot-password-modal", "mask_allowed": False},
                {"part_id": "header", "selector": ".forgot-password-modal__header", "mask_allowed": False},
                {"part_id": "body", "selector": ".forgot-password-modal__body", "mask_allowed": False},
                {"part_id": "footer", "selector": ".forgot-password-modal__footer", "mask_allowed": False},
                {"part_id": "close-control", "selector": ".forgot-password-modal__close", "mask_allowed": False},
            ],
            "style_contracts": [
                {"selector": ".forgot-password-modal", "css": {"border-radius": "20px"}},
                {"selector": ".forgot-password-modal__body", "css": {"padding": "26px"}},
            ],
            "state_contracts": [
                {
                    "state_id": "default",
                    "required_anchors": [".forgot-password-modal__content"],
                    "style_contracts": [
                        {"selector": ".forgot-password-modal", "css": {"background-color": "rgb(255, 255, 255)"}},
                    ],
                }
            ],
        }
    ]

    issues: list[str] = []
    validate_contract(contract, issues, declared_surface_ids={"modal-forgot-password"})
    assert not issues, issues


def strict_policy() -> dict:
    return {
        "strict_visual_contract": True,
        "forbid_diff_threshold_relaxation": True,
        "forbid_snapshot_bypass": True,
        "forbid_mask_waiver": True,
        "enable_visual_residual_classifier": True,
        "allowed_visual_residual_classes": [
            "micro_spacing",
            "low_salience_text_icon_rasterization",
        ],
        "forbidden_visual_residual_classes": [
            "image_like",
            "captcha_like",
            "color_state",
            "geometry_change",
            "structure_change",
            "unknown",
        ],
        "require_state_coverage_for_multistate_widgets": True,
        "multistate_widget_part_ids": [
            "progress-indicator",
            "stepper",
            "tab-strip",
            "status-indicator",
            "wizard-step-indicator",
        ],
    }


def test_strict_policy_rejects_non_zero_diff_threshold() -> None:
    contract = deepcopy(build_base_contract())
    issues = collect_issues_with_policy(contract, strict_policy())
    assert any("diff_threshold" in issue for issue in issues), issues


def test_strict_policy_rejects_snapshot_compare_false() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0]["snapshot_compare"] = False
    issues = collect_issues_with_policy(contract, strict_policy())
    assert any("snapshot_compare" in issue for issue in issues), issues


def test_strict_policy_rejects_mask_selectors_and_mask_mode() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0]["mask_selectors"] = [".dashboard__hero"]
    contract["pages"][0]["data_mode"] = "mask"
    contract["pages"][0]["dynamic_regions"] = [".dashboard__date"]
    issues = collect_issues_with_policy(contract, strict_policy())
    assert any("mask_selectors" in issue for issue in issues), issues
    assert any("data_mode=mask" in issue for issue in issues), issues


def test_strict_policy_rejects_mask_allowed_true_on_surface_parts() -> None:
    contract = deepcopy(build_base_contract())
    contract["surfaces"] = [
        {
            "surface_id": "modal-forgot-password",
            "surface_type": "modal",
            "host_page_id": "dashboard",
            "prototype_selector": "#forgot-password-modal",
            "app_selector": ".forgot-password-modal",
            "surface_root_selector": ".ant-modal-root .forgot-password-modal",
            "backdrop_selector": ".ant-modal-mask",
            "portal_host": "body",
            "source_ref": "00-admin-login.md#modal-forgot-password",
            "trigger_action": {"type": "click", "selector": ".forgot-password-link"},
            "required_anchors": [
                ".forgot-password-modal__header",
                ".forgot-password-modal__steps",
                ".forgot-password-modal__content",
            ],
            "viewport_variants": [
                {"viewport_id": "desktop", "width": 1440, "height": 900},
            ],
            "state_variants": [{"state_id": "default"}],
            "surface_parts": [
                {"part_id": "backdrop", "selector": ".ant-modal-mask", "mask_allowed": False},
                {"part_id": "shell", "selector": ".forgot-password-modal", "mask_allowed": True},
                {"part_id": "header", "selector": ".forgot-password-modal__header", "mask_allowed": False},
                {"part_id": "body", "selector": ".forgot-password-modal__body", "mask_allowed": False},
                {"part_id": "footer", "selector": ".forgot-password-modal__footer", "mask_allowed": False},
                {"part_id": "close-control", "selector": ".forgot-password-modal__close", "mask_allowed": False},
            ],
            "style_contracts": [
                {"selector": ".forgot-password-modal", "css": {"border-radius": "20px"}},
            ],
            "state_contracts": [
                {
                    "state_id": "default",
                    "required_anchors": [".forgot-password-modal__content"],
                    "style_contracts": [
                        {"selector": ".forgot-password-modal", "css": {"background-color": "rgb(255, 255, 255)"}},
                    ],
                }
            ],
        }
    ]
    issues = collect_issues_with_policy(contract, strict_policy())
    assert any("mask_allowed" in issue for issue in issues), issues


def test_strict_policy_requires_page_state_cases_for_multistate_widget() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0]["diff_threshold"] = 0
    contract["pages"][0]["critical_surfaces"] = [
        {
            "surface_id": "stepper",
            "selector": ".dashboard__wizard-steps",
            "mask_allowed": False,
            "required_anchors": [".dashboard__wizard-step-1", ".dashboard__wizard-step-2"],
            "style_contracts": [
                {"property": "gap", "expected": "8px"},
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
    contract["pages"][0]["state_cases"] = []

    issues = collect_issues_with_policy(contract, strict_policy())
    assert any("state_cases" in issue and "multistate" in issue for issue in issues), issues


def test_strict_policy_requires_surface_non_default_state_coverage_for_multistate_part() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0]["diff_threshold"] = 0
    contract["surfaces"] = [
        {
            "surface_id": "modal-forgot-password",
            "surface_type": "modal",
            "host_page_id": "dashboard",
            "prototype_selector": "#forgot-password-modal",
            "app_selector": ".forgot-password-modal",
            "surface_root_selector": ".ant-modal-root .forgot-password-modal",
            "backdrop_selector": ".ant-modal-mask",
            "portal_host": "body",
            "source_ref": "00-admin-login.md#modal-forgot-password",
            "trigger_action": {"type": "click", "selector": ".forgot-password-link"},
            "required_anchors": [
                ".forgot-password-modal__header",
                ".forgot-password-modal__steps",
                ".forgot-password-modal__content",
            ],
            "viewport_variants": [
                {"viewport_id": "desktop", "width": 1440, "height": 900},
            ],
            "state_variants": [{"state_id": "default"}],
            "surface_parts": [
                {"part_id": "backdrop", "selector": ".ant-modal-mask", "mask_allowed": False},
                {"part_id": "shell", "selector": ".forgot-password-modal", "mask_allowed": False},
                {"part_id": "header", "selector": ".forgot-password-modal__header", "mask_allowed": False},
                {"part_id": "body", "selector": ".forgot-password-modal__body", "mask_allowed": False},
                {"part_id": "close-control", "selector": ".forgot-password-modal__close", "mask_allowed": False},
            ],
            "content_parts": [
                {"part_id": "title", "selector": ".forgot-password-modal__title", "required": True},
                {"part_id": "progress-indicator", "selector": ".forgot-password-modal__steps", "required": True},
            ],
            "style_contracts": [
                {"selector": ".forgot-password-modal", "css": {"border-radius": "20px"}},
            ],
            "state_contracts": [
                {
                    "state_id": "default",
                    "required_anchors": [".forgot-password-modal__content"],
                    "style_contracts": [
                        {"selector": ".forgot-password-modal", "css": {"background-color": "rgb(255, 255, 255)"}},
                    ],
                }
            ],
        }
    ]

    issues = collect_issues_with_policy(contract, strict_policy())
    assert any("state_variants" in issue and "multistate" in issue for issue in issues), issues
    assert any("state_contracts" in issue and "multistate" in issue for issue in issues), issues


def test_strict_policy_rejects_invalid_residual_region_class() -> None:
    fixture_path = FIXTURES_DIR / "ui_visual_residual_regions_invalid.yaml"
    contract = yaml.safe_load(fixture_path.read_text(encoding="utf-8"))
    issues = collect_issues_with_policy(contract, strict_policy())
    assert any("residual_regions" in issue and "class" in issue for issue in issues), issues


def test_strict_policy_rejects_empty_residual_region_selectors() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0]["diff_threshold"] = 0
    contract["pages"][0]["residual_regions"] = [
        {
            "class": "micro_spacing",
            "selectors": [],
        }
    ]
    issues = collect_issues_with_policy(contract, strict_policy())
    assert any("residual_regions" in issue and "selectors" in issue for issue in issues), issues


def test_strict_policy_rejects_captcha_residual_region_selectors() -> None:
    contract = deepcopy(build_base_contract())
    contract["pages"][0]["diff_threshold"] = 0
    contract["pages"][0]["residual_regions"] = [
        {
            "class": "low_salience_text_icon_rasterization",
            "selectors": [".captcha-code img"],
        }
    ]
    issues = collect_issues_with_policy(contract, strict_policy())
    assert any(".captcha-code img" in issue and "residual_regions" in issue for issue in issues), issues


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
        test_valid_overlay_surface_schema_passes,
        test_overlay_form_surface_missing_archetype_rules_fails,
        test_overlay_surface_schema_missing_required_blocks_fails,
        test_declared_overlay_surface_missing_from_contract_fails,
        test_declared_overlay_surface_present_in_contract_passes,
        test_strict_policy_rejects_non_zero_diff_threshold,
        test_strict_policy_rejects_snapshot_compare_false,
        test_strict_policy_rejects_mask_selectors_and_mask_mode,
        test_strict_policy_rejects_mask_allowed_true_on_surface_parts,
        test_strict_policy_requires_page_state_cases_for_multistate_widget,
        test_strict_policy_requires_surface_non_default_state_coverage_for_multistate_part,
        test_strict_policy_rejects_invalid_residual_region_class,
        test_strict_policy_rejects_empty_residual_region_selectors,
        test_strict_policy_rejects_captcha_residual_region_selectors,
    ]
    for fn in tests:
        fn()
    print(f"PASS: ui_visual_contract_guard_style_state_test ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
