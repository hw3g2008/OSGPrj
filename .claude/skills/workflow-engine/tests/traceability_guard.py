#!/usr/bin/env python3
"""
Traceability Guard — 追踪链完整性校验

校验规则：
1. 每个 AC 至少映射 1 条 TC
2. 每条 TC 必须有 automation.command
3. 每条已执行 TC 必须有 latest_result.evidence_ref
4. YAML 用例主表中的 TC-ID 与追踪矩阵一致
"""

import sys
import argparse
import yaml
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[4]


def load_test_cases(path):
    """加载测试用例 YAML"""
    if not path.exists():
        print(f"  ❌ 用例文件不存在: {path}")
        return None
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data if isinstance(data, list) else []


def load_matrix_tc_ids(path):
    """从追踪矩阵 Markdown 提取 TC-ID 列表"""
    if not path.exists():
        print(f"  ❌ 矩阵文件不存在: {path}")
        return None
    tc_ids = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("|") and "TC-PERM-" in line:
                cols = [c.strip() for c in line.split("|")]
                for col in cols:
                    if col.startswith("TC-PERM-"):
                        tc_ids.append(col)
                        break
    return tc_ids


def check_ac_coverage(cases):
    """检查每个 AC 至少映射 1 条 TC"""
    print("\n--- 1. AC 覆盖率 ---")
    issues = []
    ac_map = {}
    for tc in cases:
        ac_ref = tc.get("ac_ref", "")
        if ac_ref:
            ac_map.setdefault(ac_ref, []).append(tc.get("tc_id", "?"))

    if not ac_map:
        msg = "无 AC 映射（用例表为空或缺少 ac_ref）"
        issues.append(msg)
        print(f"  ❌ {msg}")
    else:
        print(f"  ✅ {len(ac_map)} 个 AC 全部有对应 TC")

    return issues


def check_automation_command(cases):
    """检查每条 TC 必须有 automation.command"""
    print("\n--- 2. 自动化命令完整性 ---")
    issues = []
    missing = []
    for tc in cases:
        tc_id = tc.get("tc_id", "?")
        auto = tc.get("automation", {}) or {}
        cmd = auto.get("command", "")
        if not cmd:
            missing.append(tc_id)

    if missing:
        msg = f"{len(missing)} 条 TC 缺少 automation.command: {missing[:5]}"
        issues.append(msg)
        print(f"  ❌ {msg}")
    else:
        print(f"  ✅ {len(cases)} 条 TC 全部有 automation.command")

    return issues


VALID_STATUSES = {"pass", "fail", "skip_no_backend", "pending"}


def check_evidence_ref(cases):
    """检查 TC 状态合法性 + 已执行 TC 必须有 evidence_ref + pending 必须 FAIL"""
    print("\n--- 3. 执行证据完整性 + 状态校验 ---")
    issues = []
    missing_ref = []
    pending_tcs = []
    unknown_status = []
    skip_no_ref = []
    executed = 0

    for tc in cases:
        tc_id = tc.get("tc_id", "?")
        result = tc.get("latest_result", {}) or {}
        status = result.get("status", "pending")
        ref = result.get("evidence_ref")

        # 1. 未知状态 → FAIL
        if status not in VALID_STATUSES:
            unknown_status.append(f"{tc_id}({status})")
            continue

        # 2. pending → FAIL（必须先执行或标记 skip_no_backend）
        if status == "pending":
            pending_tcs.append(tc_id)
            continue

        # 3. skip_no_backend 必须带 evidence_ref
        if status == "skip_no_backend" and not ref:
            skip_no_ref.append(tc_id)

        # 4. 已执行（pass/fail/skip_no_backend）必须有 evidence_ref
        executed += 1
        if not ref:
            missing_ref.append(tc_id)

    if unknown_status:
        msg = f"{len(unknown_status)} 条 TC 状态非法（必须为 {VALID_STATUSES}）: {unknown_status[:5]}"
        issues.append(msg)
        print(f"  ❌ {msg}")

    if pending_tcs:
        msg = f"{len(pending_tcs)} 条 TC 仍为 pending（不可进入 final gate）: {pending_tcs[:5]}"
        issues.append(msg)
        print(f"  ❌ {msg}")

    if skip_no_ref:
        msg = f"{len(skip_no_ref)} 条 skip_no_backend TC 缺少 evidence_ref: {skip_no_ref[:5]}"
        issues.append(msg)
        print(f"  ❌ {msg}")

    if missing_ref:
        msg = f"{len(missing_ref)} 条已执行 TC 缺少 evidence_ref: {missing_ref[:5]}"
        issues.append(msg)
        print(f"  ❌ {msg}")

    if not issues:
        print(f"  ✅ {executed} 条已执行 TC 全部有 evidence_ref，0 pending，0 unknown")

    return issues


def check_matrix_consistency(cases, matrix_tc_ids):
    """检查 YAML TC-ID 与矩阵一致"""
    print("\n--- 4. YAML ↔ 矩阵一致性 ---")
    issues = []
    yaml_ids = set(tc.get("tc_id", "") for tc in cases)
    matrix_ids = set(matrix_tc_ids)

    only_yaml = yaml_ids - matrix_ids
    only_matrix = matrix_ids - yaml_ids

    if only_yaml:
        msg = f"仅在 YAML 中: {sorted(only_yaml)[:5]}"
        issues.append(msg)
        print(f"  ❌ {msg}")
    if only_matrix:
        msg = f"仅在矩阵中: {sorted(only_matrix)[:5]}"
        issues.append(msg)
        print(f"  ❌ {msg}")
    if not only_yaml and not only_matrix:
        print(f"  ✅ YAML({len(yaml_ids)}) ↔ 矩阵({len(matrix_ids)}) 完全一致")

    return issues


def parse_args():
    parser = argparse.ArgumentParser(description="Traceability Guard")
    parser.add_argument("--cases", type=Path, required=True,
                        help="测试用例 YAML 路径")
    parser.add_argument("--matrix", type=Path, required=True,
                        help="追踪矩阵 Markdown 路径")
    return parser.parse_args()


def main():
    args = parse_args()

    print("=" * 60)
    print("Traceability Guard — 追踪链完整性校验")
    print("=" * 60)

    cases = load_test_cases(args.cases)
    if cases is None:
        sys.exit(1)

    matrix_tc_ids = load_matrix_tc_ids(args.matrix)
    if matrix_tc_ids is None:
        sys.exit(1)

    all_issues = []
    all_issues.extend(check_ac_coverage(cases))
    all_issues.extend(check_automation_command(cases))
    all_issues.extend(check_evidence_ref(cases))
    all_issues.extend(check_matrix_consistency(cases, matrix_tc_ids))

    print("\n" + "=" * 60)
    if all_issues:
        print(f"FAIL: {len(all_issues)} 个问题")
        for issue in all_issues:
            print(f"  - {issue}")
        print("=" * 60)
        sys.exit(1)
    else:
        print(f"PASS: 追踪链完整性校验通过（{len(cases)} 条 TC）")
        print("=" * 60)


if __name__ == "__main__":
    main()
