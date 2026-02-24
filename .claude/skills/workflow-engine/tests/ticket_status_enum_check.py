#!/usr/bin/env python3
"""
Story/Ticket 状态枚举校验脚本

强制 Story/Ticket YAML 文件的 status 字段符合 §5.5 定义：
- Story: pending | approved | done | blocked
- Ticket: pending | in_progress | done | blocked

禁止出现 completed（已由 normalize_status_enum.py 迁移为 done）。
"""

import sys
import yaml
from pathlib import Path

# ============================================
# 配置
# ============================================
PROJECT_ROOT = Path(__file__).resolve().parents[4]
STORIES_DIR = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "stories"
TICKETS_DIR = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "tickets"

STORY_VALID_STATUS = {"pending", "approved", "done", "blocked"}
TICKET_VALID_STATUS = {"pending", "in_progress", "done", "blocked"}
FORBIDDEN_STATUS = {"completed"}


def check_story_status():
    """检查所有 Story YAML 的 status 字段"""
    print("\n--- 1. Story 状态枚举 ---")
    issues = []

    if not STORIES_DIR.exists():
        print("  ⚠️ stories 目录不存在，跳过")
        return issues

    story_files = sorted(STORIES_DIR.glob("S-*.yaml"))
    if not story_files:
        print("  ⚠️ 无 Story 文件，跳过")
        return issues

    for f in story_files:
        try:
            with open(f, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
            status = data.get("status", "")
            if status in FORBIDDEN_STATUS:
                msg = f"{f.name}: status='{status}' 禁止使用，应为 'done'"
                issues.append(msg)
                print(f"  ❌ {msg}")
            elif status not in STORY_VALID_STATUS:
                msg = f"{f.name}: status='{status}' 不在合法枚举 {STORY_VALID_STATUS}"
                issues.append(msg)
                print(f"  ❌ {msg}")
            else:
                print(f"  ✅ {f.name}: status='{status}'")
        except Exception as e:
            msg = f"{f.name}: 解析失败 {e}"
            issues.append(msg)
            print(f"  ❌ {msg}")

    return issues


def check_ticket_status():
    """检查所有 Ticket YAML 的 status 字段"""
    print("\n--- 2. Ticket 状态枚举 ---")
    issues = []

    if not TICKETS_DIR.exists():
        print("  ⚠️ tickets 目录不存在，跳过")
        return issues

    ticket_files = sorted(TICKETS_DIR.glob("T-*.yaml"))
    if not ticket_files:
        print("  ⚠️ 无 Ticket 文件，跳过")
        return issues

    for f in ticket_files:
        try:
            with open(f, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
            status = data.get("status", "")
            if status in FORBIDDEN_STATUS:
                msg = f"{f.name}: status='{status}' 禁止使用，应为 'done'"
                issues.append(msg)
                print(f"  ❌ {msg}")
            elif status not in TICKET_VALID_STATUS:
                msg = f"{f.name}: status='{status}' 不在合法枚举 {TICKET_VALID_STATUS}"
                issues.append(msg)
                print(f"  ❌ {msg}")
            else:
                print(f"  ✅ {f.name}: status='{status}'")
        except Exception as e:
            msg = f"{f.name}: 解析失败 {e}"
            issues.append(msg)
            print(f"  ❌ {msg}")

    return issues


def main():
    print("=" * 60)
    print("Story/Ticket 状态枚举校验")
    print("=" * 60)

    all_issues = []
    all_issues.extend(check_story_status())
    all_issues.extend(check_ticket_status())

    print("\n" + "=" * 60)
    if all_issues:
        print(f"FAIL: {len(all_issues)} 个枚举违规")
        for issue in all_issues:
            print(f"  - {issue}")
        print("=" * 60)
        return 1
    else:
        print("PASS: 状态枚举校验全部通过")
        print("=" * 60)
        return 0


if __name__ == "__main__":
    sys.exit(main())
