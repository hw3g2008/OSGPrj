from __future__ import annotations

import argparse
import csv
import sys
from dataclasses import dataclass
from pathlib import Path

from student_playwright_actions import (
    audit_gap_register_purity,
    build_gap_visibility_map,
    execute_manifest_item,
    precheck_environment,
)

ROOT = Path(__file__).resolve().parents[1]
STUDENT_TEST_DIR = ROOT / 'student-test'
SCREENSHOT_DIR = ROOT / 'screenshots' / 'student-acceptance'
MANIFEST_PATH = STUDENT_TEST_DIR / '2026-03-28-student-playwright-manifest.tsv'
GAP_REGISTER_PATH = STUDENT_TEST_DIR / '2026-03-28-student-gap-register.md'
RUN_RESULTS_PATH = STUDENT_TEST_DIR / '2026-03-28-student-playwright-run-results.tsv'
DEFECTS_PATH = STUDENT_TEST_DIR / '2026-03-28-student-playwright-defects.md'
PRECHECK_PATH = SCREENSHOT_DIR / 'precheck.png'
PROTOTYPE_PATH = ROOT / 'osg-spec-docs' / 'source' / 'prototype' / 'index.html'


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
                actual_result=notes,
                expected_result=_join_expected_results(row),
                repro_steps=_build_repro_steps(row),
                severity=_infer_severity(status, row['Priority'], visible_but_unimplemented),
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


def _join_expected_results(row: dict[str, str]) -> str:
    parts = [row.get('ExpectedPrimary', '').strip(), row.get('ExpectedSecondary', '').strip()]
    return ' | '.join(part for part in parts if part)


def _build_repro_steps(row: dict[str, str]) -> str:
    steps = [
        row.get('Precondition', '').strip(),
        row.get('ActionType', '').strip(),
        row.get('LocatorHint', '').strip(),
        row.get('InputProfile', '').strip(),
    ]
    return ' -> '.join(step for step in steps if step and step != 'no_input')


def _infer_severity(status: str, priority: str, visible_but_unimplemented: bool) -> str:
    normalized = normalize_status(status)
    if normalized == 'Block':
        return 'Critical' if priority == 'P0' else 'High'
    if visible_but_unimplemented:
        return 'High' if priority == 'P0' else 'Medium'
    return 'Medium'


def render_final_summary(
    p0_summary: dict[str, int],
    p1_summary: dict[str, int],
    *,
    visible_failures: int,
    top_defects: list[str],
    top_blockers: list[str],
    gap_status: str,
    run_results_path: Path,
    defects_path: Path,
) -> str:
    release_ready = is_release_ready(p0_summary, p1_summary, gap_status=gap_status)
    lines = [
        f"1. P0 总数 / Pass / Fail / Block: {p0_summary['total']} / {p0_summary['pass']} / {p0_summary['fail']} / {p0_summary['block']}",
        f"2. P1 总数 / Pass / Fail / Block: {p1_summary['total']} / {p1_summary['pass']} / {p1_summary['fail']} / {p1_summary['block']}",
        f'3. 页面可见但未落地的 Fail 数量: {visible_failures}',
        f"4. Top defects: {', '.join(top_defects) if top_defects else '无'}",
        f"5. Top blockers: {', '.join(top_blockers) if top_blockers else '无'}",
        f'6. {gap_status}',
        f'7. 结果文件路径: {run_results_path} | {defects_path}',
        f"8. 当前 student 端是否达到测试放行标准: {'是' if release_ready else '否'}",
    ]
    return '\n'.join(lines)


def _blank_summary(total: int) -> dict[str, int]:
    return {'total': total, 'pass': 0, 'fail': 0, 'block': 0, 'unexecuted': total}


def _collect_top_items(results: list[ItemResult], status: str) -> list[str]:
    normalized = normalize_status(status)
    ordered = [
        item.manifest_item
        for _, item in _sorted_findings(results)
        if normalize_status(item.status) == normalized
    ]
    return ordered[:3]


def _severity_rank(severity: str) -> int:
    return _SEVERITY_RANKS.get(severity.strip().lower(), _SEVERITY_RANKS['medium'])


