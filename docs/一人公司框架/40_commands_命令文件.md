# Commands 命令文件

本文档定义 `.claude/commands/` 目录下所有命令文件的具体内容。

---

## 目录结构

```
.claude/commands/
├── init-project.md    # /init-project 命令（项目初始化）
├── add-requirement.md # /add-requirement 命令（注册需求）
├── brainstorm.md      # /brainstorm 命令
├── split.md           # /split 命令
├── next.md            # /next 命令
├── status.md          # /status 命令
├── approve.md         # /approve 命令
├── review.md          # /review 命令（代码评审）
├── verify.md          # /verify 命令（测试验收）
├── checkpoint.md      # /checkpoint 命令
├── save.md            # /save 命令（checkpoint 别名）
├── restore.md         # /restore 命令
├── rollback.md        # /rollback 命令
├── compress.md        # /compress 命令（上下文压缩）
├── unblock.md         # /unblock 命令（解除阻塞）
├── worktree.md        # /worktree 命令（并行开发）
└── ralph-loop.md      # /ralph-loop 命令
```

---

## 0a. init-project.md

```markdown
---
name: init-project
description: 初始化项目框架结构
---

# /init-project 命令

## 用法
```
/init-project                         # 交互式初始化
/init-project myproject               # 指定项目名
/init-project myproject --stack java,vue,mysql  # 指定技术栈
```

## 执行流程

1. **创建目录结构**:
   - `.claude/core/` - 核心框架
   - `.claude/project/` - 项目配置
   - `.claude/memory/` - 记忆管理
   - `.claude/checkpoints/` - 检查点
   - `.claude/commands/` - 快捷命令
   - `tasks/` - 任务管理
   - `workspace/logs/` - 执行日志
   - `artifacts/reviews/` - 评审记录
   - `docs/requirements/` - 需求文档

2. **复制核心框架**:
   - 从模板复制 `core/skills/`
   - 从模板复制 `core/agents/`
   - 从模板复制 `core/templates/`

3. **生成项目配置**:
   - 根据技术栈生成 `project/config.yaml`
   - 创建对应的 Agent 实例
   - 创建代码规范引用

4. **初始化状态**:
   - 创建空的 `tasks/STATE.yaml`
   - 创建 `CLAUDE.md` 入口文件

## 技术栈选项

| 选项 | 说明 | 生成的 Agent |
|------|------|--------------|
| java | Java 后端 | backend-java |
| python | Python 后端 | backend-python |
| go | Go 后端 | backend-go |
| vue | Vue 前端 | frontend-vue |
| react | React 前端 | frontend-react |
| mysql | MySQL 数据库 | dba-mysql |
| postgres | PostgreSQL | dba-postgres |

## 输出示例

```
## ✅ 项目初始化完成

**项目名**: myproject
**技术栈**: java, vue, mysql

### 已创建目录
- .claude/core/skills/ (13 个 Skills)
- .claude/core/agents/ (7 个 Agent 模板)
- .claude/project/agents/ (3 个项目 Agent)
- tasks/ (任务管理)
- docs/requirements/ (需求文档)

### 已生成配置
- .claude/project/config.yaml
- .claude/CLAUDE.md
- tasks/STATE.yaml

### 下一步
1. 将需求文档放到 `docs/requirements/REQ-001.md`
2. 运行 `/add-requirement REQ-001` 注册需求
3. 运行 `/brainstorm` 开始工作
```

## 完成标志
- 目录结构创建完成
- 配置文件生成完成
- STATE.yaml 初始化完成
```

---

## 0b. add-requirement.md

```markdown
---
name: add-requirement
description: 注册新需求文档
---

# /add-requirement 命令

## 用法
```
/add-requirement REQ-001              # 按 ID 注册（自动查找）
/add-requirement docs/requirements/REQ-001.md  # 按路径注册
/add-requirement --scan               # 扫描并注册所有新需求
```

## 执行流程

### 按 ID 注册
1. 在 `docs/requirements/` 目录查找匹配的文件
2. 验证文件存在
3. 解析需求内容
4. 更新 `tasks/STATE.yaml`

### 按路径注册
1. 验证文件存在
2. 从文件名或首行提取 ID
3. 更新 `tasks/STATE.yaml`

### 扫描模式
1. 扫描 `docs/requirements/REQ-*.md`
2. 对比已注册的需求
3. 注册所有新发现的需求

## STATE.yaml 更新

```yaml
# 注册后的 requirements 字段
requirements:
  - id: "REQ-001"
    path: "docs/requirements/REQ-001.md"
    title: "用户管理模块"  # 从文件首行提取
    status: "pending"
    added_at: "2026-02-01T10:00:00Z"
    stories: []  # 拆解后填充
```

## 输出示例

### 单个注册
```
## ✅ 需求已注册

- **ID**: REQ-001
- **标题**: 用户管理模块
- **路径**: docs/requirements/REQ-001.md
- **状态**: pending

**下一步**: 运行 `/brainstorm REQ-001` 细化需求
```

### 扫描模式
```
## 📋 需求扫描结果

