#!/usr/bin/env python3
"""Self-tests for traceability_guard helpers."""

from __future__ import annotations

import tempfile
from pathlib import Path

from traceability_guard import load_matrix_tc_ids


def write_temp(contents: str) -> Path:
    handle = tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8", suffix=".md")
    handle.write(contents)
    handle.close()
    return Path(handle.name)


def test_accepts_perm_and_permission_prefixes() -> None:
    path = write_temp(
        "\n".join(
            [
                "| FR/AC | TC-ID | Level |",
                "|---|---|---|",
                "| AC-S-001-01 | TC-PERM-S001-TICKET-POS-001 | ticket |",
                "| AC-S-001-02 | TC-PERMISSION-T-001-TICKET-001 | ticket |",
            ]
        )
    )
    tc_ids = load_matrix_tc_ids(path)
    assert tc_ids == [
        "TC-PERM-S001-TICKET-POS-001",
        "TC-PERMISSION-T-001-TICKET-001",
    ]


def test_ignores_non_tc_columns() -> None:
    path = write_temp(
        "\n".join(
            [
                "| FR/AC | TC-ID | Level |",
                "|---|---|---|",
                "| AC-S-001-01 | not-a-tc | ticket |",
                "| AC-S-001-02 | TC-PERMISSION-S-001-FINAL-001 | final |",
            ]
        )
    )
    tc_ids = load_matrix_tc_ids(path)
    assert tc_ids == ["TC-PERMISSION-S-001-FINAL-001"]


def main() -> int:
    tests = [
        test_accepts_perm_and_permission_prefixes,
        test_ignores_non_tc_columns,
    ]
    for test in tests:
        test()
    print(f"PASS: traceability_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
