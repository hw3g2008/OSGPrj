#!/usr/bin/env python3
"""Sync module-readiness.yaml based on current workflow state.

Called by transition() postcheck or manually after state changes.
Covers design doc §5.1 write points:
  1. /brainstorm success → not-ready projection
  2. /approve story → all_stories_done → hard_dependency_ready=true
  3. rollback/downgrade → hard_dependency_ready=false
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


def load_yaml(path: Path) -> Any:
    if not path.exists():
        return None
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def write_yaml(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sync_module_readiness(
    *,
    module: str,
    state_to: str,
    event_source: str,
    readiness_path: Path,
    srs_base: Path,
    prd_base: Path,
) -> dict[str, Any]:
    """Update module-readiness.yaml for the given module based on state_to.

    Returns the updated entry for the module.
    """
    registry = load_yaml(readiness_path) or {"modules": {}}
    if not isinstance(registry, dict):
        registry = {"modules": {}}
    modules = registry.setdefault("modules", {})
    entry = modules.setdefault(module, {})

    srs_path = f"{srs_base}/{module}.md"
    prd_path = f"{prd_base}/{module}/"

    if state_to == "brainstorm_done":
        # Write point 1: research projection (not ready)
        entry["delivery_state"] = "brainstorm_done"
        entry["hard_dependency_ready"] = False
        entry["srs_path"] = srs_path
        entry["prd_path"] = prd_path
        entry["updated_from_event"] = event_source
    elif state_to == "all_stories_done":
        # Write point 2: upgrade to hard_dependency_ready
        entry["delivery_state"] = "all_stories_done"
        entry["hard_dependency_ready"] = Path(srs_path).exists()
        entry["srs_path"] = srs_path
        entry["prd_path"] = prd_path
        entry["updated_from_event"] = event_source
    elif state_to in ("not_started", "brainstorm_pending_confirm"):
        # Write point 3: rollback/downgrade
        entry["delivery_state"] = state_to
        entry["hard_dependency_ready"] = False
        entry["updated_from_event"] = event_source
    else:
        # Other states: explicitly not ready
        entry["delivery_state"] = state_to
        entry["hard_dependency_ready"] = False
        entry["updated_from_event"] = event_source

    entry["last_updated_at"] = now_iso()
    write_yaml(readiness_path, registry)
    return entry


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync module-readiness.yaml")
    parser.add_argument("--module", required=True, help="Module name (e.g. permission)")
    parser.add_argument("--state-to", required=True, help="Target workflow state")
    parser.add_argument("--event-source", default="/transition", help="Event source command")
    parser.add_argument("--readiness", default="osg-spec-docs/tasks/module-readiness.yaml")
    parser.add_argument("--srs-base", default="osg-spec-docs/docs/02-requirements/srs")
    parser.add_argument("--prd-base", default="osg-spec-docs/docs/01-product/prd")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    entry = sync_module_readiness(
        module=args.module,
        state_to=args.state_to,
        event_source=args.event_source,
        readiness_path=Path(args.readiness),
        srs_base=Path(args.srs_base),
        prd_base=Path(args.prd_base),
    )
    ready = entry.get("hard_dependency_ready", False)
    print(f"{'READY' if ready else 'NOT_READY'}: sync-module-readiness module={args.module} state_to={args.state_to} hard_dependency_ready={ready}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
