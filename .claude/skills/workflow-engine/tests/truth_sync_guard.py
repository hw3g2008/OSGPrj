#!/usr/bin/env python3
"""Guard: confirmed UI truth changes must be synchronized back into HTML before workflow proceeds."""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Any

import yaml


DECISION_HEADER_RE = re.compile(r"(?m)^##\s+(DEC-\d+)\s*$")
FIELD_RE = re.compile(r"^\s*-\s*(?:\*\*)?([^:*]+?)(?:\*\*)?\s*:\s*(.+?)\s*$")

FIELD_ALIASES = {
    "状态": "status",
    "已应用": "applied",
    "来源": "source",
    "类型": "type",
    "ui_truth_change": "ui_truth_change",
    "prototype_synced": "prototype_synced",
    "truth_scope": "truth_scope",
    "truth_artifact_ids": "truth_artifact_ids",
    "prototype_files": "prototype_files",
    "sync_note": "sync_note",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Truth sync guard")
    parser.add_argument("--module", required=True, help="Module name, e.g. permission")
    parser.add_argument(
        "--repo-root",
        default=".",
        help="Repository root used to resolve config and decisions paths",
    )
    parser.add_argument(
        "--config",
        default=None,
        help="Optional explicit path to .claude/project/config.yaml",
    )
    parser.add_argument(
        "--decisions-path",
        default=None,
        help="Optional explicit decisions markdown path",
    )
    return parser.parse_args()


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


def split_records(content: str) -> list[tuple[str, str]]:
    matches = list(DECISION_HEADER_RE.finditer(content))
    records: list[tuple[str, str]] = []
    for i, current in enumerate(matches):
        start = current.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        records.append((current.group(1), content[start:end]))
    return records


def normalize_field_name(name: str) -> str | None:
    key = name.strip()
    return FIELD_ALIASES.get(key)


def parse_field_value(raw: str) -> Any:
    raw = raw.strip()
    try:
        return yaml.safe_load(raw)
    except Exception:
        return raw


def parse_record_fields(body: str) -> dict[str, Any]:
    fields: dict[str, Any] = {}
    for line in body.splitlines():
        match = FIELD_RE.match(line)
        if not match:
            continue
        field_name = normalize_field_name(match.group(1))
        if not field_name:
            continue
        fields[field_name] = parse_field_value(match.group(2))
    return fields


def resolve_config_path(repo_root: Path, config_path: Path | None) -> Path:
    path = config_path or (repo_root / ".claude/project/config.yaml")
    if not path.exists():
        raise FileNotFoundError(f"config not found: {path}")
    return path


def resolve_decisions_path(
    module: str,
    repo_root: Path,
    config: dict[str, Any],
    explicit_path: Path | None,
) -> Path | None:
    if explicit_path is not None:
        return explicit_path if explicit_path.exists() else None

    docs_paths = config.get("paths", {}).get("docs", {})
    candidates: list[Path] = []
    srs_dir = docs_paths.get("srs")
    if isinstance(srs_dir, str):
        candidates.append(repo_root / resolve_placeholders(srs_dir, config) / f"{module}-DECISIONS.md")
    prd_dir = docs_paths.get("prd")
    if isinstance(prd_dir, str):
        candidates.append(repo_root / resolve_placeholders(prd_dir, config) / module / "DECISIONS.md")

    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def _require_truth_sync_config(config: dict[str, Any]) -> dict[str, Any]:
    prd_process = config.get("prd_process")
    if not isinstance(prd_process, dict):
        raise ValueError("prd_process must be mapping")
    truth_sync = prd_process.get("truth_sync")
    if not isinstance(truth_sync, dict):
        raise ValueError("prd_process.truth_sync must be mapping")
    if truth_sync.get("enabled") is not True:
        raise ValueError("prd_process.truth_sync.enabled must be true")
    required_fields = truth_sync.get("required_decision_fields")
    if not isinstance(required_fields, list) or not required_fields:
        raise ValueError("prd_process.truth_sync.required_decision_fields must be non-empty list")
    enforced = truth_sync.get("enforced_entrypoints")
    if not isinstance(enforced, list) or not enforced:
        raise ValueError("prd_process.truth_sync.enforced_entrypoints must be non-empty list")
    return truth_sync


def _format_artifact_refs(fields: dict[str, Any]) -> str:
    refs = fields.get("truth_artifact_ids")
    if isinstance(refs, list) and refs:
        return ",".join(str(item) for item in refs)
    if isinstance(refs, str) and refs.strip():
        return refs.strip()
    files = fields.get("prototype_files")
    if isinstance(files, list) and files:
        return ",".join(str(item) for item in files)
    if isinstance(files, str) and files.strip():
        return files.strip()
    return "-"


def evaluate_truth_sync(
    module: str,
    repo_root: Path,
    config_path: Path | None = None,
    decisions_path: Path | None = None,
) -> tuple[list[str], dict[str, Any]]:
    config_file = resolve_config_path(repo_root, config_path)
    config = load_yaml(config_file)
    truth_sync = _require_truth_sync_config(config)
    required_fields = [str(item) for item in truth_sync["required_decision_fields"]]

    decisions_file = resolve_decisions_path(module, repo_root, config, decisions_path)
    if decisions_file is None:
        return [], {
            "module": module,
            "decisions_path": None,
            "records": 0,
            "ui_truth_records": 0,
            "blocking_decisions": 0,
        }

    content = decisions_file.read_text(encoding="utf-8")
    records = split_records(content)
    findings: list[str] = []
    ui_truth_records = 0
    blocking_decisions = 0

    for dec_id, body in records:
        fields = parse_record_fields(body)
        status = str(fields.get("status", "")).lower()
        ui_truth_change = fields.get("ui_truth_change")
        if not isinstance(ui_truth_change, bool) or not ui_truth_change:
            continue
        ui_truth_records += 1
        if status != "resolved":
            continue

        for field_name in required_fields:
            if field_name not in fields:
                findings.append(f"{dec_id}: missing_required_field={field_name}")
        if any(item.startswith(f"{dec_id}: missing_required_field=") for item in findings):
            blocking_decisions += 1
            continue

        prototype_synced = fields.get("prototype_synced")
        if prototype_synced is not True:
            blocking_decisions += 1
            artifact_refs = _format_artifact_refs(fields)
            findings.append(
                f"{dec_id}: prototype_synced=false artifacts={artifact_refs}"
            )

    summary = {
        "module": module,
        "decisions_path": str(decisions_file),
        "records": len(records),
        "ui_truth_records": ui_truth_records,
        "blocking_decisions": blocking_decisions,
    }
    return findings, summary


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()
    config_path = Path(args.config).resolve() if args.config else None
    decisions_path = Path(args.decisions_path).resolve() if args.decisions_path else None

    findings, summary = evaluate_truth_sync(
        module=args.module,
        repo_root=repo_root,
        config_path=config_path,
        decisions_path=decisions_path,
    )
    if findings:
        print(
            "FAIL: truth_sync_guard "
            f"module={summary['module']} path={summary['decisions_path']} "
            f"ui_truth_records={summary['ui_truth_records']} blocking_decisions={summary['blocking_decisions']}"
        )
        for item in findings:
            print(f"  - {item}")
        return 1

    print(
        "PASS: truth_sync_guard "
        f"module={summary['module']} path={summary['decisions_path']} "
        f"records={summary['records']} ui_truth_records={summary['ui_truth_records']} "
        f"blocking_decisions={summary['blocking_decisions']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
