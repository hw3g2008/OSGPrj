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


def resolve_active_user_by_username(cur, username: str) -> tuple[int, str] | None:
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
    if row is None:
        return None
    return int(row[0]), str(row[1])


def resolve_active_user_by_email(cur, email: str) -> tuple[int, str] | None:
    normalized = email.strip()
    if not normalized:
        return None
    cur.execute(
        """
        select user_id, coalesce(nullif(nick_name, ''), user_name) as display_name
        from sys_user
        where status = '0'
          and (user_name = %s or email = %s)
        order by user_id asc
        limit 1
        """,
        (normalized, normalized),
    )
    row = cur.fetchone()
    if row is None:
        return None
    return int(row[0]), str(row[1])


def resolve_runtime_mentor_user(cur) -> tuple[int, str]:
    preferred_usernames = [
        os.environ.get("E2E_MENTOR_USERNAME", "").strip(),
        os.environ.get("E2E_ADMIN_USERNAME", "").strip(),
        "mentor",
        "mentor_demo",
    ]

    for username in preferred_usernames:
        if not username:
            continue
        row = resolve_active_user_by_username(cur, username)
        if row is not None:
            return row

    cur.execute(
        """
        select email
        from osg_staff
        where account_status = 'active'
          and email is not null
          and trim(email) != ''
        order by coalesce(hourly_rate, 0) desc, staff_id asc
        limit 1
        """
    )
    staff = cur.fetchone()
    if staff is not None:
        row = resolve_active_user_by_email(cur, str(staff[0]))
        if row is not None:
            return row

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
        raise RuntimeError("no active sys_user row available for mentor runtime seed")
    return int(row[0]), str(row[1])


def resolve_runtime_mentor_users(cur, minimum: int = 2) -> list[tuple[int, str]]:
    mentors = [resolve_runtime_mentor_user(cur)]
    seen_user_ids = {mentors[0][0]}

    cur.execute(
        """
        select email
        from osg_staff
        where account_status = 'active'
          and email is not null
          and trim(email) != ''
        order by coalesce(hourly_rate, 0) desc, staff_id asc
        limit %s
        """,
        (max(minimum * 2, minimum),),
    )
    for row in cur.fetchall() or []:
        resolved = resolve_active_user_by_email(cur, str(row[0]))
        if resolved is None or resolved[0] in seen_user_ids:
            continue
        mentors.append(resolved)
        seen_user_ids.add(resolved[0])
        if len(mentors) >= minimum:
            break

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
        row = resolve_active_user_by_username(cur, username)
        if row is not None:
            return row

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


def resolve_student_by_email(cur, email: str) -> tuple[int, str] | None:
    normalized = email.strip()
    if not normalized:
        return None
    cur.execute(
        """
        select student_id, student_name
        from osg_student
        where email = %s
        limit 1
        """,
        (normalized,),
    )
    row = cur.fetchone()
    if row is None:
        return None
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


def resolve_existing_position_id(
    cur,
    *,
    company_name: str,
    position_name: str,
    region: str,
    city: str,
    project_year: str,
) -> int | None:
    cur.execute(
        """
        select position_id
        from osg_position
        where company_name = %s
          and position_name = %s
          and region = %s
          and city = %s
          and project_year = %s
        order by position_id desc
        limit 1
        """,
        (company_name, position_name, region, city, project_year),
    )
    row = cur.fetchone()
    if row is None:
        return None
    return int(row[0])


def seed_finance(env_file: Path, count: int) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    created: list[dict[str, object]] = []
    base = int(now.timestamp())
    sources = ("mentor", "clerk", "assistant")

    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            _, _, hourly = resolve_seed_mentor(cur)
            mentor_id, mentor_name = resolve_runtime_mentor_user(cur)

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
            _, _, hourly = resolve_seed_mentor(cur)
            mentor_id, mentor_name = resolve_runtime_mentor_user(cur)

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


