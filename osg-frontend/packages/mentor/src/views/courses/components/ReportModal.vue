<template>
  <a-modal
    :open="true"
    :width="800"
    :footer="null"
    :title="null"
    :closable="false"
    :body-style="{ padding: 0 }"
    :get-container="false"
    :destroy-on-close="true"
    wrap-class-name="report-modal-wrap"
    @cancel="$emit('close')"
  >
    <div id="modal-mentor-report">
      <div class="modal-header">
        <span class="modal-title"><i class="mdi mdi-clipboard-text" /> {{ $t('submit_course_record') }}</span>
        <button class="modal-close" type="button" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div class="info-banner">
          <i class="mdi mdi-information" />
          {{ $t('please_fill_in_the_course_record_and_fee') }}
        </div>

        <div id="report-student" class="form-group">
          <label class="form-label">
            <i class="mdi mdi-numeric-1-circle step-icon" /> {{ $t('select_student') }} <span class="req">*</span>
          </label>
          <a-select
            v-model:value="form.studentId"
            :placeholder="$t('please_select_a_student')"
            style="width:100%"
            allow-clear
            @change="onStudentSelect"
          >
            <a-select-option value="">{{ $t('please_select_a_student') }}</a-select-option>
            <a-select-option v-for="s in students" :key="s.userId" :value="String(s.userId)">
              {{ s.nickName }} ({{ s.userId }})
            </a-select-option>
          </a-select>
        </div>

        <div v-if="form.studentId" id="mentor-class-datetime" class="form-group">
          <label class="form-label">
            <i class="mdi mdi-numeric-2-circle step-icon" /> 上课日期和时长
          </label>
          <div class="form-grid">
            <div>
              <label class="form-label">{{ $t('course_date') }} <span class="req">*</span></label>
              <input v-model="form.classDate" type="date" class="form-input" />
            </div>
            <div>
              <label class="form-label">{{ $t('study_duration') }} <span class="req">*</span></label>
              <div style="display:flex;align-items:center;gap:8px">
                <input v-model.number="form.durationHours" type="number" class="form-input" min="0.5" max="8" step="0.5" style="width:100px" />
                <span class="text-muted">{{ $t('hours') }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="form.studentId" id="mentor-student-status" class="form-group" style="margin-top:16px">
          <label class="form-label">
            <i class="mdi mdi-numeric-3-circle step-icon" /> {{ $t('student_status') }} <span class="req">*</span>
          </label>
          <div class="status-group">
            <label class="status-option" :class="{ active: form.studentStatus === 'normal', green: form.studentStatus === 'normal' }">
              <input v-model="form.studentStatus" type="radio" name="mentor-student-status" value="normal" @change="onStudentStatusChange('normal')" />
              <div>
                <div class="status-label"><i class="mdi mdi-check-circle" /> {{ $t('attended') }}</div>
                <div class="status-desc">{{ $t('student_attended_class_on_time') }}</div>
              </div>
            </label>
            <label class="status-option" :class="{ active: form.studentStatus === 'no-show', red: form.studentStatus === 'no-show' }">
              <input v-model="form.studentStatus" type="radio" name="mentor-student-status" value="no-show" @change="onStudentStatusChange('no-show')" />
              <div>
                <div class="status-label" style="color:#991B1B"><i class="mdi mdi-account-off" /> {{ $t('absent') }}</div>
                <div class="status-desc">{{ $t('student_did_not_attend_class') }}</div>
              </div>
            </label>
          </div>
          <div v-if="form.studentStatus === 'no-show'" id="mentor-noshow-note" class="noshow-note">
            <label class="form-label" style="color:#991B1B"><i class="mdi mdi-note-text" /> {{ $t('absence_notes') }}</label>
            <a-textarea v-model:value="form.noShowNote" :rows="2" :placeholder="`${$t('briefly_describe_the_absence_optional')}）...`" />
          </div>
        </div>

        <div v-if="form.studentId && form.studentStatus === 'normal'" id="mentor-course-type-section" class="form-group" style="margin-top:16px">
          <label class="form-label">
            <i class="mdi mdi-numeric-4-circle step-icon" /> {{ $t('course_type') }} <span class="req">*</span>
          </label>
          <div class="type-options">
            <label
              v-for="ct in courseTypes"
              :key="ct.value"
              class="type-option"
              :class="{ active: form.coachingType === ct.value }"
            >
              <input v-model="form.coachingType" type="radio" name="mentor-course-type" :value="ct.value" @change="onCourseTypeChange(ct.value)" />
              <span class="tag" :style="{ background: ct.color, color: '#fff' }">{{ ct.label }}</span>
              <span class="type-desc">{{ ct.desc }}</span>
            </label>
          </div>
        </div>

        <div v-if="form.studentId && form.studentStatus === 'normal' && form.coachingType === 'job-coaching'" id="mentor-job-select" class="form-group" style="margin-top:16px">
          <div class="job-card">
            <label class="form-label" style="color:#1E40AF"><i class="mdi mdi-briefcase" /> {{ $t('select_position_for_coaching_application') }} <span class="req">*</span></label>
            <!-- §A.0.4 改用 my-targets.coachings 真实数据，value 为 applicationId -->
            <a-select
              v-model:value="form.applicationId"
              :placeholder="$t('please_select_a_position')"
              style="width:100%;margin-top:8px"
              allow-clear
              @change="onApplicationSelect"
            >
              <a-select-option v-for="c in studentCoachingOptions" :key="c.applicationId" :value="c.applicationId">
                {{ c.companyName || '—' }} · {{ c.positionName || '—' }}
              </a-select-option>
              <a-select-option v-if="studentCoachingOptions.length === 0" :value="undefined" disabled>
                {{ $t('no_active_coaching_positions_for_this_st') }}
              </a-select-option>
            </a-select>
          </div>
        </div>

        <!-- §A.0.4 模拟应聘类型时显示 practiceId 下拉（mock-interview / networking / mock-midterm） -->
        <div v-if="form.studentId && form.studentStatus === 'normal' && showPracticeIdSelect" id="mentor-practice-select" class="form-group" style="margin-top:16px">
          <div class="job-card">
            <label class="form-label" style="color:#7C3AED"><i class="mdi mdi-account-tie-voice" /> {{ $t('select_associated_mock_interview') }} <span class="req">*</span></label>
            <a-select
              v-model:value="form.practiceId"
              :placeholder="$t('please_select_a_mock_interview_record')"
              style="width:100%;margin-top:8px"
              allow-clear
            >
              <a-select-option v-for="p in studentPracticeOptions" :key="p.practiceId" :value="p.practiceId">
                #{{ p.practiceId }} · {{ p.practiceType || $t('unknown_type') }}
              </a-select-option>
              <a-select-option v-if="studentPracticeOptions.length === 0" :value="undefined" disabled>
                {{ $t('no_active_mock_interviews_for_this_stude') }}
              </a-select-option>
            </a-select>
          </div>
        </div>

        <div v-if="form.studentId && form.studentStatus === 'normal' && form.coachingType === 'job-coaching'" id="mentor-job-content-type" class="form-group" style="margin-top:16px">
          <label class="form-label"><i class="mdi mdi-format-list-bulleted" /> {{ $t('course_content_type') }} <span class="req">*</span></label>
          <div id="mentor-job-content-select" style="margin-top:8px">
            <a-select
              v-model:value="form.contentType"
              :placeholder="$t('please_select_course_content_type')"
              style="width:100%"
              allow-clear
              @change="onContentTypeChange(form.contentType)"
            >
              <a-select-option value="">{{ $t('please_select_course_content_type') }}</a-select-option>
              <a-select-option value="technical">{{ $t('technical') }}</a-select-option>
              <a-select-option value="behavioral">{{ $t('behavioral_training') }}</a-select-option>
              <a-select-option value="new-resume">{{ $t('new_resume_creation') }}</a-select-option>
              <a-select-option value="resume-update">{{ $t('resume_update') }}</a-select-option>
              <a-select-option value="mock-interview-content">{{ $t('mock_interview_session') }}</a-select-option>
              <a-select-option value="networking-content">{{ $t('interpersonal_skills_session') }}</a-select-option>
              <a-select-option value="mock-midterm-content">{{ $t('mock_midterm_exam') }}</a-select-option>
              <a-select-option value="case-prep">{{ $t('consulting_case_preparation') }}</a-select-option>
              <a-select-option value="other">{{ $t('other') }}</a-select-option>
            </a-select>
          </div>
        </div>

        <div v-if="form.studentId && form.studentStatus === 'normal' && form.coachingType === 'basic'" id="mentor-basic-content-type" class="form-group" style="margin-top:16px">
          <label class="form-label"><i class="mdi mdi-format-list-bulleted" /> {{ $t('foundation_course_content_type') }} <span class="req">*</span></label>
          <div id="mentor-basic-content-select" style="margin-top:8px">
            <a-select
              v-model:value="form.contentType"
              :placeholder="$t('please_select_foundation_course_content_')"
              style="width:100%"
              allow-clear
              @change="onContentTypeChange(form.contentType)"
            >
              <a-select-option value="">{{ $t('please_select_foundation_course_content_') }}</a-select-option>
              <a-select-option value="technical">{{ $t('technical') }}</a-select-option>
              <a-select-option value="behavioral">{{ $t('behavioral_training') }}</a-select-option>
              <a-select-option value="new-resume">{{ $t('new_resume_creation') }}</a-select-option>
              <a-select-option value="resume-update">{{ $t('resume_update') }}</a-select-option>
              <a-select-option value="case-prep">{{ $t('consulting_case_preparation') }}</a-select-option>
              <a-select-option value="other">{{ $t('other') }}</a-select-option>
            </a-select>
          </div>
        </div>

        <div v-if="showGeneralFeedback" id="feedback-general" class="feedback-card">
          <div class="feedback-banner feedback-banner--general">
            <i class="mdi mdi-comment-text" /> 课程反馈
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('course_feedback') }} <span class="req">*</span></label>
            <a-textarea v-model:value="form.feedback" :rows="4" :placeholder="`${$t('please_describe_the_course_content_and_s')}...`" />
          </div>
        </div>

        <div v-if="showResumeFeedback" id="feedback-resume" class="feedback-card">
          <div class="feedback-banner feedback-banner--resume">📝 {{ $t('resume_update_feedback') }}</div>
          <div class="form-group">
            <label class="form-label">{{ $t('course_feedback') }} <span class="req">*</span></label>
            <a-textarea v-model:value="form.feedback" :rows="3" :placeholder="`${$t('please_describe_the_main_changes_and_sug')}...`" />
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">{{ $t('upload_original_resume') }} <span class="req">*</span></label>
              <div class="upload-box">
                <input type="file" accept=".pdf,.doc,.docx" @change="handleResumeUpload($event, 'original')" />
                <div class="upload-hint">{{ $t('click_to_upload_original_resume') }}</div>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('upload_revised_resume') }} <span class="req">*</span></label>
              <div class="upload-box">
                <input type="file" accept=".pdf,.doc,.docx" @change="handleResumeUpload($event, 'updated')" />
                <div class="upload-hint">{{ $t('click_to_upload_revised_resume') }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="showMockInterviewFeedback" id="feedback-mock-interview" class="feedback-card">
          <div class="feedback-banner feedback-banner--mock">🎯 {{ $t('mock_interview_feedback') }}</div>
          <div class="form-group">
            <label class="form-label">{{ $t('interview_company_position') }} <span class="req">*</span></label>
            <a-input v-model:value="form.companyOrPosition" placeholder="如：Goldman Sachs / IB Analyst" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('course_feedback') }} <span class="req">*</span></label>
            <a-textarea v-model:value="form.feedback" :rows="4" :placeholder="$t('please_describe_the_main_content_of_this')" />
          </div>
        </div>

        <div v-if="showNetworkingFeedback" id="feedback-networking" class="feedback-card">
          <div class="feedback-banner feedback-banner--networking">🤝 {{ $t('networking_feedback_template') }}</div>
          <div class="form-group">
            <label class="form-label">{{ $t('networking_summary') }} <span class="req">*</span></label>
            <a-textarea v-model:value="form.feedback" :rows="4" :placeholder="$t('please_describe_the_networking_activity_')" />
          </div>
        </div>

        <div v-if="showMidtermFeedback" id="feedback-midterm" class="feedback-card">
          <div class="feedback-banner feedback-banner--midterm">📚 {{ $t('mock_midterm_exam_feedback') }}</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">{{ $t('what_score_did_this_student_receive_on_t') }}？ <span class="req">*</span></label>
              <input v-model="form.score" type="number" class="form-input" min="0" max="100" placeholder="0" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('student_progress_assessment') }} <span class="req">*</span></label>
              <a-select v-model:value="form.progress" :placeholder="$t('please_select')" style="width:100%" allow-clear>
                <a-select-option value="">{{ $t('please_select') }}</a-select-option>
                <a-select-option value="awesome">{{ $t('outstanding_on_track_to_achieve_great_re') }}</a-select-option>
                <a-select-option value="great">{{ $t('great_progressing_well') }}</a-select-option>
                <a-select-option value="ok">{{ $t('good_needs_work_in_some_areas') }}</a-select-option>
                <a-select-option value="disappointing">{{ $t('disappointing_significantly_behind') }}</a-select-option>
                <a-select-option value="na">{{ $t('n_a_enrolled_too_recently') }}</a-select-option>
              </a-select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('course_feedback') }} <span class="req">*</span></label>
            <a-textarea v-model:value="form.feedback" :rows="4" :placeholder="`${$t('please_describe_the_students_performance_3')}...`" />
          </div>
        </div>

        <div v-if="form.studentId && form.studentStatus === 'normal' && form.coachingType === 'job-coaching' && !form.contentType" class="feedback-card">
          <div class="feedback-banner feedback-banner--general">
            <i class="mdi mdi-file-document-outline" /> 请先选择课程内容类型，将显示对应的反馈表单
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('course_feedback') }} <span class="req">*</span></label>
            <a-textarea v-model:value="form.feedback" :rows="4" :placeholder="`${$t('please_describe_the_course_content_and_s')}...`" />
          </div>
        </div>

        <div v-if="form.durationHours > 0" class="fee-display">
          课时费: <strong>¥{{ computedFee }}</strong> ({{ form.durationHours }}h × ¥{{ hourlyRate }}/h)
        </div>
      </div>

      <div class="modal-footer">
        <a-button @click="$emit('close')">{{ $t('cancel') }}</a-button>
        <a-button
          type="primary"
          style="margin-left:8px"
          :loading="submitting"
          :disabled="!canSubmit || submitting"
          @click="handleSubmit"
        >
          <i v-if="!submitting" class="mdi mdi-check" style="margin-right:4px" />{{ submitting ? '提交中...' : $t('submit_record') }}
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { http } from '@osg/shared/utils/request'
import { getMentorMyTargets } from '@/api/jobOverview'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const emit = defineEmits<{ close: []; submitted: [] }>()

