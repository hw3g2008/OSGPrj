#!/usr/bin/env python3
"""Generate first-pass overlay surface skeletons into UI-VISUAL-CONTRACT.yaml."""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Any

import yaml


ROW_PATTERN = re.compile(
    r"^\|\s*((?:modal|drawer|popover|panel|wizard-step)-[^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$",
    re.M,
)
SECTION_REF_PATTERN = re.compile(r"^(?P<file>[^§#]+?)(?:\s*[§#]\s*(?P<section>.+))?$")

DEFAULT_VIEWPORTS = [
    {"viewport_id": "desktop", "width": 1440, "height": 900},
    {"viewport_id": "tablet", "width": 1024, "height": 900},
]
DEFAULT_MODAL_TOKENS = {
    "mask": "rgba(0,0,0,0.5)",
    "background": "#fff",
    "border_radius": "20px",
    "header_padding": "22px 26px",
    "body_padding": "26px",
    "footer_padding": "18px 26px",
    "close_size": "36px",
    "close_radius": "10px",
    "close_background": "var(--bg)",
}
SURFACE_PART_ORDER = ["backdrop", "shell", "header", "body", "footer", "close-control"]
SURFACE_PART_CLASS_MAP = {
    "shell": "modal-content",
    "header": "modal-header",
    "body": "modal-body",
    "footer": "modal-footer",
    "close-control": "modal-close",
}
PLACEHOLDER_PATTERN = re.compile(r"\$\{([^}]+)\}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate overlay surface skeletons.")
    parser.add_argument("--module-dir", required=True, help="PRD module directory, e.g. osg-spec-docs/docs/01-product/prd/permission")
    parser.add_argument(
        "--config",
        default=".claude/project/config.yaml",
        help="Project config that declares the HTML truth source.",
    )
    parser.add_argument(
        "--prototype-root",
        help="Prototype source root used to infer overlay shell parts. Defaults to truth_source.root from project config.",
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write updated UI-VISUAL-CONTRACT.yaml in-place. Defaults to dry-run summary.",
    )
    parser.add_argument(
        "--refresh-generated",
        action="store_true",
        help="Refresh existing first-pass generated surface skeletons in-place.",
    )
    return parser.parse_args()


def load_yaml(path: Path) -> dict[str, Any]:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def save_yaml(path: Path, data: dict[str, Any]) -> None:
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def get_config_value(data: dict[str, Any], dotted_key: str) -> Any:
    current: Any = data
    for part in dotted_key.split("."):
        if not isinstance(current, dict) or part not in current:
            raise KeyError(dotted_key)
        current = current[part]
    return current


def resolve_placeholders(value: str, data: dict[str, Any]) -> str:
    def repl(match: re.Match[str]) -> str:
        resolved = get_config_value(data, match.group(1))
        if not isinstance(resolved, str):
            raise ValueError(f"config placeholder {match.group(1)} did not resolve to string")
        return resolved

    previous = value
    while True:
        resolved = PLACEHOLDER_PATTERN.sub(repl, previous)
        if resolved == previous:
            return resolved
        previous = resolved


