#!/usr/bin/env python3
"""
Done Ticket 证据守卫

目标：
1. 对当前 Story 的所有 done Ticket 强制要求 verification_evidence 存在且完整
2. 在验证阶段（all_tickets_done / story_verified / verification_failed / story_done）要求 Story 下所有 Ticket 必须为 done
"""

import argparse
import sys
from pathlib import Path

import yaml


PROJECT_ROOT = Path(__file__).resolve().parents[4]
STATE_PATH = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "STATE.yaml"
STORIES_DIR = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "stories"
TICKETS_DIR = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "tickets"

REQUIRE_ALL_DONE_STEPS = {
    "all_tickets_done",
    "story_verified",
    "verification_failed",
    "story_done",
    "story_approved",
    "all_stories_done",
}


def load_yaml(path: Path):
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def parse_args():
    parser = argparse.ArgumentParser(description="Done Ticket verification_evidence 守卫")
    parser.add_argument("--state", type=Path, default=STATE_PATH, help=f"STATE.yaml 路径 (默认: {STATE_PATH})")
    parser.add_argument("--stories-dir", type=Path, default=STORIES_DIR, help=f"Stories 目录 (默认: {STORIES_DIR})")
    parser.add_argument("--tickets-dir", type=Path, default=TICKETS_DIR, help=f"Tickets 目录 (默认: {TICKETS_DIR})")
    parser.add_argument("--story-id", type=str, default=None, help="指定 Story ID（默认从 STATE.current_story 读取）")
    return parser.parse_args()


def main():
    args = parse_args()

    print("=" * 60)
    print("Done Ticket 证据守卫")
    print("=" * 60)

    state = load_yaml(args.state)
    if not state:
        print(f"❌ STATE.yaml 不存在或为空: {args.state}")
        return 1

    workflow = state.get("workflow") or {}
    current_step = workflow.get("current_step")
    state_story_id = state.get("current_story")
    story_id = args.story_id or state_story_id

    if not story_id:
        print("SKIP: current_story 为空，当前无活跃 Story")
        return 0

    story_path = args.stories_dir / f"{story_id}.yaml"
    story = load_yaml(story_path)
    if not story:
        print(f"❌ Story 文件不存在或为空: {story_path}")
        return 1

    tickets = story.get("tickets") or []
    if not tickets:
        print(f"SKIP: {story_id} 尚无 tickets 列表")
        return 0

    require_all_done = current_step in REQUIRE_ALL_DONE_STEPS
    issues = []

    print(f"Story: {story_id}")
    print(f"当前状态: {current_step}")
    print(f"校验 Ticket 数: {len(tickets)}")
    if require_all_done:
        print("模式: 严格模式（要求所有 Ticket=done）")
    else:
        print("模式: 常规模式（仅校验 done Ticket 证据完整性）")

    for ticket_id in tickets:
        ticket_path = args.tickets_dir / f"{ticket_id}.yaml"
        ticket = load_yaml(ticket_path)
        if not ticket:
            issues.append(f"{ticket_id}: 文件不存在或为空 ({ticket_path})")
            continue

        status = ticket.get("status")
        if require_all_done and status != "done":
            issues.append(f"{ticket_id}: status={status}，当前阶段要求全部 done")

        if status == "done":
            evidence = ticket.get("verification_evidence")
            if not isinstance(evidence, dict):
                issues.append(f"{ticket_id}: status=done 但缺少 verification_evidence")
                continue

            command = evidence.get("command")
            if not isinstance(command, str) or not command.strip():
                issues.append(f"{ticket_id}: verification_evidence.command 缺失或为空")

            exit_code = evidence.get("exit_code")
            if exit_code != 0:
                issues.append(f"{ticket_id}: verification_evidence.exit_code={exit_code}，期望 0")

    print("\n" + "-" * 60)
    if issues:
        print(f"FAIL: {len(issues)} 个问题")
        for issue in issues:
            print(f"  - {issue}")
        print("=" * 60)
        return 1

    print("PASS: Done Ticket 证据守卫通过")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
