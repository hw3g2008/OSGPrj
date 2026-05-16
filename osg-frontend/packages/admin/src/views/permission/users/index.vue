<template>
  <div class="osg-page">
    <PageHeader
      :title-zh="t('admin.permission.users.pageTitle')"
      title-en="Admin Users"
    >
      <template #actions>
        <a-statistic :title="t('admin.permission.users.managedAccountTitle')" :value="pagination.total" style="margin-right: 16px" />
        <a-button
          type="primary"
          data-surface-trigger="modal-add-admin"
          @click="handleAdd"
        >
          <template #icon><PlusOutlined /></template>
          {{ t('admin.permission.users.addButton') }}
        </a-button>
      </template>
    </PageHeader>

    <a-card :bordered="false" style="box-shadow: var(--card-shadow)">
      <a-form layout="inline" data-field-name="后台用户管理页"><!-- i18n-skip-line: playwright selector -->
        <a-form-item :label="t('admin.permission.users.filterKeywordLabel')">
          <a-input
            v-model:value="searchParams.userName"
            :placeholder="t('admin.permission.users.filterKeywordPlaceholder')"
            allow-clear
            style="width: 200px"
            @pressEnter="handleSearch"
            data-field-name="搜索框" /><!-- i18n-skip-line: playwright selector -->
        </a-form-item>
        <a-form-item :label="t('admin.permission.users.filterRoleLabel')">
          <a-select
            v-model:value="searchParams.roleId"
            :placeholder="t('admin.permission.users.filterRolePlaceholder')"
            allow-clear
            style="width: 160px"
            data-field-name="角色"><!-- i18n-skip-line: playwright selector -->
            <a-select-option v-for="role in roleOptions" :key="role.roleId" :value="role.roleId">
              {{ role.roleName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="t('admin.permission.users.filterStatusLabel')">
          <a-select
            v-model:value="searchParams.status"
            :placeholder="t('admin.permission.users.filterStatusPlaceholder')"
            allow-clear
            style="width: 120px"
            data-field-name="状态"><!-- i18n-skip-line: playwright selector -->
            <a-select-option value="0">{{ t('admin.permission.users.filterStatusEnabled') }}</a-select-option>
            <a-select-option value="1">{{ t('admin.permission.users.filterStatusDisabled') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="handleSearch">
            <template #icon><SearchOutlined /></template>
            {{ t('admin.permission.users.filterSearch') }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false" style="box-shadow: var(--card-shadow)">
      <template #title>{{ t('admin.permission.users.cardTitle') }}</template>
      <template #extra>
        <a-space>
          <a-tag>{{ t('admin.permission.users.pageInfo', { current: pagination.current, total: totalPages }) }}</a-tag>
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
          showTotal: (total: number) => t('admin.permission.users.totalRecords', { total }),
          onChange: onPageChange,
        }"
        :row-class-name="(record: any) => (record.status === '1' ? 'row-disabled' : '')"
        :locale="{ emptyText: t('admin.permission.users.empty') }"
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
                <div style="font-size: 11px; color: var(--primary)">{{ record.admin ? t('admin.permission.users.systemAccount') : t('admin.permission.users.customAccount') }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'contact'">
            <div>{{ record.email || '-' }}</div>
            <div style="font-size: 12px; color: var(--muted)">{{ record.phonenumber || t('admin.permission.users.noPhone') }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'roles'">
            <a-tag
              v-for="role in record.roles"
              :key="role.roleId"
              :color="getRoleTagTone(role.roleKey) === 'purple' ? 'purple' : getRoleTagTone(role.roleKey) === 'success' ? 'green' : getRoleTagTone(role.roleKey) === 'warning' ? 'orange' : 'blue'"
            >
              {{ role.roleName }}
            </a-tag>
            <a-tag v-if="!record.roles?.length" color="default">{{ t('admin.permission.users.noRole') }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="record.status === '0' ? 'success' : 'error'">
              {{ record.status === '0' ? t('admin.permission.users.status.enabled') : t('admin.permission.users.status.disabled') }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'activity'">
            <div>{{ t('admin.permission.users.lastLogin', { time: formatLogin(record.loginDate) }) }}</div>
            <div>{{ t('admin.permission.users.lastUpdate', { time: formatUpdate(record.updateTime) }) }}</div>
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
              {{ t('admin.permission.users.action.edit') }}
            </a-button>
            <a-button
              v-if="record.status === '0' && !record.admin"
              type="link"
              size="small"
              data-surface-trigger="modal-reset-password"
              data-surface-sample="modal-reset-password"
              :data-surface-sample-key="record.userName"
              @click="handleResetPwd(record)"
            >
              {{ t('admin.permission.users.action.resetPwd') }}
            </a-button>
            <a-button
              v-if="record.status === '0' && !record.admin"
              type="link"
              size="small"
              danger
              @click="handleDisable(record)"
            >
              {{ t('admin.permission.users.action.disable') }}
            </a-button>
            <a-button
              v-if="record.status === '1'"
              type="link"
              size="small"
              @click="handleEnable(record)"
            >
              {{ t('admin.permission.users.action.enable') }}
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
import { useI18n } from 'vue-i18n'
import { message, Modal } from 'ant-design-vue'
import { getUserList, getUserDetail, changeUserStatus, getRoleOptions as fetchRoleOptions } from '@/api/user'
import UserModal from './components/UserModal.vue'
import ResetPwdModal from './components/ResetPwdModal.vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

const { t } = useI18n()

const userColumns = computed(() => [
  { title: t('admin.permission.users.columns.id'), dataIndex: 'userId', key: 'userId', width: 80, fixed: 'left' as const },
  { title: t('admin.permission.users.columns.identity'), dataIndex: 'identity', key: 'identity' },
  { title: t('admin.permission.users.columns.contact'), dataIndex: 'contact', key: 'contact' },
  { title: t('admin.permission.users.columns.roles'), dataIndex: 'roles', key: 'roles' },
  { title: t('admin.permission.users.columns.status'), dataIndex: 'status', key: 'status', width: 120 },
  { title: t('admin.permission.users.columns.activity'), dataIndex: 'activity', key: 'activity' },
  { title: t('admin.permission.users.columns.action'), dataIndex: 'action', key: 'action', width: 200, fixed: 'right' as const },
])

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

const getUserInitials = (record: any) => {
  const base = String(record?.nickName || record?.userName || 'AD').trim()
  return base.slice(0, 2).toUpperCase()
}

const formatLogin = (value?: string) => {
  return value ? dayjs(value).format('MM/DD/YYYY HH:mm') : t('admin.permission.users.neverLogin')
}

const formatUpdate = (value?: string) => {
  return value ? dayjs(value).format('MM/DD/YYYY') : t('admin.permission.users.noUpdate')
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
    message.error(t('admin.permission.users.messages.loadError'))
  }
}

const loadRoleOptions = async () => {
  try {
    const res = await fetchRoleOptions()
    roleOptions.value = res || []
  } catch (error) {
    console.error('Failed to load role options', error)
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
    title: t('admin.permission.users.messages.disableConfirmTitle'),
    content: t('admin.permission.users.messages.disableConfirmContent'),
    okText: t('admin.permission.users.messages.confirmOk'),
    cancelText: t('admin.permission.users.messages.confirmCancel'),
    onOk: async () => {
      try {
        await changeUserStatus({ userId: record.userId, status: '1' }, {
          customErrorMessage: t('admin.permission.users.messages.disableError')
        })
        message.success(t('admin.permission.users.messages.disabledSuccess'))
        loadUserList()
      } catch (_error) {
        // i18n-skip-line: dev comment — 交给拦截器处理
      }
    }
  })
}

const handleEnable = async (record: any) => {
  try {
    await changeUserStatus({ userId: record.userId, status: '0' }, {
      customErrorMessage: t('admin.permission.users.messages.enableError')
    })
    message.success(t('admin.permission.users.messages.enabledSuccess'))
    loadUserList()
  } catch (_error) {
    // i18n-skip-line: dev comment — 交给拦截器处理
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
