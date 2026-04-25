# M0 技术债登记

记录 M0 阶段实施中发现但**不立即修复**的技术债，统一在 M0 完成后或后续子 Epic 中处理。

## TD-001 ESLint 全工程无配置（2026-04-25 by Step 4.1）

**现象**：
- 根 `osg-frontend/package.json` 有 `"lint": "eslint packages..."` script
- 全工程无 `.eslintrc*` / `eslint.config.*` 配置文件
- 跑 `pnpm lint` 会报 "No ESLint configuration found"

**影响**：
- 各端 / shared 包都没有静态代码检查
- M0.4 Step 3 方案 §6.1 / Phase D 列的 lint 验收无法执行
- 新增代码无法被 lint 拦截风格问题

**建议处置**：
- **优先级**：P2（不阻塞 M0.4 / M0.5 / M0.6）
- **修复方式**：根工作区加 ESLint flat config（`eslint.config.js`）或共用 `.eslintrc.cjs`
- **修复时机**：M0 完成后单独 ticket，或 M1 子 Epic 启动时一并加上
- **责任端**：shared / mentor / lead-mentor / assistant / admin / student 全部受益

**追溯**：
- 发现时机：M0.4 Step 4.1 执行中（commit `a104e4e8`）
- 方案盲点：Step 3 方案文档 §9.1 第 3 项

## TD-002 后端测试编译错误（pre-existing）

**现象**：
- `OsgLeadMentorStoryRegressionTest.java:365` 用未定义的 `leadMentorJobOverviewService`
- `bin/run-backend-dev.sh` 跑 testCompile 失败 → 阻碍本地启动后端

**影响**：
- M0.4 Step 4.0 视觉验收无法走真实后端，被迫用前端注入 fake token 绕过

**建议处置**：
- **优先级**：P0（阻塞任何后端端到端验收）
- **修复方式**：M0.1-M0.3 后端清理时一并处理（Service 重命名、跨端引用修复）
- **修复时机**：M0.4 完成后立即启动 M0.1-M0.3
