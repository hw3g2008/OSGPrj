<template>
  <div class="osg-page">
    <PageHeader :title-zh="$t('mentor_list')" title-en="Mentor List" :description="$t('manage_mentor_and_homeroom_teacher_accou')">
      <template #actions>
        <a-button type="primary" data-surface-trigger="modal-add-staff" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          {{ $t('add_mentor') }}
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      v-if="pendingReviewCount > 0"
      type="warning"
      show-icon
      :message="`${pendingReviewCount} ${$t('mentor_s_have_pending_personal_informati')}`"
      :description="$t('changes_to_bank_information_and_contact_')"
    >
      <template #action>
        <a-button type="primary" size="small" data-surface-trigger="modal-mentor-info-change" @click="handlePendingReviewEntry">
          {{ $t('handle_now') }}
        </a-button>
      </template>
    </a-alert>

    <a-card :bordered="false" style="box-shadow: var(--card-shadow)">
      <a-form layout="inline" style="margin-bottom: 16px" :data-field-name="$t('mentor_management')">
        <a-form-item>
          <a-input v-model:value="filters.staffName" :placeholder="`${$t('search_by_name')}/ID`" allow-clear style="width: 180px" :data-field-name="$t('search_2')" @pressEnter="handleSearch" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.staffType" :placeholder="$t('all_types')" allow-clear style="width: 120px">
            <a-select-option value="lead_mentor">{{ $t('head_teacher') }}</a-select-option>
            <a-select-option value="mentor">{{ $t('mentor') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.majorDirection" :placeholder="$t('all_directions')" allow-clear style="width: 130px">
            <a-select-option v-for="opt in majorDirectionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.accountStatus" :placeholder="$t('all_status')" allow-clear style="width: 110px" :data-field-name="$t('status')">
            <a-select-option value="0">{{ $t('activate') }}</a-select-option>
            <a-select-option value="1">{{ $t('disable') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              {{ $t('search') }}
            </a-button>
            <a-button :loading="exporting" @click="handleExport">
              <template #icon><ExportOutlined /></template>
              {{ exporting ? $t('exporting') + '...' : $t('export') }}
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-tabs v-model:activeKey="selectedTab">
        <a-tab-pane v-for="tab in tabs" :key="tab.key">
          <template #tab>
            {{ tab.label }}
            <a-badge :count="tab.key === 'normal' ? normalCount : blacklistedCount" :number-style="{ backgroundColor: tab.key === 'blacklist' ? '#ef4444' : '#3b82f6' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
      </a-tabs>

      <a-alert
        v-if="selectedTab === 'blacklist'"
        type="error"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #message><strong>{{ $t('blacklisted_mentor_restrictions') }}</strong></template>
        <template #description>{{ $t('blacklisted_mentors') }}<strong>{{ $t('cannot_view_the_job_search_center_module') }}</strong>（{{ $t('including_position_info_interview_prepar') }}</template>
      </a-alert>

      <a-table
        :columns="activeColumns"
        :data-source="visibleRows"
        :row-key="(record: StaffListItem) => record.staffId"
        :pagination="tablePagination"
        :row-class-name="(record: StaffListItem) => record.accountStatus === '1' ? 'row-frozen' : (selectedTab === 'blacklist' ? 'row-blacklist' : '')"
        :locale="{ emptyText: emptyStateText }"
        :scroll="{ x: 1400 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'staffName'">
            <a-tooltip v-if="record.staffName" :title="record.staffName" placement="topLeft">
              <a-button
                type="link"
                size="small"
                class="staff-name-link"
                data-surface-trigger="modal-staff-detail"
                :data-surface-sample-key="`staff-${record.staffId}`"
                @click="openStaffDetail(record)"
              >
                {{ record.staffName }}
              </a-button>
            </a-tooltip>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.dataIndex === 'contact'">
            <div style="display: flex; flex-direction: column; gap: 2px">
              <span style="font-size: 12px; color: #64748b">{{ record.email || '-' }}</span>
              <span style="font-size: 12px; color: #64748b">{{ record.phone || '-' }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'staffType'">
            <a-tag :color="record.staffType === 'lead_mentor' ? 'blue' : 'purple'">{{ formatType(record.staffType) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'majorDirection'">
            <template v-if="splitField(record.majorDirection).length">
              <a-tag
                v-for="v in splitField(record.majorDirection)"
                :key="v"
                :color="getDirectionColor(v)"
                style="max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: middle; margin-bottom: 2px"
              >
                {{ dictLabel(majorItems, v) }}
              </a-tag>
            </template>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.dataIndex === 'subDirection'">
            <template v-if="splitField(record.subDirection).length">
              <span :title="splitField(record.subDirection).map((v) => dictLabel(subItems, v)).join('、')">
                {{ splitField(record.subDirection).map((v) => dictLabel(subItems, v)).join('、') }}
              </span>
            </template>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.dataIndex === 'region'">
            <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0">
              <span style="font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                <template v-if="record.region">
                  <template v-if="getRegionEmoji(record.region)">{{ getRegionEmoji(record.region) }} </template>{{ dictLabel(regionItems, record.region) }}
                </template>
                <template v-else>-</template>
              </span>
              <span style="font-size: 12px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ record.city ? dictLabel(cityItems, record.city) : '-' }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'companies'">
            <a-tooltip v-if="splitField(record.companies).length" :title="formatCompaniesTooltip(record.companies)" placement="topLeft">
              <span>
                {{ formatCompaniesPreview(record.companies) }}
              </span>
            </a-tooltip>
            <span v-else style="color: #94a3b8">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'rating'">
            <a-tag v-if="record.rating" color="gold">{{ dictLabel(ratingItems, record.rating) }}</a-tag>
            <span v-else style="color: #94a3b8">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'hourlyRate'">
            <strong style="color: #0f766e">{{ formatHourlyRate(record.hourlyRate) }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'studentCount'">
            <a-button type="link" size="small" style="padding: 0; font-weight: 700" data-surface-trigger="modal-mentor-students" :data-surface-sample-key="`staff-${record.staffId}-students`" @click="openMentorStudents(record)">
              {{ formatStudentCount(record.studentCount) }}
            </a-button>
          </template>
          <template v-else-if="column.dataIndex === 'accountStatus'">
            <div style="display: flex; flex-direction: column; gap: 4px">
              <a-tag :color="record.accountStatus === '1' ? 'orange' : 'green'">{{ formatStatus(record.accountStatus) }}</a-tag>
              <span style="font-size: 11px; color: #94a3b8">{{ getStatusNote(record) }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space :size="4" wrap>
              <a-button type="link" size="small" data-surface-trigger="modal-staff-detail" :data-surface-sample-key="`staff-${record.staffId}`" @click="openStaffDetail(record)">{{ $t('details') }}</a-button>
              <a-button type="link" size="small" data-surface-trigger="modal-edit-staff" :data-surface-sample-key="`staff-${record.staffId}`" @click="openEditModal(record)">{{ $t('edit') }}</a-button>
              <a-dropdown :trigger="['click']" placement="bottomRight">
                <a-button type="link" size="small">{{ $t('more') }} <DownOutlined /></a-button>
                <template #overlay>
                  <a-menu @click="({ key }: { key: string }) => handleActionSelect(key as StaffActionKey, record)">
                    <a-menu-item key="resetPassword">{{ $t('reset_password') }}</a-menu-item>
                    <a-menu-item :key="record.accountStatus === '1' ? 'restore' : 'freeze'">
                      <span :style="{ color: record.accountStatus === '1' ? '#15803d' : '#b45309' }">{{ record.accountStatus === '1' ? $t('unfreeze') : $t('disable') }}</span>
                    </a-menu-item>
                    <a-menu-item :key="isBlacklisted(record) ? 'remove' : 'blacklist'">
                      <span style="color: #b91c1c">{{ isBlacklisted(record) ? $t('remove_from_blacklist') : $t('add_to_blacklist') }}</span>
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <MentorStudentsModal
      v-model:visible="studentsModalVisible"
      :staff-id="selectedStaff?.staffId ?? null"
      :staff-name="selectedStaff?.staffName"
      surface-id="modal-mentor-students"
    />
    <StaffDetailModal
      v-model:visible="detailModalVisible"
      :staff-id="selectedStaff?.staffId ?? null"
      :staff-name="selectedStaff?.staffName"
      :surface-id="detailSurfaceId"
      @review-updated="handleDetailReviewUpdated"
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
        <span style="font-weight: 700; color: var(--text)">{{ $t('password_reset_successfully') }}</span>
      </template>

      <div style="display: flex; flex-direction: column; gap: 10px; color: var(--text)">
        <p style="margin: 0">{{ $t('login_account') }}：{{ resetPasswordResult?.loginAccount || '-' }}</p>
        <p style="margin: 0">{{ $t('default_password') }}：{{ resetPasswordResult?.defaultPassword || '-' }}</p>
      </div>

      <template #footer>
        <a-button type="primary" @click="closeResetPasswordModal">
          {{ $t('got_it') }}
        </a-button>
      </template>
    </OverlaySurfaceModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { DownOutlined, ExportOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import {
  createStaff,
  exportStaffList,
  getStaffChangeRequestList,
  getStaffList,
  resetStaffPassword,
  updateStaff,
  type ResetStaffPasswordResult,
  type StaffListItem,
  type StaffPayload
} from '@osg/shared/api/admin/staff'
import { http } from '@osg/shared/utils/request'
import { useDictFacade, useIndustryMeta, type DictFacadeOption } from '@osg/shared/composables'
import { useUserStore } from '@/stores/user'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import MentorStudentsModal from './components/MentorStudentsModal.vue'
import StaffDetailModal from './components/StaffDetailModal.vue'
import StaffFormModal from './components/StaffFormModal.vue'
import StaffStatusModal from './components/StaffStatusModal.vue'
import { staffColumns, staffBlacklistColumns, staffColumnsWithRating } from './columns'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const userStore = useUserStore()
const isSuperAdmin = computed(() => userStore.permissions.includes('*:*:*'))

const { items: regionItems, load: loadRegion } = useDictFacade('osg_region')
const { items: cityItems, load: loadCity } = useDictFacade('osg_city')
const { items: majorItems, load: loadMajor } = useDictFacade('osg_major_direction')
const { items: subItems, load: loadSub } = useDictFacade('osg_sub_direction')
const { items: ratingItems, load: loadRating } = useDictFacade('osg_rating')
const { items: industryItems, load: loadIndustry } = useIndustryMeta()

/** value→label 查询；查不到（历史中文数据）原样返回，保证旧数据可读 */
const dictLabel = (items: DictFacadeOption[], val?: string) =>
  val ? (items.find((i) => i.value === val)?.label ?? val) : '-'

/** 把后端逗号分隔串拆数组；空值返回 [] */
const splitField = (val?: string): string[] =>
  val ? val.split(',').map((s) => s.trim()).filter(Boolean) : []

type StaffTabKey = 'normal' | 'blacklist'
type StaffActionKey = 'detail' | 'edit' | 'resetPassword' | 'freeze' | 'restore' | 'blacklist' | 'remove'
type StatusAction = Extract<StaffActionKey, 'freeze' | 'restore' | 'blacklist' | 'remove'>

const tabs: { key: StaffTabKey; label: string }[] = [
  { key: 'normal', label: t('active_list') },
  { key: 'blacklist', label: t('blacklist') }
]

const rows = ref<StaffListItem[]>([])
const pendingReviewCount = ref(0)
const selectedTab = ref<StaffTabKey>('normal')
const studentsModalVisible = ref(false)
const detailModalVisible = ref(false)
const detailSurfaceId = ref('modal-staff-detail')
const statusModalVisible = ref(false)
const statusSubmitting = ref(false)
const formModalVisible = ref(false)
const formSubmitting = ref(false)
const resetPasswordVisible = ref(false)
const statusAction = ref<StatusAction>('freeze')
const selectedStaff = ref<StaffListItem | null>(null)
const editingStaff = ref<StaffListItem | null>(null)
const resetPasswordResult = ref<ResetStaffPasswordResult | null>(null)
const exporting = ref(false)

const filters = reactive({
  staffName: '',
  staffType: undefined as string | undefined,
  majorDirection: undefined as string | undefined,
  accountStatus: undefined as string | undefined
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
const emptyStateText = computed(() => (selectedTab.value === 'blacklist' ? t('no_blacklisted_mentors') : t('no_mentor_data_available')))
const tablePagination = computed(() => ({
  current: pagination.current,
  pageSize: pagination.pageSize,
  total: pagination.total,
  simple: false,
  showSizeChanger: false,
  showTotal: (total: number) => `${t('in_total')} ${total} ${t('records')}`
}))
const majorDirectionOptions = computed(() => majorItems.value)

const activeColumns = computed(() =>
  selectedTab.value === 'blacklist'
    ? staffBlacklistColumns
    : (isSuperAdmin.value ? staffColumnsWithRating : staffColumns)
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
    message.error(t('failed_to_load_mentor_list'))
  }
}

const handleTableChange = (pag: { current?: number; pageSize?: number }) => {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 10
  void loadRows()
}

onMounted(() => {
  void loadRows()
  void loadRegion()
  void loadCity()
  void loadMajor()
  void loadSub()
  void loadRating()
  void loadIndustry()
})

const handleSearch = () => {
  pagination.current = 1
  void loadRows()
}

const handleExport = async () => {
  try {
    exporting.value = true
    await exportStaffList({
      staffName: filters.staffName || undefined,
      staffType: filters.staffType || undefined,
      majorDirection: filters.majorDirection || undefined,
      accountStatus: filters.accountStatus || undefined,
      tab: selectedTab.value
    })
    message.success(t('mentor_list_exported_successfully'))
  } catch (_error) {
    message.error(t('failed_to_export_mentor_list'))
  } finally {
    exporting.value = false
  }
}

const handlePendingReviewEntry = () => {
  detailSurfaceId.value = 'modal-mentor-info-change'
  void openFirstPendingReview()
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
      message.success(t('mentor_information_updated'))
    } else {
      await createStaff(payload)
      message.success(t('mentor_added_successfully'))
    }
    formModalVisible.value = false
    editingStaff.value = null
    pagination.current = 1
    await loadRows()
  } catch (error) {
    console.error(error)
    message.error(payload.staffId ? t('failed_to_update_mentor') : t('failed_to_add_mentor'))
  } finally {
    formSubmitting.value = false
  }
}

const handleDetailReviewUpdated = () => {
  void loadRows()
}

const isBlacklisted = (row: StaffListItem) => Boolean(row.isBlacklisted)

/** 列表公司列预览：前 2 家 + 等 N 家 */
const formatCompaniesPreview = (companies?: string) => {
  const arr = splitField(companies)
  if (!arr.length) return ''
  const previews = arr.slice(0, 2).map((v) => dictLabel(industryItems, v))
  const label = previews.join('、')
  return arr.length > 2 ? t('companies_total_suffix', { label, count: arr.length }) : label
}

/** 列表公司列 Tooltip：全量公司名称 */
const formatCompaniesTooltip = (companies?: string) => {
  const arr = splitField(companies)
  if (!arr.length) return ''
  return arr.map((v) => dictLabel(industryItems, v)).join('、')
}

const formatType = (staffType?: string) => {
  if (staffType === 'lead_mentor') return t('head_teacher')
  if (staffType === 'assistant') return t('teaching_assistant')
  return t('mentor')
}

/** 字典 value 优先匹配，不命中再按中文兜底（兼容历史数据） */
const getDirectionColor = (direction?: string) => {
  if (!direction) return 'cyan'
  if (direction === 'quant' || direction.includes(t('quantitative'))) return 'purple'
  if (direction === 'consulting' || direction.includes(t('consulting'))) return 'blue'
  if (direction === 'tech' || direction.includes(t('technology'))) return 'orange'
  if (direction === 'computer_science') return 'magenta'
  return 'cyan'
}

const getRegionEmoji = (region?: string) => {
  if (!region) return ''
  if (region === 'na' || region.includes(t('north_america'))) return '🌎'
  if (region === 'eu' || region.includes(t('europe'))) return '🌍'
  if (region === 'apac' || region.includes(t('asia_pacific'))) return '🌏'
  return ''
}

const formatHourlyRate = (hourlyRate?: number) => {
  if (hourlyRate == null) {
    return '-'
  }
  return `￥${hourlyRate}/h`
}

const formatStudentCount = (studentCount?: number) => {
  return `${studentCount ?? 0} ${t('student')}`
}

const formatStatus = (accountStatus?: string) => {
  return accountStatus === '1' ? t('frozen') : t('active_3')
}

const getStatusNote = (row: StaffListItem) => {
  if (row.accountStatus === '1') {
    return t('account_disabled')
  }
  if (isBlacklisted(row)) {
    return t('blacklisted')
  }
  return t('account_active')
}

const openStaffDetail = (row: StaffListItem) => {
  detailSurfaceId.value = 'modal-staff-detail'
  selectedStaff.value = row
  detailModalVisible.value = true
}

const openFirstPendingReview = async () => {
  try {
    const response = await getStaffChangeRequestList(undefined, 'pending')
    const firstPending = response.rows?.[0]
    if (!firstPending) {
      message.info(t('no_mentor_records_available_to_process'))
      return
    }

    const existingRow = rows.value.find((row) => row.staffId === firstPending.staffId)
    selectedStaff.value = existingRow ?? {
      staffId: firstPending.staffId,
      staffName: firstPending.staffName || `${t('mentor')} ${firstPending.staffId}`,
    }
    detailModalVisible.value = true
  } catch (error) {
    console.error(error)
    message.error(t('failed_to_load_mentors_pending_review'))
  }
}

const resolveSuccessMessage = (action: StatusAction) => {
  if (action === 'freeze') {
    return t('mentor_account_has_been_disabled')
  }
  if (action === 'restore') {
    return t('mentor_account_has_been_unfrozen')
  }
  if (action === 'blacklist') {
    return t('mentor_has_been_blacklisted')
  }
  return t('mentor_has_been_removed_from_blacklist')
}

const closeResetPasswordModal = () => {
  resetPasswordVisible.value = false
  resetPasswordResult.value = null
}

</script>

<style scoped>
:deep(.row-frozen) {
  opacity: 0.68;
}
:deep(.row-blacklist) {
  background: #fef2f2;
}
:deep(.staff-name-link.ant-btn) {
  display: block;
  width: 100%;
  max-width: 100%;
  padding: 0;
  font-weight: 600;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
:deep(.staff-name-link.ant-btn > span) {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
</style>

