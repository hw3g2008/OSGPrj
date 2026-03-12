#!/usr/bin/env python3
"""Guard: verify frontend write-API declarations have matching backend controller mappings."""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Any

import yaml

FRAMEWORK_HANDLED_WRITE_APIS = {
    ("POST", "logout"),
}


# --- Frontend parsing ---

# Match: http.post('/path', ...) or http.put('/path', ...) or http.delete('/path', ...)
# Also handles template literals: http.put(`/path/${id}`, ...)
FRONTEND_WRITE_RE = re.compile(
    r"""http\.(post|put|delete)\s*[\(<]\s*['"`]([^'"`]+)['"`]""",
    re.IGNORECASE,
)


def normalize_path(path: str) -> str:
    """Normalize a URL path for comparison.
    - Strip leading/trailing slashes
    - Replace template literal expressions like ${id} with {param}
    - Lowercase
    """
    path = re.sub(r"\$\{[^}]+\}", "{param}", path)
    path = path.strip("/").lower()
    return path


def parse_frontend_apis(api_dirs: list[Path], api_files: list[Path] | None = None) -> set[tuple[str, str]]:
    """Parse frontend write API declarations from TypeScript files.
    Returns set of (METHOD, normalized_path) tuples.
    """
    results: set[tuple[str, str]] = set()
    files_to_scan: list[Path] = []
    if api_files:
        files_to_scan.extend(path for path in api_files if path.exists())
    else:
        for api_dir in api_dirs:
            if not api_dir.exists():
                continue
            files_to_scan.extend(sorted(api_dir.rglob("*.ts")))
    for ts_file in files_to_scan:
        content = ts_file.read_text(encoding="utf-8")
        for match in FRONTEND_WRITE_RE.finditer(content):
            method = match.group(1).upper()
            path = normalize_path(match.group(2))
            if path:
                results.add((method, path))
    return results


# --- Backend parsing ---

# Match: @PostMapping("/path") or @PutMapping or @DeleteMapping("/{id}")
# Group 1: method (Post|Put|Delete)
# Group 2: optional path (may be empty for no-arg annotations)
BACKEND_MAPPING_WITH_PATH_RE = re.compile(
    r"""@(Post|Put|Delete)Mapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']""",
    re.IGNORECASE,
)
# Match annotations without path: @PostMapping or @PostMapping()
BACKEND_MAPPING_NO_PATH_RE = re.compile(
    r"""@(Post|Put|Delete)Mapping\s*(?:\(\s*\))?\s*$""",
    re.IGNORECASE | re.MULTILINE,
)

# Match: class-level @RequestMapping("/prefix")
CLASS_REQUEST_MAPPING_RE = re.compile(
    r"""@RequestMapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']""",
    re.IGNORECASE,
)

# Match: path variable like {id} or {roleId}
PATH_VAR_RE = re.compile(r"\{[^}]+\}")


def parse_backend_apis(controller_dirs: list[Path]) -> set[tuple[str, str]]:
    """Parse backend controller write API mappings from Java files.
    Returns set of (METHOD, normalized_path) tuples.
    """
    results: set[tuple[str, str]] = set()
    for ctrl_dir in controller_dirs:
        if not ctrl_dir.exists():
            continue
        for java_file in sorted(ctrl_dir.rglob("*Controller.java")):
            content = java_file.read_text(encoding="utf-8")

            # Extract class-level prefix
            class_prefix = ""
            class_match = CLASS_REQUEST_MAPPING_RE.search(content)
            if class_match:
                class_prefix = class_match.group(1).strip("/")

            # Annotations with explicit path
            for match in BACKEND_MAPPING_WITH_PATH_RE.finditer(content):
                method = match.group(1).upper()
                raw_path = match.group(2).strip().strip("\"'")
                for single_path in raw_path.split(","):
                    single_path = single_path.strip().strip("\"'").strip()
                    if not single_path:
                        continue
                    full_path = f"{class_prefix}/{single_path.lstrip('/')}".strip("/")
                    full_path = PATH_VAR_RE.sub("{param}", full_path)
                    normalized = normalize_path(full_path)
                    if normalized:
                        results.add((method, normalized))

            # Annotations without path (inherit class prefix)
            for match in BACKEND_MAPPING_NO_PATH_RE.finditer(content):
                method = match.group(1).upper()
                if class_prefix:
                    normalized = normalize_path(class_prefix)
                    if normalized:
                        results.add((method, normalized))
    return results


