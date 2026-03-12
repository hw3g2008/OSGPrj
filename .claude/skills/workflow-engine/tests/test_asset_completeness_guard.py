#!/usr/bin/env python3
"""Guard: verify story/ticket level test assets are complete and synchronized."""

from __future__ import annotations

import argparse
from pathlib import Path

import yaml

VALID_LEVELS = {"ticket", "story", "final"}


def load_yaml(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def load_stories(stories_dir: Path, story_id: str | None = None) -> dict[str, dict]:
    stories: dict[str, dict] = {}
    for path in sorted(stories_dir.glob("S-*.yaml")):
        data = load_yaml(path) or {}
        sid = data.get("id") or path.stem
        if not isinstance(sid, str) or not sid:
            continue
        if story_id and sid != story_id:
            continue
        stories[sid] = data
    return stories


def load_tickets(tickets_dir: Path, story_id: str | None = None) -> dict[str, dict]:
    tickets: dict[str, dict] = {}
    for path in sorted(tickets_dir.glob("T-*.yaml")):
        data = load_yaml(path) or {}
        tid = data.get("id") or path.stem
        sid = data.get("story_id")
        if not isinstance(tid, str) or not tid:
            continue
        if story_id and sid != story_id:
            continue
        tickets[tid] = data
    return tickets


def load_cases(cases_doc: Path, story_id: str | None = None) -> list[dict]:
    data = load_yaml(cases_doc) or []
    if not isinstance(data, list):
        raise ValueError(f"cases doc must be a list: {cases_doc}")
    result: list[dict] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        if story_id and item.get("story_id") != story_id:
            continue
        result.append(item)
    return result


def parse_matrix_rows(matrix_doc: Path) -> list[dict[str, str]]:
    content = matrix_doc.read_text(encoding="utf-8")
    rows: list[dict[str, str]] = []
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        cols = [c.strip() for c in stripped.split("|")[1:-1]]
        if len(cols) < 2:
            continue
        if cols[0] == "FR/AC" and cols[1] == "TC-ID":
            continue
        if all(set(col) <= {"-", ":"} for col in cols[:2]):
            continue
        ac_ref, tc_id = cols[0], cols[1]
        if not ac_ref or not tc_id or not tc_id.startswith("TC-"):
            continue
        rows.append({"ac_ref": ac_ref, "tc_id": tc_id})
    return rows


def _extract_story_case_entries(stories: dict[str, dict]) -> tuple[dict[str, dict[str, dict]], list[str]]:
    findings: list[str] = []
    result: dict[str, dict[str, dict]] = {}
    for sid, story in stories.items():
        story_cases = story.get("story_cases")
        if not isinstance(story_cases, list) or not story_cases:
            findings.append(f"story missing story_cases: {sid}")
            continue
        entries: dict[str, dict] = {}
        for idx, case in enumerate(story_cases):
            prefix = f"{sid}.story_cases[{idx}]"
            if not isinstance(case, dict):
                findings.append(f"{prefix} must be a mapping")
                continue
            ac_ref = case.get("ac_ref")
            story_case_id = case.get("story_case_id")
            if not isinstance(story_case_id, str) or not story_case_id.strip():
                findings.append(f"{prefix}.story_case_id must be a non-empty string")
                continue
            if not isinstance(ac_ref, str) or not ac_ref.strip():
                findings.append(f"{prefix}.ac_ref must be a non-empty string")
                continue
            entries[story_case_id] = case
        result[sid] = entries
    return result, findings


def _extract_ticket_test_case_entries(tickets: dict[str, dict]) -> tuple[dict[str, dict[str, dict]], list[str]]:
    findings: list[str] = []
    result: dict[str, dict[str, dict]] = {}
    for tid, ticket in tickets.items():
        test_cases = ticket.get("test_cases")
        if test_cases is None:
            test_cases = [
                {
                    "test_case_id": f"AUTO:{ac_ref}",
                    "ac_ref": ac_ref,
                    "case_kind": "ac",
                    "surface_id": None,
                    "state_variant": None,
                    "viewport_variant": None,
                }
                for ac_ref in ticket.get("covers_ac_refs") or []
            ]
        if not isinstance(test_cases, list) or not test_cases:
            findings.append(f"ticket missing test_cases: {tid}")
            continue
        entries: dict[str, dict] = {}
        for idx, case in enumerate(test_cases):
            prefix = f"{tid}.test_cases[{idx}]"
            if not isinstance(case, dict):
                findings.append(f"{prefix} must be a mapping")
                continue
            ac_ref = case.get("ac_ref")
            test_case_id = case.get("test_case_id")
            if not isinstance(test_case_id, str) or not test_case_id.strip():
                findings.append(f"{prefix}.test_case_id must be a non-empty string")
                continue
            if not isinstance(ac_ref, str) or not ac_ref.strip():
                findings.append(f"{prefix}.ac_ref must be a non-empty string")
                continue
            entries[test_case_id] = case

        # Ticket YAML test_cases 字段校验（仅当至少有一个条目带新字段时才检查 — 说明是新管道生成的）
        # 如果全部条目都没有 category/scenario_obligation，则认为是旧资产，静默跳过（向后兼容）
        has_any_new_field = any(
            e.get("category") or e.get("scenario_obligation") for e in entries.values()
        )
        if has_any_new_field:
            for tc_id_key, tc_entry in entries.items():
                tc_category = tc_entry.get("category")
                tc_obligation = tc_entry.get("scenario_obligation")
                entry_prefix = f"{tid}.test_cases[{tc_id_key}]"
                if not tc_category and not tc_obligation:
                    findings.append(f"{entry_prefix} missing both category and scenario_obligation")
                elif tc_obligation and not tc_category:
                    findings.append(f"{entry_prefix} has scenario_obligation='{tc_obligation}' but missing category")
                elif tc_category and not tc_obligation:
                    findings.append(f"{entry_prefix} has category='{tc_category}' but missing scenario_obligation")

        result[tid] = entries
    return result, findings


def evaluate_test_asset_completeness(
    *,
    stories_dir: Path,
    tickets_dir: Path,
    cases_doc: Path,
    matrix_doc: Path,
    story_id: str | None = None,
    stage: str = "split",  # "split" | "approve" | "verify" — pending 阻断仅在 verify 阶段
) -> list[str]:
    findings: list[str] = []
    stories = load_stories(stories_dir, story_id)
    tickets = load_tickets(tickets_dir, story_id)
    cases = load_cases(cases_doc, story_id)
    matrix_rows = parse_matrix_rows(matrix_doc)

    if story_id and story_id not in stories:
        return [f"story not found: {story_id}"]

    story_case_entries, story_case_findings = _extract_story_case_entries(stories)
    findings.extend(story_case_findings)
    ticket_test_case_entries, ticket_test_case_findings = _extract_ticket_test_case_entries(tickets)
    findings.extend(ticket_test_case_findings)

    case_ids: set[str] = set()
    case_ids_by_story: dict[str, set[str]] = {}
    ticket_case_ids_by_ticket: dict[str, set[str]] = {}
    non_ticket_case_levels_by_story_case: dict[tuple[str, str], set[str]] = {}
    ticket_case_ids_by_ticket_case: dict[tuple[str, str], str] = {}
    case_by_id: dict[str, dict] = {}

    for idx, case in enumerate(cases):
        prefix = f"cases[{idx}]"
        tc_id = case.get("tc_id")
        level = case.get("level")
        sid = case.get("story_id")
        tid = case.get("ticket_id")
        ac_ref = case.get("ac_ref")
        story_case_id = case.get("story_case_id")
        test_case_id = case.get("test_case_id")

        if not isinstance(tc_id, str) or not tc_id.strip():
            findings.append(f"{prefix}.tc_id must be a non-empty string")
            continue
        if tc_id in case_ids:
            findings.append(f"duplicate tc_id: {tc_id}")
            continue
        case_ids.add(tc_id)
        case_by_id[tc_id] = case

        if level not in VALID_LEVELS:
            findings.append(f"{prefix}.level invalid: {level}")
            continue
        if not isinstance(sid, str) or not sid.strip():
            findings.append(f"{prefix}.story_id must be a non-empty string")
            continue
        if sid not in stories:
            findings.append(f"test case references unknown story: {tc_id} -> {sid}")
            continue
        case_ids_by_story.setdefault(sid, set()).add(tc_id)

        if not isinstance(ac_ref, str) or not ac_ref.strip():
            findings.append(f"{prefix}.ac_ref must be a non-empty string")
            continue
        if level == "ticket":
            if not isinstance(tid, str) or not tid.strip():
                findings.append(f"ticket-level test case missing ticket_id: {tc_id}")
                continue
            ticket = tickets.get(tid)
            if not ticket:
                findings.append(f"test case references unknown ticket: {tc_id} -> {tid}")
                continue
            actual_story_id = ticket.get("story_id")
            if actual_story_id != sid:
                findings.append(f"ticket/story mismatch in test case: {tc_id} -> {tid} story_id={sid} actual_story_id={actual_story_id}")
                continue
            ticket_case_ids_by_ticket.setdefault(tid, set()).add(tc_id)
            if isinstance(test_case_id, str) and test_case_id.strip():
                ticket_case_ids_by_ticket_case[(tid, test_case_id)] = tc_id
        else:
            if tid not in (None, ""):
                findings.append(f"non-ticket test case should not declare ticket_id: {tc_id}")
            if isinstance(story_case_id, str) and story_case_id.strip():
                non_ticket_case_levels_by_story_case.setdefault((sid, story_case_id), set()).add(level)

    matrix_tc_ids: set[str] = set()
    matrix_story_ids: set[str] = set()
    for row in matrix_rows:
        tc_id = row["tc_id"]
        ac_ref = row["ac_ref"]
        case = case_by_id.get(tc_id)
        if not case:
            # 当 story_id 指定时，跳过不属于当前过滤范围的矩阵行
            if story_id and tc_id not in case_ids:
                continue
            findings.append(f"traceability matrix references unknown test case: {tc_id}")
            continue
        # 当 story_id 指定时，只校验属于该 Story 的 TC 行
        if story_id and case.get("story_id") != story_id:
            continue
        matrix_tc_ids.add(tc_id)
        matrix_story_ids.add(case["story_id"])
        case_ac_ref = case.get("ac_ref")
        if case_ac_ref != ac_ref:
            findings.append(f"traceability matrix ac_ref mismatch: {tc_id} matrix={ac_ref} case={case_ac_ref}")

    for sid, story in stories.items():
        story_entries = story_case_entries.get(sid, {})
        if not story_entries:
            continue
        missing_story_tests = sorted(
            story_case_id
            for story_case_id in story_entries
            if "story" not in non_ticket_case_levels_by_story_case.get((sid, story_case_id), set())
        )
        if missing_story_tests:
            findings.append(f"story missing story-level test cases: {sid} -> {missing_story_tests}")
        missing_final_tests = sorted(
            story_case_id
            for story_case_id in story_entries
            if "final" not in non_ticket_case_levels_by_story_case.get((sid, story_case_id), set())
        )
        if missing_final_tests:
            findings.append(f"story missing final-level test cases: {sid} -> {missing_final_tests}")
        if sid not in case_ids_by_story:
            findings.append(f"story missing test case assets: {sid}")
        if sid not in matrix_story_ids:
            findings.append(f"story missing traceability matrix assets: {sid}")

    for tid, _ticket in tickets.items():
        if tid not in ticket_case_ids_by_ticket:
            findings.append(f"ticket missing ticket-level test case coverage: {tid}")
        expected_ticket_cases = ticket_test_case_entries.get(tid, {})
        missing_ticket_cases = sorted(
            test_case_id for test_case_id in expected_ticket_cases if (tid, test_case_id) not in ticket_case_ids_by_ticket_case
        )
        if missing_ticket_cases:
            findings.append(f"ticket missing declared test_cases coverage: {tid} -> {missing_ticket_cases}")

    for tc_id in sorted(case_ids):
        if tc_id not in matrix_tc_ids:
            findings.append(f"test case missing traceability matrix row: {tc_id}")

    # ========== 场景义务完整性校验（scenario_obligation + category + latest_result）==========
    # 对每个 Story，检查 required_test_obligations 是否被 TC 资产覆盖并已执行
    VALID_CATEGORIES = {"positive", "negative", "boundary", "exception", "null_empty"}
    VALID_OBLIGATIONS = {"display", "state_change", "business_rule_reject", "auth_or_data_boundary", "persist_effect"}

    for sid, story in stories.items():
        required_obligations = story.get("required_test_obligations", {}).get("required")
        if not required_obligations:
            required_obligations = _infer_obligations(story)
            if not required_obligations:
                continue

        # 收集该 Story 下所有 TC 的 scenario_obligation + category + latest_result
        covered_obligations: set[str] = set()
        pending_obligations: list[str] = []
        for tc_id in case_ids_by_story.get(sid, set()):
            case = case_by_id.get(tc_id, {})
            obligation = case.get("scenario_obligation")
            category = case.get("category")

            # 校验 category 合法性
            if category and category not in VALID_CATEGORIES:
                findings.append(f"invalid category '{category}' in TC {tc_id}")
            # 校验 scenario_obligation 合法性
            if obligation and obligation not in VALID_OBLIGATIONS:
                findings.append(f"invalid scenario_obligation '{obligation}' in TC {tc_id}")
            # 逐条必填：两个字段都缺 → 报错
            if not obligation and not category:
                findings.append(f"TC {tc_id} missing both category and scenario_obligation")
            # 有 scenario_obligation 但缺 category → 报错
            elif obligation and not category:
                findings.append(f"TC {tc_id} has scenario_obligation='{obligation}' but missing category")
            # 有 category 但缺 scenario_obligation → 报错
            elif category and not obligation:
                findings.append(f"TC {tc_id} has category='{category}' but missing scenario_obligation")

            if isinstance(obligation, str) and obligation.strip():
                covered_obligations.add(obligation)
                # 校验 latest_result：义务对应的 TC 不得为 pending（仅 verify 阶段）
                if stage == "verify":
                    latest_result = case.get("latest_result", {})
                    status = latest_result.get("status") if isinstance(latest_result, dict) else None
                    if status == "pending":
                        pending_obligations.append(f"{tc_id}({obligation})")

        # 回退路径：从 Ticket test_cases 推导
        if not covered_obligations:
            for tid, ticket in tickets.items():
                if ticket.get("story_id") != sid:
                    continue
                for tc_entry in ticket.get("test_cases", []):
                    obligation = tc_entry.get("scenario_obligation")
                    if isinstance(obligation, str) and obligation.strip():
                        covered_obligations.add(obligation)

        # 检查覆盖缺失
        missing = [o for o in required_obligations if o not in covered_obligations]
        if missing:
            findings.append(
                f"scenario obligation gap: {sid} requires {required_obligations}, "
                f"covered={sorted(covered_obligations)}, missing={missing}"
            )

        # 检查已覆盖但未执行（latest_result.status == pending）
        if pending_obligations:
            findings.append(
                f"scenario obligation pending: {sid} has obligations mapped but not executed: "
                f"{pending_obligations}"
            )

    # ========== 操作级完整性校验（operation × obligation 二维覆盖矩阵）==========
    for sid, story in stories.items():
        required_operations = story.get("required_test_operations", {}).get("operations")
        if not isinstance(required_operations, dict) or not required_operations:
            continue

        # 构建二维覆盖矩阵: {operation: set(obligations)}
        covered_op_obligations: dict[str, set[str]] = {}
        pending_op_obligations: dict[str, list[str]] = {}

        for tc_id in case_ids_by_story.get(sid, set()):
            case = case_by_id.get(tc_id, {})
            operation = case.get("operation")
            obligation = case.get("scenario_obligation")
            if not isinstance(operation, str) or not operation.strip():
                continue
            if not isinstance(obligation, str) or not obligation.strip():
                continue
            covered_op_obligations.setdefault(operation, set()).add(obligation)

            if stage == "verify":
                latest_result = case.get("latest_result", {})
                status = latest_result.get("status") if isinstance(latest_result, dict) else None
                if status == "pending":
                    pending_op_obligations.setdefault(operation, []).append(
                        f"{tc_id}({operation}+{obligation})"
                    )

        # 回退路径：从 Ticket test_cases 推导
        if not covered_op_obligations:
            for tid, ticket in tickets.items():
                if ticket.get("story_id") != sid:
                    continue
                for tc_entry in ticket.get("test_cases", []):
                    operation = tc_entry.get("operation")
                    obligation = tc_entry.get("scenario_obligation")
                    if isinstance(operation, str) and operation.strip() and isinstance(obligation, str) and obligation.strip():
                        covered_op_obligations.setdefault(operation, set()).add(obligation)

        # 检查每个 required operation 的 obligation 覆盖
        for op_name, op_spec in required_operations.items():
            required_for_op = op_spec.get("required", []) if isinstance(op_spec, dict) else []
            covered_for_op = covered_op_obligations.get(op_name, set())
            missing_for_op = [o for o in required_for_op if o not in covered_for_op]
            if missing_for_op:
                findings.append(
                    f"operation obligation gap: {sid} operation '{op_name}' requires {required_for_op}, "
                    f"covered={sorted(covered_for_op)}, missing={missing_for_op}"
                )

        # 检查已覆盖但未执行（仅 verify 阶段）
        for op_name, pending_list in pending_op_obligations.items():
            if op_name in required_operations:
                findings.append(
                    f"operation obligation pending: {sid} operation '{op_name}' has TCs mapped but not executed: "
                    f"{pending_list}"
                )

    return findings


def _infer_obligations(story: dict) -> list[str] | None:
    """旧 Story 缺少 required_test_obligations 时的兼容推导"""
    acs = story.get("acceptance_criteria", [])
    if not acs:
        return None
    mutation_keywords = ("新增", "编辑", "删除", "修改", "保存", "创建", "启用", "禁用",
                         "分配", "变更", "create", "update", "delete", "save")
    permission_keywords = ("权限", "角色", "访问", "授权", "permission", "role", "auth")
    text = " ".join(str(ac) for ac in acs).lower()
    if any(kw in text for kw in mutation_keywords) or any(kw in text for kw in permission_keywords):
        return ["display", "state_change", "business_rule_reject", "auth_or_data_boundary", "persist_effect"]
    return ["display", "persist_effect"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test asset completeness guard")
    parser.add_argument("--module", default="permission")
    parser.add_argument("--story-id")
    parser.add_argument("--stories-dir", default="osg-spec-docs/tasks/stories")
    parser.add_argument("--tickets-dir", default="osg-spec-docs/tasks/tickets")
    parser.add_argument("--cases")
    parser.add_argument("--matrix")
    parser.add_argument("--stage", default="split", choices=["split", "approve", "verify"],
                        help="Guard invocation stage: split/approve only check structure, verify also checks pending")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    stories_dir = Path(args.stories_dir)
    tickets_dir = Path(args.tickets_dir)
    cases_doc = Path(args.cases or f"osg-spec-docs/tasks/testing/{args.module}-test-cases.yaml")
    matrix_doc = Path(args.matrix or f"osg-spec-docs/tasks/testing/{args.module}-traceability-matrix.md")

    missing_paths = [str(path) for path in [stories_dir, tickets_dir, cases_doc, matrix_doc] if not path.exists()]
    if missing_paths:
        print("FAIL: test_asset_completeness_guard missing path(s)")
        for path in missing_paths:
            print(f"  - {path}")
        return 1

    findings = evaluate_test_asset_completeness(
        stories_dir=stories_dir,
        tickets_dir=tickets_dir,
        cases_doc=cases_doc,
        matrix_doc=matrix_doc,
        story_id=args.story_id,
        stage=args.stage,
    )
    if findings:
        print(
            "FAIL: test_asset_completeness_guard "
            f"story_id={args.story_id or 'ALL'} stories_dir={stories_dir} tickets_dir={tickets_dir}"
        )
        for item in findings:
            print(f"  - {item}")
        return 1

    print(
        "PASS: test_asset_completeness_guard "
        f"story_id={args.story_id or 'ALL'} stories_dir={stories_dir} tickets_dir={tickets_dir} cases={cases_doc} matrix={matrix_doc}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
