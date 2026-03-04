#!/usr/bin/env python3
"""
Fail-closed guard for security contract drift checks.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from security_contract_init import discover_endpoints
from security_contract_schema import load_yaml, validate_contract

PROJECT_ROOT = Path(__file__).resolve().parents[4]


@dataclass
class Finding:
    kind: str
    severity: str
    method: str
    path: str
    message: str


def _load_contract(path: Path) -> dict[str, Any]:
    data = load_yaml(path)
    if not isinstance(data, dict):
        raise ValueError("contract root must be mapping")
    return data


def evaluate(contract: dict[str, Any], discovered: list[dict[str, Any]]) -> list[Finding]:
    findings: list[Finding] = []

    contract_eps = contract.get("endpoints") if isinstance(contract.get("endpoints"), list) else []
    contract_map: dict[tuple[str, str], dict[str, Any]] = {}
    for item in contract_eps:
        if not isinstance(item, dict):
            continue
        method = str(item.get("method", "")).upper()
        path = str(item.get("path", ""))
        if method and path:
            contract_map[(method, path)] = item

    discovered_map: dict[tuple[str, str], dict[str, Any]] = {}
    for item in discovered:
        key = (item["method"], item["path"])
        discovered_map[key] = item

    for key, item in discovered_map.items():
        if key not in contract_map:
            findings.append(
                Finding(
                    kind="missing_contract_entry",
                    severity="HIGH",
                    method=key[0],
                    path=key[1],
                    message=f"endpoint discovered in code but missing in contract ({item['source']['backend_controller']})",
                )
            )

    for key, item in contract_map.items():
        method, path = key
        if item.get("decision_required") is True:
            findings.append(
                Finding(
                    kind="decision_required_unresolved",
                    severity="HIGH",
                    method=method,
                    path=path,
                    message="decision_required=true is unresolved",
                )
            )

        code_item = discovered_map.get(key)
        if not code_item:
            continue

        contract_auth = item.get("auth_mode")
        code_auth = code_item.get("auth_mode")
        if isinstance(contract_auth, str) and isinstance(code_auth, str) and contract_auth != code_auth:
            findings.append(
                Finding(
                    kind="auth_mode_drift",
                    severity="HIGH",
                    method=method,
                    path=path,
                    message=f"contract={contract_auth}, code={code_auth}",
                )
            )

        contract_rl_required = bool(((item.get("rate_limit") or {}).get("required")))
        detected_rl = ((code_item.get("source") or {}).get("detected_rate_limit"))
        if isinstance(detected_rl, bool) and contract_rl_required != detected_rl:
            findings.append(
                Finding(
                    kind="rate_limit_drift",
                    severity="MEDIUM",
                    method=method,
                    path=path,
                    message=f"contract.required={contract_rl_required}, code.detected={detected_rl}",
                )
            )

        contract_ae_required = bool(((item.get("anti_enumeration") or {}).get("required")))
        detected_ae = ((code_item.get("source") or {}).get("detected_anti_enumeration"))
        if isinstance(detected_ae, bool) and contract_ae_required != detected_ae:
            findings.append(
                Finding(
                    kind="anti_enumeration_drift",
                    severity="MEDIUM",
                    method=method,
                    path=path,
                    message=f"contract.required={contract_ae_required}, code.detected={detected_ae}",
                )
            )

    return findings


def write_audit(path: Path, stage: str, findings: list[Finding]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"# Security Contract Guard Audit ({stage})\n\n")
        if not findings:
            f.write("PASS: no findings\n")
            return
        f.write(f"FAIL: {len(findings)} finding(s)\n\n")
        for idx, item in enumerate(findings, start=1):
            f.write(
                f"{idx}. [{item.severity}] {item.kind} {item.method} {item.path}\n"
                f"   - {item.message}\n"
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Security contract fail-closed guard")
    parser.add_argument("--contract", type=Path, default=Path("contracts/security-contract.yaml"))
    parser.add_argument("--repo-root", type=Path, default=PROJECT_ROOT)
    parser.add_argument("--stage", default="final-gate")
    parser.add_argument("--audit", type=Path, default=None)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = args.repo_root.resolve()
    contract_path = args.contract if args.contract.is_absolute() else repo_root / args.contract

    try:
        contract = _load_contract(contract_path)
    except Exception as exc:
        print(f"FAIL: cannot load contract: {exc}")
        return 2

    schema_issues = validate_contract(contract)
    if schema_issues:
        print(f"FAIL: contract schema invalid ({len(schema_issues)} issue(s))")
        for issue in schema_issues:
            print(f"  - {issue}")
        return 2

    discovered = discover_endpoints(repo_root)
    findings = evaluate(contract, discovered)

    if args.audit is not None:
        audit_path = args.audit if args.audit.is_absolute() else repo_root / args.audit
        write_audit(audit_path, args.stage, findings)

    if findings:
        print(f"FAIL: security_contract_guard found {len(findings)} finding(s)")
        for item in findings:
            print(f"[{item.severity}] {item.kind} {item.method} {item.path} - {item.message}")
        return 1

    print(
        "PASS: security_contract_guard "
        f"(stage={args.stage}, checked={len(discovered)} endpoint(s))"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
