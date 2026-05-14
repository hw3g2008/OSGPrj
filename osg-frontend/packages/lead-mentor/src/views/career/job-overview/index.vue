<template>
  <a-config-provider :auto-insert-space-in-button="false">
  <div id="page-job-overview" class="osg-page">
    <PageHeader
      title-zh="学员求职总览"
      title-en="Job Overview"
    >
      <template #actions>
        <a-button @click="showUpcomingToast()">
          <template #icon><ExportOutlined /></template>
          导出
        </a-button>
      </template>
    </PageHeader>

    <InterviewCalendar v-if="activeTab === 'managed'" :events="calendarEvents" />

    <div class="filter-row">
      <a-select
        v-model:value="filters.companyName"
        placeholder="全部公司"
        style="width: 140px;"
      >
        <a-select-option value="">全部公司</a-select-option>
        <a-select-option v-for="company in companyOptions" :key="company" :value="company">{{ company }}</a-select-option>
      </a-select>
      <a-select
        v-model:value="filters.currentStage"
        placeholder="全部状态"
        style="width: 140px;"
      >
        <a-select-option value="">全部状态</a-select-option>
        <a-select-option v-for="stage in stageOptions" :key="stage" :value="stage">{{ stage }}</a-select-option>
      </a-select>
      <a-range-picker
        v-model:value="(interviewTimeRange as any)"
        show-time
        format="YYYY-MM-DD HH:mm:ss"
        value-format="YYYY-MM-DD HH:mm:ss"
        :placeholder="['面试开始', '面试结束']"
        style="width: 360px;"
        allow-clear
      />
      <a-select
        v-if="activeTab === 'coaching'"
        v-model:value="filters.lessonReported"
        placeholder="是否上报课消"
        data-testid="filter-lesson-reported"
        style="width: 150px;"
        allow-clear
      >
        <a-select-option :value="true">是</a-select-option>
        <a-select-option :value="false">否</a-select-option>
      </a-select>
      <a-button type="primary" @click="handleSearch()">
        <template #icon><SearchOutlined /></template>
        搜索
      </a-button>
    </div>

    <a-card :bordered="false" class="job-overview-card">
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="managed" force-render>
          <template #tab>
            <span id="lm-job-tab-managed" class="lm-job-tab-label lm-job-tab-label--managed">
              <TeamOutlined />
              我管理的学员
              <span class="tab-count tab-count--managed">{{ tabCounts.managed }}</span>
            </span>
          </template>
          <a-alert
            type="info"
            show-icon
            message="查看管理学员的求职进度，已确认状态刷新后保持一致"
            style="margin-bottom: 12px;"
          />
          <div id="lm-job-content-managed">
            <a-table
              :columns="managedColumns"
              :data-source="managedRows"
              :row-key="(r: OverviewRow) => r.coachingId ?? r.applicationId"
              :pagination="false"
              :scroll="{ x: 1100 }"
              :row-class-name="(record: OverviewRow) => `row-highlight ${record.rowTone || ''}`.trim()"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'studentName'">
                  <StudentAvatarCell
                    :name="record.studentName"
                    :id="record.studentId"
                    :background-color="record.avatarColor"
                  />
                </template>
                <template v-else-if="column.key === 'position'">
                  <span class="company-cell-text">{{ record.role || '-' }}</span>
                </template>
                <template v-else-if="column.key === 'company'">
                  <span class="company-cell-text">{{ record.company || '-' }}</span>
                </template>
                <template v-else-if="column.key === 'stage'">
                  <div class="table-stack">
                    <StageTag :stage="record.stage" />
                    <span v-if="record.stageMeta" class="stage-meta">{{ record.stageMeta }}</span>
                  </div>
                </template>
                <template v-else-if="column.key === 'interviewAt'">
                  <InterviewTimeCell :time="record.interviewAt" :hint="record.deadlineHint" />
                </template>
                <template v-else-if="column.key === 'cityLabel'">
                  <span>{{ record.cityLabel || '-' }}</span>
                </template>
                <template v-else-if="column.key === 'latestRating'">
                  <span>{{ record.latestRating || '-' }}</span>
                </template>
                <template v-else-if="column.key === 'mentorName'">
                  <div class="table-stack">
                    <strong>{{ record.mentorName }}</strong>
                    <span class="student-meta">{{ record.mentorMeta }}</span>
                  </div>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button
                    v-if="record.stageUpdated"
                    size="small"
                    type="primary"
                    class="btn-acknowledge"
                    @click="handleAcknowledgeStage(record)"
                  >
                    确认
                  </a-button>
                  <a-button
                    v-else
                    type="link"
                    size="small"
                    data-surface-trigger="drawer-class-records"
                    @click="openDetailDrawer(record)"
                  >
                    查看详情
                  </a-button>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>

        <a-tab-pane key="coaching" force-render>
          <template #tab>
            <span id="lm-job-tab-coaching" class="lm-job-tab-label lm-job-tab-label--coaching">
              <BookOutlined />
              我辅导的学员
              <span class="tab-count">{{ tabCounts.coaching }}</span>
            </span>
          </template>
          <div id="lm-job-content-coaching">
            <a-table
              :columns="coachingColumns"
              :data-source="coachingRows"
              :row-key="(r: OverviewRow) => r.coachingId ?? r.applicationId"
              :pagination="false"
              :scroll="{ x: 1000 }"
              :row-class-name="(record: OverviewRow) => `row-highlight ${record.rowTone || ''}`.trim()"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'studentName'">
                  <StudentAvatarCell
                    :name="record.studentName"
                    :id="record.studentId"
                    :background-color="record.avatarColor"
                  />
                </template>
                <template v-else-if="column.key === 'position'">
                  <span class="company-cell-text">{{ record.role || '-' }}</span>
                </template>
                <template v-else-if="column.key === 'company'">
                  <span class="company-cell-text">{{ record.company || '-' }}</span>
                </template>
                <template v-else-if="column.key === 'stage'">
                  <div class="table-stack">
                    <StageTag :stage="record.stage" />
                    <span v-if="record.stageMeta" class="stage-meta">{{ record.stageMeta }}</span>
                  </div>
                </template>
                <template v-else-if="column.key === 'interviewAt'">
                  <InterviewTimeCell
                    :time="record.interviewAt"
                    :hint="record.deadlineHint"
                    :emphasize-overdue="record.deadlineTone === 'danger'"
                  />
                </template>
                <template v-else-if="column.key === 'cityLabel'">
                  <span>{{ record.cityLabel || '-' }}</span>
                </template>
                <template v-else-if="column.key === 'lessonCount'">
                  <span>{{ record.lessonCount ?? 0 }}</span>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-space>
                    <a-button
                      size="small"
                      type="primary"
                      ghost
                      data-surface-trigger="modal-class-report"
                      @click="openClassReportFromCoaching(record)"
                    >
                      上报课消
                    </a-button>
                    <a-button
                      v-if="!record.stageUpdated"
                      type="link"
                      size="small"
                      data-surface-trigger="modal-job-detail"
                      @click="openJobDetail(record)"
                    >
                      查看详情
                    </a-button>
                    <a-button
                      v-else
                      size="small"
                      type="primary"
                      class="btn-acknowledge"
                      @click="handleAcknowledgeStage(record)"
                    >
                      确认
                    </a-button>
                  </a-space>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>

        <a-tab-pane key="pending" force-render>
          <template #tab>
            <span id="lm-job-tab-pending" class="lm-job-tab-label lm-job-tab-label--pending">
              <ClockCircleOutlined />
              待分配导师
              <span class="tab-count">{{ tabCounts.pending }}</span>
            </span>
          </template>
          <a-alert
            type="warning"
            show-icon
            message="以下学员申请了辅导，需要您分配导师"
            style="margin-bottom: 12px;"
          />
          <div id="lm-job-content-pending">
            <a-table
              :columns="pendingColumns"
              :data-source="pendingRows"
              :row-key="(r: PendingRow) => r.coachingId ?? r.applicationId"
              :pagination="false"
              :scroll="{ x: 1100 }"
              :row-class-name="() => 'row-highlight row-highlight--warning'"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'studentName'">
                  <StudentAvatarCell
                    :name="record.studentName"
                    :id="record.studentId"
                    :background-color="record.avatarColor"
                  />
                </template>
                <template v-else-if="column.key === 'position'">
                  <span class="company-cell-text">{{ record.role || '-' }}</span>
                </template>
                <template v-else-if="column.key === 'company'">
                  <span class="company-cell-text">{{ record.company || '-' }}</span>
                </template>
                <template v-else-if="column.key === 'stage'">
                  <StageTag :stage="record.stage" />
                </template>
                <template v-else-if="column.key === 'interviewAt'">
                  <InterviewTimeCell :time="record.interviewAt" />
                </template>
                <template v-else-if="column.key === 'cityLabel'">
                  <span>{{ record.cityLabel || '-' }}</span>
                </template>
                <template v-else-if="column.key === 'submittedAt'">
                  <span>{{ record.submittedAt }}</span>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button
                    size="small"
                    type="primary"
                    data-surface-trigger="modal-assign-mentor"
                    @click="openAssignMentorFromPending(record)"
                  >
                    <template #icon><UserAddOutlined /></template>
                    分配导师
                  </a-button>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <JobDetailModal
      v-model="isJobDetailModalOpen"
      :preview="jobDetailPreview"
      @request-mentor-change="handleRequestMentorChange"
    />
    <AssignMentorModal
      v-model="isAssignMentorModalOpen"
      :preview="assignMentorPreview"
      :required-mentor-count="activeAssignRequiredMentorCount"
      @confirm-match="handleConfirmAssignMentor"
    />
    <ClassRecordDetailDrawer
      v-model:visible="isDetailDrawerOpen"
      :application-id="detailDrawerApplicationId"
      :groups="detailDrawerGroups"
      :loading="detailDrawerLoading"
    />
    <LeadMentorClassReportFlowModal
      :visible="classReportVisible"
      :prefilled-student-id="classReportPrefill?.prefilledStudentId"
      :prefilled-reference-type="classReportPrefill?.prefilledReferenceType"
      :prefilled-reference-id="classReportPrefill?.prefilledReferenceId"
      :readonly-fields="classReportPrefill?.readonlyFields ?? emptyClassReportReadonlyFields"
      @update:visible="classReportVisible = $event"
      @submitted="handleClassReportSubmitted"
    />
  </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  BookOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons-vue'
