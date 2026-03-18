<template>
  <div class="staff-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">
          导师列表
          <span class="page-title-en">Mentor List</span>
        </h2>
        <p class="page-sub subtitle">管理导师和班主任账户，录入信息开通账号</p>
      </div>
      <div class="page-header__actions">
        <button type="button" class="permission-button permission-button--primary" @click="openCreateModal">
          <i class="mdi mdi-plus" aria-hidden="true"></i>
          <span>新增导师</span>
        </button>
      </div>
    </div>

    <section class="permission-card">
      <div v-if="pendingReviewCount > 0" class="staff-banner">
        <div class="staff-banner__icon">
          <i class="mdi mdi-account-edit" aria-hidden="true"></i>
        </div>
        <div class="staff-banner__copy">
          <strong>导师信息变更待审核</strong>
          <span>当前有 {{ pendingReviewCount }} 位导师的资料变更待处理</span>
        </div>
        <button type="button" class="staff-banner__action" @click="handlePendingReviewEntry">
          <i class="mdi mdi-eye" aria-hidden="true"></i>
          <span>立即处理</span>
        </button>
      </div>

      <div class="staff-filters">
        <label class="staff-field">
          <span class="staff-field__label">姓名 / ID</span>
          <input v-model="filters.staffName" type="text" class="staff-input" placeholder="搜索姓名或 ID" />
        </label>
        <label class="staff-field">
          <span class="staff-field__label">类型</span>
          <select v-model="filters.staffType" class="staff-select">
            <option value="">全部</option>
            <option value="lead_mentor">班主任</option>
            <option value="mentor">导师</option>
          </select>
        </label>
        <label class="staff-field">
          <span class="staff-field__label">主攻方向</span>
          <select v-model="filters.majorDirection" class="staff-select">
            <option value="">全部</option>
            <option v-for="direction in majorDirectionOptions" :key="direction" :value="direction">{{ direction }}</option>
          </select>
        </label>
        <label class="staff-field">
          <span class="staff-field__label">状态</span>
          <select v-model="filters.accountStatus" class="staff-select">
            <option value="">全部</option>
            <option value="0">激活</option>
            <option value="1">禁用</option>
          </select>
        </label>
        <div class="staff-filter-actions">
          <button type="button" class="permission-button permission-button--primary" @click="handleSearch">搜索</button>
          <button type="button" class="permission-button permission-button--outline" @click="handleReset">清空</button>
        </div>
      </div>

      <div class="staff-tabs" role="tablist" aria-label="导师列表类型切换">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          :class="['staff-tabs__tab', { 'staff-tabs__tab--active': selectedTab === tab.key }]"
          :aria-selected="selectedTab === tab.key"
          @click="selectedTab = tab.key"
        >
          <span>{{ tab.label }}</span>
          <span class="staff-tabs__count">{{ tab.key === 'normal' ? normalCount : blacklistedCount }}</span>
        </button>
      </div>

      <div class="permission-card__body permission-card__body--flush">
        <table class="permission-table staff-table">
          <thead>
            <tr>
              <th v-for="column in staffColumns" :key="column.key">{{ column.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in visibleRows" :key="row.staffId" :class="{ 'staff-row--frozen': row.accountStatus === '1' }">
              <!-- ID -->
              <td>{{ row.staffId }}</td>

              <!-- 英文名 -->
              <td>
                <button type="button" class="staff-name" @click="openStaffDetail(row)">
                  {{ row.staffName }}
                </button>
              </td>

              <!-- 联系方式 -->
              <td>
                <div class="staff-cell-block">
                  <div class="staff-contact-line">{{ row.email || '-' }}</div>
                  <div class="staff-contact-line">{{ row.phone || '-' }}</div>
                </div>
              </td>

              <!-- 类型 -->
              <td>
                <span :class="['staff-pill', `staff-pill--${getTypeTone(row.staffType)}`]">
                  {{ formatType(row.staffType) }}
                </span>
              </td>

              <!-- 主攻方向 -->
              <td>
                <span :class="['staff-pill staff-pill--small', `staff-pill--direction-${getDirectionTone(row.majorDirection)}`]">
                  {{ row.majorDirection || '-' }}
                </span>
              </td>

              <!-- 子方向 -->
              <td>{{ row.subDirection || '-' }}</td>

              <!-- 所属地区 -->
              <td>
                <div class="staff-cell-block">
                  <div class="staff-region-main">
                    <span class="staff-region-emoji">{{ getRegionEmoji(row.region) }}</span>
                    <span class="staff-region-name">{{ row.region || '-' }}</span>
                  </div>
                  <div class="staff-city-line">{{ row.city || '-' }}</div>
                </div>
              </td>

              <!-- 课单价 -->
              <td>
                <div class="staff-work-value staff-work-value--rate">{{ formatHourlyRate(row.hourlyRate) }}</div>
              </td>

              <!-- 学员数 -->
              <td>
                <button type="button" class="staff-work-value staff-work-value--count" @click="openMentorStudents(row)">
                  {{ formatStudentCount(row.studentCount) }}
                </button>
              </td>

              <!-- 账号状态 -->
              <td>
                <div class="staff-status-stack">
                  <span :class="['tag', getStatusClass(row.accountStatus)]">
                    {{ formatStatus(row.accountStatus) }}
                  </span>
                  <span class="staff-note">{{ getStatusNote(row) }}</span>
                </div>
              </td>

              <!-- 操作 -->
              <td>
                <div class="staff-action-row">
                  <button type="button" class="staff-action-link" @click="openStaffDetail(row)">
                    详情
                  </button>
                  <span class="staff-action-divider"></span>
                  <a-dropdown trigger="click" placement="bottomRight">
                    <button type="button" class="staff-action-link">
                      更多
                    </button>
                    <template #overlay>
                      <a-menu class="staff-action-menu" @click="({ key }) => handleActionSelect(key as StaffActionKey, row)">
                        <a-menu-item v-for="action in getActionItems(row)" :key="action.key">
                          <span :class="['staff-action-menu__item', action.tone ? `staff-action-menu__item--${action.tone}` : '']">
                            {{ action.label }}
                          </span>
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                </div>
              </td>
            </tr>
            <tr v-if="!visibleRows.length">
              <td :colspan="staffColumns.length" class="staff-empty">{{ emptyStateText }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="staff-pagination">
      <span>共 {{ selectedTab === 'normal' ? normalCount : blacklistedCount }} 条记录</span>
      <div class="staff-pagination__controls">
        <button
          type="button"
          class="permission-button permission-button--outline permission-button--small"
          :disabled="pagination.current <= 1"
          @click="pagination.current -= 1"
        >
          上一页
        </button>
        <button type="button" class="permission-button permission-button--primary permission-button--small">
          {{ pagination.current }}
        </button>
        <button
          type="button"
          class="permission-button permission-button--outline permission-button--small"
          :disabled="!hasNext"
          @click="pagination.current += 1"
        >
          下一页
        </button>
      </div>
    </div>

    <MentorStudentsModal
      v-model:visible="studentsModalVisible"
      :staff-id="selectedStaff?.staffId ?? null"
      :staff-name="selectedStaff?.staffName"
    />
    <StaffDetailModal
      v-model:visible="detailModalVisible"
      :staff-id="selectedStaff?.staffId ?? null"
      :staff-name="selectedStaff?.staffName"
    />
    <StaffStatusModal
      v-model:visible="statusModalVisible"
      :action="statusAction"
      :staff-name="selectedStaff?.staffName"
      :submitting="statusSubmitting"
      @submit="handleStatusSubmit"
    />
    <StaffFormModal
      v-model:visible="formModalVisible"
      :staff="editingStaff"
      :submitting="formSubmitting"
      @submit="handleFormSubmit"
    />
    <OverlaySurfaceModal
      :open="resetPasswordVisible"
      surface-id="staff-reset-password-modal"
      width="480px"
      @cancel="closeResetPasswordModal"
    >
      <template #title>
        <span class="staff-reset-password-modal__title">重置密码成功</span>
      </template>

      <div class="staff-reset-password-modal__body">
        <p>登录账号：{{ resetPasswordResult?.loginAccount || '-' }}</p>
        <p>默认密码：{{ resetPasswordResult?.defaultPassword || '-' }}</p>
      </div>

      <template #footer>
        <button type="button" class="permission-button permission-button--primary" @click="closeResetPasswordModal">
          知道了
        </button>
      </template>
    </OverlaySurfaceModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  createStaff,
  getStaffList,
  resetStaffPassword,
  updateStaff,
  type ResetStaffPasswordResult,
  type StaffListItem,
  type StaffPayload
} from '@osg/shared/api/admin/staff'
import { http } from '@osg/shared/utils/request'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import MentorStudentsModal from './components/MentorStudentsModal.vue'
import StaffDetailModal from './components/StaffDetailModal.vue'
import StaffFormModal from './components/StaffFormModal.vue'
import StaffStatusModal from './components/StaffStatusModal.vue'
import { staffColumns } from './columns'

type StaffTabKey = 'normal' | 'blacklist'
type StaffActionKey = 'detail' | 'edit' | 'resetPassword' | 'freeze' | 'restore' | 'blacklist' | 'remove'
type StatusAction = Extract<StaffActionKey, 'freeze' | 'restore' | 'blacklist' | 'remove'>

const tabs: { key: StaffTabKey; label: string }[] = [
  { key: 'normal', label: '正常列表' },
  { key: 'blacklist', label: '黑名单列表' }
]

const rows = ref<StaffListItem[]>([])
const pendingReviewCount = ref(0)
const selectedTab = ref<StaffTabKey>('normal')
const studentsModalVisible = ref(false)
const detailModalVisible = ref(false)
const statusModalVisible = ref(false)
const statusSubmitting = ref(false)
const formModalVisible = ref(false)
const formSubmitting = ref(false)
const resetPasswordVisible = ref(false)
const statusAction = ref<StatusAction>('freeze')
const selectedStaff = ref<StaffListItem | null>(null)
const editingStaff = ref<StaffListItem | null>(null)
const resetPasswordResult = ref<ResetStaffPasswordResult | null>(null)

const filters = reactive({
  staffName: '',
  staffType: '',
  majorDirection: '',
  accountStatus: ''
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

const visibleRows = computed(() =>
  rows.value.filter((row) => (selectedTab.value === 'blacklist' ? isBlacklisted(row) : !isBlacklisted(row)))
)

const blacklistedCount = computed(() => rows.value.filter((row) => isBlacklisted(row)).length)
const normalCount = computed(() => Math.max(pagination.total - blacklistedCount.value, 0))
const emptyStateText = computed(() => (selectedTab.value === 'blacklist' ? '暂无黑名单导师' : '暂无导师数据'))
const hasNext = computed(() => pagination.current * pagination.pageSize < pagination.total)
const majorDirectionOptions = computed(() =>
  Array.from(new Set(rows.value.map((row) => row.majorDirection).filter((value): value is string => Boolean(value))))
)

const loadRows = async () => {
  try {
    const response = await getStaffList({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      staffName: filters.staffName || undefined,
      staffType: filters.staffType || undefined,
      majorDirection: filters.majorDirection || undefined,
      accountStatus: filters.accountStatus || undefined
    })
    rows.value = response.rows || []
    pagination.total = response.total || 0
    pendingReviewCount.value = response.pendingReviewCount || 0
  } catch (error) {
    console.error(error)
    message.error('导师列表加载失败')
  }
}

watch(
  () => pagination.current,
  () => {
    void loadRows()
  }
)

onMounted(() => {
  void loadRows()
})

const handleSearch = () => {
  pagination.current = 1
  void loadRows()
}

const handleReset = () => {
  filters.staffName = ''
  filters.staffType = ''
  filters.majorDirection = ''
  filters.accountStatus = ''
  selectedTab.value = 'normal'
  pagination.current = 1
  void loadRows()
}

const handlePendingReviewEntry = () => {
  const target = visibleRows.value[0]
  if (!target) {
    message.info('当前没有可处理的导师记录')
    return
  }
  selectedStaff.value = target
  detailModalVisible.value = true
}

const openMentorStudents = (row: StaffListItem) => {
  selectedStaff.value = row
  studentsModalVisible.value = true
}

const openCreateModal = () => {
  editingStaff.value = null
  formModalVisible.value = true
}

const openEditModal = (row: StaffListItem) => {
  editingStaff.value = { ...row }
  formModalVisible.value = true
}

const getActionItems = (row: StaffListItem) => {
  const isFrozen = row.accountStatus === '1'
  const isInBlacklist = isBlacklisted(row)
  return [
    { key: 'detail', label: '详情' },
    { key: 'edit', label: '编辑' },
    { key: 'resetPassword', label: '重置密码' },
    {
      key: isFrozen ? 'restore' : 'freeze',
      label: isFrozen ? '解冻' : '禁用',
      tone: isFrozen ? 'success' : 'warning'
    },
    {
      key: isInBlacklist ? 'remove' : 'blacklist',
      label: isInBlacklist ? '移出黑名单' : '加入黑名单',
      tone: 'danger'
    }
  ] as const
}

const handleActionSelect = (action: StaffActionKey, row: StaffListItem) => {
  selectedStaff.value = row
  if (action === 'detail') {
    detailModalVisible.value = true
    return
  }
  if (action === 'edit') {
    openEditModal(row)
    return
  }
  if (action === 'resetPassword') {
    void handleResetPassword(row)
    return
  }

  statusAction.value = action
  statusModalVisible.value = true
}

const handleStatusSubmit = async (payload: { action: StatusAction; reason?: string; remark?: string }) => {
  if (!selectedStaff.value) {
    return
  }

  statusSubmitting.value = true
  try {
    if (payload.action === 'freeze' || payload.action === 'restore') {
      await http.put('/admin/staff/status', {
        staffId: selectedStaff.value.staffId,
        action: payload.action
      })
    } else {
      await http.post('/admin/staff/blacklist', {
        staffId: selectedStaff.value.staffId,
        action: payload.action,
        reason: payload.reason,
        remark: payload.remark
      })
    }

    message.success(resolveSuccessMessage(payload.action))
    statusModalVisible.value = false
    await loadRows()
  } catch (error) {
    console.error(error)
  } finally {
    statusSubmitting.value = false
  }
}

const handleResetPassword = async (row: StaffListItem) => {
  const result = await resetStaffPassword(row.staffId)
  resetPasswordResult.value = result
  resetPasswordVisible.value = true
}

const handleFormSubmit = async (payload: StaffPayload) => {
  formSubmitting.value = true
  try {
    if (payload.staffId) {
      await updateStaff(payload)
      message.success('导师信息已更新')
    } else {
      await createStaff(payload)
      message.success('导师已新增')
    }
    formModalVisible.value = false
    editingStaff.value = null
    pagination.current = 1
    await loadRows()
  } catch (error) {
    console.error(error)
    message.error(payload.staffId ? '导师更新失败' : '导师新增失败')
  } finally {
    formSubmitting.value = false
  }
}

const isBlacklisted = (row: StaffListItem) => Boolean(row.isBlacklisted)

const formatType = (staffType?: string) => {
  return staffType === 'lead_mentor' ? '班主任' : '导师'
}

const getTypeTone = (staffType?: string) => {
  return staffType === 'lead_mentor' ? 'success' : 'info'
}

const getDirectionTone = (direction?: string) => {
  if (direction?.includes('量化')) {
    return 'quant'
  }
  if (direction?.includes('咨询')) {
    return 'consulting'
  }
  if (direction?.includes('科技')) {
    return 'tech'
  }
  return 'finance'
}

const getRegionEmoji = (region?: string) => {
  if (region?.includes('北美')) {
    return '🌎'
  }
  if (region?.includes('欧洲')) {
    return '🌍'
  }
  if (region?.includes('亚太')) {
    return '🌏'
  }
  return '🇨🇳'
}

const formatHourlyRate = (hourlyRate?: number) => {
  if (hourlyRate == null) {
    return '-'
  }
  return `￥${hourlyRate}/h`
}

const formatStudentCount = (studentCount?: number) => {
  return `${studentCount ?? 0} 学员`
}

const formatStatus = (accountStatus?: string) => {
  return accountStatus === '1' ? '冻结' : '正常'
}

const getStatusTone = (accountStatus?: string) => {
  return accountStatus === '1' ? 'warning' : 'success'
}

const getStatusClass = (accountStatus?: string) => {
  return accountStatus === '1' ? 'warning' : 'success'
}

const getStatusNote = (row: StaffListItem) => {
  if (row.accountStatus === '1') {
    return '账号已禁用'
  }
  if (isBlacklisted(row)) {
    return '已加入黑名单'
  }
  return '账号正常'
}

const openStaffDetail = (row: StaffListItem) => {
  selectedStaff.value = row
  detailModalVisible.value = true
}

const resolveSuccessMessage = (action: StatusAction) => {
  if (action === 'freeze') {
    return '导师账号已禁用'
  }
  if (action === 'restore') {
    return '导师账号已解冻'
  }
  if (action === 'blacklist') {
    return '导师已加入黑名单'
  }
  return '导师已移出黑名单'
}

const closeResetPasswordModal = () => {
  resetPasswordVisible.value = false
  resetPasswordResult.value = null
}
</script>

<style scoped lang="scss">
.staff-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.permission-card__body--flush {
  overflow-x: auto;
}

.staff-table {
  width: 100%;
  table-layout: auto;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    padding: 16px 12px;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
    vertical-align: top;
    font-size: 12px;
    line-height: 1.5;
  }

  thead th {
    color: var(--text2);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    padding-top: 14px;
    padding-bottom: 14px;
    background: #f8fafc;
    vertical-align: middle;
  }

  tbody tr:hover {
    background: #f9fafb;
  }
}

.staff-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  padding: 16px 18px;
  border: 2px solid #3b82f6;
  border-radius: 20px;
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
}

.staff-banner__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #3b82f6;
  color: #ffffff;
  font-size: 22px;
}

.staff-banner__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #1e3a8a;
}

