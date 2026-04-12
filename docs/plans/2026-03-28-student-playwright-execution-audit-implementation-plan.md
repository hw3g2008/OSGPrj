# Student Playwright Execution Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only student-side Playwright audit runner that executes the approved student acceptance manifest, gates on `P0`, records evidence, and refuses false passes.

**Architecture:** Keep batch orchestration, asset loading, result writing, and summary logic in a Python entrypoint under `student-test/`. Put route normalization, input-profile parsing, page interaction helpers, module-specific UI handlers, and gap-purity checks in a separate actions module so the live-browser logic stays isolated from file I/O and reporting.

**Tech Stack:** Python 3, `argparse`, `csv`, `dataclasses`, `pathlib`, `re`, `json`, `unittest`, `unittest.mock`, `playwright.sync_api`

---

## File Structure

- Create: `student-test/student_test_playwright_runner.py`
  - Loads the eight student execution assets
  - Parses CLI arguments and scope filters
  - Builds execution context
  - Runs precheck, `P0`, optional `P1`, and final summary
  - Writes `run-results.tsv` and `defects.md`
- Create: `student-test/student_playwright_actions.py`
  - Normalizes `menu://` and `surface://` route hints to real student routes
  - Parses `InputProfile`, `LocatorHint`, and state-isolation instructions
  - Authenticates the student browser session
  - Implements module-specific page actions and assertions
  - Applies state cleanup and audits `gap register` purity
- Create: `student-test/test_student_playwright_runner.py`
  - Covers TSV loading, manifest filtering, batch gating, result writing, and summary math
- Create: `student-test/test_student_playwright_actions.py`
  - Covers route mapping, input parsing, status classification, state isolation, and handler dispatch with fake page objects

## Read-Only References

- `student-test/2026-03-28-student-playwright-manifest.tsv`
- `student-test/2026-03-28-student-acceptance-test-cases.tsv`
- `student-test/2026-03-28-student-acceptance-trigger-links.tsv`
- `student-test/2026-03-28-student-gap-register.md`
- `osg-frontend/packages/student/src/router/index.ts`
- `osg-frontend/packages/student/src/views/positions/index.vue`
- `osg-frontend/packages/student/src/views/applications/index.vue`
- `osg-frontend/packages/student/src/views/mock-practice/index.vue`
- `osg-frontend/packages/student/src/views/courses/index.vue`
- `osg-frontend/packages/student/src/views/profile/index.vue`
- `osg-frontend/packages/student/e2e/positions-real-integration.e2e.spec.ts`
- `osg-frontend/packages/student/e2e/applications-real-integration.e2e.spec.ts`

### Task 1: Create Runner Skeleton And Asset Selection

**Files:**
- Create: `student-test/student_test_playwright_runner.py`
- Create: `student-test/test_student_playwright_runner.py`

- [ ] **Step 1: Write the failing tests for TSV loading and scope filtering**

```python
import csv
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
```

- [ ] **Step 2: Run the runner unit tests and confirm they fail**

Run:

```bash
python3 -m unittest discover -s student-test -p 'test_student_playwright_runner.py' -v
```

Expected: `FAIL` with `ModuleNotFoundError` or missing symbol errors for `student_test_playwright_runner`.

- [ ] **Step 3: Write the minimal runner module with constants and selection helpers**

```python
from __future__ import annotations

import argparse
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STUDENT_TEST_DIR = ROOT / 'student-test'
SCREENSHOT_DIR = ROOT / 'screenshots' / 'student-acceptance'
MANIFEST_PATH = STUDENT_TEST_DIR / '2026-03-28-student-playwright-manifest.tsv'
RUN_RESULTS_PATH = STUDENT_TEST_DIR / '2026-03-28-student-playwright-run-results.tsv'
DEFECTS_PATH = STUDENT_TEST_DIR / '2026-03-28-student-playwright-defects.md'
PRECHECK_PATH = SCREENSHOT_DIR / 'precheck.png'


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
```

- [ ] **Step 4: Re-run the unit tests and confirm they pass**

