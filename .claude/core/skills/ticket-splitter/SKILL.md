# Ticket-Splitter Skill

---
name: ticket-splitter
description: "Use when triggered by /split ticket S-xxx - breaks Story into micro-tasks (2-5 min each) with automatic multi-round validation"
invoked_by: user
auto_execute: true
---

## 概览

将 Story 拆解为微任务 Tickets，每个 Ticket 2-5 分钟可完成。自动迭代校验，直到所有检查项通过。

每个 Ticket 必须指定 `type`，可选值：`backend | frontend | frontend-ui | database | test | config`

## 何时使用

- `/split ticket S-xxx` 命令
- Story 审批通过后
- 需要将 Story 拆分为可执行的最小单元

## ⚠️ 执行模式 - 自动迭代

```
⚠️ 铁律：
1. 不等待用户确认 - 自动继续校验
2. 必须循环迭代 - 直到所有检查项都是 ✅
3. 有任何问题就修复，然后重新校验
4. 校验未全部通过前禁止更新 STATE.yaml
```

## 微任务原则

```
⚠️ 核心原则：
1. 每个 Ticket 2-5 分钟可完成
2. 每个 Ticket 只做一件事
3. 每个 Ticket 有明确的验收标准
4. 每个 Ticket 有严格的 allowed_paths
```

## Ticket 模板

```yaml
# osg-spec-docs/tasks/tickets/T-{number}.yaml

id: "T-001"
story_id: "S-001"
title: "创建登录 API 接口定义"
type: backend  # backend | frontend | frontend-ui | database | test | config

status: pending  # pending | in_progress | completed | blocked
estimate: 5m     # 2-5 分钟

# 允许修改的文件路径（严格限制）
allowed_paths:
  modify:
    - "{path/to/modify/file}"
  read:                              # 可选
    - "{path/to/read-only/file}"

# 验收标准
acceptance_criteria:
  - "创建 POST /api/login 接口"
  - "请求体包含 phone, password"
  - "返回 token 或错误信息"

# 依赖的 Tickets
dependencies: []

# 时间戳
created_at: "2026-02-03T12:00:00Z"
completed_at: null
```

## 执行流程

```
[读取 Story]
    │ - osg-spec-docs/tasks/stories/S-xxx.yaml
    │
    ▼
[分析验收标准]
    │ - 每个标准对应 1-N 个 Tickets
    │
    ▼
[识别工作类型]
    │ - backend / frontend / frontend-ui / database / test / config
    │
    ▼
[拆分为微任务]
    │
    ▼
[分配 allowed_paths]
    │ - 每个 Ticket 严格限制
    │
    ▼
[依赖分析]
    │ - 确定执行顺序
    │
    ▼
[生成 Ticket YAML] ◄──────────────────┐
    │                                   │
    ▼                                   │
[质量校验（6 项）] ──── 有问题？────────┤
    │ ✅ 全部通过                       │ 修复 Tickets
    ▼                                   │
[覆盖率校验] ──── 有遗漏？─────────────┘
    │ ✅ 100% 覆盖
    │
    ▼
[输出校验报告 + 覆盖矩阵]
    │
    ▼
[更新 Story 和 STATE]
```

## 质量校验项（6 项）

| 检查项 | 检查问题 | 通过条件 | 不通过条件 |
|--------|----------|----------|------------|
| 微任务粒度 | 每个 Ticket 估算是否在 2-5 分钟内？ | 全部在范围内 | 任一超出 → 继续拆分 |
| 单一职责 | 每个 Ticket 是否只做一件事？ | 是 | 否 → 拆分 |
| allowed_paths | 每个 Ticket 是否有 modify 路径？ | 全部有 | 任一缺失 → 补充 |
| 路径存在性 | allowed_paths 中的路径是否为合法路径（已存在或将要创建）？ | 是 | 否 → 修正 |
| 依赖无环 | 依赖关系是否形成 DAG（无环图）？ | 是 | 否 → 调整依赖 |
| 验收可测 | 每个 Ticket 的 acceptance_criteria 是否可客观验证？ | 是 | 否 → 改写为可验证语句 |

## 覆盖率校验

拆分完成后必须校验 **Story 验收标准 ↔ Ticket 覆盖率**：

- 每个 Story acceptance_criteria 至少被 1 个 Ticket 覆盖
- 有遗漏则补充 Ticket，然后重新执行质量校验
- 覆盖率必须 100%

## 拆分示例