def seed_student_position_favorite_only(env_file: Path) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    business_suffix = now.strftime("%Y%m%d%H%M%S%f")
    business_key = f"runtime-student-position-favorite-only-{business_suffix}"
    position_title = f"Runtime Favorite Only Analyst {business_suffix}"
    company_name = f"Runtime Favorite Only Co {business_suffix}"

    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            user = resolve_active_user_by_username(cur, "student_demo")
            if user is None:
                raise RuntimeError("student_demo user not found for student-position-favorite-only seed")
            user_id, user_name = user
            public_position_id = ensure_position(
                cur,
                company_name=company_name,
                position_name=position_title,
                industry="Investment Bank",
                region="na",
                city="New York",
                recruitment_cycle="2026 Summer",
                project_year="2026",
                now=now,
            )

            cur.execute(
                """
                insert into osg_student_job_position (
                    position_id,
                    business_key,
                    title,
                    company,
                    category,
                    department,
                    location,
                    recruit_cycle,
                    publish_date,
                    deadline,
                    position_url,
                    career_url,
                    company_key,
                    company_code,
                    industry,
                    requirements,
                    source_type,
                    owner_user_id
                ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                on duplicate key update
                    title = values(title),
                    company = values(company),
                    category = values(category),
                    department = values(department),
                    location = values(location),
                    recruit_cycle = values(recruit_cycle),
                    publish_date = values(publish_date),
                    deadline = values(deadline),
                    position_url = values(position_url),
                    career_url = values(career_url),
                    company_key = values(company_key),
                    company_code = values(company_code),
                    industry = values(industry),
                    requirements = values(requirements),
                    source_type = values(source_type),
                    owner_user_id = values(owner_user_id)
                """,
                (
                    public_position_id,
                    business_key,
                    position_title,
                    company_name,
                    "summer",
                    "Global Markets",
                    "New York",
                    "2026 Summer",
                    now.date(),
                    (now + timedelta(days=30)).date(),
                    f"https://example.com/student-positions/{business_suffix}",
                    "https://example.com/company",
                    "runtime-favorite-only",
                    "runtime-favorite-only",
                    "Investment Bank",
                    "runtime favorite-only seed",
                    "global",
                    None,
                ),
            )
            shadow_position_id = public_position_id

            cur.execute(
                """
                insert into osg_student_job_position_state (
                    user_id,
                    position_id,
                    favorited,
                    applied,
                    applied_at,
                    apply_method,
                    apply_note,
                    progress_stage,
                    progress_note
                ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                on duplicate key update
                    favorited = values(favorited),
                    applied = values(applied),
                    applied_at = values(applied_at),
                    apply_method = values(apply_method),
                    apply_note = values(apply_note),
                    progress_stage = values(progress_stage),
                    progress_note = values(progress_note)
                """,
                (
                    user_id,
                    shadow_position_id,
                    "1",
                    "0",
                    None,
                    None,
                    None,
                    "applied",
                    "",
                ),
            )

        conn.commit()
        return [
            {
                "seed_type": "student-position-favorite-only",
                "user_id": int(user_id),
                "user_name": user_name,
                "public_position_id": public_position_id,
                "shadow_position_id": shadow_position_id,
                "state_position_id": shadow_position_id,
                "position_id": shadow_position_id,
                "business_key": business_key,
                "title": position_title,
                "company": company_name,
                "favorited": "1",
                "applied": "0",
            }
        ]
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_student_position_acceptance_unlock(env_file: Path) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    business_suffix = now.strftime("%Y%m%d%H%M%S%f")
    created: list[dict[str, object]] = []
    row_specs = [
        {
            "business_key": f"runtime-student-position-acceptance-gs-st-{business_suffix}",
            "title": "S&T Analyst",
            "company": "Goldman Sachs",
            "department": "Global Markets",
            "location": "London",
            "company_key": "gs",
            "company_code": "GS",
            "career_url": "https://goldmansachs.com/careers",
            "position_url": "https://goldmansachs.com/careers/students/programs-and-internships",
            "favorited": "0",
            "applied": "0",
            "apply_method": None,
            "applied_at": None,
            "progress_stage": "applied",
            "progress_note": "",
            "application_stage": None,
            "application_coaching_status": None,
            "application_remark": "runtime acceptance unlock cleared main chain",
        },
        {
            "business_key": f"runtime-student-position-acceptance-gs-ib-{business_suffix}",
            "title": "IB Analyst",
            "company": "Goldman Sachs",
            "department": "Investment Banking",
            "location": "Hong Kong",
            "company_key": "gs",
            "company_code": "GS",
            "career_url": "https://goldmansachs.com/careers",
            "position_url": "https://goldmansachs.com/careers/students/programs-and-internships",
            "favorited": "1",
            "applied": "1",
            "apply_method": "官网投递",
            "applied_at": now,
            "progress_stage": "applied",
            "progress_note": "runtime acceptance unlock favorite row",
            "application_stage": "hirevue",
            "application_coaching_status": "pending",
            "application_remark": "runtime acceptance unlock favorite row",
        },
        {
            "business_key": f"runtime-student-position-acceptance-ms-ibd-{business_suffix}",
            "title": "IBD Summer Analyst",
            "company": "Morgan Stanley",
            "department": "Investment Banking Division",
            "location": "New York",
            "company_key": "ms",
            "company_code": "MS",
            "career_url": "https://www.morganstanley.com/careers/career-opportunities-search",
            "position_url": "https://www.morganstanley.com/careers/career-opportunities-search",
            "favorited": "0",
            "applied": "1",
            "apply_method": "官网投递",
            "applied_at": now,
            "progress_stage": "applied",
            "progress_note": "runtime acceptance unlock stage row",
            "application_stage": "applied",
            "application_coaching_status": "pending",
            "application_remark": "runtime acceptance unlock stage row",
        },
    ]

    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            user = resolve_active_user_by_username(cur, "student_demo")
            if user is None:
                raise RuntimeError("student_demo user not found for student-position-acceptance-unlock seed")
            user_id, user_name = user
            student = resolve_student_by_email(cur, "student_demo@osg.local")
            if student is None:
                raise RuntimeError("student_demo osg_student row not found for student-position-acceptance-unlock seed")
            student_id, student_name = student

            for spec in row_specs:
                public_position_id = resolve_existing_position_id(
                    cur,
                    company_name=spec["company"],
                    position_name=spec["title"],
                    region="na",
                    city=spec["location"],
                    project_year="2026",
                )
                if public_position_id is None:
                    public_position_id = ensure_position(
                        cur,
                        company_name=spec["company"],
                        position_name=spec["title"],
                        industry="Investment Bank",
                        region="na",
                        city=spec["location"],
                        recruitment_cycle="2026 Summer",
                        project_year="2026",
                        now=now,
                    )

                cur.execute(
                    """
                    insert into osg_student_job_position (
                        position_id,
                        business_key,
                        title,
                        company,
                        category,
                        department,
                        location,
                        recruit_cycle,
                        publish_date,
                        deadline,
                        position_url,
                        career_url,
                        company_key,
                        company_code,
                        industry,
                        requirements,
                        source_type,
                        owner_user_id
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    on duplicate key update
                        title = values(title),
                        company = values(company),
                        category = values(category),
                        department = values(department),
                        location = values(location),
                        recruit_cycle = values(recruit_cycle),
                        publish_date = values(publish_date),
                        deadline = values(deadline),
                        position_url = values(position_url),
                        career_url = values(career_url),
                        company_key = values(company_key),
                        company_code = values(company_code),
                        industry = values(industry),
                        requirements = values(requirements),
                        source_type = values(source_type),
                        owner_user_id = values(owner_user_id)
                    """,
                    (
                        public_position_id,
                        spec["business_key"],
                        spec["title"],
                        spec["company"],
                        "summer",
                        spec["department"],
                        spec["location"],
                        "2026 Summer",
                        now.date(),
                        (now + timedelta(days=30)).date(),
                        spec["position_url"],
                        spec["career_url"],
                        spec["company_key"],
                        spec["company_code"],
                        "Investment Bank",
                        "runtime acceptance unlock seed",
                        "global",
                        None,
                    ),
                )

                cur.execute(
                    """
                    insert into osg_student_job_position_state (
                        user_id,
                        position_id,
                        favorited,
                        applied,
                        applied_at,
                        apply_method,
                        apply_note,
                        progress_stage,
                        progress_note
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    on duplicate key update
                        favorited = values(favorited),
                        applied = values(applied),
                        applied_at = values(applied_at),
                        apply_method = values(apply_method),
                        apply_note = values(apply_note),
                        progress_stage = values(progress_stage),
                        progress_note = values(progress_note)
                    """,
                    (
                        user_id,
                        public_position_id,
                        spec["favorited"],
                        spec["applied"],
                        spec["applied_at"],
                        spec["apply_method"],
                        "runtime acceptance unlock seed",
                        spec["progress_stage"],
                        spec["progress_note"],
                    ),
                )

                cur.execute(
                    """
                    delete from osg_job_application
                    where student_id = %s
                      and company_name = %s
                      and position_name = %s
                    """,
                    (
                        student_id,
                        spec["company"],
                        spec["title"],
                    ),
                )

                if spec["application_stage"] is not None:
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
                            create_time,
                            update_by,
                            update_time,
                            remark
                        ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, sysdate(), %s, sysdate(), %s)
                        """,
                        (
                            student_id,
                            public_position_id,
                            student_name,
                            spec["company"],
                            spec["title"],
                            resolve_runtime_seed_region(spec["location"]),
                            spec["location"],
                            spec["application_stage"],
                            None,
                            spec["application_coaching_status"],
                            None,
                            None,
                            "pending",
                            0,
                            None,
                            False,
                            now,
                            "runtime_seed_admin",
                            "runtime_seed_admin",
                            spec["application_remark"],
                        ),
                    )

                created.append(
                    {
                        "seed_type": "student-position-acceptance-unlock",
                        "user_id": int(user_id),
                        "user_name": user_name,
                        "position_id": public_position_id,
                        "business_key": spec["business_key"],
                        "company": spec["company"],
                        "title": spec["title"],
                        "favorited": spec["favorited"],
                        "applied": spec["applied"],
                    }
                )

        conn.commit()
        return created
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def resolve_runtime_seed_region(location: str) -> str:
    normalized = location.strip().lower()
    if "new york" in normalized or "san francisco" in normalized:
        return "na"
    if "london" in normalized:
        return "uk"
    if "hong kong" in normalized or "shanghai" in normalized or "singapore" in normalized:
        return "apac"
    return ""


def seed_job_overview(env_file: Path, count: int) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    created: list[dict[str, object]] = []
    base = int(now.timestamp())

    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            mentors = resolve_seed_mentors(cur, minimum=2)
            runtime_mentors = resolve_runtime_mentor_users(cur, minimum=2)
            lead_mentor_id, lead_mentor_name = resolve_lead_mentor_runtime_user(cur)
            _, primary_mentor_name = mentors[0]
            _, secondary_mentor_name = mentors[1]
            primary_mentor_id, primary_visible_mentor_name = runtime_mentors[0]
            secondary_mentor_id, secondary_visible_mentor_name = runtime_mentors[1]

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
                        primary_visible_mentor_name,
                        str(primary_mentor_id),
                        primary_visible_mentor_name,
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
                        secondary_visible_mentor_name,
                        str(secondary_mentor_id),
                        secondary_visible_mentor_name,
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
                        "mentor_names": [primary_visible_mentor_name, secondary_visible_mentor_name],
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


def seed_job_overview_unlock(env_file: Path, count: int) -> list[dict[str, object]]:
    created: list[dict[str, object]] = []
    conn = connect(env_file)
    seed_now = datetime(2026, 1, 20, 12, 0, 0)
    specs = [
        {
            "student_id_offset": 1,
            "student_name": "张三",
            "company_name": "Goldman Sachs",
            "position_name": "IB Analyst",
            "stage": "First Round",
            "city": "Hong Kong",
            "coaching_status": "new",
            "submitted_at": datetime(2026, 1, 20, 12, 0, 0),
            "interview_time": datetime(2026, 1, 27, 10, 0, 0),
            "hours_used": 0,
            "mentor_background": "Runtime Backfill Mentor",
            "feedback_summary": "runtime job overview new chain",
            "assign_status": "pending",
        },
        {
            "student_id_offset": 2,
            "student_name": "李四",
            "company_name": "McKinsey",
            "position_name": "Consultant",
            "stage": "Case Study",
            "city": "Shanghai",
            "coaching_status": "coaching",
            "submitted_at": datetime(2026, 1, 19, 12, 0, 0),
            "interview_time": datetime(2026, 1, 28, 14, 0, 0),
            "hours_used": 6,
            "mentor_background": "Runtime Backfill Mentor",
            "feedback_summary": "runtime job overview coaching chain",
            "assign_status": "assigned",
        },
        {
            "student_id_offset": 3,
            "student_name": "赵六",
            "company_name": "Morgan Stanley",
            "position_name": "IBD Analyst",
            "stage": "R2",
            "city": "New York",
            "coaching_status": "coaching",
            "submitted_at": datetime(2026, 1, 18, 12, 0, 0),
            "interview_time": datetime(2026, 1, 30, 15, 0, 0),
            "hours_used": 8,
            "mentor_background": "Runtime Backfill Mentor",
            "feedback_summary": "runtime job overview coaching chain",
            "assign_status": "assigned",
        },
    ]

    try:
        with conn.cursor() as cur:
            runtime_mentor_id, runtime_mentor_name = resolve_runtime_mentor_user(cur)
            lead_mentor_id, lead_mentor_name = resolve_lead_mentor_runtime_user(cur)
            mentors = resolve_seed_mentors(cur, minimum=2)

            for index in range(max(count, 1)):
                for spec in specs:
                    student_id = 997000000000 + index * 100 + spec["student_id_offset"]
                    student_name = spec["student_name"] if index == 0 else f'{spec["student_name"]}-{index + 1}'

                    ensure_student(
                        cur,
                        student_id=student_id,
                        student_name=student_name,
                        email=f"job-overview-unlock-{student_id}@example.com",
                        lead_mentor_id=lead_mentor_id,
                        remark="job overview unlock runtime seed",
                    )

                    position_id = resolve_existing_position_id(
                        cur,
                        company_name=spec["company_name"],
                        position_name=spec["position_name"],
                        region="na",
                        city=spec["city"],
                        project_year="2026",
                    )
                    if position_id is None:
                        position_id = ensure_position(
                            cur,
                            company_name=spec["company_name"],
                            position_name=spec["position_name"],
                            industry="Consulting",
                            region="na",
                            city=spec["city"],
                            recruitment_cycle="2026 Summer",
                            project_year="2026",
                            now=seed_now - timedelta(minutes=index),
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
                            student_id,
                            position_id,
                            student_name,
                            spec["company_name"],
                            spec["position_name"],
                            "na",
                            spec["city"],
                            spec["stage"],
                            spec["interview_time"],
                            spec["coaching_status"],
                            lead_mentor_id,
                            lead_mentor_name,
                            spec["assign_status"],
                            1,
                            runtime_mentor_name,
                            0,
                            spec["submitted_at"] - timedelta(minutes=index),
                            "runtime_seed",
                            "runtime_seed",
                            "job overview unlock runtime seed",
                        ),
                    )
                    application_id = int(cur.lastrowid)

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
                            application_id,
                            student_id,
                            runtime_mentor_id,
                            runtime_mentor_name,
                            str(runtime_mentor_id),
                            runtime_mentor_name,
                            spec["mentor_background"],
                            spec["coaching_status"],
                            spec["hours_used"],
                            spec["feedback_summary"],
                            "job overview unlock runtime seed",
                            spec["submitted_at"],
                            "runtime_seed",
                            "runtime_seed",
                            "job overview unlock runtime seed",
                        ),
                    )

                    created.append(
                        {
                            "application_id": application_id,
                            "student_id": student_id,
                            "student_name": student_name,
                            "company_name": spec["company_name"],
                            "position_name": spec["position_name"],
                            "current_stage": spec["stage"],
                            "coachingStatus": spec["coaching_status"],
                            "interviewTime": spec["interview_time"].isoformat(),
                        }
                    )

        conn.commit()
        return created
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_student_applications_unlock(env_file: Path) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    business_suffix = now.strftime("%Y%m%d%H%M%S%f")
    business_key = f"runtime-student-applications-unlock-{business_suffix}"
    position_title = "IB Analyst"
    company_name = "Goldman Sachs"
    position_id = None

    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            user = resolve_active_user_by_username(cur, "student_demo")
            if user is None:
                raise RuntimeError("student_demo user not found for student-applications-unlock seed")
            user_id, user_name = user

            student = resolve_student_by_email(cur, "student_demo@osg.local")
            if student is None:
                raise RuntimeError("student_demo osg_student row not found for student-applications-unlock seed")
            student_id, student_name = student
            lead_mentor_id, lead_mentor_name = resolve_lead_mentor_runtime_user(cur)

            public_position_id = resolve_existing_position_id(
                cur,
                company_name=company_name,
                position_name=position_title,
                region="na",
                city="Hong Kong",
                project_year="2026",
            )
            if public_position_id is None:
                public_position_id = ensure_position(
                    cur,
                    company_name=company_name,
                    position_name=position_title,
                    industry="Investment Bank",
                    region="na",
                    city="Hong Kong",
                    recruitment_cycle="2026 Summer",
                    project_year="2026",
                    now=now,
                )

            cur.execute(
                """
                insert into osg_student_job_position (
                    position_id,
                    business_key,
                    title,
                    company,
                    category,
                    department,
                    location,
                    recruit_cycle,
                    publish_date,
                    deadline,
                    position_url,
                    career_url,
                    company_key,
                    company_code,
                    industry,
                    requirements,
                    source_type,
                    owner_user_id
                ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                on duplicate key update
                    business_key = values(business_key),
                    title = values(title),
                    company = values(company),
                    category = values(category),
                    department = values(department),
                    location = values(location),
                    recruit_cycle = values(recruit_cycle),
                    publish_date = values(publish_date),
                    deadline = values(deadline),
                    position_url = values(position_url),
                    career_url = values(career_url),
                    company_key = values(company_key),
                    company_code = values(company_code),
                    industry = values(industry),
                    requirements = values(requirements),
                    source_type = values(source_type),
                    owner_user_id = values(owner_user_id)
                """,
                (
                    public_position_id,
                    business_key,
                    position_title,
                    company_name,
                    "summer",
                    "Investment Banking",
                    "Hong Kong",
                    "2026 Summer",
                    now.date(),
                    (now + timedelta(days=30)).date(),
                    f"https://example.com/student-applications/{business_suffix}",
                    "https://goldmansachs.com/careers",
                    "gs",
                    "GS",
                    "Investment Bank",
                    "runtime student applications unlock seed",
                    "global",
                    None,
                ),
            )

            cur.execute(
                """
                delete from osg_job_application
                where student_id = %s
                  and company_name = %s
                  and position_name = %s
                """,
                (
                    student_id,
                    company_name,
                    position_title,
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
                    student_id,
                    public_position_id,
                    student_name,
                    company_name,
                    position_title,
                    "na",
                    "Hong Kong",
                    "first",
                    now + timedelta(days=2),
                    "coaching",
                    lead_mentor_id,
                    lead_mentor_name,
                    "assigned",
                    1,
                    lead_mentor_name,
                    0,
                    now - timedelta(hours=1),
                    "runtime_seed",
                    "runtime_seed",
                    "student applications unlock runtime seed",
                ),
            )
            position_id = int(public_position_id)

        conn.commit()
        return [
            {
                "seed_type": "student-applications-unlock",
                "user_id": int(user_id),
                "user_name": user_name,
                "student_id": int(student_id),
                "student_name": student_name,
                "position_id": position_id,
                "business_key": business_key,
                "company": company_name,
                "title": position_title,
                "current_stage": "first",
                "coachingStatus": "coaching",
                "bucket": "ongoing",
            }
        ]
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_student_applications_schedule_unlock(env_file: Path) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    conn = connect(env_file)
    created: list[dict[str, object]] = []

    def company_short_label(company: str) -> str:
        if company == "Goldman Sachs":
            return "GS"
        if company == "McKinsey":
            return "MCK"
        if company == "JP Morgan":
            return "JPM"
        initials = "".join(segment[0].upper() for segment in company.split() if segment)
        return initials or "APP"

    dict_specs = [
        (8, "Final Round", "final_round", "orange"),
        (9, "Case Interview", "case_interview", "gold"),
    ]
    application_specs = [
        {
            "company_name": "Goldman Sachs",
            "position_name": "IB Analyst",
            "position_industry": "Investment Bank",
            "position_location": "Hong Kong",
            "position_cycle": "2026 Summer",
            "position_year": "2026",
            "current_stage": "final_round",
            "stage_label": "Final Round",
            "interview_time": datetime(2026, 3, 31, 5, 49, 0),
            "coaching_status": "coaching",
            "assign_status": "assigned",
            "apply_method": "官网投递",
            "submitted_at": datetime(2026, 3, 29, 9, 0, 0),
            "remark": "student applications schedule runtime seed",
        },
        {
            "company_name": "McKinsey",
            "position_name": "Business Analyst",
            "position_industry": "Consulting",
            "position_location": "Shanghai",
            "position_cycle": "2026 Summer",
            "position_year": "2026",
            "current_stage": "case_interview",
            "stage_label": "Case Interview",
            "interview_time": datetime(2026, 4, 1, 10, 0, 0),
            "coaching_status": "pending",
            "assign_status": "pending",
            "apply_method": "内推",
            "submitted_at": datetime(2026, 3, 29, 9, 5, 0),
            "remark": "student applications schedule runtime seed",
        },
    ]

    try:
        with conn.cursor() as cur:
            user = resolve_active_user_by_username(cur, "student_demo")
            if user is None:
                raise RuntimeError("student_demo user not found for student-applications-schedule-unlock seed")
            user_id, user_name = user

            student = resolve_student_by_email(cur, "student_demo@osg.local")
            if student is None:
                raise RuntimeError("student_demo osg_student row not found for student-applications-schedule-unlock seed")
            student_id, student_name = student
            lead_mentor_id, lead_mentor_name = resolve_lead_mentor_runtime_user(cur)

            for sort, label, value, css_class in dict_specs:
                cur.execute(
                    """
                    insert into sys_dict_data (
                        dict_sort,
                        dict_label,
                        dict_value,
                        dict_type,
                        css_class,
                        list_class,
                        is_default,
                        status,
                        remark,
                        create_by,
                        create_time,
                        update_by,
                        update_time
                    ) values (%s, %s, %s, %s, %s, %s, 'N', '0', %s, 'runtime_seed', sysdate(), 'runtime_seed', sysdate())
                    on duplicate key update
                        dict_sort = values(dict_sort),
                        dict_label = values(dict_label),
                        css_class = values(css_class),
                        list_class = values(list_class),
                        status = values(status),
                        remark = values(remark),
                        update_by = values(update_by),
                        update_time = values(update_time)
                    """,
                    (
                        sort,
                        label,
                        value,
                        "osg_student_position_progress_stage",
                        css_class,
                        None,
                        "岗位进度",
                    ),
                )

            for spec in application_specs:
                position_id = resolve_existing_position_id(
                    cur,
                    company_name=spec["company_name"],
                    position_name=spec["position_name"],
                    region="na",
                    city=spec["position_location"],
                    project_year=spec["position_year"],
                )
                if position_id is None:
                    position_id = ensure_position(
                        cur,
                        company_name=spec["company_name"],
                        position_name=spec["position_name"],
                        industry=spec["position_industry"],
                        region="na",
                        city=spec["position_location"],
                        recruitment_cycle=spec["position_cycle"],
                        project_year=spec["position_year"],
                        now=now,
                    )

                cur.execute(
                    """
                    select application_id
                    from osg_job_application
                    where student_id = %s
                      and company_name = %s
                      and position_name = %s
                    order by submitted_at desc, application_id desc
                    limit 1
                    """,
                    (student_id, spec["company_name"], spec["position_name"]),
                )
                existing = cur.fetchone()
                short_label = f"{company_short_label(spec['company_name'])} {spec['stage_label']}"

                if existing is None:
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
                            student_id,
                            position_id,
                            student_name,
                            spec["company_name"],
                            spec["position_name"],
                            "na",
                            spec["position_location"],
                            spec["current_stage"],
                            spec["interview_time"],
                            spec["coaching_status"],
                            lead_mentor_id,
                            lead_mentor_name,
                            spec["assign_status"],
                            1,
                            lead_mentor_name,
                            0,
                            spec["submitted_at"],
                            "runtime_seed",
                            "runtime_seed",
                            spec["remark"],
                        ),
                    )
                    application_id = int(cur.lastrowid)
                else:
                    application_id = int(existing[0])
                    cur.execute(
                        """
                        update osg_job_application
                           set position_id = %s,
                               student_name = %s,
                               current_stage = %s,
                               interview_time = %s,
                               coaching_status = %s,
                               lead_mentor_id = %s,
                               lead_mentor_name = %s,
                               assign_status = %s,
                               requested_mentor_count = %s,
                               preferred_mentor_names = %s,
                               stage_updated = %s,
                               submitted_at = %s,
                               update_by = %s,
                               update_time = sysdate(),
                               remark = %s
                         where application_id = %s
                        """,
                        (
                            position_id,
                            student_name,
                            spec["current_stage"],
                            spec["interview_time"],
                            spec["coaching_status"],
                            lead_mentor_id,
                            lead_mentor_name,
                            spec["assign_status"],
                            1,
                            lead_mentor_name,
                            0,
                            spec["submitted_at"],
                            "runtime_seed",
                            spec["remark"],
                            application_id,
                        ),
                    )

                created.append(
                    {
                        "seed_type": "student-applications-schedule-unlock",
                        "user_id": int(user_id),
                        "user_name": user_name,
                        "student_id": int(student_id),
                        "student_name": student_name,
                        "position_id": position_id,
                        "application_id": application_id,
                        "company": spec["company_name"],
                        "title": spec["position_name"],
                        "current_stage": spec["current_stage"],
                        "shortLabel": short_label,
                        "interviewTime": spec["interview_time"].isoformat(),
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
            runtime_mentor_id, runtime_mentor_name = resolve_runtime_mentor_user(cur)
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
                        runtime_mentor_name,
                        "completed",
                        str(runtime_mentor_id),
                        runtime_mentor_name,
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


def seed_mock_practice_new(env_file: Path, count: int) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    created: list[dict[str, object]] = []
    base = int(now.timestamp())

    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            mentors = resolve_seed_mentors(cur, minimum=2)
            runtime_mentor_id, runtime_mentor_name = resolve_runtime_mentor_user(cur)
            lead_mentor_id, lead_mentor_name = resolve_lead_mentor_runtime_user(cur)
            primary_mentor_name = mentors[0][1]
            secondary_mentor_name = mentors[1][1]

            for index in range(count):
                suffix = f"{base % 100000}-{index + 1}"
                student_id = 994000000000 + base * 10 + index
                student_name = f"Mock New {suffix}"
                practice_type = "mock_interview" if index % 2 == 0 else "relation_test"
                request_content = f"Runtime Mock New {suffix}"

                ensure_student(
                    cur,
                    student_id=student_id,
                    student_name=student_name,
                    email=f"mock-practice-new-{student_id}@example.com",
                    lead_mentor_id=lead_mentor_id,
                    remark="mock practice new runtime seed",
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
                        practice_type,
                        request_content,
                        2,
                        f"{primary_mentor_name}, {secondary_mentor_name}",
                        "new",
                        str(runtime_mentor_id),
                        runtime_mentor_name,
                        "Lead Mentor Runtime Coach",
                        None,
                        0,
                        None,
                        None,
                        now - timedelta(minutes=15 + index),
                        "runtime_seed",
                        "runtime_seed",
                        "mock practice new runtime seed",
                    ),
                )
                created.append(
                    {
                        "practice_id": int(cur.lastrowid),
                        "student_id": student_id,
                        "student_name": student_name,
                        "request_content": request_content,
                        "mentor_ids": [runtime_mentor_id],
                        "mentor_names": [runtime_mentor_name],
                        "status": "new",
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
            runtime_mentor_id, runtime_mentor_name = resolve_runtime_mentor_user(cur)
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
                        runtime_mentor_name,
                        "scheduled",
                        str(runtime_mentor_id),
                        runtime_mentor_name,
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


def seed_student_profile_pending_changes(env_file: Path) -> list[dict[str, object]]:
    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            user = resolve_active_user_by_username(cur, "student_demo")
            if user is None:
                raise RuntimeError("student_demo user not found for student-profile-pending-changes seed")
            user_id, user_name = user

            student = resolve_student_by_email(cur, "student_demo@osg.local")
            student_id = int(student[0]) if student is not None else int(user_id)
            student_name = str(student[1]) if student is not None else user_name

            cur.execute(
                """
                insert into osg_student_profile (
                    user_id,
                    student_code,
                    full_name,
                    english_name,
                    email,
                    sex_label,
                    lead_mentor,
                    assistant_name,
                    school,
                    major,
                    graduation_year,
                    high_school,
                    postgraduate_plan,
                    visa_status,
                    target_region,
                    recruitment_cycle,
                    primary_direction,
                    secondary_direction,
                    phone,
                    wechat_id
                ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                on duplicate key update
                    student_code = values(student_code),
                    full_name = values(full_name),
                    english_name = values(english_name),
                    email = values(email),
                    sex_label = values(sex_label),
                    lead_mentor = values(lead_mentor),
                    assistant_name = values(assistant_name),
                    school = values(school),
                    major = values(major),
                    graduation_year = values(graduation_year),
                    high_school = values(high_school),
                    postgraduate_plan = values(postgraduate_plan),
                    visa_status = values(visa_status),
                    target_region = values(target_region),
                    recruitment_cycle = values(recruitment_cycle),
                    primary_direction = values(primary_direction),
                    secondary_direction = values(secondary_direction),
                    phone = values(phone),
                    wechat_id = values(wechat_id)
                """,
                (
                    user_id,
                    "12766",
                    "Emily Zhang",
                    "Emily Zhang",
                    "emily@example.com",
                    "Female",
                    "Test Lead Mentor",
                    "-",
                    "NYU",
                    "Finance",
                    "2025",
                    "-",
                    "否",
                    "F1",
                    "亚太 - 香港",
                    "2025 Summer",
                    "金融 Finance",
                    "IB 投行",
                    "+1 123-456-7890",
                    "emily_zhang",
                ),
            )

            cur.execute("delete from osg_student_profile_change where user_id = %s", (user_id,))
            cur.execute("delete from osg_student_change_request where student_id = %s", (student_id,))

            change_specs = [
                ("school", "学校", "NYU", "Columbia University"),
                ("recruitmentCycle", "招聘周期", "2025 Summer", "2025 Full-time"),
            ]

            for field_key, field_label, old_value, new_value in change_specs:
                cur.execute(
                    """
                    insert into osg_student_change_request (
                        student_id,
                        change_type,
                        field_key,
                        field_label,
                        before_value,
                        after_value,
                        status,
                        requested_by,
                        create_by,
                        update_by,
                        remark
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        student_id,
                        "学生资料",
                        field_key,
                        field_label,
                        old_value,
                        new_value,
                        "pending",
                        "runtime_seed",
                        "runtime_seed",
                        "runtime_seed",
                        "student profile pending change runtime seed",
                    ),
                )

                cur.execute(
                    """
                    insert into osg_student_profile_change (
                        user_id,
                        field_key,
                        field_label,
                        old_value,
                        new_value,
                        status,
                        submitted_at
                    ) values (%s, %s, %s, %s, %s, %s, sysdate())
                    """,
                    (
                        user_id,
                        field_key,
                        field_label,
                        old_value,
                        new_value,
                        "pending",
                    ),
                )

        conn.commit()
        return [
            {
                "seed_type": "student-profile-pending-changes",
                "user_id": int(user_id),
                "user_name": user_name,
                "student_id": int(student_id),
                "student_name": student_name,
                "fieldKey": field_key,
                "fieldLabel": field_label,
                "oldValue": old_value,
                "newValue": new_value,
                "pendingChanges": [field_key],
            }
            for field_key, field_label, old_value, new_value in change_specs
        ]
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
            _, _, hourly = resolve_seed_mentor(cur)
            mentor_id, mentor_name = resolve_runtime_mentor_user(cur)
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

            insert_student_demo_course_record(
                cur,
                mentor_id=mentor_id,
                mentor_name=mentor_name,
                now=now,
                rate="",
                remark="student hours runtime seed for student_demo",
            )

        conn.commit()
        return created
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_student_demo_course_record(env_file: Path) -> dict[str, object]:
    now = datetime.now().replace(microsecond=0)
    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            mentor_id, mentor_name, _ = resolve_seed_mentor(cur)
            record = insert_student_demo_course_record(
                cur,
                mentor_id=mentor_id,
                mentor_name=mentor_name,
                now=now,
                rate="",
                remark="student demo course runtime seed",
            )
        conn.commit()
        return record
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_student_demo_course_bundle(env_file: Path) -> list[dict[str, object]]:
    now = datetime.now().replace(microsecond=0)
    conn = connect(env_file)
    try:
        with conn.cursor() as cur:
            mentor_id, mentor_name, _ = resolve_seed_mentor(cur)
            student_demo = resolve_student_by_email(cur, "student_demo@osg.local")
            if student_demo is None:
                raise RuntimeError("student_demo main data missing, cannot seed course bundle")

            demo_student_id, demo_student_name = student_demo
            bundle_specs = [
                {
                    "class_id": f"STU-DEMO-BUNDLE-{int(now.timestamp())}-1",
                    "mentor_name": "Jerry Li",
                    "course_type": "basic_course",
                    "class_status": "case_prep",
                    "rate": "",
                    "comment": "student demo course runtime bundle pending",
                    "review_remark": "student demo course runtime bundle pending",
                },
                {
                    "class_id": f"STU-DEMO-BUNDLE-{int(now.timestamp())}-2",
                    "mentor_name": "Jerry Li",
                    "course_type": "mock_practice",
                    "class_status": "networking_midterm",
                    "rate": "5",
                    "comment": "student demo course runtime bundle networking midterm",
                    "review_remark": "student demo course runtime bundle networking midterm",
                },
                {
                    "class_id": f"STU-DEMO-BUNDLE-{int(now.timestamp())}-3",
                    "mentor_name": "Sarah Chen",
                    "course_type": "mock_practice",
                    "class_status": "mock_midterm",
                    "rate": "4",
                    "comment": "student demo course runtime bundle mock midterm",
                    "review_remark": "student demo course runtime bundle mock midterm",
                },
            ]

            created: list[dict[str, object]] = []
            for index, spec in enumerate(bundle_specs):
                class_date = now - timedelta(days=index + 1)
                submitted_at = now - timedelta(hours=2 + index)
                reviewed_at = now - timedelta(hours=1 + index)
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
                        spec["class_id"],
                        mentor_id,
                        spec["mentor_name"],
                        demo_student_id,
                        demo_student_name,
                        spec["course_type"],
                        "mentor",
                        class_date,
                        3.5,
                        3.5,
                        "approved",
                        spec["class_status"],
                        spec["rate"],
                        "",
                        spec["comment"],
                        spec["comment"],
                        spec["review_remark"],
                        reviewed_at,
                        submitted_at,
                        "runtime_seed",
                        "runtime_seed",
                        "student demo course runtime bundle",
                    ),
                )
                created.append(
                    {
                        "class_id": spec["class_id"],
                        "student_id": demo_student_id,
                        "student_name": demo_student_name,
                        "mentor_id": mentor_id,
                        "mentor_name": spec["mentor_name"],
                        "course_type": spec["course_type"],
                        "class_status": spec["class_status"],
                        "status": "approved",
                        "rate": spec["rate"],
                    }
                )

        conn.commit()
        return created
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def insert_student_demo_course_record(cur, *, mentor_id: int, mentor_name: str, now: datetime, rate: str = "", remark: str) -> dict[str, object]:
    student_demo = resolve_student_by_email(cur, "student_demo@osg.local")
    if student_demo is None:
        raise RuntimeError("student_demo main data missing, cannot seed course record")

    demo_student_id, demo_student_name = student_demo
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
            f"STU-DEMO-{int(now.timestamp())}",
            mentor_id,
            mentor_name,
            demo_student_id,
            demo_student_name,
            "mock_interview",
            "mentor",
            now - timedelta(days=1),
            3.5,
            3.5,
            "approved",
            "completed",
            rate,
            "",
            "",
            "",
            "",
            now - timedelta(hours=1),
            now - timedelta(hours=2),
            "runtime_seed",
            "runtime_seed",
            remark,
        ),
    )
    return {
        "class_id": f"STU-DEMO-{int(now.timestamp())}",
        "student_id": demo_student_id,
        "student_name": demo_student_name,
        "mentor_id": mentor_id,
        "mentor_name": mentor_name,
        "course_type": "mock_interview",
        "course_source": "mentor",
        "status": "approved",
        "class_status": "completed",
        "record_type": "student_demo_course",
    }


