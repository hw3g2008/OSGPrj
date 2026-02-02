# Templates 模板文件

本文档定义 `.claude/core/templates/` 目录下所有模板文件的具体内容。

---

## 目录结构

```
.claude/core/templates/
├── story.yaml         # Story 模板
├── ticket.yaml        # Ticket 模板
├── checkpoint.yaml    # 检查点模板
├── log.yaml           # 执行日志模板
└── state.yaml         # 全局状态模板
```

---

## 1. story.yaml

```yaml
# .claude/core/templates/story.yaml
# Story 模板 - 由 story-splitter 使用

id: "S-{序号}"                    # 格式: S-001, S-002, ...
requirement_id: "REQ-{序号}"      # 关联的需求 ID
title: ""                         # Story 标题
description: |
  # 用户故事描述
  # 格式: 作为[角色]，我想要[功能]，以便[价值]

# INVEST 原则检查
invest:
  independent: false              # 是否独立
  negotiable: false               # 是否可协商
  valuable: false                 # 是否有价值
  estimable: false                # 是否可估算
  small: false                    # 是否够小
  testable: false                 # 是否可测试

# 涉及的端
endpoints: []                     # backend | frontend | database

# 关联的 Tickets（拆解后填充）
tickets: []

# 验收标准（Story 级别）
acceptance: []
# 示例:
#   - "用户列表正常显示，支持分页"
#   - "可以新增用户，必填项校验正常"

# 依赖关系
dependencies:
  stories: []                     # 依赖的其他 Story
  
# 状态
status: "pending"                 # pending | in_progress | completed | blocked
progress: "0/0"                   # 已完成/总数
priority: "P1"                    # P0 | P1 | P2

# 时间戳
created_at: ""
started_at: null
completed_at: null
```

---

## 2. ticket.yaml

```yaml
# .claude/core/templates/ticket.yaml
# Ticket 模板 - 由 ticket-splitter 使用

id: "T-{序号}"                    # 格式: T-001, T-002, ...
story_id: "S-{序号}"              # 所属 Story
title: ""                         # Ticket 标题
description: |
  # 任务描述
  # 简洁说明要实现什么

# 执行配置
type: "backend"                   # backend | frontend | database | fullstack
agent: "backend-java"             # 指定执行的 Agent
priority: 1                       # 执行优先级（数字越小越优先）
estimated_minutes: 5              # 预估时间（分钟）

# 文件边界（强制约束）
allowed_paths:
  modify: []                      # 可修改的文件
  # 示例:
  #   - "ruoyi-admin/src/main/java/**/controller/SysUserController.java"
  
  create: []                      # 可新建的文件
  # 示例:
  #   - "ruoyi-admin/src/test/java/**/SysUserControllerTest.java"
  
  read: []                        # 可读取参考的文件
  # 示例:
  #   - "ruoyi-admin/src/main/java/**/controller/SysDeptController.java"

# TDD 结构
tdd:
  test_file: ""                   # 测试文件路径
  test_cases: []                  # 测试用例列表
  # 示例:
  #   - name: "testListUsers_success"
  #     description: "正常分页查询，返回用户列表"

# 验收标准（必须可验证）
acceptance: []
# 示例:
#   - type: "command"
#     run: "mvn test -Dtest=SysUserControllerTest"
#     expect: "BUILD SUCCESS"
#   - type: "command"
#     run: "mvn checkstyle:check"
#     expect: "BUILD SUCCESS"

# 依赖关系
dependencies:
  tickets: []                     # 依赖的前置 Ticket
  files: []                       # 依赖的已存在文件

# 状态追踪
status: "pending"                 # pending | in_progress | completed | failed | blocked
error_message: null               # 失败时的错误信息
retry_count: 0                    # 重试次数

# 时间戳
created_at: ""
started_at: null
completed_at: null

# 检查点
checkpoint_id: null               # 完成后的检查点 ID
```

---

## 3. checkpoint.yaml

```yaml
# .claude/core/templates/checkpoint.yaml
# 检查点模板 - 由 checkpoint-manager 使用

id: "CP-{timestamp}"              # 格式: CP-20260201-103000
created_at: ""                    # ISO 8601 时间戳
note: ""                          # 可选备注

# 状态快照
state:
  phase: "implement"              # research | plan | implement | validate
  requirement: "REQ-001"
  story: "S-001"
  ticket: "T-001"
  ticket_status: "completed"      # pending | in_progress | completed

# 进度快照
progress:
  total_stories: 1
  completed_stories: 0
  total_tickets: 6
  completed_tickets: 2

# 文件变更（自上个检查点以来）
files_changed:
  created: []
  modified: []
  deleted: []

# Git 信息
git:
  commit: ""                      # Git commit hash
  branch: ""                      # 当前分支
  dirty: false                    # 是否有未提交的变更

# 上下文摘要（用于恢复时加载）
context_summary: |
  # 当前工作状态的简要描述
  # 用于新会话恢复上下文

# 记忆快照
memory:
  decisions_count: 0              # 决策数量
  last_decision_id: null          # 最近决策 ID
  context_usage_percent: 0        # 上下文使用率

# 恢复信息
recovery:
  can_restore: true               # 是否可恢复
  restore_command: ""             # 恢复命令
```

---

## 4. log.yaml

