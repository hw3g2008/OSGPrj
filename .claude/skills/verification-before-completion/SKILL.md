---
name: verification-before-completion
description: "Use before claiming 'done/fixed/complete' - must provide actual verification evidence"
metadata:
  invoked-by: "fix command step 4, superpowers R2"
  auto-execute: "true"
  related-skills: "debugging, when-stuck, fix"
---

# Verification Before Completion Skill

## 概览

在声称"完成/修好了/OK"之前必须调用的验证技能。任何代码/配置修改后的总结性回复前，必须通过此验证。

## ⚠️ 铁律

```
没有验证证据 = 未完成

禁止仅凭代码 diff 就声称完成
禁止只贴修改后的代码作为"证据"
代码能写不代表能跑
```

---

## 触发条件（任一命中即触发）

- AI 准备回复"修好了 / 完成了 / OK 了 / 已修复 / done"
- AI 准备说"应该可以了 / 试试看"
- 任何代码/配置修改后的总结性回复

---

## 三层验证（按环境可达性选择）

### 层1：本地可执行（首选）

执行实际命令，贴出退出码和关键输出。

| 类型 | 命令示例 |
|------|---------|
| 前端构建 | `pnpm --dir ${frontend.package_dir} build` |
| 前端测试 | `pnpm --dir ${frontend.package_dir} test` |
| 后端构建 | `mvn -f ${backend.project_dir} compile` |
| 后端测试 | `mvn -f ${backend.project_dir} test` |
| 类型检查 | `pnpm --dir ${frontend.package_dir} type-check` |

### 层2：部分可执行（次选）

本地能跑部分验证（如语法检查、Lint），贴结果。

| 类型 | 命令示例 |
|------|---------|
| TS语法 | `pnpm --dir ${frontend.package_dir} tsc --noEmit` |
| ESLint | `pnpm --dir ${frontend.package_dir} lint` |
| 单个测试 | `mvn test -Dtest={TestClass}` |

### 层3：无法执行（不得已）

本地无法复现环境问题时，提供用户可自己执行的命令。

**必须**明确标注`[请用户验证]`：
```
[请用户验证] 请在浏览器中执行以下操作：
1. 访问 /positions 页面
2. 点击"标记已投递"按钮
3. 填写表单后点击确认
4. 确认弹窗关闭且列表刷新
```

---

## 验证检查清单

每项修复后必须全部通过：

- [ ] **命令执行**：实际运行了验证命令（非只读代码）
- [ ] **退出码**：命令退出码为 0
- [ ] **关键输出**：贴出了命令的实质性输出（非空输出）
- [ ] **无新错误**：输出中无 `error` / `ERROR` / `failed` / `FAILED`
- [ ] **功能验证**：确认原问题已解决（可通过步骤描述）
- [ ] **回归检查**：确认相关功能未受影响

---

## 输出格式

```markdown
## ✅ 验证完成

### 验证证据
**命令**: `{实际执行的命令}`
**退出码**: 0（通过）
**输出摘要**:
```
{关键输出（15行以内）}
```

### 检查清单
- [x] 命令执行
- [x] 退出码 0
- [x] 无新错误
- [x] 原问题已解决
- [x] 回归检查通过

### 结论
✅ 修复验证通过，可以声明完成。
```

如果验证失败：

```markdown
## ❌ 验证失败

### 验证证据
**命令**: `...`
**退出码**: 非0（失败）
**输出摘要**:
```
{错误输出}
```

### 问题
{描述失败原因}

### 建议
继续修复或回滚变更。
```

---

## 硬约束

- **禁止**说"修好了"但没有任何验证输出
- **禁止**仅凭代码 diff 作为"证据"
- **禁止**跳过验证直接进入总结
- **必须**先调用此 skill，再进入收尾步骤

## 与 debugging skill 的关系

`verification-before-completion` 是 `debugging` 的补充：
- `debugging` 负责**修复前**的根因分析
- `verification-before-completion` 负责**修复后**的验证确认

两者顺序不可颠倒：必须先 debugger 再 verify-before-completion。