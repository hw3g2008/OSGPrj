# /ui-closure 命令

## 用法

```bash
/ui-closure <module>                                # 全模块收口（所有 zone 并行 + 模块级验证）
/ui-closure <module> --zone <zone_id>               # 单 zone 全部页面
/ui-closure <module> --zone <z1>,<z2>               # 多 zone 收口
/ui-closure <module> --zone <zone_id>:<page_id>     # zone 下指定页面
/ui-closure <module> --zone <zone_id>:<p1>,<p2>     # zone 下多个页面
/ui-closure <module> --mode module                  # 仅跑模块级验证
```

## 说明

通用独立 UI 收口引擎 — 对任意模块执行 UI 还原比对、修复与验证。

不依赖 RPIV 工作流（STATE.yaml / config.yaml）。Zone YAML 是唯一输入。

## 执行流程

```
Layer 1: Zone 发现
  1. 读取 .claude/skills/ui-closure/zones/{module}.yaml
  2. 验证原型文件存在（HTML 原型是唯一真源）
  3. 检测 UI-VISUAL-CONTRACT / DELIVERY-CONTRACT（可选增强）

Layer 2: Zone 执行（Agent 并行）
  对每个目标 zone，使用 Agent tool (subagent_type="developer") 分派独立 Agent：
  4. Phase 1: 读取原型 HTML（精确行号范围）+ modal HTML
  5. Phase 2: 逐元素严格比对（10 项审计：表格/筛选/按钮/Tab/Modal/状态标签/颜色/卡片/分页/空状态）
  6. Phase 3: 修复 Vue 文件对齐原型
  7. Phase 4: Zone 级验证（8 项 gate）
  8. Phase 5: 输出 zone 变更报告（含 Modal/表格/Tab/颜色矩阵）

Layer 3: Module 收口（全模块模式）
  9.  Phase 6: 校验所有 zone 通过
  10. Phase 7: Build + Lint
  11. Phase 8: RPIV UI Gate（7 项）
  12. Phase 9: 语义级验证（5 项，RPIV 无此层）
```

## 参数规则

1. `module` 必填，对应 `zones/{module}.yaml`
2. `--zone` 可选，支持 `zone_id:page_id` 语法：
   - `users` → users zone 全部页面
   - `profile:logs` → profile zone 只跑 logs 页面
   - `profile:logs,notice` → profile zone 跑 logs + notice
   - `users,profile:logs` → users 全部 + profile 只跑 logs
3. `--mode module` 跳过 zone 执行，仅跑模块级验证

## 模块级 Gate 清单

### Phase 7: 构建验证

| Gate | 阻塞级别 |
|------|----------|
| Build | 硬阻塞 |
| Lint | 硬阻塞 |

### Phase 8: RPIV UI Gate（继承 final-gate）

| Gate | 阻塞级别 |
|------|----------|
| ui-visual-gate.sh | CONTRACT 存在时硬阻塞 |
| ui_critical_evidence_guard | CONTRACT 存在时硬阻塞 |
| delivery_truth_guard | **必须执行** |
| delivery_content_guard | DELIVERY-CONTRACT 存在时硬阻塞 |
| prototype_derivation_consistency_guard | 硬阻塞 |
| menu_route_view_guard | 硬阻塞 |
| permission_code_consistency_guard | 硬阻塞 |

### Phase 9: 语义级验证（ui-closure 独有，RPIV 无此层）

| Gate | 检查内容 | 阻塞级别 |
|------|---------|----------|
| Modal 全覆盖 | 每个 modal_id 有 Vue 实现 + 字段数/标题一致 | 硬阻塞 |
| 表格列一致性 | 列数、列名、列顺序与原型完全一致 | 硬阻塞 |
| 颜色 Token 合规 | `<style>` 中无硬编码颜色（白名单除外） | 硬阻塞 |
| 状态标签全覆盖 | 每个状态值有对应 `<a-tag>` + 颜色正确 | 硬阻塞 |
| Tab 一致性 | Tab 数量、名称、顺序与原型完全一致 | 硬阻塞 |

## 与 RPIV 的关系

- `/ui-closure` 独立运行，不需要 RPIV 状态
- `/ui-closure` 只执行 UI 相关 gate
- 全量验收请在 `/ui-closure` 之后执行 `/final-closure`

## Zone 定义

zone 映射文件位于 `.claude/skills/ui-closure/zones/{module}.yaml`。

新模块接入：在 `zones/` 目录下新建 `{module}.yaml`，引擎自动识别。

当前已定义：

| Zone | ID | 页面数 | Modal 数 |
|------|----|--------|----------|
| 用户中心 | users | 4 | 7 |
| 求职中心 | career | 5 | 11 |
| 教学中心 | teaching | 5 | 9 |
| 个人中心 | profile | 4 | 3 |

## 示例

```bash
# 全模块收口（4 个 zone 并行 + 模块级验证）
/ui-closure admin

# 仅还原用户中心（全部页面）
/ui-closure admin --zone users

# 还原用户中心 + 求职中心
/ui-closure admin --zone users,career

# 个人中心下只跑操作日志页面
/ui-closure admin --zone profile:logs

# 个人中心下跑操作日志 + 通知管理
/ui-closure admin --zone profile:logs,notice

# 用户中心全部 + 个人中心只跑操作日志
/ui-closure admin --zone users,profile:logs

# 所有 zone 已完成，仅跑模块级验证
/ui-closure admin --mode module
```

详见 `.claude/skills/ui-closure/SKILL.md`
