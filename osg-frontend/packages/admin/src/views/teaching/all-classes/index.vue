<template>
  <div class="osg-page">
    <PageHeader :title-zh="t('admin.teaching.allClasses.pageTitle')" title-en="All Classes">
      <template #actions>
        <a-button @click="handleExport">
          <template #icon><ExportOutlined /></template>
          {{ t('admin.teaching.allClasses.export') }}
        </a-button>
      </template>
    </PageHeader>

    <a-alert type="info" show-icon style="margin-bottom: 0">
      <template #message>{{ t('admin.teaching.allClasses.alert.message') }}</template>
      <template #description>
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; align-items: center">
          <a-tag>{{ t('admin.teaching.allClasses.alert.step1') }}</a-tag>
          <span>→</span>
          <a-tag color="orange">{{ t('admin.teaching.allClasses.alert.step2') }}</a-tag>
          <span>→</span>
          <a-tag color="blue">{{ t('admin.teaching.allClasses.alert.step3') }}</a-tag>
          <span>→</span>
          <a-tag color="green">{{ t('admin.teaching.allClasses.alert.step4') }}</a-tag>
        </div>
      </template>
    </a-alert>

    <a-card :bordered="false">
      <a-tabs v-model:activeKey="activeTab" style="margin-bottom: 16px" @change="(key: string) => switchTab(key as AllClassesTab)">
        <a-tab-pane v-for="tab in tabs" :key="tab.key">
          <template #tab>
            {{ tab.label }}
            <a-badge :count="tab.count" :number-style="{ backgroundColor: tabBadgeColor[tab.key] || '#1890ff' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
      </a-tabs>

      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="keyword" :placeholder="t('admin.teaching.allClasses.filter.searchPlaceholder')" allow-clear style="width: 200px" @press-enter="handleSearch" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterCourseType" :placeholder="t('admin.teaching.allClasses.filter.courseTypePlaceholder')" allow-clear style="width: 150px">
            <a-select-option value="onboarding_interview">{{ t('admin.teaching.allClasses.filter.courseTypes.onboarding_interview') }}</a-select-option>
            <a-select-option value="mock_interview">{{ t('admin.teaching.allClasses.filter.courseTypes.mock_interview') }}</a-select-option>
            <a-select-option value="written_test">{{ t('admin.teaching.allClasses.filter.courseTypes.written_test') }}</a-select-option>
            <a-select-option value="midterm_exam">{{ t('admin.teaching.allClasses.filter.courseTypes.midterm_exam') }}</a-select-option>
            <a-select-option value="communication_midterm">{{ t('admin.teaching.allClasses.filter.courseTypes.communication_midterm') }}</a-select-option>
            <a-select-option value="qbank_request">{{ t('admin.teaching.allClasses.filter.courseTypes.qbank_request') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterSource" :placeholder="t('admin.teaching.allClasses.filter.sourcePlaceholder')" allow-clear style="width: 120px">
            <a-select-option value="mentor">{{ t('admin.teaching.allClasses.filter.sources.mentor') }}</a-select-option>
            <a-select-option value="headteacher">{{ t('admin.teaching.allClasses.filter.sources.headteacher') }}</a-select-option>
            <a-select-option value="assistant">{{ t('admin.teaching.allClasses.filter.sources.assistant') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-date-picker v-model:value="filterDateStart" :placeholder="t('admin.teaching.allClasses.filter.dateStart')" value-format="YYYY-MM-DD" style="width: 130px" />
        </a-form-item>
        <a-form-item>
          <a-date-picker v-model:value="filterDateEnd" :placeholder="t('admin.teaching.allClasses.filter.dateEnd')" value-format="YYYY-MM-DD" style="width: 130px" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              {{ t('admin.teaching.allClasses.filter.search') }}
            </a-button>
            <a-button @click="handleReset">{{ t('admin.teaching.allClasses.filter.reset') }}</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-table
        :columns="classColumns"
        :data-source="rows"
        :row-key="(r: AllClassesRow) => r.recordId"
        :locale="{ emptyText: t('admin.teaching.allClasses.empty') }"
        :scroll="{ x: 1100 }"
        :pagination="{ current: currentPage, pageSize, total, simple: false, showTotal: (tot: number) => t('admin.teaching.allClasses.pagination.total', { total: tot }), onChange: onPageChange }"
        :row-class-name="(record: AllClassesRow) => rowClassMap[record.displayStatus] || ''"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'classId'">
            <span style="font-family: monospace; color: #64748b">{{ record.classId || `C${record.recordId}` }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'studentName'">
            <strong>{{ record.studentName }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'courseTypeLabel'">
            <a-tag :color="courseTypeColorMap[record.courseType] || 'blue'">{{ record.courseTypeLabel }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'durationHours'">
            {{ formatHours(record.durationHours) }}
          </template>
          <template v-else-if="column.dataIndex === 'classDate'">
            {{ formatDate(record.classDate) }}
          </template>
          <template v-else-if="column.dataIndex === 'sourceLabel'">
            <a-tag :color="sourceColorMap[record.source] || 'default'">{{ record.sourceLabel }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'displayStatusLabel'">
            <a-tag :color="statusColorMap[record.displayStatus] || 'default'">{{ record.displayStatusLabel }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'rate'">
            <span v-if="record.rate" style="color: #f59e0b; font-weight: 600">⭐{{ record.rate }}</span>
            <span v-else style="color: #94a3b8">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button v-if="record.displayStatus === 'pending'" type="primary" size="small" @click="openDetail(record.recordId)">{{ t('admin.teaching.allClasses.action.review') }}</a-button>
            <a-button v-else type="link" size="small" :danger="record.displayStatus === 'rejected'" @click="openDetail(record.recordId)">{{ t('admin.teaching.allClasses.action.view') }}</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <ClassDetailModal
      :visible="detailVisible"
      :detail="detail"
      @update:visible="detailVisible = $event"
      @approve="handleApprove"
      @reject="handleReject"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import ClassDetailModal from './components/ClassDetailModal.vue'
import {
  getAllClassesDetail,
  getAllClassesList,
  type AllClassesDetail,
  type AllClassesRow,
  type AllClassesSummary,
  type AllClassesTab
} from '@osg/shared/api/admin/allClasses'

const { t } = useI18n()

const tabBadgeColor: Record<string, string> = {
  all: '#1890ff',
  pending: '#faad14',
  unpaid: '#1890ff',
  paid: '#52c41a',
  rejected: '#ff4d4f'
}

const courseTypeColorMap: Record<string, string> = {
  onboarding_interview: 'blue',
  mock_interview: 'green',
  written_test: 'purple',
  midterm_exam: 'purple',
  communication_midterm: 'magenta',
  qbank_request: 'orange'
}

const sourceColorMap: Record<string, string> = {
  mentor: 'purple',
  headteacher: 'green',
  assistant: 'orange'
}

const statusColorMap: Record<string, string> = {
  pending: 'orange',
  unpaid: 'blue',
  paid: 'green',
  rejected: 'red'
}

const rowClassMap: Record<string, string> = {
  pending: 'row-pending',
  unpaid: 'row-unpaid',
  rejected: 'row-rejected'
}

const classColumns = computed(() => [
  { title: t('admin.teaching.allClasses.columns.classId'), dataIndex: 'classId', key: 'classId', width: 80, fixed: 'left' as const },
  { title: t('admin.teaching.allClasses.columns.student'), dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: t('admin.teaching.allClasses.columns.mentor'), dataIndex: 'mentorName', key: 'mentorName', width: 100 },
  { title: t('admin.teaching.allClasses.columns.courseType'), dataIndex: 'courseTypeLabel', key: 'courseTypeLabel', width: 110 },
  { title: t('admin.teaching.allClasses.columns.duration'), dataIndex: 'durationHours', key: 'durationHours', width: 70 },
  { title: t('admin.teaching.allClasses.columns.date'), dataIndex: 'classDate', key: 'classDate', width: 100 },
  { title: t('admin.teaching.allClasses.columns.source'), dataIndex: 'sourceLabel', key: 'sourceLabel', width: 90 },
  { title: t('admin.teaching.allClasses.columns.status'), dataIndex: 'displayStatusLabel', key: 'displayStatusLabel', width: 80 },
  { title: t('admin.teaching.allClasses.columns.rate'), dataIndex: 'rate', key: 'rate', width: 70 },
  { title: t('admin.teaching.allClasses.columns.action'), dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
])

const keyword = ref('')
const filterCourseType = ref('')
const filterSource = ref('')
const filterDateStart = ref('')
const filterDateEnd = ref('')
const activeTab = ref<AllClassesTab>('all')
const currentPage = ref(1)
const pageSize = 10
const total = ref(0)
const rows = ref<AllClassesRow[]>([])
const detailVisible = ref(false)
const detail = ref<AllClassesDetail | null>(null)

const summary = ref<AllClassesSummary>({
  allCount: 0,
  pendingCount: 0,
  unpaidCount: 0,
  paidCount: 0,
  rejectedCount: 0,
  selectedTab: 'all',
  flowSteps: []
})

const tabs = computed(() => ([
  { key: 'all' as const, label: t('admin.teaching.allClasses.tabs.all'), count: summary.value.allCount },
  { key: 'pending' as const, label: t('admin.teaching.allClasses.tabs.pending'), count: summary.value.pendingCount },
  { key: 'unpaid' as const, label: t('admin.teaching.allClasses.tabs.unpaid'), count: summary.value.unpaidCount },
  { key: 'paid' as const, label: t('admin.teaching.allClasses.tabs.paid'), count: summary.value.paidCount },
  { key: 'rejected' as const, label: t('admin.teaching.allClasses.tabs.rejected'), count: summary.value.rejectedCount }
]))

const onPageChange = (page: number) => {
  currentPage.value = page
  void loadData()
}

const loadData = async () => {
  try {
    const response = await getAllClassesList({
      tab: activeTab.value,
      keyword: keyword.value,
      pageNum: currentPage.value,
      pageSize
    })
    rows.value = response.rows ?? []
    summary.value = response.summary
    total.value = response.total ?? 0
  } catch (_error) {
  }
}

const handleSearch = () => {
  currentPage.value = 1
  void loadData()
}

const handleReset = () => {
  keyword.value = ''
  filterCourseType.value = ''
  filterSource.value = ''
  filterDateStart.value = ''
  filterDateEnd.value = ''
  activeTab.value = 'all'
  currentPage.value = 1
  void loadData()
}

const switchTab = (tab: AllClassesTab) => {
  activeTab.value = tab
  currentPage.value = 1
  void loadData()
}

const openDetail = async (recordId: number) => {
  try {
    detail.value = await getAllClassesDetail(recordId)
    detailVisible.value = true
  } catch (_error) {
  }
}

const handleApprove = () => {
  message.success(t('admin.teaching.allClasses.messages.approveSuccess'))
  detailVisible.value = false
  void loadData()
}

const handleReject = () => {
  message.success(t('admin.teaching.allClasses.messages.rejectSuccess'))
  detailVisible.value = false
  void loadData()
}

const handleExport = () => {
  message.info(t('admin.teaching.allClasses.messages.exportInfo'))
}

const formatDate = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const y = date.getFullYear()
  return `${m}/${d}/${y}`
}

const formatHours = (value?: number | null) => {
  return value == null ? '--' : `${value}h`
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped>
:deep(.row-pending) {
  background: rgba(255, 251, 235, 0.6);
}
:deep(.row-unpaid) {
  background: rgba(239, 246, 255, 0.6);
}
:deep(.row-rejected) {
  background: rgba(255, 247, 237, 0.6);
}
</style>
