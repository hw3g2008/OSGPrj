<template>
  <div class="osg-page">
    <PageHeader
      title-zh="后台用户管理"
      title-en="Admin Users"
      description="管理后台系统用户账号、角色结构与登录状态，让权限治理像一份可审计台账。"
    >
      <template #actions>
        <a-statistic title="当前受管账号" :value="pagination.total" style="margin-right: 16px" />
        <a-button
          type="primary"
          data-surface-trigger="modal-add-admin"
          @click="handleAdd"
        >
          <template #icon><PlusOutlined /></template>
          新增用户
        </a-button>
      </template>
    </PageHeader>

    <a-row :gutter="16">
      <a-col v-for="card in summaryCards" :key="card.key" :span="6">
        <a-card size="small" :bordered="false" style="box-shadow: var(--card-shadow)">
          <a-statistic :title="card.label" :value="card.value" />
          <div style="font-size: 12px; color: var(--muted); margin-top: 4px">{{ card.meta }}</div>
        </a-card>
      </a-col>
    </a-row>

    <a-card :bordered="false" style="box-shadow: var(--card-shadow)">
      <a-form layout="inline" data-field-name="后台用户管理页">
        <a-form-item label="关键词">
          <a-input
            v-model:value="searchParams.userName"
            data-field-name="搜索框"
            placeholder="搜索用户名 / 姓名"
            allow-clear
            style="width: 200px"
            @pressEnter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="角色">
          <a-select
            v-model:value="searchParams.roleId"
            data-field-name="角色"
            placeholder="全部角色"
            allow-clear
            style="width: 160px"
          >
            <a-select-option v-for="role in roleOptions" :key="role.roleId" :value="role.roleId">
              {{ role.roleName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="searchParams.status"
            data-field-name="状态"
            placeholder="全部状态"
            allow-clear
            style="width: 120px"
          >
            <a-select-option value="0">启用</a-select-option>
            <a-select-option value="1">禁用</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="handleSearch">
            <template #icon><SearchOutlined /></template>
            搜索
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false" style="box-shadow: var(--card-shadow)">
      <template #title>账号治理台账</template>
      <template #extra>
        <a-space>
          <a-tag>第 {{ pagination.current }} / {{ totalPages }} 页</a-tag>
          <a-tag>{{ roleOptions.length }} 个可分配角色</a-tag>
        </a-space>
      </template>
      <a-table
        :columns="userColumns"
        :data-source="userList"
        :scroll="{ x: 'max-content' }"
        :row-key="(r: any) => r.userId"
        :pagination="{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          simple: false,
          showTotal: (total: number) => `共 ${total} 条记录`,
          onChange: onPageChange,
        }"
        :row-class-name="(record: any) => (record.status === '1' ? 'row-disabled' : '')"
        :locale="{ emptyText: '当前筛选条件下暂无后台用户' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'userId'">
            <a-tag>#{{ record.userId }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'identity'">
            <div style="display: flex; align-items: center; gap: 10px">
              <a-avatar
                :style="{
                  background: record.admin
                    ? 'linear-gradient(135deg, #8b5cf6, #5b4bc4)'
                    : 'linear-gradient(135deg, #31456d, #42577f)',
                }"
                size="small"
              >
                {{ getUserInitials(record) }}
              </a-avatar>
              <div>
                <div><strong>{{ record.nickName }}</strong></div>
                <div style="font-size: 12px; color: var(--muted)">@{{ record.userName }}</div>
                <div style="font-size: 11px; color: var(--primary)">{{ record.admin ? '系统账号' : '自定义账号' }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'contact'">
            <div>{{ record.email || '-' }}</div>
            <div style="font-size: 12px; color: var(--muted)">{{ record.phonenumber || '未填写手机号' }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'roles'">
            <a-tag
              v-for="role in record.roles"
              :key="role.roleId"
              :color="getRoleTagTone(role.roleKey) === 'purple' ? 'purple' : getRoleTagTone(role.roleKey) === 'success' ? 'green' : getRoleTagTone(role.roleKey) === 'warning' ? 'orange' : 'blue'"
            >
              {{ role.roleName }}
            </a-tag>
            <a-tag v-if="!record.roles?.length" color="default">未绑定角色</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="record.status === '0' ? 'success' : 'error'">
              {{ record.status === '0' ? '启用' : '禁用' }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'activity'">
            <div>最后登录：{{ formatLogin(record.loginDate) }}</div>
            <div>最近更新：{{ formatUpdate(record.updateTime) }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button
              type="link"
              size="small"
              data-surface-trigger="modal-edit-admin"
              data-surface-sample="modal-edit-admin"
              :data-surface-sample-key="record.userName"
              @click="handleEdit(record)"
            >
              编辑
            </a-button>
            <a-button
              v-if="record.status === '0'"
              type="link"
              size="small"
              data-surface-trigger="modal-reset-password"
              data-surface-sample="modal-reset-password"
              :data-surface-sample-key="record.userName"
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
    </a-card>

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
import { PageHeader } from '@osg/shared/components/PageHeader'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

const userColumns = [
  { title: 'ID', dataIndex: 'userId', key: 'userId', width: 80 },
  { title: '账号身份', dataIndex: 'identity', key: 'identity' },
  { title: '联系方式', dataIndex: 'contact', key: 'contact' },
  { title: '角色矩阵', dataIndex: 'roles', key: 'roles' },
  { title: '账户状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '活跃记录', dataIndex: 'activity', key: 'activity' },
  { title: '操作', dataIndex: 'action', key: 'action', width: 200 },
]

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

const roleTagColorMap: Record<string, string> = {
  super_admin: 'purple',
  clerk: 'info',
  course_auditor: 'warning',
  accountant: 'success'
}

const getRoleTagTone = (roleKey: string) => {
  return roleTagColorMap[roleKey] || 'info'
}

const summaryCards = computed(() => {
  const rows = userList.value
  const activeCount = rows.filter((record) => record.status === '0').length
  const disabledCount = rows.filter((record) => record.status === '1').length
  const privilegedCount = rows.filter((record) =>
    record.admin || (record.roles || []).some((role: any) => role.roleKey === 'super_admin'),
  ).length

  return [
    {
      key: 'total',
      tone: 'ink',
      label: '台账总量',
      value: pagination.total,
      meta: '当前页与全量记录同步'
    },
    {
      key: 'active',
      tone: 'emerald',
      label: '活跃账号',
      value: activeCount,
      meta: '可正常登录与执行操作'
    },
    {
      key: 'disabled',
      tone: 'amber',
      label: '冻结账号',
      value: disabledCount,
      meta: '需要人工复核后再启用'
    },
    {
      key: 'privileged',
      tone: 'plum',
      label: '高权限账号',
      value: privilegedCount,
      meta: '含系统账号与核心治理角色'
    }
  ]
})

const getUserInitials = (record: any) => {
  const base = String(record?.nickName || record?.userName || 'AD').trim()
  return base.slice(0, 2).toUpperCase()
}

const formatLogin = (value?: string) => {
  return value ? dayjs(value).format('MM/DD/YYYY HH:mm') : '从未登录'
}

const formatUpdate = (value?: string) => {
  return value ? dayjs(value).format('MM/DD/YYYY') : '暂无变更'
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

    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        try {
          const detail = await getUserDetail(user.userId)
          return {
            ...user,
            roles: detail.roles || []
          }
        } catch {
          return { ...user, roles: [] }
        }
      })
    )

    userList.value = usersWithRoles
  } catch (_error) {
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

const onPageChange = (page: number) => {
  pagination.current = page
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
      } catch (_error) {
        // 交给拦截器处理
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
  } catch (_error) {
    // 交给拦截器处理
  }
}

onMounted(() => {
  loadUserList()
  loadRoleOptions()
})
</script>

<style scoped>
:deep(.row-disabled) {
  opacity: 0.66;
}
</style>
