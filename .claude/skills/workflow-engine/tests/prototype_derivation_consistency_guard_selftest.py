#!/usr/bin/env python3
"""Self-test for prototype_derivation_consistency_guard.py."""

from __future__ import annotations

import tempfile
from pathlib import Path

import yaml

from prototype_derivation_consistency_guard import evaluate_consistency


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _write_yaml(path: Path, data: object) -> None:
    _write(path, yaml.safe_dump(data, allow_unicode=True, sort_keys=False))


def _base_config() -> dict:
    return {
        "paths": {"docs": {"prototypes": "osg-spec-docs/source/prototype/"}},
        "prd_process": {
            "truth_source": {
                "type": "html_prototype",
                "root": "${paths.docs.prototypes}",
                "single_source_of_truth": True,
                "forbid_source_absent_derivation": True,
            },
            "module_prototype_map": {
                "permission": ["admin.html"],
            },
        },
    }


def _base_matrix() -> str:
    return """# matrix

## 2. 页面矩阵
| # | 页面 ID | 页面名称 | 类型 | PRD 文件 | 提取状态 |
|---|---------|---------|------|---------|---------|
| 0 | login-page | 登录 | 前置页面 | 00-admin-login.md | ✅ |

## 3. 弹窗清单
| 弹窗 ID | 所属页面 | 弹窗名称 | PRD 文件 |
|---------|---------|---------|---------|
| modal-forgot-password | login-page | 找回密码 | 00-admin-login.md §5 |

## 4. 全局组件
"""


def _base_contract() -> dict:
    return {
        "schema_version": 1,
        "module": "permission",
        "pages": [
            {
                "page_id": "login-page",
                "prototype_file": "admin.html",
                "prototype_selector": "#login-page",
            }
        ],
        "surfaces": [
            {
                "surface_id": "modal-forgot-password",
                "prototype_selector": "#modal-forgot-password",
            }
        ],
    }


def _prepare_repo(root: Path) -> Path:
    repo = root / "repo"
    _write_yaml(repo / ".claude/project/config.yaml", _base_config())
    _write(
        repo / "osg-spec-docs/source/prototype/admin.html",
        '<div id="login-page"></div><div id="modal-forgot-password"></div>\n',
    )
    module_dir = repo / "osg-spec-docs/docs/01-product/prd/permission"
    _write(module_dir / "MATRIX.md", _base_matrix())
    _write_yaml(module_dir / "UI-VISUAL-CONTRACT.yaml", _base_contract())
    return module_dir


def test_valid_derivation_passes() -> None:
    with tempfile.TemporaryDirectory() as td:
        module_dir = _prepare_repo(Path(td))
        findings, _summary = evaluate_consistency(module_dir)
        assert not findings, findings


def test_contract_source_absent_surface_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        module_dir = _prepare_repo(Path(td))
        contract_path = module_dir / "UI-VISUAL-CONTRACT.yaml"
        contract = yaml.safe_load(contract_path.read_text(encoding="utf-8"))
        contract["surfaces"].append(
            {
                "surface_id": "modal-force-change-pwd",
                "prototype_selector": "#modal-force-change-pwd",
            }
        )
        _write_yaml(contract_path, contract)
        findings, _summary = evaluate_consistency(module_dir)
        assert any("source-absent selector" in item for item in findings), findings


def test_matrix_source_absent_surface_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        module_dir = _prepare_repo(Path(td))
        matrix_path = module_dir / "MATRIX.md"
        matrix = matrix_path.read_text(encoding="utf-8")
        matrix = matrix.replace(
            "## 4. 全局组件",
            "| modal-force-change-pwd | login-page | 强制改密 | 00-admin-login.md §5.5 |\n\n## 4. 全局组件",
        )
        _write(matrix_path, matrix)
        findings, _summary = evaluate_consistency(module_dir)
        assert any("MATRIX.md surface 'modal-force-change-pwd' does not exist" in item for item in findings), findings


def test_non_single_truth_source_fails() -> None:
    with tempfile.TemporaryDirectory() as td:
        module_dir = _prepare_repo(Path(td))
        config_path = module_dir.parents[4] / ".claude/project/config.yaml"
        config = yaml.safe_load(config_path.read_text(encoding="utf-8"))
        config["prd_process"]["truth_source"]["single_source_of_truth"] = False
        _write_yaml(config_path, config)
        try:
            evaluate_consistency(module_dir)
        except ValueError as exc:
            assert "single_source_of_truth" in str(exc), str(exc)
        else:
            raise AssertionError("expected ValueError for non-single truth source")


def main() -> int:
    tests = [
        test_valid_derivation_passes,
        test_contract_source_absent_surface_fails,
        test_matrix_source_absent_surface_fails,
        test_non_single_truth_source_fails,
    ]
    for fn in tests:
        fn()
    print(f"PASS: prototype_derivation_consistency_guard_selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