def _sorted_findings(results: list[ItemResult]) -> list[tuple[int, ItemResult]]:
    findings = [
        (index, item)
        for index, item in enumerate(results)
        if normalize_status(item.status) in {'Fail', 'Block'}
    ]
    findings.sort(key=lambda entry: (_severity_rank(entry[1].severity), entry[0]))
    return findings


def _env_block_result(note: str) -> ItemResult:
    return ItemResult(
        manifest_item='ENV-BLOCK',
        acceptance_refs='N/A',
        trigger_item='N/A',
        module='环境',
        submodule='预检',
        priority='P0',
        status='Block',
        evidence_path=str(PRECHECK_PATH),
        notes=note,
        actual_result=note,
        expected_result='预检应通过：student 登录与首屏页面可用',
        repro_steps='执行 runner 预检',
        severity='Critical',
        defect_kind='Block',
    )


def load_gap_visibility_map(
    gap_register_path: Path = GAP_REGISTER_PATH,
    prototype_path: Path = PROTOTYPE_PATH,
) -> dict[str, bool]:
    return build_gap_visibility_map(
        gap_register_path.read_text(encoding='utf-8'),
        prototype_path.read_text(encoding='utf-8'),
    )


def is_release_ready(
    p0_summary: dict[str, int],
    p1_summary: dict[str, int],
    *,
    gap_status: str,
) -> bool:
    p0_green = p0_summary['pass'] == p0_summary['total'] and p0_summary['fail'] == 0 and p0_summary['block'] == 0
    p1_green = (
        p1_summary['block'] == 0
        and p1_summary['fail'] <= int(p1_summary['total'] * 0.05)
        and p1_summary['pass'] + p1_summary['fail'] + p1_summary['block'] == p1_summary['total']
    ) if p1_summary['total'] > 0 else True
    return p0_green and p1_green and gap_status == 'gap register 仍只包含无可见入口资产'


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    config = build_runtime_config(args.base_url, args.username, args.password, args.scope)
    manifest_rows = load_tsv(MANIFEST_PATH)
    p0_rows = _filter_manifest_rows(select_scope_rows(manifest_rows, 'p0' if args.scope != 'p0_smoke' else 'p0_smoke'), args.manifest_item)
    if args.scope == 'p1':
        p1_rows = _filter_manifest_rows(select_scope_rows(manifest_rows, 'p1'), args.manifest_item)
        p1_total_planned = len(p1_rows)
    else:
        p1_rows = []
        p1_total_planned = 0 if args.manifest_item else len(select_scope_rows(manifest_rows, 'p1'))
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
            p0_results, p0_summary = run_priority_batch(
                page,
                p0_rows,
                total_planned=len(p0_rows),
                evidence_dir=evidence_dir / 'p0',
            )
            all_results = list(p0_results)
            p1_summary = _blank_summary(p1_total_planned)
            if args.scope == 'p1' and should_enter_p1(p0_summary):
                p1_results, p1_summary = run_priority_batch(
                    page,
                    p1_rows,
                    total_planned=len(p1_rows),
                    evidence_dir=evidence_dir / 'p1',
                )
                all_results.extend(p1_results)
        else:
            all_results = [_env_block_result(precheck_notes)]
            p0_summary = summarize_statuses(all_results, total_planned=len(p0_rows))
            p1_summary = _blank_summary(p1_total_planned)
        browser.close()

    write_run_results(all_results, RUN_RESULTS_PATH)
    write_defects(all_results, DEFECTS_PATH)
    gap_visibility = load_gap_visibility_map()
    final_summary = render_final_summary(
        p0_summary,
        p1_summary,
        visible_failures=sum(1 for item in all_results if item.visible_but_unimplemented and normalize_status(item.status) == 'Fail'),
        top_defects=_collect_top_items(all_results, 'Fail'),
        top_blockers=_collect_top_items(all_results, 'Block'),
        gap_status=audit_gap_register_purity(gap_visibility),
        run_results_path=RUN_RESULTS_PATH,
        defects_path=DEFECTS_PATH,
    )
    print(final_summary)
    return 0 if is_release_ready(p0_summary, p1_summary, gap_status=audit_gap_register_purity(gap_visibility)) else 1


if __name__ == '__main__':
    raise SystemExit(main())
