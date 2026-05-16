<template>
  <div class="osg-page">
    <PageHeader :title-zh="t('admin.career.studentPositions.pageTitle')" title-en="Student Added Positions">
      <template #actions>
        <a-space>
          <a-tag color="orange">{{ t('admin.career.studentPositions.pendingCount', { count: pendingCount }) }}</a-tag>
          <a-tag color="blue">{{ t('admin.career.studentPositions.coachingCount', { count: coachingCount }) }}</a-tag>
        </a-space>
      </template>
    </PageHeader>

    <a-card :bordered="false">
      <a-form layout="inline" style="gap: var(--osg-space-3); flex-wrap: wrap">
        <a-form-item>
          <a-select v-model:value="filters.status" style="width: 120px">
            <a-select-option value="pending">{{ t('admin.career.studentPositions.status.pending') }}</a-select-option>
            <a-select-option value="">{{ t('admin.career.studentPositions.filter.statusAll') }}</a-select-option>
            <a-select-option value="approved">{{ t('admin.career.studentPositions.status.approved') }}</a-select-option>
            <a-select-option value="rejected">{{ t('admin.career.studentPositions.status.rejected') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.positionCategory" :placeholder="t('admin.career.studentPositions.filter.categoryPlaceholder')" allow-clear style="width: 150px">
            <a-select-option v-for="option in companyCategoryOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.hasCoachingRequest" :placeholder="t('admin.career.studentPositions.filter.coachingPlaceholder')" allow-clear style="width: 150px">
            <a-select-option value="yes">{{ t('admin.career.studentPositions.filter.hasCoaching') }}</a-select-option>
            <a-select-option value="no">{{ t('admin.career.studentPositions.filter.noCoaching') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-input v-model:value="filters.keyword" :placeholder="t('admin.career.studentPositions.filter.searchPlaceholder')" allow-clear style="width: 200px" @pressEnter="handleSearch" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              {{ t('admin.career.studentPositions.filter.search') }}
            </a-button>
            <a-button @click="handleReset">{{ t('admin.career.studentPositions.filter.reset') }}</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false">
      <a-table
        :columns="positionColumns"
        :data-source="rows"
        :scroll="{ x: 'max-content' }"
        :row-key="(record: StudentPositionListItem) => record.studentPositionId"
        :loading="loading"
        :pagination="listPagination"
        :locale="{ emptyText: t('admin.career.studentPositions.empty') }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'companyName'">
            <div style="display: flex; align-items: center; gap: 10px">
              <a-avatar :style="{ background: getCompanyColor(record.companyName), flexShrink: 0 }" shape="square" :size="40">
                {{ getCompanyInitials(record.companyName) }}
              </a-avatar>
              <div style="display: flex; flex-direction: column; gap: 2px">
                <strong>{{ record.companyName }}</strong>
                <span style="font-size: var(--osg-font-size-xs); color: var(--text2, #64748b)">{{ record.positionName }}<template v-if="record.city"> · {{ record.city }}</template></span>
                <a v-if="record.positionUrl" :href="record.positionUrl" target="_blank" rel="noreferrer" style="font-size: 10px; color: #3b82f6">
                  {{ simplifyLink(record.positionUrl) }}
                </a>
              </div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'positionCategory'">
            <a-space>
              <a-tag :color="getCategoryColor(record.positionCategory)">{{ formatCategory(record.positionCategory) }}</a-tag>
              <a-tag v-if="record.hasCoachingRequest === 'yes'" color="purple">{{ t('admin.career.studentPositions.hasCoaching') }}</a-tag>
            </a-space>
          </template>
          <template v-else-if="column.dataIndex === 'studentName'">
            <div style="display: flex; flex-direction: column; gap: 2px">
              <strong>{{ record.studentName || t('admin.career.studentPositions.unnamedStudent') }}</strong>
              <span style="font-size: var(--osg-font-size-xs); color: var(--text2, #64748b)">ID: {{ record.studentId }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'submittedAt'">
            <div style="display: flex; flex-direction: column; gap: 2px">
              <strong>{{ formatRelativeTime(record.submittedAt) }}</strong>
              <span style="font-size: var(--osg-font-size-xs); color: var(--text2, #64748b)">{{ formatDateTime(record.submittedAt) }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="getStatusColor(record.status)">{{ formatStatus(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space>
              <a-button type="link" size="small" data-surface-trigger="modal-edit-student-position" :data-surface-sample-key="`student-position-${record.studentPositionId}`" @click="openReviewModal(record)">{{ t('admin.career.studentPositions.action.edit') }}</a-button>
              <a-button v-if="record.status === 'pending'" type="link" danger size="small" data-surface-trigger="modal-reject-position" :data-surface-sample-key="`student-position-${record.studentPositionId}`" @click="openRejectModal(record)">{{ t('admin.career.studentPositions.action.reject') }}</a-button>
              <a-button v-if="record.status !== 'pending'" type="link" size="small" @click="openReviewModal(record)">{{ t('admin.career.studentPositions.action.viewResult') }}</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-alert type="info" show-icon>
      <template #message><strong>{{ t('admin.career.studentPositions.reviewInfo.title') }}</strong></template>
      <template #description>{{ t('admin.career.studentPositions.reviewInfo.description') }}</template>
    </a-alert>

    <ReviewPositionModal
      v-model:visible="reviewVisible"
      :position="selectedRecord"
      :meta="positionMeta"
      @submit="handleApprove"
      @request-reject="openRejectModal"
    />

    <RejectPositionModal
      v-model:visible="rejectVisible"
      :position="selectedRecord"
      @submit="handleReject"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { useStandardClientPagination } from '@osg/shared'
import {
  approveStudentPosition,
  getStudentPositionList,
  rejectStudentPosition,
  type RejectStudentPositionPayload,
  type ReviewStudentPositionPayload,
  type StudentPositionListItem,
  type StudentPositionListParams
} from '@osg/shared/api/admin/studentPosition'
import { getPositionMeta, type PositionMeta, type PositionMetaOption } from '@osg/shared/api/admin/position'
import RejectPositionModal from './components/RejectPositionModal.vue'
import ReviewPositionModal from './components/ReviewPositionModal.vue'
import { PageHeader } from '@osg/shared/components/PageHeader'

const { t } = useI18n()

const positionColumns = computed(() => [
  { title: t('admin.career.studentPositions.columns.companyPosition'), dataIndex: 'companyName', key: 'companyName', width: 280, fixed: 'left' as const },
  { title: t('admin.career.studentPositions.columns.category'), dataIndex: 'positionCategory', key: 'positionCategory', width: 180 },
  { title: t('admin.career.studentPositions.columns.student'), dataIndex: 'studentName', key: 'studentName', width: 140 },
  { title: t('admin.career.studentPositions.columns.submittedAt'), dataIndex: 'submittedAt', key: 'submittedAt', width: 140 },
  { title: t('admin.career.studentPositions.columns.status'), dataIndex: 'status', key: 'status', width: 100 },
  { title: t('admin.career.studentPositions.columns.action'), dataIndex: 'action', key: 'action', width: 200, fixed: 'right' as const },
])

const companyCategoryOptions = ref<PositionMetaOption[]>([])
const positionMeta = ref<PositionMeta | null>(null)

const rows = ref<StudentPositionListItem[]>([])
const loading = ref(false)
const listPagination = useStandardClientPagination(() => rows.value.length)
const reviewVisible = ref(false)
const rejectVisible = ref(false)
const selectedRecord = ref<StudentPositionListItem | null>(null)

const filters = reactive<StudentPositionListParams>({
  status: 'pending',
  positionCategory: undefined,
  hasCoachingRequest: undefined,
  keyword: ''
})

const pendingCount = computed(() => rows.value.filter((item) => item.status === 'pending').length)
const coachingCount = computed(() => rows.value.filter((item) => item.hasCoachingRequest === 'yes').length)

const loadRows = async () => {
  loading.value = true
  try {
    const response = await getStudentPositionList(filters)
    rows.value = response.rows || []
  } finally {
    loading.value = false
  }
}

const loadCompanyCategoryOptions = async () => {
  try {
    const meta = await getPositionMeta()
    positionMeta.value = meta
    companyCategoryOptions.value = meta.industries || []
  } catch {
    positionMeta.value = null
    companyCategoryOptions.value = []
  }
}

onMounted(() => {
  void loadRows()
  void loadCompanyCategoryOptions()
})

const handleSearch = () => {
  void loadRows()
}

const handleReset = () => {
  filters.status = 'pending'
  filters.positionCategory = undefined
  filters.hasCoachingRequest = undefined
  filters.keyword = ''
  void loadRows()
}

const openReviewModal = (record: StudentPositionListItem) => {
  selectedRecord.value = record
  reviewVisible.value = true
}

const openRejectModal = (record?: StudentPositionListItem) => {
  if (record) {
    selectedRecord.value = record
  }
  reviewVisible.value = false
  rejectVisible.value = true
}

const handleApprove = async (payload: ReviewStudentPositionPayload) => {
  if (!selectedRecord.value) {
    return
  }
  await approveStudentPosition(selectedRecord.value.studentPositionId, payload)
  reviewVisible.value = false
  message.success(t('admin.career.studentPositions.messages.approveSuccess'))
  await loadRows()
}

const handleReject = async (payload: RejectStudentPositionPayload) => {
  if (!selectedRecord.value) {
    return
  }
  await rejectStudentPosition(selectedRecord.value.studentPositionId, payload)
  rejectVisible.value = false
  message.success(t('admin.career.studentPositions.messages.rejectSuccess'))
  await loadRows()
}

const getCompanyInitials = (companyName?: string) => {
  const normalized = (companyName || 'OS').trim()
  return normalized.slice(0, 3).toUpperCase()
}

const companyColors = ['#f59e0b', '#3b82f6', '#64748b', '#8b5cf6'] as const

const getCompanyColor = (companyName?: string) => {
  const normalized = (companyName || '').trim()
  const seed = Array.from(normalized).reduce((sum, current, index) => sum + current.charCodeAt(0) * (index + 1), 0)
  return companyColors[seed % companyColors.length]
}

const formatCategory = (value?: string) => {
  const map: Record<string, string> = {
    summer: t('admin.career.studentPositions.category.summer'),
    fulltime: t('admin.career.studentPositions.category.fulltime'),
    offcycle: t('admin.career.studentPositions.category.offcycle'),
    spring: t('admin.career.studentPositions.category.spring'),
    events: t('admin.career.studentPositions.category.events')
  }
  return map[value || ''] || value || '-'
}

const getCategoryColor = (value?: string) => {
  if (value === 'fulltime') return 'purple'
  if (value === 'offcycle') return 'orange'
  if (value === 'spring') return 'green'
  return 'blue'
}

const formatStatus = (value?: string) => {
  if (value === 'approved') return t('admin.career.studentPositions.status.approved')
  if (value === 'rejected') return t('admin.career.studentPositions.status.rejected')
  return t('admin.career.studentPositions.status.pending')
}

const getStatusColor = (value?: string) => {
  if (value === 'approved') return 'green'
  if (value === 'rejected') return 'red'
  return 'orange'
}

const formatRelativeTime = (value?: string) => {
  if (!value) return t('admin.career.studentPositions.relativeTime.justNow')

  const submitted = new Date(value).getTime()
  if (Number.isNaN(submitted)) return t('admin.career.studentPositions.relativeTime.justNow')

  const diffHours = Math.max(0, Math.floor((Date.now() - submitted) / (1000 * 60 * 60)))
  if (diffHours < 1) return t('admin.career.studentPositions.relativeTime.withinHour')
  if (diffHours < 24) return t('admin.career.studentPositions.relativeTime.hoursAgo', { hours: diffHours })
  return t('admin.career.studentPositions.relativeTime.daysAgo', { days: Math.floor(diffHours / 24) })
}

const formatDateTime = (value?: string) => {
  if (!value) return '--'
  return value.replace('T', ' ').slice(0, 16)
}

const simplifyLink = (value: string) => {
  try {
    const url = new URL(value)
    const summary = `${url.host}${url.pathname}`.replace(/\/$/, '')
    return summary.length > 30 ? `${summary.slice(0, 30)}...` : summary
  } catch {
    return value.length > 30 ? `${value.slice(0, 30)}...` : value
  }
}
</script>

<style scoped>
</style>
