---
name: story-splitter
description: "Use when triggered by /split story - breaks requirements into User Stories following INVEST principle"
metadata:
  invoked-by: "user"
  auto-execute: "true"
---

# Story-Splitter Skill

## 概览

将需求文档拆解为符合 INVEST 原则的 User Stories。

## 何时使用

- `/split story` 命令
- 需求分析完成后
- 需要将大需求拆分为可管理的 Stories

## INVEST 原则

| 原则 | 说明 | 检查问题 |
|------|------|----------|
| **I**ndependent | 独立 | 是否依赖其他 Story？ |
| **N**egotiable | 可协商 | 需求是否足够灵活？ |
| **V**aluable | 有价值 | 对用户有明确价值吗？ |
| **E**stimable | 可估算 | 能估算工作量吗？ |
| **S**mall | 小 | 能在一个迭代完成吗？ |
| **T**estable | 可测试 | 能写验收测试吗？ |

## Story 模板

```yaml
# osg-spec-docs/tasks/stories/S-{number}.yaml

id: "S-001"
title: "用户可以登录系统"
description: |
  作为 学生用户
  我想要 使用手机号登录系统
  以便于 访问我的课程和学习资料

status: pending  # pending | approved | done | blocked
priority: P0     # P0 | P1 | P2
estimate: 3d     # 估算工时

# 验收标准
acceptance_criteria:
  - "输入正确手机号和密码可以登录"
  - "登录后跳转到首页"
  - "错误时显示错误提示"

# 依赖
dependencies: []

# 关联需求
requirements:
  - "REQ-001"

# Tickets（后续拆分填充）
tickets: []

# 时间戳
created_at: "2026-02-03T12:00:00Z"
updated_at: "2026-02-03T12:00:00Z"
```

## 执行流程

```
[Phase 1: 输入收集]
    │ - 读取 config.yaml + STATE.yaml
    │ - 获取 module_name
    │ - 检查 SRS 文档是否存在（不存在 → 失败退出）
    │ - 检查已有 Stories → 自动清理
    │
    ▼
[读取 SRS 文档（osg-spec-docs/docs/02-requirements/srs/{module}.md）]
    │
    ▼
[识别用户角色]
    │ - 学生、导师、班主任等
    │
    ▼
[按功能模块拆分]
    │ - 每个模块 1-3 个 Stories
    │
    ▼
┌─ Phase 2: 领域专项校验（max 5 轮）──┐
│ [INVEST 校验] ── 不符合？────────┐│
│  ✅                                ││
│ [FR↔Story 覆盖率] ─ 有遗漏？────┘│
│  ✅                                 │
└─────────────────────────────────────┘
    │ ✅ 全部通过（或达到上限 → 失败退出）
    ▼
┌─ Phase 3: 增强全局终审（参见 quality-gate/SKILL.md）──┐
│ 每轮 = 三维度终审 + 多维度旋转校验（A~I）             │
│ 退出条件：连续两轮无修改                               │
│ 上限：max 10 轮（达到上限 → 失败退出）                │
└────────────────────────────────────────────────────────┘
    │ ✅ 连续两轮无修改
    ▼
[更新 STATE.yaml]
```

## 执行伪代码

