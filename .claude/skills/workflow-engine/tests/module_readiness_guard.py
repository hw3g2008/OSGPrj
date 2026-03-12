#!/usr/bin/env python3
"""Guard: validate module-readiness.yaml schema and consistency with workflow state."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import yaml


VALID_DELIVERY_STATES = {
    "not_started", "brainstorm_done", "brainstorm_pending_confirm",
    "story_split_done", "stories_approved", "ticket_split_done",
    "tickets_approved", "implementing", "all_tickets_done",
    "story_verified", "verification_failed", "story_done",
    "story_approved", "all_stories_done",
}

TERMINAL_STATES = {"all_stories_done"}


def load_yaml(path: Path) -> Any:
    if not path.exists():
        raise FileNotFoundError(path)
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def evaluate_module_readiness(
    *,
    readiness_doc: Path,
    srs_base: Path | None = None,
) -> list[str]:
    findings: list[str] = []

    if not readiness_doc.exists():
        return ["module-readiness.yaml does not exist"]

    data = load_yaml(readiness_doc)
    if not isinstance(data, dict):
        return ["module-readiness.yaml root must be a mapping"]

    modules = data.get("modules")
    if not isinstance(modules, dict):
        return ["module-readiness.yaml must have a 'modules' mapping"]

    for module_name, entry in modules.items():
        prefix = f"modules.{module_name}"
        if not isinstance(entry, dict):
            findings.append(f"{prefix} must be a mapping")
            continue

        # Required fields
        delivery_state = entry.get("delivery_state")
        hard_ready = entry.get("hard_dependency_ready")
        srs_path = entry.get("srs_path")

        if not isinstance(delivery_state, str) or delivery_state not in VALID_DELIVERY_STATES:
            findings.append(f"{prefix}.delivery_state invalid: {delivery_state}")

        if not isinstance(hard_ready, bool):
            findings.append(f"{prefix}.hard_dependency_ready must be boolean, got {type(hard_ready).__name__}")

        # Consistency: hard_dependency_ready=true requires terminal state + srs_path exists
        if hard_ready is True:
            if delivery_state not in TERMINAL_STATES:
                findings.append(
                    f"{prefix} hard_dependency_ready=true but delivery_state={delivery_state} "
                    f"(must be one of {sorted(TERMINAL_STATES)})"
                )
            if not isinstance(srs_path, str) or not srs_path.strip():
                findings.append(f"{prefix} hard_dependency_ready=true but srs_path is missing")
            elif srs_base is not None:
                resolved = srs_base / srs_path if not Path(srs_path).is_absolute() else Path(srs_path)
                if not resolved.exists():
                    findings.append(f"{prefix} srs_path does not exist: {srs_path}")

    return findings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Module readiness guard")
    parser.add_argument("--readiness", default="osg-spec-docs/tasks/module-readiness.yaml")
    parser.add_argument("--srs-base", default=None, help="Base path to resolve srs_path (default: repo root)")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    readiness_doc = Path(args.readiness)
    srs_base = Path(args.srs_base) if args.srs_base else Path(".")

    findings = evaluate_module_readiness(
        readiness_doc=readiness_doc,
        srs_base=srs_base,
    )
    if findings:
        print(f"FAIL: module_readiness_guard readiness={readiness_doc}")
        for item in findings:
            print(f"  - {item}")
        return 1

    print(f"PASS: module_readiness_guard readiness={readiness_doc}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
