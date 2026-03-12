#!/usr/bin/env python3
"""
e2e-api-gate 回归脚本（最小版）

覆盖:
1. 后端不可达时 gate 必须非 0 退出（不能 PASS/SKIP）。
2. gate 脚本必须保留 proxy error 拦截逻辑（防回退）。
3. gate 不能硬编码 PW_E2E_REUSE_SERVER=0，否则会和已运行 preview 冲突。
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def fail(msg: str) -> int:
    print(f"FAIL: {msg}")
    return 1


def main() -> int:
    repo_root = Path(__file__).resolve().parents[4]
    gate_script = repo_root / "bin/e2e-api-gate.sh"
    if not gate_script.exists():
        return fail(f"missing gate script: {gate_script}")

    content = gate_script.read_text(encoding="utf-8")
    if "proxy error" not in content or "ECONNREFUSED" not in content:
        return fail("proxy error guard regex missing in e2e-api-gate.sh")
    if 'PW_E2E_REUSE_SERVER=0' in content:
        return fail("e2e-api-gate still hardcodes PW_E2E_REUSE_SERVER=0")

    env = os.environ.copy()
    env["BASE_URL"] = "http://127.0.0.1:9"
    env["BASE_HEALTH_URL"] = "http://127.0.0.1:9/actuator/health"
    env["E2E_WAIT_TIMEOUT_MS"] = "3000"
    env["PW_E2E_REUSE_SERVER"] = "0"

    proc = subprocess.run(
        ["bash", "bin/e2e-api-gate.sh", "permission", "api"],
        cwd=str(repo_root),
        env=env,
        capture_output=True,
        text=True,
    )

    output = (proc.stdout or "") + (proc.stderr or "")
    if proc.returncode == 0:
        print(output)
        return fail("gate should fail when backend is unreachable")

    if "FAIL: E2E command failed" not in output and "ECONNREFUSED" not in output and "proxy error" not in output:
        print(output)
        return fail("missing expected failure evidence for unreachable backend")

    print("PASS: e2e_gate_regression")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
