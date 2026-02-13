# Templates 模板文件

本文档定义 `.claude/templates/` 目录下所有模板文件的具体内容。

---

## 目录结构

```
.claude/templates/
├── story.yaml         # Story 模板
├── ticket.yaml        # Ticket 模板
├── checkpoint.yaml    # 检查点模板
├── log.yaml           # 执行日志模板
└── state.yaml         # 全局状态模板
```

---

## 1. story.yaml

```yaml
# .claude/templates/story.yaml
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
# .claude/templates/ticket.yaml
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
# .claude/templates/checkpoint.yaml
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
# .claude/templates/log.yaml
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
# .claude/templates/state.yaml
# 全局状态模板 - osg-spec-docs/tasks/STATE.yaml

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
# osg-spec-docs/tasks/STATE.yaml (初始状态)
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
    template = load_yaml(".claude/templates/story.yaml")
    
    story = template.copy()
    story["id"] = story_id
    story["requirement_id"] = req_id
    story["title"] = title
    story["description"] = description
    story["created_at"] = datetime.now().isoformat()
    
    save_yaml(f"osg-spec-docs/tasks/stories/{story_id}.yaml", story)
    return story
```

### 创建新 Ticket

```python
def create_ticket(ticket_id, story_id, title, type, agent, allowed_paths):
    template = load_yaml(".claude/templates/ticket.yaml")
    
    ticket = template.copy()
    ticket["id"] = ticket_id
    ticket["story_id"] = story_id
    ticket["title"] = title
    ticket["type"] = type
    ticket["agent"] = agent
    ticket["allowed_paths"] = allowed_paths
    ticket["created_at"] = datetime.now().isoformat()
    
    save_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml", ticket)
    return ticket
```

---

## 📐 完整 YAML 操作示例（低智商模型必读）

### 示例 1：更新 STATE.yaml 的 current.ticket 字段

**场景**：执行 `/next` 后，需要更新当前执行的 Ticket

**操作步骤**：

```python
# Step 1: 读取现有 STATE.yaml
state = 读取yaml("osg-spec-docs/tasks/STATE.yaml")

# Step 2: 更新字段
state["current"]["ticket"] = "T-003"
state["current"]["agent"] = "backend-java"
state["last_updated"] = "2026-02-03T10:30:00Z"  # ISO 8601 格式

# Step 3: 更新 Story 中的 Ticket 状态
if "S-001" in state["stories"]:
    for ticket in state["stories"]["S-001"]["tickets"]:
        if ticket["id"] == "T-003":
            ticket["status"] = "in_progress"
            break

# Step 4: 写回文件
写入yaml("osg-spec-docs/tasks/STATE.yaml", state)
```

**更新前**：
```yaml
# osg-spec-docs/tasks/STATE.yaml
version: "1.0"
last_updated: "2026-02-03T10:00:00Z"
phase: "implement"
current:
  requirement: "REQ-001"
  story: "S-001"
  ticket: null
  agent: null
stories:
  S-001:
    status: "in_progress"
    progress: "2/5"
    tickets:
      - id: "T-001"
        status: "completed"
      - id: "T-002"
        status: "completed"
      - id: "T-003"
        status: "pending"
```

**更新后**：
```yaml
# osg-spec-docs/tasks/STATE.yaml
version: "1.0"
last_updated: "2026-02-03T10:30:00Z"  # ← 更新
phase: "implement"
current:
  requirement: "REQ-001"
  story: "S-001"
  ticket: "T-003"   # ← 更新
  agent: "backend-java"  # ← 更新
stories:
  S-001:
    status: "in_progress"
    progress: "2/5"
    tickets:
      - id: "T-001"
        status: "completed"
      - id: "T-002"
        status: "completed"
      - id: "T-003"
        status: "in_progress"  # ← 更新
```

---

### 示例 2：创建完整的 Ticket 文件

**场景**：执行 `/split ticket S-001` 后创建 Ticket 文件

**完整 Ticket 文件内容**：