Run:

```bash
python3 -m unittest discover -s student-test -p 'test_student_playwright_runner.py' -v
```

Expected: `OK` with 3 passing tests.

- [ ] **Step 5: Commit the scaffold**

```bash
git add student-test/student_test_playwright_runner.py student-test/test_student_playwright_runner.py
git commit -m "feat: scaffold student playwright audit runner"
```

### Task 2: Add Result Rows, Defect Formatting, And Summary Math

**Files:**
- Modify: `student-test/student_test_playwright_runner.py`
- Modify: `student-test/test_student_playwright_runner.py`

- [ ] **Step 1: Write failing tests for results, defects, and summary totals**

```python
from student_test_playwright_runner import ItemResult, summarize_statuses, write_run_results, write_defects


class ReportingTests(unittest.TestCase):
    def test_summarize_statuses_counts_only_executed_rows(self) -> None:
        results = [
            ItemResult('A', 'ACC-A', 'TRI-A', '求职中心', '岗位信息', 'P0', 'Pass', 'a.png', 'ok'),
            ItemResult('B', 'ACC-B', 'TRI-B', '求职中心', '岗位信息', 'P0', 'Fail', 'b.png', 'bad'),
        ]
        summary = summarize_statuses(results, total_planned=3)
        self.assertEqual({'total': 3, 'pass': 1, 'fail': 1, 'block': 0, 'unexecuted': 1}, summary)

    def test_write_defects_includes_visible_but_unimplemented_field(self) -> None:
        result = ItemResult(
            'STU-PW-POS-999', 'STU-ACC-POS-999', 'STU-POS-999', '求职中心', '岗位信息',
            'P0', 'Fail', '/tmp/evidence.png', '页面可见但未落地', actual_result='实际结果',
            expected_result='预期结果', repro_steps='步骤', severity='High',
            defect_kind='Fail', visible_but_unimplemented=True,
        )
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'defects.md'
            write_defects([result], path)
            body = path.read_text(encoding='utf-8')
        self.assertIn('是否页面可见但未落地: 是', body)
```

- [ ] **Step 2: Run the tests and confirm the new reporting cases fail**

Run:

```bash
python3 -m unittest discover -s student-test -p 'test_student_playwright_runner.py' -v
```

Expected: `FAIL` with missing `ItemResult`, `summarize_statuses`, or writer helpers.

- [ ] **Step 3: Implement the result dataclass and report writers**

```python
from dataclasses import dataclass


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


def summarize_statuses(results: list[ItemResult], *, total_planned: int) -> dict[str, int]:
    summary = {'total': total_planned, 'pass': 0, 'fail': 0, 'block': 0, 'unexecuted': 0}
    for item in results:
        lowered = item.status.lower()
        if lowered in summary:
            summary[lowered] += 1
    executed = summary['pass'] + summary['fail'] + summary['block']
    summary['unexecuted'] = max(total_planned - executed, 0)
    return summary


def write_run_results(results: list[ItemResult], path: Path) -> None:
    with path.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.writer(handle, delimiter='\t')
        writer.writerow(['ManifestItem', 'AcceptanceRefs', 'TriggerItem', 'Module', 'Submodule', 'Priority', 'Status', 'EvidencePath', 'Notes'])
        for item in results:
            writer.writerow([item.manifest_item, item.acceptance_refs, item.trigger_item, item.module, item.submodule, item.priority, item.status, item.evidence_path, item.notes])


def write_defects(results: list[ItemResult], path: Path) -> None:
    lines = ['# Student Playwright Defects', '']
    findings = [item for item in results if item.status in {'Fail', 'Block'}]
    if not findings:
        lines.append('无缺陷。')
    for item in findings:
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
```

- [ ] **Step 4: Re-run the reporting tests and confirm they pass**

Run:

```bash
python3 -m unittest discover -s student-test -p 'test_student_playwright_runner.py' -v
```

Expected: `OK` with manifest and reporting tests all passing.

- [ ] **Step 5: Commit the report layer**

