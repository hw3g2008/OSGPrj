<template>
  <div id="page-myclass">
    <PageHeader
      :title-zh="$t('course_records')"
      title-en="Class Records"
      :description="$t('view_and_submit_session_records')"
    >
      <template #actions>
        <a-button type="primary" @click="showReportModal = true">
          <i class="mdi mdi-plus" style="margin-right:4px" />上报课程记录
        </a-button>
      </template>
    </PageHeader>

    <!-- Tabs -->
    <a-radio-group v-model:value="activeTab" button-style="solid" class="tabs-radio" style="margin-bottom:20px">
      <a-radio-button v-for="tab in tabs" :key="tab.key" :value="tab.key">
        {{ tab.label }}
        <a-badge v-if="tab.badge" :count="tab.badge" :number-style="{ backgroundColor: '#F59E0B' }" :offset="[8, -4]" />
      </a-radio-button>
    </a-radio-group>

    <!-- 筛选 + 表格 -->
    <a-card :bordered="false">
      <a-form layout="inline" class="filter-bar" style="margin-bottom: 16px">
        <a-form-item>
          <a-input
            v-model:value="filters.keyword"
            :placeholder="`${$t('search_student_name')}/ID...`"
            allow-clear
            style="width:200px"
          />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.coachingType" :placeholder="$t('coaching_type')" style="width:140px" allow-clear>
            <a-select-option value="">{{ $t('coaching_type') }}</a-select-option>
            <a-select-option value="job_coaching">{{ $t('position_coaching') }}</a-select-option>
            <a-select-option value="mock_interview">{{ $t('mock_application') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.contentType" :placeholder="$t('course_content')" style="width:160px" allow-clear>
            <a-select-option value="">{{ $t('course_content') }}</a-select-option>
            <a-select-option v-for="ct in contentTypes" :key="ct" :value="ct">{{ ct }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.timeRange" :placeholder="$t('time_range')" style="width:140px" allow-clear>
            <a-select-option value="">{{ $t('time_range') }}</a-select-option>
            <a-select-option value="this_week">{{ $t('this_week') }}</a-select-option>
            <a-select-option value="last_week">{{ $t('last_week') }}</a-select-option>
            <a-select-option value="this_month">{{ $t('this_month') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button @click="resetFilters">
            <i class="mdi mdi-filter-variant" style="margin-right:4px" />重置
          </a-button>
        </a-form-item>
      </a-form>

      <a-table
        :columns="columns"
        :data-source="filteredRecords"
        :pagination="false"
        :row-key="(r: any) => r.id"
        :locale="{ emptyText: $t('no_data_available') }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'recordNo'">{{ record.recordNo }}</template>
          <template v-else-if="column.key === 'student'">
            <div>
              <strong>{{ record.studentName || $t('student') }}</strong>
              <br />
              <span class="text-muted text-sm">ID: {{ record.studentId }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'coachingType'">
            <a-tag :color="coachingTagColor(record.coachingType)">{{ coachingLabel(record.coachingType) }}</a-tag>
            <br v-if="record.contentDetail" />
            <span v-if="record.contentDetail" class="text-sm">{{ record.contentDetail }}</span>
          </template>
          <template v-else-if="column.key === 'contentType'">
            <a-tag :color="contentTagColor(record.contentType)">{{ record.contentType }}</a-tag>
          </template>
          <template v-else-if="column.key === 'classDate'">{{ formatDate(record.classDate) }}</template>
          <template v-else-if="column.key === 'durationHours'">{{ record.durationHours }}h</template>
          <template v-else-if="column.key === 'totalFee'">¥{{ record.totalFee }}</template>
          <template v-else-if="column.key === 'reviewStatus'">
            <ClassRecordStatusTag :status="record.reviewStatus" />
          </template>
          <template v-else-if="column.key === 'studentEvaluation'">
            <a-tag v-if="evaluationTag(record)" :color="evaluationTagColor(record)">{{ evaluationTag(record)?.text }}</a-tag>
            <span v-else class="text-muted">-</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button v-if="record.reviewStatus === 'rejected'" type="link" size="small" @click="showReject(record)">{{ $t('view_reason') }}</a-button>
            <a-button v-else type="link" size="small" @click="showDetail(record)">{{ $t('view_details') }}</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 上报弹窗 -->
    <ReportModal v-if="showReportModal" @close="showReportModal = false" @submitted="onReportSubmitted" />

    <a-modal
      v-model:open="detailModal.visible"
      :width="720"
      :footer="null"
      :title="null"
      :closable="false"
      :body-style="{ padding: 0 }"
      :get-container="false"
      :destroy-on-close="true"
      @cancel="closeDetailModal"
    >
      <div id="modal-class-detail">
        <div class="modal-header">
          <span class="modal-title"><i class="mdi mdi-file-document-outline" /> {{ $t('course_record_details') }}</span>
          <button class="modal-close" type="button" @click="closeDetailModal">×</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">{{ $t('record_id') }}</span>
              <div class="detail-value">{{ detailModal.record?.recordNo || '-' }}</div>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ $t('student') }}</span>
              <div class="detail-value">{{ detailModal.record?.studentName || '-' }} ({{ detailModal.record?.studentId || '-' }})</div>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ $t('coaching_content') }}</span>
              <div class="detail-value">{{ coachingLabel(detailModal.record?.coachingType || '') }}</div>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ $t('course_content') }}</span>
              <div class="detail-value">{{ detailModal.record?.contentType || '-' }}</div>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ $t('course_date') }}</span>
              <div class="detail-value">{{ formatDate(detailModal.record?.classDate || '') }}</div>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ $t('session_fee') }}</span>
              <div class="detail-value">¥{{ detailModal.record?.totalFee ?? '-' }}</div>
            </div>
          </div>
          <div class="detail-section">
            <div class="detail-label">{{ $t('course_feedback') }}</div>
            <div class="detail-panel">{{ detailModal.record?.contentDetail || $t('no_course_feedback') }}</div>
          </div>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="rejectModal.visible"
      :width="520"
      :footer="null"
      :title="null"
      :closable="false"
      :body-style="{ padding: 0 }"
      :get-container="false"
      :destroy-on-close="true"
      @cancel="closeRejectModal"
    >
      <div id="modal-class-reject">
        <div class="modal-header modal-header--reject">
          <span class="modal-title"><i class="mdi mdi-alert-circle" /> {{ $t('session_review_rejected') }}</span>
          <button class="modal-close" type="button" @click="closeRejectModal">×</button>
        </div>
        <div class="modal-body">
          <div class="reject-summary">
            <div class="reject-summary-grid">
              <div>
                <span class="reject-summary-label">{{ $t('student') }}</span>
                <div class="reject-summary-value">{{ rejectModal.record?.studentName || $t('student') }} ({{ rejectModal.record?.studentId || '-' }})</div>
              </div>
              <div>
                <span class="reject-summary-label">{{ $t('course_type') }}</span>
                <div class="reject-summary-value">{{ rejectModal.record?.contentType || rejectModal.record?.coachingType || '-' }}</div>
              </div>
              <div>
                <span class="reject-summary-label">{{ $t('session_time') }}</span>
                <div class="reject-summary-value">{{ formatDate(rejectModal.record?.classDate || '') }}</div>
              </div>
              <div>
                <span class="reject-summary-label">{{ $t('submitted_duration') }}</span>
                <div class="reject-summary-value">{{ rejectModal.record?.durationHours ? `${rejectModal.record.durationHours}h` : '-' }}</div>
              </div>
            </div>
          </div>
          <div class="reject-reason">
            <div class="reject-reason-title"><i class="mdi mdi-close-circle" /> {{ $t('rejection_reason_2') }}</div>
            <div class="detail-panel detail-panel--danger">{{ rejectModal.reason || $t('no_rejection_reason_provided') }}</div>
          </div>
          <div class="reject-meta">
            <div>{{ $t('reviewer') }}:{{ $t('session_reviewer') }} Admin</div>
            <div>驳回时间:{{ rejectModal.record?.reviewedAt ? formatDate(rejectModal.record.reviewedAt) : '12/11/2025 10:30' }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <a-button @click="closeRejectModal">{{ $t('close') }}</a-button>
          <a-button type="primary" style="margin-left:8px" @click="openConfirmModalFromReject">{{ $t('resubmit') }}</a-button>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="showConfirmModal"
      :width="750"
      :footer="null"
      :title="null"
      :closable="false"
      :body-style="{ padding: 0 }"
      :get-container="false"
      :destroy-on-close="true"
      @cancel="closeConfirmModal"
    >
      <div id="modal-class-confirm">
        <div class="modal-header modal-header--confirm">
          <span class="modal-title"><i class="mdi mdi-check-circle" /> {{ $t('confirm_session_and_submit_feedback') }}</span>
          <button class="modal-close" type="button" @click="closeConfirmModal">×</button>
        </div>
        <div class="modal-body">
          <div class="confirm-meta">
            <div>
              <span class="confirm-meta-label">{{ $t('student') }}</span>
              <div class="confirm-meta-value">{{ confirmRecord?.studentName || $t('zhang_san') }} ({{ confirmRecord?.studentId || '12766' }})</div>
            </div>
            <div>
              <span class="confirm-meta-label">{{ $t('appointment_time') }}</span>
              <div class="confirm-meta-value">{{ confirmRecord?.classDate ? formatDate(confirmRecord.classDate) : '12/18/2025 14:00' }}</div>
            </div>
            <div>
              <span class="confirm-meta-label">{{ $t('company_position') }}</span>
              <div class="confirm-meta-value">{{ confirmRecord?.contentType || 'Goldman Sachs / IB' }}</div>
            </div>
          </div>

          <div class="form-grid confirm-grid">
            <div class="form-group">
              <label class="form-label">{{ $t('course_type') }}<span class="req">*</span></label>
              <select
                id="confirm-class-type"
                v-model="confirmClassType"
                class="form-select"
                @change="switchConfirmFeedbackForm(confirmClassType)"
              >
                <option value="">{{ $t('please_select_session_type') }}</option>
                <option value="mock_interview">{{ $t('mock_interview') }}</option>
                <option value="mock_midterm">{{ $t('mock_midterm_exam') }}</option>
                <option value="networking">{{ $t('networking_midterm_exam') }}</option>
                <option value="written_test">{{ $t('written_test_coaching') }}</option>
                <option value="resume_update">{{ $t('resume_update') }}</option>
                <option value="basic">{{ $t('foundation_course_2') }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('actual_session_date') }}<span class="req">*</span></label>
              <input id="confirm-class-date" v-model="confirmDate" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('actual_session_duration_hours') }}）<span class="req">*</span></label>
              <input id="confirm-class-duration" v-model.number="confirmDuration" type="number" class="form-input" step="0.5" min="0.5" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('student_performance') }}<span class="req">*</span></label>
              <select id="confirm-student-performance" v-model="confirmPerformance" class="form-select">
                <option value="">{{ $t('please_select') }}</option>
                <option>{{ $t('excellent') }}</option>
                <option>{{ $t('good') }}</option>
                <option>{{ $t('average') }}</option>
                <option>{{ $t('needs_improvement') }}</option>
              </select>
            </div>
          </div>

          <hr class="confirm-divider" />

          <h4 class="confirm-feedback-title"><i class="mdi mdi-comment-text" /> {{ $t('course_feedback') }}</h4>

          <div v-if="!confirmClassType" id="feedback-default" class="confirm-feedback-default">
            <i class="mdi mdi-file-document-outline confirm-feedback-icon" />
            <p>{{ $t('please_select_a_session_type_first_the_c') }}</p>
          </div>

          <div v-else-if="confirmFeedbackView === 'mock'" id="feedback-mock" class="confirm-feedback-panel">
            <div class="confirm-feedback-banner confirm-feedback-banner--mock">{{ $t('onboarding_interview_coaching_feedback') }}</div>
            <div class="form-group">
              <label class="form-label">{{ $t('interview_company_position') }}<span class="req">*</span></label>
              <a-input
                id="confirm-company-position"
                v-model:value="confirmCompanyOrPosition"
                placeholder="如:Goldman Sachs / IB Analyst"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('coaching_content') }}<span class="req">*</span></label>
              <a-textarea
                id="confirm-feedback"
                v-model:value="confirmFeedback"
                :rows="3"
                :placeholder="$t('please_describe_the_main_content_of_this')"
              />
            </div>
          </div>

          <div v-else-if="confirmFeedbackView === 'regular'" id="feedback-regular" class="confirm-feedback-panel">
            <div class="confirm-feedback-banner confirm-feedback-banner--regular">{{ $t('written_test_coaching_feedback') }}</div>
            <div class="form-group">
              <label class="form-label">{{ $t('written_test_company_position') }}<span class="req">*</span></label>
              <a-input
                id="confirm-company-position"
                v-model:value="confirmCompanyOrPosition"
                placeholder="如:McKinsey / Business Analyst"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('coaching_content') }}<span class="req">*</span></label>
              <a-textarea
                id="confirm-feedback"
                v-model:value="confirmFeedback"
                :rows="3"
                :placeholder="$t('please_describe_the_main_content_of_this')"
              />
            </div>
          </div>

          <div v-else-if="confirmFeedbackView === 'networking'" id="feedback-networking" class="confirm-feedback-panel">
            <div class="confirm-feedback-banner confirm-feedback-banner--networking">{{ $t('networking_feedback_template') }}</div>
            <div class="form-group">
              <label class="form-label">{{ $t('networking_summary') }}<span class="req">*</span></label>
              <a-textarea
                id="confirm-feedback"
                v-model:value="confirmFeedback"
                :rows="3"
                :placeholder="$t('please_describe_the_networking_activity_')"
              />
            </div>
          </div>

          <div v-else id="feedback-resume" class="confirm-feedback-panel">
            <div class="confirm-feedback-banner confirm-feedback-banner--resume">{{ $t('resume_revision_feedback_template') }}</div>
            <div class="form-group">
              <label class="form-label">{{ $t('key_revisions') }}<span class="req">*</span></label>
              <a-textarea
                id="confirm-feedback"
                v-model:value="confirmFeedback"
                :rows="3"
                :placeholder="$t('please_describe_the_key_changes_made_in_')"
              />
            </div>
          </div>
        </div>
        <div class="modal-footer modal-footer--confirm">
          <a-button @click="closeConfirmModal">{{ $t('cancel') }}</a-button>
          <a-button
            type="primary"
            style="margin-left:8px"
            :loading="confirmSubmitting"
            :disabled="!confirmCanSubmit || confirmSubmitting"
            @click="submitConfirm"
          >
            {{ confirmSubmitting ? '提交中...' : $t('confirm_and_submit_feedback') }}
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { ClassRecordStatusTag } from '@osg/shared/components'
import { http } from '@osg/shared/utils/request'
import ReportModal from './components/ReportModal.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const activeTab = ref('all')
const showReportModal = ref(false)
const showConfirmModal = ref(false)
const records = ref<any[]>([])
const summaryRecords = ref<any[]>([])
const detailModal = ref<{ visible: boolean; record: any | null }>({ visible: false, record: null })
const rejectModal = ref<{ visible: boolean; reason: string; record: any | null }>({ visible: false, reason: '', record: null })
const confirmRecord = ref<any | null>(null)
const filters = ref({ keyword: '', coachingType: '', contentType: '', timeRange: '' })
const fullListParams = { pageNum: 1, pageSize: 1000 }
const contentTypes = [t('new_resume'), t('resume_update'), 'Case准备', t('mock_interview'), t('networking_midterm_exam'), t('mock_midterm_exam'), 'Behavioral', 'Technical', t('other')]
const confirmClassType = ref('')
const confirmDate = ref('')
const confirmDuration = ref(1.5)
const confirmPerformance = ref('')
const confirmCompanyOrPosition = ref('')
const confirmFeedback = ref('')
const confirmScore = ref('')
const confirmProgress = ref('')
const confirmSubmitting = ref(false)
const confirmFeedbackView = computed(() => {
  if (!confirmClassType.value) {
    return 'default'
  }
  if (confirmClassType.value === 'mock_interview') {
    return 'mock'
  }
  if (confirmClassType.value === 'networking') {
    return 'networking'
  }
  if (confirmClassType.value === 'resume_update') {
    return 'resume'
  }
  return 'regular'
})
const confirmCanSubmit = computed(() => {
  if (!confirmClassType.value || !confirmDate.value || Number(confirmDuration.value) <= 0 || !confirmPerformance.value) {
    return false
  }
  if (confirmFeedbackView.value === 'mock' || confirmFeedbackView.value === 'regular') {
    return Boolean(confirmCompanyOrPosition.value && confirmFeedback.value)
  }
  if (confirmFeedbackView.value === 'networking') {
    return Boolean(confirmFeedback.value)
  }
  return Boolean(confirmFeedback.value)
})

