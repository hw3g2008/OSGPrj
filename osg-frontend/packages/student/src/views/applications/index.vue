<template>
  <div id="page-job-tracking" class="applications-page" :data-action-trigger-count="applicationsActionTriggers.length">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ applicationsMeta.pageSummary.titleZh }} <span>{{ applicationsMeta.pageSummary.titleEn }}</span></h1>
            <p class="page-sub">{{ applicationsMeta.pageSummary.subtitle }}</p>
          </div>
        </div>
      </template>

      <a-card :bordered="false" class="schedule-card">
        <div class="schedule-row">
          <div class="schedule-title">
            <CalendarOutlined />
            <span>面试安排</span>
          </div>
          <div class="schedule-month-nav">
            <button class="month-nav-btn" @click="shiftCalendarMonth(-1)">‹</button>
            <span class="schedule-month-label">{{ scheduleMonthLabel }}</span>
            <button class="month-nav-btn" @click="shiftCalendarMonth(1)">›</button>
          </div>
          <span data-testid="schedule-summary-chip-total" class="summary-chip">本月 {{ monthlyCount }} 场</span>
          <span data-testid="schedule-summary-chip-week" class="summary-chip summary-chip--muted">本周 {{ weeklyCount }} 场</span>
          <div class="schedule-sep"></div>
          <div class="schedule-week" data-testid="schedule-week-grid">
            <div
              v-for="day in scheduleWeekCells"
              :key="day.key"
              data-testid="schedule-week-cell"
              class="day-chip"
              :class="{ 'today-chip': day.isToday, [day.eventClass || '']: !!day.eventClass }"
              :style="day.hasEvent ? { cursor: 'pointer' } : {}"
              @click="day.eventId ? openInterviewModal(day.eventId) : undefined"
            >
              <div class="day-chip__weekday">{{ day.weekdayShort }}</div>
              <div class="day-chip__number">{{ day.dayLabel }}</div>
            </div>
          </div>
          <div class="schedule-flex-gap"></div>
          <div class="schedule-events">
            <button
              v-for="event in scheduleItems"
              :key="`pill-${event.id}`"
              class="event-pill"
              :class="event.accentClass"
              @click="openInterviewModal(event.id)"
            >
              <span class="event-pill__date">{{ event.dayLabel }}日</span>
              <span class="event-pill__label">{{ event.shortLabel }}</span>
            </button>
            <span v-if="!scheduleItems.length" style="color:#94a3b8;font-size:11px">暂无面试安排</span>
          </div>
          <button class="btn-expand" @click="calendarExpanded = !calendarExpanded">
            <CalendarOutlined />
            {{ calendarExpanded ? '收起' : '展开' }}
          </button>
        </div>

        <div v-if="calendarExpanded" class="schedule-expanded">
          <div class="cal-legend">
            <span class="cal-legend-item"><span class="cal-dot cal-dot--red"></span>面试</span>
            <span class="cal-legend-item"><span class="cal-dot cal-dot--blue"></span>辅导课</span>
            <span class="cal-legend-item"><span class="cal-today-marker"></span>今天</span>
          </div>
          <div class="cal-grid">
            <div
              v-for="weekday in ['一','二','三','四','五','六','日']"
              :key="`ch-${weekday}`"
              class="cal-header-cell"
            >{{ weekday }}</div>
            <div
              v-for="cell in calendarMonthCells"
              :key="cell.key"
              class="cal-cell"
              :class="{
                'cal-cell--today': cell.isToday,
                'cal-cell--has-event': cell.hasEvent,
                'cal-cell--empty': cell.dayNumber === null
              }"
              :style="cell.hasEvent ? { cursor: 'pointer' } : {}"
              @click="cell.eventId ? openInterviewModal(cell.eventId) : undefined"
            >
              <span v-if="cell.dayNumber !== null" class="cal-cell__number">{{ cell.dayNumber }}</span>
              <span v-if="cell.dotClass" class="cal-dot" :class="cell.dotClass"></span>
            </div>
          </div>
          <div class="expanded-list">
            <div v-if="!scheduleItems.length" class="expanded-empty">本月暂无面试安排</div>
            <div
              v-for="event in scheduleItems"
              :key="`expanded-${event.id}`"
              class="expanded-item"
              :class="event.borderClass"
            >
              <div class="expanded-date">
                <strong>{{ event.dayLabel }}</strong>
                <span>{{ event.weekdayLabel }}</span>
              </div>
              <div class="expanded-detail">
                <div>{{ event.title }}</div>
                <span>{{ event.position }} · {{ event.location }}</span>
              </div>
              <div class="expanded-right">
                <span
                  class="type-badge"
                  :class="(event.accentClass === 'danger-chip' || event.accentClass === 'warning-chip') ? 'type-badge--interview' : 'type-badge--coaching'"
                >{{ event.accentClass === 'info-chip' ? '辅导课' : '面试' }}</span>
                <span class="expanded-time">{{ event.timeLabel }}</span>
              </div>
            </div>
          </div>
        </div>
      </a-card>

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
          <a-button type="primary" @click="applyFilters">搜索</a-button>
          <a-button @click="resetFilters">重置</a-button>
        </a-space>
      </a-card>

      <div class="pill-tabs">
        <button
          v-for="tab in tabDefs"
          :key="tab.key"
          class="pill-tab"
          :class="{ 'pill-tab--active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" style="margin-right:4px" />
          {{ tab.label }}
          <span class="pill-tab__badge" :style="tab.badgeStyle">{{ tab.count }}</span>
        </button>
      </div>

      <a-card :bordered="false">
        <a-table :columns="columns" :data-source="visibleApplications" :pagination="false" row-key="id" :scroll="{ x: 1120 }" :row-class-name="rowClassName">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'job'">
              <div class="job-cell">
                <div class="job-company">{{ record.company }}</div>
                <div class="job-position">{{ record.position }} · {{ record.location }}</div>
              </div>
            </template>

            <template v-else-if="column.key === 'stage'">
              <div v-if="activeTab === 'applied'" class="status-cell">
                <span class="stage-tag" :style="stageTagStyle(record.stage)">{{ record.stageLabel }}</span>
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
              <a-tag :color="record.coachingColor">{{ record.coachingStatusLabel }}</a-tag>
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
              <button
                v-if="record.bucket === 'completed'"
                class="btn-ended"
                disabled
              >
                <CheckCircleOutlined /> 已结束
              </button>
              <select
                v-else
                :id="`action-stage-select-${record.id}`"
                class="action-stage-select"
                :style="selectStageTone(record.stage)"
                :value="record.stage"
                @change="stageDropdownChanged(record, $event)"
              >
                <option
                  v-for="option in stageDropdownOptions(record.stage)"
                  :key="`action-option-${record.id}-${option.value}`"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </template>
          </template>
        </a-table>
      </a-card>
    </OsgPageContainer>

    <a-modal
      v-model:open="interviewModalOpen"
      ok-text="确定"
      centered
      :width="400"
      :closable="false"
      :wrap-class-name="interviewModalWrapClass"
      :mask-style="{ backdropFilter: 'blur(4px)' }"
      :cancel-button-props="{ style: { display: 'none' } }"
      @ok="interviewModalOpen = false"
    >
      <template #title>
        <div class="interview-modal-titlebar">
          <span class="modal-title-inline">
            <CalendarOutlined class="modal-title-icon" aria-hidden="true" />
            <span class="modal-title-text">面试安排</span>
          </span>
          <button class="interview-modal-closebtn" @click="interviewModalOpen = false">
            <CloseOutlined />
          </button>
        </div>
      </template>
      <div class="rich-modal-shell rich-modal-shell--compact">
        <div class="interview-detail-card">
          <div class="modal-heading">{{ selectedInterview?.title }}</div>
          <div class="modal-sub">{{ selectedInterview?.modalTime }}</div>
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
      @ok="saveProgress"
    >
      <div id="modal-update-result" class="rich-modal-shell">
        <div v-if="selectedApplication" class="modal-job-card progress-card">
          <div class="modal-job-mark">{{ selectedApplicationBadge }}</div>
          <div>
            <div class="modal-job-title">{{ selectedApplication.company }}</div>
            <div class="modal-job-sub">{{ selectedApplication.position }} · {{ selectedApplication.location }}</div>
          </div>
        </div>
        <label class="rich-form-field rich-form-field--full">
          <span>当前面试阶段 <span class="field-required">*</span></span>
          <select
            id="update-stage-select"
            v-model="progressForm.stage"
            class="modal-stage-select"
            :style="selectStageTone(progressForm.stage)"
          >
            <option value="">请选择当前阶段</option>
            <option
              v-for="option in stageDropdownOptions(progressForm.stage)"
              :key="`progress-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <span class="field-helper">选择阶段后，页面会切换到对应的 HireVue 或面试辅导分段内容。</span>
        </label>

        <div v-if="progressForm.stage === 'hirevue'" id="update-hirevue-fields" class="rich-form-card rich-form-card--subtle">
          <div class="rich-form-header rich-form-header--subtle">
            <h4 class="rich-form-title">HireVue / Online Test 信息</h4>
            <p class="rich-form-help">复用岗位页的紫色模态样式、说明文案和上传入口。</p>
          </div>
          <div class="rich-form-stack">
            <div class="rich-form-field rich-form-field--full">
              <span>请选择类型 <span class="field-required">*</span></span>
              <div class="inline-radio-group">
                <label><input v-model="progressForm.hirevueType" type="radio" name="application-update-hirevue-type" value="vi" /> VI (Video Interview)</label>
                <label><input v-model="progressForm.hirevueType" type="radio" name="application-update-hirevue-type" value="ot" /> OT (Online Test)</label>
              </div>
            </div>

            <label v-if="progressForm.hirevueType === 'vi'" id="update-vi-fields" class="rich-form-field rich-form-field--full">
              <span>VI 链接 <span class="field-required">*</span></span>
              <input v-model="progressForm.viLink" class="native-form-input" placeholder="请输入 Video Interview 链接" />
            </label>

            <template v-if="progressForm.hirevueType === 'ot'">
              <label id="update-ot-fields" class="rich-form-field">
                <span>OT 链接 <span class="field-required">*</span></span>
                <input v-model="progressForm.otLink" class="native-form-input" placeholder="请输入 Online Test 链接" />
              </label>
              <label class="rich-form-field">
                <span>登录账号 <span class="field-required">*</span></span>
                <input v-model="progressForm.otAccount" class="native-form-input" placeholder="账号" />
              </label>
              <label class="rich-form-field">
                <span>登录密码 <span class="field-required">*</span></span>
                <input v-model="progressForm.otPassword" class="native-form-input" placeholder="密码" />
              </label>
            </template>

            <label class="rich-form-field">
              <span>截止时间 <span class="field-required">*</span></span>
              <input id="update-hirevue-deadline" v-model="progressForm.hirevueDeadline" type="datetime-local" class="native-form-input" />
              <span class="field-helper">请填写 VI/OT 的截止时间，系统会一并写入进度说明。</span>
            </label>
            <label class="rich-form-field">
              <span>上传邀请邮件截图 <span class="field-required">*</span></span>
              <input id="update-hirevue-upload" type="file" accept="image/*" class="native-form-input native-form-input--hidden" @change="handleUpdateHirevueUpload" />
              <label class="upload-dropzone upload-dropzone--compact" for="update-hirevue-upload">
                <CloudUploadOutlined class="upload-dropzone__icon" />
                <span class="upload-dropzone__title">点击上传截图</span>
                <span class="upload-dropzone__helper">支持 JPG、PNG 格式</span>
                <span v-if="progressForm.inviteScreenshotName" class="upload-dropzone__file">{{ progressForm.inviteScreenshotName }}</span>
              </label>
            </label>
            <div class="rich-form-field rich-form-field--full">
              <span>是否需要导师协助？ <span class="field-required">*</span></span>
              <div class="inline-radio-group">
                <label><input v-model="progressForm.mentorHelp" type="radio" name="application-update-mentor-help" value="yes" /> 是，需要导师协助</label>
                <label><input v-model="progressForm.mentorHelp" type="radio" name="application-update-mentor-help" value="no" /> 否，仅需题库权限</label>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="showUpdateInterviewFields" id="update-interview-fields" class="rich-form-card rich-form-card--subtle">
          <div class="rich-form-header rich-form-header--subtle">
            <h4 class="rich-form-title">面试 & 辅导信息</h4>
            <p class="rich-form-help">保持岗位页同款分段节奏，先确认导师数量与时间，再补充偏好。</p>
          </div>
          <div class="rich-form-stack">
            <label class="rich-form-field">
              <span>需要几个导师？ <span class="field-required">*</span></span>
              <select id="mentor-count-select" v-model="progressForm.mentorCount" class="native-form-input native-form-select">
                <option value="">请选择导师数量</option>
                <option
                  v-for="option in applicationsMeta.filterOptions.mentorCounts"
                  :key="`application-mentor-count-${option.value}`"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <span class="field-helper">根据面试难度，您可申请 1-3 位导师进行模拟面试。</span>
            </label>
            <label class="rich-form-field">
              <span>面试时间 <span class="field-required">*</span></span>
              <input id="update-interview-time" v-model="progressForm.interviewTime" type="datetime-local" class="native-form-input" />
              <span class="field-helper">请填写该轮面试的具体时间，系统会同步写入进度说明。</span>
            </label>
            <label class="rich-form-field">
              <span>意向导师 <span class="field-optional">(选填)</span></span>
              <input id="update-prefer-mentor" v-model="progressForm.preferMentor" class="native-form-input" placeholder="如有特别想要的导师，请填写导师姓名" />
            </label>
            <label class="rich-form-field">
              <span>排除导师 <span class="field-optional">(选填)</span></span>
              <input id="update-exclude-mentor" v-model="progressForm.excludeMentor" class="native-form-input" placeholder="如有不想选择的导师，请填写导师姓名" />
            </label>
          </div>
        </div>

        <label class="rich-form-field rich-form-field--full">
          <span>备注 <span class="field-optional">(选填)</span></span>
          <textarea v-model="progressForm.note" class="native-form-input native-form-textarea" rows="2" placeholder="其他需要说明的内容..." />
        </label>
      </div>
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
      @ok="confirmApplied"
    >
      <div id="modal-mark-applied" class="rich-modal-shell">
        <div v-if="selectedApplication" class="modal-job-card applied-card">
          <div class="modal-job-mark">{{ selectedApplicationBadge }}</div>
          <div>
            <div class="modal-job-title">{{ selectedApplication.company }}</div>
            <div class="modal-job-sub">{{ selectedApplication.position }} · {{ selectedApplication.location }}</div>
          </div>
        </div>
        <label class="rich-form-field rich-form-field--full">
          <span class="field-label-inline"><CalendarOutlined />投递时间 <span class="field-required">*</span></span>
          <input id="applied-date" v-model="appliedForm.date" type="date" class="native-form-input" />
        </label>
        <label class="rich-form-field rich-form-field--full">
          <span class="field-label-inline"><SendOutlined />投递方式</span>
          <select id="applied-method" v-model="appliedForm.method" class="native-form-select">
            <option
              v-for="option in applicationsMeta.filterOptions.applyMethods"
              :key="`apply-method-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="rich-form-field rich-form-field--full">
          <span class="field-label-inline"><FileTextOutlined />备注（选填）</span>
          <textarea v-model="appliedForm.note" class="native-form-input native-form-textarea" rows="2" placeholder="如：投递了哪个部门、使用了谁的内推等" />
        </label>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CloudUploadOutlined,
  EditOutlined,
  FileTextOutlined,
  OrderedListOutlined,
  SendOutlined,
} from '@ant-design/icons-vue'
import { OsgPageContainer } from '@osg/shared/components'
import {
  getStudentApplicationsMeta,
  listStudentApplications,
  requestStudentPositionCoaching,
  type StudentApplicationsMeta,
  type StudentApplicationScheduleItem,
  updateStudentPositionApply,
  updateStudentPositionProgress,
  type StudentApplicationRecord
} from '@osg/shared/api'

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
const calendarExpanded = ref(false)
const calendarMonthOffset = ref(0)
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
  case: { background: '#FEF3C7', borderColor: '#F59E0B', color: '#92400E' },
  superday: { background: '#FEE2E2', borderColor: '#EF4444', color: '#991B1B' },
  offer: { background: '#DCFCE7', borderColor: '#22C55E', color: '#166534' },
  rejected: { background: '#F3F4F6', borderColor: '#9CA3AF', color: '#6B7280' }
}

