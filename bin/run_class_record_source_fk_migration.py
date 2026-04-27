#!/usr/bin/env python3
"""Apply sql/migrations/2026-04-27-class-record-add-source-fk.sql.

Idempotent: skips ADD COLUMN / CREATE INDEX statements whose target
column/index already exists. Uses DB config from deploy/.env.dev
(SPRING_DATASOURCE_DRUID_MASTER_*), which points at the shared remote
test MySQL (47.94.213.128:23306 / ry-vue).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urlparse

import pymysql

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / "deploy" / ".env.dev"


def parse_db_config(env_file: Path) -> dict:
    text = env_file.read_text(encoding="utf-8")
    keys = (
        "SPRING_DATASOURCE_DRUID_MASTER_URL",
        "SPRING_DATASOURCE_DRUID_MASTER_USERNAME",
        "SPRING_DATASOURCE_DRUID_MASTER_PASSWORD",
    )
    values = {}
    for key in keys:
        m = re.search(rf"^{key}=(.*)$", text, re.M)
        if not m:
            raise RuntimeError(f"missing {key} in {env_file}")
        values[key] = m.group(1).strip().strip("\"'")
    parsed = urlparse(values["SPRING_DATASOURCE_DRUID_MASTER_URL"][len("jdbc:"):])
    return {
        "host": parsed.hostname,
        "port": parsed.port or 3306,
        "database": parsed.path.lstrip("/"),
        "user": values["SPRING_DATASOURCE_DRUID_MASTER_USERNAME"],
        "password": values["SPRING_DATASOURCE_DRUID_MASTER_PASSWORD"],
    }


def column_exists(cur, table: str, column: str) -> bool:
    cur.execute(
        """
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME=%s AND COLUMN_NAME=%s
        """,
        (table, column),
    )
    return cur.fetchone() is not None


def index_exists(cur, table: str, index: str) -> bool:
    cur.execute(
        """
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME=%s AND INDEX_NAME=%s
        """,
        (table, index),
    )
    return cur.fetchone() is not None


def main() -> int:
    cfg = parse_db_config(ENV_FILE)
    print(f"[INFO] connecting {cfg['user']}@{cfg['host']}:{cfg['port']}/{cfg['database']}")
    conn = pymysql.connect(
        host=str(cfg["host"]),
        port=int(cfg["port"]),
        user=str(cfg["user"]),
        password=str(cfg["password"]),
        database=str(cfg["database"]),
        connect_timeout=15,
        autocommit=True,
        charset="utf8mb4",
    )
    table = "osg_class_record"
    plan = [
        (
            "column", "practice_id",
            f"ALTER TABLE {table} ADD COLUMN practice_id BIGINT NULL "
            "COMMENT '关联 osg_mock_practice.practice_id，模拟应聘课时回指'",
        ),
        (
            "column", "application_id",
            f"ALTER TABLE {table} ADD COLUMN application_id BIGINT NULL "
            "COMMENT '关联 osg_job_application.application_id，真实岗位辅导课时回指'",
        ),
        (
            "index", "idx_class_record_practice_id",
            f"CREATE INDEX idx_class_record_practice_id ON {table} (practice_id)",
        ),
        (
            "index", "idx_class_record_application_id",
            f"CREATE INDEX idx_class_record_application_id ON {table} (application_id)",
        ),
    ]
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM INFORMATION_SCHEMA.TABLES "
                "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s",
                (table,),
            )
            if cur.fetchone() is None:
                print(f"[ERROR] table {table} not found", file=sys.stderr)
                return 2

            for kind, name, ddl in plan:
                exists = (
                    column_exists(cur, table, name) if kind == "column"
                    else index_exists(cur, table, name)
                )
                if exists:
                    print(f"[SKIP] {kind} {name} already exists")
                    continue
                print(f"[APPLY] {ddl}")
                cur.execute(ddl)
                print(f"[OK]    {kind} {name} created")

            # Verification
            cur.execute(
                """
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = %s
                  AND COLUMN_NAME IN ('practice_id', 'application_id')
                ORDER BY COLUMN_NAME
                """,
                (table,),
            )
            print("\n[VERIFY columns]")
            for row in cur.fetchall():
                print(f"  {row}")

            cur.execute(
                """
                SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
                FROM INFORMATION_SCHEMA.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = %s
                  AND INDEX_NAME IN (
                      'idx_class_record_practice_id',
                      'idx_class_record_application_id'
                  )
                ORDER BY INDEX_NAME
                """,
                (table,),
            )
            print("\n[VERIFY indexes]")
            for row in cur.fetchall():
                print(f"  {row}")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
