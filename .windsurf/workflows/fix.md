---
description: 轻量 bug 修复流程（绕过 RPIV 状态机）— Systematic Debugging → 确认根因 → TDD 修复 → Verification
---

# /fix — 轻量 Bug 修复流程

**适用场景**：
- 单文件或少量文件的 bug 修复
- 不需要 RPIV 追溯的问题
- 用户能清楚描述症状或提供报错

**不适用**：
- 跨多模块的架构性问题（走 RPIV `/brainstorm`）
- 纯需求变更（走 `/feat-small`）

---

## Step 1 — 调用 systematic-debugging skill 定位根因

先读取并执行 `~/.codeium/windsurf/skills/systematic-debugging/SKILL.md` 定义的 4 阶段：

1. **Reproduce**：确认能稳定复现，或请用户补充复现步骤
2. **Investigate**：读相关代码 + 日志 + 栈，列出所有可疑点
3. **Root Cause**：通过证据锁定**唯一**根因（不是猜，要有证据链）
4. **Fix Plan**：提出**最小修改**方案（遵循"只做最小修改避免过度工程"）

**如果中途发现需要反向追踪调用栈**，调用 `root-cause-tracing` skill 辅助。

---

## Step 2 — ⛔ 确认门：输出根因 + 方案，等用户同意

**必须**在这里停下，向用户输出：

```
## 根因
[一句话说清根因，带代码位置和证据]

## 修复方案
- 改哪些文件（完整路径）
- 具体改什么（贴 diff 片段）
- 为什么这个最小（不多改的理由）

## 影响范围
[哪些功能可能受影响，如何防止回归]

请确认是否同意此方案？
```

**禁止**在用户回复"确认"之前调用 `edit` / `multi_edit` / `write_to_file`。

---

## Step 3 — 实施修复（最小改动）

用户确认后：
- 如果有现成测试，**先跑一次确认红**（证明测试能捕捉此 bug）
- 如果没有测试但值得加，调用 `test-driven-development` skill 先写一个红测试
- 改代码，让测试变绿
- 如果是紧急修复不便加测试，明确告知用户"本次未加回归测试，建议后补"

---

## Step 4 — 调用 verification-before-completion skill 验证

先读取并执行 `~/.codeium/windsurf/skills/verification-before-completion/SKILL.md`。

**必须**提供至少一条实际验证证据：
- 跑了什么命令、退出码、关键输出
- 或：请用户执行的验证命令（当本地无法执行时）

**禁止**只贴修改后的代码就说"完成"。

---

## Step 5 — 收尾

输出简短总结：
- 修了什么（1 句话）
- 改了哪些文件（列表）
- 验证证据（命令 + 结果）
- 是否加了回归测试
- 是否需要用户自测的额外场景

---

## 失败升级（第 3 次还没修好）

如果走完 Step 1~4 后用户说"还是不行" / "又报新错"**累计 2 次**，**禁止**第 3 次继续按同思路改。

立即调用 `when-stuck` skill 重新分流，输出：
- 前两次假设是什么
- 为什么被证伪
- 新方向是什么（root-cause-tracing / inversion-exercise / dispatching-parallel-agents / 请用户补充上下文）

这是 `superpowers-triggers.md` R3 规则的强制要求。
