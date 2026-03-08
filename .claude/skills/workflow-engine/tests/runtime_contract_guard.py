#!/usr/bin/env python3
"""Guard: validate backend runtime contract structure and internal consistency."""

from __future__ import annotations

import argparse
from pathlib import Path
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
ALLOWED_CLASSPATH_MODES = {"workspace-reactor", "workspace-module", "installed-artifacts"}


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
        if not env_vars.get(env_name):
            findings.append(f"{prefix}.{key} references missing env var: {env_name}")


def evaluate_contract(contract_path: Path, repo_root: Path) -> list[str]:
    findings: list[str] = []
    data = load_yaml(contract_path)

    for key in REQUIRED_TOP_LEVEL:
        if key not in data or data.get(key) in (None, ""):
            findings.append(f"missing required key: {key}")

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
        env_vars = load_env_vars(env_file)

    classpath_mode = str(data["classpath_mode"])
    if classpath_mode not in ALLOWED_CLASSPATH_MODES:
        findings.append(
            "classpath_mode must be one of "
            + "|".join(sorted(ALLOWED_CLASSPATH_MODES))
        )
    if str(data["stack"]) == "springboot-vue" and classpath_mode != "workspace-reactor":
        findings.append("springboot-vue dev contract must use classpath_mode=workspace-reactor")

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
    if str(data["env_file"]) not in run_command:
        findings.append("run_command must reference env_file")
    if "bin/run-backend-dev.sh" not in run_command:
        findings.append("run_command must use bin/run-backend-dev.sh")

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
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    contract_path = Path(args.contract)
    if not contract_path.exists():
        print(f"FAIL: runtime_contract_guard missing contract: {contract_path}")
        return 1

    findings = evaluate_contract(contract_path, Path(args.repo_root))
    if findings:
        print(f"FAIL: runtime_contract_guard contract={contract_path}")
        for item in findings:
            print(f"  - {item}")
        return 1

    print(f"PASS: runtime_contract_guard contract={contract_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
