# Dynamic Permission Requirement Design

Date: 2026-04-03  
Status: Approved  
Owner: dynamic-permission  
Scope: 将 `dynamic-permission` 从现有 PRD/SRS 草案升级为可进入 RPIV 的独立 requirement，并以菜单管理为第一条业务主线。  
Non-goal: 不在本期处理前台端权限，不在本期纳入数据权限，不在本期继续复用旧 `permission` 归档资产。

---

## 1. 背景

当前仓库里已经有：

- `osg-spec-docs/docs/01-product/prd/dynamic-permission/OVERVIEW.md`
- `osg-spec-docs/docs/01-product/prd/dynamic-permission/MENU_MANAGEMENT.md`
- `osg-spec-docs/docs/01-product/prd/dynamic-permission/ROLE_ENHANCEMENT.md`
- `osg-spec-docs/docs/02-requirements/srs/dynamic-permission.md`
- `osg-spec-docs/docs/02-requirements/srs/dynamic-permission-DECISIONS.md`

但还缺少真正能进 RPIV 的 source-stage 完整资产：

- `MATRIX.md`
- `UI-VISUAL-CONTRACT.yaml`
- `DELIVERY-CONTRACT.yaml`
- workflow 注册与 Story/Ticket 资产

结论：`dynamic-permission` 目前是“有方向，但还不是可执行 requirement”。

---

## 2. 目标

把 `dynamic-permission` 收成独立 requirement，并明确第一阶段只做 Admin 动态权限主链的第一站：

1. `sys_menu` 成为 Admin 菜单与按钮权限的唯一运行时真源。
2. 前端登录后通过 `/getRouters` 动态获取菜单树。
3. 菜单管理页成为第一条可交付业务线。
4. 角色管理从静态权限块过渡到菜单树授权。
5. 按钮级权限控制通过 `v-hasPermi + @PreAuthorize` 闭环。

---

## 3. 推荐路径

### 方案 A：直接复用现有 SRS 草案进入 workflow

优点：

- 速度最快

问题：

- 会在 brainstorm/final-gate 前置门禁上直接失败
- 缺少 `MATRIX/UI-VISUAL/DELIVERY` 三件套
- 不能稳定派生 Story/Ticket

### 方案 B：先补 source-stage，再切 workflow

优点：

- 与 `admin-dict` 一样，能形成完整独立 requirement
- 后续 Story/Ticket 派生稳定
- 不和旧 `permission` 真相混线

问题：

- 需要先做一轮 docs 真相补齐

### 方案 C：挂回旧 `permission` 归档主线

优点：

- 表面上能复用历史页面和测试资产

问题：

- 旧真相是静态权限模块，不是动态菜单树
- 容易把未来态和历史资产绑死

**推荐：方案 B。**

---

## 4. requirement 结构

`dynamic-permission` 应独立落位为：

- `osg-spec-docs/docs/01-product/prd/dynamic-permission/OVERVIEW.md`
- `osg-spec-docs/docs/01-product/prd/dynamic-permission/MATRIX.md`
- `osg-spec-docs/docs/01-product/prd/dynamic-permission/UI-VISUAL-CONTRACT.yaml`
- `osg-spec-docs/docs/01-product/prd/dynamic-permission/DELIVERY-CONTRACT.yaml`
- `osg-spec-docs/docs/02-requirements/srs/dynamic-permission.md`
- `osg-spec-docs/docs/02-requirements/srs/dynamic-permission-DECISIONS.md`

旧 `permission` 只保留历史说明，不再承接动态权限未来态。

---

## 5. 第一阶段边界

第一阶段只做 Admin 端动态权限主链的第一站：

### 5.1 必做

- 菜单管理页
- `sys_menu` 菜单/按钮真源
- `/getRouters`
- 前端动态路由渲染
- 角色管理菜单树授权

### 5.2 后做

- `v-hasPermi` 全量接入现有按钮
- 全量旧页面菜单 seed 清洗
- 权限变更后的缓存刷新策略细化

### 5.3 不做

- 数据权限
- 学生/导师/班主任/助教端权限体系
- 多租户/多组织权限

---

## 6. 第一条业务主线

第一条 Story 应该是：

`菜单管理 / sys_menu / getRouters`

原因：

1. 菜单真源是动态权限的底座。
2. 角色授权树和按钮权限都依赖它。
3. 现有后端已经有 `SysMenuController` 和 `/getRouters`，改造成本最低、收益最高。

---

## 7. 运行时真源

动态权限运行时真源明确为：

- `sys_menu`
- `sys_role_menu`
- `/getRouters`
- `/system/menu/*`

前端静态 `MainLayout` 菜单分组只能作为过渡壳，不再作为未来真相。

---

## 8. 对现有代码的影响

### 8.1 后端

可优先复用：

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysMenuController.java`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysLoginController.java#getRouters`

### 8.2 前端

当前 Admin 仍然是静态路由 + 静态侧栏，需要未来改成：

- 登录后 `fetchInfo + getRouters`
- 动态侧栏生成
- 动态 route registration

---

## 9. 结论

下一步不直接写代码，而是先把 `dynamic-permission` 补成完整 source-stage requirement，然后切成当前 workflow requirement。

第一条业务主线固定为：

`菜单管理 -> sys_menu -> getRouters -> 角色授权树`
