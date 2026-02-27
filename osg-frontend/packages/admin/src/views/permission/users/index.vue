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

    <div class="filter-bar">
      <a-input
        v-model:value="searchParams.userName"
        placeholder="搜索用户名/姓名"
        style="width: 200px"
        allow-clear
        @pressEnter="handleSearch"
      />
      <a-select
        v-model:value="searchParams.roleId"
        placeholder="全部角色"
        style="width: 150px"
        allow-clear
      >
        <a-select-option v-for="role in roleOptions" :key="role.roleId" :value="role.roleId">
          {{ role.roleName }}
        </a-select-option>
      </a-select>
      <a-select
        v-model:value="searchParams.status"
        placeholder="全部状态"
        style="width: 120px"
        allow-clear
      >
        <a-select-option value="0">Active</a-select-option>
        <a-select-option value="1">Disabled</a-select-option>
      </a-select>
      <a-button type="primary" @click="handleSearch">搜索</a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="userList"
      :loading="loading"
      :pagination="false"
      row-key="userId"
      :row-class-name="rowClassName"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'nickName'">
          <span class="user-name">{{ record.nickName }}</span>
        </template>

        <template v-if="column.key === 'roles'">
          <a-tag
            v-for="role in record.roles"
            :key="role.roleId"
            :color="getRoleTagColor(role.roleKey)"
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
          {{ record.loginDate ? dayjs(record.loginDate).format('MM/DD/YYYY HH:mm') : '-' }}
        </template>

        <template v-if="column.key === 'updateTime'">
          {{ record.updateTime ? dayjs(record.updateTime).format('MM/DD/YYYY') : '-' }}
        </template>

        <template v-if="column.key === 'action'">
          <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
          <a-button
            v-if="record.status === '0'"
            type="link"
            size="small"
            @click="handleResetPwd(record)"
          >
            重置密码
          </a-button>
          <a-button
            v-if="record.status === '0' && !record.admin"
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

    <div class="pagination-bar">
      <span class="total">共 {{ pagination.total }} 条记录</span>
      <a-pagination
        v-model:current="pagination.current"
        v-model:pageSize="pagination.pageSize"
        :total="pagination.total"
        show-size-changer
        @change="handlePageChange"
      />
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
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { getUserList, changeUserStatus, getRoleOptions as fetchRoleOptions } from '@/api/user'
import UserModal from './components/UserModal.vue'
import ResetPwdModal from './components/ResetPwdModal.vue'
import dayjs from 'dayjs'

const loading = ref(false)
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

const columns = [
  { title: 'ID', dataIndex: 'userId', key: 'userId', width: 80 },
  { title: '用户名', dataIndex: 'userName', key: 'userName', width: 120 },
  { title: '姓名', dataIndex: 'nickName', key: 'nickName', width: 120 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
  { title: '角色', key: 'roles', width: 200 },
  { title: '状态', key: 'status', width: 100 },
  { title: '最后登录', key: 'loginDate', width: 150 },
  { title: '更新时间', key: 'updateTime', width: 120 },
  { title: '操作', key: 'action', width: 200 }
]

const roleTagColorMap: Record<string, string> = {
  super_admin: 'purple',
  clerk: 'blue',
  course_auditor: 'orange',
  accountant: 'green'
}

const getRoleTagColor = (roleKey: string) => {
  return roleTagColorMap[roleKey] || 'default'
}

const rowClassName = (record: any) => {
  return record.status === '1' ? 'disabled-row' : ''
}

const loadUserList = async () => {
  try {
    loading.value = true
    const res = await getUserList({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      userName: searchParams.userName || undefined,
      status: searchParams.status,
      roleId: searchParams.roleId
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

const handlePageChange = () => {
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
        await changeUserStatus({ userId: record.userId, status: '1' })
        message.success('用户已禁用')
        loadUserList()
      } catch (error) {
        message.error('操作失败')
      }
    }
  })
}

const handleEnable = async (record: any) => {
  try {
    await changeUserStatus({ userId: record.userId, status: '0' })
    message.success('用户已启用')
    loadUserList()
  } catch (error) {
    message.error('操作失败')
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
    margin-bottom: 16px;

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

  .filter-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .user-name {
    font-weight: 600;
  }

  .pagination-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;

    .total {
      color: #666;
      font-size: 14px;
    }
  }

  :deep(.disabled-row) {
    opacity: 0.6;
  }
}
</style>
