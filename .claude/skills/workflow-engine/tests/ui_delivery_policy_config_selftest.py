#!/usr/bin/env python3
"""Self-test for UI strict delivery policy machine truth and docs."""

from __future__ import annotations

from pathlib import Path

import yaml


REPO_ROOT = Path(__file__).resolve().parents[4]
CONFIG_PATH = REPO_ROOT / ".claude/project/config.yaml"
MACHINE_TRUTH_DOC = REPO_ROOT / "docs/一人公司框架/32_项目机器真值.md"
PROJECT_CONFIG_DOC = REPO_ROOT / "docs/一人公司框架/31_项目配置.md"


def _load_yaml(path: Path) -> dict:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def _assert_contains(path: Path, needle: str) -> None:
    content = path.read_text(encoding="utf-8")
    assert needle in content, f"{path}: missing `{needle}`"


def test_workflow_policy_blocks_superpowers_for_business_delivery() -> None:
    config = _load_yaml(CONFIG_PATH)
    workflow_policy = config.get("workflow_policy")
    assert isinstance(workflow_policy, dict), "workflow_policy must be mapping"
    assert workflow_policy.get("normal_business_delivery_forbid_superpowers") is True, (
        "workflow_policy.normal_business_delivery_forbid_superpowers must be true"
    )


def test_ui_delivery_policy_exists_with_required_keys() -> None:
    config = _load_yaml(CONFIG_PATH)
    policy = config.get("ui_delivery_policy")
    assert isinstance(policy, dict), "ui_delivery_policy must be mapping"

    expected_true_flags = [
        "strict_visual_contract",
        "forbid_diff_threshold_relaxation",
        "forbid_snapshot_bypass",
        "forbid_mask_waiver",
        "require_failure_evidence",
        "require_single_runtime_before_visual_gate",
    ]
    for key in expected_true_flags:
        assert policy.get(key) is True, f"ui_delivery_policy.{key} must be true"

    expected_chain = [
        "single_case_verify",
        "module_verify",
        "ui_visual_gate",
        "final_gate",
        "final_closure",
    ]
    assert policy.get("required_repair_chain") == expected_chain, (
        "ui_delivery_policy.required_repair_chain must match strict repair chain"
    )


def test_machine_truth_doc_explains_boundary_and_single_truth() -> None:
    _assert_contains(MACHINE_TRUTH_DOC, "config.yaml")
    _assert_contains(MACHINE_TRUTH_DOC, "superpowers")
    _assert_contains(MACHINE_TRUTH_DOC, "不得进入任何正常业务交付主链")
    _assert_contains(MACHINE_TRUTH_DOC, "ui_delivery_policy")
    _assert_contains(MACHINE_TRUTH_DOC, "single_case_verify")
    _assert_contains(MACHINE_TRUTH_DOC, "说明性文档只负责解释")


def test_project_config_doc_explains_boundary_and_single_truth() -> None:
    _assert_contains(PROJECT_CONFIG_DOC, "config.yaml")
    _assert_contains(PROJECT_CONFIG_DOC, "normal_business_delivery_forbid_superpowers")
    _assert_contains(PROJECT_CONFIG_DOC, "ui_delivery_policy")
    _assert_contains(PROJECT_CONFIG_DOC, "不得进入任何正常业务交付主链")
    _assert_contains(PROJECT_CONFIG_DOC, "single_case_verify")
    _assert_contains(PROJECT_CONFIG_DOC, "本文件是说明文档，不是第二规则源")


def main() -> int:
    tests = [
        test_workflow_policy_blocks_superpowers_for_business_delivery,
        test_ui_delivery_policy_exists_with_required_keys,
        test_machine_truth_doc_explains_boundary_and_single_truth,
        test_project_config_doc_explains_boundary_and_single_truth,
    ]
    for fn in tests:
        fn()
    print(f"PASS: ui_delivery_policy_config_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