# --- Comparison ---

def find_parity_gaps(
    frontend_apis: set[tuple[str, str]],
    backend_apis: set[tuple[str, str]],
) -> list[str]:
    """Find frontend write APIs that have no matching backend mapping."""
    findings: list[str] = []

    # Build backend lookup with path-variable tolerance
    backend_patterns: list[tuple[str, str, re.Pattern]] = []
    for method, path in backend_apis:
        # Convert {param} to regex wildcard for flexible matching
        regex_str = re.escape(path).replace(re.escape("{param}"), "[^/]+")
        pattern = re.compile(f"^{regex_str}$")
        backend_patterns.append((method, path, pattern))

    for method, fe_path in sorted(frontend_apis):
        if (method, fe_path) in FRAMEWORK_HANDLED_WRITE_APIS:
            continue
        # Direct match
        if (method, fe_path) in backend_apis:
            continue
        # Flexible match (path variable tolerance)
        fe_normalized = fe_path.replace("{param}", "__PLACEHOLDER__")
        matched = False
        for be_method, be_path, be_pattern in backend_patterns:
            if be_method != method:
                continue
            if be_pattern.match(fe_path):
                matched = True
                break
            # Also try matching frontend param against backend param
            fe_regex_str = re.escape(fe_path).replace(re.escape("{param}"), "[^/]+")
            fe_pattern = re.compile(f"^{fe_regex_str}$")
            if fe_pattern.match(be_path):
                matched = True
                break
        if not matched:
            findings.append(
                f"frontend declares {method} /{fe_path} but no matching backend controller mapping found"
            )

    return findings


def resolve_module_frontend_files(
    *,
    project_root: Path,
    module: str,
    story_id: str | None = None,
) -> list[Path]:
    cases_doc = project_root / "osg-spec-docs" / "tasks" / "testing" / f"{module}-test-cases.yaml"
    tickets_dir = project_root / "osg-spec-docs" / "tasks" / "tickets"
    if not cases_doc.exists() or not tickets_dir.exists():
        return []

    cases = yaml.safe_load(cases_doc.read_text(encoding="utf-8")) or []
    if not isinstance(cases, list):
        return []

    ticket_ids: set[str] = set()
    for case in cases:
        if not isinstance(case, dict):
            continue
        if case.get("level") != "ticket":
            continue
        if story_id and case.get("story_id") != story_id:
            continue
        ticket_id = case.get("ticket_id")
        if isinstance(ticket_id, str) and ticket_id:
            ticket_ids.add(ticket_id)

    api_files: set[Path] = set()
    for ticket_id in ticket_ids:
        ticket_path = tickets_dir / f"{ticket_id}.yaml"
        if not ticket_path.exists():
            continue
        ticket = yaml.safe_load(ticket_path.read_text(encoding="utf-8")) or {}
        allowed_paths = ticket.get("allowed_paths") if isinstance(ticket, dict) else {}
        if not isinstance(allowed_paths, dict):
            continue
        for bucket in ("modify", "read"):
            for raw_path in allowed_paths.get(bucket) or []:
                if not isinstance(raw_path, str):
                    continue
                if "/src/api/" not in raw_path or not raw_path.endswith(".ts"):
                    continue
                resolved = project_root / raw_path
                if resolved.exists():
                    api_files.add(resolved)

    return sorted(api_files)


def load_config(config_path: Path) -> dict[str, Any]:
    if not config_path.exists():
        return {}
    return yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}


