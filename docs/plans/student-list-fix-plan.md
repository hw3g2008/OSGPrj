# 学生列表修复方案

> 2026-04-15 | 原型: admin.html:502-740

---

## 修复项 1：操作列按钮条件显示（前端）

**文件**: `osg-frontend/packages/admin/src/views/users/students/index.vue`

当前问题：所有学生都同时显示「详情+编辑+续签+更多」，无条件区分。

原型逻辑（4 种场景）：

| 场景 | 条件 | 显示的按钮 |
|------|------|-----------|
| 已结束/退费 | `accountStatus === '2'` 或 `'3'` | 仅「详情」 |
| 合同即将到期 | `contractStatus === 'expiring'` | 详情 + 编辑 + 续签图标 |
| 冻结 | `accountStatus === '1'` | 详情 + 编辑 + 更多（重置密码/恢复正常/退费） |
| 正常 | 其他 | 详情 + 编辑 + 更多（重置密码/冻结/加入黑名单/退费） |

**续签与更多互斥**：有续签时不显示更多，有更多时不显示续签。

改动内容：将 `index.vue` 第 125-142 行的 action 模板替换为条件渲染：

```vue
<template v-else-if="column.dataIndex === 'action'">
  <a-space :size="4" wrap>
    <!-- 所有状态都显示详情 -->
    <a-button type="link" size="small" @click="openStudentDetail(record)">详情</a-button>

    <!-- 已结束/退费：只显示详情，下面全部隐藏 -->
    <template v-if="!isEndedStatus(record) && !isRefundedStatus(record)">
      <a-button type="link" size="small" @click="openStudentEdit(record)">编辑</a-button>

      <!-- 合同即将到期：显示续签图标按钮（不显示更多） -->
      <a-tooltip v-if="isContractExpiring(record)" title="续签合同">
        <a-button
          type="text"
          size="small"
          :loading="renewContractLoadingId === record.studentId"
          style="color: #F59E0B"
          @click="openStudentRenew(record)"
        >
          <template #icon><FileTextOutlined /></template>
        </a-button>
      </a-tooltip>

      <!-- 非到期：显示更多下拉 -->
      <a-dropdown v-else :trigger="['click']" placement="bottomRight">
        <a-button type="link" size="small">更多 <DownOutlined /></a-button>
        <template #overlay>
          <a-menu @click="({ key }) => handleStudentAction(key, record)">
            <a-menu-item key="resetPassword">重置密码</a-menu-item>
            <!-- 冻结状态：显示恢复正常 -->
            <template v-if="record.accountStatus === '1'">
              <a-menu-item key="restore"><span style="color: var(--success)">恢复正常</span></a-menu-item>
            </template>
            <!-- 正常状态：显示冻结+加入黑名单 -->
            <template v-else>
              <a-menu-item key="freeze">冻结</a-menu-item>
              <a-menu-item key="blacklist"><span style="color: #92400E">加入黑名单</span></a-menu-item>
            </template>
            <a-menu-item key="refund"><span style="color: var(--danger)">退费</span></a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </template>
  </a-space>
</template>
```

额外改动：
- 新增 import `FileTextOutlined` from `@ant-design/icons-vue`（用于续签图标）

颜色参考原型：
- 重置密码：默认色（primary link）
- 冻结：默认文本色（原型 `color:var(--text)`）
- 加入黑名单：`#92400E`（原型一致）
- 恢复正常：`var(--success)`（原型一致）
- 退费：`var(--danger)`（原型一致）

---

## 修复项 2：投递岗位硬编码（前端）

**文件**: `osg-frontend/packages/admin/src/views/users/students/index.vue`

当前 `formatJobApplications` 写死返回 `Goldman Sachs等3个`。

因为 `osg_job_application` 表当前 0 条数据，先改为显示 `-`（暂无投递），后续有数据后再接真实 API。

```ts
const formatJobApplications = (_record: StudentListItem) => {
  return '暂无投递'
}
```

---

## 修复项 3：姓名列去掉副文本（前端）

**文件**: `osg-frontend/packages/admin/src/views/users/students/index.vue`

当前姓名列下方有一行小字副文本（`getStatusNote`），显示"服务中"、"服务已结束"等。

原型中姓名列只有一个可点击的名字链接，没有任何副文本。且账号状态列已经用 Tag 显示了状态，重复显示没有意义。

删除第 75 行：
```vue
<!-- 删除这行 -->
<div style="font-size: 10px; color: #9099b0; margin-top: 2px">{{ getStatusNote(record) }}</div>
```

---

## 修复项 4：数据填充问题（数据库）

### 4a. 合同表 student_id=0

`osg_contract` 有 21 条记录，其中 20 条 `student_id=0`（未关联学生），`total_hours`/`remaining_hours` 也都是 0。

**原因**：这 20 条是通过新增学生流程创建的，但创建流程有 bug 导致 `student_id` 没有正确写入。

**修复方向**：排查 `OsgStudentServiceImpl.createStudentWithContract` 的合同创建逻辑，确认 `student_id` 赋值是否正确。若数据无法挽救则清理这 20 条空记录。

### 4b. 课程记录 student_id=0

`osg_class_record` 有 20 条，全部 `student_id=0`。同理是创建流程的 bug。

### 4c. 班主任全部为 NULL

`osg_student` 的 `lead_mentor_id` 全部是 NULL，学生没有分配班主任。

**修复方向**：排查新增/编辑学生时 `lead_mentor_id` 的写入逻辑。

### 4d. 岗位辅导/模拟应聘/投递岗位

`osg_coaching`=0条，`osg_mock_practice`=0条，`osg_job_application`=0条。

这些是业务尚未使用，暂不处理。前端显示 0 是正确的。

---

## 修改文件清单

| 文件 | 改动 |
|------|------|
| `osg-frontend/packages/admin/src/views/users/students/index.vue` | 操作列条件渲染 + 新增 icon import + formatJobApplications 改为暂无投递 + 删除姓名列副文本 |

## 后续排查（不在本次修复范围）

- `createStudentWithContract` 合同 student_id=0 的根因
- `lead_mentor_id` 写入缺失的根因
- 投递岗位列接入真实 API
