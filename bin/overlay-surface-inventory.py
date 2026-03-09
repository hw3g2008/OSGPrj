#!/usr/bin/env python3
"""Inventory overlay-like UI surfaces across PRD/SRS/prototype sources."""

from __future__ import annotations

import argparse
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


ALLOWED_SURFACE_TYPES = {"modal", "drawer", "popover", "panel", "wizard-step"}
ROW_PATTERN = re.compile(
    r"^\|\s*((?:modal|drawer|popover|panel|wizard-step)-[^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$",
    re.M,
)

TOKEN_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("modal", re.compile(r"\bmodal-[A-Za-z0-9_-]+\b|弹窗|对话框|modal\b", re.IGNORECASE)),
    ("drawer", re.compile(r"\bdrawer-[A-Za-z0-9_-]+\b|抽屉|drawer\b", re.IGNORECASE)),
    ("popover", re.compile(r"\bpopover-[A-Za-z0-9_-]+\b|浮层|popover\b", re.IGNORECASE)),
    ("wizard-step", re.compile(r"\bwizard(?:-step)?-[A-Za-z0-9_-]+\b|步骤|step-\d+|wizard\b", re.IGNORECASE)),
    ("panel", re.compile(r"\bpanel-[A-Za-z0-9_-]+\b|侧滑|面板|panel\b", re.IGNORECASE)),
]

IDENTIFIER_PATTERNS = [
    re.compile(r"\b(modal-[A-Za-z0-9_-]+)\b", re.IGNORECASE),
    re.compile(r"\b(drawer-[A-Za-z0-9_-]+)\b", re.IGNORECASE),
    re.compile(r"\b(popover-[A-Za-z0-9_-]+)\b", re.IGNORECASE),
    re.compile(r"\b(panel-[A-Za-z0-9_-]+)\b", re.IGNORECASE),
    re.compile(r'\bid="([^"]*(?:modal|drawer|popover|panel|wizard)[^"]*)"', re.IGNORECASE),
]

AUTO_OPEN_PATTERNS = (r"auto-open", r"自动弹出", r"默认打开", r"提醒弹窗", r"onload")
ROUTE_PARAM_PATTERNS = (r"route-param", r"query", r"路由参数", r"详情弹窗", r"\?id=")
KEYBOARD_PATTERNS = (r"keyboard", r"esc", r"enter", r"快捷键", r"按键")

TEXT_EXTENSIONS = {".md", ".html", ".yaml", ".yml", ".txt"}
PLACEHOLDER_PATTERN = re.compile(r"\$\{([^}]+)\}")


@dataclass
class InventoryEntry:
    source_file: str
    line_no: int
    identifier: str
    surface_type: str
    trigger_mode: str
    coverage_status: str
    snippet: str
    source_truth: str


def _get_config_value(data: dict[str, Any], dotted_key: str) -> Any:
    current: Any = data
    for part in dotted_key.split("."):
        if not isinstance(current, dict) or part not in current:
            raise KeyError(dotted_key)
        current = current[part]
    return current


def _resolve_placeholders(value: str, data: dict[str, Any]) -> str:
    def repl(match: re.Match[str]) -> str:
        resolved = _get_config_value(data, match.group(1))
        if not isinstance(resolved, str):
            raise ValueError(f"config placeholder {match.group(1)} did not resolve to string")
        return resolved

    previous = value
    while True:
        resolved = PLACEHOLDER_PATTERN.sub(repl, previous)
        if resolved == previous:
            return resolved
        previous = resolved


def _load_project_config(config_path: Path) -> dict[str, Any]:
    if not config_path.exists():
        raise FileNotFoundError(f"missing project config: {config_path}")
    data = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise ValueError(f"invalid project config root: {config_path}")
    return data


def _load_truth_source(config_path: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    config = _load_project_config(config_path)
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


def _resolve_root(config: dict[str, Any], truth: dict[str, Any], cli_value: str | None, config_key: str) -> Path:
    if cli_value:
        return Path(cli_value)
    raw = truth["root"] if config_key == "truth_source.root" else _get_config_value(config, config_key)
    if not isinstance(raw, str):
        raise ValueError(f"{config_key} must resolve to string path")
    resolved = _resolve_placeholders(raw, config)
    return Path(resolved)


def infer_trigger_mode(snippet: str) -> str:
    lowered = snippet.lower()
    if any(re.search(pattern, lowered) for pattern in AUTO_OPEN_PATTERNS):
        return "auto-open"
    if any(re.search(pattern, lowered) for pattern in ROUTE_PARAM_PATTERNS):
        return "route-param"
    if any(re.search(pattern, lowered) for pattern in KEYBOARD_PATTERNS):
        return "keyboard"
    return "click"


def infer_identifier(line: str, line_no: int, surface_type: str) -> str:
    for pattern in IDENTIFIER_PATTERNS:
        match = pattern.search(line)
        if match:
            candidate = match.group(1).strip()
            return candidate.lower()
    normalized = re.sub(r"\s+", "-", line.strip())
    normalized = re.sub(r"[^A-Za-z0-9_\-\u4e00-\u9fff]+", "-", normalized).strip("-")
    normalized = normalized[:48] if normalized else f"{surface_type}-line-{line_no}"
    return f"{surface_type}-line-{line_no}-{normalized}".lower()


def iter_text_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    files: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part.startswith(".") and part not in {".", ".."} for part in path.parts):
            continue
        if path.suffix.lower() in TEXT_EXTENSIONS:
            files.append(path)
    return sorted(files)