```bash
git add student-test/student_test_playwright_runner.py student-test/test_student_playwright_runner.py
git commit -m "feat: add student audit result writers"
```

### Task 3: Add Route Mapping, Input Parsing, And Isolation Helpers

**Files:**
- Create: `student-test/student_playwright_actions.py`
- Create: `student-test/test_student_playwright_actions.py`

- [ ] **Step 1: Write failing action-helper tests**

```python
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from student_playwright_actions import resolve_student_route, parse_input_profile, parse_locator_hint, apply_isolation_plan


class RouteMappingTests(unittest.TestCase):
    def test_resolves_positions_menu_to_real_route(self) -> None:
        self.assertEqual('/positions', resolve_student_route('menu://求职中心/岗位信息'))

    def test_resolves_profile_surface_to_real_route(self) -> None:
        self.assertEqual('/profile', resolve_student_route('surface://个人中心/基本信息/编辑基本信息'))


class ProfileParsingTests(unittest.TestCase):
    def test_parses_semicolon_input_profile(self) -> None:
        parsed = parse_input_profile('date=2026-01-18;method=official')
        self.assertEqual({'date': '2026-01-18', 'method': 'official'}, parsed)

    def test_parses_locator_hint_pairs(self) -> None:
        parsed = parse_locator_hint('stage select#apply-stage-select')
        self.assertEqual({'kind': 'stage', 'selector': 'select#apply-stage-select'}, parsed)

    def test_soft_refresh_calls_reload(self) -> None:
        calls = []
        class FakePage:
            def reload(self, wait_until: str = 'networkidle') -> None:
                calls.append(wait_until)
        apply_isolation_plan(FakePage(), 'soft_refresh')
        self.assertEqual(['networkidle'], calls)
```

- [ ] **Step 2: Run the helper tests and confirm they fail**

Run:

```bash
python3 -m unittest discover -s student-test -p 'test_student_playwright_actions.py' -v
```

Expected: `FAIL` with `ModuleNotFoundError` or missing helper functions.

- [ ] **Step 3: Implement route normalization and parsing helpers**

```python
from __future__ import annotations

ROUTE_PREFIXES = {
    'menu://求职中心/岗位信息': '/positions',
    'surface://求职中心/岗位信息': '/positions',
    'menu://求职中心/我的求职': '/applications',
    'surface://求职中心/我的求职': '/applications',
    'menu://求职中心/模拟应聘': '/mock-practice',
    'surface://求职中心/模拟应聘': '/mock-practice',
    'menu://学习中心/课程记录': '/courses',
    'surface://学习中心/课程记录': '/courses',
    'menu://个人中心/基本信息': '/profile',
    'surface://个人中心/基本信息': '/profile',
}


def resolve_student_route(route_hint: str) -> str:
    for prefix, route in ROUTE_PREFIXES.items():
        if route_hint.startswith(prefix):
            return route
    raise KeyError(f'unsupported route hint: {route_hint}')


def parse_input_profile(profile: str) -> dict[str, str]:
    if profile in {'', 'no_input'}:
        return {}
    pairs = [chunk.strip() for chunk in profile.split(';') if chunk.strip()]
    result: dict[str, str] = {}
    for pair in pairs:
        key, value = pair.split('=', 1)
        result[key.strip()] = value.strip()
    return result


def parse_locator_hint(locator_hint: str) -> dict[str, str]:
    first, _, rest = locator_hint.partition(' ')
    return {'kind': first.strip(), 'selector': rest.strip()}


def apply_isolation_plan(page: object, plan: str) -> None:
    if plan in {'independent', 'NONE', ''}:
        return
    if plan == 'soft_refresh':
        page.reload(wait_until='networkidle')
        return
    if plan.startswith('reset_'):
        return
    raise ValueError(f'unsupported state isolation: {plan}')
```

- [ ] **Step 4: Re-run the helper tests and confirm they pass**

Run:

```bash
python3 -m unittest discover -s student-test -p 'test_student_playwright_actions.py' -v
```

Expected: `OK` with 5 passing tests.