const students = ref<any[]>([])
const hourlyRate = ref(600)
const submitting = ref(false)

/** §A.0.4 mentor 端 my-targets：activeCoachings = job-coaching 下拉源，activePractices = mock-* 下拉源 */
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
const activeCoachings = ref<MyTargetCoaching[]>([])
const activePractices = ref<MyTargetPractice[]>([])

const form = ref({
  studentId: '',
  classDate: '',
  durationHours: 1,
  studentStatus: 'normal',
  noShowNote: '',
  coachingType: '',
  contentType: '',
  feedback: '',
  companyOrPosition: '',
  score: '',
  progress: '',
  originalResumeName: '',
  updatedResumeName: '',
  jobPosition: '',
  /** §A.0.4 后端 OsgClassRecord 已有此两个字段，提交时一并回写 */
  applicationId: undefined as number | undefined,
  practiceId: undefined as number | undefined,
})

/**
 * §A.0.4 当前学员可选的求职辅导（同步 my-targets）。
 */
const studentCoachingOptions = computed(() => {
  const sid = form.value.studentId ? Number(form.value.studentId) : null
  if (!sid) return [] as MyTargetCoaching[]
  return activeCoachings.value.filter((c) => c.studentId === sid)
})

/**
 * §A.0.4 当前学员可选的模拟应聘（同步 my-targets）。
 */
