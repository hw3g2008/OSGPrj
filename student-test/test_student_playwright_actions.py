import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from student_playwright_actions import (  # noqa: E402
    apply_isolation_plan,
    classify_result,
    execute_manifest_item,
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


if __name__ == '__main__':
    unittest.main()
