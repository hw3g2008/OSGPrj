import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from student_test_playwright_runner import (
    ItemResult,
    RuntimeConfig,
    build_runtime_config,
    filter_manifest_items,
    load_tsv,
    render_final_summary,
    select_scope_rows,
    summarize_statuses,
    should_enter_p1,
    write_defects,
    write_run_results,
)
from student_playwright_actions import authenticate_student_session, precheck_environment


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


class RuntimeConfigTests(unittest.TestCase):
    def test_build_runtime_config_uses_student_defaults(self) -> None:
        config = build_runtime_config(base_url=None, username=None, password=None, scope='p0')
        self.assertEqual(RuntimeConfig('http://127.0.0.1:4000', 'student_demo', 'student123', 'p0'), config)

    def test_should_enter_p1_requires_perfect_p0_summary(self) -> None:
        self.assertFalse(should_enter_p1({'total': 25, 'pass': 24, 'fail': 1, 'block': 0, 'unexecuted': 0}))
        self.assertFalse(should_enter_p1({'total': 25, 'pass': 24, 'fail': 0, 'block': 1, 'unexecuted': 0}))
        self.assertTrue(should_enter_p1({'total': 25, 'pass': 25, 'fail': 0, 'block': 0, 'unexecuted': 0}))


class PrecheckTests(unittest.TestCase):
    def test_authenticate_student_session_seeds_token_and_user(self) -> None:
        calls: list[tuple[str, object]] = []

        class FakeResponse:
            ok = True

            def json(self) -> dict[str, object]:
                return {'code': 200, 'token': 'student-token'}

        class FakeRequest:
            def post(self, url: str, data: dict[str, str]) -> FakeResponse:
                calls.append((url, data))
                return FakeResponse()

        class FakePage:
            def __init__(self) -> None:
                self.request = FakeRequest()
                self.scripts: list[str] = []

            def add_init_script(self, script: str) -> None:
                self.scripts.append(script)

        page = FakePage()
        token = authenticate_student_session(
            page,
            base_url='http://127.0.0.1:4000',
            username='student_demo',
            password='student123',
        )

        self.assertEqual('student-token', token)
        self.assertEqual(
            [('http://127.0.0.1:4000/api/student/login', {'username': 'student_demo', 'password': 'student123'})],
            calls,
        )
        self.assertEqual(1, len(page.scripts))
        self.assertIn("osg_token", page.scripts[0])
        self.assertIn("osg_user", page.scripts[0])

    def test_precheck_environment_returns_pass_and_writes_screenshot(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            screenshot_path = Path(tmp) / 'nested' / 'precheck.png'
            events: list[tuple[str, object]] = []

            class FakeResponse:
                ok = True

                def json(self) -> dict[str, object]:
                    return {'code': 200, 'token': 'student-token'}

            class FakeRequest:
                def post(self, url: str, data: dict[str, str]) -> FakeResponse:
                    events.append(('post', url))
                    return FakeResponse()

            class FakeLocator:
                def __init__(self, count_value: int) -> None:
                    self.count_value = count_value

                def count(self) -> int:
                    return self.count_value

            class FakePage:
                def __init__(self) -> None:
                    self.request = FakeRequest()
                    self.screenshots: list[str] = []

                def add_init_script(self, script: str) -> None:
                    events.append(('script', script))

                def goto(self, url: str, wait_until: str, timeout: int) -> None:
                    events.append(('goto', url))

                def wait_for_load_state(self, state: str, timeout: int) -> None:
                    events.append(('wait', state))

                def screenshot(self, path: str, full_page: bool) -> None:
                    self.screenshots.append(path)
                    Path(path).write_text('fake screenshot', encoding='utf-8')

                def get_by_role(self, role: str, name: str) -> FakeLocator:
                    events.append(('role', (role, name)))
                    return FakeLocator(1 if getattr(name, 'search', None) and name.search('岗位信息 - 真实环境') else 0)

            page = FakePage()
            status, notes = precheck_environment(
                page,
                config=RuntimeConfig('http://127.0.0.1:4000', 'student_demo', 'student123', 'p0'),
                screenshot_path=screenshot_path,
            )
            self.assertEqual(('Pass', '预检通过：student 登录与首屏页面可用'), (status, notes))
            self.assertTrue(screenshot_path.exists())
            self.assertEqual([str(screenshot_path)], page.screenshots)
            self.assertIn(('goto', 'http://127.0.0.1:4000/positions'), events)
            self.assertIn(('wait', 'networkidle'), events)

    def test_precheck_environment_accepts_expanded_heading_text(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            screenshot_path = Path(tmp) / 'precheck.png'

            class FakeResponse:
                ok = True

                def json(self) -> dict[str, object]:
                    return {'code': 200, 'token': 'student-token'}

            class FakeRequest:
                def post(self, url: str, data: dict[str, str]) -> FakeResponse:
                    return FakeResponse()

            class FakeLocator:
                def count(self) -> int:
                    return 1

            class FakePage:
                request = FakeRequest()

                def add_init_script(self, script: str) -> None:
                    pass

                def goto(self, url: str, wait_until: str, timeout: int) -> None:
                    pass

                def wait_for_load_state(self, state: str, timeout: int) -> None:
                    pass

                def screenshot(self, path: str, full_page: bool) -> None:
                    Path(path).write_text('fake screenshot', encoding='utf-8')

                def get_by_role(self, role: str, name: object) -> FakeLocator:
                    assert hasattr(name, 'search')
                    assert name.search('岗位信息 - 真实环境')
                    return FakeLocator()

            status, notes = precheck_environment(
                FakePage(),
                config=RuntimeConfig('http://127.0.0.1:4000', 'student_demo', 'student123', 'p0'),
                screenshot_path=screenshot_path,
            )
            self.assertEqual(('Pass', '预检通过：student 登录与首屏页面可用'), (status, notes))
            self.assertTrue(screenshot_path.exists())

    def test_precheck_environment_returns_block_when_login_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            screenshot_path = Path(tmp) / 'precheck.png'

            class FakeResponse:
                ok = False

                def json(self) -> dict[str, object]:
                    return {'code': 401, 'message': 'login failed'}

            class FakeRequest:
                def post(self, url: str, data: dict[str, str]) -> FakeResponse:
                    return FakeResponse()

            class FakePage:
                request = FakeRequest()

                def add_init_script(self, script: str) -> None:
                    raise AssertionError('should not be called')

                def goto(self, url: str, wait_until: str, timeout: int) -> None:
                    raise AssertionError('should not be called')

                def wait_for_load_state(self, state: str, timeout: int) -> None:
                    raise AssertionError('should not be called')

                def screenshot(self, path: str, full_page: bool) -> None:
                    raise AssertionError('should not be called')

                def get_by_role(self, role: str, name: object):
                    raise AssertionError('should not be called')

            status, notes = precheck_environment(
                FakePage(),
                config=RuntimeConfig('http://127.0.0.1:4000', 'student_demo', 'student123', 'p0'),
                screenshot_path=screenshot_path,
            )

        self.assertEqual('Block', status)
        self.assertIn('预检失败：student 登录失败', notes)
        self.assertFalse(screenshot_path.exists())

    def test_precheck_environment_blocks_when_heading_missing(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            screenshot_path = Path(tmp) / 'precheck.png'

            class FakeResponse:
                ok = True

                def json(self) -> dict[str, object]:
                    return {'code': 200, 'token': 'student-token'}

            class FakeRequest:
                def post(self, url: str, data: dict[str, str]) -> FakeResponse:
                    return FakeResponse()

            class FakeLocator:
                def count(self) -> int:
                    return 0

            class FakePage:
                request = FakeRequest()

                def add_init_script(self, script: str) -> None:
                    pass

                def goto(self, url: str, wait_until: str, timeout: int) -> None:
                    pass

                def wait_for_load_state(self, state: str, timeout: int) -> None:
                    pass

                def screenshot(self, path: str, full_page: bool) -> None:
                    Path(path).write_text('fake screenshot', encoding='utf-8')

                def get_by_role(self, role: str, name: str) -> FakeLocator:
                    return FakeLocator()

            status, notes = precheck_environment(
                FakePage(),
                config=RuntimeConfig('http://127.0.0.1:4000', 'student_demo', 'student123', 'p0'),
                screenshot_path=screenshot_path,
            )

        self.assertEqual(('Block', '预检失败：岗位信息页面未出现标题'), (status, notes))


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


class FinalSummaryTests(unittest.TestCase):
    def test_render_final_summary_uses_exact_eight_line_structure(self) -> None:
        summary = render_final_summary(
            {'total': 25, 'pass': 24, 'fail': 1, 'block': 0, 'unexecuted': 0},
            {'total': 51, 'pass': 0, 'fail': 0, 'block': 0, 'unexecuted': 51},
            visible_failures=1,
            top_defects=['STU-PW-POS-009'],
            top_blockers=['ENV-BLOCK'],
            gap_status='gap register 仍只包含无可见入口资产',
            run_results_path=Path('/tmp/run-results.tsv'),
            defects_path=Path('/tmp/defects.md'),
        )
        lines = summary.splitlines()
        self.assertEqual(8, len(lines))
        self.assertEqual('1. P0 总数 / Pass / Fail / Block: 25 / 24 / 1 / 0', lines[0])
        self.assertEqual('2. P1 总数 / Pass / Fail / Block: 51 / 0 / 0 / 0', lines[1])
        self.assertEqual('3. 页面可见但未落地的 Fail 数量: 1', lines[2])
        self.assertEqual('4. Top defects: STU-PW-POS-009', lines[3])
        self.assertEqual('5. Top blockers: ENV-BLOCK', lines[4])
        self.assertEqual('6. gap register 仍只包含无可见入口资产', lines[5])
        self.assertEqual('7. 结果文件路径: /tmp/run-results.tsv | /tmp/defects.md', lines[6])
        self.assertEqual('8. 当前 student 端是否达到测试放行标准: 否', lines[7])

    def test_render_final_summary_marks_release_ready_only_when_both_batches_green(self) -> None:
        summary = render_final_summary(
            {'total': 25, 'pass': 25, 'fail': 0, 'block': 0, 'unexecuted': 0},
            {'total': 51, 'pass': 51, 'fail': 0, 'block': 0, 'unexecuted': 0},
            visible_failures=0,
            top_defects=[],
            top_blockers=[],
            gap_status='gap register 仍只包含无可见入口资产',
            run_results_path=Path('/tmp/run-results.tsv'),
            defects_path=Path('/tmp/defects.md'),
        )
        self.assertTrue(summary.endswith('8. 当前 student 端是否达到测试放行标准: 是'))
