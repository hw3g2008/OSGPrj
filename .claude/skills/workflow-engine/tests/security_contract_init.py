#!/usr/bin/env python3
"""
Security contract initializer for Spring Boot + Vue projects.
"""

from __future__ import annotations

import argparse
import copy
import fnmatch
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

from security_contract_schema import load_yaml, validate_contract

PROJECT_ROOT = Path(__file__).resolve().parents[4]

HTTP_METHOD_BY_ANN = {
    "Get": "GET",
    "Post": "POST",
    "Put": "PUT",
    "Delete": "DELETE",
    "Patch": "PATCH",
}
AUTH_SURFACE_EXACT = {"/login", "/register", "/captchaImage", "/logout"}
AUTH_SURFACE_PREFIXES = ("/system/password/",)
AUTO_RESOLVED_ENDPOINTS = {
    ("POST", "/login"),
    ("POST", "/register"),
    ("GET", "/captchaImage"),
}


def _extract_first_quoted(text: str) -> str:
    m = re.search(r'"([^"]+)"', text)
    if m:
        return m.group(1).strip()
    return ""


def _join_paths(base: str, child: str) -> str:
    base = (base or "").strip()
    child = (child or "").strip()
    if not base:
        base = "/"
    if not child:
        return base if base.startswith("/") else f"/{base}"
    if not base.startswith("/"):
        base = f"/{base}"
    if not child.startswith("/"):
        child = f"/{child}"
    full = f"{base.rstrip('/')}{child}"
    return full or "/"


def _endpoint_id(method: str, path: str) -> str:
    slug = path.strip("/").replace("/", "_").replace("-", "_")
    if not slug:
        slug = "root"
    return f"{method.lower()}_{slug}"


def _is_security_candidate(path: str, auth_mode: str) -> bool:
    if path in AUTH_SURFACE_EXACT:
        return True
    if any(path.startswith(prefix) for prefix in AUTH_SURFACE_PREFIXES):
        return True
    return False


def _iter_controller_files(repo_root: Path) -> list[Path]:
    base = repo_root / "ruoyi-admin/src/main/java"
    if not base.exists():
        return []
    return sorted(p for p in base.rglob("*Controller.java") if p.is_file())


def parse_security_permit_all_patterns(repo_root: Path) -> list[str]:
    path = repo_root / "ruoyi-framework/src/main/java/com/ruoyi/framework/config/SecurityConfig.java"
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    patterns: list[str] = []
    for match in re.finditer(r"requestMatchers\((.*?)\)\s*\.permitAll\(\)", text, re.S):
        body = match.group(1)
        for token in re.findall(r'"([^"]+)"', body):
            if token.startswith("/"):
                patterns.append(token.strip())
    return sorted(set(patterns))


def _is_permit_all(path: str, patterns: list[str]) -> bool:
    for pattern in patterns:
        wildcard = pattern.replace("**", "*")
        if fnmatch.fnmatch(path, wildcard):
            return True
    return False


def parse_frontend_api_refs(repo_root: Path) -> set[tuple[str, str]]:
    refs: set[tuple[str, str]] = set()
    base = repo_root / "osg-frontend/packages"
    if not base.exists():
        return refs

    for path in sorted(base.rglob("src/api/**/*.ts")):
        text = path.read_text(encoding="utf-8")
        for block in re.finditer(r"\{[^{}]*url\s*:\s*['\"]([^'\"]+)['\"][^{}]*\}", text, re.S):
            body = block.group(0)
            url = block.group(1).strip()
            method_m = re.search(r"method\s*:\s*['\"]([a-zA-Z]+)['\"]", body)
            method = method_m.group(1).upper() if method_m else "GET"
            refs.add((method, url))
    return refs


def parse_controller_endpoints(
    controller_file: Path,
    permit_all_patterns: list[str],
    frontend_refs: set[tuple[str, str]],
    repo_root: Path,
) -> list[dict[str, Any]]:
    text = controller_file.read_text(encoding="utf-8")
    lines = text.splitlines()
    class_mapping = "/"
    class_mapping_match = re.search(
        r"@RequestMapping\((?P<body>[^)]*)\)\s*public\s+class",
        text,
        re.S,
    )
    if class_mapping_match:
        class_mapping = _extract_first_quoted(class_mapping_match.group("body")) or "/"

    class_decl_index = next((i for i, line in enumerate(lines) if "class " in line), len(lines))
    class_anonymous = any("@Anonymous" in lines[i] for i in range(max(0, class_decl_index - 10), class_decl_index))

    endpoints: list[dict[str, Any]] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        mapping_start = re.search(r"@(?P<ann>(Get|Post|Put|Delete|Patch|Request)Mapping)\s*\(", line)
        if not mapping_start:
            i += 1
            continue

        annotation_text = line.strip()
        while ")" not in lines[i] and i + 1 < len(lines):
            i += 1
            annotation_text += " " + lines[i].strip()

        ann_name = mapping_start.group("ann")
        forward_window = "\n".join(lines[i + 1 : min(len(lines), i + 6)])
        if "class " in forward_window:
            i += 1
            continue

        method = "GET"
        if ann_name.startswith("Request"):
            req_method = re.search(r"RequestMethod\.([A-Z]+)", annotation_text)
            if req_method:
                method = req_method.group(1).upper()
        else:
            method = HTTP_METHOD_BY_ANN.get(ann_name.replace("Mapping", ""), "GET")

        child_path = _extract_first_quoted(annotation_text)
        full_path = _join_paths(class_mapping, child_path)

        window_start = max(0, i - 8)
        window = "\n".join(lines[window_start : i + 1])
        method_anonymous = "@Anonymous" in window
        method_rate_limited = "@RateLimiter" in window

        auth_mode = "authenticated"
        if class_anonymous or method_anonymous or _is_permit_all(full_path, permit_all_patterns):
            auth_mode = "anonymous"
        if not _is_security_candidate(full_path, auth_mode):
            i += 1
            continue

        rel_controller = controller_file.relative_to(repo_root).as_posix()
        endpoint = {
            "id": _endpoint_id(method, full_path),
            "method": method,
            "path": full_path,
            "auth_mode": auth_mode,
            "rate_limit": {"required": bool(method_rate_limited)},
            "anti_enumeration": {"required": False, "response_policy": "generic_msg"},
            "source": {
                "backend_controller": rel_controller,
                "detected_auth_mode": auth_mode,
                "detected_rate_limit": bool(method_rate_limited),
                "frontend_referenced": (method, full_path) in frontend_refs,
            },
            "status": "active",
            "decision_required": True,
        }
        endpoints.append(endpoint)
        i += 1

    return endpoints