def load_truth_source_config(config_path: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    config = load_yaml(config_path)
    if not isinstance(config, dict):
        raise ValueError(f"invalid project config: {config_path}")
    prd_process = config.get("prd_process")
    if not isinstance(prd_process, dict):
        raise ValueError("project config missing prd_process")
    truth = prd_process.get("truth_source")
    if not isinstance(truth, dict):
        raise ValueError("project config missing prd_process.truth_source")
    if truth.get("type") != "html_prototype":
        raise ValueError("truth_source.type must be html_prototype")
    if truth.get("single_source_of_truth") is not True:
        raise ValueError("truth_source.single_source_of_truth must be true")
    if truth.get("forbid_source_absent_derivation") is not True:
        raise ValueError("truth_source.forbid_source_absent_derivation must be true")
    return config, truth


def parse_design_system_tokens(design_system_text: str) -> dict[str, str]:
    tokens = dict(DEFAULT_MODAL_TOKENS)
    table_re = re.compile(r"^\|\s*(?P<key>[^|]+?)\s*\|\s*(?P<value>[^|]+?)\s*\|$", re.M)
    mapping = {
        "遮罩": "mask",
        "内容背景": "background",
        "圆角": "border_radius",
        "头部 padding": "header_padding",
        "内容 padding": "body_padding",
        "底部 padding": "footer_padding",
    }
    for match in table_re.finditer(design_system_text):
        key = match.group("key").strip()
        value = match.group("value").strip()
        mapped = mapping.get(key)
        if mapped:
            tokens[mapped] = value

    close_match = re.search(
        r"关闭按钮\s*\|\s*(?P<size>\d+px)\s*正方形,\s*border-radius:(?P<radius>[^,|]+),\s*background:(?P<bg>[^\n|]+)",
        design_system_text,
    )
    if close_match:
        tokens["close_size"] = close_match.group("size").strip()
        tokens["close_radius"] = close_match.group("radius").strip()
        tokens["close_background"] = close_match.group("bg").strip()

    return tokens


def parse_matrix_surfaces(matrix_text: str) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    for match in ROW_PATTERN.finditer(matrix_text):
        surface_id = match.group(1).strip()
        host_page_id = match.group(2).strip()
        name = match.group(3).strip()
        source_ref = match.group(4).strip()
        results.append(
            {
                "surface_id": surface_id,
                "host_page_id": host_page_id,
                "surface_name": name,
                "source_ref": source_ref,
            }
        )
    return results


def infer_surface_type(surface_id: str) -> str:
    for prefix in ("modal", "drawer", "popover", "panel", "wizard-step"):
        if surface_id.startswith(prefix + "-"):
            return prefix
    raise ValueError(f"unsupported surface id prefix: {surface_id}")


def slug_to_title(surface_id: str) -> str:
    return surface_id.replace("-", " ")


def build_surface_selector(surface_id: str, part: str | None = None) -> str:
    base = f'[data-surface-id="{surface_id}"]'
    if part is None:
        return base
    return f'{base} [data-surface-part="{part}"]'


def build_trigger_selector(surface_id: str) -> str:
    return f'[data-surface-trigger="{surface_id}"]'


def _load_prototype_texts(prototype_root: Path) -> list[tuple[Path, str]]:
    texts: list[tuple[Path, str]] = []
    if not prototype_root.exists():
        return texts
    for path in sorted(prototype_root.rglob("*.html")):
        texts.append((path, load_text(path)))
    return texts


def _find_surface_block(surface_id: str, prototype_texts: list[tuple[Path, str]]) -> tuple[Path | None, str | None]:
    marker = f'id="{surface_id}"'
    for path, text in prototype_texts:
        index = text.find(marker)
        if index == -1:
            continue
        start = text.rfind("<div", 0, index)
        if start == -1:
            start = index
        next_modal = text.find('<div class="modal" id="', index + len(marker))
        if next_modal == -1:
            next_modal = len(text)
        return path, text[start:next_modal]
    return None, None


def _infer_surface_parts(surface_type: str, block: str | None) -> list[str]:
    if block is None:
        return list(SURFACE_PART_ORDER)

    parts = ["backdrop", "shell"]
    if surface_type not in {"modal", "wizard-step"}:
        return parts

    for part_id, class_name in SURFACE_PART_CLASS_MAP.items():
        if class_name in block:
            parts.append(part_id)

    ordered = [part for part in SURFACE_PART_ORDER if part in set(parts)]
    return ordered or list(SURFACE_PART_ORDER)


def _build_prototype_part_selector(surface_selector: str, part_id: str) -> str:
    if part_id == "backdrop":
        return surface_selector
    if part_id == "shell":
        return f"{surface_selector} .modal-content"
    class_name = SURFACE_PART_CLASS_MAP.get(part_id)
    if class_name:
        return f"{surface_selector} .{class_name}"
    return surface_selector


def build_surface_entry(
    surface: dict[str, str],
    tokens: dict[str, str],
    prototype_texts: list[tuple[Path, str]],
) -> dict[str, Any]:
    surface_id = surface["surface_id"]
    surface_type = infer_surface_type(surface_id)
    root_selector = build_surface_selector(surface_id)
    shell_selector = build_surface_selector(surface_id, "shell")
    header_selector = build_surface_selector(surface_id, "header")
    body_selector = build_surface_selector(surface_id, "body")
    footer_selector = build_surface_selector(surface_id, "footer")
    backdrop_selector = build_surface_selector(surface_id, "backdrop")
    close_selector = build_surface_selector(surface_id, "close-control")
    prototype_selector = f"#{surface_id}"
    _, prototype_block = _find_surface_block(surface_id, prototype_texts)
    prototype_parts = set(_infer_surface_parts(surface_type, prototype_block))

    required_anchors = [shell_selector]
    prototype_required_anchors = [_build_prototype_part_selector(prototype_selector, "shell")]
    for part_id, selector in (
        ("header", header_selector),
        ("body", body_selector),
    ):
        if part_id in prototype_parts:
            required_anchors.append(selector)
            prototype_required_anchors.append(_build_prototype_part_selector(prototype_selector, part_id))

    surface_parts = []
    for part_id, selector in (
        ("backdrop", backdrop_selector),
        ("shell", shell_selector),
        ("header", header_selector),
        ("body", body_selector),
        ("footer", footer_selector),
        ("close-control", close_selector),
    ):
        if part_id not in prototype_parts:
            continue
        surface_parts.append(
            {
                "part_id": part_id,
                "selector": selector,
                "prototype_selector": _build_prototype_part_selector(prototype_selector, part_id),
                "mask_allowed": False,
            }
        )

    style_contracts = [
        {
            "selector": shell_selector,
            "prototype_selector": _build_prototype_part_selector(prototype_selector, "shell"),
            "css": {
                "border-radius": tokens["border_radius"],
                "background-color": tokens["background"],
            },
        },
        {
            "selector": backdrop_selector,
            "prototype_selector": _build_prototype_part_selector(prototype_selector, "backdrop"),
            "css": {
                "background-color": tokens["mask"],
            },
        },
    ]
    if "close-control" in prototype_parts:
        close_css = {
            "width": tokens["close_size"],
            "height": tokens["close_size"],
            "border-radius": tokens["close_radius"],
        }
        close_background = tokens["close_background"].strip()
        if close_background and not close_background.startswith("var("):
            close_css["background-color"] = close_background
        style_contracts.append(
            {
                "selector": close_selector,
                "prototype_selector": _build_prototype_part_selector(prototype_selector, "close-control"),
                "css": close_css,
            }
        )

    state_required_anchors = []
    state_prototype_required_anchors = []
    for part_id, selector in (
        ("header", header_selector),
        ("body", body_selector),
        ("close-control", close_selector),
    ):
        if part_id not in prototype_parts:
            continue
        state_required_anchors.append(selector)
        state_prototype_required_anchors.append(_build_prototype_part_selector(prototype_selector, part_id))

    state_style_contracts = []
    for part_id, selector, padding_token in (
        ("header", header_selector, "header_padding"),
        ("body", body_selector, "body_padding"),
        ("footer", footer_selector, "footer_padding"),
    ):
        if part_id not in prototype_parts:
            continue
        state_style_contracts.append(
            {
                "selector": selector,
                "prototype_selector": _build_prototype_part_selector(prototype_selector, part_id),
                "css": {
                    "padding": tokens[padding_token],
                },
            }
        )

    return {
        "surface_id": surface_id,
        "surface_type": surface_type,
        "host_page_id": surface["host_page_id"],
        "prototype_selector": prototype_selector,
        "app_selector": shell_selector,
        "surface_root_selector": shell_selector,
        "backdrop_selector": backdrop_selector,
        "portal_host": "body",
        "source_ref": surface["source_ref"],
        "trigger_action": {
            "type": "click",
            "selector": build_trigger_selector(surface_id),
        },
        "required_anchors": required_anchors,
        "prototype_required_anchors": prototype_required_anchors,
        "viewport_variants": list(DEFAULT_VIEWPORTS),
        "state_variants": [{"state_id": "default"}],
        "surface_parts": surface_parts,
        "style_contracts": style_contracts,
        "state_contracts": [
            {
                "state_id": "default",
                "required_anchors": state_required_anchors,
                "prototype_required_anchors": state_prototype_required_anchors,
                "style_contracts": state_style_contracts,
            }
        ],
        "_generated_note": f"first-pass skeleton for {slug_to_title(surface_id)}",
    }


def merge_surfaces(
    contract: dict[str, Any],
    matrix_surfaces: list[dict[str, str]],
    tokens: dict[str, str],
    prototype_texts: list[tuple[Path, str]],
    refresh_generated: bool,
) -> tuple[dict[str, Any], int, int]:
    existing = contract.get("surfaces")
    if not isinstance(existing, list):
        existing = []
    existing_by_id = {}
    for item in existing:
        if isinstance(item, dict):
            surface_id = item.get("surface_id")
            if isinstance(surface_id, str) and surface_id.strip():
                existing_by_id[surface_id.strip()] = item

    added = 0
    refreshed = 0
    merged: list[dict[str, Any]] = []
    matrix_by_id = {surface["surface_id"]: surface for surface in matrix_surfaces}
    for item in existing:
        if not isinstance(item, dict):
            merged.append(item)
            continue
        surface_id = item.get("surface_id")
        if (
            refresh_generated
            and isinstance(surface_id, str)
            and surface_id in matrix_by_id
            and str(item.get("_generated_note", "")).startswith("first-pass skeleton for ")
        ):
            rebuilt = build_surface_entry(matrix_by_id[surface_id], tokens, prototype_texts)
            existing_trigger = item.get("trigger_action")
            if isinstance(existing_trigger, dict):
                rebuilt_trigger = rebuilt.get("trigger_action", {})
                rebuilt_trigger.update(
                    {
                        key: value
                        for key, value in existing_trigger.items()
                        if value not in (None, "", [])
                    }
                )
                rebuilt["trigger_action"] = rebuilt_trigger
            if isinstance(item.get("fixture_routes"), list):
                rebuilt["fixture_routes"] = item["fixture_routes"]
            merged.append(rebuilt)
            refreshed += 1
            continue
        merged.append(item)

    for surface in matrix_surfaces:
        surface_id = surface["surface_id"]
        if surface_id in existing_by_id:
            continue
        merged.append(build_surface_entry(surface, tokens, prototype_texts))
        added += 1

    contract["surfaces"] = merged
    return contract, added, refreshed


def main() -> int:
    args = parse_args()
    module_dir = Path(args.module_dir)
    matrix_path = module_dir / "MATRIX.md"
    design_system_path = module_dir / "DESIGN-SYSTEM.md"
    contract_path = module_dir / "UI-VISUAL-CONTRACT.yaml"
    config, truth = load_truth_source_config(Path(args.config))
    if args.prototype_root:
        prototype_root = Path(args.prototype_root)
    else:
        raw_root = truth.get("root")
        if not isinstance(raw_root, str):
            raise ValueError("truth_source.root must be a string")
        prototype_root = Path(resolve_placeholders(raw_root, config))

    if not matrix_path.exists() or not design_system_path.exists() or not contract_path.exists():
        missing = [str(path) for path in (matrix_path, design_system_path, contract_path) if not path.exists()]
        raise SystemExit(f"missing required files: {missing}")

    matrix_surfaces = parse_matrix_surfaces(load_text(matrix_path))
    tokens = parse_design_system_tokens(load_text(design_system_path))
    prototype_texts = _load_prototype_texts(prototype_root)
    contract = load_yaml(contract_path)
    contract, added, refreshed = merge_surfaces(
        contract,
        matrix_surfaces,
        tokens,
        prototype_texts,
        args.refresh_generated,
    )

    if args.write:
        save_yaml(contract_path, contract)
        print(
            f"PASS: generated overlay surface skeletons module_dir={module_dir} "
            f"added={added} refreshed={refreshed}"
        )
    else:
        print(
            yaml.safe_dump(
                {
                    "module_dir": str(module_dir),
                    "prototype_root": str(prototype_root),
                    "matrix_surfaces": len(matrix_surfaces),
                    "surfaces_added": added,
                    "surfaces_refreshed": refreshed,
                    "surface_ids": [surface["surface_id"] for surface in matrix_surfaces],
                },
                allow_unicode=True,
                sort_keys=False,
            ).strip()
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
