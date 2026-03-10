#!/usr/bin/env python3
"""Self-test for runtime_contract_guard.py."""

from __future__ import annotations

import tempfile
from pathlib import Path

import yaml

from runtime_contract_guard import evaluate_contract


def _write_yaml(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _write_project_config(path: Path) -> None:
    _write_yaml(
        path,
        {
            "runtime_model": {
                "dev": {},
                "test": {
                    "selection": {
                        "explicit_activation_env": "RUNTIME_STACK_TEST_MODE",
                        "explicit_activation_value": "1",
                        "forbid_probe_types": ["docker_container_running"],
                    }
                },
            }
        },
    )


def valid_contract() -> dict:
    return {
        "mode": "local-backend-remote-deps",
        "stack": "springboot-vue",
        "classpath_mode": "workspace-reactor",
        "selection": {
            "priority": 100,
            "default": True,
        },
        "env_file": "deploy/.env.dev",
        "run_command": "bash bin/run-backend-dev.sh deploy/.env.dev",
        "port": 28080,
        "base_url": "http://127.0.0.1:28080",
        "health_url": "http://127.0.0.1:28080/actuator/health",
        "proxy_target": "http://127.0.0.1:28080",
        "tool_env": {
            "SPRING_DATA_REDIS_HOST": "127.0.0.1",
            "SPRING_DATA_REDIS_PORT": "26379",
            "E2E_REDIS_CONTAINER": "osg_test-redis-1",
        },
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
                "provider_log_container_env": "E2E_PROVIDER_LOG_CONTAINER",
            }
        },
    }


def valid_env_content() -> str:
    return """\
SERVER_PORT=28080
SPRING_MAIL_HOST=smtp.example.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=mailer@example.com
SPRING_MAIL_PASSWORD=secret123
SPRING_MAIL_FROM=noreply@example.com
PASSWORD_RESET_MAILBOX=qa@example.com
PASSWORD_RESET_PROVIDER_LOG_PATH=/tmp/password-reset-mail.log
E2E_PROVIDER_LOG_CONTAINER=osg_test-backend-1
"""


def test_missing_required_key_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_project_config(root / ".claude/project/config.yaml")
        contract = valid_contract()
        del contract["run_command"]
        _write_yaml(root / "deploy/runtime-contract.dev.yaml", contract)
        _write(root / "deploy/.env.dev", valid_env_content())
        findings = evaluate_contract(root / "deploy/runtime-contract.dev.yaml", root)
        assert any("missing required key: run_command" in item for item in findings), findings


def test_missing_env_file_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_project_config(root / ".claude/project/config.yaml")
        _write_yaml(root / "deploy/runtime-contract.dev.yaml", valid_contract())
        findings = evaluate_contract(root / "deploy/runtime-contract.dev.yaml", root)
        assert any("env_file not found" in item for item in findings), findings


def test_port_mismatch_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_project_config(root / ".claude/project/config.yaml")
        contract = valid_contract()
        contract["base_url"] = "http://127.0.0.1:8080"
        _write_yaml(root / "deploy/runtime-contract.dev.yaml", contract)
        _write(root / "deploy/.env.dev", valid_env_content())
        findings = evaluate_contract(root / "deploy/runtime-contract.dev.yaml", root)
        assert any("base_url port mismatch" in item for item in findings), findings


def test_invalid_deps_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_project_config(root / ".claude/project/config.yaml")
        contract = valid_contract()
        contract["deps"] = {"mysql": "wrong", "redis": "remote"}
        _write_yaml(root / "deploy/runtime-contract.dev.yaml", contract)
        _write(root / "deploy/.env.dev", valid_env_content())
        findings = evaluate_contract(root / "deploy/runtime-contract.dev.yaml", root)
        assert any("deps.mysql" in item for item in findings), findings


def test_invalid_classpath_mode_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_project_config(root / ".claude/project/config.yaml")
        contract = valid_contract()
        contract["classpath_mode"] = "installed-artifacts"
        _write_yaml(root / "deploy/runtime-contract.dev.yaml", contract)
        _write(root / "deploy/.env.dev", valid_env_content())
        findings = evaluate_contract(root / "deploy/runtime-contract.dev.yaml", root)
        assert any("classpath_mode=workspace-reactor" in item for item in findings), findings


def test_invalid_selection_probe_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_project_config(root / ".claude/project/config.yaml")
        contract = valid_contract()
        contract["selection"] = {
            "priority": 100,
            "probes": [{"type": "docker_container_running"}],
        }
        _write_yaml(root / "deploy/runtime-contract.dev.yaml", contract)
        _write(root / "deploy/.env.dev", valid_env_content())
        findings = evaluate_contract(root / "deploy/runtime-contract.dev.yaml", root)
        assert any("selection.probes[0].container" in item for item in findings), findings