.staff-banner__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 10px;
  padding: 10px 18px;
  background: #3b82f6;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.staff-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.staff-field {
  display: flex;
  flex: 0 0 auto;
}

.staff-field__label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.staff-input,
.staff-select {
  min-height: 40px;
  border: 1px solid #dbe3f0;
  border-radius: 14px;
  padding: 0 14px;
  background: #ffffff;
  color: var(--text);
  font-size: 13px;
}

.staff-input {
  width: 200px;
}

.staff-select {
  width: 140px;
}

.staff-filter-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.staff-tabs {
  display: inline-flex;
  gap: 10px;
  margin-bottom: 18px;
}

.staff-tabs__tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #dbe3f0;
  border-radius: 999px;
  padding: 10px 16px;
  background: #ffffff;
  color: var(--text);
  font-weight: 600;
}

.staff-tabs__tab--active {
  border-color: var(--primary);
  background: #eff6ff;
  color: var(--primary-dark);
}

.staff-tabs__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  border-radius: 999px;
  padding: 0 8px;
  background: rgba(37, 99, 235, 0.12);
  font-size: 12px;
}

.staff-row--frozen {
  opacity: 0.68;
}

// 新的分组单元格样式
.staff-cell-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.staff-meta-list {
  gap: 8px;
}

.staff-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.staff-name {
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--primary);
  font-weight: 600;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  text-decoration: none;

  &:hover {
    color: var(--primary-dark);
    text-decoration: underline;
  }
}

