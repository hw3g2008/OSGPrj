# /worktree 命令

## 用法

```
/worktree create feature-user    # 创建新 worktree
/worktree list                   # 列出所有 worktree
/worktree switch feature-order   # 切换 worktree
```

## 说明

管理 Git Worktree，支持并行开发。

## /worktree create

### 用法

```
/worktree create {name}
/worktree create {name} --base {branch}
```

### 执行流程

```
1. 加载 using-git-worktrees Skill
2. 检查未提交变更
3. 创建 worktree 目录
4. 创建对应分支
5. 输出创建报告
```

### 输出

```markdown
## 🌳 Worktree 已创建

**目录**: workspace/worktrees/feature-user
**分支**: feature/user
**基于**: main

### 切换命令
```bash
cd workspace/worktrees/feature-user
```
```

---

## /worktree list

### 用法

```
/worktree list
```

### 输出

```markdown
## 🌳 Worktree 列表

| 目录 | 分支 | 状态 |
|------|------|------|
| /main/repo | main | 主仓库 |
| /worktrees/feature-user | feature/user | 活跃 |
| /worktrees/feature-order | feature/order | 活跃 |
```

---

## /worktree switch

### 用法

```
/worktree switch {name}
```

### 说明

切换到指定的 worktree 目录。

### 输出

```markdown
## 🔄 已切换 Worktree

**目标**: feature-order
**目录**: workspace/worktrees/feature-order
**分支**: feature/order
```

---

## 使用场景

- 多个独立 Story 并行开发
- 不同端的工作互不干扰
- 快速切换工作上下文

## 相关命令

- `/status` - 查看当前状态
- `/checkpoint` - 保存检查点