### 新发现 (2 个)
| ID | 标题 | 路径 |
|----|------|------|
| REQ-001 | 用户管理模块 | docs/requirements/REQ-001.md |
| REQ-002 | 角色管理模块 | docs/requirements/REQ-002.md |

### 已存在 (1 个)
- REQ-000: 系统初始化（已完成）

**下一步**: 
- 处理 REQ-001: `/brainstorm REQ-001`
- 查看所有需求: `/status --requirements`
```

## 完成标志
- STATE.yaml 已更新
- current.requirement 已设置
```

---

## 1. brainstorm.md

```markdown
---
name: brainstorm
description: 头脑风暴，细化需求
---

# /brainstorm 命令

## 用法
```
/brainstorm                    # 开始头脑风暴
/brainstorm REQ-001            # 针对特定需求
/brainstorm "如何实现XXX"       # 针对特定问题
```

## 执行流程

1. **加载 Architect Agent**
2. **加载 brainstorming Skill**
3. **执行流程**:
   - 读取需求文档（如指定）
   - 输出需求理解
   - 一次一个问题澄清需求
   - 探索 2-3 个方案
   - 记录决策到 memory/decisions.yaml

## 输出示例

```
## 📖 需求理解

**需求来源**: REQ-001
**核心目标**: 实现用户管理模块
**涉及模块**: 用户、角色、权限

### ❓ 需要确认

关于用户删除策略，您希望：
- A) 软删除（逻辑删除，保留数据）
- B) 硬删除（物理删除，不可恢复）
- C) 其他（请说明）
```

## 完成标志
- 需求理解确认
- 方案选定
- 决策已记录
```

---

## 2. split.md

```markdown
---
name: split
description: 拆解需求为 Story 或 Ticket
---

# /split 命令

## 用法
```
/split story                   # 将需求拆解为 Stories
/split story REQ-001           # 拆解指定需求
/split ticket S-001            # 将 Story 拆解为 Tickets
```

## 子命令

### /split story

1. **加载 Planner Agent**
2. **加载 story-splitter Skill**
3. **执行流程**:
   - 读取需求文档
   - 按 INVEST 原则拆解
   - 输出 Story 列表
   - 创建 tasks/stories/S-xxx.yaml 文件
   - 更新 tasks/STATE.yaml
   - 等待 `/approve stories`

### /split ticket S-xxx

1. **加载 Planner Agent**
2. **加载 ticket-splitter Skill**
3. **执行流程**:
   - 读取 Story 定义
   - 拆解为 2-5 分钟的 Tickets
   - 输出 Ticket 列表
   - 创建 tasks/tickets/T-xxx.yaml 文件
   - 更新 tasks/STATE.yaml
   - 等待 `/approve tickets`

## 输出文件

```yaml
# 自动创建的文件
tasks/stories/S-001.yaml
tasks/stories/S-002.yaml
tasks/tickets/T-001.yaml
tasks/tickets/T-002.yaml
tasks/STATE.yaml  # 更新
```

## 完成标志
- Story/Ticket YAML 文件已创建
- STATE.yaml 已更新
- 等待审批
```

---

## 3. next.md

```markdown
---
name: next
description: 执行下一个待处理的 Ticket
---

# /next 命令

## 用法
```
/next                          # 执行下一个 pending 的 Ticket
```

## 执行流程

1. **读取 tasks/STATE.yaml**
2. **找到下一个 pending 的 Ticket**
3. **根据 Ticket 类型分派 Agent**:
   - `type: backend` → backend-java Agent
   - `type: frontend` → frontend-vue Agent
   - `type: database` → dba-mysql Agent
4. **加载 deliver-ticket, tdd, checkpoint-manager Skills**
5. **执行 Ticket**:
   - 输出理解确认
   - TDD: 红 → 绿 → 重构
   - 运行验收命令
   - 创建检查点
   - 输出完成报告
6. **更新状态**:
   - 更新 Ticket 状态为 completed
   - 更新 tasks/STATE.yaml
   - 创建 workspace/logs/T-xxx.yaml

## 分派逻辑

```python
def get_next_ticket():
    state = read_yaml("tasks/STATE.yaml")
    for story in state.stories:
        for ticket in story.tickets:
            if ticket.status == "pending":
                return ticket
    return None

def dispatch_agent(ticket):
    agents = {
        "backend": "backend-java",
        "frontend": "frontend-vue",
        "database": "dba-mysql",
        "fullstack": "backend-java"
    }
    return agents.get(ticket.type, "developer")
```

## 输出示例

```
## 📋 任务理解

**Ticket**: T-003 - 用户编辑 API

**目标**: 实现用户信息编辑接口

**允许修改的文件**:
- ruoyi-admin/src/.../SysUserController.java
- ruoyi-system/src/.../ISysUserService.java

✅ 理解确认，开始执行。

### 🔴 红灯阶段
...

### 🟢 绿灯阶段
...

## ✅ Ticket T-003 完成报告
...
```

## 完成标志
- Ticket 状态变为 completed
- 检查点已创建
- 日志已记录
```

---

## 4. status.md