const appliedForm = ref({
  date: '',
  method: '',
  note: ''
})

const tabDefs = computed(() => [
  { key: 'all' as TabKey, label: '全部', icon: OrderedListOutlined, count: applicationsMeta.value.tabCounts.all, badgeStyle: { background: 'rgba(255,255,255,0.3)', color: '#fff' } },
  { key: 'applied' as TabKey, label: '已投递', icon: SendOutlined, count: applicationsMeta.value.tabCounts.applied, badgeStyle: { background: '#22C55E', color: '#fff' } },
  { key: 'ongoing' as TabKey, label: '面试中', icon: ClockCircleOutlined, count: applicationsMeta.value.tabCounts.ongoing, badgeStyle: { background: '#F59E0B', color: '#fff' } },
  { key: 'completed' as TabKey, label: '已结束', icon: CheckCircleOutlined, count: applicationsMeta.value.tabCounts.completed, badgeStyle: { background: '#6B7280', color: '#fff' } },
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
    { title: '操作', key: 'actions', width: 140 }
  ]
})

const selectedApplication = computed(() =>
  applications.value.find((record) => record.id === selectedApplicationId.value) ?? null
)
const selectedApplicationBadge = computed(() => {
  const fallback = selectedApplication.value?.company?.trim()
  return fallback ? fallback.slice(0, 2).toUpperCase() : 'JP'
})

