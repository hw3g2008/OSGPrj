#!/usr/bin/env python3
"""Self-test for menu_route_view_guard.py."""

from __future__ import annotations

import tempfile
from pathlib import Path

from menu_route_view_guard import evaluate_menu_route_view


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_missing_route_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(root / "MainLayout.vue", "{ path: '/permission/roles', title: '权限配置', permission: 'system:role:list' }")
        _write(root / "router/index.ts", "const routes = []")
        findings = evaluate_menu_route_view(
            layout_path=root / "MainLayout.vue",
            router_path=root / "router/index.ts",
            views_root=root / "views",
            allowed_paths={"/permission/roles"},
        )
        assert any("missing route" in item for item in findings), findings


def test_missing_view_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(root / "MainLayout.vue", "{ path: '/permission/roles', title: '权限配置', permission: 'system:role:list' }")
        _write(
            root / "router/index.ts",
            "const routes = [{ path: 'permission/roles', component: () => import('@/views/permission/roles/index.vue') }]",
        )
        findings = evaluate_menu_route_view(
            layout_path=root / "MainLayout.vue",
            router_path=root / "router/index.ts",
            views_root=root / "views",
            allowed_paths={"/permission/roles"},
        )
        assert any("missing view file" in item for item in findings), findings


def test_valid_inputs_pass() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write(root / "MainLayout.vue", "{ path: '/permission/roles', title: '权限配置', permission: 'system:role:list' }")
        _write(
            root / "router/index.ts",
            "const routes = [{ path: 'permission/roles', component: () => import('@/views/permission/roles/index.vue') }]",
        )
        _write(root / "views/permission/roles/index.vue", "<template />")
        findings = evaluate_menu_route_view(
            layout_path=root / "MainLayout.vue",
            router_path=root / "router/index.ts",
            views_root=root / "views",
            allowed_paths={"/permission/roles"},
        )
        assert not findings, findings


def main() -> int:
    tests = [
        test_missing_route_fails,
        test_missing_view_fails,
        test_valid_inputs_pass,
    ]
    for fn in tests:
        fn()
    print(f"PASS: menu_route_view_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