```markdown
---
name: status
description: 查看当前进度
---

# /status 命令

## 用法
```
/status                        # 简洁模式
/status --detail               # 详细模式
```

## 执行流程

1. **加载 Coordinator Agent**
2. **加载 progress-tracker Skill**
3. **读取数据**:
   - tasks/STATE.yaml
   - tasks/stories/*.yaml
   - tasks/tickets/*.yaml
   - memory/session.yaml
4. **生成报告**

## 简洁模式输出

```
## 📊 进度报告

**当前阶段**: Implement
**当前任务**: S-001 / T-003

### Story 进度
S-001: 用户管理模块
  ├── [✓] T-001 用户列表 API
  ├── [✓] T-002 新增用户 API
  ├── [→] T-003 用户编辑 API (进行中)
  ├── [ ] T-004 删除用户 API
  └── [ ] T-005 前端页面

**整体进度**: 40% (2/5 Tickets)
**上下文使用**: 45%
**最近检查点**: CP-20260201-100500
```

## 详细模式输出

包含额外信息：
- 每个 Ticket 的详细状态
- 文件变更统计
- 最近活动记录
- 重要决策列表
```

---

## 5. approve.md

```markdown
---
name: approve
description: 审批拆解结果或完成状态
---

# /approve 命令

## 用法
```
/approve stories               # 审批所有 Stories
/approve tickets               # 审批所有 Tickets
/approve T-001                 # 审批单个 Ticket
/approve S-001                 # 审批整个 Story
```

## 执行流程

### /approve stories
1. 检查 stories 拆解是否完成
2. 标记 stories 为已审批
3. 更新 STATE.yaml 的 phase 为 `plan`
4. 提示下一步：`/split ticket S-001`

### /approve tickets
1. 检查 tickets 拆解是否完成
2. 标记 tickets 为已审批
3. 更新 STATE.yaml 的 phase 为 `implement`
4. 提示下一步：`/next`

### /approve T-xxx
1. 验证 Ticket 的验收标准
2. 标记 Ticket 为 approved
3. 如果是最后一个 Ticket，提示 `/approve S-xxx`

### /approve S-xxx
1. 检查所有 Tickets 是否完成
2. 标记 Story 为 completed
3. 更新统计
4. 如有下一个 Story，提示继续

## 审批检查

```yaml
# 审批前自动检查
checklist:
  stories:
    - 每个 Story 符合 INVEST 原则
    - 验收标准明确
    - 无遗漏功能点
  tickets:
    - 每个 Ticket 有 allowed_paths
    - 每个 Ticket 有验收命令
    - 预估时间合理（≤5min）
```

## 输出示例

```
## ✅ Stories 审批通过

已审批 Stories:
- S-001: 用户管理模块 (6 Tickets)
- S-002: 角色管理模块 (4 Tickets)

**下一步**: `/split ticket S-001`
```

## 审批拒绝

### 用法
```
/approve stories --reject          # 拒绝所有 Stories，要求重新拆分
/approve tickets --reject          # 拒绝所有 Tickets，要求重新拆分
/approve tickets --reject T-001    # 拒绝特定 Ticket
/approve stories --modify          # 通过但标记需要修改
```

### 拒绝流程

#### /approve stories --reject
1. 标记 stories 为 rejected
2. 更新 STATE.yaml 的 phase 为 `research`（回退）
3. 提示重新执行 `/split story`

#### /approve tickets --reject T-xxx
1. 标记指定 Ticket 为 rejected
2. 删除对应的 YAML 文件
3. 提示重新拆分该部分

### 拒绝输出示例

```
## ❌ Stories 审批拒绝

**拒绝原因**: {用户说明的原因}

### 已标记为拒绝
- S-001: 用户管理模块
- S-002: 角色管理模块

### 下一步
1. 修改需求或重新理解
2. 运行 `/split story` 重新拆分

**注意**: 之前的 Story 文件已删除
```

### 修改通过

```
/approve stories --modify "S-001 需要增加导出功能"
```

输出：
```
## ⚠️ Stories 有条件通过

**修改要求**:
- S-001: 需要增加导出功能

已标记修改要求，继续执行时会提醒。

**下一步**: `/split ticket S-001`
```
```

---

## 6. checkpoint.md

```markdown
---
name: checkpoint
description: 手动创建检查点
---

# /checkpoint 命令

## 用法
```
/checkpoint                    # 创建当前状态的检查点
/checkpoint "完成用户模块"      # 带备注的检查点
```

## 执行流程

1. **收集当前状态**:
   - 当前 phase
   - 当前 Story/Ticket
   - 文件变更
2. **创建 Git commit**（如配置）
3. **生成检查点文件**:
   - checkpoints/CP-{timestamp}.yaml
4. **更新 STATE.yaml**:
   - last_checkpoint 字段

## 检查点内容

```yaml
# checkpoints/CP-20260201-103000.yaml
id: "CP-20260201-103000"
created_at: "2026-02-01T10:30:00Z"
note: "完成用户模块"  # 如有备注

# 状态快照
phase: "implement"
story: "S-001"
ticket: "T-003"
ticket_status: "in_progress"

