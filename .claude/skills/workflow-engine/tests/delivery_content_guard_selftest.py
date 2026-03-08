#!/usr/bin/env python3
"""Self-test for delivery_content_guard.py."""

from __future__ import annotations

import tempfile
from pathlib import Path

import yaml

from delivery_content_guard import evaluate_delivery_content


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _write_yaml(path: Path, data: object) -> None:
    _write(path, yaml.safe_dump(data, allow_unicode=True, sort_keys=False))


def valid_contract() -> dict:
    return {
        "schema_version": 1,
        "module": "permission",
        "capabilities": [
            {
                "capability_id": "forgot-password-send-code",
                "effect_scope": "external",
                "effect_kind": "email_reset_code",
                "truth_mode": "real",
                "provider_class": "smtp",
                "evidence_mode": "mailbox",
                "content_contract": {
                    "forbidden_literals": ["null", "undefined", "[object Object]"],
                    "required_tokens": ["验证码", "5 分钟"],
                },
            }
        ],
    }


def valid_runtime_contract() -> dict:
    return {
        "mode": "local-backend-remote-deps",
        "stack": "springboot-vue",
        "classpath_mode": "workspace-reactor",
        "env_file": "deploy/.env.dev",
        "run_command": "bash bin/run-backend-dev.sh deploy/.env.dev",
        "port": 28080,
        "base_url": "http://127.0.0.1:28080",
        "health_url": "http://127.0.0.1:28080/actuator/health",
        "proxy_target": "http://127.0.0.1:28080",
        "deps": {"mysql": "remote", "redis": "remote"},
        "providers": {
            "smtp": {
                "provider_class": "smtp",
                "truth_mode": "real",
                "config_env": {
                    "host": "SPRING_MAIL_HOST",
                    "port": "SPRING_MAIL_PORT",
                    "username": "SPRING_MAIL_USERNAME",
                    "password": "SPRING_MAIL_PASSWORD",
                    "from": "SPRING_MAIL_FROM",
                },
            }
        },
        "evidence_sinks": {
            "mailbox": {
                "sink_type": "mailbox",
                "provider": "smtp",
            }
        },
        "evidence_paths": {
            "mailbox": {
                "mailbox_target_env": "PASSWORD_RESET_MAILBOX",
                "provider_log_path_env": "PASSWORD_RESET_PROVIDER_LOG_PATH",
            }
        },
    }


def valid_env_content(log_path: str) -> str:
    return f"""\
SPRING_MAIL_HOST=smtp.example.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=mailer@example.com
SPRING_MAIL_PASSWORD=secret123
SPRING_MAIL_FROM=noreply@example.com
PASSWORD_RESET_MAILBOX=qa@example.com
PASSWORD_RESET_PROVIDER_LOG_PATH={log_path}
"""


def _prepare_runtime(root: Path, evidence_payload: str) -> tuple[Path, Path]:
    contract_path = root / "osg-spec-docs/docs/01-product/prd/permission/DELIVERY-CONTRACT.yaml"
    runtime_path = root / "deploy/runtime-contract.dev.yaml"
    log_path = root / "tmp/password-reset-mail.log"
    _write_yaml(contract_path, valid_contract())
    _write_yaml(runtime_path, valid_runtime_contract())
    _write(root / "deploy/.env.dev", valid_env_content(str(log_path)))
    _write(log_path, evidence_payload)
    return contract_path, runtime_path


def test_forbidden_literals_in_provider_evidence_fail() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        contract_path, runtime_path = _prepare_runtime(
            root,
            '{"capabilityId":"forgot-password-send-code","body":"您好，null。验证码 123456，5 分钟内有效。","subject":"OSG Admin 密码重置验证码"}\n',
        )
        findings = evaluate_delivery_content(
            contract_path=contract_path,
            runtime_contract_path=runtime_path,
            repo_root=root,
            stage="verify",
        )
        assert any("forbidden literal" in item for item in findings), findings


def test_missing_required_tokens_fail() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        contract_path, runtime_path = _prepare_runtime(
            root,
            '{"capabilityId":"forgot-password-send-code","body":"您好，管理员。稍后完成操作。","subject":"OSG Admin 密码重置验证码"}\n',
        )
        findings = evaluate_delivery_content(
            contract_path=contract_path,
            runtime_contract_path=runtime_path,
            repo_root=root,
            stage="verify",
        )
        assert any("missing required token" in item for item in findings), findings


def test_valid_content_passes() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        contract_path, runtime_path = _prepare_runtime(
            root,
            '{"capabilityId":"forgot-password-send-code","body":"您好，管理员。您的 OSG Admin 密码重置验证码为：123456\\n验证码 5 分钟内有效。","subject":"OSG Admin 密码重置验证码"}\n',
        )
        findings = evaluate_delivery_content(
            contract_path=contract_path,
            runtime_contract_path=runtime_path,
            repo_root=root,
            stage="verify",
        )
        assert not findings, findings


def main() -> int:
    tests = [
        test_forbidden_literals_in_provider_evidence_fail,
        test_missing_required_tokens_fail,
        test_valid_content_passes,
    ]
    for fn in tests:
        fn()
    print(f"PASS: delivery_content_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
