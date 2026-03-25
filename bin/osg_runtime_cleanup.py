#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
from typing import Iterable, NamedTuple


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILE = ROOT / "deploy" / ".env.dev"


def load_runtime_seed_admin_module():
    module_path = ROOT / "bin" / "runtime_seed_admin.py"
    spec = importlib.util.spec_from_file_location("runtime_seed_admin", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None and spec.loader is not None
    spec.loader.exec_module(module)
    return module


runtime_seed_admin = load_runtime_seed_admin_module()
connect = runtime_seed_admin.connect


class RuntimeCleanupIds(NamedTuple):
    user_ids: list[int]
    staff_ids: list[int]
    student_ids: list[int]
    position_ids: list[int]
    application_ids: list[int]


class DeleteSpec(NamedTuple):
    table: str
    where_sql: str
    params: tuple[object, ...]


TABLE_DELETE_ORDER: tuple[str, ...] = (
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
)

TABLE_MATCH_RULES: dict[str, tuple[tuple[str, str], ...]] = {
    "sys_user_role": (("user_id", "user_ids"),),
    "osg_staff_change_request": (("staff_id", "staff_ids"), ("remark", "chain_like")),
    "osg_staff_schedule": (("staff_id", "staff_ids"), ("mentor_id", "user_ids")),
    "osg_contract": (("student_id", "student_ids"),),
    "osg_class_record": (("student_id", "student_ids"),),
    "osg_mock_practice": (("student_id", "student_ids"),),
    "osg_coaching": (("application_id", "application_ids"), ("student_id", "student_ids"), ("mentor_id", "user_ids")),
    "osg_job_application": (("student_id", "student_ids"), ("position_id", "position_ids"), ("lead_mentor_id", "user_ids")),
    "osg_student_position": (("student_id", "student_ids"), ("position_name", "chain_like"), ("company_name", "chain_like")),
    "osg_student_job_position_state": (("user_id", "user_ids"), ("position_id", "position_ids")),
    "osg_student_job_position": (("user_id", "user_ids"), ("position_id", "position_ids")),
    "osg_student_mock_request": (("user_id", "user_ids"),),
    "osg_student_course_record": (("user_id", "user_ids"),),
    "osg_student_change_request": (("student_id", "student_ids"), ("remark", "chain_like")),
    "osg_student_profile_change": (("user_id", "user_ids"),),
    "osg_student_profile": (("user_id", "user_ids"),),
    "osg_position": (("position_id", "position_ids"), ("position_name", "chain_like"), ("company_name", "chain_like"), ("remark", "chain_like")),
    "osg_student": (("student_id", "student_ids"), ("student_name", "chain_like"), ("email", "chain_like"), ("remark", "chain_like")),
    "osg_staff": (("staff_id", "staff_ids"), ("staff_name", "chain_like"), ("email", "chain_like"), ("remark", "chain_like")),
    "sys_user": (("user_id", "user_ids"), ("user_name", "chain_like"), ("email", "chain_like"), ("nick_name", "chain_like"), ("remark", "chain_like")),
}

ROOT_DISCOVERY_SPECS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("sys_user", "user_id", ("user_name", "email", "nick_name", "remark")),
    ("osg_staff", "staff_id", ("staff_name", "email", "remark")),
    ("osg_student", "student_id", ("student_name", "email", "remark")),
    ("osg_position", "position_id", ("position_name", "company_name", "remark")),
    ("osg_job_application", "application_id", ("remark",)),
)


def listify(values: Iterable[object]) -> list[int]:
    normalized: list[int] = []
    for value in values:
        if value is None:
            continue
        try:
            normalized.append(int(value))
        except (TypeError, ValueError):
            continue
    return sorted(set(normalized))


def sql_in_clause(column: str, values: list[int]) -> tuple[str, tuple[object, ...]] | None:
    if not values:
        return None
    placeholders = ", ".join(["%s"] * len(values))
    return f"{column} IN ({placeholders})", tuple(values)


def sql_like_clause(column: str, chain_id: str) -> tuple[str, tuple[object, ...]]:
    return f"{column} LIKE %s", (f"%{chain_id}%",)


def combine_or_clauses(clauses: Iterable[tuple[str, tuple[object, ...]]]) -> tuple[str, tuple[object, ...]] | None:
    sql_parts: list[str] = []
    params: list[object] = []
    for sql, clause_params in clauses:
        if not sql:
            continue
        sql_parts.append(sql)
        params.extend(clause_params)
    if not sql_parts:
        return None
    if len(sql_parts) == 1:
        return sql_parts[0], tuple(params)
    return "(" + " OR ".join(sql_parts) + ")", tuple(params)


def build_delete_specs(chain_id: str, ids: RuntimeCleanupIds, columns_by_table: dict[str, set[str]]) -> list[DeleteSpec]:
    specs: list[DeleteSpec] = []
    id_lookup = {
        "user_ids": ids.user_ids,
        "staff_ids": ids.staff_ids,
        "student_ids": ids.student_ids,
        "position_ids": ids.position_ids,
        "application_ids": ids.application_ids,
    }

    for table in TABLE_DELETE_ORDER:
        available_columns = columns_by_table.get(table, set())
        clauses: list[tuple[str, tuple[object, ...]]] = []
        for column, source in TABLE_MATCH_RULES.get(table, ()):
            if column not in available_columns:
                continue
            if source == "chain_like":
                clauses.append(sql_like_clause(column, chain_id))
                continue
            clause = sql_in_clause(column, id_lookup[source])
            if clause is not None:
                clauses.append(clause)
        combined = combine_or_clauses(clauses)
        if combined is None:
            continue
        where_sql, params = combined
        specs.append(DeleteSpec(table=table, where_sql=where_sql, params=params))
    return specs


