#!/usr/bin/env python3
"""
RPIV 工作流状态机模拟测试

模拟完整的工作流执行过程，验证状态转换逻辑。
"""

import yaml
from pathlib import Path

# ============================================
# 加载状态机定义
# ============================================
def load_state_machine():
    """加载 state-machine.yaml"""
    sm_path = Path(__file__).parent.parent / "state-machine.yaml"
    with open(sm_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)

# ============================================
# 模拟配置
# ============================================
MOCK_CONFIG = {
    "approval": {
        "story_split": "required",
        "ticket_split": "auto",
        "ticket_done": "auto",
        "story_done": "auto"
    }
}

# ============================================
# 状态机引擎（模拟实现）
# ============================================
class WorkflowEngine:
    def __init__(self, state_machine, config):
        self.sm = state_machine
        self.config = config
        self.current_step = "not_started"
        self.next_step = "brainstorm"
        self.current_story = None
        self.pending_stories = ["S-001", "S-002"]
        self.pending_tickets = {}  # story_id -> [ticket_ids]
        self.log = []

    def get_approval_config_key(self, action):
        """获取动作对应的审批配置键"""
        return self.sm.get("approval_config_keys", {}).get(action)

    def requires_approval(self, action):
        """判断动作是否需要审批"""
        config_key = self.get_approval_config_key(action)
        if not config_key:
            return False
        approval_value = self.config["approval"].get(config_key, "auto")
        return approval_value == "required"

    def get_command(self, action):
        """获取动作对应的命令"""
        cmd = self.sm["action_to_command"].get(action)
        if cmd and "{current_story}" in cmd:
            cmd = cmd.replace("{current_story}", self.current_story or "S-XXX")
        return cmd

    def execute_command(self, command):
        """模拟执行命令"""
        self.log.append(f"执行: {command}")

        # 模拟命令完成后的状态更新
        if command == "/brainstorm":
            return "brainstorm_done"
        elif command == "/split story":
            return "story_split_done"
        elif command.startswith("/split ticket"):
            # 模拟生成 tickets
            self.pending_tickets[self.current_story] = ["T-001", "T-002", "T-003"]
            return "ticket_split_done"
        elif command == "/approve stories":
            self.current_story = self.pending_stories[0] if self.pending_stories else None
            return "stories_approved"
        elif command == "/approve tickets":
            return "tickets_approved"
        elif command == "/next":
            # 模拟执行 ticket
            if self.current_story and self.pending_tickets.get(self.current_story):
                self.pending_tickets[self.current_story].pop(0)
                if not self.pending_tickets[self.current_story]:
                    return "all_tickets_done"
            return "ticket_done"
        elif command.startswith("/verify"):
            return "story_done"
        elif command.startswith("/approve S-"):
            # 完成当前 story
            if self.current_story in self.pending_stories:
                self.pending_stories.remove(self.current_story)
            if not self.pending_stories:
                return "all_stories_done"
            return "story_approved"

        return None

    def update_workflow(self, new_state):
        """更新工作流状态"""
        self.current_step = new_state
        state_def = self.sm["states"].get(new_state, {})
        self.next_step = state_def.get("next_action")
        self.log.append(f"状态更新: {new_state} → next: {self.next_step}")

    def handle_next_story(self):
        """处理 next_story 分支"""
        if self.pending_stories:
            self.current_story = self.pending_stories[0]
            self.current_step = "stories_approved"
            self.next_step = "split_ticket"
            self.log.append(f"切换到下一个 Story: {self.current_story}")
            return f"/split ticket {self.current_story}"
        else:
            self.current_step = "all_stories_done"
            self.next_step = None
            self.log.append("所有 Stories 已完成")
            return None

    def run_loop(self, max_iterations=50):
        """运行自动继续循环"""
        iteration = 0

        while iteration < max_iterations:
            iteration += 1
            self.log.append(f"\n--- 迭代 {iteration} ---")
            self.log.append(f"当前状态: {self.current_step}, 下一动作: {self.next_step}")

            # 检查是否结束
            if self.next_step is None:
                self.log.append("工作流结束")
                break

            # 检查是否需要审批
            if self.requires_approval(self.next_step):
                self.log.append(f"⚠️ 需要审批: {self.next_step} (config.approval.{self.get_approval_config_key(self.next_step)})")
                # 模拟用户审批
                self.log.append("用户执行审批...")

            # 特殊处理 next_story
            if self.next_step == "next_story":
                command = self.handle_next_story()
                if command is None:
                    break
            else:
                command = self.get_command(self.next_step)

            if command:
                new_state = self.execute_command(command)
                if new_state:
                    self.update_workflow(new_state)
            else:
                self.log.append(f"无法获取命令: {self.next_step}")
                break

        return iteration

