from __future__ import annotations

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
