<template>
  <div class="osg-page">
    <PageHeader
      :title-zh="$t('backend_user_management')"
      title-en="Admin Users"
      :description="`${$t('manage_backend_user_accounts_role_struct')}。`"
    >
      <template #actions>
        <a-statistic :title="$t('managed_accounts')" :value="pagination.total" style="margin-right: 16px" />
        <a-button
          type="primary"
          data-surface-trigger="modal-add-admin"
          @click="handleAdd"
        >
          <template #icon><PlusOutlined /></template>
          {{ $t('add_user') }}
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
      <a-form layout="inline" :data-field-name="$t('backend_user_management_2')">
        <a-form-item :label="$t('keyword')">
          <a-input
            v-model:value="searchParams.userName"
            :data-field-name="$t('search_2')"
            :placeholder="$t('search_username_name')"
            allow-clear
            style="width: 200px"
            @pressEnter="handleSearch"
          />
        </a-form-item>
        <a-form-item :label="$t('role')">
          <a-select
            v-model:value="searchParams.roleId"
            :data-field-name="$t('role')"
            :placeholder="$t('all_roles')"
            allow-clear
            style="width: 160px"
          >
            <a-select-option v-for="role in roleOptions" :key="role.roleId" :value="role.roleId">
              {{ role.roleName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('status')">
          <a-select
            v-model:value="searchParams.status"
            :data-field-name="$t('status')"
            :placeholder="$t('all_status')"
            allow-clear
            style="width: 120px"
          >
            <a-select-option value="0">{{ $t('enable') }}</a-select-option>
            <a-select-option value="1">{{ $t('disable') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="handleSearch">
            <template #icon><SearchOutlined /></template>
            {{ $t('search') }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false" style="box-shadow: var(--card-shadow)">
      <template #title>{{ $t('account_governance_ledger') }}</template>
      <template #extra>
        <a-space>
          <a-tag>{{ $t('current_page_with_total', { current: pagination.current, total: totalPages }) }}</a-tag>
          <a-tag>{{ roleOptions.length }} {{ $t('assignable_roles') }}</a-tag>
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
          showTotal: (total: number) => `${t('in_total')} ${total} ${t('records')}`,
          onChange: onPageChange,
        }"
        :row-class-name="(record: any) => (record.status === '1' ? 'row-disabled' : '')"
        :locale="{ emptyText: $t('no_backend_users_found_under_current_fil') }"
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
                <div style="font-size: 11px; color: var(--primary)">{{ record.admin ? $t('system_account') : $t('custom_account') }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'contact'">
            <div>{{ record.email || '-' }}</div>
            <div style="font-size: 12px; color: var(--muted)">{{ record.phonenumber || $t('phone_number_not_provided') }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'roles'">
            <a-tag
              v-for="role in record.roles"
              :key="role.roleId"
              :color="getRoleTagTone(role.roleKey) === 'purple' ? 'purple' : getRoleTagTone(role.roleKey) === 'success' ? 'green' : getRoleTagTone(role.roleKey) === 'warning' ? 'orange' : 'blue'"
            >
              {{ role.roleName }}
            </a-tag>
            <a-tag v-if="!record.roles?.length" color="default">{{ $t('no_role_assigned') }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="record.status === '0' ? 'success' : 'error'">
              {{ record.status === '0' ? $t('enable') : $t('disable') }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'activity'">
            <div>{{ $t('last_login') }}：{{ formatLogin(record.loginDate) }}</div>
            <div>{{ $t('last_updated') }}：{{ formatUpdate(record.updateTime) }}</div>
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
              {{ $t('edit') }}
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
              {{ $t('reset_password') }}
            </a-button>
            <a-button
              v-if="record.status === '0' && !record.admin"
              type="link"
              size="small"
              danger
              @click="handleDisable(record)"
            >
              {{ $t('disable') }}
            </a-button>
            <a-button
              v-if="record.status === '1'"
              type="link"
              size="small"
              @click="handleEnable(record)"
            >
              {{ $t('enable') }}
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
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const userColumns = [
  { title: 'ID', dataIndex: 'userId', key: 'userId', width: 80 },
  { title: t('account_identity'), dataIndex: 'identity', key: 'identity' },
  { title: t('contact_info'), dataIndex: 'contact', key: 'contact' },
  { title: t('role_matrix'), dataIndex: 'roles', key: 'roles' },
  { title: t('account_status'), dataIndex: 'status', key: 'status', width: 120 },
  { title: t('activity_records'), dataIndex: 'activity', key: 'activity' },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 200 },
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
      label: t('total_ledger_entries'),
      value: pagination.total,
      meta: t('current_page_in_sync_with_all_records')
    },
    {
      key: 'active',
      tone: 'emerald',
      label: t('active_accounts'),
      value: activeCount,
      meta: t('can_log_in_and_perform_operations_normal')
    },
    {
      key: 'disabled',
      tone: 'amber',
      label: t('frozen_accounts'),
      value: disabledCount,
      meta: t('requires_manual_review_before_re_enablin')
    },
    {
      key: 'privileged',
      tone: 'plum',
      label: t('high_privilege_accounts'),
      value: privilegedCount,
      meta: t('includes_system_accounts_and_core_govern')
    }
  ]
})

const getUserInitials = (record: any) => {
  const base = String(record?.nickName || record?.userName || 'AD').trim()
  return base.slice(0, 2).toUpperCase()
}

const formatLogin = (value?: string) => {
  return value ? dayjs(value).format('MM/DD/YYYY HH:mm') : t('never_logged_in')
}

const formatUpdate = (value?: string) => {
  return value ? dayjs(value).format('MM/DD/YYYY') : t('no_changes')
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
    message.error(t('failed_to_load_user_list'))
  }
}

const loadRoleOptions = async () => {
  try {
    const res = await fetchRoleOptions()
    roleOptions.value = res || []
  } catch (error) {
    console.error(t('failed_to_load_role_options'), error)
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
    title: t('confirm_disable'),
    content: t('confirm_disable_user_content'),
    okText: t('ok'),
    cancelText: t('cancel'),
    onOk: async () => {
      try {
        await changeUserStatus({ userId: record.userId, status: '1' }, {
          customErrorMessage: t('failed_to_disable_user_please_try_again')
        })
        message.success(t('user_disabled'))
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
      customErrorMessage: t('failed_to_enable_user_please_try_again')
    })
    message.success(t('user_enabled'))
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

