import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from student_playwright_actions import (  # noqa: E402
    apply_isolation_plan,
    parse_input_profile,
    parse_locator_hint,
    resolve_student_route,
)


class RouteMappingTests(unittest.TestCase):
    def test_resolves_positions_menu_to_real_route(self) -> None:
        self.assertEqual('/positions', resolve_student_route('menu://求职中心/岗位信息'))

    def test_resolves_profile_surface_to_real_route(self) -> None:
        self.assertEqual('/profile', resolve_student_route('surface://个人中心/基本信息/编辑基本信息'))

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


class IsolationPlanTests(unittest.TestCase):
    def test_soft_refresh_calls_reload(self) -> None:
        calls: list[str] = []

        class FakePage:
            def reload(self, wait_until: str = 'networkidle') -> None:
                calls.append(wait_until)

        apply_isolation_plan(FakePage(), 'soft_refresh')
        self.assertEqual(['networkidle'], calls)

    def test_rejects_unsupported_isolation_plans(self) -> None:
        class FakePage:
            def reload(self, wait_until: str = 'networkidle') -> None:
                raise AssertionError('should not be called')

        with self.assertRaises(ValueError):
            apply_isolation_plan(FakePage(), 'full_reset')


if __name__ == '__main__':
    unittest.main()