```yaml
# 输入：S-001 用户登录

# 输出 Tickets:
T-001:
  title: "创建 LoginController 类"
  type: backend
  estimate: 3m
  allowed_paths:
    modify:
      - "ruoyi-admin/src/main/java/**/controller/LoginController.java"

T-002:
  title: "实现登录接口逻辑"
  type: backend
  estimate: 5m
  dependencies: [T-001]
  allowed_paths:
    modify:
      - "ruoyi-admin/src/main/java/**/controller/LoginController.java"

T-003:
  title: "创建 LoginService 接口"
  type: backend
  estimate: 3m
  allowed_paths:
    modify:
      - "ruoyi-system/src/main/java/**/service/ILoginService.java"

T-004:
  title: "实现 LoginService"
  type: backend
  estimate: 5m
  dependencies: [T-003]
  allowed_paths:
    modify:
      - "ruoyi-system/src/main/java/**/service/impl/LoginServiceImpl.java"

T-005:
  title: "创建登录页面组件"
  type: frontend
  estimate: 5m
  allowed_paths:
    modify:
      - "osg-frontend/packages/student/src/views/Login.vue"

T-006:
  title: "实现登录 API 调用"
  type: frontend
  estimate: 3m
  dependencies: [T-005]
  allowed_paths:
    modify:
      - "osg-frontend/packages/shared/src/api/auth.ts"

T-007:
  title: "编写登录单元测试"
  type: test
  estimate: 5m
  dependencies: [T-002, T-004]
  allowed_paths:
    modify:
      - "ruoyi-admin/src/test/java/**/controller/LoginControllerTest.java"
```

## 执行伪代码

```python
def split_tickets(story_id):
    story = read_yaml(f"osg-spec-docs/tasks/stories/{story_id}.yaml")
    config = read_yaml(".claude/project/config.yaml")

    tickets = []
    ticket_number = 1

    for criteria in story.acceptance_criteria:
        # 分析需要的工作
        work_items = analyze_work(criteria, config.paths)

        for item in work_items:
            ticket = {
                "id": f"T-{ticket_number:03d}",
                "story_id": story_id,
                "title": item.title,
                "type": item.type,
                "status": "pending",
                "estimate": estimate_time(item),
                "allowed_paths": item.paths,
                "acceptance_criteria": item.criteria,
                "dependencies": item.dependencies
            }

            tickets.append(ticket)
            ticket_number += 1

    # ========== 校验循环 ==========
    max_iterations = 5
    iteration = 0

    while iteration < max_iterations:
        iteration += 1

        # --- 质量校验（6 项）---
        quality_issues = []
        for ticket in tickets:
            # 1. 微任务粒度
            if not is_micro_task(ticket):
                quality_issues.append(f"{ticket['id']}: 估算超出 2-5 分钟，需要继续拆分")
            # 2. 单一职责
            if not is_single_responsibility(ticket):
                quality_issues.append(f"{ticket['id']}: 职责不单一，需要拆分")
            # 3. allowed_paths 存在
            if not ticket.get("allowed_paths", {}).get("modify"):
                quality_issues.append(f"{ticket['id']}: 缺少 allowed_paths.modify")
            # 4. 路径合法性
            for path in ticket.get("allowed_paths", {}).get("modify", []):
                if not is_valid_path(path, config):
                    quality_issues.append(f"{ticket['id']}: 路径不合法 {path}")
            # 5. 验收可测
            for ac in ticket.get("acceptance_criteria", []):
                if not is_verifiable(ac):
                    quality_issues.append(f"{ticket['id']}: 验收标准不可测 '{ac}'")

        # 依赖无环（全局检查）
        if has_cycle(tickets):
            quality_issues.append("依赖关系存在环，需要调整")

        if quality_issues:
            tickets = fix_quality_issues(tickets, quality_issues)
            continue  # 重新校验

        # --- 覆盖率校验 ---
        uncovered = []
        for ac in story.acceptance_criteria:
            covered = any(
                ticket_covers_criteria(t, ac) for t in tickets
            )
            if not covered:
                uncovered.append(ac)

        if uncovered:
            # 补充 Ticket 覆盖遗漏的验收标准
            additional = create_tickets_for_uncovered(uncovered, story, config)
            tickets.extend(additional)
            continue  # 回到质量校验

        # 全部通过
        break
    else:
        # 达到最大迭代次数仍未通过
        raise SplitFailure(
            f"经过 {max_iterations} 轮迭代仍有校验未通过，"
            "请人工检查 Ticket 拆分结果"
        )

    # ========== 输出校验报告 ==========
    print_quality_report(tickets, iteration)
    print_coverage_matrix(story.acceptance_criteria, tickets)

    # ========== 保存（仅在全部校验通过后）==========
    for ticket in tickets:
        write_yaml(f"osg-spec-docs/tasks/tickets/{ticket['id']}.yaml", ticket)

    # 更新 Story
    story.tickets = [t['id'] for t in tickets]
    write_yaml(f"osg-spec-docs/tasks/stories/{story_id}.yaml", story)

    # 更新 STATE
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    state.tickets.extend([t['id'] for t in tickets])
    state.workflow.current_step = "ticket_split_done"
    state.workflow.next_step = "approve_tickets"
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)

    return tickets
```