import {
  acknowledgeLeadMentorJobOverviewStage,
  assignLeadMentorJobOverviewCoachingMentor,
  assignLeadMentorJobOverviewMentor,
  getLeadMentorJobOverviewCalendar,
  getLeadMentorJobOverviewCoachingDetail,
  getLeadMentorJobOverviewDetail,
  getLeadMentorJobOverviewList,
  type LeadMentorCalendarRecord,
  type LeadMentorJobOverviewListItem,
  type LeadMentorJobOverviewListParams,
} from '@osg/shared/api'
import { InterviewCalendar, StageTag, StudentAvatarCell, InterviewTimeCell } from '@osg/shared/components'
import { useCoachingStatusMap, deriveApplicationStatus } from '@osg/shared/composables'
import { ClassRecordDetailDrawer } from '@osg/shared/components'
import type { LeadMentorClassRecordMentorGroup } from '@osg/shared/components'
import AssignMentorModal, {
  type AssignMentorConfirmPayload,
  type AssignMentorPreview,
} from '@/components/AssignMentorModal.vue'
import JobDetailModal, { type JobDetailPreview } from '@/components/JobDetailModal.vue'
import LeadMentorClassReportFlowModal from '../../teaching/class-records/LeadMentorClassReportFlowModal.vue'

const { resolveCoachingTone } = useCoachingStatusMap()

