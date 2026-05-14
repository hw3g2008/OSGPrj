<template>
  <div class="osg-page">
    <PageHeader title-zh="学员求职总览" title-en="Job Overview" :description="$t('view_job_search_progress_of_students_i_c')">
      <template #actions>
        <a-button @click="handleExport">
          <template #icon><ExportOutlined /></template>
          {{ $t('export') }}
        </a-button>
      </template>
    </PageHeader>

    <!-- 面试日历 -->
    <InterviewCalendar :events="calendarRecords" />

    <!-- 筛选条件 -->
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <a-input v-model:value="filters.keyword" :placeholder="`${$t('search_student_name')}...`" allow-clear style="width: 180px;" @press-enter="handleSearch" />
      <a-select v-model:value="filters.type" :placeholder="$t('all_types')" allow-clear style="width: 140px;">
        <a-select-option value="coaching">{{ $t('coached_students') }}</a-select-option>
        <a-select-option value="managed">{{ $t('managed_students') }}</a-select-option>
      </a-select>
      <a-select v-model:value="filters.company" :placeholder="$t('all_companies')" allow-clear style="width: 140px;">
        <a-select-option v-for="option in companyOptions" :key="option" :value="option">{{ option }}</a-select-option>
      </a-select>
      <a-select v-model:value="filters.stage" :placeholder="$t('all_status')" allow-clear style="width: 140px;">
        <a-select-option v-for="option in stageOptions" :key="option" :value="option">{{ option }}</a-select-option>
      </a-select>
      <a-button type="primary" @click="handleSearch">
        <template #icon><SearchOutlined /></template>
        {{ $t('search') }}
      </a-button>
    </div>

    <!-- 错误提示 -->
    <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" style="border-radius: 8px;">
      <template #action>
        <a-button size="small" @click="loadOverview">{{ $t('reload') }}</a-button>
      </template>
    </a-alert>

    <!-- 学员求职列表 -->
    <a-card v-else :bordered="false">
      <template #title>
        <div style="display: flex; gap: 4px; background: var(--bg); padding: 3px; border-radius: 6px; width: fit-content;">
          <button :class="['job-tab', activeTab === 'coaching' ? 'job-tab-active job-tab-coaching' : '']" @click="activeTab = 'coaching'">
            <i class="mdi mdi-school" style="margin-right: 4px;" />我辅导的学员
            <span class="job-tab-badge">{{ coachingRecords.length }}</span>
          </button>
          <button :class="['job-tab', activeTab === 'managed' ? 'job-tab-active job-tab-managed' : '']" @click="activeTab = 'managed'">
            <i class="mdi mdi-account-group" style="margin-right: 4px;" />我管理的学员
            <span class="job-tab-badge">{{ managedRecords.length }}</span>
          </button>
        </div>
      </template>

      <!-- 我辅导的学员 -->
      <template v-if="activeTab === 'coaching'">
        <a-table
          :columns="coachingColumns"
          :data-source="coachingRecords"
          :row-key="(r: AssistantJobOverviewRecord) => r.id"
          :loading="loading"
          :pagination="coachingPagination"
          :scroll="{ x: 900 }"
          :row-class-name="(record: AssistantJobOverviewRecord) => rowClassName(record)"
          :locale="{ emptyText: $t('no_active_job_search_records_for_coached') }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'studentName'">
              <StudentAvatarCell :name="record.studentName" :id="record.studentId" />
            </template>
            <template v-else-if="column.dataIndex === 'company'">
              <CompanyPositionCell :company="record.company" :position="record.position" :location="record.location" />
            </template>
            <template v-else-if="column.dataIndex === 'interviewStage'">
              <StageTag :stage="record.interviewStage" />
            </template>
            <template v-else-if="column.dataIndex === 'interviewTime'">
              <InterviewTimeCell :time="formatDateTime(record.interviewTime)" :hint="formatScheduleHint(record.interviewTime)" />
            </template>
            <template v-else-if="column.dataIndex === 'coachingStatus'">
              <CoachingStatusTag :status="record.coachingStatus" :fallback="$t('not_applied')" />
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <a-button type="link" size="small" class="link-button" @click="selectedId = record.id">{{ $t('view_details') }}</a-button>
            </template>
          </template>
        </a-table>
      </template>

      <!-- 我管理的学员 -->
      <template v-else>
        <a-alert type="info" show-icon style="margin-bottom: 12px; border-radius: 8px;">
          <template #message>{{ $t('view_job_search_progress_of_managed_stud') }}</template>
        </a-alert>
        <a-table
          id="assistant-job-content-readonly"
          :columns="managedColumns"
          :data-source="managedRecords"
          :row-key="(r: AssistantJobOverviewRecord) => r.id"
          :loading="loading"
          :pagination="managedPagination"
          :scroll="{ x: 1100 }"
          :row-class-name="(record: AssistantJobOverviewRecord) => rowClassName(record)"
          :locale="{ emptyText: $t('no_job_search_records_for_managed_studen') }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'studentName'">
              <StudentAvatarCell :name="record.studentName" :id="record.studentId" />
            </template>
            <template v-else-if="column.dataIndex === 'company'">
              <CompanyPositionCell :company="record.company" :position="record.position" :location="record.location" />
            </template>
            <template v-else-if="column.dataIndex === 'interviewStage'">
              <StageTag :stage="record.interviewStage" />
            </template>
            <template v-else-if="column.dataIndex === 'interviewTime'">
              <InterviewTimeCell :time="formatDateTime(record.interviewTime)" :hint="formatScheduleHint(record.interviewTime)" />
            </template>
            <template v-else-if="column.dataIndex === 'coachingStatus'">
              <CoachingStatusTag :status="record.coachingStatus" :fallback="$t('not_applied')" />
            </template>
            <template v-else-if="column.dataIndex === 'mentorName'">
              <div><strong>{{ record.mentorName || $t('to_be_allocated') }}</strong><div style="font-size: 11px; color: var(--muted);">{{ record.mentorBackground || $t('info_pending') }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <a-button type="link" size="small" class="link-button" @click="selectedId = record.id">{{ $t('view_details') }}</a-button>
            </template>
          </template>
        </a-table>
      </template>
    </a-card>

    <!-- 跟进详情 -->
    <a-card v-if="selectedRecord" :bordered="false" :title="$t('follow_up_details')">
      <template #extra>
        <span style="color: var(--muted); font-size: 12px;">{{ selectedRecord.studentName || '-' }}</span>
      </template>
      <div class="detail-grid">
        <div><span class="detail-label">{{ $t('student') }}</span><div class="detail-value">{{ selectedRecord.studentName || '-' }}</div></div>
        <div><span class="detail-label">{{ $t('position') }}</span><div class="detail-value">{{ selectedRecord.position || '-' }}</div></div>
        <div><span class="detail-label">{{ $t('company') }}</span><div class="detail-value">{{ selectedRecord.company || '-' }}</div></div>
        <div><span class="detail-label">{{ $t('location') }}</span><div class="detail-value">{{ selectedRecord.location || '-' }}</div></div>
        <div><span class="detail-label">{{ $t('stage') }}</span><div class="detail-value">{{ selectedRecord.interviewStage || $t('not_updated') }}</div></div>
        <div><span class="detail-label">{{ $t('interview_time') }}</span><div class="detail-value">{{ formatDateTime(selectedRecord.interviewTime) }}</div></div>
        <div><span class="detail-label">{{ $t('counseling_status') }}</span><div class="detail-value">{{ selectedRecord.coachingStatus || $t('not_followed_up') }}</div></div>
        <div><span class="detail-label">{{ $t('result') }}</span><div class="detail-value">{{ selectedRecord.result || $t('in_progress') }}</div></div>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { InterviewCalendar, StageTag, CoachingStatusTag, StudentAvatarCell, CompanyPositionCell, InterviewTimeCell } from '@osg/shared/components'
import {
  getAssistantJobOverviewCalendar,
  getAssistantJobOverviewList,
  type AssistantJobOverviewRecord,
} from '@osg/shared/api'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
interface ExtendedRecord extends AssistantJobOverviewRecord {
  mentorName?: string
  mentorBackground?: string
}

type ActiveTab = 'coaching' | 'managed'

const coachingColumns = [
  { title: t('student'), dataIndex: 'studentName', key: 'studentName', width: 160, fixed: 'left' as const },
  { title: t('company_position'), dataIndex: 'company', key: 'company', width: 200 },
  { title: t('stage'), dataIndex: 'interviewStage', key: 'interviewStage', width: 130 },
  { title: t('interview_time'), dataIndex: 'interviewTime', key: 'interviewTime', width: 140 },
  { title: t('counseling_status'), dataIndex: 'coachingStatus', key: 'coachingStatus', width: 110 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 90, fixed: 'right' as const },
]

const managedColumns = [
  { title: t('student'), dataIndex: 'studentName', key: 'studentName', width: 160, fixed: 'left' as const },
  { title: t('company_position'), dataIndex: 'company', key: 'company', width: 200 },
  { title: t('stage'), dataIndex: 'interviewStage', key: 'interviewStage', width: 130 },
  { title: t('interview_time'), dataIndex: 'interviewTime', key: 'interviewTime', width: 140 },
  { title: t('counseling_status'), dataIndex: 'coachingStatus', key: 'coachingStatus', width: 110 },
  { title: t('mentor'), dataIndex: 'mentorName', key: 'mentorName', width: 120 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 90, fixed: 'right' as const },
]

const loading = ref(true)
const errorMessage = ref('')
const activeTab = ref<ActiveTab>('coaching')
const records = ref<ExtendedRecord[]>([])
const calendarRecords = ref<AssistantJobOverviewRecord[]>([])
const selectedId = ref<number | null>(null)

const filters = reactive({
  keyword: '',
  type: undefined as string | undefined,
  company: undefined as string | undefined,
  stage: undefined as string | undefined,
})

const filteredRecords = computed(() =>
  records.value.filter((record) => {
    const keyword = (filters.keyword || '').trim().toLowerCase()
    const matchesKeyword =
      !keyword ||
      [record.studentName, record.company, record.position]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))

    return (
      matchesKeyword &&
      (!filters.company || record.company === filters.company) &&
      (!filters.stage || record.interviewStage === filters.stage)
    )
  }),
)

