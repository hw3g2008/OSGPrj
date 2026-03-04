#!/usr/bin/env python3
"""
Self-check for security_contract_schema.py.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import yaml

from security_contract_schema import load_yaml, validate_contract


def write_yaml(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False)


def test_contract_requires_schema_version_and_endpoints() -> None:
    bad = {"project_type": "springboot-vue"}
    issues = validate_contract(bad)
    assert any("missing root keys" in item for item in issues), issues


def test_endpoint_requires_auth_mode() -> None:
    bad = {
        "schema_version": 1,
        "project_type": "springboot-vue",
        "endpoints": [
            {
                "id": "password_send_code",
                "method": "POST",
                "path": "/system/password/sendCode",
                "decision_required": False,
            }
        ],
    }
    issues = validate_contract(bad)
    assert any("missing keys: auth_mode" in item for item in issues), issues


def test_duplicate_method_path_fails() -> None:
    bad = {
        "schema_version": 1,
        "project_type": "springboot-vue",
        "endpoints": [
            {
                "id": "a",
                "method": "POST",
                "path": "/dup",
                "auth_mode": "anonymous",
                "decision_required": False,
            },
            {
                "id": "b",
                "method": "POST",
                "path": "/dup",
                "auth_mode": "authenticated",
                "decision_required": True,
            },
        ],
    }
    issues = validate_contract(bad)
    assert any("duplicated method+path" in item for item in issues), issues


def test_valid_contract_passes() -> None:
    ok = {
        "schema_version": 1,
        "project_type": "springboot-vue",
        "endpoints": [
            {
                "id": "password_send_code",
                "method": "POST",
                "path": "/system/password/sendCode",
                "auth_mode": "anonymous",
                "decision_required": False,
                "rate_limit": {
                    "required": True,
                    "key": "pwd_reset_send:${ip}:${email_hash}",
                    "window_sec": 300,
                    "max_requests": 5,
                },
                "anti_enumeration": {
                    "required": True,
                    "response_policy": "generic_msg",
                },
            }
        ],
    }
    with tempfile.TemporaryDirectory(prefix="security-schema-test-") as td:
        path = Path(td) / "security-contract.yaml"
        write_yaml(path, ok)
        loaded = load_yaml(path)
        issues = validate_contract(loaded)
        assert not issues, issues


def main() -> int:
    tests = [
        test_contract_requires_schema_version_and_endpoints,
        test_endpoint_requires_auth_mode,
        test_duplicate_method_path_fails,
        test_valid_contract_passes,
    ]
    for fn in tests:
        fn()
    print(f"PASS: security_contract_schema_test ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
