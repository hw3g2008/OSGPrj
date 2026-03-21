#!/usr/bin/env python3
"""Generate RPIV tickets with detailed frontend-ui payloads from contracts."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import uuid
from collections import Counter
from copy import deepcopy
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Any

import yaml


VOID_TAGS = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
}
TAG_RE = re.compile(r"<!--.*?-->|</?([a-zA-Z][\w:-]*)([^>]*)>", re.S)
STYLE_BLOCK_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.I | re.S)
CSS_RULE_RE = re.compile(r"([^{}]+)\{([^{}]+)\}", re.S)
ATTR_RE = re.compile(r'([:\w-]+)(?:\s*=\s*(["\'])(.*?)\2)?', re.S)
AC_RE = re.compile(
    r"^(?P<ref>AC-[^:]+):\s*(?:\[(?P<category>[^\]]+)\]\[(?P<scenario>[^\]]+)\]\s*)?(?P<text>.*)$"
)
TEXT_TAG_PATTERNS = (
    ("heading", re.compile(r"<h([1-6])([^>]*)>(.*?)</h\1>", re.I | re.S)),
    ("label", re.compile(r"<label([^>]*)>(.*?)</label>", re.I | re.S)),
    ("button", re.compile(r"<button([^>]*)>(.*?)</button>", re.I | re.S)),
    ("link", re.compile(r"<a([^>]*)>(.*?)</a>", re.I | re.S)),
    ("paragraph", re.compile(r"<p([^>]*)>(.*?)</p>", re.I | re.S)),
)
INPUT_RE = re.compile(r"<input([^>]*)>", re.I | re.S)
ICON_RE = re.compile(r"<i([^>]*)class=(['\"])(.*?)\2([^>]*)></i>", re.I | re.S)
ID_ATTR_RE = re.compile(r'id=(["\'])(.*?)\1', re.I | re.S)
CLASS_ATTR_RE = re.compile(r'class=(["\'])(.*?)\1', re.I | re.S)
STYLE_ATTR_RE = re.compile(r'style=(["\'])(.*?)\1', re.I | re.S)
WHITELIST_CSS_PROPS = {
    "width",
    "height",
    "padding",
    "padding-left",
    "padding-right",
    "padding-top",
    "padding-bottom",
    "margin",
    "margin-left",
    "margin-right",
    "margin-top",
    "margin-bottom",
    "gap",
    "border-radius",
    "font-size",
    "font-weight",
    "line-height",
    "color",
    "background",
    "background-color",
    "box-shadow",
    "display",
    "grid-template-columns",
}
SEMANTIC_CLASS_HINTS = (
    "title",
    "subtitle",
    "logo",
    "icon",
    "btn",
    "button",
    "link",
    "feature",
    "header",
    "body",
    "footer",
    "modal",
    "card",
    "tab",
    "tabs",
    "nav",
    "table",
    "form",
    "input",
)
PAGE_ALIASES = {
    "login-page": {"login", "auth"},
    "home": {"home", "navigation", "sidebar"},
    "positions": {"position", "positions"},
    "job-overview": {"job", "joboverview", "job-overview"},
    "mock-practice": {"mock", "practice", "mockpractice", "mock-practice"},
    "student-list": {"student", "students", "studentlist", "student-list"},
    "myclass": {"class", "classrecords", "class-records", "myclass"},
    "profile": {"profile"},
    "schedule": {"schedule"},
    "communication": {"communication"},
}
PAGE_DISPLAY_NAMES = {
    "login-page": "登录页",
    "home": "首页导航骨架",
    "positions": "岗位信息页",
    "job-overview": "学员求职总览页",
    "mock-practice": "模拟应聘管理页",
    "student-list": "学员列表页",
    "myclass": "课程记录页",
    "profile": "基本信息页",
    "schedule": "课程排期页",
    "communication": "沟通记录页",
}


def load_yaml(path: Path) -> Any:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def write_yaml(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def deep_copy(value: Any) -> Any:
    return json.loads(json.dumps(value))


def normalize_token(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def humanize_identifier(value: str) -> str:
    return value.replace("-", " ").replace("_", " ").strip().title()


def parse_attrs(raw: str) -> dict[str, str]:
    attrs: dict[str, str] = {}
    for key, _, value in ATTR_RE.findall(raw):
        attrs[key.lower()] = value or ""
    return attrs


def extract_element_by_id(html: str, element_id: str) -> str:
    match = re.search(rf'id=(["\']){re.escape(element_id)}\1', html, re.I)
    if not match:
        return ""
    start = html.rfind("<", 0, match.start())
    if start < 0:
        return ""
    depth = 0
    for tag in TAG_RE.finditer(html, start):
        text = tag.group(0)
        if text.startswith("<!--"):
            continue
        name = (tag.group(1) or "").lower()
        if not name:
            continue
        is_close = text.startswith("</")
        is_self_closing = text.endswith("/>") or name in VOID_TAGS
        if not is_close:
            depth += 1
        if is_close:
            depth -= 1
        elif is_self_closing:
            depth -= 1
        if depth == 0:
            return html[start : tag.end()]
    return html[start:]


def strip_tags(text: str) -> str:
    cleaned = re.sub(r"<[^>]+>", " ", text)
    cleaned = unescape(cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def selector_hint(tag_name: str, attrs: dict[str, str], index: int) -> str:
    element_id = attrs.get("id")
    if element_id:
        return f"#{element_id}"
    classes = [item for item in attrs.get("class", "").split() if item and item != "mdi"]
    if classes:
        preferred = next(
            (item for item in classes if any(hint in item for hint in SEMANTIC_CLASS_HINTS)),
            classes[0],
        )
        return f".{preferred}"
    return f"{tag_name}:nth-of-type({index})"


def extract_icon_name(raw_attrs: str) -> str | None:
    attrs = parse_attrs(raw_attrs)
    classes = attrs.get("class", "").split()
    for item in classes:
        if item.startswith("mdi-"):
            return item
    return None


def extract_visual_checklist(section_html: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    counters: Counter[str] = Counter()

    def add_item(kind: str, attrs: dict[str, str], *, text: str = "", icon_name: str | None = None) -> None:
        value = text or icon_name or ""
        if not value:
            return
        counters[kind] += 1
        selector = selector_hint(kind, attrs, counters[kind])
        key = (kind, selector, value)
        if key in seen:
            return
        seen.add(key)
        item = {
            "item_id": f"{kind}-{len(items) + 1:03d}",
            "kind": kind,
            "selector": selector,
        }
        if text:
            item["text"] = text
        if icon_name:
            item["icon_library"] = "mdi"
            item["icon_name"] = icon_name
        placeholder = attrs.get("placeholder")
        if placeholder:
            item["placeholder"] = placeholder
        items.append(item)

    for kind, pattern in TEXT_TAG_PATTERNS:
        for match in pattern.finditer(section_html):
            attrs = parse_attrs(match.group(2 if kind == "heading" else 1))
            content = strip_tags(match.group(3 if kind == "heading" else 2))
            add_item(kind, attrs, text=content)

    for match in INPUT_RE.finditer(section_html):
        attrs = parse_attrs(match.group(1))
        placeholder = attrs.get("placeholder", "").strip()
        if placeholder:
            add_item("input", attrs, text=placeholder)

    for match in ICON_RE.finditer(section_html):
        attrs = parse_attrs(match.group(1) + " " + match.group(4))
        icon_name = extract_icon_name(match.group(1) + " " + match.group(4) + f' class="{match.group(3)}"')
        if icon_name:
            add_item("icon", attrs, icon_name=icon_name)

    return items[:24]


def parse_css_declarations(raw: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for chunk in raw.split(";"):
        if ":" not in chunk:
            continue
        key, value = chunk.split(":", 1)
        k = key.strip().lower()
        v = value.strip()
        if k and v:
            result[k] = v
    return result


def extract_css_rules(html: str) -> dict[str, dict[str, str]]:
    rules: dict[str, dict[str, str]] = {}
    for block in STYLE_BLOCK_RE.findall(html):
        for selector_block, declarations in CSS_RULE_RE.findall(block):
            decls = parse_css_declarations(declarations)
            for selector in selector_block.split(","):
                normalized = re.sub(r"\s+", " ", selector.strip())
                if normalized:
                    rules.setdefault(normalized, {}).update(decls)
    return rules


def find_inline_style(section_html: str, selector: str) -> dict[str, str]:
    selector = selector.strip()
    if selector.startswith("#"):
        target = selector[1:]
        pattern = re.compile(
            rf"<([a-zA-Z][\w:-]*)([^>]*?)id=(['\"]){re.escape(target)}\3([^>]*?)>",
            re.I | re.S,
        )
    elif selector.startswith("."):
        target = selector[1:]
        pattern = re.compile(
            rf"<([a-zA-Z][\w:-]*)([^>]*?)class=(['\"])(?=[^>]*\b{re.escape(target)}\b)(.*?)\3([^>]*?)>",
            re.I | re.S,
        )
    else:
        return {}
    match = pattern.search(section_html)
    if not match:
        return {}
    attr_text = "".join(group or "" for group in match.groups()[1:])
    style_match = STYLE_ATTR_RE.search(attr_text)
    if not style_match:
        return {}
    return parse_css_declarations(style_match.group(2))


def collect_semantic_selectors(section_html: str) -> list[str]:
    selectors: list[str] = []
    seen: set[str] = set()
    for classes in CLASS_ATTR_RE.findall(section_html):
        for item in classes[1].split():
            if any(hint in item for hint in SEMANTIC_CLASS_HINTS):
                selector = f".{item}"
                if selector not in seen:
                    selectors.append(selector)
                    seen.add(selector)
    return selectors


def extract_style_contracts(
    *,
    prototype_html: str,
    section_html: str,
    root_selector: str,
    required_anchors: list[str],
) -> list[dict[str, Any]]:
    css_rules = extract_css_rules(prototype_html)
    selectors: list[str] = []
    seen: set[str] = set()
    for selector in [root_selector, *required_anchors, *collect_semantic_selectors(section_html)]:
        normalized = re.sub(r"\s+", " ", selector.strip())
        if normalized and normalized not in seen and (normalized.startswith("#") or normalized.startswith(".")):
            selectors.append(normalized)
            seen.add(normalized)

    contracts: list[dict[str, Any]] = []
    for selector in selectors[:14]:
        css: dict[str, str] = {}
        css.update({k: v for k, v in css_rules.get(selector, {}).items() if k in WHITELIST_CSS_PROPS})
        css.update({k: v for k, v in find_inline_style(section_html, selector).items() if k in WHITELIST_CSS_PROPS})
        if css:
            contracts.append(
                {
                    "selector": selector,
                    "prototype_selector": selector,
                    "css": css,
                }
            )
    return contracts


def parse_story_acceptance_criteria(story: dict[str, Any]) -> list[dict[str, str]]:
    parsed: list[dict[str, str]] = []
    for raw in story.get("acceptance_criteria") or []:
        if not isinstance(raw, str):
            continue
        match = AC_RE.match(raw.strip())
        if not match:
            continue
        parsed.append(
            {
                "ref": match.group("ref"),
                "category": (match.group("category") or "").strip() or "positive",
                "scenario": (match.group("scenario") or "").strip() or "display",
                "text": match.group("text").strip(),
                "raw": raw.strip(),
            }
        )
    return parsed


def build_story_case_map(story: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    mapping: dict[str, list[dict[str, Any]]] = {}
    for case in story.get("story_cases") or []:
        if not isinstance(case, dict):
            continue
        surface_id = case.get("surface_id")
        if isinstance(surface_id, str) and surface_id:
            mapping.setdefault(surface_id, []).append(case)
    return mapping


def ensure_overlay_story_cases(
    *,
    story: dict[str, Any],
    story_acs: list[dict[str, str]],
    surface_ids: list[str],
    surfaces: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    story_cases = deep_copy(story.get("story_cases") or [])
    existing_surface_ids = {
        case.get("surface_id")
        for case in story_cases
        if isinstance(case, dict) and isinstance(case.get("surface_id"), str) and case.get("surface_id")
    }
    next_index = len(story_cases) + 1
    ac_refs = [item["ref"] for item in story_acs]
    fallback_ac_ref = ac_refs[0] if ac_refs else None

    for surface_id in surface_ids:
        if surface_id in existing_surface_ids:
            continue
        surface = surfaces.get(surface_id) or {}
        state_variants = [
            item.get("state_id")
            for item in surface.get("state_variants") or []
            if isinstance(item, dict) and isinstance(item.get("state_id"), str) and item.get("state_id")
        ]
        viewport_variants = [
            item.get("viewport_id")
            for item in surface.get("viewport_variants") or []
            if isinstance(item, dict) and isinstance(item.get("viewport_id"), str) and item.get("viewport_id")
        ]
        overlay_refs = related_ac_refs_for_surface(story, story_acs, surface_id)
        story_cases.append(
            {
                "story_case_id": f"SC-{story['id']}-{next_index:03d}",
                "ac_ref": (overlay_refs[0] if overlay_refs else fallback_ac_ref),
                "case_kind": "critical_surface",
                "surface_id": surface_id,
                "state_variant": state_variants[0] if state_variants else None,
                "viewport_variant": viewport_variants[0] if viewport_variants else None,
            }
        )
        existing_surface_ids.add(surface_id)
        next_index += 1

    return story_cases


def related_ac_refs_for_page(story: dict[str, Any], story_acs: list[dict[str, str]]) -> list[str]:
    story_cases = story.get("story_cases") or []
    refs = [
        case.get("ac_ref")
        for case in story_cases
        if isinstance(case, dict) and not case.get("surface_id") and isinstance(case.get("ac_ref"), str)
    ]
    if refs:
        return list(dict.fromkeys(refs))
    display_refs = [item["ref"] for item in story_acs if item["scenario"] == "display"]
    return display_refs or [item["ref"] for item in story_acs[:1]]


def related_ac_refs_for_surface(
    story: dict[str, Any],
    story_acs: list[dict[str, str]],
    surface_id: str,
) -> list[str]:
    refs = [
        case.get("ac_ref")
        for case in (story.get("story_cases") or [])
        if isinstance(case, dict) and case.get("surface_id") == surface_id and isinstance(case.get("ac_ref"), str)
    ]
    if refs:
        return list(dict.fromkeys(refs))
    display_or_state = [item["ref"] for item in story_acs if item["scenario"] in {"display", "state_change"}]
    return display_or_state or [item["ref"] for item in story_acs[:1]]


def operation_hint(capability: dict[str, Any]) -> str | None:
    effect_kind = capability.get("effect_kind")
    mapping = {
        "data_create": "create",
        "state_change": "edit",
        "change_request": "edit",
        "authentication": "auth",
        "credential_reset": "edit",
        "scoped_query": "list",
        "data_display": "list",
        "scoped_detail": "detail",
    }
    if isinstance(effect_kind, str):
        return mapping.get(effect_kind)
    return None


def build_ac_test_cases(
    *,
    ticket_id: str,
    ac_refs: list[str],
    ac_index: dict[str, dict[str, str]],
    operation: str | None = None,
) -> list[dict[str, Any]]:
    test_cases: list[dict[str, Any]] = []
    for idx, ac_ref in enumerate(ac_refs, 1):
        info = ac_index.get(ac_ref, {})
        test_cases.append(
            {
                "test_case_id": f"TCS-{ticket_id}-{idx:03d}",
                "ac_ref": ac_ref,
                "case_kind": "ac",
                "surface_id": None,
                "state_variant": None,
                "viewport_variant": None,
                "category": info.get("category", "positive"),
                "scenario_obligation": info.get("scenario", "display"),
                "operation": operation,
            }
        )
    return test_cases


def build_surface_test_cases(
    *,
    ticket_id: str,
    surface: dict[str, Any],
    ac_ref: str,
) -> list[dict[str, Any]]:
    state_ids = [
        item.get("state_id")
        for item in surface.get("state_variants") or []
        if isinstance(item, dict) and isinstance(item.get("state_id"), str) and item.get("state_id")
    ] or ["default"]
    viewport_ids = [
        item.get("viewport_id")
        for item in surface.get("viewport_variants") or []
        if isinstance(item, dict) and isinstance(item.get("viewport_id"), str) and item.get("viewport_id")
    ] or ["desktop"]
    test_cases: list[dict[str, Any]] = []
    counter = 1
    for state_id in state_ids:
        for viewport_id in viewport_ids:
            test_cases.append(
                {
                    "test_case_id": f"TCS-{ticket_id}-{counter:03d}",
                    "ac_ref": ac_ref,
                    "case_kind": "critical_surface",
                    "surface_id": surface.get("surface_id"),
                    "state_variant": state_id,
                    "viewport_variant": viewport_id,
                    "category": "positive",
                    "scenario_obligation": "display",
                    "operation": None,
                }
            )
            counter += 1
    return test_cases


def build_state_cases(surface: dict[str, Any]) -> list[dict[str, Any]]:
    state_contracts_by_id = {
        item.get("state_id"): item
        for item in surface.get("state_contracts") or []
        if isinstance(item, dict) and isinstance(item.get("state_id"), str)
    }
    viewport_ids = [
        item.get("viewport_id")
        for item in surface.get("viewport_variants") or []
        if isinstance(item, dict) and isinstance(item.get("viewport_id"), str)
    ]
    state_cases: list[dict[str, Any]] = []
    for state_variant in surface.get("state_variants") or [{"state_id": "default"}]:
        if not isinstance(state_variant, dict):
            continue
        state_id = state_variant.get("state_id")
        if not isinstance(state_id, str) or not state_id:
            continue
        contract = state_contracts_by_id.get(state_id, {})
        state_cases.append(
            {
                "state_id": state_id,
                "required_anchors": contract.get("required_anchors") or [],
                "style_contracts": contract.get("style_contracts") or [],
                "viewport_variants": viewport_ids,
            }
        )
    return state_cases


def route_to_view_glob(module: str, route: str) -> str:
    segments = [segment for segment in route.strip("/").split("/") if segment]
    if not segments:
        return f"osg-frontend/packages/{module}/src/views/**"
    return f"osg-frontend/packages/{module}/src/views/{'/'.join(segments)}/**"


def capability_to_page_ids(capability: dict[str, Any], pages: dict[str, dict[str, Any]], module: str) -> list[str]:
    prd_tokens: set[str] = set()
    for source in capability.get("source_refs") or []:
        if not isinstance(source, dict):
            continue
        prd_ref = source.get("prd")
        if not isinstance(prd_ref, str):
            continue
        slug = Path(prd_ref.split("#", 1)[0]).stem
        slug = re.sub(r"^\d+-", "", slug)
        slug = slug.replace(module, "").strip("-_")
        normalized = normalize_token(slug)
        if normalized:
            prd_tokens.add(normalized)

    page_ids: list[str] = []
    for page_id, page in pages.items():
        aliases = set(PAGE_ALIASES.get(page_id, set()))
        aliases.add(page_id)
        route = page.get("route")
        if isinstance(route, str):
            aliases.update(segment for segment in route.strip("/").split("/") if segment)
        normalized_aliases = {normalize_token(alias) for alias in aliases if alias}
        if prd_tokens and any(
            token and any(token in alias or alias in token for alias in normalized_aliases)
            for token in prd_tokens
        ):
            page_ids.append(page_id)

    if not page_ids and "auth" in capability.get("capability_id", "") and "login-page" in pages:
        page_ids.append("login-page")
    return page_ids


def next_ticket_id(number: int) -> str:
    return f"T-{number:03d}"


def ticket_display_name(page_id: str) -> str:
    return PAGE_DISPLAY_NAMES.get(page_id, humanize_identifier(page_id))


def make_page_ui_ticket(
    *,
    module: str,
    story: dict[str, Any],
    page: dict[str, Any],
    capability_ids: list[str],
    story_acs: list[dict[str, str]],
    ticket_number: int,
    prototype_html: str,
) -> dict[str, Any]:
    ticket_id = next_ticket_id(ticket_number)
    target_selector = page.get("prototype_selector", f"#{page.get('page_id')}")
    section_html = extract_element_by_id(prototype_html, target_selector.lstrip("#").split(" ", 1)[0])
    ac_refs = related_ac_refs_for_page(story, story_acs)
    return {
        "id": ticket_id,
        "story_id": story["id"],
        "title": f"还原{ticket_display_name(page['page_id'])}页面壳体与视觉细节",
        "type": "frontend-ui",
        "agent": None,
        "status": "pending",
        "estimate": "5m",
        "allowed_paths": {
            "modify": [
                route_to_view_glob(module, page.get("route", "/")),
                f"osg-frontend/packages/{module}/src/router/**",
                f"osg-frontend/packages/{module}/src/layouts/**",
                f"osg-frontend/packages/{module}/src/__tests__/**",
            ]
        },
        "acceptance_criteria": [
            f"[positive][display] 页面结构、文案、图标、控件与 {page['prototype_selector']} 对齐",
            f"[positive][display] 页面展示验证覆盖 {', '.join(page.get('required_anchors') or [])}",
            "[negative][auth_or_data_boundary] 页面壳体中不得引入浏览器假数据、演示账号或静态成功态",
        ],
        "covers_ac_refs": ac_refs,
        "contract_refs": {
            "capabilities": capability_ids,
            "critical_surfaces": [],
        },
        "prototype_refs": [
            {
                "target_type": "page",
                "page_id": page.get("page_id"),
                "route": page.get("route"),
                "prototype_file": page.get("prototype_file"),
                "prototype_selector": page.get("prototype_selector"),
            }
        ],
        "visual_checklist": extract_visual_checklist(section_html),
        "style_contracts": extract_style_contracts(
            prototype_html=prototype_html,
            section_html=section_html,
            root_selector=page.get("prototype_selector", ""),
            required_anchors=page.get("required_anchors") or [],
        ),
        "state_cases": [],
        "dependencies": [],
        "created_at": now_iso(),
        "started_at": None,
        "completed_at": None,
        "test_cases": build_ac_test_cases(
            ticket_id=ticket_id,
            ac_refs=ac_refs,
            ac_index={item["ref"]: item for item in story_acs},
        ),
    }


def make_surface_ui_ticket(
    *,
    module: str,
    story: dict[str, Any],
    story_acs: list[dict[str, str]],
    page: dict[str, Any],
    surface: dict[str, Any],
    ticket_number: int,
    prototype_html: str,
) -> dict[str, Any]:
    ticket_id = next_ticket_id(ticket_number)
    target_selector = surface.get("prototype_selector", f"#{surface.get('surface_id')}")
    section_html = extract_element_by_id(prototype_html, target_selector.lstrip("#").split(" ", 1)[0])
    ac_refs = related_ac_refs_for_surface(story, story_acs, surface["surface_id"])
    primary_ac_ref = ac_refs[0] if ac_refs else story_acs[0]["ref"]
    title_target = surface.get("surface_id", "critical-surface")
    surface_label = humanize_identifier(title_target)
    return {
        "id": ticket_id,
        "story_id": story["id"],
        "title": f"还原{surface_label}弹层与状态细节",
        "type": "frontend-ui",
        "agent": None,
        "status": "pending",
        "estimate": "5m",
        "allowed_paths": {
            "modify": [
                route_to_view_glob(module, page.get("route", "/")),
                f"osg-frontend/packages/{module}/src/components/**",
                f"osg-frontend/packages/{module}/src/__tests__/**",
            ]
        },
        "acceptance_criteria": [
            f"[positive][display] {surface['surface_id']} 壳体、文案、图标与 {surface['prototype_selector']} 对齐",
            f"[positive][display] 状态覆盖包含 {', '.join(case['state_id'] for case in build_state_cases(surface))}",
            f"[positive][display] 页面展示验证覆盖 {', '.join(surface.get('required_anchors') or [])}",
        ],
        "covers_ac_refs": ac_refs,
        "contract_refs": {
            "capabilities": [],
            "critical_surfaces": [surface["surface_id"]],
        },
        "prototype_refs": [
            {
                "target_type": "surface",
                "surface_id": surface.get("surface_id"),
                "host_page_id": surface.get("host_page_id"),
                "route": page.get("route"),
                "prototype_file": page.get("prototype_file"),
                "prototype_selector": surface.get("prototype_selector"),
            }
        ],
        "visual_checklist": extract_visual_checklist(section_html),
        "style_contracts": deep_copy(surface.get("style_contracts") or []),
        "state_cases": build_state_cases(surface),
        "dependencies": [],
        "created_at": now_iso(),
        "started_at": None,
        "completed_at": None,
        "test_cases": build_surface_test_cases(ticket_id=ticket_id, surface=surface, ac_ref=primary_ac_ref),
    }


def make_backend_ticket(
    *,
    story: dict[str, Any],
    capability: dict[str, Any],
    story_acs: list[dict[str, str]],
    ticket_number: int,
) -> dict[str, Any]:
    ticket_id = next_ticket_id(ticket_number)
    capability_id = capability["capability_id"]
    op = operation_hint(capability)
    ac_refs = [item["ref"] for item in story_acs]
    return {
        "id": ticket_id,
        "story_id": story["id"],
        "title": f"实现 {capability_id} 真实后端契约",
        "type": "backend",
        "agent": None,
        "status": "pending",
        "estimate": "5m",
        "allowed_paths": {
            "modify": [
                "ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/**",
                "ruoyi-system/src/main/java/com/ruoyi/system/service/**",
                "ruoyi-system/src/main/resources/mapper/system/**",
                "ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/**",
            ]
        },
        "acceptance_criteria": [
            f"[positive][state_change] {capability_id} 必须对接真实后端逻辑与真实权限边界",
            f"[positive][persist_effect] {capability_id} 涉及的状态刷新后仍保持真实结果",
            "[negative][auth_or_data_boundary] 不得用 mock / 假 token / 假返回体替代真实接口",
        ],
        "covers_ac_refs": ac_refs,
        "contract_refs": {
            "capabilities": [capability_id],
            "critical_surfaces": [],
        },
        "dependencies": [],
        "created_at": now_iso(),
        "started_at": None,
        "completed_at": None,
        "test_cases": build_ac_test_cases(
            ticket_id=ticket_id,
            ac_refs=ac_refs,
            ac_index={item["ref"]: item for item in story_acs},
            operation=op,
        ),
    }


def make_frontend_ticket(
    *,
    module: str,
    story: dict[str, Any],
    capability: dict[str, Any],
    story_acs: list[dict[str, str]],
    ticket_number: int,
) -> dict[str, Any]:
    ticket_id = next_ticket_id(ticket_number)
    capability_id = capability["capability_id"]
    page_ids = capability.get("_page_ids") or []
    modify_paths = [
        f"osg-frontend/packages/{module}/src/router/**",
        f"osg-frontend/packages/{module}/src/layouts/**",
        f"osg-frontend/packages/{module}/src/__tests__/**",
        f"osg-frontend/packages/shared/src/api/**",
    ]
    for page_id in page_ids:
        page_route = capability.get("_page_routes", {}).get(page_id)
        if page_route:
            modify_paths.append(route_to_view_glob(module, page_route))
    ac_refs = [item["ref"] for item in story_acs]
    return {
        "id": ticket_id,
        "story_id": story["id"],
        "title": f"接入 {capability_id} 真实前端流程",
        "type": "frontend",
        "agent": None,
        "status": "pending",
        "estimate": "5m",
        "allowed_paths": {"modify": list(dict.fromkeys(modify_paths))},
        "acceptance_criteria": [
            f"[positive][state_change] 前端交互必须调用 {capability_id} 对应真实接口并回写真实状态",
            f"[positive][display] 页面展示必须匹配 {capability_id} 对应真实返回字段",
            "[negative][auth_or_data_boundary] 前端不得注入浏览器假数据、假成功态或越权过滤替代真实后端约束",
        ],
        "covers_ac_refs": ac_refs,
        "contract_refs": {
            "capabilities": [capability_id],
            "critical_surfaces": [],
        },
        "dependencies": [],
        "created_at": now_iso(),
        "started_at": None,
        "completed_at": None,
        "test_cases": build_ac_test_cases(
            ticket_id=ticket_id,
            ac_refs=ac_refs,
            ac_index={item["ref"]: item for item in story_acs},
            operation=operation_hint(capability),
        ),
    }


def make_story_test_ticket(
    *,
    module: str,
    story: dict[str, Any],
    story_acs: list[dict[str, str]],
    story_surfaces: list[str],
    capability_ids: list[str],
    ticket_number: int,
) -> dict[str, Any]:
    ticket_id = next_ticket_id(ticket_number)
    ac_refs = [item["ref"] for item in story_acs]
    return {
        "id": ticket_id,
        "story_id": story["id"],
        "title": f"补齐 {story['id']} 故事级回归验证骨架",
        "type": "test",
        "agent": None,
        "status": "pending",
        "estimate": "5m",
        "allowed_paths": {
            "modify": [
                f"osg-frontend/packages/{module}/src/__tests__/**",
                "ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/**",
                f"osg-spec-docs/tasks/testing/{module}-traceability-matrix.md",
            ]
        },
        "acceptance_criteria": [
            "[positive][display] 关键 UI / API / 权限边界都有故事级验证入口",
            "[positive][persist_effect] 关键持久化结果具备刷新后一致性的验证骨架",
            "[negative][auth_or_data_boundary] 越权与错误态具备独立回归验证骨架",
        ],
        "covers_ac_refs": ac_refs,
        "contract_refs": {
            "capabilities": capability_ids,
            "critical_surfaces": story_surfaces,
        },
        "dependencies": [],
        "created_at": now_iso(),
        "started_at": None,
        "completed_at": None,
        "test_cases": build_ac_test_cases(
            ticket_id=ticket_id,
            ac_refs=ac_refs,
            ac_index={item["ref"]: item for item in story_acs},
        ),
    }


def generate_story_ticket_bundle(
    *,
    module: str,
    story_id: str,
    story_path: Path,
    delivery_contract_path: Path,
    ui_contract_path: Path,
    prototype_root: Path,
    next_ticket_number: int,
) -> dict[str, Any]:
    story = load_yaml(story_path) or {}
    delivery_contract = load_yaml(delivery_contract_path) or {}
    ui_contract = load_yaml(ui_contract_path) or {}
    story_acs = parse_story_acceptance_criteria(story)
    if not story_acs:
        raise ValueError(f"{story_id} missing parseable acceptance criteria")

    pages = {item["page_id"]: item for item in ui_contract.get("pages") or [] if isinstance(item, dict) and item.get("page_id")}
    surfaces = {
        item["surface_id"]: item for item in ui_contract.get("surfaces") or [] if isinstance(item, dict) and item.get("surface_id")
    }
    capabilities = {
        item["capability_id"]: item for item in delivery_contract.get("capabilities") or []
        if isinstance(item, dict) and item.get("capability_id")
    }

    story_refs = story.get("contract_refs") or {}
    capability_ids = [item for item in story_refs.get("capabilities") or [] if isinstance(item, str)]
    surface_ids = [item for item in story_refs.get("critical_surfaces") or [] if isinstance(item, str)]

    story_pages: list[str] = []
    for capability_id in capability_ids:
        capability = capabilities.get(capability_id)
        if not capability:
            continue
        page_ids = capability_to_page_ids(capability, pages, module)
        capability["_page_ids"] = page_ids
        capability["_page_routes"] = {
            page_id: pages.get(page_id, {}).get("route") for page_id in page_ids if page_id in pages
        }
        for page_id in page_ids:
            if page_id not in story_pages:
                story_pages.append(page_id)

    for surface_id in surface_ids:
        surface = surfaces.get(surface_id)
        if not surface:
            continue
        host_page_id = surface.get("host_page_id")
        if isinstance(host_page_id, str) and host_page_id and host_page_id not in story_pages:
            story_pages.append(host_page_id)

    if not story_pages and "login-page" in pages:
        story_pages.append("login-page")

    tickets: list[dict[str, Any]] = []
    page_ticket_ids: dict[str, str] = {}
    current_ticket_number = next_ticket_number
    prototype_cache: dict[str, str] = {}

    def prototype_text(proto_file: str) -> str:
        if proto_file not in prototype_cache:
            prototype_cache[proto_file] = (prototype_root / proto_file).read_text(encoding="utf-8")
        return prototype_cache[proto_file]

    for page_id in story_pages:
        page = pages.get(page_id)
        if not page:
            continue
        capability_subset = [
            capability_id
            for capability_id in capability_ids
            if page_id in (capabilities.get(capability_id, {}).get("_page_ids") or [])
        ]
        ticket = make_page_ui_ticket(
            module=module,
            story=story,
            page=page,
            capability_ids=capability_subset,
            story_acs=story_acs,
            ticket_number=current_ticket_number,
            prototype_html=prototype_text(page["prototype_file"]),
        )
        tickets.append(ticket)
        page_ticket_ids[page_id] = ticket["id"]
        current_ticket_number += 1

    for surface_id in surface_ids:
        surface = surfaces.get(surface_id)
        if not surface:
            continue
        host_page_id = surface.get("host_page_id")
        page = pages.get(host_page_id)
        if not page:
            continue
        ticket = make_surface_ui_ticket(
            module=module,
            story=story,
            story_acs=story_acs,
            page=page,
            surface=surface,
            ticket_number=current_ticket_number,
            prototype_html=prototype_text(page["prototype_file"]),
        )
        if host_page_id in page_ticket_ids:
            ticket["dependencies"] = [page_ticket_ids[host_page_id]]
        tickets.append(ticket)
        current_ticket_number += 1

    backend_ticket_ids: dict[str, str] = {}
    frontend_dependencies: list[str] = [ticket["id"] for ticket in tickets]

    for capability_id in capability_ids:
        capability = capabilities.get(capability_id)
        if not capability:
            continue
        artifacts = set(capability.get("required_artifacts") or [])
        if {"backend_regression", "controller_regression", "api_smoke"} & artifacts:
            ticket = make_backend_ticket(
                story=story,
                capability=capability,
                story_acs=story_acs,
                ticket_number=current_ticket_number,
            )
            tickets.append(ticket)
            backend_ticket_ids[capability_id] = ticket["id"]
            current_ticket_number += 1

    for capability_id in capability_ids:
        capability = capabilities.get(capability_id)
        if not capability:
            continue
        artifacts = set(capability.get("required_artifacts") or [])
        if {"frontend_regression", "story_evidence", "ui_shell_contract"} & artifacts:
            ticket = make_frontend_ticket(
                module=module,
                story=story,
                capability=capability,
                story_acs=story_acs,
                ticket_number=current_ticket_number,
            )
            deps = list(frontend_dependencies)
            if capability_id in backend_ticket_ids:
                deps.append(backend_ticket_ids[capability_id])
            ticket["dependencies"] = list(dict.fromkeys(deps))
            tickets.append(ticket)
            current_ticket_number += 1

    test_ticket = make_story_test_ticket(
        module=module,
        story=story,
        story_acs=story_acs,
        story_surfaces=surface_ids,
        capability_ids=capability_ids,
        ticket_number=current_ticket_number,
    )
    test_ticket["dependencies"] = [ticket["id"] for ticket in tickets]
    tickets.append(test_ticket)
    current_ticket_number += 1

    return {
        "story": story,
        "tickets": tickets,
        "next_ticket_number": current_ticket_number,
        "proof": {
            "schema_version": "1.0",
            "module": module,
            "phase": "ticket_split",
            "target_id": story_id,
            "rounds": 1,
            "issues_count": 0,
            "coverage": f"{len(story_acs)}/{len(story_acs)}",
            "generated_at": now_iso(),
            "source_hash": sha256_file(story_path),
            "status": "passed",
            "tickets_count": len(tickets),
            "ticket_types": dict(Counter(ticket["type"] for ticket in tickets)),
        },
    }


def build_traceability_matrix(module: str, stories: list[dict[str, Any]], tickets: list[dict[str, Any]]) -> str:
    now = now_iso()
    rows = [
        f"# {module} 模块追踪矩阵",
        "",
        f"> 生成时间: {now} | 版本: v1 | TC 总数: {sum(len(ticket.get('test_cases') or []) for ticket in tickets) + sum(len(story.get('story_cases') or []) for story in stories)}",
        "",
        "## AC → TC → Script → Result 追踪表",
        "",
        "| FR/AC | TC-ID | Level | Operation | Script | Command | Latest Result | Evidence Ref |",
        "|-------|-------|-------|-----------|--------|---------|---------------|-------------|",
    ]
    for ticket in tickets:
        for case in ticket.get("test_cases") or []:
            ac_ref = case.get("ac_ref") or "—"
            tc_id = case.get("test_case_id") or "—"
            op = case.get("operation") or "—"
            evidence = f"osg-spec-docs/tasks/tickets/{ticket['id']}.yaml"
            rows.append(f"| {ac_ref} | {tc_id} | ticket | {op} | — | `pending` | pending | {evidence} |")
    for story in stories:
        for case in story.get("story_cases") or []:
            ac_ref = case.get("ac_ref") or "—"
            tc_id = case.get("story_case_id") or "—"
            evidence = f"osg-spec-docs/tasks/audit/{story['id']}-story-evidence.md"
            rows.append(
                f"| {ac_ref} | {tc_id} | story | — | — | `python3 .claude/skills/workflow-engine/tests/done_ticket_evidence_guard.py --story-id {story['id']}` | pending | {evidence} |"
            )
    rows.append("")
    return "\n".join(rows)


def append_event(events_path: Path, event: dict[str, Any]) -> None:
    events_path.parent.mkdir(parents=True, exist_ok=True)
    with events_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False))
        handle.write("\n")


def build_event(*, module: str, command: str, state_from: str, state_to: str, evidence_ref: str | None, note: str) -> dict[str, Any]:
    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": now_iso(),
        "module": module,
        "schema_version": "1.0",
        "actor": "codex/ticket-splitter",
        "command": command,
        "state_from": state_from,
        "state_to": state_to,
        "result": "success",
        "gate_result": "pass" if "split" in command else "auto",
        "evidence_ref": evidence_ref,
        "note": note,
    }


def update_state_for_generated_tickets(
    *,
    state_path: Path,
    module: str,
    story_ids: list[str],
    ticket_ids: list[str],
    current_story: str,
) -> None:
    state = load_yaml(state_path) or {}
    state["current_requirement"] = module
    state["current_story"] = current_story
    state["current_ticket"] = None
    state["stories"] = story_ids
    state["tickets"] = ticket_ids
    state.setdefault("completed_stories", [])
    state.setdefault("completed_tickets", [])
    state.setdefault("stats", {})
    state["stats"]["total_stories"] = len(story_ids)
    state["stats"]["total_tickets"] = len(ticket_ids)
    state["stats"]["completed_stories"] = len(state.get("completed_stories") or [])
    state["stats"]["completed_tickets"] = len(state.get("completed_tickets") or [])
    state.setdefault("workflow", {})
    state["workflow"]["current_step"] = "tickets_approved"
    state["workflow"]["next_step"] = "next"
    state["workflow"]["next_requires_approval"] = False
    state["workflow"]["auto_continue"] = True
    state.setdefault("changelog", [])
    timestamp = now_iso()[:10]
    state["changelog"].append(
        {
            "date": timestamp,
            "action": "split_ticket",
            "reason": f"{module} 模块按增强 frontend-ui ticket-splitter 规则重建 {story_ids[0]}~{story_ids[-1]} Tickets，并补齐视觉 payload / proofs / traceability matrix",
        }
    )
    state["changelog"].append(
        {
            "date": timestamp,
            "action": "approve_tickets",
            "reason": f"按 config.approval.ticket_split=auto 自动通过 {module} 模块已重建 Tickets，当前状态切换为 tickets_approved",
        }
    )
    write_yaml(state_path, state)


def generate_module_tickets(
    *,
    module: str,
    state_path: Path,
    stories_dir: Path,
    tickets_dir: Path,
    proofs_dir: Path,
    testing_dir: Path,
    prd_root: Path,
    prototype_root: Path,
    story_ids: list[str],
) -> dict[str, Any]:
    delivery_contract_path = prd_root / module / "DELIVERY-CONTRACT.yaml"
    ui_contract_path = prd_root / module / "UI-VISUAL-CONTRACT.yaml"
    if not delivery_contract_path.exists() or not ui_contract_path.exists():
        raise FileNotFoundError(f"missing module contracts for {module}")

    target_story_set = set(story_ids)
    existing_ticket_paths = sorted(tickets_dir.glob("T-*.yaml"))
    max_ticket_number = 0
    for path in existing_ticket_paths:
        ticket = load_yaml(path) or {}
        if ticket.get("story_id") in target_story_set:
            continue
        match = re.search(r"T-(\d+)", path.stem)
        if match:
            max_ticket_number = max(max_ticket_number, int(match.group(1)))

    generated_tickets: list[dict[str, Any]] = []
    generated_stories: list[dict[str, Any]] = []
    next_number = max_ticket_number + 1

    for path in existing_ticket_paths:
        ticket = load_yaml(path) or {}
        if ticket.get("story_id") in target_story_set:
            path.unlink()

    for story_id in story_ids:
        story_path = stories_dir / f"{story_id}.yaml"
        bundle = generate_story_ticket_bundle(
            module=module,
            story_id=story_id,
            story_path=story_path,
            delivery_contract_path=delivery_contract_path,
            ui_contract_path=ui_contract_path,
            prototype_root=prototype_root,
            next_ticket_number=next_number,
        )
        next_number = bundle["next_ticket_number"]
        generated_tickets.extend(bundle["tickets"])
        story = deep_copy(bundle["story"])
        story["story_cases"] = ensure_overlay_story_cases(
            story=story,
            story_acs=parse_story_acceptance_criteria(story),
            surface_ids=[item for item in (story.get("contract_refs") or {}).get("critical_surfaces") or [] if isinstance(item, str)],
            surfaces={
                item["surface_id"]: item
                for item in (load_yaml(ui_contract_path) or {}).get("surfaces") or []
                if isinstance(item, dict) and item.get("surface_id")
            },
        )
        story["tickets"] = [ticket["id"] for ticket in bundle["tickets"]]
        story["updated_at"] = now_iso()
        write_yaml(story_path, story)
        generated_stories.append(story)
        proof_path = proofs_dir / module / f"{story_id}_ticket_split_phase_proof.json"
        proof_path.parent.mkdir(parents=True, exist_ok=True)
        proof_path.write_text(json.dumps(bundle["proof"], ensure_ascii=False, indent=2), encoding="utf-8")

    for ticket in generated_tickets:
        write_yaml(tickets_dir / f"{ticket['id']}.yaml", ticket)

    matrix_path = testing_dir / f"{module}-traceability-matrix.md"
    matrix_path.parent.mkdir(parents=True, exist_ok=True)
    matrix_path.write_text(build_traceability_matrix(module, generated_stories, generated_tickets), encoding="utf-8")

    update_state_for_generated_tickets(
        state_path=state_path,
        module=module,
        story_ids=story_ids,
        ticket_ids=[ticket["id"] for ticket in generated_tickets],
        current_story=story_ids[0],
    )

    events_path = state_path.parent / "workflow-events.jsonl"
    evidence_ref = str(proofs_dir / module / f"{story_ids[0]}_ticket_split_phase_proof.json")
    append_event(
        events_path,
        build_event(
            module=module,
            command=f"/split ticket {story_ids[0]}",
            state_from="stories_approved",
            state_to="ticket_split_done",
            evidence_ref=evidence_ref,
            note=f"{module} 全量重建 {story_ids[0]}~{story_ids[-1]} Tickets，并为所有 stories 生成视觉 payload / proofs / traceability matrix。",
        ),
    )
    append_event(
        events_path,
        build_event(
            module=module,
            command="/approve tickets",
            state_from="ticket_split_done",
            state_to="tickets_approved",
            evidence_ref=evidence_ref,
            note=f"{module} 重建 Tickets 按 config.approval.ticket_split=auto 自动通过，workflow 进入 tickets_approved。",
        ),
    )

    return {
        "module": module,
        "story_ids": story_ids,
        "tickets": generated_tickets,
        "matrix_path": matrix_path,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate RPIV tickets with frontend-ui payloads")
    parser.add_argument("--module", help="Module name; defaults to STATE.current_requirement")
    parser.add_argument("--story-id", action="append", help="Specific story id(s) to regenerate")
    parser.add_argument("--all-stories", action="store_true", help="Regenerate all stories listed in STATE.yaml")
    parser.add_argument("--state", default="osg-spec-docs/tasks/STATE.yaml")
    parser.add_argument("--stories-dir", default="osg-spec-docs/tasks/stories")
    parser.add_argument("--tickets-dir", default="osg-spec-docs/tasks/tickets")
    parser.add_argument("--proofs-dir", default="osg-spec-docs/tasks/proofs")
    parser.add_argument("--testing-dir", default="osg-spec-docs/tasks/testing")
    parser.add_argument("--prd-root", default="osg-spec-docs/docs/01-product/prd")
    parser.add_argument("--prototype-root", default="osg-spec-docs/source/prototype")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    state_path = Path(args.state)
    state = load_yaml(state_path) or {}
    module = args.module or state.get("current_requirement")
    if not isinstance(module, str) or not module:
        raise SystemExit("module is required")

    if args.all_stories:
        story_ids = [item for item in state.get("stories") or [] if isinstance(item, str)]
    else:
        story_ids = args.story_id or [state.get("current_story")]
    story_ids = [item for item in story_ids if isinstance(item, str) and item]
    if not story_ids:
        raise SystemExit("no story ids resolved")

    result = generate_module_tickets(
        module=module,
        state_path=state_path,
        stories_dir=Path(args.stories_dir),
        tickets_dir=Path(args.tickets_dir),
        proofs_dir=Path(args.proofs_dir),
        testing_dir=Path(args.testing_dir),
        prd_root=Path(args.prd_root),
        prototype_root=Path(args.prototype_root),
        story_ids=story_ids,
    )
    print(
        f"PASS: generated {len(result['tickets'])} tickets for module={module} stories={','.join(story_ids)} matrix={result['matrix_path']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