def seed_class_records_unlock(env_file: Path, count: int) -> list[dict[str, object]]:
    created: list[dict[str, object]] = []
    conn = connect(env_file)
    base_now = datetime(2026, 3, 21, 9, 0, 0)
    record_specs = [
        {
            "class_id": "CR-UNLOCK-1",
            "student_id": 998000000001,
            "student_name": "张三",
            "course_type": "mock_interview",
            "course_source": "mentor",
            "class_status": "mock_interview",
            "rate": "5",
            "topics": "runtime class record unlock",
            "comments": "runtime class record unlock",
            "feedback_content": "表现优秀，建议继续加强结构化表达",
            "review_remark": "runtime class record unlock",
            "class_date": datetime(2026, 3, 20, 9, 0, 0),
            "submitted_at": datetime(2026, 3, 20, 7, 0, 0),
            "rating_state": "rated",
        },
        {
            "class_id": "CR-UNLOCK-2",
            "student_id": 998000000002,
            "student_name": "李四",
            "course_type": "mock_interview",
            "course_source": "mentor",
            "class_status": "case_prep",
            "rate": "",
            "topics": "runtime class record unlock",
            "comments": "runtime class record unlock",
            "feedback_content": "课程已通过，待学员后续评价",
            "review_remark": "runtime class record unlock",
            "class_date": datetime(2026, 3, 19, 9, 0, 0),
            "submitted_at": datetime(2026, 3, 19, 7, 0, 0),
            "rating_state": "pending_rating",
        },
    ]

    try:
        with conn.cursor() as cur:
            runtime_mentor_id, runtime_mentor_name = resolve_runtime_mentor_user(cur)
            lead_mentor_id, _ = resolve_lead_mentor_runtime_user(cur)

            for index in range(max(count, 1)):
                for spec in record_specs:
                    student_id = spec["student_id"] + index * 10
                    student_name = spec["student_name"] if index == 0 else f'{spec["student_name"]}-{index + 1}'
                    ensure_student(
                        cur,
                        student_id=student_id,
                        student_name=student_name,
                        email=f"class-record-unlock-{student_id}@example.com",
                        lead_mentor_id=lead_mentor_id,
                        remark="class records unlock runtime seed",
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
                            spec["class_id"] if index == 0 else f'{spec["class_id"]}-{index + 1}',
                            runtime_mentor_id,
                            runtime_mentor_name,
                            student_id,
                            student_name,
                            spec["course_type"],
                            spec["course_source"],
                            spec["class_date"] - timedelta(days=index),
                            1.5,
                            1.5,
                            "approved",
                            spec["class_status"],
                            spec["rate"],
                            spec["topics"],
                            spec["comments"],
                            spec["feedback_content"],
                            spec["review_remark"],
                            base_now - timedelta(hours=index),
                            spec["submitted_at"] - timedelta(days=index),
                            "runtime_seed",
                            "runtime_seed",
                            "class records unlock runtime seed",
                        ),
                    )

                    created.append(
                        {
                            "class_id": spec["class_id"] if index == 0 else f'{spec["class_id"]}-{index + 1}',
                            "student_id": student_id,
                            "student_name": student_name,
                            "status": "approved",
                            "ratingState": spec["rating_state"],
                            "rate": spec["rate"],
                            "mentor_id": runtime_mentor_id,
                            "mentor_name": runtime_mentor_name,
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
            "job-overview-unlock",
            "mock-practice",
            "mock-practice-new",
                "mock-practice-ack-ready",
                "student-applications-unlock",
                "student-applications-schedule-unlock",
                "student-profile-pending-changes",
                "class-records-unlock",
            "student-course-record",
            "student-course-record-bundle",
            "student-position-favorite-only",
            "student-position-acceptance-unlock",
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
    elif args.target == "job-overview-unlock":
        result = {
            "target": "job-overview-unlock",
            "count": args.count,
            "created": seed_job_overview_unlock(env_file, args.count),
        }
    elif args.target == "mock-practice":
        result = {
            "target": "mock-practice",
            "count": args.count,
            "created": seed_mock_practice(env_file, args.count),
        }
    elif args.target == "mock-practice-new":
        result = {
            "target": "mock-practice-new",
            "count": args.count,
            "created": seed_mock_practice_new(env_file, args.count),
        }
    elif args.target == "mock-practice-ack-ready":
        result = {
            "target": "mock-practice-ack-ready",
            "count": args.count,
            "created": seed_mock_practice_ack_ready(env_file, args.count),
        }
    elif args.target == "student-applications-unlock":
        result = {
            "target": "student-applications-unlock",
            "count": args.count,
            "created": seed_student_applications_unlock(env_file),
        }
    elif args.target == "student-applications-schedule-unlock":
        result = {
            "target": "student-applications-schedule-unlock",
            "count": args.count,
            "created": seed_student_applications_schedule_unlock(env_file),
        }
    elif args.target == "student-profile-pending-changes":
        result = {
            "target": "student-profile-pending-changes",
            "count": args.count,
            "created": seed_student_profile_pending_changes(env_file),
        }
    elif args.target == "student-hours":
        result = {
            "target": "student-hours",
            "count": args.count,
            "created": seed_student_hours(env_file, args.count),
        }
    elif args.target == "student-course-record":
        result = {
            "target": "student-course-record",
            "count": args.count,
            "created": [seed_student_demo_course_record(env_file)],
        }
    elif args.target == "student-course-record-bundle":
        result = {
            "target": "student-course-record-bundle",
            "count": args.count,
            "created": seed_student_demo_course_bundle(env_file),
        }
    elif args.target == "student-position-favorite-only":
        result = {
            "target": "student-position-favorite-only",
            "count": args.count,
            "created": seed_student_position_favorite_only(env_file),
        }
    elif args.target == "student-position-acceptance-unlock":
        result = {
            "target": "student-position-acceptance-unlock",
            "count": args.count,
            "created": seed_student_position_acceptance_unlock(env_file),
        }
    elif args.target == "class-records-unlock":
        result = {
            "target": "class-records-unlock",
            "count": args.count,
            "created": seed_class_records_unlock(env_file, args.count),
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
