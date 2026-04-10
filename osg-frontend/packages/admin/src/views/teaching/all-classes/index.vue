<template>
  <div class="osg-page">
    <PageHeader title="全部课程" subtitle="All Classes" description="查看和管理所有课程记录（导师、班主任、助教均可提交）">
      <template #actions>
        <a-button @click="handleExport">
          <template #icon><ExportOutlined /></template>
          导出
        </a-button>
      </template>
    </PageHeader>

    <a-alert type="info" show-icon style="margin-bottom: 0">
      <template #message>课程审核与支付流程</template>
      <template #description>
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; align-items: center">
          <a-tag>① 导师/班主任/助教提交</a-tag>
          <span>→</span>
          <a-tag color="orange">② 待审核</a-tag>
          <span>→</span>
          <a-tag color="blue">③ 未支付</a-tag>
          <span>→</span>
          <a-tag color="green">④ 已支付</a-tag>
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
          <a-input v-model:value="keyword" placeholder="搜索学员/导师姓名..." allow-clear style="width: 200px" @press-enter="handleSearch" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterCourseType" placeholder="全部课程类型" allow-clear style="width: 150px">
            <a-select-option value="onboarding_interview">入职面试</a-select-option>
            <a-select-option value="mock_interview">模拟面试</a-select-option>
            <a-select-option value="written_test">笔试辅导</a-select-option>
            <a-select-option value="midterm_exam">模拟期中考试</a-select-option>
            <a-select-option value="communication_midterm">人际关系期中考试</a-select-option>
            <a-select-option value="qbank_request">题库申请</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterSource" placeholder="全部来源" allow-clear style="width: 120px">
            <a-select-option value="mentor">导师端</a-select-option>
            <a-select-option value="headteacher">班主任端</a-select-option>
            <a-select-option value="assistant">助教端</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-date-picker v-model:value="filterDateStart" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 130px" />
        </a-form-item>
        <a-form-item>
          <a-date-picker v-model:value="filterDateEnd" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 130px" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              搜索
            </a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-table
        :columns="classColumns"
        :data-source="rows"
        :row-key="(r: AllClassesRow) => r.recordId"
        :locale="{ emptyText: '当前筛选下暂无课程记录' }"
        :scroll="{ x: 1100 }"
        :pagination="{ current: currentPage, pageSize, total, showTotal: (t: number) => `共 ${t} 条记录`, onChange: onPageChange }"
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
            <a-button v-if="record.displayStatus === 'pending'" type="primary" size="small" @click="openDetail(record.recordId)">审核</a-button>
            <a-button v-else type="link" size="small" :danger="record.displayStatus === 'rejected'" @click="openDetail(record.recordId)">查看</a-button>
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
import { message } from 'ant-design-vue'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import ClassDetailModal from './components/ClassDetailModal.vue'
import {
  getAllClassesDetail,
  getAllClassesList,
  type AllClassesDetail,
  type AllClassesRow,
  type AllClassesSummary,
  type AllClassesTab
} from '@osg/shared/api/admin/allClasses'

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

const classColumns = [
  { title: '课程ID', dataIndex: 'classId', key: 'classId', width: 80 },
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: '导师', dataIndex: 'mentorName', key: 'mentorName', width: 100 },
  { title: '课程类型', dataIndex: 'courseTypeLabel', key: 'courseTypeLabel', width: 110 },
  { title: '时长', dataIndex: 'durationHours', key: 'durationHours', width: 70 },
  { title: '日期', dataIndex: 'classDate', key: 'classDate', width: 100 },
  { title: '来源', dataIndex: 'sourceLabel', key: 'sourceLabel', width: 90 },
  { title: '状态', dataIndex: 'displayStatusLabel', key: 'displayStatusLabel', width: 80 },
  { title: '评价', dataIndex: 'rate', key: 'rate', width: 70 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 80 },
]

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
  flowSteps: ['导师/班主任/助教提交', '待审核', '未支付', '已支付']
})

const tabs = computed(() => ([
  { key: 'all' as const, label: '全部', count: summary.value.allCount },
  { key: 'pending' as const, label: '待审核', count: summary.value.pendingCount },
  { key: 'unpaid' as const, label: '未支付', count: summary.value.unpaidCount },
  { key: 'paid' as const, label: '已支付', count: summary.value.paidCount },
  { key: 'rejected' as const, label: '已驳回', count: summary.value.rejectedCount }
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
    message.error('全部课程加载失败')
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
    message.error('课程详情加载失败')
  }
}

const handleApprove = () => {
  message.success('已通过审核')
  detailVisible.value = false
  void loadData()
}

const handleReject = () => {
  message.success('已驳回')
  detailVisible.value = false
  void loadData()
}

const handleExport = () => {
  message.info('导出功能将在后续版本中接入')
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
