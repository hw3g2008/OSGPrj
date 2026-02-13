# Story-Splitter Skill

---
name: story-splitter
description: "Use when triggered by /split story - breaks requirements into User Stories following INVEST principle"
invoked_by: user
auto_execute: true
---

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

status: pending  # pending | in_progress | completed | blocked
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
[读取需求文档]
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
[INVEST 校验] ◄──────────┐
    │                     │
    ├── 不符合 ───────────┤
    │   拆分/合并         │
    │                     │
    ▼ 符合                │
[生成 Story YAML]         │
    │                     │
    ▼                     │
[FR↔Story 覆盖率校验]     │
    │ - 每个 FR 至少被 1 个 Story 覆盖
    │ - 输出覆盖矩阵表
    │ - 有遗漏则补充 Story 并重新校验
    │                     │
    ├── 有遗漏 ───────────┘
    │
    ▼ 全覆盖
[更新 STATE.yaml]
```

## 执行伪代码

```python
def split_stories(requirement_doc):
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
                "status": "pending",
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

    # ========== 校验循环 ==========
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
            # 补充 Story 覆盖遗漏的 FR
            additional = create_stories_for_uncovered(uncovered, requirement_doc)
            stories.extend(additional)
            continue  # 回到 INVEST 校验

        print("  覆盖率校验: ✅ 100%")

        # 全部通过
        break
    else:
        # 达到最大迭代次数仍未通过
        print(f"❌ 达到最大迭代次数 ({max_iterations}/{max_iterations})")
        print("请人工检查后重新执行 /split story")
        return {"status": "failed", "reason": "max_iterations_exceeded"}

    # 输出覆盖矩阵
    print_coverage_matrix(all_fr_ids, stories)

    # 保存 Story 文件（仅在全部校验通过后）
    for story in stories:
        write_yaml(f"osg-spec-docs/tasks/stories/{story['id']}.yaml", story)

    # 更新 STATE.yaml
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    state.stories = [s['id'] for s in stories]
    state.workflow.current_step = "story_split_done"
    state.workflow.next_step = "approve_stories"
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)

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

## 硬约束

- 每个 Story 必须符合 INVEST
- 每个 Story 必须有验收标准
- Story 不能超过 5 天工作量
- 必须关联需求 ID
- **禁止超过 max_iterations（5 次）迭代** - 达到上限必须失败退出
- **每次迭代必须输出进度** - 格式：`🔄 校验迭�� N/5`
- **禁止在校验未全部通过时保存 Story 文件或更新 STATE.yaml**
