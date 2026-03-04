#!/usr/bin/env python3
"""
Self-check for security_contract_init.py.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import yaml

from security_contract_init import discover_endpoints, merge_contract
from security_contract_schema import validate_contract


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def seed_repo(root: Path) -> None:
    write(
        root / "ruoyi-framework/src/main/java/com/ruoyi/framework/config/SecurityConfig.java",
        """
package com.ruoyi.framework.config;
public class SecurityConfig {
  void x() {
    requests.requestMatchers("/system/password/sendCode").permitAll();
  }
}
""".strip(),
    )
    write(
        root / "ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysPasswordController.java",
        """
package com.ruoyi.web.controller.system;
import com.ruoyi.common.annotation.Anonymous;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/system/password")
public class SysPasswordController {
  @PostMapping("/sendCode")
  public Object sendCode() { return null; }

  @PostMapping("/verify")
  public Object verify() { return null; }

  @Anonymous
  @GetMapping("/publicPing")
  public Object publicPing() { return null; }
}
""".strip(),
    )
    write(
        root / "ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysRoleController.java",
        """
package com.ruoyi.web.controller.system;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/system/role")
public class SysRoleController {
  @GetMapping("/authUser/allocatedList")
  public Object allocatedList() { return null; }
}
""".strip(),
    )
    write(
        root / "ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysLoginController.java",
        """
package com.ruoyi.web.controller.system;
import org.springframework.web.bind.annotation.*;
@RestController
public class SysLoginController {
  @PostMapping("/login")
  public Object login() { return null; }
}
""".strip(),
    )
    write(
        root / "ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysRegisterController.java",
        """
package com.ruoyi.web.controller.system;
import org.springframework.web.bind.annotation.*;
@RestController
public class SysRegisterController {
  @PostMapping("/register")
  public Object register() { return null; }
}
""".strip(),
    )
    write(
        root / "ruoyi-admin/src/main/java/com/ruoyi/web/controller/common/CaptchaController.java",
        """
package com.ruoyi.web.controller.common;
import org.springframework.web.bind.annotation.*;
@RestController
public class CaptchaController {
  @GetMapping("/captchaImage")
  public Object captchaImage() { return null; }
}
""".strip(),
    )
    write(
        root / "osg-frontend/packages/admin/src/api/auth.ts",
        """
export function sendCode(data: any) {
  return request({ url: '/system/password/sendCode', method: 'post', data })
}
""".strip(),
    )


def test_controller_mappings_produce_endpoint_entries(repo_root: Path) -> None:
    endpoints = discover_endpoints(repo_root)
    method_path = {(e["method"], e["path"]) for e in endpoints}
    assert ("POST", "/system/password/sendCode") in method_path, method_path
    assert ("POST", "/system/password/verify") in method_path, method_path


def test_anonymous_sources_detected(repo_root: Path) -> None:
    endpoints = discover_endpoints(repo_root)
    mapping = {(e["method"], e["path"]): e for e in endpoints}
    assert mapping[("POST", "/system/password/sendCode")]["auth_mode"] == "anonymous"
    assert mapping[("GET", "/system/password/publicPing")]["auth_mode"] == "anonymous"


def test_unresolved_endpoints_marked_decision_required(repo_root: Path) -> None:
    existing = {
        "schema_version": 1,
        "project_type": "springboot-vue",
        "endpoints": [
            {
                "id": "password_send_code",
                "method": "POST",
                "path": "/system/password/sendCode",
                "auth_mode": "anonymous",
                "decision_required": False,
                "source": {"backend_controller": "x"},
            }
        ],
    }
    discovered = discover_endpoints(repo_root)
    merged = merge_contract(existing, discovered)

    mapping = {(e["method"], e["path"]): e for e in merged["endpoints"]}
    assert mapping[("POST", "/system/password/sendCode")]["decision_required"] is False
    assert mapping[("POST", "/system/password/verify")]["decision_required"] is True

    issues = validate_contract(merged)
    assert not issues, issues


def test_non_auth_surface_excluded(repo_root: Path) -> None:
    endpoints = discover_endpoints(repo_root)
    method_path = {(e["method"], e["path"]) for e in endpoints}
    assert ("GET", "/system/role/authUser/allocatedList") not in method_path, method_path


def test_prune_stale_unresolved_entries(repo_root: Path) -> None:
    existing = {
        "schema_version": 1,
        "project_type": "springboot-vue",
        "endpoints": [
            {
                "id": "get_system_role_authUser_allocatedList",
                "method": "GET",
                "path": "/system/role/authUser/allocatedList",
                "auth_mode": "authenticated",
                "decision_required": True,
            }
        ],
    }
    discovered = discover_endpoints(repo_root)
    merged = merge_contract(existing, discovered)
    method_path = {(e["method"], e["path"]) for e in merged["endpoints"]}
    assert ("GET", "/system/role/authUser/allocatedList") not in method_path, method_path


def test_builtin_public_auth_endpoints_auto_resolved(repo_root: Path) -> None:
    existing = {
        "schema_version": 1,
        "project_type": "springboot-vue",
        "endpoints": [],
    }
    discovered = discover_endpoints(repo_root)
    merged = merge_contract(existing, discovered)
    mapping = {(e["method"], e["path"]): e for e in merged["endpoints"]}
    assert mapping[("POST", "/login")]["decision_required"] is False
    assert mapping[("POST", "/register")]["decision_required"] is False
    assert mapping[("GET", "/captchaImage")]["decision_required"] is False


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="security-init-test-") as td:
        repo_root = Path(td)
        seed_repo(repo_root)
        test_controller_mappings_produce_endpoint_entries(repo_root)
        test_anonymous_sources_detected(repo_root)
        test_unresolved_endpoints_marked_decision_required(repo_root)
        test_non_auth_surface_excluded(repo_root)
        test_prune_stale_unresolved_entries(repo_root)
        test_builtin_public_auth_endpoints_auto_resolved(repo_root)
    print("PASS: security_contract_init_test (6 tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
