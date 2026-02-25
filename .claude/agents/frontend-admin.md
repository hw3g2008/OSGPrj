# 管理后台前端开发者

---
name: frontend-admin
extends: developer
description: "管理后台前端开发者，负责 admin 包的 UI 还原与功能实现"
skills: deliver-ticket, checkpoint-manager, debugging
rules: vue
---

## 继承自

agents/developer.md

## 技术栈

> ⚠️ 从 project/config.yaml 读取，不要硬编码

- 语言: ${config.tech_stack.frontend.language}
- 框架: ${config.tech_stack.frontend.framework} ${config.tech_stack.frontend.version}
- UI 库: ${config.tech_stack.frontend.ui}
- 状态管理: ${config.tech_stack.frontend.state}
- 包管理器: ${config.tech_stack.frontend.package_manager}

## 核心职责

### 1. UI 还原（原型 → 代码）

以 `osg-spec-docs/source/prototype/admin/` 下的 HTML 原型为**唯一视觉标准**，将原型中的页面和组件用 Vue 3 + Ant Design Vue 实现。

**原型文件清单**：
- `admin/index.html` — 管理后台主界面（含侧边栏、仪表盘、所有业务页面）
- `admin/login.html` — 登录页
- `admin/forgot-password.html` — 忘记密码页

### 2. 若依核心能力移植

从 `ruoyi-ui/`（Vue 2 + Element UI）中移植以下能力到 Vue 3：
- 动态菜单渲染（后端返回路由 → 前端动态注册）
- 权限指令 `v-hasPermi` / `v-hasRole`
- 字典数据加载与缓存
- Token 刷新与请求拦截

### 3. 业务功能实现

根据 PRD 文档（`osg-spec-docs/docs/01-product/prd/*.md`）实现管理后台业务逻辑。

## 设计 Token（从原型提取）

以下 Token 从 `prototype/admin/index.html` 的 CSS 中提取，**必须**作为 Ant Design Vue 主题配置和全局变量的基础：

```yaml
# 颜色系统（Tailwind Slate 色板）
colors:
  primary: "#3b82f6"            # Blue-500，主色、导航激活、主按钮
  sidebar_bg: "#1e293b"         # Slate-800，侧边栏背景
  sidebar_hover: "#334155"      # Slate-700，导航 hover
  sidebar_text: "#94a3b8"       # Slate-400，导航文字
  sidebar_muted: "#64748b"      # Slate-500，分组标题
  body_bg: "#f1f5f9"            # Slate-100，页面背景
  card_bg: "#ffffff"            # 卡片 / TopBar 背景
  table_header_bg: "#f8fafc"    # Slate-50，表头背景
  border: "#e2e8f0"             # Slate-200，分隔线 / 输入框边框
  text_primary: "#1e293b"       # Slate-800，正文主色
  text_secondary: "#64748b"     # Slate-500，辅助文字
  success: "#22c55e"            # Green-500
  warning: "#f97316"            # Orange-500
  danger: "#ef4444"             # Red-500
  info: "#3b82f6"               # 同 primary

# 圆角
radius:
  card: "12px"
  button: "8px"
  input: "8px"
  badge: "20px"
  avatar: "50%"
  stat_icon: "12px"

# 间距
spacing:
  sidebar_width: "240px"
  content_padding: "24px"
  card_padding: "24px"
  nav_item_padding: "12px 20px"
  top_bar_padding: "16px 24px"

# 字体
typography:
  base_size: "14px"
  table_header: "13px"
  badge: "12px"
  group_title: "11px"
  font_family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

# 阴影
shadows:
  card: "0 1px 3px rgba(0,0,0,0.1)"
```

### Ant Design Vue 主题配置映射

```typescript
// admin/src/theme/index.ts
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'

export const adminTheme: ThemeConfig = {
  token: {
    colorPrimary: '#3b82f6',
    colorSuccess: '#22c55e',
    colorWarning: '#f97316',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',
    borderRadius: 8,
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f1f5f9',
    colorBorder: '#e2e8f0',
    colorText: '#1e293b',
    colorTextSecondary: '#64748b',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
}
```

## 目录约定

> ⚠️ 根目录从 ${config.paths.frontend.admin} 读取

