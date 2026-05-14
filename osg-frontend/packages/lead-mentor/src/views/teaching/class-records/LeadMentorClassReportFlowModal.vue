<template>
  <div
    v-if="modelValue"
    class="lm-report-modal modal"
    data-surface-id="modal-lm-report"
  >
    <button
      type="button"
      class="lm-report-backdrop"
      data-surface-part="backdrop"
      :aria-label="$t('close_course_record_submission_dialog')"
      @click="closeModal"
    />

    <div
      class="lm-report-shell modal-content"
      data-surface-part="shell"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="lm-report-header modal-header" data-surface-part="header">
        <span :id="titleId" class="lm-report-title modal-title">
          <i class="mdi mdi-clipboard-text" aria-hidden="true" />
          {{ $t('submit_course_record') }}
        </span>
        <button
          type="button"
          class="modal-close"
          data-surface-part="close-control"
          :aria-label="$t('close_course_record_submission_dialog')"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <div class="lm-report-body modal-body" data-surface-part="body">
        <div class="notice-banner">
          <i class="mdi mdi-information" aria-hidden="true" />
          {{ $t('please_fill_in_the_course_record_and_fee') }}
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-numeric-1-circle" aria-hidden="true" />
            {{ $t('select_student') }}
            <span class="required">*</span>
          </label>
          <select
            v-model="form.studentId"
            class="form-select"
            data-report-field="student-id"
            :disabled="studentsLoading || submitting"
          >
            <option value="">{{ studentsLoading ? '学员加载中...' : $t('please_select_a_student') }}</option>
            <option v-for="student in students" :key="student.value" :value="student.value">
              {{ student.label }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-numeric-2-circle" aria-hidden="true" />
            {{ $t('class_date_and_duration') }}
          </label>
          <div class="form-grid">
            <div class="form-group form-group--compact">
              <label class="form-label">
                {{ $t('course_date') }}
                <span class="required">*</span>
              </label>
              <input
                v-model="form.classDate"
                class="form-input"
                data-report-field="class-date"
                type="date"
                :disabled="submitting"
              />
            </div>
            <div class="form-group form-group--compact">
              <label class="form-label">
                {{ $t('study_duration') }}
                <span class="required">*</span>
              </label>
              <div class="inline-field">
                <input
                  v-model="form.durationHours"
                  class="form-input form-input--short"
                  data-report-field="duration-hours"
                  type="number"
                  min="0.5"
                  step="0.5"
                  :disabled="submitting"
                />
                <span class="inline-field__suffix">{{ $t('hours') }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-numeric-3-circle" aria-hidden="true" />
            {{ $t('student_status') }}
            <span class="required">*</span>
          </label>
          <div class="status-grid">
            <label class="status-card status-card--success" :class="{ 'status-card--selected': form.attendanceStatus === 'attended' }">
              <input v-model="form.attendanceStatus" type="radio" name="student-status" value="attended" />
              <div class="status-card__copy">
                <div class="status-card__title">
                  <i class="mdi mdi-check-circle" aria-hidden="true" />
                  {{ $t('attended') }}
                </div>
                <div class="status-card__sub">{{ $t('student_attended_class_on_time') }}</div>
              </div>
            </label>
            <label class="status-card status-card--danger" :class="{ 'status-card--selected': form.attendanceStatus === 'absent' }">
              <input v-model="form.attendanceStatus" type="radio" name="student-status" value="absent" />
              <div class="status-card__copy">
                <div class="status-card__title">
                  <i class="mdi mdi-account-off" aria-hidden="true" />
                  {{ $t('absent') }}
                </div>
                <div class="status-card__sub">{{ $t('student_did_not_attend_class') }}</div>
              </div>
            </label>
          </div>
        </div>

        <div class="warning-panel">
          <div class="form-group form-group--compact">
            <label class="form-label form-label--danger">
              <i class="mdi mdi-note-text" aria-hidden="true" />
              {{ $t('absence_notes') }}
            </label>
            <textarea
              v-model="form.absenceRemark"
              class="form-textarea form-textarea--short"
              rows="2"
              :placeholder="`${$t('briefly_describe_the_absence_optional')}）...`"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-numeric-4-circle" aria-hidden="true" />
            {{ $t('course_type') }}
            <span class="required">*</span>
          </label>
          <div class="course-type-list">
            <label
              v-for="courseType in courseTypes"
              :key="courseType.value"
              class="lm-course-type-option"
            >
              <input v-model="form.courseType" type="radio" name="course-type" :value="courseType.value" />
              <span class="tag" :class="courseType.tone">{{ courseType.label }}</span>
              <span class="course-type-copy">{{ courseType.description }}</span>
            </label>
          </div>
        </div>

        <div class="selection-panel selection-panel--blue">
          <label class="form-label form-label--primary">
            <i class="mdi mdi-briefcase" aria-hidden="true" />
            {{ $t('select_position_for_coaching_application') }}
            <span class="required">*</span>
          </label>
          <!-- §A.0.4 改用 my-targets.coachings 真实数据，绑定 applicationId -->
          <select v-model.number="form.applicationId" class="form-select" @change="onApplicationSelect">
            <option :value="undefined">{{ $t('please_select_a_position') }}</option>
            <option
              v-for="c in studentCoachingOptions"
              :key="c.applicationId"
              :value="c.applicationId"
            >
              {{ c.companyName || '—' }} · {{ c.positionName || '—' }}
            </option>
            <option v-if="studentCoachingOptions.length === 0" :value="undefined" disabled>
              {{ $t('no_active_coaching_positions_for_this_st') }}
            </option>
          </select>
        </div>

        <!-- §A.0.4 模拟应聘类型展示 practiceId 下拉 -->
        <div v-if="showPracticeIdSelect" class="form-group form-group--compact">
          <label class="form-label">
            {{ $t('select_associated_mock_interview') }}
            <span class="required">*</span>
          </label>
          <select v-model.number="form.practiceId" class="form-select">
            <option :value="undefined">{{ $t('please_select_a_mock_interview_record') }}</option>
            <option
              v-for="p in studentPracticeOptions"
              :key="p.practiceId"
              :value="p.practiceId"
            >
              #{{ p.practiceId }} · {{ p.practiceType || $t('unknown_type') }}
            </option>
            <option v-if="studentPracticeOptions.length === 0" :value="undefined" disabled>
              {{ $t('no_active_mock_interviews_for_this_stude') }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-format-list-bulleted" aria-hidden="true" />
            {{ $t('course_content_type') }}
            <span class="required">*</span>
          </label>
          <select
            v-model="form.jobContentType"
            class="form-select"
            data-report-field="job-content"
            :disabled="!usesJobContent || submitting"
          >
            <option value="">{{ usesJobContent ? $t('please_select_course_content_type') : $t('current_session_type_uses_fixed_content') }}</option>
            <option v-for="option in jobContentOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-format-list-bulleted" aria-hidden="true" />
            {{ $t('foundation_course_content_type') }}
            <span class="required">*</span>
          </label>
          <select
            v-model="form.basicContentType"
            class="form-select"
            data-report-field="basic-content"
            :disabled="!usesBasicContent || submitting"
          >
            <option value="">{{ usesBasicContent ? $t('please_select_foundation_course_content_') : $t('current_session_type_does_not_use_base_c') }}</option>
            <option v-for="option in basicContentOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <section class="feedback-card">
          <div class="feedback-card__badge">
            <i class="mdi mdi-comment-text" aria-hidden="true" />
            {{ $t('course_feedback') }}
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              {{ $t('course_feedback') }}
              <span class="required">*</span>
            </label>
            <textarea
              v-model="form.feedbackContent"
              class="form-textarea"
              data-report-field="feedback-content"
              rows="4"
              :placeholder="`${$t('please_describe_the_course_content_and_s')}...`"
            />
          </div>
        </section>

        <section class="feedback-card">
          <div class="feedback-card__badge feedback-card__badge--blue">
            <i class="mdi mdi-file-document-edit" aria-hidden="true" />
            {{ $t('resume_update_feedback') }}
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              {{ $t('course_feedback') }}
              <span class="required">*</span>
            </label>
            <textarea v-model="form.feedbackContent" class="form-textarea" rows="3" :placeholder="`${$t('please_describe_the_main_changes_and_sug')}...`" />
          </div>
          <div class="form-grid">
            <div class="form-group form-group--compact">
              <label class="form-label">
                {{ $t('upload_original_resume') }}
                <span class="required">*</span>
              </label>
              <div class="upload-dropzone">
                <i class="mdi mdi-upload" aria-hidden="true" />
                <span>{{ $t('click_to_upload_original_resume') }}</span>
              </div>
            </div>
            <div class="form-group form-group--compact">
              <label class="form-label">
                {{ $t('upload_revised_resume') }}
                <span class="required">*</span>
              </label>
              <div class="upload-dropzone">
                <i class="mdi mdi-upload" aria-hidden="true" />
                <span>{{ $t('click_to_upload_revised_resume') }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="feedback-card">
          <div class="feedback-card__badge feedback-card__badge--green">
            <i class="mdi mdi-account-voice" aria-hidden="true" />
            {{ $t('mock_interview_feedback') }}
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              {{ $t('course_feedback') }}
              <span class="required">*</span>
            </label>
            <textarea v-model="form.feedbackContent" class="form-textarea" rows="3" :placeholder="`${$t('please_describe_the_students_performance')}...`" />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              {{ $t('what_is_the_purpose_of_this_mock_intervi') }}？
              <span class="required">*</span>
            </label>
            <textarea v-model="form.mockPurpose" class="form-textarea form-textarea--short" rows="2" :placeholder="`${$t('please_describe_the_purpose_of_this_mock')}...`" />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              {{ $t('what_concepts_and_topics_were_covered_in') }}？
              <span class="required">*</span>
            </label>
            <textarea v-model="form.mockConcepts" class="form-textarea form-textarea--short" rows="2" :placeholder="`${$t('please_list_the_concepts_and_topics_cove')}...`" />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              {{ $t('which_subject_did_this_student_perform_p') }}？
              <span class="required">*</span>
            </label>
            <textarea v-model="form.mockWeakTopics" class="form-textarea form-textarea--short" rows="2" :placeholder="`${$t('please_describe_the_areas_the_student_ne')}...`" />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              {{ $t('how_would_you_evaluate_this_students_per') }}？
              <span class="required">*</span>
            </label>
            <div class="performance-grid">
              <label v-for="option in performanceOptions" :key="option.value" class="performance-option">
                <input v-model="form.performanceRating" type="radio" name="performance" :value="option.value" />
                <span class="performance-option__emoji">{{ option.emoji }}</span>
                <span class="performance-option__label">{{ option.label }}</span>
              </label>
            </div>
          </div>
        </section>

        <section class="feedback-card">
          <div class="feedback-card__badge feedback-card__badge--purple">
            <i class="mdi mdi-account-group" aria-hidden="true" />
            {{ $t('interpersonal_skills_midterm_feedback') }}
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              {{ $t('course_feedback') }}
              <span class="required">*</span>
            </label>
            <textarea v-model="form.feedbackContent" class="form-textarea" rows="3" :placeholder="`${$t('please_describe_the_students_performance_2')}...`" />
          </div>
          <div class="score-card">
            <div class="score-card__title">
              <i class="mdi mdi-star" aria-hidden="true" />
              {{ $t('scoring_items') }}
            </div>
            <div class="form-grid">
              <div v-for="field in networkingScores" :key="field.label" class="form-group form-group--compact">
                <label class="form-label">{{ field.label }}</label>
                <select v-model="form.networkingScoreMap[field.label]" class="form-select">
                  <option value="">{{ $t('please_select') }}</option>
                  <option v-for="option in field.options" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
            </div>
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">{{ $t('would_you_recommend_this_student') }}？</label>
            <select v-model="form.networkingRecommendation" class="form-select">
              <option value="">{{ $t('please_select') }}</option>
              <option v-for="option in recommendationOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
        </section>

        <section class="feedback-card">
          <div class="feedback-card__badge feedback-card__badge--amber">
            <i class="mdi mdi-school" aria-hidden="true" />
            {{ $t('mock_midterm_exam_feedback') }}
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              {{ $t('course_feedback') }}
              <span class="required">*</span>
            </label>
            <textarea v-model="form.feedbackContent" class="form-textarea" rows="3" :placeholder="`${$t('please_describe_the_students_performance_3')}...`" />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">{{ $t('what_score_did_the_student_get') }}？</label>
            <div class="inline-field">
              <input v-model="form.midtermScore" class="form-input form-input--short" type="number" placeholder="0" min="0" max="100" />
              <span class="inline-field__suffix">分</span>
            </div>
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">{{ $t('question_by_question_analysis') }}</label>
            <textarea v-model="form.midtermAnalysis" class="form-textarea" rows="4" :placeholder="`${$t('please_analyze_the_students_performance_')}...`" />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">{{ $t('student_progress_assessment') }}</label>
            <select v-model="form.midtermProgress" class="form-select">
              <option value="">{{ $t('please_select') }}</option>
              <option v-for="option in progressOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
        </section>
      </div>

      <div class="lm-report-footer modal-footer">
        <button type="button" class="btn btn-outline" :disabled="submitting" @click="closeModal">{{ $t('cancel') }}</button>
        <button type="button" class="btn btn-primary" :disabled="submitting" @click="handleSubmit">
          <i class="mdi mdi-check" aria-hidden="true" />
          {{ submitting ? '提交中...' : $t('submit_record') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { getLeadMentorMyTargets, type LeadMentorClassRecordCreatePayload } from '@osg/shared/api'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
interface ReportStudentOption {
  value: string
  label: string
}

type CourseTypeUi = 'job-coaching' | 'mock-interview' | 'networking' | 'mock-midterm' | 'basic'
type AttendanceStatus = 'attended' | 'absent'

interface ReportFormState {
  studentId: string
  classDate: string
  durationHours: string
  attendanceStatus: AttendanceStatus
  absenceRemark: string
  courseType: CourseTypeUi
  positionLabel: string
  jobContentType: string
  basicContentType: string
  feedbackContent: string
  mockPurpose: string
  mockConcepts: string
  mockWeakTopics: string
  performanceRating: string
  networkingRecommendation: string
  networkingScoreMap: Record<string, string>
  midtermScore: string
  midtermAnalysis: string
  midtermProgress: string
  /** §A.0.4 关联的求职辅导 application_id（job-coaching） */
  applicationId: number | undefined
  /** §A.0.4 关联的模拟应聘 practice_id（mock-*） */
  practiceId: number | undefined
}

/** §A.0.4 my-targets 加载状态定义 */
interface MyTargetCoaching {
  applicationId: number
  studentId?: number
  studentName?: string
  companyName?: string
  positionName?: string
}
interface MyTargetPractice {
  practiceId: number
  studentId?: number
  studentName?: string
  practiceType?: string
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  students?: ReportStudentOption[]
  studentsLoading?: boolean
  submitting?: boolean
  prefillStudentId?: string | null
}>(), {
  students: () => [],
  studentsLoading: false,
  submitting: false,
  prefillStudentId: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: LeadMentorClassRecordCreatePayload]
}>()

const titleId = 'lead-mentor-class-report-title'

const courseTypes = [
  { value: 'job-coaching', label: t('position_coaching'), description: t('position_coaching_session'), tone: 'tag--blue' },
  { value: 'mock-interview', label: t('mock_interview'), description: t('mock_interview_session'), tone: 'tag--green' },
  { value: 'networking', label: t('interpersonal_skills'), description: t('interpersonal_skills_session'), tone: 'tag--purple' },
  { value: 'mock-midterm', label: t('mock_midterm'), description: t('mock_midterm_exam'), tone: 'tag--amber' },
  { value: 'basic', label: t('foundation_course_2'), description: t('foundation_course_2'), tone: 'tag--indigo' },
] as const

// §A.0.4 hardcoded positionOptions 移除，改用 my-targets 动态加载

const jobContentOptions = [
  { value: 'technical', label: t('technical') },
  { value: 'behavioral', label: t('behavioral_training') },
  { value: 'resume_revision', label: t('new_resume_creation') },
  { value: 'resume_update', label: t('resume_update') },
  { value: 'mock_interview', label: t('mock_interview_session') },
  { value: 'networking_midterm', label: t('interpersonal_skills_session') },
  { value: 'mock_midterm', label: t('mock_midterm_exam') },
  { value: 'case_prep', label: t('consulting_case_preparation') },
  { value: 'other', label: t('other') },
]

const basicContentOptions = [
  { value: 'technical', label: t('technical') },
  { value: 'behavioral', label: t('behavioral_training') },
  { value: 'resume_revision', label: t('new_resume_creation') },
  { value: 'resume_update', label: t('resume_update') },
  { value: 'case_prep', label: t('consulting_case_preparation') },
  { value: 'other', label: t('other') },
]

const performanceOptions = [
  { value: 'disappointing', emoji: '😞', label: t('disappointing_2') },
  { value: 'good', emoji: '🙂', label: t('good_2') },
  { value: 'great', emoji: '😊', label: t('excellent_3') },
  { value: 'amazing', emoji: '🌟', label: t('excellent_2') },
]

const networkingScores = [
  { label: '电子邮件质量 (1-5分)', options: ['1', '2', '3', '4', '5'] },
  { label: '电子邮件礼仪 (1-5分)', options: ['1', '2', '3', '4', '5'] },
  { label: '闲聊/自我介绍质量 (1-10分)', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
  { label: '通话质量 (1-10分)', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
  { label: '感谢邮件 (1-3分)', options: ['1', '2', '3'] },
]

const recommendationOptions = [
  t('yes_i_believe_this_student_would_be_a_gr'),
  t('maybe_if_they_could_improve_a_bit'),
  t('no_they_need_to_seriously_strengthen_the'),
]

const progressOptions = [
  t('outstanding_on_track_to_achieve_great_re'),
  t('great_progressing_well'),
  t('good_needs_work_in_some_areas'),
  t('disappointing_significantly_behind'),
  t('n_a_enrolled_too_recently'),
]

// §A.0.4 my-targets 加载 state
const activeCoachings = ref<MyTargetCoaching[]>([])
const activePractices = ref<MyTargetPractice[]>([])

async function loadMyTargets() {
  try {
    const res = (await getLeadMentorMyTargets()) as {
      coachings?: MyTargetCoaching[]
      practices?: MyTargetPractice[]
    }
    activeCoachings.value = res?.coachings ?? []
    activePractices.value = res?.practices ?? []
  } catch {
    activeCoachings.value = []
    activePractices.value = []
  }
}

function createDefaultForm(prefillStudentId?: string | null): ReportFormState {
  return {
    studentId: prefillStudentId ?? '',
    classDate: '2026-03-20',
    durationHours: '1',
    attendanceStatus: 'attended',
    absenceRemark: '',
    courseType: 'job-coaching',
    positionLabel: 'Goldman Sachs · IB Analyst · Hong Kong',
    jobContentType: 'case_prep',
    basicContentType: 'technical',
    applicationId: undefined,
    practiceId: undefined,
    feedbackContent: '',
    mockPurpose: '',
    mockConcepts: '',
    mockWeakTopics: '',
    performanceRating: 'good',
    networkingRecommendation: '',
    networkingScoreMap: Object.fromEntries(networkingScores.map((field) => [field.label, ''])),
    midtermScore: '',
    midtermAnalysis: '',
    midtermProgress: '',
  }
}

const form = reactive<ReportFormState>(createDefaultForm(props.prefillStudentId))

const usesJobContent = computed(() => form.courseType === 'job-coaching')
const usesBasicContent = computed(() => form.courseType === 'basic')

/** §A.0.4 当前学员可选的求职辅导 */
const studentCoachingOptions = computed<MyTargetCoaching[]>(() => {
  const sid = form.studentId ? Number(form.studentId) : null
  if (!sid) return []
  return activeCoachings.value.filter((c) => c.studentId === sid)
})

/** §A.0.4 当前学员可选的模拟应聘 */
const studentPracticeOptions = computed<MyTargetPractice[]>(() => {
  const sid = form.studentId ? Number(form.studentId) : null
  if (!sid) return []
  return activePractices.value.filter((p) => p.studentId === sid)
})

/** §A.0.4 mock-* 课程类型时展示 practiceId 下拉 */
const showPracticeIdSelect = computed(() => {
  const ct = form.courseType
  return ct === 'mock-interview' || ct === 'networking' || ct === 'mock-midterm'
})

/** §A.0.4 选中 application 后同步 positionLabel（向后兼容） */
function onApplicationSelect() {
  const aid = form.applicationId
  if (aid == null) {
    form.positionLabel = ''
    return
  }
  const c = studentCoachingOptions.value.find((row) => row.applicationId === aid)
  if (c) {
    form.positionLabel = `${c.companyName || ''} · ${c.positionName || ''}`.trim()
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      return
    }
    Object.assign(form, createDefaultForm(props.prefillStudentId))
    loadMyTargets()
  },
)

function closeModal() {
  if (!props.modelValue || props.submitting) {
    return
  }

  emit('update:modelValue', false)
}

function resolvePayloadCourseType() {
  if (form.courseType === 'mock-interview' || form.courseType === 'networking' || form.courseType === 'mock-midterm') {
    return 'mock_practice'
  }
  if (form.courseType === 'basic') {
    return 'basic_course'
  }
  return 'job_coaching'
}

function resolvePayloadClassStatus() {
  if (form.courseType === 'mock-interview') {
    return 'mock_interview'
  }
  if (form.courseType === 'networking') {
    return 'networking_midterm'
  }
  if (form.courseType === 'mock-midterm') {
    return 'mock_midterm'
  }
  if (form.courseType === 'basic') {
    return form.basicContentType
  }
  return form.jobContentType
}

function resolveTopics() {
  const segments = [
    form.positionLabel,
    form.mockPurpose,
    form.mockConcepts,
    form.mockWeakTopics,
    form.midtermAnalysis,
  ].filter((value) => value.trim())

  return segments.length > 0 ? segments.join('\n') : undefined
}

function resolveComments() {
  const segments = [
    form.attendanceStatus === 'absent' ? '学员状态: 旷课未到场' : '学员状态: 正常上课',
    form.absenceRemark.trim(),
  ].filter((value) => value)

  if (form.courseType === 'mock-interview' && form.performanceRating.trim()) {
    segments.push(form.performanceRating.trim())
  }

  if (form.courseType === 'networking') {
    if (form.networkingRecommendation.trim()) {
      segments.push(form.networkingRecommendation.trim())
    }
    segments.push(
      ...Object.entries(form.networkingScoreMap)
        .filter(([, value]) => value.trim())
        .map(([label, value]) => `${label}: ${value}`),
    )
  }

  if (form.courseType === 'mock-midterm') {
    if (form.midtermScore.trim()) {
      segments.push(`模拟期中分数: ${form.midtermScore}`)
    }
    if (form.midtermProgress.trim()) {
      segments.push(form.midtermProgress.trim())
    }
  }

  return segments.length > 0 ? segments.join('\n') : undefined
}

function toSubmitClassDate(value: string) {
  return `${value}T00:00:00+08:00`
}

function handleSubmit() {
  const classStatus = resolvePayloadClassStatus()

  if (!form.studentId) {
    message.error(t('please_select_a_student'))
    return
  }
  if (!form.classDate) {
    message.error(t('please_select_class_date'))
    return
  }
  if (!form.durationHours || Number(form.durationHours) <= 0) {
    message.error(t('please_enter_a_valid_session_duration'))
    return
  }
  if (!classStatus) {
    message.error(t('please_select_course_content_type'))
    return
  }
  if (!form.feedbackContent.trim()) {
    message.error(t('please_fill_in_course_feedback'))
    return
  }

  const payload: LeadMentorClassRecordCreatePayload = {
    studentId: Number(form.studentId),
    classDate: toSubmitClassDate(form.classDate),
    durationHours: Number(form.durationHours),
    courseType: resolvePayloadCourseType(),
    classStatus,
    feedbackContent: form.feedbackContent.trim(),
    topics: resolveTopics(),
    comments: resolveComments(),
  }
  // §A.0.4 关联辅导对象 ID
  if (form.applicationId != null) payload.applicationId = form.applicationId
  if (form.practiceId != null) payload.practiceId = form.practiceId

  emit('submit', payload)
}
</script>

<style scoped lang="scss">
.lm-report-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lm-report-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.5);
}

.lm-report-shell {
  position: relative;
  z-index: 1;
  width: min(90%, 800px);
  max-height: 90vh;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
}

.lm-report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  background: linear-gradient(135deg, #7399c6, #5a7ba3);
  color: #fff;
  border-radius: 16px 16px 0 0;
}

.lm-report-title {
  display: inline-flex;
  align-items: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.lm-report-title .mdi-clipboard-text {
  margin-right: 8px;
}

.modal-close {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.lm-report-body {
  max-height: calc(90vh - 144px);
  overflow: auto;
  padding: 24px;
}

.notice-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 12px;
  background: #e8f0f8;
  color: var(--primary);
  font-size: 13px;
}

.notice-banner .mdi-information {
  margin-right: 6px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group--compact {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text2);
  font-size: 13px;
  font-weight: 600;
}

.form-label .mdi {
  margin-right: 4px;
  color: var(--primary);
}

.form-label--danger {
  color: #991b1b;
}

.form-label--danger .mdi {
  color: #991b1b;
}

.form-label--primary {
  color: #1e40af;
}

.form-label--primary .mdi {
  color: #1e40af;
}

.required {
  color: #ef4444;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 8px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  color: var(--text);
  font-size: 14px;
}

.form-input,
.form-select {
  min-height: 44px;
}

.form-input,
.form-textarea {
  padding: 12px 14px;
}

.form-select {
  padding: 10px 36px 10px 12px;
}

.form-input--short {
  width: 100px;
}

.form-textarea {
  min-height: 100px;
  resize: vertical;
}

.form-textarea--short {
  min-height: 72px;
}

.inline-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inline-field__suffix {
  color: var(--muted);
  font-size: 13px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 8px;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 2px solid var(--border);
  border-radius: 10px;
  background: #fff;
}

.status-card input {
  width: 18px;
  height: 18px;
}

.status-card--success {
  border-color: #22c55e;
  background: #f0fdf4;
}

.status-card--danger {
  border-color: #fecaca;
  background: #fef2f2;
}

.status-card--selected {
  box-shadow: 0 0 0 3px rgba(115, 153, 198, 0.18);
}

.status-card__title {
  display: flex;
  align-items: center;
  font-weight: 600;
}

.status-card__title .mdi {
  margin-right: 4px;
}

.status-card__sub {
  color: var(--muted);
  font-size: 12px;
}

.warning-panel,
.selection-panel {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 10px;
}

.warning-panel {
  border: 1px solid #fecaca;
  background: #fef2f2;
}

.selection-panel--blue {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
}

.course-type-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.lm-course-type-option {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #f8fafc;
}

.lm-course-type-option input {
  margin: 0;
}

.course-type-copy {
  color: var(--muted);
  font-size: 12px;
}

.feedback-card {
  margin-bottom: 16px;
  padding: 18px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.feedback-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(115, 153, 198, 0.12);
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
}

.feedback-card__badge--blue {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.feedback-card__badge--green {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.feedback-card__badge--purple {
  background: rgba(147, 51, 234, 0.12);
  color: #7e22ce;
}

.feedback-card__badge--amber {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.upload-dropzone {
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #fff;
  color: var(--muted);
  font-size: 13px;
}

.score-card {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.score-card__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  color: var(--text);
  font-weight: 700;
}

.performance-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 8px;
}

.performance-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 10px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #fff;
  text-align: center;
}

.performance-option__emoji {
  font-size: 20px;
}

.performance-option__label {
  font-size: 12px;
  color: var(--text2);
}

.lm-report-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 26px;
}

@media (max-width: 768px) {
  .lm-report-shell {
    width: min(94%, 800px);
  }

  .form-grid,
  .course-type-list,
  .performance-grid,
  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>

