from __future__ import annotations

import importlib.util
import unittest
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch


def load_runtime_seed_admin_module():
    module_path = Path(__file__).resolve().parents[2] / "bin" / "runtime_seed_admin.py"
    spec = importlib.util.spec_from_file_location("runtime_seed_admin", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None and spec.loader is not None
    spec.loader.exec_module(module)
    return module


runtime_seed_admin = load_runtime_seed_admin_module()


class FakeCursor:
    def __init__(self):
        self.executed: list[tuple[str, object]] = []
        self.lastrowid = 1000

    def execute(self, sql, params=None):
        self.executed.append((sql, params))
        self.lastrowid += 1

    def fetchone(self):
        return None

    def fetchall(self):
        return []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class FakeConnection:
    def __init__(self):
        self.cursor_instance = FakeCursor()
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def cursor(self):
        return self.cursor_instance

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


class RuntimeSeedAdminTest(unittest.TestCase):
    def test_seed_job_overview_binds_rows_to_runtime_lead_mentor_and_visible_position(self):
        conn = FakeConnection()

        with patch.object(runtime_seed_admin, "connect", return_value=conn), \
             patch.object(runtime_seed_admin, "resolve_seed_mentors", return_value=[(3, "Mentor A"), (4, "Mentor B")]), \
             patch.object(runtime_seed_admin, "resolve_lead_mentor_runtime_user", return_value=(101, "student_demo")), \
             patch.object(runtime_seed_admin, "ensure_student"):
            created = runtime_seed_admin.seed_job_overview(Path("deploy/.env.dev"), 1)

        position_inserts = [params for sql, params in conn.cursor_instance.executed if "insert into osg_position" in sql]
        self.assertEqual(1, len(position_inserts), "job-overview seed 应创建可见岗位供 lead-mentor positions 页面使用")

        application_inserts = [params for sql, params in conn.cursor_instance.executed if "insert into osg_job_application" in sql]
        self.assertEqual(3, len(application_inserts), "job-overview seed 应创建 3 条 scoped application 记录")
        self.assertTrue(all(params[1] is not None for params in application_inserts), "application 应绑定 position_id")
        self.assertTrue(all(params[10] == 101 for params in application_inserts), "application 应绑定当前 runtime lead-mentor userId")
        self.assertTrue(all(params[11] == "student_demo" for params in application_inserts), "application 应记录当前 runtime lead-mentor 名称")
        self.assertIn("position_id", created[0], "seed 返回值应暴露 position_id，便于后续 API/E2E 精确验证")

    def test_seed_student_hours_binds_managed_student_to_runtime_lead_mentor(self):
        conn = FakeConnection()

        with patch.object(runtime_seed_admin, "connect", return_value=conn), \
             patch.object(runtime_seed_admin, "resolve_seed_mentor", return_value=(3, "Mentor A", Decimal("500"))), \
             patch.object(runtime_seed_admin, "resolve_lead_mentor_runtime_user", return_value=(101, "student_demo")), \
             patch.object(runtime_seed_admin, "ensure_student") as ensure_student:
            runtime_seed_admin.seed_student_hours(Path("deploy/.env.dev"), 1)

        _, kwargs = ensure_student.call_args
        self.assertEqual(101, kwargs["lead_mentor_id"], "student-hours seed 应把学员绑定到当前 runtime lead-mentor userId")

    def test_seed_mock_practice_ack_ready_binds_scheduled_record_to_runtime_lead_mentor(self):
        conn = FakeConnection()

        with patch.object(runtime_seed_admin, "connect", return_value=conn), \
             patch.object(runtime_seed_admin, "resolve_lead_mentor_runtime_user", return_value=(101, "student_demo")), \
             patch.object(runtime_seed_admin, "ensure_student") as ensure_student:
            created = runtime_seed_admin.seed_mock_practice_ack_ready(Path("deploy/.env.dev"), 1)

        _, kwargs = ensure_student.call_args
        self.assertEqual(101, kwargs["lead_mentor_id"], "ack-ready mock-practice seed 应把学员绑定到当前 runtime lead-mentor userId")

        practice_inserts = [params for sql, params in conn.cursor_instance.executed if "insert into osg_mock_practice" in sql]
        self.assertEqual(1, len(practice_inserts), "ack-ready mock-practice seed 应只创建一条 scheduled 记录")
        self.assertEqual("scheduled", practice_inserts[0][6], "ack-ready mock-practice 记录状态应为 scheduled")
        self.assertEqual("101", practice_inserts[0][7], "ack-ready mock-practice 记录应把 mentor_ids 绑定到当前 runtime lead-mentor userId")
        self.assertEqual("student_demo", practice_inserts[0][8], "ack-ready mock-practice 记录应把 mentor_names 绑定到当前 runtime lead-mentor 名称")
        self.assertEqual("scheduled", created[0]["status"], "seed 返回值应标识 scheduled 状态，便于后续 curl/E2E 精确验证")


if __name__ == "__main__":
    unittest.main()
