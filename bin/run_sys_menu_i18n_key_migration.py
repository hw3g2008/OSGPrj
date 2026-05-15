#!/usr/bin/env python3
"""Apply sql/migrations/2026-05-05-sys-menu-i18n-key.sql.

Idempotent:
- ADD COLUMN i18n_key only if column missing.
- UPDATE backfills i18n_key for menu_ids 2001..2033 using values from the SQL file
  parsed at runtime; rows whose current value already matches are not changed.

Uses DB config from deploy/.env.dev (SPRING_DATASOURCE_DRUID_MASTER_*),
which points at the shared remote dev MySQL (47.94.213.128:23306 / ry-vue).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urlparse

import pymysql

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / "deploy" / ".env.dev"
SQL_FILE = ROOT / "sql" / "migrations" / "2026-05-05-sys-menu-i18n-key.sql"
TABLE = "sys_menu"
COLUMN = "i18n_key"


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


def parse_backfill_map(sql_file: Path) -> dict[int, str]:
    """Extract `WHEN <id> THEN '<key>'` pairs from the migration SQL."""
    text = sql_file.read_text(encoding="utf-8")
    pattern = re.compile(r"WHEN\s+(\d+)\s+THEN\s+'([^']+)'", re.IGNORECASE)
    pairs = {int(mid): key for mid, key in pattern.findall(text)}
    if not pairs:
        raise RuntimeError(f"no WHEN/THEN pairs found in {sql_file}")
    return pairs


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
    backfill = parse_backfill_map(SQL_FILE)
    print(
        f"[INFO] connecting {cfg['user']}@{cfg['host']}:{cfg['port']}/{cfg['database']}"
    )
    print(f"[INFO] backfill map size: {len(backfill)}")

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
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM INFORMATION_SCHEMA.TABLES "
                "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s",
                (TABLE,),
            )
            if cur.fetchone() is None:
                print(f"[ERROR] table {TABLE} not found", file=sys.stderr)
                return 2

            if column_exists(cur, TABLE, COLUMN):
                print(f"[SKIP] column {TABLE}.{COLUMN} already exists")
            else:
                ddl = (
                    f"ALTER TABLE {TABLE} ADD COLUMN {COLUMN} varchar(150) "
                    "DEFAULT NULL COMMENT 'menu i18n key' AFTER menu_name"
                )
                print(f"[APPLY] {ddl}")
                cur.execute(ddl)
                print(f"[OK]    column {TABLE}.{COLUMN} created")

            # Idempotent backfill: only update rows whose value differs.
            updated = 0
            unchanged = 0
            missing_ids = []
            for menu_id, key in sorted(backfill.items()):
                cur.execute(
                    f"SELECT {COLUMN} FROM {TABLE} WHERE menu_id=%s",
                    (menu_id,),
                )
                row = cur.fetchone()
                if row is None:
                    missing_ids.append(menu_id)
                    continue
                current = row[0]
                if current == key:
                    unchanged += 1
                    continue
                cur.execute(
                    f"UPDATE {TABLE} SET {COLUMN}=%s WHERE menu_id=%s",
                    (key, menu_id),
                )
                updated += 1
                print(f"[UPDATE] menu_id={menu_id} {COLUMN}: {current!r} -> {key!r}")

            print(
                f"[INFO] backfill summary: updated={updated} unchanged={unchanged} "
                f"missing_menu_ids={missing_ids}"
            )

            cur.execute(
                f"SELECT COUNT(*) FROM {TABLE} WHERE {COLUMN} IS NOT NULL"
            )
            non_null = cur.fetchone()[0]
            cur.execute(
                f"SELECT menu_id, menu_name, {COLUMN} FROM {TABLE} "
                "WHERE menu_id IN (2001, 2013, 2033) ORDER BY menu_id"
            )
            samples = cur.fetchall()
            print(f"\n[VERIFY] rows with {COLUMN} not null: {non_null}")
            print("[VERIFY] sample rows:")
            for row in samples:
                print(f"  {row}")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
