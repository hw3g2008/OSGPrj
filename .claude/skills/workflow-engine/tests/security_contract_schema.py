#!/usr/bin/env python3
"""
Security contract schema validator (v1).
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import yaml

REQUIRED_ROOT = {"schema_version", "project_type", "endpoints"}
REQUIRED_ENDPOINT = {"id", "method", "path", "auth_mode", "decision_required"}
AUTH_MODES = {"anonymous", "authenticated"}
HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}


def load_yaml(path: Path) -> Any:
    if not path.exists():
        raise FileNotFoundError(f"contract file not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _is_pos_int(value: Any) -> bool:
    return isinstance(value, int) and value > 0


def validate_contract(data: Any) -> list[str]:
    issues: list[str] = []
    if not isinstance(data, dict):
        return ["root must be a mapping"]

    missing_root = sorted(REQUIRED_ROOT - set(data.keys()))
    if missing_root:
        issues.append(f"missing root keys: {', '.join(missing_root)}")
        return issues

    schema_version = data.get("schema_version")
    if not isinstance(schema_version, int) or schema_version < 1:
        issues.append("schema_version must be int >= 1")

    project_type = data.get("project_type")
    if project_type != "springboot-vue":
        issues.append("project_type must be 'springboot-vue'")

    endpoints = data.get("endpoints")
    if not isinstance(endpoints, list) or not endpoints:
        issues.append("endpoints must be a non-empty list")
        return issues

    uniq_method_path: set[tuple[str, str]] = set()
    uniq_id: set[str] = set()
    for idx, endpoint in enumerate(endpoints):
        pointer = f"endpoints[{idx}]"
        if not isinstance(endpoint, dict):
            issues.append(f"{pointer} must be mapping")
            continue

        missing_endpoint = sorted(REQUIRED_ENDPOINT - set(endpoint.keys()))
        if missing_endpoint:
            issues.append(f"{pointer} missing keys: {', '.join(missing_endpoint)}")
            continue

        endpoint_id = endpoint.get("id")
        if not isinstance(endpoint_id, str) or not endpoint_id.strip():
            issues.append(f"{pointer}.id must be non-empty string")
        elif endpoint_id in uniq_id:
            issues.append(f"{pointer}.id duplicated: {endpoint_id}")
        else:
            uniq_id.add(endpoint_id)

        method = endpoint.get("method")
        if not isinstance(method, str):
            issues.append(f"{pointer}.method must be string")
            method = ""
        method = method.upper()
        if method not in HTTP_METHODS:
            issues.append(f"{pointer}.method invalid: {endpoint.get('method')}")

        path = endpoint.get("path")
        if not isinstance(path, str) or not path.startswith("/"):
            issues.append(f"{pointer}.path must start with '/'")
            path = ""

        if method and path:
            key = (method, path)
            if key in uniq_method_path:
                issues.append(f"{pointer} duplicated method+path: {method} {path}")
            else:
                uniq_method_path.add(key)

        auth_mode = endpoint.get("auth_mode")
        if auth_mode not in AUTH_MODES:
            issues.append(f"{pointer}.auth_mode invalid: {auth_mode}")

        decision_required = endpoint.get("decision_required")
        if not isinstance(decision_required, bool):
            issues.append(f"{pointer}.decision_required must be bool")

        rate_limit = endpoint.get("rate_limit")
        if rate_limit is not None and not isinstance(rate_limit, dict):
            issues.append(f"{pointer}.rate_limit must be mapping")
        if isinstance(rate_limit, dict) and rate_limit.get("required") is True:
            for key in ("key", "window_sec", "max_requests"):
                if key not in rate_limit:
                    issues.append(f"{pointer}.rate_limit missing '{key}' when required=true")
            rl_key = rate_limit.get("key")
            if not isinstance(rl_key, str) or not rl_key.strip():
                issues.append(f"{pointer}.rate_limit.key must be non-empty string when required=true")
            if not _is_pos_int(rate_limit.get("window_sec")):
                issues.append(f"{pointer}.rate_limit.window_sec must be int > 0 when required=true")
            if not _is_pos_int(rate_limit.get("max_requests")):
                issues.append(f"{pointer}.rate_limit.max_requests must be int > 0 when required=true")

        anti_enum = endpoint.get("anti_enumeration")
        if anti_enum is not None and not isinstance(anti_enum, dict):
            issues.append(f"{pointer}.anti_enumeration must be mapping")
        if isinstance(anti_enum, dict) and anti_enum.get("required") is True:
            response_policy = anti_enum.get("response_policy")
            if not isinstance(response_policy, str) or not response_policy.strip():
                issues.append(
                    f"{pointer}.anti_enumeration.response_policy must be non-empty string when required=true"
                )

    return issues


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate contracts/security-contract.yaml")
    parser.add_argument("--contract", type=Path, default=Path("contracts/security-contract.yaml"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        data = load_yaml(args.contract)
    except Exception as exc:
        print(f"FAIL: {exc}")
        return 2

    issues = validate_contract(data)
    if issues:
        print(f"FAIL: security contract invalid ({len(issues)} issue(s))")
        for item in issues:
            print(f"  - {item}")
        return 1

    print(f"PASS: security contract schema valid ({args.contract})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