## 失败退出规则

```
⚠️ 当 max_iterations（默认 5）次迭代后仍有校验项未通过：
1. 输出失败报告（列出所有未通过的校验项和具体问题）
2. 不更新 workflow.current_step — 保持在执行前的状态
3. 停止自动继续 — 提示用户人工介入
4. 用户可以调整 Story 后重新执行 /split ticket S-xxx
```

## 覆盖率矩阵

拆分完成后必须输出覆盖率矩阵：

```markdown
### Story 验收标准 ↔ Ticket 覆盖矩阵

| # | 验收标准 | 覆盖 Ticket | 状态 |
|---|----------|-----------|------|
| 1 | 登录表单包含账号/密码/验证码 | T-005 | ✅ |
| 2 | 登录成功后跳转首页 | T-006 | ✅ |
| 3 | 错误时显示错误提示 | T-005, T-006 | ✅ |

覆盖率: 3/3 = 100% ✅
```

如果覆盖率不是 100%，必须补充 Ticket 直到全覆盖。

## 输出格式

```markdown
## 🎫 Ticket 拆分结果

**Story**: S-001 - 用户登录

### 校验轮次
- 总轮次: {iteration}
- 质量校验: ✅ 6/6 通过
- 覆盖率校验: ✅ 100%

### 统计
- 总 Tickets: 7
- Backend: 4
- Frontend: 2
- Test: 1

### Tickets 列表

| ID | 标题 | 类型 | 估算 | 依赖 |
|----|------|------|------|------|
| T-001 | 创建 LoginController | backend | 3m | - |
| T-002 | 实现登录逻辑 | backend | 5m | T-001 |
| ...  | ... | ... | ... | ... |

### 依赖图
T-001 ──→ T-002 ──┐
                   ├──→ T-007
T-003 ──→ T-004 ──┘

T-005 ──→ T-006

### 验收标准覆盖矩阵

| # | 验收标准 | 覆盖 Ticket | 状态 |
|---|----------|-----------|------|
| 1 | ... | T-001 | ✅ |
| 2 | ... | T-002, T-003 | ✅ |

覆盖率: N/N = 100% ✅

### ⏭️ 下一步
执行 `/approve tickets` 审批 Ticket 拆分
```

## 硬约束

- 每个 Ticket 必须 2-5 分钟
- 每个 Ticket 必须有 allowed_paths
- 依赖必须形成 DAG（无环）
- 必须覆盖所有验收标准
- 禁止跳过任何校验项
- 禁止在校验未全部通过时保存 Ticket 文件或更新 STATE.yaml
- 禁止停下来等待用户确认
- 必须循环直到全部 ✅
- **禁止超过 max_iterations（5 次）迭代** - 达到上限必须失败退出
- **每次迭代必须输出进度** - 格式：`🔄 校验迭代 N/5`

---

## 🚨 迭代计数强制规则

**每次校验循环开始时，必须输出迭代进度：**

```
🔄 校验迭代 1/5
  - 质量校验: 检查中...
  - 覆盖率校验: 检查中...

🔄 校验迭代 2/5 (上轮发现 3 个问题，已修复)
  - 质量校验: 检查中...
  - 覆盖率校验: 检查中...
```

**达到 max_iterations 时的强制行为：**

```python
if iteration >= max_iterations:
    # 必须执行以下步骤，不可跳过
    print("❌ 达到最大迭代次数 (5/5)")
    print("未通过的校验项:")
    for issue in remaining_issues:
        print(f"  - {issue}")
    print("\n请人工检查后重新执行 /split ticket")

    # 不更新任何状态
    # 不保存任何文件
    # 立即停止
    return {"status": "failed", "reason": "max_iterations_exceeded"}
```
