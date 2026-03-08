#!/usr/bin/env python3
"""Self-test for delivery_truth_guard.py."""

from __future__ import annotations

import tempfile
from pathlib import Path

import yaml

from delivery_truth_guard import evaluate_delivery_truth


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
                "source_refs": [{"prd": "00-admin-login.md#5.1"}],
                "effect_scope": "external",
                "effect_kind": "email_reset_code",
                "truth_mode": "real",
                "provider_class": "smtp",
                "evidence_mode": "mailbox",
                "verification_stage": "verify",
                "required_artifacts": ["provider_config", "send_evidence"],
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
SERVER_PORT=28080
SPRING_MAIL_HOST=smtp.example.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=mailer@example.com
SPRING_MAIL_PASSWORD=secret123
SPRING_MAIL_FROM=noreply@example.com
PASSWORD_RESET_MAILBOX=qa@example.com
PASSWORD_RESET_PROVIDER_LOG_PATH={log_path}
"""


def _prepare_runtime(root: Path) -> tuple[Path, Path]:
    contract_path = root / "osg-spec-docs/docs/01-product/prd/permission/DELIVERY-CONTRACT.yaml"
    runtime_path = root / "deploy/runtime-contract.dev.yaml"
    log_path = root / "tmp/password-reset-mail.log"
    _write_yaml(contract_path, valid_contract())
    _write_yaml(runtime_path, valid_runtime_contract())
    _write(root / "deploy/.env.dev", valid_env_content(str(log_path)))
    _write(root / "ruoyi-framework/src/main/java/com/example/RealMailSender.java", "class RealMailSender {}")
    return contract_path, runtime_path


def test_config_with_reset_code_fixed_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        contract_path, runtime_path = _prepare_runtime(root)
        _write(root / "ruoyi-framework/src/main/java/com/example/PasswordResetConfig.java", "private String resetCodeFixed;")
        findings = evaluate_delivery_truth(
            contract_path=contract_path,
            runtime_contract_path=runtime_path,
            repo_root=root,
            stage="next",
        )
        assert any("forbidden downgrade pattern" in item for item in findings), findings


def test_noop_or_fake_sender_pattern_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        contract_path, runtime_path = _prepare_runtime(root)
        _write(root / "ruoyi-framework/src/main/java/com/example/FakeMailSender.java", "class FakeMailSender {}")
        findings = evaluate_delivery_truth(
            contract_path=contract_path,
            runtime_contract_path=runtime_path,
            repo_root=root,
            stage="next",
        )
        assert any("forbidden downgrade pattern" in item for item in findings), findings


def test_declared_provider_evidence_missing_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        contract_path, runtime_path = _prepare_runtime(root)
        findings = evaluate_delivery_truth(
            contract_path=contract_path,
            runtime_contract_path=runtime_path,
            repo_root=root,
            stage="verify",
        )
        assert any("missing send evidence path" in item for item in findings), findings


def test_valid_real_implementation_passes() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        contract_path, runtime_path = _prepare_runtime(root)
        runtime = valid_runtime_contract()
        log_path = root / "tmp/password-reset-mail.log"
        _write(log_path, "mail sent\n")
        _write_yaml(runtime_path, runtime)
        _write(root / "deploy/.env.dev", valid_env_content(str(log_path)))
        findings = evaluate_delivery_truth(
            contract_path=contract_path,
            runtime_contract_path=runtime_path,
            repo_root=root,
            stage="verify",
        )
        assert not findings, findings


def main() -> int:
    tests = [
        test_config_with_reset_code_fixed_fails,
        test_noop_or_fake_sender_pattern_fails,
        test_declared_provider_evidence_missing_fails,
        test_valid_real_implementation_passes,
    ]
    for fn in tests:
        fn()
    print(f"PASS: delivery_truth_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
