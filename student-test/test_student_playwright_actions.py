import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from student_playwright_actions import (  # noqa: E402
    apply_isolation_plan,
    audit_gap_register_purity,
    build_gap_visibility_map,
    classify_result,
    execute_manifest_item,
    parse_gap_register_ids,
    parse_input_profile,
    parse_locator_hint,
    resolve_student_route,
)


class RouteMappingTests(unittest.TestCase):
    def test_resolves_positions_menu_to_real_route(self) -> None:
        self.assertEqual('/positions', resolve_student_route('menu://求职中心/岗位信息'))

    def test_resolves_profile_surface_to_real_route(self) -> None:
        self.assertEqual('/profile', resolve_student_route('surface://个人中心/基本信息/编辑基本信息'))

    def test_rejects_route_hint_with_typo_suffix(self) -> None:
        with self.assertRaises(KeyError):
            resolve_student_route('menu://求职中心/岗位信息-typo')

    def test_rejects_unsupported_route_hint(self) -> None:
        with self.assertRaises(KeyError):
            resolve_student_route('menu://消息中心/系统消息')


class ProfileParsingTests(unittest.TestCase):
    def test_parses_semicolon_input_profile(self) -> None:
        parsed = parse_input_profile('date=2026-01-18;method=official')
        self.assertEqual({'date': '2026-01-18', 'method': 'official'}, parsed)

    def test_parses_empty_input_profile(self) -> None:
        self.assertEqual({}, parse_input_profile(''))

    def test_parses_locator_hint_pairs(self) -> None:
        parsed = parse_locator_hint('stage select#apply-stage-select')
        self.assertEqual({'kind': 'stage', 'selector': 'select#apply-stage-select'}, parsed)

    def test_rejects_malformed_locator_hint(self) -> None:
        with self.assertRaises(ValueError):
            parse_locator_hint('stage')


class IsolationPlanTests(unittest.TestCase):
    def test_soft_refresh_calls_reload(self) -> None:
        calls: list[str] = []

        class FakePage:
            def reload(self, wait_until: str = 'networkidle') -> None:
                calls.append(wait_until)

        apply_isolation_plan(FakePage(), 'soft_refresh')
        self.assertEqual(['networkidle'], calls)

    def test_independent_plan_does_not_reload(self) -> None:
        calls: list[str] = []

        class FakePage:
            def reload(self, wait_until: str = 'networkidle') -> None:
                calls.append(wait_until)

        apply_isolation_plan(FakePage(), 'independent')
        self.assertEqual([], calls)

    def test_none_plan_does_not_reload(self) -> None:
        calls: list[str] = []

        class FakePage:
            def reload(self, wait_until: str = 'networkidle') -> None:
                calls.append(wait_until)

        apply_isolation_plan(FakePage(), 'NONE')
        self.assertEqual([], calls)

    def test_reset_plan_does_not_reload(self) -> None:
        calls: list[str] = []

        class FakePage:
            def reload(self, wait_until: str = 'networkidle') -> None:
                calls.append(wait_until)

        apply_isolation_plan(FakePage(), 'reset_filters')
        self.assertEqual([], calls)

    def test_rejects_unsupported_isolation_plans(self) -> None:
        class FakePage:
            def reload(self, wait_until: str = 'networkidle') -> None:
                raise AssertionError('should not be called')

        with self.assertRaises(ValueError):
            apply_isolation_plan(FakePage(), 'full_reset')