const scheduleItems = computed<StudentApplicationScheduleItem[]>(() => applicationsMeta.value.schedule)
const scheduleMonthLabel = computed(() => {
  const base = new Date()
  const display = new Date(base.getFullYear(), base.getMonth() + calendarMonthOffset.value, 1)
  return `${display.getFullYear()}年${display.getMonth() + 1}月`
})

// Always anchor the week strip to today (or the equivalent day in the displayed month)
const scheduleWeekAnchor = computed(() => {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth() + calendarMonthOffset.value, today.getDate())
})

const scheduleWeekCells = computed(() => {
  const weekdayShorts = ['一', '二', '三', '四', '五', '六', '日']
  const today = new Date()
  const anchor = scheduleWeekAnchor.value
  const jsDay = anchor.getDay()
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay
  const monday = new Date(anchor)
  monday.setDate(anchor.getDate() + mondayOffset)

  return weekdayShorts.map((short, index) => {
    const cellDate = new Date(monday)
    cellDate.setDate(monday.getDate() + index)
    const dayNumber = cellDate.getDate()
    const dayStr = String(dayNumber)
    const isToday = cellDate.getFullYear() === today.getFullYear()
      && cellDate.getMonth() === today.getMonth()
      && dayNumber === today.getDate()
    const matchingEvent = scheduleItems.value.find((item) => parseInt(item.dayLabel, 10) === dayNumber)
    return {
      key: `${short}-${cellDate.getTime()}`,
      weekday: `周${short}`,
      weekdayShort: short,
      dayLabel: dayStr,
      isToday,
      hasEvent: !!matchingEvent,
      eventClass: matchingEvent?.accentClass || '',
      eventId: matchingEvent?.id ?? null
    }
  })
})

