<template>
  <div class="osg-page">
    <PageHeader :title-zh="$t('posts_created_by_students')" title-en="Student Added Positions" :description="$t('review_student_submitted_positions_appro')">
      <template #actions>
        <a-space>
          <a-tag color="orange">{{ pendingCount }} {{ $t('pending_review_2') }}</a-tag>
          <a-tag color="blue">{{ coachingCount }} {{ $t('with_coaching_requests') }}</a-tag>
        </a-space>
      </template>
    </PageHeader>

    <a-card :bordered="false" style="box-shadow: var(--card-shadow)">
      <a-form layout="inline" style="margin-bottom: 16px">
        <a-form-item>
          <a-select v-model:value="filters.status" style="width: 120px" :data-field-name="$t('status')">
            <a-select-option value="pending">{{ $t('pending_review') }}</a-select-option>
            <a-select-option value="">{{ $t('all_status') }}</a-select-option>
            <a-select-option value="approved">{{ $t('approved') }}</a-select-option>
            <a-select-option value="rejected">{{ $t('rejected') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.positionCategory" :placeholder="$t('all_types_2')" allow-clear style="width: 150px" :data-field-name="$t('type_2')">
            <a-select-option v-for="option in companyCategoryOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.hasCoachingRequest" :placeholder="$t('coaching_request_status')" allow-clear style="width: 150px" :data-field-name="$t('coaching_request')">
            <a-select-option value="yes">{{ $t('has_coaching_request') }}</a-select-option>
            <a-select-option value="no">{{ $t('no_coaching_request') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-input v-model:value="filters.keyword" :placeholder="$t('search_company_or_position_name')" allow-clear style="width: 200px" :data-field-name="$t('search_2')" @pressEnter="handleSearch" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              {{ $t('search') }}
            </a-button>
            <a-button @click="handleReset">{{ $t('reset') }}</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-table
        :columns="positionColumns"
        :data-source="rows"
        :scroll="{ x: 'max-content' }"
        :row-key="(record: StudentPositionListItem) => record.studentPositionId"
        :loading="loading"
        :pagination="listPagination"
        :row-class-name="(record: StudentPositionListItem) => record.status === 'pending' ? 'row-pending' : ''"
        :locale="{ emptyText: $t('no_student_submitted_positions_under_cur') }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'companyName'">
            <div style="display: flex; align-items: center; gap: 10px">
              <a-avatar :style="{ background: getCompanyColor(record.companyName), flexShrink: 0 }" shape="square" :size="40">
                {{ getCompanyInitials(record.companyName) }}
              </a-avatar>
              <div style="display: flex; flex-direction: column; gap: 2px">
                <strong>{{ record.companyName }}</strong>
                <span style="font-size: 11px; color: #64748b">{{ record.positionName }}<template v-if="record.city"> · {{ record.city }}</template></span>
                <a v-if="record.positionUrl" :href="record.positionUrl" target="_blank" rel="noreferrer" style="font-size: 10px; color: #3b82f6">
                  {{ simplifyLink(record.positionUrl) }}
                </a>
              </div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'positionCategory'">
            <a-space>
              <a-tag :color="getCategoryColor(record.positionCategory)">{{ formatCategory(record.positionCategory) }}</a-tag>
              <a-tag v-if="record.hasCoachingRequest === 'yes'" color="purple">{{ $t('has_coaching_request') }}</a-tag>
            </a-space>
          </template>
          <template v-else-if="column.dataIndex === 'studentName'">
            <div style="display: flex; flex-direction: column; gap: 2px">
              <strong>{{ record.studentName || $t('unnamed_student_2') }}</strong>
              <span style="font-size: 11px; color: #64748b">ID: {{ record.studentId }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'submittedAt'">
            <div style="display: flex; flex-direction: column; gap: 2px">
              <strong>{{ formatRelativeTime(record.submittedAt) }}</strong>
              <span style="font-size: 11px; color: #64748b">{{ formatDateTime(record.submittedAt) }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="getStatusColor(record.status)">{{ formatStatus(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space>
              <a-button type="link" size="small" data-surface-trigger="modal-edit-student-position" :data-surface-sample-key="`student-position-${record.studentPositionId}`" @click="openReviewModal(record)">{{ $t('edit') }}</a-button>
              <a-button v-if="record.status === 'pending'" type="link" danger size="small" data-surface-trigger="modal-reject-position" :data-surface-sample-key="`student-position-${record.studentPositionId}`" @click="openRejectModal(record)">{{ $t('reject') }}</a-button>
              <a-button v-if="record.status !== 'pending'" type="link" size="small" @click="openReviewModal(record)">{{ $t('view_result') }}</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-alert type="info" show-icon>
      <template #message><strong>{{ $t('review_notes') }}</strong></template>
      <template #description>{{ $t('approved_positions_will_be_added_to_the_') }}。</template>
    </a-alert>

    <ReviewPositionModal
      v-model:visible="reviewVisible"
      :position="selectedRecord"
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
import { getPositionMeta, type PositionMetaOption } from '@osg/shared/api/admin/position'
import RejectPositionModal from './components/RejectPositionModal.vue'
import ReviewPositionModal from './components/ReviewPositionModal.vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const positionColumns = [
  { title: t('company_position'), dataIndex: 'companyName', key: 'companyName', width: 280 },
  { title: t('job_classification'), dataIndex: 'positionCategory', key: 'positionCategory', width: 180 },
  { title: t('submitting_student'), dataIndex: 'studentName', key: 'studentName', width: 140 },
  { title: t('submission_time'), dataIndex: 'submittedAt', key: 'submittedAt', width: 140 },
  { title: t('status'), dataIndex: 'status', key: 'status', width: 100 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 200 },
]

const companyCategoryOptions = ref<PositionMetaOption[]>([])

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
    companyCategoryOptions.value = meta.industries || []
  } catch {
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
  message.success(t('student_submitted_position_approved'))
  await loadRows()
}

const handleReject = async (payload: RejectStudentPositionPayload) => {
  if (!selectedRecord.value) {
    return
  }
  await rejectStudentPosition(selectedRecord.value.studentPositionId, payload)
  rejectVisible.value = false
  message.success(t('student_submitted_position_rejected'))
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
  const mapping: Record<string, string> = {
    summer: t('summer_internship'),
    fulltime: t('full_time_recruitment'),
    offcycle: t('non_standard_cycle'),
    spring: t('spring_internship'),
    events: t('recruitment_event')
  }
  return mapping[value || ''] || value || '-'
}

const getCategoryColor = (value?: string) => {
  if (value === 'fulltime') return 'purple'
  if (value === 'offcycle') return 'orange'
  if (value === 'spring') return 'green'
  return 'blue'
}

const formatStatus = (value?: string) => {
  if (value === 'approved') return t('approved')
  if (value === 'rejected') return t('rejected')
  return t('pending_review')
}

const getStatusColor = (value?: string) => {
  if (value === 'approved') return 'green'
  if (value === 'rejected') return 'red'
  return 'orange'
}

const formatRelativeTime = (value?: string) => {
  if (!value) return t('just_submitted')

  const submitted = new Date(value).getTime()
  if (Number.isNaN(submitted)) return t('just_submitted')

  const diffHours = Math.max(0, Math.floor((Date.now() - submitted) / (1000 * 60 * 60)))
  if (diffHours < 1) return `1 ${t('within_hours')}`
  if (diffHours < 24) return `${diffHours} ${t('hours_ago')}`
  return `${Math.floor(diffHours / 24)} ${t('days_ago')}`
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
:deep(.row-pending) {
  background: #fef3c7;
}
</style>
