#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import quote


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILE = ROOT / "deploy" / ".env.dev"
DEFAULT_BASE_URL = "http://127.0.0.1:28080"
DEFAULT_USERNAME = "lead_mentor_demo"
DEFAULT_PASSWORD = "Osg@2026"
DEFAULT_EMAIL = "lead_mentor_demo@osg.local"
DEFAULT_FORBIDDEN_USERNAME = "leadmentor_forbidden_e2e"
DEFAULT_FORBIDDEN_PASSWORD = "student123"
RATE_LIMIT_KEY = "pwd_reset_code:127.0.0.1-com.ruoyi.web.controller.system.SysPasswordController-sendCode"


class AuditError(RuntimeError):
    pass


@dataclass
class RedisConfig:
    host: str
    port: str
    password: str


class LeadMentorApiAudit:
    def __init__(
        self,
        *,
        base_url: str,
        env_file: Path,
        username: str,
        password: str,
        email: str,
        forbidden_username: str,
        forbidden_password: str,
        log_file: Path,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.env_file = env_file
        self.username = username
        self.password = password
        self.email = email
        self.forbidden_username = forbidden_username
        self.forbidden_password = forbidden_password
        self.log_file = log_file
        self.redis = self._parse_redis_config(env_file)
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        self.log_file.write_text("", encoding="utf-8")

    def run(self) -> None:
        timestamp_suffix = datetime.now().strftime("%Y%m%d%H%M%S")
        temp_password = f"Student123!Temp{timestamp_suffix[-4:]}"

        self.ensure_runtime_account()

        job_seed = self.seed("job-overview")["created"][0]
        practice_seed = self.seed("mock-practice")["created"][0]
        ack_ready_seed = self.seed("mock-practice-ack-ready")["created"][0]
        student_hours_seed = self.seed("student-hours")["created"][0]

        token = self.login(self.username, self.password, "lead-mentor/login 正向登录")
        info_body = self.call_json("GET", "/lead-mentor/getInfo", token=token)
        self.assert_code(info_body, 200, "lead-mentor/getInfo")
        self.assert_contains(info_body, "lead-mentor", "lead-mentor/getInfo 角色口径")
        info_json = json.loads(info_body)
        runtime_user = info_json.get("user") or {}
        runtime_user_id = int(runtime_user.get("userId") or 0)
        runtime_user_name = str(runtime_user.get("userName") or self.username)
        if runtime_user_id <= 0:
            raise AuditError(f"lead-mentor/getInfo 未返回有效 userId: {info_body}")

        forbidden_body = self.call_json(
            "POST",
            "/lead-mentor/login",
            data={"username": self.forbidden_username, "password": self.forbidden_password},
        )
        self.assert_code(forbidden_body, 403, "lead-mentor/login 非法角色拦截")
        self.assert_contains(forbidden_body, "班主任端访问权限", "lead-mentor/login 非法角色提示")

        self.reset_password(temp_password, "system/password/reset 临时密码")
        self.login(self.username, temp_password, "lead-mentor/login 临时密码回登")
        self.reset_password(self.password, "system/password/reset 恢复原密码")
        token = self.login(self.username, self.password, "lead-mentor/login 恢复后复登")

        position_id = int(job_seed["position_id"])
        application_id = int(job_seed["pending_application_id"])
        position_keyword = str(job_seed["company_name"])
        managed_student_name = str(job_seed["pending_student_name"])
        hours_student_id = int(student_hours_seed["student_id"])
        hours_student_name = str(student_hours_seed["student_name"])
        practice_id = int(practice_seed["practice_id"])
        practice_keyword = str(practice_seed["student_name"])
        ack_practice_id = int(ack_ready_seed["practice_id"])

        positions_meta = self.call_json("GET", "/lead-mentor/positions/meta", token=token)
        self.assert_code(positions_meta, 200, "lead-mentor/positions/meta")

        positions_list = self.call_json(
            "GET",
            f"/lead-mentor/positions/list?keyword={quote(position_keyword)}",
            token=token,
        )
        self.assert_code(positions_list, 200, "lead-mentor/positions/list")
        self.assert_contains(positions_list, str(position_id), "lead-mentor/positions/list 命中新岗位")

        position_students = self.call_json("GET", f"/lead-mentor/positions/{position_id}/students", token=token)
        self.assert_code(position_students, 200, "lead-mentor/positions/{positionId}/students")
        self.assert_contains(
            position_students,
            managed_student_name,
            "lead-mentor/positions/{positionId}/students 命中我的学员",
        )

        students_meta = self.call_json("GET", "/lead-mentor/students/meta", token=token)
        self.assert_code(students_meta, 200, "lead-mentor/students/meta")

        students_list = self.call_json(
            "GET",
            f"/lead-mentor/students/list?keyword={quote(hours_student_name)}&relation=managed",
            token=token,
        )
        self.assert_code(students_list, 200, "lead-mentor/students/list")
        self.assert_contains(students_list, str(hours_student_id), "lead-mentor/students/list 命中课时学员")

        class_create = self.call_json(
            "POST",
            "/lead-mentor/class-records",
            token=token,
            data={
                "studentId": hours_student_id,
                "classDate": "2026-03-24T10:00:00+08:00",
                "durationHours": 1.5,
                "courseType": "mock_interview",
                "classStatus": "completed",
                "feedbackContent": "curl audit class record",
                "topics": "case interview",
                "comments": "seeded via curl audit",
            },
        )
        self.assert_code(class_create, 200, "lead-mentor/class-records POST")
        self.assert_contains(class_create, str(hours_student_id), "lead-mentor/class-records 返回真实 studentId")

        job_pending = self.call_json(
            "GET",
            f"/lead-mentor/job-overview/list?scope=pending&keyword={quote(position_keyword)}",
            token=token,
        )
        self.assert_code(job_pending, 200, "lead-mentor/job-overview/list pending")
        self.assert_contains(job_pending, str(application_id), "lead-mentor/job-overview/list pending 命中申请")

        job_assign = self.call_json(
            "POST",
            f"/lead-mentor/job-overview/{application_id}/assign-mentor",
            token=token,
            data={"mentorIds": [runtime_user_id], "mentorNames": [runtime_user_name], "assignNote": "curl audit assign"},
        )
        self.assert_code(job_assign, 200, "lead-mentor/job-overview/{applicationId}/assign-mentor")

        job_managed = self.call_json(
            "GET",
            f"/lead-mentor/job-overview/list?scope=managed&keyword={quote(position_keyword)}",
            token=token,
        )
        self.assert_code(job_managed, 200, "lead-mentor/job-overview/list managed")
        self.assert_contains(job_managed, str(application_id), "lead-mentor/job-overview/list managed 命中已匹配申请")

        job_coaching = self.call_json(
            "GET",
            f"/lead-mentor/job-overview/list?scope=coaching&keyword={quote(position_keyword)}",
            token=token,
        )
        self.assert_code(job_coaching, 200, "lead-mentor/job-overview/list coaching")

        job_detail = self.call_json("GET", f"/lead-mentor/job-overview/{application_id}", token=token)
        self.assert_code(job_detail, 200, "lead-mentor/job-overview/{applicationId}")

        job_ack = self.call_json(
            "POST",
            f"/lead-mentor/job-overview/{application_id}/ack-stage-update",
            token=token,
            data={},
        )
        self.assert_code(job_ack, 200, "lead-mentor/job-overview/{applicationId}/ack-stage-update")

        practice_stats = self.call_json(
            "GET",
            f"/lead-mentor/mock-practice/stats?keyword={quote(practice_keyword)}",
            token=token,
        )
        self.assert_code(practice_stats, 200, "lead-mentor/mock-practice/stats")

        practice_pending = self.call_json(
            "GET",
            f"/lead-mentor/mock-practice/list?scope=pending&keyword={quote(practice_keyword)}",
            token=token,
        )
        self.assert_code(practice_pending, 200, "lead-mentor/mock-practice/list pending")
        self.assert_contains(practice_pending, str(practice_id), "lead-mentor/mock-practice/list pending 命中练习")

        practice_detail_before_assign = self.call_json("GET", f"/lead-mentor/mock-practice/{practice_id}", token=token)
        self.assert_code(practice_detail_before_assign, 200, "lead-mentor/mock-practice/{practiceId} before-assign")
        practice_detail_json = json.loads(practice_detail_before_assign)
        mentor_options = practice_detail_json["data"].get("mentorOptions") or []
        if not mentor_options:
            raise AuditError(f"lead-mentor/mock-practice/{practice_id} 未返回 mentorOptions: {practice_detail_before_assign}")
        available_mentor_id = int(mentor_options[0]["mentorId"])

        scheduled_at = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT%H:%M")
        practice_assign = self.call_json(
            "POST",
            f"/lead-mentor/mock-practice/{practice_id}/assign",
            token=token,
            data={"mentorIds": [available_mentor_id], "scheduledAt": scheduled_at, "note": "curl audit schedule"},
        )
        self.assert_code(practice_assign, 200, "lead-mentor/mock-practice/{practiceId}/assign")

        practice_managed = self.call_json(
            "GET",
            f"/lead-mentor/mock-practice/list?scope=managed&keyword={quote(practice_keyword)}",
            token=token,
        )
        self.assert_code(practice_managed, 200, "lead-mentor/mock-practice/list managed")
        self.assert_contains(practice_managed, str(practice_id), "lead-mentor/mock-practice/list managed 命中已安排练习")

        practice_coaching = self.call_json("GET", "/lead-mentor/mock-practice/list?scope=coaching", token=token)
        self.assert_code(practice_coaching, 200, "lead-mentor/mock-practice/list coaching")

        practice_detail = self.call_json("GET", f"/lead-mentor/mock-practice/{practice_id}", token=token)
        self.assert_code(practice_detail, 200, "lead-mentor/mock-practice/{practiceId}")

        ack_detail_before = self.call_json("GET", f"/lead-mentor/mock-practice/{ack_practice_id}", token=token)
        self.assert_code(ack_detail_before, 200, "lead-mentor/mock-practice/{practiceId} ack-before")
        self.assert_contains(ack_detail_before, "scheduled", "lead-mentor/mock-practice ack-before 状态")

        practice_ack = self.call_json(
            "POST",
            f"/lead-mentor/mock-practice/{ack_practice_id}/ack-assignment",
            token=token,
            data={},
        )
        self.assert_code(practice_ack, 200, "lead-mentor/mock-practice/{practiceId}/ack-assignment")

        ack_detail_after = self.call_json("GET", f"/lead-mentor/mock-practice/{ack_practice_id}", token=token)
        self.assert_code(ack_detail_after, 200, "lead-mentor/mock-practice/{practiceId} ack-after")
        self.assert_contains(ack_detail_after, "confirmed", "lead-mentor/mock-practice ack-after 状态")

        profile_body = self.call_json("GET", "/lead-mentor/profile", token=token)
        self.assert_code(profile_body, 200, "lead-mentor/profile")
        profile_json = json.loads(profile_body)
        profile = profile_json["data"]["profile"]
        profile_change = self.call_json(
            "POST",
            "/lead-mentor/profile/change-request",
            token=token,
            data={
                "staffId": profile["staffId"],
                "englishName": profile["englishName"],
                "genderLabel": profile["genderLabel"],
                "phone": "13800138000",
                "wechatId": f"curl-audit-{timestamp_suffix[-6:]}",
                "email": profile["email"],
                "regionArea": "上海",
                "regionCity": "上海",
                "remark": "curl audit profile change",
            },
        )
        self.assert_code(profile_change, 200, "lead-mentor/profile/change-request")
        self.assert_contains(profile_change, "changeRequestId", "lead-mentor/profile/change-request 返回申请单")

        schedule_current = self.call_json("GET", "/lead-mentor/schedule?weekScope=current", token=token)
        self.assert_code(schedule_current, 200, "lead-mentor/schedule current")

        schedule_status = self.call_json("GET", "/lead-mentor/schedule/status", token=token)
        self.assert_code(schedule_status, 200, "lead-mentor/schedule/status")

        schedule_save = self.call_json(
            "PUT",
            "/lead-mentor/schedule/next",
            token=token,
            data={"availableHours": 18, "selectedSlotKeys": ["1-morning", "3-evening"], "note": "curl audit schedule"},
        )
        self.assert_code(schedule_save, 200, "lead-mentor/schedule/next PUT")
        self.assert_contains(schedule_save, "1-morning", "lead-mentor/schedule/next 返回选中时段")

        schedule_next = self.call_json("GET", "/lead-mentor/schedule?weekScope=next", token=token)
        self.assert_code(schedule_next, 200, "lead-mentor/schedule next")
        self.assert_contains(schedule_next, "3-evening", "lead-mentor/schedule next 持久化命中")

        self.log(f"API_AUDIT_DONE log={self.log_file}")

    def ensure_runtime_account(self) -> None:
        command = [
            sys.executable,
            str(ROOT / "bin" / "ensure_lead_mentor_account.py"),
            "--env-file",
            str(self.env_file),
            "--username",
            self.username,
            "--password",
            self.password,
            "--email",
            self.email,
            "--nick-name",
            "Lead Mentor Demo" if self.username == DEFAULT_USERNAME else self.username,
        ]
        completed = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
        if completed.returncode != 0:
            raise AuditError(
                "failed to ensure lead-mentor runtime account: "
                + (completed.stderr.strip() or completed.stdout.strip() or "unknown error")
            )

    def seed(self, target: str) -> dict[str, Any]:
        output = self.run_cmd(
            ["python3", "bin/runtime_seed_admin.py", target, "--env-file", str(self.env_file), "--count", "1"],
            label=f"seed {target}",
        )
        return json.loads(output)

    def login(self, username: str, password: str, label: str) -> str:
        body = self.call_json(
            "POST",
            "/lead-mentor/login",
            data={"username": username, "password": password},
        )
        self.assert_code(body, 200, label)
        token = json.loads(body).get("token")
        if not token:
            raise AuditError(f"{label} 未返回 token: {body}")
        return str(token)

    def reset_password(self, new_password: str, final_label: str) -> None:
        self.clear_rate_limit()
        send_body = self.call_json("POST", "/system/password/sendCode", data={"email": self.email})
        self.assert_code(send_body, 200, "system/password/sendCode" if "临时" in final_label else "system/password/sendCode 恢复原密码")

        code = self.read_reset_code()
        if not code:
            raise AuditError("密码重置验证码未写入 redis")

        verify_label = "system/password/verify" if "临时" in final_label else "system/password/verify 恢复原密码"
        verify_body = self.call_json("POST", "/system/password/verify", data={"email": self.email, "code": code})
        self.assert_code(verify_body, 200, verify_label)
        reset_token = json.loads(verify_body)["data"]["resetToken"]
        reset_body = self.call_json(
            "POST",
            "/system/password/reset",
            data={"email": self.email, "password": new_password, "resetToken": reset_token},
        )
        self.assert_code(reset_body, 200, final_label)

    def clear_rate_limit(self) -> None:
        self.run_cmd(
            [
                "redis-cli",
                "--raw",
                "-h",
                self.redis.host,
                "-p",
                self.redis.port,
                "-a",
                self.redis.password,
                "DEL",
                RATE_LIMIT_KEY,
            ],
            label="clear password rate limit",
        )

    def read_reset_code(self) -> str:
        raw = self.run_cmd(
            [
                "redis-cli",
                "--raw",
                "-h",
                self.redis.host,
                "-p",
                self.redis.port,
                "-a",
                self.redis.password,
                "GET",
                f"pwd_reset_code:{self.email}",
            ],
            label="read reset code",
        )
        return raw.strip().strip('"')

    def call_json(self, method: str, path: str, *, token: str | None = None, data: Any | None = None) -> str:
        cmd = ["curl", "-sS", "-X", method.upper(), f"{self.base_url}{path}"]
        if token:
            cmd.extend(["-H", f"Authorization: Bearer {token}"])
        if data is not None:
            cmd.extend(["-H", "Content-Type: application/json", "-d", json.dumps(data, ensure_ascii=False)])
        body = self.run_cmd(cmd, label=f"{method.upper()} {path}")
        try:
            json.loads(body)
        except json.JSONDecodeError as exc:
            raise AuditError(f"{method.upper()} {path} 返回非 JSON: {body}") from exc
        return body

    def assert_code(self, body: str, expected: int, label: str) -> None:
        actual = json.loads(body).get("code")
        if actual != expected:
            raise AuditError(f"{label} 失败: expected code={expected} actual={actual} body={body}")
        self.log(f"PASS {label} -> code={actual}")

    def assert_contains(self, body: str, needle: str, label: str) -> None:
        if needle not in body:
            raise AuditError(f"{label} 失败: missing [{needle}] in {body}")
        self.log(f"PASS {label} -> contains [{needle}]")

    def run_cmd(self, cmd: list[str], *, label: str) -> str:
        env = os.environ.copy()
        env.setdefault("NO_COLOR", "1")
        proc = subprocess.run(cmd, cwd=ROOT, env=env, capture_output=True, text=True)
        if proc.returncode != 0:
            stderr = proc.stderr.strip()
            raise AuditError(f"{label} 命令失败: {' '.join(cmd)}\n{stderr or proc.stdout.strip()}")
        if proc.stderr.strip():
            # redis-cli 会输出 password warning；保留原命令成功结果但不作为失败处理
            warning = proc.stderr.strip()
            if "Warning: Using a password" not in warning:
                self.log(f"INFO {label} stderr -> {warning}")
        return proc.stdout.strip()

    def log(self, message: str) -> None:
        print(message)
        with self.log_file.open("a", encoding="utf-8") as handle:
            handle.write(f"{message}\n")

    @staticmethod
    def _parse_redis_config(env_file: Path) -> RedisConfig:
        text = env_file.read_text(encoding="utf-8")

        def extract(key: str) -> str:
            match = re.search(rf"^{re.escape(key)}=(.*)$", text, re.M)
            if not match:
                raise AuditError(f"缺少 {key} in {env_file}")
            return match.group(1).strip().strip("\"'")

        return RedisConfig(
            host=extract("SPRING_DATA_REDIS_HOST"),
            port=extract("SPRING_DATA_REDIS_PORT"),
            password=extract("SPRING_DATA_REDIS_PASSWORD"),
        )


def main() -> int:
    today = datetime.now().strftime("%Y%m%d")
    parser = argparse.ArgumentParser(description="Run lead-mentor API audit via curl with fresh seeded data.")
    parser.add_argument("--env-file", default=str(DEFAULT_ENV_FILE))
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--username", default=DEFAULT_USERNAME)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    parser.add_argument("--email", default=DEFAULT_EMAIL)
    parser.add_argument("--forbidden-username", default=DEFAULT_FORBIDDEN_USERNAME)
    parser.add_argument("--forbidden-password", default=DEFAULT_FORBIDDEN_PASSWORD)
    parser.add_argument("--log-file", default=f"/tmp/lead_mentor_api_audit_{today}.log")
    args = parser.parse_args()

    audit = LeadMentorApiAudit(
        base_url=args.base_url,
        env_file=Path(args.env_file),
        username=args.username,
        password=args.password,
        email=args.email,
        forbidden_username=args.forbidden_username,
        forbidden_password=args.forbidden_password,
        log_file=Path(args.log_file),
    )
    try:
        audit.run()
        return 0
    except AuditError as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
