<template>
  <a-config-provider :auto-insert-space-in-button="false">
    <div id="page-job-overview" class="osg-page">
      <PageHeader
        title-zh="学员求职总览"
        title-en="Job Overview"
        description="查看分配给我的学员求职进度"
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
          v-model:value="selectedStatus"
          placeholder="全部面试状态"
          allow-clear
          style="width: 180px"
        >
          <a-select-option value="new">新申请</a-select-option>
          <a-select-option value="coaching">面试中</a-select-option>
          <a-select-option value="completed">已完成</a-select-option>
          <a-select-option value="cancelled">已取消</a-select-option>
        </a-select>
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
import { computed, onMounted, ref, inject, type Ref } from 'vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { ExportOutlined } from '@ant-design/icons-vue'
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
const selectedStatus = ref('')
const mentorNavBadges = inject<MentorNavBadgeState | null>(MENTOR_NAV_BADGE_KEY, null)

// Step3-F2: 上报课消弹窗状态 + 预填上下文
const showReportModal = ref(false)
const reportPrefill = ref<{
  studentId: number
  referenceType: ReferenceType
  referenceId: number
} | null>(null)

const filteredRows = computed(() => {
  return allRows.value.filter((row) => {
    if (selectedStatus.value && row.coachingStatus !== selectedStatus.value) return false
    return true
  })
})

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
  { title: '学员', key: 'student', dataIndex: 'studentName' },
  { title: '公司', key: 'company', dataIndex: 'company' },
  { title: '岗位', key: 'position', dataIndex: 'position' },
  // Step3-F2: §5.2 新增字段
  { title: '城市', key: 'location', dataIndex: 'location', width: 120 },
  { title: '面试状态', key: 'stage', dataIndex: 'interviewStage', width: 120 },
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
  const res = await http.get('/api/mentor/job-overview/list')
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
    const blob = await http.get('/api/mentor/job-overview/export', {
      params: { status: selectedStatus.value },
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

:deep(.ant-table-row.row-new > td) { background:linear-gradient(90deg,#FEE2E2,#FEF2F2); border-left:4px solid #EF4444; }
:deep(.ant-table-row.row-coaching > td) { background:#F3E8FF; }
:deep(.ant-table-row.row-ended > td) { opacity:0.7; }
</style>
