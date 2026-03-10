---
description: 需求分析流程 - 对指定模块执行需求头脑风暴和多轮校验
---

# 需求分析（Brainstorm）

## 使用方式

```
/brainstorm {模块名}
```

## 执行步骤

1. **确认目标模块**
   - 如果用户指定了模块名，使用该模块
   - 如果没有指定，读取 `osg-spec-docs/tasks/STATE.yaml` 中的 `current_requirement`

2. **Phase 0: PRD 生成（闭环，max 3 轮）**
   - PRD 不存在 → 需要生成；已存在 → 询问用户（重新生成 or 使用已有）
   - **闭环**：调用 prototype-extraction → 检查 `html_issues`
     - 无问题 → ✅ 进入 Phase 1
     - 有问题且未达安全阀 → 写入 `{module}-DECISIONS.md` → PM 文件裁决 → 更新 PRD → 重跑
     - 有问题且达到安全阀(3轮) → 输出 `{module}-DECISIONS.md` → `brainstorm_pending_confirm` → 停止
   - **门控检查**：Phase 0 完成后运行 `bash bin/check-skill-artifacts.sh prototype-extraction {module} {prd_dir}` 验证产物完整性，失败则回到 prototype-extraction 补充
     - 必须同时存在并通过结构校验：
       - `.claude/project/config.yaml.prd_process.truth_source`
       - `UI-VISUAL-CONTRACT.yaml`
       - `DELIVERY-CONTRACT.yaml`
       - `osg-spec-docs/tasks/audit/overlay-surface-inventory-latest.md`
     - source-stage 产物必须来自 HTML 真源：
       - overlay surface inventory 必须由 HTML 原型生成
       - `UI-VISUAL-CONTRACT.yaml.surfaces` 必须是 first-pass skeleton 派生产物
     - `UI-VISUAL-CONTRACT.yaml` 中的 `critical_surfaces` 为空或缺失时，视为 fail-closed，禁止进入 Phase 1
     - `UI-VISUAL-CONTRACT.yaml.surfaces` 为空或缺失时，视为 fail-closed，禁止进入 Phase 1
     - `truth_source` 配置缺失、冲突或不满足 single-source 约束时，视为 fail-closed，禁止进入 Phase 1
     - source-stage 产物出现 source-absent surface declaration 时，视为 fail-closed，禁止进入 Phase 1
     - repo-wide overlay inventory 缺失时，视为 fail-closed，禁止进入 Phase 1
   - **安全契约同步与门控（fail-closed）**：
     - 运行 `python3 .claude/skills/workflow-engine/tests/security_contract_init.py --mode sync`
     - 运行 `python3 .claude/skills/workflow-engine/tests/security_contract_guard.py --stage brainstorm`
     - 命中 `missing_contract_entry / decision_required_unresolved / *_drift` 任一项即阻断，禁止进入 Phase 1
   - **单一真源同步门控（fail-closed）**：
     - 运行 `python3 .claude/skills/workflow-engine/tests/truth_sync_guard.py --module {module}`
     - 若存在 `ui_truth_change=true && prototype_synced=false` 的已确认决策，立即阻断，禁止进入 Phase 1
     - 恢复路径只有：
       1. 回补 HTML 原型真源
       2. 将对应决策标记为 `prototype_synced=true`
       3. 重新执行 `/brainstorm {module}`
   - ℹ️ md/docx 文档仅作业务背景参考，不作为需求来源

3. **Phase 1: 收集输入 + 生成 SRS 初稿**
   - 读取 PRD 文档（Phase 0 产物，SSOT 来源）
   - 扫描已有代码结构（如有）
   - 读取相关规格文档
   - 调用 brainstorming skill 生成 SRS 初稿（每个 FR 必须标注 PRD 来源）

4. **Phase 2~3: 自动校验**
   - Phase 2: 多轮正向/反向/PRD覆盖率/UI专项校验（max 10 轮）
   - Phase 3: 增强全局终审（三维度终审 + A~I 多维度旋转校验，参见 quality-gate/SKILL.md）

