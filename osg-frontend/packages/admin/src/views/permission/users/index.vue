<template>
  <div class="users-page">
    <div class="page-header">
      <div>
        <h2>后台用户管理</h2>
        <p class="subtitle">管理后台系统用户账号</p>
      </div>
      <a-button type="primary" @click="handleAdd">
        <template #icon><PlusOutlined /></template>
        新增用户
      </a-button>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <a-input
        v-model:value="searchForm.keyword"
        placeholder="搜索用户名 / 姓名"
        style="width: 200px"
        allow-clear
      />
      <a-select
        v-model:value="searchForm.roleId"
        placeholder="全部角色"
        style="width: 150px"
        allow-clear
      >
        <a-select-option v-for="role in roleOptions" :key="role.roleId" :value="role.roleId">
          {{ role.roleName }}
        </a-select-option>
      </a-select>
      <a-select
        v-model:value="searchForm.status"
        placeholder="全部状态"
        style="width: 120px"
        allow-clear
      >
        <a-select-option value="0">Active</a-select-option>
        <a-select-option value="1">Disabled</a-select-option>
      </a-select>
      <a-button type="primary" @click="handleSearch">搜索</a-button>
    </div>

    <!-- 用户列表表格 -->
    <a-table
      :columns="columns"
      :data-source="userList"
      :loading="loading"
      :pagination="pagination"
      :row-class-name="getRowClassName"
      row-key="userId"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'nickName'">
          <span class="user-name">{{ record.nickName }}</span>
        </template>

        <template v-if="column.key === 'roles'">
          <a-tag
            v-for="role in record.roles"
            :key="role.roleId"
            :color="getRoleColor(role.roleKey)"
          >
            {{ role.roleName }}
          </a-tag>
        </template>

        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === '0' ? 'success' : 'error'">
            {{ record.status === '0' ? 'Active' : 'Disabled' }}
          </a-tag>
        </template>

        <template v-if="column.key === 'loginDate'">
          {{ formatDateTime(record.loginDate) }}
        </template>

        <template v-if="column.key === 'updateTime'">
          {{ formatDate(record.updateTime) }}
        </template>

        <template v-if="column.key === 'action'">
          <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
          <a-button
            v-if="record.status === '0'"
            type="link"
            size="small"
            @click="handleResetPassword(record)"
          >
            重置密码
          </a-button>
          <a-button
            v-if="record.status === '0' && !isSuperAdmin(record)"
            type="link"
            size="small"
            danger
            @click="handleDisable(record)"
          >
            禁用
          </a-button>
          <a-button
            v-if="record.status === '1'"
            type="link"
            size="small"
            @click="handleEnable(record)"
          >
            启用
          </a-button>
        </template>
      </template>
    </a-table>

    <!-- 分页信息 -->
    <div class="pagination-info">
      共 {{ pagination.total }} 条记录
    </div>

    <!-- 用户弹窗 -->
    <UserModal
      v-model:visible="userModalVisible"
      :user="currentUser"
      :role-options="roleOptions"
      @success="loadUserList"
    />

    <!-- 重置密码弹窗 -->
    <ResetPwdModal
      v-model:visible="resetPwdModalVisible"
      :user-id="resetPwdUserId"
      @success="loadUserList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { getUserList, changeUserStatus, getAllRoles } from '@/api/user'
import type { UserInfo } from '@/api/user'
import UserModal from './components/UserModal.vue'
import ResetPwdModal from './components/ResetPwdModal.vue'
import dayjs from 'dayjs'

const loading = ref(false)
const userList = ref<UserInfo[]>([])
const roleOptions = ref<any[]>([])
const userModalVisible = ref(false)
const currentUser = ref<UserInfo | null>(null)
const resetPwdModalVisible = ref(false)
const resetPwdUserId = ref<number | null>(null)

const searchForm = reactive({
  keyword: '',
  roleId: undefined as number | undefined,
  status: undefined as string | undefined
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

const columns = [
  { title: 'ID', dataIndex: 'userId', key: 'userId', width: 80 },
  { title: '用户名', dataIndex: 'userName', key: 'userName', width: 120 },
  { title: '姓名', dataIndex: 'nickName', key: 'nickName', width: 100 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
  { title: '角色', key: 'roles', width: 200 },
  { title: '状态', key: 'status', width: 100 },
  { title: '最后登录', key: 'loginDate', width: 150 },
  { title: '更新时间', key: 'updateTime', width: 120 },
  { title: '操作', key: 'action', width: 200 }
]

// 角色颜色映射
const getRoleColor = (roleKey: string): string => {
  const colorMap: Record<string, string> = {
    super_admin: 'purple',
    clerk: 'blue',
    hour_auditor: 'orange',
    accountant: 'green'
  }
  return colorMap[roleKey] || 'default'
}

// 判断是否超级管理员
const isSuperAdmin = (record: any): boolean => {
  return record.roles?.some((r: any) => r.roleKey === 'super_admin')
}

// Disabled 行样式
const getRowClassName = (record: any): string => {
  return record.status === '1' ? 'disabled-row' : ''
}

const formatDate = (date: string) => {
  return date ? dayjs(date).format('MM/DD/YYYY') : '-'
}

const formatDateTime = (date: string) => {
  return date ? dayjs(date).format('MM/DD/YYYY HH:mm') : '-'
}

const loadUserList = async () => {
  try {
    loading.value = true
    const res = await getUserList({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      userName: searchForm.keyword || undefined,
      nickName: searchForm.keyword || undefined,
      status: searchForm.status,
      roleId: searchForm.roleId
    })
    userList.value = res.rows || []
    pagination.total = res.total || 0
  } catch (error) {
    message.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

const loadRoleOptions = async () => {
  try {
    const res = await getAllRoles()
    roleOptions.value = res.roles || []
  } catch (error) {
    console.error('加载角色列表失败', error)
  }
}

const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadUserList()
}

const handleSearch = () => {
  pagination.current = 1
  loadUserList()
}

const handleAdd = () => {
  currentUser.value = null
  userModalVisible.value = true
}

const handleEdit = (record: UserInfo) => {
  currentUser.value = record
  userModalVisible.value = true
}

const handleResetPassword = (record: UserInfo) => {
  resetPwdUserId.value = record.userId
  resetPwdModalVisible.value = true
}

const handleDisable = (record: UserInfo) => {
  Modal.confirm({
    title: '确认禁用',
    content: '确定要禁用该用户吗？禁用后该用户将无法登录系统。',
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        await changeUserStatus(record.userId, '1')
        message.success('用户已禁用')
        loadUserList()
      } catch (error) {
        message.error('禁用失败')
      }
    }
  })
}

const handleEnable = async (record: UserInfo) => {
  try {
    await changeUserStatus(record.userId, '0')
    message.success('用户已启用')
    loadUserList()
  } catch (error) {
    message.error('启用失败')
  }
}

onMounted(() => {
  loadUserList()
  loadRoleOptions()
})
</script>

<style scoped lang="scss">
.users-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;

    h2 {
      margin: 0 0 4px;
      font-size: 20px;
    }

    .subtitle {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }

  .search-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .user-name {
    font-weight: 600;
  }

  .pagination-info {
    margin-top: 16px;
    color: #666;
    font-size: 14px;
  }

  :deep(.disabled-row) {
    opacity: 0.6;
  }
}
</style>