const tabs = computed(() => {
  const pending = summaryRecords.value.filter(r => r.reviewStatus === 'pending').length
  return [
    { key: 'all', label: t('all'), badge: 0 },
    { key: 'pending', label: t('pending_review'), badge: pending || 0 },
    { key: 'approved', label: t('approved'), badge: 0 },
    { key: 'rejected', label: t('rejected_3'), badge: 0 },
  ]
})

const filteredRecords = computed(() => {
  let list = records.value
  const keyword = filters.value.keyword.trim()
  if (keyword) {
    const loweredKeyword = keyword.toLowerCase()
    list = list.filter((record) => {
      const studentName = String(record.studentName ?? '').toLowerCase()
      const studentId = String(record.studentId ?? '').toLowerCase()
      const recordNo = String(record.recordNo ?? '').toLowerCase()
      return studentName.includes(loweredKeyword) || studentId.includes(loweredKeyword) || recordNo.includes(loweredKeyword)
    })
  }
  if (filters.value.coachingType) list = list.filter(r => r.coachingType === filters.value.coachingType)
  if (filters.value.contentType) list = list.filter(r => r.contentType === filters.value.contentType)
  if (filters.value.timeRange) list = list.filter(r => matchesTimeRange(r.classDate, filters.value.timeRange))
  return list
})