# ============================================
# 测试用例
# ============================================
def test_full_workflow():
    """测试完整工作流"""
    sm = load_state_machine()
    engine = WorkflowEngine(sm, MOCK_CONFIG)

    print("=" * 60)
    print("RPIV 工作流模拟测试")
    print("=" * 60)
    print(f"初始状态: {engine.current_step}")
    print(f"待处理 Stories: {engine.pending_stories}")
    print(f"审批配置: {MOCK_CONFIG['approval']}")
    print("=" * 60)

    iterations = engine.run_loop()

    print("\n" + "=" * 60)
    print("执行日志:")
    print("=" * 60)
    for line in engine.log:
        print(line)

    print("\n" + "=" * 60)
    print("测试结果:")
    print("=" * 60)
    print(f"总迭代次数: {iterations}")
    print(f"最终状态: {engine.current_step}")
    print(f"剩余 Stories: {engine.pending_stories}")
    print(f"剩余 Tickets: {engine.pending_tickets}")

    # 验证
    assert engine.current_step == "all_stories_done", f"期望 all_stories_done，实际 {engine.current_step}"
    assert engine.next_step is None, f"期望 next_step=None，实际 {engine.next_step}"
    assert len(engine.pending_stories) == 0, f"期望无剩余 Stories，实际 {engine.pending_stories}"

    print("\n✅ 所有验证通过！")

def test_state_transitions():
    """测试状态转换表完整性"""
    sm = load_state_machine()

    print("\n" + "=" * 60)
    print("状态转换表验证")
    print("=" * 60)

    expected_transitions = [
        ("not_started", "brainstorm"),
        ("brainstorm_done", "split_story"),
        ("story_split_done", "approve_stories"),
        ("stories_approved", "split_ticket"),
        ("ticket_split_done", "approve_tickets"),
        ("tickets_approved", "next"),
        ("ticket_done", "next"),
        ("all_tickets_done", "verify"),
        ("story_done", "approve_story"),
        ("story_approved", "next_story"),
        ("all_stories_done", None),
    ]

    for state, expected_action in expected_transitions:
        actual_action = sm["states"][state]["next_action"]
        status = "✅" if actual_action == expected_action else "❌"
        print(f"{status} {state} → {actual_action} (期望: {expected_action})")
        assert actual_action == expected_action, f"状态 {state} 转换错误"

    print("\n✅ 状态转换表验证通过！")

def test_approval_config():
    """测试审批配置映射"""
    sm = load_state_machine()

    print("\n" + "=" * 60)
    print("审批配置映射验证")
    print("=" * 60)

    expected_mappings = {
        "approve_stories": "story_split",
        "approve_tickets": "ticket_split",
        "approve_story": "story_done",
        "next": "ticket_done",
    }

    for action, expected_key in expected_mappings.items():
        actual_key = sm["approval_config_keys"].get(action)
        status = "✅" if actual_key == expected_key else "❌"
        print(f"{status} {action} → config.approval.{actual_key} (期望: {expected_key})")
        assert actual_key == expected_key, f"动作 {action} 审批配置映射错误"

    print("\n✅ 审批配置映射验证通过！")

def test_command_mapping():
    """测试命令映射"""
    sm = load_state_machine()

    print("\n" + "=" * 60)
    print("命令映射验证")
    print("=" * 60)

    expected_commands = {
        "brainstorm": "/brainstorm",
        "split_story": "/split story",
        "approve_stories": "/approve stories",
        "split_ticket": "/split ticket {current_story}",
        "approve_tickets": "/approve tickets",
        "next": "/next",
        "verify": "/verify {current_story}",
        "approve_story": "/approve {current_story}",
        "next_story": None,
    }

    for action, expected_cmd in expected_commands.items():
        actual_cmd = sm["action_to_command"].get(action)
        status = "✅" if actual_cmd == expected_cmd else "❌"
        print(f"{status} {action} → {actual_cmd} (期望: {expected_cmd})")
        assert actual_cmd == expected_cmd, f"动作 {action} 命令映射错误"

    print("\n✅ 命令映射验证通过！")

# ============================================
# 主函数
# ============================================
if __name__ == "__main__":
    test_state_transitions()
    test_approval_config()
    test_command_mapping()
    test_full_workflow()

    print("\n" + "=" * 60)
    print("🎉 所有测试通过！状态机逻辑验证成功。")
    print("=" * 60)