class P0DispatchTests(unittest.TestCase):
    def test_classify_visible_but_unimplemented_as_fail(self) -> None:
        actual = classify_result(primary_ok=False, secondary_ok=False, visible_target=True, blocked=False)
        self.assertEqual(('Fail', True), actual)

    def test_classify_environment_issue_as_block(self) -> None:
        actual = classify_result(primary_ok=False, secondary_ok=False, visible_target=False, blocked=True)
        self.assertEqual(('Block', False), actual)

    def test_execute_manifest_item_dispatches_p0_row_without_false_pass(self) -> None:
        row = {
            'ManifestItem': 'STU-PW-POS-009',
            '模块': '求职中心',
            '子模块': '岗位信息',
            'Priority': 'P0',
        }
        events: list[tuple[str, object]] = []

        class FakePage:
            def goto(self, url: str, wait_until: str, timeout: int) -> None:
                events.append(('goto', url))

            def wait_for_load_state(self, state: str, timeout: int) -> None:
                events.append(('wait', state))

            def screenshot(self, path: str, full_page: bool) -> None:
                events.append(('screenshot', Path(path).name))
                Path(path).write_text('fake screenshot', encoding='utf-8')

        with tempfile.TemporaryDirectory() as tmp:
            status, notes, visible = execute_manifest_item(FakePage(), row, Path(tmp))

        self.assertEqual('Fail', status)
        self.assertTrue(visible)
        self.assertIn('页面可见但未落地', notes)
        self.assertIn(('goto', '/positions'), events)
        self.assertIn(('wait', 'networkidle'), events)
        self.assertIn(('screenshot', 'STU-PW-POS-009-before.png'), events)
        self.assertIn(('screenshot', 'STU-PW-POS-009-after.png'), events)

    def test_execute_manifest_item_classifies_navigation_error_as_block(self) -> None:
        row = {
            'ManifestItem': 'STU-PW-POS-009',
            '模块': '求职中心',
            '子模块': '岗位信息',
            'Priority': 'P0',
        }

        class FakePage:
            def goto(self, url: str, wait_until: str, timeout: int) -> None:
                raise RuntimeError('page crashed')

            def wait_for_load_state(self, state: str, timeout: int) -> None:
                raise AssertionError('should not be called')

            def screenshot(self, path: str, full_page: bool) -> None:
                raise AssertionError('should not be called')

        with tempfile.TemporaryDirectory() as tmp:
            status, notes, visible = execute_manifest_item(FakePage(), row, Path(tmp))

        self.assertEqual('Block', status)
        self.assertFalse(visible)
        self.assertIn('阻断', notes)

    def test_execute_manifest_item_classifies_after_screenshot_error_as_block(self) -> None:
        row = {
            'ManifestItem': 'STU-PW-POS-009',
            '模块': '求职中心',
            '子模块': '岗位信息',
            'Priority': 'P0',
        }
        calls: list[str] = []

        class FakePage:
            def goto(self, url: str, wait_until: str, timeout: int) -> None:
                calls.append(url)

            def wait_for_load_state(self, state: str, timeout: int) -> None:
                calls.append(state)

            def screenshot(self, path: str, full_page: bool) -> None:
                name = Path(path).name
                calls.append(name)
                if name.endswith('-after.png'):
                    raise RuntimeError('after screenshot failed')
                Path(path).write_text('fake screenshot', encoding='utf-8')

        with tempfile.TemporaryDirectory() as tmp:
            status, notes, visible = execute_manifest_item(FakePage(), row, Path(tmp))

        self.assertEqual('Block', status)
        self.assertFalse(visible)
        self.assertIn('阻断', notes)
        self.assertIn('STU-PW-POS-009-after.png', calls)

    def test_execute_manifest_item_dispatches_applications_p0_row_without_false_pass(self) -> None:
        self._assert_p0_route_fail(
            manifest_item='STU-PW-APP-001',
            module='求职中心',
            submodule='我的求职',
            expected_route='/applications',
        )

    def test_execute_manifest_item_dispatches_mock_practice_p0_row_without_false_pass(self) -> None:
        self._assert_p0_route_fail(
            manifest_item='STU-PW-MOC-001',
            module='求职中心',
            submodule='模拟应聘',
            expected_route='/mock-practice',
        )

    def test_execute_manifest_item_dispatches_courses_p0_row_without_false_pass(self) -> None:
        self._assert_p0_route_fail(
            manifest_item='STU-PW-COU-001',
            module='学习中心',
            submodule='课程记录',
            expected_route='/courses',
        )

    def test_execute_manifest_item_dispatches_profile_p0_row_without_false_pass(self) -> None:
        self._assert_p0_route_fail(
            manifest_item='STU-PW-PRO-001',
            module='个人中心',
            submodule='基本信息',
            expected_route='/profile',
        )

    def test_execute_manifest_item_dispatches_positions_p1_row_without_false_pass(self) -> None:
        self._assert_route_fail(
            manifest_item='STU-PW-POS-001',
            module='求职中心',
            submodule='岗位信息',
            priority='P1',
            expected_route='/positions',
        )

    def test_execute_manifest_item_dispatches_applications_p1_row_without_false_pass(self) -> None:
        self._assert_route_fail(
            manifest_item='STU-PW-APP-010',
            module='求职中心',
            submodule='我的求职',
            priority='P1',
            expected_route='/applications',
        )

    def test_execute_manifest_item_dispatches_mock_practice_p1_row_without_false_pass(self) -> None:
        self._assert_route_fail(
            manifest_item='STU-PW-MOC-010',
            module='求职中心',
            submodule='模拟应聘',
            priority='P1',
            expected_route='/mock-practice',
        )

    def test_execute_manifest_item_dispatches_courses_p1_row_without_false_pass(self) -> None:
        self._assert_route_fail(
            manifest_item='STU-PW-COU-010',
            module='学习中心',
            submodule='课程记录',
            priority='P1',
            expected_route='/courses',
        )

    def test_execute_manifest_item_dispatches_profile_p1_row_without_false_pass(self) -> None:
        self._assert_route_fail(
            manifest_item='STU-PW-PRO-010',
            module='个人中心',
            submodule='基本信息',
            priority='P1',
            expected_route='/profile',
        )

    def _assert_p0_route_fail(
        self,
        *,
        manifest_item: str,
        module: str,
        submodule: str,
        expected_route: str,
    ) -> None:
        self._assert_route_fail(
            manifest_item=manifest_item,
            module=module,
            submodule=submodule,
            priority='P0',
            expected_route=expected_route,
        )

    def _assert_route_fail(
        self,
        *,
        manifest_item: str,
        module: str,
        submodule: str,
        priority: str,
        expected_route: str,
    ) -> None:
        row = {
            'ManifestItem': manifest_item,
            '模块': module,
            '子模块': submodule,
            'Priority': priority,
        }
        events: list[tuple[str, object]] = []

        class FakePage:
            def goto(self, url: str, wait_until: str, timeout: int) -> None:
                events.append(('goto', url))

            def wait_for_load_state(self, state: str, timeout: int) -> None:
                events.append(('wait', state))

            def screenshot(self, path: str, full_page: bool) -> None:
                events.append(('screenshot', Path(path).name))
                Path(path).write_text('fake screenshot', encoding='utf-8')

        with tempfile.TemporaryDirectory() as tmp:
            status, notes, visible = execute_manifest_item(FakePage(), row, Path(tmp))

        self.assertEqual('Fail', status)
        self.assertTrue(visible)
        self.assertIn('页面可见但未落地', notes)
        self.assertIn(('goto', expected_route), events)
        self.assertIn(('wait', 'networkidle'), events)
        self.assertIn(('screenshot', f'{manifest_item}-before.png'), events)
        self.assertIn(('screenshot', f'{manifest_item}-after.png'), events)


