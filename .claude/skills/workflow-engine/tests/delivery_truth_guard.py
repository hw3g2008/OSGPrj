#!/usr/bin/env python3
"""Guard: validate real side-effect delivery contracts and runtime evidence declarations."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

from runtime_contract_guard import load_yaml, resolve_runtime_env_vars

VERIFY_LIKE_STAGES = {"verify", "final-gate", "final-closure"}
DEFAULT_SCAN_ROOTS = ["ruoyi-admin", "ruoyi-framework", "osg-frontend", "deploy"]
SCANNABLE_SUFFIXES = {
    ".java",
    ".kt",
    ".groovy",
    ".xml",
    ".properties",
    ".yml",
    ".yaml",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".vue",
    ".sh",
}
SKIP_DIR_NAMES = {
    ".git",
    "node_modules",
    "target",
    "dist",
    "coverage",
    "playwright-report",
    "osg-spec-docs",
    "docs",
}
TEST_ONLY_MARKERS = (
    "/src/test/",
    "/test/",
    "/tests/",
    "/__tests__/",
)
# Business context whitelist - legitimate business terms that contain forbidden keywords
BUSINESS_CONTEXT_WHITELIST = (
    re.compile(r"(?i)mock[_-]?practice"),  # 模拟面试练习
    re.compile(r"(?i)mock[_-]?interview"),  # 模拟面试
    re.compile(r"(?i)mock[_-]?exam"),      # 模拟考试
)
FORBIDDEN_PATTERNS = (
    ("reset-code-fixed", re.compile(r"(?i)reset[_a-z0-9]*code[_a-z0-9]*fixed")),
    (
        "downgraded-delivery-implementation",
        re.compile(
            r"(?i)(?:"
            r"(noop|fake|mock|fixed)[A-Za-z0-9_]*(sender|provider|delivery|mailer|callback|gateway|client|service|code)"
            r"|"
            r"(sender|provider|delivery|mailer|callback|gateway|client|service|code)[A-Za-z0-9_]*(noop|fake|mock|fixed)"
            r"|"
            r"\b(noop|fake|mock|fixed)\b.{0,48}\b(sender|provider|delivery|mailer|callback|gateway|client|service|code)\b"
            r"|"
            r"\b(sender|provider|delivery|mailer|callback|gateway|client|service|code)\b.{0,48}\b(noop|fake|mock|fixed)\b"
            r")"
        ),
    ),
)


def _is_non_empty_string(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _is_test_only(path: Path) -> bool:
    path_str = path.as_posix()
    return any(marker in path_str for marker in TEST_ONLY_MARKERS)


def iter_scannable_files(repo_root: Path, scan_roots: list[Path]) -> list[Path]:
    files: list[Path] = []
    for root in scan_roots:
        target_root = root if root.is_absolute() else repo_root / root
        if not target_root.exists():
            continue
        if target_root.is_file():
            files.append(target_root)
            continue
        for path in target_root.rglob("*"):
            if not path.is_file():
                continue
            if any(part in SKIP_DIR_NAMES for part in path.parts):
                continue
            if _is_test_only(path):
                continue
            if path.name.startswith(".env") or path.suffix.lower() in SCANNABLE_SUFFIXES:
                files.append(path)
    return files


def scan_forbidden_patterns(repo_root: Path, scan_roots: list[Path]) -> list[str]:
    findings: list[str] = []
    for path in iter_scannable_files(repo_root, scan_roots):
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        # Check if file contains whitelisted business context
        is_whitelisted = any(pattern.search(content) for pattern in BUSINESS_CONTEXT_WHITELIST)
        if is_whitelisted:
            continue
        for pattern_name, pattern in FORBIDDEN_PATTERNS:
            match = pattern.search(content)
            if not match:
                continue
            line_no = content[: match.start()].count("\n") + 1
            findings.append(
                f"forbidden downgrade pattern ({pattern_name}) in {path.relative_to(repo_root)}:{line_no}"
            )
            break
    return findings


def _evidence_exists(path_value: str, repo_root: Path, container_name: str | None) -> bool:
    candidate = Path(path_value)
    if not candidate.is_absolute():
        candidate = repo_root / candidate
    if candidate.exists():
        return True
    if container_name:
        try:
            subprocess.check_call(
                ["docker", "exec", container_name, "test", "-f", str(candidate)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return True
        except (FileNotFoundError, subprocess.CalledProcessError):
            return False
    return False


def _provider_matches(runtime_contract: dict, provider_class: str) -> list[str]:
    providers = runtime_contract.get("providers") or {}
    matches: list[str] = []
    for provider_id, provider in providers.items():
        if not isinstance(provider, dict):
            continue
        if provider.get("provider_class") == provider_class and provider.get("truth_mode") == "real":
            matches.append(str(provider_id))
    return matches


def _validate_external_capability(
    *,
    capability: dict,
    runtime_contract: dict,
    env_vars: dict[str, str],
    repo_root: Path,
    stage: str,
) -> list[str]:
    findings: list[str] = []
    capability_id = capability.get("capability_id", "<unknown>")
    provider_class = capability.get("provider_class")
    evidence_mode = capability.get("evidence_mode")
    required_artifacts = set(capability.get("required_artifacts") or [])

    if not _is_non_empty_string(provider_class):
        findings.append(f"capability {capability_id} missing provider_class for external effect")
        return findings
    if not _is_non_empty_string(evidence_mode):
        findings.append(f"capability {capability_id} missing evidence_mode for external effect")
        return findings

    provider_matches = _provider_matches(runtime_contract, str(provider_class))
    if not provider_matches:
        findings.append(f"capability {capability_id} missing runtime provider_class={provider_class}")

    evidence_sinks = runtime_contract.get("evidence_sinks") or {}
    evidence_sink = evidence_sinks.get(evidence_mode)
    if not isinstance(evidence_sink, dict):
        findings.append(f"capability {capability_id} missing runtime evidence sink={evidence_mode}")
        return findings

    sink_provider = evidence_sink.get("provider")
    if not _is_non_empty_string(sink_provider):
        findings.append(f"capability {capability_id} evidence sink {evidence_mode} missing provider reference")
    elif provider_matches and sink_provider not in provider_matches:
        findings.append(
            f"capability {capability_id} evidence sink {evidence_mode} provider mismatch: {sink_provider}"
        )

    evidence_paths = runtime_contract.get("evidence_paths") or {}
    path_decl = evidence_paths.get(evidence_mode)
    if not isinstance(path_decl, dict):
        findings.append(f"capability {capability_id} missing runtime evidence_paths entry={evidence_mode}")
        return findings

    env_refs = {
        key: value
        for key, value in path_decl.items()
        if isinstance(key, str) and key.endswith("_env")
    }
    for field, env_name in env_refs.items():
        if not _is_non_empty_string(env_name):
            findings.append(f"capability {capability_id} evidence path field {field} has empty env reference")
            continue
        if not env_vars.get(env_name):
            findings.append(f"capability {capability_id} evidence path env missing: {env_name}")

    if "provider_config" in required_artifacts:
        providers = runtime_contract.get("providers") or {}
        for provider_id in provider_matches:
            provider = providers.get(provider_id) or {}
            config_env = provider.get("config_env") or {}
            for label, env_name in config_env.items():
                if not _is_non_empty_string(env_name) or not env_vars.get(env_name):
                    findings.append(
                        f"capability {capability_id} provider config missing for {provider_id}.{label}: {env_name}"
                    )

    if stage in VERIFY_LIKE_STAGES and "send_evidence" in required_artifacts:
        path_env_refs = {
            field: env_name
            for field, env_name in env_refs.items()
            if field.endswith("_path_env")
        }
        container_name = None
        container_env_name = path_decl.get("provider_log_container_env")
        if _is_non_empty_string(container_env_name):
            container_name = env_vars.get(str(container_env_name), "").strip() or None
        if not path_env_refs:
            findings.append(f"capability {capability_id} missing *_path_env for send_evidence")
        for field, env_name in path_env_refs.items():
            path_value = env_vars.get(env_name, "")
            if not path_value:
                continue
            if not _evidence_exists(path_value, repo_root, container_name):
                candidate = Path(path_value)
                if not candidate.is_absolute():
                    candidate = repo_root / candidate
                findings.append(
                    f"capability {capability_id} missing send evidence path: {candidate}"
                )

    return findings


def evaluate_delivery_truth(
    *,
    contract_path: Path,
    runtime_contract_path: Path,
    repo_root: Path,
    stage: str,
    scan_roots: list[Path] | None = None,
) -> list[str]:
    findings: list[str] = []

    contract = load_yaml(contract_path)
    runtime_contract = load_yaml(runtime_contract_path)
    env_vars, env_findings = resolve_runtime_env_vars(runtime_contract, repo_root)
    findings.extend(env_findings)

    capabilities = contract.get("capabilities") or []
    external_capabilities = [
        capability
        for capability in capabilities
        if isinstance(capability, dict) and capability.get("effect_scope") == "external"
    ]

    for capability in external_capabilities:
        findings.extend(
            _validate_external_capability(
                capability=capability,
                runtime_contract=runtime_contract,
                env_vars=env_vars,
                repo_root=repo_root,
                stage=stage,
            )
        )

    effective_scan_roots = scan_roots or [Path(path) for path in DEFAULT_SCAN_ROOTS]
    findings.extend(scan_forbidden_patterns(repo_root, effective_scan_roots))
    return findings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Delivery truth guard")
    parser.add_argument("--module")
    parser.add_argument("--contract")
    parser.add_argument("--runtime-contract", default="deploy/runtime-contract.dev.yaml")
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--stage", default="verify", choices=["next", "verify", "final-gate", "final-closure"])
    parser.add_argument("--scan-root", action="append", default=[])
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root)
    contract_path = Path(args.contract) if args.contract else repo_root / f"osg-spec-docs/docs/01-product/prd/{args.module}/DELIVERY-CONTRACT.yaml"
    runtime_contract_path = repo_root / str(args.runtime_contract)

    if not contract_path.exists():
        print(f"FAIL: delivery_truth_guard missing contract: {contract_path}")
        return 1
    if not runtime_contract_path.exists():
        print(f"FAIL: delivery_truth_guard missing runtime contract: {runtime_contract_path}")
        return 1

    findings = evaluate_delivery_truth(
        contract_path=contract_path,
        runtime_contract_path=runtime_contract_path,
        repo_root=repo_root,
        stage=args.stage,
        scan_roots=[Path(item) for item in args.scan_root] if args.scan_root else None,
    )
    if findings:
        print(
            "FAIL: delivery_truth_guard "
            f"module={args.module or load_yaml(contract_path).get('module')} stage={args.stage}"
        )
        for item in findings:
            print(f"  - {item}")
        return 1

    contract = load_yaml(contract_path)
    capabilities = contract.get("capabilities") or []
    external_count = sum(
        1 for capability in capabilities if isinstance(capability, dict) and capability.get("effect_scope") == "external"
    )
    print(
        "PASS: delivery_truth_guard "
        f"module={args.module or contract.get('module')} stage={args.stage} external_capabilities={external_count}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
