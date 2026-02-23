#!/usr/bin/env python3
"""
Story 命令别名一致性校验

全量扫描 .claude/commands/*.md + .windsurf/workflows/*.md，
校验主流程中禁用旧命令写法，兼容说明段允许旧别名。

已知别名映射：
- /split-ticket S-xxx → 主命令 /split ticket S-xxx
- /split-story → 主命令 /split story
"""

import re
import sys
from pathlib import Path

# ============================================
# 配置
# ============================================
PROJECT_ROOT = Path(__file__).resolve().parents[4]  # 从 tests/ 向上 4 级到项目根

SCAN_DIRS = [
    PROJECT_ROOT / ".claude" / "commands",
    PROJECT_ROOT / ".windsurf" / "workflows",
]

# 旧别名 → 主命令
ALIAS_RULES = [
    {
        "pattern": r"/split-ticket\b",
        "main_command": "/split ticket",
        "description": "/split-ticket → /split ticket",
    },
    {
        "pattern": r"/split-story\b",
        "main_command": "/split story",
        "description": "/split-story → /split story",
    },
]

# 允许旧别名出现的上下文（兼容说明段）
ALLOWED_CONTEXTS = [
    r"兼容",
    r"别名",
    r"alias",
    r"compat",
    r"旧写法",
    r"旧命令",
    r"description:",  # YAML frontmatter description 字段
]


def is_allowed_context(line, prev_lines):
    """检查该行或前 2 行是否包含兼容说明上下文"""
    context_pattern = "|".join(ALLOWED_CONTEXTS)
    # 检查当前行
    if re.search(context_pattern, line, re.IGNORECASE):
        return True
    # 检查前 2 行
    for prev in prev_lines[-2:]:
        if re.search(context_pattern, prev, re.IGNORECASE):
            return True
    return False


def scan_file(filepath, rules):
    """扫描单个文件，返回违规列表"""
    violations = []
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception as e:
        return [{"file": str(filepath), "line": 0, "message": f"读取失败: {e}"}]

    lines = content.split("\n")
    for i, line in enumerate(lines, 1):
        for rule in rules:
            matches = list(re.finditer(rule["pattern"], line))
            if matches:
                prev_lines = lines[max(0, i - 3):i - 1]
                if not is_allowed_context(line, prev_lines):
                    for match in matches:
                        violations.append({
                            "file": str(filepath.relative_to(PROJECT_ROOT)),
                            "line": i,
                            "column": match.start() + 1,
                            "found": match.group(),
                            "rule": rule["description"],
                            "context": line.strip(),
                        })
    return violations


def main():
    print("=" * 60)
    print("Story 命令别名一致性校验")
    print("=" * 60)

    # 收集所有 .md 文件
    md_files = []
    for scan_dir in SCAN_DIRS:
        if scan_dir.exists():
            md_files.extend(sorted(scan_dir.glob("*.md")))
            print(f"📁 {scan_dir.relative_to(PROJECT_ROOT)}: {len(list(scan_dir.glob('*.md')))} 个文件")
        else:
            print(f"⚠️ 目录不存在: {scan_dir.relative_to(PROJECT_ROOT)}")

    print(f"\n总计扫描 {len(md_files)} 个文件")
    print(f"检查 {len(ALIAS_RULES)} 条别名规则")
    print("-" * 60)

    # 扫描
    all_violations = []
    scanned = 0
    for filepath in md_files:
        violations = scan_file(filepath, ALIAS_RULES)
        all_violations.extend(violations)
        scanned += 1

    # 输出结果
    if all_violations:
        print(f"\n❌ 发现 {len(all_violations)} 处违规：\n")
        for v in all_violations:
            print(f"  {v['file']}:{v['line']}:{v['column']}")
            print(f"    发现: {v['found']}")
            print(f"    规则: {v['rule']}")
            print(f"    上下文: {v['context']}")
            print()
    else:
        print(f"\n✅ 扫描 {scanned} 个文件，未发现违规。")

    print("=" * 60)
    if all_violations:
        print(f"⚠️ {len(all_violations)} 处违规需要修复。")
        sys.exit(1)
    else:
        print("🎉 命令别名一致性校验通过！")

    return len(all_violations)


if __name__ == "__main__":
    main()