- [ ] **Step 5: Commit the action-helper base**

```bash
git add student-test/student_playwright_actions.py student-test/test_student_playwright_actions.py
git commit -m "feat: add student audit route and parsing helpers"
```

### Task 4: Add Student Login, Precheck, And Runtime Context

**Files:**
- Modify: `student-test/student_test_playwright_runner.py`
- Modify: `student-test/student_playwright_actions.py`
- Modify: `student-test/test_student_playwright_runner.py`

- [ ] **Step 1: Write failing tests for precheck and runtime defaults**

```python
from student_test_playwright_runner import RuntimeConfig, build_runtime_config, should_enter_p1


class RuntimeConfigTests(unittest.TestCase):
    def test_build_runtime_config_uses_student_defaults(self) -> None:
        config = build_runtime_config(base_url=None, username=None, password=None, scope='p0')
        self.assertEqual('http://127.0.0.1:4000', config.base_url)
        self.assertEqual('student_demo', config.username)
        self.assertEqual('student123', config.password)

    def test_should_enter_p1_requires_zero_fail_and_zero_block(self) -> None:
        self.assertFalse(should_enter_p1({'pass': 24, 'fail': 1, 'block': 0, 'total': 25, 'unexecuted': 0}))
        self.assertFalse(should_enter_p1({'pass': 24, 'fail': 0, 'block': 1, 'total': 25, 'unexecuted': 0}))
        self.assertTrue(should_enter_p1({'pass': 25, 'fail': 0, 'block': 0, 'total': 25, 'unexecuted': 0}))
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```bash
python3 -m unittest discover -s student-test -p 'test_student_playwright_runner.py' -v
```

Expected: `FAIL` with missing `RuntimeConfig`, `build_runtime_config`, or `should_enter_p1`.

- [ ] **Step 3: Implement login/session helpers and runtime config**

```python
import json
from dataclasses import dataclass


@dataclass
class RuntimeConfig:
    base_url: str
    username: str
    password: str
    scope: str


def build_runtime_config(base_url: str | None, username: str | None, password: str | None, scope: str) -> RuntimeConfig:
    return RuntimeConfig(
        base_url=(base_url or 'http://127.0.0.1:4000').rstrip('/'),
        username=username or 'student_demo',
        password=password or 'student123',
        scope=scope,
    )


def should_enter_p1(summary: dict[str, int]) -> bool:
    return summary['total'] == summary['pass'] and summary['fail'] == 0 and summary['block'] == 0
```

```python
def authenticate_student_session(page, *, base_url: str, username: str, password: str) -> str:
    response = page.request.post(f'{base_url}/api/student/login', data={'username': username, 'password': password})
    body = response.json()
    if not response.ok or body.get('code') != 200 or not body.get('token'):
        raise RuntimeError(f'student login failed: body={body}')
    page.add_init_script(
        script=f"""
        window.localStorage.setItem('osg_token', {json.dumps(body['token'])});
        window.localStorage.setItem('osg_user', JSON.stringify({json.dumps({'userName': username, 'nickName': 'Test Student', 'roles': ['student']})}));
        """,
    )
    return body['token']


def precheck_environment(page, *, config: RuntimeConfig, screenshot_path: Path) -> tuple[str, str]:
    authenticate_student_session(page, base_url=config.base_url, username=config.username, password=config.password)
    page.goto(f'{config.base_url}/positions', wait_until='domcontentloaded', timeout=30000)
    page.wait_for_load_state('networkidle', timeout=30000)
    page.screenshot(path=str(screenshot_path), full_page=True)
    if page.get_by_role('heading', name='岗位信息').count() == 0:
        return 'Block', '预检失败：岗位信息页面未出现标题'
    return 'Pass', '预检通过：student 登录与首屏页面可用'
