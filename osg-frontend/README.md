# OSG 前端 Monorepo

OSG 职业培训平台前端项目，采用 **pnpm workspace** 管理的 Monorepo 架构。

## 项目结构

```
osg-frontend/
├── packages/
│   ├── shared/          # 共享层（组件、工具、API、类型）
│   ├── student/         # 学生端 (port: 3001)
│   ├── mentor/          # 导师端 (port: 3002)
│   ├── lead-mentor/     # 班主任端 (port: 3003)
│   └── assistant/       # 助教端 (port: 3004)
├── package.json         # Workspace 配置
├── pnpm-workspace.yaml  # pnpm workspace 配置
└── tsconfig.json        # TypeScript 配置
```

## 技术栈

- **框架**: Vue 3.3+
- **构建**: Vite 5
- **UI 组件**: Ant Design Vue 4
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **语言**: TypeScript 5
- **样式**: Sass

## 快速开始

### 1. 安装依赖

```bash
# 安装 pnpm（如果没有）
npm install -g pnpm

# 安装所有依赖
cd osg-frontend
pnpm install
```

### 2. 启动开发服务器

```bash
# 启动学生端
pnpm dev:student

# 启动导师端
pnpm dev:mentor

# 启动班主任端
pnpm dev:lead-mentor

# 启动助教端
pnpm dev:assistant
```

### 3. 构建

```bash
# 构建单个项目
pnpm build:student
pnpm build:mentor
pnpm build:lead-mentor
pnpm build:assistant

# 构建所有项目
pnpm build:all
```

## 开发端口

| 项目 | 端口 | 说明 |
|------|------|------|
| student | 3001 | 学生端 |
| mentor | 3002 | 导师端 |
| lead-mentor | 3003 | 班主任端 |
| assistant | 3004 | 助教端 |
| ruoyi-ui | 80 | 后台管理端（若依原生） |

## 共享层 (@osg/shared)

共享层提供所有端共用的代码：

- **components/**: 公共组件（OsgHeader, OsgFooter, OsgSidebar 等）
- **utils/**: 工具函数（request, storage, format）
- **api/**: API 封装（auth, user, course）
- **types/**: TypeScript 类型定义
- **styles/**: 全局样式和变量

### 使用共享层

```typescript
// 导入组件
import { OsgHeader, OsgPageContainer } from '@osg/shared/components'

// 导入工具
import { http, getToken, formatDate } from '@osg/shared/utils'

// 导入 API
import { login, getUserInfo } from '@osg/shared/api'

// 导入类型
import type { UserInfo, Course } from '@osg/shared/types'
```

## 后端对接

所有前端项目通过 `/api` 代理到后端服务（默认 `http://localhost:8080`）。

修改代理目标：编辑各项目的 `vite.config.ts` 中的 `server.proxy` 配置。

## 部署

每个项目可独立部署：

1. 构建：`pnpm build:<project>`
2. 部署 `packages/<project>/dist` 目录到对应服务器/CDN

建议部署方案：

| 项目 | 域名示例 |
|------|----------|
| student | student.osg.com |
| mentor | mentor.osg.com |
| lead-mentor | lead.osg.com |
| assistant | assistant.osg.com |
| ruoyi-ui | admin.osg.com |
