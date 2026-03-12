# 框架缺陷分析 — 从实际 Bug 反推框架改进

> 基于 2026-03-12 两次会话中修复的 9 个问题，分析根因并提出框架层面的改进方案。

## 一、问题汇总

### 本次会话修复的问题

| # | 问题 | 根因 | 修复方式 | 类别 |
|---|------|------|----------|------|
| 1 | 权限配置页 — 权限模块列为空 | `loadRoleList` 没有为每个角色加载 menuNames | 前端逐个调 `getRoleMenuIds` 补充 | A |
| 2 | 权限颜色冲突 — 用户中心和资源中心同蓝色 | 6 种颜色分给 7 个模块组，颜色不够 | 新增 teal 色 | C |
| 3 | 用户管理 — 角色列为空 | 后端 `/system/user/list` 返回 `roles: []` | 前端逐个调 `getUserDetail` 补充 | A |
| 4 | 用户管理 — 状态显示英文 Active/Disabled | 前端硬编码英文 | 改为中文"启用"/"禁用" | C |
| 5 | 用户编辑保存失败 | `updateUser` 调用缺少 `userName` 字段 | API 函数 + 调用处各补一行 | B |
| 6 | Admin 邮箱丢失 | 数据库数据问题（email=''） | 直接 SQL 更新 | E |

### 上次会话修复的问题（Checkpoint 回顾）

| # | 问题 | 根因 | 修复方式 | 类别 |
|---|------|------|----------|------|
| 7 | 双重错误提示 | 拦截器 + 组件各弹一次 message.error | 引入 `customErrorMessage` 机制 | D |
| 8 | 角色编辑保存失败 | 前端未传 `roleSort` 字段 | formState 补充 roleSort | B |
| 9 | 角色编辑时不显示已有权限 | 编辑弹窗没加载 checkedKeys | 打开弹窗时调 API 加载 | A |

## 二、问题分类

### A 类：API 数据完整性（#1, #3, #9）

**现象**：后端 list 接口返回的数据不完整（不含关联数据），前端展示时出现空白。

**根因**：若依框架 list 接口倾向于精简查询（不做 JOIN），但前端需要完整数据。每个页面独立处理数据补充，没有统一模式。

**影响频率**：高。每新增一个列表页面都可能遇到。

### B 类：前后端字段不同步（#5, #8）

**现象**：前端 API 调用缺少后端必填字段，保存时后端报错但错误信息不够明确。

**根因**：前端 TypeScript 类型定义和后端 Controller 的 `@NotBlank` 约束没有自动同步机制。纯靠人工维护，容易遗漏。

**影响频率**：中。每次新增/修改 API 参数时可能遇到。

### C 类：UI 一致性（#2, #4）

**现象**：不同页面对同一概念（状态、颜色）使用不同的表达方式。

**根因**：没有全局的 UI 常量定义。状态文字、颜色分配各页面独立实现。

**影响频率**：中。每新增页面都可能引入不一致。

### D 类：错误处理策略（#7）

**现象**：拦截器和组件层各自弹一次错误提示，用户看到两个重复的错误框。

**根因**：错误提示职责不清——拦截器做了全局提示，组件又做了局部提示。

**影响频率**：已通过 `customErrorMessage` 机制解决。但新组件如果不遵循该模式，问题会复发。

### E 类：数据安全（#6）

**现象**：admin 用户邮箱不知何时被清空。

**根因**：超级管理员数据缺乏保护机制（后端禁止 API 修改，但某些操作可能间接清空）。

**影响频率**：低。偶发。

## 三、最关键的遗漏：测试环节

### 核心问题

这 9 个 bug 能被用户在浏览器里发现，说明**测试环节完全没有拦截**。框架中定义了完整的测试体系（test-design → test-execution → 覆盖率门控），但这些 bug 全部漏过了。

### 每个 bug 对应的测试缺失

