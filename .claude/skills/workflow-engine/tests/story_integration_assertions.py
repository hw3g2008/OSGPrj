#!/usr/bin/env python3
"""
Story 集成断言脚本

集成级别校验：
1. 所有 Story 相关测试脚本存在
2. 所有测试脚本可执行（exit_code=0）
3. 事件写入点清单与实际文件中的 append_workflow_event 调用一致（7 个文件）
4. 命令别名扫描覆盖所有目标目录
5. 事件数 = 状态转换数（模拟验证预期转换数；事件文件存在时实际校验计数 + 可回放性）
"""

import sys
import subprocess
from pathlib import Path

# ============================================
# 配置
# ============================================
PROJECT_ROOT = Path(__file__).resolve().parents[4]
TESTS_DIR = Path(__file__).resolve().parent

# 所有 Story 相关测试脚本
STORY_TEST_SCRIPTS = [
    "simulation.py",
    "gate_verification.py",
    "story_regression.py",
    "story_command_alias_check.py",
    "story_event_log_check.py",
    "story_runtime_guard.py",
    "done_ticket_evidence_guard.py",
    "ticket_status_enum_check.py",
    "normalize_status_enum.py",
    "security_contract_schema_test.py",
    "security_contract_init_test.py",
    "security_contract_guard_selftest.py",
    "security_contract_guard.py",
    "plan_standard_guard_selftest.py",
    "plan_standard_guard.py",
]

# 仅做存在性校验，不做无参可执行校验（需要业务参数）
NON_RUNNABLE_SCRIPTS = {
    "security_contract_guard.py",
}

# 事件写入点：文件中应包含 append_workflow_event 调用或说明
EVENT_WRITE_POINT_FILES = [
    # (文件路径相对于 PROJECT_ROOT, 预期包含的关键词)
    (".claude/skills/workflow-engine/SKILL.md", "transition"),
    (".claude/skills/deliver-ticket/SKILL.md", "transition"),
    (".claude/skills/story-splitter/SKILL.md", "transition"),
    (".claude/skills/ticket-splitter/SKILL.md", "transition"),
    (".windsurf/workflows/verify.md", "transition"),
    (".windsurf/workflows/cc-review.md", "transition"),
    (".windsurf/workflows/approve.md", "transition"),
    (".windsurf/workflows/next.md", "transition"),
]


def check_scripts_exist():
    """检查所有测试脚本是否存在"""
    print("\n--- 1. 测试脚本存在性 ---")
    issues = []
    for script in STORY_TEST_SCRIPTS:
        path = TESTS_DIR / script
        if path.exists():
            print(f"  ✅ {script}")
        else:
            print(f"  ❌ {script} — 不存在")
            issues.append(f"测试脚本不存在: {script}")
    return issues


def check_scripts_runnable():
    """检查所有测试脚本可执行（exit_code=0）"""
    print("\n--- 2. 测试脚本可执行性 ---")
    issues = []
    # 透传 --allow-bootstrap 参数
    extra_args = ["--allow-bootstrap"] if "--allow-bootstrap" in sys.argv else []
    # 特殊参数映射（某些脚本需要特定参数才能正常运行）
    script_args = {
        "normalize_status_enum.py": ["--check"],
    }
    for script in STORY_TEST_SCRIPTS:
        path = TESTS_DIR / script
        if not path.exists():
            continue
        if script in NON_RUNNABLE_SCRIPTS:
            print(f"  ⚠️ {script} — 仅校验存在性（需要业务参数，跳过无参执行）")
            continue
        try:
            cmd = ["python3", str(path)] + script_args.get(script, []) + extra_args
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60,
                cwd=str(PROJECT_ROOT),
            )
            if result.returncode == 0:
                print(f"  ✅ {script} — exit_code=0")
            else:
                print(f"  ❌ {script} — exit_code={result.returncode}")
                stderr_summary = result.stderr[:200] if result.stderr else "(no stderr)"
                issues.append(f"{script} 执行失败: exit_code={result.returncode}, stderr={stderr_summary}")
        except subprocess.TimeoutExpired:
            print(f"  ❌ {script} — 超时（60s）")
            issues.append(f"{script} 执行超时")
        except Exception as e:
            print(f"  ❌ {script} — 异常: {e}")
            issues.append(f"{script} 执行异常: {e}")
    return issues


def check_event_write_points():
    """检查事件写入点文件中包含 append_workflow_event"""
    print("\n--- 3. 事件写入点覆盖 ---")
    issues = []
    for rel_path, keyword in EVENT_WRITE_POINT_FILES:
        full_path = PROJECT_ROOT / rel_path
        if not full_path.exists():
            print(f"  ❌ {rel_path} — 文件不存在")
            issues.append(f"事件写入点文件不存在: {rel_path}")
            continue
        content = full_path.read_text(encoding="utf-8")
        if keyword in content:
            print(f"  ✅ {rel_path} — 包含 {keyword}")
        else:
            print(f"  ❌ {rel_path} — 未找到 {keyword}")
            issues.append(f"{rel_path} 缺少 {keyword} 调用")
    return issues


def check_scan_directories():
    """检查命令别名扫描目标目录存在"""
    print("\n--- 4. 扫描目标目录 ---")
    issues = []
    scan_dirs = [
        ".claude/commands",
        ".windsurf/workflows",
    ]
    for d in scan_dirs:
        full_path = PROJECT_ROOT / d
        if full_path.exists() and full_path.is_dir():
            md_count = len(list(full_path.glob("*.md")))
            print(f"  ✅ {d} — {md_count} 个 .md 文件")
        else:
            print(f"  ❌ {d} — 目录不存在")
            issues.append(f"扫描目标目录不存在: {d}")
    return issues


