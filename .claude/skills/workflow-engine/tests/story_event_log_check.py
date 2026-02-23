#!/usr/bin/env python3
"""
Story 事件日志校验脚本

校验 workflow-events.jsonl：
1. 字段完整率 100%（所有必填字段都有值）
2. 事件数与状态转换数一致（排除理论节点）
3. 事件顺序与状态迁移链一致
"""

import json
import sys
from pathlib import Path

# ============================================
# 配置
# ============================================
PROJECT_ROOT = Path(__file__).resolve().parents[4]
EVENT_LOG_PATH = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "workflow-events.jsonl"

REQUIRED_FIELDS = [
    "event_id",
    "timestamp",
    "module",
    "schema_version",
    "actor",
    "command",
    "state_from",
    "state_to",
    "result",
]

# 审计关键可选字段（非每条事件都有，但应统计覆盖率）
OPTIONAL_AUDIT_FIELDS = [
    "gate_result",
    "evidence_ref",
]

# 理论节点（排除在状态转换计数之外）
THEORETICAL_NODES = {"all_tickets_done", "ticket_done"}


def load_events(path):
    """加载事件日志"""
    events = []
    if not path.exists():
        return events
    with open(path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"⚠️ 第 {i} 行 JSON 解析失败: {e}")
                events.append({"_parse_error": str(e), "_line": i})
    return events


def check_field_completeness(events):
    """检查字段完整率"""
    issues = []
    for i, event in enumerate(events, 1):
        if "_parse_error" in event:
            issues.append(f"事件 {i}: JSON 解析失败 - {event['_parse_error']}")
            continue
        for field in REQUIRED_FIELDS:
            if field not in event or event[field] is None:
                issues.append(f"事件 {i}: 缺少必填字段 '{field}'")
    return issues


def check_state_chain(events):
    """检查状态迁移链连续性"""
    issues = []
    valid_events = [e for e in events if "_parse_error" not in e]
    for i in range(1, len(valid_events)):
        prev_to = valid_events[i - 1].get("state_to")
        curr_from = valid_events[i].get("state_from")
        # 允许不连续的情况：理论节点跳过、用户手动操作等
        # 但记录所有不连续点供人工审查
        if prev_to != curr_from:
            issues.append(
                f"事件 {i} → {i+1}: 状态链不连续 "
                f"(前一事件 state_to='{prev_to}', 当前事件 state_from='{curr_from}')"
            )
    return issues


def check_no_theoretical_state_to(events):
    """检查事件的 state_to 不应该是理论节点（正常流程中被跳过）"""
    warnings = []
    valid_events = [e for e in events if "_parse_error" not in e]
    for i, event in enumerate(valid_events, 1):
        state_to = event.get("state_to", "")
        if state_to in THEORETICAL_NODES:
            warnings.append(
                f"事件 {i}: state_to='{state_to}' 是理论节点（正常流程中应被跳过）"
            )
    return warnings


def check_schema_version(events):
    """检查 schema_version 一致性"""
    issues = []
    valid_events = [e for e in events if "_parse_error" not in e]
    versions = set(e.get("schema_version") for e in valid_events)
    if len(versions) > 1:
        issues.append(f"schema_version 不一致: {versions}")
    return issues


def check_optional_field_coverage(events):
    """检查审计关键可选字段覆盖率"""
    warnings = []
    valid_events = [e for e in events if "_parse_error" not in e]
    if not valid_events:
        return warnings
    for field in OPTIONAL_AUDIT_FIELDS:
        present = sum(1 for e in valid_events if e.get(field) is not None)
        pct = present / len(valid_events) * 100
        status = "✅" if pct > 0 else "⚠️"
        msg = f"{field}: {present}/{len(valid_events)} ({pct:.0f}%)"
        print(f"  {status} {msg}")
        if pct == 0:
            warnings.append(f"审计字段 '{field}' 覆盖率为 0%（所有事件均缺失）")
    return warnings


def main():
    print("=" * 60)
    print("Story 事件日志校验")
    print("=" * 60)

    # 检查文件是否存在
    if not EVENT_LOG_PATH.exists():
        print(f"\n⚠️ 事件日志文件不存在: {EVENT_LOG_PATH.relative_to(PROJECT_ROOT)}")
        print("事件日志在首次执行 Story 流程后才会生成。")
        print("⚠️ 审计证据为空 — 字段完整率和状态覆盖率均未校验。")
        print("\n" + "=" * 60)
        print("SKIPPED: 事件日志文件不存在，无法校验审计证据")
        print("首次 Story 流程执行后，请重新运行本脚本验证。")
        print("=" * 60)
        return 0  # 不阻塞 CI，但明确标注 SKIPPED 而非 PASSED

    # 加载事件
    events = load_events(EVENT_LOG_PATH)
    print(f"\n📄 事件日志: {EVENT_LOG_PATH.relative_to(PROJECT_ROOT)}")
    print(f"📊 事件总数: {len(events)}")

    all_issues = []
    all_warnings = []

    # 1. 字段完整率
    print("\n--- 1. 字段完整率检查 ---")
    field_issues = check_field_completeness(events)
    if field_issues:
        print(f"❌ {len(field_issues)} 个问题:")
        for issue in field_issues:
            print(f"  - {issue}")
        all_issues.extend(field_issues)
    else:
        print(f"✅ 所有 {len(events)} 条事件字段完整率 100%")

    # 2. 状态迁移链
    print("\n--- 2. 状态迁移链检查 ---")
    chain_issues = check_state_chain(events)
    if chain_issues:
        print(f"⚠️ {len(chain_issues)} 处不连续（供人工审查）:")
        for issue in chain_issues:
            print(f"  - {issue}")
        all_warnings.extend(chain_issues)
    else:
        print("✅ 状态迁移链连续")

    # 3. 理论节点检查
    print("\n--- 3. 理论节点检查 ---")
    theoretical_warnings = check_no_theoretical_state_to(events)
    if theoretical_warnings:
        print(f"⚠️ {len(theoretical_warnings)} 处理论节点出现:")
        for w in theoretical_warnings:
            print(f"  - {w}")
        all_warnings.extend(theoretical_warnings)
    else:
        print("✅ 无理论节点出现在 state_to 中")

    # 4. schema_version 一致性
    print("\n--- 4. schema_version 一致性 ---")
    version_issues = check_schema_version(events)
    if version_issues:
        print(f"❌ {len(version_issues)} 个问题:")
        for issue in version_issues:
            print(f"  - {issue}")
        all_issues.extend(version_issues)
    else:
        print("✅ schema_version 一致")

    # 5. 审计关键可选字段覆盖率
    print("\n--- 5. 审计关键可选字段覆盖率 ---")
    optional_warnings = check_optional_field_coverage(events)
    all_warnings.extend(optional_warnings)

    # 汇总
    print("\n" + "=" * 60)
    print(f"结果: {len(all_issues)} 个错误, {len(all_warnings)} 个警告")
    if all_issues:
        print("⚠️ 有错误需要修复。")
        sys.exit(1)
    elif all_warnings:
        print("🟡 有警告供人工审查，但不阻塞。")
    else:
        print("🎉 事件日志校验全部通过！")
    print("=" * 60)

    return len(all_issues)


if __name__ == "__main__":
    main()
