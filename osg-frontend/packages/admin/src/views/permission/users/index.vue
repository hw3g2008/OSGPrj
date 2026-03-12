<template>
  <div class="users-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">
          后台用户管理
          <span class="page-title-en">Admin Users</span>
        </h2>
        <p class="page-sub subtitle">管理后台系统用户账号</p>
      </div>
      <button
        type="button"
        class="permission-button permission-button--primary surface-trigger surface-trigger--primary"
        data-surface-trigger="modal-add-admin"
        @click="handleAdd"
      >
        <i class="mdi mdi-plus" aria-hidden="true"></i>
        <span>新增用户</span>
      </button>
    </div>

    <div class="filter-bar">
      <a-input
        v-model:value="searchParams.userName"
        class="filter-bar__control filter-bar__control--search"
        placeholder="搜索用户名 / 姓名"
        allow-clear
        @pressEnter="handleSearch"
      />
      <a-select
        v-model:value="searchParams.roleId"
        class="filter-bar__control filter-bar__control--role"
        placeholder="全部角色"
        allow-clear
      >
        <a-select-option v-for="role in roleOptions" :key="role.roleId" :value="role.roleId">
          {{ role.roleName }}
        </a-select-option>
      </a-select>
      <a-select
        v-model:value="searchParams.status"
        class="filter-bar__control filter-bar__control--status"
        placeholder="全部状态"
        allow-clear
      >
        <a-select-option value="0">启用</a-select-option>
        <a-select-option value="1">禁用</a-select-option>
      </a-select>
      <button type="button" class="permission-button permission-button--outline" @click="handleSearch">
        <i class="mdi mdi-magnify" aria-hidden="true"></i>
        <span>搜索</span>
      </button>
    </div>

    <div class="permission-card">
      <div class="permission-card__body permission-card__body--flush">
        <table class="permission-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>姓名</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>状态</th>
              <th>最后登录</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in userList"
              :key="record.userId"
              :class="{ 'permission-table__row--disabled': record.status === '1' }"
            >
              <td>{{ record.userId }}</td>
              <td>{{ record.userName }}</td>
              <td><strong>{{ record.nickName }}</strong></td>
              <td>{{ record.email }}</td>
              <td>
                <div class="permission-pill-group">
                  <span
                    v-for="role in record.roles"
                    :key="role.roleId"
                    :class="['permission-pill', `permission-pill--${getRoleTagTone(role.roleKey)}`]"
                  >
                    {{ role.roleName }}
                  </span>
                </div>
              </td>
              <td>
                <span
                  :class="[
                    'permission-pill',
                    record.status === '0' ? 'permission-pill--success' : 'permission-pill--danger'
                  ]"
                >
                  {{ record.status === '0' ? '启用' : '禁用' }}
                </span>
              </td>
              <td>{{ record.loginDate ? dayjs(record.loginDate).format('MM/DD/YYYY HH:mm') : '-' }}</td>
              <td>{{ record.updateTime ? dayjs(record.updateTime).format('MM/DD/YYYY') : '-' }}</td>
              <td>
                <div class="permission-actions">
                  <button
                    type="button"
                    class="permission-action surface-trigger surface-trigger--inline"
                    data-surface-trigger="modal-edit-admin"
                    data-surface-sample="modal-edit-admin"
                    :data-surface-sample-key="record.userName"
                    @click="handleEdit(record)"
                  >
                    编辑
                  </button>
                  <button
                    v-if="record.status === '0'"
                    type="button"
                    class="permission-action surface-trigger surface-trigger--inline"
                    data-surface-trigger="modal-reset-password"
                    data-surface-sample="modal-reset-password"
                    :data-surface-sample-key="record.userName"
                    @click="handleResetPwd(record)"
                  >
                    重置密码
                  </button>
                  <button
                    v-if="record.status === '0' && !record.admin"
                    type="button"
                    class="permission-action permission-action--danger"
                    @click="handleDisable(record)"
                  >
                    禁用
                  </button>
                  <button
                    v-if="record.status === '1'"
                    type="button"
                    class="permission-action permission-action--success"
                    @click="handleEnable(record)"
                  >
                    启用
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="users-pagination">
      <span class="users-pagination__total">共 {{ pagination.total }} 条记录</span>
      <div class="users-pagination__controls">
        <button
          type="button"
          class="permission-button permission-button--outline permission-button--small"
          :disabled="!hasPrev"
          @click="goPrev"
        >
          上一页
        </button>
        <button
          type="button"
          class="permission-button permission-button--primary permission-button--small"
        >
          {{ pagination.current }}
        </button>
        <button
          type="button"
          class="permission-button permission-button--outline permission-button--small"
          :disabled="!hasNext"
          @click="goNext"
        >
          下一页
        </button>
      </div>
    </div>

    <UserModal
      v-model:visible="userModalVisible"
      :user="currentUser"
      :role-options="roleOptions"
      @success="loadUserList"
    />

    <ResetPwdModal
      v-model:visible="resetPwdModalVisible"
      :user="currentUser"
      @success="loadUserList"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { getUserList, getUserDetail, changeUserStatus, getRoleOptions as fetchRoleOptions } from '@/api/user'
import UserModal from './components/UserModal.vue'
import ResetPwdModal from './components/ResetPwdModal.vue'
import dayjs from 'dayjs'

const userList = ref<any[]>([])
const roleOptions = ref<any[]>([])
const userModalVisible = ref(false)
const resetPwdModalVisible = ref(false)
const currentUser = ref<any>(null)