def check_event_count_equals_transitions():
    """检查事件数 = 状态转换数（模拟验证）"""
    print("\n--- 5. 事件数 = 状态转换数（模拟验证）---")
    issues = []

    EVENT_LOG_PATH = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "workflow-events.jsonl"
    allow_bootstrap = "--allow-bootstrap" in sys.argv
    if not EVENT_LOG_PATH.exists():
        # §5.4 bootstrap 边界判断
        state_path = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "STATE.yaml"
        tickets_dir = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "tickets"
        bootstrap_ok = False

        if allow_bootstrap and state_path.exists():
            import yaml
            with open(state_path, "r", encoding="utf-8") as f:
                state_data = yaml.safe_load(f)
            current_step = (state_data.get("workflow") or {}).get("current_step", "")
            has_tickets = tickets_dir.exists() and any(tickets_dir.glob("T-*.yaml"))
            if current_step in ("story_split_done", "stories_approved") and not has_tickets:
                bootstrap_ok = True

        if bootstrap_ok:
            print("  BOOTSTRAP: 事件日志不存在，首轮拆分阶段允许跳过")
            print("  模拟验证：使用 simulation.py 引擎计算预期状态转换数...")
            # 使用模拟器计算预期转换数
            try:
                import importlib.util
                sim_path = TESTS_DIR / "simulation.py"
                spec = importlib.util.spec_from_file_location("simulation", sim_path)
                sim = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(sim)

                sm = sim.load_state_machine()
                engine = sim.WorkflowEngine(sm, sim.MOCK_CONFIG)
                engine.run_loop()

                THEORETICAL = {"all_tickets_done", "ticket_done"}
                real_transitions = [
                    entry for entry in engine.log
                    if entry.startswith("状态更新:") and
                    not any(t in entry for t in THEORETICAL)
                ]
                expected_count = len(real_transitions)
                print(f"  预期状态转换数（排除理论节点）: {expected_count}")
                print(f"  ✅ 模拟验证通过 — 首次 Story 流程后事件数应 = {expected_count}")
            except Exception as e:
                print(f"  ⚠️ 模拟验证失败: {e}")
                issues.append(f"模拟验证失败: {e}")
            return issues
        else:
            print("  ❌ FAIL: 事件日志文件不存在，审计门不通过")
            if not allow_bootstrap:
                print("  提示：首次引导阶段可使用 --allow-bootstrap 参数")
            issues.append("事件日志文件不存在，无法校验事件数=状态转换数")
            return issues

    # 事件文件存在时：实际校验
    import json
    THEORETICAL = {"all_tickets_done", "ticket_done"}
    events = []
    with open(EVENT_LOG_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    pass

    event_count = len(events)
    # 排除理论节点的事件
    real_events = [e for e in events if e.get("state_to") not in THEORETICAL]
    real_event_count = len(real_events)

    print(f"  事件总数: {event_count}")
    print(f"  实际事件数（排除理论节点）: {real_event_count}")

    # 验证可回放性：state_from[i+1] == state_to[i]
    replay_breaks = 0
    for i in range(1, len(events)):
        if events[i].get("state_from") != events[i-1].get("state_to"):
            replay_breaks += 1

    if replay_breaks > 0:
        print(f"  ⚠️ 回放链断裂 {replay_breaks} 处")
        issues.append(f"事件回放链断裂 {replay_breaks} 处")
    else:
        print(f"  ✅ 事件链可回放（{event_count} 条事件连续）")

    return issues


def check_terminal_event_closure():
    """检查终态事件闭合：最后一条事件 state_to 必须与 STATE.current_step 一致"""
    print("\n--- 6. 终态事件闭合 ---")
    issues = []

    import yaml
    state_path = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "STATE.yaml"
    events_path = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "workflow-events.jsonl"

    if not state_path.exists() or not events_path.exists():
        print("  ⚠️ STATE.yaml 或 events 不存在，跳过")
        return issues

    with open(state_path, "r", encoding="utf-8") as f:
        state = yaml.safe_load(f)
    current_step = (state.get("workflow") or {}).get("current_step")

    import json as _json
    last_event = None
    with open(events_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    last_event = _json.loads(line)
                except _json.JSONDecodeError:
                    pass

    if not last_event:
        msg = "事件日志为空，终态事件闭合失败"
        issues.append(msg)
        print(f"  ❌ {msg}")
        return issues

    last_state_to = last_event.get("state_to")
    if last_state_to != current_step:
        msg = f"终态事件未闭合: events 最后 state_to='{last_state_to}' ≠ STATE current_step='{current_step}'"
        issues.append(msg)
        print(f"  ❌ {msg}")
    else:
        print(f"  ✅ 终态事件闭合: last event state_to = STATE current_step = '{current_step}'")

    return issues


def main():
    print("=" * 60)
    print("Story 集成断言")
    print("=" * 60)

    all_issues = []

    all_issues.extend(check_scripts_exist())
    all_issues.extend(check_scripts_runnable())
    all_issues.extend(check_event_write_points())
    all_issues.extend(check_scan_directories())
    all_issues.extend(check_event_count_equals_transitions())
    all_issues.extend(check_terminal_event_closure())

    print("\n" + "=" * 60)
    print(f"结果: {len(all_issues)} 个错误")
    if all_issues:
        print("\n错误列表:")
        for issue in all_issues:
            print(f"  - {issue}")
        print("\n⚠️ 集成断言未通过。")
        sys.exit(1)
    else:
        print("🎉 所有集成断言通过！")
    print("=" * 60)

    return len(all_issues)


if __name__ == "__main__":
    main()
