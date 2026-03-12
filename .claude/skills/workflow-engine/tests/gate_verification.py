#!/usr/bin/env python3
"""
RPIV 工作流状态机 - 门控验证测试

验证每个环节结束时是否正确触发审批门控检查。
"""

import yaml
from pathlib import Path

# ============================================
# 加载状态机定义
# ============================================
def load_state_machine():
    sm_path = Path(__file__).parent.parent / "state-machine.yaml"
    with open(sm_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)

# ============================================
# 门控检查器
# ============================================
class GateChecker:
    def __init__(self, state_machine, config):
        self.sm = state_machine
        self.config = config
        self.gate_log = []

    def check_gate(self, current_state, next_action):
        """
        检查门控：每个状态转换前都必须经过此检查
        返回: (需要审批, 配置键, 配置值)
        """
        # 获取审批配置键
        approval_key = self.sm.get("approval_config_keys", {}).get(next_action)

        if approval_key is None:
            # 不在审批映射表中 = 不需要审批
            result = {
                "state": current_state,
                "action": next_action,
                "approval_key": None,
                "config_value": None,
                "requires_approval": False,
                "reason": "不在审批映射表中，自动继续"
            }
        else:
            # 在审批映射表中，检查配置值
            config_value = self.config["approval"].get(approval_key, "auto")
            requires_approval = (config_value == "required")
            result = {
                "state": current_state,
                "action": next_action,
                "approval_key": approval_key,
                "config_value": config_value,
                "requires_approval": requires_approval,
                "reason": f"config.approval.{approval_key} = {config_value}"
            }

        self.gate_log.append(result)
        return result

    def print_gate_log(self):
        """打印门控检查日志"""
        print("\n" + "=" * 80)
        print("门控检查详细日志")
        print("=" * 80)

        for i, gate in enumerate(self.gate_log, 1):
            status = "🚫 需要审批" if gate["requires_approval"] else "✅ 自动继续"
            print(f"\n[门控 {i}] {gate['state']} → {gate['action']}")
            print(f"  状态: {status}")
            print(f"  原因: {gate['reason']}")
            if gate["approval_key"]:
                print(f"  配置键: config.approval.{gate['approval_key']}")
                print(f"  配置值: {gate['config_value']}")

