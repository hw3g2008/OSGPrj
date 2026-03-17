#!/usr/bin/env python3
"""Self-test for story_runtime_guard.py."""

from __future__ import annotations

import tempfile
from pathlib import Path

import yaml

import story_runtime_guard as guard


def _write_yaml(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


def test_archived_story_files_do_not_fail_active_state_count() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        stories_dir = root / "stories"
        tickets_dir = root / "tickets"

        _write_yaml(stories_dir / "S-001.yaml", {"id": "S-001", "title": "archived story"})
        _write_yaml(stories_dir / "S-008.yaml", {"id": "S-008", "title": "active story 1"})
        _write_yaml(stories_dir / "S-009.yaml", {"id": "S-009", "title": "active story 2"})
        _write_yaml(tickets_dir / "T-052.yaml", {"id": "T-052", "story_id": "S-008"})

        state = {
            "stories": ["S-008", "S-009"],
            "tickets": ["T-052"],
            "stats": {
                "total_stories": 2,
            },
            "workflow": {
                "current_step": "tickets_approved",
            },
            "prior_completed_modules": {
                "permission": {
                    "archive_file": "osg-spec-docs/tasks/STATE.yaml.permission-archive",
                }
            },
        }

        original_stories_dir = guard.STORIES_DIR
        original_tickets_dir = guard.TICKETS_DIR
        try:
            guard.STORIES_DIR = stories_dir
            guard.TICKETS_DIR = tickets_dir
            issues = guard.check_file_count_consistency(state)
        finally:
            guard.STORIES_DIR = original_stories_dir
            guard.TICKETS_DIR = original_tickets_dir

        assert not any("Stories 计数不一致" in item for item in issues), issues


def test_missing_story_file_still_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        stories_dir = root / "stories"
        tickets_dir = root / "tickets"

        _write_yaml(stories_dir / "S-008.yaml", {"id": "S-008", "title": "active story 1"})
        _write_yaml(tickets_dir / "T-052.yaml", {"id": "T-052", "story_id": "S-008"})

        state = {
            "stories": ["S-008", "S-009"],
            "tickets": ["T-052"],
            "stats": {
                "total_stories": 2,
            },
            "workflow": {
                "current_step": "tickets_approved",
            },
        }

        original_stories_dir = guard.STORIES_DIR
        original_tickets_dir = guard.TICKETS_DIR
        try:
            guard.STORIES_DIR = stories_dir
            guard.TICKETS_DIR = tickets_dir
            issues = guard.check_file_count_consistency(state)
        finally:
            guard.STORIES_DIR = original_stories_dir
            guard.TICKETS_DIR = original_tickets_dir

        assert any("Stories 文件缺失" in item for item in issues), issues


def main() -> int:
    tests = [
        test_archived_story_files_do_not_fail_active_state_count,
        test_missing_story_file_still_fails,
    ]
    for fn in tests:
        fn()
    print(f"PASS: story_runtime_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