const searchParams = reactive({
  userName: '',
  status: undefined as string | undefined,
  roleId: undefined as number | undefined
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

const totalPages = computed(() => Math.max(1, Math.ceil((pagination.total || 0) / pagination.pageSize)))
const hasPrev = computed(() => pagination.current > 1)
const hasNext = computed(() => pagination.current < totalPages.value)

const roleTagColorMap: Record<string, string> = {
  super_admin: 'purple',
  clerk: 'info',
  course_auditor: 'warning',
  accountant: 'success'
}

const getRoleTagTone = (roleKey: string) => {
  return roleTagColorMap[roleKey] || 'info'
}

const loadUserList = async () => {
  try {
    const res = await getUserList({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      userName: searchParams.userName || undefined,
      status: searchParams.status,
      roleId: searchParams.roleId
    })
    const users = res.rows || []
    pagination.total = res.total || 0
    
    // 为每个用户补充角色信息（list 接口不返回角色）
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        try {
          const detail = await getUserDetail(user.userId)
          return {
            ...user,
            roles: detail.roles || detail.data?.roles || []
          }
        } catch {
          return { ...user, roles: [] }
        }
      })
    )
    
    userList.value = usersWithRoles
  } catch (error) {
    message.error('加载用户列表失败')
  }
}

const loadRoleOptions = async () => {
  try {
    const res = await fetchRoleOptions()
    roleOptions.value = res || []
  } catch (error) {
    console.error('加载角色选项失败', error)
  }
}

const handleSearch = () => {
  pagination.current = 1
  loadUserList()
}

const goPrev = () => {
  if (!hasPrev.value) return
  pagination.current -= 1
  loadUserList()
}

const goNext = () => {
  if (!hasNext.value) return
  pagination.current += 1
  loadUserList()
}

const handleAdd = () => {
  currentUser.value = null
  userModalVisible.value = true
}

const handleEdit = (record: any) => {
  currentUser.value = record
  userModalVisible.value = true
}

const handleResetPwd = (record: any) => {
  currentUser.value = record
  resetPwdModalVisible.value = true
}

const handleDisable = (record: any) => {
  Modal.confirm({
    title: '确认禁用',
    content: '确定要禁用该用户吗？禁用后该用户将无法登录系统。',
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        await changeUserStatus({ userId: record.userId, status: '1' }, {
          customErrorMessage: '用户禁用失败，请重试'
        })
        message.success('用户已禁用')
        loadUserList()
      } catch (error) {
        // 移除组件内的错误提示，让拦截器处理
      }
    }
  })
}

const handleEnable = async (record: any) => {
  try {
    await changeUserStatus({ userId: record.userId, status: '0' }, {
      customErrorMessage: '用户启用失败，请重试'
    })
    message.success('用户已启用')
    loadUserList()
  } catch (error) {
    // 移除组件内的错误提示，让拦截器处理
  }
}

onMounted(() => {
  loadUserList()
  loadRoleOptions()
})
</script>

<style scoped lang="scss">
.users-page {
  padding: 8px 4px 0;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
  }

  .page-title {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    line-height: normal;
    color: #1e293b;
  }

  .page-title-en {
    margin-left: 8px;
    font-size: 14px;
    font-weight: 400;
    color: #94a3b8;
  }

  .page-sub {
    margin: 6px 0 0;
    font-size: 14px;
    line-height: normal;
    color: #64748b;
  }

  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }

  .filter-bar__control {
    :deep(.ant-select-selector),
    :deep(.ant-input) {
      border-color: #d1d5db;
      border-radius: 10px;
      min-height: 42px;
      box-shadow: none;
    }

    :deep(.ant-input) {
      padding-inline: 14px;
    }

    &--search {
      width: 200px;
    }

    &--role {
      width: 140px;
    }

    &--status {
      width: 120px;
    }
  }

  .permission-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    cursor: pointer;
    border: none;

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    &--primary {
      color: #fff;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    }

    &--outline {
      color: #64748b;
      background: #fff;
      border: 1px solid #e2e8f0;
    }

    &--small {
      padding: 6px 12px;
      font-size: 13px;
    }
  }

  .permission-card {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(99, 102, 241, 0.12);
  }

  .permission-card__body--flush {
    padding: 0;
  }

  .permission-table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: 14px 16px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
      font-size: 14px;
      line-height: normal;
      color: #1e293b;
      vertical-align: middle;
    }

    th {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      background: #f8fafc;
      letter-spacing: 0.02em;
    }

    tbody tr:hover {
      background: #f8fafc;
    }
  }

  .permission-table__row--disabled {
    opacity: 0.6;
  }

  .permission-pill-group {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .permission-pill {
    display: inline-flex;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;

    &--info {
      background: #dbeafe;
      color: #1e40af;
    }

    &--warning {
      background: #fef3c7;
      color: #92400e;
    }

    &--success {
      background: #d1fae5;
      color: #065f46;
    }

    &--danger {
      background: #fee2e2;
      color: #991b1b;
    }

    &--purple {
      background: #e0e7ff;
      color: #4f46e5;
    }
  }

  .permission-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0;
  }

  .permission-action {
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: #6366f1;
    font-size: 13px;
    cursor: pointer;

    &--danger {
      color: #ef4444;
    }

    &--success {
      color: #22c55e;
    }
  }

  .users-pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
  }

  .users-pagination__total {
    color: #94a3b8;
    font-size: 13px;
  }

  .users-pagination__controls {
    display: flex;
    gap: 8px;
  }
}
</style>