```python
def split_stories_main():
    # ========== Phase 1: 输入收集 ==========
    config = load_yaml(".claude/project/config.yaml")
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    module_name = state.current_requirement

    # 读取 SRS 文档（brainstorm 产物，SSOT）
    srs_path = f"{config.paths.docs.srs}{module_name}.md"
    if not exists(srs_path):
        return failed(f"SRS 文档不存在: {srs_path}，请先执行 /brainstorm {module_name}")
    requirement_doc = read_file(srs_path)

    # 检查已有 Stories（重新拆分场景，自动清理）
    existing_stories = glob(f"osg-spec-docs/tasks/stories/S-*.yaml")
    if existing_stories:
        print(f"⚠️ 发现 {len(existing_stories)} 个已有 Stories，将清理后重新拆分")
        cleanup_stories(existing_stories)

    # ========== Phase 2~3: 拆分 + 校验 ==========
    return split_stories(requirement_doc)


def infer_required_test_obligations(story, profiles):
    """旧 Story 缺少 required_test_obligations 时的兼容推导。
    签名: (story: dict, profiles: dict) -> dict
    profiles 来自 config.testing.design.scenario_obligations.profiles
    返回: {"profile": "crud"|"display_only", "required": [...]}
    """
    if any(matches_mutation_or_permission_ac(ac) for ac in story.get("acceptance_criteria", [])):
        return profiles["crud"]
    return profiles["display_only"]


def ensure_required_test_obligations(story, profiles):
    """对 Story 做 obligation 包装层。
    - 已有 required_test_obligations: 保留并做最小规范化
    - 缺字段: 调用 infer_required_test_obligations(story, profiles) 回填
    该 helper 既供 /split story 使用，也供历史资产迁移命令复用。"""


def infer_required_test_operations(story, operation_profiles, allowed_obligations):
    """旧 Story 缺少 required_test_operations 时的兼容推导。
    签名: (story: dict, operation_profiles: dict, allowed_obligations: set) -> dict | None
    operation_profiles 来自 config.testing.design.operation_obligations.profiles
    allowed_obligations 来自 config.testing.design.scenario_obligations.allowed
    返回: {"profile": "crud_minimal", "operations": {...}} 或 None（display-only）
    约束: 每个 operations.*.required[] 的值必须是 allowed_obligations 的成员
    """
    acs = story.get("acceptance_criteria", [])
    text = " ".join(str(ac) for ac in acs).lower()
    mutation_keywords = ("新增", "编辑", "删除", "修改", "保存", "创建", "启用", "禁用",
                         "重置", "create", "update", "delete", "save", "enable", "disable")
    if any(kw in text for kw in mutation_keywords):
        profile = operation_profiles.get("crud_minimal")
        if profile:
            return {"profile": "crud_minimal", "operations": profile["operations"]}
    return None


def ensure_required_test_operations(story, operation_profiles, allowed_obligations):
    """对 Story 做 operation 包装层。
    - 已有 required_test_operations: 保留并做最小规范化（校验 required[] ⊆ allowed_obligations）
    - 缺字段: 调用 infer_required_test_operations(story, operation_profiles, allowed_obligations) 回填
    - display-only Story: 不设置该字段（返回 None）
    该 helper 既供 /split story 使用，也供历史资产迁移命令复用。"""
    current = story.get("required_test_operations")
    if isinstance(current, dict) and current.get("operations"):
        for op_name, op_spec in current["operations"].items():
            required = op_spec.get("required", [])
            op_spec["required"] = [r for r in required if r in allowed_obligations]
        return current
    inferred = infer_required_test_operations(story, operation_profiles, allowed_obligations)
    if inferred:
        story["required_test_operations"] = inferred
    return inferred


def matches_mutation_or_permission_ac(ac: str) -> bool:
    """判断 AC 是否涉及数据变更或权限操作。
    匹配关键词：新增/编辑/删除/修改/保存/创建/启用/禁用/分配/变更/权限/角色/访问/授权"""

def matches_obligation(ac: str, obligation: str) -> bool:
    """判断 AC 文本是否语义匹配指定的 scenario_obligation。
    匹配规则：
      display → "展示"/"显示"/"可见"/"列表"/"非空"
      state_change → "新增"/"编辑"/"成功"/"保存"/"创建"
      business_rule_reject → "拒绝"/"不允许"/"禁止"/"失败"/"被阻止"
      auth_or_data_boundary → "权限"/"无法访问"/"未授权"/"角色限制"
      persist_effect → "持久化"/"生效"/"刷新后仍"/"立即更新"/"二次进入"
    """

def generate_obligation_ac(story: dict, obligation: str) -> str:
    """为缺失的 obligation 自动生成带双标签的 AC 文本。
    返回格式: "[category][obligation] 描述文本"
    """


def split_stories(requirement_doc):  # requirement_doc = SRS 文档（brainstorm 产物，SSOT）
    stories = []

    # 识别用户角色
    roles = extract_roles(requirement_doc)

    # 按功能模块拆分
    modules = extract_modules(requirement_doc)

    story_number = 1
    for module in modules:
        for feature in module.features:
            # 创建 Story
            story = {
                "id": f"S-{story_number:03d}",
                "title": feature.title,
                "description": format_user_story(feature, roles),
                "status": "pending",  # pending | approved | done | blocked
                "priority": feature.priority,
                "acceptance_criteria": feature.acceptance_criteria,
                "requirements": feature.requirement_ids
            }

            # INVEST 校验
            invest_result = validate_invest(story)
            if not invest_result.passed:
                # 拆分或调整
                story = adjust_story(story, invest_result.issues)

            stories.append(story)
            story_number += 1

    # ========== Phase 2: 领域专项校验 ==========
    max_iterations = 5
    iteration = 0

    while iteration < max_iterations:
        iteration += 1
        print(f"🔄 校验迭代 {iteration}/{max_iterations}")

        # --- INVEST 校验（所有 Stories）---
        invest_issues = []
        for story in stories:
            result = validate_invest(story)
            if not result.passed:
                invest_issues.append((story["id"], result.issues))

        if invest_issues:
            print(f"  INVEST 校验: ❌ {len(invest_issues)} 个 Story 不符合")
            for story_id, issues in invest_issues:
                story = find_story(stories, story_id)
                story = adjust_story(story, issues)
            continue  # 重新校验

        print("  INVEST 校验: ✅ 全部通过")

        # --- FR↔Story 覆盖率校验 ---
        all_fr_ids = extract_all_fr_ids(requirement_doc)
        covered_frs = set()
        for story in stories:
            covered_frs.update(story["requirements"])

        uncovered = all_fr_ids - covered_frs
        if uncovered:
            print(f"  覆盖率校验: ❌ {len(uncovered)} 个 FR 未覆盖")
            additional = create_stories_for_uncovered(uncovered, requirement_doc)
            stories.extend(additional)
            continue  # 回到 INVEST 校验

        print("  覆盖率校验: ✅ 100%")

        # --- 场景义务校验（required_test_obligations）---
        # 读取 config 中定义的 scenario_obligations profiles
        obligation_profiles = config.testing.design.scenario_obligations.profiles
        obligation_issues = []

        for story in stories:
            # 统一走 ensure 包装层，供 split / migrate 共用
            story["required_test_obligations"] = ensure_required_test_obligations(story, obligation_profiles)
            # 🆕 操作级义务推导（在 obligation 之后）
            operation_profiles = config.testing.design.operation_obligations.profiles
            allowed_obligations_set = set(config.testing.design.scenario_obligations.allowed)
            story["required_test_operations"] = ensure_required_test_operations(
                story, operation_profiles, allowed_obligations_set
            )
            required = story["required_test_obligations"]["required"]
            acs = story.get("acceptance_criteria", [])

            # 检查每个 required obligation 是否至少有一条 AC 覆盖
            for obligation in required:
                has_matching_ac = any(
                    matches_obligation(ac, obligation)  # 语义匹配：display→展示/可见, state_change→新增/编辑/成功, etc.
                    for ac in acs
                )
                if not has_matching_ac:
                    obligation_issues.append(
                        f"{story['id']}: 缺少 '{obligation}' 类场景义务的 AC"
                    )

        if obligation_issues:
            print(f"  场景义务校验: ❌ {len(obligation_issues)} 个缺失")
            for issue in obligation_issues:
                print(f"    - {issue}")
            # 自动补充缺失的 AC
            for story in stories:
                required = story["required_test_obligations"]["required"]
                acs = story.get("acceptance_criteria", [])
                for obligation in required:
                    if not any(matches_obligation(ac, obligation) for ac in acs):
                        story["acceptance_criteria"].append(
                            generate_obligation_ac(story, obligation)
                            # e.g. "[positive][display] 页面正确展示角色列表，关键列非空"
                            # e.g. "[negative][business_rule_reject] 有员工绑定的角色删除被业务规则拒绝"
                        )
            continue  # 回到 INVEST 校验

        print("  场景义务校验: ✅ 全部通过")
        break  # Phase 2 通过
    else:
        print(f"❌ Phase 2 达到最大迭代次数 ({max_iterations}/{max_iterations})")
        print("请人工检查后重新执行 /split story")
        return {"status": "failed", "reason": "Phase 2 max_iterations_exceeded"}


    # ========== Phase 3: 增强全局终审 ==========
    # 参见 quality-gate/SKILL.md 的 enhanced_global_review()
    # 本环节维度优先级: A → G → H → C → B → D → F → E → I
    # 本环节三维度检查:
    #   上游一致性: 需求文档 FR 100% 覆盖？
    #   下游可行性: 每个 Story 有 AC 且可拆为 Tickets？估算 ≤5 天？
    #   全局完整性: Stories 之间无重叠？

    dim_priority = ["A", "G", "H", "C", "B", "D", "F", "E", "I"]
    max_enhanced_rounds = 10
    no_change_rounds = 0
    dim_index = 0
    last_had_changes = False

    for round_num in range(1, max_enhanced_rounds + 1):
        all_issues = []

        # --- 3a. 三维度终审（每轮都做） ---
        # 上游一致性
        all_fr_ids = extract_all_fr_ids(requirement_doc)
        covered_frs = set()
        for story in stories:
            covered_frs.update(story["requirements"])
        if all_fr_ids - covered_frs:
            all_issues.append(f"上游一致性: {len(all_fr_ids - covered_frs)} 个 FR 未覆盖")

        # 下游可行性
        for story in stories:
            if not story.get("acceptance_criteria"):
                all_issues.append(f"下游可行性: {story['id']} 缺少验收标准")
            if estimate_days(story.get("estimate", "0d")) > 5:
                all_issues.append(f"下游可行性: {story['id']} 估算超过 5 天")

        # 全局完整性
        for i, s1 in enumerate(stories):
            for s2 in stories[i+1:]:
                overlap = set(s1["requirements"]) & set(s2["requirements"])
                if overlap:
                    all_issues.append(f"全局完整性: {s1['id']} 和 {s2['id']} 覆盖相同 FR: {overlap}")

        # --- 3b. 多维度旋转校验（每轮选一个维度） ---
        if last_had_changes:
            dim = "H"  # 上轮有修改，优先检查交叉影响
        else:
            dim = dim_priority[dim_index % len(dim_priority)]
            dim_index += 1

        dim_issues = check_dimension(stories, dim, DIMENSION_MEANINGS["story"][dim])
        all_issues += dim_issues

        # --- 输出进度 ---
        print(f"🔍 终审轮次 {round_num}/{max_enhanced_rounds} (维度 {dim})")

        # --- 判断 ---
        if all_issues:
            print(f"  ❌ {len(all_issues)} 个问题")
            for issue in all_issues:
                print(f"    - {issue}")
            stories = fix_stories(stories, all_issues)
            no_change_rounds = 0
            last_had_changes = True
        else:
            print(f"  ✅ 无问题")
            no_change_rounds += 1
            last_had_changes = False
            if no_change_rounds >= 2:
                print(f"🎉 连续 {no_change_rounds} 轮无修改，终审通过")
                break
    else:
        return {"status": "failed", "reason": f"增强终审经过 {max_enhanced_rounds} 轮仍未通过，请人工介入"}

    # 输出覆盖矩阵（仅 Phase 3 通过后）
    print_coverage_matrix(all_fr_ids, stories)

    # 生成 story 级测试骨架（split-story 阶段必须产出，implement 阶段不得补造）
    for story in stories:
        story["story_cases"] = []
        for ac_idx, _ac in enumerate(story.get("acceptance_criteria", []), 1):
            story["story_cases"].append({
                "story_case_id": f"SC-{story['id']}-{ac_idx:03d}",
                "ac_ref": f"AC-{story['id']}-{ac_idx:02d}",
            })

    # 保存 Story 文件（仅在全部校验通过后）
    for story in stories:
        write_yaml(f"osg-spec-docs/tasks/stories/{story['id']}.yaml", story)

    # 写入 phase-proof（approve stories 的 preflight_guard 会校验）
    module = state.current_requirement
    proof = {
        "schema_version": "1.0",
        "module": module,
        "phase": "story_split",
        "target_id": module,
        "rounds": round_num,  # Phase 3 终审轮次
        "issues_count": 0,
        "coverage": f"{len(all_fr_ids)}/{len(all_fr_ids)}",
        "generated_at": now_iso(),
        "source_hash": sha256_normalized(f"osg-spec-docs/docs/02-requirements/srs/{module}.md"),
        "status": "passed"
    }
    write_json(f"osg-spec-docs/tasks/proofs/{module}/story_split_phase_proof.json", proof)

    # 更新 STATE.yaml — 通过 transition() 统一入口
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    state.stories = [s['id'] for s in stories]
    state.stats.total_stories = len(stories)
    transition("/split story", state, "story_split_done")

    return stories
```

