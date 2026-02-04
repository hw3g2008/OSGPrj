# /init-project 命令

## 用法

```
/init-project {项目名} --stack {技术栈}
```

## 说明

初始化项目框架，创建必要的目录和配置文件。

## 参数

- `{项目名}`: 项目名称
- `--stack`: 技术栈标识
  - `java-vue`: Java + Vue (默认)
  - `python-react`: Python + React
  - `node-vue`: Node.js + Vue

## 执行流程

```
1. 创建 osg-spec-docs/tasks/ 目录结构
2. 创建 .claude/project/config.yaml
3. 创建 osg-spec-docs/tasks/STATE.yaml
4. 初始化 .claude/memory/
5. 输出初始化报告
```

## 创建的文件

```
osg-spec-docs/tasks/
├── STATE.yaml           # 项目状态
├── stories/             # Story 文件目录
└── tickets/             # Ticket 文件目录

.claude/
├── project/
│   └── config.yaml      # 项目配置（根据 --stack 生成）
└── memory/
    └── decisions.yaml   # 决策记录
```

## 输出示例

```markdown
## 🚀 项目已初始化

**项目**: my-project
**技术栈**: java-vue

### 创建的文件
- osg-spec-docs/tasks/STATE.yaml ✅
- osg-spec-docs/tasks/stories/ ✅
- osg-spec-docs/tasks/tickets/ ✅
- .claude/project/config.yaml ✅
- .claude/memory/decisions.yaml ✅

### 框架信息
- Skills: 16 个
- Agents: 6 个
- Commands: 17 个

### ⏭️ 下一步
1. 检查并调整 `.claude/project/config.yaml` 配置
2. 执行 `/brainstorm {模块名}` 开始需求分析
```

## 示例

```
/init-project osg-platform --stack java-vue
```

## 注意事项

- 如果项目已初始化，会提示是否覆盖
- config.yaml 需要根据实际项目调整
