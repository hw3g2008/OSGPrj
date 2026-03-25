from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


def load_osg_runtime_cleanup_module():
    module_path = Path(__file__).resolve().parents[2] / "bin" / "osg_runtime_cleanup.py"
    spec = importlib.util.spec_from_file_location("osg_runtime_cleanup", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None and spec.loader is not None
    spec.loader.exec_module(module)
    return module


class OsgRuntimeCleanupTest(unittest.TestCase):
    def test_build_delete_specs_uses_scoped_ids_and_chain_marker_in_safe_order(self):
        module = load_osg_runtime_cleanup_module()
        ids = module.RuntimeCleanupIds(
            user_ids=[501, 502],
            staff_ids=[31],
            student_ids=[41],
            position_ids=[51],
            application_ids=[61],
        )
        columns_by_table = {
            "sys_user_role": {"user_id"},
            "osg_staff_change_request": {"staff_id", "remark"},
            "osg_staff_schedule": {"staff_id", "mentor_id"},
            "osg_contract": {"student_id"},
            "osg_class_record": {"student_id"},
            "osg_mock_practice": {"student_id"},
            "osg_coaching": {"application_id", "student_id", "mentor_id"},
            "osg_job_application": {"student_id", "position_id", "lead_mentor_id"},
            "osg_student_position": {"student_id", "position_name", "company_name"},
            "osg_student_job_position_state": {"user_id", "position_id"},
            "osg_student_job_position": {"user_id", "position_id"},
            "osg_student_mock_request": {"user_id"},
            "osg_student_course_record": {"user_id"},
            "osg_student_change_request": {"student_id", "remark"},
            "osg_student_profile_change": {"user_id"},
            "osg_student_profile": {"user_id"},
            "osg_position": {"position_id", "position_name", "company_name", "remark"},
            "osg_student": {"student_id", "student_name", "email", "remark"},
            "osg_staff": {"staff_id", "staff_name", "email", "remark"},
            "sys_user": {"user_id", "user_name", "email", "nick_name", "remark"},
        }

        specs = module.build_delete_specs("CHAIN_20260325_01", ids, columns_by_table)
        tables = [spec.table for spec in specs]

        self.assertEqual(
            [
                "sys_user_role",
                "osg_staff_change_request",
                "osg_staff_schedule",
                "osg_contract",
                "osg_class_record",
                "osg_mock_practice",
                "osg_coaching",
                "osg_job_application",
                "osg_student_position",
                "osg_student_job_position_state",
                "osg_student_job_position",
                "osg_student_mock_request",
                "osg_student_course_record",
                "osg_student_change_request",
                "osg_student_profile_change",
                "osg_student_profile",
                "osg_position",
                "osg_student",
                "osg_staff",
                "sys_user",
            ],
            tables,
        )

        schedule_spec = next(spec for spec in specs if spec.table == "osg_staff_schedule")
        self.assertIn("staff_id IN", schedule_spec.where_sql)
        self.assertIn("mentor_id IN", schedule_spec.where_sql)
        self.assertEqual((31, 501, 502), schedule_spec.params)

        staff_change_spec = next(spec for spec in specs if spec.table == "osg_staff_change_request")
        self.assertIn("staff_id IN", staff_change_spec.where_sql)
        self.assertIn("LIKE", staff_change_spec.where_sql)

        student_change_spec = next(spec for spec in specs if spec.table == "osg_student_change_request")
        self.assertIn("student_id IN", student_change_spec.where_sql)
        self.assertIn("LIKE", student_change_spec.where_sql)

        root_position_spec = next(spec for spec in specs if spec.table == "osg_position")
        self.assertIn("position_id IN", root_position_spec.where_sql)
        self.assertIn("LIKE", root_position_spec.where_sql)
        self.assertIn("%CHAIN_20260325_01%", root_position_spec.params)

        root_user_spec = next(spec for spec in specs if spec.table == "sys_user")
        self.assertTrue(root_user_spec.where_sql.startswith("("))
        self.assertIn("user_id IN", root_user_spec.where_sql)
        self.assertEqual(6, len(root_user_spec.params))
        self.assertFalse(any(spec.where_sql.strip() == "" for spec in specs))

    def test_build_delete_specs_skips_tables_without_safe_match_columns(self):
        module = load_osg_runtime_cleanup_module()
        ids = module.RuntimeCleanupIds(user_ids=[501], staff_ids=[], student_ids=[], position_ids=[], application_ids=[])
        columns_by_table = {
            "sys_user_role": {"user_id"},
            "osg_staff_schedule": {"archived_at"},
            "osg_position": {"created_at"},
            "sys_user": {"user_id"},
        }

        specs = module.build_delete_specs("CHAIN_20260325_02", ids, columns_by_table)

        self.assertEqual(["sys_user_role", "sys_user"], [spec.table for spec in specs])
        self.assertNotIn("osg_staff_schedule", [spec.table for spec in specs])
        self.assertNotIn("osg_position", [spec.table for spec in specs])

    def test_find_runtime_ids_includes_linked_staff_and_student_account_user_ids(self):
        module = load_osg_runtime_cleanup_module()
        test_case = self

        class Cursor:
            def __init__(self):
                self.last_sql = ""
                self.last_params = ()

            def execute(self, sql, params=None):
                self.last_sql = " ".join(sql.split()).lower()
                self.last_params = tuple(params or ())

            def fetchall(self):
                sql = self.last_sql
                params = self.last_params

                if sql.startswith("select user_id from sys_user where user_name in"):
                    test_case.assertEqual(
                        (
                            "hw3g2008+a03251430@outlook.com",
                            "hw3g2008+l03251430@outlook.com",
                            "hw3g2008+m03251430@outlook.com",
                            "hw3g2008+s03251430@outlook.com",
                        ),
                        params,
                    )
                    return [(930,), (931,), (932,), (933,)]
                if sql.startswith("select user_id from sys_user where"):
                    return [(931,), (933,)]
                if sql.startswith("select staff_id from osg_staff where"):
                    return [(112,), (113,), (114,)]
                if sql.startswith("select student_id from osg_student where"):
                    return [(1169432515224,)]
                if sql.startswith("select position_id from osg_position where"):
                    return [(128,), (129,)]
                if sql.startswith("select application_id from osg_job_application where"):
                    return []
                if sql.startswith("select email from osg_staff where"):
                    return [
                        ("hw3g2008+a03251430@outlook.com",),
                        ("hw3g2008+l03251430@outlook.com",),
                        ("hw3g2008+m03251430@outlook.com",),
                    ]
                if sql.startswith("select email from osg_student where"):
                    return [("hw3g2008+s03251430@outlook.com",)]
                raise AssertionError(f"unexpected query: {sql} params={params}")

        columns_by_table = {
            "sys_user": {"user_id", "user_name", "email", "nick_name", "remark"},
            "osg_staff": {"staff_id", "staff_name", "email", "remark"},
            "osg_student": {"student_id", "student_name", "email", "remark"},
            "osg_position": {"position_id", "position_name", "company_name", "remark"},
            "osg_job_application": {"application_id", "remark"},
        }

        ids = module.find_runtime_ids(Cursor(), "CHAIN_20260325143031", columns_by_table)

        self.assertEqual([930, 931, 932, 933], ids.user_ids)
        self.assertEqual([112, 113, 114], ids.staff_ids)
        self.assertEqual([1169432515224], ids.student_ids)
        self.assertEqual([128, 129], ids.position_ids)


if __name__ == "__main__":
    unittest.main()
