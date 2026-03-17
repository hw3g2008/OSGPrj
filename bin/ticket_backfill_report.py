from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import pymysql
import yaml


def load_yaml(path: Path) -> dict[str, Any]:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def command_family(command: str) -> str:
    command = (command or "").strip()
    if not command:
        return "missing"
    if "playwright test" in command:
        return "playwright"
    if command.startswith("mvn "):
        return "maven"
    if command.startswith("pnpm "):
        return "pnpm"
    if "rg -n" in command or "test -f " in command or command.startswith("rg "):
        return "static-shell"
    return "other"


def controller_test_command(class_name: str) -> str:
    return f"mvn -pl ruoyi-admin -am -Dtest={class_name} -Dsurefire.failIfNoSpecifiedTests=false test"


def frontend_spec_command(spec_name: str) -> str:
    return f"pnpm --dir osg-frontend/packages/admin test src/__tests__/{spec_name}"


def target_command(target_id: str) -> str:
    if target_id == "maven_compile_admin":
        return "mvn compile -pl ruoyi-admin -am"
    if target_id == "maven_compile_system":
        return "mvn compile -pl ruoyi-system -am"
    if target_id == "admin_build":
        return "pnpm --dir osg-frontend/packages/admin build"
    if target_id == "admin_vitest_all":
        return "pnpm --dir osg-frontend/packages/admin test"
    if target_id == "surface_trigger":
        return "pnpm --dir osg-frontend exec playwright test tests/e2e/surface-trigger.e2e.spec.ts --project chromium"
    if target_id == "admin_api_runtime_smoke":
        return "pnpm --dir osg-frontend exec playwright test tests/e2e/admin-api-runtime-smoke.e2e.spec.ts --project chromium"
    if target_id == "admin_pages_runtime_smoke":
        return "pnpm --dir osg-frontend exec playwright test tests/e2e/admin-pages-runtime-smoke.e2e.spec.ts --project chromium"
    if target_id == "admin_students_backfill":
        return "pnpm --dir osg-frontend exec playwright test tests/e2e/admin-students-backfill.e2e.spec.ts --project chromium --workers 1"
    if target_id == "admin_contracts_backfill":
        return "pnpm --dir osg-frontend exec playwright test tests/e2e/admin-contracts-backfill.e2e.spec.ts --project chromium --workers 1"
    if target_id == "admin_staff_backfill":
        return "pnpm --dir osg-frontend exec playwright test tests/e2e/admin-staff-backfill.e2e.spec.ts --project chromium --workers 1"
    if target_id == "admin_schedule_backfill":
        return "pnpm --dir osg-frontend exec playwright test tests/e2e/admin-schedule-backfill.e2e.spec.ts --project chromium --workers 1"
    if target_id == "admin_positions_backfill":
        return "pnpm --dir osg-frontend exec playwright test tests/e2e/admin-positions-backfill.e2e.spec.ts --project chromium --workers 1"
    if target_id == "admin_finance_backfill":
        return "pnpm --dir osg-frontend exec playwright test tests/e2e/admin-finance-backfill.e2e.spec.ts --project chromium --workers 1"
    if target_id == "admin_reports_backfill":
        return "pnpm --dir osg-frontend exec playwright test tests/e2e/admin-reports-backfill.e2e.spec.ts --project chromium --workers 1"
    if target_id == "admin_career_backfill":
        return "pnpm --dir osg-frontend exec playwright test tests/e2e/admin-career-backfill.e2e.spec.ts --project chromium --workers 1"
    if target_id.startswith("maven_test:"):
        return controller_test_command(target_id.split(":", 1)[1])
    if target_id.startswith("frontend_spec:"):
        return frontend_spec_command(target_id.split(":", 1)[1])
    raise KeyError(f"unsupported target_id: {target_id}")