```

- [ ] **Step 4: Re-run the runner tests and confirm the runtime tests pass**

Run:

```bash
python3 -m unittest discover -s student-test -p 'test_student_playwright_runner.py' -v
```

Expected: `OK` with runtime and reporting tests all passing.

- [ ] **Step 5: Commit the runtime/precheck layer**

```bash
git add student-test/student_test_playwright_runner.py student-test/student_playwright_actions.py student-test/test_student_playwright_runner.py
git commit -m "feat: add student audit runtime precheck"
```

### Task 5: Implement Module Handlers For P0 And Gate The Batch

**Files:**
- Modify: `student-test/student_playwright_actions.py`
- Modify: `student-test/student_test_playwright_runner.py`
- Modify: `student-test/test_student_playwright_actions.py`

- [ ] **Step 1: Write failing tests for P0 dispatch and visible-but-unimplemented classification**

```python
from student_playwright_actions import classify_result, execute_manifest_item


class P0DispatchTests(unittest.TestCase):
    def test_classify_visible_but_unimplemented_as_fail(self) -> None:
        actual = classify_result(primary_ok=False, secondary_ok=False, visible_target=True, blocked=False)
        self.assertEqual(('Fail', True), actual)

    def test_classify_environment_issue_as_block(self) -> None:
        actual = classify_result(primary_ok=False, secondary_ok=False, visible_target=False, blocked=True)
        self.assertEqual(('Block', False), actual)
```

- [ ] **Step 2: Run the action tests and confirm they fail**

Run:

```bash
python3 -m unittest discover -s student-test -p 'test_student_playwright_actions.py' -v
```

Expected: `FAIL` with missing `classify_result` or `execute_manifest_item`.

- [ ] **Step 3: Implement result classification and explicit P0 module handlers**

```python
def classify_result(*, primary_ok: bool, secondary_ok: bool, visible_target: bool, blocked: bool) -> tuple[str, bool]:
    if blocked:
        return 'Block', False
    if primary_ok and secondary_ok:
        return 'Pass', False
    if visible_target:
        return 'Fail', True
    return 'Fail', False


