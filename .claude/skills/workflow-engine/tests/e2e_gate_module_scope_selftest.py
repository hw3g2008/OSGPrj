#!/usr/bin/env python3
"""
e2e-api-gate 模块隔离自测

目标:
1. lead-mentor full gate 必须使用模块标签过滤，不能再兜底跑整套 admin 回归。
2. Playwright 配置必须识别 E2E_MODULE=lead-mentor，并切到 lead-mentor 的本地 preview 端口。
"""

from __future__ import annotations

from pathlib import Path


def fail(message: str) -> int:
    print(f"FAIL: {message}")
    return 1


def main() -> int:
    repo_root = Path(__file__).resolve().parents[4]
    gate_script = repo_root / "bin/e2e-api-gate.sh"
    playwright_config = repo_root / "osg-frontend/playwright.config.ts"

    if not gate_script.exists():
        return fail(f"missing gate script: {gate_script}")
    if not playwright_config.exists():
        return fail(f"missing playwright config: {playwright_config}")

    gate_content = gate_script.read_text(encoding="utf-8")
    if 'lead-mentor)' not in gate_content:
        return fail("e2e-api-gate.sh missing lead-mentor module branch")
    if '--grep "@lead-mentor"' not in gate_content:
        return fail("e2e-api-gate.sh missing lead-mentor grep filter")

    config_content = playwright_config.read_text(encoding="utf-8")
    required_fragments = [
        "process.env.E2E_MODULE",
        "case 'lead-mentor':",
        "http://127.0.0.1:4174",
        "packages/lead-mentor exec vite build",
    ]
    for fragment in required_fragments:
        if fragment not in config_content:
            return fail(f"playwright.config.ts missing fragment: {fragment}")

    print("PASS: e2e_gate_module_scope_selftest")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
