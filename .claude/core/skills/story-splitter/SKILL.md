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
[更新 STATE.yaml]         │
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
    
    # 保存 Story 文件
    for story in stories:
        write_yaml(f"osg-spec-docs/tasks/stories/{story['id']}.yaml", story)
    
    # 更新 STATE.yaml
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    state.stories = [s['id'] for s in stories]
    state.phase = "story_split_pending_approval"
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
    
    return stories
```

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
