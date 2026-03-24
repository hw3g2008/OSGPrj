#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlparse

import bcrypt
import pymysql


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILE = ROOT / "deploy" / ".env.dev"
DEFAULT_USERNAME = "lead_mentor_demo"
DEFAULT_PASSWORD = "Osg@2026"
DEFAULT_EMAIL = "lead_mentor_demo@osg.local"
DEFAULT_NICK_NAME = "Lead Mentor Demo"
DEFAULT_REMARK = "Lead mentor demo account for runtime verification"


def parse_db_config(env_file: Path) -> dict[str, object]:
    text = env_file.read_text(encoding="utf-8")
    values: dict[str, str] = {}
    for key in (
        "SPRING_DATASOURCE_DRUID_MASTER_URL",
        "SPRING_DATASOURCE_DRUID_MASTER_USERNAME",
        "SPRING_DATASOURCE_DRUID_MASTER_PASSWORD",
    ):
        match = re.search(rf"^{key}=(.*)$", text, re.M)
        if not match:
            raise RuntimeError(f"missing {key} in {env_file}")
        values[key] = match.group(1).strip().strip("\"'")

    parsed = urlparse(values["SPRING_DATASOURCE_DRUID_MASTER_URL"][len("jdbc:") :])
    return {
        "host": parsed.hostname,
        "port": parsed.port or 3306,
        "database": parsed.path.lstrip("/"),
        "user": values["SPRING_DATASOURCE_DRUID_MASTER_USERNAME"],
        "password": values["SPRING_DATASOURCE_DRUID_MASTER_PASSWORD"],
    }


def connect(env_file: Path):
    db = parse_db_config(env_file)
    return pymysql.connect(
        host=str(db["host"]),
        port=int(db["port"]),
        user=str(db["user"]),
        password=str(db["password"]),
        database=str(db["database"]),
        connect_timeout=10,
        read_timeout=10,
        write_timeout=10,
        autocommit=False,
        charset="utf8mb4",
    )


def ensure_lead_mentor_account(
    env_file: Path,
    *,
    username: str,
    password: str,
    email: str,
    nick_name: str = DEFAULT_NICK_NAME,
    remark: str = DEFAULT_REMARK,
) -> dict[str, object]:
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    conn = connect(env_file)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                select role_id
                from sys_role
                where role_key = 'clerk'
                  and status = '0'
                  and del_flag = '0'
                order by role_id asc
                limit 1
                """
            )
            role_row = cur.fetchone()
            if role_row is None:
                raise RuntimeError("clerk role not found")
            clerk_role_id = int(role_row[0])

            cur.execute("select user_id from sys_user where user_name = %s limit 1", (username,))
            user_row = cur.fetchone()
            if user_row is None:
                cur.execute(
                    """
                    insert into sys_user (
                        dept_id,
                        user_name,
                        nick_name,
                        user_type,
                        email,
                        phonenumber,
                        sex,
                        avatar,
                        password,
                        status,
                        del_flag,
                        create_by,
                        create_time,
                        update_by,
                        update_time,
                        remark,
                        first_login
                    ) values (
                        100,
                        %s,
                        %s,
                        '00',
                        %s,
                        '',
                        '0',
                        '',
                        %s,
                        '0',
                        '0',
                        'codex',
                        now(),
                        'codex',
                        now(),
                        %s,
                        '0'
                    )
                    """,
                    (username, nick_name, email, password_hash, remark),
                )
                user_id = int(cur.lastrowid)
            else:
                user_id = int(user_row[0])
                cur.execute(
                    """
                    update sys_user
                       set dept_id = 100,
                           nick_name = %s,
                           email = %s,
                           password = %s,
                           status = '0',
                           del_flag = '0',
                           user_type = '00',
                           first_login = '0',
                           update_by = 'codex',
                           update_time = now(),
                           remark = %s
                     where user_id = %s
                    """,
                    (nick_name, email, password_hash, remark, user_id),
                )

            cur.execute("delete from sys_user_role where user_id = %s", (user_id,))
            cur.execute("insert into sys_user_role (user_id, role_id) values (%s, %s)", (user_id, clerk_role_id))

            cur.execute(
                """
                insert into osg_staff (
                    staff_name,
                    email,
                    phone,
                    staff_type,
                    major_direction,
                    sub_direction,
                    region,
                    city,
                    hourly_rate,
                    account_status,
                    create_by,
                    update_by,
                    remark
                ) values (
                    %s,
                    %s,
                    %s,
                    'lead_mentor',
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    'active',
                    'codex',
                    'codex',
                    %s
                )
                on duplicate key update
                    staff_name = values(staff_name),
                    phone = values(phone),
                    staff_type = 'lead_mentor',
                    major_direction = values(major_direction),
                    sub_direction = values(sub_direction),
                    region = values(region),
                    city = values(city),
                    hourly_rate = values(hourly_rate),
                    account_status = 'active',
                    update_by = 'codex',
                    update_time = now(),
                    remark = values(remark)
                """,
                (
                    nick_name,
                    email,
                    "13800002026",
                    "Finance",
                    "Job Coaching",
                    "China Mainland",
                    "Shanghai",
                    500,
                    remark,
                ),
            )

        conn.commit()
        return {
            "user_id": user_id,
            "username": username,
            "password": password,
            "email": email,
            "nick_name": nick_name,
            "role_key": "clerk",
        }
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Ensure the lead-mentor demo account exists and is active.")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_FILE)
    parser.add_argument("--username", default=DEFAULT_USERNAME)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    parser.add_argument("--email", default=DEFAULT_EMAIL)
    parser.add_argument("--nick-name", default=DEFAULT_NICK_NAME)
    parser.add_argument("--remark", default=DEFAULT_REMARK)
    args = parser.parse_args()

    result = ensure_lead_mentor_account(
        args.env_file,
        username=args.username,
        password=args.password,
        email=args.email,
        nick_name=args.nick_name,
        remark=args.remark,
    )
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
