#!/usr/bin/env python3
"""
Story 关键路径回归测试

覆盖 5 条 Story 关键路径：
1. approve 直通（跳过 CC review）
2. cc-pass（CC review 通过）
3. cc-fail-recover（CC review 失败 → 修复 → 重新验证）
4. auto-verify fail-recover（自动验收失败 → /verify 恢复）
5. next_story（完整第二个 Story 循环）
"""

import yaml
import sys
from pathlib import Path


def load_state_machine():
    """加载 state-machine.yaml"""
    sm_path = Path(__file__).parent.parent / "state-machine.yaml"
    with open(sm_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


MOCK_CONFIG = {
    "approval": {
        "story_split": "required",
        "ticket_split": "auto",
        "ticket_done": "auto",
        "story_done": "auto",
        "brainstorm_confirm": "required"
    }
}


class StoryRegressionEngine:
    """简化的 Story 阶段模拟引擎，从 stories_approved 开始"""

    def __init__(self, state_machine, config, stories=None):
        self.sm = state_machine
        self.config = config
        self.current_step = "stories_approved"
        self.next_step = "split_ticket"
        self.current_story = stories[0] if stories else "S-001"
        self.pending_stories = list(stories) if stories else ["S-001"]
        self.pending_tickets = {}
        self.trace = []  # 状态迁移轨迹

    def record(self, state):
        self.trace.append(state)

    def execute_command(self, command, override_result=None):
        """执行命令，返回新状态。override_result 用于模拟失败场景。"""
        if override_result:
            return override_result

        if command.startswith("/split ticket"):
            self.pending_tickets[self.current_story] = ["T-001", "T-002", "T-003"]
            return "ticket_split_done"
        elif command == "/approve tickets":
            return "tickets_approved"
        elif command == "/next":
            if self.current_story and self.pending_tickets.get(self.current_story):
                self.pending_tickets[self.current_story].pop(0)
                if not self.pending_tickets[self.current_story]:
                    return "all_tickets_done"
                return "implementing"
            return "ticket_done"
        elif command.startswith("/verify"):
            return "story_verified"
        elif command.startswith("/cc-review"):
            return "story_done"
        elif command.startswith("/approve S-") or command.startswith("/approve "):
            story_id = command.split()[-1]
            if story_id in self.pending_stories:
                self.pending_stories.remove(story_id)
            if not self.pending_stories:
                return "all_stories_done"
            return "story_approved"
        return None

    def update_state(self, new_state):
        self.current_step = new_state
        state_def = self.sm["states"].get(new_state, {})
        self.next_step = state_def.get("next_action")
        self.record(new_state)

    def handle_next_story(self):
        if self.pending_stories:
            self.current_story = self.pending_stories[0]
            self.current_step = "stories_approved"
            self.next_step = "split_ticket"
            self.record("stories_approved")
            return True
        else:
            self.current_step = "all_stories_done"
            self.next_step = None
            self.record("all_stories_done")
            return False

    def run_ticket_cycle(self, verify_override=None):
        """运行从 stories_approved 到 story_verified 的完整 Ticket 循环"""
        # split ticket
        cmd = f"/split ticket {self.current_story}"
        self.update_state(self.execute_command(cmd))

        # approve tickets
        self.update_state(self.execute_command("/approve tickets"))

        # /next 循环（3 tickets）
        while self.pending_tickets.get(self.current_story):
            result = self.execute_command("/next")
            if result == "all_tickets_done":
                self.update_state("all_tickets_done")
                # 自动验收
                if verify_override:
                    self.update_state(verify_override)
                else:
                    self.update_state("story_verified")
                break
            else:
                self.update_state(result)


# ============================================
# 测试路径 1: approve 直通（跳过 CC review）
# ============================================
def test_path_approve_direct():
    """stories_approved → ... → story_verified → /approve → all_stories_done"""
    sm = load_state_machine()
    engine = StoryRegressionEngine(sm, MOCK_CONFIG, ["S-001"])

    engine.run_ticket_cycle()
    assert engine.current_step == "story_verified", f"期望 story_verified，实际 {engine.current_step}"

    # 用户直接 /approve（跳过 CC review）
    engine.update_state(engine.execute_command(f"/approve {engine.current_story}"))
    assert engine.current_step == "all_stories_done", f"期望 all_stories_done，实际 {engine.current_step}"

    expected_trace = [
        "ticket_split_done", "tickets_approved",
        "implementing", "implementing", "all_tickets_done", "story_verified",
        "all_stories_done"
    ]
    assert engine.trace == expected_trace, f"轨迹不匹配:\n  期望: {expected_trace}\n  实际: {engine.trace}"
    print("✅ 路径 1: approve 直通 — 通过")


# ============================================
# 测试路径 2: cc-pass（CC review 通过）
# ============================================
def test_path_cc_pass():
    """stories_approved → ... → story_verified → /cc-review → story_done → /approve → all_stories_done"""
    sm = load_state_machine()
    engine = StoryRegressionEngine(sm, MOCK_CONFIG, ["S-001"])

    engine.run_ticket_cycle()
    assert engine.current_step == "story_verified"

    # CC review 通过
    engine.update_state(engine.execute_command(f"/cc-review {engine.current_story}"))
    assert engine.current_step == "story_done", f"期望 story_done，实际 {engine.current_step}"

    # /approve
    engine.update_state(engine.execute_command(f"/approve {engine.current_story}"))
    assert engine.current_step == "all_stories_done"

    expected_trace = [
        "ticket_split_done", "tickets_approved",
        "implementing", "implementing", "all_tickets_done", "story_verified",
        "story_done", "all_stories_done"
    ]
    assert engine.trace == expected_trace, f"轨迹不匹配:\n  期望: {expected_trace}\n  实际: {engine.trace}"
    print("✅ 路径 2: cc-pass — 通过")


# ============================================
# 测试路径 3: cc-fail-recover
# ============================================
def test_path_cc_fail_recover():
    """... → story_verified → /cc-review(fail) → verification_failed → /verify → story_verified → /approve"""
    sm = load_state_machine()
    engine = StoryRegressionEngine(sm, MOCK_CONFIG, ["S-001"])

    engine.run_ticket_cycle()
    assert engine.current_step == "story_verified"

    # CC review 失败
    engine.update_state("verification_failed")
    assert engine.current_step == "verification_failed"
    assert engine.next_step is None  # 暂停等用户修复

    # 用户修复后 /verify
    engine.update_state(engine.execute_command(f"/verify {engine.current_story}"))
    assert engine.current_step == "story_verified"

    # 再次 /approve
    engine.update_state(engine.execute_command(f"/approve {engine.current_story}"))
    assert engine.current_step == "all_stories_done"

    assert "verification_failed" in engine.trace, "轨迹应包含 verification_failed"
    assert engine.trace.count("story_verified") == 2, "story_verified 应出现 2 次"
    print("✅ 路径 3: cc-fail-recover — 通过")


# ============================================
# 测试路径 4: auto-verify fail-recover
# ============================================
def test_path_auto_verify_fail_recover():
    """... → all_tickets_done → verification_failed → /verify → story_verified → /approve"""
    sm = load_state_machine()
    engine = StoryRegressionEngine(sm, MOCK_CONFIG, ["S-001"])

    # 自动验收失败
    engine.run_ticket_cycle(verify_override="verification_failed")
    assert engine.current_step == "verification_failed"
    assert engine.next_step is None

    # 用户修复后 /verify
    engine.update_state(engine.execute_command(f"/verify {engine.current_story}"))
    assert engine.current_step == "story_verified"

    # /approve
    engine.update_state(engine.execute_command(f"/approve {engine.current_story}"))
    assert engine.current_step == "all_stories_done"

    assert "verification_failed" in engine.trace
    print("✅ 路径 4: auto-verify fail-recover — 通过")


# ============================================
# 测试路径 5: next_story（完整第二个 Story 循环）
# ============================================
def test_path_next_story():
    """S-001 完成 → story_approved → next_story → stories_approved → S-002 完整循环 → all_stories_done"""
    sm = load_state_machine()
    engine = StoryRegressionEngine(sm, MOCK_CONFIG, ["S-001", "S-002"])

    # --- Story 1 ---
    engine.run_ticket_cycle()
    assert engine.current_step == "story_verified"

    engine.update_state(engine.execute_command(f"/approve {engine.current_story}"))
    assert engine.current_step == "story_approved", f"期望 story_approved，实际 {engine.current_step}"
    assert engine.next_step == "next_story"

    # next_story 分支
    has_next = engine.handle_next_story()
    assert has_next is True
    assert engine.current_story == "S-002"
    assert engine.current_step == "stories_approved"

    # --- Story 2: 完整循环 ---
    engine.run_ticket_cycle()
    assert engine.current_step == "story_verified"

    engine.update_state(engine.execute_command(f"/approve {engine.current_story}"))
    assert engine.current_step == "all_stories_done"
    assert engine.next_step is None
    assert len(engine.pending_stories) == 0

    # 验证完整轨迹包含两个 Story 的完整循环
    assert engine.trace.count("ticket_split_done") == 2, "应有 2 次 ticket_split_done"
    assert engine.trace.count("tickets_approved") == 2, "应有 2 次 tickets_approved"
    assert engine.trace.count("all_tickets_done") == 2, "应有 2 次 all_tickets_done"
    assert engine.trace.count("story_verified") == 2, "应有 2 次 story_verified"
    assert "story_approved" in engine.trace, "应包含 story_approved"
    assert "stories_approved" in engine.trace, "应包含 stories_approved（next_story 分支）"
    assert engine.trace[-1] == "all_stories_done", "最终状态应为 all_stories_done"

    print("✅ 路径 5: next_story（完整第二个 Story 循环）— 通过")


# ============================================
# 测试路径 6: readiness 升级断言
# ============================================
def test_path_readiness_upgrade():
    """最后一个 Story 完成 → all_stories_done → module readiness 应升级"""
    import subprocess, tempfile, os
    sm = load_state_machine()

    # --- 单 Story 模块：完成后应 ready ---
    engine = StoryRegressionEngine(sm, MOCK_CONFIG, ["S-001"])
    engine.run_ticket_cycle()
    assert engine.current_step == "story_verified"

    engine.update_state(engine.execute_command(f"/approve {engine.current_story}"))
    assert engine.current_step == "all_stories_done"

    # 真实 registry 断言：调用 sync-module-readiness.py 并验证输出
    with tempfile.TemporaryDirectory() as td:
        readiness_path = os.path.join(td, "module-readiness.yaml")
        # 模拟 SRS 文件存在
        srs_dir = os.path.join(td, "srs")
        os.makedirs(srs_dir, exist_ok=True)
        with open(os.path.join(srs_dir, "test-module.md"), "w") as f:
            f.write("# Test SRS")

        project_root = str(Path(__file__).resolve().parents[4])
        result = subprocess.run(
            [sys.executable, os.path.join(project_root, "bin/sync-module-readiness.py"),
             "--module", "test-module",
             "--state-to", "all_stories_done",
             "--event-source", "/approve story",
             "--readiness", readiness_path,
             "--srs-base", srs_dir],
            capture_output=True, text=True, cwd=project_root
        )
        assert result.returncode == 0, f"sync-module-readiness failed: {result.stderr}"
        assert "READY" in result.stdout, f"Expected READY in output: {result.stdout}"

        # 读取并验证 registry 文件
        import yaml
        with open(readiness_path) as f:
            registry = yaml.safe_load(f)
        entry = registry["modules"]["test-module"]
        assert entry["hard_dependency_ready"] is True, f"Expected hard_dependency_ready=true, got {entry}"
        assert entry["delivery_state"] == "all_stories_done", f"Expected all_stories_done, got {entry}"
        assert entry["updated_from_event"] == "/approve story", f"Expected /approve story, got {entry}"
        print("  ✓ 单 Story 模块到达 all_stories_done — registry hard_dependency_ready=true 已验证")

    # --- 多 Story 模块：非最后 Story 完成时不应提前升级 ---
    engine2 = StoryRegressionEngine(sm, MOCK_CONFIG, ["S-001", "S-002"])
    engine2.run_ticket_cycle()
    engine2.update_state(engine2.execute_command(f"/approve {engine2.current_story}"))
    assert engine2.current_step == "story_approved", "非最后 Story 不应到达 all_stories_done"

    # 真实 registry 断言：story_approved 时不应 ready
    with tempfile.TemporaryDirectory() as td:
        readiness_path = os.path.join(td, "module-readiness.yaml")
        project_root = str(Path(__file__).resolve().parents[4])
        result = subprocess.run(
            [sys.executable, os.path.join(project_root, "bin/sync-module-readiness.py"),
             "--module", "test-module",
             "--state-to", "story_approved",
             "--event-source", "/approve story",
             "--readiness", readiness_path],
            capture_output=True, text=True, cwd=project_root
        )
        assert result.returncode == 0
        assert "NOT_READY" in result.stdout, f"Expected NOT_READY for story_approved: {result.stdout}"

        import yaml
        with open(readiness_path) as f:
            registry = yaml.safe_load(f)
        entry = registry["modules"]["test-module"]
        assert entry["hard_dependency_ready"] is False, f"Expected false for story_approved, got {entry}"
        print("  ✓ 多 Story 模块 story_approved — registry hard_dependency_ready=false 已验证")

    print("✅ 路径 6: readiness 升级断言（含 registry 验证）— 通过")


# ============================================
# 主函数
# ============================================
if __name__ == "__main__":
    print("=" * 60)
    print("Story 关键路径回归测试")
    print("=" * 60)

    tests = [
        test_path_approve_direct,
        test_path_cc_pass,
        test_path_cc_fail_recover,
        test_path_auto_verify_fail_recover,
        test_path_next_story,
        test_path_readiness_upgrade,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"❌ {test.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"❌ {test.__name__}: 异常 - {e}")
            failed += 1

    print("\n" + "=" * 60)
    print(f"结果: {passed} 通过, {failed} 失败")
    if failed == 0:
        print("🎉 所有 Story 关键路径回归测试通过！")
    else:
        print("⚠️ 有测试失败，请检查。")
        sys.exit(1)
    print("=" * 60)
