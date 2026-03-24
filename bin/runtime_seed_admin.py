from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from urllib.parse import urlparse

import pymysql


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
        host=db["host"],
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


def execute_sql_file(cur, sql_path: Path) -> None:
    text = sql_path.read_text(encoding="utf-8")
    statements: list[str] = []
    buffer: list[str] = []
    for raw_line in text.splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("--"):
            continue
        buffer.append(raw_line)
        if stripped.endswith(";"):
            statement = "\n".join(buffer).strip()
            if statement.endswith(";"):
                statement = statement[:-1]
            if statement:
                statements.append(statement)
            buffer = []
    if buffer:
        statement = "\n".join(buffer).strip()
        if statement:
            statements.append(statement)

    for statement in statements:
        cur.execute(statement)


def resolve_seed_mentor(cur) -> tuple[int, str, Decimal]:
    cur.execute(
        """
        select staff_id, staff_name, hourly_rate
        from osg_staff
        where account_status = 'active'
          and hourly_rate is not null
          and hourly_rate > 0
        order by hourly_rate desc, staff_id asc
        limit 1
        """
    )
    mentor = cur.fetchone()
    if mentor is None:
        raise RuntimeError("no active osg_staff row with hourly_rate > 0 available for runtime seed")
    mentor_id, mentor_name, hourly_rate = mentor
    return int(mentor_id), str(mentor_name), Decimal(str(hourly_rate))


def resolve_seed_mentors(cur, minimum: int = 2) -> list[tuple[int, str]]:
    cur.execute(
        """
        select staff_id, staff_name
        from osg_staff
        where account_status = 'active'
        order by coalesce(hourly_rate, 0) desc, staff_id asc
        limit %s
        """,
        (max(minimum, 1),),
    )
    mentors = [(int(row[0]), str(row[1])) for row in cur.fetchall() or []]
    if not mentors:
        raise RuntimeError("no active osg_staff rows available for runtime seed")
    while len(mentors) < minimum:
        mentors.append(mentors[-1])
    return mentors


def resolve_lead_mentor_runtime_user(cur) -> tuple[int, str]:
    preferred_usernames = [
        os.environ.get("E2E_LEAD_MENTOR_USERNAME", "").strip(),
        os.environ.get("E2E_STUDENT_USERNAME", "").strip(),
        "lead_mentor_demo",
        "student_demo",
        "lead_mentor",
    ]

    for username in preferred_usernames:
        if not username:
            continue
        cur.execute(
            """
            select user_id, coalesce(nullif(nick_name, ''), user_name) as display_name
            from sys_user
            where status = '0'
              and user_name = %s
            limit 1
            """,
            (username,),
        )
        row = cur.fetchone()
        if row is not None:
            return int(row[0]), str(row[1])

    cur.execute(
        """
        select user_id, coalesce(nullif(nick_name, ''), user_name) as display_name
        from sys_user
        where status = '0'
          and user_name != 'admin'
        order by user_id asc
        limit 1
        """
    )
    row = cur.fetchone()
    if row is None:
        raise RuntimeError("no active sys_user row available for lead-mentor runtime seed")
    return int(row[0]), str(row[1])


def ensure_student(
    cur,
    *,
    student_id: int,
    student_name: str,
    email: str,
    lead_mentor_id: int | None,
    remark: str,
) -> None:
    cur.execute(
        """
        insert into osg_student (
            student_id,
            student_name,
            email,
            gender,
            school,
            major,
            graduation_year,
            major_direction,
            sub_direction,
            target_region,
            recruitment_cycle,
            lead_mentor_id,
            assistant_id,
            account_status,
            create_by,
            update_by,
            remark
        ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        on duplicate key update
            student_name = values(student_name),
            school = values(school),
            major = values(major),
            graduation_year = values(graduation_year),
            major_direction = values(major_direction),
            sub_direction = values(sub_direction),
            target_region = values(target_region),
            recruitment_cycle = values(recruitment_cycle),
            lead_mentor_id = values(lead_mentor_id),
            account_status = values(account_status),
            update_by = values(update_by),
            remark = values(remark)
        """,
        (
            student_id,
            student_name,
            email,
            "2",
            "Runtime Backfill University",
            "Business",
            2027,
            "Consulting",
            "Strategy",
            "United Kingdom",
            "2026 Autumn",
            lead_mentor_id,
            None,
            "0",
            "runtime_seed",
            "runtime_seed",
            remark,
        ),
    )


