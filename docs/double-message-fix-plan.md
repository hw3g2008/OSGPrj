# 双重提示问题修复方案

## 问题描述
在权限配置等页面，保存失败或成功时会出现两个重复的提示消息。

## 根本原因
1. **HTTP 拦截器自动提示**：`packages/shared/src/utils/request.ts` 第52-54行会自动显示错误消息
2. **组件内手动提示**：各个组件在 catch 块中又显示了一次错误消息

## 影响范围
- 权限配置：角色新增/编辑失败时双重错误提示
- 用户管理：用户新增/编辑失败时双重错误提示  
- 密码重置：失败时双重错误提示
- 用户状态切换：失败时双重错误提示

## 修复方案

### 方案A：统一使用组件内提示（推荐）
在所有需要自定义错误提示的API调用中，使用 `skipErrorMessage: true` 选项：

```typescript
// 修改前
await updateRole(payload as any)

// 修改后  
await updateRole(payload as any, { skipErrorMessage: true })
```

### 方案B：统一使用拦截器提示
删除所有组件内的错误提示，只保留拦截器的自动提示。

## 具体修改文件

### 1. RoleModal.vue
- `updateRole` 和 `addRole` 调用添加 `skipErrorMessage: true`

### 2. UserModal.vue  
- `updateUser` 和 `addUser` 调用添加 `skipErrorMessage: true`

### 3. ResetPwdModal.vue
- `resetUserPwd` 调用添加 `skipErrorMessage: true`

### 4. users/index.vue
- `changeUserStatus` 调用添加 `skipErrorMessage: true`

## 优缺点对比

### 方案A优点
- 保持现有的提示文案一致性
- 可以针对不同场景提供更友好的错误提示
- 成功提示仍由组件控制，更灵活

### 方案A缺点  
- 需要修改多个文件
- 开发者需要记住使用 `skipErrorMessage` 选项

### 方案B优点
- 修改最少
- 统一的错误处理逻辑

### 方案B缺点
- 失去场景化的错误提示能力
- 所有错误提示都是后端返回的msg，不够友好

## 推荐方案
**方案A** - 因为当前的错误提示文案更用户友好（如"操作失败"比后端的技术错误信息更合适）。

## 实施步骤
1. 修改 RoleModal.vue
2. 修改 UserModal.vue  
3. 修改 ResetPwdModal.vue
4. 修改 users/index.vue
5. 测试验证

## 验证清单
- [ ] 角色新增失败时只有一个错误提示
- [ ] 角色编辑失败时只有一个错误提示  
- [ ] 用户新增失败时只有一个错误提示
- [ ] 用户编辑失败时只有一个错误提示
- [ ] 密码重置失败时只有一个错误提示
- [ ] 用户状态切换失败时只有一个错误提示
- [ ] 成功提示仍正常显示（不受影响）
