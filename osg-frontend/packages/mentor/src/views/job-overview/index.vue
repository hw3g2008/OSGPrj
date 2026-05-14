<template>
  <a-config-provider :auto-insert-space-in-button="false">
    <div id="page-job-overview" class="osg-page">
      <PageHeader
        title-zh="学员求职总览"
        title-en="Job Overview"
      >
        <template #actions>
          <a-button @click="handleExport">
            <template #icon><ExportOutlined /></template>
            导出
          </a-button>
        </template>
      </PageHeader>

      <div class="filter-row">
        <a-select
          v-model:value="filters.companyName"
          placeholder="全部公司"
          allow-clear
          show-search
          style="width: 180px"
          :options="companyOptions"
        />
        <a-select
          v-model:value="filters.currentStage"
          placeholder="全部面试阶段"
          allow-clear
          style="width: 180px"
          :options="stageOptions"
        />
        <a-range-picker
          v-model:value="filters.interviewRange"
          value-format="YYYY-MM-DD"
          :placeholder="['面试开始', '面试结束']"
          style="width: 280px"
        />
        <a-select
          v-model:value="filters.lessonReported"
          placeholder="是否上报课消"
          allow-clear
          style="width: 160px"
        >
          <a-select-option :value="true">已上报</a-select-option>
          <a-select-option :value="false">未上报</a-select-option>
        </a-select>
        <a-button type="primary" @click="handleSearch">
          <template #icon><SearchOutlined /></template>
          搜索
        </a-button>
        <a-button @click="handleReset">重置</a-button>
      </div>

      <a-card :bordered="false" class="table-card">
        <a-table
          :columns="jobColumns"
          :data-source="filteredRows"
          :row-key="(record: JobOverviewRow) => record.coachingId ?? record.id"
          :pagination="false"
          :row-class-name="(record: JobOverviewRow) => rowClass(record)"
          :locale="{ emptyText: '暂无匹配记录' }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'student'">
              <StudentAvatarCell
                :name="record.studentName"
                :id="record.studentId"
                :background-color="avatarColor(record)"
              />
            </template>
            <template v-else-if="column.key === 'company'">
              {{ record.company || '-' }}
            </template>
            <template v-else-if="column.key === 'position'">
              {{ record.position || '-' }}
            </template>
            <template v-else-if="column.key === 'location'">
              {{ record.location || '-' }}
            </template>
            <template v-else-if="column.key === 'stage'">
              <StageTag :stage="record.interviewStage" fallback="-" />
            </template>
            <template v-else-if="column.key === 'interviewTime'">
              <span v-if="!record.interviewTime" class="text-muted">待定</span>
              <InterviewTimeCell
                v-else
                :time="formatInterviewTime(record.interviewTime)"
                :emphasize-overdue="record.coachingStatus !== 'completed'"
              />
            </template>
            <template v-else-if="column.key === 'lessonCount'">
              <span class="lesson-count-text">{{ Number(record.lessonCount ?? 0) }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button
                size="small"
                type="primary"
                :disabled="record.coachingId == null"
                @click="openReportModalFor(record)"
              >
                上报课消
              </a-button>
            </template>
          </template>
        </a-table>
      </a-card>

      <ReportModal
        v-if="showReportModal"
        :prefilled-student-id="reportPrefill?.studentId"
        :prefilled-reference-type="reportPrefill?.referenceType"
        :prefilled-reference-id="reportPrefill?.referenceId"
        @close="closeReportModal"
        @submitted="onReportSubmitted"
      />
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, inject, type Ref } from 'vue'
import type { Dayjs } from 'dayjs'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { http } from '@osg/shared/utils/request'
import { StageTag, StudentAvatarCell, InterviewTimeCell } from '@osg/shared/components'
import type { ReferenceType } from '@osg/shared/types/classReport'
import ReportModal from '../courses/components/ReportModal.vue'

const MENTOR_NAV_BADGE_KEY = Symbol.for('mentor-nav-badges')

type MentorNavBadgeState = {
  jobBadge: Ref<number>
  refreshJobBadge: () => Promise<void>
}

interface JobOverviewRow {
  id: number
  // Step3-F2: coaching 锚点 + 课消统计（来自后端 Step3-F1 controller adapter 透出的字段）
  coachingId?: number | null
  applicationId?: number
  studentId: number
  studentName?: string
  company: string
  position: string
  location?: string
  interviewStage?: string
  interviewTime?: string
  coachingStatus: string
  result?: string | null
  lessonCount?: number
  lessonReported?: boolean
}

const allRows = ref<JobOverviewRow[]>([])
const filters = reactive({
  companyName: undefined as string | undefined,
  currentStage: undefined as string | undefined,
  interviewRange: null as [Dayjs, Dayjs] | null,
  lessonReported: undefined as boolean | undefined,
})
const mentorNavBadges = inject<MentorNavBadgeState | null>(MENTOR_NAV_BADGE_KEY, null)

const companyOptions = computed(() => {
  const names = new Set<string>()
  allRows.value.forEach((row) => {
    if (row.company) names.add(row.company)
  })
  return Array.from(names).map((value) => ({ value, label: value }))
})

const stageOptions = [
  { value: 'hirevue', label: 'HireVue / Online Test' },
  { value: 'screening', label: 'Screening Call' },
  { value: 'first', label: 'First Round' },
  { value: 'second', label: 'Second Round' },
  { value: 'third', label: 'Third Round and Beyond' },
  { value: 'case', label: 'Case Study Round' },
  { value: 'superday', label: 'Superday / AC' },
]