| # | Bug | 应有的测试 | 测试类型 | 为什么漏了 |
|---|-----|-----------|----------|-----------|
| 1 | 权限列为空 | 角色列表页：验证"权限模块"列非空 | E2E / 组件测试 | 无此测试用例 |
| 2 | 颜色冲突 | 颜色配置：验证每个模块组颜色唯一 | 单元测试 | 无此测试用例 |
| 3 | 角色列为空 | 用户列表页：验证"角色"列非空 | E2E / 组件测试 | 无此测试用例 |
| 4 | 状态英文 | 用户列表页：验证状态列显示中文 | E2E / 快照测试 | 无此测试用例 |
| 5 | 保存缺字段 | 用户编辑保存：验证 API 调用包含所有必填字段 | 集成测试 | 无此测试用例 |
| 6 | 邮箱丢失 | 数据完整性：验证关键用户字段非空 | 数据库校验 | 无此测试用例 |
| 7 | 双重提示 | 错误场景：验证只弹一次错误消息 | E2E 测试 | 无此测试用例 |
| 8 | 缺 roleSort | 角色编辑保存：验证 API 调用包含所有必填字段 | 集成测试 | 无此测试用例 |
| 9 | 编辑不显示已有权限 | 角色编辑弹窗：验证已有权限被选中 | E2E / 组件测试 | 无此测试用例 |

### 结论：**9/9 个 bug 都没有对应的测试用例**

这不是个别遗漏，是系统性缺失。原因分析：

1. **test-design Skill 未覆盖前端展示层**：当前的测试设计主要关注后端逻辑和 API 接口，对"前端列表页是否正确展示数据"几乎没有用例
2. **E2E 测试覆盖不足**：`osg-frontend/tests/e2e/` 目录下的测试没有覆盖权限管理和用户管理模块的关键交互
3. **deliver-ticket 交付校验跳过了 UI 验证**：Ticket 完成后的校验只检查功能逻辑，没有打开页面验证视觉展示
4. **缺少"展示前置"的概念**：开发完成后没有在浏览器里走一遍用户操作路径

### F 类缺陷：测试覆盖缺失（新增）

**严重度**：🔴 最高 — 这是其他所有类别 bug 能逃逸到用户面前的根本原因

**框架中应有但缺失的测试**：

#### F1. 列表页展示测试（解决 A 类 + C 类）
```
场景：打开角色列表页
断言：每行的"权限模块"列不为空
断言：每行的颜色 pill 样式类与权限模块对应

场景：打开用户列表页
断言：每行的"角色"列不为空
断言：状态列显示中文"启用"或"禁用"
```

#### F2. 表单保存测试（解决 B 类）
```
场景：编辑用户 → 修改姓名 → 保存
断言：保存成功，无错误提示
断言：列表刷新后姓名已更新

场景：编辑角色 → 修改权限 → 保存
断言：保存成功
断言：列表刷新后权限已更新
```

#### F3. 错误提示测试（解决 D 类）
```
场景：触发一个业务错误
断言：只弹出一个错误提示框（不是两个）
```

#### F4. 编辑弹窗数据加载测试（解决 A 类 #9）
```
场景：点击编辑角色
断言：权限树中已有权限被选中

场景：点击编辑用户
断言：邮箱字段显示已有值
```

## 四、框架改进方案（含测试）

### 改进 1：列表数据补充标准化（解决 A 类）

**问题**：每个列表页面都自己写 `Promise.all + 逐个查详情` 的补充逻辑，代码重复且容易遗漏。

**方案**：在 `@osg/shared/utils` 中创建通用的数据补充工具。

```typescript
// shared/src/utils/dataEnrich.ts
export async function enrichListData<T>(
  list: T[],
  idField: keyof T,
  detailFetcher: (id: any) => Promise<any>,
  mergeFields: string[]
): Promise<T[]> {
  return Promise.all(
    list.map(async (item) => {
      try {
        const detail = await detailFetcher((item as any)[idField])
        const enriched: any = { ...item }
        for (const field of mergeFields) {
          enriched[field] = detail[field] ?? detail.data?.[field] ?? enriched[field]
        }
        return enriched as T
      } catch {
        return item
      }
    })
  )
}
```

**使用示例**：
```typescript
// 角色列表补充权限信息
const roles = await enrichListData(res.rows, 'roleId', getRoleMenuIds, ['menus', 'checkedKeys'])

// 用户列表补充角色信息
const users = await enrichListData(res.rows, 'userId', getUserDetail, ['roles'])
```

**优先级**：🔴 高 — 直接减少重复代码，防止遗漏

### 改进 2：API 参数校验层（解决 B 类）

**问题**：前端 TypeScript 类型定义和后端必填字段不同步，运行时才发现缺字段。

**方案**：为关键 API 添加运行时参数校验。