## FR↔Story 覆盖率矩阵

拆分完成后必须输出覆盖率矩阵，确保每个功能需求都被至少一个 Story 覆盖：

```markdown
### FR↔Story 覆盖矩阵

| FR ID | FR 标题 | 覆盖 Story | 状态 |
|-------|---------|-----------|------|
| FR-01.1 | 登录表单 | S-002 | ✅ |
| FR-01.2 | 前端校验 | S-002 | ✅ |
| FR-03.1 | 角色列表 | S-003 | ✅ |
| FR-04.1 | 用户搜索 | S-004 | ✅ |

覆盖率: 30/30 = 100% ✅
```

如果覆盖率不是 100%，必须补充 Story 直到全覆盖。

## 输出格式

```markdown
## 📋 Story 拆分结果

### 统计
- 总 Stories: {count}
- P0: {p0_count}
- P1: {p1_count}

### Stories 列表

| ID | 标题 | 优先级 | 估算 | INVEST |
|----|------|--------|------|--------|
| S-001 | 用户登录 | P0 | 3d | ✅ |
| S-002 | 用户注册 | P0 | 2d | ✅ |
| S-003 | 密码找回 | P1 | 2d | ✅ |

### ⏭️ 下一步
执行 `/approve stories` 审批 Story 拆分
```