const studentPracticeOptions = computed(() => {
  const sid = form.value.studentId ? Number(form.value.studentId) : null
  if (!sid) return [] as MyTargetPractice[]
  return activePractices.value.filter((p) => p.studentId === sid)
})

/** §A.0.4 当前是否需要显示 practiceId 下拉（coachingType 是模拟应聘类） */
const showPracticeIdSelect = computed(() => {
  const ct = form.value.coachingType
  return ct === 'mock-interview' || ct === 'networking' || ct === 'mock-midterm'
})

const courseTypes = [
  { value: 'job-coaching', label: t('position_coaching'), color: '#3B82F6', desc: t('position_coaching_session') },
  { value: 'mock-interview', label: t('mock_interview'), color: '#22C55E', desc: t('mock_interview_session') },
  { value: 'networking', label: t('interpersonal_skills'), color: '#8B5CF6', desc: t('interpersonal_skills_session') },
  { value: 'mock-midterm', label: t('mock_midterm'), color: '#F59E0B', desc: t('mock_midterm_exam') },
  { value: 'basic', label: t('foundation_course_2'), color: '#6366F1', desc: t('foundation_course_2') },
]

const computedFee = computed(() => (form.value.durationHours * hourlyRate.value).toFixed(0))
const selectedStudent = computed(() => students.value.find((student) => String(student.userId) === String(form.value.studentId)) || null)
const canSubmit = computed(() => {
  if (!form.value.studentId || !form.value.classDate || Number(form.value.durationHours) <= 0) {
    return false
  }

  if (form.value.studentStatus === 'no-show') {
    return true
  }

  if (!form.value.coachingType) {
    return false
  }

  if (form.value.coachingType === 'job-coaching') {
    if (!form.value.jobPosition || !form.value.contentType) {
      return false
    }
    if (form.value.contentType === 'resume-update') {
      return Boolean(form.value.feedback && form.value.originalResumeName && form.value.updatedResumeName)
    }
    if (form.value.contentType === 'mock-interview-content') {
      return Boolean(form.value.feedback && form.value.companyOrPosition)
    }
    if (form.value.contentType === 'networking-content') {
      return Boolean(form.value.feedback)
    }
    if (form.value.contentType === 'mock-midterm-content') {
      return Boolean(form.value.feedback && form.value.score && form.value.progress)
    }
    return Boolean(form.value.feedback)
  }

  if (form.value.coachingType === 'mock-interview') {
    return Boolean(form.value.feedback && form.value.companyOrPosition)
  }

  if (form.value.coachingType === 'networking') {
    return Boolean(form.value.feedback)
  }

  if (form.value.coachingType === 'mock-midterm') {
    return Boolean(form.value.feedback && form.value.score && form.value.progress)
  }

  if (form.value.coachingType === 'basic') {
    if (!form.value.contentType) {
      return false
    }
    if (form.value.contentType === 'resume-update') {
      return Boolean(form.value.feedback && form.value.originalResumeName && form.value.updatedResumeName)
    }
    return Boolean(form.value.feedback)
  }

  return Boolean(form.value.feedback)
})

