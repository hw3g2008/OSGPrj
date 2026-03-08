#!/usr/bin/env python3
"""Guard: verify in-scope requirements are covered by stories/tests/visual contract."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml

PAGE_ALIASES = {
    "home": {"dashboard"},
}


def load_yaml(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def normalize_top_level_fr(ref: str) -> str:
    match = re.search(r"\b(FR-\d{3})", ref or "")
    return match.group(1) if match else ""


def extract_scope_pages(scope_doc: Path) -> set[str]:
    content = scope_doc.read_text(encoding="utf-8")
    page_ids: set[str] = set()
    for line in content.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        cols = [c.strip() for c in line.split("|")]
        if len(cols) < 4:
            continue
        page_id = cols[2]
        if re.fullmatch(r"[a-z0-9-]+", page_id) and set(page_id) != {"-"}:
            page_ids.add(page_id)
    return page_ids


def extract_top_level_frs(srs_doc: Path) -> set[str]:
    content = srs_doc.read_text(encoding="utf-8")
    return set(re.findall(r"^###\s+(FR-\d{3})\b", content, flags=re.MULTILINE))


def extract_contract_pages(contract_doc: Path) -> set[str]:
    data = load_yaml(contract_doc) or {}
    pages = data.get("pages") or []
    result: set[str] = set()
    for page in pages:
        if isinstance(page, dict) and isinstance(page.get("page_id"), str):
            result.add(page["page_id"])
    return result


def extract_delivery_capabilities(contract_doc: Path) -> dict[str, list[str]]:
    data = load_yaml(contract_doc) or {}
    capabilities = data.get("capabilities") or []
    result: dict[str, list[str]] = {}
    for capability in capabilities:
        if not isinstance(capability, dict):
            continue
        capability_id = capability.get("capability_id")
        if isinstance(capability_id, str) and capability_id:
            source_refs = capability.get("source_refs") or []
            normalized_refs: list[str] = []
            for ref in source_refs:
                if isinstance(ref, str) and ref.strip():
                    normalized_refs.append(ref)
                elif isinstance(ref, dict) and ref:
                    for key, value in ref.items():
                        if isinstance(key, str) and key.strip() and isinstance(value, str) and value.strip():
                            normalized_refs.append(f"{key}:{value}")
            result[capability_id] = normalized_refs
    return result


def extract_critical_surfaces(contract_doc: Path) -> dict[str, list[str]]:
    data = load_yaml(contract_doc) or {}
    pages = data.get("pages") or []
    result: dict[str, list[str]] = {}
    for page in pages:
        if not isinstance(page, dict):
            continue
        for surface in page.get("critical_surfaces") or []:
            if not isinstance(surface, dict):
                continue
            surface_id = surface.get("surface_id")
            if isinstance(surface_id, str) and surface_id:
                source_refs = surface.get("source_refs") or []
                normalized_refs: list[str] = []
                for ref in source_refs:
                    if isinstance(ref, str) and ref.strip():
                        normalized_refs.append(ref)
                    elif isinstance(ref, dict) and ref:
                        for key, value in ref.items():
                            if isinstance(key, str) and key.strip() and isinstance(value, str) and value.strip():
                                normalized_refs.append(f"{key}:{value}")
                result[surface_id] = normalized_refs
    return result


def extract_story_fr_coverage(stories_dir: Path) -> tuple[set[str], set[str]]:
    top_level_frs: set[str] = set()
    story_ids: set[str] = set()
    for path in sorted(stories_dir.glob("S-*.yaml")):
        story_ids.add(path.stem)
        data = load_yaml(path) or {}
        for ref in data.get("requirements") or []:
            if isinstance(ref, str):
                normalized = normalize_top_level_fr(ref)
                if normalized:
                    top_level_frs.add(normalized)
    return top_level_frs, story_ids


def extract_story_contract_coverage(stories_dir: Path) -> tuple[set[str], set[str]]:
    capability_ids: set[str] = set()
    surface_ids: set[str] = set()
    for path in sorted(stories_dir.glob("S-*.yaml")):
        data = load_yaml(path) or {}
        contract_refs = data.get("contract_refs") or {}
        if not isinstance(contract_refs, dict):
            continue
        for item in contract_refs.get("capabilities") or []:
            if isinstance(item, str) and item.strip():
                capability_ids.add(item)
        for item in contract_refs.get("critical_surfaces") or []:
            if isinstance(item, str) and item.strip():
                surface_ids.add(item)
    return capability_ids, surface_ids


def extract_story_case_coverage(stories_dir: Path) -> tuple[set[str], list[str]]:
    covered_story_ids: set[str] = set()
    findings: list[str] = []
    for path in sorted(stories_dir.glob("S-*.yaml")):
        data = load_yaml(path) or {}
        story_id = data.get("id") or path.stem
        story_cases = data.get("story_cases")
        if not isinstance(story_cases, list) or not story_cases:
            findings.append(f"story missing story_case skeleton: {story_id}")
            continue
        valid_cases = 0
        for idx, case in enumerate(story_cases):
            prefix = f"{story_id}.story_cases[{idx}]"
            if not isinstance(case, dict):
                findings.append(f"{prefix} must be a mapping")
                continue
            if not isinstance(case.get("story_case_id"), str) or not case["story_case_id"].strip():
                findings.append(f"{prefix}.story_case_id must be a non-empty string")
            if not isinstance(case.get("ac_ref"), str) or not case["ac_ref"].strip():
                findings.append(f"{prefix}.ac_ref must be a non-empty string")
            valid_cases += 1
        if valid_cases:
            covered_story_ids.add(story_id)
    return covered_story_ids, findings


def extract_case_story_ids(cases_doc: Path) -> set[str]:
    data = load_yaml(cases_doc) or []
    story_ids: set[str] = set()
    for item in data:
        if isinstance(item, dict) and isinstance(item.get("story_id"), str):
            story_ids.add(item["story_id"])
    return story_ids


def extract_matrix_story_ids(matrix_doc: Path) -> set[str]:
    content = matrix_doc.read_text(encoding="utf-8")
    story_ids: set[str] = set()
    for match in re.finditer(r"\bAC-(S-\d{3})-", content):
        story_ids.add(match.group(1))
    for match in re.finditer(r"\bTC-[A-Z]+-S(\d{3})-", content):
        story_ids.add(f"S-{match.group(1)}")
    return story_ids


def _page_present(expected: str, actual_pages: set[str]) -> bool:
    if expected in actual_pages:
        return True
    return any(alias in actual_pages for alias in PAGE_ALIASES.get(expected, set()))


def evaluate_coverage(
    *,
    mode: str,
    scope_doc: Path,
    srs_doc: Path,
    contract_doc: Path,
    delivery_contract_doc: Path,
    stories_dir: Path,
    cases_doc: Path | None = None,
    matrix_doc: Path | None = None,
) -> list[str]:
    findings: list[str] = []

    scope_pages = extract_scope_pages(scope_doc)
    contract_pages = extract_contract_pages(contract_doc)
    capabilities = extract_delivery_capabilities(delivery_contract_doc)
    critical_surfaces = extract_critical_surfaces(contract_doc)
    srs_frs = extract_top_level_frs(srs_doc)
    story_frs, story_ids = extract_story_fr_coverage(stories_dir)
    story_capabilities, story_surfaces = extract_story_contract_coverage(stories_dir)
    story_case_story_ids, story_case_findings = extract_story_case_coverage(stories_dir)
    missing_pages = sorted(page for page in scope_pages if not _page_present(page, contract_pages))
    if missing_pages:
        findings.append(f"missing contract page coverage: {missing_pages}")

    missing_frs = sorted(fr for fr in srs_frs if fr not in story_frs)
    if missing_frs:
        findings.append(f"missing story coverage: {missing_frs}")

    missing_capability_refs = sorted(capability_id for capability_id, source_refs in capabilities.items() if not source_refs)
    if missing_capability_refs:
        findings.append(f"contract item missing source_refs: capabilities={missing_capability_refs}")

    missing_surface_refs = sorted(surface_id for surface_id, source_refs in critical_surfaces.items() if not source_refs)
    if missing_surface_refs:
        findings.append(f"contract item missing source_refs: critical_surfaces={missing_surface_refs}")

    missing_story_capabilities = sorted(capability_id for capability_id in capabilities if capability_id not in story_capabilities)
    if missing_story_capabilities:
        findings.append(f"capability missing story contract coverage: {missing_story_capabilities}")

    missing_story_surfaces = sorted(surface_id for surface_id in critical_surfaces if surface_id not in story_surfaces)
    if missing_story_surfaces:
        findings.append(f"critical surface missing story contract coverage: {missing_story_surfaces}")

    findings.extend(story_case_findings)
    missing_story_case_coverage = sorted(story_id for story_id in story_ids if story_id not in story_case_story_ids)
    if missing_story_case_coverage:
        findings.append(f"story missing story_case coverage: {missing_story_case_coverage}")

    if mode == "requirements_to_story_tests":
        if cases_doc is None:
            findings.append("cases_doc is required for mode=requirements_to_story_tests")
        else:
            case_story_ids = extract_case_story_ids(cases_doc)
            missing_story_tests = sorted(story_id for story_id in story_ids if story_id not in case_story_ids)
            if missing_story_tests:
                findings.append(f"story missing testcase coverage: {missing_story_tests}")

        if matrix_doc is None:
            findings.append("matrix_doc is required for mode=requirements_to_story_tests")
        else:
            matrix_story_ids = extract_matrix_story_ids(matrix_doc)
            missing_story_matrix = sorted(story_id for story_id in story_ids if story_id not in matrix_story_ids)
            if missing_story_matrix:
                findings.append(f"story missing traceability matrix coverage: {missing_story_matrix}")

    return findings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Requirements coverage guard")
    parser.add_argument("--module", required=True)
    parser.add_argument(
        "--mode",
        default="requirements_to_story_tests",
        choices=["requirements_to_stories", "requirements_to_story_tests"],
    )
    parser.add_argument("--scope-doc")
    parser.add_argument("--srs")
    parser.add_argument("--contract")
    parser.add_argument("--delivery-contract")
    parser.add_argument("--stories-dir", default="osg-spec-docs/tasks/stories")
    parser.add_argument("--tickets-dir", default="osg-spec-docs/tasks/tickets")
    parser.add_argument("--cases")
    parser.add_argument("--matrix")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    module = args.module
    scope_doc = Path(args.scope_doc or f"osg-spec-docs/docs/01-product/prd/{module}/MATRIX.md")
    srs_doc = Path(args.srs or f"osg-spec-docs/docs/02-requirements/srs/{module}.md")
    contract_doc = Path(args.contract or f"osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml")
    delivery_contract_doc = Path(
        args.delivery_contract or f"osg-spec-docs/docs/01-product/prd/{module}/DELIVERY-CONTRACT.yaml"
    )
    stories_dir = Path(args.stories_dir)
    tickets_dir = Path(args.tickets_dir)
    cases_doc = Path(args.cases or f"osg-spec-docs/tasks/testing/{module}-test-cases.yaml")
    matrix_doc = Path(args.matrix or f"osg-spec-docs/tasks/testing/{module}-traceability-matrix.md")

    paths = [scope_doc, srs_doc, contract_doc, delivery_contract_doc, stories_dir]
    if args.mode == "requirements_to_story_tests":
        paths.extend([tickets_dir, cases_doc, matrix_doc])
    missing_paths = [str(path) for path in paths if not path.exists()]
    if missing_paths:
        print("FAIL: requirements_coverage_guard missing path(s)")
        for path in missing_paths:
            print(f"  - {path}")
        return 1

    findings = evaluate_coverage(
        mode=args.mode,
        scope_doc=scope_doc,
        srs_doc=srs_doc,
        contract_doc=contract_doc,
        delivery_contract_doc=delivery_contract_doc,
        stories_dir=stories_dir,
        cases_doc=cases_doc if args.mode == "requirements_to_story_tests" else None,
        matrix_doc=matrix_doc if args.mode == "requirements_to_story_tests" else None,
    )
    if findings:
        print(f"FAIL: requirements_coverage_guard module={module} mode={args.mode}")
        for item in findings:
            print(f"  - {item}")
        return 1

    print(
        "PASS: requirements_coverage_guard "
        f"module={module} mode={args.mode} scope_doc={scope_doc} srs={srs_doc} "
        f"contract={contract_doc} delivery_contract={delivery_contract_doc}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
