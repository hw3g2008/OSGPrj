#!/usr/bin/env python3
"""Self-test for generate-overlay-surface-skeleton.py token parsing."""

from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
SCRIPT_PATH = ROOT / "bin" / "generate-overlay-surface-skeleton.py"


def load_module():
    spec = importlib.util.spec_from_file_location("generate_overlay_surface_skeleton", SCRIPT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load script: {SCRIPT_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_modal_tokens_prefer_modal_section(module) -> None:
    text = (ROOT / "osg-spec-docs/docs/01-product/prd/permission/DESIGN-SYSTEM.md").read_text(encoding="utf-8")
    tokens = module.parse_design_system_tokens(text, "modal")
    assert tokens["border_radius"] == "20px", tokens
    assert tokens["header_padding"] == "22px 26px", tokens
    assert tokens["body_padding"] == "26px", tokens
    assert tokens["footer_padding"] == "18px 26px", tokens


def test_modal_tokens_ignore_unrelated_sections(module) -> None:
    text = """
### 2.1 卡片 Card
| 属性 | 值 |
|------|-----|
| 圆角 | 16px |

### 2.6 弹窗 Modal
| 属性 | 值 |
|------|-----|
| 圆角 | 20px |
| 头部 padding | 22px 26px |
| 内容 padding | 26px |
| 底部 padding | 18px 26px |
| 关闭按钮 | 36px 正方形, border-radius:10px, background:var(--bg) |
"""
    tokens = module.parse_design_system_tokens(text, "modal")
    assert tokens["border_radius"] == "20px", tokens
    assert tokens["close_radius"] == "10px", tokens


def main() -> int:
    module = load_module()
    tests = [
        test_modal_tokens_prefer_modal_section,
        test_modal_tokens_ignore_unrelated_sections,
    ]
    for test in tests:
        test(module)
    print(f"PASS: generate_overlay_surface_skeleton_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
