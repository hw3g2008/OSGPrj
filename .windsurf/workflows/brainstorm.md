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

2. **读取输入文档**
   - 读取 `current_requirement_path` 指向的目录下所有 PRD 文档
   - 读取 UI 原型文档（如有）
   - 扫描已有代码结构（如有）
   - 理解业务需求、用户角色、功能点

3. **执行需求分析**
   - 调用 brainstorming skill 执行需求分析
   - 该 skill 会自动进行多轮正向/反向/PRD覆盖率校验（Phase 2）+ 增强全局终审（Phase 3：三维度终审 + A~I 多维度旋转校验，参见 quality-gate/SKILL.md）
   - 输出 IEEE 830 兼容的需求规格文档

4. **输出产物**
   - 在 `osg-spec-docs/tasks/` 下创建 `brainstorm-{模块名}.md`
   - 包含：功能需求列表、非功能需求、约束条件、验收标准

5. **更新状态**
   - 更新 `STATE.yaml` 的 `workflow.current_step` 为 `brainstorm_done`
   - 提示用户审阅需求文档
   - 审阅通过后可执行 `/split story`