# 文件变更
files_changed:
  created:
    - "ruoyi-admin/src/test/java/.../SysUserControllerTest.java"
  modified:
    - "ruoyi-admin/src/main/java/.../SysUserController.java"
  deleted: []

# Git 信息
git:
  commit: "abc1234"
  branch: "feature/user-management"
  
# 上下文摘要
context_summary: |
  正在实现 S-001 用户管理模块。
  已完成 T-001, T-002。
  当前进行 T-003 用户编辑 API。
```

## 输出示例

```
## ✅ 检查点已创建

- **ID**: CP-20260201-103000
- **备注**: 完成用户模块
- **阶段**: implement
- **任务**: S-001 / T-003
- **文件变更**: 3 个文件
- **Git Commit**: abc1234

恢复命令: `/restore CP-20260201-103000`
```
```

---

## 6b. save.md

```markdown
---
name: save
description: 保存当前状态（/checkpoint 的别名）
---

# /save 命令

## 用法
```
/save                              # 保存当前状态
/save "阶段性进展"                  # 带备注保存
```

## 说明

`/save` 是 `/checkpoint` 的简化别名，功能完全相同。

## 执行流程

等同于 `/checkpoint`：
1. 收集当前状态
2. 创建 Git commit（如配置）
3. 生成检查点文件
4. 更新 STATE.yaml
5. 触发 memory-bank 保存重要信息

## 为什么需要这个命令

由于 Cursor 中没有明确的"会话结束"事件，建议用户在以下时机主动执行 `/save`：

- **结束工作前**：保存当前进度
- **完成重要阶段**：如完成一个 Ticket
- **做出重要决策后**：确保决策被记录
- **上下文较满时**：为后续压缩做准备

## 输出示例

```
## ✅ 状态已保存

- **检查点 ID**: CP-20260201-143000
- **阶段**: implement
- **任务**: S-001 / T-003
- **备注**: 阶段性进展

### 已保存内容
- 当前任务状态
- 文件变更 (3 个文件)
- 重要决策 (2 条)
- 上下文摘要

恢复命令: `/restore CP-20260201-143000`
```

## 建议使用场景

| 场景 | 命令 |
|------|------|
| 快速保存 | `/save` |
| 带备注保存 | `/save "完成用户列表"` |
| 完整检查点 | `/checkpoint` |
```

---

## 7. restore.md

```markdown
---
name: restore
description: 恢复到指定检查点
---

# /restore 命令

## 用法
```
/restore CP-20260201-103000    # 恢复到指定检查点
/restore --last                # 恢复到最近检查点
/restore --list                # 列出所有检查点
```

## 执行流程

### /restore CP-xxx
1. **读取检查点文件**
2. **确认恢复**（可选）
3. **恢复 Git 状态**:
   - `git checkout {commit}`
4. **恢复 STATE.yaml**
5. **加载上下文摘要**
6. **输出恢复报告**

### /restore --last
1. 读取 STATE.yaml 的 last_checkpoint
2. 执行 /restore CP-xxx

### /restore --list
1. 列出 checkpoints/ 目录下所有文件
2. 显示每个检查点的摘要

## 输出示例

```
## 🔄 已恢复到检查点

- **ID**: CP-20260201-103000
- **创建时间**: 2026-02-01 10:30:00
- **阶段**: implement
- **任务**: S-001 / T-003

### 恢复的状态
正在实现 S-001 用户管理模块。
已完成 T-001, T-002。
当前进行 T-003 用户编辑 API。

### 下一步
- 继续执行: `/next`
- 查看状态: `/status`
```

## 检查点列表示例

```
## 📋 检查点列表

| ID | 时间 | 阶段 | 任务 | 备注 |
|----|------|------|------|------|
| CP-20260201-103000 | 10:30 | implement | S-001/T-003 | 完成用户模块 |
| CP-20260201-100500 | 10:05 | implement | S-001/T-002 | - |
| CP-20260201-100100 | 10:01 | implement | S-001/T-001 | - |

恢复命令: `/restore CP-xxx`
```
```

---

## 8. rollback.md

```markdown
---
name: rollback
description: 回滚变更
---

# /rollback 命令

## 用法
```
/rollback T-001                # 回滚单个 Ticket
/rollback S-001                # 回滚整个 Story
/rollback CP-20260201-103000   # 回滚到指定检查点
/rollback --last               # 回滚到上一个检查点
```

## 与 /restore 的区别

| 命令 | 作用 | Git 操作 |
|------|------|----------|
| /restore | 恢复状态，继续工作 | checkout |
| /rollback | 撤销变更，放弃工作 | reset --hard |

## 执行流程

### /rollback T-xxx
1. **找到 Ticket 开始前的检查点**
2. **确认回滚**（必须）
3. **执行 Git reset**:
   - `git reset --hard {checkpoint_commit}`
4. **更新 STATE.yaml**:
   - Ticket 状态改为 pending
5. **删除执行日志**:
   - workspace/logs/T-xxx.yaml

### /rollback S-xxx
1. **找到 Story 开始前的检查点**
2. **确认回滚**（必须）
3. **回滚所有相关 Tickets**
4. **更新 STATE.yaml**

## 确认提示

```
## ⚠️ 确认回滚

