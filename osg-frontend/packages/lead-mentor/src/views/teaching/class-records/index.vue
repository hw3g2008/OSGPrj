<template>
  <div id="page-myclass" class="page-class-records">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          课程记录
          <span class="page-title-en">Class Records</span>
        </h1>
        <p class="page-sub">查看和上报课程记录（包括我的申报和我管理的学员）</p>
      </div>

      <button
        type="button"
        class="btn btn-primary"
        data-surface-trigger="modal-lm-report"
        @click="openReportModal()"
      >
        <i class="mdi mdi-plus" aria-hidden="true" />
        上报课程记录
      </button>
    </div>

    <div class="scope-switch">
      <button
        id="lm-class-tab-mine"
        type="button"
        class="scope-button"
        :class="{ active: activeScope === 'mine' }"
        @click="activeScope = 'mine'"
      >
        <i class="mdi mdi-account" aria-hidden="true" />
        我的申报
        <span class="scope-count">{{ mineRows.length }}</span>
      </button>
      <button
        id="lm-class-tab-managed"
        type="button"
        class="scope-button"
        :class="{ active: activeScope === 'managed' }"
        @click="activeScope = 'managed'"
      >
        <i class="mdi mdi-account-group" aria-hidden="true" />
        我管理的学员
        <span class="scope-count scope-count--muted">{{ managedRows.length }}</span>
      </button>
    </div>

    <section
      id="lm-class-content-mine"
      class="scope-panel"
      :style="{ display: activeScope === 'mine' ? 'block' : 'none' }"
    >
      <div class="tabs">
        <button
          v-for="tab in mineTabs"
          :key="tab.value"
          type="button"
          class="tab"
          :class="{ active: activeStatuses.mine === tab.value }"
          @click="activeStatuses.mine = tab.value"
        >
          {{ tab.label }}
          <span v-if="typeof tab.count === 'number'" class="tab-badge">{{ tab.count }}</span>
        </button>
      </div>

      <section class="card">
        <div class="card-body">
          <div class="filter-row">
            <input
              class="form-input"
              type="text"
              :placeholder="scopeSections.mine.searchPlaceholder"
              readonly
            />
            <select class="form-select">
              <option
                v-for="option in scopeSections.mine.filterOptions.coachingTypes"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <select class="form-select form-select--wide">
              <option
                v-for="option in scopeSections.mine.filterOptions.courseContents"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <select class="form-select">
              <option
                v-for="option in scopeSections.mine.filterOptions.timeRanges"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <button type="button" class="btn btn-outline btn-sm btn-reset" @click="showUpcomingToast()">
              <i class="mdi mdi-filter-variant" aria-hidden="true" />
              重置
            </button>
          </div>
        </div>

        <div class="card-body card-body--table">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>记录ID</th>
                  <th>学员</th>
                  <th>辅导内容</th>
                  <th>课程内容</th>
                  <th>上课日期</th>
                  <th>时长</th>
                  <th>课时费</th>
                  <th>审核状态</th>
                  <th>学员评价</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in visibleMineRows" :key="row.recordId">
                  <td>{{ row.recordId }}</td>
                  <td>
                    <div class="stack-cell">
                      <strong>{{ row.studentName }}</strong>
                      <span class="meta-text">ID: {{ row.studentId }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="stack-cell">
                      <span class="tag" :class="row.coachingTone">{{ row.coachingLabel }}</span>
                      <span class="detail-text">{{ row.coachingDetail }}</span>
                    </div>
                  </td>
                  <td><span class="tag" :class="row.contentTone">{{ row.contentLabel }}</span></td>
                  <td>{{ row.classDate }}</td>
                  <td>{{ row.duration }}</td>
                  <td>{{ row.feeLabel }}</td>
                  <td><span class="tag" :class="row.statusTone">{{ row.statusLabel }}</span></td>
                  <td>
                    <span v-if="row.ratingLabel" class="tag tag--success">{{ row.ratingLabel }}</span>
                    <span v-else class="meta-text">-</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn btn-text btn-sm"
                      :data-surface-trigger="row.actionSurface"
                      @click="handleRowAction(row)"
                    >
                      {{ row.actionLabel }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>

    <section
      id="lm-class-content-managed"
      class="scope-panel"
      :style="{ display: activeScope === 'managed' ? 'block' : 'none' }"
    >
      <div class="tabs">
        <button
          v-for="tab in managedTabs"
          :key="tab.value"
          type="button"
          class="tab"
          :class="{ active: activeStatuses.managed === tab.value }"
          @click="activeStatuses.managed = tab.value"
        >
          {{ tab.label }}
          <span v-if="typeof tab.count === 'number'" class="tab-badge">{{ tab.count }}</span>
        </button>
      </div>

      <section class="card">
        <div class="card-body">
          <div class="filter-row">
            <input
              class="form-input"
              type="text"
              :placeholder="scopeSections.managed.searchPlaceholder"
              readonly
            />
            <select class="form-select">
              <option
                v-for="option in scopeSections.managed.filterOptions.reporters"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <select class="form-select">
              <option
                v-for="option in scopeSections.managed.filterOptions.coachingTypes"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <select class="form-select form-select--wide">
              <option
                v-for="option in scopeSections.managed.filterOptions.courseContents"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <button type="button" class="btn btn-outline btn-sm btn-reset" @click="showUpcomingToast()">
              <i class="mdi mdi-filter-variant" aria-hidden="true" />
              重置
            </button>
          </div>
        </div>

        <div class="card-body card-body--table">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>记录ID</th>
                  <th>学员</th>
                  <th>申报人</th>
                  <th>辅导内容</th>
                  <th>课程内容</th>
                  <th>上课日期</th>
                  <th>时长</th>
                  <th>审核状态</th>
                  <th>学员评价</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in visibleManagedRows" :key="row.recordId">
                  <td>{{ row.recordId }}</td>
                  <td>
                    <div class="stack-cell">
                      <strong>{{ row.studentName }}</strong>
                      <span class="meta-text">ID: {{ row.studentId }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="stack-cell">
                      <strong>{{ row.reporterName }}</strong>
                      <span class="meta-text">导师</span>
                    </div>
                  </td>
                  <td>
                    <div class="stack-cell">
                      <span class="tag" :class="row.coachingTone">{{ row.coachingLabel }}</span>
                      <span class="detail-text">{{ row.coachingDetail }}</span>
                    </div>
                  </td>
                  <td><span class="tag" :class="row.contentTone">{{ row.contentLabel }}</span></td>
                  <td>{{ row.classDate }}</td>
                  <td>{{ row.duration }}</td>
                  <td><span class="tag" :class="row.statusTone">{{ row.statusLabel }}</span></td>
                  <td>
                    <span v-if="row.ratingLabel" class="tag tag--success">{{ row.ratingLabel }}</span>
                    <span v-else class="meta-text">-</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn btn-text btn-sm"
                      :data-surface-trigger="row.actionSurface"
                      @click="handleRowAction(row)"
                    >
                      {{ row.actionLabel }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>

    <LeadMentorClassReportFlowModal
      v-model="isReportModalOpen"
      :students="reportStudentOptions"
      :students-loading="reportStudentsLoading"
      :submitting="isSubmittingReport"
      :prefill-student-id="reportPrefillStudentId"
      @submit="handleReportSubmit"
    />
    <LeadMentorClassDetailModal v-model="isClassDetailModalOpen" :preview="activeClassDetailPreview" />
    <LeadMentorClassDetailResumeModal
      v-model="isClassDetailResumeModalOpen"
      :preview="activeClassDetailResumePreview"
    />
    <LeadMentorClassDetailNetworkingModal
      v-model="isClassDetailNetworkingModalOpen"
      :preview="activeClassDetailNetworkingPreview"
    />
    <LeadMentorClassDetailRegularModal
      v-model="isClassDetailRegularModalOpen"
      :preview="activeClassDetailRegularPreview"
    />
    <LeadMentorClassRejectModal
      v-model="isClassRejectModalOpen"
      :preview="activeClassRejectPreview"
      @resubmit="handleRejectResubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import type {
  LeadMentorClassRecordCreatePayload,
  LeadMentorClassRecordCreateResponse,
  LeadMentorStudentListItem,
} from '@osg/shared/api'
import { createLeadMentorClassRecord, getLeadMentorStudentList } from '@osg/shared/api'
import LeadMentorClassDetailModal from '@/components/LeadMentorClassDetailModal.vue'
import LeadMentorClassDetailNetworkingModal from '@/components/LeadMentorClassDetailNetworkingModal.vue'
import LeadMentorClassDetailRegularModal from '@/components/LeadMentorClassDetailRegularModal.vue'
import LeadMentorClassDetailResumeModal from '@/components/LeadMentorClassDetailResumeModal.vue'
import LeadMentorClassRejectModal from '@/components/LeadMentorClassRejectModal.vue'
import LeadMentorClassReportFlowModal from './LeadMentorClassReportFlowModal.vue'

type ScopeKey = 'mine' | 'managed'
type StatusKey = 'all' | 'pending' | 'approved' | 'rejected'

interface ClassRecordRow {
  recordId: string
  studentName: string
  studentId: string
  coachingLabel: string
  coachingTone: string
  coachingDetail: string
  contentLabel: string
  contentTone: string
  classDate: string
  duration: string
  feeLabel?: string
  status: Exclude<StatusKey, 'all'>
  statusLabel: string
  statusTone: string
  ratingLabel?: string
  reporterName?: string
  actionLabel: string
  actionSurface: string
}

interface ScopeSection {
  searchPlaceholder: string
  filterOptions: {
    reporters?: string[]
    coachingTypes: string[]
    courseContents: string[]
    timeRanges?: string[]
  }
}

interface ScopeTabConfig {
  value: StatusKey
  label: string
  count?: number
}

interface ClassDetailPreview {
  title: string
  studentName: string
  studentId: string
  courseLabel: string
  classSchedule: string
  duration: string
  scoreLabel: string
  sectionTitle: string
  performanceLabel: string
  performanceText: string
  overallLabel: string
  overallValue: string
  interviewTypeLabel: string
  interviewTypeValue: string
  suggestionLabel: string
  suggestionLines: string[]
  mentorName: string
  submittedAt: string
}

interface ClassDetailResumePreview {
  title: string
  studentName: string
  studentId: string
  courseLabel: string
  classSchedule: string
  duration: string
  statusLabel: string
  sectionTitle: string
  changeLabel: string
  changeLines: string[]
  completionLabel: string
  completionValue: string
  suggestionLabel: string
  suggestionLines: string[]
  mentorName: string
  submittedAt: string
}

interface ClassDetailNetworkingPreview {
  title: string
  studentName: string
  studentId: string
  courseLabel: string
  classSchedule: string
  duration: string
  statusLabel: string
  sectionTitle: string
  progressLabel: string
  progressText: string
  contactNameLabel: string
  contactNameValue: string
  contactRoleLabel: string
  contactRoleValue: string
  followUpLabel: string
  followUpLines: string[]
  mentorName: string
  submittedAt: string
}

interface ClassDetailRegularPreview {
  title: string
  studentName: string
  studentId: string
  courseLabel: string
  classSchedule: string
  duration: string
  statusLabel: string
  sectionTitle: string
  lessonLabel: string
  lessonLines: string[]
  performanceLabel: string
  performanceText: string
  nextPlanLabel: string
  nextPlanLines: string[]
  mentorName: string
  submittedAt: string
}

interface ClassRejectPreview {
  title: string
  studentName: string
  studentId: string
  courseTypeLabel: string
  courseTypeValue: string
  classTimeLabel: string
  classTimeValue: string
  submittedDurationLabel: string
  submittedDurationValue: string
  reasonTitle: string
  reasonText: string
  reviewerName: string
  rejectedAt: string
}

interface ReportStudentOption {
  value: string
  label: string
}

const showUpcomingToast = inject<() => void>('showUpcomingToast', () => {})

const scopeSections: Record<ScopeKey, ScopeSection> = {
  mine: {
    searchPlaceholder: '搜索学员姓名/ID...',
    filterOptions: {
      coachingTypes: ['辅导类型', '岗位辅导', '模拟应聘'],
      courseContents: ['课程内容', '新简历', '简历更新', 'Case准备', '模拟面试', '人际关系期中考试', '模拟期中考试', 'Behavioral', 'Technical', '其他'],
      timeRanges: ['时间范围', '本周', '上周', '本月'],
    },
  },
  managed: {
    searchPlaceholder: '搜索学员姓名/ID...',
    filterOptions: {
      reporters: ['申报人', 'Jerry Li', 'Mike Chen', 'Sarah Wang'],
      coachingTypes: ['辅导类型', '岗位辅导', '模拟应聘'],
      courseContents: ['课程内容', '新简历', '简历更新', 'Case准备', '模拟面试', '人际关系期中考试', '模拟期中考试', '其他'],
    },
  },
}

const initialMineRows: ClassRecordRow[] = [
  {
    recordId: '#R231780',
    studentName: '张三',
    studentId: '12766',
    coachingLabel: '岗位辅导',
    coachingTone: 'tag--info',
    coachingDetail: 'Goldman Sachs · IB Analyst',
    contentLabel: 'Case准备',
    contentTone: 'tag--case',
    classDate: '01/25/2026',
    duration: '2h',
    feeLabel: '¥1000',
    status: 'pending',
    statusLabel: '待审核',
    statusTone: 'tag--warning',
    actionLabel: '查看详情',
    actionSurface: 'modal-class-detail',
  },
  {
    recordId: '#R231779',
    studentName: '李四',
    studentId: '12890',
    coachingLabel: '模拟应聘',
    coachingTone: 'tag--success',
    coachingDetail: '模拟面试 · First Round',
    contentLabel: '模拟面试',
    contentTone: 'tag--success',
    classDate: '01/24/2026',
    duration: '1.5h',
    feeLabel: '¥750',
    status: 'pending',
    statusLabel: '待审核',
    statusTone: 'tag--warning',
    actionLabel: '查看详情',
    actionSurface: 'modal-class-detail-regular',
  },
  {
    recordId: '#R231778',
    studentName: '王五',
    studentId: '12901',
    coachingLabel: '岗位辅导',
    coachingTone: 'tag--info',
    coachingDetail: 'Google · SWE',
    contentLabel: '简历更新',
    contentTone: 'tag--resume',
    classDate: '01/20/2026',
    duration: '1h',
    feeLabel: '¥500',
    status: 'approved',
    statusLabel: '已通过',
    statusTone: 'tag--success',
    ratingLabel: '⭐ 5.0',
    actionLabel: '查看详情',
    actionSurface: 'modal-class-detail-resume',
  },
  {
    recordId: '#R231777',
    studentName: '赵六',
    studentId: '12902',
    coachingLabel: '模拟应聘',
    coachingTone: 'tag--success',
    coachingDetail: '人际关系期中考试',
    contentLabel: '人际关系期中考试',
    contentTone: 'tag--purple',
    classDate: '01/18/2026',
    duration: '1h',
    feeLabel: '¥500',
    status: 'approved',
    statusLabel: '已通过',
    statusTone: 'tag--success',
    ratingLabel: '⭐ 4.5',
    actionLabel: '查看详情',
    actionSurface: 'modal-class-detail-networking',
  },
  {
    recordId: '#R231770',
    studentName: '钱七',
    studentId: '12903',
    coachingLabel: '岗位辅导',
    coachingTone: 'tag--info',
    coachingDetail: 'McKinsey · Consultant',
    contentLabel: 'Case准备',
    contentTone: 'tag--case',
    classDate: '01/10/2026',
    duration: '1h',
    feeLabel: '¥500',
    status: 'rejected',
    statusLabel: '已驳回',
    statusTone: 'tag--danger',
    actionLabel: '查看原因',
    actionSurface: 'modal-class-reject',
  },
]

const initialManagedRows: ClassRecordRow[] = [
  {
    recordId: '#R231785',
    studentName: '张三',
    studentId: '12766',
    reporterName: 'Jerry Li',
    coachingLabel: '岗位辅导',
    coachingTone: 'tag--info',
    coachingDetail: 'Goldman Sachs',
    contentLabel: '新简历',
    contentTone: 'tag--info',
    classDate: '01/26/2026',
    duration: '2h',
    status: 'pending',
    statusLabel: '待审核',
    statusTone: 'tag--warning',
    actionLabel: '查看详情',
    actionSurface: 'modal-class-detail-resume',
  },
  {
    recordId: '#R231784',
    studentName: '李四',
    studentId: '12890',
    reporterName: 'Mike Chen',
    coachingLabel: '模拟应聘',
    coachingTone: 'tag--success',
    coachingDetail: '模拟面试',
    contentLabel: '模拟面试',
    contentTone: 'tag--success',
    classDate: '01/25/2026',
    duration: '1.5h',
    status: 'pending',
    statusLabel: '待审核',
    statusTone: 'tag--warning',
    actionLabel: '查看详情',
    actionSurface: 'modal-class-detail',
  },
  {
    recordId: '#R231783',
    studentName: '王五',
    studentId: '12901',
    reporterName: 'Sarah Wang',
    coachingLabel: '岗位辅导',
    coachingTone: 'tag--info',
    coachingDetail: 'Google',
    contentLabel: 'Technical',
    contentTone: 'tag--case',
    classDate: '01/24/2026',
    duration: '1h',
    status: 'pending',
    statusLabel: '待审核',
    statusTone: 'tag--warning',
    actionLabel: '查看详情',
    actionSurface: 'modal-class-detail-regular',
  },
  {
    recordId: '#R231782',
    studentName: '赵六',
    studentId: '12902',
    reporterName: 'Jerry Li',
    coachingLabel: '模拟应聘',
    coachingTone: 'tag--success',
    coachingDetail: '模拟期中考试',
    contentLabel: '模拟期中考试',
    contentTone: 'tag--midterm',
    classDate: '01/22/2026',
    duration: '1.5h',
    status: 'approved',
    statusLabel: '已通过',
    statusTone: 'tag--success',
    ratingLabel: '⭐ 4.8',
    actionLabel: '查看详情',
    actionSurface: 'modal-class-detail',
  },
  {
    recordId: '#R231781',
    studentName: '钱七',
    studentId: '12903',
    reporterName: 'Mike Chen',
    coachingLabel: '岗位辅导',
    coachingTone: 'tag--info',
    coachingDetail: 'McKinsey',
    contentLabel: 'Case准备',
    contentTone: 'tag--case',
    classDate: '01/20/2026',
    duration: '2h',
    status: 'approved',
    statusLabel: '已通过',
    statusTone: 'tag--success',
    ratingLabel: '待评价',
    actionLabel: '查看详情',
    actionSurface: 'modal-class-detail-regular',
  },
  {
    recordId: '#R231776',
    studentName: '张三',
    studentId: '12766',
    reporterName: 'Jerry Li',
    coachingLabel: '岗位辅导',
    coachingTone: 'tag--info',
    coachingDetail: 'Goldman Sachs',
    contentLabel: '简历更新',
    contentTone: 'tag--resume',
    classDate: '01/15/2026',
    duration: '1h',
    status: 'approved',
    statusLabel: '已通过',
    statusTone: 'tag--success',
    ratingLabel: '⭐ 5.0',
    actionLabel: '查看详情',
    actionSurface: 'modal-class-detail-resume',
  },
  {
    recordId: '#R231775',
    studentName: '李四',
    studentId: '12890',
    reporterName: 'Sarah Wang',
    coachingLabel: '模拟应聘',
    coachingTone: 'tag--success',
    coachingDetail: '人际关系期中考试',
    contentLabel: '人际关系期中考试',
    contentTone: 'tag--purple',
    classDate: '01/12/2026',
    duration: '1h',
    status: 'approved',
    statusLabel: '已通过',
    statusTone: 'tag--success',
    ratingLabel: '⭐ 4.5',
    actionLabel: '查看详情',
    actionSurface: 'modal-class-detail-networking',
  },
  {
    recordId: '#R231771',
    studentName: '王五',
    studentId: '12901',
    reporterName: 'Mike Chen',
    coachingLabel: '岗位辅导',
    coachingTone: 'tag--info',
    coachingDetail: 'Google',
    contentLabel: 'Behavioral',
    contentTone: 'tag--case',
    classDate: '01/08/2026',
    duration: '1h',
    status: 'rejected',
    statusLabel: '已驳回',
    statusTone: 'tag--danger',
    actionLabel: '查看原因',
    actionSurface: 'modal-class-reject',
  },
]

const contentLabelMap: Record<string, string> = {
  resume_revision: '新简历',
  resume_update: '简历更新',
  case_prep: 'Case准备',
  mock_interview: '模拟面试',
  networking_midterm: '人际关系期中考试',
  mock_midterm: '模拟期中考试',
  behavioral: 'Behavioral',
  technical: 'Technical',
  other: '其他',
}

const contentToneMap: Record<string, string> = {
  resume_revision: 'tag--info',
  resume_update: 'tag--resume',
  case_prep: 'tag--case',
  mock_interview: 'tag--success',
  networking_midterm: 'tag--purple',
  mock_midterm: 'tag--midterm',
  behavioral: 'tag--case',
  technical: 'tag--case',
  other: 'tag--info',
}

const activeScope = ref<ScopeKey>('mine')
const isReportModalOpen = ref(false)
const isClassDetailModalOpen = ref(false)
const isClassDetailResumeModalOpen = ref(false)
const isClassDetailNetworkingModalOpen = ref(false)
const isClassDetailRegularModalOpen = ref(false)
const isClassRejectModalOpen = ref(false)
const activeClassDetailPreview = ref<ClassDetailPreview | null>(null)
const activeClassDetailResumePreview = ref<ClassDetailResumePreview | null>(null)
const activeClassDetailNetworkingPreview = ref<ClassDetailNetworkingPreview | null>(null)
const activeClassDetailRegularPreview = ref<ClassDetailRegularPreview | null>(null)
const activeClassRejectPreview = ref<ClassRejectPreview | null>(null)
const activeStatuses = reactive<Record<ScopeKey, StatusKey>>({
  mine: 'all',
  managed: 'all',
})
const mineRows = ref<ClassRecordRow[]>([...initialMineRows])
const managedRows = ref<ClassRecordRow[]>([...initialManagedRows])
const reportStudentOptions = ref<ReportStudentOption[]>([])
const reportStudentsLoading = ref(false)
const reportStudentsLoaded = ref(false)
const reportPrefillStudentId = ref<string | null>(null)
const isSubmittingReport = ref(false)

const mineTabs = computed(() => buildScopeTabs(mineRows.value))
const managedTabs = computed(() => buildScopeTabs(managedRows.value))
const visibleMineRows = computed(() => filterRows(mineRows.value, activeStatuses.mine))
const visibleManagedRows = computed(() => filterRows(managedRows.value, activeStatuses.managed))

function buildScopeTabs(rows: ClassRecordRow[]): ScopeTabConfig[] {
  return [
    { value: 'all', label: '全部', count: rows.length },
    { value: 'pending', label: '待审核', count: countRowsByStatus(rows, 'pending') },
    { value: 'approved', label: '已通过', count: countRowsByStatus(rows, 'approved') },
    { value: 'rejected', label: '已驳回', count: countRowsByStatus(rows, 'rejected') },
  ]
}

function countRowsByStatus(rows: ClassRecordRow[], status: Exclude<StatusKey, 'all'>) {
  return rows.filter((row) => row.status === status).length
}

function filterRows(rows: ClassRecordRow[], status: StatusKey) {
  if (status === 'all') {
    return rows
  }
  return rows.filter((row) => row.status === status)
}

function normalizeKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function formatRecordId(value: number | string) {
  const text = String(value)
  return text.startsWith('#') ? text : `#R${text}`
}

function formatDisplayDate(value: string) {
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    return `${month}/${day}/${year}`
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-')
    return `${month}/${day}/${year}`
  }

  return value
}

function formatDuration(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, '')}h`
}

function resolveCoachingMeta(courseType: string) {
  if (normalizeKey(courseType) === 'mock_practice') {
    return {
      coachingLabel: '模拟应聘',
      coachingTone: 'tag--success',
    }
  }

  return {
    coachingLabel: '岗位辅导',
    coachingTone: 'tag--info',
  }
}

function resolveContentMeta(classStatus: string) {
  const normalized = normalizeKey(classStatus)
  return {
    contentLabel: contentLabelMap[normalized] ?? classStatus,
    contentTone: contentToneMap[normalized] ?? 'tag--info',
  }
}

function resolveActionSurface(classStatus: string) {
  const normalized = normalizeKey(classStatus)
  if (normalized === 'resume_revision' || normalized === 'resume_update') {
    return 'modal-class-detail-resume'
  }
  if (normalized === 'networking_midterm') {
    return 'modal-class-detail-networking'
  }
  if (normalized === 'behavioral' || normalized === 'technical' || normalized === 'other') {
    return 'modal-class-detail-regular'
  }
  return 'modal-class-detail'
}

function resolveCoachingDetail(payload: LeadMentorClassRecordCreateResponse) {
  const firstTopicLine = payload.topics?.split('\n').find((line) => line.trim())
  if (firstTopicLine) {
    return firstTopicLine.trim()
  }

  const normalizedStatus = normalizeKey(payload.classStatus)
  if (normalizedStatus === 'mock_interview') {
    return '模拟面试 · 班主任申报'
  }
  if (normalizedStatus === 'networking_midterm') {
    return '人际关系期中考试'
  }
  if (normalizedStatus === 'mock_midterm') {
    return '模拟期中考试'
  }
  return '班主任真实申报'
}

function buildCreatedRow(payload: LeadMentorClassRecordCreateResponse): ClassRecordRow {
  const coachingMeta = resolveCoachingMeta(payload.courseType)
  const contentMeta = resolveContentMeta(payload.classStatus)
  const status = normalizeKey(payload.status)
  const normalizedStatus = status === 'approved' || status === 'rejected' ? status : 'pending'
  const statusMeta =
    normalizedStatus === 'approved'
      ? { statusLabel: '已通过', statusTone: 'tag--success' }
      : normalizedStatus === 'rejected'
        ? { statusLabel: '已驳回', statusTone: 'tag--danger' }
        : { statusLabel: '待审核', statusTone: 'tag--warning' }

  return {
    recordId: formatRecordId(payload.recordId),
    studentName: payload.studentName,
    studentId: String(payload.studentId),
    coachingLabel: coachingMeta.coachingLabel,
    coachingTone: coachingMeta.coachingTone,
    coachingDetail: resolveCoachingDetail(payload),
    contentLabel: contentMeta.contentLabel,
    contentTone: contentMeta.contentTone,
    classDate: formatDisplayDate(payload.classDate),
    duration: formatDuration(payload.durationHours),
    feeLabel: '待审核',
    status: normalizedStatus,
    statusLabel: statusMeta.statusLabel,
    statusTone: statusMeta.statusTone,
    actionLabel: normalizedStatus === 'rejected' ? '查看原因' : '查看详情',
    actionSurface: normalizedStatus === 'rejected' ? 'modal-class-reject' : resolveActionSurface(payload.classStatus),
  }
}

function upsertRows(rows: ClassRecordRow[], nextRow: ClassRecordRow) {
  return [nextRow, ...rows.filter((row) => row.recordId !== nextRow.recordId)]
}

async function ensureReportStudentsLoaded(force = false) {
  if (reportStudentsLoaded.value && !force) {
    return
  }

  reportStudentsLoading.value = true
  try {
    const { rows } = await getLeadMentorStudentList()
    reportStudentOptions.value = (rows ?? []).map((student: LeadMentorStudentListItem) => ({
      value: String(student.studentId),
      label: `${student.studentName ?? `学员 ${student.studentId}`} (${student.studentId})`,
    }))
    reportStudentsLoaded.value = true
  } catch {
    reportStudentOptions.value = []
    reportStudentsLoaded.value = false
  } finally {
    reportStudentsLoading.value = false
  }
}

function openReportModal(prefillStudentId: string | null = null) {
  reportPrefillStudentId.value = prefillStudentId
  isReportModalOpen.value = true
  void ensureReportStudentsLoaded()
}

async function handleReportSubmit(payload: LeadMentorClassRecordCreatePayload) {
  isSubmittingReport.value = true
  try {
    const created = await createLeadMentorClassRecord(payload)
    const createdMineRow = buildCreatedRow(created)
    const createdManagedRow: ClassRecordRow = {
      ...createdMineRow,
      reporterName: created.mentorName,
    }

    mineRows.value = upsertRows(mineRows.value, createdMineRow)
    managedRows.value = upsertRows(managedRows.value, createdManagedRow)
    activeScope.value = 'mine'
    activeStatuses.mine = 'all'
    activeStatuses.managed = 'all'
    reportPrefillStudentId.value = null
    isReportModalOpen.value = false
    message.success(`已提交课程记录 ${createdMineRow.recordId}，等待审核`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '课程记录提交失败')
  } finally {
    isSubmittingReport.value = false
  }
}

function handleRowAction(row: ClassRecordRow) {
  if (row.actionSurface === 'modal-class-detail') {
    activeClassDetailPreview.value = createMockInterviewDetailPreview(row)
    isClassDetailModalOpen.value = true
    return
  }

  if (row.actionSurface === 'modal-class-detail-resume') {
    activeClassDetailResumePreview.value = createResumeDetailPreview(row)
    isClassDetailResumeModalOpen.value = true
    return
  }

  if (row.actionSurface === 'modal-class-detail-networking') {
    activeClassDetailNetworkingPreview.value = createNetworkingDetailPreview(row)
    isClassDetailNetworkingModalOpen.value = true
    return
  }

  if (row.actionSurface === 'modal-class-detail-regular') {
    activeClassDetailRegularPreview.value = createRegularDetailPreview(row)
    isClassDetailRegularModalOpen.value = true
    return
  }

  if (row.actionSurface === 'modal-class-reject') {
    activeClassRejectPreview.value = createRejectPreview(row)
    isClassRejectModalOpen.value = true
    return
  }

  showUpcomingToast()
}

function handleRejectResubmit() {
  const prefillStudentId = activeClassRejectPreview.value?.studentId ?? null
  isClassRejectModalOpen.value = false
  openReportModal(prefillStudentId)
}

function createMockInterviewDetailPreview(row: ClassRecordRow): ClassDetailPreview {
  return {
    title: '模拟面试反馈详情',
    studentName: row.studentName,
    studentId: row.studentId,
    courseLabel: 'Mock Interview',
    classSchedule: `${row.classDate} 14:00`,
    duration: row.duration,
    scoreLabel: 'Great · 85分',
    sectionTitle: '模拟面试反馈',
    performanceLabel: '面试表现',
    performanceText:
      '学生在模拟面试中表现良好，回答问题逻辑清晰，表达流畅。对DCF和LBO基础知识掌握扎实，能够清晰解释估值方法。行为面试部分STAR法则运用得当。',
    overallLabel: '综合评分',
    overallValue: '4分 - 良好，稍加练习',
    interviewTypeLabel: '面试类型',
    interviewTypeValue: '技术面试',
    suggestionLabel: '改进建议',
    suggestionLines: [
      '需要加强对TMT行业的了解',
      '建议多准备一些高级LBO场景',
      '注意控制回答时间，避免过度解释简单概念',
    ],
    mentorName: row.reporterName ?? 'Test Mentor',
    submittedAt: `${row.classDate} 16:30`,
  }
}

function createResumeDetailPreview(row: ClassRecordRow): ClassDetailResumePreview {
  return {
    title: '简历修改反馈详情',
    studentName: row.studentName,
    studentId: row.studentId,
    courseLabel: 'Resume Review',
    classSchedule: `${row.classDate} 10:00`,
    duration: row.duration,
    statusLabel: 'Great',
    sectionTitle: '简历修改反馈',
    changeLabel: '修改要点',
    changeLines: [
      '优化了工作经历描述，增加了量化数据',
      '调整了项目经验排版，突出关键成果',
      '精简了技能部分，删除不相关内容',
      '修改了个人简介，更加突出求职意向',
    ],
    completionLabel: '完成度评估',
    completionValue: '80% - 基本完成，需微调',
    suggestionLabel: '后续建议',
    suggestionLines: [
      '建议针对不同公司定制简历版本',
      '可以增加一些咨询相关的课外活动',
      '下次重点修改Cover Letter',
    ],
    mentorName: row.reporterName ?? 'Test Mentor',
    submittedAt: `${row.classDate} 11:30`,
  }
}

function createNetworkingDetailPreview(row: ClassRecordRow): ClassDetailNetworkingPreview {
  return {
    title: '人脉拓展反馈详情',
    studentName: row.studentName,
    studentId: row.studentId,
    courseLabel: 'Networking',
    classSchedule: `${row.classDate} 16:00`,
    duration: row.duration,
    statusLabel: 'Great',
    sectionTitle: '人脉拓展反馈',
    progressLabel: '拓展情况',
    progressText:
      '本次帮助学生联系了高盛IBD部门的VP，进行了30分钟的Coffee Chat。讨论了IBD的日常工作、招聘流程和面试准备建议。VP对学生印象良好，表示可以帮忙内推。',
    contactNameLabel: '联系人姓名',
    contactNameValue: '张经理',
    contactRoleLabel: '联系人公司/职位',
    contactRoleValue: '高盛 / VP',
    followUpLabel: '后续跟进计划',
    followUpLines: [
      '一周后发送感谢邮件',
      '准备内推申请材料',
      '持续关注高盛招聘动态',
    ],
    mentorName: row.reporterName ?? 'Test Mentor',
    submittedAt: `${row.classDate} 17:30`,
  }
}

function createRegularDetailPreview(row: ClassRecordRow): ClassDetailRegularPreview {
  return {
    title: '常规辅导反馈详情',
    studentName: row.studentName,
    studentId: row.studentId,
    courseLabel: 'Technical Training',
    classSchedule: `${row.classDate} 15:00`,
    duration: row.duration,
    statusLabel: 'Great · 88分',
    sectionTitle: '常规辅导反馈',
    lessonLabel: '上课内容',
    lessonLines: [
      '讲解了DCF估值模型的基础原理',
      '练习了Excel建模，完成了一个简单的DCF模型',
      '复习了财务报表分析的关键指标',
      '介绍了可比公司分析方法',
    ],
    performanceLabel: '学生表现',
    performanceText:
      '学生学习态度认真，课堂参与度高。对财务概念理解较快，Excel操作熟练。但在WACC计算部分还需要加强理解。',
    nextPlanLabel: '下次课程计划',
    nextPlanLines: [
      '深入讲解WACC的计算方法',
      '完成一个完整的LBO模型练习',
      '布置课后作业：分析一家上市公司的财务报表',
    ],
    mentorName: row.reporterName ?? 'Test Mentor',
    submittedAt: `${row.classDate} 17:30`,
  }
}

function createRejectPreview(row: ClassRecordRow): ClassRejectPreview {
  return {
    title: '课程审核驳回',
    studentName: row.studentName,
    studentId: row.studentId,
    courseTypeLabel: '课程类型',
    courseTypeValue: 'Case Study',
    classTimeLabel: '上课时间',
    classTimeValue: '12/10/2025 14:00',
    submittedDurationLabel: '提交时长',
    submittedDurationValue: '1.5h',
    reasonTitle: '驳回原因',
    reasonText: '课程时长与学员反馈不符，学员反馈实际上课时间为1小时。请核实后重新提交。',
    reviewerName: '课时审核员 Admin',
    rejectedAt: '12/11/2025 10:30',
  }
}
</script>

<style scoped lang="scss">
.page-class-records {
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
  margin: 8px 0 0;
  color: var(--text2);
  font-size: 14px;
}

.scope-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.scope-button {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.scope-button.active {
  background: var(--primary);
  color: #fff;
  border-color: transparent;
}

.scope-count {
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.3);
  font-size: 12px;
}

.scope-button:not(.active) .scope-count {
  background: var(--bg);
}

.scope-count--muted {
  color: inherit;
}

.tabs {
  display: inline-flex;
  background: var(--bg);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
  gap: 4px;
}

.tab {
  border: none;
  background: transparent;
  color: var(--text2);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tab.active {
  background: var(--primary);
  color: #fff;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f59e0b;
  color: #fff;
  font-size: 12px;
  line-height: 1.2;
}

.card {
  background: #fff;
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  margin-bottom: 20px;
  overflow: hidden;
}

.card-body {
  padding: 22px;
}

.card-body--table {
  padding: 0;
}

.filter-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.form-input,
.form-select {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  font-size: 14px;
  border-radius: 10px;
  min-height: 44px;
}

.form-input {
  width: 180px;
  padding: 12px 14px;
}

.form-select {
  padding: 10px 36px 10px 12px;
  min-width: 140px;
}

.form-select--wide {
  min-width: 180px;
}

.btn {
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}

.btn-primary {
  background: var(--primary-gradient);
  color: #fff;
  box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
}

.btn-outline {
  background: #fff;
  color: var(--text2);
  border: 1px solid var(--border);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
  min-height: 44px;
}

.btn-text {
  background: transparent;
  color: var(--primary);
  padding: 6px 12px;
}

.btn-reset {
  min-height: 44px;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table thead th {
  padding: 14px 16px;
  text-align: left;
  color: var(--text2);
  background: #f8fafc;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.table tbody td {
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f7;
  vertical-align: top;
  color: var(--text);
  white-space: nowrap;
}

.stack-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-text {
  color: var(--muted);
  font-size: 12px;
}

.detail-text {
  color: var(--text);
  font-size: 12px;
}

.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
}

.tag--info {
  background: #e0f2fe;
  color: #0369a1;
}

.tag--success {
  background: #dcfce7;
  color: #15803d;
}

.tag--warning {
  background: #fef3c7;
  color: #92400e;
}

.tag--danger {
  background: #fee2e2;
  color: #dc2626;
}

.tag--case {
  background: #dbeafe;
  color: #1d4ed8;
}

.tag--resume {
  background: #fef3c7;
  color: #92400e;
}

.tag--purple {
  background: #f3e8ff;
  color: #7c3aed;
}

.tag--midterm {
  background: #f59e0b;
  color: #fff;
}

@media (max-width: 1100px) {
  .page-header {
    flex-direction: column;
  }

  .scope-switch {
    flex-wrap: wrap;
  }

  .filter-row {
    align-items: stretch;
  }

  .form-input,
  .form-select,
  .form-select--wide {
    width: 100%;
    min-width: 0;
  }
}
</style>
