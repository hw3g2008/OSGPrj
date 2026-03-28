from __future__ import annotations

import argparse
import csv
import sys
from dataclasses import dataclass
from pathlib import Path

from student_playwright_actions import execute_manifest_item, precheck_environment

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


@dataclass
class RuntimeConfig:
    base_url: str
    username: str
    password: str
    scope: str


_KNOWN_STATUSES = {
    'pass': 'Pass',
    'fail': 'Fail',
    'block': 'Block',
    'n/a': 'N/A',
}

_SEVERITY_RANKS = {
    'critical': 0,
    'high': 1,
    'medium': 2,
    'low': 3,
}


def normalize_status(status: str) -> str:
    normalized = _KNOWN_STATUSES.get(status.strip().lower())
    if normalized is None:
        raise ValueError(f'unknown status: {status}')
    return normalized


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


def build_runtime_config(
    base_url: str | None,
    username: str | None,
    password: str | None,
    scope: str,
) -> RuntimeConfig:
    return RuntimeConfig(
        base_url=(base_url or 'http://127.0.0.1:4000').rstrip('/'),
        username=username or 'student_demo',
        password=password or 'student123',
        scope=scope,
    )


def should_enter_p1(summary: dict[str, int]) -> bool:
    return summary['total'] == summary['pass'] and summary['fail'] == 0 and summary['block'] == 0


def summarize_statuses(results: list[ItemResult], *, total_planned: int) -> dict[str, int]:
    summary = {'total': total_planned, 'pass': 0, 'fail': 0, 'block': 0, 'unexecuted': 0}
    for item in results:
        normalized = normalize_status(item.status)
        lowered = normalized.lower()
        if lowered in summary:
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
            normalized_status = normalize_status(item.status)
            writer.writerow([
                item.manifest_item,
                item.acceptance_refs,
                item.trigger_item,
                item.module,
                item.submodule,
                item.priority,
                normalized_status,
                item.evidence_path,
                item.notes,
            ])


def write_defects(results: list[ItemResult], path: Path) -> None:
    lines = ['# Student Playwright Defects', '']
    normalized_results = [(index, item, normalize_status(item.status)) for index, item in enumerate(results)]
    findings = [entry for entry in normalized_results if entry[2] in {'Fail', 'Block'}]
    findings.sort(key=lambda entry: (_SEVERITY_RANKS.get(entry[1].severity.strip().lower(), _SEVERITY_RANKS['medium']), entry[0]))
    if not findings:
        lines.append('无缺陷。')
    for _, item, _ in findings:
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


def run_priority_batch(
    page: object,
    rows: list[dict[str, str]],
    *,
    total_planned: int,
    evidence_dir: Path,
) -> tuple[list[ItemResult], dict[str, int]]:
    evidence_dir.mkdir(parents=True, exist_ok=True)
    results: list[ItemResult] = []
    for row in rows:
        item_dir = evidence_dir / row['ManifestItem']
        status, notes, visible_but_unimplemented = execute_manifest_item(page, row, item_dir)
        results.append(
            ItemResult(
                manifest_item=row['ManifestItem'],
                acceptance_refs=row['AcceptanceRefs'],
                trigger_item=row['TriggerItem'],
                module=row['模块'],
                submodule=row['子模块'],
                priority=row['Priority'],
                status=status,
                evidence_path=str(item_dir),
                notes=notes,
                defect_kind=status,
                visible_but_unimplemented=visible_but_unimplemented,
            )
        )
    return results, summarize_statuses(results, total_planned=total_planned)


def _filter_manifest_rows(rows: list[dict[str, str]], manifest_item: str | None) -> list[dict[str, str]]:
    if manifest_item is None:
        return rows
    selected = [row for row in rows if row['ManifestItem'] == manifest_item]
    if not selected:
        raise ValueError(f'unknown manifest item: {manifest_item}')
    return selected


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    config = build_runtime_config(args.base_url, args.username, args.password, args.scope)
    rows = _filter_manifest_rows(select_scope_rows(load_tsv(MANIFEST_PATH), args.scope), args.manifest_item)
    total_planned = len(rows)
    evidence_dir = SCREENSHOT_DIR / config.scope

    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError(f'playwright is required for live execution: {exc}') from exc

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=not args.headed)
        context = browser.new_context(base_url=config.base_url)
        page = context.new_page()
        precheck_status, precheck_notes = precheck_environment(page, config=config, screenshot_path=PRECHECK_PATH)
        if precheck_status == 'Pass':
            results, summary = run_priority_batch(
                page,
                rows,
                total_planned=total_planned,
                evidence_dir=evidence_dir,
            )
        else:
            results = [
                ItemResult(
                    manifest_item=row['ManifestItem'],
                    acceptance_refs=row['AcceptanceRefs'],
                    trigger_item=row['TriggerItem'],
                    module=row['模块'],
                    submodule=row['子模块'],
                    priority=row['Priority'],
                    status='Block',
                    evidence_path=str(PRECHECK_PATH),
                    notes=precheck_notes,
                    defect_kind='Block',
                )
                for row in rows
            ]
            summary = summarize_statuses(results, total_planned=total_planned)
        browser.close()

    write_run_results(results, RUN_RESULTS_PATH)
    write_defects(results, DEFECTS_PATH)
    print(summary)
    return 0 if summary['fail'] == 0 and summary['block'] == 0 else 1


if __name__ == '__main__':
    raise SystemExit(main())
