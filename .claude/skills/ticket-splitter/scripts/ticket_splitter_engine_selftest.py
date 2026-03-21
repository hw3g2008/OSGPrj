#!/usr/bin/env python3
"""Self-test for frontend-ui ticket generation payloads."""

from __future__ import annotations

import tempfile
from pathlib import Path

import yaml

from ticket_splitter_engine import generate_module_tickets, generate_story_ticket_bundle


def _write_yaml(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


def _write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def test_frontend_ui_bundle_contains_visual_details() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(
            root / "stories/S-001.yaml",
            {
                "id": "S-001",
                "title": "班主任登录与找回密码",
                "acceptance_criteria": [
                    "AC-S-001-01: [positive][display] 登录页展示账号、密码、忘记密码入口和密码显隐切换",
                    "AC-S-001-02: [positive][state_change] 忘记密码支持邮箱校验、验证码校验、设置新密码、成功页四步流程",
                ],
                "contract_refs": {
                    "capabilities": ["auth-login", "auth-forgot-password"],
                    "critical_surfaces": ["modal-forgot-password"],
                },
                "story_cases": [],
                "required_test_obligations": {"required": ["display", "state_change"]},
            },
        )
        _write_yaml(
            root / "DELIVERY-CONTRACT.yaml",
            {
                "schema_version": 1,
                "module": "lead-mentor",
                "capabilities": [
                    {
                        "capability_id": "auth-login",
                        "source_refs": [{"prd": "00-lead-mentor-login.md"}],
                        "effect_kind": "authentication",
                        "required_artifacts": ["backend_regression", "frontend_regression"],
                    },
                    {
                        "capability_id": "auth-forgot-password",
                        "source_refs": [{"prd": "00-lead-mentor-login.md"}],
                        "effect_kind": "credential_reset",
                        "required_artifacts": ["backend_regression", "frontend_regression"],
                    },
                ],
            },
        )
        _write_yaml(
            root / "UI-VISUAL-CONTRACT.yaml",
            {
                "schema_version": 1,
                "module": "lead-mentor",
                "pages": [
                    {
                        "page_id": "login-page",
                        "route": "/login",
                        "prototype_file": "lead-mentor.html",
                        "prototype_selector": "#login-page",
                        "required_anchors": ["#login-page", ".login-box", ".login-links"],
                    }
                ],
                "surfaces": [
                    {
                        "surface_id": "modal-forgot-password",
                        "surface_type": "modal",
                        "host_page_id": "login-page",
                        "prototype_selector": "#modal-forgot-password",
                        "required_anchors": [".modal-content", ".modal-header", ".modal-body"],
                        "viewport_variants": [{"viewport_id": "desktop"}],
                        "state_variants": [
                            {"state_id": "step-email"},
                            {"state_id": "step-code"},
                            {"state_id": "step-reset"},
                        ],
                        "style_contracts": [
                            {
                                "selector": ".modal-content",
                                "prototype_selector": "#modal-forgot-password .modal-content",
                                "css": {"border-radius": "20px"},
                            }
                        ],
                        "state_contracts": [
                            {
                                "state_id": "step-email",
                                "required_anchors": [".modal-header", ".modal-body"],
                                "style_contracts": [
                                    {
                                        "selector": ".modal-body",
                                        "prototype_selector": "#modal-forgot-password .modal-body",
                                        "css": {"padding": "26px"},
                                    }
                                ],
                            }
                        ],
                    }
                ],
            },
        )
        _write_text(
            root / "prototype/lead-mentor.html",
            """
            <html>
              <head>
                <style>
                  .login-box { border-radius: 20px; padding: 56px; }
                  .login-logo-icon { width: 48px; height: 48px; border-radius: 14px; }
                  .login-btn { height: 56px; border-radius: 16px; }
                  #modal-forgot-password .modal-content { max-width: 450px; border-radius: 20px; }
                  #modal-forgot-password .modal-header { padding: 22px 26px 22px 26px; border-bottom-width: 1px; }
                  #modal-forgot-password .modal-body { padding: 26px; }
                  #modal-forgot-password .form-group { margin-bottom: 16px; }
                  #modal-forgot-password label { line-height: normal; }
                  #modal-forgot-password input { height: 44px; }
                  #modal-forgot-password p { margin-bottom: 20px; }
                  #modal-forgot-password button { height: 40px; justify-content: flex-start; }
                </style>
              </head>
              <body>
                <div id="login-page">
                  <div class="login-left">
                    <h1>OSG Platform</h1>
                    <p>职业培训一站式平台，学生与导师共同成长</p>
                    <div class="login-feature"><i class="mdi mdi-check-circle"></i><span>导师端：高效课程管理</span></div>
                  </div>
                  <div class="login-box">
                    <div class="login-logo-icon"><i class="mdi mdi-account-star"></i></div>
                    <h2 class="login-title">欢迎回来</h2>
                    <p class="login-subtitle">使用您的账号登录（主导师/班主任）</p>
                    <label>用户名 / 邮箱</label>
                    <input placeholder="请输入用户名或邮箱" />
                    <label>密码</label>
                    <input placeholder="请输入密码" />
                    <button class="login-btn"><i class="mdi mdi-login"></i>登 录</button>
                    <div class="login-links">忘记密码？<a href="javascript:void(0)">点击重置</a></div>
                  </div>
                </div>
                <div id="modal-forgot-password">
                  <div class="modal-content">
                    <div class="modal-header"><h3>找回密码</h3></div>
                    <div class="modal-body">
                      <label>邮箱地址</label>
                      <input placeholder="请输入注册邮箱" />
                      <button>发送验证码</button>
                    </div>
                  </div>
                </div>
              </body>
            </html>
            """,
        )

        bundle = generate_story_ticket_bundle(
            module="lead-mentor",
            story_id="S-001",
            story_path=root / "stories/S-001.yaml",
            delivery_contract_path=root / "DELIVERY-CONTRACT.yaml",
            ui_contract_path=root / "UI-VISUAL-CONTRACT.yaml",
            prototype_root=root / "prototype",
            next_ticket_number=177,
        )

        ui_tickets = [ticket for ticket in bundle["tickets"] if ticket["type"] == "frontend-ui"]
        assert len(ui_tickets) == 2, ui_tickets

        page_ticket = next(ticket for ticket in ui_tickets if not ticket["contract_refs"]["critical_surfaces"])
        assert page_ticket["prototype_refs"][0]["page_id"] == "login-page"
        assert page_ticket["visual_checklist"], page_ticket
        assert any(item.get("text") == "OSG Platform" for item in page_ticket["visual_checklist"]), page_ticket
        assert any(item.get("icon_name") == "mdi-account-star" for item in page_ticket["visual_checklist"]), page_ticket
        assert page_ticket["style_contracts"], page_ticket
        assert {
            "page-shell",
            "control-box-model",
            "iconography-consistency",
        }.issubset(set(page_ticket["ui_rule_classes"])), page_ticket

        surface_ticket = next(ticket for ticket in ui_tickets if ticket["contract_refs"]["critical_surfaces"])
        assert surface_ticket["contract_refs"]["critical_surfaces"] == ["modal-forgot-password"]
        assert surface_ticket["state_cases"], surface_ticket
        assert {case["state_id"] for case in surface_ticket["state_cases"]} == {"step-email", "step-code", "step-reset"}
        assert {
            "overlay-surface-layout",
            "control-box-model",
            "form-spacing",
            "action-content-alignment",
        }.issubset(set(surface_ticket["ui_rule_classes"])), surface_ticket
        assert any(
            rule.get("selector") == "#modal-forgot-password button"
            and rule.get("rule_class") == "action-content-alignment"
            and (rule.get("css") or {}).get("justify-content") == "flex-start"
            for rule in surface_ticket["style_contracts"]
        ), surface_ticket
        assert any(
            rule.get("selector") == "#modal-forgot-password input"
            and rule.get("rule_class") == "control-box-model"
            and (rule.get("css") or {}).get("height") == "44px"
            for rule in surface_ticket["style_contracts"]
        ), surface_ticket


def test_module_generation_backfills_overlay_story_cases() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(
            root / "tasks/STATE.yaml",
            {
                "current_requirement": "lead-mentor",
                "current_story": "S-001",
                "stories": ["S-001"],
                "tickets": [],
                "workflow": {"current_step": "stories_approved", "next_step": "split_ticket"},
            },
        )
        _write_yaml(
            root / "tasks/stories/S-001.yaml",
            {
                "id": "S-001",
                "title": "岗位信息与我的学员申请",
                "acceptance_criteria": [
                    "AC-S-001-01: [positive][display] 支持岗位下钻视图和列表视图切换",
                    "AC-S-001-02: [positive][display] 我的学员申请弹窗仅展示当前班主任管理范围内学员",
                ],
                "contract_refs": {
                    "capabilities": ["positions-list", "positions-my-students"],
                    "critical_surfaces": ["modal-position-mystudents"],
                },
                "story_cases": [
                    {
                        "story_case_id": "SC-S-001-001",
                        "ac_ref": "AC-S-001-01",
                        "case_kind": "functional",
                        "state_variant": "normal",
                        "viewport_variant": "desktop",
                    }
                ],
                "required_test_obligations": {"required": ["display"]},
            },
        )
        _write_yaml(
            root / "prd/lead-mentor/DELIVERY-CONTRACT.yaml",
            {
                "schema_version": 1,
                "module": "lead-mentor",
                "capabilities": [
                    {
                        "capability_id": "positions-list",
                        "source_refs": [{"prd": "01-lead-mentor-positions.md"}],
                        "effect_kind": "data_display",
                        "required_artifacts": ["frontend_regression"],
                    },
                    {
                        "capability_id": "positions-my-students",
                        "source_refs": [{"prd": "01-lead-mentor-positions.md"}],
                        "effect_kind": "scoped_detail",
                        "required_artifacts": ["frontend_regression"],
                    },
                ],
            },
        )
        _write_yaml(
            root / "prd/lead-mentor/UI-VISUAL-CONTRACT.yaml",
            {
                "schema_version": 1,
                "module": "lead-mentor",
                "pages": [
                    {
                        "page_id": "positions",
                        "route": "/positions",
                        "prototype_file": "lead-mentor.html",
                        "prototype_selector": "#positions-page",
                        "required_anchors": ["#positions-page", ".positions-toolbar"],
                    }
                ],
                "surfaces": [
                    {
                        "surface_id": "modal-position-mystudents",
                        "surface_type": "modal",
                        "host_page_id": "positions",
                        "prototype_selector": "#modal-position-mystudents",
                        "required_anchors": [".modal-content", ".modal-body"],
                        "viewport_variants": [{"viewport_id": "desktop"}],
                        "state_variants": [{"state_id": "default"}],
                        "style_contracts": [
                            {
                                "selector": ".modal-content",
                                "prototype_selector": "#modal-position-mystudents .modal-content",
                                "css": {"border-radius": "20px"},
                            }
                        ],
                    }
                ],
            },
        )
        _write_text(
            root / "prototype/lead-mentor.html",
            """
            <html>
              <head><style>.positions-toolbar { gap: 16px; }</style></head>
              <body>
                <div id="positions-page">
                  <h1>岗位信息</h1>
                  <div class="positions-toolbar"><button>我的学员申请</button></div>
                </div>
                <div id="modal-position-mystudents">
                  <div class="modal-content">
                    <div class="modal-body"><p>当前班主任管理学员</p></div>
                  </div>
                </div>
              </body>
            </html>
            """,
        )

        generate_module_tickets(
            module="lead-mentor",
            state_path=root / "tasks/STATE.yaml",
            stories_dir=root / "tasks/stories",
            tickets_dir=root / "tasks/tickets",
            proofs_dir=root / "tasks/proofs",
            testing_dir=root / "tasks/testing",
            prd_root=root / "prd",
            prototype_root=root / "prototype",
            story_ids=["S-001"],
        )

        story = yaml.safe_load((root / "tasks/stories/S-001.yaml").read_text(encoding="utf-8"))
        overlay_cases = [case for case in story.get("story_cases") or [] if case.get("surface_id") == "modal-position-mystudents"]
        assert overlay_cases, story
        assert overlay_cases[0]["case_kind"] == "critical_surface", overlay_cases[0]


def test_module_generation_reuses_ticket_range_for_regenerated_stories() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _write_yaml(
            root / "tasks/STATE.yaml",
            {
                "current_requirement": "lead-mentor",
                "current_story": "S-001",
                "stories": ["S-001"],
                "tickets": ["T-002"],
                "workflow": {"current_step": "stories_approved", "next_step": "split_ticket"},
            },
        )
        _write_yaml(
            root / "tasks/stories/S-001.yaml",
            {
                "id": "S-001",
                "title": "班主任登录",
                "acceptance_criteria": [
                    "AC-S-001-01: [positive][display] 登录页展示账号与密码输入框",
                ],
                "contract_refs": {
                    "capabilities": ["auth-login"],
                    "critical_surfaces": [],
                },
                "story_cases": [],
                "required_test_obligations": {"required": ["display"]},
            },
        )
        _write_yaml(
            root / "tasks/tickets/T-001.yaml",
            {
                "id": "T-001",
                "story_id": "S-900",
                "type": "backend",
            },
        )
        _write_yaml(
            root / "tasks/tickets/T-002.yaml",
            {
                "id": "T-002",
                "story_id": "S-001",
                "type": "frontend-ui",
            },
        )
        _write_yaml(
            root / "prd/lead-mentor/DELIVERY-CONTRACT.yaml",
            {
                "schema_version": 1,
                "module": "lead-mentor",
                "capabilities": [
                    {
                        "capability_id": "auth-login",
                        "source_refs": [{"prd": "00-lead-mentor-login.md"}],
                        "effect_kind": "authentication",
                        "required_artifacts": ["frontend_regression"],
                    }
                ],
            },
        )
        _write_yaml(
            root / "prd/lead-mentor/UI-VISUAL-CONTRACT.yaml",
            {
                "schema_version": 1,
                "module": "lead-mentor",
                "pages": [
                    {
                        "page_id": "login-page",
                        "route": "/login",
                        "prototype_file": "lead-mentor.html",
                        "prototype_selector": "#login-page",
                        "required_anchors": ["#login-page"],
                    }
                ],
                "surfaces": [],
            },
        )
        _write_text(
            root / "prototype/lead-mentor.html",
            """
            <html><body><div id="login-page"><h1>OSG Platform</h1><button>登录</button></div></body></html>
            """,
        )

        generate_module_tickets(
            module="lead-mentor",
            state_path=root / "tasks/STATE.yaml",
            stories_dir=root / "tasks/stories",
            tickets_dir=root / "tasks/tickets",
            proofs_dir=root / "tasks/proofs",
            testing_dir=root / "tasks/testing",
            prd_root=root / "prd",
            prototype_root=root / "prototype",
            story_ids=["S-001"],
        )

        story = yaml.safe_load((root / "tasks/stories/S-001.yaml").read_text(encoding="utf-8"))
        assert story["tickets"][0] == "T-002", story["tickets"]


def main() -> int:
    test_frontend_ui_bundle_contains_visual_details()
    test_module_generation_backfills_overlay_story_cases()
    test_module_generation_reuses_ticket_range_for_regenerated_stories()
    print("PASS: ticket_splitter_engine_selftest")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
