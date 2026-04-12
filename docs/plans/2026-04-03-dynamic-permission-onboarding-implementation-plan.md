# Dynamic Permission Onboarding Implementation Plan

Date: 2026-04-03  
Status: Draft  
Owner: dynamic-permission  
Design: `docs/plans/2026-04-03-dynamic-permission-onboarding-design.md`

---

## Goal

让 `dynamic-permission` 满足当前 framework 的 source-stage 准入条件，再切入 RPIV workflow。

---

## Execution Order

1. prototype truth
2. source-stage docs
3. requirement switch
4. brainstorm
5. story / ticket split

---

## Task 1: 补最小 HTML 原型真源

目标：

- 在 `admin.html` 中补 `菜单管理` 页面和关键授权弹层的真实 page/surface anchor

DoD：

- 原型里存在可解析的 `page` id
- 原型里存在至少一个菜单管理关键 modal id

---

## Task 2: 补 source-stage 三件套

Files:

- `osg-spec-docs/docs/01-product/prd/dynamic-permission/MATRIX.md`
- `osg-spec-docs/docs/01-product/prd/dynamic-permission/UI-VISUAL-CONTRACT.yaml`
- `osg-spec-docs/docs/01-product/prd/dynamic-permission/DELIVERY-CONTRACT.yaml`

DoD：

- `prototype_derivation_consistency_guard` PASS
- `delivery_contract_guard` PASS

---

## Task 3: 完成 requirement 切换

Files:

- `osg-spec-docs/tasks/STATE.yaml`
- `osg-spec-docs/tasks/workflow-events.jsonl`

DoD：

- `current_requirement=dynamic-permission`
- `current_requirement_path` 指向 `prd/dynamic-permission/`

---

## Task 4: 正式进入 brainstorm

执行：

- `/brainstorm dynamic-permission`

预期产物：

- source-stage 对齐后的 SRS
- `dynamic-permission-DECISIONS.md`
- workflow 进入 `brainstorm_done` 或 `brainstorm_pending_confirm`

---

## Task 5: 第一条 Story

第一条 Story 固定做：

- 菜单管理页面
- `sys_menu`
- `/getRouters`
- 动态侧边栏基础链

不把按钮全量接入和数据权限混进第一条 Story。
