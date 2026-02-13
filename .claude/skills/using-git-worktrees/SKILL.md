---
name: using-git-worktrees
description: "Use when needing parallel development - manages Git worktrees for isolated work"
metadata:
  invoked-by: "user"
  auto-execute: "false"
---

# Using-Git-Worktrees Skill

## 概览

Git Worktree 管理，支持并行开发隔离的代码变更。

## 何时使用

- 需要并行开发多个功能
- 需要隔离实验性变更
- 需要快速切换工作上下文

## Worktree 目录约定

```
workspace/
├── worktrees/                 # Worktree 根目录
│   ├── feature-login/         # 登录功能
│   ├── feature-register/      # 注册功能
│   └── hotfix-001/            # 热修复
```

## 创建 Worktree

### 步骤 1: 选择目录

```bash
# 目录命名规则: {type}-{name}
# type: feature | hotfix | experiment
# name: 简短描述

WORKTREE_DIR="workspace/worktrees/feature-login"
```

### 步骤 2: 安全验证

```python
def safe_to_create_worktree():
    # 检查是否有未提交变更
    status = run("git status --porcelain")
    if status:
        return False, "有未提交的变更，请先 commit 或 stash"
    
    # 检查目录是否已存在
    if path_exists(WORKTREE_DIR):
        return False, f"目录已存在: {WORKTREE_DIR}"
    
    return True, None
```

### 步骤 3: 创建

```bash
# 从当前分支创建
git worktree add workspace/worktrees/feature-login -b feature/login

# 从指定分支创建
git worktree add workspace/worktrees/hotfix-001 -b hotfix/001 main
```

## 管理命令

```bash
# 列出所有 worktrees
git worktree list

# 删除 worktree
git worktree remove workspace/worktrees/feature-login

# 清理已删除的 worktree
git worktree prune
```

## 执行伪代码

```python
def create_worktree(name, type="feature", base_branch=None):
    # 安全检查
    ok, error = safe_to_create_worktree()
    if not ok:
        return {"status": "error", "message": error}
    
    # 构建路径和分支名
    worktree_dir = f"workspace/worktrees/{type}-{name}"
    branch_name = f"{type}/{name}"
    
    # 确定基础分支
    if not base_branch:
        base_branch = get_current_branch()
    
    # 创建 worktree
    cmd = f"git worktree add {worktree_dir} -b {branch_name} {base_branch}"
    result = run(cmd)
    
    if result.exit_code != 0:
        return {"status": "error", "message": result.stderr}
    
    return {
        "status": "success",
        "worktree_dir": worktree_dir,
        "branch": branch_name
    }


def remove_worktree(name, type="feature"):
    worktree_dir = f"workspace/worktrees/{type}-{name}"
    
    # 检查是否有未提交变更
    status = run(f"git -C {worktree_dir} status --porcelain")
    if status:
        return {"status": "error", "message": "worktree 有未提交变更"}
    
    # 删除
    run(f"git worktree remove {worktree_dir}")
    
    return {"status": "success"}
```

## 输出格式

### 创建 Worktree

```markdown
## 🌳 Worktree 已创建

**目录**: workspace/worktrees/feature-login
**分支**: feature/login
**基于**: main

### 切换到 Worktree
```bash
cd workspace/worktrees/feature-login
```

### ⚠️ 注意
- 在 worktree 中工作完成后，记得合并回主分支
- 使用 `git worktree list` 查看所有 worktrees
```

### 列出 Worktrees

```markdown
## 🌳 Worktree 列表

| 目录 | 分支 | 状态 |
|------|------|------|
| /main/repo | main | 主仓库 |
| /worktrees/feature-login | feature/login | 活跃 |
| /worktrees/hotfix-001 | hotfix/001 | 活跃 |
```

## 硬约束

- 创建前必须检查未提交变更
- 必须使用规范的目录命名
- 删除前必须检查变更
- 必须记录所有 worktree 操作
