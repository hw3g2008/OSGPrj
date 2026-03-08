#!/usr/bin/env python3
"""Self-test for permission_code_consistency_guard.py."""

from __future__ import annotations

import tempfile
from pathlib import Path

from permission_code_consistency_guard import evaluate_permission_consistency


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_sql_permission_mismatch_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(root / "MainLayout.vue", "{ path: '/permission/roles', title: '权限配置', permission: 'system:role:list' }")
        _write(
            root / "router/index.ts",
            "const routes = [{ path: 'permission/roles', meta: { permission: 'system:role:list' } }]",
        )
        _write(
            root / "menu.sql",
            "insert into sys_menu values(2011, '权限配置', 2001, 1, 'roles', 'admin/permission/roles/index', '', '', 1, 0, 'C', '0', '0', 'admin:roles:list', '#', 'admin', sysdate(), '', null, '权限配置菜单');",
        )
        _write(
            root / "SysRoleController.java",
            "@PreAuthorize(\"@ss.hasPermi('system:role:list')\")\npublic class SysRoleController {}",
        )
        findings = evaluate_permission_consistency(
            layout_path=root / "MainLayout.vue",
            router_path=root / "router/index.ts",
            sql_seed_path=root / "menu.sql",
            backend_root=root,
            allowed_paths={"/permission/roles"},
        )
        assert any("sql permission mismatch" in item for item in findings), findings


def test_missing_backend_permission_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(root / "MainLayout.vue", "{ path: '/permission/roles', title: '权限配置', permission: 'system:role:list' }")
        _write(
            root / "router/index.ts",
            "const routes = [{ path: 'permission/roles', meta: { permission: 'system:role:list' } }]",
        )
        _write(
            root / "menu.sql",
            "insert into sys_menu values(2011, '权限配置', 2001, 1, 'roles', 'admin/permission/roles/index', '', '', 1, 0, 'C', '0', '0', 'system:role:list', '#', 'admin', sysdate(), '', null, '权限配置菜单');",
        )
        _write(root / "Controller.java", "public class X {}")
        findings = evaluate_permission_consistency(
            layout_path=root / "MainLayout.vue",
            router_path=root / "router/index.ts",
            sql_seed_path=root / "menu.sql",
            backend_root=root,
            allowed_paths={"/permission/roles"},
        )
        assert any("backend permission missing" in item for item in findings), findings


def test_valid_inputs_pass() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(root / "MainLayout.vue", "{ path: '/permission/roles', title: '权限配置', permission: 'system:role:list' }")
        _write(
            root / "router/index.ts",
            "const routes = [{ path: 'permission/roles', meta: { permission: 'system:role:list' } }]",
        )
        _write(
            root / "menu.sql",
            "insert into sys_menu values(2011, '权限配置', 2001, 1, 'roles', 'admin/permission/roles/index', '', '', 1, 0, 'C', '0', '0', 'system:role:list', '#', 'admin', sysdate(), '', null, '权限配置菜单');",
        )
        _write(
            root / "SysRoleController.java",
            "@PreAuthorize(\"@ss.hasPermi('system:role:list')\")\npublic class SysRoleController {}",
        )
        findings = evaluate_permission_consistency(
            layout_path=root / "MainLayout.vue",
            router_path=root / "router/index.ts",
            sql_seed_path=root / "menu.sql",
            backend_root=root,
            allowed_paths={"/permission/roles"},
        )
        assert not findings, findings


def main() -> int:
    tests = [
        test_sql_permission_mismatch_fails,
        test_missing_backend_permission_fails,
        test_valid_inputs_pass,
    ]
    for fn in tests:
        fn()
    print(f"PASS: permission_code_consistency_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