def fetch_columns_by_table(cur, table_names: Iterable[str]) -> dict[str, set[str]]:
    columns_by_table: dict[str, set[str]] = {}
    for table in table_names:
        cur.execute(f"SHOW COLUMNS FROM {table}")
        columns_by_table[table] = {str(row[0]) for row in cur.fetchall() or []}
    return columns_by_table


def find_runtime_ids(cur, chain_id: str, columns_by_table: dict[str, set[str]]) -> RuntimeCleanupIds:
    discovered: dict[str, list[int]] = {
        "sys_user": [],
        "osg_staff": [],
        "osg_student": [],
        "osg_position": [],
        "osg_job_application": [],
    }
    chain_like = f"%{chain_id}%"

    for table, id_column, text_columns in ROOT_DISCOVERY_SPECS:
        available = columns_by_table.get(table, set())
        matching_columns = [column for column in text_columns if column in available]
        if not matching_columns or id_column not in available:
            continue
        predicates = " OR ".join(f"{column} LIKE %s" for column in matching_columns)
        params = tuple(chain_like for _ in matching_columns)
        cur.execute(f"SELECT {id_column} FROM {table} WHERE {predicates}", params)
        discovered[table] = listify(row[0] for row in cur.fetchall() or [])

    related_emails: set[str] = set()
    staff_columns = columns_by_table.get("osg_staff", set())
    if discovered["osg_staff"] and "email" in staff_columns:
        placeholders = ", ".join(["%s"] * len(discovered["osg_staff"]))
        cur.execute(f"SELECT email FROM osg_staff WHERE staff_id IN ({placeholders})", tuple(discovered["osg_staff"]))
        related_emails.update(str(row[0]).strip() for row in cur.fetchall() or [] if row and row[0])

    student_columns = columns_by_table.get("osg_student", set())
    if discovered["osg_student"] and "email" in student_columns:
        placeholders = ", ".join(["%s"] * len(discovered["osg_student"]))
        cur.execute(f"SELECT email FROM osg_student WHERE student_id IN ({placeholders})", tuple(discovered["osg_student"]))
        related_emails.update(str(row[0]).strip() for row in cur.fetchall() or [] if row and row[0])

    sys_user_columns = columns_by_table.get("sys_user", set())
    if related_emails and {"user_id", "user_name"}.issubset(sys_user_columns):
        ordered_emails = tuple(sorted(related_emails))
        placeholders = ", ".join(["%s"] * len(ordered_emails))
        cur.execute(f"SELECT user_id FROM sys_user WHERE user_name IN ({placeholders})", ordered_emails)
        discovered["sys_user"] = listify(discovered["sys_user"] + [row[0] for row in cur.fetchall() or []])

    return RuntimeCleanupIds(
        user_ids=discovered["sys_user"],
        staff_ids=discovered["osg_staff"],
        student_ids=discovered["osg_student"],
        position_ids=discovered["osg_position"],
        application_ids=discovered["osg_job_application"],
    )


def execute_cleanup(cur, specs: list[DeleteSpec]) -> list[dict[str, object]]:
    results: list[dict[str, object]] = []
    for spec in specs:
        cur.execute(f"DELETE FROM {spec.table} WHERE {spec.where_sql}", spec.params)
        results.append(
            {
                "table": spec.table,
                "rows": int(cur.rowcount or 0),
                "where": spec.where_sql,
            }
        )
    return results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Clean only the current osg CHAIN_* runtime test data.")
    parser.add_argument("--chain-id", required=True, help="Exact CHAIN_* marker used by the runtime closure.")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_FILE)
    parser.add_argument("--apply", action="store_true", help="Actually execute the deletes. Default is dry-run.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    conn = connect(args.env_file)
    try:
        with conn.cursor() as cur:
            columns_by_table = fetch_columns_by_table(cur, TABLE_DELETE_ORDER)
            ids = find_runtime_ids(cur, args.chain_id, columns_by_table)
            specs = build_delete_specs(args.chain_id, ids, columns_by_table)

            output = {
                "chainId": args.chain_id,
                "apply": bool(args.apply),
                "ids": {
                    "userIds": ids.user_ids,
                    "staffIds": ids.staff_ids,
                    "studentIds": ids.student_ids,
                    "positionIds": ids.position_ids,
                    "applicationIds": ids.application_ids,
                },
                "deletePlan": [
                    {"table": spec.table, "where": spec.where_sql, "params": list(spec.params)}
                    for spec in specs
                ],
            }

            if args.apply:
                output["deleted"] = execute_cleanup(cur, specs)
                conn.commit()
            else:
                conn.rollback()

        print(json.dumps(output, ensure_ascii=False, indent=2))
        return 0
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
