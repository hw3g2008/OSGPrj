import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from student_test_playwright_runner import (
    ItemResult,
    filter_manifest_items,
    load_tsv,
    select_scope_rows,
    summarize_statuses,
    write_defects,
    write_run_results,
)


class ManifestSelectionTests(unittest.TestCase):
    def test_load_tsv_reads_tab_delimited_rows(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'sample.tsv'
            path.write_text('ManifestItem\tPriority\nA\tP0\n', encoding='utf-8')
            rows = load_tsv(path)
        self.assertEqual([{'ManifestItem': 'A', 'Priority': 'P0'}], rows)

    def test_filter_manifest_items_returns_only_matching_priority(self) -> None:
        rows = [
            {'ManifestItem': 'A', 'Priority': 'P0', 'CanRunInSmoke': 'Y', 'CanRunInRegression': 'Y'},
            {'ManifestItem': 'B', 'Priority': 'P1', 'CanRunInSmoke': 'Y', 'CanRunInRegression': 'Y'},
        ]
        actual = filter_manifest_items(rows, priority='P0')
        self.assertEqual(['A'], [row['ManifestItem'] for row in actual])

    def test_select_scope_rows_uses_p0_gate_first(self) -> None:
        rows = [
            {'ManifestItem': 'A', 'Priority': 'P0', 'CanRunInSmoke': 'Y', 'CanRunInRegression': 'Y'},
            {'ManifestItem': 'B', 'Priority': 'P1', 'CanRunInSmoke': 'Y', 'CanRunInRegression': 'Y'},
        ]
        actual = select_scope_rows(rows, scope='p0')
        self.assertEqual(['A'], [row['ManifestItem'] for row in actual])


class ReportingTests(unittest.TestCase):
    def test_summarize_statuses_counts_only_executed_rows(self) -> None:
        results = [
            ItemResult('A', 'ACC-A', 'TRI-A', '求职中心', '岗位信息', 'P0', 'Pass', 'a.png', 'ok'),
            ItemResult('B', 'ACC-B', 'TRI-B', '求职中心', '岗位信息', 'P0', 'Fail', 'b.png', 'bad'),
        ]
        summary = summarize_statuses(results, total_planned=3)
        self.assertEqual({'total': 3, 'pass': 1, 'fail': 1, 'block': 0, 'unexecuted': 1}, summary)

    def test_summarize_statuses_accepts_lowercase_known_statuses(self) -> None:
        results = [ItemResult('A', 'ACC-A', 'TRI-A', '求职中心', '岗位信息', 'P0', 'pass', 'a.png', 'ok')]
        summary = summarize_statuses(results, total_planned=1)
        self.assertEqual({'total': 1, 'pass': 1, 'fail': 0, 'block': 0, 'unexecuted': 0}, summary)

    def test_summarize_statuses_accepts_na_status(self) -> None:
        results = [ItemResult('A', 'ACC-A', 'TRI-A', '求职中心', '岗位信息', 'P0', 'N/A', 'a.png', 'ok')]
        summary = summarize_statuses(results, total_planned=1)
        self.assertEqual({'total': 1, 'pass': 0, 'fail': 0, 'block': 0, 'unexecuted': 1}, summary)

    def test_summarize_statuses_rejects_unknown_statuses(self) -> None:
        results = [ItemResult('A', 'ACC-A', 'TRI-A', '求职中心', '岗位信息', 'P0', 'Skip', 'a.png', 'ok')]
        with self.assertRaises(ValueError):
            summarize_statuses(results, total_planned=1)

    def test_write_defects_rejects_unknown_statuses(self) -> None:
        result = ItemResult('A', 'ACC-A', 'TRI-A', '求职中心', '岗位信息', 'P0', 'Skip', 'a.png', 'ok')
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'defects.md'
            with self.assertRaises(ValueError):
                write_defects([result], path)

    def test_write_run_results_rejects_unknown_statuses(self) -> None:
        result = ItemResult('A', 'ACC-A', 'TRI-A', '求职中心', '岗位信息', 'P0', 'Skip', 'a.png', 'ok')
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'run-results.tsv'
            with self.assertRaises(ValueError):
                write_run_results([result], path)

    def test_write_run_results_normalizes_statuses_before_writing(self) -> None:
        result = ItemResult('A', 'ACC-A', 'TRI-A', '求职中心', '岗位信息', 'P0', 'pass', 'a.png', 'ok')
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'run-results.tsv'
            write_run_results([result], path)
            body = path.read_text(encoding='utf-8')
        self.assertIn('A\tACC-A\tTRI-A\t求职中心\t岗位信息\tP0\tPass\ta.png\tok', body)

    def test_write_defects_includes_visible_but_unimplemented_field(self) -> None:
        result = ItemResult(
            'STU-PW-POS-999',
            'STU-ACC-POS-999',
            'STU-POS-999',
            '求职中心',
            '岗位信息',
            'P0',
            'Fail',
            '/tmp/evidence.png',
            '页面可见但未落地',
            actual_result='实际结果',
            expected_result='预期结果',
            repro_steps='步骤',
            severity='High',
            defect_kind='Fail',
            visible_but_unimplemented=True,
        )
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'defects.md'
            write_defects([result], path)
            body = path.read_text(encoding='utf-8')
        self.assertIn('是否页面可见但未落地: 是', body)

    def test_write_defects_writes_no_defects_when_no_fail_or_block_findings(self) -> None:
        results = [
            ItemResult('A', 'ACC-A', 'TRI-A', '求职中心', '岗位信息', 'P0', 'Pass', 'a.png', 'ok'),
            ItemResult('B', 'ACC-B', 'TRI-B', '求职中心', '岗位信息', 'P0', 'N/A', 'b.png', 'skipped'),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'defects.md'
            write_defects(results, path)
            body = path.read_text(encoding='utf-8')
        self.assertIn('无缺陷。', body)

    def test_write_defects_orders_findings_by_severity(self) -> None:
        results = [
            ItemResult(
                'LOW-1', 'ACC-L1', 'TRI-L1', '求职中心', '岗位信息', 'P0', 'Fail', 'low1.png', 'low',
                severity='Low', defect_kind='Fail', actual_result='low', expected_result='expected', repro_steps='steps',
            ),
            ItemResult(
                'HIGH-1', 'ACC-H1', 'TRI-H1', '求职中心', '岗位信息', 'P0', 'Fail', 'high1.png', 'high',
                severity='High', defect_kind='Fail', actual_result='high', expected_result='expected', repro_steps='steps',
            ),
            ItemResult(
                'CRIT-1', 'ACC-C1', 'TRI-C1', '求职中心', '岗位信息', 'P0', 'Block', 'crit1.png', 'crit',
                severity='Critical', defect_kind='Block', actual_result='crit', expected_result='expected', repro_steps='steps',
            ),
            ItemResult(
                'HIGH-2', 'ACC-H2', 'TRI-H2', '求职中心', '岗位信息', 'P0', 'Fail', 'high2.png', 'high2',
                severity='High', defect_kind='Fail', actual_result='high2', expected_result='expected', repro_steps='steps',
            ),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'defects.md'
            write_defects(results, path)
            body = path.read_text(encoding='utf-8')
        self.assertLess(body.index('## CRIT-1'), body.index('## HIGH-1'))
        self.assertLess(body.index('## HIGH-1'), body.index('## HIGH-2'))
        self.assertLess(body.index('## HIGH-2'), body.index('## LOW-1'))

    def test_write_run_results_writes_tabular_rows(self) -> None:
        result = ItemResult(
            'STU-PW-POS-001',
            'STU-ACC-POS-001',
            'STU-POS-001',
            '求职中心',
            '岗位信息',
            'P0',
            'Pass',
            '/tmp/pass.png',
            'ok',
        )
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'run-results.tsv'
            write_run_results([result], path)
            body = path.read_text(encoding='utf-8')
        self.assertIn('ManifestItem\tAcceptanceRefs\tTriggerItem\tModule\tSubmodule\tPriority\tStatus\tEvidencePath\tNotes', body)
        self.assertIn('STU-PW-POS-001\tSTU-ACC-POS-001\tSTU-POS-001\t求职中心\t岗位信息\tP0\tPass\t/tmp/pass.png\tok', body)