```typescript
// shared/src/utils/apiValidator.ts
export function validateRequiredFields(data: Record<string, any>, requiredFields: string[], apiName: string) {
  const missing = requiredFields.filter(f => data[f] === undefined || data[f] === null || data[f] === '')
  if (missing.length > 0) {
    console.warn(`[API Warning] ${apiName} 缺少必填字段: ${missing.join(', ')}`)
  }
}
```

**或更轻量的方案**：在现有代码审查流程中增加一条规则：

> **CR-API-01**: 每个 PUT/POST API 函数的 TypeScript 参数类型必须与后端 Controller 的 `@NotBlank/@NotNull` 注解一一对应。新增/修改 API 时必须检查后端源码确认必填字段。

**优先级**：🟡 中 — 可通过代码审查规则先行覆盖

### 改进 3：全局 UI 常量（解决 C 类）

**问题**：状态文字、颜色配置分散在各组件中。

**方案**：已部分实现（`permissionColors.ts`），需要扩展为完整的 UI 常量体系。

```typescript
// shared/src/constants/ui.ts

// 通用状态文字
export const STATUS_TEXT = {
  '0': '启用',
  '1': '禁用',
} as const

// 通用状态样式
export const STATUS_STYLE = {
  '0': 'permission-pill--success',
  '1': 'permission-pill--danger',
} as const
```

**优先级**：🟡 中 — 已有部分实现，逐步补全

### 改进 4：customErrorMessage 使用规范化（巩固 D 类）

**问题**：新组件可能不使用 `customErrorMessage`，导致双重提示复发。

**方案**：在代码规范文档中明确规则：

> **CR-ERR-01**: 所有 API 调用（PUT/POST/DELETE）必须传入 `customErrorMessage` 参数。组件内禁止对 API 错误调用 `message.error()`，错误提示统一由响应拦截器处理。

同时在 `request.ts` 拦截器中添加开发环境警告：

```typescript
// 开发环境：如果 API 调用没有传 customErrorMessage，输出 console.warn
if (import.meta.env.DEV && !config.customErrorMessage) {
  console.warn(`[API Warning] ${config.url} 未设置 customErrorMessage`)
}
```

**优先级**：🟡 中 — 规范先行，工具辅助

### 改进 5：超级管理员前端保护（解决 E 类）

**问题**：前端允许编辑超级管理员，但后端拒绝保存。用户体验差。

**方案**：

```typescript
// 在 UserModal.vue watch 中
if (props.user?.admin) {
  // 超级管理员：禁用表单字段或显示提示
  isAdminUser.value = true
}
```

模板中：
```vue
<a-alert v-if="isAdminUser" type="warning" message="超级管理员信息受系统保护，部分字段不可修改" />
```

**优先级**：🟢 低 — 体验优化，非功能缺陷

## 五、实施优先级排序

| 优先级 | 改进项 | 解决的问题类别 | 预估工作量 |
|--------|--------|----------------|-----------|
| 🔴 **P0** | **改进 0：补充 E2E 测试用例（F1-F4）** | **F 类（9/9 个 bug 的根本拦截层）** | **4h** |
| 🔴 P0 | 改进 1：列表数据补充标准化 | A 类（3 个 bug） | 2h |
| 🟡 P1 | 改进 3：全局 UI 常量 | C 类（2 个 bug） | 1h |
| 🟡 P1 | 改进 4：customErrorMessage 规范 | D 类（1 个 bug） | 0.5h |
| 🟡 P2 | 改进 2：API 参数校验 | B 类（2 个 bug） | 1h |
| 🟢 P3 | 改进 5：超级管理员保护 | E 类（1 个 bug） | 0.5h |

> **关键洞察**：改进 1-5 是"减少 bug 产生"，改进 0 是"拦截已产生的 bug"。两者缺一不可，但**测试拦截是最后一道防线**，优先级最高。

## 六、RPIV 逐环节缺陷定位

### RPIV 流程概览

```
R(需求) → P(拆分) → I(实现) → V(验收)

R: /brainstorm → SRS 文档
P: /split story → Stories → /split ticket → Tickets
I: /next → deliver-ticket（test-design → 编码 → test-execution）
V: /verify → verify_story()
```

### 逐 Bug 定位：该在哪个环节被拦截？

