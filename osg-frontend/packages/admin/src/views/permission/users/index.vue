<template>
  <div class="users-page">
    <section class="page-header users-command">
      <div class="users-command__copy">
        <span class="users-command__eyebrow">Operator Ledger</span>
        <h2 class="page-title">
          后台用户管理
          <span class="page-title-en">Admin Users</span>
        </h2>
        <p class="page-sub subtitle">
          管理后台系统用户账号、角色结构与登录状态，让权限治理像一份可审计台账。
        </p>
      </div>

      <div class="users-command__actions">
        <div class="users-command__sync">
          <span class="mdi mdi-lightning-bolt-circle users-command__sync-icon" aria-hidden="true" />
          <div>
            <strong>{{ pagination.total }}</strong>
            <span>当前受管账号</span>
          </div>
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
    </section>

    <section class="users-summary">
      <article
        v-for="card in summaryCards"
        :key="card.key"
        :class="['users-summary__card', `users-summary__card--${card.tone}`]"
      >
        <div class="users-summary__label">{{ card.label }}</div>
        <div class="users-summary__value">{{ card.value }}</div>
        <div class="users-summary__meta">{{ card.meta }}</div>
      </article>
    </section>

    <section class="filter-bar users-filter-bar" data-field-name="后台用户管理页">
      <div class="users-filter-ribbon">
        <div class="users-filter-ribbon__lead">
          <span class="users-filter-ribbon__eyebrow">筛选台</span>
          <p>账号、角色、状态三项联动，快速缩小治理范围。</p>
        </div>

        <div class="users-filter-ribbon__fields">
          <div class="users-filter-ribbon__field users-filter-ribbon__field--search">
            <span class="users-filter-ribbon__field-label">关键词</span>
            <a-input
              v-model:value="searchParams.userName"
              class="filter-bar__control filter-bar__control--search"
              data-field-name="搜索框"
              placeholder="搜索用户名 / 姓名"
              allow-clear
              @pressEnter="handleSearch"
            />
          </div>
          <div class="users-filter-ribbon__field users-filter-ribbon__field--role">
            <span class="users-filter-ribbon__field-label">角色</span>
            <a-select
              v-model:value="searchParams.roleId"
              class="filter-bar__control filter-bar__control--role"
              data-field-name="角色"
              placeholder="全部角色"
              allow-clear
            >
              <a-select-option v-for="role in roleOptions" :key="role.roleId" :value="role.roleId">
                {{ role.roleName }}
              </a-select-option>
            </a-select>
          </div>
          <div class="users-filter-ribbon__field users-filter-ribbon__field--status">
            <span class="users-filter-ribbon__field-label">状态</span>
            <a-select
              v-model:value="searchParams.status"
              class="filter-bar__control filter-bar__control--status"
              data-field-name="状态"
              placeholder="全部状态"
              allow-clear
            >
              <a-select-option value="0">启用</a-select-option>
              <a-select-option value="1">禁用</a-select-option>
            </a-select>
          </div>
          <button type="button" class="permission-button permission-button--outline users-filter-ribbon__submit" @click="handleSearch">
            <i class="mdi mdi-magnify" aria-hidden="true"></i>
            <span>搜索</span>
          </button>
        </div>
      </div>
    </section>

    <section class="permission-card users-ledger">
      <div class="users-ledger__header">
        <div>
          <h3 class="users-ledger__title">账号治理台账</h3>
          <p class="users-ledger__subtitle">按身份、角色矩阵和活跃记录审阅后台账号。</p>
        </div>
        <div class="users-ledger__meta">
          <span>第 {{ pagination.current }} / {{ totalPages }} 页</span>
          <span>{{ roleOptions.length }} 个可分配角色</span>
        </div>
      </div>

      <div class="permission-card__body permission-card__body--flush">
        <table class="permission-table users-ledger__table">
          <thead>
            <tr>
              <th>ID</th>
              <th>账号身份</th>
              <th>联系方式</th>
              <th>角色矩阵</th>
              <th>账户状态</th>
              <th>活跃记录</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in userList"
              :key="record.userId"
              :class="{ 'permission-table__row--disabled': record.status === '1' }"
            >
              <td>
                <span class="users-ledger__id-pill">#{{ record.userId }}</span>
              </td>
              <td>
                <div class="users-identity">
                  <div
                    :class="[
                      'users-identity__avatar',
                      record.admin ? 'users-identity__avatar--system' : 'users-identity__avatar--default',
                    ]"
                  >
                    {{ getUserInitials(record) }}
                  </div>
                  <div class="users-identity__copy">
                    <strong>{{ record.nickName }}</strong>
                    <span>@{{ record.userName }}</span>
                    <em>{{ record.admin ? '系统账号' : '自定义账号' }}</em>
                  </div>
                </div>
              </td>
              <td>
                <div class="users-contact">
                  <span>{{ record.email || '-' }}</span>
                  <span>{{ record.phonenumber || '未填写手机号' }}</span>
                </div>
              </td>
              <td>
                <div class="permission-pill-group users-role-matrix">
                  <span
                    v-for="role in record.roles"
                    :key="role.roleId"
                    :class="['permission-pill', `permission-pill--${getRoleTagTone(role.roleKey)}`]"
                  >
                    {{ role.roleName }}
                  </span>
                  <span v-if="!record.roles?.length" class="permission-pill permission-pill--ghost">
                    未绑定角色
                  </span>
                </div>
              </td>
              <td>
                <div class="users-status">
                  <span
                    :class="[
                      'permission-pill',
                      record.status === '0' ? 'permission-pill--success' : 'permission-pill--danger',
                    ]"
                  >
                    {{ record.status === '0' ? '启用' : '禁用' }}
                  </span>
                  <span class="users-status__hint">
                    {{ record.status === '0' ? '可登录并执行授权操作' : '账号已被冻结' }}
                  </span>
                </div>
              </td>
              <td>
                <div class="users-activity">
                  <div class="users-activity__row">
                    <span>最后登录</span>
                    <strong>{{ formatLogin(record.loginDate) }}</strong>
                  </div>
                  <div class="users-activity__row">
                    <span>最近更新</span>
                    <strong>{{ formatUpdate(record.updateTime) }}</strong>
                  </div>
                </div>
              </td>
              <td>
                <div class="permission-actions users-actions">
                  <button
                    type="button"
                    class="permission-action surface-trigger surface-trigger--inline users-actions__button"
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
                    class="permission-action surface-trigger surface-trigger--inline users-actions__button"
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
                    class="permission-action permission-action--danger users-actions__button"
                    @click="handleDisable(record)"
                  >
                    禁用
                  </button>
                  <button
                    v-if="record.status === '1'"
                    type="button"
                    class="permission-action permission-action--success users-actions__button"
                    @click="handleEnable(record)"
                  >
                    启用
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!userList.length" class="users-ledger__empty-row">
              <td colspan="7">当前筛选条件下暂无后台用户</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

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
            roles: detail.roles || detail.data?.roles || []
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

