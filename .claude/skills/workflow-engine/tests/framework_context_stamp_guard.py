#!/usr/bin/env python3
"""Framework context stamp guard (fail-closed).

Purpose
-------
Make "don't forget to re-read framework" a hard gate.

- mode=check:
  - recompute a stable hash over key framework files
  - compare to saved stamp
  - if stamp missing or mismatch -> exit 1 (fail-closed)

- mode=update:
  - recompute hash
  - write stamp file (creating directories as needed)

Notes
-----
- This guard is intentionally repository-relative.
- It does NOT depend on project-specific paths besides the standard .claude/
  and osg-spec-docs/ tree that the framework already uses.

Stamp path (default):
  osg-spec-docs/tasks/audit/framework-context-stamp.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[4]

DEFAULT_STAMP_PATH = Path("osg-spec-docs/tasks/audit/framework-context-stamp.json")

# Keep this list tight and stable; add globs for sets.
INCLUDE_GLOBS: list[str] = [
    ".claude/CLAUDE.md",
    ".claude/project/config.yaml",
    ".claude/templates/*.yaml",
    ".claude/commands/*.md",
    ".claude/agents/*.md",
    ".claude/skills/*/SKILL.md",
    ".claude/skills/workflow-engine/state-machine.yaml",
    ".claude/skills/workflow-engine/references/*.md",
]

# Exclusions to keep stamp stable (avoid volatile generated artifacts inside .claude if any).
EXCLUDE_SUBSTRINGS: tuple[str, ...] = (
    # None currently; reserved.
)


@dataclass(frozen=True)
class Stamp:
    schema_version: str
    generated_at_utc: str
    algorithm: str
    root: str
    includes: list[str]
    file_count: int
    skills_count: int
    commands_count: int
    agents_count: int
    digest: str
    files: list[dict]


def now_utc_iso() -> str:
    # Avoid microseconds for stability.
    import datetime as _dt

    return (
        _dt.datetime.now(_dt.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def iter_paths(root: Path, patterns: Iterable[str]) -> list[Path]:
    out: list[Path] = []
    for pattern in patterns:
        matches = sorted(root.glob(pattern))
        out.extend([p for p in matches if p.is_file()])

    # Apply excludes
    if EXCLUDE_SUBSTRINGS:
        out = [
            p
            for p in out
            if not any(sub in p.as_posix() for sub in EXCLUDE_SUBSTRINGS)
        ]

    # Unique + stable order by posix path
    uniq: dict[str, Path] = {}
    for p in out:
        uniq[p.as_posix()] = p
    return [uniq[k] for k in sorted(uniq.keys())]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def compute_stamp(root: Path, stamp_path: Path) -> Stamp:
    files = iter_paths(root, INCLUDE_GLOBS)

    file_entries: list[dict] = []
    agg = hashlib.sha256()

    for p in files:
        rel = p.relative_to(root).as_posix()
        content = p.read_bytes()
        h = sha256_bytes(content)
        file_entries.append({"path": rel, "sha256": h, "bytes": len(content)})

        # Stable aggregate: path + NUL + sha
        agg.update(rel.encode("utf-8"))
        agg.update(b"\0")
        agg.update(h.encode("ascii"))
        agg.update(b"\n")

    skills_count = len(list((root / ".claude/skills").glob("*/SKILL.md")))
    commands_count = len(list((root / ".claude/commands").glob("*.md")))
    agents_count = len(list((root / ".claude/agents").glob("*.md")))

    return Stamp(
        schema_version="1.0",
        generated_at_utc=now_utc_iso(),
        algorithm="sha256(path+sha256)",
        root=str(root.as_posix()),
        includes=list(INCLUDE_GLOBS),
        file_count=len(files),
        skills_count=skills_count,
        commands_count=commands_count,
        agents_count=agents_count,
        digest=agg.hexdigest(),
        files=file_entries,
    )


def load_stamp(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def stamp_digest(stamp_obj: dict | None) -> str | None:
    if not isinstance(stamp_obj, dict):
        return None
    digest = stamp_obj.get("digest")
    return digest if isinstance(digest, str) and digest else None


def cmd_check(stamp_path: Path) -> int:
    expected = load_stamp(stamp_path)
    expected_digest = stamp_digest(expected)

    current = compute_stamp(REPO_ROOT, stamp_path)

    if not expected_digest:
        print(
            f"FAIL: framework context stamp missing or invalid: {stamp_path.as_posix()}"
        )
        print("HINT: run 'bash bin/framework-audit.sh' to regenerate stamp after passing audit")
        return 1

    if current.digest != expected_digest:
        print("FAIL: framework context stamp mismatch (fail-closed)")
        print(f"stamp_file={stamp_path.as_posix()}")
        print(f"expected_digest={expected_digest}")
        print(f"actual_digest={current.digest}")
        return 1

    print("PASS: framework context stamp matches")
    print(f"stamp_file={stamp_path.as_posix()}")
    print(f"digest={current.digest}")
    return 0


def cmd_update(stamp_path: Path) -> int:
    stamp = compute_stamp(REPO_ROOT, stamp_path)
    stamp_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "schema_version": stamp.schema_version,
        "generated_at_utc": stamp.generated_at_utc,
        "algorithm": stamp.algorithm,
        "root": stamp.root,
        "includes": stamp.includes,
        "file_count": stamp.file_count,
        "skills_count": stamp.skills_count,
        "commands_count": stamp.commands_count,
        "agents_count": stamp.agents_count,
        "digest": stamp.digest,
        "files": stamp.files,
    }
    stamp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("PASS: framework context stamp updated")
    print(f"stamp_file={stamp_path.as_posix()}")
    print(f"digest={stamp.digest}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        required=True,
        choices=("check", "update"),
        help="check=fail-closed compare, update=write stamp",
    )
    parser.add_argument(
        "--stamp",
        default=str(DEFAULT_STAMP_PATH),
        help="Path to stamp file (repo-relative)",
    )

    args = parser.parse_args()
    stamp_path = (REPO_ROOT / args.stamp).resolve()

    # Ensure stamp stays inside repo
    try:
        stamp_path.relative_to(REPO_ROOT)
    except ValueError:
        print(f"FAIL: stamp path must be inside repo: {stamp_path}")
        return 2

    if args.mode == "check":
        return cmd_check(stamp_path)
    return cmd_update(stamp_path)


if __name__ == "__main__":
    raise SystemExit(main())