## 失败退出规则

```
⚠️ Phase 1 失败：SRS 文档不存在：
1. 输出错误信息（提示先执行 /brainstorm {module}）
2. 不更新 workflow.current_step — 保持在执行前的状态
3. 停止 — 上游有问题不往下跑

⚠️ Phase 2 失败：当 max_iterations（5 次）迭代后仍有校验项未通过：
1. 输出失败报告（列出所有未通过的 INVEST 项和未覆盖的 FR）
2. 不更新 workflow.current_step — 保持在执行前的状态
3. 不保存 Story 文件 — 禁止写入不完整的产物
4. 停止自动继续 — 提示用户人工介入
5. 用户可以补充信息后重新执行 /split story

⚠️ Phase 3 失败：当增强终审经过 max_enhanced_rounds（10 轮）后仍有问题：
1. 输出失败报告（列出最后一轮的所有未通过项，包括三维度终审和多维度旋转校验）
2. 不更新 workflow.current_step — 保持在执行前的状态
3. 不保存 Story 文件 — 禁止写入不完整的产物
4. 停止自动继续 — 提示用户人工介入
5. 用户可以修复后重新执行 /split story
```

## 硬约束

- 每个 Story 必须符合 INVEST
- 每个 Story 必须有验收标准
- Story 不能超过 5 天工作量
- 必须关联需求 ID
- **禁止超过 max_iterations（5 次）迭代** - Phase 2 达到上限必须失败退出
- **禁止超过 max_enhanced_rounds（10 轮）增强终审** - Phase 3 达到上限必须失败退出
- **连续两轮无修改才算通过** - 不是一轮无修改就通过
- **上轮有修改 → 维度 H** - 任何修改后必须优先检查交叉影响
- **每次迭代必须输出进度** - Phase 2：`🔄 校验迭代 N/5`，Phase 3：`� 终审轮次 N/10 (维度 X)`
- **禁止在校验未全部通过时保存 Story 文件或更新 STATE.yaml**

