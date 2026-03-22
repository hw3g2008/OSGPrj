#!/usr/bin/env python3
"""Self-test for behavior_contract_guard.py."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import yaml

from behavior_contract_guard import evaluate_behavior_contract


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _write_yaml(path: Path, data: object) -> None:
    _write(path, yaml.safe_dump(data, allow_unicode=True, sort_keys=False))


def _write_json(path: Path, data: object) -> None:
    _write(path, json.dumps(data, ensure_ascii=False, indent=2))


def valid_contract() -> dict:
    return {
        "schema_version": 1,
        "module": "permission",
        "capabilities": [
            {
                "capability_id": "forgot-password-send-code",
                "source_refs": [{"prd": "00-admin-login.md#5.1"}],
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
                    "forbidden_literals": ["null", "undefined"],
                    "required_tokens": ["验证码"],
                },
                "evidence_contract": {
                    "must_exist_for": ["known-identity"],
                    "must_not_exist_for": ["unknown-identity"],
                },
            },
            {
                "capability_id": "login-success",
                "source_refs": [{"prd": "00-admin-login.md#4.1"}],
                "effect_scope": "internal",
                "effect_kind": "auth_session_established",
                "truth_mode": "real",
                "evidence_mode": "audit_event",
                "verification_stage": "verify",
                "required_artifacts": ["audit_event", "response_contract"],
                "behavior_contract": {
                    "scenarios": [
                        {
                            "scenario_id": "valid-credentials",
                            "input_class": "valid_credentials",
                            "expected_result": "accepted",
                        },
                        {
                            "scenario_id": "invalid-credentials",
                            "input_class": "invalid_credentials",
                            "expected_result": "rejected",
                        },
                    ],
                    "invariants": [
                        {
                            "distinct_outcome_for": [
                                "valid-credentials",
                                "invalid-credentials",
                            ]
                        }
                    ],
                },
                "content_contract": {
                    "forbidden_literals": ["null", "undefined"],
                    "required_tokens": ["token"],
                },
                "evidence_contract": {
                    "must_exist_for": ["valid-credentials"],
                    "must_not_exist_for": ["invalid-credentials"],
                },
            },
            {
                "capability_id": "forgot-password-verify-code",
                "source_refs": [{"prd": "00-admin-login.md#5.1"}],
                "effect_scope": "internal",
                "effect_kind": "password_reset_code_verification",
                "truth_mode": "real",
                "evidence_mode": "cache_record",
                "verification_stage": "verify",
                "required_artifacts": ["cache_record", "audit_event"],
                "behavior_contract": {
                    "scenarios": [
                        {
                            "scenario_id": "invalid-code",
                            "input_class": "invalid_code",
                            "expected_result": "rejected",
                        },
                        {
                            "scenario_id": "expired-code",
                            "input_class": "expired_code",
                            "expected_result": "rejected",
                        },
                    ],
                    "invariants": [
                        {
                            "single_observable_error_message_for": [
                                "invalid-code",
                                "expired-code",
                            ]
                        }
                    ],
                },
                "content_contract": {
                    "forbidden_literals": ["null", "undefined"],
                    "required_tokens": ["验证码"],
                },
                "evidence_contract": {
                    "must_not_exist_for": ["invalid-code", "expired-code"],
                    "must_exist_for": ["invalid-code"],
                },
            },
        ],
    }


def valid_report() -> dict:
    return {
        "module": "permission",
        "stage": "verify",
        "capabilities": [
            {
                "capability_id": "forgot-password-send-code",
                "scenario_results": [
                    {
                        "scenario_id": "known-identity",
                        "input_class": "known_identity",
                        "expected_result": "accepted",
                        "observed_result": "accepted",
                        "observable_response": {
                            "http_status": 200,
                            "business_code": 200,
                            "message": "我们会往您的注册邮箱发送验证码，请查收",
                        },
                        "evidence_ref": "osg-spec-docs/tasks/audit/password-reset-mailbox.log",
                    },
                    {
                        "scenario_id": "unknown-identity",
                        "input_class": "unknown_identity",
                        "expected_result": "accepted",
                        "observed_result": "accepted",
                        "observable_response": {
                            "http_status": 200,
                            "business_code": 200,
                            "message": "我们会往您的注册邮箱发送验证码，请查收",
                        },
                        "evidence_ref": "osg-spec-docs/tasks/audit/password-reset-mailbox.log",
                    },
                ],
            },
            {
                "capability_id": "login-success",
                "scenario_results": [
                    {
                        "scenario_id": "valid-credentials",
                        "input_class": "valid_credentials",
                        "expected_result": "accepted",
                        "observed_result": "accepted",
                        "observable_response": {
                            "http_status": 200,
                            "business_code": 200,
                            "message": "操作成功",
                            "token_present": True,
                        },
                        "evidence_ref": "osg-spec-docs/tasks/audit/e2e-api-gate-permission-2026-03-03.log",
                    },
                    {
                        "scenario_id": "invalid-credentials",
                        "input_class": "invalid_credentials",
                        "expected_result": "rejected",
                        "observed_result": "rejected",
                        "observable_response": {
                            "http_status": 200,
                            "business_code": 500,
                            "message": "账号或密码错误",
                            "token_present": False,
                        },
                        "evidence_ref": "osg-spec-docs/tasks/audit/e2e-api-gate-permission-2026-03-03.log",
                    },
                ],
            },
            {
                "capability_id": "forgot-password-verify-code",
                "scenario_results": [
                    {
                        "scenario_id": "invalid-code",
                        "input_class": "invalid_code",
                        "expected_result": "rejected",
                        "observed_result": "rejected",
                        "observable_response": {
                            "http_status": 200,
                            "business_code": 500,
                            "message": "验证码错误",
                            "visible_error_message_count": 1,
                        },
                        "evidence_ref": "osg-frontend/tests/e2e/forgot-password.e2e.spec.ts#perm-s002-verify-invalid-code",
                    },
                    {
                        "scenario_id": "expired-code",
                        "input_class": "expired_code",
                        "expected_result": "rejected",
                        "observed_result": "rejected",
                        "observable_response": {
                            "http_status": 200,
                            "business_code": 500,
                            "message": "验证码错误",
                            "visible_error_message_count": 1,
                        },
                        "evidence_ref": "osg-frontend/tests/e2e/forgot-password.e2e.spec.ts#perm-s002-verify-expired-code",
                    },
                ],
            },
        ],
    }


def _prepare_paths(root: Path) -> tuple[Path, Path]:
    contract_path = root / "osg-spec-docs/docs/01-product/prd/permission/DELIVERY-CONTRACT.yaml"
    report_path = root / "osg-spec-docs/tasks/audit/behavior-contract-permission-2026-03-07.json"
    _write_yaml(contract_path, valid_contract())
    _write_json(report_path, valid_report())
    return contract_path, report_path


def _write_story(path: Path, capability_ids: list[str]) -> None:
    _write_yaml(
        path,
        {
            "id": "S-TEST",
            "contract_refs": {
                "capabilities": capability_ids,
            },
        },
    )


def test_missing_scenario_result_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        contract_path, report_path = _prepare_paths(root)
        report = valid_report()
        report["capabilities"][0]["scenario_results"] = report["capabilities"][0]["scenario_results"][:1]
        _write_json(report_path, report)
        findings = evaluate_behavior_contract(
            contract_path=contract_path,
            report_path=report_path,
            stage="verify",
        )
        assert any("missing scenario result" in item for item in findings), findings


def test_same_observable_response_invariant_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        contract_path, report_path = _prepare_paths(root)
        report = valid_report()
        report["capabilities"][0]["scenario_results"][1]["observable_response"]["message"] = "该邮箱未注册"
        _write_json(report_path, report)
        findings = evaluate_behavior_contract(
            contract_path=contract_path,
            report_path=report_path,
            stage="verify",
        )
        assert any("same_observable_response_for violated" in item for item in findings), findings


def test_distinct_outcome_invariant_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        contract_path, report_path = _prepare_paths(root)
        report = valid_report()
        report["capabilities"][1]["scenario_results"][1]["observable_response"] = {
            "http_status": 200,
            "business_code": 200,
            "message": "操作成功",
            "token_present": True,
        }
        _write_json(report_path, report)
        findings = evaluate_behavior_contract(
            contract_path=contract_path,
            report_path=report_path,
            stage="verify",
        )
        assert any("distinct_outcome_for violated" in item for item in findings), findings


def test_single_observable_error_message_invariant_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        contract_path, report_path = _prepare_paths(root)
        report = valid_report()
        report["capabilities"][2]["scenario_results"][1]["observable_response"]["visible_error_message_count"] = 2
        _write_json(report_path, report)
        findings = evaluate_behavior_contract(
            contract_path=contract_path,
            report_path=report_path,
            stage="verify",
        )
        assert any("single_observable_error_message_for violated" in item for item in findings), findings


def test_valid_behavior_report_passes() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        contract_path, report_path = _prepare_paths(root)
        findings = evaluate_behavior_contract(
            contract_path=contract_path,
            report_path=report_path,
            stage="verify",
        )
        assert not findings, findings


def test_story_scope_limits_required_capabilities() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        contract_path, report_path = _prepare_paths(root)
        story_path = root / "osg-spec-docs/tasks/stories/S-TEST.yaml"
        report = valid_report()
        report["capabilities"] = [
            capability for capability in report["capabilities"] if capability["capability_id"] == "login-success"
        ]
        _write_json(report_path, report)
        _write_story(story_path, ["login-success"])
        findings = evaluate_behavior_contract(
            contract_path=contract_path,
            report_path=report_path,
            stage="verify",
            story_path=story_path,
        )
        assert not findings, findings


def main() -> int:
    tests = [
        test_missing_scenario_result_fails,
        test_same_observable_response_invariant_fails,
        test_distinct_outcome_invariant_fails,
        test_single_observable_error_message_invariant_fails,
        test_valid_behavior_report_passes,
        test_story_scope_limits_required_capabilities,
    ]
    for fn in tests:
        fn()
    print(f"PASS: behavior_contract_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
