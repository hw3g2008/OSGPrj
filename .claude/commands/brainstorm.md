# /brainstorm 命令

## 用法

```
/brainstorm {模块名或需求描述}
```

## 说明

执行需求头脑风暴，自动迭代正向/反向校验，直到输出完美的需求文档。

## 执行流程

```
1. 触发 Architect Agent
2. 加载 brainstorming Skill
3. Phase 0: PRD 生成（闭环，max 3 轮）
   - PRD 不存在 → 从 HTML 全量生成
   - PRD 已存在 → 询问用户: 重新生成 or 使用已有
   - 有 html_issues → 同步询问 PM 裁决 → 更新 PRD → 重跑
   - 安全阀: 3轮仍有问题 → 输出 open-questions.md → 阻塞
4. Phase 1: 收集输入 + 生成 SRS 初稿
5. Phase 2: 循环正向/反向/PRD覆盖率/UI专项校验（直到全部 ✅）
6. Phase 3: 增强全局终审（连续两轮无修改通过）
7. Phase 4: HTML 原型全量校验（差异分 A/B/C/D 四类）
8. 输出最终需求文档 + 问题确认清单（如有）
9. 更新 workflow:
   - 无问题: current_step = "brainstorm_done", next_step = "split_story"
   - 有问题: current_step = "brainstorm_pending_confirm", 阻塞
```

## ⚠️ 执行模式

```
Phase 1~3: 自动迭代执行，不等待用户确认
Phase 0: PRD 已存在时询问用户选择路径
Phase 0/4: 有问题确认清单时阻塞等待产品确认
```

## 示例

```
/brainstorm 用户登录模块
```

## 输出

需求规格文档，包含：
- 功能需求列表
- 验收标准
- 非功能需求
- 接口定义

## 下一步

执行 `/split story` 将需求拆解为 Stories