# ============================================
# 完整工作流模拟（带门控检查）
# ============================================
class WorkflowSimulator:
    def __init__(self, state_machine, config):
        self.sm = state_machine
        self.config = config
        self.gate_checker = GateChecker(state_machine, config)

        # 状态
        self.current_step = "not_started"
        self.next_step = "brainstorm"
        self.current_story = None
        self.pending_stories = ["S-001", "S-002"]
        self.pending_tickets = {}

        # 日志
        self.execution_log = []

    def _get_decisions_source(self):
        """读取 {module}-DECISIONS.md 中的 source 字段（模拟实现，默认 phase4）"""
        return getattr(self, '_decisions_source', 'phase4')

    def get_next_action(self):
        """获取当前状态的下一个动作"""
        state_def = self.sm["states"].get(self.current_step, {})
        return state_def.get("next_action")

    def execute_command(self, command):
        """模拟执行命令，返回新状态"""
        if command == "/brainstorm":
            if not hasattr(self, '_brainstorm_done'):
                self._brainstorm_done = True
                return "brainstorm_pending_confirm"
            return "brainstorm_done"
        elif command == "/approve brainstorm":
            # 根据 DECISIONS.md source 区分处理路径
            source = self._get_decisions_source()  # 读取 {module}-DECISIONS.md 中的 source
            if source == "phase0":
                # phase0: 更新 PRD 后重新执行 /brainstorm（由 brainstorm 管理最终状态）
                return self.execute_command("/brainstorm")
            elif source == "phase1_dependency":
                # phase1_dependency: 按裁决结果处理（模拟"纳入范围"→重新 brainstorm）
                decision = getattr(self, '_dependency_decision', 'include_in_scope')
                if decision == "do_upstream_first":
                    return "not_started"  # 终止，切换模块
                else:
                    # 纳入范围 或 降级处理 → 重新 brainstorm
                    return self.execute_command("/brainstorm")
            else:
                # phase4: 跳过语义，直接 brainstorm_done
                return "brainstorm_done"
        elif command == "/split story":
            return "story_split_done"
        elif command.startswith("/split ticket"):
            self.pending_tickets[self.current_story] = ["T-001", "T-002", "T-003"]
            return "ticket_split_done"
        elif command == "/approve stories":
            self.current_story = self.pending_stories[0] if self.pending_stories else None
            return "stories_approved"
        elif command == "/approve tickets":
            return "tickets_approved"
        elif command == "/next":
            if self.current_story and self.pending_tickets.get(self.current_story):
                self.pending_tickets[self.current_story].pop(0)
                if not self.pending_tickets[self.current_story]:
                    return "all_tickets_done"
                return "implementing"
            return "ticket_done"  # 理论回退节点，仅用于兼容测试场景
        elif command.startswith("/verify"):
            return "story_verified"
        elif command.startswith("/approve S-"):
            if self.current_story in self.pending_stories:
                self.pending_stories.remove(self.current_story)
            if not self.pending_stories:
                return "all_stories_done"
            return "story_approved"
        return None

    def get_command(self, action):
        """获取动作对应的命令"""
        cmd = self.sm["action_to_command"].get(action)
        if cmd and "{current_story}" in cmd:
            cmd = cmd.replace("{current_story}", self.current_story or "S-XXX")
        return cmd

    def run(self, max_iterations=50):
        """运行完整工作流"""
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            # 获取下一个动作
            next_action = self.next_step

            if next_action is None:
                # story_verified 是用户选择节点，模拟用户执行 /approve
                if self.current_step == "story_verified":
                    command = f"/approve {self.current_story}"
                    new_state = self.execute_command(command)
                    self.current_step = new_state
                    state_def = self.sm["states"].get(new_state, {})
                    self.next_step = state_def.get("next_action")
                    self.execution_log.append({
                        "iteration": iteration,
                        "state": "story_verified",
                        "action": "approve (user choice)",
                        "command": command,
                        "new_state": new_state,
                        "gate_check": self.gate_checker.check_gate("story_verified", "approve_story"),
                        "result": f"用户选择 /approve → {new_state}"
                    })
                    continue
                self.execution_log.append({
                    "iteration": iteration,
                    "state": self.current_step,
                    "action": None,
                    "result": "工作流结束"
                })
                break

            # ========================================
            # 关键：门控检查（每个环节必须经过）
            # ========================================
            gate_result = self.gate_checker.check_gate(self.current_step, next_action)

            # 记录执行日志
            log_entry = {
                "iteration": iteration,
                "state": self.current_step,
                "action": next_action,
                "gate_check": gate_result,
            }

            # 如果需要审批，模拟用户审批
            if gate_result["requires_approval"]:
                log_entry["approval"] = "用户审批通过"

            # 特殊处理 next_story
            if next_action == "next_story":
                if self.pending_stories:
                    self.current_story = self.pending_stories[0]
                    self.current_step = "stories_approved"
                    self.next_step = "split_ticket"
                    log_entry["result"] = f"切换到 Story: {self.current_story}"
                    self.execution_log.append(log_entry)
                    continue
                else:
                    self.current_step = "all_stories_done"
                    self.next_step = None
                    log_entry["result"] = "所有 Stories 完成"
                    self.execution_log.append(log_entry)
                    break

            # 执行命令
            command = self.get_command(next_action)
            if command:
                new_state = self.execute_command(command)
                log_entry["command"] = command
                log_entry["new_state"] = new_state

                # 更新状态
                self.current_step = new_state
                state_def = self.sm["states"].get(new_state, {})
                self.next_step = state_def.get("next_action")

                log_entry["result"] = f"执行成功 → {new_state}"
            else:
                log_entry["result"] = f"无法获取命令"
                break

            self.execution_log.append(log_entry)

        return iteration

    def print_execution_log(self):
        """打印执行日志"""
        print("\n" + "=" * 80)
        print("工作流执行日志（含门控检查）")
        print("=" * 80)

        for entry in self.execution_log:
            print(f"\n[迭代 {entry['iteration']}]")
            print(f"  当前状态: {entry['state']}")
            print(f"  下一动作: {entry['action']}")

            if entry.get('gate_check'):
                gc = entry['gate_check']
                gate_status = "🚫 需要审批" if gc['requires_approval'] else "✅ 自动继续"
                print(f"  门控检查: {gate_status}")
                if gc['approval_key']:
                    print(f"    - 配置键: config.approval.{gc['approval_key']}")
                    print(f"    - 配置值: {gc['config_value']}")
                else:
                    print(f"    - 原因: {gc['reason']}")

            if entry.get('approval'):
                print(f"  审批: {entry['approval']}")

            if entry.get('command'):
                print(f"  执行命令: {entry['command']}")

            print(f"  结果: {entry['result']}")