def resolve_scan_paths(config: dict[str, Any], project_root: Path) -> tuple[list[Path], list[Path]]:
    """Resolve frontend API dirs and backend controller dirs from config."""
    paths = config.get("paths", {})

    # Frontend: shared API path + module-local API dirs
    frontend_api_path = paths.get("frontend", {}).get("api", "")
    frontend_dirs: list[Path] = []
    if frontend_api_path:
        resolved = project_root / frontend_api_path
        if resolved.exists():
            frontend_dirs.append(resolved)
    # Also scan module-local API dirs
    packages_dir = project_root / "osg-frontend" / "packages"
    if packages_dir.exists():
        for pkg in sorted(packages_dir.iterdir()):
            api_dir = pkg / "src" / "api"
            if api_dir.exists() and api_dir not in frontend_dirs:
                frontend_dirs.append(api_dir)

    # Backend: controllers path
    backend_ctrl_path = paths.get("backend", {}).get("controllers", "")
    backend_dirs: list[Path] = []
    if backend_ctrl_path:
        # Handle glob patterns like "ruoyi-admin/src/main/java/**/controller/"
        base = backend_ctrl_path.split("*")[0].rstrip("/")
        resolved = project_root / base
        if resolved.exists():
            backend_dirs.append(resolved)
    if not backend_dirs:
        # Fallback: scan ruoyi-admin for Controller files
        fallback = project_root / "ruoyi-admin" / "src" / "main" / "java"
        if fallback.exists():
            backend_dirs.append(fallback)

    return frontend_dirs, backend_dirs


def evaluate_api_parity(
    *,
    frontend_dirs: list[Path],
    backend_dirs: list[Path],
    frontend_files: list[Path] | None = None,
    write_only: bool = True,
) -> list[str]:
    """Main evaluation entry point."""
    frontend_apis = parse_frontend_apis(frontend_dirs, api_files=frontend_files)
    backend_apis = parse_backend_apis(backend_dirs)

    if write_only:
        # Only check POST/PUT/DELETE, not GET
        frontend_apis = {(m, p) for m, p in frontend_apis if m in ("POST", "PUT", "DELETE")}

    return find_parity_gaps(frontend_apis, backend_apis)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="API operation parity guard")
    parser.add_argument("--module", default="permission")
    parser.add_argument("--story-id")
    parser.add_argument("--config", default=".claude/project/config.yaml")
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--frontend-dir", action="append", default=[],
                        help="Override frontend API directory (can specify multiple)")
    parser.add_argument("--backend-dir", action="append", default=[],
                        help="Override backend controller directory (can specify multiple)")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    project_root = Path(args.project_root).resolve()
    config = load_config(Path(args.config))

    if args.frontend_dir and args.backend_dir:
        frontend_dirs = [Path(d) for d in args.frontend_dir]
        backend_dirs = [Path(d) for d in args.backend_dir]
    else:
        frontend_dirs, backend_dirs = resolve_scan_paths(config, project_root)

    frontend_files = resolve_module_frontend_files(
        project_root=project_root,
        module=args.module,
        story_id=args.story_id,
    )

    missing_dirs = [str(d) for d in frontend_dirs + backend_dirs if not d.exists()]
    if missing_dirs:
        print("FAIL: api_operation_parity_guard missing directory(s)")
        for d in missing_dirs:
            print(f"  - {d}")
        return 1

    findings = evaluate_api_parity(
        frontend_dirs=frontend_dirs,
        backend_dirs=backend_dirs,
        frontend_files=frontend_files or None,
    )

    if findings:
        print(
            f"FAIL: api_operation_parity_guard module={args.module} "
            f"story_id={args.story_id or 'ALL'}"
        )
        for item in findings:
            print(f"  - {item}")
        return 1

    print(
        f"PASS: api_operation_parity_guard module={args.module} "
        f"story_id={args.story_id or 'ALL'} "
        f"frontend_dirs={[str(d) for d in frontend_dirs]} "
        f"backend_dirs={[str(d) for d in backend_dirs]}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
