#!/usr/bin/env python3
"""Guard: HTML prototype must remain the single truth source for first-order UI artifacts."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


PAGE_ROW_RE = re.compile(r"^\|\s*\d+\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|")
SURFACE_ROW_RE = re.compile(r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|")
SURFACE_SELECTOR_RE = re.compile(r"^#([A-Za-z][\w:.-]*)$")


@dataclass(frozen=True)
class ModulePaths:
    repo_root: Path
    module_dir: Path
    matrix_doc: Path
    contract_doc: Path
    config_path: Path


def fail(message: str) -> int:
    print(f"FAIL: {message}")
    return 1


def find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in (current, *current.parents):
        if (candidate / ".claude/project/config.yaml").exists():
            return candidate
    raise FileNotFoundError(f"cannot locate repo root from {start}")


def load_yaml(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise ValueError(f"{path} must parse to a mapping")
    return data


def get_config_value(data: dict[str, Any], dotted_key: str) -> Any:
    current: Any = data
    for part in dotted_key.split("."):
        if not isinstance(current, dict) or part not in current:
            raise KeyError(dotted_key)
        current = current[part]
    return current


def resolve_placeholders(value: Any, config: dict[str, Any]) -> Any:
    if isinstance(value, str):
        def replace(match: re.Match[str]) -> str:
            key = match.group(1)
            return str(get_config_value(config, key))

        return re.sub(r"\$\{([^}]+)\}", replace, value)
    if isinstance(value, list):
        return [resolve_placeholders(item, config) for item in value]
    if isinstance(value, dict):
        return {key: resolve_placeholders(val, config) for key, val in value.items()}
    return value


def load_module_paths(module_dir_arg: str, config_arg: str | None) -> ModulePaths:
    module_dir = Path(module_dir_arg).resolve()
    if not module_dir.exists():
        raise FileNotFoundError(f"module dir not found: {module_dir}")
    repo_root = find_repo_root(module_dir)
    config_path = (Path(config_arg).resolve() if config_arg else repo_root / ".claude/project/config.yaml")
    if not config_path.exists():
        raise FileNotFoundError(f"config not found: {config_path}")
    matrix_doc = module_dir / "MATRIX.md"
    contract_doc = module_dir / "UI-VISUAL-CONTRACT.yaml"
    if not matrix_doc.exists():
        raise FileNotFoundError(f"MATRIX.md not found: {matrix_doc}")
    if not contract_doc.exists():
        raise FileNotFoundError(f"UI-VISUAL-CONTRACT.yaml not found: {contract_doc}")
    return ModulePaths(
        repo_root=repo_root,
        module_dir=module_dir,
        matrix_doc=matrix_doc,
        contract_doc=contract_doc,
        config_path=config_path,
    )


def extract_module_name(module_dir: Path) -> str:
    return module_dir.name


def load_module_prototype_files(config: dict[str, Any], module_name: str) -> list[str]:
    mapping = config.get("prd_process", {}).get("module_prototype_map", {})
    if not isinstance(mapping, dict):
        raise ValueError("prd_process.module_prototype_map must be mapping")
    files = mapping.get(module_name)
    if not isinstance(files, list) or not files:
        raise ValueError(f"module_prototype_map missing non-empty entry for module '{module_name}'")
    bad = [item for item in files if not isinstance(item, str) or not item.strip()]
    if bad:
        raise ValueError(f"module_prototype_map[{module_name}] must contain non-empty strings")
    return [item.strip() for item in files]


def collect_html_ids(prototype_root: Path, file_names: list[str]) -> dict[str, set[str]]:
    result: dict[str, set[str]] = {}
    for file_name in file_names:
        path = prototype_root / file_name
        if not path.exists():
            raise FileNotFoundError(f"prototype file missing: {path}")
        html = path.read_text(encoding="utf-8")
        result[file_name] = set(re.findall(r'id="([^"]+)"', html))
    return result


def parse_matrix_pages(matrix_doc: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    in_page_table = False
    for raw_line in matrix_doc.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line.startswith("## 2. 页面矩阵"):
            in_page_table = True
            continue
        if in_page_table and line.startswith("## 3."):
            break
        if not in_page_table or not line.startswith("|"):
            continue
        match = PAGE_ROW_RE.match(line)
        if not match:
            continue
        page_id, _, _, prd_file = [part.strip() for part in match.groups()]
        rows.append({"page_id": page_id, "prd_file": prd_file})
    return rows


def parse_matrix_surfaces(matrix_doc: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    in_surface_table = False
    seen_header = False
    for raw_line in matrix_doc.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line.startswith("## 3. 弹窗清单"):
            in_surface_table = True
            continue
        if in_surface_table and line.startswith("## 4."):
            break
        if not in_surface_table or not line.startswith("|"):
            continue
        if line.startswith("| 弹窗 ID "):
            seen_header = True
            continue
        if not seen_header or set(line.replace("|", "").strip()) <= {"-", " "}:
            continue
        match = SURFACE_ROW_RE.match(line)
        if not match:
            continue
        surface_id, host_page, _, _ = [part.strip() for part in match.groups()]
        rows.append({"surface_id": surface_id, "host_page": host_page})
    return rows


def validate_surface_selector(selector: str, tag: str) -> str:
    match = SURFACE_SELECTOR_RE.match(selector.strip())
    if not match:
        raise ValueError(f"{tag}.prototype_selector must be a simple id selector like #modal-name")
    return match.group(1)


def evaluate_consistency(module_dir: Path, config_path: Path | None = None) -> tuple[list[str], dict[str, Any]]:
    module_paths = load_module_paths(str(module_dir), str(config_path) if config_path else None)
    config = load_yaml(module_paths.config_path)
    truth = config.get("prd_process", {}).get("truth_source", {})
    if not isinstance(truth, dict):
        raise ValueError("prd_process.truth_source must be mapping")
    if truth.get("type") != "html_prototype":
        raise ValueError("prd_process.truth_source.type must be html_prototype")
    if truth.get("single_source_of_truth") is not True:
        raise ValueError("prd_process.truth_source.single_source_of_truth must be true")
    if truth.get("forbid_source_absent_derivation") is not True:
        raise ValueError("prd_process.truth_source.forbid_source_absent_derivation must be true")

    module_name = extract_module_name(module_paths.module_dir)
    prototype_root_value = resolve_placeholders(truth.get("root"), config)
    if not isinstance(prototype_root_value, str) or not prototype_root_value.strip():
        raise ValueError("prd_process.truth_source.root must resolve to non-empty string")
    prototype_root = (module_paths.repo_root / prototype_root_value).resolve()
    if not prototype_root.exists():
        raise FileNotFoundError(f"truth source root missing: {prototype_root}")

    allowed_files = load_module_prototype_files(config, module_name)
    html_ids = collect_html_ids(prototype_root, allowed_files)
    matrix_pages = parse_matrix_pages(module_paths.matrix_doc)
    matrix_surfaces = parse_matrix_surfaces(module_paths.matrix_doc)
    contract = load_yaml(module_paths.contract_doc)
    contract_pages = contract.get("pages", [])
    contract_surfaces = contract.get("surfaces", [])
    if not isinstance(contract_pages, list):
        raise ValueError("UI-VISUAL-CONTRACT.pages must be a list")
    if contract_surfaces is not None and not isinstance(contract_surfaces, list):
        raise ValueError("UI-VISUAL-CONTRACT.surfaces must be a list when provided")
    if contract_surfaces is None:
        contract_surfaces = []

    findings: list[str] = []

    for index, page in enumerate(contract_pages):
        if not isinstance(page, dict):
            findings.append(f"UI-VISUAL-CONTRACT.pages[{index}] must be object")
            continue
        page_id = page.get("page_id")
        file_name = page.get("prototype_file")
        if not isinstance(page_id, str) or not page_id.strip():
            findings.append(f"UI-VISUAL-CONTRACT.pages[{index}].page_id must be non-empty string")
            continue
        if not isinstance(file_name, str) or not file_name.strip():
            findings.append(f"UI-VISUAL-CONTRACT.pages[{index}].prototype_file must be non-empty string")
            continue
        if file_name not in allowed_files:
            findings.append(
                f"UI-VISUAL-CONTRACT page '{page_id}' references source-absent prototype_file '{file_name}'"
            )

    for surface in matrix_surfaces:
        surface_id = surface["surface_id"]
        present = any(surface_id in file_ids for file_ids in html_ids.values())
        if not present:
            findings.append(
                f"MATRIX.md surface '{surface_id}' does not exist in HTML truth source"
            )

    for index, surface in enumerate(contract_surfaces):
        if not isinstance(surface, dict):
            findings.append(f"UI-VISUAL-CONTRACT.surfaces[{index}] must be object")
            continue
        surface_id = surface.get("surface_id")
        selector = surface.get("prototype_selector")
        if not isinstance(surface_id, str) or not surface_id.strip():
            findings.append(f"UI-VISUAL-CONTRACT.surfaces[{index}].surface_id must be non-empty string")
            continue
        if not isinstance(selector, str) or not selector.strip():
            findings.append(
                f"UI-VISUAL-CONTRACT surface '{surface_id}' missing non-empty prototype_selector"
            )
            continue
        try:
            selector_id = validate_surface_selector(selector, f"UI-VISUAL-CONTRACT.surfaces[{index}]")
        except ValueError as exc:
            findings.append(str(exc))
            continue
        if surface_id != selector_id:
            findings.append(
                f"UI-VISUAL-CONTRACT surface '{surface_id}' prototype_selector '{selector}' must target matching id"
            )
        present = any(selector_id in file_ids for file_ids in html_ids.values())
        if not present:
            findings.append(
                f"UI-VISUAL-CONTRACT surface '{surface_id}' points to source-absent selector '{selector}'"
            )

    summary = {
        "module": module_name,
        "module_dir": str(module_paths.module_dir),
        "config": str(module_paths.config_path),
        "prototype_root": str(prototype_root),
        "prototype_files": allowed_files,
        "matrix_pages": len(matrix_pages),
        "matrix_surfaces": len(matrix_surfaces),
        "contract_pages": len(contract_pages),
        "contract_surfaces": len(contract_surfaces),
        "findings": findings,
    }
    return findings, summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Prototype derivation consistency guard")
    parser.add_argument("--module-dir", required=True, help="PRD module directory containing MATRIX.md and UI-VISUAL-CONTRACT.yaml")
    parser.add_argument("--config", help="Optional project config path")
    args = parser.parse_args()

    try:
        findings, summary = evaluate_consistency(Path(args.module_dir), Path(args.config) if args.config else None)
    except Exception as exc:  # noqa: BLE001
        return fail(str(exc))

    if findings:
        print("FAIL: prototype_derivation_consistency_guard")
        for finding in findings:
            print(f"  - {finding}")
        return 1

    print(
        "PASS: prototype_derivation_consistency_guard "
        f"module={summary['module']} "
        f"prototype_files={len(summary['prototype_files'])} "
        f"matrix_surfaces={summary['matrix_surfaces']} "
        f"contract_surfaces={summary['contract_surfaces']}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
