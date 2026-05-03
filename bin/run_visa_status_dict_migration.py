#!/usr/bin/env python3
"""Apply sql/migrations/2026-05-03-osg-visa-status-dict.sql.

Idempotent: skips INSERT if type already exists. Uses DB config from
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
MIGRATION_FILE = ROOT / "sql" / "migrations" / "2026-05-03-osg-visa-status-dict.sql"

# The dict tables live in the ry-vue database, not the default DB
RY_VUE_DB = "ry-vue"


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


def main() -> None:
    cfg = parse_db_config(ENV_FILE)
    migration_sql = MIGRATION_FILE.read_text(encoding="utf-8")

    conn = pymysql.connect(
        host=cfg["host"],
        port=cfg["port"],
        user=cfg["user"],
        password=cfg["password"],
        database=RY_VUE_DB,
        charset="utf8mb4",
        autocommit=True,
    )
    cursor = conn.cursor()

    # Idempotent check — skip if type already exists
    cursor.execute(
        "SELECT 1 FROM sys_dict_type WHERE dict_type = %s",
        ("osg_visa_status",),
    )
    if cursor.fetchone():
        print("✓ osg_visa_status already exists in sys_dict_type, skipping INSERT")
        return

    # Apply migration
    for raw in migration_sql.split(";"):
        stmt = raw.strip()
        if not stmt or stmt.startswith("--"):
            continue
        print(f"  Running: {stmt[:70]}")
        cursor.execute(stmt)

    print("✓ osg_visa_status dict type + data inserted successfully")


if __name__ == "__main__":
    main()