const coachingRecords = computed(() => filteredRecords.value)
const managedRecords = computed(() => filteredRecords.value)

const coachingPagination = computed(() => ({
  total: coachingRecords.value.length,
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
}))

const managedPagination = computed(() => ({
  total: managedRecords.value.length,
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
}))

const selectedRecord = computed(
  () => filteredRecords.value.find((record) => record.id === selectedId.value) || null,
)

const companyOptions = computed(() =>
  Array.from(new Set(records.value.map((record) => record.company).filter(Boolean))) as string[],
)

const stageOptions = computed(() =>
  Array.from(new Set(records.value.map((record) => record.interviewStage).filter(Boolean))) as string[],
)

function formatDateTime(value?: string) {
  if (!value) return t('not_scheduled')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatScheduleHint(value?: string) {
  if (!value) return t('no_interview_scheduled')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t('time_to_be_parsed')
  const diff = date.getTime() - Date.now()
  const day = Math.ceil(diff / (24 * 60 * 60 * 1000))
  if (day < 0) return t('interview_time_has_passed')
  if (day === 0) return t('today')
  return `还剩 ${day} 天`
}

function rowClassName(record: ExtendedRecord): string {
  const status = (record.coachingStatus || '').toLowerCase()
  if (status.includes('新') || status.includes('new')) return 'row-new'
  if (status.includes(t('coaching')) || status.includes('coach')) return 'row-coaching'
  if (status.includes('待') || status.includes('pending')) return 'row-pending'
  const stage = (record.interviewStage || '').toLowerCase()
  if (stage.includes('offer') || stage.includes('reject') || stage.includes('withdrawn') || stage.includes(t('reject')) || stage.includes(t('abandoned_2'))) return 'row-ended'
  return ''
}

function handleSearch() {
  void loadOverview()
}

async function handleExport() {
  const rows = filteredRecords.value
  if (!rows.length) return

  const header = '学员,公司,岗位,地点,面试阶段,面试时间,辅导状态,结果\n'
  const body = rows
    .map((r) =>
      [r.studentName, r.company, r.position, r.location, r.interviewStage, r.interviewTime, r.coachingStatus, r.result]
        .map((v) => `"${String(v || '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n')

  const blob = new Blob(['\uFEFF' + header + body], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `求职总览_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

async function loadOverview() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [listResponse, calendarResponse] = await Promise.all([
      getAssistantJobOverviewList({
        company: filters.company,
        coachingStatus: filters.stage,
      }),
      getAssistantJobOverviewCalendar(),
    ])

    records.value = listResponse.rows || []
    calendarRecords.value = calendarResponse || []
  } catch (error: any) {
    errorMessage.value = error?.message || '求职总览暂时无法加载，请稍后重试。'
  } finally {
    loading.value = false
  }
}

watch(
  filteredRecords,
  (value) => {
    if (!value.length) {
      selectedId.value = null
      return
    }
    if (!value.some((record) => record.id === selectedId.value)) {
      selectedId.value = value[0].id
    }
  },
  { immediate: true },
)

onMounted(() => {
  void loadOverview()
})
</script>

<style scoped>
/* ---- Tab 按钮（对齐 Admin job-overview） ---- */
.job-tab {
  padding: 6px 14px;
  font-size: 12px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
}
.job-tab:hover { background: #e2e8f0; }
.job-tab-active { color: #fff; font-weight: 600; }
.job-tab-coaching.job-tab-active { background: var(--primary); }
.job-tab-managed.job-tab-active { background: #8B5CF6; }
.job-tab-badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  margin-left: 4px;
}

/* ---- 头像 ---- */
.avatar {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

/* ---- 行高亮（原型设计） ---- */
:deep(.row-new) { background: linear-gradient(90deg, #FEE2E2, #FEF2F2); border-left: 4px solid #EF4444; }
:deep(.row-coaching) { background: #F3E8FF; }
:deep(.row-stage-update) { background: #DBEAFE; }
:deep(.row-pending) { background: #FEF3C7; }
:deep(.row-ended) { opacity: 0.7; }

/* ---- 详情面板 ---- */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.detail-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 700;
  color: var(--muted);
  font-size: 12px;
}
.detail-value {
  font-weight: 600;
}
.link-button {
  padding: 0;
}

@media (max-width: 900px) {
  .detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

