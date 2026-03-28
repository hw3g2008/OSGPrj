# Admin Playwright P0 前端缺陷修复实施计划

## 1. 目标

按 `docs/plans/2026-03-28-admin-playwright-p0-frontend-defect-fix-design.md` 执行 admin 端 P0 前端缺陷修复，确保：

- 只修真实前端问题
- 不修改 `admin-test/` 真源文件
- 每个修复点都有测试兜底
- 每个批次都有定向回归
- 剩余非前端 Block 明确保留

## 2. 执行原则

1. 只在 `osg-frontend/packages/admin/src` 范围内修改代码与测试。
2. 共享组件只有在确认是根因时才改。
3. 公开 surface contract 统一以验收契约命名为准。
4. 不通过前端假提示掩盖环境、夹具、账号问题。
5. 每个任务完成前必须有对应 `vitest` 证明。

## 3. 任务分批

### Task 1：共享 surface contract 与权限管理 P0

#### 目标

解决共享 shell、权限管理、个人设置、基础数据中最明确的 P0 前端缺陷。

#### 目标缺陷

- `ADM-PW-ROLE-007`
- `ADM-PW-ADMINUSER-034`
- `ADM-PW-PROFILE-001`
- `ADM-PW-PROFILE-002`
- `ADM-PW-PROFILE-003`
- `ADM-PW-PROFILE-008`
- `ADM-PW-PROFILE-009`
- `ADM-PW-BASE-087`
- `ADM-PW-BASE-113`
- `ADM-PW-BASE-126`
- `ADM-PW-BASE-127`

#### 重点文件

- `osg-frontend/packages/admin/src/components/OverlaySurfaceModal.vue`
- `osg-frontend/packages/admin/src/layouts/MainLayout.vue`
- `osg-frontend/packages/admin/src/components/ProfileModal.vue`
- `osg-frontend/packages/admin/src/views/permission/roles/components/RoleModal.vue`
- `osg-frontend/packages/admin/src/views/permission/users/components/ResetPwdModal.vue`
- `osg-frontend/packages/admin/src/views/permission/base-data/index.vue`
- `osg-frontend/packages/admin/src/views/permission/base-data/components/BaseDataModal.vue`

#### 测试任务

- 更新 `osg-frontend/packages/admin/src/__tests__/overlay-surface.spec.ts`
- 更新 `osg-frontend/packages/admin/src/__tests__/layout.spec.ts`
- 更新 `osg-frontend/packages/admin/src/__tests__/roles.spec.ts`
- 更新 `osg-frontend/packages/admin/src/__tests__/users.spec.ts`
- 更新 `osg-frontend/packages/admin/src/__tests__/base-data.spec.ts`

#### 通过条件

- 上述缺陷的入口、关闭、取消、surface 标记、文案契约都有测试覆盖
- 不再保留 ant modal / overlay modal 的公开契约分裂

### Task 2：用户中心 surface contract 收口

#### 目标

解决学员、导师、合同页面的入口触发器缺失、错绑、孤儿 modal、错误命名契约问题。

#### 目标缺陷

- 学员：`ADM-PW-STUD-026/027/028/061/065/067/075/076/077`
- 导师：`ADM-PW-STAFF-010/019/020/021/043/050/051/052`
- 合同：`ADM-PW-CONT-008/013`

#### 重点文件

- `osg-frontend/packages/admin/src/views/users/students/index.vue`
- `osg-frontend/packages/admin/src/views/users/students/components/AddStudentModal.vue`
- `osg-frontend/packages/admin/src/views/users/students/components/StudentDetailModal.vue`
- `osg-frontend/packages/admin/src/views/users/students/components/EditStudentModal.vue`
- `osg-frontend/packages/admin/src/views/users/staff/index.vue`
- `osg-frontend/packages/admin/src/views/users/staff/components/StaffFormModal.vue`
- `osg-frontend/packages/admin/src/views/users/staff/components/StaffDetailModal.vue`
- `osg-frontend/packages/admin/src/views/users/contracts/index.vue`
- `osg-frontend/packages/admin/src/views/users/contracts/components/ContractDetailModal.vue`
- `osg-frontend/packages/admin/src/views/users/contracts/components/RenewContractModal.vue`

#### 测试任务

