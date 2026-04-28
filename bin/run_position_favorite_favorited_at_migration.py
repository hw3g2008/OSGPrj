#!/usr/bin/env python3
"""Apply sql/migrations/2026-04-28-position-favorite-add-favorited-at.sql.

Idempotent: skips ADD COLUMN if column already exists. Uses DB config from
deploy/.env.dev (SPRING_DATASOURCE_DRUID_MASTER_*), which points at the shared
remote test MySQL.
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
    table = "osg_student_job_position_state"
    plan = [
        (
            "column", "favorited_at",
            f"ALTER TABLE {table} ADD COLUMN favorited_at DATETIME NULL "
            "COMMENT '最近一次收藏的时间戳，favorited=0 时清 NULL'",
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
                exists = column_exists(cur, table, name)
                if exists:
                    print(f"[SKIP] {kind} {name} already exists")
                    continue
                print(f"[APPLY] {ddl}")
                cur.execute(ddl)
                print(f"[OK]    {kind} {name} created")

            cur.execute(
                """
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = %s
                  AND COLUMN_NAME = 'favorited_at'
                """,
                (table,),
            )
            print("\n[VERIFY columns]")
            for row in cur.fetchall():
                print(f"  {row}")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
