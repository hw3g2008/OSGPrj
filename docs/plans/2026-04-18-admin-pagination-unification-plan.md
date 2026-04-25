# Admin 前端分页器统一方案

**日期**：2026-04-18  
**负责人**：huangxin  
**类型**：前端小型重构 + 功能增强  
**范围**：本次落地 composable + 2 个 pilot 页面；剩余 18 页留给后续增量迁移

---

## 1. 背景

`/admin` 后台扫描 33 个 `index.vue`，分页情况：
- 9 个页面有分页（样板重复，默认值不一致）
- 20 个页面无分页（部分是后端已返回 total 但前端没用）

已存在的不一致：
- `pagination` 状态：有用 `reactive({current, pageSize, total})`，有用 3 个独立 `ref`
- `pageSize`：staff=10，contracts=20
- `showSizeChanger`：有 true 有 false
- `showTotal` 格式：基本一致但分散写

如果继续每页抄样板，20 页 ≈ 400 行重复代码，长期维护成本高。

## 2. 目标

- 抽出共用的"分页状态 + 请求联动 + 翻页回调"逻辑为 composable
- 让新增分页页面 = 5 行代码
- 保留 Ant Design `<a-table>` + `a-pagination` 原生能力（不包装 UI）
- 已有分页页面可以**增量迁移**，不强制一次性全改

## 3. 不做的事

- **不做 `<PagedTable>` 组件**（过度封装，牺牲 columns/slot/scroll 灵活性）
- **本次不迁移已有 9 个分页页面**（稳定就别动）
- **本次不加剩下 18 个无分页页面**（等 composable 稳定后增量做）
- **不改后端**（后端已经 OK，`total` bug 上一次已修好）

## 4. 实施范围

### 4.1 新增
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/composables/usePagination.ts`
- 导出到 `@osg/shared` 入口

### 4.2 Pilot 迁移（2 个页面）
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/teaching/class-records/index.vue`（课程记录，后端 total 刚修好的收尾）
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/mentor-schedule/index.vue`（导师排期）

选这 2 页的理由：
- 都是本次后端 total 修复顺带暴露的"前端无分页"问题，顺手闭环
- 一个是常规分页（class-records），一个是**可能不适合分页**的排期表（每行一个导师，业务需要一屏看全）

### 4.3 特殊考虑：导师排期要不要分页？

排期表的业务诉求：**一屏看全未填写的导师**（管理员要整体催促）。
- 如果强制分页每页 10 条，管理员可能只看到一半未填写的
- 页面顶部有"23 位导师排期未填写"+"一键催促全部"按钮 — 业务依赖全量

**决策**：
- 技术上加分页能力
- 默认 `pageSize: 50`，实际业务上 23 位全在一页
- 加 `pageSizeOptions: ['20', '50', '100']`，让用户可调
- 超过 50 人再真正翻页

## 5. composable 设计

### 5.1 签名

```ts
function usePagination<T, P extends Record<string, any>>(
  fetcher: (params: P & { pageNum: number; pageSize: number }) => Promise<PagedResponse<T>>,
  options?: {
    pageSize?: number                    // 默认 10
    showSizeChanger?: boolean            // 默认 true
    pageSizeOptions?: string[]           // 默认 ['10', '20', '50', '100']
  }
): {
  rows: Ref<T[]>
  loading: Ref<boolean>
  pagination: UnwrapNestedRefs<{ current; pageSize; total }>
  tablePagination: ComputedRef<TablePaginationConfig>
  load: (params?: P) => Promise<void>
  reload: () => Promise<void>
  search: (params?: P) => Promise<void>
  handleTableChange: (pag) => void
}
```

### 5.2 语义

- `load(params)` — 传入过滤参数+当前分页，拉数据。保留 `lastParams` 以便翻页时复用
- `search(params)` — 重置 current=1 后 `load(params)`；过滤条件变化时调用
- `reload()` — 用 `lastParams` + 当前分页重新拉（删改数据后用）
- `handleTableChange` — a-table 翻页/改 pageSize 时触发，自动用 `lastParams` 重拉

### 5.3 兼容性

- `fetcher` 返回 `{ rows, total }` 即可，兼容现有 API shape
- `total` 可缺省（某些接口返回 AjaxResult），此时 `pagination.total = 0`

## 6. 修改步骤

1. 新增 `usePagination.ts`
2. 更新 `@osg/shared` 的导出
3. 迁移 `class-records/index.vue`
   - 现状：无 pagination，调 `getClassRecordList` 一次拉全部
   - 改为：用 composable，pageSize=20
4. 迁移 `mentor-schedule/index.vue`
   - 现状：`pageSize: 100` 一次拉，前端 `:pagination="false"`
   - 改为：用 composable，pageSize=50，pageSizeOptions=['20','50','100']
5. 编译 + Playwright 双页验证

## 7. 验证

### 7.1 编译
```bash
pnpm --filter @osg/admin build   # 或 dev 模式自动触发
```

### 7.2 UI 级（Playwright）
- 课程记录页：分页器显示「共 20 条记录」，pageSize=10 时翻页正常
- 导师排期页：分页器显示「共 23 条记录」，默认不翻页（50/页），切 20/页后出现 2 页

### 7.3 回归验证
- 原导师列表页、学生列表页、合同管理页分页器**不受影响**（未迁移）

## 8. 风险

| 风险 | 等级 | 缓解 |
|------|------|------|
| composable 泛型处理不好导致 TS 报错 | 低 | pilot 2 页已覆盖主要用法 |
| `loading` 与现有页面 `loading` ref 冲突 | 低 | 迁移时删掉旧的 `loading` ref |
| 排期页业务需要看全量，分页反而坏事 | 中 | pageSize=50 缓冲，远超当前 23 人规模 |
| 迁移时遗漏原有特殊逻辑（比如 tab 切换重置页码） | 中 | 迁移时逐行对比 diff，保留原有 `handleSearch` 调用 |

## 9. 后续（不在本次）

- 逐步迁移已有 9 个分页页面到 composable（每个约 10 分钟）
- 逐步为 18 个无分页页面加分页（需要后端配套返回 total，部分接口目前是 AjaxResult）

---

## 10. 完成标准

- [x] 方案文档归档
- [ ] `usePagination.ts` 创建并导出
- [ ] class-records 页迁移完毕，UI 验证分页器可用
- [ ] mentor-schedule 页迁移完毕，UI 验证分页器可用
- [ ] `pnpm build` 无 TS 错误
- [ ] 原 9 个已分页页面不受影响（视觉抽检：导师列表、学生列表、合同管理）