def discover_endpoints(repo_root: Path) -> list[dict[str, Any]]:
    permit_all_patterns = parse_security_permit_all_patterns(repo_root)
    frontend_refs = parse_frontend_api_refs(repo_root)

    discovered: dict[tuple[str, str], dict[str, Any]] = {}
    for controller_file in _iter_controller_files(repo_root):
        for endpoint in parse_controller_endpoints(controller_file, permit_all_patterns, frontend_refs, repo_root):
            key = (endpoint["method"], endpoint["path"])
            if key not in discovered:
                discovered[key] = endpoint

    return [discovered[key] for key in sorted(discovered.keys())]


def _load_existing_contract(contract_path: Path) -> dict[str, Any]:
    if contract_path.exists():
        data = load_yaml(contract_path)
        if not isinstance(data, dict):
            raise ValueError("existing contract is not a mapping")
        return data
    return {
        "schema_version": 1,
        "project_type": "springboot-vue",
        "contract_version": datetime.now(timezone.utc).strftime("%Y-%m-%d.1"),
        "generated_by": "security_contract_init",
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "endpoints": [],
    }


def merge_contract(existing: dict[str, Any], discovered: list[dict[str, Any]]) -> dict[str, Any]:
    merged = copy.deepcopy(existing)
    existing_eps = merged.get("endpoints") if isinstance(merged.get("endpoints"), list) else []
    endpoint_map: dict[tuple[str, str], dict[str, Any]] = {}
    discovered_keys = {(item["method"], item["path"]) for item in discovered}

    for item in existing_eps:
        if not isinstance(item, dict):
            continue
        key = (str(item.get("method", "")).upper(), str(item.get("path", "")))
        if not key[0] or not key[1]:
            continue
        # Prune stale unresolved entries that are no longer discovered in current scope.
        if key not in discovered_keys and item.get("decision_required") is not False:
            continue
        if key in AUTO_RESOLVED_ENDPOINTS:
            item["decision_required"] = False
        endpoint_map[key] = item

    for item in discovered:
        key = (item["method"], item["path"])
        if key in endpoint_map:
            current = endpoint_map[key]
            source = current.get("source")
            if not isinstance(source, dict):
                source = {}
                current["source"] = source
            source["backend_controller"] = item["source"]["backend_controller"]
            source["detected_auth_mode"] = item["source"]["detected_auth_mode"]
            source["detected_rate_limit"] = item["source"]["detected_rate_limit"]
            source["frontend_referenced"] = item["source"]["frontend_referenced"]
            if key in AUTO_RESOLVED_ENDPOINTS:
                current["decision_required"] = False
            continue

        if key in AUTO_RESOLVED_ENDPOINTS:
            item["decision_required"] = False
        endpoint_map[key] = item

    merged["schema_version"] = 1
    merged["project_type"] = "springboot-vue"
    merged["generated_by"] = "security_contract_init"
    merged["generated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    merged["endpoints"] = [endpoint_map[key] for key in sorted(endpoint_map.keys())]
    return merged


def write_contract(path: Path, contract: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        yaml.safe_dump(contract, f, allow_unicode=True, sort_keys=False)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Init/sync security contract")
    parser.add_argument("--mode", choices=["sync"], default="sync")
    parser.add_argument("--repo-root", type=Path, default=PROJECT_ROOT)
    parser.add_argument("--contract", type=Path, default=Path("contracts/security-contract.yaml"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = args.repo_root.resolve()
    contract_path = args.contract if args.contract.is_absolute() else repo_root / args.contract

    existing = _load_existing_contract(contract_path)
    discovered = discover_endpoints(repo_root)
    merged = merge_contract(existing, discovered)

    issues = validate_contract(merged)
    if issues:
        print(f"FAIL: merged contract invalid ({len(issues)} issue(s))")
        for item in issues:
            print(f"  - {item}")
        return 1

    write_contract(contract_path, merged)
    print(
        "PASS: security contract synced "
        f"(discovered={len(discovered)}, total={len(merged.get('endpoints', []))})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