- 更新 `osg-frontend/packages/admin/src/__tests__/students.spec.ts`
- 更新 `osg-frontend/packages/admin/src/__tests__/staff.spec.ts`
- 更新 `osg-frontend/packages/admin/src/__tests__/contracts.spec.ts`
- 必要时同步更新 `osg-frontend/packages/admin/src/__tests__/overlay-surface.spec.ts`

#### 通过条件

- 新增、详情、编辑入口均暴露正确 `data-surface-trigger`
- 对应 modal 暴露唯一 `data-surface-id`
- 不再保留旧命名孤儿入口和重复 modal 契约

### Task 3：求职中心与课程记录假动作清理

#### 目标

解决可见按钮无真实行为、假成功提示、空动作等问题。

#### 目标范围

- `osg-frontend/packages/admin/src/views/career/positions/**`
- `osg-frontend/packages/admin/src/views/career/student-positions/**`
- `osg-frontend/packages/admin/src/views/career/job-overview/**`
- `osg-frontend/packages/admin/src/views/career/mock-practice/**`
- `osg-frontend/packages/admin/src/views/teaching/class-records/index.vue`

#### 优先处理

- 可见未绑定、错绑的按钮
- `message.info('后续版本接入')`
- 假成功、空动作

#### 测试任务

- 更新 `osg-frontend/packages/admin/src/__tests__/class-records.spec.ts`
- 视改动更新：
  - `osg-frontend/packages/admin/src/__tests__/positions.spec.ts`
  - `osg-frontend/packages/admin/src/__tests__/job-overview.spec.ts`
  - `osg-frontend/packages/admin/src/__tests__/mock-practice.spec.ts`

#### 通过条件

- 可见按钮必须有真实行为或明确禁用态
- 不再保留“后续版本接入”“开发中”作为动作结果

## 4. 每批执行步骤

### Step 1：分诊确认

基于设计文档确认当前批次缺陷是否属于：

- 真前端 bug
- 非前端 Block
- 真源缺口

只有真前端 bug 才进入修改。

### Step 2：测试先行

先更新或新增对应 `vitest`，固化缺陷契约。

### Step 3：最小代码修复

只改当前批次涉及文件，不顺手做无关重构。

### Step 4：定向回归

按当前批次运行对应 spec。

### Step 5：完成验证

确认：

- 缺陷与代码映射清晰
- 测试通过
- 无新增假动作
- 剩余问题已正确分类

## 5. 回归命令

以下命令在 `osg-frontend/packages/admin` 下执行。

### 批次 1

```bash
pnpm test src/__tests__/overlay-surface.spec.ts src/__tests__/layout.spec.ts src/__tests__/roles.spec.ts src/__tests__/users.spec.ts src/__tests__/base-data.spec.ts
```

如脚本不支持位置参数，则退回：

```bash
npx vitest run src/__tests__/overlay-surface.spec.ts src/__tests__/layout.spec.ts src/__tests__/roles.spec.ts src/__tests__/users.spec.ts src/__tests__/base-data.spec.ts
```

### 批次 2

```bash
npx vitest run src/__tests__/students.spec.ts src/__tests__/staff.spec.ts src/__tests__/contracts.spec.ts src/__tests__/overlay-surface.spec.ts
```

### 批次 3

```bash
npx vitest run src/__tests__/class-records.spec.ts src/__tests__/positions.spec.ts src/__tests__/job-overview.spec.ts src/__tests__/mock-practice.spec.ts
```

### 必要时浏览器抽查

仅在源码断言不足以证明真实交互时，使用浏览器能力抽查：

- 个人设置入口
- modal 右上关闭与取消按钮
- 禁用态 / 不可用态展示

## 6. 输出要求

每批结束后记录：

- 本批已修 ManifestItem / defect
- 本批改动文件
- 本批新增 / 更新测试
- 本批定向回归结果
- 本批剩余非前端 Block

## 7. 非目标

以下不在本实施计划中通过前端代码解决：

- `admin_limited_without_permission` 账号缺失
- 可回滚夹具缺失
- 共享环境不适合真实提交
- 仅由于真源定位不稳定导致的 case

## 8. 完成标准

整体完成前必须满足：

1. 所有已接收的真前端 P0 缺陷都有代码修复与测试映射。
2. 所有对应批次定向回归通过。
3. 剩余问题全部明确标注为非前端 Block 或真源缺口。
4. 最终汇报符合用户要求的四项输出格式。
