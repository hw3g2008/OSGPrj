#!/usr/bin/env python3
"""
Fail-closed guard for top plan docs standard-baseline consistency.
"""

from __future__ import annotations

import argparse
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[4]
STANDARD_BASELINE_LINE = "Standard Baseline: `docs/plans/FOUR-PACK-STANDARD.md`"
RELATION_SECTION_KEYWORD = "与上位标准关系"

DEFAULT_DOCS = [
    "docs/plans/2026-03-01-docker-runtime-architecture-design.md",
    "docs/plans/2026-03-02-e2e-framework-anti-false-green-fix-plan.md",
    "docs/plans/2026-03-02-prd-visual-contract-evolution-plan.md",
]


def evaluate_documents(repo_root: Path, docs: list[str]) -> list[str]:
    findings: list[str] = []
    for rel in docs:
        path = repo_root / rel
        if not path.exists():
            findings.append(f"{rel}: 文件不存在")
            continue
        content = path.read_text(encoding="utf-8")
        if STANDARD_BASELINE_LINE not in content:
            findings.append(f"{rel}: 缺少 `{STANDARD_BASELINE_LINE}`")
        if RELATION_SECTION_KEYWORD not in content:
            findings.append(f"{rel}: 缺少“{RELATION_SECTION_KEYWORD}”章节")
    return findings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Plan standard baseline guard")
    parser.add_argument("--repo-root", type=Path, default=PROJECT_ROOT)
    parser.add_argument("--docs", nargs="*", default=DEFAULT_DOCS)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = args.repo_root.resolve()
    findings = evaluate_documents(repo_root, args.docs)
    if findings:
        print(f"FAIL: plan_standard_guard found {len(findings)} issue(s)")
        for item in findings:
            print(f"  - {item}")
        return 1
    print(
        "PASS: plan_standard_guard "
        f"(docs={len(args.docs)}, baseline=`docs/plans/FOUR-PACK-STANDARD.md`)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