const columns = [
  { title: '记录ID', key: 'recordNo', dataIndex: 'recordNo' },
  { title: t('student'), key: 'student' },
  { title: t('coaching_content'), key: 'coachingType' },
  { title: t('course_content'), key: 'contentType' },
  { title: t('course_date'), key: 'classDate', dataIndex: 'classDate' },
  { title: t('duration'), key: 'durationHours', dataIndex: 'durationHours' },
  { title: t('session_fee'), key: 'totalFee', dataIndex: 'totalFee' },
  { title: t('review_status'), key: 'reviewStatus' },
  { title: t('student_feedback'), key: 'studentEvaluation' },
  { title: t('operation'), key: 'actions' },
]

function coachingTagColor(t: string) {
  return { job_coaching: 'blue', mock_interview: 'green', networking: 'purple', mock_midterm: 'orange' }[t] || 'blue'
}
function contentTagColor(t: string) {
  return {
    '模拟面试': 'green',
    '模拟期中考试': 'orange',
    '人际关系期中考试': 'purple',
    '简历更新': 'blue',
    'Case准备': 'blue',
    '笔试辅导': 'orange',
    '基础课程': 'blue',
  }[t] || 'blue'
}
function evaluationTagColor(record: Record<string, any>) {
  const tag = evaluationTag(record)
  return tag?.className === 'success' ? 'green' : tag?.className === 'warning' ? 'orange' : 'default'
}

