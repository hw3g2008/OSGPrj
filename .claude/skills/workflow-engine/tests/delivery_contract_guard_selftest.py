#!/usr/bin/env python3
"""Self-test for delivery_contract_guard.py."""

from __future__ import annotations

from delivery_contract_guard import validate_contract


def _base_contract() -> dict:
    return {
        "schema_version": 1,
        "module": "permission",
        "capabilities": [
            {
                "capability_id": "forgot-password-send-code",
                "source_refs": [
                    {"prd": "00-admin-login.md#5.1"},
                    {"srs": "permission.md#FR-001.3"},
                ],
                "effect_scope": "external",
                "effect_kind": "email_reset_code",
                "truth_mode": "real",
                "provider_class": "smtp",
                "evidence_mode": "mailbox",
                "verification_stage": "verify",
                "required_artifacts": ["provider_config", "send_evidence", "audit_event"],
                "behavior_contract": {
                    "scenarios": [
                        {
                            "scenario_id": "known-identity",
                            "input_class": "known_identity",
                            "expected_result": "accepted",
                        },
                        {
                            "scenario_id": "unknown-identity",
                            "input_class": "unknown_identity",
                            "expected_result": "accepted",
                        },
                    ],
                    "invariants": [
                        {
                            "same_observable_response_for": [
                                "known-identity",
                                "unknown-identity",
                            ]
                        }
                    ],
                },
                "content_contract": {
                    "forbidden_literals": ["null", "undefined", "[object Object]"],
                    "required_tokens": ["验证码", "5 分钟"],
                },
                "evidence_contract": {
                    "must_exist_for": ["known-identity"],
                    "must_not_exist_for": ["unknown-identity"],
                },
            }
        ],
    }


def test_missing_effect_scope_fails() -> None:
    data = _base_contract()
    del data["capabilities"][0]["effect_scope"]
    findings = validate_contract(data)
    assert any("effect_scope" in item for item in findings), findings


def test_missing_effect_kind_fails() -> None:
    data = _base_contract()
    del data["capabilities"][0]["effect_kind"]
    findings = validate_contract(data)
    assert any("effect_kind" in item for item in findings), findings


def test_truth_mode_not_real_fails() -> None:
    data = _base_contract()
    data["capabilities"][0]["truth_mode"] = "fixed"
    findings = validate_contract(data)
    assert any("truth_mode" in item for item in findings), findings


def test_empty_evidence_mode_fails() -> None:
    data = _base_contract()
    data["capabilities"][0]["evidence_mode"] = ""
    findings = validate_contract(data)
    assert any("evidence_mode" in item for item in findings), findings


def test_missing_behavior_contract_fails() -> None:
    data = _base_contract()
    del data["capabilities"][0]["behavior_contract"]
    findings = validate_contract(data)
    assert any("behavior_contract" in item for item in findings), findings


def test_missing_content_contract_fails() -> None:
    data = _base_contract()
    del data["capabilities"][0]["content_contract"]
    findings = validate_contract(data)
    assert any("content_contract" in item for item in findings), findings


def test_missing_evidence_contract_fails() -> None:
    data = _base_contract()
    del data["capabilities"][0]["evidence_contract"]
    findings = validate_contract(data)
    assert any("evidence_contract" in item for item in findings), findings


def test_unknown_scenario_reference_fails() -> None:
    data = _base_contract()
    data["capabilities"][0]["evidence_contract"]["must_exist_for"] = ["non-existent-scenario"]
    findings = validate_contract(data)
    assert any("unknown scenario_id" in item for item in findings), findings


def test_optional_invariants_and_must_not_exist_for_can_be_omitted() -> None:
    data = _base_contract()
    del data["capabilities"][0]["behavior_contract"]["invariants"]
    del data["capabilities"][0]["evidence_contract"]["must_not_exist_for"]
    findings = validate_contract(data)
    assert not findings, findings


def test_valid_contract_passes() -> None:
    data = _base_contract()
    findings = validate_contract(data)
    assert not findings, findings


def main() -> int:
    tests = [
        test_missing_effect_scope_fails,
        test_missing_effect_kind_fails,
        test_truth_mode_not_real_fails,
        test_empty_evidence_mode_fails,
        test_missing_behavior_contract_fails,
        test_missing_content_contract_fails,
        test_missing_evidence_contract_fails,
        test_unknown_scenario_reference_fails,
        test_optional_invariants_and_must_not_exist_for_can_be_omitted,
        test_valid_contract_passes,
    ]
    for test in tests:
        test()
    print(f"PASS: delivery_contract_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
