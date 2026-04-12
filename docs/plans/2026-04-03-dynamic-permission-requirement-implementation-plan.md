# Dynamic Permission Requirement Implementation Plan

Date: 2026-04-03  
Status: Draft  
Owner: dynamic-permission  
Design: `docs/plans/2026-04-03-dynamic-permission-requirement-design.md`

---

## Goal

把 `dynamic-permission` 补成完整独立 requirement，并准备进入 RPIV 主链。

---

## Execution Order

1. source-stage docs complete
2. workflow requirement registration
3. brainstorm outputs reconcile
4. split story
5. split ticket

---

## Task 1: 补齐 source-stage 资产

Files:

- Create: `osg-spec-docs/docs/01-product/prd/dynamic-permission/MATRIX.md`
- Create: `osg-spec-docs/docs/01-product/prd/dynamic-permission/UI-VISUAL-CONTRACT.yaml`
- Create: `osg-spec-docs/docs/01-product/prd/dynamic-permission/DELIVERY-CONTRACT.yaml`
- Modify: `osg-spec-docs/docs/02-requirements/srs/dynamic-permission.md`

DoD:

- `dynamic-permission` 通过 `srs_guard`
- `dynamic-permission` 通过 `prototype_derivation_consistency_guard`
- `dynamic-permission` 通过 `delivery_contract_guard`

---

## Task 2: 注册为当前 requirement

Files:

- Modify: `osg-spec-docs/tasks/STATE.yaml`
- Modify: `osg-spec-docs/tasks/workflow-events.jsonl`

DoD:

- `current_requirement=dynamic-permission`
- `current_requirement_path` 指向 `prd/dynamic-permission/`
- workflow 切到 brainstorm 起点

---

## Task 3: 菜单管理作为第一条 Story

建议第一条 Story 边界：

- Admin 菜单管理页面
- `sys_menu` 菜单树
- `/getRouters`
- 前端动态路由渲染基础链

不把按钮全量接入和数据权限混进第一条 Story。

---

## Task 4: RPIV 派生

执行：

- `/brainstorm dynamic-permission`
- `/split story`
- `/split ticket`

第一批 Story 推荐顺序：

1. 菜单管理 / `sys_menu`
2. `/getRouters` + 动态侧栏
3. 角色菜单树授权
4. 按钮级权限接入

---

## Risks

1. 现有 Admin 静态路由壳与动态路由真相存在冲突，需要过渡策略。
2. `sys_menu` 的初始化种子如果直接复用旧静态菜单，可能把历史脏页面 ID 一起带入。
3. `/getRouters` 已存在，但当前前端没有真正按它渲染菜单，需要谨慎切分实现阶段。

---

## Recommendation

先落 Task 1 和 Task 2，不直接写功能代码。  
只要 `dynamic-permission` requirement 补完整、成功切入 workflow，下一步就可以规范地 `/brainstorm -> split story -> split ticket`。
