#!/usr/bin/env python3
"""Guard: validate external output content against content_contract."""

from __future__ import annotations

import argparse
import subprocess
import json
from pathlib import Path
from typing import Iterable

from runtime_contract_guard import load_yaml, resolve_runtime_env_vars

VERIFY_LIKE_STAGES = {"verify", "final-gate", "final-closure"}
CONTENT_FIELDS = ("body", "content", "payload", "message", "text", "subject")


def _is_non_empty_string(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _read_evidence_text(*, host_path: Path, container_name: str | None) -> tuple[str | None, list[str]]:
    findings: list[str] = []
    if host_path.exists():
        return host_path.read_text(encoding="utf-8", errors="ignore"), findings
    if container_name:
        try:
            output = subprocess.check_output(
                ["docker", "exec", container_name, "cat", str(host_path)],
                text=True,
                stderr=subprocess.DEVNULL,
            )
            return output, findings
        except (FileNotFoundError, subprocess.CalledProcessError):
            findings.append(
                f"missing content evidence path: {host_path} (host missing; docker exec {container_name} cat failed)"
            )
            return None, findings
    findings.append(f"missing content evidence path: {host_path}")
    return None, findings


def _resolve_evidence_paths(
    *,
    capability: dict,
    runtime_contract: dict,
    env_vars: dict[str, str],
    repo_root: Path,
) -> tuple[list[tuple[Path, str | None]], list[str]]:
    findings: list[str] = []
    evidence_mode = capability.get("evidence_mode")
    capability_id = capability.get("capability_id", "<unknown>")
    if not _is_non_empty_string(evidence_mode):
        return [], [f"capability {capability_id} missing evidence_mode"]

    evidence_paths = runtime_contract.get("evidence_paths") or {}
    path_decl = evidence_paths.get(str(evidence_mode))
    if not isinstance(path_decl, dict):
        return [], [f"capability {capability_id} missing runtime evidence_paths entry={evidence_mode}"]

    resolved: list[tuple[Path, str | None]] = []
    container_env_name = path_decl.get("provider_log_container_env")
    container_name = None
    if _is_non_empty_string(container_env_name):
        container_name = env_vars.get(str(container_env_name), "").strip() or None
    for field, env_name in path_decl.items():
        if not (isinstance(field, str) and field.endswith("_path_env")):
            continue
        if not _is_non_empty_string(env_name):
            findings.append(f"capability {capability_id} evidence path field {field} has empty env reference")
            continue
        raw_path = env_vars.get(str(env_name), "").strip()
        if not raw_path:
            findings.append(f"capability {capability_id} evidence path env missing: {env_name}")
            continue
        candidate = Path(raw_path)
        if not candidate.is_absolute():
            candidate = (repo_root / candidate).resolve()
        resolved.append((candidate, container_name))

    if not resolved:
        findings.append(f"capability {capability_id} has no *_path_env evidence declarations")
    return resolved, findings


def _iter_jsonl_objects(text: str) -> Iterable[object]:
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        try:
            yield json.loads(line)
        except json.JSONDecodeError:
            yield line


def _flatten_string_values(value: object) -> list[str]:
    values: list[str] = []
    if isinstance(value, str):
        values.append(value)
    elif isinstance(value, dict):
        for item in value.values():
            values.extend(_flatten_string_values(item))
    elif isinstance(value, list):
        for item in value:
            values.extend(_flatten_string_values(item))
    return values


def _extract_content_text(record: object) -> str:
    if isinstance(record, str):
        return record
    if not isinstance(record, dict):
        return ""

    chunks: list[str] = []
    for field in CONTENT_FIELDS:
        if field in record:
            chunks.extend(_flatten_string_values(record[field]))
    if not chunks:
        chunks.extend(_flatten_string_values(record))
    return "\n".join(chunk for chunk in chunks if chunk)


def _select_records(capability_id: str, records: list[object]) -> list[object]:
    matched: list[object] = []
    fallback: list[object] = []
    for record in records:
        if isinstance(record, dict):
            record_capability = record.get("capabilityId") or record.get("capability_id")
            if record_capability == capability_id:
                matched.append(record)
            elif record_capability is None:
                fallback.append(record)
        else:
            fallback.append(record)
    if matched:
        return [matched[-1]]
    if fallback:
        return [fallback[-1]]
    return []


def _evaluate_content_contract(capability: dict, content: str) -> list[str]:
    findings: list[str] = []
    capability_id = capability.get("capability_id", "<unknown>")
    content_contract = capability.get("content_contract") or {}
    forbidden_literals = content_contract.get("forbidden_literals") or []
    required_tokens = content_contract.get("required_tokens") or []

    for literal in forbidden_literals:
        if _is_non_empty_string(literal) and str(literal) in content:
            findings.append(
                f"capability {capability_id} forbidden literal present in provider evidence: {literal}"
            )
    for token in required_tokens:
        if _is_non_empty_string(token) and str(token) not in content:
            findings.append(
                f"capability {capability_id} missing required token in provider evidence: {token}"
            )
    return findings


def evaluate_delivery_content(
    *,
    contract_path: Path,
    runtime_contract_path: Path,
    repo_root: Path,
    stage: str,
) -> list[str]:
    findings: list[str] = []
    if stage not in VERIFY_LIKE_STAGES:
        return findings

    contract = load_yaml(contract_path)
    runtime_contract = load_yaml(runtime_contract_path)
    env_vars, env_findings = resolve_runtime_env_vars(runtime_contract, repo_root)
    findings.extend(env_findings)

    for capability in contract.get("capabilities") or []:
        if not isinstance(capability, dict):
            continue
        if capability.get("effect_scope") != "external":
            continue
        if not isinstance(capability.get("content_contract"), dict):
            continue

        capability_id = str(capability.get("capability_id", "<unknown>"))
        evidence_paths, path_findings = _resolve_evidence_paths(
            capability=capability,
            runtime_contract=runtime_contract,
            env_vars=env_vars,
            repo_root=repo_root,
        )
        findings.extend(path_findings)
        if not evidence_paths:
            continue

        selected_contents: list[str] = []
        for path, container_name in evidence_paths:
            text, evidence_findings = _read_evidence_text(host_path=path, container_name=container_name)
            findings.extend(f"capability {capability_id} {item}" for item in evidence_findings)
            if text is None:
                continue
            records = list(_iter_jsonl_objects(text))
            selected_records = _select_records(capability_id, records)
            if not selected_records:
                continue
            for record in selected_records:
                content = _extract_content_text(record)
                if content.strip():
                    selected_contents.append(content)

        if not selected_contents:
            findings.append(f"capability {capability_id} missing readable content evidence")
            continue

        aggregate_content = "\n".join(selected_contents)
        findings.extend(_evaluate_content_contract(capability, aggregate_content))

    return findings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Delivery content guard")
    parser.add_argument("--contract", required=True)
    parser.add_argument("--runtime-contract", required=True)
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--stage", default="verify")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    findings = evaluate_delivery_content(
        contract_path=Path(args.contract),
        runtime_contract_path=Path(args.runtime_contract),
        repo_root=Path(args.repo_root),
        stage=args.stage,
    )
    if findings:
        print(
            "FAIL: delivery_content_guard "
            f"contract={args.contract} runtime_contract={args.runtime_contract} stage={args.stage}"
        )
        for item in findings:
            print(f"  - {item}")
        return 1
    print(
        "PASS: delivery_content_guard "
        f"contract={args.contract} runtime_contract={args.runtime_contract} stage={args.stage}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
