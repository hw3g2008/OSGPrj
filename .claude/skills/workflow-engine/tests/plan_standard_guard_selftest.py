#!/usr/bin/env python3
"""
Self-test for plan_standard_guard.py.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

from plan_standard_guard import evaluate_documents


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_missing_standard_baseline() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        doc = root / "docs/plans/a.md"
        _write(
            doc,
            "# X\n\n"
            "Date: 2026-03-03\n"
            "Owner: workflow-framework\n\n"
            "## 0.1 与上位标准关系（2026-03-03）\n"
            "1. 本文档遵循 `docs/plans/FOUR-PACK-STANDARD.md`\n",
        )
        findings = evaluate_documents(
            root,
            [
                "docs/plans/a.md",
            ],
        )
        assert any("Standard Baseline" in f for f in findings), findings


def test_missing_relation_section() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        doc = root / "docs/plans/a.md"
        _write(
            doc,
            "# X\n\n"
            "Date: 2026-03-03\n"
            "Owner: workflow-framework\n"
            "Standard Baseline: `docs/plans/FOUR-PACK-STANDARD.md`\n",
        )
        findings = evaluate_documents(
            root,
            [
                "docs/plans/a.md",
            ],
        )
        assert any("与上位标准关系" in f for f in findings), findings


def test_valid_document() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        doc = root / "docs/plans/a.md"
        _write(
            doc,
            "# X\n\n"
            "Date: 2026-03-03\n"
            "Owner: workflow-framework\n"
            "Standard Baseline: `docs/plans/FOUR-PACK-STANDARD.md`\n\n"
            "## 0.1 与上位标准关系（2026-03-03）\n"
            "1. 本文档遵循 `docs/plans/FOUR-PACK-STANDARD.md`\n",
        )
        findings = evaluate_documents(
            root,
            [
                "docs/plans/a.md",
            ],
        )
        assert not findings, findings


def main() -> int:
    test_missing_standard_baseline()
    test_missing_relation_section()
    test_valid_document()
    print("PASS: plan_standard_guard_selftest")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
