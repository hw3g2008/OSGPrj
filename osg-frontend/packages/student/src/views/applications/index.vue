<template>
  <div id="page-job-tracking" class="applications-page" :data-action-trigger-count="applicationsActionTriggers.length">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ applicationsMeta.pageSummary.titleZh }} <span>{{ applicationsMeta.pageSummary.titleEn }}</span></h1>
        <p class="page-sub">{{ applicationsMeta.pageSummary.subtitle }}</p>
      </div>
    </div>

      <InterviewCalendar
        title="面试安排"
        :events="calendarEvents"
        @event-click="handleCalendarEventClick"
      />

      <a-card :bordered="false" class="filter-card">
        <a-space :size="12" wrap>
          <a-input
            v-model:value="filters.keyword"
            placeholder="搜索公司/岗位..."
            style="width: 220px"
          />
          <a-select v-model:value="filters.stage" placeholder="全部阶段" style="width: 140px" allow-clear>
            <a-select-option
              v-for="option in applicationsMeta.filterOptions.progressStages"
              :key="`stage-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
          <a-select v-model:value="filters.coachingStatus" placeholder="全部辅导状态" style="width: 150px" allow-clear>
            <a-select-option
              v-for="option in applicationsMeta.filterOptions.coachingStatuses"
              :key="`coaching-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
          <a-select v-model:value="filters.companyType" placeholder="全部公司类型" style="width: 160px" allow-clear>
            <a-select-option
              v-for="option in applicationsMeta.filterOptions.companyTypes"
              :key="`company-type-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
          <a-button type="primary" @click="applyFilters">
            <template #icon><SearchOutlined /></template>
            搜索
          </a-button>
          <a-button @click="resetFilters">
            <template #icon><ReloadOutlined /></template>
            重置
          </a-button>
        </a-space>
      </a-card>

      <a-card :bordered="false" class="applications-table-card" :body-style="{ padding: 0 }">
        <div class="applications-tab-header">
          <div class="applications-tab-pills">
            <button
              v-for="tab in tabDefs"
              :key="tab.key"
              type="button"
              class="app-tab"
              :class="{ 'app-tab--active': activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              <component :is="tab.icon" class="app-tab__icon" />
              <span>{{ tab.label }}</span>
              <span class="app-tab__count" :class="`app-tab__count--${tab.tone}`">{{ tab.count }}</span>
            </button>
          </div>
        </div>
        <a-table
          :columns="columns"
          :data-source="visibleApplications"
          :pagination="tablePagination"
          row-key="id"
          :scroll="{ x: 'max-content' }"
          :row-class-name="rowClassName"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'job'">
              <div class="job-cell">
                <div class="job-company">{{ record.company }}</div>
                <div class="job-position">{{ record.position }} · {{ record.location }}</div>
              </div>
            </template>

            <template v-else-if="column.key === 'stage'">
              <div v-if="activeTab === 'applied'" class="status-cell">
                <span class="stage-tag stage-tag--applied-bucket">
                  <CheckCircleFilled style="margin-right:3px" />{{ record.stageLabel }}
                </span>
                <span style="font-size:10px;color:#64748b">{{ record.applyMethod || '' }}</span>
              </div>
              <span v-else class="stage-tag" :style="stageTagStyle(record.stage)">{{ record.stageLabel }}</span>
            </template>

            <template v-else-if="column.key === 'interviewTime'">
              <div class="interview-cell">
                <div>{{ activeTab === 'applied' ? (record.appliedDate || '-') : record.interviewTime }}</div>
                <span>{{ activeTab === 'applied' ? (record.interviewHint || record.applyMethod || '-') : record.interviewHint }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'coachingStatus'">
              <!-- §D.4 改用 composable 派生 label/color -->
              <a-tag :color="getApplicationCoachingDisplay(record).color" class="coaching-tag-school">
                <ReadOutlined v-if="record.coachingStatus === 'coaching'" />
                <ClockCircleOutlined v-else-if="record.coachingStatus === 'pending'" />
                <span>{{ getApplicationCoachingDisplay(record).label }}</span>
              </a-tag>
            </template>

            <template v-else-if="column.key === 'mentor'">
              <div class="mentor-cell">
                <div>{{ record.mentor }}</div>
                <span>{{ record.mentorMeta }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'hoursFeedback'">
              <div class="feedback-cell">
                <div>{{ record.hoursFeedback }}</div>
                <span>{{ record.feedback }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'actions'">
              <a-button
                v-if="record.bucket === 'completed'"
                type="primary"
                disabled
              >
                <CheckCircleOutlined /> 已结束
              </a-button>
              <a-select
                v-else
                :id="`action-stage-select-${record.id}`"
                :value="record.stage"
                size="small"
                class="action-stage-select"
                :style="selectStageTone(record.stage)"
                @change="stageDropdownChanged(record, $event)"
              >
                <a-select-option
                  v-for="option in stageDropdownOptions(record.stage)"
                  :key="`action-option-${record.id}-${option.value}`"
                  :value="option.value"
                >
                  {{ option.label }}
                </a-select-option>
              </a-select>
            </template>
          </template>
        </a-table>
      </a-card>

    <a-modal
      v-model:open="interviewModalOpen"
      ok-text="确定"
      centered
      :width="400"
      :closable="false"
      :wrap-class-name="interviewModalWrapClass"
      :mask-style="{ backdropFilter: 'blur(4px)' }"
      :cancel-button-props="{ style: { display: 'none' } }"
      destroy-on-close
      @ok="interviewModalOpen = false"
    >
      <template #title>
        <div class="interview-modal-titlebar">
          <span class="modal-title-inline">
            <CalendarOutlined class="modal-title-icon" aria-hidden="true" />
            <span class="modal-title-text">面试安排</span>
          </span>
          <a-button type="text" shape="circle" class="interview-modal-closebtn" @click="interviewModalOpen = false">
            <template #icon><CloseOutlined /></template>
          </a-button>
        </div>
      </template>
      <div class="rich-modal-shell rich-modal-shell--compact">
        <div class="interview-detail-card">
          <div class="modal-heading">{{ selectedInterviewTitle }}</div>
          <div class="modal-sub">{{ selectedInterviewModalTime }}</div>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="progressModalOpen"
      :title="renderModalTitle(EditOutlined, '更新状态 & 申请辅导')"
      ok-text="提交"
      cancel-text="取消"
      centered
      :width="580"
      wrap-class-name="applications-modal applications-modal--progress"
      :mask-style="{ backdropFilter: 'blur(4px)' }"
      destroy-on-close
      @ok="saveProgress"
    >
      <a-form id="modal-update-result" layout="vertical" :model="progressForm" class="rich-modal-shell">
        <div v-if="selectedApplication" class="modal-job-card progress-card">
          <div class="modal-job-mark">{{ selectedApplicationBadge }}</div>
          <div>
            <div class="modal-job-title">{{ selectedApplication.company }}</div>
            <div class="modal-job-sub">{{ selectedApplication.position }} · {{ selectedApplication.location }}</div>
          </div>
        </div>
        <a-form-item
          label="当前面试阶段"
          required
          class="rich-form-field rich-form-field--full"
          extra="选择阶段后，页面会切换到对应的 HireVue 或面试辅导分段内容。"
        >
          <a-select
            id="update-stage-select"
            v-model:value="progressForm.stage"
            placeholder="请选择当前阶段"
            :style="selectStageTone(progressForm.stage)"
          >
            <a-select-option
              v-for="option in stageDropdownOptions(progressForm.stage)"
              :key="`progress-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <div v-if="progressForm.stage === 'hirevue'" id="update-hirevue-fields" class="rich-form-card rich-form-card--subtle">
          <div class="rich-form-header rich-form-header--subtle">
            <h4 class="rich-form-title">HireVue / Online Test 信息</h4>
            <p class="rich-form-help">复用岗位页的紫色模态样式、说明文案和上传入口。</p>
          </div>
          <div class="rich-form-stack">
            <a-form-item label="请选择类型" required class="rich-form-field rich-form-field--full">
              <a-radio-group v-model:value="progressForm.hirevueType">
                <a-radio value="vi">VI (Video Interview)</a-radio>
                <a-radio value="ot">OT (Online Test)</a-radio>
              </a-radio-group>
            </a-form-item>

            <a-form-item v-if="progressForm.hirevueType === 'vi'" id="update-vi-fields" label="VI 链接" required class="rich-form-field rich-form-field--full">
              <a-input v-model:value="progressForm.viLink" placeholder="请输入 Video Interview 链接" />
            </a-form-item>

            <template v-if="progressForm.hirevueType === 'ot'">
              <a-form-item id="update-ot-fields" label="OT 链接" required class="rich-form-field">
                <a-input v-model:value="progressForm.otLink" placeholder="请输入 Online Test 链接" />
              </a-form-item>
              <a-form-item label="登录账号" required class="rich-form-field">
                <a-input v-model:value="progressForm.otAccount" placeholder="账号" />
              </a-form-item>
              <a-form-item label="登录密码" required class="rich-form-field">
                <a-input-password v-model:value="progressForm.otPassword" placeholder="密码" />
              </a-form-item>
            </template>

            <a-form-item
              label="截止时间"
              required
              class="rich-form-field"
              extra="请填写 VI/OT 的截止时间，系统会一并写入进度说明。"
            >
              <DatePicker
                id="update-hirevue-deadline"
                v-model:value="progressForm.hirevueDeadline"
                show-time
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DDTHH:mm"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="上传邀请邮件截图" required class="rich-form-field">
              <Upload
                id="update-hirevue-upload"
                v-model:file-list="progressHirevueFileList"
                :action="uploadAction"
                :headers="uploadHeaders"
                name="file"
                accept="image/*"
                :max-count="1"
                @change="handleUpdateHirevueUpload"
              >
                <label class="upload-dropzone upload-dropzone--compact">
                  <CloudUploadOutlined class="upload-dropzone__icon" />
                  <span class="upload-dropzone__title">点击上传截图</span>
                  <span class="upload-dropzone__helper">支持 JPG、PNG 格式</span>
                  <span v-if="progressForm.inviteScreenshotName" class="upload-dropzone__file">{{ progressForm.inviteScreenshotName }}</span>
                </label>
              </Upload>
            </a-form-item>
            <a-form-item label="是否需要导师协助？" required class="rich-form-field rich-form-field--full">
              <a-radio-group v-model:value="progressForm.mentorHelp">
                <a-radio value="yes">是，需要导师协助</a-radio>
                <a-radio value="no">否，仅需题库权限</a-radio>
              </a-radio-group>
            </a-form-item>
          </div>
        </div>

        <div v-else-if="showUpdateInterviewFields" id="update-interview-fields" class="rich-form-card rich-form-card--subtle">
          <div class="rich-form-header rich-form-header--subtle">
            <h4 class="rich-form-title">面试 & 辅导信息</h4>
            <p class="rich-form-help">保持岗位页同款分段节奏，先确认导师数量与时间，再补充偏好。</p>
          </div>
          <div class="rich-form-stack">
            <a-form-item
              label="需要几个导师？"
              required
              class="rich-form-field"
              extra="根据面试难度，您可申请 1-3 位导师进行模拟面试。"
            >
              <a-select
                id="mentor-count-select"
                v-model:value="progressForm.mentorCount"
                placeholder="请选择导师数量"
                style="width: 100%"
              >
                <a-select-option
                  v-for="option in applicationsMeta.filterOptions.mentorCounts"
                  :key="`application-mentor-count-${option.value}`"
                  :value="option.value"
                >
                  {{ option.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item
              label="面试时间"
              required
              class="rich-form-field"
              extra="请填写该轮面试的具体时间，系统会同步写入进度说明。"
            >
              <DatePicker
                id="update-interview-time"
                v-model:value="progressForm.interviewTime"
                show-time
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DDTHH:mm"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="意向导师（选填）" class="rich-form-field">
              <a-input id="update-prefer-mentor" v-model:value="progressForm.preferMentor" placeholder="如有特别想要的导师，请填写导师姓名" />
            </a-form-item>
            <a-form-item label="排除导师（选填）" class="rich-form-field">
              <a-input id="update-exclude-mentor" v-model:value="progressForm.excludeMentor" placeholder="如有不想选择的导师，请填写导师姓名" />
            </a-form-item>
          </div>
        </div>

        <a-form-item label="备注（选填）" class="rich-form-field rich-form-field--full">
          <a-textarea v-model:value="progressForm.note" :rows="2" placeholder="其他需要说明的内容..." />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="appliedModalOpen"
      :title="renderModalTitle(CheckCircleOutlined, '标记已投递')"
      ok-text="确认投递"
      cancel-text="取消"
      centered
      :width="450"
      wrap-class-name="applications-modal applications-modal--applied"
      :mask-style="{ backdropFilter: 'blur(4px)' }"
      destroy-on-close
      @ok="confirmApplied"
    >
      <a-form id="modal-mark-applied" layout="vertical" :model="appliedForm" class="rich-modal-shell">
        <div v-if="selectedApplication" class="modal-job-card applied-card">
          <div class="modal-job-mark">{{ selectedApplicationBadge }}</div>
          <div>
            <div class="modal-job-title">{{ selectedApplication.company }}</div>
            <div class="modal-job-sub">{{ selectedApplication.position }} · {{ selectedApplication.location }}</div>
          </div>
        </div>
        <a-form-item required class="rich-form-field rich-form-field--full">
          <template #label>
            <span class="field-label-inline"><CalendarOutlined />投递时间</span>
          </template>
          <DatePicker
            id="applied-date"
            v-model:value="appliedForm.date"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item class="rich-form-field rich-form-field--full">
          <template #label>
            <span class="field-label-inline"><SendOutlined />投递方式</span>
          </template>
          <a-select
            id="applied-method"
            v-model:value="appliedForm.method"
            placeholder="请选择投递方式"
            style="width: 100%"
          >
            <a-select-option
              v-for="option in applicationsMeta.filterOptions.applyMethods"
              :key="`apply-method-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item class="rich-form-field rich-form-field--full">
          <template #label>
            <span class="field-label-inline"><FileTextOutlined />备注（选填）</span>
          </template>
          <a-textarea v-model:value="appliedForm.note" :rows="2" placeholder="如：投递了哪个部门、使用了谁的内推等" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import { message, DatePicker, Upload } from 'ant-design-vue'
import {
  CalendarOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CloudUploadOutlined,
  EditOutlined,
  FileTextOutlined,
  OrderedListOutlined,
  ReadOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
} from '@ant-design/icons-vue'
import { InterviewCalendar } from '@osg/shared/components'
import type { InterviewEvent } from '@osg/shared/types'
import { getToken } from '@osg/shared/utils'
import {
  getStudentApplicationsMeta,
  listStudentApplications,
  requestStudentPositionCoaching,
  type StudentApplicationsMeta,
  updateStudentPositionApply,
  updateStudentPositionProgress,
  type StudentApplicationRecord
} from '@osg/shared/api'
// §D.4 学生端用 SSOT composable 派生辅导状态显示，停止依赖后端 coachingStatusLabel/coachingColor 固化字段
import { deriveApplicationStatus } from '@osg/shared/composables'

/**
 * §D.4 用 composable 派生展示态。优先用前端派生，后端固化字段做兜底（向后兼容）。
 */
function getApplicationCoachingDisplay(record: StudentApplicationRecord) {
  const display = deriveApplicationStatus({
    coachingStatus: record.coachingStatus,
    // student 端 row 暂未含 assignStatus，仅传 coachingStatus（composable 会兜底为 pending）
  })
  return {
    label: display.label || record.coachingStatusLabel || '-',
    // a-tag color 兼容 antdv 内建色名，用 composable tone 直接映射
    color: mapToneToAntdColor(display.tone) || record.coachingColor || 'default',
  }
}

function mapToneToAntdColor(tone: 'danger' | 'warning' | 'info' | 'success' | 'default') {
  // a-tag 内建色名：success / processing / error / warning / default
  switch (tone) {
    case 'danger': return 'error'
    case 'warning': return 'warning'
    case 'info': return 'processing'
    case 'success': return 'success'
    default: return 'default'
  }
}

type TabKey = 'all' | 'applied' | 'ongoing' | 'completed'
type StageTone = { background: string; borderColor: string; color: string }

interface StageOption {
  value: string
  label: string
}

interface ApplyStageForm {
  stage: string
  hirevueType: string
  viLink: string
  otLink: string
  otAccount: string
  otPassword: string
  hirevueDeadline: string
  inviteScreenshotName: string
  inviteScreenshotUrl: string
  mentorHelp: string
  interviewTime: string
  mentorCount: string
  preferMentor: string
  excludeMentor: string
  note: string
}

const applicationsActionTriggers = [
  { actionId: 'calendar-gs', label: 'GS Final interview detail' },
  { actionId: 'calendar-mck', label: 'MCK Case interview detail' },
  { actionId: 'summary-gs', label: 'GS Final summary pill' },
  { actionId: 'summary-mck', label: 'MCK Case summary pill' },
  { actionId: 'all-progress', label: 'all tab progress update' },
  { actionId: 'applied-mark', label: 'applied tab mark applied dialog' }
] as const

const activeTab = ref<TabKey>('all')
const selectedApplicationId = ref<number | null>(null)
const selectedInterviewId = ref<number | null>(null)
const interviewStages = ['screening', 'first', 'second', 'third', 'case', 'superday']

const interviewModalOpen = ref(false)
const progressModalOpen = ref(false)
const appliedModalOpen = ref(false)

const filters = ref({
  keyword: '',
  stage: undefined as string | undefined,
  coachingStatus: undefined as string | undefined,
  companyType: undefined as string | undefined
})

const applications = ref<StudentApplicationRecord[]>([])
const applicationsMeta = ref<StudentApplicationsMeta>({
  pageSummary: {
    titleZh: '',
    titleEn: '',
    subtitle: ''
  },
  tabCounts: {
    all: 0,
    applied: 0,
    ongoing: 0,
    completed: 0
  },
  filterOptions: {
    progressStages: [],
    coachingStages: [],
    mentorCounts: [],
    coachingStatuses: [],
    companyTypes: [],
    applyMethods: []
  },
  schedule: []
})

const progressForm = ref<ApplyStageForm>(defaultApplyStageForm())

const stageToneMap: Record<string, StageTone> = {
  applied: { background: '#E0E7FF', borderColor: '#6366F1', color: '#4338CA' },
  hirevue: { background: '#DBEAFE', borderColor: '#3B82F6', color: '#1E40AF' },
  screening: { background: '#F3E8FF', borderColor: '#8B5CF6', color: '#6D28D9' },
  first: { background: '#FEF3C7', borderColor: '#F59E0B', color: '#92400E' },
  second: { background: '#FEF3C7', borderColor: '#F59E0B', color: '#92400E' },
  third: { background: '#FEF3C7', borderColor: '#F59E0B', color: '#92400E' },
  case: { background: '#F59E0B', borderColor: '#F59E0B', color: '#fff' },
  superday: { background: '#FEE2E2', borderColor: '#EF4444', color: '#991B1B' },
  offer: { background: '#DCFCE7', borderColor: '#22C55E', color: '#166534' },
  rejected: { background: '#FEE2E2', borderColor: '#EF4444', color: '#991B1B' },
  withdraw: { background: '#F3F4F6', borderColor: '#9CA3AF', color: '#6B7280' }
}

const appliedForm = ref({
  date: '',
  method: '',
  note: ''
})

type TabTone = 'primary' | 'success' | 'warning' | 'muted'
const tabDefs = computed<{ key: TabKey; label: string; icon: typeof OrderedListOutlined; count: number; tone: TabTone }[]>(() => [
  { key: 'all', label: '全部', icon: OrderedListOutlined, count: applicationsMeta.value.tabCounts.all, tone: 'primary' },
  { key: 'applied', label: '已投递', icon: SendOutlined, count: applicationsMeta.value.tabCounts.applied, tone: 'success' },
  { key: 'ongoing', label: '面试中', icon: ClockCircleOutlined, count: applicationsMeta.value.tabCounts.ongoing, tone: 'warning' },
  { key: 'completed', label: '已结束', icon: CheckCircleOutlined, count: applicationsMeta.value.tabCounts.completed, tone: 'muted' },
])

const columns = computed(() => {
  const stageTitle = activeTab.value === 'applied' ? '投递状态' : '阶段'
  const timeTitle = activeTab.value === 'applied' ? '投递时间' : '面试时间'

  return [
    { title: '公司/岗位', key: 'job', width: 220 },
    { title: stageTitle, key: 'stage', width: 140 },
    { title: timeTitle, key: 'interviewTime', width: 160 },
    { title: '辅导状态', key: 'coachingStatus', width: 120 },
    { title: '导师', key: 'mentor', width: 140 },
    { title: '课时/反馈', key: 'hoursFeedback', width: 130 },
    { title: '操作', key: 'actions', width: 160, fixed: 'right' as const }
  ]
})

const selectedApplication = computed(() =>
  applications.value.find((record) => record.id === selectedApplicationId.value) ?? null
)
const selectedApplicationBadge = computed(() => {
  const fallback = selectedApplication.value?.company?.trim()
  return fallback ? fallback.slice(0, 2).toUpperCase() : 'JP'
})

const calendarEvents = computed<InterviewEvent[]>(() =>
  applications.value
    .filter((record) => !!record.interviewAt)
    .map((record) => ({
      id: record.id,
      interviewTime: record.interviewAt,
      studentName: '',
      company: record.company,
      position: record.position,
      location: record.location,
      interviewStage: record.stageLabel,
      coachingStatus: record.coachingStatus
    }))
)

function handleCalendarEventClick(event: InterviewEvent) {
  openInterviewModal(event.id)
}

const progressStageOptions = computed<StageOption[]>(() => {
  const merged = new Map<string, StageOption>()

  applicationsMeta.value.filterOptions.progressStages.forEach((option) => {
    merged.set(option.value, { value: option.value, label: option.label })
  })

  applicationsMeta.value.filterOptions.coachingStages.forEach((option) => {
    if (!merged.has(option.value)) {
      merged.set(option.value, { value: option.value, label: option.label })
    }
  })

  const order = ['applied', 'hirevue', 'screening', 'first', 'second', 'third', 'case', 'superday', 'offer', 'rejected', 'withdraw']
  return Array.from(merged.values()).sort((left, right) => order.indexOf(left.value) - order.indexOf(right.value))
})
const stageLabelByValue = computed(() => new Map(progressStageOptions.value.map((option) => [option.value, option.label])))
const showUpdateInterviewFields = computed(() => interviewStages.includes(progressForm.value.stage))

const selectedInterviewApplication = computed(() =>
  applications.value.find((record) => record.id === selectedInterviewId.value) ?? null
)

const selectedInterviewTitle = computed(() => {
  const app = selectedInterviewApplication.value
  if (!app) return ''
  return `${app.company} - ${app.stageLabel}`
})

const selectedInterviewModalTime = computed(() => {
  const app = selectedInterviewApplication.value
  if (!app?.interviewAt) return ''
  const iso = String(app.interviewAt).replace(' ', 'T')
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return app.interviewAt
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

const interviewModalWrapClass = computed(() => {
  const tone = selectedInterviewApplication.value?.coachingStatus === 'coaching' ? 'info' : 'danger'
  return `applications-modal applications-modal--interview applications-modal--${tone}`
})

const visibleApplications = computed(() => {
  const scoped = activeTab.value === 'all'
    ? applications.value
    : applications.value.filter((record) => record.bucket === activeTab.value)

  return scoped.filter((record) => {
    const keyword = filters.value.keyword.trim().toLowerCase()

    if (filters.value.stage && record.stage !== filters.value.stage) {
      return false
    }

    if (filters.value.coachingStatus && record.coachingStatus !== filters.value.coachingStatus) {
      return false
    }

    if (filters.value.companyType && record.companyType !== filters.value.companyType) {
      return false
    }

    if (!keyword) {
      return true
    }

    return [record.company, record.position, record.location, record.mentor, record.feedback]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  })
})

// 客户端分页（与 assistant/lead-mentor『position』页一致的规范）
const tablePagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total: number) => `共 ${total} 条`
})

watch(
  visibleApplications,
  (rows) => {
    tablePagination.total = rows.length
    const maxPage = Math.max(1, Math.ceil(rows.length / Number(tablePagination.pageSize ?? 10)))
    if (Number(tablePagination.current ?? 1) > maxPage) {
      tablePagination.current = maxPage
    }
  },
  { immediate: true }
)

function handleTableChange(pag: TablePaginationConfig) {
  tablePagination.current = pag.current ?? 1
  tablePagination.pageSize = pag.pageSize ?? Number(tablePagination.pageSize ?? 10)
}

async function loadApplications() {
  const [applicationsResponse, metaResponse] = await Promise.all([
    listStudentApplications(),
    getStudentApplicationsMeta()
  ])
  applications.value = applicationsResponse.applications
  applicationsMeta.value = metaResponse
}

function openInterviewModal(id: number) {
  selectedInterviewId.value = id
  interviewModalOpen.value = true
}

function openProgressModal(record: StudentApplicationRecord) {
  selectedApplicationId.value = record.id
  progressHirevueFileList.value = []
  progressForm.value = {
    ...defaultApplyStageForm(),
    stage: record.stage,
    note: record.progressNote || ''
  }
  progressModalOpen.value = true
}

function stageDropdownOptions(currentStage?: string) {
  const allOptions = progressStageOptions.value
  if (!currentStage || allOptions.some((option) => option.value === currentStage)) {
    return allOptions
  }

  return [{ value: currentStage, label: currentStage }, ...allOptions]
}

function selectStageTone(stage?: string): StageTone {
  return stageToneMap[stage || 'applied'] ?? stageToneMap.applied
}

function stageTagStyle(stage?: string): Record<string, string> {
  const tone = stageToneMap[stage || 'applied'] ?? stageToneMap.applied
  return { background: tone.background, color: tone.color, border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', display: 'inline-block' }
}

function rowClassName(record: StudentApplicationRecord) {
  if (record.bucket === 'completed') return 'row-completed'
  if (activeTab.value === 'applied') return 'row-applied'
  if (record.coachingStatus === 'coaching') return 'row-coaching'
  if (record.coachingStatus === 'pending') return 'row-pending'
  return ''
}

function stageDropdownChanged(record: StudentApplicationRecord, nextStage: string) {
  if (!nextStage || nextStage === record.stage) {
    return
  }

  openProgressModal({
    ...record,
    stage: nextStage
  })
}

function applyFilters() {
  filters.value.keyword = filters.value.keyword.trim()
}

function resetFilters() {
  filters.value = {
    keyword: '',
    stage: undefined,
    coachingStatus: undefined,
    companyType: undefined
  }
}

async function saveProgress() {
  if (!selectedApplication.value) {
    return
  }
  if (!progressForm.value.stage) {
    message.error('请选择面试阶段')
    return
  }
  if (progressForm.value.stage === 'hirevue') {
    if (!validateHirevueFields(progressForm.value)) {
      return
    }
  } else if (showUpdateInterviewFields.value && !validateInterviewFields(progressForm.value, true)) {
    return
  }

  try {
    const note = buildStageNote(progressForm.value)

    if (progressForm.value.stage === 'hirevue' && progressForm.value.mentorHelp === 'yes') {
      await requestStudentPositionCoaching({
        positionId: selectedApplication.value.positionId,
        stage: progressForm.value.stage,
        mentorCount: '1',
        note
      })
    } else if (showUpdateInterviewFields.value) {
      await requestStudentPositionCoaching({
        positionId: selectedApplication.value.positionId,
        stage: progressForm.value.stage,
        mentorCount: progressForm.value.mentorCount,
        note
      })
    } else {
      await updateStudentPositionProgress({
        positionId: selectedApplication.value.positionId,
        stage: progressForm.value.stage,
        notes: note
      })
    }
    await loadApplications()
    progressModalOpen.value = false
    message.success('状态已更新！已通知班主任、助教和后台管理员。')
  } catch {
    return
  }
}

async function confirmApplied() {
  if (!selectedApplication.value) {
    return
  }

  if (!appliedForm.value.date) {
    message.error('请选择投递时间')
    return
  }

  try {
    await updateStudentPositionApply({
      positionId: selectedApplication.value.positionId,
      applied: true,
      date: appliedForm.value.date,
      method: appliedForm.value.method,
      note: appliedForm.value.note
    })
    await loadApplications()
    appliedModalOpen.value = false
    message.success('已标记为已投递')
  } catch {
    return
  }
}

async function bootstrapPage() {
  try {
    await loadApplications()
  } catch {
    return
  }
}

onMounted(() => {
  void bootstrapPage()
})

function defaultApplyStageForm(): ApplyStageForm {
  return {
    stage: '',
    hirevueType: '',
    viLink: '',
    otLink: '',
    otAccount: '',
    otPassword: '',
    hirevueDeadline: '',
    inviteScreenshotName: '',
    inviteScreenshotUrl: '',
    mentorHelp: '',
    interviewTime: '',
    mentorCount: '',
    preferMentor: '',
    excludeMentor: '',
    note: ''
  }
}

// 邀请邮件截图真实上传配置（与岗位页同款 ruoyi /common/upload 实现）
const uploadAction = '/api/common/upload'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${getToken()}`
}))
const progressHirevueFileList = ref<any[]>([])

function handleUpdateHirevueUpload(info: { file: any; fileList?: any[] }) {
  progressHirevueFileList.value = info.fileList || []
  if (info.file?.status === 'done') {
    const url = info.file.response?.url || info.file.response?.fileName
    if (url) {
      progressForm.value.inviteScreenshotName = info.file.name ?? ''
      progressForm.value.inviteScreenshotUrl = url
      message.success('邀请邮件截图上传成功')
    } else {
      message.error('上传响应缺少 url，请重试')
    }
  } else if (info.file?.status === 'error') {
    message.error('邀请邮件截图上传失败，请重试')
  } else if (info.file?.status === 'removed') {
    progressForm.value.inviteScreenshotName = ''
    progressForm.value.inviteScreenshotUrl = ''
  }
}

function renderModalTitle(Icon: any, text: string) {
  return h('span', { class: 'modal-title-inline' }, [
    h(Icon, { class: 'modal-title-icon', 'aria-hidden': 'true' }),
    h('span', { class: 'modal-title-text' }, text)
  ])
}

function resolveStageLabel(stage: string) {
  return stageLabelByValue.value.get(stage) || stage
}

function buildStageNote(form: ApplyStageForm) {
  const lines: string[] = [`阶段：${resolveStageLabel(form.stage)}`]

  if (form.stage === 'hirevue') {
    if (form.hirevueType) {
      lines.push(`类型：${form.hirevueType === 'vi' ? 'VI' : 'OT'}`)
    }
    if (form.hirevueType === 'vi' && form.viLink.trim()) {
      lines.push(`VI链接：${form.viLink.trim()}`)
    }
    if (form.hirevueType === 'ot') {
      if (form.otLink.trim()) {
        lines.push(`OT链接：${form.otLink.trim()}`)
      }
      if (form.otAccount.trim()) {
        lines.push(`OT账号：${form.otAccount.trim()}`)
      }
      if (form.otPassword.trim()) {
        lines.push(`OT密码：${form.otPassword.trim()}`)
      }
    }
    if (form.hirevueDeadline) {
      lines.push(`截止时间：${form.hirevueDeadline}`)
    }
    if (form.inviteScreenshotName) {
      lines.push(`inviteScreenshot=${form.inviteScreenshotName}`)
    }
    if (form.inviteScreenshotUrl) {
      lines.push(`inviteScreenshotUrl=${form.inviteScreenshotUrl}`)
    }
    if (form.mentorHelp) {
      lines.push(`导师协助：${form.mentorHelp === 'yes' ? '是' : '否'}`)
    }
  } else if (interviewStages.includes(form.stage)) {
    if (form.interviewTime) {
      lines.push(`面试时间：${form.interviewTime}`)
    }
    if (form.mentorCount) {
      lines.push(`导师数量：${form.mentorCount}`)
    }
    if (form.preferMentor.trim()) {
      lines.push(`意向导师：${form.preferMentor.trim()}`)
    }
    if (form.excludeMentor.trim()) {
      lines.push(`排除导师：${form.excludeMentor.trim()}`)
    }
  }

  if (form.note.trim()) {
    lines.push(`备注：${form.note.trim()}`)
  }

  return lines.join('\n')
}

function validateHirevueFields(form: ApplyStageForm) {
  if (!form.hirevueType) {
    message.error('请选择 HireVue / OT 类型')
    return false
  }
  if (form.hirevueType === 'vi' && !form.viLink.trim()) {
    message.error('请填写 VI 链接')
    return false
  }
  if (form.hirevueType === 'ot') {
    if (!form.otLink.trim()) {
      message.error('请填写 OT 链接')
      return false
    }
    if (!form.otAccount.trim()) {
      message.error('请填写 OT 登录账号')
      return false
    }
    if (!form.otPassword.trim()) {
      message.error('请填写 OT 登录密码')
      return false
    }
  }
  if (!form.hirevueDeadline) {
    message.error('请填写 HireVue / OT 截止时间')
    return false
  }
  if (!form.inviteScreenshotUrl) {
    message.error('请上传邀请邮件截图')
    return false
  }
  if (!form.mentorHelp) {
    message.error('请选择是否需要导师协助')
    return false
  }
  return true
}

function validateInterviewFields(form: ApplyStageForm, requireMentorCount: boolean) {
  if (requireMentorCount && !form.mentorCount) {
    message.error('请选择导师数量')
    return false
  }
  if (!form.interviewTime) {
    message.error('请填写该阶段的面试时间')
    return false
  }
  return true
}
</script>

<style scoped lang="scss">
.applications-page {
  > .page-header {
    margin-bottom: 20px;
  }

  > :deep(.ant-card) {
    margin-bottom: 16px;
  }

  .filter-card {
    :deep(.ant-card-body) {
      padding: 12px 16px 20px;
    }
  }

  .applications-table-card {
    overflow: hidden;
  }

  .applications-tab-header {
    padding: 12px 16px;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
  }

  // 原型双层 tab：外层灰底容器 + 内层小 tab
  .applications-tab-pills {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 3px;
    background: #f8fafc;
    border-radius: 6px;
  }

  .app-tab {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    background: transparent;
    border: 0;
    border-radius: 4px;
    cursor: pointer;
    line-height: 1.3;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .app-tab:hover {
    color: #1e293b;
  }

  .app-tab__icon {
    font-size: 14px;
    line-height: 1;
  }

  .app-tab--active {
    background: var(--primary, #7399c6);
    color: #fff;
  }

  .app-tab--active:hover {
    color: #fff;
  }

  .app-tab__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 16px;
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    color: #fff;
    margin-left: 2px;
  }

  // 未高亮状态：count 彩色标识保留语义（全部/已投递/面试中/已结束）
  .app-tab:not(.app-tab--active) .app-tab__count--primary {
    background: var(--primary, #7399c6);
  }
  .app-tab:not(.app-tab--active) .app-tab__count--success {
    background: #22c55e;
  }
  .app-tab:not(.app-tab--active) .app-tab__count--warning {
    background: #f59e0b;
  }
  .app-tab:not(.app-tab--active) .app-tab__count--muted {
    background: #6b7280;
  }

  // 高亮状态 count 半透明白
  .app-tab--active .app-tab__count {
    background: rgba(255, 255, 255, 0.3);
  }

  // 表头：对齐原型的浅灰底小字样式
  .applications-table-card :deep(.ant-table-thead > tr > th) {
    background: #f8fafc;
    color: #64748b;
    font-size: 12px;
    font-weight: 600;
  }

  .applications-table-card :deep(.ant-table-thead > tr > th::before) {
    display: none;
  }

  .stage-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
  }

  // 已投递 tab 内 stage tag 是绿底白字 + ✓（原型对齐）
  .stage-tag--applied-bucket {
    background: #22c55e;
    color: #fff;
  }

  // 辅导状态颜色（不同于 a-tag default）
  .coaching-tag-school {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  .action-stage-select {
    min-width: 130px;
    width: 100%;
  }

  .action-stage-select :deep(.ant-select-selector) {
    height: 28px !important;
    padding: 0 24px 0 8px !important;
    border-radius: 6px !important;
    font-size: 11px;
    font-weight: 600;
  }

  .action-stage-select :deep(.ant-select-selection-item) {
    line-height: 26px !important;
  }

  .modal-stage-select {
    min-width: 116px;
    height: 32px;
    padding: 4px 28px 4px 10px;
    border-width: 1px;
    border-style: solid;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }

  .native-form-input,
  .native-form-select {
    width: 100%;
    min-height: 40px;
    border: 1px solid #d0d7e2;
    border-radius: 10px;
    padding: 9px 12px;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
  }

  .native-form-input:focus,
  .native-form-select:focus {
    border-color: var(--applications-modal-accent, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
    outline: none;
  }

  .native-form-input--file {
    padding: 8px 10px;
  }

  .native-form-textarea {
    min-height: 88px;
    resize: vertical;
  }

  .rich-modal-shell {
    display: grid;
    gap: 16px;
  }

  .rich-modal-shell--compact {
    gap: 12px;
  }

  .rich-form-card {
    border: 1px solid #dbe5f0;
    border-radius: 12px;
    background: #f8fafc;
    padding: 16px;
  }

  .rich-form-card--subtle {
    background: #fff;
    border-color: #dbe5f0;
  }

  .rich-form-header {
    margin-bottom: 12px;
  }

  .rich-form-header--subtle {
    margin-bottom: 14px;
  }

  .rich-form-title {
    margin: 0;
    color: var(--applications-modal-accent, #1d4ed8);
    font-size: 13px;
    font-weight: 700;
  }

  .rich-form-help {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.6;
  }

  .rich-form-stack {
    display: grid;
    gap: 14px;
  }

  .rich-form-field {
    color: #334155;
    font-size: 13px;
  }

  .rich-form-field--full {
    grid-column: 1 / -1;
  }

  .rich-modal-shell :deep(.ant-form-item),
  .rich-form-stack :deep(.ant-form-item) {
    margin-bottom: 0;
  }

  .rich-modal-shell :deep(.ant-form-item-label),
  .rich-form-stack :deep(.ant-form-item-label) {
    padding-bottom: 6px;

    > label {
      color: #334155;
      font-size: 13px;
      font-weight: 500;
      height: auto;
    }
  }

  .rich-modal-shell :deep(.ant-form-item-explain),
  .rich-modal-shell :deep(.ant-form-item-extra),
  .rich-form-stack :deep(.ant-form-item-explain),
  .rich-form-stack :deep(.ant-form-item-extra) {
    color: #64748b;
    font-size: 11px;
    line-height: 1.5;
    margin-top: 4px;
  }

  .inline-radio-group {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    min-height: 40px;
    align-items: center;
    padding: 0 2px;
  }

  .inline-radio-group label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #334155;
    font-size: 13px;
  }

  .field-required {
    color: #dc2626;
  }

  .field-optional {
    color: #94a3b8;
    font-size: 12px;
  }

  .field-helper {
    color: #64748b;
    font-size: 11px;
    line-height: 1.5;
  }

  .field-label-inline {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .upload-dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    border: 2px dashed #dbe5f0;
    border-radius: 10px;
    padding: 20px 16px;
    background: #fff;
    color: #475569;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s ease, background-color 0.2s ease;
  }

  .upload-dropzone:hover {
    border-color: #bfdbfe;
    background: #f8fbff;
  }

  .upload-dropzone--compact {
    padding-block: 16px;
  }

  .upload-dropzone__icon {
    font-size: 26px;
    color: var(--applications-modal-accent, #1d4ed8);
  }

  .upload-dropzone__title {
    color: var(--applications-modal-accent, #1d4ed8);
    font-size: 12px;
    font-weight: 600;
  }

  .upload-dropzone__helper {
    color: #64748b;
    font-size: 11px;
  }

  .upload-dropzone__file {
    color: #0f172a;
    font-size: 12px;
    font-weight: 600;
  }

  .job-position,
  .interview-cell span,
  .mentor-cell span,
  .feedback-cell span,
  .modal-sub {
    color: #64748b;
    font-size: 12px;
  }

  .job-company,
  .modal-heading {
    font-weight: 600;
  }

  .interview-detail-card,
  .modal-job-card {
    border-radius: 12px;
    padding: 16px;
  }

  .interview-detail-card {
    border: 1px solid var(--applications-modal-card-border, #dbeafe);
    background: var(--applications-modal-card-bg, #eff6ff);
  }

  .modal-job-card {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid #dbe5f0;
  }

  .modal-job-title {
    font-size: 15px;
    font-weight: 600;
  }

  .modal-job-sub {
    margin-top: 4px;
    color: #475569;
    font-size: 13px;
  }

  .progress-card {
    border-color: var(--applications-modal-card-border, #ddd6fe);
    background: var(--applications-modal-card-bg, #f3e8ff);
  }

  .applied-card {
    border-color: var(--applications-modal-card-border, #bbf7d0);
    background: var(--applications-modal-card-bg, #dcfce7);
  }

  .modal-job-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #fff;
    color: var(--applications-modal-accent, #1d4ed8);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  :global(.row-coaching td) {
    background: #f3e8ff !important;
  }

  :global(.row-coaching .job-company) {
    color: #6d28d9;
  }

  :global(.row-pending td) {
    background: #fef3c7 !important;
  }

  :global(.row-pending .job-company) {
    color: #92400e;
  }

  :global(.row-applied td) {
    background: #dcfce7 !important;
  }

  :global(.row-applied .job-company) {
    color: #166534;
  }

  :global(.row-completed td) {
    opacity: 0.7;
  }

  :global(.applications-modal) {
    --applications-modal-header-from: #7399c6;
    --applications-modal-header-to: #9bb8d9;
    --applications-modal-footer-bg: #f8fafc;
    --applications-modal-card-bg: #e8f0f8;
    --applications-modal-card-border: #e2e8f0;
    --applications-modal-accent: #5a7ba3;
  }

  :global(.applications-modal.ant-modal-wrap) {
    overflow: auto !important;
  }

  :global(.applications-modal .ant-modal) {
    top: auto;
    padding-bottom: 0;
    margin: 0 auto;
    max-width: calc(100vw - 32px);
  }

  :global(.applications-modal .native-form-input),
  :global(.applications-modal .native-form-select) {
    width: 100%;
    min-height: 40px;
    border: 1px solid #d0d7e2;
    border-radius: 10px;
    padding: 9px 12px;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
  }

  :global(.applications-modal .native-form-input:focus),
  :global(.applications-modal .native-form-select:focus) {
    border-color: var(--applications-modal-accent, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
    outline: none;
  }

  :global(.applications-modal .native-form-input--hidden) {
    display: none;
  }

  :global(.applications-modal .native-form-textarea) {
    min-height: 88px;
    resize: vertical;
  }

  :global(.applications-modal .rich-modal-shell) {
    display: grid;
    gap: 16px;
  }

  :global(.applications-modal .rich-modal-shell--compact) {
    gap: 12px;
  }

  :global(.applications-modal .rich-form-card) {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #f8fafc;
    padding: 16px;
  }

  :global(.applications-modal .rich-form-card--subtle) {
    background: #fff;
    border-color: #e2e8f0;
  }

  :global(.applications-modal .rich-form-header) {
    margin-bottom: 12px;
  }

  :global(.applications-modal .rich-form-header--subtle) {
    margin-bottom: 14px;
  }

  :global(.applications-modal .rich-form-title) {
    margin: 0;
    color: var(--applications-modal-accent, #1d4ed8);
    font-size: 13px;
    font-weight: 700;
  }

  :global(.applications-modal .rich-form-help) {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.6;
  }

  :global(.applications-modal .rich-form-stack) {
    display: grid;
    gap: 14px;
  }

  :global(.applications-modal .rich-form-field) {
    display: grid;
    gap: 7px;
    color: #334155;
    font-size: 13px;
    align-content: start;
  }

  :global(.applications-modal .rich-form-field--full) {
    grid-column: 1 / -1;
  }

  :global(.applications-modal .field-required) {
    color: #dc2626;
  }

  :global(.applications-modal .field-optional) {
    color: #94a3b8;
    font-size: 12px;
  }

  :global(.applications-modal .field-helper) {
    color: #64748b;
    font-size: 11px;
    line-height: 1.5;
  }

  :global(.applications-modal .field-label-inline) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  :global(.applications-modal .inline-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    min-height: 40px;
    align-items: center;
    padding: 0 2px;
  }

  :global(.applications-modal .inline-radio-group label) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #334155;
    font-size: 13px;
  }

  :global(.applications-modal .upload-dropzone) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    border: 2px dashed #d7e2ee;
    border-radius: 10px;
    padding: 20px 16px;
    background: #fff;
    text-align: center;
    cursor: pointer;
  }

  :global(.applications-modal .upload-dropzone:hover) {
    border-color: #7399c6;
    background: #f8fbff;
  }

  :global(.applications-modal .upload-dropzone--compact) {
    padding-block: 16px;
  }

  :global(.applications-modal .upload-dropzone__icon) {
    font-size: 26px;
    color: var(--applications-modal-accent, #1d4ed8);
  }

  :global(.applications-modal .upload-dropzone__title) {
    color: var(--applications-modal-accent, #1d4ed8);
    font-size: 12px;
    font-weight: 600;
  }

  :global(.applications-modal .upload-dropzone__helper) {
    color: #64748b;
    font-size: 11px;
  }

  :global(.applications-modal .upload-dropzone__file) {
    color: #0f172a;
    font-size: 12px;
    font-weight: 600;
  }

  :global(.applications-modal .interview-detail-card) {
    border: 1px solid var(--applications-modal-card-border, #e2e8f0);
    border-radius: 12px;
    background: var(--applications-modal-card-bg, #e8f0f8);
    padding: 16px;
  }

  :global(.applications-modal .interview-detail-card .modal-heading) {
    color: var(--applications-modal-accent, #1d4ed8);
  }

  :global(.applications-modal .modal-job-card) {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    background: #fff;
  }

  :global(.applications-modal .modal-job-title) {
    font-size: 15px;
    font-weight: 600;
  }

  :global(.applications-modal .modal-job-sub) {
    margin-top: 4px;
    color: #475569;
    font-size: 13px;
  }

  :global(.applications-modal .modal-job-mark) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #fff;
    color: var(--applications-modal-accent, #1d4ed8);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  :global(.applications-modal .ant-modal-content) {
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 20px 56px rgba(115, 153, 198, 0.22);
    overflow: hidden;
  }

  :global(.applications-modal .ant-modal-header) {
    padding: 22px 26px;
    border-bottom: 0;
    background: linear-gradient(135deg, var(--applications-modal-header-from), var(--applications-modal-header-to));
  }

  :global(.applications-modal .ant-modal-title) {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.2;
  }

  :global(.applications-modal .modal-title-inline) {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  :global(.applications-modal .modal-title-icon) {
    flex: none;
    font-size: 18px;
  }

  :global(.applications-modal .modal-title-text) {
    line-height: 1.2;
  }


  :global(.applications-modal .ant-modal-body) {
    max-height: 70vh;
    overflow-y: auto;
    padding: 26px;
    background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
  }

  :global(.applications-modal .ant-modal-footer) {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 18px 26px 20px;
    border-top: 1px solid rgba(148, 163, 184, 0.18);
    background: transparent;
  }

  :global(.applications-modal .interview-modal-titlebar) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  :global(.applications-modal .interview-modal-closebtn) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.22);
    color: #fff;
    cursor: pointer;
    font-size: 14px;
    flex-shrink: 0;
  }

  :global(.applications-modal .interview-modal-closebtn:hover) {
    background: rgba(255, 255, 255, 0.36);
  }

  :global(.applications-modal .ant-modal-footer .ant-btn) {
    min-width: 88px;
    height: 36px;
    border-radius: 10px;
    font-weight: 600;
    box-shadow: none;
  }

  :global(.applications-modal .ant-modal-footer .ant-btn-default) {
    border-color: #dbe5f0;
    background: #fff;
    color: #475569;
  }

  :global(.applications-modal .ant-modal-footer .ant-btn-primary) {
    border: 0;
    background: linear-gradient(135deg, var(--applications-modal-header-from), var(--applications-modal-header-to));
  }

  :global(.applications-modal .ant-modal-footer .ant-btn-primary:not(:disabled):hover) {
    opacity: 0.95;
  }

  :global(.applications-modal--progress) {
    --applications-modal-header-from: #7399c6;
    --applications-modal-header-to: #9bb8d9;
    --applications-modal-footer-bg: #f8fafc;
    --applications-modal-card-bg: #e8f0f8;
    --applications-modal-card-border: #e2e8f0;
    --applications-modal-accent: #5a7ba3;
  }

  :global(.applications-modal--applied) {
    --applications-modal-header-from: #7399c6;
    --applications-modal-header-to: #9bb8d9;
    --applications-modal-footer-bg: #f0fdf4;
    --applications-modal-card-bg: #e8f0f8;
    --applications-modal-card-border: #e2e8f0;
    --applications-modal-accent: #5a7ba3;
  }

  :global(.applications-modal--interview) {
    --applications-modal-footer-bg: #eff6ff;
  }

  :global(.applications-modal--danger) {
    --applications-modal-header-from: #ef4444;
    --applications-modal-header-to: #f87171;
    --applications-modal-footer-bg: #fff5f5;
    --applications-modal-card-bg: #fef2f2;
    --applications-modal-card-border: #fecaca;
    --applications-modal-accent: #dc2626;
  }

  :global(.applications-modal--warning) {
    --applications-modal-header-from: #f59e0b;
    --applications-modal-header-to: #fbbf24;
    --applications-modal-footer-bg: #fffdf0;
    --applications-modal-card-bg: #fffbeb;
    --applications-modal-card-border: #fde68a;
    --applications-modal-accent: #d97706;
  }

  :global(.applications-modal--info) {
    --applications-modal-header-from: #3b82f6;
    --applications-modal-header-to: #60a5fa;
    --applications-modal-footer-bg: #f0f7ff;
    --applications-modal-card-bg: #eff6ff;
    --applications-modal-card-border: #bfdbfe;
    --applications-modal-accent: #2563eb;
  }

  @media (max-width: 760px) {
    :global(.applications-modal.ant-modal-wrap) {
      padding: 10px !important;
    }

    :global(.applications-modal .ant-modal) {
      max-width: calc(100vw - 20px);
    }

    :global(.applications-modal .ant-modal-header),
    :global(.applications-modal .ant-modal-body),
    :global(.applications-modal .ant-modal-footer) {
      padding-left: 16px;
      padding-right: 16px;
    }

    :global(.applications-modal .ant-modal-body) {
      max-height: 72vh;
      padding-top: 16px;
      padding-bottom: 16px;
    }

    :global(.applications-modal .ant-modal-footer) {
      flex-wrap: wrap;
    }

    :global(.applications-modal .ant-modal-footer .ant-btn) {
      flex: 1 1 140px;
    }
  }
}

</style>
