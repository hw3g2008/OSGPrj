# Dynamic Permission Onboarding Design

Date: 2026-04-03  
Status: Approved  
Owner: dynamic-permission  
Scope: 让 `dynamic-permission` 在当前“HTML 原型是唯一真源”的框架下，能够合法进入 RPIV 主链。  
Non-goal: 本文不直接实现动态权限功能代码，不在本文放宽全局 truth-source 约束。

---

## 1. 问题定义

当前仓库里，`dynamic-permission` 已经有：

- PRD 草案
- SRS 草案
- DECISIONS

但它缺少最关键的一层：

- **对应的 HTML 原型真源**

而当前项目机器真相明确要求：

- `prd_process.truth_source.type = html_prototype`
- `single_source_of_truth = true`
- `forbid_source_absent_derivation = true`

这意味着：

1. 不能把一个“HTML 中不存在的未来页”直接补成完整 requirement
2. 不能直接绕过 prototype derivation / truth sync 系列门禁
3. 不能简单把 markdown PRD 当作唯一真源塞进 RPIV

所以，`dynamic-permission` 的真实 blocker 不是“文档不够多”，而是**缺少可被框架承认的 source-stage 真源入口**。

---

## 2. 方案比较

### 方案 A：直接拿现有 markdown PRD/SRS 强行入链

优点：

- 看起来最快

问题：

- 会直接撞上 `forbid_source_absent_derivation`
- 后续 `MATRIX / UI-VISUAL / DELIVERY` 都没有稳定真源
- 最终只是把一条新需求继续挂成“例外”

### 方案 B：先补最小 HTML 原型，再走标准 brainstorm

优点：

- 完全符合现有 framework 规则
- 后续 Story/Ticket 生成稳定
- `MENU_MANAGEMENT / ROLE_ENHANCEMENT / getRouters` 都能有真实 source anchor

问题：

- 需要先做一轮 prototype truth 补齐

### 方案 C：修改 framework，让部分 requirement 允许 docs-only truth

优点：

- 以后新需求入链更自由

问题：

- 会直接改全局 truth-source 规则
- 风险高，且会引入新的双真源治理问题

**推荐：方案 B。**

---

## 3. 推荐落法

### 3.1 先补最小原型真源

在 `admin.html` 内补一组最小但完整的动态权限原型实体，至少覆盖：

1. `菜单管理` 页面
2. `角色管理增强` 中的菜单树授权弹层
3. 动态侧边栏/权限树的关键 UI 锚点

这里不要求原型做得很大，但必须满足：

- 有页面实体
- 有关键弹层实体
- 有可解析的 page/surface id

### 3.2 再补 source-stage 三件套

在 prototype 存在后，补齐：

- `MATRIX.md`
- `UI-VISUAL-CONTRACT.yaml`
- `DELIVERY-CONTRACT.yaml`

这样 `dynamic-permission` 才能通过：

- `prototype_derivation_consistency_guard`
- `delivery_contract_guard`
- `requirements_coverage_guard`

### 3.3 然后切入 workflow

顺序应为：

1. `/brainstorm dynamic-permission`
2. `/split story`
3. `/split ticket`
4. `/next`

---

## 4. 第一条业务边界

第一条 Story 仍然建议是：

`菜单管理 / sys_menu / getRouters`

原因：

1. 菜单真源是动态权限的底座
2. 角色管理增强和按钮权限都依赖它
3. 现有后端已经有：
   - `SysMenuController`
   - `SysLoginController#getRouters`

所以第一条业务线的增量最清晰。

---

## 5. 为什么现在不直接切 requirement

因为在没有原型真源的情况下直接切：

- `STATE` 可以改
- 但 `brainstorm` 进不了真正可闭环状态

这会让 requirement 看起来进入了 workflow，但实际仍然卡在 source-stage 不合法。

所以更稳的是：

1. 先补 prototype
2. 再切 requirement

---

## 6. 结论

`dynamic-permission` 的下一步不是直接写代码，也不是直接改 `STATE`。

**正确起点是：先补最小 HTML 原型真源。**

只有这样，后续 requirement 才能合法进入当前 skill-driven workflow。