| # | Bug | R 需求 | P 拆分 | I 实现 | V 验收 | 实际漏过原因 |
|---|-----|--------|--------|--------|--------|-------------|
| 1 | 权限列为空 | — | ⚠️ Story AC 应包含"列表页展示完整数据" | ⚠️ Ticket AC 应要求验证页面展示 | 🔴 全量 E2E 应检测到 | **P: AC 不够细；I: 无展示验证；V: 无 E2E** |
| 2 | 颜色冲突 | — | — | ⚠️ UI 还原应校验颜色唯一性 | 🔴 视觉回归测试应检测 | **I: 无颜色校验；V: 无视觉测试** |
| 3 | 用户角色列空 | — | ⚠️ 同 #1 | ⚠️ 同 #1 | 🔴 同 #1 | **同 #1** |
| 4 | 状态英文 | 🔴 SRS 应定义状态文字规范 | — | ⚠️ 代码规范应引用全局常量 | 🔴 E2E 应校验中文 | **R: 无 UI 文字规范；I: 无常量引用** |
| 5 | 保存缺字段 | — | — | 🔴 TDD 测试应覆盖保存场景 | 🔴 E2E 应测试编辑保存 | **I: 前端 Ticket 无强制测试；V: 无 E2E** |
| 6 | 邮箱丢失 | — | — | — | ⚠️ 数据完整性校验 | **偶发，难预防** |
| 7 | 双重提示 | — | — | 🔴 错误处理规范缺失 | 🔴 E2E 应测试错误场景 | **I: 无错误处理规范；V: 无 E2E** |
| 8 | 缺 roleSort | — | — | 🔴 同 #5 | 🔴 同 #5 | **I: 前端无必填字段校验；V: 无 E2E** |
| 9 | 编辑不显示已有权限 | — | ⚠️ AC 应包含"编辑加载已有数据" | 🔴 测试应覆盖编辑弹窗 | 🔴 E2E 应检测 | **P: AC 遗漏；I: 无测试；V: 无 E2E** |

### 各环节缺陷汇总

#### R（需求）环节 — 1 个缺陷

**R-GAP-01: SRS 缺少 UI 展示规范**

brainstorming Skill 生成的 SRS 文档关注功能逻辑，但没有定义：
- 状态文字统一用中文还是英文
- 列表页必须展示哪些字段
- 颜色/样式的全局约束

**影响的 bug**：#4（状态英文）

**修复建议**：在 brainstorming/SKILL.md 的输出模板中增加一节"§ UI 展示规范"，至少包含：
- 状态文字定义表（如 status=0 → "启用"）
- 列表页必显字段清单
- 颜色/图标约束引用

#### P（拆分）环节 — 3 个缺陷

**P-GAP-01: Story AC 缺少展示完整性验收**

当前 Story AC 写法偏功能逻辑（"用户可以编辑角色"），缺少展示层验收：
- "角色列表页的权限模块列显示所有已分配权限"
- "编辑弹窗加载后，已有数据预填充完整"

**影响的 bug**：#1, #3, #9

**P-GAP-02: Ticket AC 缺少"打开页面验证"步骤**

当前 Ticket AC 写法：`"updateRole API 调用成功"` → 只验证 API，不验证页面展示。

应改为：`"编辑保存后，列表页刷新且修改已生效"`

**影响的 bug**：#1, #3, #5, #8, #9

**P-GAP-03: 无"展示前置"的概念**

Ticket 拆分时没有要求包含"在浏览器中验证展示效果"的步骤。

**修复建议**：
- story-splitter/SKILL.md 的 AC 校验增加：`每个 Story 的 AC 必须包含至少 1 条展示类验收（如"页面显示 XX"）`
- ticket-splitter/SKILL.md 的 AC 校验增加：`type=frontend/frontend-ui 的 Ticket 必须有"打开页面验证展示"的 AC`

#### I（实现）环节 — 5 个缺陷（最多）

**I-GAP-01: 前端 Ticket 缺少强制测试**

deliver-ticket 的铁律中：
- TDD（backend/database/test）：**强制测试，100% 分支覆盖**
- 前端（frontend/frontend-ui）：`"建议编写单元测试"` ← **只是建议，不是强制**

这意味着前端 Ticket 可以不写任何测试就声明完成。**这是 9 个 bug 全部逃逸的核心原因。**

**影响的 bug**：#1, #2, #3, #4, #5, #7, #8, #9（8/9）

**I-GAP-02: 无前后端字段同步检查**

