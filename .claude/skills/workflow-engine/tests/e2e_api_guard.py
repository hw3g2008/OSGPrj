#!/usr/bin/env python3
"""
E2E API quality guard.

Purpose:
1. Fail fast when @api tests use weak/pass-through patterns.
2. Enforce at least one hard API assertion per @api test case.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Tuple


DESCRIBE_API_RE = re.compile(r"test\.describe\(.+@api")
TEST_DECL_RE = re.compile(r"^\s*test\(")
FORBID_URL_FALLBACK_RE = re.compile(r"\|\\?/login")
FORBID_SOFT_CATCH_RE = re.compile(r"catch\(\(\)\s*=>\s*false\)")
REQUIRE_ASSERT_RE = re.compile(
    r"assertRuoyiSuccess\(|loginAsAdmin\(|expect\(\s*response\.ok\(|toBe\(\s*200\s*\)"
)
VISIBLE_IF_RE = re.compile(r"if\s*\(\s*await.+isVisible\(")


@dataclass
class Finding:
    severity: str
    path: Path
    line: int
    message: str


def count_braces(line: str) -> int:
    return line.count("{") - line.count("}")


def collect_api_describe_blocks(lines: List[str]) -> List[Tuple[int, int]]:
    blocks: List[Tuple[int, int]] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not DESCRIBE_API_RE.search(line):
            i += 1
            continue

        start = i
        depth = count_braces(line)
        i += 1
        while i < len(lines) and depth > 0:
            depth += count_braces(lines[i])
            i += 1
        end = min(i - 1, len(lines) - 1)
        blocks.append((start, end))
    return blocks


def collect_test_blocks(lines: List[str], start: int, end: int) -> List[Tuple[int, int]]:
    blocks: List[Tuple[int, int]] = []
    i = start
    while i <= end:
        if not TEST_DECL_RE.search(lines[i]):
            i += 1
            continue

        t_start = i
        depth = count_braces(lines[i])
        i += 1
        while i <= end and depth > 0:
            depth += count_braces(lines[i])
            i += 1
        t_end = min(i - 1, end)
        blocks.append((t_start, t_end))
    return blocks


def scan_test_block(path: Path, lines: List[str], start: int, end: int) -> List[Finding]:
    findings: List[Finding] = []
    block_text = "\n".join(lines[start : end + 1])

    if not REQUIRE_ASSERT_RE.search(block_text):
        findings.append(
            Finding(
                severity="HIGH",
                path=path,
                line=start + 1,
                message="@api test missing hard API assertion (e.g. assertRuoyiSuccess / response.ok / code=200).",
            )
        )

    for idx in range(start, end + 1):
        line = lines[idx]
        if FORBID_URL_FALLBACK_RE.search(line):
            findings.append(
                Finding(
                    severity="HIGH",
                    path=path,
                    line=idx + 1,
                    message="forbidden login fallback URL pattern detected in @api test.",
                )
            )
        if FORBID_SOFT_CATCH_RE.search(line):
            findings.append(
                Finding(
                    severity="MEDIUM",
                    path=path,
                    line=idx + 1,
                    message="forbidden soft catch(() => false) detected in @api test.",
                )
            )
        if VISIBLE_IF_RE.search(line):
            window = "\n".join(lines[idx : min(idx + 8, end + 1)])
            if re.search(r"\breturn\b", window):
                findings.append(
                    Finding(
                        severity="HIGH",
                        path=path,
                        line=idx + 1,
                        message="forbidden 'isVisible() branch + return' pattern detected in @api test.",
                    )
                )

    return findings


def scan_file(path: Path) -> List[Finding]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    findings: List[Finding] = []

    api_blocks = collect_api_describe_blocks(lines)
    for d_start, d_end in api_blocks:
        test_blocks = collect_test_blocks(lines, d_start, d_end)
        if not test_blocks:
            findings.append(
                Finding(
                    severity="MEDIUM",
                    path=path,
                    line=d_start + 1,
                    message="@api describe block has no test() cases.",
                )
            )
            continue
        for t_start, t_end in test_blocks:
            findings.extend(scan_test_block(path, lines, t_start, t_end))

    return findings


def iter_spec_files(tests_dir: Path) -> Iterable[Path]:
    for path in sorted(tests_dir.rglob("*.spec.ts")):
        if path.is_file():
            yield path


def main() -> int:
    parser = argparse.ArgumentParser(description="E2E API static quality guard")
    parser.add_argument("--tests-dir", default="osg-frontend/tests/e2e")
    args = parser.parse_args()

    tests_dir = Path(args.tests_dir)
    if not tests_dir.exists():
        print(f"FAIL: tests dir not found: {tests_dir}")
        return 2

    all_findings: List[Finding] = []
    for spec in iter_spec_files(tests_dir):
        all_findings.extend(scan_file(spec))

    if all_findings:
        order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        all_findings.sort(key=lambda x: (order.get(x.severity, 9), str(x.path), x.line))
        print(f"FAIL: e2e_api_guard found {len(all_findings)} issue(s)")
        for f in all_findings:
            print(f"[{f.severity}] {f.path}:{f.line} - {f.message}")
        return 1

    print("PASS: e2e_api_guard")
    return 0


if __name__ == "__main__":
    sys.exit(main())
