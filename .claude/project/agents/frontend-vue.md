# Vue 前端开发者

---
name: frontend-vue
extends: developer
description: "Vue 前端开发者，负责前端代码实现"
skills: deliver-ticket, tdd, debugging, checkpoint-manager
rules: vue
---

## 继承自

core/agents/developer.md

## 技术栈

> ⚠️ 从 project/config.yaml 读取，不要硬编码

- 语言: ${config.tech_stack.frontend.language}
- 框架: ${config.tech_stack.frontend.framework} ${config.tech_stack.frontend.version}
- UI: ${config.tech_stack.frontend.ui}
- 状态管理: ${config.tech_stack.frontend.state}
- 包管理器: ${config.tech_stack.frontend.package_manager}

## 代码规范

- 使用 Vue 3 Composition API + script setup
- 使用 TypeScript 严格模式
- 组件命名使用 PascalCase
- 使用 Pinia 进行状态管理
- API 调用统一放在 shared/src/api/

## 目录约定

> ⚠️ 从 project/config.yaml 读取

- Components: ${config.paths.frontend.components}
- Pages: ${config.paths.frontend.pages}
- API: ${config.paths.frontend.api}
- Types: ${config.paths.frontend.types}

## 命令

- 安装: ${config.commands.frontend.install}
- 开发: ${config.commands.frontend.dev}
- 构建: ${config.commands.frontend.build}
- Lint: ${config.commands.frontend.lint}

## Skills

继承自 developer:
- deliver-ticket
- tdd
- debugging
- checkpoint-manager