即将回滚 **T-003**，以下变更将被撤销：

### 文件变更
- ruoyi-admin/src/.../SysUserController.java (+45 -2)
- ruoyi-system/src/.../ISysUserService.java (+12 -0)

### 警告
- 此操作不可撤销
- Git 历史将被修改

确认回滚请输入: `/rollback T-003 --confirm`
```

## 输出示例

```
## ✅ 回滚完成

- **回滚目标**: T-003
- **回滚到检查点**: CP-20260201-100300
- **撤销的文件**: 2 个

### 当前状态
- Story: S-001 (进度: 2/5)
- 下一个 Ticket: T-003 (pending)

继续执行: `/next`
```
```

---

## 9. ralph-loop.md

```markdown
---
name: ralph-loop
description: 自主循环执行，直到完成承诺达成
---

# /ralph-loop 命令

## 用法
```
/ralph-loop "完成 S-001 所有 Ticket"
/ralph-loop "完成 S-001" --max-iterations 50
/ralph-loop "完成 S-001" --verify "mvn test"
```

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| 目标 | 完成承诺描述 | 必填 |
| --max-iterations | 最大迭代次数 | 20 |
| --verify | 验证命令 | 项目配置中的 test 命令 |
| --completion-promise | 完成标志 | 自动推断 |

## 执行流程

```python
def ralph_loop(goal, max_iterations, verify_command):
    iteration = 0
    while iteration < max_iterations:
        iteration += 1
        
        # 1. 获取下一个任务
        ticket = get_next_pending_ticket()
        if ticket is None:
            break  # 没有待处理任务
            
        # 2. 执行任务
        result = execute_ticket(ticket)
        
        # 3. 验证
        verify_result = run_command(verify_command)
        
        # 4. 检查完成承诺
        if is_goal_achieved(goal):
            return SUCCESS
            
        # 5. 处理失败
        if not result.success:
            if result.retryable:
                continue
            else:
                return NEED_HUMAN_INTERVENTION
                
    return MAX_ITERATIONS_REACHED
```

## 完成承诺推断

```yaml
# 根据目标自动推断完成标志
goal_patterns:
  "完成 S-xxx 所有 Ticket":
    check: "所有 Ticket 状态为 completed"
    
  "所有测试通过":
    check: "mvn test 返回 BUILD SUCCESS"
    
  "修复 Issue #xxx":
    check: "相关测试通过 + Issue 关闭"
```

## 输出示例

### 循环过程

```
## 🔄 Ralph Loop 启动

**目标**: 完成 S-001 所有 Ticket
**最大迭代**: 20
**验证命令**: mvn test

---

### 迭代 1/20
**任务**: T-003 - 用户编辑 API
**结果**: ✅ 完成
**验证**: ✅ 通过

---

### 迭代 2/20
**任务**: T-004 - 删除用户 API
**结果**: ✅ 完成
**验证**: ✅ 通过

---

### 迭代 3/20
**任务**: T-005 - 前端页面
**结果**: ✅ 完成
**验证**: ✅ 通过

---

## ✅ Ralph Loop 完成

**总迭代次数**: 3
**完成的 Tickets**: T-003, T-004, T-005
**耗时**: 15 分钟

**验证证据**:
```
[INFO] Tests run: 15, Failures: 0
[INFO] BUILD SUCCESS
```
```

### 达到限制

```
## ⚠️ Ralph Loop 达到迭代限制

**已完成迭代**: 20
**完成的 Tickets**: T-003, T-004
**未完成**: T-005, T-006

**最后状态**:
T-005 执行失败，原因：前端组件依赖未安装

**建议**:
1. 运行 `npm install` 安装依赖
2. 然后执行 `/retry T-005`
```
```

---

## 10. review.md

```markdown
---
name: review
description: 代码评审
---

# /review 命令

## 用法
```
/review T-001                      # 评审指定 Ticket 的代码
/review T-001 --auto               # 自动评审（无人工确认）
/review S-001                      # 评审整个 Story 的所有代码
```

## 执行流程

1. **加载 Reviewer Agent**
2. **加载 code-review Skill**
3. **获取变更**:
   - 读取 `workspace/logs/T-xxx.yaml` 获取变更文件
   - 使用 `git diff` 查看具体变更
4. **分维度评审**:
   - 功能正确性
   - 代码规范
   - 性能考量
   - 安全问题
5. **输出评审结果**
6. **保存评审记录**:
   - `artifacts/reviews/T-xxx.md`

## 评审输出示例

```
## 🔍 代码评审 - T-001

### 评审范围
- SysUserController.java (+45 -2)
- ISysUserService.java (+12 -0)

### 1. 功能正确性
| 检查项 | 状态 | 说明 |
|--------|------|------|
| 实现是否符合需求 | ✅ | 分页查询正确实现 |
| 边界条件处理 | ⚠️ | 缺少空参数校验 |
| 异常处理 | ✅ | 已使用全局异常处理 |

