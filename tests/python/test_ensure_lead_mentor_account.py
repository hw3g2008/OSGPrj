from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch


def load_ensure_lead_mentor_account_module():
    module_path = Path(__file__).resolve().parents[2] / "bin" / "ensure_lead_mentor_account.py"
    spec = importlib.util.spec_from_file_location("ensure_lead_mentor_account", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None and spec.loader is not None
    spec.loader.exec_module(module)
    return module


class EnsureLeadMentorAccountCursor:
    def __init__(self):
        self.executed: list[tuple[str, object]] = []
        self.lastrowid = 2026
        self.last_query = ""

    def execute(self, sql, params=None):
        self.executed.append((sql, params))
        self.last_query = sql

    def fetchone(self):
        normalized = " ".join(self.last_query.split()).lower()
        if "from sys_role" in normalized:
            return (2,)
        if "from sys_user" in normalized:
            return None
        return None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class EnsureLeadMentorAccountConnection:
    def __init__(self):
        self.cursor_instance = EnsureLeadMentorAccountCursor()
        self.committed = False
        self.closed = False

    def cursor(self):
        return self.cursor_instance

    def commit(self):
        self.committed = True

    def close(self):
        self.closed = True


class EnsureLeadMentorAccountTest(unittest.TestCase):
    def test_ensure_account_creates_user_binds_clerk_role_and_staff_identity(self):
        module = load_ensure_lead_mentor_account_module()
        conn = EnsureLeadMentorAccountConnection()

        with patch.object(module, "connect", return_value=conn), \
             patch.object(module.bcrypt, "gensalt", return_value=b"salt"), \
             patch.object(module.bcrypt, "hashpw", return_value=b"hashed-password"):
            result = module.ensure_lead_mentor_account(
                Path("deploy/.env.dev"),
                username="lead_mentor_demo",
                password="Osg@2026",
                email="lead_mentor_demo@osg.local",
                nick_name="Lead Mentor Demo",
            )

        inserts = [sql for sql, _ in conn.cursor_instance.executed if "insert into sys_user (" in sql.lower()]
        role_binds = [params for sql, params in conn.cursor_instance.executed if "insert into sys_user_role" in sql.lower()]
        staff_upserts = [sql for sql, _ in conn.cursor_instance.executed if "insert into osg_staff" in sql.lower()]

        self.assertEqual(1, len(inserts), "should create sys_user when the demo account is missing")
        self.assertEqual([(2026, 2)], role_binds, "should bind the created user to the clerk role")
        self.assertEqual(1, len(staff_upserts), "should ensure a matching osg_staff identity for lead-mentor flows")
        self.assertEqual("lead_mentor_demo", result["username"])
        self.assertEqual("lead_mentor_demo@osg.local", result["email"])
        self.assertEqual("Osg@2026", result["password"])
        self.assertEqual(2026, result["user_id"])
        self.assertTrue(conn.committed, "account creation should commit changes")
        self.assertTrue(conn.closed, "account creation should close the database connection")


if __name__ == "__main__":
    unittest.main()