/**
 * §D.2 LM job-overview 行的 status display 派生：
 * - 优先 deriveApplicationStatus（assignStatus + coachingStatus 两入参）
 * - stageUpdated=true 时仍走老 useCoachingStatusMap 走 'blue' 高亮，保持业务行为
 */
function deriveOverviewStatusDisplay(row: LeadMentorJobOverviewListItem): { label: string; tone: string } {
  // stageUpdated 高亮分支保留旧行为
  if (row.stageUpdated) {
    return {
      label: row.coachingStatus || '待更新',
      tone: 'blue',
    }
  }
  const display = deriveApplicationStatus({
    assignStatus: row.assignedStatus,
    coachingStatus: row.coachingStatus,
  })
  return {
    label: row.coachingStatus || display.label,
    tone: resolveCoachingTone(row.coachingStatus, false),
  }
}

const pendingColumns = [
  { title: '学生ID', dataIndex: 'studentId', key: 'studentId', width: 80 },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName', width: 160, fixed: 'left' as const },
  { title: '岗位', dataIndex: 'position', key: 'position', width: 160 },
  { title: '公司', dataIndex: 'company', key: 'company', width: 160 },
  { title: '城市', dataIndex: 'cityLabel', key: 'cityLabel', width: 100 },
  { title: '面试阶段', dataIndex: 'stage', key: 'stage', width: 130 },
  { title: '面试时间', dataIndex: 'interviewAt', key: 'interviewAt', width: 140 },
  { title: '提交时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 120 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 140, fixed: 'right' as const },
]

const coachingColumns = [
  { title: '学生ID', dataIndex: 'studentId', key: 'studentId', width: 80 },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName', width: 160, fixed: 'left' as const },
  { title: '岗位', dataIndex: 'position', key: 'position', width: 160 },
  { title: '公司', dataIndex: 'company', key: 'company', width: 160 },
  { title: '城市', dataIndex: 'cityLabel', key: 'cityLabel', width: 100 },
  { title: '面试阶段', dataIndex: 'stage', key: 'stage', width: 130 },
  { title: '面试时间', dataIndex: 'interviewAt', key: 'interviewAt', width: 140 },
  { title: '已上报课消数', dataIndex: 'lessonCount', key: 'lessonCount', width: 120 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 150, fixed: 'right' as const },
]

const managedColumns = [
  { title: '学生ID', dataIndex: 'studentId', key: 'studentId', width: 80 },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName', width: 160, fixed: 'left' as const },
  { title: '岗位', dataIndex: 'position', key: 'position', width: 160 },
  { title: '公司', dataIndex: 'company', key: 'company', width: 160 },
  { title: '城市', dataIndex: 'cityLabel', key: 'cityLabel', width: 100 },
  { title: '面试阶段', dataIndex: 'stage', key: 'stage', width: 130 },
  { title: '面试时间', dataIndex: 'interviewAt', key: 'interviewAt', width: 140 },
  { title: '导师', dataIndex: 'mentorName', key: 'mentorName', width: 140 },
  { title: '最近评分', dataIndex: 'latestRating', key: 'latestRating', width: 100 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 120, fixed: 'right' as const },
]

type TabKey = 'pending' | 'coaching' | 'managed'

interface PendingRow {
  applicationId: number
  coachingId?: number | null
  studentName: string
  studentId: string
  avatarColor: string
  company: string
  role: string
  stage: string
  stageTone: string
  interviewAt: string
  mentorDemand: string
  submittedAt: string
  cityLabel: string
  preferredMentorNames: string
  raw: LeadMentorJobOverviewListItem
}

interface OverviewRow {
  applicationId: number
  coachingId?: number | null
  studentName: string
  studentId: string
  avatarColor: string
  company: string
  companyTone?: string
  role: string
  stage: string
  stageTone: string
  stageMeta?: string
  interviewAt: string
  deadlineHint: string
  deadlineTone?: string
  status: string
  statusTone: string
  stageUpdated: boolean
  rowTone?: string
  mentorName?: string
  mentorMeta?: string
  cityLabel?: string
  latestRating?: string | null
  lessonCount?: number
  raw: LeadMentorJobOverviewListItem
}

interface JobOverviewFilters {
  companyName: string
  currentStage: string
  lessonReported: boolean | undefined
}

const isDetailDrawerOpen = ref(false)
const detailDrawerGroups = ref<LeadMentorClassRecordMentorGroup[]>([])
const detailDrawerLoading = ref(false)
const detailDrawerApplicationId = ref<number | null>(null)

const classReportPrefill = ref<{
  prefilledStudentId: number
  prefilledReferenceType: 'application' | 'job_coaching'
  prefilledReferenceId: number
  readonlyFields: Array<'student' | 'reference'>
} | null>(null)
const emptyClassReportReadonlyFields: Array<'student' | 'reference'> = []

const showUpcomingToast = inject<() => void>('showUpcomingToast', () => {})
const route = useRoute()
const router = useRouter()

const activeTab = ref<TabKey>('managed')
const isJobDetailModalOpen = ref(false)
const isAssignMentorModalOpen = ref(false)
const jobDetailPreview = ref<JobDetailPreview | null>(null)
const assignMentorPreview = ref<AssignMentorPreview | null>(null)
const activeAssignApplicationId = ref<number | null>(null)
const activeAssignCoachingId = ref<number | null>(null)
const activeAssignRequiredMentorCount = ref<number | null>(null)
const activeAssignSource = ref<LeadMentorJobOverviewListItem | null>(null)
const scopeRows = ref<Record<TabKey, LeadMentorJobOverviewListItem[]>>({
  pending: [],
  coaching: [],
  managed: [],
})
const interviewTimeRange = ref<string[] | null>(null)

const filters = reactive<JobOverviewFilters>({
  companyName: '',
  currentStage: '',
  lessonReported: undefined,
})

const calendarEvents = ref<LeadMentorCalendarRecord[]>([])

const allRows = computed(() => [
  ...scopeRows.value.pending,
  ...scopeRows.value.coaching,
  ...scopeRows.value.managed,
])

const tabCounts = computed<Record<TabKey, number>>(() => ({
  pending: scopeRows.value.pending.length,
  coaching: scopeRows.value.coaching.length,
  managed: scopeRows.value.managed.length,
}))

const companyOptions = computed(() =>
  Array.from(
    new Set(
      allRows.value
        .map((row) => row.companyName?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ),
)

const stageOptions = computed(() =>
  Array.from(
    new Set(
      allRows.value
        .map((row) => row.currentStage?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ),
)

const pendingRows = computed<PendingRow[]>(() =>
  scopeRows.value.pending.map((row) => ({
    applicationId: row.applicationId,
    coachingId: row.coachingId,
    studentName: row.studentName || '-',
    studentId: String(row.studentId ?? '-'),
    avatarColor: resolveAvatarColor(row.studentName),
    company: row.companyName || '-',
    role: row.positionName || '-',
    stage: row.currentStage || '-',
    stageTone: resolveStageTone(row.currentStage),
    interviewAt: formatDateTime(row.interviewTime),
    mentorDemand: formatMentorDemand(row.requestedMentorCount),
    submittedAt: formatSubmittedAt(row.submittedAt),
    cityLabel: row.cityLabel || '-',
    preferredMentorNames: row.preferredMentorNames || row.mentorNames || '-',
    raw: row,
  })),
)

const coachingRows = computed<OverviewRow[]>(() =>
  scopeRows.value.coaching.map((row) => toOverviewRow(row)),
)

const managedRows = computed<OverviewRow[]>(() =>
  scopeRows.value.managed.map((row) => toOverviewRow(row)),
)

const classReportVisible = ref(false)

const openClassReportFromCoaching = (record: OverviewRow) => {
  // Step2A-F7：优先按 coaching 行预填 job_coaching/coachingId；旧数据无 coachingId 时回退到 application/applicationId
  const coachingId = typeof record.coachingId === 'number' && record.coachingId > 0
    ? record.coachingId
    : null
  classReportPrefill.value = {
    prefilledStudentId: record.raw.studentId,
    prefilledReferenceType: coachingId ? 'job_coaching' : 'application',
    prefilledReferenceId: coachingId ?? record.applicationId,
    readonlyFields: ['student', 'reference'],
  }
  classReportVisible.value = true
}

const handleClassReportSubmitted = async () => {
  classReportVisible.value = false
  classReportPrefill.value = null
  const [coaching, managed] = await Promise.all([loadScope('coaching'), loadScope('managed')])
  scopeRows.value = { ...scopeRows.value, coaching, managed }
  message.success('课消记录已提交')
}

const buildAssignMentorPreview = (payload: {
  studentName: string
  studentId: string
  companyName: string
  positionName: string
  interviewStage: string
  interviewTime: string
  mentorDemand: string
  preferredMentor: string
  excludedMentor?: string
}): AssignMentorPreview => ({
  studentName: payload.studentName,
  studentId: payload.studentId,
  companyName: payload.companyName,
  positionName: payload.positionName,
  interviewStage: payload.interviewStage,
  interviewTime: payload.interviewTime,
  mentorDemand: payload.mentorDemand,
  preferredMentor: payload.preferredMentor,
  excludedMentor: payload.excludedMentor || '-',
})

const buildListParams = (scope: TabKey): LeadMentorJobOverviewListParams => ({
  scope,
  companyName: filters.companyName || undefined,
  currentStage: filters.currentStage || undefined,
  interviewTimeStart: Array.isArray(interviewTimeRange.value) && interviewTimeRange.value[0]
    ? interviewTimeRange.value[0]
    : undefined,
  interviewTimeEnd: Array.isArray(interviewTimeRange.value) && interviewTimeRange.value[1]
    ? interviewTimeRange.value[1]
    : undefined,
  lessonReported: scope === 'coaching' && filters.lessonReported !== undefined
    ? filters.lessonReported
    : undefined,
})

const loadScope = async (scope: TabKey) => {
  const response = await getLeadMentorJobOverviewList(buildListParams(scope))
  return Array.isArray(response?.rows) ? response.rows : []
}

const loadAllScopes = async () => {
  try {
    const [pending, coaching, managed] = await Promise.all([
      loadScope('pending'),
      loadScope('coaching'),
      loadScope('managed'),
    ])
    scopeRows.value = { pending, coaching, managed }
  } catch (_error) {
    scopeRows.value = { pending: [], coaching: [], managed: [] }
    isJobDetailModalOpen.value = false
    isAssignMentorModalOpen.value = false
    jobDetailPreview.value = null
    assignMentorPreview.value = null
    message.error('求职总览加载失败')
  }
}

const loadCalendar = async () => {
  try {
    const rows = await getLeadMentorJobOverviewCalendar()
    calendarEvents.value = Array.isArray(rows) ? rows : []
  } catch (_error) {
    calendarEvents.value = []
  }
}

const handleSearch = async () => {
  await syncRouteQuery()
  await loadAllScopes()
}

const openJobDetail = async (row: OverviewRow) => {
  try {
    const detail = await getLeadMentorJobOverviewDetail(row.applicationId)
    jobDetailPreview.value = buildJobDetailPreview(detail)
    isJobDetailModalOpen.value = true
    activeAssignSource.value = detail
  } catch (_error) {
    jobDetailPreview.value = null
    isJobDetailModalOpen.value = false
    message.error('求职详情加载失败')
  }
}

const openDetailDrawer = async (row: OverviewRow) => {
  detailDrawerApplicationId.value = row.applicationId
  detailDrawerGroups.value = []
  detailDrawerLoading.value = true
  isDetailDrawerOpen.value = true
  try {
    const detail = row.coachingId
      ? await getLeadMentorJobOverviewCoachingDetail(row.coachingId)
      : await getLeadMentorJobOverviewDetail(row.applicationId)
    detailDrawerGroups.value = detail.classRecordsByMentor ?? []
  } catch {
    message.error('课消详情加载失败')
    isDetailDrawerOpen.value = false
  } finally {
    detailDrawerLoading.value = false
  }
}

const openAssignMentorFromPending = (row: PendingRow) => {
  activeAssignApplicationId.value = row.applicationId
  activeAssignCoachingId.value = row.coachingId ?? null
  activeAssignRequiredMentorCount.value = row.raw.requestedMentorCount ?? null
  activeAssignSource.value = row.raw
  assignMentorPreview.value = buildAssignMentorPreview({
    studentName: row.studentName,
    studentId: row.studentId,
    companyName: row.company,
    positionName: row.role,
    interviewStage: row.stage,
    interviewTime: row.interviewAt,
    mentorDemand: row.mentorDemand,
    preferredMentor: row.preferredMentorNames,
  })
  isAssignMentorModalOpen.value = true
}

const handleRequestMentorChange = () => {
  const source = activeAssignSource.value
  const preview = jobDetailPreview.value

  isJobDetailModalOpen.value = false

  if (!source || !preview) {
    message.error('导师匹配上下文丢失')
    return
  }

  activeAssignApplicationId.value = source.applicationId
  activeAssignCoachingId.value = source.coachingId ?? null
  activeAssignRequiredMentorCount.value = source.requestedMentorCount ?? null
  assignMentorPreview.value = buildAssignMentorPreview({
    studentName: preview.studentName,
    studentId: preview.studentId,
    companyName: preview.companyName,
    positionName: preview.positionName,
    interviewStage: source.currentStage || preview.currentStage || '-',
    interviewTime: preview.interviewTime,
    mentorDemand: formatMentorDemand(source.requestedMentorCount),
    preferredMentor: source.mentorNames || source.preferredMentorNames || preview.mentorName,
  })
  isAssignMentorModalOpen.value = true
}

const handleConfirmAssignMentor = async (payload: AssignMentorConfirmPayload) => {
  if (!activeAssignApplicationId.value) {
    message.error('导师匹配上下文丢失')
    return
  }

  if (!payload.mentorIds.length) {
    message.error('请至少选择1位导师')
    return
  }
  if (
    activeAssignRequiredMentorCount.value &&
    activeAssignRequiredMentorCount.value > 0 &&
    payload.mentorIds.length !== activeAssignRequiredMentorCount.value
  ) {
    message.error('导师数量必须等于申请导师数量')
    return
  }

  try {
    const targetCoachingId = activeAssignCoachingId.value
    await (targetCoachingId
      ? assignLeadMentorJobOverviewCoachingMentor(targetCoachingId, payload)
      : assignLeadMentorJobOverviewMentor(activeAssignApplicationId.value, payload))
    const matchesAssignTarget = (entry: LeadMentorJobOverviewListItem) =>
      targetCoachingId
        ? entry.coachingId === targetCoachingId
        : entry.applicationId === activeAssignApplicationId.value
    isAssignMentorModalOpen.value = false
    scopeRows.value = {
      pending: scopeRows.value.pending.filter((entry) => !matchesAssignTarget(entry)),
      coaching: scopeRows.value.coaching,
      managed: scopeRows.value.managed.map((entry) =>
        matchesAssignTarget(entry)
          ? {
              ...entry,
              assignedStatus: 'assigned',
              coachingStatus: '辅导中',
              mentorNames: payload.mentorNames.join(', '),
              mentorName: payload.mentorNames[0] ?? entry.mentorName,
            }
          : entry,
      ),
    }
    message.success('导师匹配已保存')
    await nextTick()
    await loadAllScopes()
    await nextTick()
  } catch (_error) {
    message.error('导师匹配保存失败')
  }
}

const handleAcknowledgeStage = async (row: OverviewRow) => {
  try {
    await acknowledgeLeadMentorJobOverviewStage(row.applicationId)
    scopeRows.value = {
      pending: scopeRows.value.pending,
      coaching: scopeRows.value.coaching.map((entry) =>
        entry.applicationId === row.applicationId
          ? { ...entry, stageUpdated: false }
          : entry,
      ),
      managed: scopeRows.value.managed.map((entry) =>
        entry.applicationId === row.applicationId
          ? { ...entry, stageUpdated: false }
          : entry,
      ),
    }
    message.success('阶段更新已确认')
    await nextTick()
    await loadAllScopes()
    await nextTick()
  } catch (_error) {
    message.error('阶段确认失败')
  }
}

onMounted(() => {
  applyRouteFilters()
  void loadAllScopes()
  void loadCalendar()
})

watch(activeTab, (newTab) => {
  if (newTab === 'managed') void loadCalendar()
})

function applyRouteFilters() {
  const tab = readQueryValue(route.query.tab)
  if (tab === 'pending' || tab === 'coaching' || tab === 'managed') {
    activeTab.value = tab
  }
  filters.companyName = readQueryValue(route.query.companyName)
  filters.currentStage = readQueryValue(route.query.currentStage)
  const start = readQueryValue(route.query.interviewTimeStart)
  const end = readQueryValue(route.query.interviewTimeEnd)
  if (start && end) interviewTimeRange.value = [start, end]
}

async function syncRouteQuery() {
  const query: Record<string, string> = {}
  if (activeTab.value !== 'managed') {
    query.tab = activeTab.value
  }
  if (filters.companyName) {
    query.companyName = filters.companyName
  }
  if (filters.currentStage) {
    query.currentStage = filters.currentStage
  }
  if (Array.isArray(interviewTimeRange.value) && interviewTimeRange.value[0]) {
    query.interviewTimeStart = interviewTimeRange.value[0]
  }
  if (Array.isArray(interviewTimeRange.value) && interviewTimeRange.value[1]) {
    query.interviewTimeEnd = interviewTimeRange.value[1]
  }
  if (activeTab.value === 'coaching' && filters.lessonReported !== undefined) {
    query.lessonReported = String(filters.lessonReported)
  }
  await router.replace({ path: route.path, query })
}

function buildJobDetailPreview(row: LeadMentorJobOverviewListItem): JobDetailPreview {
  return {
    studentName: row.studentName || '-',
    studentId: String(row.studentId ?? '-'),
    leadMentorName: row.leadMentorName || '待分配班主任',
    companyName: row.companyName || '-',
    positionName: row.positionName || '-',
    currentStage: row.currentStage || '-',
    recruitmentCycle: [row.region, row.city].filter(Boolean).join(' · ') || '待更新',
    interviewTime: formatDateTime(row.interviewTime),
    countdownText: buildCountdownText(row.interviewTime),
    coachingStatus: row.coachingStatus || '待更新',
    mentorName: row.mentorNames || row.mentorName || '待分配',
    lessonHours: `${Number(row.hoursUsed ?? 0)}h`,
    applyTime: formatShortDate(row.submittedAt),
    notes: row.feedbackSummary || `${row.studentName || '该学员'} 当前处于 ${row.currentStage || '待更新'} 阶段`,
  }
}

function toOverviewRow(row: LeadMentorJobOverviewListItem): OverviewRow {
  return {
    applicationId: row.applicationId,
    coachingId: row.coachingId,
    studentName: row.studentName || '-',
    studentId: String(row.studentId ?? '-'),
    avatarColor: resolveAvatarColor(row.studentName),
    company: row.companyName || '-',
    companyTone: resolveCompanyTone(row.companyName),
    role: row.positionName || '-',
    stage: row.currentStage || '-',
    stageTone: resolveStageTone(row.currentStage),
    stageMeta: row.stageUpdated ? '阶段更新' : undefined,
    interviewAt: formatDateTime(row.interviewTime),
    deadlineHint: buildCountdownText(row.interviewTime),
    deadlineTone: resolveDeadlineTone(row.interviewTime),
    // §D.2 派生 status 展示（双轨制，stageUpdated 高亮保留旧行为）
    status: deriveOverviewStatusDisplay(row).label,
    statusTone: deriveOverviewStatusDisplay(row).tone,
    stageUpdated: Boolean(row.stageUpdated),
    rowTone: resolveRowTone(row),
    mentorName: row.mentorNames || row.mentorName || (row.assignedStatus === 'pending' ? '待分配' : '-'),
    mentorMeta: row.mentorBackground || '',
    cityLabel: row.cityLabel || '-',
    latestRating: row.latestRating || null,
    lessonCount: row.lessonCount ?? 0,
    raw: row,
  }
}

function resolveAvatarColor(name?: string) {
  const seed = (name || '').charCodeAt(0) || 0
  const palette = ['var(--primary)', '#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444']
  return palette[seed % palette.length]
}

function readQueryValue(value: unknown) {
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  return typeof value === 'string' ? value : ''
}

function resolveCompanyTone(companyName?: string) {
  const normalized = companyName?.toLowerCase() || ''
  if (normalized.includes('goldman')) {
    return 'company-name--primary'
  }
  if (normalized.includes('mckinsey')) {
    return 'company-name--warning'
  }
  if (normalized.includes('google') || normalized.includes('morgan') || normalized.includes('jp')) {
    return 'company-name--info'
  }
  return undefined
}

function resolveStageTone(stage?: string) {
  const normalized = stage?.toLowerCase() || ''
  if (normalized.includes('offer')) {
    return 'green'
  }
  if (normalized.includes('reject')) {
    return 'red'
  }
  if (normalized.includes('case') || normalized.includes('first') || normalized.includes('second') || normalized.includes('round')) {
    return 'orange'
  }
  if (normalized.includes('hirevue') || normalized.includes('assessment')) {
    return 'cyan'
  }
  if (normalized.includes('投递')) {
    return 'geekblue'
  }
  return 'blue'
}


function resolveRowTone(row: LeadMentorJobOverviewListItem) {
  if (row.stageUpdated) {
    return 'row-highlight--info'
  }
  if (row.assignedStatus === 'pending') {
    return 'row-highlight--warning'
  }
  if ((row.hoursUsed ?? 0) > 0) {
    return 'row-highlight--primary'
  }
  return 'row-highlight--faded'
}

function resolveDeadlineTone(interviewTime?: string) {
  if (!interviewTime) {
    return undefined
  }

  const interviewDate = new Date(interviewTime)
  if (Number.isNaN(interviewDate.getTime())) {
    return undefined
  }

  const diffDays = Math.ceil((interviewDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (diffDays <= 3) {
    return 'danger'
  }
  return undefined
}

function formatMentorDemand(count?: number) {
  if ((count ?? 0) > 0) {
    return `${count} 位`
  }
  return '需协助'
}

function formatSubmittedAt(submittedAt?: string) {
  return formatDateTime(submittedAt)
}

function formatShortDate(value?: string) {
  if (!value) {
    return '待更新'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function formatDateTime(value?: string) {
  if (!value) {
    return '待定'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function buildCountdownText(interviewTime?: string) {
  if (!interviewTime) {
    return '待更新'
  }

  const date = new Date(interviewTime)
  if (Number.isNaN(date.getTime())) {
    return '待更新'
  }

  const diffDays = Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (diffDays < 0) {
    return '已结束'
  }
  if (diffDays === 0) {
    return '今天'
  }
  return `还剩${diffDays}天`
}

</script>

<style scoped lang="scss">
.osg-page {
  display: block;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
}

.page-title-en {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}

.page-sub {
  margin-top: 8px;
  color: var(--text2);
  font-size: 14px;
}

.filter-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.job-overview-card {
  margin-bottom: 16px;
  border-radius: 16px;
  box-shadow: var(--card-shadow);
}

.lm-job-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-count {
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  background: rgba(148, 163, 184, 0.2);
  color: var(--text2);
}

.tab-count--managed {
  background: #8b5cf6;
  color: #fff;
}

.btn-acknowledge {
  background: #3b82f6 !important;
  border-color: #3b82f6 !important;
}

.student-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.student-name,
.company-name {
  font-weight: 600;
  color: var(--text);
}

.company-name--primary {
  color: #6d28d9;
}

.company-name--danger {
  color: #ef4444;
}

.company-name--info {
  color: #1e40af;
}

.company-name--warning {
  color: #92400e;
}

.student-meta,
.stage-meta {
  font-size: 11px;
  color: var(--muted);
}

.table-stack {
  display: grid;
  gap: 4px;
}

.accent {
  font-weight: 600;
  color: var(--primary);
}

.text-danger {
  color: #ef4444;
}

:deep(.row-highlight--warning td) {
  background: #fff7ed;
}

:deep(.row-highlight--danger td) {
  background: linear-gradient(90deg, #fee2e2, #fef2f2);
}

:deep(.row-highlight--primary td) {
  background: #f3e8ff;
}

:deep(.row-highlight--info td) {
  background: #dbeafe;
}

:deep(.row-highlight--faded td) {
  opacity: 0.7;
}

@media (max-width: 1024px) {
  .page-header {
    flex-direction: column;
  }
}
</style>
