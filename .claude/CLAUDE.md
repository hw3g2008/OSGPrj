# 一人公司 AI 开发框架

> 本框架基于 RPIV 工作流（Research → Plan → Implement → Validate），实现 AI 自主开发。

---

## ⚠️ 首次响应规则（SessionStart Hook）

**每次会话开始时，必须执行以下检查：**

```
1. 读取 tasks/STATE.yaml
   - 如果不存在 → 提示执行 /init-project
   - 如果存在 → 读取当前状态

2. 读取 .claude/project/config.yaml
   - 如果不存在 → 提示创建项目配置
   - 如果存在 → 加载项目配置

3. 输出当前状态摘要：
   ## 📊 当前状态
   - 项目: {name}
   - 当前 Story: {current_story}
   - 当前 Ticket: {current_ticket}
   - 进度: {completed}/{total} Tickets
```

---

## 🚫 禁止行为

1. **不要停下来问用户** - Skills 自动迭代执行，直到完成
2. **不要凭记忆** - 每次必须读取 STATE.yaml 和 config.yaml
3. **不要假设** - 所有信息从文件中读取
4. **不要硬编码** - 技术栈、路径、命令从 config.yaml 读取

---

## 📁 框架结构

```
.claude/
├── CLAUDE.md                    # 本文件（入口）
├── core/                        # 核心框架（通用，可复制）
│   ├── skills/                  # 16 个 Skills
│   ├── agents/                  # 6 个 Agent 模板
│   ├── workflows/               # 工作流定义
│   ├── platform/                # 平台适配层
│   └── templates/               # YAML 模板
├── project/                     # 项目配置（项目特定）
│   ├── config.yaml              # ⚠️ 核心配置文件
│   ├── agents/                  # 项目 Agent 实例
│   └── rules/                   # 项目代码规范
├── commands/                    # 快捷命令
├── memory/                      # 工作记忆
└── checkpoints/                 # 检查点

tasks/
├── STATE.yaml                   # 当前状态
├── stories/                     # Story 文件
└── tickets/                     # Ticket 文件
```

---

## 🎯 核心命令

| 命令 | 说明 | 阶段 |
|------|------|------|
| `/init-project` | 初始化项目 | 准备 |
| `/brainstorm` | 需求分析（自动迭代） | Research |
| `/split story` | 拆解为 Stories | Plan |
| `/split ticket S-xxx` | 拆解为 Tickets | Plan |
| `/approve` | 审批 Stories/Tickets | Plan |
| `/next` | 执行下一个 Ticket | Implement |
| `/status` | 查看当前状态 | 任意 |
| `/checkpoint` | 保存检查点 | 任意 |
| `/restore` | 恢复检查点 | 任意 |

---

## 🔄 标准工作流

```
/brainstorm {模块名}     # 1. 需求分析（自动迭代校验）
     ↓
/split story             # 2. 拆解为 Stories
     ↓
/approve stories         # 3. 审批 Stories
     ↓
/split ticket S-001      # 4. 拆解为 Tickets
     ↓
/approve tickets         # 5. 审批 Tickets
     ↓
/next                    # 6. 执行 Ticket（自动继续）
     ↓
/verify S-001            # 7. 验收 Story
     ↓
/approve S-001           # 8. 完成 Story
```

---

## 📂 加载配置

- 核心框架: `.claude/core/`
- 项目配置: `.claude/project/config.yaml`
- 当前状态: `tasks/STATE.yaml`

---

## 👤 当前角色

根据 Ticket 类型自动分派：

| Ticket 类型 | 分派 Agent | 配置来源 |
|-------------|------------|----------|
| backend | backend-java Agent | `project/agents/backend-java.md` |
| frontend | frontend-vue Agent | `project/agents/frontend-vue.md` |
| database | dba-mysql Agent | `project/agents/dba-mysql.md` |

---

## 🧠 记忆管理

- **上下文阈值**: 70%（超过自动触发 context-compression）
- **检查点**: 每个 Ticket 完成后自动保存
- **决策记录**: `.claude/memory/decisions.yaml`
- **会话状态**: `.claude/memory/session.yaml`

---

## 📏 规范引用

| 技术 | 规范 |
|------|------|
| Java | 阿里巴巴 Java 开发手册 |
| Vue | Vue 官方风格指南 |
| SQL | 项目规范 `project/rules/sql.md` |

---

## 📖 详细文档

- 框架设计：`docs/一人公司框架/`
- 概览：`docs/一人公司框架/00_概览.md`
- 低智商模型指南：`docs/一人公司框架/44_低智商模型执行指南.md`
