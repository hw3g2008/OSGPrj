# 导师列表页面优化方案

**日期**: 2026-03-17
**状态**: 已完成
**影响范围**: `osg-frontend/packages/admin/src/views/users/staff/`

## 问题描述

导师列表页面存在与学员列表相同的问题：
- **信息过于分散**：11 个独立列导致表格过宽
- **视觉层次不清晰**：所有信息平铺展示
- **信息密度不合理**：相关信息被分散在多个列中

## 优化方案

### 1. 表格结构重构

#### 原结构（11 列）
```
ID | 英文名 | 联系方式 | 类型 | 主攻方向 | 子方向 | 所属地区 | 课单价 | 学员数 | 账号状态 | 操作
```

#### 新结构（6 个分组列）
```
导师信息 | 专业信息 | 地区信息 | 课时信息 | 账号状态 | 操作
```

### 2. 列内容设计

#### 导师信息列
- **主要信息**：姓名（蓝色链接，可点击查看详情）+ ID 徽章（灰色背景）
- **联系方式**：邮箱、电话（灰色文字，分行显示）

```vue
<div class="staff-cell-block staff-meta-list">
  <div class="staff-primary">
    <button class="staff-name">Emily Zhang</button>
    <span class="staff-id-badge">ID 10001</span>
  </div>
  <div class="staff-contact-line">emily@example.com</div>
  <div class="staff-contact-line">+1 234-567-8900</div>
</div>
```

#### 专业信息列
- **类型标签**：班主任（蓝色）/导师（紫色）
- **主攻方向**：金融/咨询/科技/量化（彩色小标签）
- **子方向**：具体细分方向（灰色文字）

使用键值对布局：
```vue
<div class="staff-pair-row">
  <span class="staff-pair-label">主攻方向</span>
  <span class="staff-pill staff-pill--small">金融</span>
</div>
```

#### 地区信息列
- **所属地区**：emoji + 地区名称（加粗）
- **城市**：具体城市（灰色文字）

```
🇺🇸 美国
纽约
```

#### 课时信息列
采用卡片式布局：
```
┌─────────────┐
│ 课单价      │
│ $150/h      │
├─────────────┤
│ 学员数      │
│ 12 (可点击) │
└─────────────┘
```

#### 账号状态列
- **状态标签**：正常（绿）/冻结（黄）
- **状态说明**：灰色小字

#### 操作列
- 详情 | 更多（下拉菜单）

### 3. 样式优化

#### 颜色系统
```scss
// 类型标签
.staff-pill--lead_mentor { background: #dbeafe; color: #1d4ed8; } // 班主任
.staff-pill--mentor       { background: #e0e7ff; color: #4338ca; } // 导师

// 主攻方向
.staff-pill--direction-finance    { background: #e0e7ff; color: #4338ca; } // 金融
.staff-pill--direction-consulting { background: #dbeafe; color: #1d4ed8; } // 咨询
.staff-pill--direction-tech       { background: #fef3c7; color: #92400e; } // 科技
.staff-pill--direction-quant      { background: #ede9fe; color: #6d28d9; } // 量化

// 账号状态
.tag.success { background: #dcfce7; color: #166534; } // 正常
.tag.warning { background: #fef3c7; color: #92400e; } // 冻结
.tag.danger  { background: #fee2e2; color: #b91c1c; } // 黑名单

// 课单价
.staff-work-value--rate { color: #0f766e; } // 绿色

// 学员数
.staff-work-value--count { color: #2563eb; } // 蓝色可点击
```

#### 间距优化
- 单元格内边距：`16px 12px`
- 单元格内部间距：`gap: 6-8px`
- 垂直对齐：`vertical-align: top`

#### 字体层次
```scss
// 主要信息
.staff-name           { font-size: 13px; font-weight: 600; }
.staff-region-name    { font-size: 13px; font-weight: 600; }
.staff-work-value     { font-size: 14px; font-weight: 700; }

// 次要信息
.staff-contact-line   { font-size: 12px; color: #6b7280; }
.staff-pair-value     { font-size: 12px; font-weight: 500; }

// 辅助信息
.staff-pair-label     { font-size: 11px; color: #9ca3af; }
.staff-work-label     { font-size: 11px; color: #9ca3af; }
.staff-note           { font-size: 11px; color: #9ca3af; }
```

### 4. 代码改进

#### 新增辅助函数
```typescript
// 样式类函数
getStatusClass(accountStatus?: string): string
getStatusNote(row: StaffListItem): string

// 交互函数
openStaffDetail(row: StaffListItem): void
```

#### 删除的旧样式类
```scss
// 已删除或重构
.staff-cell--stack
.staff-cell--muted
.staff-cell--money
.staff-link
.staff-count
.staff-tag (旧版本)
```

### 5. 文件变更清单

#### 修改的文件
1. `columns.ts` - 列定义从 11 列改为 6 列
2. `index.vue` - 表格结构和样式完全重构

#### 未修改的文件
- `components/MentorStudentsModal.vue` - 导师学员列表弹窗保持不变
- 其他弹窗组件保持不变

## 实施步骤

1. ✅ 更新列定义（`columns.ts`）
2. ✅ 重构表格 HTML 结构
3. ✅ 添加新的辅助函数
4. ✅ 添加新的样式类
5. ✅ 更新表格基础样式
6. ✅ 构建并测试

## 测试验证

### 功能测试
- [x] 表格正常渲染
- [x] 导师信息正确显示
- [x] 点击姓名打开详情弹窗
- [x] 点击学员数打开学员列表弹窗
- [x] 更多菜单正常工作
- [x] 筛选功能正常
- [x] 分页功能正常
- [x] Tab 切换（正常列表/黑名单）正常

### 样式测试
- [x] 冻结状态的行半透明显示
- [x] 类型标签颜色正确
- [x] 主攻方向标签颜色正确
- [x] 账号状态标签样式正确
- [x] 课单价绿色显示
- [x] 学员数蓝色可点击

## 优化效果

### 可读性提升
- **信息分组**：相关信息组织在一起（联系方式、专业信息、地区信息）
- **层次清晰**：使用字号、颜色、字重区分主次信息
- **视觉引导**：使用 emoji 和彩色标签快速识别关键信息

### 空间利用
- **宽度优化**：从 11 列压缩到 6 列，减少横向滚动
- **高度优化**：使用垂直布局展示更多信息
- **自适应**：列宽根据内容自动调整

### 用户体验
- **快速扫描**：重要信息（姓名、类型、课单价）更突出
- **操作便捷**：姓名和学员数都可点击，减少操作步骤
- **状态识别**：通过颜色和图标快速识别导师状态

## 与学员列表的一致性

导师列表的优化方案与学员列表保持一致：
- 相同的分组列设计理念
- 相同的样式类命名规范
- 相同的颜色系统
- 相同的交互模式

## 后续优化建议

1. **统一组件库**：将分组单元格样式提取为可复用组件
2. **响应式优化**：针对小屏幕设备优化布局
3. **性能优化**：对大数据量列表进行虚拟滚动优化
4. **可访问性**：添加 ARIA 标签，提升屏幕阅读器支持

## 参考资料

- 学员列表优化方案：`docs/plans/2026-03-17-students-page-optimization.md`
- 样式修复总结：`docs/plans/2026-03-17-admin-pages-style-fixes.md`

## 构建信息

- 构建时间: 2026-03-17
- 构建状态: 成功
- 构建耗时: ~10s
- 无 TypeScript 错误
- 无 ESLint 警告
