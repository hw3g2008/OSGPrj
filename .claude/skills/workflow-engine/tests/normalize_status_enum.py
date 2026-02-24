#!/usr/bin/env python3
"""
状态枚举迁移与校验脚本（§5.7）

双模式：
  --apply : 一次性迁移，把 completed 迁移为 done（仅批次 D 首次执行一次）
  --check : 持续校验，若仍发现 completed 直接失败

审计产物：osg-spec-docs/tasks/audit/enum-migration-report.json
"""

import sys
import json
import yaml
from pathlib import Path
from datetime import datetime, timezone

# ============================================
# 配置
# ============================================
PROJECT_ROOT = Path(__file__).resolve().parents[4]
STORIES_DIR = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "stories"
TICKETS_DIR = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "tickets"
AUDIT_DIR = PROJECT_ROOT / "osg-spec-docs" / "tasks" / "audit"
REPORT_PATH = AUDIT_DIR / "enum-migration-report.json"

FORBIDDEN = "completed"
REPLACEMENT = "done"


def scan_files(directory, pattern):
    """扫描目录下所有匹配文件，返回含 completed 的文件列表"""
    results = []
    if not directory.exists():
        return results
    for f in sorted(directory.glob(pattern)):
        try:
            with open(f, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
            if data and data.get("status") == FORBIDDEN:
                results.append(f)
        except Exception:
            pass
    return results


def apply_migration():
    """执行迁移：completed → done"""
    print("=" * 60)
    print("状态枚举迁移（--apply 模式）")
    print("=" * 60)

    migrated = []

    # Stories
    story_files = scan_files(STORIES_DIR, "S-*.yaml")
    for f in story_files:
        with open(f, "r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        data["status"] = REPLACEMENT
        with open(f, "w", encoding="utf-8") as fh:
            yaml.dump(data, fh, default_flow_style=False, allow_unicode=True)
        migrated.append({"file": str(f.relative_to(PROJECT_ROOT)), "type": "story", "field": "status"})
        print(f"  ✅ {f.name}: completed → done")

    # Tickets
    ticket_files = scan_files(TICKETS_DIR, "T-*.yaml")
    for f in ticket_files:
        with open(f, "r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        data["status"] = REPLACEMENT
        with open(f, "w", encoding="utf-8") as fh:
            yaml.dump(data, fh, default_flow_style=False, allow_unicode=True)
        migrated.append({"file": str(f.relative_to(PROJECT_ROOT)), "type": "ticket", "field": "status"})
        print(f"  ✅ {f.name}: completed → done")

    # 写审计报告
    AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    report = {
        "action": "apply",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "files_migrated": len(migrated),
        "fields_migrated": len(migrated),
        "details": migrated,
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\n📄 审计报告: {REPORT_PATH.relative_to(PROJECT_ROOT)}")
    print(f"📊 迁移文件数: {len(migrated)}")

    if not migrated:
        print("\n✅ 无需迁移（没有 completed 状态）")
    else:
        print(f"\n✅ 迁移完成: {len(migrated)} 个文件")

    return 0


def check_mode():
    """校验模式：发现 completed 直接失败"""
    print("=" * 60)
    print("状态枚举校验（--check 模式）")
    print("=" * 60)

    violations = []

    story_files = scan_files(STORIES_DIR, "S-*.yaml")
    for f in story_files:
        violations.append(f"{f.name}: status=completed")
        print(f"  ❌ {f.name}: status=completed")

    ticket_files = scan_files(TICKETS_DIR, "T-*.yaml")
    for f in ticket_files:
        violations.append(f"{f.name}: status=completed")
        print(f"  ❌ {f.name}: status=completed")

    print("\n" + "=" * 60)
    if violations:
        print(f"FAIL: {len(violations)} 个文件仍有 completed 状态")
        print("请先执行: python3 normalize_status_enum.py --apply")
        print("=" * 60)
        return 1
    else:
        print("PASS: 无 completed 状态")
        print("=" * 60)
        return 0


def main():
    if "--apply" in sys.argv:
        return apply_migration()
    elif "--check" in sys.argv:
        return check_mode()
    else:
        print("用法:")
        print("  python3 normalize_status_enum.py --apply   # 一次性迁移")
        print("  python3 normalize_status_enum.py --check   # 持续校验")
        return 2


if __name__ == "__main__":
    sys.exit(main())