### 2. 代码规范
| 检查项 | 状态 | 说明 |
|--------|------|------|
| 命名规范 | ✅ | 符合阿里规范 |
| 代码风格 | ✅ | 格式正确 |
| 注释完整性 | ⚠️ | 缺少方法 JavaDoc |

### 3. 性能考量
| 检查项 | 状态 | 说明 |
|--------|------|------|
| 查询效率 | ✅ | 使用分页，无 N+1 问题 |

### 4. 安全问题
| 检查项 | 状态 | 说明 |
|--------|------|------|
| SQL 注入 | ✅ | 使用 MyBatis 参数绑定 |
| 权限校验 | ✅ | 已添加 @PreAuthorize |

---

### 📋 评审结论

**整体评价**: ⚠️ 需修改

**必须修改**:
1. 添加空参数校验 - `SysUserController.java:45`

**建议优化**:
1. 添加方法 JavaDoc 注释

**亮点**:
1. 分页实现规范
2. 权限控制完善

---

评审记录已保存: `artifacts/reviews/T-001.md`

**下一步**:
- 修复必须修改项后，运行 `/review T-001` 重新评审
- 或运行 `/next` 继续（如评审通过）
```

## 完成标志
- 评审报告已输出
- 评审记录已保存
- 如有必须修改项，Ticket 状态标记为 needs_revision
```

---

## 11. verify.md

```markdown
---
name: verify
description: 测试验收
---

# /verify 命令

## 用法
```
/verify S-001                      # 验收整个 Story
/verify T-001                      # 验收单个 Ticket（通常自动完成）
/verify S-001 --full               # 完整验收（包含手动测试）
```

## 执行流程

1. **加载 QA Agent**
2. **加载 verification Skill**
3. **执行验收检查**:
   - 运行所有相关测试
   - 检查 lint 状态
   - 验证功能完整性
4. **收集证据**
5. **输出验收报告**

## 验收检查项

### Story 级别验收
```yaml
verification_checklist:
  # 自动检查
  automated:
    - all_tickets_completed: true      # 所有 Tickets 完成
    - all_tests_pass: true             # 所有测试通过
    - lint_pass: true                  # 代码规范通过
    - build_success: true              # 构建成功
    
  # 手动检查（--full 模式）
  manual:
    - functionality_verified: null     # 功能验证
    - ui_verified: null                # UI 验证（如适用）
    - edge_cases_tested: null          # 边界情况测试
```

## 验收输出示例

```
## ✅ Story S-001 验收报告

### 基本信息
- **Story**: S-001 - 用户管理模块
- **Tickets**: 6/6 完成
- **验收时间**: 2026-02-01 11:30

### 自动验收结果

| 检查项 | 状态 | 证据 |
|--------|------|------|
| Tickets 完成 | ✅ | 6/6 completed |
| 单元测试 | ✅ | 15 tests passed |
| 代码规范 | ✅ | checkstyle passed |
| 构建 | ✅ | BUILD SUCCESS |

### 测试证据

**命令**: `mvn test`
```
[INFO] Tests run: 15, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

**命令**: `mvn checkstyle:check`
```
[INFO] BUILD SUCCESS
```

### 功能覆盖

| 需求项 | 状态 | Tickets |
|--------|------|---------|
| 用户列表分页 | ✅ | T-001 |
| 新增用户 | ✅ | T-002 |
| 编辑用户 | ✅ | T-003 |
| 删除用户 | ✅ | T-004 |
| 前端页面 | ✅ | T-005, T-006 |

---

### 📋 验收结论

**验收状态**: ✅ 通过

**下一步**:
- 运行 `/approve S-001` 完成 Story
- 或运行 `/split ticket S-002` 继续下一个 Story
```

## 验收失败示例

```
## ❌ Story S-001 验收失败

### 失败原因

| 检查项 | 状态 | 问题 |
|--------|------|------|
| 单元测试 | ❌ | 2 tests failed |

### 失败详情

**失败的测试**:
1. `testDeleteUser_notFound` - Expected 404, got 500
2. `testEditUser_invalidData` - NullPointerException

**建议操作**:
1. 运行 `/retry T-004` 修复删除用户 API
2. 然后运行 `/verify S-001` 重新验收
```

## 完成标志
- 验收报告已输出
- 如通过，Story 可以被 approve
- 如失败，标记需要修复的 Tickets
```

---

## 12. compress.md

```markdown
---
name: compress
description: 手动触发上下文压缩
---

# /compress 命令

## 用法
```
/compress                          # 压缩当前上下文
/compress --aggressive             # 激进压缩（保留更少信息）
/compress --preview                # 预览压缩效果，不实际执行
```

## 执行流程

1. **加载 context-compression Skill**
2. **分析当前上下文**:
   - 识别可压缩内容
   - 识别必须保留内容
3. **生成压缩摘要**
4. **保存摘要**:
   - `memory/summaries/{timestamp}.md`
5. **更新状态**:
   - `memory/session.yaml`
6. **输出压缩报告**

## 压缩策略

