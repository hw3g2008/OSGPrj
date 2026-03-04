#!/usr/bin/env python3
"""Regression tests for ui_visual_contract_guard style/state schema clauses."""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path
import textwrap


ROOT = Path(__file__).resolve().parents[4]
GUARD = ROOT / ".claude/skills/workflow-engine/tests/ui_visual_contract_guard.py"


def run_guard(yaml_content: str) -> subprocess.CompletedProcess[str]:
    with tempfile.TemporaryDirectory() as td:
        contract = Path(td) / "contract.yaml"
        contract.write_text(textwrap.dedent(yaml_content).strip() + "\n", encoding="utf-8")
        cmd = [
            "python3",
            str(GUARD),
            "--contract",
            str(contract),
            "--allow-missing-baseline",
        ]
        return subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)


def assert_pass(case_name: str, yaml_content: str) -> None:
    cp = run_guard(yaml_content)
    if cp.returncode != 0:
        raise AssertionError(
            f"{case_name} expected PASS but failed\n"
            f"stdout:\n{cp.stdout}\n"
            f"stderr:\n{cp.stderr}"
        )


def assert_fail(case_name: str, yaml_content: str, expected_hint: str) -> None:
    cp = run_guard(yaml_content)
    out = f"{cp.stdout}\n{cp.stderr}"
    if cp.returncode == 0:
        raise AssertionError(f"{case_name} expected FAIL but passed")
    if expected_hint not in out:
        raise AssertionError(
            f"{case_name} expected hint '{expected_hint}' not found\noutput:\n{out}"
        )


def main() -> int:
    valid_contract = """
    schema_version: 1
    module: permission
    pages:
      - page_id: login-page
        route: /login
        prototype_file: admin.html
        prototype_selector: "#login-page"
        viewport: { width: 1440, height: 900 }
        auth_mode: public
        snapshot_name: permission-login
        baseline_ref: osg-frontend/tests/e2e/visual-baseline/permission-login-page-1440x900.png
        diff_threshold: 0.03
        stable_wait_ms: 300
        required_anchors:
          - ".login-card"
          - ".login-form"
          - ".captcha-row"
          - ".submit-btn"
        style_contracts:
          - selector: ".login-card"
            property: border-radius
            expected: "12px"
          - selector: ".submit-btn"
            property: height
            expected: "52px"
            tolerance: 1
        state_cases:
          - state: focus
            target: ".login-input"
            assertion:
              type: css
              property: border-color
              value: rgb(99, 102, 241)
    """

    invalid_style_contract = """
    schema_version: 1
    module: permission
    pages:
      - page_id: login-page
        route: /login
        prototype_file: admin.html
        prototype_selector: "#login-page"
        viewport: { width: 1440, height: 900 }
        auth_mode: public
        snapshot_name: permission-login
        baseline_ref: osg-frontend/tests/e2e/visual-baseline/permission-login-page-1440x900.png
        diff_threshold: 0.03
        stable_wait_ms: 300
        required_anchors:
          - ".login-card"
          - ".login-form"
          - ".captcha-row"
          - ".submit-btn"
        style_contracts:
          - selector: ".login-card"
            expected: "12px"
    """

    invalid_state_contract = """
    schema_version: 1
    module: permission
    pages:
      - page_id: login-page
        route: /login
        prototype_file: admin.html
        prototype_selector: "#login-page"
        viewport: { width: 1440, height: 900 }
        auth_mode: public
        snapshot_name: permission-login
        baseline_ref: osg-frontend/tests/e2e/visual-baseline/permission-login-page-1440x900.png
        diff_threshold: 0.03
        stable_wait_ms: 300
        required_anchors:
          - ".login-card"
          - ".login-form"
          - ".captcha-row"
          - ".submit-btn"
        state_cases:
          - state: expanded
            target: ".login-input"
            assertion:
              type: visible
    """

    assert_pass("valid style/state schema", valid_contract)
    assert_fail("invalid style schema", invalid_style_contract, "style_contracts")
    assert_fail("invalid state schema", invalid_state_contract, "state_cases")

    print("PASS: ui_visual_contract_guard style/state schema tests")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