const monthlyCount = computed(() => {
  if (calendarMonthOffset.value !== 0) return 0
  return scheduleItems.value.length
})

const weeklyCount = computed(() => {
  const weekDayNumbers = new Set(scheduleWeekCells.value.map((cell) => parseInt(cell.dayLabel, 10)))
  return scheduleItems.value.filter((item) => weekDayNumbers.has(parseInt(item.dayLabel, 10))).length
})

const calendarMonthCells = computed(() => {
  const base = new Date()
  const displayDate = new Date(base.getFullYear(), base.getMonth() + calendarMonthOffset.value, 1)
  const displayYear = displayDate.getFullYear()
  const displayMonth = displayDate.getMonth()
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate()
  const firstDow = displayDate.getDay()
  const startPad = firstDow === 0 ? 6 : firstDow - 1
  const today = new Date()

  type CalCell = {
    key: string
    dayNumber: number | null
    isToday: boolean
    dotClass: string
    eventId: number | null
    hasEvent: boolean
  }

  const cells: CalCell[] = []
  for (let i = 0; i < startPad; i++) {
    cells.push({ key: `ep-${i}`, dayNumber: null, isToday: false, dotClass: '', eventId: null, hasEvent: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ev = scheduleItems.value.find((item) => parseInt(item.dayLabel, 10) === d)
    const isToday = displayYear === today.getFullYear() && displayMonth === today.getMonth() && d === today.getDate()
    const dotClass = ev
      ? (ev.accentClass === 'danger-chip' || ev.accentClass === 'warning-chip' ? 'cal-dot--red' : 'cal-dot--blue')
      : ''
    cells.push({ key: `d-${d}`, dayNumber: d, isToday, dotClass, eventId: ev?.id ?? null, hasEvent: !!ev })
  }
  const remainder = cells.length % 7
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      cells.push({ key: `et-${i}`, dayNumber: null, isToday: false, dotClass: '', eventId: null, hasEvent: false })
    }
  }
  return cells
})

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

  const order = ['applied', 'hirevue', 'screening', 'first', 'second', 'third', 'case', 'superday', 'offer', 'rejected']
  return Array.from(merged.values()).sort((left, right) => order.indexOf(left.value) - order.indexOf(right.value))
})
const stageLabelByValue = computed(() => new Map(progressStageOptions.value.map((option) => [option.value, option.label])))
const showUpdateInterviewFields = computed(() => interviewStages.includes(progressForm.value.stage))