function resetFilters() {
  filters.value = { keyword: '', coachingType: '', contentType: '', timeRange: '' }
  activeTab.value = 'all'
  records.value = summaryRecords.value
}
function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '' }
function coachingLabel(key: string) { return { job_coaching: t('position_coaching'), mock_interview: t('mock_application'), networking: t('interpersonal_skills'), mock_midterm: t('mock_midterm'), basic: t('foundation_course_2'), basic_course: t('foundation_course_2') }[key] || key }
function contentLabel(key: string) {
  const normalized = String(key ?? '').trim().replace(/-/g, '_').toLowerCase()
  return {
    resume_revision: t('new_resume'),
    new_resume: t('new_resume'),
    resume_update: t('resume_update'),
    case_prep: 'Case准备',
    mock_interview: t('mock_interview'),
    mock_interview_content: t('mock_interview'),
    networking_midterm: t('networking_midterm_exam'),
    networking_content: t('networking_midterm_exam'),
    mock_midterm: t('mock_midterm_exam'),
    mock_midterm_content: t('mock_midterm_exam'),
    written_test: t('written_test_coaching'),
    technical: 'Technical',
    behavioral: 'Behavioral',
    basic: t('foundation_course_2'),
    basic_course: t('foundation_course_2'),
    mentor_report: t('session_submission'),
    student_request: t('student_applications'),
    other: t('other'),
  }[normalized] || key
}
function evaluationTag(record: Record<string, any>) {
  if (record.studentEvaluation !== '' && record.studentEvaluation != null) {
    return { text: `⭐ ${record.studentEvaluation}`, className: 'success' }
  }
  if (record.reviewStatus === 'approved') {
    return { text: t('pending_evaluation'), className: 'warning' }
  }
  return null
}

