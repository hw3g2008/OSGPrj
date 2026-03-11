#!/usr/bin/env python3
"""Guard: validate behavior contract reports against DELIVERY-CONTRACT.yaml."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from delivery_contract_guard import load_yaml, validate_contract

ALLOWED_STAGES = {"verify", "final-gate", "final-closure"}


def _is_non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and value.strip() != ""


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(path)
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def _normalize_observable_response(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _extract_visible_error_message_count(value: Any) -> int | None:
    if not isinstance(value, dict):
        return None
    count = value.get("visible_error_message_count")
    if isinstance(count, bool):
        return None
    if isinstance(count, int):
        return count
    return None


def _build_report_capability_map(
    report: dict[str, Any],
    errors: list[str],
) -> dict[str, dict[str, Any]]:
    capabilities = report.get("capabilities")
    if not isinstance(capabilities, list):
        errors.append("behavior_report.capabilities must be a list")
        return {}

    capability_map: dict[str, dict[str, Any]] = {}
    for index, capability in enumerate(capabilities):
        tag = f"behavior_report.capabilities[{index}]"
        if not isinstance(capability, dict):
            errors.append(f"{tag} must be an object")
            continue
        capability_id = capability.get("capability_id")
        if not _is_non_empty_string(capability_id):
            errors.append(f"{tag}.capability_id must be a non-empty string")
            continue
        if capability_id in capability_map:
            errors.append(f"{tag}.capability_id duplicated: {capability_id}")
            continue
        capability_map[str(capability_id)] = capability
    return capability_map


def _build_scenario_map(
    capability_id: str,
    report_capability: dict[str, Any],
    errors: list[str],
) -> dict[str, dict[str, Any]]:
    scenarios = report_capability.get("scenario_results")
    if not isinstance(scenarios, list):
        errors.append(
            f"behavior_report.capabilities[{capability_id}].scenario_results must be a list"
        )
        return {}

    scenario_map: dict[str, dict[str, Any]] = {}
    for index, scenario in enumerate(scenarios):
        tag = f"behavior_report.capabilities[{capability_id}].scenario_results[{index}]"
        if not isinstance(scenario, dict):
            errors.append(f"{tag} must be an object")
            continue
        scenario_id = scenario.get("scenario_id")
        if not _is_non_empty_string(scenario_id):
            errors.append(f"{tag}.scenario_id must be a non-empty string")
            continue
        if scenario_id in scenario_map:
            errors.append(f"{tag}.scenario_id duplicated: {scenario_id}")
            continue
        scenario_map[str(scenario_id)] = scenario
    return scenario_map


def _validate_scenario_result(
    *,
    capability_id: str,
    scenario_contract: dict[str, Any],
    scenario_result: dict[str, Any] | None,
    errors: list[str],
) -> None:
    scenario_id = str(scenario_contract.get("scenario_id"))
    prefix = f"capabilities[{capability_id}].scenario[{scenario_id}]"
    if scenario_result is None:
        errors.append(f"{prefix} missing scenario result")
        return

    input_class = scenario_contract.get("input_class")
    if scenario_result.get("input_class") != input_class:
        errors.append(f"{prefix} input_class mismatch: expected {input_class}, got {scenario_result.get('input_class')}")

    expected_result = scenario_contract.get("expected_result")
    if scenario_result.get("expected_result") != expected_result:
        errors.append(
            f"{prefix} expected_result mismatch: expected {expected_result}, got {scenario_result.get('expected_result')}"
        )

    observed_result = scenario_result.get("observed_result")
    if not _is_non_empty_string(observed_result):
        errors.append(f"{prefix}.observed_result must be a non-empty string")
    elif observed_result != expected_result:
        errors.append(
            f"{prefix}.observed_result mismatch: expected {expected_result}, got {observed_result}"
        )

    if "observable_response" not in scenario_result:
        errors.append(f"{prefix}.observable_response must be present")

    if not _is_non_empty_string(scenario_result.get("evidence_ref")):
        errors.append(f"{prefix}.evidence_ref must be a non-empty string")


def _validate_invariants(
    *,
    capability_id: str,
    invariants: list[dict[str, Any]],
    scenario_map: dict[str, dict[str, Any]],
    errors: list[str],
) -> None:
    for invariant in invariants:
        if not isinstance(invariant, dict):
            continue
        for name, refs in invariant.items():
            if not isinstance(refs, list) or not refs:
                errors.append(
                    f"capabilities[{capability_id}].behavior_contract.invariant.{name} must be a non-empty list"
                )
                continue
            missing_refs = [ref for ref in refs if ref not in scenario_map]
            if missing_refs:
                errors.append(
                    f"capabilities[{capability_id}].behavior_contract.invariant.{name} references missing scenarios: {missing_refs}"
                )
                continue

            normalized_responses = [
                _normalize_observable_response(scenario_map[ref].get("observable_response"))
                for ref in refs
            ]
            if name == "same_observable_response_for":
                if len(set(normalized_responses)) != 1:
                    errors.append(
                        f"capabilities[{capability_id}].behavior_contract.invariant.same_observable_response_for violated: {refs}"
                    )
            elif name == "distinct_outcome_for":
                if len(set(normalized_responses)) != len(refs):
                    errors.append(
                        f"capabilities[{capability_id}].behavior_contract.invariant.distinct_outcome_for violated: {refs}"
                    )
            elif name == "single_observable_error_message_for":
                bad_refs = [
                    ref
                    for ref in refs
                    if _extract_visible_error_message_count(scenario_map[ref].get("observable_response")) != 1
                ]
                if bad_refs:
                    errors.append(
                        "capabilities["
                        f"{capability_id}"
                        "].behavior_contract.invariant.single_observable_error_message_for violated: "
                        f"{bad_refs}"
                    )
            else:
                errors.append(
                    f"capabilities[{capability_id}].behavior_contract invariant not supported: {name}"
                )


def validate_behavior_report(
    *,
    contract: dict[str, Any],
    report: dict[str, Any],
    stage: str,
    errors: list[str],
) -> None:
    if stage not in ALLOWED_STAGES:
        errors.append(f"stage must be one of {sorted(ALLOWED_STAGES)}")
        return

    module = contract.get("module")
    if module and report.get("module") != module:
        errors.append(f"behavior_report.module must match contract module ({module})")

    report_stage = report.get("stage")
    if _is_non_empty_string(report_stage) and report_stage != stage:
        errors.append(f"behavior_report.stage must match requested stage ({stage})")

    capability_map = _build_report_capability_map(report, errors)
    for capability in contract.get("capabilities") or []:
        if not isinstance(capability, dict):
            continue
        behavior_contract = capability.get("behavior_contract")
        if not isinstance(behavior_contract, dict):
            continue
        capability_id = capability.get("capability_id")
        if not _is_non_empty_string(capability_id):
            continue

        report_capability = capability_map.get(str(capability_id))
        if report_capability is None:
            errors.append(f"capabilities[{capability_id}] missing behavior report entry")
            continue

        scenario_map = _build_scenario_map(str(capability_id), report_capability, errors)
        scenarios = behavior_contract.get("scenarios") or []
        if not isinstance(scenarios, list):
            errors.append(f"capabilities[{capability_id}].behavior_contract.scenarios must be a list")
            continue

        for scenario_contract in scenarios:
            if not isinstance(scenario_contract, dict):
                continue
            scenario_id = scenario_contract.get("scenario_id")
            if not _is_non_empty_string(scenario_id):
                continue
            _validate_scenario_result(
                capability_id=str(capability_id),
                scenario_contract=scenario_contract,
                scenario_result=scenario_map.get(str(scenario_id)),
                errors=errors,
            )

        invariants = behavior_contract.get("invariants") or []
        if isinstance(invariants, list):
            _validate_invariants(
                capability_id=str(capability_id),
                invariants=invariants,
                scenario_map=scenario_map,
                errors=errors,
            )


def evaluate_behavior_contract(
    *,
    contract_path: Path,
    report_path: Path,
    stage: str,
) -> list[str]:
    errors: list[str] = []
    contract = load_yaml(contract_path)
    errors.extend(validate_contract(contract))
    if errors:
        return errors

    try:
        report = _load_json(report_path)
    except FileNotFoundError:
        return [f"behavior report not found: {report_path}"]

    validate_behavior_report(contract=contract, report=report, stage=stage, errors=errors)
    return errors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Behavior contract guard")
    parser.add_argument("--contract", required=True, help="Path to DELIVERY-CONTRACT.yaml")
    parser.add_argument("--report", required=True, help="Path to behavior scenario report JSON")
    parser.add_argument("--stage", required=True, choices=sorted(ALLOWED_STAGES))
    parser.add_argument("--output-json", help="Optional path to write summary JSON")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    contract_path = Path(args.contract)
    report_path = Path(args.report)
    findings = evaluate_behavior_contract(
        contract_path=contract_path,
        report_path=report_path,
        stage=args.stage,
    )

    summary = {
        "contract": args.contract,
        "report": args.report,
        "stage": args.stage,
        "issues": findings,
    }
    if args.output_json:
        output_path = Path(args.output_json)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    if findings:
        print(
            "FAIL: behavior_contract_guard "
            f"contract={contract_path} report={report_path} stage={args.stage}",
            file=sys.stderr,
        )
        for item in findings:
            print(f" - {item}", file=sys.stderr)
        return 1

    contract = load_yaml(contract_path)
    capabilities = contract.get("capabilities") or []
    print(
        "PASS: behavior_contract_guard "
        f"module={contract.get('module', 'unknown')} stage={args.stage} capabilities={len(capabilities)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
