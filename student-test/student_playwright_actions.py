from __future__ import annotations

import json
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
    authenticate_student_session(
        page,
        base_url=getattr(config, 'base_url'),
        username=getattr(config, 'username'),
        password=getattr(config, 'password'),
    )
    page.goto(f"{getattr(config, 'base_url')}/positions", wait_until='domcontentloaded', timeout=30000)
    page.wait_for_load_state('networkidle', timeout=30000)
    page.screenshot(path=str(screenshot_path), full_page=True)
    if page.get_by_role('heading', name='岗位信息').count() == 0:
        return 'Block', '预检失败：岗位信息页面未出现标题'
    return 'Pass', '预检通过：student 登录与首屏页面可用'
