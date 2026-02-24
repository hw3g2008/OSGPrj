#!/usr/bin/env python3
"""
Story 运行态守护脚本

校验运行时 STATE.yaml 的一致性：
1. workflow 三元组一致性（current_step / next_step / next_requires_approval）
2. phase-proof 存在性（story_split / ticket_split 完成后必须有 proof）
3. 审批标记与 config.approval 一致性
4. Stories/Tickets 文件计数与 STATE.yaml 一致
"""

import sys
import yaml
import json
from pathlib import Path

# ============================================
# 配置
# ============================================
PROJECT_ROOT = Path(__file__).resolve().parents[4]
STATE_PATH = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "STATE.yaml"
CONFIG_PATH = PROJECT_ROOT / ".claude" / "project" / "config.yaml"
SM_PATH = PROJECT_ROOT / ".claude" / "skills" / "workflow-engine" / "state-machine.yaml"
STORIES_DIR = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "stories"
TICKETS_DIR = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "tickets"
PROOFS_DIR = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "proofs"

# 审批配置键映射（与 SKILL.md §2 一致）
APPROVAL_CONFIG_KEYS = {
    "approve_brainstorm": "brainstorm_confirm",
    "approve_stories": "story_split",
    "approve_tickets": "ticket_split",
    "approve_story": "story_done",
    "next": "ticket_done",
}

# 需要 proof 的状态（当 current_step 为这些值时，对应 proof 必须存在）
PROOF_REQUIRED_STATES = {
    "stories_approved": "story_split",
    "ticket_split_done": "ticket_split",
    "tickets_approved": "ticket_split",
    "implementing": "ticket_split",
}


def load_yaml_file(path):
    """加载 YAML 文件"""
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def check_triplet_consistency(state, sm, config):
    """检查 workflow 三元组一致性"""
    print("\n--- 1. 三元组一致性 ---")
    issues = []

    workflow = state.get("workflow") or {}
    current_step = workflow.get("current_step")
    next_step = workflow.get("next_step")
    next_requires_approval = workflow.get("next_requires_approval", False)

    if not current_step:
        print("  ⚠️ workflow.current_step 为空，跳过三元组检查")
        return issues

    # 检查 next_step 与 state-machine 的 next_action 一致
    states_def = sm.get("states", {})
    if current_step in states_def:
        expected_next = states_def[current_step].get("next_action")
        if next_step != expected_next:
            msg = f"next_step 不一致: 期望 {expected_next}（来自 state-machine），实际 {next_step}"
            issues.append(msg)
            print(f"  ❌ {msg}")
        else:
            print(f"  ✅ next_step = {next_step} 与 state-machine 一致")
    else:
        print(f"  ⚠️ current_step '{current_step}' 不在 state-machine 定义中")

    # 检查 next_requires_approval 与 config.approval 一致
    approval = (config or {}).get("approval", {})
    if next_step and next_step in APPROVAL_CONFIG_KEYS:
        config_key = APPROVAL_CONFIG_KEYS[next_step]
        config_value = approval.get(config_key, "auto")
        expected_approval = config_value == "required"
        if next_requires_approval != expected_approval:
            msg = (
                f"next_requires_approval 不一致: 期望 {expected_approval}"
                f"（config.approval.{config_key}={config_value}），实际 {next_requires_approval}"
            )
            issues.append(msg)
            print(f"  ❌ {msg}")
        else:
            print(f"  ✅ next_requires_approval = {next_requires_approval} 与 config 一致")
    else:
        print(f"  ✅ next_step '{next_step}' 不需要审批检查")

    return issues