deliver-ticket 的自我审查清单没有：`"PUT/POST API 的参数是否包含后端所有必填字段？"`

**影响的 bug**：#5, #8

**I-GAP-03: 无 UI 一致性检查**

deliver-ticket 的自我审查清单没有：`"状态文字是否引用全局常量？颜色是否使用标准配置？"`

**影响的 bug**：#2, #4

**I-GAP-04: 无错误处理规范**

deliver-ticket 没有要求：`"API 调用是否传入 customErrorMessage？组件内是否移除了 message.error？"`

**影响的 bug**：#7

**I-GAP-05: 无"打开页面看一眼"步骤**

deliver-ticket 的验证只检查 lint/build/test，**不要求在浏览器中实际操作页面**。

**影响的 bug**：全部 9 个

**修复建议**（~~已废弃，以第八节定稿版为准~~）：
1. ~~deliver-ticket 流程 B/C 增加强制 E2E 测试或至少强制浏览器验证步骤~~ → 定稿：强制 `bash bin/e2e-api-gate.sh {module} full`
2. ~~自我审查清单增加 3 项~~ → 定稿：新增前端功能审查节（#4）
3. ~~验证证据要求增加页面截图或 E2E 测试通过记录~~ → 定稿：evidence guard 追加 e2e 关键词（#9）

#### V（验收）环节 — 1 个缺陷

**V-GAP-01: verify_story() 不包含 E2E 测试**

当前 verify_story() 的 Phase 2 执行：
- `mvn test` — 后端单元测试
- `pnpm test` — 前端单元测试（如果有）
- AC 覆盖率检查

但**不包含 E2E 测试**（打开浏览器，走用户操作路径，验证页面展示）。

这意味着即使 I 阶段遗漏了测试，V 阶段也无法补救。

**影响的 bug**：全部 9 个

**修复建议**（~~已废弃，以第八节定稿版为准~~）：
- ~~verify_story() Phase 2 增加 `pnpm test:e2e --project admin`~~ → 定稿：`bash bin/e2e-api-gate.sh {module} full`（#8）
- E2E 测试用例应覆盖：列表展示完整性、编辑保存成功、错误提示单一性

### 缺陷分布热力图

```
           R(需求)   P(拆分)   I(实现)   V(验收)
Bug #1      —        ⚠️        ⚠️        🔴
Bug #2      —         —        ⚠️        🔴
Bug #3      —        ⚠️        ⚠️        🔴
Bug #4     🔴         —        ⚠️        🔴
Bug #5      —         —        🔴        🔴
Bug #6      —         —         —        ⚠️
Bug #7      —         —        🔴        🔴
Bug #8      —         —        🔴        🔴
Bug #9      —        ⚠️        🔴        🔴

缺陷数:     1         3         5         1(但是最后防线)
```

**结论**：
- **I 环节（实现）是最大的漏洞** — 前端 Ticket 无强制测试、无展示验证、无规范检查
- **V 环节（验收）是最后一道防线** — 但缺少 E2E 测试，无法补救 I 阶段的遗漏
- **P 环节（拆分）可以更早拦截** — 通过更细的 AC 定义

## 七、框架修改优先级（背景参考，非本次执行范围）

> ⚠️ **本节为初始优先级分析，仅作背景参考。实际执行清单见第八节。**
> 本节中"创建全局 UI 常量 + enrichListData 工具"属于代码层改进（第四节改进 1/3），不在本次框架层修改范围内。

| 优先级 | 环节 | 修改项 | 文件 | 预估 | 是否纳入第八节 |
|--------|------|--------|------|------|---------------|
| 🔴 P0 | **I** | **前端 Ticket 增加强制浏览器验证步骤** | deliver-ticket/SKILL.md | 1h | ✅ #1-7 |
| 🔴 P0 | **I** | **自我审查清单增加 3 项检查** | deliver-ticket/SKILL.md | 0.5h | ✅ #4 |
| 🔴 P0 | **V** | **verify_story() 增加 E2E 测试步骤** | verification/SKILL.md | 1h | ✅ #8a/8b |
| 🟡 P1 | **P** | Story AC 强制包含展示类验收 | story-splitter/SKILL.md | 0.5h | ✅ #11 |
| 🟡 P1 | **P** | Ticket AC 强制包含"页面验证"步骤 | ticket-splitter/SKILL.md | 0.5h | ✅ #12 |
| 🟡 P1 | **I** | 补充 vue.md 代码规范 | .claude/project/rules/vue.md | 1h | ✅ #14 |
| 🟡 P2 | **R** | SRS 输出模板增加 UI 展示规范节 | brainstorming/SKILL.md | 0.5h | ✅ #13 |
| 🟡 P2 | **I** | 创建全局 UI 常量 + enrichListData 工具 | shared/src/ | 2h | ❌ 代码层改进，不在本次范围 |