<style scoped lang="scss">
.users-page {
  --ledger-ink: #1d2a44;
  --ledger-ink-soft: #31456d;
  --ledger-muted: #7083a3;
  --ledger-paper: #ffffff;
  --ledger-paper-strong: #ffffff;
  --ledger-line: rgba(54, 87, 145, 0.12);
  --ledger-shadow: 0 18px 48px rgba(34, 60, 118, 0.08);
  --ledger-copper: #4f74ff;
  --ledger-copper-soft: rgba(79, 116, 255, 0.12);
  --ledger-emerald: #2d7564;
  --ledger-emerald-soft: rgba(45, 117, 100, 0.1);
  --ledger-amber: #c49a33;
  --ledger-amber-soft: rgba(196, 154, 51, 0.12);
  --ledger-plum: #6e61c8;
  --ledger-plum-soft: rgba(110, 97, 200, 0.1);
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 12px 6px 0;
  background: transparent;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
}

.users-command {
  padding: 28px 30px;
  border-radius: 28px;
  border: 1px solid rgba(61, 102, 181, 0.12);
  background: linear-gradient(135deg, #ffffff 0%, #f5f9ff 58%, #eef4ff 100%);
  box-shadow: var(--ledger-shadow);
  color: var(--ledger-ink);
}

.users-command__copy {
  max-width: 720px;
}

.users-command__eyebrow {
  display: inline-flex;
  margin-bottom: 10px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(79, 116, 255, 0.08);
  color: var(--ledger-copper);
  font-family: 'IBM Plex Mono', 'SFMono-Regular', 'Consolas', monospace;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.page-title {
  margin: 0;
  color: var(--ledger-ink);
  font-family: 'Space Grotesk', 'Avenir Next', 'PingFang SC', sans-serif;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.05;
}

.page-title-en {
  margin-left: 10px;
  color: rgba(79, 116, 255, 0.72);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.page-sub {
  margin: 10px 0 0;
  max-width: 620px;
  color: var(--ledger-muted);
  font-size: 14px;
  line-height: 1.7;
}

.users-command__actions {
  display: flex;
  align-items: stretch;
  gap: 14px;
}

.users-command__sync {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 170px;
  padding: 12px 16px;
  border-radius: 20px;
  background: rgba(79, 116, 255, 0.06);
  border: 1px solid rgba(79, 116, 255, 0.08);

  strong {
    display: block;
    color: var(--ledger-ink);
    font-size: 20px;
    line-height: 1.1;
  }

  span {
    color: var(--ledger-muted);
    font-size: 12px;
    line-height: 1.4;
  }
}

.users-command__sync-icon {
  color: var(--ledger-copper);
  font-size: 22px;
}

.permission-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 14px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }

  &:not(:disabled):hover {
    transform: translateY(-1px);
  }

  &--primary {
    background: linear-gradient(135deg, #3f68ff, #6788ff);
    color: #fff;
    box-shadow: 0 16px 34px rgba(79, 116, 255, 0.22);
  }

  &--outline {
    background: #fff;
    border: 1px solid rgba(79, 116, 255, 0.14);
    color: var(--ledger-ink-soft);
  }

  &--small {
    min-height: 38px;
    padding: 8px 14px;
    border-radius: 12px;
    font-size: 12px;
  }
}

.users-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.users-summary__card {
  position: relative;
  padding: 18px 20px;
  border-radius: 22px;
  border: 1px solid rgba(79, 116, 255, 0.08);
  background: #fff;
  box-shadow: 0 14px 34px rgba(31, 59, 117, 0.06);

  &--ink {
    border-top: 4px solid rgba(29, 42, 68, 0.92);
  }

  &--emerald {
    border-top: 4px solid rgba(45, 117, 100, 0.88);
  }

  &--amber {
    border-top: 4px solid rgba(196, 154, 51, 0.88);
  }

  &--plum {
    border-top: 4px solid rgba(110, 97, 200, 0.9);
  }
}

.users-summary__label {
  color: var(--ledger-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.users-summary__value {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  color: var(--ledger-ink);
  font-family: 'Space Grotesk', 'Avenir Next', 'PingFang SC', sans-serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
}

.users-summary__meta {
  position: relative;
  z-index: 1;
  margin-top: 8px;
  color: var(--ledger-muted);
  font-size: 12px;
  line-height: 1.5;
}

.users-filter-bar {
  padding: 18px 20px;
  border-radius: 24px;
  border: 1px solid rgba(79, 116, 255, 0.08);
  background: #fff;
  box-shadow: 0 14px 34px rgba(31, 59, 117, 0.05);
}

.users-filter-ribbon {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}

.users-filter-ribbon__lead {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.users-filter-ribbon__eyebrow {
  display: inline-flex;
  width: fit-content;
  color: var(--ledger-copper);
  font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.users-filter-ribbon__lead p {
  color: var(--ledger-muted);
  font-size: 13px;
  line-height: 1.6;
}

.users-filter-ribbon__fields {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr) minmax(0, 1fr) 124px;
  gap: 12px;
  align-items: stretch;
}

.users-filter-ribbon__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 74px;
  padding: 10px 12px 12px;
  border-radius: 18px;
  border: 1px solid rgba(79, 116, 255, 0.1);
  background: linear-gradient(180deg, #fbfcff 0%, #f7f9fe 100%);
}

.users-filter-ribbon__field-label {
  color: var(--ledger-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.filter-bar__control {
  :deep(.ant-select-selector),
  :deep(.ant-input),
  :deep(.ant-input-affix-wrapper) {
    border-color: rgba(79, 116, 255, 0.08) !important;
    border-radius: 14px !important;
    min-height: 48px;
    height: 48px;
    background: #fff;
    box-shadow: none !important;
  }

  :deep(.ant-input) {
    padding-inline: 16px;
    line-height: 48px;
  }

  :deep(.ant-input-affix-wrapper) {
    padding-inline: 16px;
  }

  :deep(.ant-input-affix-wrapper input) {
    height: 100%;
  }

  :deep(.ant-select-single:not(.ant-select-customize-input) .ant-select-selector) {
    padding: 0 16px !important;
    display: flex;
    align-items: center;
  }

  width: 100%;
}

.users-filter-bar__submit {
  align-self: end;
  width: 100%;
  min-height: 74px;
  border-radius: 18px;
  background: linear-gradient(135deg, #ffffff, #f5f9ff);
  border: 1px solid rgba(79, 116, 255, 0.12);
}

.permission-card {
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(79, 116, 255, 0.08);
  background: var(--ledger-paper-strong);
  box-shadow: var(--ledger-shadow);
}

.users-ledger__header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  padding: 22px 24px 18px;
  border-bottom: 1px solid rgba(26, 34, 52, 0.08);
  background:
    linear-gradient(180deg, rgba(244, 248, 255, 0.98), rgba(255, 255, 255, 0.92));
}

.users-ledger__title {
  color: var(--ledger-ink);
  font-family: 'Space Grotesk', 'Avenir Next', 'PingFang SC', sans-serif;
  font-size: 20px;
  font-weight: 700;
}

.users-ledger__subtitle {
  margin-top: 4px;
  color: var(--ledger-muted);
  font-size: 13px;
}

.users-ledger__meta {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;

  span {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(79, 116, 255, 0.08);
    color: var(--ledger-ink-soft);
    font-size: 12px;
    font-weight: 600;
  }
}

.permission-card__body--flush {
  padding: 0;
}

.permission-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 18px 20px;
    border-bottom: 1px solid rgba(26, 34, 52, 0.08);
    text-align: left;
    vertical-align: middle;
  }

  th {
    background: rgba(244, 248, 255, 0.72);
    color: var(--ledger-muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  tbody tr {
    transition: background-color 0.2s ease;
  }

  tbody tr:hover {
    background: rgba(244, 248, 255, 0.72);
  }
}

.permission-table__row--disabled {
  opacity: 0.66;
}

.users-ledger__id-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 68px;
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(23, 32, 51, 0.06);
  border: 1px solid rgba(79, 116, 255, 0.08);
  color: var(--ledger-ink);
  font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
  font-size: 12px;
  font-weight: 700;
}

.users-identity {
  display: flex;
  align-items: center;
  gap: 14px;
}

.users-identity__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 16px;
  color: #fff;
  font-family: 'Space Grotesk', 'Avenir Next', sans-serif;
  font-size: 14px;
  font-weight: 700;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);

  &--system {
    background: linear-gradient(135deg, #8b5cf6, #5b4bc4);
  }

  &--default {
    background: linear-gradient(135deg, var(--ledger-ink-soft), #42577f);
  }
}

.users-identity__copy {
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong {
    color: var(--ledger-ink);
    font-size: 14px;
    font-weight: 700;
  }

  span {
    color: var(--ledger-muted);
    font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
    font-size: 12px;
  }

  em {
    color: #5174ff;
    font-size: 11px;
    font-style: normal;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
}

.users-contact,
.users-activity {
  display: flex;
  flex-direction: column;
  gap: 6px;

  span {
    color: var(--ledger-muted);
    font-size: 12px;
  }

  strong {
    color: var(--ledger-ink);
    font-size: 13px;
    font-weight: 600;
  }
}

.users-activity__row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.permission-pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.permission-pill {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;

  &--info {
    background: rgba(42, 96, 168, 0.12);
    color: #244e8c;
  }

  &--warning {
    background: rgba(179, 130, 31, 0.14);
    color: #936717;
  }

  &--success {
    background: rgba(45, 117, 100, 0.14);
    color: #216354;
  }

  &--danger {
    background: rgba(191, 74, 69, 0.14);
    color: #a13b38;
  }

  &--purple {
    background: rgba(96, 80, 168, 0.14);
    color: #5948a4;
  }

  &--ghost {
    background: rgba(79, 116, 255, 0.08);
    color: var(--ledger-muted);
  }
}

.users-status {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.users-status__hint {
  color: var(--ledger-muted);
  font-size: 12px;
  line-height: 1.5;
}

.users-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.users-actions__button {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(26, 34, 52, 0.08);
  background: rgba(255, 255, 255, 0.78);
}

.permission-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ledger-ink-soft);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;

  &:hover {
    border-color: rgba(79, 116, 255, 0.22);
    color: #4f74ff;
    background: rgba(79, 116, 255, 0.07);
  }

  &--danger {
    color: #b74d4a;
  }

  &--danger:hover {
    border-color: rgba(183, 77, 74, 0.22);
    background: rgba(183, 77, 74, 0.08);
  }

  &--success {
    color: var(--ledger-emerald);
  }

  &--success:hover {
    border-color: rgba(45, 117, 100, 0.24);
    background: rgba(45, 117, 100, 0.08);
  }
}

.users-ledger__empty-row td {
  padding: 34px 20px;
  color: var(--ledger-muted);
  text-align: center;
}

.users-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 6px 4px 0;
}

.users-pagination__total {
  color: var(--ledger-muted);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.users-pagination__controls {
  display: flex;
  gap: 8px;
}

@media (max-width: 1200px) {
  .users-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .users-filter-ribbon {
    grid-template-columns: 1fr;
  }

  .permission-table {
    display: block;
    overflow-x: auto;
  }
}

@media (max-width: 768px) {
  .users-page {
    padding: 6px 0 0;
  }

  .users-command {
    padding: 22px 20px;
    border-radius: 24px;
  }

  .page-header {
    flex-direction: column;
  }

  .users-command__actions {
    width: 100%;
    flex-direction: column;
  }

  .users-command__sync {
    width: 100%;
  }

  .users-summary {
    grid-template-columns: 1fr;
  }

  .users-filter-ribbon__fields {
    grid-template-columns: 1fr;
  }

  .users-pagination {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