const showGeneralFeedback = computed(() => {
  if (!form.value.studentId || form.value.studentStatus !== 'normal') {
    return false
  }
  if (!form.value.coachingType) {
    return true
  }
  return form.value.coachingType === 'job-coaching' && (!form.value.contentType || form.value.contentType === 'other')
})

const showResumeFeedback = computed(() => form.value.studentId && form.value.studentStatus === 'normal' && form.value.coachingType === 'job-coaching' && form.value.contentType === 'resume-update')
const showMockInterviewFeedback = computed(() => form.value.studentId && form.value.studentStatus === 'normal' && (form.value.coachingType === 'mock-interview' || form.value.contentType === 'mock-interview-content'))
const showNetworkingFeedback = computed(() => form.value.studentId && form.value.studentStatus === 'normal' && (form.value.coachingType === 'networking' || form.value.contentType === 'networking-content'))
const showMidtermFeedback = computed(() => form.value.studentId && form.value.studentStatus === 'normal' && (form.value.coachingType === 'mock-midterm' || form.value.contentType === 'mock-midterm-content'))

function onStudentSelect() {
  form.value.studentStatus = 'normal'
  form.value.coachingType = ''
  form.value.contentType = ''
  form.value.feedback = ''
  form.value.companyOrPosition = ''
  form.value.score = ''
  form.value.progress = ''
  form.value.noShowNote = ''
  form.value.jobPosition = ''
  form.value.originalResumeName = ''
  form.value.updatedResumeName = ''
  // §A.0.4 切换学员后清空 application/practice 关联
  form.value.applicationId = undefined
  form.value.practiceId = undefined
}

