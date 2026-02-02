# 一人公司 AI 交付框架文档

> 基于 obra/superpowers、Ralph Loop、Catalyst、TÂCHES、LangGraph 等业界最佳实践，独立实现一套 Skills + Agents 结合的工程化交付框架。

## 文档导航

| 编号 | 文档 | 内容 |
|------|------|------|
| 00 | [概览](00_概览.md) | 架构概述、核心原则、快速入门 |
| 01 | [工作流_RPIV](01_工作流_RPIV.md) | RPIV 四阶段、审批点、会话恢复 |
| 02 | [错误处理](02_错误处理.md) | 错误分类、回滚机制、Agent 信息传递 |
| 10 | [Skills_记忆管理](10_Skills_记忆管理.md) | memory-bank, context-compression, checkpoint-manager |
| 11 | [Skills_工作流](11_Skills_工作流.md) | brainstorming, story-splitter, ticket-splitter, deliver-ticket |
| 12 | [Skills_质量](12_Skills_质量.md) | verification, tdd, code-review, debugging |
| 13 | [Skills_自动化](13_Skills_自动化.md) | ralph-loop, progress-tracker |
| 20 | [Agent_Coordinator](20_Agent_Coordinator.md) | 协调员 |
| 21 | [Agent_Architect](21_Agent_Architect.md) | 架构师 |
| 22 | [Agent_Planner](22_Agent_Planner.md) | 计划员 |
| 23 | [Agent_Developer](23_Agent_Developer.md) | 开发者 |
| 24 | [Agent_Reviewer](24_Agent_Reviewer.md) | 评审员 |
| 25 | [Agent_QA](25_Agent_QA.md) | QA |
| 30 | [格式规范](30_格式规范.md) | Ticket、Story、日志 YAML 格式 |
| 31 | [项目配置](31_项目配置.md) | config.yaml、目录结构、初始化流程 |
| 32 | [命令体系](32_命令体系.md) | 所有 /xxx 命令说明 |
| 40 | [commands_命令文件](40_commands_命令文件.md) | 9 个命令文件的具体内容 |
| 41 | [templates_模板文件](41_templates_模板文件.md) | 5 个 YAML 模板文件 |
| 42 | [实现细节](42_实现细节.md) | Subagent、上下文检测、Git 集成 |
| 43 | [rules_代码规范](43_rules_代码规范.md) | Java、Vue、SQL 代码规范 |
| 50 | [参考_Superpowers分析](50_参考_Superpowers分析.md) | Superpowers 框架对比分析、实现细节 |
| 51 | [历史_实现计划](51_历史_实现计划.md) | 框架实现计划、Todos、详细设计（历史记录） |

## 快速开始

1. 阅读 [概览](00_概览.md) 了解框架整体架构
2. 阅读 [工作流_RPIV](01_工作流_RPIV.md) 了解核心工作流程
3. 阅读 [项目配置](31_项目配置.md) 了解如何初始化项目
4. 阅读 [命令体系](32_命令体系.md) 了解可用命令

## 文档位置

本文档位于项目根目录下的 `docs/一人公司框架/` 目录。

**原位置**：`~/.cursor/plans/一人公司框架/`  
**现位置**：`docs/一人公司框架/`

所有文档已迁移到项目中，便于版本控制和团队协作。

## 相关资源

- **Superpowers 框架**：https://github.com/obra/superpowers
- **Ralph Loop**：https://github.com/thecgaigroup/ralph-cc-loop
- **Catalyst**：https://github.com/coalesce-labs/catalyst
- **TÂCHES**：https://github.com/glittercowboy/taches-cc-resources
