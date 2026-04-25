<template>
  <div class="osg-page">
    <PageHeader title="课程记录" subtitle="Class Records" description="查看所有学员的课程记录，审核导师/班主任/助教提交的上课记录">
      <template #actions>
        <a-button :loading="exporting" @click="handleExport">
          <template #icon><ExportOutlined /></template>
          {{ exporting ? '导出中...' : '导出' }}
        </a-button>
      </template>
    </PageHeader>

    <a-alert type="info" show-icon style="border-radius: 12px; background: linear-gradient(135deg, #eef2ff, #e0e7ff); border: none">
      <template #message><strong>课程记录流程</strong></template>
      <template #description>
        <a-space wrap>
          <a-tag class="flow-tag--purple">① 学员申请岗位/模拟应聘</a-tag>
          <span>→</span>
          <a-tag class="flow-tag--purple">② 班主任分配导师</a-tag>
          <span>→</span>
          <a-tag class="flow-tag--purple">③ 导师上课并申报记录</a-tag>
          <span>→</span>
          <a-tag color="orange">④ 后台审核</a-tag>
          <span>→</span>
          <a-tag color="green">⑤ 结算中心转账</a-tag>
        </a-space>
      </template>
    </a-alert>

    <div style="display: flex; gap: 12px;">
      <div v-for="card in statCards" :key="card.label" style="flex: 1; min-width: 0;">
        <a-card :bordered="false" :body-style="{ padding: '16px', textAlign: 'center' }" style="box-shadow: var(--card-shadow)">
          <a-statistic :title="card.label" :value="card.value" :value-style="{ color: card.color, fontWeight: 700 }" />
        </a-card>
      </div>
    </div>

    <a-card :bordered="false" style="box-shadow: var(--card-shadow)">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="keyword" placeholder="搜索学员/申报人..." allow-clear style="width: 180px" data-field-name="搜索" @pressEnter="loadData" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterCoachingType" placeholder="辅导类型" allow-clear style="width: 130px" data-field-name="辅导类型">
            <a-select-option value="position_coaching">岗位辅导</a-select-option>
            <a-select-option value="mock_application">模拟应聘</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterCourseContent" placeholder="课程内容" allow-clear style="width: 140px" data-field-name="课程内容">
            <a-select-option value="new_resume">新简历</a-select-option>
            <a-select-option value="resume_update">简历更新</a-select-option>
            <a-select-option value="case_prep">Case准备</a-select-option>
            <a-select-option value="mock_interview">模拟面试</a-select-option>
            <a-select-option value="communication_midterm">人际关系期中考试</a-select-option>
            <a-select-option value="midterm_exam">模拟期中考试</a-select-option>
            <a-select-option value="other">其他</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterReporterRole" placeholder="申报人角色" allow-clear style="width: 130px" data-field-name="申报人角色">
            <a-select-option value="mentor">导师</a-select-option>
            <a-select-option value="headteacher">班主任</a-select-option>
            <a-select-option value="assistant">助教</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="上课日期">
          <a-space>
            <a-date-picker v-model:value="filterDateStart" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 140px" data-field-name="上课日期开始" />
            <span>~</span>
            <a-date-picker v-model:value="filterDateEnd" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 140px" data-field-name="上课日期结束" />
          </a-space>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadData">
            <template #icon><SearchOutlined /></template>
            搜索
          </a-button>
        </a-form-item>
      </a-form>

      <a-tabs v-model:activeKey="activeTab" @change="(key: string) => switchTab(key)">
        <a-tab-pane v-for="tab in tabList" :key="tab.key">
          <template #tab>
            {{ tab.label }}
            <a-badge v-if="tab.badge" :count="tab.badge" :number-style="{ backgroundColor: '#faad14' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
      </a-tabs>

      <a-table
        :columns="recordColumns"
        :data-source="rows"
        :row-key="(record: ClassRecordRow) => record.recordId"
        :pagination="tablePagination"
        :loading="loading"
        :row-class-name="(record: ClassRecordRow) => record.status === 'pending' ? 'row-pending' : ''"
        :locale="{ emptyText: '暂无课程记录' }"
        :scroll="{ x: 1200 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'recordId'">
            {{ record.recordCode || `#R${record.recordId}` }}
          </template>
          <template v-else-if="column.dataIndex === 'studentName'">
            <div style="display: flex; flex-direction: column; gap: 2px">
              <strong>{{ record.studentName }}</strong>
              <span style="font-size: 12px; color: #64748b">ID: {{ record.studentId }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'mentorName'">
            <div style="display: flex; flex-direction: column; gap: 2px">
              <strong>{{ record.mentorName }}</strong>
              <span style="font-size: 12px; color: #64748b">{{ record.reporterRole }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'coachingType'">
            <a-tag :color="record.coachingType === '模拟应聘' ? 'green' : 'blue'">{{ record.coachingType }}</a-tag>
            <div v-if="record.coachingCompany" style="font-size: 12px; color: #64748b; margin-top: 2px">{{ record.coachingCompany }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'courseContent'">
            <a-tag :color="contentTagColor(record.courseContentKey)">{{ record.courseContent }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'classDate'">{{ formatDate(record.classDate) }}</template>
          <template v-else-if="column.dataIndex === 'durationHours'">{{ formatHours(record.durationHours) }}</template>
          <template v-else-if="column.dataIndex === 'courseFee'">{{ formatFee(record.courseFee) }}</template>
          <template v-else-if="column.dataIndex === 'studentRating'">
            <a-tag v-if="record.studentRating" color="green">⭐ {{ record.studentRating }}</a-tag>
            <span v-else style="color: #64748b">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="statusTagColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space>
              <a-button v-if="record.status === 'pending'" type="primary" size="small" data-surface-trigger="modal-class-record-review" :data-surface-sample-key="`record-${record.recordId}`" @click="openRecordReview(record)">课程审核</a-button>
              <a-button v-if="record.status !== 'pending'" type="link" size="small" data-surface-trigger="modal-class-record-detail" :data-surface-sample-key="`record-${record.recordId}`" @click="openRecordDetail(record)">详情</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <ClassRecordReviewModal
      v-model:visible="reviewVisible"
      :detail="selectedRecord"
      :loading="recordDetailLoading"
      :submitting="reviewSubmitting"
      @approve="handleReviewApprove"
      @reject="handleReviewReject"
    />

    <ClassRecordDetailModal
      v-model:visible="detailVisible"
      :detail="selectedRecord"
      :loading="recordDetailLoading"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { usePagination } from '@osg/shared'
import {
  exportClassRecords,
  getClassRecordList,
  getClassRecordStats,
  type ClassRecordRow,
  type ClassRecordStats
} from '@osg/shared/api/admin/classRecord'
import { approveReport, getReportDetail, rejectReport, type ReportRow } from '@osg/shared/api/admin/report'
import ClassRecordDetailModal from './components/ClassRecordDetailModal.vue'
import ClassRecordReviewModal from './components/ClassRecordReviewModal.vue'
import PageHeader from '@/components/PageHeader.vue'

const recordColumns = [
  { title: '记录ID', dataIndex: 'recordId', key: 'recordId', width: 90 },
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: '申报人', dataIndex: 'mentorName', key: 'mentorName', width: 120 },
  { title: '辅导内容', dataIndex: 'coachingType', key: 'coachingType', width: 130 },
  { title: '课程内容', dataIndex: 'courseContent', key: 'courseContent', width: 120 },
  { title: '上课日期', dataIndex: 'classDate', key: 'classDate', width: 110 },
  { title: '时长', dataIndex: 'durationHours', key: 'durationHours', width: 70 },
  { title: '课时费', dataIndex: 'courseFee', key: 'courseFee', width: 90 },
  { title: '学员评价', dataIndex: 'studentRating', key: 'studentRating', width: 90 },
  { title: '审核状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 160, fixed: 'right' as const },
]

const keyword = ref('')
const filterCoachingType = ref<string | undefined>(undefined)
const filterCourseContent = ref<string | undefined>(undefined)
const filterReporterRole = ref<string | undefined>(undefined)
const filterDateStart = ref('')
const filterDateEnd = ref('')
const activeTab = ref('all')
const stats = ref<ClassRecordStats | null>(null)
const exporting = ref(false)

const toFilters = () => ({
  keyword: keyword.value || undefined,
  courseType: filterCoachingType.value || undefined,
  classStatus: filterCourseContent.value || undefined,
  courseSource: filterReporterRole.value || undefined,
  tab: activeTab.value,
  classDateStart: filterDateStart.value || undefined,
  classDateEnd: filterDateEnd.value || undefined
})

const {
  rows,
  loading,
  tablePagination,
  search: searchList,
  reload: reloadList,
  handleTableChange
} = usePagination<ClassRecordRow, ReturnType<typeof toFilters>>(
  (params) => getClassRecordList(params)
)
const reviewVisible = ref(false)
const detailVisible = ref(false)
const reviewSubmitting = ref(false)
const recordDetailLoading = ref(false)
const selectedRecord = ref<ReportRow | null>(null)

const statCards = computed(() => {
  const current = stats.value
  if (!current) return []
  return [
    { label: '总记录数', value: String(current.totalCount), color: '#3b82f6' },
    { label: '待审核', value: String(current.pendingCount), color: '#f59e0b' },
    { label: '已通过', value: String(current.approvedCount), color: '#22c55e' },
    { label: '已驳回', value: String(current.rejectedCount), color: '#ef4444' },
    { label: '待结算金额', value: formatFee(current.pendingSettlementAmount), color: '#3b82f6' }
  ]
})

const tabList = computed(() => [
  { key: 'all', label: '全部', badge: null, badgeTone: '' },
  { key: 'pending', label: '待审核', badge: stats.value?.pendingCount || null, badgeTone: 'warning' },
  { key: 'approved', label: '已通过', badge: null, badgeTone: '' },
  { key: 'rejected', label: '已驳回', badge: null, badgeTone: '' }
])

const loadStats = async () => {
  try {
    stats.value = await getClassRecordStats(toFilters())
  } catch (_error) {
    // 不阻塞列表加载
  }
}

const loadData = async () => {
  try {
    await Promise.all([searchList(toFilters()), loadStats()])
  } catch (_error) {
    message.error('课程记录加载失败')
  }
}

const refreshAfterMutation = async () => {
  try {
    await Promise.all([reloadList(), loadStats()])
  } catch (_error) {
    /* ignore */
  }
}

const loadRecordDetail = async (recordId: number) => {
  recordDetailLoading.value = true
  selectedRecord.value = null
  try {
    const response = await getReportDetail(recordId)
    selectedRecord.value = response
  } catch (_error) {
    message.error('课程记录详情加载失败')
  } finally {
    recordDetailLoading.value = false
  }
}

const openRecordReview = async (row: ClassRecordRow) => {
  detailVisible.value = false
  reviewVisible.value = true
  await loadRecordDetail(row.recordId)
}

const openRecordDetail = async (row: ClassRecordRow) => {
  reviewVisible.value = false
  detailVisible.value = true
  await loadRecordDetail(row.recordId)
}

const handleReviewApprove = async (payload: { remark?: string }) => {
  if (!selectedRecord.value) {
    return
  }

  reviewSubmitting.value = true
  try {
    await approveReport(selectedRecord.value.recordId, payload)
    message.success('课时审核已通过')
    reviewVisible.value = false
    await refreshAfterMutation()
  } catch (_error) {
    message.error('课时审核通过失败')
  } finally {
    reviewSubmitting.value = false
  }
}

const handleReviewReject = async (payload: { remark?: string }) => {
  if (!selectedRecord.value) {
    return
  }

  reviewSubmitting.value = true
  try {
    await rejectReport(selectedRecord.value.recordId, payload)
    message.success('课时审核已驳回')
    reviewVisible.value = false
    await refreshAfterMutation()
  } catch (_error) {
    message.error('课时审核驳回失败')
  } finally {
    reviewSubmitting.value = false
  }
}

const switchTab = (tab: string) => {
  activeTab.value = tab
  void loadData()
}

const handleExport = async () => {
  try {
    exporting.value = true
    await exportClassRecords(toFilters())
    message.success('课程记录导出成功')
  } catch (_error) {
    message.error('课程记录导出失败')
  } finally {
    exporting.value = false
  }
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

const formatFee = (value?: string | number | null) => {
  if (!value) return '\u00A50'
  const amount = Number(value)
  if (Number.isNaN(amount)) return `\u00A5${value}`
  return `\u00A5${amount.toLocaleString('en-US')}`
}

const statusLabel = (status: string) => {
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已驳回'
  return '待审核'
}

const statusTagColor = (status: string) => {
  if (status === 'approved') return 'green'
  if (status === 'rejected') return 'red'
  return 'orange'
}

const contentTagColor = (key?: string) => {
  const map: Record<string, string> = {
    new_resume: 'blue',
    resume_update: 'blue',
    case_prep: 'cyan',
    mock_interview: 'green',
    communication_midterm: 'purple',
    midterm_exam: 'orange',
    behavioral: 'cyan'
  }
  return map[key || ''] || 'blue'
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped>
:deep(.row-pending) {
  background: #fef3c7;
}

.flow-tag--purple {
  color: #7c3aed !important;
  background: #f5f3ff !important;
  border-color: #ddd6fe !important;
}
</style>
