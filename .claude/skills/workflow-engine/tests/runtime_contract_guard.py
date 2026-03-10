#!/usr/bin/env python3
"""Guard: validate backend runtime contract structure and internal consistency."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import yaml

REQUIRED_TOP_LEVEL = [
    "mode",
    "stack",
    "classpath_mode",
    "env_file",
    "run_command",
    "port",
    "base_url",
    "health_url",
    "proxy_target",
    "deps",
    "providers",
    "evidence_sinks",
    "evidence_paths",
]
REQUIRED_DEPS = ["mysql", "redis"]
ALLOWED_CLASSPATH_MODES = {
    "workspace-reactor",
    "workspace-module",
    "installed-artifacts",
    "container-image",
}
ALLOWED_SELECTION_PROBES = {"env_equals", "docker_container_running", "http_ok"}


def load_yaml(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def load_env_vars(path: Path) -> dict[str, str]:
    env_vars: dict[str, str] = {}
    if not path.exists():
        raise FileNotFoundError(path)
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env_vars[key.strip()] = value.strip().strip("'").strip('"')
    return env_vars


def _is_non_empty_string(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _port_from_url(value: str) -> int | None:
    parsed = urlparse(value)
    return parsed.port


def _matches_deploy_env_name(run_command: str, env_file: str) -> bool:
    env_name = Path(env_file).name
    if env_name.startswith(".env."):
        env_name = env_name[len(".env.") :]
    if not env_name:
        return False
    tokens = run_command.replace("=", " ").split()
    return "deploy-server-docker.sh" in run_command and env_name in tokens


def resolve_runtime_env_vars(runtime_contract: dict, repo_root: Path) -> tuple[dict[str, str], list[str]]:
    findings: list[str] = []
    env_file_value = runtime_contract.get("env_file")
    if not _is_non_empty_string(env_file_value):
        return {}, ["runtime contract missing env_file"]
    env_path = repo_root / str(env_file_value)
    if not env_path.exists():
        return {}, [f"runtime env file not found: {env_file_value}"]
    env_vars = load_env_vars(env_path)
    tool_env = runtime_contract.get("tool_env") or {}
    if isinstance(tool_env, dict):
        for key, value in tool_env.items():
            if _is_non_empty_string(key) and _is_non_empty_string(value):
                env_vars[str(key)] = str(value)
    return env_vars, findings


def _validate_env_ref_map(
    *,
    prefix: str,
    mapping: object,
    env_vars: dict[str, str],
    findings: list[str],
) -> None:
    if not isinstance(mapping, dict) or not mapping:
        findings.append(f"{prefix} must be a non-empty mapping")
        return

    for key, env_name in mapping.items():
        if not _is_non_empty_string(key):
            findings.append(f"{prefix} contains an empty key")
            continue
        if not _is_non_empty_string(env_name):
            findings.append(f"{prefix}.{key} must reference a non-empty env var name")
            continue
        if not env_vars.get(str(env_name)):
            findings.append(f"{prefix}.{key} references missing env var: {env_name}")


def _validate_selection(selection: object, findings: list[str]) -> None:
    if selection in (None, ""):
        return
    if not isinstance(selection, dict):
        findings.append("selection must be a mapping")
        return

    if "priority" in selection:
        try:
            int(selection["priority"])
        except (TypeError, ValueError):
            findings.append("selection.priority must be an integer")
    if "default" in selection and not isinstance(selection.get("default"), bool):
        findings.append("selection.default must be a boolean")

    probes = selection.get("probes") or []
    if probes and not isinstance(probes, list):
        findings.append("selection.probes must be a list")
        return
    for index, probe in enumerate(probes):
        prefix = f"selection.probes[{index}]"
        if not isinstance(probe, dict):
            findings.append(f"{prefix} must be a mapping")
            continue
        probe_type = probe.get("type")
        if not _is_non_empty_string(probe_type):
            findings.append(f"{prefix}.type must be a non-empty string")
            continue
        if probe_type not in ALLOWED_SELECTION_PROBES:
            findings.append(f"{prefix}.type unsupported: {probe_type}")
            continue
        if probe_type == "env_equals":
            if not _is_non_empty_string(probe.get("name")):
                findings.append(f"{prefix}.name required for env_equals")
            if not _is_non_empty_string(probe.get("value")):
                findings.append(f"{prefix}.value required for env_equals")
        elif probe_type == "docker_container_running":
            if not _is_non_empty_string(probe.get("container")):
                findings.append(f"{prefix}.container required for docker_container_running")
        elif probe_type == "http_ok":
            if "url" in probe and not _is_non_empty_string(probe.get("url")):
                findings.append(f"{prefix}.url must be a non-empty string when provided")
            if "timeout_ms" in probe:
                try:
                    if int(probe["timeout_ms"]) <= 0:
                        raise ValueError
                except (TypeError, ValueError):
                    findings.append(f"{prefix}.timeout_ms must be a positive integer")


def _load_project_config(repo_root: Path, config_arg: str | None) -> dict[str, Any]:
    config_path = Path(config_arg).resolve() if config_arg else repo_root / ".claude/project/config.yaml"
    if not config_path.exists():
        return {}
    return load_yaml(config_path)


def _validate_runtime_model_alignment(
    *,
    contract_path: Path,
    runtime_contract: dict[str, Any],
    project_config: dict[str, Any],
    findings: list[str],
) -> None:
    runtime_model = project_config.get("runtime_model")
    if not isinstance(runtime_model, dict):
        return

    contract_name = contract_path.name
    runtime_key = "test" if ".test." in contract_name else "dev" if ".dev." in contract_name else None
    if runtime_key is None:
        return

    model = runtime_model.get(runtime_key)
    if not isinstance(model, dict):
        return

    selection_policy = model.get("selection")
    if not isinstance(selection_policy, dict):
        return

    probes = ((runtime_contract.get("selection") or {}).get("probes") or [])
    if not isinstance(probes, list):
        probes = []

    forbid_probe_types = selection_policy.get("forbid_probe_types") or []
    if isinstance(forbid_probe_types, list):
        forbidden = {str(item) for item in forbid_probe_types if _is_non_empty_string(str(item))}
        for index, probe in enumerate(probes):
            if isinstance(probe, dict) and probe.get("type") in forbidden:
                findings.append(
                    f"selection.probes[{index}].type '{probe.get('type')}' forbidden by project config runtime_model.{runtime_key}.selection.forbid_probe_types"
                )

    explicit_env = selection_policy.get("explicit_activation_env")
    explicit_value = selection_policy.get("explicit_activation_value")
    if _is_non_empty_string(explicit_env) and _is_non_empty_string(explicit_value):
        matched = False
        for probe in probes:
            if not isinstance(probe, dict):
                continue
            if probe.get("type") != "env_equals":
                continue
            if str(probe.get("name") or "").strip() == str(explicit_env).strip() and str(probe.get("value") or "").strip() == str(explicit_value).strip():
                matched = True
                break
        if not matched:
            findings.append(
                f"selection.probes must include env_equals {explicit_env}={explicit_value} to satisfy runtime_model.{runtime_key}.selection"
            )


def _validate_tool_env(tool_env: object, findings: list[str]) -> None:
    if tool_env in (None, ""):
        return
    if not isinstance(tool_env, dict):
        findings.append("tool_env must be a mapping")
        return
    if not tool_env:
        findings.append("tool_env must not be empty when declared")
        return
    for key, value in tool_env.items():
        if not _is_non_empty_string(key):
            findings.append("tool_env contains an empty key")
            continue
        if not _is_non_empty_string(value):
            findings.append(f"tool_env.{key} must be a non-empty string")


def evaluate_contract(contract_path: Path, repo_root: Path, config_arg: str | None = None) -> list[str]:
    findings: list[str] = []
    data = load_yaml(contract_path)
    project_config = _load_project_config(repo_root, config_arg)

    for key in REQUIRED_TOP_LEVEL:
        if key not in data or data.get(key) in (None, ""):
            findings.append(f"missing required key: {key}")

    _validate_selection(data.get("selection"), findings)
    _validate_tool_env(data.get("tool_env"), findings)
    _validate_runtime_model_alignment(
        contract_path=contract_path,
        runtime_contract=data,
        project_config=project_config,
        findings=findings,
    )

    deps = data.get("deps") or {}
    if not isinstance(deps, dict):
        findings.append("deps must be a mapping")
        deps = {}
    for key in REQUIRED_DEPS:
        if deps.get(key) not in {"remote", "local", "docker"}:
            findings.append(f"deps.{key} must be one of remote|local|docker")

    if findings:
        return findings

    env_file = repo_root / str(data["env_file"])
    if not env_file.exists():
        findings.append(f"env_file not found: {data['env_file']}")
        env_vars: dict[str, str] = {}
    else:
        env_vars, env_findings = resolve_runtime_env_vars(data, repo_root)
        findings.extend(env_findings)

    classpath_mode = str(data["classpath_mode"])
    if classpath_mode not in ALLOWED_CLASSPATH_MODES:
        findings.append(
            "classpath_mode must be one of " + "|".join(sorted(ALLOWED_CLASSPATH_MODES))
        )

    mode = str(data.get("mode") or "")
    if mode.startswith("local-backend") and classpath_mode != "workspace-reactor":
        findings.append("local-backend runtime contract must use classpath_mode=workspace-reactor")
    if mode.startswith("docker-backend") and classpath_mode != "container-image":
        findings.append("docker-backend runtime contract must use classpath_mode=container-image")

    port = data["port"]
    if not isinstance(port, int) or port <= 0:
        findings.append(f"port must be a positive integer, got {port!r}")

    base_url = str(data["base_url"])
    proxy_target = str(data["proxy_target"])
    health_url = str(data["health_url"])
    run_command = str(data["run_command"])

    base_port = _port_from_url(base_url)
    proxy_port = _port_from_url(proxy_target)
    health_port = _port_from_url(health_url)
    if base_port != port:
        findings.append(f"base_url port mismatch: expected {port}, got {base_port}")
    if proxy_port != port:
        findings.append(f"proxy_target port mismatch: expected {port}, got {proxy_port}")
    if health_port != port:
        findings.append(f"health_url port mismatch: expected {port}, got {health_port}")
    if proxy_target != base_url:
        findings.append("proxy_target must equal base_url")
    if not health_url.startswith(base_url):
        findings.append("health_url must start with base_url")
    if not health_url.endswith("/actuator/health"):
        findings.append("health_url must end with /actuator/health")
    if classpath_mode.startswith("workspace"):
        if str(data["env_file"]) not in run_command:
            findings.append("workspace runtime run_command must reference env_file")
        if "bin/run-backend-dev.sh" not in run_command:
            findings.append("workspace runtime contracts must use bin/run-backend-dev.sh")
    elif classpath_mode == "container-image":
        if str(data["env_file"]) not in run_command and not _matches_deploy_env_name(run_command, str(data["env_file"])):
            findings.append("container-image runtime run_command must reference env_file or matching deploy environment name")
        if "deploy-server-docker.sh" not in run_command and "docker compose" not in run_command and "docker-compose" not in run_command:
            findings.append("container-image runtime contracts must use deploy-server-docker.sh or docker compose")

    providers = data.get("providers") or {}
    if not isinstance(providers, dict) or not providers:
        findings.append("providers must be a non-empty mapping")
        providers = {}
    for provider_id, provider in providers.items():
        prefix = f"providers.{provider_id}"
        if not isinstance(provider, dict):
            findings.append(f"{prefix} must be a mapping")
            continue
        if not _is_non_empty_string(provider.get("provider_class")):
            findings.append(f"{prefix}.provider_class must be a non-empty string")
        if provider.get("truth_mode") != "real":
            findings.append(f"{prefix}.truth_mode must equal 'real'")
        _validate_env_ref_map(
            prefix=f"{prefix}.config_env",
            mapping=provider.get("config_env"),
            env_vars=env_vars,
            findings=findings,
        )

    evidence_sinks = data.get("evidence_sinks") or {}
    if not isinstance(evidence_sinks, dict) or not evidence_sinks:
        findings.append("evidence_sinks must be a non-empty mapping")
        evidence_sinks = {}
    for sink_id, sink in evidence_sinks.items():
        prefix = f"evidence_sinks.{sink_id}"
        if not isinstance(sink, dict):
            findings.append(f"{prefix} must be a mapping")
            continue
        if not _is_non_empty_string(sink.get("sink_type")):
            findings.append(f"{prefix}.sink_type must be a non-empty string")
        provider_ref = sink.get("provider")
        if not _is_non_empty_string(provider_ref):
            findings.append(f"{prefix}.provider must be a non-empty string")
        elif provider_ref not in providers:
            findings.append(f"{prefix}.provider references unknown provider: {provider_ref}")

    evidence_paths = data.get("evidence_paths") or {}
    if not isinstance(evidence_paths, dict) or not evidence_paths:
        findings.append("evidence_paths must be a non-empty mapping")
        evidence_paths = {}
    for sink_id in evidence_sinks:
        if sink_id not in evidence_paths:
            findings.append(f"evidence_paths missing entry for sink: {sink_id}")
    for path_id, path_decl in evidence_paths.items():
        prefix = f"evidence_paths.{path_id}"
        if not isinstance(path_decl, dict) or not path_decl:
            findings.append(f"{prefix} must be a non-empty mapping")
            continue
        env_ref_map = {
            key: value
            for key, value in path_decl.items()
            if isinstance(key, str) and key.endswith("_env")
        }
        if not env_ref_map:
            findings.append(f"{prefix} must contain at least one *_env reference")
            continue
        _validate_env_ref_map(
            prefix=prefix,
            mapping=env_ref_map,
            env_vars=env_vars,
            findings=findings,
        )

    return findings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Runtime contract guard")
    parser.add_argument("--contract", required=True)
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--config", default=None)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    contract_path = Path(args.contract)
    if not contract_path.exists():
        print(f"FAIL: runtime_contract_guard missing contract: {contract_path}")
        return 1

    findings = evaluate_contract(contract_path, Path(args.repo_root), args.config)
    if findings:
        print(f"FAIL: runtime_contract_guard contract={contract_path}")
        for item in findings:
            print(f"  - {item}")
        return 1

    print(f"PASS: runtime_contract_guard contract={contract_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
