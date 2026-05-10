<template>
  <div class="osg-page">
    <PageHeader
      title-zh="模拟应聘管理"
      title-en="Mock Practice"
      description="处理学员的模拟面试、人际关系测试、期中考试申请"
    />

    <!-- 错误提示 -->
    <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" style="border-radius: 8px;">
      <template #action>
        <a-button size="small" @click="loadRecords">重新加载</a-button>
      </template>
    </a-alert>

    <!-- 单栏：我管理的学员 -->
    <a-card v-else :bordered="false" id="mock-content-managed">
      <template #title>
        <span class="page-title">我管理的学员 Managed Students</span>
      </template>

      <div class="filters-row">
        <a-select v-model:value="filters.practiceType" placeholder="全部类型" allow-clear style="width: 140px;">
          <a-select-option v-for="option in practiceTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
        </a-select>
        <a-button type="primary" @click="handleSearch">
          <template #icon><SearchOutlined /></template>
          筛选
        </a-button>
        <a-button type="text" @click="resetFilters">
          <template #icon><ReloadOutlined /></template>
          重置
        </a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="filteredRecords"
        :row-key="(r: AssistantMockPracticeRecord) => r.practiceId"
        :loading="loading"
        :pagination="tablePagination"
        :scroll="{ x: 1100 }"
        :locale="{ emptyText: '当前筛选下没有可展示的模拟应聘记录' }"
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
              <div style="font-weight: 500;">{{ record.mentorNames || '待分配' }}</div>
              <div style="font-size: 11px; color: var(--muted);">{{ record.mentorBackgrounds || '信息待补充' }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'reportedLessonCount'">
            <span v-if="resolveReportedCount(record) != null" style="font-weight: 600; color: var(--primary);">
              {{ resolveReportedCount(record) }}
            </span>
            <span v-else style="color: var(--muted);">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" class="link-button" @click="openDetail(record)">查看详情</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 详情弹窗：暂仅展示行内字段；按 practiceId 拉多条课消反馈待后端 detail 端点（Step4-F3）-->
    <a-modal
      v-model:open="detailModal.visible"
      :title="detailModal.record ? `模拟应聘详情 · ${detailModal.record.studentName || '-'}` : '模拟应聘详情'"
      :footer="null"
      width="720px"
      :after-close="onDetailClosed"
    >
      <template v-if="detailModal.record">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="学生 ID">{{ detailModal.record.studentId ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="学生姓名">{{ detailModal.record.studentName || '-' }}</a-descriptions-item>
          <a-descriptions-item label="类型">{{ practiceTypeLabel(detailModal.record.practiceType) }}</a-descriptions-item>
          <a-descriptions-item label="申请时间">{{ formatDateTime(detailModal.record.submittedAt) }}</a-descriptions-item>
          <a-descriptions-item label="辅导老师">{{ detailModal.record.mentorNames || '待分配' }}</a-descriptions-item>
          <a-descriptions-item label="已上报课消数">{{ resolveReportedCount(detailModal.record) ?? '-' }}</a-descriptions-item>
        </a-descriptions>

        <div class="detail-section">
          <span class="detail-label">申请内容</span>
          <div class="detail-panel">{{ detailModal.record.requestContent || '暂无申请内容' }}</div>
        </div>

        <a-alert
          type="info"
          show-icon
          style="margin-top: 16px; border-radius: 8px;"
          message="导师上报的多条课消反馈待后端详情接口接入后展示"
        />
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { PracticeTypeTag, StudentAvatarCell } from '@osg/shared/components'
import {
  getAssistantMockPracticeList,
  type AssistantMockPracticeRecord,
} from '@osg/shared/api'

const practiceTypeOptions = [
  { value: 'mock_interview', label: '模拟面试' },
  { value: 'communication_test', label: '沟通测试' },
  { value: 'relation_test', label: '人际关系测试' },
  { value: 'midterm', label: '期中考试' },
]

const columns = [
  { title: '学生 ID', dataIndex: 'studentId', key: 'studentId', width: 100, fixed: 'left' as const },
  { title: '学生姓名', dataIndex: 'studentName', key: 'studentName', width: 180 },
  { title: '类型', dataIndex: 'practiceType', key: 'practiceType', width: 130 },
  { title: '申请时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 130 },
  { title: '辅导老师', dataIndex: 'mentorName', key: 'mentorName', width: 160 },
  { title: '已上报课消数', dataIndex: 'reportedLessonCount', key: 'reportedLessonCount', width: 130 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 110, fixed: 'right' as const },
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
  showTotal: (t: number) => `共 ${t} 条`,
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
  const candidate = (record as Record<string, unknown>).reportedLessonCount
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
