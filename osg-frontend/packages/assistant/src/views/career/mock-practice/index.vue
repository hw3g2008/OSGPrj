<template>
  <div class="osg-page">
    <PageHeader
      :title-zh="$t('simulated_application_management')"
      title-en="Mock Practice"
      :description="$t('handle_student_mock_interview_interperso')"
    />

    <!-- 统计卡片 -->
    <a-row :gutter="12">
      <a-col v-for="card in statsCards" :key="card.key" :xs="12" :sm="12" :md="6">
        <a-card :bordered="false" :body-style="{ textAlign: 'center', padding: '16px' }">
          <div :style="{ fontSize: '28px', fontWeight: 700, color: card.color }">{{ card.value }}</div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">{{ card.label }}</div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 错误提示 -->
    <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" style="border-radius: 8px;">
      <template #action>
        <a-button size="small" @click="loadRecords">{{ $t('reload') }}</a-button>
      </template>
    </a-alert>

    <!-- Tab + 表格 -->
    <a-card v-else :bordered="false">
      <template #title>
        <div style="display: flex; gap: 4px; background: var(--bg); padding: 3px; border-radius: 6px; width: fit-content;">
          <button
            id="mock-tab-coaching"
            :class="['mock-tab', activeTab === 'coaching' ? 'mock-tab-active mock-tab-coaching' : '']"
            @click="activeTab = 'coaching'"
          >
            <i class="mdi mdi-school" style="margin-right: 4px;" />我辅导的学员
            <span class="mock-tab-badge">{{ coachingRecords.length }}</span>
          </button>
          <button
            id="mock-tab-managed"
            :class="['mock-tab', activeTab === 'managed' ? 'mock-tab-active mock-tab-managed' : '']"
            @click="activeTab = 'managed'"
          >
            <i class="mdi mdi-account-group" style="margin-right: 4px;" />我管理的学员
            <span class="mock-tab-badge">{{ managedRecords.length }}</span>
          </button>
        </div>
      </template>

      <!-- 辅导 Tab -->
      <template v-if="activeTab === 'coaching'">
        <a-alert type="info" show-icon style="margin-bottom: 12px; border-radius: 8px;">
          <template #message>{{ $t('the_following_are_mock_interview_records') }}</template>
        </a-alert>

        <div class="filters-row">
          <a-select v-model:value="filters.practiceType" :placeholder="$t('all_types')" allow-clear style="width: 140px;">
            <a-select-option v-for="option in practiceTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
          <a-select v-model:value="filters.status" :placeholder="$t('all_status')" allow-clear style="width: 130px;">
            <a-select-option v-for="option in coachingStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
          <a-input v-model:value="filters.keyword" :placeholder="`${$t('search_student_name')}/ID`" allow-clear style="width: 180px;" @press-enter="handleSearch" />
          <a-button type="primary" @click="handleSearch">
            <template #icon><SearchOutlined /></template>
            {{ $t('filter') }}
          </a-button>
          <a-button type="text" @click="resetFilters">
            <template #icon><ReloadOutlined /></template>
            {{ $t('reset') }}
          </a-button>
        </div>

        <a-table
          :columns="coachingColumns"
          :data-source="coachingRecords"
          :row-key="(r: AssistantMockPracticeRecord) => r.practiceId"
          :loading="loading"
          :pagination="tablePagination(coachingRecords.length)"
          :scroll="{ x: 900 }"
          :row-class-name="(record: AssistantMockPracticeRecord) => rowClassName(record)"
          :locale="{ emptyText: $t('no_mock_interview_records_to_display_und') }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'studentName'">
              <StudentAvatarCell :name="record.studentName" :id="record.studentId" />
            </template>
            <template v-else-if="column.dataIndex === 'practiceType'">
              <PracticeTypeTag :practice-type="record.practiceType" />
            </template>
            <template v-else-if="column.dataIndex === 'submittedAt'">
              <span style="font-size: 12px;">{{ formatDateTime(record.submittedAt) }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'status'">
              <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'completedHours'">
              <span v-if="record.completedHours" style="font-weight: 600; color: var(--primary);">{{ record.completedHours }}h</span>
              <span v-else style="color: var(--muted);">-</span>
            </template>
            <template v-else-if="column.dataIndex === 'feedback'">
              <div v-if="record.feedbackSummary">
                <div :style="{ fontSize: '12px', color: feedbackColor(record.feedbackRating), fontWeight: 500 }">
                  {{ feedbackLabel(record.feedbackRating) }}
                </div>
                <div style="font-size: 11px; color: var(--muted);">{{ record.feedbackSummary }}</div>
              </div>
              <span v-else style="color: var(--muted);">-</span>
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <a-space :size="8">
                <a-button
                  v-if="isNewAssigned(record)"
                  type="primary"
                  size="small"
                  style="background: #22C55E; border-color: #22C55E;"
                  @click="confirmRecord(record)"
                >
                  <template #icon><CheckOutlined /></template>
                  {{ $t('confirm') }}
                </a-button>
                <a-button type="link" size="small" class="link-button" @click="openDetail(record)">{{ $t('view_details') }}</a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </template>

      <!-- 管理 Tab -->
      <template v-else>
        <a-alert type="success" show-icon style="margin-bottom: 12px; border-radius: 8px;">
          <template #message>{{ $t('the_following_are_mock_interview_records_2') }}）</template>
        </a-alert>

        <div class="filters-row">
          <a-select v-model:value="filters.practiceType" :placeholder="$t('all_types')" allow-clear style="width: 140px;">
            <a-select-option v-for="option in practiceTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
          <a-select v-model:value="filters.status" :placeholder="$t('all_status')" allow-clear style="width: 130px;">
            <a-select-option v-for="option in managedStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
          <a-input v-model:value="filters.keyword" :placeholder="`${$t('search_student_name')}/ID`" allow-clear style="width: 180px;" @press-enter="handleSearch" />
          <a-input v-model:value="filters.mentor" :placeholder="$t('search_for_tutor_name')" allow-clear style="width: 150px;" @press-enter="handleSearch" />
          <a-button type="primary" @click="handleSearch">
            <template #icon><SearchOutlined /></template>
            {{ $t('filter') }}
          </a-button>
          <a-button type="text" @click="resetFilters">
            <template #icon><ReloadOutlined /></template>
            {{ $t('reset') }}
          </a-button>
        </div>

        <a-table
          id="mock-content-managed"
          :columns="managedColumns"
          :data-source="managedRecords"
          :row-key="(r: AssistantMockPracticeRecord) => r.practiceId"
          :loading="loading"
          :pagination="tablePagination(managedRecords.length)"
          :scroll="{ x: 1100 }"
          :row-class-name="(record: AssistantMockPracticeRecord) => rowClassName(record)"
          :locale="{ emptyText: $t('no_mock_interview_records_to_display_und') }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'studentName'">
              <StudentAvatarCell :name="record.studentName" :id="record.studentId" />
            </template>
            <template v-else-if="column.dataIndex === 'practiceType'">
              <PracticeTypeTag :practice-type="record.practiceType" />
            </template>
            <template v-else-if="column.dataIndex === 'submittedAt'">
              <span style="font-size: 12px;">{{ formatDateTime(record.submittedAt) }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'status'">
              <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'mentorName'">
              <div>
                <div style="font-weight: 500;">{{ record.mentorNames || $t('to_be_allocated') }}</div>
                <div style="font-size: 11px; color: var(--muted);">{{ record.mentorBackgrounds || $t('info_pending') }}</div>
              </div>
            </template>
            <template v-else-if="column.dataIndex === 'completedHours'">
              <span v-if="record.completedHours" style="font-weight: 600; color: var(--primary);">{{ record.completedHours }}h</span>
              <span v-else style="color: var(--muted);">-</span>
            </template>
            <template v-else-if="column.dataIndex === 'feedback'">
              <div v-if="record.feedbackSummary">
                <div :style="{ fontSize: '12px', color: feedbackColor(record.feedbackRating), fontWeight: 500 }">
                  {{ feedbackLabel(record.feedbackRating) }}
                </div>
                <div style="font-size: 11px; color: var(--muted);">{{ record.feedbackSummary }}</div>
              </div>
              <span v-else style="color: var(--muted);">-</span>
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <a-button type="link" size="small" class="link-button" @click="openDetail(record)">{{ $t('view_details') }}</a-button>
            </template>
          </template>
        </a-table>
      </template>
    </a-card>

    <!-- 详情弹窗 -->
    <a-modal
      v-model:open="detailModal.visible"
      :title="detailModal.record ? `模拟应聘详情 · ${detailModal.record.studentName || '-'}` : $t('mock_interview_details')"
      :footer="null"
      width="720px"
      :after-close="onDetailClosed"
    >
      <template v-if="detailModal.record">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="状态">{{ statusLabel(detailModal.record.status) }}</a-descriptions-item>
          <a-descriptions-item label="安排时间">{{ formatDateTime(detailModal.record.scheduledAt || detailModal.record.submittedAt) }}</a-descriptions-item>
          <a-descriptions-item label="导师">{{ detailModal.record.mentorNames || $t('not_yet_scheduled') }}</a-descriptions-item>
          <a-descriptions-item label="已完成课时">{{ detailModal.record.completedHours || 0 }} h</a-descriptions-item>
        </a-descriptions>

        <div class="detail-section">
          <span class="detail-label">{{ $t('application_content') }}</span>
          <div class="detail-panel">{{ detailModal.record.requestContent || $t('no_application_content') }}</div>
        </div>

        <div class="detail-section">
          <span class="detail-label">{{ $t('feedback_summary') }}</span>
          <div class="detail-panel">{{ detailModal.record.feedbackSummary || '当前记录尚未回填反馈摘要。' }}</div>
        </div>

        <a-alert
          type="info"
          show-icon
          style="margin-top: 16px; border-radius: 8px;"
          :message="`${$t('this_section_summarizes_the_application_')}。`"
        />
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { CheckOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { PracticeTypeTag, StudentAvatarCell } from '@osg/shared/components'
import {
  getAssistantMockPracticeList,
  confirmAssistantMockPractice,
  type AssistantMockPracticeRecord,
} from '@osg/shared/api'
// §D.2 asst mock-practice 状态显示接入 SSOT composable
import { deriveMockPracticeStatus } from '@osg/shared/composables'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
type ActiveTab = 'coaching' | 'managed'

const practiceTypeOptions = [
  { value: 'mock_interview', label: t('mock_interview') },
  { value: 'communication_test', label: t('communication_test') },
  { value: 'relation_test', label: t('interpersonal_test') },
  { value: 'midterm', label: t('midterm_exam') },
]

const coachingStatusOptions = [
  { value: 'new', label: t('newly_assigned') },
  { value: 'pending', label: t('pending_2') },
  { value: 'completed', label: t('completed') },
  { value: 'cancelled', label: t('canceled') },
]

const managedStatusOptions = [
  { value: 'pending', label: t('pending_2') },
  { value: 'ongoing', label: t('in_progress') },
  { value: 'completed', label: t('completed') },
  { value: 'cancelled', label: t('canceled') },
]

const coachingColumns = [
  { title: t('student'), dataIndex: 'studentName', key: 'studentName', width: 180, fixed: 'left' as const },
  { title: t('type'), dataIndex: 'practiceType', key: 'practiceType', width: 130 },
  { title: t('application_time'), dataIndex: 'submittedAt', key: 'submittedAt', width: 130 },
  { title: t('status'), dataIndex: 'status', key: 'status', width: 110 },
  { title: t('already_in_class'), dataIndex: 'completedHours', key: 'completedHours', width: 100 },
  { title: t('course_feedback'), dataIndex: 'feedback', key: 'feedback', width: 200 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 170, fixed: 'right' as const },
]

const managedColumns = [
  { title: t('student'), dataIndex: 'studentName', key: 'studentName', width: 180, fixed: 'left' as const },
  { title: t('type'), dataIndex: 'practiceType', key: 'practiceType', width: 130 },
  { title: t('application_time'), dataIndex: 'submittedAt', key: 'submittedAt', width: 130 },
  { title: t('status'), dataIndex: 'status', key: 'status', width: 110 },
  { title: t('coaching_mentor'), dataIndex: 'mentorName', key: 'mentorName', width: 150 },
  { title: t('already_in_class'), dataIndex: 'completedHours', key: 'completedHours', width: 100 },
  { title: t('course_feedback'), dataIndex: 'feedback', key: 'feedback', width: 200 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 110, fixed: 'right' as const },
]

const loading = ref(true)
const errorMessage = ref('')
const activeTab = ref<ActiveTab>('coaching')
const records = ref<AssistantMockPracticeRecord[]>([])
const confirmedIds = ref<Set<number>>(new Set())

const filters = reactive({
  keyword: '',
  practiceType: undefined as string | undefined,
  status: undefined as string | undefined,
  mentor: '',
})

const detailModal = reactive<{
  visible: boolean
  record: AssistantMockPracticeRecord | null
}>({
  visible: false,
  record: null,
})

const filteredRecords = computed(() =>
  records.value.filter((record) => {
    const keyword = (filters.keyword || '').trim().toLowerCase()
    const matchesKeyword =
      !keyword ||
      [record.studentName, String(record.studentId || ''), record.requestContent]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))

    const mentorKeyword = (filters.mentor || '').trim().toLowerCase()
    const matchesMentor =
      !mentorKeyword ||
      String(record.mentorNames || '').toLowerCase().includes(mentorKeyword)

    return (
      matchesKeyword &&
      matchesMentor &&
      (!filters.practiceType || record.practiceType === filters.practiceType) &&
      (!filters.status || record.status === filters.status)
    )
  }),
)

const coachingRecords = computed(() => filteredRecords.value)
const managedRecords = computed(() => filteredRecords.value)

function tablePagination(total: number) {
  return {
    total,
    pageSize: 10,
    showSizeChanger: true,
    showTotal: (t: number) => `共 ${t} 条`,
  }
}

const completedCount = computed(
  () => records.value.filter((r) => String(r.status || '').toLowerCase() === 'completed').length,
)

const totalHours = computed(() =>
  records.value.reduce((sum, r) => sum + (Number(r.completedHours) || 0), 0),
)

const statsCards = computed(() => [
  { key: 'coaching', label: t('coached_by_me'), value: coachingRecords.value.length, color: '#3B82F6' },
  { key: 'managed', label: t('managed_by_me'), value: managedRecords.value.length, color: '#22C55E' },
  { key: 'completed', label: t('completed'), value: completedCount.value, color: '#8B5CF6' },
  { key: 'hours', label: t('total_class_hours'), value: `${totalHours.value}h`, color: 'var(--primary)' },
])

function isNewAssigned(record: AssistantMockPracticeRecord) {
  if (confirmedIds.value.has(record.practiceId)) return false
  const status = String(record.status || '').toLowerCase()
  return status === 'new' || status === 'new_assigned'
}

function isMidterm(record: AssistantMockPracticeRecord) {
  const type = String(record.practiceType || '').toLowerCase()
  return type === 'midterm' || type === 'midterm_exam'
}

function rowClassName(record: AssistantMockPracticeRecord): string {
  if (isNewAssigned(record)) return 'row-new'
  if (isMidterm(record)) return 'row-midterm'
  return ''
}

/**
 * §D.2 asst mock-practice 状态显示派生（接入 SSOT composable）
 *
 * deriveMockPracticeStatus 输出 5 态 + tone（success/info/warning/danger/default）
 * 这里把 tone 映射到 a-tag 内建色名，保留对原有特殊值（'new'/'new_assigned'/'ongoing'）的兼容。
 */
function statusLabel(value?: string) {
  if (!value) return t('unlabeled')
  // 特殊兼容值（不在 composable 5 态中）
  if (value === 'new' || value === 'new_assigned') return t('newly_assigned')
  if (value === 'ongoing') return t('in_progress')
  const display = deriveMockPracticeStatus({ status: value })
  return display.label
}

function statusColor(value?: string): string {
  const v = String(value || '').toLowerCase()
  // 特殊兼容值
  if (v === 'new' || v === 'new_assigned') return 'red'
  if (v === 'ongoing') return 'blue'
  const display = deriveMockPracticeStatus({ status: v })
  switch (display.tone) {
    case 'danger': return 'red'
    case 'warning': return 'orange'
    case 'info': return 'blue'
    case 'success': return 'green'
    default: return 'default'
  }
}

function feedbackLabel(value?: number | null) {
  if (value == null) return t('no_rating_yet')
  if (value >= 5) return t('excellent_performance')
  if (value >= 4) return t('good_feedback')
  if (value >= 3) return t('average_feedback')
  return t('feedback_needed')
}

function feedbackColor(value?: number | null): string {
  if (value == null) return 'var(--muted)'
  if (value >= 5) return '#059669'
  if (value >= 4) return '#F59E0B'
  return 'var(--muted)'
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  const hour = String(parsed.getHours()).padStart(2, '0')
  const minute = String(parsed.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hour}:${minute}`
}

function resetFilters() {
  filters.keyword = ''
  filters.practiceType = undefined
  filters.status = undefined
  filters.mentor = ''
}

function handleSearch() {
  void loadRecords()
}

async function confirmRecord(record: AssistantMockPracticeRecord) {
  // §C.6 接入后端 PUT /assistant/mock-practice/{id}/confirm
  try {
    await confirmAssistantMockPractice(record.practiceId)
    confirmedIds.value.add(record.practiceId)
    message.success(`已确认：${record.studentName || t('student')}`)
    void loadRecords()
  } catch (error: any) {
    message.error(error?.message || t('confirmation_failed_please_try_again_lat'))
  }
}

function openDetail(record: AssistantMockPracticeRecord) {
  detailModal.record = record
  detailModal.visible = true
}

function onDetailClosed() {
  detailModal.record = null
}

async function loadRecords() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await getAssistantMockPracticeList()
    records.value = response.rows || []
  } catch (error: any) {
    errorMessage.value = error?.message || '模拟应聘记录暂时无法加载，请稍后重试。'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadRecords()
})
</script>

<style scoped>
/* ---- Tab 按钮（与 Job Overview 一致） ---- */
.mock-tab {
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
.mock-tab:hover {
  background: #e2e8f0;
}
.mock-tab-active {
  color: #fff;
  font-weight: 600;
}
.mock-tab-coaching.mock-tab-active {
  background: var(--primary);
}
.mock-tab-managed.mock-tab-active {
  background: #8B5CF6;
}
.mock-tab-badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  margin-left: 4px;
}

/* ---- 筛选条件行 ---- */
.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

/* ---- 行高亮（原型设计） ---- */
:deep(.row-new) {
  background: linear-gradient(90deg, #FEE2E2, #FEF2F2);
  border-left: 4px solid #EF4444;
}
:deep(.row-midterm) {
  background: #F3E8FF;
}

/* ---- 详情弹窗内容 ---- */
.detail-section {
  margin-top: 18px;
}
.detail-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 700;
  color: var(--muted);
  font-size: 12px;
}
.detail-panel {
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  padding: 14px 16px;
  line-height: 1.7;
  white-space: pre-wrap;
  font-size: 13px;
}

.link-button {
  padding: 0;
}

@media (max-width: 900px) {
  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }
  .filters-row > * {
    width: 100% !important;
  }
}
</style>

