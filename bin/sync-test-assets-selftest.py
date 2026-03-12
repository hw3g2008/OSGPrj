#!/usr/bin/env python3
"""Self-tests for sync-test-assets.py."""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import yaml


SCRIPT = Path(__file__).resolve().parent / "sync-test-assets.py"


def run_sync(
    stories_dir: Path,
    tickets_dir: Path,
    cases: Path,
    matrix: Path,
    ui_contract: Path,
    config: Path,
) -> None:
    subprocess.run(
        [
            "python3",
            str(SCRIPT),
            "--module",
            "sample",
            "--stories-dir",
            str(stories_dir),
            "--tickets-dir",
            str(tickets_dir),
            "--cases",
            str(cases),
            "--matrix",
            str(matrix),
            "--ui-contract",
            str(ui_contract),
            "--config",
            str(config),
        ],
        check=True,
        capture_output=True,
        text=True,
    )


def write_yaml(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


def write_minimal_ui_contract(path: Path) -> None:
    write_yaml(path, {"surfaces": []})


def write_minimal_config(path: Path) -> None:
    write_yaml(
        path,
        {
            "testing": {
                "design": {
                    "scenario_obligations": {
                        "allowed": [
                            "display",
                            "state_change",
                            "business_rule_reject",
                            "auth_or_data_boundary",
                            "persist_effect",
                        ],
                        "profiles": {
                            "crud": {
                                "required": [
                                    "display",
                                    "state_change",
                                    "business_rule_reject",
                                    "auth_or_data_boundary",
                                    "persist_effect",
                                ]
                            },
                            "display_only": {"required": ["display", "persist_effect"]},
                        },
                        "obligation_to_category": {
                            "display": "positive",
                            "state_change": "positive",
                            "business_rule_reject": "negative",
                            "auth_or_data_boundary": "boundary",
                            "persist_effect": "positive",
                        },
                    }
                }
            }
        },
    )


def test_story_and_final_cases_inherit_story_level_evidence() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        stories = root / "stories"
        tickets = root / "tickets"
        cases = root / "cases.yaml"
        matrix = root / "matrix.md"
        ui_contract = root / "UI-VISUAL-CONTRACT.yaml"
        config = root / "config.yaml"

        write_minimal_ui_contract(ui_contract)
        write_minimal_config(config)

        write_yaml(
            stories / "S-900.yaml",
            {
                "id": "S-900",
                "title": "sample",
                "acceptance_criteria": ["A", "B"],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "story_cases": [
                    {"story_case_id": "SC-S-900-001", "ac_ref": "AC-S-900-01"},
                    {"story_case_id": "SC-S-900-002", "ac_ref": "AC-S-900-02"},
                ],
                "integration_evidence": {
                    "command": "pnpm test story-suite",
                    "exit_code": 0,
                    "evidence_ref": "stories/S-900.yaml",
                },
                "final_evidence": {
                    "command": "pnpm test final-suite",
                    "exit_code": 0,
                    "evidence_ref": "stories/S-900.yaml",
                },
            },
        )
        write_yaml(tickets / "T-900.yaml", {"id": "T-900", "story_id": "S-900", "covers_ac_refs": []})
        write_yaml(cases, [])
        matrix.write_text("", encoding="utf-8")

        run_sync(stories, tickets, cases, matrix, ui_contract, config)

        synced = yaml.safe_load(cases.read_text(encoding="utf-8"))
        story_cases = [tc for tc in synced if tc["level"] == "story"]
        final_cases = [tc for tc in synced if tc["level"] == "final"]

        assert len(story_cases) == 2
        assert len(final_cases) == 2
        assert all(tc["automation"]["command"] == "pnpm test story-suite" for tc in story_cases)
        assert all(tc["latest_result"]["status"] == "pass" for tc in story_cases)
        assert all(tc["latest_result"]["evidence_ref"] == "stories/S-900.yaml" for tc in story_cases)
        assert all(tc["automation"]["command"] == "pnpm test final-suite" for tc in final_cases)
        assert all(tc["latest_result"]["status"] == "pass" for tc in final_cases)
        assert all(tc["latest_result"]["evidence_ref"] == "stories/S-900.yaml" for tc in final_cases)


def test_migration_backfills_story_ticket_and_module_schema_fields() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        stories = root / "stories"
        tickets = root / "tickets"
        cases = root / "cases.yaml"
        matrix = root / "matrix.md"
        ui_contract = root / "UI-VISUAL-CONTRACT.yaml"
        config = root / "config.yaml"

        write_minimal_ui_contract(ui_contract)
        write_minimal_config(config)

        write_yaml(
            stories / "S-900.yaml",
            {
                "id": "S-900",
                "title": "role-management",
                "acceptance_criteria": [
                    "角色列表展示: ID、角色名称、角色描述、权限模块(tag列表)、员工数、更新时间、操作",
                    "新增角色: 输入角色名称(唯一)、描述(≤200字)、权限模块(至少选一个)",
                    "删除角色: 员工数=0显示删除按钮；员工数>0隐藏删除按钮",
                ],
                "tickets": ["T-900"],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "story_cases": [
                    {"story_case_id": "SC-S-900-001", "ac_ref": "AC-S-900-01"},
                    {"story_case_id": "SC-S-900-002", "ac_ref": "AC-S-900-02"},
                    {"story_case_id": "SC-S-900-003", "ac_ref": "AC-S-900-03"},
                ],
            },
        )
        write_yaml(
            tickets / "T-900.yaml",
            {
                "id": "T-900",
                "story_id": "S-900",
                "covers_ac_refs": ["AC-S-900-01", "AC-S-900-02", "AC-S-900-03"],
                "acceptance_criteria": [
                    "getRoleList: GET /system/role/list 分页查询",
                    "addRole: POST /system/role 创建角色（含 menuIds）",
                    "删除角色: 员工数=0显示删除按钮；员工数>0隐藏删除按钮",
                ],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "test_cases": [
                    {"test_case_id": "TCS-T-900-001", "ac_ref": "AC-S-900-01", "case_kind": "ac"},
                    {"test_case_id": "TCS-T-900-002", "ac_ref": "AC-S-900-02", "case_kind": "ac"},
                    {"test_case_id": "TCS-T-900-003", "ac_ref": "AC-S-900-03", "case_kind": "ac"},
                ],
                "verification_evidence": {"command": "pnpm test role", "exit_code": 0},
            },
        )
        write_yaml(
            cases,
            [
                {
                    "tc_id": "TC-SAMPLE-T-900-TICKET-001",
                    "level": "ticket",
                    "story_id": "S-900",
                    "ticket_id": "T-900",
                    "ac_ref": "AC-S-900-01",
                    "test_case_id": "TCS-T-900-001",
                    "case_kind": "ac",
                    "automation": {"script": "role.spec.ts", "command": "pnpm legacy"},
                    "latest_result": {"status": "pass", "evidence_ref": "tickets/T-900.yaml"},
                }
            ],
        )
        matrix.write_text("", encoding="utf-8")

        run_sync(stories, tickets, cases, matrix, ui_contract, config)

        synced_story = yaml.safe_load((stories / "S-900.yaml").read_text(encoding="utf-8"))
        assert synced_story["required_test_obligations"]["required"] == [
            "display",
            "state_change",
            "business_rule_reject",
            "auth_or_data_boundary",
            "persist_effect",
        ]

        synced_ticket = yaml.safe_load((tickets / "T-900.yaml").read_text(encoding="utf-8"))
        assert synced_ticket["test_cases"][0]["category"] == "positive"
        assert synced_ticket["test_cases"][0]["scenario_obligation"] == "display"
        assert synced_ticket["test_cases"][1]["category"] == "positive"
        assert synced_ticket["test_cases"][1]["scenario_obligation"] == "state_change"
        assert synced_ticket["test_cases"][2]["category"] == "negative"
        assert synced_ticket["test_cases"][2]["scenario_obligation"] == "business_rule_reject"

        synced_cases = yaml.safe_load(cases.read_text(encoding="utf-8"))
        migrated_ticket_case = next(tc for tc in synced_cases if tc["tc_id"] == "TC-SAMPLE-T-900-TICKET-001")
        assert migrated_ticket_case["category"] == "positive"
        assert migrated_ticket_case["scenario_obligation"] == "display"
        assert migrated_ticket_case["automation"]["command"] == "pnpm legacy"
        assert migrated_ticket_case["latest_result"]["status"] == "pass"


def test_sync_creates_declared_ids_even_when_legacy_case_shares_same_ac_ref() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        stories = root / "stories"
        tickets = root / "tickets"
        cases = root / "cases.yaml"
        matrix = root / "matrix.md"
        ui_contract = root / "UI-VISUAL-CONTRACT.yaml"
        config = root / "config.yaml"

        write_minimal_ui_contract(ui_contract)
        write_minimal_config(config)

        write_yaml(
            stories / "S-901.yaml",
            {
                "id": "S-901",
                "title": "legacy-ids",
                "acceptance_criteria": ["列表展示", "编辑成功"],
                "tickets": ["T-901"],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "story_cases": [
                    {"story_case_id": "SC-S-901-001", "ac_ref": "AC-S-901-01"},
                    {"story_case_id": "SC-S-901-002", "ac_ref": "AC-S-901-02"},
                ],
            },
        )
        write_yaml(
            tickets / "T-901.yaml",
            {
                "id": "T-901",
                "story_id": "S-901",
                "covers_ac_refs": ["AC-S-901-01", "AC-S-901-02"],
                "acceptance_criteria": ["列表展示", "编辑成功"],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "test_cases": [
                    {"test_case_id": "TCS-T-901-001", "ac_ref": "AC-S-901-01", "case_kind": "ac"},
                    {"test_case_id": "TCS-T-901-002", "ac_ref": "AC-S-901-02", "case_kind": "ac"},
                ],
            },
        )
        write_yaml(
            cases,
            [
                {
                    "tc_id": "TC-LEGACY-TICKET-001",
                    "level": "ticket",
                    "story_id": "S-901",
                    "ticket_id": "T-901",
                    "ac_ref": "AC-S-901-01",
                    "case_kind": "ac",
                    "automation": {"script": "legacy.spec.ts", "command": "pnpm legacy"},
                    "latest_result": {"status": "pass", "evidence_ref": "legacy-ticket"},
                },
                {
                    "tc_id": "TC-LEGACY-STORY-001",
                    "level": "story",
                    "story_id": "S-901",
                    "ac_ref": "AC-S-901-01",
                    "case_kind": "ac",
                    "automation": {"script": None, "command": "pnpm story"},
                    "latest_result": {"status": "pass", "evidence_ref": "legacy-story"},
                },
                {
                    "tc_id": "TC-LEGACY-FINAL-001",
                    "level": "final",
                    "story_id": "S-901",
                    "ac_ref": "AC-S-901-01",
                    "case_kind": "ac",
                    "automation": {"script": None, "command": "pnpm final"},
                    "latest_result": {"status": "pass", "evidence_ref": "legacy-final"},
                },
            ],
        )
        matrix.write_text("", encoding="utf-8")

        run_sync(stories, tickets, cases, matrix, ui_contract, config)

        synced_cases = yaml.safe_load(cases.read_text(encoding="utf-8"))
        assert any(tc.get("test_case_id") == "TCS-T-901-001" for tc in synced_cases if tc["level"] == "ticket")
        assert any(tc.get("story_case_id") == "SC-S-901-001" for tc in synced_cases if tc["level"] == "story")
        assert any(tc.get("story_case_id") == "SC-S-901-001" for tc in synced_cases if tc["level"] == "final")
        assert any(tc["tc_id"] == "TC-LEGACY-TICKET-001" for tc in synced_cases)
        assert any(tc["tc_id"] == "TC-LEGACY-STORY-001" for tc in synced_cases)
        assert any(tc["tc_id"] == "TC-LEGACY-FINAL-001" for tc in synced_cases)


def test_sync_infers_metadata_for_legacy_custom_cases_without_declared_ids() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        stories = root / "stories"
        tickets = root / "tickets"
        cases = root / "cases.yaml"
        matrix = root / "matrix.md"
        ui_contract = root / "UI-VISUAL-CONTRACT.yaml"
        config = root / "config.yaml"

        write_minimal_ui_contract(ui_contract)
        write_minimal_config(config)

        write_yaml(
            stories / "S-902.yaml",
            {
                "id": "S-902",
                "title": "permissions",
                "acceptance_criteria": [
                    "列表展示",
                    "无权限时阻止访问并提示",
                ],
                "tickets": ["T-902"],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "story_cases": [
                    {"story_case_id": "SC-S-902-001", "ac_ref": "AC-S-902-01"},
                    {"story_case_id": "SC-S-902-002", "ac_ref": "AC-S-902-02"},
                ],
            },
        )
        write_yaml(
            tickets / "T-902.yaml",
            {
                "id": "T-902",
                "story_id": "S-902",
                "covers_ac_refs": ["AC-S-902-02"],
                "acceptance_criteria": ["无权限用户访问时被拦截并提示"],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "test_cases": [
                    {"test_case_id": "TCS-T-902-001", "ac_ref": "AC-S-902-02", "case_kind": "ac"},
                ],
            },
        )
        write_yaml(
            cases,
            [
                {
                    "tc_id": "TC-LEGACY-NEG-001",
                    "level": "ticket",
                    "story_id": "S-902",
                    "ticket_id": "T-902",
                    "ac_ref": "AC-S-902-02",
                    "case_kind": "ac",
                    "steps": ["访问无权限页面"],
                    "expected": ["阻止访问", "显示无权限提示"],
                    "automation": {"script": "guard.spec.ts", "command": "pnpm guard"},
                    "latest_result": {"status": "pass", "evidence_ref": "legacy"},
                }
            ],
        )
        matrix.write_text("", encoding="utf-8")

        run_sync(stories, tickets, cases, matrix, ui_contract, config)

        synced_cases = yaml.safe_load(cases.read_text(encoding="utf-8"))
        legacy = next(tc for tc in synced_cases if tc["tc_id"] == "TC-LEGACY-NEG-001")
        assert legacy["category"] == "boundary"
        assert legacy["scenario_obligation"] == "auth_or_data_boundary"


def test_sync_mixed_permission_wording_keeps_display_unless_boundary_phrase_is_explicit() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        stories = root / "stories"
        tickets = root / "tickets"
        cases = root / "cases.yaml"
        matrix = root / "matrix.md"
        ui_contract = root / "UI-VISUAL-CONTRACT.yaml"
        config = root / "config.yaml"

        write_minimal_ui_contract(ui_contract)
        write_minimal_config(config)

        write_yaml(
            stories / "S-904.yaml",
            {
                "id": "S-904",
                "title": "mixed-permission-wording",
                "acceptance_criteria": [
                    "角色列表展示: 权限模块(tag列表) 正确显示",
                    "无权限菜单项隐藏且列表展示正确",
                ],
                "tickets": ["T-904"],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "story_cases": [
                    {"story_case_id": "SC-S-904-001", "ac_ref": "AC-S-904-01"},
                    {"story_case_id": "SC-S-904-002", "ac_ref": "AC-S-904-02"},
                ],
            },
        )
        write_yaml(
            tickets / "T-904.yaml",
            {
                "id": "T-904",
                "story_id": "S-904",
                "covers_ac_refs": ["AC-S-904-01", "AC-S-904-02"],
                "acceptance_criteria": [
                    "角色列表展示: 权限模块(tag列表) 正确显示",
                    "无权限菜单项隐藏且列表展示正确",
                ],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "test_cases": [
                    {"test_case_id": "TCS-T-904-001", "ac_ref": "AC-S-904-01", "case_kind": "ac"},
                    {"test_case_id": "TCS-T-904-002", "ac_ref": "AC-S-904-02", "case_kind": "ac"},
                ],
            },
        )
        write_yaml(cases, [])
        matrix.write_text("", encoding="utf-8")

        run_sync(stories, tickets, cases, matrix, ui_contract, config)

        synced_ticket = yaml.safe_load((tickets / "T-904.yaml").read_text(encoding="utf-8"))
        assert synced_ticket["test_cases"][0]["category"] == "positive"
        assert synced_ticket["test_cases"][0]["scenario_obligation"] == "display"
        assert synced_ticket["test_cases"][1]["category"] == "boundary"
        assert synced_ticket["test_cases"][1]["scenario_obligation"] == "auth_or_data_boundary"


def test_sync_upserts_existing_canonical_tc_ids_without_creating_duplicates() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        stories = root / "stories"
        tickets = root / "tickets"
        cases = root / "cases.yaml"
        matrix = root / "matrix.md"
        ui_contract = root / "UI-VISUAL-CONTRACT.yaml"
        config = root / "config.yaml"

        write_minimal_ui_contract(ui_contract)
        write_minimal_config(config)

        write_yaml(
            stories / "S-903.yaml",
            {
                "id": "S-903",
                "title": "canonical-upsert",
                "acceptance_criteria": ["列表展示"],
                "tickets": ["T-903"],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "story_cases": [{"story_case_id": "SC-S-903-001", "ac_ref": "AC-S-903-01"}],
            },
        )
        write_yaml(
            tickets / "T-903.yaml",
            {
                "id": "T-903",
                "story_id": "S-903",
                "covers_ac_refs": ["AC-S-903-01"],
                "acceptance_criteria": ["列表展示"],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "test_cases": [
                    {
                        "test_case_id": "TCS-T-903-001",
                        "ac_ref": "AC-S-903-01",
                        "case_kind": "ac",
                        "category": "positive",
                        "scenario_obligation": "display",
                        "operation": "list",
                    }
                ],
            },
        )
        write_yaml(
            cases,
            [
                {
                    "tc_id": "TC-SAMPLE-T-903-TICKET-001",
                    "level": "ticket",
                    "story_id": "S-903",
                    "ticket_id": "T-903",
                    "ac_ref": "AC-S-903-01",
                    "case_kind": "ac",
                    "automation": {"script": "legacy-ticket.ts", "command": "pnpm legacy-ticket"},
                    "latest_result": {"status": "pass", "evidence_ref": "legacy-ticket"},
                },
                {
                    "tc_id": "TC-SAMPLE-S-903-STORY-001",
                    "level": "story",
                    "story_id": "S-903",
                    "ac_ref": "AC-S-903-01",
                    "case_kind": "ac",
                    "automation": {"script": None, "command": "pnpm legacy-story"},
                    "latest_result": {"status": "pass", "evidence_ref": "legacy-story"},
                },
                {
                    "tc_id": "TC-SAMPLE-S-903-FINAL-001",
                    "level": "final",
                    "story_id": "S-903",
                    "ac_ref": "AC-S-903-01",
                    "case_kind": "ac",
                    "automation": {"script": None, "command": "pnpm legacy-final"},
                    "latest_result": {"status": "pass", "evidence_ref": "legacy-final"},
                },
            ],
        )
        matrix.write_text("", encoding="utf-8")

        run_sync(stories, tickets, cases, matrix, ui_contract, config)

        synced_cases = yaml.safe_load(cases.read_text(encoding="utf-8"))
        assert sum(1 for tc in synced_cases if tc["tc_id"] == "TC-SAMPLE-T-903-TICKET-001") == 1
        assert sum(1 for tc in synced_cases if tc["tc_id"] == "TC-SAMPLE-S-903-STORY-001") == 1
        assert sum(1 for tc in synced_cases if tc["tc_id"] == "TC-SAMPLE-S-903-FINAL-001") == 1
        ticket_case = next(tc for tc in synced_cases if tc["tc_id"] == "TC-SAMPLE-T-903-TICKET-001")
        story_case = next(tc for tc in synced_cases if tc["tc_id"] == "TC-SAMPLE-S-903-STORY-001")
        final_case = next(tc for tc in synced_cases if tc["tc_id"] == "TC-SAMPLE-S-903-FINAL-001")
        assert ticket_case["test_case_id"] == "TCS-T-903-001"
        assert ticket_case["category"] == "positive"
        assert ticket_case["scenario_obligation"] == "display"
        assert ticket_case["operation"] == "list"
        assert story_case["story_case_id"] == "SC-S-903-001"
        assert final_case["story_case_id"] == "SC-S-903-001"


def test_sync_propagates_operation_field() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        stories = root / "stories"
        tickets = root / "tickets"
        cases = root / "cases.yaml"
        matrix = root / "matrix.md"
        ui_contract = root / "UI-VISUAL-CONTRACT.yaml"
        config = root / "config.yaml"

        write_minimal_ui_contract(ui_contract)
        write_minimal_config(config)

        write_yaml(
            stories / "S-910.yaml",
            {
                "id": "S-910",
                "title": "crud-ops",
                "acceptance_criteria": [
                    "[positive][display] 列表展示正确",
                    "[positive][state_change] 新增成功",
                    "[positive][state_change] 编辑成功",
                ],
                "tickets": ["T-910", "T-911"],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "story_cases": [
                    {"story_case_id": "SC-S-910-001", "ac_ref": "AC-S-910-01"},
                    {"story_case_id": "SC-S-910-002", "ac_ref": "AC-S-910-02"},
                    {"story_case_id": "SC-S-910-003", "ac_ref": "AC-S-910-03"},
                ],
                "required_test_operations": {
                    "profile": "crud_minimal",
                    "operations": {
                        "create": {"required": ["state_change", "persist_effect"]},
                        "edit": {"required": ["state_change", "persist_effect"]},
                    },
                },
            },
        )
        write_yaml(
            tickets / "T-910.yaml",
            {
                "id": "T-910",
                "story_id": "S-910",
                "covers_ac_refs": ["AC-S-910-01", "AC-S-910-02"],
                "acceptance_criteria": [
                    "[positive][display] 列表展示正确",
                    "[positive][state_change] 新增成功",
                ],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "test_cases": [
                    {"test_case_id": "TCS-T-910-001", "ac_ref": "AC-S-910-01", "case_kind": "ac"},
                    {"test_case_id": "TCS-T-910-002", "ac_ref": "AC-S-910-02", "case_kind": "ac"},
                ],
            },
        )
        write_yaml(
            tickets / "T-911.yaml",
            {
                "id": "T-911",
                "story_id": "S-910",
                "covers_ac_refs": ["AC-S-910-03"],
                "acceptance_criteria": [
                    "[positive][state_change] 编辑成功",
                ],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "test_cases": [
                    {"test_case_id": "TCS-T-911-001", "ac_ref": "AC-S-910-03", "case_kind": "ac", "operation": "edit"},
                ],
            },
        )
        write_yaml(cases, [])
        matrix.write_text("", encoding="utf-8")

        run_sync(stories, tickets, cases, matrix, ui_contract, config)

        synced_ticket_910 = yaml.safe_load((tickets / "T-910.yaml").read_text(encoding="utf-8"))
        tc_910_1 = synced_ticket_910["test_cases"][0]
        tc_910_2 = synced_ticket_910["test_cases"][1]
        assert tc_910_1.get("operation") == "list", f"expected list, got {tc_910_1.get('operation')}"
        assert tc_910_2.get("operation") == "create", f"expected create, got {tc_910_2.get('operation')}"

        synced_ticket_911 = yaml.safe_load((tickets / "T-911.yaml").read_text(encoding="utf-8"))
        tc_911_1 = synced_ticket_911["test_cases"][0]
        assert tc_911_1.get("operation") == "edit", f"expected edit, got {tc_911_1.get('operation')}"

        synced_cases = yaml.safe_load(cases.read_text(encoding="utf-8"))
        ticket_cases = [tc for tc in synced_cases if tc["level"] == "ticket"]
        assert any(tc.get("operation") == "create" for tc in ticket_cases), "no ticket case with operation=create"
        assert any(tc.get("operation") == "edit" for tc in ticket_cases), "no ticket case with operation=edit"

        story_cases = [tc for tc in synced_cases if tc["level"] == "story"]
        assert any(tc.get("operation") == "create" for tc in story_cases), "no story case with operation=create"

        matrix_text = matrix.read_text(encoding="utf-8")
        assert "| Operation |" in matrix_text, "matrix missing Operation column header"
        assert "| edit |" in matrix_text or "edit" in matrix_text, "matrix missing edit operation value"


def test_sync_preserves_explicit_ticket_metadata_over_inference() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        stories = root / "stories"
        tickets = root / "tickets"
        cases = root / "cases.yaml"
        matrix = root / "matrix.md"
        ui_contract = root / "UI-VISUAL-CONTRACT.yaml"
        config = root / "config.yaml"

        write_minimal_ui_contract(ui_contract)
        write_minimal_config(config)

        write_yaml(
            stories / "S-920.yaml",
            {
                "id": "S-920",
                "title": "base-data-crud",
                "acceptance_criteria": [
                    "禁用/启用: 被引用的基础数据不可禁用",
                    "新增/编辑基础数据: 名称(必填)、排序(数字)、状态(switch)",
                ],
                "tickets": ["T-920"],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "story_cases": [
                    {"story_case_id": "SC-S-920-001", "ac_ref": "AC-S-920-01"},
                    {"story_case_id": "SC-S-920-002", "ac_ref": "AC-S-920-02"},
                ],
                "required_test_operations": {
                    "profile": "crud_minimal",
                    "operations": {
                        "edit": {"required": ["state_change", "persist_effect"]},
                        "status_toggle": {"required": ["state_change", "persist_effect"]},
                        "reject_disable": {"required": ["business_rule_reject"]},
                    },
                },
                "required_test_obligations": {
                    "profile": "custom",
                    "required": ["display", "state_change", "business_rule_reject", "persist_effect"],
                },
            },
        )
        write_yaml(
            tickets / "T-920.yaml",
            {
                "id": "T-920",
                "story_id": "S-920",
                "covers_ac_refs": ["AC-S-920-01", "AC-S-920-02"],
                "acceptance_criteria": [
                    "测试禁用/启用逻辑: 被引用基础数据不可禁用",
                    "测试编辑回填: 重新加载后状态即时反映",
                ],
                "contract_refs": {"capabilities": [], "critical_surfaces": []},
                "test_cases": [
                    {
                        "test_case_id": "TCS-T-920-001",
                        "ac_ref": "AC-S-920-01",
                        "case_kind": "ac",
                        "category": "negative",
                        "scenario_obligation": "business_rule_reject",
                        "operation": "reject_disable",
                    },
                    {
                        "test_case_id": "TCS-T-920-002",
                        "ac_ref": "AC-S-920-02",
                        "case_kind": "ac",
                        "category": "positive",
                        "scenario_obligation": "persist_effect",
                        "operation": "edit",
                    },
                ],
            },
        )
        write_yaml(cases, [])
        matrix.write_text("", encoding="utf-8")

        run_sync(stories, tickets, cases, matrix, ui_contract, config)

        synced_ticket = yaml.safe_load((tickets / "T-920.yaml").read_text(encoding="utf-8"))
        tc_920_1 = next(tc for tc in synced_ticket["test_cases"] if tc["test_case_id"] == "TCS-T-920-001")
        tc_920_2 = next(tc for tc in synced_ticket["test_cases"] if tc["test_case_id"] == "TCS-T-920-002")
        assert tc_920_1["category"] == "negative"
        assert tc_920_1["scenario_obligation"] == "business_rule_reject"
        assert tc_920_1["operation"] == "reject_disable"
        assert tc_920_2["category"] == "positive"
        assert tc_920_2["scenario_obligation"] == "persist_effect"
        assert tc_920_2["operation"] == "edit"

        synced_cases = yaml.safe_load(cases.read_text(encoding="utf-8"))
        mod_920_1 = next(tc for tc in synced_cases if tc.get("test_case_id") == "TCS-T-920-001")
        mod_920_2 = next(tc for tc in synced_cases if tc.get("test_case_id") == "TCS-T-920-002")
        assert mod_920_1["scenario_obligation"] == "business_rule_reject"
        assert mod_920_1["operation"] == "reject_disable"
        assert mod_920_2["scenario_obligation"] == "persist_effect"
        assert mod_920_2["operation"] == "edit"


def main() -> int:
    tests = [
        test_story_and_final_cases_inherit_story_level_evidence,
        test_migration_backfills_story_ticket_and_module_schema_fields,
        test_sync_creates_declared_ids_even_when_legacy_case_shares_same_ac_ref,
        test_sync_infers_metadata_for_legacy_custom_cases_without_declared_ids,
        test_sync_mixed_permission_wording_keeps_display_unless_boundary_phrase_is_explicit,
        test_sync_upserts_existing_canonical_tc_ids_without_creating_duplicates,
        test_sync_propagates_operation_field,
        test_sync_preserves_explicit_ticket_metadata_over_inference,
    ]
    for test in tests:
        test()
    print(f"PASS: sync-test-assets-selftest ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