.staff-id-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f3f4f6;
  color: var(--text2);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.3;
}

.staff-contact-line {
  color: var(--text2);
  font-size: 12px;
  line-height: 1.4;
}

.staff-contact-item {
  word-break: break-word;
}

.staff-pair-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.staff-pair-label {
  color: var(--muted);
  font-size: 11px;
  flex-shrink: 0;
}

.staff-pair-value {
  color: var(--text);
  font-weight: 500;
  word-break: break-word;
}

.staff-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  width: fit-content;
}

.staff-pill--small {
  padding: 3px 10px;
  font-size: 11px;
}

.staff-pill--lead_mentor {
  background: #dbeafe;
  color: var(--primary-dark);
}

.staff-pill--mentor {
  background: #e0e7ff;
  color: #4338ca;
}

.staff-pill--direction-finance {
  background: #e0e7ff;
  color: #4338ca;
}

.staff-pill--direction-consulting {
  background: #dbeafe;
  color: var(--primary-dark);
}

.staff-pill--direction-tech {
  background: #fef3c7;
  color: #92400e;
}

.staff-pill--direction-quant {
  background: #ede9fe;
  color: #4F46E5;
}

.staff-region-main {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--text);
  font-size: 13px;
}

.staff-region-emoji {
  font-size: 16px;
}

