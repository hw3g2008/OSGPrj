from __future__ import annotations

import json
import re
from pathlib import Path

ROUTE_PREFIXES = (
    ('menu://求职中心/岗位信息', '/positions'),
    ('surface://求职中心/岗位信息', '/positions'),
    ('menu://求职中心/我的求职', '/applications'),
    ('surface://求职中心/我的求职', '/applications'),
    ('menu://求职中心/模拟应聘', '/mock-practice'),
    ('surface://求职中心/模拟应聘', '/mock-practice'),
    ('menu://学习中心/课程记录', '/courses'),
    ('surface://学习中心/课程记录', '/courses'),
    ('menu://个人中心/基本信息', '/profile'),
    ('surface://个人中心/基本信息', '/profile'),
)

_P0_ROUTES = {
    ('求职中心', '岗位信息'): '/positions',
    ('求职中心', '我的求职'): '/applications',
    ('求职中心', '模拟应聘'): '/mock-practice',
    ('学习中心', '课程记录'): '/courses',
    ('个人中心', '基本信息'): '/profile',
}


def resolve_student_route(route_hint: str) -> str:
    for prefix, route in ROUTE_PREFIXES:
        if route_hint == prefix or route_hint.startswith(f'{prefix}/'):
            return route
    raise KeyError(f'unsupported route hint: {route_hint}')


def parse_input_profile(profile: str) -> dict[str, str]:
    if profile in {'', 'no_input'}:
        return {}
    parsed: dict[str, str] = {}
    for chunk in profile.split(';'):
        chunk = chunk.strip()
        if not chunk:
            continue
        key, value = chunk.split('=', 1)
        parsed[key.strip()] = value.strip()
    return parsed


def parse_locator_hint(locator_hint: str) -> dict[str, str]:
    kind, _, selector = locator_hint.partition(' ')
    if not kind or not selector.strip():
        raise ValueError(f'malformed locator hint: {locator_hint}')
    return {'kind': kind.strip(), 'selector': selector.strip()}


def apply_isolation_plan(page: object, plan: str) -> None:
    if plan in {'independent', 'NONE', ''}:
        return
    if plan == 'soft_refresh':
        page.reload(wait_until='networkidle')
        return
    if plan.startswith('reset_'):
        return
    raise ValueError(f'unsupported state isolation plan: {plan}')


def authenticate_student_session(page: object, *, base_url: str, username: str, password: str) -> str:
    response = page.request.post(
        f'{base_url}/api/student/login',
        data={
            'username': username,
            'password': password,
        },
    )
    body = response.json()
    token = body.get('token')
    if not response.ok or body.get('code') != 200 or not token:
        raise RuntimeError(f'student login failed: body={body}')
    user_payload = {
        'userName': username,
        'nickName': 'Test Student',
        'roles': ['student'],
    }
    page.add_init_script(
        f"""
        window.localStorage.setItem('osg_token', {json.dumps(token)});
        window.localStorage.setItem('osg_user', JSON.stringify({json.dumps(user_payload)}));
        """.strip()
    )
    return token


def precheck_environment(page: object, *, config: object, screenshot_path: Path) -> tuple[str, str]:
    screenshot_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        authenticate_student_session(
            page,
            base_url=getattr(config, 'base_url'),
            username=getattr(config, 'username'),
            password=getattr(config, 'password'),
        )
    except Exception as exc:
        return 'Block', f'预检失败：student 登录失败，{exc}'
    page.goto(f"{getattr(config, 'base_url')}/positions", wait_until='domcontentloaded', timeout=30000)
    page.wait_for_load_state('networkidle', timeout=30000)
    page.screenshot(path=str(screenshot_path), full_page=True)
    heading = page.get_by_role('heading', name=re.compile(r'岗位信息'))
    if heading.count() == 0:
        return 'Block', '预检失败：岗位信息页面未出现标题'
    return 'Pass', '预检通过：student 登录与首屏页面可用'


def classify_result(*, primary_ok: bool, secondary_ok: bool, visible_target: bool, blocked: bool) -> tuple[str, bool]:
    if blocked:
        return 'Block', False
    if primary_ok and secondary_ok:
        return 'Pass', False
    if visible_target:
        return 'Fail', True
    return 'Fail', False


def execute_manifest_item(page: object, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    if row['Priority'] == 'P0':
        return execute_p0_item(page, row, evidence_dir)
    return execute_p1_item(page, row, evidence_dir)


def execute_p0_item(page: object, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    module = row['模块']
    submodule = row['子模块']
    if module == '求职中心' and submodule == '岗位信息':
        return execute_positions_submit_flow(page, row, evidence_dir)
    if module == '求职中心' and submodule == '我的求职':
        return execute_applications_submit_flow(page, row, evidence_dir)
    if module == '求职中心' and submodule == '模拟应聘':
        return execute_mock_practice_submit_flow(page, row, evidence_dir)
    if module == '学习中心' and submodule == '课程记录':
        return execute_courses_submit_flow(page, row, evidence_dir)
    if module == '个人中心' and submodule == '基本信息':
        return execute_profile_submit_flow(page, row, evidence_dir)
    raise KeyError(f"unsupported P0 row: {row['ManifestItem']}")


def execute_p1_item(page: object, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    raise KeyError(f"P1 execution not implemented yet: {row['ManifestItem']}")


def execute_positions_submit_flow(page: object, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/positions')


def execute_applications_submit_flow(page: object, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/applications')


def execute_mock_practice_submit_flow(page: object, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/mock-practice')


def execute_courses_submit_flow(page: object, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/courses')


def execute_profile_submit_flow(page: object, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/profile')


def execute_common_flow(
    page: object,
    row: dict[str, str],
    evidence_dir: Path,
    *,
    route: str,
) -> tuple[str, str, bool]:
    evidence_dir.mkdir(parents=True, exist_ok=True)
    manifest_item = row['ManifestItem']
    try:
        page.goto(route, wait_until='domcontentloaded', timeout=30000)
        page.wait_for_load_state('networkidle', timeout=30000)
        page.screenshot(path=str(evidence_dir / f'{manifest_item}-before.png'), full_page=True)
    except Exception as exc:
        status, visible_but_unimplemented = classify_result(
            primary_ok=False,
            secondary_ok=False,
            visible_target=False,
            blocked=True,
        )
        return status, f'{manifest_item} 执行被环境或页面异常阻断：{exc}', visible_but_unimplemented
    status, visible_but_unimplemented = classify_result(
        primary_ok=False,
        secondary_ok=False,
        visible_target=True,
        blocked=False,
    )
    page.screenshot(path=str(evidence_dir / f'{manifest_item}-after.png'), full_page=True)
    route_hint = _P0_ROUTES.get((row['模块'], row['子模块']), route)
    notes = f'{manifest_item} 页面可见但未落地：{route_hint} 尚未补齐显式 DOM 断言，先按防假通过策略记失败'
    return status, notes, visible_but_unimplemented
