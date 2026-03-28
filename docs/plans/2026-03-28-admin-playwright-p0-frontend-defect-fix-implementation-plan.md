# Admin Playwright P0 前端缺陷修复实施计划

## 1. 目标

按 `docs/plans/2026-03-28-admin-playwright-p0-frontend-defect-fix-design.md` 执行 admin 端 P0 前端缺陷修复，确保：

- 只修真实前端 defect
- 不修改 `admin-test/` 真源文件
- `gap` 不混入当前实施批次
- 每个修复点都有测试兜底
- 每个批次都有定向回归
- 剩余非前端问题明确保留

## 2. 执行原则

1. 只在 `osg-frontend/packages/admin/src` 范围内修改代码与测试。
2. 当前页面里已经暴露的可见入口，只要交互坏掉，就按真实前端 defect 处理。
3. `gap` 交由其他 agent 处理，不在当前实施范围内。
4. 共享组件只有在确认是根因时才改。
5. 不通过前端假提示掩盖账号、夹具、环境问题。
6. 每个任务完成前必须有对应 `vitest` 证明。
7. 不新增长期双命名兼容层。

## 3. 当前状态

当前工作已经存在一批前端改动与测试补强，主要覆盖：

- 个人设置
- 基础数据管理
- 课程记录页假动作
- 学员管理
- 导师管理
- 合同管理

这些改动仍属于当前工作树的一部分，但本实施计划的“下一执行入口”聚焦于剩余真实 defect，而不是重复规划已经进入验证阶段的内容。

## 4. 任务分批

### Task 1：权限管理与后台用户剩余真实 defect

#### 目标

解决角色管理、后台用户管理以及权限相关页面里仍未闭环的真实前端 defect。

#### 优先 defect

- `ADM-PW-ROLE-007`
- `ADM-PW-ADMINUSER-034`
- 以及同页中页面已暴露入口、但交互仍存在坏态的真实 defect

#### 重点文件

- `osg-frontend/packages/admin/src/views/permission/roles/index.vue`
- `osg-frontend/packages/admin/src/views/permission/roles/components/RoleModal.vue`
- `osg-frontend/packages/admin/src/views/permission/users/index.vue`
- `osg-frontend/packages/admin/src/views/permission/users/components/ResetPwdModal.vue`
- `osg-frontend/packages/admin/src/views/permission/users/components/UserModal.vue`
- 如确认共享根因，再补：
  - `osg-frontend/packages/admin/src/components/OverlaySurfaceModal.vue`
  - `osg-frontend/packages/admin/src/layouts/MainLayout.vue`

#### 测试任务

- 更新 `osg-frontend/packages/admin/src/__tests__/roles.spec.ts`
- 更新 `osg-frontend/packages/admin/src/__tests__/users.spec.ts`
- 如动到共享 surface，再跑或更新 `osg-frontend/packages/admin/src/__tests__/overlay-surface.spec.ts`
- 如动到菜单入口，再跑或更新 `osg-frontend/packages/admin/src/__tests__/layout.spec.ts`

#### 通过条件

- 可见入口都能被正确触发
- modal 关闭 / 取消链路稳定
- surface 契约与页面行为一致
- 不为了配合验收做无意义兼容改动

### Task 2：career 范围内的剩余真实 defect

#### 目标

清理 `career` 相关页面中，页面已暴露入口但交互行为存在真实坏态的问题。

#### 目标范围

- `osg-frontend/packages/admin/src/views/career/positions/**`
- `osg-frontend/packages/admin/src/views/career/student-positions/**`
- `osg-frontend/packages/admin/src/views/career/job-overview/**`
- `osg-frontend/packages/admin/src/views/career/mock-practice/**`

#### 优先处理

- 可见未绑定
- 错绑
- 假动作
- 空动作
- 假成功提示
- modal / drawer / dropdown 等入口链路残缺

#### 测试任务

- 对实际 touched 页面补对应 spec
- 如改动 surface 契约，再补 `overlay-surface.spec.ts`

#### 通过条件

- 页面已有可见入口的动作，要么真实可用，要么明确禁用
- 不再保留“后续版本接入”“开发中”作为动作结果

### Task 3：teaching 范围内的剩余真实 defect

#### 目标

继续清理 teaching 侧页面中页面已有入口但行为坏掉的问题。

#### 目标范围

- `osg-frontend/packages/admin/src/views/teaching/**`
- 重点排查除 `class-records` 已处理范围之外的残余坏态

#### 测试任务

- 更新 `osg-frontend/packages/admin/src/__tests__/class-records.spec.ts`
- 对实际 touched 页面补对应 spec

#### 通过条件

- 可见按钮必须有真实行为或明确禁用态
- 不保留假动作或假成功

## 5. 每批执行步骤

### Step 1：分诊确认

基于设计文档确认当前批次问题是否属于：

- 真实前端 defect
- 非前端问题
- `gap`

只有真实前端 defect 才进入修改。

### Step 2：测试先行

先更新或新增对应 `vitest`，固化缺陷契约。

### Step 3：最小代码修复

只改当前批次涉及文件，不顺手做无关重构。

### Step 4：定向回归

按当前批次运行对应 spec，并在需要时补共享 spec。

### Step 5：完成验证

确认：

- 缺陷与代码映射清晰
- 测试通过
- 构建通过
- 无新增假动作
- 剩余问题已正确分类

## 6. 回归命令

以下命令在 `osg-frontend/packages/admin` 下执行。

### Task 1

```bash
npx vitest run src/__tests__/roles.spec.ts src/__tests__/users.spec.ts
```

如触及共享 surface，再补：

```bash
npx vitest run src/__tests__/roles.spec.ts src/__tests__/users.spec.ts src/__tests__/overlay-surface.spec.ts
```

如触及菜单入口，再补：

```bash
npx vitest run src/__tests__/roles.spec.ts src/__tests__/users.spec.ts src/__tests__/overlay-surface.spec.ts src/__tests__/layout.spec.ts
```

### Task 2

```bash
npx vitest run <touched-specs>
```

如触及共享 surface，再补：

```bash
npx vitest run <touched-specs> src/__tests__/overlay-surface.spec.ts
```

### Task 3

```bash
npx vitest run src/__tests__/class-records.spec.ts <touched-specs>
```

### 每批构建验证

```bash
pnpm --filter @osg/admin build
```

## 7. 输出要求

每批结束后记录：

- 本批已修 ManifestItem / defect
- 本批改动文件
- 本批新增 / 更新测试
- 本批定向回归结果
- 本批剩余非前端问题与 `gap`

## 8. 非目标

以下问题不在本实施计划中通过前端代码解决：

- `gap`
- `admin_limited_without_permission` 账号缺失
- 可回滚夹具 / 稳定测试夹具缺失
- 共享环境不适合真实提交
- 页面根本没有该控件、仅验收资产定位不稳定的问题

## 9. 完成标准

整体完成前必须满足：

1. 所有已接收的真实前端 defect 都有代码修复与测试映射。
2. 各批次对应的定向回归通过。
3. 构建通过。
4. 剩余问题全部明确标注为非前端问题或 `gap`。
5. 最终汇报符合用户要求的四项输出格式。
