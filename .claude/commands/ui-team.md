# /ui-team 命令

## 用法

```bash
/ui-team [module]              # 并行还原指定模块的 UI
/ui-team admin                 # 并行还原 admin 模块的 4 个中心
/ui-team admin --zone users    # 仅还原用户中心（单 zone 调试）
```

## 说明

并行 Agent Team 模式 — 将模块的 UI 还原工作按子区域分派给多个 Agent 同时执行，完成后统一收口。

## 执行流程

```
1. 读取 STATE.yaml + config.yaml
2. 加载 zone 映射文件 (.claude/skills/ui-team/zones/{module}.yaml)
3. 并行分派 N 个 developer Agent（每个负责一个 zone）
4. 每个 Agent:
   a. 读取原型 HTML（精确行号范围）
   b. 读取当前 Vue 文件
   c. 逐页面比对 + 修复差异
   d. 输出变更清单
5. 等待全部 Agent 完成
6. 汇总变更报告
7. 执行 Build 验证
8. 提示用户执行 /final-closure 收口
```

## 参数规则

1. `module` 优先取命令参数
2. 若参数为空，回退 `STATE.current_requirement`
3. `--zone` 可选，指定只运行单个 zone

## 收口标准

UI Team 的收口由 `/final-closure` 统一执行（RPIV 标准）：

- Build 通过
- Final Gate（含 E2E API Gate + UI Visual Gate）
- Traceability Guard
- 审计报告（逐页面 visual pass/fail/style/state）

详见 `.claude/skills/ui-team/SKILL.md`

## 前置条件

- STATE.workflow.current_step = `all_stories_done`（推荐）
- zone 映射文件存在
- 原型文件存在

## Zone 定义

zone 映射文件位于 `.claude/skills/ui-team/zones/{module}.yaml`，定义了：
- 每个 zone 的名称、ID、Vue 目录
- 每个页面的原型行号范围和 Vue 文件列表
- 每个 Modal 的原型行号范围

当前已定义的 admin 模块 zones：

| Zone | ID | 页面数 | Modal 数 | Vue 文件数 |
|------|----|--------|----------|-----------|
| 用户中心 | users | 4 | 7 | 16 |
| 求职中心 | career | 5 | 11 | 10 |
| 教学中心 | teaching | 5 | 9 | 7 |
| 个人中心 | profile | 4 | 3 | 6 |

## 示例

```bash
# 并行还原 admin 模块所有 4 个中心
/ui-team admin

# 仅还原用户中心（调试用）
/ui-team admin --zone users

# 仅还原教学中心
/ui-team admin --zone teaching
```
