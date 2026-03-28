import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from student_test_playwright_runner import load_tsv, filter_manifest_items, select_scope_rows


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
