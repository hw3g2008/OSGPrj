<template>
  <div class="osg-page">
    <PageHeader
      :title-zh="t('assistant.mockPractice.title')"
      title-en="Mock Practice"
    />

    <!-- 错误提示 -->
    <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" style="border-radius: 8px;">
      <template #action>
        <a-button size="small" @click="loadRecords">{{ t('assistant.mockPractice.k1') }}</a-button>
      </template>
    </a-alert>

    <!-- 单栏：我管理的学员 -->
    <a-card v-else :bordered="false" id="mock-content-managed">
      <template #title>
        <span class="page-title">{{ t('assistant.mockPractice.managedStudents') }}</span>
      </template>

      <div class="filters-row">
        <a-select v-model:value="filters.practiceType" :placeholder="t('assistant.mockPractice.k6')" allow-clear style="width: 140px;">
          <a-select-option v-for="option in practiceTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
        </a-select>
        <a-button type="primary" @click="handleSearch">
          <template #icon><SearchOutlined /></template>
          {{ t('assistant.mockPractice.k2') }}
        </a-button>
        <a-button type="text" @click="resetFilters">
          <template #icon><ReloadOutlined /></template>
          {{ t('assistant.mockPractice.k3') }}
        </a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="filteredRecords"
        :row-key="(r: AssistantMockPracticeRecord) => r.practiceId"
        :loading="loading"
        :pagination="tablePagination"
        :scroll="{ x: 1100 }"
        :locale="t('assistant.mockPractice.k7')"
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
          <template v-else-if="column.dataIndex === 'mentorName'">
            <div>
              <div style="font-weight: 500;">{{ record.mentorNames || t('assistant.mockPractice.k22') }}</div>
              <div style="font-size: 11px; color: var(--muted);">{{ record.mentorBackgrounds || t('assistant.mockPractice.k23') }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'reportedLessonCount'">
            <span v-if="resolveReportedCount(record) != null" style="font-weight: 600; color: var(--primary);">
              {{ resolveReportedCount(record) }}
            </span>
            <span v-else style="color: var(--muted);">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" class="link-button" @click="openDetail(record)">{{ t('assistant.mockPractice.k4') }}</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 详情弹窗：暂仅展示行内字段；按 practiceId 拉多条课消反馈待后端 detail 端点（Step4-F3）-->
    <OverlaySurfaceModal
      :open="detailModal.visible"
      surface-id="assistant-mock-practice-detail"
      :title="t('assistant.mockPractice.k8')"
      width="720px"
      :show-footer="false"
      :body-class="['assistant-mock-practice-detail__body', 'osg-modal-form']"
      @cancel="closeDetail"
    >
      <template v-if="detailModal.record">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item :label="t('assistant.mockPractice.k9')">{{ detailModal.record.studentId ?? '-' }}</a-descriptions-item>
          <a-descriptions-item :label="t('assistant.mockPractice.k10')">{{ detailModal.record.studentName || '-' }}</a-descriptions-item>
          <a-descriptions-item :label="t('assistant.mockPractice.k11')">{{ practiceTypeLabel(detailModal.record.practiceType) }}</a-descriptions-item>
          <a-descriptions-item :label="t('assistant.mockPractice.k12')">{{ formatDateTime(detailModal.record.submittedAt) }}</a-descriptions-item>
          <a-descriptions-item :label="t('assistant.mockPractice.k13')">{{ detailModal.record.mentorNames || t('assistant.mockPractice.k22') }}</a-descriptions-item>
          <a-descriptions-item :label="t('assistant.mockPractice.k14')">{{ resolveReportedCount(detailModal.record) ?? '-' }}</a-descriptions-item>
        </a-descriptions>

        <div class="detail-section">
          <span class="detail-label">{{ t('assistant.mockPractice.k5') }}</span>
          <div class="detail-panel">{{ detailModal.record.requestContent || t('assistant.mockPractice.k24') }}</div>
        </div>

        <a-alert
          type="info"
          show-icon
          style="margin-top: 16px; border-radius: 8px;"
          :message="t('assistant.mockPractice.k15')"
        />
      </template>
    </OverlaySurfaceModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { OverlaySurfaceModal, PracticeTypeTag, StudentAvatarCell } from '@osg/shared/components'
import {
  getAssistantMockPracticeList,
  type AssistantMockPracticeRecord,
} from '@osg/shared/api'

const { t } = useI18n()

const practiceTypeOptions = [
  { value: 'mock_interview', label: t('assistant.mockPractice.k16') },
  { value: 'communication_test', label: t('assistant.mockPractice.k17') },
  { value: 'relation_test', label: t('assistant.mockPractice.k18') },
  { value: 'midterm', label: t('assistant.mockPractice.k19') },
]

const columns = [
  { title: t('assistant.mockPractice.k9'), dataIndex: 'studentId', key: 'studentId', width: 100, fixed: 'left' as const },
  { title: t('assistant.mockPractice.k10'), dataIndex: 'studentName', key: 'studentName', width: 180 },
  { title: t('assistant.mockPractice.k11'), dataIndex: 'practiceType', key: 'practiceType', width: 130 },
  { title: t('assistant.mockPractice.k12'), dataIndex: 'submittedAt', key: 'submittedAt', width: 130 },
  { title: t('assistant.mockPractice.k13'), dataIndex: 'mentorName', key: 'mentorName', width: 160 },
  { title: t('assistant.mockPractice.k14'), dataIndex: 'reportedLessonCount', key: 'reportedLessonCount', width: 130 },
  { title: t('assistant.mockPractice.k20'), dataIndex: 'action', key: 'action', width: 110, fixed: 'right' as const },
]

const loading = ref(true)
const errorMessage = ref('')
const records = ref<AssistantMockPracticeRecord[]>([])

const filters = reactive({
  practiceType: undefined as string | undefined,
})

const detailModal = reactive<{
  visible: boolean
  record: AssistantMockPracticeRecord | null
}>({
  visible: false,
  record: null,
})

const filteredRecords = computed(() =>
  records.value.filter((record) => !filters.practiceType || record.practiceType === filters.practiceType),
)

const tablePagination = computed(() => ({
  total: filteredRecords.value.length,
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`, // TODO(i18n-complex)
}))

function practiceTypeLabel(value?: string) {
  const match = practiceTypeOptions.find((option) => option.value === value)
  return match ? match.label : value || '-'
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

function resolveReportedCount(record: AssistantMockPracticeRecord | null): number | null {
  if (!record) return null
  const candidate = (record as unknown as Record<string, unknown>).reportedLessonCount
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate
  return null
}

function resetFilters() {
  filters.practiceType = undefined
}

function handleSearch() {
  void loadRecords()
}

function openDetail(record: AssistantMockPracticeRecord) {
  detailModal.record = record
  detailModal.visible = true
}

function closeDetail() {
  detailModal.visible = false
  detailModal.record = null
}

async function loadRecords() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await getAssistantMockPracticeList()
    records.value = response.rows || []
  } catch (error: any) {
    errorMessage.value = error?.message || t('assistant.mockPractice.k21')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadRecords()
})
</script>

<style scoped>
.page-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

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
