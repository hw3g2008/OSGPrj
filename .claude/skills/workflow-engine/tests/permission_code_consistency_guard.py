#!/usr/bin/env python3
"""Guard: verify scoped permission codes are consistent across frontend, backend, and seed SQL."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml


def parse_layout_permissions(layout_path: Path) -> dict[str, dict[str, str]]:
    content = layout_path.read_text(encoding="utf-8")
    entries: dict[str, dict[str, str]] = {}
    pattern = re.compile(
        r"\{ path: '([^']+)', title: '([^']+)'(?:, permission: '([^']+)')? \}",
    )
    for path, title, permission in pattern.findall(content):
        entries[path] = {"title": title, "permission": permission}
    return entries


def parse_router_permissions(router_path: Path) -> dict[str, str]:
    content = router_path.read_text(encoding="utf-8")
    entries: dict[str, str] = {}
    current_path: str | None = None
    for line in content.splitlines():
        path_match = re.search(r"path:\s*'([^']+)'", line)
        if path_match:
            raw_path = path_match.group(1)
            current_path = raw_path if raw_path.startswith("/") else f"/{raw_path}"
        permission_match = re.search(r"permission:\s*'([^']+)'", line)
        if permission_match and current_path:
            entries[current_path] = permission_match.group(1)
    return entries


def parse_sql_seed_permissions(sql_seed_path: Path) -> dict[str, str]:
    content = sql_seed_path.read_text(encoding="utf-8")
    entries: dict[str, str] = {}
    pattern = re.compile(
        r"insert into sys_menu values\([^;\n]*'([^']+)',\s*\d+,\s*\d+,\s*'[^']+'[^;\n]*'([^']+)',\s*'#',\s*'admin'",
    )
    for title, permission in pattern.findall(content):
        entries[title] = permission
    return entries


def parse_backend_permissions(backend_root: Path) -> set[str]:
    permissions: set[str] = set()
    pattern = re.compile(r"@PreAuthorize\(\"@ss\.hasPermi\('([^']+)'\)\"\)")
    for path in backend_root.rglob("*.java"):
        content = path.read_text(encoding="utf-8", errors="ignore")
        permissions.update(pattern.findall(content))
    return permissions


def parse_contract_routes(contract_path: Path) -> set[str]:
    data = yaml.safe_load(contract_path.read_text(encoding="utf-8")) or {}
    routes: set[str] = set()
    for page in data.get("pages") or []:
        if isinstance(page, dict) and isinstance(page.get("route"), str):
            routes.add(page["route"])
    return routes


def evaluate_permission_consistency(
    *,
    layout_path: Path,
    router_path: Path,
    sql_seed_path: Path,
    backend_root: Path,
    allowed_paths: set[str] | None = None,
) -> list[str]:
    findings: list[str] = []
    layout_entries = parse_layout_permissions(layout_path)
    router_entries = parse_router_permissions(router_path)
    sql_entries = parse_sql_seed_permissions(sql_seed_path)
    backend_permissions = parse_backend_permissions(backend_root)

    scoped_paths = sorted(allowed_paths or set(layout_entries))
    for path in scoped_paths:
        layout_entry = layout_entries.get(path)
        layout_permission = layout_entry.get("permission", "") if layout_entry else ""
        router_permission = router_entries.get(path, "")
        title = layout_entry["title"] if layout_entry else ""
        effective_permission = router_permission or layout_permission

        if router_permission and layout_permission and router_permission != layout_permission:
            findings.append(
                f"frontend permission mismatch: {path} layout={layout_permission} router={router_permission}"
            )

        if not effective_permission:
            continue

        sql_permission = sql_entries.get(title)
        if sql_permission and effective_permission and sql_permission != effective_permission:
            findings.append(
                f"sql permission mismatch: {title} frontend={effective_permission} sql={sql_permission}"
            )

        if effective_permission and effective_permission not in backend_permissions:
            findings.append(
                f"backend permission missing: {path} permission={effective_permission}"
            )

    return findings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Permission code consistency guard")
    parser.add_argument("--module", required=True)
    parser.add_argument("--layout", default="osg-frontend/packages/admin/src/layouts/MainLayout.vue")
    parser.add_argument("--router", default="osg-frontend/packages/admin/src/router/index.ts")
    parser.add_argument("--sql-seed", default="deploy/mysql-init/02_osg_menu_init.sql")
    parser.add_argument("--backend-root", default="ruoyi-admin/src/main/java")
    parser.add_argument("--contract", help="Use UI visual contract routes as scoped paths")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    layout_path = Path(args.layout)
    router_path = Path(args.router)
    sql_seed_path = Path(args.sql_seed)
    backend_root = Path(args.backend_root)
    contract_path = Path(args.contract or f"osg-spec-docs/docs/01-product/prd/{args.module}/UI-VISUAL-CONTRACT.yaml")

    for path in [layout_path, router_path, sql_seed_path, backend_root, contract_path]:
        if not path.exists():
            print(f"FAIL: permission_code_consistency_guard missing path: {path}")
            return 1

    findings = evaluate_permission_consistency(
        layout_path=layout_path,
        router_path=router_path,
        sql_seed_path=sql_seed_path,
        backend_root=backend_root,
        allowed_paths=parse_contract_routes(contract_path),
    )
    if findings:
        print(f"FAIL: permission_code_consistency_guard module={args.module}")
        for item in findings:
            print(f"  - {item}")
        return 1

    print(f"PASS: permission_code_consistency_guard module={args.module}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
