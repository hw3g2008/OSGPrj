from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STUDENT_TEST_DIR = ROOT / 'student-test'
SCREENSHOT_DIR = ROOT / 'screenshots' / 'student-acceptance'
MANIFEST_PATH = STUDENT_TEST_DIR / '2026-03-28-student-playwright-manifest.tsv'
RUN_RESULTS_PATH = STUDENT_TEST_DIR / '2026-03-28-student-playwright-run-results.tsv'
DEFECTS_PATH = STUDENT_TEST_DIR / '2026-03-28-student-playwright-defects.md'
PRECHECK_PATH = SCREENSHOT_DIR / 'precheck.png'


@dataclass
class ItemResult:
    manifest_item: str
    acceptance_refs: str
    trigger_item: str
    module: str
    submodule: str
    priority: str
    status: str
    evidence_path: str
    notes: str
    actual_result: str = ''
    expected_result: str = ''
    repro_steps: str = ''
    severity: str = 'Medium'
    defect_kind: str = ''
    visible_but_unimplemented: bool = False


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


def summarize_statuses(results: list[ItemResult], *, total_planned: int) -> dict[str, int]:
    summary = {'total': total_planned, 'pass': 0, 'fail': 0, 'block': 0, 'unexecuted': 0}
    for item in results:
        lowered = item.status.lower()
        if lowered not in {'pass', 'fail', 'block'}:
            raise ValueError(f'unknown status: {item.status}')
        summary[lowered] += 1
    executed = summary['pass'] + summary['fail'] + summary['block']
    summary['unexecuted'] = max(total_planned - executed, 0)
    return summary


def write_run_results(results: list[ItemResult], path: Path) -> None:
    with path.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.writer(handle, delimiter='\t')
        writer.writerow([
            'ManifestItem',
            'AcceptanceRefs',
            'TriggerItem',
            'Module',
            'Submodule',
            'Priority',
            'Status',
            'EvidencePath',
            'Notes',
        ])
        for item in results:
            writer.writerow([
                item.manifest_item,
                item.acceptance_refs,
                item.trigger_item,
                item.module,
                item.submodule,
                item.priority,
                item.status,
                item.evidence_path,
                item.notes,
            ])


def write_defects(results: list[ItemResult], path: Path) -> None:
    lines = ['# Student Playwright Defects', '']
    findings = [item for item in results if item.status.lower() in {'fail', 'block'}]
    if not findings:
        lines.append('无缺陷。')
    for item in findings:
        lines.extend([
            f'## {item.manifest_item}',
            f'- 用例 ID: {item.manifest_item}',
            f'- 模块: {item.module} / {item.submodule}',
            f'- 实际结果: {item.actual_result or item.notes}',
            f'- 预期结果: {item.expected_result}',
            f'- 复现步骤: {item.repro_steps}',
            f'- 证据路径: {item.evidence_path}',
            f'- 严重级别: {item.severity}',
            f'- 判定类型: {item.defect_kind or item.status}',
            f"- 是否页面可见但未落地: {'是' if item.visible_but_unimplemented else '否'}",
            '',
        ])
    path.write_text('\n'.join(lines), encoding='utf-8')
