#!/usr/bin/env python3
"""
Self-check for security_contract_guard.py.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

import yaml


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def write_yaml(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False)


def seed_repo(root: Path, anonymous: bool = True) -> None:
    security_line = 'requests.requestMatchers("/system/password/sendCode").permitAll();' if anonymous else ""
    write(
        root / "ruoyi-framework/src/main/java/com/ruoyi/framework/config/SecurityConfig.java",
        f"""
package com.ruoyi.framework.config;
public class SecurityConfig {{
  void x() {{
    {security_line}
  }}
}}
""".strip(),
    )
    write(
        root / "ruoyi-admin/src/main/java/com/ruoyi/web/controller/demo/DemoController.java",
        """
package com.ruoyi.web.controller.demo;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/system/password")
public class DemoController {
  @PostMapping("/sendCode")
  public Object sendCode() { return null; }
}
""".strip(),
    )


def run_guard(repo_root: Path, contract_path: Path) -> tuple[int, str]:
    guard = Path(__file__).resolve().parent / "security_contract_guard.py"
    proc = subprocess.run(
        [
            sys.executable,
            str(guard),
            "--repo-root",
            str(repo_root),
            "--contract",
            str(contract_path),
            "--stage",
            "selftest",
        ],
        capture_output=True,
        text=True,
    )
    output = (proc.stdout or "") + (proc.stderr or "")
    return proc.returncode, output


def base_contract() -> dict:
    return {
        "schema_version": 1,
        "project_type": "springboot-vue",
        "contract_version": "2026-03-03.1",
        "generated_by": "selftest",
        "generated_at": "2026-03-03T00:00:00Z",
        "endpoints": [],
    }


def case_missing_contract_entry(repo_root: Path) -> None:
    contract = base_contract()
    contract["endpoints"] = [
        {
            "id": "get_placeholder",
            "method": "GET",
            "path": "/placeholder",
            "auth_mode": "authenticated",
            "decision_required": False,
        }
    ]
    path = repo_root / "contracts/security-contract.yaml"
    write_yaml(path, contract)
    rc, out = run_guard(repo_root, path)
    assert rc != 0, out
    assert "missing_contract_entry" in out, out


def case_decision_required_unresolved(repo_root: Path) -> None:
    contract = base_contract()
    contract["endpoints"] = [
        {
            "id": "post_system_password_sendCode",
            "method": "POST",
            "path": "/system/password/sendCode",
            "auth_mode": "anonymous",
            "decision_required": True,
        }
    ]
    path = repo_root / "contracts/security-contract.yaml"
    write_yaml(path, contract)
    rc, out = run_guard(repo_root, path)
    assert rc != 0, out
    assert "decision_required_unresolved" in out, out


def case_auth_mode_drift(repo_root: Path) -> None:
    contract = base_contract()
    contract["endpoints"] = [
        {
            "id": "post_system_password_sendCode",
            "method": "POST",
            "path": "/system/password/sendCode",
            "auth_mode": "authenticated",
            "decision_required": False,
        }
    ]
    path = repo_root / "contracts/security-contract.yaml"
    write_yaml(path, contract)
    rc, out = run_guard(repo_root, path)
    assert rc != 0, out
    assert "auth_mode_drift" in out, out


def case_clean_pass(repo_root: Path) -> None:
    contract = base_contract()
    contract["endpoints"] = [
        {
            "id": "post_system_password_sendCode",
            "method": "POST",
            "path": "/system/password/sendCode",
            "auth_mode": "anonymous",
            "decision_required": False,
            "rate_limit": {"required": False},
            "anti_enumeration": {"required": False, "response_policy": "generic_msg"},
        }
    ]
    path = repo_root / "contracts/security-contract.yaml"
    write_yaml(path, contract)
    rc, out = run_guard(repo_root, path)
    assert rc == 0, out
    assert "PASS: security_contract_guard" in out, out


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="security-guard-selftest-") as td:
        repo_root = Path(td)
        seed_repo(repo_root, anonymous=True)
        case_missing_contract_entry(repo_root)
        case_decision_required_unresolved(repo_root)
        case_auth_mode_drift(repo_root)
        case_clean_pass(repo_root)
    print("PASS: security_contract_guard_selftest")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