## 八、完整执行清单（含缺口补全，定稿版）

> 本节为最终执行清单（SSOT），第七节仅为背景参考。表中"修改前值"列记录修改前的仓库状态，"目标值"列记录修改后的仓库状态。

### 设计决策修正

| # | 决策点 | 初版 | 修正后 | 理由 |
|---|--------|------|--------|------|
| 1 | 前端浏览器验证方式 | E2E 或手动截图二选一 | **强制 E2E 测试命令**，截图仅为补充证据 | 证据守卫只认可执行命令（done_ticket_evidence_guard.py 第 35 行） |
| 3 | E2E 入口命令 | `pnpm test:e2e --project admin` | **`bash bin/e2e-api-gate.sh {module} full`** | 统一 gate 保留日志产物、串行策略、proxy 探测（config.yaml 第 424 行） |

### ✅ 批次 1：I 环节 deliver-ticket（7 项）— 已完成

| # | 文件 | 行号 | 修改前值 | 目标值（已生效） |
|---|------|------|--------|--------|
| 1 | `deliver-ticket/SKILL.md` | 第 43-44 行 | `前端功能类建议编写单元测试（分支覆盖率 ≥ 90%）` | `frontend-ui / frontend 必须通过 E2E 测试（bash bin/e2e-api-gate.sh {module} full）` |
| 2 | `deliver-ticket/SKILL.md` | 第 162-210 行（流程 B） | 流程 B：`[Lint]→[Build]→[审查]→[更新状态]` | 流程 B：`[Lint]→[Build]→[🆕 E2E 验证]→[审查]→[更新状态]` |
| 3 | `deliver-ticket/SKILL.md` | 第 213-257 行（流程 C） | 流程 C：一句话"无强制单元测试要求" | 流程 C：补充完整流程图，含 `[🆕 E2E 验证]` 步骤 |
| 4 | `deliver-ticket/SKILL.md` | 第 296-358 行（自我审查清单，新增节在 337-358） | 自我审查清单无前端功能审查节 | 新增"前端功能审查"节（API 字段完整性 / UI 一致性 / 错误处理） |
| 5 | `deliver-ticket/SKILL.md` | 第 615-632 行 | `run_verification`: frontend→`pnpm test && build` | 追加 E2E：`&& bash bin/e2e-api-gate.sh {module} full` |
| 6 | `deliver-ticket/SKILL.md` | 第 845-852 行 | 验证命令速查表：frontend→`test && build`，frontend-ui→`build` | frontend→`test && build && bash bin/e2e-api-gate.sh {module} full`，frontend-ui→`build && bash bin/e2e-api-gate.sh {module} full` |
| 7 | `deliver-ticket/SKILL.md` | 第 885-892 行 | 强制验证步骤表：同上 | 同 #6 |

### ✅ 批次 2：V 环节 verification + 下游守卫（5 项）— 已完成

| # | 文件 | 行号 | 修改前值 | 目标值（已生效） |
|---|------|------|--------|--------|
| 8a | `.claude/skills/verification/SKILL.md` | 第 90 行（Phase 2 表格） | `全量测试: mvn test / pnpm test` | 条件追加：含 frontend Ticket 时执行 `bash bin/e2e-api-gate.sh {module} full` |
| 8b | `.claude/skills/verification/SKILL.md` | 第 295-301 行（Phase 2 伪代码 `has_frontend_tickets` 分支内新增 E2E 块） | 只执行 `pnpm test --coverage` | 在前端测试通过后追加 `bash bin/e2e-api-gate.sh {module} full` |
| 9 | `.claude/skills/workflow-engine/tests/done_ticket_evidence_guard.py` | 第 39-40 行 | `"frontend-ui": (["build"], ...)`, `"frontend": (["test", "build"], ...)` | `"frontend-ui": (["build", "e2e"], ...)`, `"frontend": (["test", "build", "e2e"], ...)` |
| 10a | `.windsurf/workflows/verify.md` | 第 34 行 | Phase 2：`全量测试 + behavior contract + AC 覆盖率` | 新增：`+ E2E 测试（含 frontend Ticket 时）` |
| 10b | `.claude/commands/verify.md` | 第 21 行 | `5. 运行测试` | 改为：`5. 运行测试（含 frontend Ticket 时追加 E2E: bash bin/e2e-api-gate.sh {module} full）` |

