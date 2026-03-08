#!/usr/bin/env python3
"""Guard: validate DELIVERY-CONTRACT.yaml structure."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml

ALLOWED_EFFECT_SCOPES = {"none", "internal", "external"}


def load_yaml(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def _is_non_empty_string(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _validate_string_list(value: object, field_name: str, findings: list[str]) -> list[str]:
    if (
        not isinstance(value, list)
        or not value
        or any(not _is_non_empty_string(item) for item in value)
    ):
        findings.append(f"{field_name} must be a non-empty string list")
        return []
    return [str(item).strip() for item in value]


def _validate_behavior_contract(
    contract: object,
    prefix: str,
    findings: list[str],
) -> list[str]:
    if not isinstance(contract, dict):
        findings.append(f"{prefix}.behavior_contract must be a mapping")
        return []

    scenarios = contract.get("scenarios")
    if not isinstance(scenarios, list) or not scenarios:
        findings.append(f"{prefix}.behavior_contract.scenarios must be a non-empty list")
        return []

    scenario_ids: list[str] = []
    for idx, scenario in enumerate(scenarios):
        scenario_prefix = f"{prefix}.behavior_contract.scenarios[{idx}]"
        if not isinstance(scenario, dict):
            findings.append(f"{scenario_prefix} must be a mapping")
            continue
        for key in ("scenario_id", "input_class", "expected_result"):
            if not _is_non_empty_string(scenario.get(key)):
                findings.append(f"{scenario_prefix}.{key} must be a non-empty string")
        scenario_id = scenario.get("scenario_id")
        if _is_non_empty_string(scenario_id):
            if scenario_id in scenario_ids:
                findings.append(f"{scenario_prefix}.scenario_id must be unique: {scenario_id}")
            else:
                scenario_ids.append(str(scenario_id).strip())

    invariants = contract.get("invariants")
    if invariants is None:
        return scenario_ids
    if not isinstance(invariants, list):
        findings.append(f"{prefix}.behavior_contract.invariants must be a list when present")
    elif invariants:
        known_ids = set(scenario_ids)
        for idx, invariant in enumerate(invariants):
            invariant_prefix = f"{prefix}.behavior_contract.invariants[{idx}]"
            if not isinstance(invariant, dict) or not invariant:
                findings.append(f"{invariant_prefix} must be a non-empty mapping")
                continue
            for key, value in invariant.items():
                if not _is_non_empty_string(key):
                    findings.append(f"{invariant_prefix} keys must be non-empty strings")
                if isinstance(value, list):
                    for ref in value:
                        if _is_non_empty_string(ref) and ref not in known_ids:
                            findings.append(f"{invariant_prefix}.{key} references unknown scenario_id: {ref}")

    return scenario_ids


def _validate_content_contract(
    contract: object,
    prefix: str,
    findings: list[str],
) -> None:
    if not isinstance(contract, dict):
        findings.append(f"{prefix}.content_contract must be a mapping")
        return

    _validate_string_list(
        contract.get("forbidden_literals"),
        f"{prefix}.content_contract.forbidden_literals",
        findings,
    )
    _validate_string_list(
        contract.get("required_tokens"),
        f"{prefix}.content_contract.required_tokens",
        findings,
    )


def _validate_evidence_contract(
    contract: object,
    prefix: str,
    findings: list[str],
    known_scenarios: list[str],
) -> None:
    if not isinstance(contract, dict):
        findings.append(f"{prefix}.evidence_contract must be a mapping")
        return

    must_exist_for = _validate_string_list(
        contract.get("must_exist_for"),
        f"{prefix}.evidence_contract.must_exist_for",
        findings,
    )
    must_not_exist_for: list[str] = []
    if "must_not_exist_for" in contract and contract.get("must_not_exist_for") not in (None, []):
        must_not_exist_for = _validate_string_list(
            contract.get("must_not_exist_for"),
            f"{prefix}.evidence_contract.must_not_exist_for",
            findings,
        )
    known_ids = set(known_scenarios)
    for scenario_id in must_exist_for + must_not_exist_for:
        if scenario_id not in known_ids:
            findings.append(f"{prefix}.evidence_contract references unknown scenario_id: {scenario_id}")


def validate_contract(data: object) -> list[str]:
    findings: list[str] = []
    if not isinstance(data, dict):
        return ["root must be a mapping"]

    if data.get("schema_version") != 1:
        findings.append("schema_version must equal 1")

    if not _is_non_empty_string(data.get("module")):
        findings.append("module must be a non-empty string")

    capabilities = data.get("capabilities")
    if not isinstance(capabilities, list) or not capabilities:
        findings.append("capabilities must be a non-empty list")
        return findings

    seen_ids: set[str] = set()
    for idx, capability in enumerate(capabilities):
        prefix = f"capabilities[{idx}]"
        if not isinstance(capability, dict):
            findings.append(f"{prefix} must be a mapping")
            continue

        capability_id = capability.get("capability_id")
        if not _is_non_empty_string(capability_id):
            findings.append(f"{prefix}.capability_id must be a non-empty string")
        elif capability_id in seen_ids:
            findings.append(f"{prefix}.capability_id must be unique: {capability_id}")
        else:
            seen_ids.add(capability_id)

        source_refs = capability.get("source_refs")
        if not isinstance(source_refs, list) or not source_refs:
            findings.append(f"{prefix}.source_refs must be a non-empty list")
        else:
            for ref_idx, ref in enumerate(source_refs):
                if not isinstance(ref, dict) or not any(_is_non_empty_string(v) for v in ref.values()):
                    findings.append(f"{prefix}.source_refs[{ref_idx}] must contain at least one non-empty source ref")

        effect_scope = capability.get("effect_scope")
        if effect_scope not in ALLOWED_EFFECT_SCOPES:
            findings.append(f"{prefix}.effect_scope must be one of {sorted(ALLOWED_EFFECT_SCOPES)}")

        if not _is_non_empty_string(capability.get("effect_kind")):
            findings.append(f"{prefix}.effect_kind must be a non-empty string")

        if capability.get("truth_mode") != "real":
            findings.append(f"{prefix}.truth_mode must equal 'real'")

        if not _is_non_empty_string(capability.get("evidence_mode")):
            findings.append(f"{prefix}.evidence_mode must be a non-empty string")

        if not _is_non_empty_string(capability.get("verification_stage")):
            findings.append(f"{prefix}.verification_stage must be a non-empty string")

        required_artifacts = capability.get("required_artifacts")
        if (
            not isinstance(required_artifacts, list)
            or not required_artifacts
            or any(not _is_non_empty_string(item) for item in required_artifacts)
        ):
            findings.append(f"{prefix}.required_artifacts must be a non-empty string list")

        if effect_scope == "external" and not _is_non_empty_string(capability.get("provider_class")):
            findings.append(f"{prefix}.provider_class is required when effect_scope=external")

        scenario_ids = _validate_behavior_contract(capability.get("behavior_contract"), prefix, findings)
        _validate_content_contract(capability.get("content_contract"), prefix, findings)
        _validate_evidence_contract(capability.get("evidence_contract"), prefix, findings, scenario_ids)

    return findings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Delivery contract guard")
    parser.add_argument("--contract", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    contract_path = Path(args.contract)
    try:
        data = load_yaml(contract_path)
    except FileNotFoundError:
        print(f"FAIL: delivery_contract_guard missing contract: {contract_path}")
        return 1

    findings = validate_contract(data)
    if findings:
        print(f"FAIL: delivery_contract_guard contract={contract_path}")
        for item in findings:
            print(f"  - {item}")
        return 1

    capabilities = (data or {}).get("capabilities") or []
    print(
        "PASS: delivery_contract_guard "
        f"contract={contract_path} module={data.get('module')} capabilities={len(capabilities)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