.staff-region-name {
  font-weight: 600;
}

.staff-city-line {
  color: var(--text2);
  font-size: 12px;
  line-height: 1.4;
}

.staff-work-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.staff-work-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.staff-work-label {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.3;
}

.staff-work-value {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
}

.staff-work-value--rate {
  color: #0f766e;
}

.staff-work-value--count {
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--primary);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;

  &:hover {
    color: var(--primary-dark);
    text-decoration: underline;
  }
}

.staff-status-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  width: fit-content;
}

.tag.success {
  background: #dcfce7;
  color: #166534;
}

.tag.warning {
  background: #fef3c7;
  color: #92400e;
}

.tag.danger {
  background: #fee2e2;
  color: #b91c1c;
}

.staff-note {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.4;
}

.staff-action-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}

.staff-action-link {
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: var(--primary-dark);
    text-decoration: underline;
  }
}

.staff-action-divider {
  width: 1px;
  height: 12px;
  background: #d1d5db;
}

// 保留旧样式以兼容
.staff-cell--stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.staff-cell--stack span {
  color: #64748b;
  font-size: 12px;
}

.staff-cell--muted {
  color: #64748b;
}

.staff-cell--money {
  white-space: nowrap;
  font-weight: 700;
  color: var(--text);
}

.staff-link,
.staff-count {
  border: none;
  background: none;
  padding: 0;
  color: var(--primary);
  font-weight: 600;
  cursor: pointer;
}