function normalizeCourseRecord(record: Record<string, any>) {
  const durationHours = Number(record.durationHours ?? 0)
  const rate = Number(record.rate ?? record.hourlyRate ?? 0)
  const recordId = record.recordId ?? record.id
  const rawContentType = record.contentType ?? record.classStatus ?? record.courseType ?? record.courseSource ?? ''
  return {
    ...record,
    id: recordId,
    recordId,
    recordNo: record.recordNo ?? record.classId ?? (recordId ? `CR-${recordId}` : '-'),
    coachingType: record.coachingType ?? record.courseType ?? '',
    contentType: contentLabel(rawContentType),
    contentDetail: record.contentDetail ?? record.feedbackContent ?? record.comments ?? record.topics ?? record.reviewRemark ?? '',
    reviewStatus: record.reviewStatus ?? record.status ?? '',
    totalFee: record.totalFee ?? (Number.isFinite(durationHours * rate) ? durationHours * rate : 0),
    studentEvaluation: resolveStudentEvaluation(record)
  }
}

function resolveStudentEvaluation(record: Record<string, any>) {
  const explicitEvaluation = record.studentEvaluation ?? record.feedbackRating
  if (explicitEvaluation !== '' && explicitEvaluation != null) {
    return String(explicitEvaluation)
  }

  const reviewStatus = record.reviewStatus ?? record.status ?? ''
  if (reviewStatus !== 'approved') {
    return ''
  }

  const rawRate = String(record.rate ?? '').trim()
  if (!rawRate) {
    return ''
  }

  if (!/^[1-5](?:\.0+)?$/.test(rawRate)) {
    return ''
  }

  return rawRate.replace(/\.0+$/, '')
}

