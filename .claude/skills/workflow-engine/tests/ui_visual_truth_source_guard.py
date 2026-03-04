#!/usr/bin/env python3
"""Guard: verify visual baseline manifest is generated from prototype truth source."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

import yaml


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def fail(msg: str) -> int:
    print(f"FAIL: {msg}")
    return 1


def load_manifest(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="UI visual truth source guard")
    parser.add_argument("--manifest", required=True, help="Path to ui-visual baseline manifest json")
    parser.add_argument("--contract", required=True, help="Path to UI-VISUAL-CONTRACT.yaml")
    parser.add_argument(
        "--prototype-root",
        default="osg-spec-docs/source/prototype",
        help="Prototype root directory containing prototype html files",
    )
    parser.add_argument(
        "--output-json",
        help="Optional summary output path",
    )
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    contract_path = Path(args.contract)
    prototype_root = Path(args.prototype_root)

    if not manifest_path.exists():
        return fail(f"manifest not found: {manifest_path}")
    if not contract_path.exists():
        return fail(f"contract not found: {contract_path}")
    if not prototype_root.exists():
        return fail(f"prototype root not found: {prototype_root}")

    try:
        manifest = load_manifest(manifest_path)
    except Exception as exc:  # noqa: BLE001
        return fail(f"manifest parse error: {exc}")

    try:
        contract = yaml.safe_load(contract_path.read_text(encoding="utf-8")) or {}
    except Exception as exc:  # noqa: BLE001
        return fail(f"contract parse error: {exc}")

    errors: list[str] = []

    if manifest.get("source") != "prototype":
        errors.append(f"manifest.source must be 'prototype', got '{manifest.get('source')}'")

    contract_hash = sha256_file(contract_path)
    if manifest.get("contract_sha256") != contract_hash:
        errors.append("contract_sha256 mismatch")

    pages = contract.get("pages") or []
    if not isinstance(pages, list) or not pages:
        errors.append("contract.pages missing or empty")
        pages = []

    expected_page_ids = {p.get("page_id") for p in pages if isinstance(p, dict)}
    manifest_pages = manifest.get("pages") or []
    if not isinstance(manifest_pages, list):
        errors.append("manifest.pages must be list")
        manifest_pages = []
    actual_page_ids = {p.get("page_id") for p in manifest_pages if isinstance(p, dict)}

    missing_pages = sorted(pid for pid in expected_page_ids if pid not in actual_page_ids)
    if missing_pages:
        errors.append(f"manifest missing page_id(s): {missing_pages}")

    expected_baseline_refs = {}
    expected_proto_files = set()
    for page in pages:
        if not isinstance(page, dict):
            continue
        pid = page.get("page_id")
        if isinstance(pid, str):
            expected_baseline_refs[pid] = page.get("baseline_ref")
        proto_file = page.get("prototype_file")
        if isinstance(proto_file, str) and proto_file:
            expected_proto_files.add(proto_file)

    for page in manifest_pages:
        if not isinstance(page, dict):
            continue
        pid = page.get("page_id")
        if not isinstance(pid, str):
            continue
        expected_ref = expected_baseline_refs.get(pid)
        if page.get("baseline_ref") != expected_ref:
            errors.append(f"baseline_ref mismatch for page_id={pid}")

    proto_hashes = manifest.get("prototype_files") or []
    if not isinstance(proto_hashes, list):
        errors.append("manifest.prototype_files must be list")
        proto_hashes = []
    proto_map = {}
    for item in proto_hashes:
        if not isinstance(item, dict):
            continue
        file_name = item.get("file")
        file_hash = item.get("sha256")
        if isinstance(file_name, str):
            proto_map[file_name] = file_hash

    missing_proto = sorted(f for f in expected_proto_files if f not in proto_map)
    if missing_proto:
        errors.append(f"manifest missing prototype file hash for: {missing_proto}")

    for file_name in sorted(expected_proto_files):
        proto_path = prototype_root / file_name
        if not proto_path.exists():
            errors.append(f"prototype file missing: {proto_path}")
            continue
        actual_hash = sha256_file(proto_path)
        if proto_map.get(file_name) != actual_hash:
            errors.append(f"prototype hash mismatch: {file_name}")

    fingerprint_rows = []
    for file_name in sorted(expected_proto_files):
        row_hash = proto_map.get(file_name)
        if isinstance(row_hash, str):
            fingerprint_rows.append(f"{file_name}:{row_hash}")
    prototype_sha256 = sha256_text("\n".join(fingerprint_rows)) if fingerprint_rows else ""
    manifest_prototype_sha256 = manifest.get("prototype_sha256")
    if isinstance(manifest_prototype_sha256, str) and manifest_prototype_sha256:
        if manifest_prototype_sha256 != prototype_sha256:
            errors.append("manifest.prototype_sha256 mismatch")

    summary = {
        "manifest": str(manifest_path),
        "contract": str(contract_path),
        "source": manifest.get("source"),
        "module": manifest.get("module"),
        "pages_expected": len(expected_page_ids),
        "pages_manifest": len(actual_page_ids),
        "prototype_files_expected": len(expected_proto_files),
        "prototype_files_manifest": len(proto_map),
        "contract_sha256": contract_hash,
        "prototype_sha256": prototype_sha256,
        "errors": errors,
    }

    if args.output_json:
        out = Path(args.output_json)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    if errors:
        print("FAIL: ui_visual_truth_source_guard")
        for err in errors:
            print(f"  - {err}")
        return 1

    print(
        "PASS: ui_visual_truth_source_guard "
        f"source={summary['source']} "
        f"manifest_ref={summary['manifest']} "
        f"contract_sha256={summary['contract_sha256']} "
        f"prototype_sha256={summary['prototype_sha256']}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