class GapAuditTests(unittest.TestCase):
    def test_gap_audit_is_impure_when_visible_entry_exists(self) -> None:
        findings = audit_gap_register_purity({
            'GAP-001': False,
            'GAP-002': False,
            'GAP-003': True,
            'GAP-004': False,
        })
        self.assertEqual('gap register 不再纯净', findings)

    def test_gap_audit_is_pure_when_all_entries_are_hidden(self) -> None:
        findings = audit_gap_register_purity({
            'GAP-001': False,
            'GAP-002': False,
        })
        self.assertEqual('gap register 仍只包含无可见入口资产', findings)

    def test_parse_gap_register_ids_reads_declared_gap_entries(self) -> None:
        ids = parse_gap_register_ids('## GAP-001\nx\n## GAP-002\nx\n')
        self.assertEqual(['GAP-001', 'GAP-002'], ids)

    def test_build_gap_visibility_map_uses_page_trigger_calls_not_modal_or_function_defs(self) -> None:
        gap_register = '## GAP-001\nx\n## GAP-002\nx\n## GAP-003\nx\n## GAP-004\nx\n'
        prototype_html = '''
<div class="page" id="page-mock-practice">
    <button onclick="openModal('modal-student-mock-detail')">详情</button>
</div>
<div class="page" id="page-myclass">
    <button>无触发</button>
</div>
<div class="page" id="page-job-tracking">
    <button onclick="openModal('modal-reminder-settings')">提醒</button>
</div>
<div class="modal" id="modal-class-mock"></div>
<div class="modal" id="modal-student-mock-feedback"></div>
<script>
function openCoachingModal(company, position, location){}
</script>
'''
        actual = build_gap_visibility_map(gap_register, prototype_html)
        self.assertEqual(
            {
                'GAP-001': True,
                'GAP-002': False,
                'GAP-003': True,
                'GAP-004': False,
            },
            actual,
        )


if __name__ == '__main__':
    unittest.main()