function matchesTimeRange(classDate: string | undefined, timeRange: string) {
  if (!classDate) {
    return false
  }
  const currentDate = new Date()
  const targetDate = new Date(classDate)
  if (Number.isNaN(targetDate.getTime())) {
    return false
  }

  const currentDay = currentDate.getDay()
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
  const startOfThisWeek = new Date(currentDate)
  startOfThisWeek.setHours(0, 0, 0, 0)
  startOfThisWeek.setDate(currentDate.getDate() + mondayOffset)

  const endOfThisWeek = new Date(startOfThisWeek)
  endOfThisWeek.setDate(startOfThisWeek.getDate() + 7)

  if (timeRange === 'this_week') {
    return targetDate >= startOfThisWeek && targetDate < endOfThisWeek
  }

  if (timeRange === 'last_week') {
    const startOfLastWeek = new Date(startOfThisWeek)
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7)
    return targetDate >= startOfLastWeek && targetDate < startOfThisWeek
  }

  if (timeRange === 'this_month') {
    return targetDate.getFullYear() === currentDate.getFullYear() && targetDate.getMonth() === currentDate.getMonth()
  }

  return true
}

function closeDetailModal() {
  detailModal.value = { visible: false, record: null }
}

function closeRejectModal() {
  rejectModal.value = { visible: false, reason: '', record: null }
}