def test_invalid_tool_env_shape_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_project_config(root / ".claude/project/config.yaml")
        contract = valid_contract()
        contract["tool_env"] = {"": "value", "SPRING_DATA_REDIS_PORT": ""}
        _write_yaml(root / "deploy/runtime-contract.dev.yaml", contract)
        _write(root / "deploy/.env.dev", valid_env_content())
        findings = evaluate_contract(root / "deploy/runtime-contract.dev.yaml", root)
        assert any("tool_env" in item for item in findings), findings


def test_missing_truth_source_keys_fail() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_project_config(root / ".claude/project/config.yaml")
        contract = valid_contract()
        del contract["providers"]
        del contract["evidence_sinks"]
        del contract["evidence_paths"]
        _write_yaml(root / "deploy/runtime-contract.dev.yaml", contract)
        _write(root / "deploy/.env.dev", valid_env_content())
        findings = evaluate_contract(root / "deploy/runtime-contract.dev.yaml", root)
        assert any("missing required key: providers" in item for item in findings), findings
        assert any("missing required key: evidence_sinks" in item for item in findings), findings
        assert any("missing required key: evidence_paths" in item for item in findings), findings


def test_invalid_provider_shape_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_project_config(root / ".claude/project/config.yaml")
        contract = valid_contract()
        contract["providers"]["smtp"]["config_env"] = {"host": "", "port": "SPRING_MAIL_PORT"}
        _write_yaml(root / "deploy/runtime-contract.dev.yaml", contract)
        _write(root / "deploy/.env.dev", valid_env_content())
        findings = evaluate_contract(root / "deploy/runtime-contract.dev.yaml", root)
        assert any("providers.smtp.config_env.host" in item for item in findings), findings


def test_missing_evidence_env_reference_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_project_config(root / ".claude/project/config.yaml")
        contract = valid_contract()
        _write_yaml(root / "deploy/runtime-contract.dev.yaml", contract)
        _write(
            root / "deploy/.env.dev",
            "\n".join(
                line
                for line in valid_env_content().splitlines()
                if not line.startswith("PASSWORD_RESET_PROVIDER_LOG_PATH=")
            )
            + "\n",
        )
        findings = evaluate_contract(root / "deploy/runtime-contract.dev.yaml", root)
        assert any("evidence_paths.mailbox.provider_log_path_env references missing env var" in item for item in findings), findings


def test_valid_contract_passes() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_project_config(root / ".claude/project/config.yaml")
        _write_yaml(root / "deploy/runtime-contract.dev.yaml", valid_contract())
        _write(root / "deploy/.env.dev", valid_env_content())
        findings = evaluate_contract(root / "deploy/runtime-contract.dev.yaml", root)
        assert not findings, findings


def test_container_image_contract_can_reference_matching_deploy_env_name() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_project_config(root / ".claude/project/config.yaml")
        contract = valid_contract()
        contract["mode"] = "docker-backend-shared-deps"
        contract["classpath_mode"] = "container-image"
        contract["env_file"] = "deploy/.env.test"
        contract["run_command"] = "bash bin/deploy-server-docker.sh test"
        contract["selection"] = {
            "priority": 200,
            "probes": [
                {
                    "type": "env_equals",
                    "name": "RUNTIME_STACK_TEST_MODE",
                    "value": "1",
                }
            ],
        }
        _write_yaml(root / "deploy/runtime-contract.test.yaml", contract)
        _write(root / "deploy/.env.test", valid_env_content())
        findings = evaluate_contract(root / "deploy/runtime-contract.test.yaml", root)
        assert not findings, findings


def test_container_image_contract_without_explicit_test_activation_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_project_config(root / ".claude/project/config.yaml")
        contract = valid_contract()
        contract["mode"] = "docker-backend-shared-deps"
        contract["classpath_mode"] = "container-image"
        contract["env_file"] = "deploy/.env.test"
        contract["run_command"] = "bash bin/deploy-server-docker.sh test"
        contract["selection"] = {
            "priority": 200,
            "probes": [{"type": "docker_container_running", "container": "osg_test-backend-1"}],
        }
        _write_yaml(root / "deploy/runtime-contract.test.yaml", contract)
        _write(root / "deploy/.env.test", valid_env_content())
        findings = evaluate_contract(root / "deploy/runtime-contract.test.yaml", root)
        assert any("forbidden by project config" in item for item in findings), findings
        assert any("must include env_equals RUNTIME_STACK_TEST_MODE=1" in item for item in findings), findings


def main() -> int:
    tests = [
        test_missing_required_key_fails,
        test_missing_env_file_fails,
        test_port_mismatch_fails,
        test_invalid_deps_fails,
        test_invalid_classpath_mode_fails,
        test_invalid_selection_probe_fails,
        test_invalid_tool_env_shape_fails,
        test_missing_truth_source_keys_fail,
        test_invalid_provider_shape_fails,
        test_missing_evidence_env_reference_fails,
        test_valid_contract_passes,
        test_container_image_contract_can_reference_matching_deploy_env_name,
        test_container_image_contract_without_explicit_test_activation_fails,
    ]
    for fn in tests:
        fn()
    print(f"PASS: runtime_contract_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