def _prototype_root_exists(identifier: str, prototype_files: list[Path]) -> bool:
    marker = f'id="{identifier}"'
    for path in prototype_files:
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = path.read_text(encoding="utf-8", errors="ignore")
        if marker in text:
            return True
    return False


def _load_matrix_declared_ids(prd_root: Path) -> set[str]:
    result: set[str] = set()
    if not prd_root.exists():
        return result
    for matrix_path in sorted(prd_root.rglob("MATRIX.md")):
        text = matrix_path.read_text(encoding="utf-8")
        for match in ROW_PATTERN.finditer(text):
            result.add(match.group(1).strip().lower())
    return result


def scan_roots(roots: list[Path]) -> list[InventoryEntry]:
    entries: list[InventoryEntry] = []
    seen: set[tuple[str, int, str]] = set()
    prd_root = roots[0] if roots else Path()
    prototype_root = roots[2] if len(roots) > 2 else Path()
    matrix_declared_ids = _load_matrix_declared_ids(prd_root)
    prototype_files = sorted(prototype_root.rglob("*.html")) if prototype_root.exists() else []
    for root in roots:
        for path in iter_text_files(root):
            try:
                content = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                content = path.read_text(encoding="utf-8", errors="ignore")
            for line_no, line in enumerate(content.splitlines(), start=1):
                for surface_type, pattern in TOKEN_PATTERNS:
                    if not pattern.search(line):
                        continue
                    identifier = infer_identifier(line, line_no, surface_type)
                    source_truth = "not-applicable"
                    if identifier in matrix_declared_ids:
                        source_truth = (
                            "prototype-root-present"
                            if _prototype_root_exists(identifier, prototype_files)
                            else "prototype-root-missing"
                        )
                    coverage_status = "covered_by_generic_model"
                    if surface_type not in ALLOWED_SURFACE_TYPES:
                        coverage_status = "requires_model_extension"
                    elif source_truth == "prototype-root-missing":
                        coverage_status = "missing_prototype_root"
                    key = (str(path), line_no, identifier)
                    if key in seen:
                        continue
                    seen.add(key)
                    entries.append(
                        InventoryEntry(
                            source_file=str(path),
                            line_no=line_no,
                            identifier=identifier,
                            surface_type=surface_type,
                            trigger_mode=infer_trigger_mode(line),
                            coverage_status=coverage_status,
                            source_truth=source_truth,
                            snippet=line.strip(),
                        )
                    )
    entries.sort(key=lambda item: (item.source_file, item.line_no, item.identifier))
    return entries


def render_markdown(entries: list[InventoryEntry], roots: list[Path]) -> str:
    counts = Counter(entry.surface_type for entry in entries)
    uncovered = [entry for entry in entries if entry.coverage_status != "covered_by_generic_model"]
    lines = [
        "# Overlay Surface Inventory",
        "",
        "This artifact is generated by `bin/overlay-surface-inventory.py`.",
        "",
        "## Source Roots",
        "",
    ]
    lines.extend(f"- `{root}`" for root in roots)
    lines.extend(
        [
            "",
            "## Summary",
            "",
            f"- discovered_entries: `{len(entries)}`",
            f"- distinct_surface_types: `{len(counts)}`",
            f"- uncovered_entries: `{len(uncovered)}`",
            "",
            "### Surface Type Counts",
            "",
            "| surface_type | count |",
            "| --- | ---: |",
        ]
    )
    for surface_type in sorted(counts):
        lines.append(f"| `{surface_type}` | {counts[surface_type]} |")
    lines.extend(
        [
            "",
            "## Entries",
            "",
            "| source_file | line | identifier | surface_type | trigger_mode | source_truth | coverage_status | snippet |",
            "| --- | ---: | --- | --- | --- | --- | --- | --- |",
        ]
    )
    for entry in entries:
        snippet = entry.snippet.replace("|", "\\|")
        lines.append(
            f"| `{entry.source_file}` | {entry.line_no} | `{entry.identifier}` | "
            f"`{entry.surface_type}` | `{entry.trigger_mode}` | `{entry.source_truth}` | `{entry.coverage_status}` | {snippet} |"
        )
    if uncovered:
        lines.extend(["", "## Uncovered Patterns", ""])
        for entry in uncovered:
            lines.append(
                f"- `{entry.identifier}` from `{entry.source_file}:{entry.line_no}` requires model extension"
            )
    else:
        lines.extend(["", "## Uncovered Patterns", "", "- none"])
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Inventory overlay surfaces across repository sources.")
    parser.add_argument("--config", default=".claude/project/config.yaml")
    parser.add_argument("--prd-root")
    parser.add_argument("--srs-root")
    parser.add_argument("--prototype-root")
    parser.add_argument(
        "--output",
        default="osg-spec-docs/tasks/audit/overlay-surface-inventory-latest.md",
    )
    args = parser.parse_args()

    config, truth = _load_truth_source(Path(args.config))
    roots = [
        _resolve_root(config, truth, args.prd_root, "paths.docs.prd"),
        _resolve_root(config, truth, args.srs_root, "paths.docs.srs"),
        _resolve_root(config, truth, args.prototype_root, "truth_source.root"),
    ]
    entries = scan_roots(roots)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(render_markdown(entries, roots), encoding="utf-8")
    print(f"PASS: overlay-surface-inventory entries={len(entries)} output={output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