function openConfirmModalFromReject() {
  confirmRecord.value = rejectModal.value.record
  showConfirmModal.value = true
  resetConfirmForm()
  closeRejectModal()
}

function closeConfirmModal() {
  showConfirmModal.value = false
  confirmRecord.value = null
  resetConfirmForm()
}

function switchConfirmFeedbackForm(value: string) {
  confirmClassType.value = value
  confirmCompanyOrPosition.value = ''
  confirmFeedback.value = ''
  confirmScore.value = ''
  confirmProgress.value = ''
}

function resetConfirmForm() {
  confirmClassType.value = ''
  confirmDate.value = confirmRecord.value?.classDate ? String(confirmRecord.value.classDate).slice(0, 10) : new Date().toISOString().slice(0, 10)
  confirmDuration.value = Number(confirmRecord.value?.durationHours ?? 1.5)
  confirmPerformance.value = ''
  confirmCompanyOrPosition.value = ''
  confirmFeedback.value = ''
  confirmScore.value = ''
  confirmProgress.value = ''
  confirmSubmitting.value = false
}

function mapConfirmClassStatus(value: string) {
  return {
    mock_interview: 'mock_interview',
    mock_midterm: 'mock_midterm',
    networking: 'networking_midterm',
    written_test: 'written_test',
    resume_update: 'resume_update',
    basic: 'basic',
  }[value] || value
}

async function submitConfirm() {
  if (!confirmRecord.value) {
    return
  }

  confirmSubmitting.value = true
  try {
    const duration = Number(confirmDuration.value)
    const rate = Number(confirmRecord.value.rate ?? 600) || 600
    const classStatus = mapConfirmClassStatus(confirmClassType.value)
    await http.post('/api/mentor/class-records', {
      studentId: confirmRecord.value.studentId,
      studentName: confirmRecord.value.studentName,
      classDate: confirmDate.value,
      durationHours: duration,
      weeklyHours: duration,
      courseType: confirmClassType.value,
      courseSource: 'mentor',
      classStatus,
      feedback: confirmFeedback.value,
      feedbackContent: confirmFeedback.value,
      companyOrPosition: confirmCompanyOrPosition.value,
      score: confirmScore.value,
      progress: confirmProgress.value,
      rate: String(rate),
      totalFee: duration * rate,
    })
    window.alert('提交成功！\n\n课程已确认，反馈已提交。')
    closeConfirmModal()
    await fetchSummaryRecords()
    await fetchRecords()
  } finally {
    confirmSubmitting.value = false
  }
}

async function showDetail(record: any) {
  const recordId = record.recordId ?? record.id
  let detailRecord = record
  if (recordId != null) {
    try {
      detailRecord = normalizeCourseRecord(await http.get(`/api/mentor/class-records/${recordId}`))
    } catch {
      detailRecord = normalizeCourseRecord(record)
    }
  }
  detailModal.value = { visible: true, record: normalizeCourseRecord(detailRecord) }
}

function showReject(record: any) {
  const normalizedRecord = normalizeCourseRecord(record)
  rejectModal.value = {
    visible: true,
    reason: record.reviewRemark || record.remark || t('no_rejection_reason_provided'),
    record: normalizedRecord
  }
}

async function fetchRecords() {
  try {
    if (activeTab.value === 'all') {
      records.value = summaryRecords.value
      return
    }
    const res = await http.get('/api/mentor/class-records/list', {
      params: { status: activeTab.value }
    })
    records.value = (res.rows || []).map((record: Record<string, any>) => normalizeCourseRecord(record))
  } catch { records.value = [] }
}

async function fetchSummaryRecords() {
  try {
    const res = await http.get('/api/mentor/class-records/list', {
      params: fullListParams
    })
    summaryRecords.value = (res.rows || []).map((record: Record<string, any>) => normalizeCourseRecord(record))
  } catch {
    summaryRecords.value = []
  }
}

