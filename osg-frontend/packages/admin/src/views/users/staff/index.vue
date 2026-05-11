<template>
  <div class="osg-page">
    <PageHeader title-zh="导师列表" title-en="Mentor List">
      <template #actions>
        <a-button type="primary" data-surface-trigger="modal-add-staff" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          新增导师
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      v-if="pendingReviewCount > 0"
      type="warning"
      show-icon
      :message="`有 ${pendingReviewCount} 位导师的个人信息变更待审核`"
      description="导师提交的银行信息、联系方式等变更需要您审核确认"
    >
      <template #action>
        <a-button type="primary" size="small" data-surface-trigger="modal-mentor-info-change" @click="handlePendingReviewEntry">
          立即处理
        </a-button>
      </template>
    </a-alert>

    <a-card :bordered="false" style="box-shadow: var(--card-shadow)">
      <a-form layout="inline" style="margin-bottom: var(--osg-toolbar-mb)" data-field-name="导师管理页">
        <a-form-item>
          <a-input v-model:value="filters.staffName" placeholder="搜索姓名/ID" allow-clear style="width: 180px" data-field-name="搜索框" @pressEnter="handleSearch" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.staffType" placeholder="全部类型" allow-clear style="width: 120px">
            <a-select-option value="lead_mentor">班主任</a-select-option>
            <a-select-option value="mentor">导师</a-select-option>
            <a-select-option value="assistant">助教</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.majorDirection" placeholder="全部方向" allow-clear style="width: 130px">
            <a-select-option v-for="opt in majorDirectionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.accountStatus" placeholder="全部状态" allow-clear style="width: 110px" data-field-name="状态">
            <a-select-option value="0">正常</a-select-option>
            <a-select-option value="1">冻结</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              搜索
            </a-button>
            <a-button :loading="exporting" @click="handleExport">
              <template #icon><ExportOutlined /></template>
              {{ exporting ? '导出中...' : '导出' }}
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
        style="margin-bottom: var(--osg-space-4)"
      >
        <template #message><strong>黑名单导师限制说明</strong></template>
        <template #description>黑名单中的导师<strong>无法登录系统</strong>，且无法访问任何业务模块</template>
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
              <span style="font-size: var(--osg-font-size-sm); color: var(--text2, #64748b)">{{ record.email || '-' }}</span>
              <span style="font-size: var(--osg-font-size-sm); color: var(--text2, #64748b)">{{ record.phone || '-' }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'staffType'">
            <a-tag :color="getTypeColor(record.staffType)">{{ formatType(record.staffType) }}</a-tag>
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
                <template v-if="splitField(record.region).length">
                  {{ splitField(record.region).map((v) => dictLabel(regionItems, v)).join('、') }}
                </template>
                <template v-else>-</template>
              </span>
              <span style="font-size: var(--osg-font-size-sm); color: var(--text2, #64748b); overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ record.city ? dictLabel(cityItems, record.city) : '-' }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'companies'">
            <a-tooltip v-if="splitField(record.companies).length" :title="formatCompaniesTooltip(record.companies)" placement="topLeft">
              <span>
                {{ formatCompaniesPreview(record.companies) }}
              </span>
            </a-tooltip>
            <span v-else style="color: var(--osg-text-muted)">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'rating'">
            <a-tag v-if="record.rating" color="gold">{{ dictLabel(ratingItems, record.rating) }}</a-tag>
            <span v-else style="color: var(--osg-text-muted)">-</span>
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
              <span style="font-size: var(--osg-font-size-xs); color: var(--osg-text-muted)">{{ getStatusNote(record) }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space :size="4" wrap>
              <a-button type="link" size="small" data-surface-trigger="modal-staff-detail" :data-surface-sample-key="`staff-${record.staffId}`" @click="openStaffDetail(record)">详情</a-button>
              <a-button type="link" size="small" data-surface-trigger="modal-edit-staff" :data-surface-sample-key="`staff-${record.staffId}`" @click="openEditModal(record)">编辑</a-button>
              <a-dropdown :trigger="['click']" placement="bottomRight">
                <a-button type="link" size="small">更多 <DownOutlined /></a-button>
                <template #overlay>
                  <a-menu @click="({ key }: { key: string }) => handleActionSelect(key as StaffActionKey, record)">
                    <a-menu-item key="resetPassword">重置密码</a-menu-item>
                    <a-menu-item :key="record.accountStatus === '1' ? 'restore' : 'freeze'">
                      <span :style="{ color: record.accountStatus === '1' ? '#15803d' : '#b45309' }">{{ record.accountStatus === '1' ? '解冻' : '冻结' }}</span>
                    </a-menu-item>
                    <a-menu-item :key="isBlacklisted(record) ? 'remove' : 'blacklist'">
                      <span style="color: #b91c1c">{{ isBlacklisted(record) ? '移出黑名单' : '加入黑名单' }}</span>
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
        <span style="font-weight: 700; color: var(--text)">重置密码成功</span>
      </template>

      <div style="display: flex; flex-direction: column; gap: 10px; color: var(--text)">
        <p style="margin: 0">登录账号：{{ resetPasswordResult?.loginAccount || '-' }}</p>
        <p style="margin: 0">默认密码：{{ resetPasswordResult?.defaultPassword || '-' }}</p>
      </div>

      <template #footer>
        <a-button type="primary" @click="closeResetPasswordModal">
          知道了
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
import { useDictFacade, type DictFacadeOption } from '@osg/shared/composables'
import { useUserStore } from '@/stores/user'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import MentorStudentsModal from './components/MentorStudentsModal.vue'
import StaffDetailModal from './components/StaffDetailModal.vue'
import StaffFormModal from './components/StaffFormModal.vue'
import StaffStatusModal from './components/StaffStatusModal.vue'
import { staffColumns, staffBlacklistColumns, staffColumnsWithRating } from './columns'

const userStore = useUserStore()
const isSuperAdmin = computed(() => userStore.permissions.includes('*:*:*'))

const { items: regionItems, load: loadRegion } = useDictFacade('osg_region')
const { items: cityItems, load: loadCity } = useDictFacade('osg_city')
const { items: majorItems, load: loadMajor } = useDictFacade('osg_major_direction')
const { items: subItems, load: loadSub } = useDictFacade('osg_sub_direction')
const { items: ratingItems, load: loadRating } = useDictFacade('osg_rating')
const { items: companyItems, load: loadCompany } = useDictFacade('osg_company_name')

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
  { key: 'normal', label: '正常列表' },
  { key: 'blacklist', label: '黑名单' }
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
const emptyStateText = computed(() => (selectedTab.value === 'blacklist' ? '暂无黑名单导师' : '暂无导师数据'))
const tablePagination = computed(() => ({
  current: pagination.current,
  pageSize: pagination.pageSize,
  total: pagination.total,
  simple: false,
  showSizeChanger: false,
  showTotal: (total: number) => `共 ${total} 条记录`
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
    message.error('导师列表加载失败')
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
  void loadCompany()
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
    message.success('导师列表导出成功')
  } catch (_error) {
    message.error('导师列表导出失败')
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

const handleDetailReviewUpdated = () => {
  void loadRows()
}

const isBlacklisted = (row: StaffListItem) => Boolean(row.isBlacklisted)

/** 列表公司列预览：前 2 家 + 等 N 家 */
const formatCompaniesPreview = (companies?: string) => {
  const arr = splitField(companies)
  if (!arr.length) return ''
  const previews = arr.slice(0, 2).map((v) => dictLabel(companyItems.value, v))
  const label = previews.join('、')
  return arr.length > 2 ? `${label} 等${arr.length}家` : label
}

/** 列表公司列 Tooltip：全量公司名称 */
const formatCompaniesTooltip = (companies?: string) => {
  const arr = splitField(companies)
  if (!arr.length) return ''
  return arr.map((v) => dictLabel(companyItems.value, v)).join('、')
}

const formatType = (staffType?: string) => {
  if (staffType === 'lead_mentor') return '班主任'
  if (staffType === 'assistant') return '助教'
  return '导师'
}

const getTypeColor = (staffType?: string) => {
  if (staffType === 'lead_mentor') return 'blue'
  if (staffType === 'assistant') return 'cyan'
  return 'purple'
}

/** 字典 value 优先匹配，不命中再按中文兜底（兼容历史数据） */
const getDirectionColor = (direction?: string) => {
  if (!direction) return 'cyan'
  if (direction === 'quant' || direction.includes('量化')) return 'purple'
  if (direction === 'consulting' || direction.includes('咨询')) return 'blue'
  if (direction === 'tech' || direction.includes('科技')) return 'orange'
  if (direction === 'computer_science') return 'magenta'
  return 'cyan'
}


const formatHourlyRate = (hourlyRate?: number) => {
  if (hourlyRate == null) {
    return '-'
  }
  return `$${hourlyRate}/h`
}

const formatStudentCount = (studentCount?: number) => {
  return `${studentCount ?? 0} 学员`
}

const formatStatus = (accountStatus?: string) => {
  return accountStatus === '1' ? '冻结' : '正常'
}

const getStatusNote = (row: StaffListItem) => {
  if (row.accountStatus === '1') {
    return '账号已冻结'
  }
  if (isBlacklisted(row)) {
    return '已加入黑名单'
  }
  return '账号正常'
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
      message.info('当前没有可处理的导师记录')
      return
    }

    const existingRow = rows.value.find((row) => row.staffId === firstPending.staffId)
    selectedStaff.value = existingRow ?? {
      staffId: firstPending.staffId,
      staffName: firstPending.staffName || `导师 ${firstPending.staffId}`,
    }
    detailModalVisible.value = true
  } catch (error) {
    console.error(error)
    message.error('待审核导师信息加载失败')
  }
}

const resolveSuccessMessage = (action: StatusAction) => {
  if (action === 'freeze') {
    return '导师账号已冻结'
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
