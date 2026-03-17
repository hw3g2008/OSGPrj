from __future__ import annotations

import importlib.util
from pathlib import Path


def load_module():
    module_path = Path(__file__).with_name("ticket_backfill_report.py")
    spec = importlib.util.spec_from_file_location("ticket_backfill_report", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"failed to load module from {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_backend_ticket_with_capability_is_runtime_verified():
    mod = load_module()
    ticket = {
        "id": "T-200",
        "type": "backend",
        "contract_refs": {"capabilities": ["students-list"]},
        "verification_evidence": {
            "command": "mvn -pl ruoyi-admin -am -Dtest=OsgStudentControllerTest test"
        },
    }
    result = mod.assess_ticket(
        ticket=ticket,
        command_status="passed",
        capability_coverage=True,
        schema_status="not_applicable",
    )
    assert result["verdict"] == "verified_runtime", result


def test_database_ticket_with_live_schema_is_runtime_verified():
    mod = load_module()
    ticket = {
        "id": "T-201",
        "type": "database",
        "verification_evidence": {
            "command": "rg -n 'CREATE TABLE IF NOT EXISTS osg_student' sql/osg_student_init.sql"
        },
    }
    result = mod.assess_ticket(
        ticket=ticket,
        command_status="passed",
        capability_coverage=False,
        schema_status="passed",
    )
    assert result["verdict"] == "verified_runtime", result


def test_frontend_ticket_without_runtime_mapping_is_weak():
    mod = load_module()
    ticket = {
        "id": "T-202",
        "type": "frontend",
        "verification_evidence": {
            "command": "pnpm --dir osg-frontend/packages/admin build"
        },
    }
    result = mod.assess_ticket(
        ticket=ticket,
        command_status="passed",
        capability_coverage=False,
        schema_status="not_applicable",
    )
    assert result["verdict"] == "verified_automated_only", result


def test_failed_command_marks_ticket_failed():
    mod = load_module()
    ticket = {
        "id": "T-203",
        "type": "backend",
        "contract_refs": {"capabilities": ["students-list"]},
        "verification_evidence": {
            "command": "mvn -pl ruoyi-admin -am -Dtest=OsgStudentControllerTest test"
        },
    }
    result = mod.assess_ticket(
        ticket=ticket,
        command_status="failed",
        capability_coverage=True,
        schema_status="not_applicable",
    )
    assert result["verdict"] == "failed", result


def test_ticket_without_command_but_with_runtime_coverage_is_verified():
    mod = load_module()
    ticket = {
        "id": "T-204",
        "type": "backend",
        "contract_refs": {"capabilities": ["contract-list"]},
        "verification_evidence": {
            "command": ""
        },
    }
    result = mod.assess_ticket(
        ticket=ticket,
        command_status="missing",
        capability_coverage=True,
        schema_status="not_applicable",
    )
    assert result["verdict"] == "verified_runtime", result


def test_students_capability_maps_to_students_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-205",
        "type": "frontend",
        "contract_refs": {"capabilities": ["students-status-change"]},
        "verification_evidence": {
            "command": "pnpm --dir osg-frontend/packages/admin build && pnpm --dir osg-frontend/packages/admin test"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_students_backfill" in runtime_targets, runtime_targets


def test_direction_cascade_capability_maps_to_students_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-206",
        "type": "frontend",
        "contract_refs": {"capabilities": ["direction-cascade"]},
        "verification_evidence": {
            "command": "pnpm --dir osg-frontend/packages/admin test && pnpm --dir osg-frontend/packages/admin build"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_students_backfill" in runtime_targets, runtime_targets


def test_students_frontend_path_without_capability_maps_to_students_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-207",
        "type": "frontend-ui",
        "allowed_paths": {
            "modify": [
                "osg-frontend/packages/admin/src/views/users/students/index.vue",
                "osg-frontend/packages/admin/src/views/users/students/students.less",
            ]
        },
        "verification_evidence": {
            "command": "pnpm --dir osg-frontend/packages/admin build"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_students_backfill" in runtime_targets, runtime_targets


def test_student_controller_path_maps_to_students_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-207B",
        "type": "backend",
        "allowed_paths": {
            "modify": [
                "ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStudentController.java",
            ]
        },
        "verification_evidence": {
            "command": "mvn compile -pl ruoyi-admin -am"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_students_backfill" in runtime_targets, runtime_targets


def test_student_change_service_path_maps_to_students_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-207C",
        "type": "backend",
        "allowed_paths": {
            "modify": [
                "ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStudentChangeRequestServiceImpl.java",
            ]
        },
        "verification_evidence": {
            "command": "mvn -pl ruoyi-admin -am -Dtest=OsgStudentChangeRequestControllerTest -Dsurefire.failIfNoSpecifiedTests=false test"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_students_backfill" in runtime_targets, runtime_targets


def test_student_change_controller_test_path_maps_to_students_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-207D",
        "type": "test",
        "allowed_paths": {
            "modify": [
                "ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgStudentChangeRequestControllerTest.java",
            ]
        },
        "verification_evidence": {
            "command": "mvn -pl ruoyi-admin -am -Dtest=OsgStudentChangeRequestControllerTest -Dsurefire.failIfNoSpecifiedTests=false test"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_students_backfill" in runtime_targets, runtime_targets


def test_contract_renew_capability_maps_to_contracts_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-208",
        "type": "frontend",
        "contract_refs": {"capabilities": ["contract-renew"]},
        "verification_evidence": {
            "command": "pnpm --dir osg-frontend/packages/admin test && pnpm --dir osg-frontend/packages/admin build"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_contracts_backfill" in runtime_targets, runtime_targets


def test_contracts_paths_without_capability_map_to_contracts_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-209",
        "type": "frontend-ui",
        "allowed_paths": {
            "modify": [
                "osg-frontend/packages/admin/src/views/users/contracts/index.vue",
                "osg-frontend/packages/shared/src/api/admin/contract.ts",
            ]
        },
        "verification_evidence": {
            "command": "pnpm --dir osg-frontend/packages/admin build"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_contracts_backfill" in runtime_targets, runtime_targets


def test_staff_list_capability_maps_to_staff_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-210",
        "type": "backend",
        "contract_refs": {"capabilities": ["staff-list"]},
        "verification_evidence": {
            "command": "mvn -pl ruoyi-admin -am -Dtest=OsgStaffControllerTest -Dsurefire.failIfNoSpecifiedTests=false test"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_staff_backfill" in runtime_targets, runtime_targets


def test_staff_controller_test_path_maps_to_staff_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-211",
        "type": "test",
        "allowed_paths": {
            "modify": [
                "ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgStaffControllerTest.java",
            ]
        },
        "verification_evidence": {
            "command": "mvn -pl ruoyi-admin -am -Dtest=OsgStaffControllerTest -Dsurefire.failIfNoSpecifiedTests=false test"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_staff_backfill" in runtime_targets, runtime_targets


def test_student_position_controller_test_maps_to_career_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-211A",
        "type": "test",
        "allowed_paths": {
            "modify": [
                "ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgStudentPositionControllerTest.java",
            ]
        },
        "verification_evidence": {
            "command": "mvn -pl ruoyi-admin -am -Dtest=OsgStudentPositionControllerTest -Dsurefire.failIfNoSpecifiedTests=false test"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_career_backfill" in runtime_targets, runtime_targets


def test_job_overview_controller_test_maps_to_career_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-211B",
        "type": "test",
        "allowed_paths": {
            "modify": [
                "ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgJobOverviewControllerTest.java",
            ]
        },
        "verification_evidence": {
            "command": "mvn -pl ruoyi-admin -am -Dtest=OsgJobOverviewControllerTest -Dsurefire.failIfNoSpecifiedTests=false test"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_career_backfill" in runtime_targets, runtime_targets


def test_mock_practice_controller_test_maps_to_career_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-211C",
        "type": "test",
        "allowed_paths": {
            "modify": [
                "ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgMockPracticeControllerTest.java",
            ]
        },
        "verification_evidence": {
            "command": "mvn -pl ruoyi-admin -am -Dtest=OsgMockPracticeControllerTest -Dsurefire.failIfNoSpecifiedTests=false test"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_career_backfill" in runtime_targets, runtime_targets


def test_schedule_capability_maps_to_schedule_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-212",
        "type": "frontend",
        "contract_refs": {"capabilities": ["schedule-remind"]},
        "verification_evidence": {
            "command": "pnpm --dir osg-frontend/packages/admin test && pnpm --dir osg-frontend/packages/admin build"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_schedule_backfill" in runtime_targets, runtime_targets


def test_schedule_controller_test_path_maps_to_schedule_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-213",
        "type": "test",
        "allowed_paths": {
            "modify": [
                "ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgStaffScheduleControllerTest.java",
            ]
        },
        "verification_evidence": {
            "command": "mvn -pl ruoyi-admin -am -Dtest=OsgStaffScheduleControllerTest -Dsurefire.failIfNoSpecifiedTests=false test"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_schedule_backfill" in runtime_targets, runtime_targets


def test_position_export_capability_maps_to_positions_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-214",
        "type": "frontend",
        "contract_refs": {"capabilities": ["position-export"]},
        "verification_evidence": {
            "command": "pnpm --dir osg-frontend/packages/admin test && pnpm --dir osg-frontend/packages/admin build"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_positions_backfill" in runtime_targets, runtime_targets


def test_position_controller_test_path_maps_to_positions_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-215",
        "type": "test",
        "allowed_paths": {
            "modify": [
                "ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgPositionControllerTest.java",
            ]
        },
        "verification_evidence": {
            "command": "mvn -pl ruoyi-admin -am -Dtest=OsgPositionControllerTest -Dsurefire.failIfNoSpecifiedTests=false test"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_positions_backfill" in runtime_targets, runtime_targets


def test_finance_capability_maps_to_finance_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-216",
        "type": "frontend",
        "contract_refs": {"capabilities": ["finance-mark-paid"]},
        "verification_evidence": {
            "command": "pnpm --dir osg-frontend/packages/admin test && pnpm --dir osg-frontend/packages/admin build"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_finance_backfill" in runtime_targets, runtime_targets


def test_finance_controller_test_path_maps_to_finance_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-217",
        "type": "test",
        "allowed_paths": {
            "modify": [
                "ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgFinanceControllerTest.java",
            ]
        },
        "verification_evidence": {
            "command": "mvn -pl ruoyi-admin -am -Dtest=OsgFinanceControllerTest -Dsurefire.failIfNoSpecifiedTests=false test"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_finance_backfill" in runtime_targets, runtime_targets


def test_report_capability_maps_to_reports_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-218",
        "type": "backend",
        "contract_refs": {"capabilities": ["report-review"]},
        "verification_evidence": {
            "command": "mvn -pl ruoyi-admin -am -Dtest=OsgReportControllerTest -Dsurefire.failIfNoSpecifiedTests=false test"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_reports_backfill" in runtime_targets, runtime_targets


def test_report_controller_test_path_maps_to_reports_backfill_runtime_target():
    mod = load_module()
    ticket = {
        "id": "T-219",
        "type": "test",
        "allowed_paths": {
            "modify": [
                "ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgReportControllerTest.java",
            ]
        },
        "verification_evidence": {
            "command": "mvn -pl ruoyi-admin -am -Dtest=OsgReportControllerTest -Dsurefire.failIfNoSpecifiedTests=false test"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_reports_backfill" in runtime_targets, runtime_targets


def test_admin_full_gate_command_is_treated_as_runtime_target_not_blocking_command_target():
    mod = load_module()
    ticket = {
        "id": "T-220",
        "type": "frontend",
        "contract_refs": {"capabilities": ["students-list"]},
        "verification_evidence": {
            "command": "bash bin/e2e-api-gate.sh admin full"
        },
    }
    command_targets, runtime_targets = mod.derive_targets(ticket, {})
    assert "admin_api_runtime_smoke" not in command_targets, command_targets
    assert "admin_api_runtime_smoke" in runtime_targets, runtime_targets


def main():
    test_backend_ticket_with_capability_is_runtime_verified()
    test_database_ticket_with_live_schema_is_runtime_verified()
    test_frontend_ticket_without_runtime_mapping_is_weak()
    test_failed_command_marks_ticket_failed()
    test_ticket_without_command_but_with_runtime_coverage_is_verified()
    test_students_capability_maps_to_students_backfill_runtime_target()
    test_direction_cascade_capability_maps_to_students_backfill_runtime_target()
    test_students_frontend_path_without_capability_maps_to_students_backfill_runtime_target()
    test_student_controller_path_maps_to_students_backfill_runtime_target()
    test_student_change_service_path_maps_to_students_backfill_runtime_target()
    test_student_change_controller_test_path_maps_to_students_backfill_runtime_target()
    test_contract_renew_capability_maps_to_contracts_backfill_runtime_target()
    test_contracts_paths_without_capability_map_to_contracts_backfill_runtime_target()
    test_staff_list_capability_maps_to_staff_backfill_runtime_target()
    test_staff_controller_test_path_maps_to_staff_backfill_runtime_target()
    test_student_position_controller_test_maps_to_career_backfill_runtime_target()
    test_job_overview_controller_test_maps_to_career_backfill_runtime_target()
    test_mock_practice_controller_test_maps_to_career_backfill_runtime_target()
    test_schedule_capability_maps_to_schedule_backfill_runtime_target()
    test_schedule_controller_test_path_maps_to_schedule_backfill_runtime_target()
    test_position_export_capability_maps_to_positions_backfill_runtime_target()
    test_position_controller_test_path_maps_to_positions_backfill_runtime_target()
    test_finance_capability_maps_to_finance_backfill_runtime_target()
    test_finance_controller_test_path_maps_to_finance_backfill_runtime_target()
    test_report_capability_maps_to_reports_backfill_runtime_target()
    test_report_controller_test_path_maps_to_reports_backfill_runtime_target()
    test_admin_full_gate_command_is_treated_as_runtime_target_not_blocking_command_target()
    print("PASS: ticket_backfill_report selftest")


if __name__ == "__main__":
    main()