```yaml
# .claude/core/templates/log.yaml
# 执行日志模板 - 由 deliver-ticket 使用

ticket_id: "T-{序号}"
story_id: "S-{序号}"
agent: ""                         # 执行的 Agent
session_id: ""                    # 会话 ID

# 时间信息
started_at: ""
finished_at: ""
duration_seconds: 0

# 执行结果
status: "success"                 # success | failed | blocked
exit_reason: ""                   # 退出原因
# 示例:
#   - "all_acceptance_passed"
#   - "test_failed_after_max_retries"
#   - "path_violation"
#   - "blocked_by_dependency"

# 执行步骤详情
steps: []
# 每个步骤的结构:
#   - step: 1
#     action: "read_ticket"       # 动作类型
#     status: "success"           # success | failed | skipped
#     timestamp: ""
#     duration_ms: 0
#     details: ""                 # 详细说明
#     
#     # 根据 action 类型的额外字段:
#     # action: "read_reference"
#     files_read: []
#     
#     # action: "write_test" / "implement"
#     files_created: []
#     files_modified: []
#     
#     # action: "run_test_red" / "run_test_green" / "run_lint"
#     command: ""
#     output: ""
#     attempt: 1                  # 尝试次数
#     
#     # action: "debug_analyze"
#     analysis: ""
#     
#     # action: "create_checkpoint"
#     checkpoint_id: ""

# 验收证据
evidence: []
# 每个证据的结构:
#   - type: "test_output"         # test_output | lint_output | api_response
#     command: ""
#     output: ""
#     timestamp: ""

# 文件变更汇总
files_changed:
  created: []
  modified: []
  deleted: []

# 检查点信息
checkpoint:
  id: ""
  git_commit: ""
  can_rollback: true

# 错误信息（仅当 status 为 failed 时）
error:
  type: ""                        # test_failure | lint_failure | path_violation | ...
  message: ""
  last_failure: ""
  suggested_action: ""
```

---

## 5. state.yaml

```yaml
# .claude/core/templates/state.yaml
# 全局状态模板 - tasks/STATE.yaml

version: "1.0"
last_updated: ""                  # ISO 8601 时间戳

# 当前阶段
phase: "research"                 # research | plan | implement | validate

# 当前工作项
current:
  requirement: null               # 当前需求 ID
  story: null                     # 当前 Story ID
  ticket: null                    # 当前 Ticket ID
  agent: null                     # 当前执行的 Agent

# 需求列表
requirements: []
# 示例:
#   - id: "REQ-001"
#     title: "用户管理模块"
#     status: "in_progress"
#     stories: ["S-001", "S-002"]

# Stories 状态
stories: {}
# 示例:
#   S-001:
#     status: "in_progress"
#     progress: "2/6"
#     tickets:
#       - id: "T-001"
#         status: "completed"
#         checkpoint: "CP-20260201-100100"
#       - id: "T-002"
#         status: "completed"
#         checkpoint: "CP-20260201-100300"
#       - id: "T-003"
#         status: "in_progress"

# 统计
stats:
  total_requirements: 0
  completed_requirements: 0
  total_stories: 0
  completed_stories: 0
  total_tickets: 0
  completed_tickets: 0
  failed_tickets: 0
  blocked_tickets: 0

# 检查点信息
checkpoints:
  last: null                      # 最近检查点 ID
  count: 0                        # 检查点总数

# 上下文状态
context:
  usage_percent: 0                # 上下文使用率
  last_compression: null          # 上次压缩时间
  compression_count: 0            # 压缩次数

# 会话信息
session:
  id: ""                          # 会话 ID (格式: YYYY-MM-DD-NNN)
  started_at: ""
  last_active: ""

# 审批状态
approvals:
  stories_approved: false
  tickets_approved: false
  
# 配置引用
config:
  project: ".claude/project/config.yaml"
  loaded_at: ""
```

---

## 初始化脚本

创建空的 STATE.yaml：

```yaml
# tasks/STATE.yaml (初始状态)
version: "1.0"
last_updated: "2026-02-01T00:00:00Z"

phase: "research"

current:
  requirement: null
  story: null
  ticket: null
  agent: null

requirements: []
stories: {}

stats:
  total_requirements: 0
  completed_requirements: 0
  total_stories: 0
  completed_stories: 0
  total_tickets: 0
  completed_tickets: 0
  failed_tickets: 0
  blocked_tickets: 0

checkpoints:
  last: null
  count: 0

context:
  usage_percent: 0
  last_compression: null
  compression_count: 0

session:
  id: ""
  started_at: ""
  last_active: ""

approvals:
  stories_approved: false
  tickets_approved: false

config:
  project: ".claude/project/config.yaml"
  loaded_at: ""
```

---

## 使用示例

### 创建新 Story

```python
import yaml
from datetime import datetime

def create_story(story_id, req_id, title, description):
    template = load_yaml(".claude/core/templates/story.yaml")
    
    story = template.copy()
    story["id"] = story_id
    story["requirement_id"] = req_id
    story["title"] = title
    story["description"] = description
    story["created_at"] = datetime.now().isoformat()
    
    save_yaml(f"tasks/stories/{story_id}.yaml", story)
    return story
```

### 创建新 Ticket

```python
def create_ticket(ticket_id, story_id, title, type, agent, allowed_paths):
    template = load_yaml(".claude/core/templates/ticket.yaml")
    
    ticket = template.copy()
    ticket["id"] = ticket_id
    ticket["story_id"] = story_id
    ticket["title"] = title
    ticket["type"] = type
    ticket["agent"] = agent
    ticket["allowed_paths"] = allowed_paths
    ticket["created_at"] = datetime.now().isoformat()
    
    save_yaml(f"tasks/tickets/{ticket_id}.yaml", ticket)
    return ticket
```

---

## 相关文档

- [00_概览](00_概览.md) - 返回概览
- [30_格式规范](30_格式规范.md) - 格式详细说明
- [31_项目配置](31_项目配置.md) - 项目配置