def assess_ticket(
    *,
    ticket: dict[str, Any],
    command_status: str,
    capability_coverage: bool,
    schema_status: str,
) -> dict[str, str]:
    if command_status == "failed" or schema_status == "failed":
        return {
            "verdict": "failed",
            "reason": "fresh verification command or live schema check failed",
        }

    if ticket.get("type") == "database" and schema_status == "passed":
        return {
            "verdict": "verified_runtime",
            "reason": "database tables exist in live shared schema",
        }

    if capability_coverage and command_status in {"passed", "missing"}:
        return {
            "verdict": "verified_runtime",
            "reason": (
                "fresh command passed and ticket capabilities map to behavior/runtime coverage"
                if command_status == "passed"
                else "ticket has no direct runnable command, but downstream behavior/runtime coverage passed"
            ),
        }

    if command_status == "passed":
        return {
            "verdict": "verified_automated_only",
            "reason": "fresh command passed but no runtime capability mapping exists yet",
        }

    return {
        "verdict": "not_verified",
        "reason": "ticket has no runnable verification command",
    }


def parse_db_config(env_file: Path) -> dict[str, Any]:
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


def parse_sql_tables(sql_path: Path) -> list[str]:
    text = sql_path.read_text(encoding="utf-8")
    return re.findall(r"CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)", text, re.I)


def load_existing_tables(env_file: Path) -> set[str]:
    db = parse_db_config(env_file)
    conn = pymysql.connect(
        host=db["host"],
        port=db["port"],
        user=db["user"],
        password=db["password"],
        database=db["database"],
        connect_timeout=10,
        read_timeout=10,
        write_timeout=10,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                "select table_name from information_schema.tables where table_schema=%s and table_name like 'osg_%%'",
                (db["database"],),
            )
            return {row[0] for row in cur.fetchall()}
    finally:
        conn.close()