def check_proof_existence(state):
    """检查 phase-proof 存在性"""
    print("\n--- 2. Phase-proof 存在性 ---")
    issues = []

    workflow = state.get("workflow") or {}
    current_step = workflow.get("current_step", "")
    module = state.get("current_requirement", "")

    if not module:
        print("  ⚠️ current_requirement 为空，跳过 proof 检查")
        return issues

    if current_step in PROOF_REQUIRED_STATES:
        proof_type = PROOF_REQUIRED_STATES[current_step]

        if proof_type == "story_split":
            proof_path = PROOFS_DIR / module / "story_split_phase_proof.json"
            if proof_path.exists():
                print(f"  ✅ story_split proof 存在: {proof_path.relative_to(PROJECT_ROOT)}")
                # 校验 JSON 格式
                try:
                    with open(proof_path, "r", encoding="utf-8") as f:
                        proof = json.load(f)
                    if proof.get("status") != "passed":
                        msg = f"story_split proof status 非 passed: {proof.get('status')}"
                        issues.append(msg)
                        print(f"  ❌ {msg}")
                except json.JSONDecodeError as e:
                    msg = f"story_split proof JSON 解析失败: {e}"
                    issues.append(msg)
                    print(f"  ❌ {msg}")
            else:
                msg = f"缺少 story_split proof: {proof_path.relative_to(PROJECT_ROOT)}"
                issues.append(msg)
                print(f"  ❌ {msg}")

        if proof_type == "ticket_split":
            story_id = state.get("current_story", "")
            if story_id:
                proof_path = PROOFS_DIR / module / f"{story_id}_ticket_split_phase_proof.json"
                if proof_path.exists():
                    print(f"  ✅ ticket_split proof 存在: {proof_path.relative_to(PROJECT_ROOT)}")
                else:
                    msg = f"缺少 ticket_split proof: {proof_path.relative_to(PROJECT_ROOT)}"
                    issues.append(msg)
                    print(f"  ❌ {msg}")
            else:
                print("  ⚠️ current_story 为空，跳过 ticket_split proof 检查")
    else:
        print(f"  ✅ 当前状态 '{current_step}' 不需要 proof 检查")

    return issues


def check_file_count_consistency(state):
    """检查 Stories/Tickets 文件计数一致性"""
    print("\n--- 3. 文件计数一致性 ---")
    issues = []

    # Stories
    stories_in_state = state.get("stories") or []
    stories_on_disk = list(STORIES_DIR.glob("S-*.yaml")) if STORIES_DIR.exists() else []
    if len(stories_in_state) != len(stories_on_disk):
        msg = f"Stories 计数不一致: STATE={len(stories_in_state)}, disk={len(stories_on_disk)}"
        issues.append(msg)
        print(f"  ❌ {msg}")
    else:
        print(f"  ✅ Stories 计数一致: {len(stories_in_state)}")

    # Tickets
    tickets_in_state = state.get("tickets") or []
    tickets_on_disk = list(TICKETS_DIR.glob("T-*.yaml")) if TICKETS_DIR.exists() else []
    if len(tickets_in_state) != len(tickets_on_disk):
        msg = f"Tickets 计数不一致: STATE={len(tickets_in_state)}, disk={len(tickets_on_disk)}"
        issues.append(msg)
        print(f"  ❌ {msg}")
    else:
        print(f"  ✅ Tickets 计数一致: {len(tickets_in_state)}")

    # Stats 一致性
    stats = state.get("stats") or {}
    total_stories = stats.get("total_stories", 0)
    if total_stories != len(stories_in_state):
        msg = f"stats.total_stories ({total_stories}) != stories 列表长度 ({len(stories_in_state)})"
        issues.append(msg)
        print(f"  ❌ {msg}")

    return issues


def main():
    print("=" * 60)
    print("Story 运行态守护校验")
    print("=" * 60)

    # 加载文件
    state = load_yaml_file(STATE_PATH)
    if not state:
        print("\n❌ STATE.yaml 不存在或为空")
        return 1

    sm = load_yaml_file(SM_PATH)
    if not sm:
        print("\n❌ state-machine.yaml 不存在或为空")
        return 1

    config = load_yaml_file(CONFIG_PATH)

    all_issues = []

    # 1. 三元组一致性
    all_issues.extend(check_triplet_consistency(state, sm, config))

    # 2. Proof 存在性
    all_issues.extend(check_proof_existence(state))

    # 3. 文件计数一致性
    all_issues.extend(check_file_count_consistency(state))

    # 汇总
    print("\n" + "=" * 60)
    if all_issues:
        print(f"FAIL: {len(all_issues)} 个问题")
        for issue in all_issues:
            print(f"  - {issue}")
        print("=" * 60)
        return 1
    else:
        print("PASS: 运行态守护校验全部通过")
        print("=" * 60)
        return 0


if __name__ == "__main__":
    sys.exit(main())