5. **Phase 4: HTML↔PRD↔SRS 全量校验**
   - 按 `module_prototype_map` 逐端启动 HTTP 服务器浏览 HTML 原型
   - 逐页面截图 + 浏览器 snapshot 对比 PRD 和 SRS
   - 同时回查：
     - `DELIVERY-CONTRACT.yaml` 是否覆盖所有 in-scope 真实交付能力
     - `UI-VISUAL-CONTRACT.yaml.critical_surfaces` 是否覆盖所有关键 UI 区域
     - `UI-VISUAL-CONTRACT.yaml.surfaces` 是否为所有声明过的 overlay surfaces 生成了 first-pass skeleton
   - 校验维度：页面结构、表格列、筛选栏选项、操作按钮、交互行为、状态展示、Badge/Tag 颜色、样式精确度（CSS 变量值/组件样式参数/布局参数是否与 HTML 一致）
   - 差异处理规则（HTML 是 SSOT）：
     - **A类：HTML 有但 PRD/SRS 遗漏** → 直接补充到 PRD + SRS
     - **B类：PRD/SRS 有但 HTML 无** → 写入决策日志（待确认）
     - **C类：HTML 自身内部矛盾** → 写入决策日志（待产品裁决）
     - **D类：HTML 明显 Bug** → 在 PRD 中标注 + 写入决策日志（待确认修复方向）
     - **V类：Visual Contract 漂移**（HTML/PRD 与 `UI-VISUAL-CONTRACT.yaml` 不一致，含 `required_anchors` 质量不达标：<3 或全弱锚点）→ 写入决策日志（待确认）
   - **有 A 类补充 → 回到 Phase 2 重新校验**（补充改变了 SRS，必须重新校验，max 1 次回退）
   - 只有 B/C/D/V 类才算"有问题"，A 类（auto_fixed）不触发阻塞
   - 若本轮生成/确认了 UI 真源变更决策，必须在对应 `DECISIONS.md` 记录：
     - `ui_truth_change: true`
     - `prototype_synced: false`
   - 在 HTML 原型回补完成前，不得继续进入下游派生产物扩展

6. **输出产物**（保存到 `osg-spec-docs/docs/02-requirements/srs/`）
   - `{module}.md` — SRS 文档（FR/NFR/AC/接口/数据库/技术约束）
   - `{module}-DECISIONS.md` — 决策日志（有待确认项时生成），记录 B/C/D/V 类问题：
     - **B类**：PRD/SRS 有但 HTML 无（待确认）
     - **C类**：HTML 自身内部矛盾（待产品裁决）
     - **D类**：HTML 明显 Bug（待确认修复方向）
     - **V类**：Visual Contract 漂移（待确认）
   - `UI-VISUAL-DECISIONS.md`（条件产物，位于 PRD 目录）— 视觉裁决可读投影，审批仍以 `{module}-DECISIONS.md` 为唯一入口

7. **更新状态**
   - **无待确认项**: `workflow.current_step` → `brainstorm_done`，自动继续 `/split story`
   - 前提：`DELIVERY-CONTRACT.yaml` 与 `UI-VISUAL-CONTRACT.yaml`（含 `critical_surfaces` 与 `surfaces`）均已存在且通过门控
   - 前提补充：`overlay-surface-inventory-latest.md` 已存在且通过门控
   - **有待确认项**: `workflow.current_step` → `brainstorm_pending_confirm`，阻塞等待产品确认
     - 产品确认后重新执行 `/brainstorm {module}`（增量更新路径）
     - 或执行 `/approve brainstorm`：phase0 来源 → 更新 PRD → 重新 /brainstorm；phase4 来源 → 仅确认裁决，不得绕过 truth sync gate
     - `/approve brainstorm` 只读取 `{module}-DECISIONS.md`，不直接读取 `UI-VISUAL-DECISIONS.md`