async function onReportSubmitted() {
  showReportModal.value = false
  await fetchSummaryRecords()
  await fetchRecords()
}

watch(activeTab, async () => {
  await fetchRecords()
})

onMounted(async () => {
  await fetchSummaryRecords()
  await fetchRecords()
})
</script>

<style scoped>
.tabs-radio :deep(.ant-radio-button-wrapper){padding:0 16px}
.filter-bar :deep(.ant-form-item){margin-bottom:0;margin-right:12px}
.text-muted{color:#94A3B8}
.text-sm{font-size:12px}
.form-grid{display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:16px}
.form-group{margin-bottom:12px}
.form-label{display:block;font-size:13px;font-weight:600;color:#1E293B;margin-bottom:6px}
.form-input{padding:8px 12px;border:1px solid #E2E8F0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;width:100%}
.form-input:focus{border-color:#7399C6;box-shadow:0 0 0 4px #E8F0F8}
.form-select{padding:8px 36px 8px 12px;border:1px solid #E2E8F0;border-radius:8px;font-size:14px;background:#fff;appearance:none;cursor:pointer;width:100%}
.req{color:#EF4444;margin-left:2px}
.modal-header{padding:20px 24px;background:linear-gradient(135deg,#7399C6,#5A7BA3);color:#fff;display:flex;align-items:center;justify-content:space-between}
.modal-header--reject{background:#FEE2E2;color:#DC2626}
.modal-header--confirm{background:linear-gradient(135deg,#7399C6,#5A7BA3);color:#fff}
.modal-title{display:inline-flex;align-items:center;gap:8px;font-size:18px;font-weight:700}
.modal-close{width:36px;height:36px;border:none;border-radius:10px;background:rgba(255,255,255,0.16);color:#fff;font-size:20px;cursor:pointer}
.modal-body{padding:24px}
.modal-footer{padding:16px 24px;display:flex;justify-content:flex-end;border-top:1px solid #E2E8F0}
.modal-footer--confirm{background:#F8FAFC}
.reject-summary{background:#FEF2F2;border-radius:12px;padding:16px;margin-bottom:20px}
.reject-summary-grid{display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:12px}
.reject-summary-label,.confirm-meta-label{display:block;color:#94A3B8;font-size:12px}
.reject-summary-value,.confirm-meta-value{font-weight:600;margin-top:4px;color:#1E293B}
.reject-reason{margin-bottom:16px}
.reject-reason-title,.confirm-feedback-title{font-size:14px;font-weight:600;margin-bottom:12px;color:#DC2626;display:flex;align-items:center;gap:6px}
.reject-meta{color:#94A3B8;font-size:13px;margin-top:16px;display:grid;gap:6px}
.confirm-meta{background:#E8F0F8;border-radius:12px;padding:16px;margin-bottom:20px;display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:12px}
.confirm-divider{margin:20px 0;border:none;border-top:1px solid #E2E8F0}
.confirm-feedback-default{text-align:center;padding:32px;color:#94A3B8;background:#FAFAFA;border-radius:12px;border:1px dashed #E2E8F0}
.confirm-feedback-icon{font-size:48px;opacity:0.5}
.confirm-feedback-banner{padding:12px;border-radius:8px;margin-bottom:16px;font-size:14px}
.confirm-feedback-banner--mock{background:#F3E8FF;color:#7C3AED}
.confirm-feedback-banner--regular{background:#FFF7ED;color:#EA580C}
.confirm-feedback-banner--networking{background:#ECFDF5;color:#059669}
.confirm-feedback-banner--resume{background:#EFF6FF;color:#1D4ED8}
.detail-grid{display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:16px}
.detail-item{background:#F8FAFC;border-radius:12px;padding:16px}
.detail-label{display:block;font-size:12px;font-weight:600;color:#64748B;margin-bottom:6px}
.detail-value{font-size:14px;color:#1E293B;line-height:1.6}
.detail-section{margin-top:20px}
.detail-panel{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;color:#334155;line-height:1.7;white-space:pre-wrap}
.detail-panel--danger{background:#FEF2F2;border-color:#FECACA;color:#991B1B}
</style>

