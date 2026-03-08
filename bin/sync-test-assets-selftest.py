#!/usr/bin/env python3
"""Self-tests for sync-test-assets.py."""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import yaml


SCRIPT = Path(__file__).resolve().parent / "sync-test-assets.py"


def run_sync(stories_dir: Path, tickets_dir: Path, cases: Path, matrix: Path) -> None:
    subprocess.run(
        [
            "python3",
            str(SCRIPT),
            "--module",
            "sample",
            "--stories-dir",
            str(stories_dir),
            "--tickets-dir",
            str(tickets_dir),
            "--cases",
            str(cases),
            "--matrix",
            str(matrix),
        ],
        check=True,
        capture_output=True,
        text=True,
    )


def write_yaml(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


def test_story_and_final_cases_inherit_story_level_evidence() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        stories = root / "stories"
        tickets = root / "tickets"
        cases = root / "cases.yaml"
        matrix = root / "matrix.md"

        write_yaml(
            stories / "S-900.yaml",
            {
                "id": "S-900",
                "title": "sample",
                "acceptance_criteria": ["A", "B"],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "story_cases": [
                    {"story_case_id": "SC-S-900-001", "ac_ref": "AC-S-900-01"},
                    {"story_case_id": "SC-S-900-002", "ac_ref": "AC-S-900-02"},
                ],
                "integration_evidence": {
                    "command": "pnpm test story-suite",
                    "exit_code": 0,
                    "evidence_ref": "stories/S-900.yaml",
                },
                "final_evidence": {
                    "command": "pnpm test final-suite",
                    "exit_code": 0,
                    "evidence_ref": "stories/S-900.yaml",
                },
            },
        )
        write_yaml(tickets / "T-900.yaml", {"id": "T-900", "story_id": "S-900", "covers_ac_refs": []})
        write_yaml(cases, [])
        matrix.write_text("", encoding="utf-8")

        run_sync(stories, tickets, cases, matrix)

        synced = yaml.safe_load(cases.read_text(encoding="utf-8"))
        story_cases = [tc for tc in synced if tc["level"] == "story"]
        final_cases = [tc for tc in synced if tc["level"] == "final"]

        assert len(story_cases) == 2
        assert len(final_cases) == 2
        assert all(tc["automation"]["command"] == "pnpm test story-suite" for tc in story_cases)
        assert all(tc["latest_result"]["status"] == "pass" for tc in story_cases)
        assert all(tc["latest_result"]["evidence_ref"] == "stories/S-900.yaml" for tc in story_cases)
        assert all(tc["automation"]["command"] == "pnpm test final-suite" for tc in final_cases)
        assert all(tc["latest_result"]["status"] == "pass" for tc in final_cases)
        assert all(tc["latest_result"]["evidence_ref"] == "stories/S-900.yaml" for tc in final_cases)


def main() -> int:
    tests = [
        test_story_and_final_cases_inherit_story_level_evidence,
    ]
    for test in tests:
        test()
    print(f"PASS: sync-test-assets-selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
