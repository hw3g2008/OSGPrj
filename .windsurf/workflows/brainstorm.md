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

2. **Phase 0: PRD 生成/验证（SSOT 原则）**
   - 检查 `osg-spec-docs/docs/01-product/prd/{module}/` 是否存在
   - **如果存在**：读取已有 PRD 文档
   - **如果不存在**：从 HTML 原型自动生成
     - 按 `config.prd_process.module_prototype_map` 查找原型文件
     - 浏览器打开 HTML 原型，逐页提取：页面概览、表格字段、表单字段、交互规则、按钮逻辑、状态流转、业务规则、权限控制
     - 生成页面级 PRD 文档，保存到 `prd/{module}/`
   - ℹ️ md/docx 文档仅作业务背景参考，不作为需求来源

3. **Phase 1: 收集输入 + 生成 SRS 初稿**
   - 读取 PRD 文档（Phase 0 产物，SSOT 来源）
   - 扫描已有代码结构（如有）
   - 读取相关规格文档
   - 调用 brainstorming skill 生成 SRS 初稿（每个 FR 必须标注 PRD 来源）

4. **Phase 2~3: 自动校验**
   - Phase 2: 多轮正向/反向/PRD覆盖率/UI专项校验（max 10 轮，UI专项仅在有原型映射时触发）
   - Phase 3: 增强全局终审（三维度终审 + A~I 多维度旋转校验，参见 quality-gate/SKILL.md）

5. **输出产物**
   - 在 `osg-spec-docs/tasks/` 下创建 `brainstorm-{module}.md`
   - 包含：FR（含 PRD 来源）、NFR、AC、接口定义、数据库变更、技术约束

6. **更新状态**
   - 更新 `STATE.yaml` 的 `workflow.current_step` 为 `brainstorm_done`
   - workflow-engine 自动继续执行 `/split story`（`brainstorm_done.approval_required: false`）
