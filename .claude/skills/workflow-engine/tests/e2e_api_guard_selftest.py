#!/usr/bin/env python3
"""
e2e_api_guard 自测脚本

目标:
1. 用临时违规样例验证 guard 确实能拦截。
2. 确保 guard 不是“永远返回 0”。
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path


def write_case(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> int:
    repo_root = Path(__file__).resolve().parents[4]
    guard = repo_root / ".claude/skills/workflow-engine/tests/e2e_api_guard.py"
    if not guard.exists():
        print(f"FAIL: guard not found: {guard}")
        return 2

    with tempfile.TemporaryDirectory(prefix="e2e-guard-selftest-") as td:
        tests_dir = Path(td) / "tests" / "e2e"

        write_case(
            tests_dir / "good.spec.ts",
            """
import { test, expect } from '@playwright/test'
import { assertRuoyiSuccess } from './support/auth'

test.describe('Good @api', () => {
  test('hard assert present', async ({ page }) => {
    const p = page.waitForResponse(() => true)
    await assertRuoyiSuccess(p, '/api/demo')
    expect(true).toBeTruthy()
  })
})
""".strip(),
        )

        write_case(
            tests_dir / "bad.spec.ts",
            """
import { test, expect } from '@playwright/test'

test.describe('Bad @api', () => {
  test('weak pattern', async ({ page }) => {
    const isOnLogin = await page.locator('input[type="password"]').isVisible().catch(() => false)
    if (isOnLogin) {
      return
    }
    const route = /dashboard|/login
    expect(route).toBeTruthy()
  })
})
""".strip(),
        )

        proc = subprocess.run(
            [sys.executable, str(guard), "--tests-dir", str(tests_dir)],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
        )

        output = (proc.stdout or "") + (proc.stderr or "")
        if proc.returncode == 0:
            print("FAIL: guard selftest expected non-zero, got 0")
            print(output)
            return 1

        required = [
            "forbidden login fallback URL pattern",
            "forbidden soft catch(() => false)",
            "forbidden 'isVisible() branch + return' pattern",
        ]
        missing = [item for item in required if item not in output]
        if missing:
            print("FAIL: guard selftest missing expected findings:")
            for item in missing:
                print(f"  - {item}")
            print(output)
            return 1

        print("PASS: e2e_api_guard_selftest")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