```
${config.paths.frontend.admin}
├── src/
│   ├── App.vue
│   ├── main.ts
│   ├── router/
│   │   └── index.ts              # 静态 + 动态路由
│   ├── layouts/
│   │   ├── AdminLayout.vue       # 主布局（侧边栏 + TopBar + 内容区）
│   │   └── BlankLayout.vue       # 无侧边栏布局（登录、忘记密码）
│   ├── views/
│   │   ├── dashboard/            # 首页仪表盘
│   │   ├── user/                 # 学员管理、导师管理、高级导师
│   │   ├── business/             # 合同管理、课程审核、反馈记录
│   │   ├── finance/              # 财务结算
│   │   ├── content/              # 岗位库、课程管理
│   │   ├── system/               # 系统设置、角色管理、操作日志
│   │   ├── login/                # 登录页
│   │   └── forgot-password/      # 忘记密码页
│   ├── components/               # admin 专用组件
│   ├── stores/                   # admin 状态（菜单、权限、字典）
│   ├── theme/                    # 主题配置
│   ├── directives/               # v-hasPermi / v-hasRole
│   └── utils/                    # admin 工具函数
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## UI 还原工作流

对于 **type: frontend-ui** 的 Ticket，使用以下替代流程（不走 TDD）：

### Step 1: 读取原型
1. 打开对应的原型 HTML 文件（`osg-spec-docs/source/prototype/admin/*.html`）
2. 定位到目标页面 / 组件区域
3. 提取 HTML 结构、CSS 样式、交互行为

### Step 2: 映射组件
将原型中的 HTML 元素映射为 Ant Design Vue 组件：

| 原型元素 | Ant Design Vue |
|----------|----------------|
| `.table` | `<a-table>` |
| `.btn-primary` | `<a-button type="primary">` |
| `.badge-success` | `<a-tag color="success">` |
| `.input` / `.select` | `<a-input>` / `<a-select>` |
| `.modal` | `<a-modal>` |
| `.card` | `<a-card>` |
| `.pagination` | `<a-pagination>` |
| `.tab` | `<a-tabs>` |
| `.stat-card` | `<a-card>` + `<a-statistic>` |
| `.progress-bar` | `<a-progress>` |
| `.filter-bar` | `<a-space>` + `<a-form>` |
| `.search-box` | `<a-input-search>` |
| `.sidebar .nav-item` | `<a-menu>` + `<a-menu-item>` |
| `.avatar` | `<a-avatar>` |

### Step 3: 实现 + 样式微调
1. 使用 `<style scoped lang="scss">` 补充 Ant Design Vue 未覆盖的样式
2. 对照原型的颜色、间距、圆角、阴影做像素级微调

### Step 4: 验收标准
UI 类 Ticket 的验收标准：
- **测试通过**: `pnpm --dir osg-frontend/packages/admin test` 无失败
- **构建通过**: `pnpm --dir osg-frontend/packages/admin build` 成功
- **视觉比对**: 页面整体布局、颜色、间距与原型 HTML 一致（允许 Ant Design Vue 默认交互差异）

## 命令

- 安装: `cd osg-frontend && pnpm install`
- 开发: `pnpm --dir osg-frontend/packages/admin dev`
- 构建: `pnpm --dir osg-frontend/packages/admin build`
- 测试: `pnpm --dir osg-frontend/packages/admin test`
- Lint: `cd osg-frontend && pnpm lint`（根级 eslint）

## 代码规范

引用: `.claude/project/rules/vue.md`

额外规范：
- 所有颜色必须引用主题 Token 或全局 SCSS 变量，**禁止硬编码颜色值**
- 侧边栏组件单独封装，支持动态菜单渲染
- 权限指令从 `shared` 导入，保持与其他端一致
- API 调用统一使用 `shared/src/api/` 或 `shared/src/utils/request.ts`
- 可复用组件放 `shared/src/components/`，admin 专用组件放 `admin/src/components/`

## 项目特定约束

1. **禁止修改** `ruoyi-ui/` 目录下的任何文件
2. **禁止引入** Element UI 或 Element Plus 依赖
3. **必须复用** `shared` 包中已有的 API、类型、工具函数
4. 新增的 admin 包必须正确注册到 `pnpm-workspace.yaml`
5. 路由配置需支持后端动态菜单（预留 `addRoute` 接口）