| 类别 | 处理方式 |
|------|----------|
| 当前任务状态 | ✅ 完整保留 |
| 未完成 Tickets | ✅ 完整保留 |
| 重要决策 | ✅ 完整保留 |
| 已完成 Ticket 详情 | 📦 压缩为摘要 |
| 中间探索过程 | 🗑️ 丢弃 |
| 重复对话 | 🗑️ 丢弃 |
| 代码片段（已保存） | 🗑️ 丢弃（可从文件恢复） |

## 输出示例

### 压缩预览
```
## 🔍 上下文压缩预览

**当前使用率**: 75%
**预计压缩后**: 35%
**节省**: 40%

### 将保留
- 当前任务: S-001 / T-003
- 未完成 Tickets: T-003, T-004, T-005
- 重要决策: 3 条

### 将压缩
- 已完成 Tickets 详情: T-001, T-002 → 摘要

### 将丢弃
- 探索性对话: 约 15000 tokens
- 重复信息: 约 5000 tokens

---

确认执行压缩请运行: `/compress --confirm`
```

### 压缩完成
```
## ✅ 上下文压缩完成

- **压缩前**: 75%
- **压缩后**: 35%
- **节省**: 40% (约 80000 tokens)

### 摘要已保存
`memory/summaries/2026-02-01-113000.md`

### 摘要内容预览
"""
## 工作摘要 (2026-02-01 11:30)

### 当前状态
- Phase: implement
- Story: S-001 用户管理模块
- 进度: 2/5 Tickets

### 已完成
- T-001: 用户列表 API ✅
- T-002: 新增用户 API ✅

### 重要决策
- D-001: 使用软删除策略
- D-002: 分页默认 10 条/页
"""

可继续执行任务。
```

## 建议触发时机

- 对话超过 20 轮
- 感觉响应变慢
- 开始新的 Story 之前
- 看到上下文相关警告

## 硬性约束
1. 绝不丢失当前任务状态
2. 绝不丢失重要决策
3. 压缩后必须能恢复工作
```

---

## 13. unblock.md

```markdown
---
name: unblock
description: 解除 Ticket 阻塞状态
---

# /unblock 命令

## 用法
```
/unblock T-001                     # 解除指定 Ticket 的阻塞
/unblock T-001 "已确认使用 sys_role 表"  # 带说明的解除阻塞
/unblock --list                    # 列出所有阻塞的 Tickets
```

## 执行流程

1. **读取阻塞 Ticket**:
   - `tasks/tickets/T-xxx.yaml`
2. **确认阻塞原因已解决**
3. **更新 Ticket 状态**:
   - `status: blocked` → `status: pending`
4. **记录解除说明**
5. **更新 STATE.yaml**

## 阻塞 Ticket 结构

```yaml
# tasks/tickets/T-003.yaml
id: "T-003"
title: "用户角色关联"
status: blocked
blocked_reason: "无法确定角色表结构，需要确认是否使用现有 sys_role 表"
blocked_questions:
  - "是否复用 sys_role 表？"
  - "新增字段还是新建关联表？"
blocked_at: "2026-02-01T10:30:00Z"
```

## 输出示例

### 列出阻塞 Tickets
```
## 🚫 阻塞的 Tickets

| ID | 标题 | 阻塞原因 | 阻塞时间 |
|----|------|----------|----------|
| T-003 | 用户角色关联 | 无法确定角色表结构 | 10:30 |
| T-007 | 权限校验 | 依赖 T-003 完成 | 10:45 |

### 待回答问题

**T-003**:
1. 是否复用 sys_role 表？
2. 新增字段还是新建关联表？

---

解除阻塞: `/unblock T-003 "回答内容"`
```

### 解除阻塞
```
## ✅ Ticket T-003 已解除阻塞

**之前状态**: blocked
**当前状态**: pending

**阻塞原因**: 无法确定角色表结构
**解决说明**: 已确认使用 sys_role 表，通过中间表 sys_user_role 关联

### 更新内容
- Ticket 状态: pending
- allowed_paths 已更新（如需要）
- 依赖的 T-007 仍为 blocked（需单独解除）

**下一步**:
- 运行 `/next` 执行 T-003
- 或运行 `/unblock T-007` 解除其他阻塞
```

### 自动解除依赖阻塞
```
/unblock T-003 --cascade           # 同时解除依赖 T-003 的阻塞 Tickets
```

输出：
```
## ✅ 级联解除阻塞

已解除阻塞:
- T-003: 用户角色关联
- T-007: 权限校验（依赖 T-003）

**下一步**: 运行 `/next`
```

## 完成标志
- Ticket 状态变为 pending
- 阻塞原因已记录到日志
- STATE.yaml 已更新
```

---

## 14. worktree.md

```markdown
---
name: worktree
description: Git Worktree 管理（并行开发模式）
---

# /worktree 命令

## 用法
```
/worktree create feature-user         # 创建新 worktree
/worktree list                        # 列出所有 worktree
/worktree switch feature-order        # 切换 worktree
/worktree delete feature-user         # 删除 worktree
/worktree status                      # 查看各 worktree 状态
```