def ensure_position(
    cur,
    *,
    company_name: str,
    position_name: str,
    industry: str,
    region: str,
    city: str,
    recruitment_cycle: str,
    project_year: str,
    now: datetime,
) -> int:
    cur.execute(
        """
        insert into osg_position (
            position_category,
            industry,
            company_name,
            company_type,
            company_website,
            position_name,
            department,
            region,
            city,
            recruitment_cycle,
            project_year,
            publish_time,
            deadline,
            display_status,
            display_start_time,
            display_end_time,
            position_url,
            application_note,
            create_by,
            update_by,
            remark
        ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            "summer",
            industry,
            company_name,
            "Bulge Bracket",
            "https://example.com/company",
            position_name,
            "Strategy",
            region,
            city,
            recruitment_cycle,
            project_year,
            now - timedelta(days=1),
            now + timedelta(days=30),
            "visible",
            now - timedelta(days=2),
            now + timedelta(days=60),
            f"https://example.com/jobs/{company_name.lower().replace(' ', '-')}",
            "runtime lead-mentor position seed",
            "runtime_seed",
            "runtime_seed",
            "runtime lead-mentor position seed",
        ),
    )
    return int(cur.lastrowid)


def seed_finance(env_file: Path, count: int) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    created: list[dict[str, object]] = []
    base = int(now.timestamp())
    sources = ("mentor", "clerk", "assistant")

    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            mentor_id, mentor_name, hourly = resolve_seed_mentor(cur)

            for index in range(count):
                class_date = now - timedelta(minutes=index)
                submitted_at = class_date - timedelta(hours=2)
                reviewed_at = class_date - timedelta(hours=1)
                duration_hours = Decimal("1.5") + Decimal("0.5") * Decimal(index % 3)
                due_amount = (hourly * duration_hours).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
                class_id = f"FIN-BF-{base}-{index + 1}"
                student_id = 970000000000 + base * 10 + index
                student_name = f"Finance Backfill {base % 100000}-{index + 1}"
                course_source = sources[index % len(sources)]

                cur.execute(
                    """
                    insert into osg_class_record (
                        class_id,
                        mentor_id,
                        mentor_name,
                        student_id,
                        student_name,
                        course_type,
                        course_source,
                        class_date,
                        duration_hours,
                        weekly_hours,
                        status,
                        class_status,
                        rate,
                        topics,
                        comments,
                        feedback_content,
                        review_remark,
                        reviewed_at,
                        submitted_at,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        class_id,
                        mentor_id,
                        mentor_name,
                        student_id,
                        student_name,
                        "mock_interview",
                        course_source,
                        class_date,
                        float(duration_hours),
                        float(duration_hours),
                        "approved",
                        "completed",
                        str(hourly),
                        "runtime finance backfill",
                        "runtime finance backfill",
                        "runtime finance backfill",
                        "runtime finance backfill",
                        reviewed_at,
                        submitted_at,
                        "runtime_seed",
                        "runtime_seed",
                        "finance backfill seed",
                    ),
                )
                record_id = int(cur.lastrowid)

                cur.execute(
                    """
                    insert into osg_finance_settlement (
                        record_id,
                        payment_status,
                        due_amount,
                        paid_amount,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        record_id,
                        "unpaid",
                        str(due_amount),
                        "0.0",
                        "runtime_seed",
                        "runtime_seed",
                        "finance backfill seed",
                    ),
                )
                settlement_id = int(cur.lastrowid)

                created.append(
                    {
                        "settlement_id": settlement_id,
                        "record_id": record_id,
                        "record_code": class_id,
                        "mentor_id": int(mentor_id),
                        "mentor_name": str(mentor_name),
                        "student_id": int(student_id),
                        "student_name": student_name,
                        "course_source": course_source,
                        "duration_hours": float(duration_hours),
                        "due_amount": str(due_amount),
                    }
                )

        conn.commit()
        return created
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_report(env_file: Path, count: int) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    created: list[dict[str, object]] = []
    base = int(now.timestamp())
    sources = ("mentor_report", "student_request", "mentor_report")
    course_types = ("mock_interview", "written_test", "midterm_exam")
    class_statuses = ("mock_interview", "case_prep", "resume_update")

    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            mentor_id, mentor_name, hourly = resolve_seed_mentor(cur)

            for index in range(count):
                class_date = now - timedelta(minutes=index)
                submitted_at = class_date - timedelta(days=index)
                duration_hours = Decimal("1.5") + Decimal("0.5") * Decimal(index % 2)
                weekly_hours = Decimal("7.0") if index == 0 else Decimal("4.0") + Decimal(index % 2)
                class_id = f"REP-BF-{base}-{index + 1}"
                student_id = 980000000000 + base * 10 + index
                student_name = f"Report Backfill {base % 100000}-{index + 1}"
                course_source = sources[index % len(sources)]
                course_type = course_types[index % len(course_types)]
                class_status = class_statuses[index % len(class_statuses)]

                cur.execute(
                    """
                    insert into osg_class_record (
                        class_id,
                        mentor_id,
                        mentor_name,
                        student_id,
                        student_name,
                        course_type,
                        course_source,
                        class_date,
                        duration_hours,
                        weekly_hours,
                        status,
                        class_status,
                        rate,
                        topics,
                        comments,
                        feedback_content,
                        review_remark,
                        reviewed_at,
                        submitted_at,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        class_id,
                        mentor_id,
                        mentor_name,
                        student_id,
                        student_name,
                        course_type,
                        course_source,
                        class_date,
                        float(duration_hours),
                        float(weekly_hours),
                        "pending",
                        class_status,
                        str(hourly),
                        f"runtime report topic {index + 1}",
                        f"runtime report comment {index + 1}",
                        f"runtime report feedback {index + 1}",
                        None,
                        None,
                        submitted_at,
                        "runtime_seed",
                        "runtime_seed",
                        "report backfill seed",
                    ),
                )
                record_id = int(cur.lastrowid)
                created.append(
                    {
                        "record_id": record_id,
                        "class_id": class_id,
                        "mentor_id": mentor_id,
                        "mentor_name": mentor_name,
                        "student_id": int(student_id),
                        "student_name": student_name,
                        "course_source": course_source,
                        "course_type": course_type,
                        "status": "pending",
                    }
                )

        conn.commit()
        return created
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_student_position(env_file: Path, count: int) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    created: list[dict[str, object]] = []
    base = int(now.timestamp())

    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            mentor_id, mentor_name, _ = resolve_seed_mentor(cur)

            for index in range(count):
                suffix = f"{base % 100000}-{index + 1}"
                student_id = 991000000000 + base * 10 + index
                student_name = f"Career Position {suffix}"
                company_name = f"Career Position Co {suffix}"
                position_name = f"Runtime Analyst {suffix}"
                ensure_student(
                    cur,
                    student_id=student_id,
                    student_name=student_name,
                    email=f"career-position-{student_id}@example.com",
                    lead_mentor_id=mentor_id,
                    remark="career position runtime seed",
                )
                deadline = now + timedelta(days=30 + index)

                cur.execute(
                    """
                    insert into osg_student_position (
                        student_id,
                        student_name,
                        position_category,
                        industry,
                        company_name,
                        company_type,
                        company_website,
                        position_name,
                        department,
                        region,
                        city,
                        recruitment_cycle,
                        project_year,
                        deadline,
                        position_url,
                        status,
                        has_coaching_request,
                        flow_status,
                        remark,
                        create_by,
                        update_by
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        student_id,
                        student_name,
                        "summer",
                        "Investment Bank",
                        company_name,
                        "Bulge Bracket",
                        "https://example.com/company",
                        position_name,
                        "Global Markets",
                        "na",
                        "New York",
                        "2026 Summer",
                        "2026",
                        deadline,
                        f"https://example.com/jobs/{student_id}",
                        "pending",
                        "yes",
                        "pending_review",
                        "student position runtime seed",
                        "runtime_seed",
                        "runtime_seed",
                    ),
                )
                student_position_id = int(cur.lastrowid)
                created.append(
                    {
                        "student_position_id": student_position_id,
                        "student_id": student_id,
                        "student_name": student_name,
                        "company_name": company_name,
                        "position_name": position_name,
                        "lead_mentor_name": mentor_name,
                        "status": "pending",
                    }
                )

        conn.commit()
        return created
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_job_overview(env_file: Path, count: int) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    created: list[dict[str, object]] = []
    base = int(now.timestamp())

    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            mentors = resolve_seed_mentors(cur, minimum=2)
            lead_mentor_id, lead_mentor_name = resolve_lead_mentor_runtime_user(cur)
            primary_mentor_id, primary_mentor_name = mentors[0]
            secondary_mentor_id, secondary_mentor_name = mentors[1]

            for index in range(count):
                suffix = f"{base % 100000}-{index + 1}"
                company_name = f"Career Overview Co {suffix}"
                position_name = f"Strategy Analyst {suffix}"
                position_id = ensure_position(
                    cur,
                    company_name=company_name,
                    position_name=position_name,
                    industry="Consulting",
                    region="na",
                    city="New York",
                    recruitment_cycle="2026 Summer",
                    project_year="2026",
                    now=now,
                )

                student_specs = [
                    (992000000000 + base * 100 + index * 10 + 1, f"Overview Pending {suffix}"),
                    (992000000000 + base * 100 + index * 10 + 2, f"Overview Interview {suffix}"),
                    (992000000000 + base * 100 + index * 10 + 3, f"Overview Offer {suffix}"),
                ]
                for student_id, student_name in student_specs:
                    ensure_student(
                        cur,
                        student_id=student_id,
                        student_name=student_name,
                        email=f"career-overview-{student_id}@example.com",
                        lead_mentor_id=lead_mentor_id,
                        remark="career job overview runtime seed",
                    )

                cur.execute(
                    """
                    insert into osg_job_application (
                        student_id,
                        position_id,
                        student_name,
                        company_name,
                        position_name,
                        region,
                        city,
                        current_stage,
                        interview_time,
                        coaching_status,
                        lead_mentor_id,
                        lead_mentor_name,
                        assign_status,
                        requested_mentor_count,
                        preferred_mentor_names,
                        stage_updated,
                        submitted_at,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        student_specs[0][0],
                        position_id,
                        student_specs[0][1],
                        company_name,
                        position_name,
                        "na",
                        "New York",
                        "applied",
                        now + timedelta(days=2),
                        "待审批",
                        lead_mentor_id,
                        lead_mentor_name,
                        "pending",
                        2,
                        f"{primary_mentor_name}, {secondary_mentor_name}",
                        0,
                        now - timedelta(hours=2),
                        "runtime_seed",
                        "runtime_seed",
                        "job overview pending runtime seed",
                    ),
                )
                pending_application_id = int(cur.lastrowid)

                cur.execute(
                    """
                    insert into osg_job_application (
                        student_id,
                        position_id,
                        student_name,
                        company_name,
                        position_name,
                        region,
                        city,
                        current_stage,
                        interview_time,
                        coaching_status,
                        lead_mentor_id,
                        lead_mentor_name,
                        assign_status,
                        requested_mentor_count,
                        preferred_mentor_names,
                        stage_updated,
                        submitted_at,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        student_specs[1][0],
                        position_id,
                        student_specs[1][1],
                        company_name,
                        f"{position_name} Interview",
                        "na",
                        "Boston",
                        "first_round",
                        now + timedelta(days=4),
                        "辅导中",
                        lead_mentor_id,
                        lead_mentor_name,
                        "assigned",
                        1,
                        primary_mentor_name,
                        0,
                        now - timedelta(days=1),
                        "runtime_seed",
                        "runtime_seed",
                        "job overview interview runtime seed",
                    ),
                )
                interview_application_id = int(cur.lastrowid)

                cur.execute(
                    """
                    insert into osg_coaching (
                        application_id,
                        student_id,
                        mentor_id,
                        mentor_name,
                        mentor_ids,
                        mentor_names,
                        mentor_background,
                        status,
                        total_hours,
                        feedback_summary,
                        assign_note,
                        assigned_at,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        interview_application_id,
                        student_specs[1][0],
                        primary_mentor_id,
                        primary_mentor_name,
                        str(primary_mentor_id),
                        primary_mentor_name,
                        "Runtime Backfill Mentor",
                        "辅导中",
                        6,
                        "runtime interview coaching feedback",
                        "runtime interview assignment",
                        now - timedelta(hours=8),
                        "runtime_seed",
                        "runtime_seed",
                        "job overview interview runtime seed",
                    ),
                )

                cur.execute(
                    """
                    insert into osg_job_application (
                        student_id,
                        position_id,
                        student_name,
                        company_name,
                        position_name,
                        region,
                        city,
                        current_stage,
                        interview_time,
                        coaching_status,
                        lead_mentor_id,
                        lead_mentor_name,
                        assign_status,
                        requested_mentor_count,
                        preferred_mentor_names,
                        stage_updated,
                        submitted_at,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        student_specs[2][0],
                        position_id,
                        student_specs[2][1],
                        company_name,
                        f"{position_name} Offer",
                        "eu",
                        "London",
                        "offer",
                        now + timedelta(days=7),
                        "辅导中",
                        lead_mentor_id,
                        lead_mentor_name,
                        "assigned",
                        1,
                        secondary_mentor_name,
                        0,
                        now - timedelta(days=2),
                        "runtime_seed",
                        "runtime_seed",
                        "job overview offer runtime seed",
                    ),
                )
                offer_application_id = int(cur.lastrowid)

                cur.execute(
                    """
                    insert into osg_coaching (
                        application_id,
                        student_id,
                        mentor_id,
                        mentor_name,
                        mentor_ids,
                        mentor_names,
                        mentor_background,
                        status,
                        total_hours,
                        feedback_summary,
                        assign_note,
                        assigned_at,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        offer_application_id,
                        student_specs[2][0],
                        secondary_mentor_id,
                        secondary_mentor_name,
                        str(secondary_mentor_id),
                        secondary_mentor_name,
                        "Runtime Backfill Mentor",
                        "辅导中",
                        10,
                        "runtime offer coaching feedback",
                        "runtime offer assignment",
                        now - timedelta(days=1),
                        "runtime_seed",
                        "runtime_seed",
                        "job overview offer runtime seed",
                    ),
                )

                created.append(
                    {
                        "position_id": position_id,
                        "position_name": position_name,
                        "company_name": company_name,
                        "pending_application_id": pending_application_id,
                        "pending_student_id": student_specs[0][0],
                        "pending_student_name": student_specs[0][1],
                        "mentor_names": [primary_mentor_name, secondary_mentor_name],
                        "expected_stats": {
                            "applied_count": 3,
                            "interviewing_count": 1,
                            "offer_count": 1,
                        },
                    }
                )

        conn.commit()
        return created
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_mock_practice(env_file: Path, count: int) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    created: list[dict[str, object]] = []
    base = int(now.timestamp())

    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            mentors = resolve_seed_mentors(cur, minimum=2)
            lead_mentor_id, lead_mentor_name = resolve_lead_mentor_runtime_user(cur)
            primary_mentor_name = mentors[0][1]
            secondary_mentor_name = mentors[1][1]

            for index in range(count):
                suffix = f"{base % 100000}-{index + 1}"
                pending_student_id = 993000000000 + base * 10 + index * 2 + 1
                scheduled_student_id = 993000000000 + base * 10 + index * 2 + 2
                pending_student_name = f"Mock Pending {suffix}"
                scheduled_student_name = f"Mock Scheduled {suffix}"

                ensure_student(
                    cur,
                    student_id=pending_student_id,
                    student_name=pending_student_name,
                    email=f"mock-practice-{pending_student_id}@example.com",
                    lead_mentor_id=lead_mentor_id,
                    remark="mock practice runtime seed",
                )
                ensure_student(
                    cur,
                    student_id=scheduled_student_id,
                    student_name=scheduled_student_name,
                    email=f"mock-practice-{scheduled_student_id}@example.com",
                    lead_mentor_id=lead_mentor_id,
                    remark="mock practice runtime seed",
                )

                cur.execute(
                    """
                    insert into osg_mock_practice (
                        student_id,
                        student_name,
                        practice_type,
                        request_content,
                        requested_mentor_count,
                        preferred_mentor_names,
                        status,
                        mentor_ids,
                        mentor_names,
                        mentor_backgrounds,
                        scheduled_at,
                        completed_hours,
                        feedback_rating,
                        feedback_summary,
                        submitted_at,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        pending_student_id,
                        pending_student_name,
                        "mock_interview",
                        f"Runtime Mock Request {suffix}",
                        2,
                        f"{primary_mentor_name}, {secondary_mentor_name}",
                        "pending",
                        None,
                        None,
                        None,
                        None,
                        0,
                        None,
                        None,
                        now - timedelta(hours=3),
                        "runtime_seed",
                        "runtime_seed",
                        "mock practice pending runtime seed",
                    ),
                )
                practice_id = int(cur.lastrowid)

                cur.execute(
                    """
                    insert into osg_mock_practice (
                        student_id,
                        student_name,
                        practice_type,
                        request_content,
                        requested_mentor_count,
                        preferred_mentor_names,
                        status,
                        mentor_ids,
                        mentor_names,
                        mentor_backgrounds,
                        scheduled_at,
                        completed_hours,
                        feedback_rating,
                        feedback_summary,
                        submitted_at,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        scheduled_student_id,
                        scheduled_student_name,
                        "communication_test",
                        f"Runtime Mock Feedback {suffix}",
                        1,
                        lead_mentor_name,
                        "completed",
                        str(lead_mentor_id),
                        lead_mentor_name,
                        "Lead Mentor Runtime Coach",
                        now - timedelta(days=1),
                        2,
                        5,
                        f"Runtime feedback summary {suffix}",
                        now - timedelta(hours=5),
                        "runtime_seed",
                        "runtime_seed",
                        "mock practice feedback runtime seed",
                    ),
                )

                created.append(
                    {
                        "practice_id": practice_id,
                        "student_id": pending_student_id,
                        "student_name": pending_student_name,
                        "request_content": f"Runtime Mock Request {suffix}",
                        "mentor_names": [primary_mentor_name, secondary_mentor_name],
                        "status": "pending",
                    }
                )

        conn.commit()
        return created
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_mock_practice_ack_ready(env_file: Path, count: int) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    created: list[dict[str, object]] = []
    base = int(now.timestamp())

    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            lead_mentor_id, lead_mentor_name = resolve_lead_mentor_runtime_user(cur)

            for index in range(count):
                suffix = f"{base % 100000}-{index + 1}"
                student_id = 995000000000 + base * 10 + index
                student_name = f"Mock Ack Ready {suffix}"

                ensure_student(
                    cur,
                    student_id=student_id,
                    student_name=student_name,
                    email=f"mock-practice-ack-{student_id}@example.com",
                    lead_mentor_id=lead_mentor_id,
                    remark="mock practice ack-ready runtime seed",
                )

                cur.execute(
                    """
                    insert into osg_mock_practice (
                        student_id,
                        student_name,
                        practice_type,
                        request_content,
                        requested_mentor_count,
                        preferred_mentor_names,
                        status,
                        mentor_ids,
                        mentor_names,
                        mentor_backgrounds,
                        scheduled_at,
                        completed_hours,
                        feedback_rating,
                        feedback_summary,
                        submitted_at,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        student_id,
                        student_name,
                        "mock_interview",
                        f"Runtime Mock Ack {suffix}",
                        1,
                        lead_mentor_name,
                        "scheduled",
                        str(lead_mentor_id),
                        lead_mentor_name,
                        "Lead Mentor Runtime Coach",
                        now + timedelta(hours=2),
                        0,
                        None,
                        None,
                        now - timedelta(minutes=30),
                        "runtime_seed",
                        "runtime_seed",
                        "mock practice ack-ready runtime seed",
                    ),
                )

                created.append(
                    {
                        "practice_id": int(cur.lastrowid),
                        "student_id": student_id,
                        "student_name": student_name,
                        "request_content": f"Runtime Mock Ack {suffix}",
                        "status": "scheduled",
                    }
                )

        conn.commit()
        return created
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_student_hours(env_file: Path, count: int) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    created: list[dict[str, object]] = []
    base = int(now.timestamp())

    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            mentor_id, mentor_name, hourly = resolve_seed_mentor(cur)
            lead_mentor_id, _ = resolve_lead_mentor_runtime_user(cur)

            for index in range(count):
                suffix = f"{base % 100000}-{index + 1}"
                student_id = 994000000000 + base * 10 + index
                student_name = f"Hours Student {suffix}"
                email = f"hs{base % 100000}{index + 1}@t.cn"
                total_hours = 40
                approved_hours = Decimal("3.5")
                remaining_hours = Decimal(str(total_hours)) - approved_hours
                contract_no = f"CT-HOURS-{base}-{index + 1}"

                ensure_student(
                    cur,
                    student_id=student_id,
                    student_name=student_name,
                    email=email,
                    lead_mentor_id=lead_mentor_id,
                    remark="student hours runtime seed",
                )

                cur.execute(
                    """
                    insert into osg_contract (
                        contract_no,
                        student_id,
                        contract_type,
                        contract_amount,
                        total_hours,
                        start_date,
                        end_date,
                        contract_status,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        contract_no,
                        student_id,
                        "initial",
                        "18800.00",
                        total_hours,
                        (now - timedelta(days=10)).date(),
                        (now + timedelta(days=90)).date(),
                        "active",
                        "runtime_seed",
                        "runtime_seed",
                        "student hours runtime seed",
                    ),
                )

                cur.execute(
                    """
                    insert into osg_class_record (
                        class_id,
                        mentor_id,
                        mentor_name,
                        student_id,
                        student_name,
                        course_type,
                        course_source,
                        class_date,
                        duration_hours,
                        weekly_hours,
                        status,
                        class_status,
                        rate,
                        topics,
                        comments,
                        feedback_content,
                        review_remark,
                        reviewed_at,
                        submitted_at,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        f"HOURS-{base}-{index + 1}",
                        mentor_id,
                        mentor_name,
                        student_id,
                        student_name,
                        "basic_course",
                        "mentor",
                        now - timedelta(days=1),
                        float(approved_hours),
                        float(approved_hours),
                        "approved",
                        "completed",
                        str(hourly),
                        "student hours runtime seed",
                        "student hours runtime seed",
                        "student hours runtime seed",
                        "student hours runtime seed",
                        now - timedelta(hours=1),
                        now - timedelta(hours=2),
                        "runtime_seed",
                        "runtime_seed",
                        "student hours runtime seed",
                    ),
                )

                created.append(
                    {
                        "student_id": student_id,
                        "student_name": student_name,
                        "contract_no": contract_no,
                        "total_hours": total_hours,
                        "approved_hours": float(approved_hours),
                        "remaining_hours": float(remaining_hours),
                    }
                )

        conn.commit()
        return created
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_staff_change_request(env_file: Path, count: int) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    created: list[dict[str, object]] = []
    base = int(now.timestamp())

    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            execute_sql_file(cur, Path("sql/osg_staff_change_request_init.sql"))
            mentors = resolve_seed_mentors(cur, minimum=max(count, 1))

            for index in range(count):
                staff_id, staff_name = mentors[index % len(mentors)]
                field_key = "city"
                field_label = "所在城市"
                before_value = f"Seed City {index + 1}"
                after_value = f"Runtime City {base % 100000}-{index + 1}"
                cur.execute(
                    """
                    insert into osg_staff_change_request (
                        staff_id,
                        field_key,
                        field_label,
                        before_value,
                        after_value,
                        status,
                        requested_by,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        staff_id,
                        field_key,
                        field_label,
                        before_value,
                        after_value,
                        "pending",
                        "runtime_seed",
                        "runtime_seed",
                        "runtime_seed",
                        "staff change request runtime seed",
                    ),
                )
                created.append(
                    {
                        "request_id": int(cur.lastrowid),
                        "staff_id": staff_id,
                        "staff_name": staff_name,
                        "field_key": field_key,
                        "after_value": after_value,
                        "status": "pending",
                    }
                )

        conn.commit()
        return created
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "target",
        choices=[
            "finance",
            "report",
            "student-position",
            "job-overview",
            "mock-practice",
            "mock-practice-ack-ready",
            "student-hours",
            "staff-change-request",
        ],
    )
    parser.add_argument("--env-file", default="deploy/.env.dev")
    parser.add_argument("--count", type=int, default=1)
    args = parser.parse_args()

    env_file = Path(args.env_file)
    if args.target == "finance":
        result = {
            "target": "finance",
            "count": args.count,
            "created": seed_finance(env_file, args.count),
        }
    elif args.target == "report":
        result = {
            "target": "report",
            "count": args.count,
            "created": seed_report(env_file, args.count),
        }
    elif args.target == "student-position":
        result = {
            "target": "student-position",
            "count": args.count,
            "created": seed_student_position(env_file, args.count),
        }
    elif args.target == "job-overview":
        result = {
            "target": "job-overview",
            "count": args.count,
            "created": seed_job_overview(env_file, args.count),
        }
    elif args.target == "mock-practice":
        result = {
            "target": "mock-practice",
            "count": args.count,
            "created": seed_mock_practice(env_file, args.count),
        }
    elif args.target == "mock-practice-ack-ready":
        result = {
            "target": "mock-practice-ack-ready",
            "count": args.count,
            "created": seed_mock_practice_ack_ready(env_file, args.count),
        }
    elif args.target == "student-hours":
        result = {
            "target": "student-hours",
            "count": args.count,
            "created": seed_student_hours(env_file, args.count),
        }
    elif args.target == "staff-change-request":
        result = {
            "target": "staff-change-request",
            "count": args.count,
            "created": seed_staff_change_request(env_file, args.count),
        }
    else:
        raise RuntimeError(f"unsupported target: {args.target}")

    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
