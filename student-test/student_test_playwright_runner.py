from __future__ import annotations

import argparse
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STUDENT_TEST_DIR = ROOT / 'student-test'
SCREENSHOT_DIR = ROOT / 'screenshots' / 'student-acceptance'
MANIFEST_PATH = STUDENT_TEST_DIR / '2026-03-28-student-playwright-manifest.tsv'
RUN_RESULTS_PATH = STUDENT_TEST_DIR / '2026-03-28-student-playwright-run-results.tsv'
DEFECTS_PATH = STUDENT_TEST_DIR / '2026-03-28-student-playwright-defects.md'
PRECHECK_PATH = SCREENSHOT_DIR / 'precheck.png'


def load_tsv(path: Path) -> list[dict[str, str]]:
    with path.open('r', encoding='utf-8') as handle:
        return list(csv.DictReader(handle, delimiter='\t'))


def filter_manifest_items(
    rows: list[dict[str, str]],
    *,
    priority: str,
    smoke_only: bool = False,
    regression_only: bool = False,
) -> list[dict[str, str]]:
    selected = [row for row in rows if row.get('Priority') == priority]
    if smoke_only:
        selected = [row for row in selected if row.get('CanRunInSmoke') == 'Y']
    if regression_only:
        selected = [row for row in selected if row.get('CanRunInRegression') == 'Y']
    return selected


def select_scope_rows(rows: list[dict[str, str]], scope: str) -> list[dict[str, str]]:
    if scope == 'p0':
        return filter_manifest_items(rows, priority='P0')
    if scope == 'p1':
        return filter_manifest_items(rows, priority='P1', regression_only=True)
    if scope == 'p0_smoke':
        return filter_manifest_items(rows, priority='P0', smoke_only=True)
    raise ValueError(f'unsupported scope: {scope}')


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url')
    parser.add_argument('--username')
    parser.add_argument('--password')
    parser.add_argument('--scope', choices=['p0', 'p1', 'p0_smoke'], default='p0')
    parser.add_argument('--manifest-item')
    parser.add_argument('--headed', action='store_true')
    return parser.parse_args(argv)
