#!/usr/bin/env python3
"""SRS quality guard for module-level workflow hard gate."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

DEFAULT_SRS_DIR = "osg-spec-docs/docs/02-requirements/srs"
REQUIRED_ANCHORS = (
    "## §2 功能需求",
    "## §3 非功能需求",
    "## §5 接口清单",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="SRS quality guard")
    parser.add_argument("--module", required=True, help="Module name, e.g. permission")
    parser.add_argument("--srs-dir", default=DEFAULT_SRS_DIR, help="Directory containing {module}.md")
    parser.add_argument("--min-lines", type=int, default=100, help="Minimum line count")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    srs_path = Path(args.srs_dir) / f"{args.module}.md"

    if not srs_path.exists():
        print(f"FAIL: srs_guard file missing: {srs_path}")
        return 1

    content = srs_path.read_text(encoding="utf-8")
    lines = content.splitlines()
    findings: list[str] = []

    if len(lines) < args.min_lines:
        findings.append(f"line_count<{args.min_lines} (actual={len(lines)})")

    for anchor in REQUIRED_ANCHORS:
        if anchor not in content:
            findings.append(f"missing_anchor={anchor}")

    fr_count = len(re.findall(r"\bFR-\d{3}\b", content))
    if fr_count == 0:
        findings.append("missing_FR_tokens")

    nfr_count = len(re.findall(r"\bNFR-\d{3}\b", content))
    if nfr_count == 0:
        findings.append("missing_NFR_tokens")

    if findings:
        print(f"FAIL: srs_guard module={args.module} path={srs_path}")
        for item in findings:
            print(f"  - {item}")
        return 1

    print(
        "PASS: srs_guard "
        f"module={args.module} path={srs_path} "
        f"line_count={len(lines)} fr_count={fr_count} nfr_count={nfr_count}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