.staff-count {
  color: #4F46E5;
}

.staff-action-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.staff-action-menu {
  min-width: 160px;
}

.staff-action-menu__item {
  display: inline-flex;
  align-items: center;
  width: 100%;
}

.staff-action-menu__item--warning {
  color: #b45309;
}

.staff-action-menu__item--success {
  color: #15803d;
}

.staff-action-menu__item--danger {
  color: #b91c1c;
}

.staff-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.staff-tag--success,
.staff-tag--status-success {
  background: #dcfce7;
  color: #166534;
}

.staff-tag--info {
  background: #dbeafe;
  color: var(--primary-dark);
}

.staff-reset-password-modal__title {
  font-weight: 700;
  color: var(--text);
}

.staff-reset-password-modal__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--text);
}

.staff-reset-password-modal__body p {
  margin: 0;
}

.staff-tag--status-warning {
  background: #fee2e2;
  color: #b91c1c;
}

.staff-tag--direction-finance {
  background: #ede9fe;
  color: #4F46E5;
}

.staff-tag--direction-consulting {
  background: #dbeafe;
  color: var(--primary-dark);
}

.staff-tag--direction-tech {
  background: #fef3c7;
  color: #b45309;
}

.staff-tag--direction-quant {
  background: #e0e7ff;
  color: #4338ca;
}

.staff-empty {
  padding: 36px 0;
  text-align: center;
  color: #64748b;
}

.staff-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.staff-pagination__controls {
  display: inline-flex;
  gap: 8px;
}

// 翻页按钮样式
.permission-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 16px;
  background: #ffffff;
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: var(--muted);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.permission-button--primary {
  background: linear-gradient(135deg, #6366F1, #8b5cf6);
  border-color: #6366F1;
  color: #ffffff;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #4F46E5, #6366F1);
    border-color: #4F46E5;
  }
}

.permission-button--outline {
  background: #ffffff;
  border-color: #d1d5db;
  color: var(--text);

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: var(--muted);
    color: #111827;
  }
}

.permission-button--small {
  padding: 6px 12px;
  font-size: 12px;
}

@media (max-width: 1200px) {
  .staff-filter-actions {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .staff-field,
  .staff-filter-actions {
    width: 100%;
  }

  .staff-input,
  .staff-select {
    width: 100%;
  }

  .staff-pagination {
    flex-direction: column;
    align-items: stretch;
  }

  .staff-pagination__controls {
    justify-content: center;
  }
}
</style>