## 前置条件

需要在 `project/config.yaml` 中启用并行模式：

```yaml
execution:
  mode: parallel
  parallel:
    max_parallel_stories: 2
    isolation: worktree
```

## 子命令

### /worktree create {name}

创建新的 Git Worktree 用于并行开发。

```bash
/worktree create feature-user         # 基于当前分支
/worktree create feature-user S-001   # 关联 Story
```

**执行流程**：
1. 创建新分支 `feature/{name}`
2. 创建 worktree 目录 `../{project}-{name}/`
3. 复制 STATE.yaml（隔离状态）
4. 关联 Story（如指定）

**输出**：
```
## ✅ Worktree 创建成功

- **名称**: feature-user
- **分支**: feature/feature-user
- **路径**: ../ruoyi-vue-feature-user/
- **关联 Story**: S-001

切换到此 worktree: `/worktree switch feature-user`
```

### /worktree list

列出所有 worktree 及其状态。

**输出**：
```
## 📋 Worktree 列表

| 名称 | 分支 | 路径 | Story | 状态 |
|------|------|------|-------|------|
| main | main | ./ | - | 当前 |
| feature-user | feature/feature-user | ../ruoyi-vue-feature-user/ | S-001 | 2/6 |
| feature-order | feature/feature-order | ../ruoyi-vue-feature-order/ | S-002 | 0/4 |
```

### /worktree switch {name}

切换到指定 worktree。

**执行流程**：
1. 保存当前 worktree 状态
2. 切换到目标 worktree 目录
3. 加载目标 worktree 的 STATE.yaml
4. 输出状态报告

**输出**：
```
## 🔄 已切换 Worktree

- **从**: main
- **到**: feature-user
- **当前 Story**: S-001 用户管理模块
- **进度**: 2/6 Tickets

下一步: `/next` 继续执行 T-003
```

### /worktree delete {name}

删除指定 worktree。

**前置检查**：
- 确认不是当前 worktree
- 确认无未提交的变更
- 确认 Story 已完成或已合并

**输出**：
```
## ✅ Worktree 已删除

- **名称**: feature-user
- **分支**: feature/feature-user（已删除）
- **目录**: ../ruoyi-vue-feature-user/（已删除）

剩余 Worktrees: 2
```

### /worktree status

查看各 worktree 的详细状态。

**输出**：
```
## 📊 Worktree 状态

### main (当前)
- 分支: main
- 最后活动: 刚刚
- 无活跃任务

### feature-user
- 分支: feature/feature-user
- Story: S-001 用户管理模块
- 进度: 2/6 (33%)
- 下一个: T-003 用户编辑 API
- 最后检查点: CP-20260201-100500

### feature-order
- 分支: feature/feature-order
- Story: S-002 订单管理模块
- 进度: 0/4 (0%)
- 状态: 未开始
```

## 合并流程

完成 Story 后合并回主分支：

```bash
/worktree switch main                 # 切换到主分支
git merge feature/feature-user        # 合并（手动）
/worktree delete feature-user         # 删除 worktree
```

## 约束
1. 每个 worktree 只能关联一个 Story
2. 删除前必须合并或确认放弃
3. 最大并行 worktree 数由配置控制
```

---

## 15. 会话启动自动流程

当新会话开始时，框架自动执行以下流程（无需命令）：

```markdown
# 会话启动流程

## 自动执行步骤

1. **检测项目配置**
   - 读取 `.claude/CLAUDE.md`
   - 加载 `.claude/project/config.yaml`

2. **恢复状态**
   - 读取 `tasks/STATE.yaml`
   - 获取当前 phase、story、ticket

3. **加载记忆**
   - 读取 `memory/session.yaml`
   - 读取 `memory/decisions.yaml`
   - 加载最近摘要（如有）

4. **输出恢复报告**
   """
   ## 🔄 会话恢复

   **上次会话**: {last_active}
   **当前阶段**: {phase}
   **当前任务**: {story} / {ticket}

   ### 进度
   - Story {story_id}: {title} ({progress})
   - 下一个 Ticket: {next_ticket}

   ### 重要决策
   {recent_decisions}

   ### 可用操作
   - `/next` - 继续执行 {next_ticket}
   - `/status` - 查看详细状态
   - `/restore CP-xxx` - 恢复到检查点

   ---
   继续执行吗？输入 `/next` 或其他命令。
   """

## 首次使用

如果是新项目（无 STATE.yaml），输出：

"""
## 👋 欢迎使用一人公司 AI 交付框架

检测到这是新项目，请先初始化：

1. 运行 `/init-project {项目名} --stack {技术栈}`
2. 将需求放到 `docs/requirements/REQ-001.md`
3. 运行 `/add-requirement REQ-001`
4. 运行 `/brainstorm` 开始工作

或运行 `/status` 查看帮助。
"""
```

---

## 相关文档

- [00_概览](00_概览.md) - 返回概览
- [32_命令体系](32_命令体系.md) - 命令总览
- [11_Skills_工作流](11_Skills_工作流.md) - deliver-ticket 详情