def execute_manifest_item(page, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    if row['Priority'] == 'P0':
        return execute_p0_item(page, row, evidence_dir)
    return execute_p1_item(page, row, evidence_dir)


def execute_p0_item(page, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
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
    raise KeyError(f'unsupported P0 row: {row["ManifestItem"]}')


def execute_positions_submit_flow(page, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/positions')


def execute_applications_submit_flow(page, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/applications')


def execute_mock_practice_submit_flow(page, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/mock-practice')


def execute_courses_submit_flow(page, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/courses')


def execute_profile_submit_flow(page, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/profile')


def execute_common_flow(page, row: dict[str, str], evidence_dir: Path, *, route: str) -> tuple[str, str, bool]:
    page.goto(route, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_load_state('networkidle', timeout=30000)
    page.screenshot(path=str(evidence_dir / f"{row['ManifestItem']}-before.png"), full_page=True)
    primary_ok = False
    secondary_ok = False
    status, visible_but_unimplemented = classify_result(
        primary_ok=primary_ok,
        secondary_ok=secondary_ok,
        visible_target=True,
        blocked=False,
    )
    page.screenshot(path=str(evidence_dir / f"{row['ManifestItem']}-after.png"), full_page=True)
    return status, f"{row['ManifestItem']} 尚未补齐显式 DOM 断言，先按防假通过策略记失败", visible_but_unimplemented
```

- [ ] **Step 4: Implement the batch gate in the runner**

```python
def run_priority_batch(page, rows, *, total_planned: int, evidence_dir: Path) -> tuple[list[ItemResult], dict[str, int]]:
    results: list[ItemResult] = []
    for row in rows:
        status, notes, visible_but_unimplemented = execute_manifest_item(page, row, evidence_dir)
        results.append(
            ItemResult(
                manifest_item=row['ManifestItem'],
                acceptance_refs=row['AcceptanceRefs'],
                trigger_item=row['TriggerItem'],
                module=row['模块'],
                submodule=row['子模块'],
                priority=row['Priority'],
                status=status,
                evidence_path=str(evidence_dir / row['ManifestItem']),
                notes=notes,
                defect_kind=status,
                visible_but_unimplemented=visible_but_unimplemented,
            )
        )
    return results, summarize_statuses(results, total_planned=total_planned)
```

- [ ] **Step 5: Run unit tests and a single live P0 item**

Run:

```bash
python3 -m unittest discover -s student-test -p 'test_student_playwright_*.py' -v
python3 student-test/student_test_playwright_runner.py --scope p0 --manifest-item STU-PW-POS-009
```

Expected:
- Unit tests: `OK`
- Live run: one result row for `STU-PW-POS-009` plus evidence under `screenshots/student-acceptance/`，且在模块显式断言补齐前不得误报 `Pass`

- [ ] **Step 6: Commit the P0 execution layer**

```bash
git add student-test/student_test_playwright_runner.py student-test/student_playwright_actions.py student-test/test_student_playwright_actions.py
git commit -m "feat: add student audit p0 execution gate"
```

### Task 6: Implement P1 Handlers, Gap Audit, And Final Orchestration

**Files:**
- Modify: `student-test/student_test_playwright_runner.py`
- Modify: `student-test/student_playwright_actions.py`
- Modify: `student-test/test_student_playwright_runner.py`
- Modify: `student-test/test_student_playwright_actions.py`

- [ ] **Step 1: Write failing tests for `P1` follow-up, gap purity, and final summary**

```python
from student_playwright_actions import audit_gap_register_purity


class GapAuditTests(unittest.TestCase):
    def test_gap_audit_is_impure_when_visible_entry_exists(self) -> None:
        findings = audit_gap_register_purity({
            'GAP-001': False,
            'GAP-002': False,
            'GAP-003': True,
            'GAP-004': False,
        })
        self.assertEqual('gap register 不再纯净', findings)
```

- [ ] **Step 2: Run the test suites and confirm the final-orchestration cases fail**

Run:

```bash
python3 -m unittest discover -s student-test -p 'test_student_playwright_*.py' -v
```

Expected: `FAIL` with missing `audit_gap_register_purity`, `execute_p1_item`, or final summary logic.

- [ ] **Step 3: Implement `P1` handlers, gap audit, and summary rendering**

```python
def execute_p1_item(page, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    module = row['模块']
    if module == '求职中心' and row['子模块'] == '岗位信息':
        return execute_positions_surface_flow(page, row, evidence_dir)
    if module == '求职中心' and row['子模块'] == '我的求职':
        return execute_applications_surface_flow(page, row, evidence_dir)
    if module == '求职中心' and row['子模块'] == '模拟应聘':
        return execute_mock_practice_surface_flow(page, row, evidence_dir)
    if module == '学习中心' and row['子模块'] == '课程记录':
        return execute_courses_surface_flow(page, row, evidence_dir)
    if module == '个人中心' and row['子模块'] == '基本信息':
        return execute_profile_surface_flow(page, row, evidence_dir)
    raise KeyError(f'unsupported P1 row: {row["ManifestItem"]}')


def execute_positions_surface_flow(page, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/positions')


def execute_applications_surface_flow(page, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/applications')


def execute_mock_practice_surface_flow(page, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/mock-practice')


def execute_courses_surface_flow(page, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/courses')


def execute_profile_surface_flow(page, row: dict[str, str], evidence_dir: Path) -> tuple[str, str, bool]:
    return execute_common_flow(page, row, evidence_dir, route='/profile')


def audit_gap_register_purity(gap_visibility: dict[str, bool]) -> str:
    for gap_id, has_visible_entry in gap_visibility.items():
        if has_visible_entry:
            return 'gap register 不再纯净'
    return 'gap register 仍只包含无可见入口资产'
```

```python
def render_final_summary(p0_summary: dict[str, int], p1_summary: dict[str, int], *, visible_failures: int, top_defects: list[str], top_blockers: list[str], gap_status: str, run_results_path: Path, defects_path: Path) -> str:
    p0_green = p0_summary['pass'] == p0_summary['total'] and p0_summary['fail'] == 0 and p0_summary['block'] == 0
    p1_green = (
        p1_summary['block'] == 0
        and p1_summary['fail'] <= int(p1_summary['total'] * 0.05)
        and p1_summary['pass'] + p1_summary['fail'] + p1_summary['block'] == p1_summary['total']
    ) if p1_summary['total'] > 0 else True
    release_ready = p0_green and p1_green
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
```

- [ ] **Step 4: Implement the CLI main path with `P0 -> optional P1` orchestration**

```python
from playwright.sync_api import sync_playwright


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    config = build_runtime_config(args.base_url, args.username, args.password, args.scope)
    manifest_rows = load_tsv(MANIFEST_PATH)
    if args.manifest_item:
        manifest_rows = [row for row in manifest_rows if row['ManifestItem'] == args.manifest_item]
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=not args.headed)
        page = browser.new_page(viewport={'width': 1440, 'height': 960})
        precheck_status, precheck_notes = precheck_environment(page, config=config, screenshot_path=PRECHECK_PATH)
        if precheck_status == 'Block':
            results = [
                ItemResult(
                    manifest_item='ENV-BLOCK',
                    acceptance_refs='N/A',
                    trigger_item='N/A',
                    module='环境',
                    submodule='预检',
                    priority='P0',
                    status='Block',
                    evidence_path=str(PRECHECK_PATH),
                    notes=precheck_notes,
                    actual_result=precheck_notes,
                    expected_result='预检应通过：student 登录与首屏页面可用',
                    repro_steps='执行 runner 预检',
                    severity='Critical',
                    defect_kind='Block',
                )
            ]
            write_run_results(results, RUN_RESULTS_PATH)
            write_defects(results, DEFECTS_PATH)
            browser.close()
            return 1
        p0_rows = filter_manifest_items(manifest_rows, priority='P0')
        p0_results, p0_summary = run_priority_batch(page, p0_rows, total_planned=len(p0_rows), evidence_dir=SCREENSHOT_DIR)
        if not should_enter_p1(p0_summary):
            write_run_results(p0_results, RUN_RESULTS_PATH)
            write_defects(p0_results, DEFECTS_PATH)
            browser.close()
            return 1
        p1_rows = filter_manifest_items(manifest_rows, priority='P1', regression_only=True)
        p1_results, p1_summary = run_priority_batch(page, p1_rows, total_planned=len(p1_rows), evidence_dir=SCREENSHOT_DIR)
        all_results = [*p0_results, *p1_results]
        write_run_results(all_results, RUN_RESULTS_PATH)
        write_defects(all_results, DEFECTS_PATH)
        browser.close()
        return 0
```

- [ ] **Step 5: Run the full verification stack**

Run:

```bash
python3 -m unittest discover -s student-test -p 'test_student_playwright_*.py' -v
python3 student-test/student_test_playwright_runner.py --scope p0
```

Expected:
- Unit tests: `OK`
- `--scope p0`: produces `student-test/2026-03-28-student-playwright-run-results.tsv`, `student-test/2026-03-28-student-playwright-defects.md`, and `screenshots/student-acceptance/`
- if the printed `P0` summary is `25 / 25 / 0 / 0`, then run `python3 student-test/student_test_playwright_runner.py --scope p1` and expect `P1` evidence plus the final eight-line summary

- [ ] **Step 6: Commit the final orchestrator**

```bash
git add student-test/student_test_playwright_runner.py student-test/student_playwright_actions.py student-test/test_student_playwright_runner.py student-test/test_student_playwright_actions.py
git commit -m "feat: finish student acceptance audit runner"
```

## Verification Checklist

- `P0` executes all 25 planned rows before making the gate decision
- `P1` does not start if any `P0` row is `Fail` or `Block`
- `run-results.tsv` contains only executed rows
- `defects.md` includes all required fields, including `是否页面可见但未落地`
- evidence paths point into `screenshots/student-acceptance/`
- `gap register` summary returns either `gap register 仍只包含无可见入口资产` or `gap register 不再纯净`
- final summary prints the exact eight-line structure required by the approved design
