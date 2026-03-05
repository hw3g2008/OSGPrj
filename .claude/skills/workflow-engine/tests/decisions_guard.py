#!/usr/bin/env python3
"""DECISIONS completeness guard for module-level workflow hard gate."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

DEFAULT_DECISIONS_DIR = "osg-spec-docs/docs/02-requirements/srs"
DECISION_HEADER_RE = re.compile(r"(?m)^##\s+(DEC-\d+)\s*$")
STATUS_RE = re.compile(r"\*\*状态\*\*:\s*([A-Za-z_]+)")
APPLIED_RE = re.compile(r"\*\*已应用\*\*:\s*(true|false)", re.IGNORECASE)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="DECISIONS completeness guard")
    parser.add_argument("--module", required=True, help="Module name, e.g. permission")
    parser.add_argument(
        "--decisions-dir",
        default=DEFAULT_DECISIONS_DIR,
        help="Directory containing {module}-DECISIONS.md",
    )
    parser.add_argument(
        "--allow-missing",
        action="store_true",
        help="Allow missing decisions file (pass when file absent)",
    )
    return parser.parse_args()


def split_records(content: str) -> list[tuple[str, str]]:
    matches = list(DECISION_HEADER_RE.finditer(content))
    records: list[tuple[str, str]] = []
    for i, current in enumerate(matches):
        start = current.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        records.append((current.group(1), content[start:end]))
    return records


def main() -> int:
    args = parse_args()
    decisions_path = Path(args.decisions_dir) / f"{args.module}-DECISIONS.md"

    if not decisions_path.exists():
        if args.allow_missing:
            print(
                "PASS: decisions_guard "
                f"module={args.module} path={decisions_path} records=0 mode=allow_missing"
            )
            return 0
        print(f"FAIL: decisions_guard file missing: {decisions_path}")
        return 1

    content = decisions_path.read_text(encoding="utf-8")
    records = split_records(content)
    findings: list[str] = []

    pending = 0
    rejected = 0
    resolved = 0
    resolved_unapplied = 0

    for dec_id, body in records:
        status_match = STATUS_RE.search(body)
        if not status_match:
            findings.append(f"{dec_id}: missing_status")
            continue

        status = status_match.group(1).lower()
        if status == "pending":
            pending += 1
            findings.append(f"{dec_id}: status_pending")
            continue
        if status == "rejected":
            rejected += 1
            continue
        if status == "resolved":
            resolved += 1
            applied_match = APPLIED_RE.search(body)
            if not applied_match:
                resolved_unapplied += 1
                findings.append(f"{dec_id}: resolved_without_applied_flag")
                continue
            applied = applied_match.group(1).lower() == "true"
            if not applied:
                resolved_unapplied += 1
                findings.append(f"{dec_id}: resolved_but_not_applied")
            continue

        findings.append(f"{dec_id}: unknown_status={status}")

    if findings:
        print(f"FAIL: decisions_guard module={args.module} path={decisions_path}")
        for item in findings:
            print(f"  - {item}")
        print(
            "INFO: summary "
            f"records={len(records)} resolved={resolved} rejected={rejected} "
            f"pending={pending} resolved_unapplied={resolved_unapplied}"
        )
        return 1

    print(
        "PASS: decisions_guard "
        f"module={args.module} path={decisions_path} records={len(records)} "
        f"resolved={resolved} rejected={rejected} pending={pending} "
        f"resolved_unapplied={resolved_unapplied}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