// Step3-F2: 上报课消弹窗状态 + 预填上下文
const showReportModal = ref(false)
const reportPrefill = ref<{
  studentId: number
  referenceType: ReferenceType
  referenceId: number
} | null>(null)

const filteredRows = computed(() => {
  return allRows.value.filter((row) => {
    if (filters.companyName && row.company !== filters.companyName) return false
    if (filters.currentStage && row.interviewStage !== filters.currentStage) return false
    if (filters.lessonReported !== undefined && Boolean(row.lessonReported) !== filters.lessonReported) return false
    if (filters.interviewRange && filters.interviewRange.length === 2) {
      if (!row.interviewTime) return false
      const ms = new Date(row.interviewTime).getTime()
      const [start, end] = filters.interviewRange
      if (Number.isFinite(ms)) {
        if (ms < start.startOf('day').valueOf()) return false
        if (ms > end.endOf('day').valueOf()) return false
      }
    }
    return true
  })
})

function handleSearch() {
  // 当前为本地过滤；预留后端 list 调用入口，后端筛选参数透传需求由 Step3-F6 后端补齐
}

function handleReset() {
  filters.companyName = undefined
  filters.currentStage = undefined
  filters.interviewRange = null
  filters.lessonReported = undefined
}

function formatInterviewTime(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeJobOverview(record: Record<string, any>): JobOverviewRow {
  return {
    ...record,
    studentName: record.studentName || (record.studentId != null ? `学员${record.studentId}` : '待分配学员'),
    // Step3-F2: 保留 coaching 锚点 + 课消统计 + 城市原值
    coachingId: record.coachingId ?? null,
    applicationId: record.applicationId ?? record.id,
    location: record.location ?? '',
    lessonCount: Number(record.lessonCount ?? 0),
    lessonReported: Boolean(record.lessonReported),
  } as JobOverviewRow
}

function rowClass(row: JobOverviewRow): string {
  return [
    row.coachingStatus === 'new' && 'row-new',
    row.coachingStatus === 'coaching' && 'row-coaching',
    (row.result === 'offer' || row.result === 'rejected') && 'row-ended',
  ].filter(Boolean).join(' ')
}

function avatarColor(row: JobOverviewRow) {
  const colors = ['#7399C6', '#EF4444', '#22C55E', '#3B82F6', '#F59E0B']
  return colors[row.id % colors.length]
}

const jobColumns = [
  // RULE-A 导师端：学生ID / 学生姓名 / 岗位 / 公司 / 城市 / 面试阶段 / 面试时间 / 已上报课消数 + 操作
  { title: '学生ID', key: 'studentId', dataIndex: 'studentId', width: 100, fixed: 'left' as const },
  { title: '学生姓名', key: 'student', dataIndex: 'studentName', width: 140 },
  { title: '岗位', key: 'position', dataIndex: 'position', width: 160 },
  { title: '公司', key: 'company', dataIndex: 'company', width: 140 },
  { title: '城市', key: 'location', dataIndex: 'location', width: 110 },
  { title: '面试阶段', key: 'stage', dataIndex: 'interviewStage', width: 130 },
  { title: '面试时间', key: 'interviewTime', dataIndex: 'interviewTime', width: 160 },
  { title: '已上报课消数', key: 'lessonCount', dataIndex: 'lessonCount', width: 130, align: 'center' as const },
  { title: '操作', key: 'action', width: 120, fixed: 'right' as const },
]

// Step3-F2: 打开上报课消弹窗，按 §5.2「上报课消预填当前 coaching_id」预填 job_coaching reference
function openReportModalFor(record: JobOverviewRow) {
  if (record.coachingId == null) {
    return
  }
  reportPrefill.value = {
    studentId: record.studentId,
    referenceType: 'job_coaching' as ReferenceType,
    referenceId: record.coachingId,
  }
  showReportModal.value = true
}

function closeReportModal() {
  showReportModal.value = false
  reportPrefill.value = null
}

async function onReportSubmitted() {
  closeReportModal()
  try {
    await loadJobOverviewRows()
  } catch {}
  void mentorNavBadges?.refreshJobBadge?.()
}

async function loadJobOverviewRows() {
  const res = await http.get('/mentor/job-overview/list')
  const rows = Array.isArray(res?.rows) ? res.rows : []
  allRows.value = rows.map((record: Record<string, any>) => normalizeJobOverview(record))
}

function downloadBlob(filename: string, blob: Blob) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

async function handleExport() {
  try {
    const blob = await http.get('/mentor/job-overview/export', {
      params: {
        companyName: filters.companyName,
        currentStage: filters.currentStage,
        lessonReported: filters.lessonReported,
      },
      responseType: 'blob',
    })
    downloadBlob(`学员求职总览.xlsx`, blob as Blob)
  } catch {}
}

onMounted(async () => {
  try {
    await loadJobOverviewRows()
  } catch {}
  void mentorNavBadges?.refreshJobBadge?.()
})
</script>

<style scoped>
.filter-row { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
.lesson-count-text { font-weight:600; color:#3B82F6; }
.table-card { margin-bottom:20px; border-radius:16px; box-shadow:0 4px 24px rgba(115,153,198,0.12); }

.text-muted { color:#94A3B8; }

/* §B6: 与 lead-mentor 端 row-highlight--* 样式对齐，去掉红色竖线，使用柔和单色背景 */
:deep(.ant-table-row.row-new > td) { background:#fff7ed; }
:deep(.ant-table-row.row-coaching > td) { background:#f3e8ff; }
:deep(.ant-table-row.row-ended > td) { opacity:0.7; }
</style>