### ✅ 批次 3：P 环节 splitter（2 项）— 已完成

| # | 文件 | 位置 | 修改前值 | 目标值 |
|---|------|------|--------|--------|
| 11 | `.claude/skills/story-splitter/SKILL.md` | 第 165-203 行（Phase 2 INVEST + 覆盖率校验循环），在 `print("  覆盖率校验: ✅ 100%")` 之前插入 | 无展示类 AC 要求 | 新增校验：`每个 Story 的 AC 必须包含至少 1 条展示类验收（如"页面显示 XX"、"列表列非空"）` |
| 12 | `.claude/skills/ticket-splitter/SKILL.md` | 第 134-143 行（质量校验项表格），在"验收可测"行之后新增一行 | 无页面验证要求 | 新增校验行：`展示验证 / type=frontend/frontend-ui 的 Ticket AC 必须包含"页面展示验证"步骤 / 是 / 否 → 补充展示类 AC` |

### ✅ 批次 4：R 环节 + 代码规范（4 项）— 已完成

| # | 文件 | 位置 | 修改前值 | 目标值 |
|---|------|------|--------|--------|
| 13 | `.claude/skills/brainstorming/SKILL.md` | 第 589-637 行（输出格式 SRS 模板），在 `#### 6. 技术约束` 之后（第 625 行后）插入 | 无 UI 展示规范节 | 新增 `#### 7. UI 展示规范`（状态文字定义表、必显字段清单、颜色约束引用） |
| 14 | `.claude/project/rules/vue.md` | 第 185-191 行（禁止事项节之后）追加 | 无 API/错误处理规范 | 新增 `### 前端质量规范` 含 CR-API-01（必填字段同步）、CR-ERR-01（customErrorMessage）、CR-UI-01（全局常量引用） |
| 15a | `.windsurf/workflows/next.md` | 第 23-25 行 | `frontend -> 前端功能流程` | 追加：`（含 E2E 验证: bash bin/e2e-api-gate.sh {module} full）` |
| 15b | `.claude/commands/next.md` | 第 12 行 | `遵循 TDD 流程` | 改为：`根据 Ticket.type 选择流程（TDD/UI还原/前端功能含E2E/配置）` |

### 自校验（重做）

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G5 执行清单可操作 | ✅ | 18 项（#8/#10/#15 各拆为 a/b 子项）均有精确行号 + 修改前值/目标值 |
| G7 改动自洽 | ✅ | deliver-ticket 铁律(#1) ↔ 流程图(#2/#3) ↔ run_verification(#5) ↔ 速查表(#6) ↔ 强制步骤(#7) 五处同步 |
| G11 引用回读 | ✅ | 全部项行号均为修改后实际位置（#2→162, #3→213, #4→296/337, #5→615, #6→845, #7→885） |
| F1 文件同步 | ✅ | workflow + command 双套路径均已消歧：verify.md(#10a workflow + #10b command)、next.md(#15a workflow + #15b command) |
| F1b 路径消歧 | ✅ | 所有文件路径使用相对于仓库根的完整路径（如 `.claude/skills/verification/SKILL.md`），不再使用裸文件名 |
| C3 回归风险 | ✅ | 只新增 E2E 步骤和检查项，不删除已有验证逻辑，`e2e-api-gate.sh` 已存在且可用 |
| 旧方案冲突 | ✅ | 第六节修复建议（line 390-393, 410-411）已标记为废弃，以第八节定稿为准 |

---

> **状态**：全部完成。总计 18 项，18/18 已生效。✅ 批次 1（#1-7 deliver-ticket，7 项）+ ✅ 批次 2（#8a/8b/9/10a/10b verification + 守卫 + workflow/command，5 项）+ ✅ 批次 3（#11-12 splitter，2 项）+ ✅ 批次 4（#13/14/15a/15b brainstorming + vue.md + next.md，4 项）。