/** §A.0.4 选中 applicationId 后同步 jobPosition 字段（兼容现有 payload + 测试） */
function onApplicationSelect(applicationId: number | undefined) {
  if (applicationId == null) {
    form.value.jobPosition = ''
    return
  }
  const c = studentCoachingOptions.value.find((row) => row.applicationId === applicationId)
  if (c) {
    form.value.jobPosition = `${c.companyName || ''} · ${c.positionName || ''}`.trim()
  }
}

function onStudentStatusChange(status: string) {
  if (status === 'no-show') {
    form.value.coachingType = ''
    form.value.contentType = ''
    form.value.feedback = ''
    form.value.companyOrPosition = ''
    form.value.score = ''
    form.value.progress = ''
    form.value.jobPosition = ''
    form.value.originalResumeName = ''
    form.value.updatedResumeName = ''
    // §A.0.4
    form.value.applicationId = undefined
    form.value.practiceId = undefined
  }
}

function onCourseTypeChange(value: string) {
  form.value.coachingType = value
  if (value !== 'job-coaching') {
    form.value.jobPosition = ''
    // §A.0.4 切到非 job-coaching 时清空 applicationId
    form.value.applicationId = undefined
  }
  if (value !== 'job-coaching') {
    form.value.contentType = ''
  }
  if (value === 'mock-interview' || value === 'networking' || value === 'mock-midterm' || value === 'basic') {
    form.value.feedback = ''
  }
  // §A.0.4 切到非 mock-* 时清空 practiceId
  if (value !== 'mock-interview' && value !== 'networking' && value !== 'mock-midterm') {
    form.value.practiceId = undefined
  }
}

