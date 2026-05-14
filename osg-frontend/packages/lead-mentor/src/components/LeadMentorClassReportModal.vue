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
          <select class="form-select">
            <option value="">{{ $t('please_select_a_student') }}</option>
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
              <input class="form-input" type="date" value="2026-03-20" />
            </div>
            <div class="form-group form-group--compact">
              <label class="form-label">
                {{ $t('study_duration') }}
                <span class="required">*</span>
              </label>
              <div class="inline-field">
                <input class="form-input form-input--short" type="number" value="1" min="0.5" step="0.5" />
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
            <label class="status-card status-card--success">
              <input type="radio" name="student-status" checked />
              <div class="status-card__copy">
                <div class="status-card__title">
                  <i class="mdi mdi-check-circle" aria-hidden="true" />
                  {{ $t('attended') }}
                </div>
                <div class="status-card__sub">{{ $t('student_attended_class_on_time') }}</div>
              </div>
            </label>
            <label class="status-card status-card--danger">
              <input type="radio" name="student-status" />
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
            <textarea class="form-textarea form-textarea--short" rows="2" :placeholder="`${$t('briefly_describe_the_absence_optional')}）...`" />
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
              <input type="radio" name="course-type" :checked="courseType.value === 'job-coaching'" />
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
          <select class="form-select">
            <option value="">{{ $t('please_select_a_position') }}</option>
            <option v-for="position in positionOptions" :key="position" :value="position">
              {{ position }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-format-list-bulleted" aria-hidden="true" />
            {{ $t('course_content_type') }}
            <span class="required">*</span>
          </label>
          <select class="form-select">
            <option value="">{{ $t('please_select_course_content_type') }}</option>
            <option v-for="option in jobContentOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-format-list-bulleted" aria-hidden="true" />
            {{ $t('foundation_course_content_type') }}
            <span class="required">*</span>
          </label>
          <select class="form-select">
            <option value="">{{ $t('please_select_foundation_course_content_') }}</option>
            <option v-for="option in basicContentOptions" :key="option" :value="option">{{ option }}</option>
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
            <textarea class="form-textarea" rows="4" :placeholder="`${$t('please_describe_the_course_content_and_s')}...`" />
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
            <textarea class="form-textarea" rows="3" :placeholder="`${$t('please_describe_the_main_changes_and_sug')}...`" />
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
            <textarea class="form-textarea" rows="3" :placeholder="`${$t('please_describe_the_students_performance')}...`" />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              {{ $t('what_is_the_purpose_of_this_mock_intervi') }}？
              <span class="required">*</span>
            </label>
            <textarea class="form-textarea form-textarea--short" rows="2" :placeholder="`${$t('please_describe_the_purpose_of_this_mock')}...`" />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              {{ $t('what_concepts_and_topics_were_covered_in') }}？
              <span class="required">*</span>
            </label>
            <textarea class="form-textarea form-textarea--short" rows="2" :placeholder="`${$t('please_list_the_concepts_and_topics_cove')}...`" />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              {{ $t('which_subject_did_this_student_perform_p') }}？
              <span class="required">*</span>
            </label>
            <textarea class="form-textarea form-textarea--short" rows="2" :placeholder="`${$t('please_describe_the_areas_the_student_ne')}...`" />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              {{ $t('how_would_you_evaluate_this_students_per') }}？
              <span class="required">*</span>
            </label>
            <div class="performance-grid">
              <label v-for="option in performanceOptions" :key="option.value" class="performance-option">
                <input type="radio" name="performance" :checked="option.value === 'good'" />
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
            <textarea class="form-textarea" rows="3" :placeholder="`${$t('please_describe_the_students_performance_2')}...`" />
          </div>
          <div class="score-card">
            <div class="score-card__title">
              <i class="mdi mdi-star" aria-hidden="true" />
              {{ $t('scoring_items') }}
            </div>
            <div class="form-grid">
              <div v-for="field in networkingScores" :key="field.label" class="form-group form-group--compact">
                <label class="form-label">{{ field.label }}</label>
                <select class="form-select">
                  <option value="">{{ $t('please_select') }}</option>
                  <option v-for="option in field.options" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
            </div>
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">{{ $t('would_you_recommend_this_student') }}？</label>
            <select class="form-select">
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
            <textarea class="form-textarea" rows="3" :placeholder="`${$t('please_describe_the_students_performance_3')}...`" />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">{{ $t('what_score_did_the_student_get') }}？</label>
            <div class="inline-field">
              <input class="form-input form-input--short" type="number" placeholder="0" min="0" max="100" />
              <span class="inline-field__suffix">分</span>
            </div>
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">{{ $t('question_by_question_analysis') }}</label>
            <textarea class="form-textarea" rows="4" :placeholder="`${$t('please_analyze_the_students_performance_')}...`" />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">{{ $t('student_progress_assessment') }}</label>
            <select class="form-select">
              <option value="">{{ $t('please_select') }}</option>
              <option v-for="option in progressOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
        </section>
      </div>

      <div class="lm-report-footer modal-footer">
        <button type="button" class="btn btn-outline" @click="closeModal">{{ $t('cancel') }}</button>
        <button type="button" class="btn btn-primary" @click="handleSubmit">
          <i class="mdi mdi-check" aria-hidden="true" />
          {{ $t('submit_record') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: []
}>()

const titleId = 'lead-mentor-class-report-title'

const students = [
  { value: '12766', label: '张三 (12766) - Finance IB' },
  { value: '12890', label: '李四 (12890) - Consulting MC' },
  { value: '12901', label: '王五 (12901) - Tech SWE' },
]

const courseTypes = [
  { value: 'job-coaching', label: t('position_coaching'), description: t('position_coaching_session'), tone: 'tag--blue' },
  { value: 'mock-interview', label: t('mock_interview'), description: t('mock_interview_session'), tone: 'tag--green' },
  { value: 'networking', label: t('interpersonal_skills'), description: t('interpersonal_skills_session'), tone: 'tag--purple' },
  { value: 'mock-midterm', label: t('mock_midterm'), description: t('mock_midterm_exam'), tone: 'tag--amber' },
  { value: 'basic', label: t('foundation_course_2'), description: t('foundation_course_2'), tone: 'tag--indigo' },
]

const positionOptions = [
  'Goldman Sachs · IB Analyst · Hong Kong',
  'Morgan Stanley · IBD Analyst · New York',
  'McKinsey · Business Analyst · Shanghai',
]

const jobContentOptions = [t('technical'), t('behavioral_training'), t('new_resume_creation'), t('resume_update'), t('mock_interview_session'), t('interpersonal_skills_session'), t('mock_midterm_exam'), t('consulting_case_preparation'), t('other')]
const basicContentOptions = [t('technical'), t('behavioral_training'), t('new_resume_creation'), t('resume_update'), t('consulting_case_preparation'), t('other')]

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

const closeModal = () => {
  if (!props.modelValue) {
    return
  }

  emit('update:modelValue', false)
}

const handleSubmit = () => {
  emit('submit')
  closeModal()
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
  gap: 8px;
  margin-top: 8px;
}

.lm-course-type-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: #fff;
}

.lm-course-type-option input {
  width: 16px;
  height: 16px;
}

.course-type-copy {
  font-size: 13px;
  color: var(--text);
}

.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.tag--blue {
  background: #3b82f6;
}

.tag--green {
  background: #22c55e;
}

.tag--purple {
  background: #8b5cf6;
}

.tag--amber {
  background: #f59e0b;
}

.tag--indigo {
  background: #6366f1;
}

.feedback-card {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fafafa;
}

.feedback-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
  padding: 4px 12px;
  border-radius: 20px;
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.feedback-card__badge--blue {
  background: #3b82f6;
}

.feedback-card__badge--green {
  background: #22c55e;
}

.feedback-card__badge--purple {
  background: #8b5cf6;
}

.feedback-card__badge--amber {
  background: #f59e0b;
}

.upload-dropzone {
  display: flex;
  min-height: 108px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 2px dashed var(--border);
  border-radius: 8px;
  background: #fff;
  color: var(--muted);
  font-size: 12px;
}

.upload-dropzone .mdi-upload {
  font-size: 24px;
}

.performance-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(80px, 1fr));
  gap: 8px;
}

.performance-option {
  display: flex;
  min-width: 80px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: #fff;
  text-align: center;
}

.performance-option input {
  display: none;
}

.performance-option__emoji {
  font-size: 24px;
}

.performance-option__label {
  color: var(--muted);
  font-size: 11px;
}

.score-card {
  margin: 16px 0;
  padding: 16px;
  border-radius: 8px;
  background: #f3e8ff;
}

.score-card__title {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  color: #7c3aed;
  font-weight: 600;
}

.score-card__title .mdi-star {
  margin-right: 4px;
}

.lm-report-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 26px;
  background: #f8fafc;
  border-radius: 0 0 16px 16px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-outline {
  background: #fff;
  color: var(--text2);
  box-shadow: inset 0 0 0 1px var(--border);
}

.btn-primary {
  background: var(--primary-gradient);
  color: #fff;
  box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
}

@media (max-width: 960px) {
  .lm-report-shell {
    width: min(94%, 800px);
  }

  .form-grid,
  .status-grid,
  .performance-grid {
    grid-template-columns: 1fr;
  }
}
</style>