```yaml
# osg-spec-docs/tasks/tickets/T-003.yaml
# 由 ticket-splitter skill 自动生成

id: "T-003"
story_id: "S-001"
title: "用户编辑 API"
description: |
  实现用户信息编辑接口，允许管理员修改用户的基本信息。
  
  包括：
  - 修改用户名
  - 修改邮箱
  - 修改状态（启用/禁用）

# 执行配置
type: "backend"
agent: "backend-java"
priority: 3
estimated_minutes: 5

# 文件边界（强制约束）
allowed_paths:
  modify:
    - "ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysUserController.java"
  create:
    - "ruoyi-admin/src/test/java/com/ruoyi/web/controller/system/SysUserControllerTest.java"
  read:
    - "ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysDeptController.java"
    - "ruoyi-system/src/main/java/com/ruoyi/system/service/ISysUserService.java"

# TDD 配置
tdd:
  test_file: "ruoyi-admin/src/test/java/com/ruoyi/web/controller/system/SysUserControllerTest.java"
  test_cases:
    - name: "testEditUser_success"
      description: "正常修改用户信息"
      input: |
        {
          "userId": 1,
          "userName": "新用户名",
          "email": "new@example.com"
        }
      expected_output: "code: 200"
      
    - name: "testEditUser_notFound"
      description: "用户不存在"
      input: |
        {
          "userId": 99999,
          "userName": "测试"
        }
      expected_output: "code: 500, msg: 用户不存在"

# 验收标准
acceptance:
  - type: "command"
    run: "mvn test -Dtest=SysUserControllerTest"
    expect: "BUILD SUCCESS"
  - type: "command"
    run: "mvn checkstyle:check"
    expect: "BUILD SUCCESS"

# 状态
status: "pending"
started_at: null
completed_at: null

# 依赖
dependencies:
  tickets: ["T-001", "T-002"]

# 元数据
created_at: "2026-02-03T09:00:00Z"
created_by: "planner"
```

---

### 示例 3：创建执行日志

**场景**：Ticket T-003 执行完成后创建日志

**完整日志文件内容**：