function onContentTypeChange(value: string) {
  form.value.contentType = value
  if (value !== 'resume-update') {
    form.value.originalResumeName = ''
    form.value.updatedResumeName = ''
  }
}

function handleResumeUpload(event: Event, kind: 'original' | 'updated') {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) {
    return
  }
  if (kind === 'original') {
    form.value.originalResumeName = file.name
  } else {
    form.value.updatedResumeName = file.name
  }
}

function mapCourseTypeForBackend(value: string) {
  return {
    'job-coaching': 'job_coaching',
    'mock-interview': 'mock_interview',
    networking: 'networking',
    'mock-midterm': 'mock_midterm',
    basic: 'basic',
  }[value] || value.replace(/-/g, '_')
}

function mapContentTypeForBackend(value: string) {
  return {
    'new-resume': 'resume_revision',
    'resume-update': 'resume_update',
    'mock-interview-content': 'mock_interview',
    'networking-content': 'networking_midterm',
    'mock-midterm-content': 'mock_midterm',
    'case-prep': 'case_prep',
    technical: 'technical',
    behavioral: 'behavioral',
    other: 'other',
  }[value] || value.replace(/-/g, '_')
}

async function handleSubmit() {
  submitting.value = true
  try {
    const courseType = mapCourseTypeForBackend(form.value.coachingType)
    const contentType = mapContentTypeForBackend(form.value.contentType || form.value.coachingType)
    await http.post('/api/mentor/class-records', {
      studentId: Number(form.value.studentId),
      studentName: selectedStudent.value?.nickName || '',
      classDate: form.value.classDate,
      durationHours: form.value.durationHours,
      weeklyHours: form.value.durationHours,
      studentStatus: form.value.studentStatus === 'no-show' ? 'no_show' : 'normal',
      noShowNote: form.value.noShowNote,
      coachingType: courseType,
      contentType,
      courseType,
      courseSource: 'mentor',
      classStatus: contentType,
      feedback: form.value.feedback,
      feedbackContent: form.value.feedback,
      hourlyRate: hourlyRate.value,
      rate: String(hourlyRate.value),
      totalFee: form.value.durationHours * hourlyRate.value,
      companyOrPosition: form.value.companyOrPosition,
      score: form.value.score,
      progress: form.value.progress,
      jobPosition: form.value.jobPosition,
      // §A.0.4 关联到具体的辅导对象（OsgClassRecord 已有此两字段）
      applicationId: form.value.applicationId,
      practiceId: form.value.practiceId,
    })
    try {
      window.alert('课程记录已提交！\n\n等待后台审核后将同步到学员端。')
    } catch {
      // jsdom / browsers without alert hooks should not block submission
    }
    emit('submitted')
  } catch {
    // error handled by interceptor
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    const res = await http.get('/api/mentor/students/list')
    students.value = res.rows || res || []
  } catch {
    students.value = []
  }

  // §A.0.4 加载 my-targets，供 applicationId / practiceId 下拉
  try {
    const res = (await getMentorMyTargets()) as {
      coachings?: MyTargetCoaching[]
      practices?: MyTargetPractice[]
    }
    activeCoachings.value = res?.coachings ?? []
    activePractices.value = res?.practices ?? []
  } catch {
    activeCoachings.value = []
    activePractices.value = []
  }
})
</script>

