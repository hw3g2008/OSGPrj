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
     - 有问题且未达安全阀 → 同步询问 PM 裁决 → 更新 PRD → 重跑
     - 有问题且达到安全阀(3轮) → 输出 `open-questions.md` → `brainstorm_pending_confirm` → 停止
   - **门控检查**：Phase 0 完成后运行 `bash bin/check-skill-artifacts.sh prototype-extraction {module} {prd_dir}` 验证产物完整性，失败则回到 prototype-extraction 补充
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
   - 校验维度：页面结构、表格列、筛选栏选项、操作按钮、交互行为、状态展示、Badge/Tag 颜色、样式精确度（CSS 变量值/组件样式参数/布局参数是否与 HTML 一致）
   - 差异处理规则（HTML 是 SSOT）：
     - **A类：HTML 有但 PRD/SRS 遗漏** → 直接补充到 PRD + SRS
     - **B类：PRD/SRS 有但 HTML 无** → 输出到问题确认清单（待确认）
     - **C类：HTML 自身内部矛盾** → 输出到问题确认清单（待产品裁决）
     - **D类：HTML 明显 Bug** → 在 PRD 中标注 + 输出到问题确认清单（待确认修复方向）
   - **有 A 类补充 → 回到 Phase 2 重新校验**（补充改变了 SRS，必须重新校验，max 1 次回退）
   - 只有 B/C/D 类才算"有问题"，A 类（auto_fixed）不触发阻塞

6. **输出产物**（保存到 `osg-spec-docs/docs/02-requirements/srs/`）
   - `{module}.md` — SRS 文档（FR/NFR/AC/接口/数据库/技术约束）
   - `{module}-open-questions.md` — 问题确认清单（有待确认项时生成），分 4 类：
     - **A类**：HTML 有但 PRD/SRS 遗漏（已自动补充，记录备查）
     - **B类**：PRD/SRS 有但 HTML 无（待确认）
     - **C类**：HTML 自身内部矛盾（待产品裁决）
     - **D类**：HTML 明显 Bug（待确认修复方向）

7. **更新状态**
   - **无问题确认清单**: `workflow.current_step` → `brainstorm_done`，自动继续 `/split story`
   - **有问题确认清单**: `workflow.current_step` → `brainstorm_pending_confirm`，阻塞等待产品确认
     - 产品确认后重新执行 `/brainstorm {module}`（增量更新路径）
     - 或执行 `/approve brainstorm` 跳过确认 → `brainstorm_done`