```yaml
# workspace/logs/T-003.yaml
# 由 deliver-ticket skill 自动生成

ticket_id: "T-003"
story_id: "S-001"
agent: "backend-java"
session_id: "2026-02-03-001"

# 执行时间
started_at: "2026-02-03T10:30:00Z"
finished_at: "2026-02-03T10:35:00Z"
duration_seconds: 300

# 执行结果
status: "success"  # success | failed | skipped
exit_reason: "all_acceptance_passed"

# 详细步骤记录
steps:
  - step: 1
    name: "读取 Ticket"
    action: "read_file"
    target: "osg-spec-docs/tasks/tickets/T-003.yaml"
    status: "success"
    timestamp: "2026-02-03T10:30:00Z"
    duration_ms: 100
    
  - step: 2
    name: "读取参考文件"
    action: "read_file"
    target: "ruoyi-admin/src/main/java/.../SysDeptController.java"
    status: "success"
    timestamp: "2026-02-03T10:30:01Z"
    duration_ms: 500
    
  - step: 3
    name: "编写测试"
    action: "write_file"
    target: "ruoyi-admin/src/test/java/.../SysUserControllerTest.java"
    status: "success"
    timestamp: "2026-02-03T10:31:00Z"
    duration_ms: 30000
    lines_added: 45
    
  - step: 4
    name: "TDD 红灯"
    action: "run_command"
    command: "mvn test -Dtest=SysUserControllerTest"
    status: "success"
    timestamp: "2026-02-03T10:31:30Z"
    duration_ms: 5000
    output_summary: "Tests run: 2, Failures: 2"
    expected_result: "test_failure"  # 红灯阶段预期失败
    
  - step: 5
    name: "实现功能"
    action: "modify_file"
    target: "ruoyi-admin/src/main/java/.../SysUserController.java"
    status: "success"
    timestamp: "2026-02-03T10:32:00Z"
    duration_ms: 60000
    lines_modified: 25
    
  - step: 6
    name: "TDD 绿灯"
    action: "run_command"
    command: "mvn test -Dtest=SysUserControllerTest"
    status: "success"
    timestamp: "2026-02-03T10:33:00Z"
    duration_ms: 5000
    output_summary: "Tests run: 2, Failures: 0"
    attempt: 1
    
  - step: 7
    name: "Lint 检查"
    action: "run_command"
    command: "mvn checkstyle:check"
    status: "success"
    timestamp: "2026-02-03T10:33:30Z"
    duration_ms: 3000
    output_summary: "BUILD SUCCESS"
    
  - step: 8
    name: "自我审查"
    action: "self_review"
    status: "success"
    timestamp: "2026-02-03T10:34:00Z"
    duration_ms: 5000
    checklist:
      - name: "完整性"
        passed: true
        details: "所有 allowed_paths 文件都已处理"
      - name: "质量"
        passed: true
        details: "代码符合规范，无冗余"
      - name: "测试"
        passed: true
        details: "测试覆盖正向和反向场景"
    
  - step: 9
    name: "创建检查点"
    action: "create_checkpoint"
    checkpoint_id: "CP-20260203-103430"
    status: "success"
    timestamp: "2026-02-03T10:34:30Z"
    duration_ms: 2000

# 验收证据
evidence:
  - type: "test_output"
    name: "单元测试"
    command: "mvn test -Dtest=SysUserControllerTest"
    output: |
      [INFO] Running com.ruoyi.web.controller.system.SysUserControllerTest
      [INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
      [INFO] BUILD SUCCESS
    timestamp: "2026-02-03T10:33:00Z"
    
  - type: "lint_output"
    name: "代码检查"
    command: "mvn checkstyle:check"
    output: |
      [INFO] BUILD SUCCESS
    timestamp: "2026-02-03T10:33:30Z"

# 文件变更记录
files_changed:
  created:
    - path: "ruoyi-admin/src/test/java/.../SysUserControllerTest.java"
      lines: 45
  modified:
    - path: "ruoyi-admin/src/main/java/.../SysUserController.java"
      lines_added: 25
      lines_removed: 0
  deleted: []

# 检查点信息
checkpoint:
  id: "CP-20260203-103430"
  git_commit: "abc1234"
  can_rollback: true

# 错误记录（如有）
errors: []
# 如果有错误:
# errors:
#   - step: 4
#     type: "test_failed"
#     message: "NullPointerException at line 45"
#     retry_count: 2
#     resolved: true
#     resolution: "添加空值检查"
```

---

### 示例 4：创建检查点

**场景**：Ticket 完成后创建检查点

**完整检查点文件内容**：

```yaml
# .claude/checkpoints/CP-20260203-103430.yaml
# 由 checkpoint-manager skill 自动生成

id: "CP-20260203-103430"
created_at: "2026-02-03T10:34:30Z"
trigger: "ticket_completed"  # ticket_completed | manual | context_compression

# 触发时的上下文
context:
  ticket_id: "T-003"
  story_id: "S-001"
  phase: "implement"
  
# 状态快照
state_snapshot:
  file: "osg-spec-docs/tasks/STATE.yaml"
  hash: "sha256:abc123..."  # 文件哈希，用于验证
  
# Git 信息
git:
  commit: "abc1234"
  branch: "feature/user-management"
  message: "feat(user): 实现用户编辑 API (T-003)"
  
# 文件变更摘要
changes:
  - file: "ruoyi-admin/src/main/java/.../SysUserController.java"
    action: "modified"
    diff_lines: "+25/-0"
  - file: "ruoyi-admin/src/test/java/.../SysUserControllerTest.java"
    action: "created"
    diff_lines: "+45/-0"

# 恢复指令
restore_instructions: |
  1. 执行: git checkout abc1234
  2. 恢复 STATE.yaml: cp .claude/checkpoints/CP-20260203-103430/STATE.yaml osg-spec-docs/tasks/STATE.yaml
  3. 继续执行: /next
  
# 可恢复性
restorable: true
```

---

## 相关文档

- [00_概览](00_概览.md) - 返回概览
- [30_格式规范](30_格式规范.md) - 格式详细说明
- [31_项目配置](31_项目配置.md) - 项目配置
- [44_低智商模型执行指南](44_低智商模型执行指南.md) - 精确执行步骤