<style scoped>
.modal-header{padding:22px 26px;background:linear-gradient(135deg,#7399C6,#5A7BA3);color:#fff;display:flex;justify-content:space-between;align-items:center}
.modal-title{font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px}
.modal-close{width:36px;height:36px;border-radius:10px;border:none;background:rgba(255,255,255,0.2);cursor:pointer;font-size:20px;color:#fff}
.modal-body{padding:26px;max-height:65vh;overflow-y:auto}
.modal-footer{padding:18px 26px;border-top:1px solid #E2E8F0;display:flex;justify-content:flex-end;gap:0}
.info-banner{background:#E8F0F8;border-radius:12px;padding:16px;margin-bottom:20px;font-size:13px;color:#7399C6;display:flex;align-items:center;gap:6px}
.step-icon{color:#7399C6;margin-right:4px}
.form-group{margin-bottom:16px}
.form-label{display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#64748B}
.req{color:#EF4444;margin-left:2px}
.form-input{width:100%;padding:12px 14px;border:2px solid #E2E8F0;border-radius:10px;font-size:14px;outline:none;box-sizing:border-box}
.form-input:focus{border-color:#7399C6;box-shadow:0 0 0 4px #E8F0F8}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.status-group{display:flex;gap:12px;margin-top:8px}
.status-option{flex:1;display:flex;align-items:center;gap:10px;padding:14px 16px;border:2px solid #E2E8F0;border-radius:10px;cursor:pointer}
.status-option.active.green{border-color:#22C55E;background:#F0FDF4}
.status-option.active.red{border-color:#EF4444;background:#FEF2F2}
.status-option input{width:18px;height:18px}
.status-label{font-weight:600;color:#166534;display:flex;align-items:center;gap:4px}
.status-desc{font-size:12px;color:#94A3B8}
.noshow-note{background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px;margin-top:12px}
.type-options{display:grid;gap:8px;margin-top:8px}
.type-option{display:flex;align-items:center;gap:10px;padding:12px 14px;border:2px solid #E2E8F0;border-radius:8px;cursor:pointer}
.type-option.active{border-color:#7399C6;background:#F8FAFC}
.type-option input{width:16px;height:16px}
.type-desc{font-size:13px}
.tag{display:inline-flex;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
.feedback-card{margin-top:16px}
.feedback-banner{padding:12px;border-radius:8px;margin-bottom:16px;font-size:14px}
.feedback-banner--general{background:#FAFAFA;color:#64748B;border:1px dashed #E2E8F0}
.feedback-banner--resume{background:#EFF6FF;color:#1D4ED8}
.feedback-banner--mock{background:#F3E8FF;color:#7C3AED}
.feedback-banner--networking{background:#ECFDF5;color:#059669}
.feedback-banner--midterm{background:#FFF7ED;color:#EA580C}
.job-card{background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:16px}
.upload-box{position:relative;border:2px dashed #E2E8F0;border-radius:10px;padding:20px;text-align:center;background:#FAFAFA}
.upload-box input{width:100%;opacity:0;position:absolute;inset:0;cursor:pointer}
.upload-hint{font-size:12px;color:#94A3B8}
.fee-display{padding:16px;background:#F0FDF4;border-radius:10px;font-size:14px;color:#166534;margin-top:16px}
.fee-display strong{font-size:18px}
.text-muted{color:#94A3B8}
</style>

