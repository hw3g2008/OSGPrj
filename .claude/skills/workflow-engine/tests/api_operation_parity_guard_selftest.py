#!/usr/bin/env python3
"""Self-tests for api_operation_parity_guard.py."""

from __future__ import annotations

import tempfile
from pathlib import Path

from api_operation_parity_guard import (
    evaluate_api_parity,
    normalize_path,
    parse_backend_apis,
    parse_frontend_apis,
    resolve_module_frontend_files,
)


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_frontend_put_missing_backend_fails() -> None:
    """Frontend declares PUT /system/basedata but backend has no matching mapping."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        fe_dir = root / "frontend" / "api"
        be_dir = root / "backend"

        _write(
            fe_dir / "baseData.ts",
            """
import http from '@/utils/request'

export function getBaseDataList() {
  return http.get('/system/basedata/list')
}

export function addBaseData(data: any) {
  return http.post('/system/basedata', data)
}

export function updateBaseData(data: any) {
  return http.put('/system/basedata', data)
}
""",
        )

        _write(
            be_dir / "OsgBaseDataController.java",
            """
@RestController
@RequestMapping("/system/basedata")
public class OsgBaseDataController {

    @GetMapping("/list")
    public TableDataInfo list() { return null; }

    @PostMapping
    public AjaxResult add(@RequestBody OsgBaseData data) { return null; }

    // NOTE: @PutMapping is intentionally missing to simulate the S-006 defect
}
""",
        )

        findings = evaluate_api_parity(
            frontend_dirs=[fe_dir],
            backend_dirs=[be_dir],
        )
        assert any("PUT" in f and "system/basedata" in f for f in findings), \
            f"should report missing PUT /system/basedata: {findings}"


def test_matching_frontend_backend_passes() -> None:
    """Frontend and backend both declare same method/path → no findings."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        fe_dir = root / "frontend" / "api"
        be_dir = root / "backend"

        _write(
            fe_dir / "role.ts",
            """
import http from '@/utils/request'

export function addRole(data: any) {
  return http.post('/system/role', data)
}

export function updateRole(data: any) {
  return http.put('/system/role', data)
}

export function deleteRole(roleId: number) {
  return http.delete(`/system/role/${roleId}`)
}
""",
        )

        _write(
            be_dir / "SysRoleController.java",
            """
@RestController
@RequestMapping("/system/role")
public class SysRoleController {

    @PostMapping
    public AjaxResult add(@RequestBody SysRole role) { return null; }

    @PutMapping
    public AjaxResult edit(@RequestBody SysRole role) { return null; }

    @DeleteMapping("/{roleIds}")
    public AjaxResult remove(@PathVariable Long[] roleIds) { return null; }
}
""",
        )

        findings = evaluate_api_parity(
            frontend_dirs=[fe_dir],
            backend_dirs=[be_dir],
        )
        assert not findings, f"should pass with matching APIs: {findings}"


def test_get_mismatch_does_not_block() -> None:
    """Read-only GET API mismatch should not block (write_only=True by default)."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        fe_dir = root / "frontend" / "api"
        be_dir = root / "backend"

        _write(
            fe_dir / "dashboard.ts",
            """
import http from '@/utils/request'

export function getDashboard() {
  return http.get('/system/dashboard')
}
""",
        )

        # Backend has no /system/dashboard GET, but that's fine for write-only check
        _write(
            be_dir / "DashboardController.java",
            """
@RestController
@RequestMapping("/system")
public class DashboardController {
    // No dashboard endpoint
}
""",
        )

        findings = evaluate_api_parity(
            frontend_dirs=[fe_dir],
            backend_dirs=[be_dir],
        )
        assert not findings, f"GET mismatch should not block: {findings}"


def test_logout_is_ignored_as_framework_handled_endpoint() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        fe_dir = root / "frontend" / "api"
        be_dir = root / "backend"

        _write(
            fe_dir / "auth.ts",
            """
import http from '@/utils/request'

export function logout() {
  return http.post('/logout')
}
""",
        )

        _write(
            be_dir / "EmptyController.java",
            """
@RestController
public class EmptyController {
}
""",
        )

        findings = evaluate_api_parity(
            frontend_dirs=[fe_dir],
            backend_dirs=[be_dir],
        )
        assert not findings, f"framework-handled logout should be ignored: {findings}"


def test_module_frontend_file_scope_ignores_unrelated_api_files() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        fe_dir = root / "osg-frontend" / "packages" / "shared" / "src" / "api"
        be_dir = root / "backend"
        tickets_dir = root / "osg-spec-docs" / "tasks" / "tickets"
        testing_dir = root / "osg-spec-docs" / "tasks" / "testing"

        _write(
            fe_dir / "user.ts",
            """
import http from '@/utils/request'

export function updatePassword() {
  return http.put('/system/user/profile/updatePwd', {})
}
""",
        )
        _write(
            fe_dir / "course.ts",
            """
import http from '@/utils/request'

export function saveSchedule() {
  return http.post('/course/schedule', {})
}
""",
        )
        _write(
            be_dir / "SysProfileController.java",
            """
@RestController
@RequestMapping("/system/user/profile")
public class SysProfileController {
    @PutMapping("/updatePwd")
    public AjaxResult updatePwd(@RequestBody java.util.Map<String, String> params) { return null; }
}
""",
        )

        _write(
            tickets_dir / "T-001.yaml",
            """
id: T-001
story_id: S-001
allowed_paths:
  read:
    - osg-frontend/packages/shared/src/api/user.ts
  modify: []
""",
        )
        _write(
            testing_dir / "permission-test-cases.yaml",
            """
- tc_id: TC-PERMISSION-T-001-TICKET-001
  level: ticket
  story_id: S-001
  ticket_id: T-001
  ac_ref: AC-S-001-01
""",
        )

        frontend_files = resolve_module_frontend_files(
            project_root=root,
            module="permission",
        )
        assert frontend_files == [fe_dir / "user.ts"], frontend_files

        findings = evaluate_api_parity(
            frontend_dirs=[fe_dir],
            backend_dirs=[be_dir],
            frontend_files=frontend_files,
        )
        assert not findings, f"unrelated course API should be ignored by module scope: {findings}"


def test_normalize_path() -> None:
    assert normalize_path("/system/role/") == "system/role"
    assert normalize_path("/system/role/${roleId}") == "system/role/{param}"
    assert normalize_path("SYSTEM/ROLE") == "system/role"


def main() -> int:
    tests = [
        test_frontend_put_missing_backend_fails,
        test_matching_frontend_backend_passes,
        test_get_mismatch_does_not_block,
        test_logout_is_ignored_as_framework_handled_endpoint,
        test_module_frontend_file_scope_ignores_unrelated_api_files,
        test_normalize_path,
    ]
    for test in tests:
        test()
    print(f"PASS: api_operation_parity_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