---

## 🚨 迭代计数强制规则

**每次校验循环开始时，必须输出迭代进度：**

```
=== Phase 2: 领域专项校验 ===
🔄 校验迭代 1/5
  - INVEST 校验: ❌ 2 个 Story 不符合 (S-001 过大, S-003 不可测试)
  → 调整后重新校验...

🔄 校验迭代 2/5 (上轮调整 2 个 Story)
  - INVEST 校验: ✅ 全部通过
  - FR↔Story 覆盖率: ❌ 3 个 FR 未覆盖
  → 补充 Stories...

🔄 校验迭代 3/5 (上轮补充 2 个 Story)
  - INVEST 校验: ✅ 全部通过
  - FR↔Story 覆盖率: ✅ 100%

=== Phase 3: 增强全局终审 ===
🔍 终审轮次 1/10 (维度 A — 结构正确性)
  三维度终审: ✅ 3/3
  多维度校验 (A): ❌ 1 个问题
    - S-002 和 S-005 编号不连续

🔍 终审轮次 2/10 (维度 H — 交叉影响)
  三维度终审: ✅ 3/3
  多维度校验 (H): ✅ 无问题

🔍 终审轮次 3/10 (维度 G — 语义准确性)
  三维度终审: ✅ 3/3
  多维度校验 (G): ✅ 无问题

🎉 连续 2 轮无修改，终审通过
```