# ============================================
# 验证门控覆盖率
# ============================================
def verify_gate_coverage(gate_checker, state_machine):
    """验证所有可能的门控点是否都被检查到"""
    print("\n" + "=" * 80)
    print("门控覆盖率验证")
    print("=" * 80)

    # 所有需要门控检查的动作
    all_gated_actions = set(state_machine.get("approval_config_keys", {}).keys())

    # 实际检查过的动作
    checked_actions = set()
    for gate in gate_checker.gate_log:
        if gate["approval_key"]:
            checked_actions.add(gate["action"])

    print(f"\n需要门控的动作: {all_gated_actions}")
    print(f"已检查的动作: {checked_actions}")

    # 验证覆盖
    missing = all_gated_actions - checked_actions
    if missing:
        print(f"\n❌ 未覆盖的门控点: {missing}")
        return False
    else:
        print(f"\n✅ 所有门控点都已覆盖！")
        return True

def verify_all_transitions_gated(gate_checker, execution_log):
    """验证每个状态转换都经过了门控检查"""
    print("\n" + "=" * 80)
    print("状态转换门控验证")
    print("=" * 80)

    all_passed = True
    for entry in execution_log:
        if entry.get('action') is None:
            continue

        has_gate_check = entry.get('gate_check') is not None
        status = "✅" if has_gate_check else "❌"
        print(f"{status} {entry['state']} → {entry['action']}: 门控检查={'是' if has_gate_check else '否'}")

        if not has_gate_check:
            all_passed = False

    if all_passed:
        print(f"\n✅ 所有状态转换都经过了门控检查！")
    else:
        print(f"\n❌ 存在未经门控检查的状态转换！")

    return all_passed

# ============================================
# 主测试
# ============================================
def main():
    sm = load_state_machine()

    # 测试配置：story_split 需要审批，其他自动
    config = {
        "approval": {
            "story_split": "required",
            "ticket_split": "auto",
            "ticket_done": "auto",
            "story_done": "auto",
            "brainstorm_confirm": "required"
        }
    }

    print("=" * 80)
    print("RPIV 工作流门控验证测试")
    print("=" * 80)
    print(f"审批配置: {config['approval']}")

    # 运行模拟
    simulator = WorkflowSimulator(sm, config)
    iterations = simulator.run()

    # 打印执行日志
    simulator.print_execution_log()

    # 打印门控检查日志
    simulator.gate_checker.print_gate_log()

    # 验证门控覆盖率
    coverage_ok = verify_gate_coverage(simulator.gate_checker, sm)

    # 验证所有转换都经过门控
    transitions_ok = verify_all_transitions_gated(
        simulator.gate_checker,
        simulator.execution_log
    )

    # 统计
    print("\n" + "=" * 80)
    print("门控统计")
    print("=" * 80)

    total_gates = len(simulator.gate_checker.gate_log)
    approval_required = sum(1 for g in simulator.gate_checker.gate_log if g["requires_approval"])
    auto_continue = total_gates - approval_required

    print(f"总门控检查次数: {total_gates}")
    print(f"需要审批: {approval_required}")
    print(f"自动继续: {auto_continue}")

    # 按配置键统计
    print("\n按配置键统计:")
    key_stats = {}
    for gate in simulator.gate_checker.gate_log:
        key = gate["approval_key"] or "无需审批"
        if key not in key_stats:
            key_stats[key] = {"total": 0, "required": 0, "auto": 0}
        key_stats[key]["total"] += 1
        if gate["requires_approval"]:
            key_stats[key]["required"] += 1
        else:
            key_stats[key]["auto"] += 1

    for key, stats in key_stats.items():
        print(f"  {key}: 总计 {stats['total']} 次 (审批 {stats['required']}, 自动 {stats['auto']})")

    # 最终结果
    print("\n" + "=" * 80)
    if coverage_ok and transitions_ok:
        print("🎉 门控验证通过！每个环节都正确触发了门控检查。")
    else:
        print("❌ 门控验证失败！存在遗漏。")
    print("=" * 80)

if __name__ == "__main__":
    main()
