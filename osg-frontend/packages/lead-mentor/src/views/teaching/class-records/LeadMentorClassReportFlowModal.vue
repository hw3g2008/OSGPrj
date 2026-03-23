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
      aria-label="关闭上报课程记录弹层"
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
          上报课程记录
        </span>
        <button
          type="button"
          class="modal-close"
          data-surface-part="close-control"
          aria-label="关闭上报课程记录弹层"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <div class="lm-report-body modal-body" data-surface-part="body">
        <div class="notice-banner">
          <i class="mdi mdi-information" aria-hidden="true" />
          请在上课后填写课程记录和反馈，提交后需等待后台审核
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-numeric-1-circle" aria-hidden="true" />
            选择学员
            <span class="required">*</span>
          </label>
          <select
            v-model="form.studentId"
            class="form-select"
            data-report-field="student-id"
            :disabled="studentsLoading || submitting"
          >
            <option value="">{{ studentsLoading ? '学员加载中...' : '请选择学员' }}</option>
            <option v-for="student in students" :key="student.value" :value="student.value">
              {{ student.label }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-numeric-2-circle" aria-hidden="true" />
            上课日期和时长
          </label>
          <div class="form-grid">
            <div class="form-group form-group--compact">
              <label class="form-label">
                上课日期
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
                学习时长
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
                <span class="inline-field__suffix">小时</span>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-numeric-3-circle" aria-hidden="true" />
            学员状态
            <span class="required">*</span>
          </label>
          <div class="status-grid">
            <label class="status-card status-card--success" :class="{ 'status-card--selected': form.attendanceStatus === 'attended' }">
              <input v-model="form.attendanceStatus" type="radio" name="student-status" value="attended" />
              <div class="status-card__copy">
                <div class="status-card__title">
                  <i class="mdi mdi-check-circle" aria-hidden="true" />
                  正常上课
                </div>
                <div class="status-card__sub">学员按时参加课程</div>
              </div>
            </label>
            <label class="status-card status-card--danger" :class="{ 'status-card--selected': form.attendanceStatus === 'absent' }">
              <input v-model="form.attendanceStatus" type="radio" name="student-status" value="absent" />
              <div class="status-card__copy">
                <div class="status-card__title">
                  <i class="mdi mdi-account-off" aria-hidden="true" />
                  旷课未到场
                </div>
                <div class="status-card__sub">学员未参加课程</div>
              </div>
            </label>
          </div>
        </div>

        <div class="warning-panel">
          <div class="form-group form-group--compact">
            <label class="form-label form-label--danger">
              <i class="mdi mdi-note-text" aria-hidden="true" />
              旷课备注
            </label>
            <textarea
              v-model="form.absenceRemark"
              class="form-textarea form-textarea--short"
              rows="2"
              placeholder="请简要说明旷课情况（可选）..."
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-numeric-4-circle" aria-hidden="true" />
            课程类型
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
            选择申请辅导的岗位
            <span class="required">*</span>
          </label>
          <select v-model="form.positionLabel" class="form-select">
            <option value="">请选择岗位</option>
            <option v-for="position in positionOptions" :key="position" :value="position">
              {{ position }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-format-list-bulleted" aria-hidden="true" />
            课程内容类型
            <span class="required">*</span>
          </label>
          <select
            v-model="form.jobContentType"
            class="form-select"
            data-report-field="job-content"
            :disabled="!usesJobContent || submitting"
          >
            <option value="">{{ usesJobContent ? '请选择课程内容类型' : '当前课程类型使用固定内容' }}</option>
            <option v-for="option in jobContentOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-format-list-bulleted" aria-hidden="true" />
            基础课内容类型
            <span class="required">*</span>
          </label>
          <select
            v-model="form.basicContentType"
            class="form-select"
            data-report-field="basic-content"
            :disabled="!usesBasicContent || submitting"
          >
            <option value="">{{ usesBasicContent ? '请选择基础课内容类型' : '当前课程类型不使用基础课内容' }}</option>
            <option v-for="option in basicContentOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <section class="feedback-card">
          <div class="feedback-card__badge">
            <i class="mdi mdi-comment-text" aria-hidden="true" />
            课程反馈
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              课程反馈
              <span class="required">*</span>
            </label>
            <textarea
              v-model="form.feedbackContent"
              class="form-textarea"
              data-report-field="feedback-content"
              rows="4"
              placeholder="请详细描述本次课程内容和学员表现..."
            />
          </div>
        </section>

        <section class="feedback-card">
          <div class="feedback-card__badge feedback-card__badge--blue">
            <i class="mdi mdi-file-document-edit" aria-hidden="true" />
            简历更新反馈
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              课程反馈
              <span class="required">*</span>
            </label>
            <textarea v-model="form.feedbackContent" class="form-textarea" rows="3" placeholder="请描述简历修改的主要内容和建议..." />
          </div>
          <div class="form-grid">
            <div class="form-group form-group--compact">
              <label class="form-label">
                上传原简历
                <span class="required">*</span>
              </label>
              <div class="upload-dropzone">
                <i class="mdi mdi-upload" aria-hidden="true" />
                <span>点击上传原简历</span>
              </div>
            </div>
            <div class="form-group form-group--compact">
              <label class="form-label">
                上传修改后简历
                <span class="required">*</span>
              </label>
              <div class="upload-dropzone">
                <i class="mdi mdi-upload" aria-hidden="true" />
                <span>点击上传修改后简历</span>
              </div>
            </div>
          </div>
        </section>

        <section class="feedback-card">
          <div class="feedback-card__badge feedback-card__badge--green">
            <i class="mdi mdi-account-voice" aria-hidden="true" />
            模拟面试反馈
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              课程反馈
              <span class="required">*</span>
            </label>
            <textarea v-model="form.feedbackContent" class="form-textarea" rows="3" placeholder="请详细描述学员在模拟面试中的表现..." />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              模拟面试的目的是什么？
              <span class="required">*</span>
            </label>
            <textarea v-model="form.mockPurpose" class="form-textarea form-textarea--short" rows="2" placeholder="请描述本次模拟面试的目的..." />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              你们在这次课程中主要研究了哪些概念和主题？
              <span class="required">*</span>
            </label>
            <textarea v-model="form.mockConcepts" class="form-textarea form-textarea--short" rows="2" placeholder="请列出本次课程涉及的概念和主题..." />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              这名学生哪科考的不好？
              <span class="required">*</span>
            </label>
            <textarea v-model="form.mockWeakTopics" class="form-textarea form-textarea--short" rows="2" placeholder="请描述学员需要改进的方面..." />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              您如何评价这名学生的表现？
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
            人际关系期中考试反馈
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              课程反馈
              <span class="required">*</span>
            </label>
            <textarea v-model="form.feedbackContent" class="form-textarea" rows="3" placeholder="请详细描述学员在人际关系测试中的表现..." />
          </div>
          <div class="score-card">
            <div class="score-card__title">
              <i class="mdi mdi-star" aria-hidden="true" />
              评分项目
            </div>
            <div class="form-grid">
              <div v-for="field in networkingScores" :key="field.label" class="form-group form-group--compact">
                <label class="form-label">{{ field.label }}</label>
                <select v-model="form.networkingScoreMap[field.label]" class="form-select">
                  <option value="">请选择</option>
                  <option v-for="option in field.options" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
            </div>
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">是否推荐这位学生？</label>
            <select v-model="form.networkingRecommendation" class="form-select">
              <option value="">请选择</option>
              <option v-for="option in recommendationOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
        </section>

        <section class="feedback-card">
          <div class="feedback-card__badge feedback-card__badge--amber">
            <i class="mdi mdi-school" aria-hidden="true" />
            模拟期中考试反馈
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              课程反馈
              <span class="required">*</span>
            </label>
            <textarea v-model="form.feedbackContent" class="form-textarea" rows="3" placeholder="请详细描述学员在模拟期中考试中的表现..." />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">该学生得了多少分？</label>
            <div class="inline-field">
              <input v-model="form.midtermScore" class="form-input form-input--short" type="number" placeholder="0" min="0" max="100" />
              <span class="inline-field__suffix">分</span>
            </div>
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">逐题分析</label>
            <textarea v-model="form.midtermAnalysis" class="form-textarea" rows="4" placeholder="请详细分析学员在每道题目上的表现..." />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">学生进度评估</label>
            <select v-model="form.midtermProgress" class="form-select">
              <option value="">请选择</option>
              <option v-for="option in progressOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
        </section>
      </div>

      <div class="lm-report-footer modal-footer">
        <button type="button" class="btn btn-outline" :disabled="submitting" @click="closeModal">取消</button>
        <button type="button" class="btn btn-primary" :disabled="submitting" @click="handleSubmit">
          <i class="mdi mdi-check" aria-hidden="true" />
          {{ submitting ? '提交中...' : '提交记录' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { LeadMentorClassRecordCreatePayload } from '@osg/shared/api'

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
  { value: 'job-coaching', label: '岗位辅导', description: '岗位辅导的课程', tone: 'tag--blue' },
  { value: 'mock-interview', label: '模拟面试', description: '模拟面试的课程', tone: 'tag--green' },
  { value: 'networking', label: '人际关系', description: '人际关系的课程', tone: 'tag--purple' },
  { value: 'mock-midterm', label: '模拟期中', description: '模拟期中考试', tone: 'tag--amber' },
  { value: 'basic', label: '基础课程', description: '基础课程', tone: 'tag--indigo' },
] as const

const positionOptions = [
  'Goldman Sachs · IB Analyst · Hong Kong',
  'Morgan Stanley · IBD Analyst · New York',
  'McKinsey · Business Analyst · Shanghai',
]

const jobContentOptions = [
  { value: 'technical', label: '技术的' },
  { value: 'behavioral', label: '行为训练' },
  { value: 'resume_revision', label: '新简历制作' },
  { value: 'resume_update', label: '简历更新' },
  { value: 'mock_interview', label: '模拟面试的课程' },
  { value: 'networking_midterm', label: '人际关系的课程' },
  { value: 'mock_midterm', label: '模拟期中考试' },
  { value: 'case_prep', label: '咨询案例准备' },
  { value: 'other', label: '其他' },
]

const basicContentOptions = [
  { value: 'technical', label: '技术的' },
  { value: 'behavioral', label: '行为训练' },
  { value: 'resume_revision', label: '新简历制作' },
  { value: 'resume_update', label: '简历更新' },
  { value: 'case_prep', label: '咨询案例准备' },
  { value: 'other', label: '其他' },
]

const performanceOptions = [
  { value: 'disappointing', emoji: '😞', label: '令人失望' },
  { value: 'good', emoji: '🙂', label: '好的' },
  { value: 'great', emoji: '😊', label: '伟大的' },
  { value: 'amazing', emoji: '🌟', label: '真棒' },
]

const networkingScores = [
  { label: '电子邮件质量 (1-5分)', options: ['1', '2', '3', '4', '5'] },
  { label: '电子邮件礼仪 (1-5分)', options: ['1', '2', '3', '4', '5'] },
  { label: '闲聊/自我介绍质量 (1-10分)', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
  { label: '通话质量 (1-10分)', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
  { label: '感谢邮件 (1-3分)', options: ['1', '2', '3'] },
]

const recommendationOptions = [
  '是的 - 我相信这位学生很适合我的团队',
  '或许 - 如果他们能改进一下就好了',
  '不 - 他们需要认真加强准备工作',
]

const progressOptions = [
  '非常棒 - 进展顺利，会取得好成绩',
  '太好了 - 进展顺利',
  '好的 - 需要在一些方面下功夫',
  '令人失望 - 严重落后',
  '不适用 - 入学时间太短',
]

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

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      return
    }
    Object.assign(form, createDefaultForm(props.prefillStudentId))
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
    message.error('请选择学员')
    return
  }
  if (!form.classDate) {
    message.error('请选择上课日期')
    return
  }
  if (!form.durationHours || Number(form.durationHours) <= 0) {
    message.error('请输入有效的学习时长')
    return
  }
  if (!classStatus) {
    message.error('请选择课程内容类型')
    return
  }
  if (!form.feedbackContent.trim()) {
    message.error('请填写课程反馈')
    return
  }

  emit('submit', {
    studentId: Number(form.studentId),
    classDate: toSubmitClassDate(form.classDate),
    durationHours: Number(form.durationHours),
    courseType: resolvePayloadCourseType(),
    classStatus,
    feedbackContent: form.feedbackContent.trim(),
    topics: resolveTopics(),
    comments: resolveComments(),
  })
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