def run_command(command: str, cwd: Path, timeout_seconds: int) -> dict[str, Any]:
    try:
        proc = subprocess.run(
            ["bash", "-lc", command],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout.decode("utf-8", errors="replace") if isinstance(exc.stdout, bytes) else (exc.stdout or "")
        stderr = exc.stderr.decode("utf-8", errors="replace") if isinstance(exc.stderr, bytes) else (exc.stderr or "")
        output = "\n".join(
            part
            for part in [
                stdout.strip(),
                stderr.strip(),
            ]
            if part.strip()
        )
        return {
            "exit_code": None,
            "status": "failed",
            "output_tail": f"TIMEOUT after {timeout_seconds}s\n{output[-4000:]}".strip(),
        }

    output = "\n".join(
        part for part in [proc.stdout.strip(), proc.stderr.strip()] if part.strip()
    )
    return {
        "exit_code": proc.returncode,
        "status": "passed" if proc.returncode == 0 else "failed",
        "output_tail": output[-4000:],
    }


def load_capability_evidence_refs(behavior_report_path: Path) -> dict[str, set[str]]:
    behavior_report = json.loads(behavior_report_path.read_text(encoding="utf-8"))
    refs: dict[str, set[str]] = {}
    for capability in behavior_report.get("capabilities", []):
        refs[capability["capability_id"]] = {
            result.get("evidence_ref", "").split("#")[0]
            for result in capability.get("scenario_results", [])
            if result.get("evidence_ref")
        }
    return refs


def derive_targets(
    ticket: dict[str, Any],
    capability_evidence_refs: dict[str, set[str]],
) -> tuple[list[str], list[str]]:
    command = ((ticket.get("verification_evidence") or {}).get("command") or "").strip()
    capabilities = ((ticket.get("contract_refs") or {}).get("capabilities") or [])
    allowed_modify_paths = (((ticket.get("allowed_paths") or {}).get("modify")) or [])

    command_targets: list[str] = []
    runtime_targets: list[str] = []

    if re.search(r"-Dtest=([A-Za-z0-9_]+)", command):
        class_name = re.search(r"-Dtest=([A-Za-z0-9_]+)", command).group(1)
        command_targets.append(f"maven_test:{class_name}")
    if "mvn compile -pl ruoyi-admin -am" in command:
        command_targets.append("maven_compile_admin")
    if "mvn compile -pl ruoyi-system -am" in command:
        command_targets.append("maven_compile_system")
    if "pnpm --dir osg-frontend/packages/admin build" in command:
        command_targets.append("admin_build")
    if "pnpm --dir osg-frontend/packages/admin test" in command and "src/__tests__/" not in command:
        command_targets.append("admin_vitest_all")
    for spec in re.findall(r"src/__tests__/([A-Za-z0-9_.-]+\.spec\.ts)", command):
        command_targets.append(f"frontend_spec:{spec}")
    if "playwright test tests/e2e/surface-trigger.e2e.spec.ts" in command:
        command_targets.append("surface_trigger")
    if "bash bin/e2e-api-gate.sh admin full" in command:
        runtime_targets.append("admin_api_runtime_smoke")

    for capability in capabilities:
        for ref in capability_evidence_refs.get(capability, set()):
            if ref.endswith(".java"):
                runtime_targets.append(f"maven_test:{Path(ref).stem}")
            elif ref.endswith(".spec.ts") and "/src/__tests__/" in ref:
                runtime_targets.append(f"frontend_spec:{Path(ref).name}")

    page_runtime_caps = {
        "students-list",
        "contract-list",
        "position-list",
        "position-drill-down",
        "job-overview-dashboard",
        "job-overview-funnel",
        "file-list",
    }
    api_runtime_caps = {
        "students-list",
        "students-status-change",
        "contract-list",
        "position-list",
        "position-drill-down",
        "job-overview-dashboard",
        "job-overview-funnel",
        "file-list",
        "file-auth",
        "file-folder-crud",
        "expense-list",
        "expense-create",
        "mentor-assign",
        "job-tracking-list",
        "job-tracking-update",
    }
    if any(cap in page_runtime_caps for cap in capabilities):
        runtime_targets.append("admin_pages_runtime_smoke")
    if any(cap in api_runtime_caps for cap in capabilities):
        runtime_targets.append("admin_api_runtime_smoke")

    students_backfill_caps = {
        "students-list",
        "students-filter",
        "students-blacklist",
        "students-status-change",
        "students-export",
        "student-create",
        "student-form-validation",
        "student-detail-tabs",
        "student-detail-view",
        "direction-cascade",
    }
    if any(cap in students_backfill_caps for cap in capabilities):
        runtime_targets.append("admin_students_backfill")

    if any(
        isinstance(path, str)
        and (
            path.startswith("osg-frontend/packages/admin/src/views/users/students/")
            or path == "osg-frontend/packages/shared/src/api/admin/staff.ts"
            or path.endswith("/OsgStudentController.java")
            or path.endswith("/OsgStudentChangeRequestController.java")
            or path.endswith("/OsgStudentChangeRequestServiceImpl.java")
            or path.endswith("/OsgStudentChangeRequestControllerTest.java")
            or path.endswith("/OsgStudentControllerTest.java")
        )
        for path in allowed_modify_paths
    ):
        runtime_targets.append("admin_students_backfill")

    contracts_backfill_caps = {
        "contract-list",
        "contract-detail",
        "contract-renew",
        "contract-attachment",
    }
    if any(cap in contracts_backfill_caps for cap in capabilities):
        runtime_targets.append("admin_contracts_backfill")

    if any(
        isinstance(path, str)
        and (
            path.startswith("osg-frontend/packages/admin/src/views/users/contracts/")
            or path == "osg-frontend/packages/shared/src/api/admin/contract.ts"
            or path.endswith("/controller/OsgContractController.java")
            or path.endswith("/service/impl/OsgContractServiceImpl.java")
            or path.endswith("/OsgContractControllerTest.java")
        )
        for path in allowed_modify_paths
    ):
        runtime_targets.append("admin_contracts_backfill")

    staff_backfill_caps = {
        "staff-list",
        "staff-status-change",
        "staff-blacklist",
        "staff-crud",
    }
    if any(cap in staff_backfill_caps for cap in capabilities):
        runtime_targets.append("admin_staff_backfill")

    if any(
        isinstance(path, str)
        and (
            path.startswith("osg-frontend/packages/admin/src/views/users/staff/")
            or path == "osg-frontend/packages/shared/src/api/admin/staff.ts"
            or path.endswith("/controller/OsgStaffController.java")
            or path.endswith("/service/impl/OsgStaffServiceImpl.java")
            or path.endswith("/OsgStaffControllerTest.java")
        )
        for path in allowed_modify_paths
    ):
        runtime_targets.append("admin_staff_backfill")

    schedule_backfill_caps = {
        "schedule-view",
        "schedule-edit",
        "schedule-remind",
        "schedule-export",
    }
    if any(cap in schedule_backfill_caps for cap in capabilities):
        runtime_targets.append("admin_schedule_backfill")

    if any(
        isinstance(path, str)
        and (
            path.startswith("osg-frontend/packages/admin/src/views/users/mentor-schedule/")
            or path == "osg-frontend/packages/shared/src/api/admin/schedule.ts"
            or path.endswith("/controller/OsgStaffScheduleController.java")
            or path.endswith("/service/impl/OsgStaffScheduleServiceImpl.java")
            or path.endswith("/OsgStaffScheduleControllerTest.java")
        )
        for path in allowed_modify_paths
    ):
        runtime_targets.append("admin_schedule_backfill")

    positions_backfill_caps = {
        "position-list",
        "position-drill-down",
        "position-crud",
        "position-batch-upload",
        "position-export",
    }
    if any(cap in positions_backfill_caps for cap in capabilities):
        runtime_targets.append("admin_positions_backfill")

    if any(
        isinstance(path, str)
        and (
            path.startswith("osg-frontend/packages/admin/src/views/career/positions/")
            or path == "osg-frontend/packages/shared/src/api/admin/position.ts"
            or path.endswith("/controller/OsgPositionController.java")
            or path.endswith("/service/impl/OsgPositionServiceImpl.java")
            or path.endswith("/OsgPositionControllerTest.java")
        )
        for path in allowed_modify_paths
    ):
        runtime_targets.append("admin_positions_backfill")

    finance_backfill_caps = {
        "finance-list",
        "finance-mark-paid",
        "finance-batch-pay",
    }
    if any(cap in finance_backfill_caps for cap in capabilities):
        runtime_targets.append("admin_finance_backfill")

    if any(
        isinstance(path, str)
        and (
            path.startswith("osg-frontend/packages/admin/src/views/finance/settlement/")
            or path == "osg-frontend/packages/shared/src/api/admin/finance.ts"
            or path.endswith("/controller/OsgFinanceController.java")
            or path.endswith("/service/impl/OsgFinanceServiceImpl.java")
            or path.endswith("/OsgFinanceControllerTest.java")
        )
        for path in allowed_modify_paths
    ):
        runtime_targets.append("admin_finance_backfill")

    reports_backfill_caps = {
        "report-list",
        "report-review",
        "report-batch-review",
    }
    if any(cap in reports_backfill_caps for cap in capabilities):
        runtime_targets.append("admin_reports_backfill")

    if any(
        isinstance(path, str)
        and (
            path.startswith("osg-frontend/packages/admin/src/views/teaching/reports/")
            or path == "osg-frontend/packages/shared/src/api/admin/report.ts"
            or path.endswith("/controller/OsgReportController.java")
            or path.endswith("/service/impl/OsgClassRecordServiceImpl.java")
            or path.endswith("/OsgReportControllerTest.java")
        )
        for path in allowed_modify_paths
    ):
        runtime_targets.append("admin_reports_backfill")

    career_backfill_caps = {
        "student-position-review",
        "student-position-approve-reject",
        "job-overview-dashboard",
        "job-overview-funnel",
        "mentor-assign",
        "mock-practice-list",
        "mock-practice-assign",
    }
    if any(cap in career_backfill_caps for cap in capabilities):
        runtime_targets.append("admin_career_backfill")

    if any(
        isinstance(path, str)
        and (
            path.startswith("osg-frontend/packages/admin/src/views/career/student-positions/")
            or path.startswith("osg-frontend/packages/admin/src/views/career/job-overview/")
            or path.startswith("osg-frontend/packages/admin/src/views/career/mock-practice/")
            or path == "osg-frontend/packages/shared/src/api/admin/studentPosition.ts"
            or path == "osg-frontend/packages/shared/src/api/admin/jobOverview.ts"
            or path == "osg-frontend/packages/shared/src/api/admin/mockPractice.ts"
            or path.endswith("/OsgStudentPositionController.java")
            or path.endswith("/OsgJobOverviewController.java")
            or path.endswith("/OsgMockPracticeController.java")
            or path.endswith("/OsgStudentPositionServiceImpl.java")
            or path.endswith("/OsgJobOverviewServiceImpl.java")
            or path.endswith("/OsgMockPracticeServiceImpl.java")
            or path.endswith("/OsgStudentPositionControllerTest.java")
            or path.endswith("/OsgJobOverviewControllerTest.java")
            or path.endswith("/OsgMockPracticeControllerTest.java")
        )
        for path in allowed_modify_paths
    ):
        runtime_targets.append("admin_career_backfill")

    return sorted(set(command_targets)), sorted(set(runtime_targets))


def build_report(
    *,
    repo_root: Path,
    state_path: Path,
    tickets_dir: Path,
    behavior_report_path: Path,
    env_file: Path,
    command_timeout_seconds: int,
) -> dict[str, Any]:
    state = load_yaml(state_path)
    completed = sorted(state.get("completed_tickets", []))
    capability_evidence_refs = load_capability_evidence_refs(behavior_report_path)
    existing_tables = load_existing_tables(env_file)
    target_cache: dict[str, dict[str, Any]] = {}
    tickets: list[dict[str, Any]] = []
    target_to_tickets: dict[str, list[str]] = defaultdict(list)

    total = len(completed)
    prepared: list[dict[str, Any]] = []
    for ticket_id in completed:
        ticket_path = tickets_dir / f"{ticket_id}.yaml"
        ticket = load_yaml(ticket_path)
        command_targets, runtime_targets = derive_targets(ticket, capability_evidence_refs)
        for target in sorted(set(command_targets + runtime_targets)):
            target_to_tickets[target].append(ticket_id)
        prepared.append(
            {
                "ticket_id": ticket_id,
                "ticket": ticket,
                "command_targets": command_targets,
                "runtime_targets": runtime_targets,
            }
        )

        schema_status = "not_applicable"
        schema_tables: list[str] = []
        if ticket.get("type") == "database":
            for rel in (((ticket.get("allowed_paths") or {}).get("modify")) or []):
                if isinstance(rel, str) and rel.startswith("sql/"):
                    sql_path = repo_root / rel
                    if sql_path.exists():
                        schema_tables.extend(parse_sql_tables(sql_path))
            schema_tables = sorted(set(schema_tables))
            if schema_tables and all(table in existing_tables for table in schema_tables):
                schema_status = "passed"
            else:
                schema_status = "failed"

        prepared[-1]["schema_status"] = schema_status
        prepared[-1]["schema_tables"] = schema_tables

    unique_targets = sorted(target_to_tickets)
    for index, target_id in enumerate(unique_targets, start=1):
        command = target_command(target_id)
        print(f"[backfill] ({index}/{len(unique_targets)}) target={target_id} tickets={','.join(target_to_tickets[target_id][:5])}")
        target_cache[target_id] = run_command(command, repo_root, command_timeout_seconds)

    for item in prepared:
        ticket = item["ticket"]
        command = ((ticket.get("verification_evidence") or {}).get("command") or "").strip()
        capabilities = ((ticket.get("contract_refs") or {}).get("capabilities") or [])
        command_targets = item["command_targets"]
        runtime_targets = item["runtime_targets"]
        command_status = (
            "passed"
            if command_targets and all(target_cache[t]["status"] == "passed" for t in command_targets)
            else "failed"
            if command_targets
            else "missing"
        )
        capability_coverage = bool(runtime_targets) and any(
            target_cache[t]["status"] == "passed" for t in runtime_targets
        )
        assessment = assess_ticket(
            ticket=ticket,
            command_status=command_status,
            capability_coverage=capability_coverage,
            schema_status=item["schema_status"],
        )

        tickets.append(
            {
                "ticket_id": item["ticket_id"],
                "story_id": ticket.get("story_id"),
                "title": ticket.get("title"),
                "type": ticket.get("type"),
                "capabilities": capabilities,
                "command_family": command_family(command),
                "command": command,
                "command_status": command_status,
                "command_targets": command_targets,
                "runtime_targets": runtime_targets,
                "schema_status": item["schema_status"],
                "schema_tables": item["schema_tables"],
                "capability_coverage": capability_coverage,
                "verdict": assessment["verdict"],
                "reason": assessment["reason"],
            }
        )

    verdicts = Counter(item["verdict"] for item in tickets)
    families = Counter(item["command_family"] for item in tickets)
    return {
        "module": "admin",
        "current_step": state.get("workflow", {}).get("current_step"),
        "completed_ticket_count": len(completed),
        "summary": {
            "verdicts": dict(verdicts),
            "command_families": dict(families),
            "unique_commands": len(unique_targets),
            "runtime_capability_covered_tickets": sum(1 for item in tickets if item["capability_coverage"]),
        },
        "target_results": target_cache,
        "tickets": tickets,
    }


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Ticket Backfill Report",
        "",
        f"- module: `{report['module']}`",
        f"- current_step: `{report['current_step']}`",
        f"- completed_ticket_count: `{report['completed_ticket_count']}`",
        "",
        "## Summary",
        "",
    ]
    for key, value in report["summary"]["verdicts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(
        [
            f"- `unique_commands`: `{report['summary']['unique_commands']}`",
            f"- `runtime_capability_covered_tickets`: `{report['summary']['runtime_capability_covered_tickets']}`",
            "",
            "## Weak Tickets",
            "",
        ]
    )
    weak = [item for item in report["tickets"] if item["verdict"] != "verified_runtime"]
    if not weak:
        lines.append("- none")
    else:
        for item in weak:
            lines.append(
                f"- `{item['ticket_id']}` `{item['type']}` `{item['verdict']}`: {item['reason']}"
            )
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", default="osg-spec-docs/tasks/STATE.yaml")
    parser.add_argument("--tickets-dir", default="osg-spec-docs/tasks/tickets")
    parser.add_argument(
        "--behavior-report",
        default="osg-spec-docs/tasks/audit/behavior-contract-admin-2026-03-15.json",
    )
    parser.add_argument("--env-file", default="deploy/.env.dev")
    parser.add_argument("--command-timeout-seconds", type=int, default=180)
    parser.add_argument("--output-json", default="")
    parser.add_argument("--output-md", default="")
    args = parser.parse_args()

    repo_root = Path(os.getcwd())
    report = build_report(
        repo_root=repo_root,
        state_path=repo_root / args.state,
        tickets_dir=repo_root / args.tickets_dir,
        behavior_report_path=repo_root / args.behavior_report,
        env_file=repo_root / args.env_file,
        command_timeout_seconds=args.command_timeout_seconds,
    )

    if args.output_json:
        Path(args.output_json).write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    if args.output_md:
        Path(args.output_md).write_text(render_markdown(report), encoding="utf-8")

    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