const selectedInterview = computed(() =>
  scheduleItems.value.find((record) => record.id === selectedInterviewId.value) ?? null
)
const interviewModalWrapClass = computed(() => {
  const tone = selectedInterview.value?.accentClass === 'danger-chip'
    ? 'danger'
    : selectedInterview.value?.accentClass === 'warning-chip'
      ? 'warning'
      : 'info'

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

function stageDropdownChanged(record: StudentApplicationRecord, event: Event) {
  const target = event.target as HTMLSelectElement
  const nextStage = target.value
  target.value = record.stage

  if (!nextStage || nextStage === record.stage) {
    return
  }

  openProgressModal({
    ...record,
    stage: nextStage
  })
}

function openAppliedModal(record: StudentApplicationRecord) {
  selectedApplicationId.value = record.id
  appliedForm.value = {
    date: record.appliedDate || new Date().toISOString().slice(0, 10),
    method: record.applyMethod || applicationsMeta.value.filterOptions.applyMethods[0]?.value || '',
    note: record.progressNote || ''
  }
  appliedModalOpen.value = true
}

function shiftCalendarMonth(offset: number) {
  calendarMonthOffset.value += offset
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
    mentorHelp: '',
    interviewTime: '',
    mentorCount: '',
    preferMentor: '',
    excludeMentor: '',
    note: ''
  }
}

function handleUpdateHirevueUpload(event: Event) {
  const target = event.target as HTMLInputElement
  progressForm.value.inviteScreenshotName = target.files?.[0]?.name || ''
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
      lines.push(`截图：${form.inviteScreenshotName}`)
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
  if (!form.inviteScreenshotName) {
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
  .schedule-card,
  .filter-card {
    margin-bottom: 16px;
  }

  .schedule-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .schedule-month-nav {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .month-nav-btn {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 16px;
    font-weight: 700;
    color: #64748b;
    padding: 0 4px;
    line-height: 1;
  }

  .month-nav-btn:hover {
    color: #1e293b;
  }

  .schedule-month-label {
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    white-space: nowrap;
  }

  .summary-chip {
    font-size: 11px;
    font-weight: 500;
    color: #334155;
    white-space: nowrap;
  }

  .summary-chip--muted {
    color: #94a3b8;
  }

  .schedule-sep {
    width: 1px;
    height: 20px;
    background: #e2e8f0;
    flex: none;
  }

  .schedule-flex-gap {
    flex: 1;
  }

  .schedule-week {
    display: flex;
    gap: 4px;
  }

  .day-chip {
    min-width: 36px;
    padding: 4px 8px;
    text-align: center;
    border: 0;
    border-radius: 6px;
    background: #f8fafc;
    color: #334155;
  }

  .day-chip__weekday {
    font-size: 9px;
    color: #94a3b8;
    font-weight: 500;
  }

  .day-chip__number {
    font-size: 14px;
    font-weight: 600;
  }

  .danger-chip .day-chip__weekday {
    color: #991b1b;
  }

  .danger-chip .day-chip__number {
    color: #ef4444;
  }

  .warning-chip .day-chip__weekday {
    color: #92400e;
    font-weight: 500;
  }

  .warning-chip .day-chip__number {
    color: #f59e0b;
    font-weight: 700;
  }

  .today-chip {
    background: var(--primary, #7399c6);
    color: #fff;
  }

  .today-chip .day-chip__weekday {
    color: rgba(255, 255, 255, 0.8);
  }

  .today-chip .day-chip__number {
    color: #fff;
    font-weight: 700;
  }

  .pill-tabs {
    display: flex;
    gap: 4px;
    background: #f1f5f9;
    padding: 3px;
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .pill-tab {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 6px 14px;
    font-size: 12px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    font-weight: 500;
    white-space: nowrap;
  }

  .pill-tab--active {
    background: var(--primary, #7399c6);
    color: #fff;
  }

  .pill-tab__badge {
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 10px;
    margin-left: 4px;
  }

  .stage-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
  }

  .action-stage-select {
    min-width: 110px;
    height: 28px;
    padding: 4px 24px 4px 8px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 6px;
    border-width: 1px;
    border-style: solid;
    outline: none;
    cursor: pointer;
    appearance: auto;
  }

  .btn-ended {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    border-radius: 6px;
    background: #f3f4f6;
    border: none;
    color: #6b7280;
    font-size: 11px;
    cursor: not-allowed;
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
    display: grid;
    gap: 7px;
    color: #334155;
    font-size: 13px;
    align-content: start;
  }

  .rich-form-field--full {
    grid-column: 1 / -1;
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

  .schedule-summary {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .schedule-title {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--primary, #7399c6);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }

  .event-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border: 0;
    border-radius: 6px;
    background: #f8fafc;
    color: #334155;
    cursor: pointer;
    font-size: 11px;
  }

  .event-pill__date {
    font-weight: 600;
  }

  .danger-chip {
    background: #fee2e2;
    color: #991b1b;
  }

  .warning-chip {
    background: #fef3c7;
    color: #92400e;
  }

  .info-chip {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .schedule-events {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  /* Calendar grid */
  .cal-legend {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
    padding-top: 4px;
  }

  .cal-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #475569;
  }

  .cal-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: none;
  }

  .cal-dot--red {
    background: #ef4444;
  }

  .cal-dot--blue {
    background: #3b82f6;
  }

  .cal-today-marker {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    background: var(--primary, #7399c6);
    flex: none;
  }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
    margin-bottom: 16px;
  }

  .cal-header-cell {
    text-align: center;
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    padding: 4px 0;
  }

  .cal-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: 40px;
    border-radius: 6px;
    background: #f8fafc;
    padding: 4px 2px;
  }

  .cal-cell--empty {
    background: transparent;
  }

  .cal-cell--today {
    background: var(--primary, #7399c6);
  }

  .cal-cell--today .cal-cell__number {
    color: #fff;
    font-weight: 700;
  }

  .cal-cell--today .cal-dot {
    background: rgba(255, 255, 255, 0.85);
  }

  .cal-cell--has-event:not(.cal-cell--today) {
    background: #f0f4ff;
  }

  .cal-cell__number {
    font-size: 12px;
    font-weight: 500;
    color: #334155;
    line-height: 1;
  }

  .btn-expand {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex: none;
    border: none;
    background: none;
    color: #64748b;
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;
  }

  .btn-expand:hover {
    color: #334155;
  }

  .schedule-expanded {
    margin-top: 16px;
    border-top: 1px solid #e2e8f0;
    padding-top: 16px;
  }

  .expanded-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .expanded-item {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px;
    background: #fff;
  }

  .expanded-right {
    margin-left: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex: none;
  }

  .type-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
  }

  .type-badge--interview {
    background: #fee2e2;
    color: #991b1b;
  }

  .type-badge--coaching {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .expanded-time {
    font-size: 11px;
    color: #64748b;
    white-space: nowrap;
  }

  .danger-border {
    border-left: 4px solid #ef4444;
  }

  .warning-border {
    border-left: 4px solid #f59e0b;
  }

  .info-border {
    border-left: 4px solid #3b82f6;
  }

  .expanded-date {
    min-width: 50px;
    text-align: center;
  }

  .expanded-date strong {
    display: block;
    font-size: 20px;
  }

  .expanded-date span,
  .expanded-detail span,
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

@media (max-width: 900px) {
  .applications-page {
    .schedule-row {
      gap: 8px;
    }

    .schedule-week {
      flex-wrap: wrap;
    }

    .schedule-events {
      width: 100%;
      flex-wrap: wrap;
    }

    .pill-tabs {
      flex-wrap: wrap;
    }

    .progress-form-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
