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
          <select class="form-select">
            <option value="">请选择学员</option>
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
              <input class="form-input" type="date" value="2026-03-20" />
            </div>
            <div class="form-group form-group--compact">
              <label class="form-label">
                学习时长
                <span class="required">*</span>
              </label>
              <div class="inline-field">
                <input class="form-input form-input--short" type="number" value="1" min="0.5" step="0.5" />
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
            <label class="status-card status-card--success">
              <input type="radio" name="student-status" checked />
              <div class="status-card__copy">
                <div class="status-card__title">
                  <i class="mdi mdi-check-circle" aria-hidden="true" />
                  正常上课
                </div>
                <div class="status-card__sub">学员按时参加课程</div>
              </div>
            </label>
            <label class="status-card status-card--danger">
              <input type="radio" name="student-status" />
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
            <textarea class="form-textarea form-textarea--short" rows="2" placeholder="请简要说明旷课情况（可选）..." />
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
              <input type="radio" name="course-type" :checked="courseType.value === 'job-coaching'" />
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
          <select class="form-select">
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
          <select class="form-select">
            <option value="">请选择课程内容类型</option>
            <option v-for="option in jobContentOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-format-list-bulleted" aria-hidden="true" />
            基础课内容类型
            <span class="required">*</span>
          </label>
          <select class="form-select">
            <option value="">请选择基础课内容类型</option>
            <option v-for="option in basicContentOptions" :key="option" :value="option">{{ option }}</option>
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
            <textarea class="form-textarea" rows="4" placeholder="请详细描述本次课程内容和学员表现..." />
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
            <textarea class="form-textarea" rows="3" placeholder="请描述简历修改的主要内容和建议..." />
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
            <textarea class="form-textarea" rows="3" placeholder="请详细描述学员在模拟面试中的表现..." />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              模拟面试的目的是什么？
              <span class="required">*</span>
            </label>
            <textarea class="form-textarea form-textarea--short" rows="2" placeholder="请描述本次模拟面试的目的..." />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              你们在这次课程中主要研究了哪些概念和主题？
              <span class="required">*</span>
            </label>
            <textarea class="form-textarea form-textarea--short" rows="2" placeholder="请列出本次课程涉及的概念和主题..." />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              这名学生哪科考的不好？
              <span class="required">*</span>
            </label>
            <textarea class="form-textarea form-textarea--short" rows="2" placeholder="请描述学员需要改进的方面..." />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              您如何评价这名学生的表现？
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
            人际关系期中考试反馈
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">
              课程反馈
              <span class="required">*</span>
            </label>
            <textarea class="form-textarea" rows="3" placeholder="请详细描述学员在人际关系测试中的表现..." />
          </div>
          <div class="score-card">
            <div class="score-card__title">
              <i class="mdi mdi-star" aria-hidden="true" />
              评分项目
            </div>
            <div class="form-grid">
              <div v-for="field in networkingScores" :key="field.label" class="form-group form-group--compact">
                <label class="form-label">{{ field.label }}</label>
                <select class="form-select">
                  <option value="">请选择</option>
                  <option v-for="option in field.options" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
            </div>
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">是否推荐这位学生？</label>
            <select class="form-select">
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
            <textarea class="form-textarea" rows="3" placeholder="请详细描述学员在模拟期中考试中的表现..." />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">该学生得了多少分？</label>
            <div class="inline-field">
              <input class="form-input form-input--short" type="number" placeholder="0" min="0" max="100" />
              <span class="inline-field__suffix">分</span>
            </div>
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">逐题分析</label>
            <textarea class="form-textarea" rows="4" placeholder="请详细分析学员在每道题目上的表现..." />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">学生进度评估</label>
            <select class="form-select">
              <option value="">请选择</option>
              <option v-for="option in progressOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
        </section>
      </div>

      <div class="lm-report-footer modal-footer">
        <button type="button" class="btn btn-outline" @click="closeModal">取消</button>
        <button type="button" class="btn btn-primary" @click="handleSubmit">
          <i class="mdi mdi-check" aria-hidden="true" />
          提交记录
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  { value: 'job-coaching', label: '岗位辅导', description: '岗位辅导的课程', tone: 'tag--blue' },
  { value: 'mock-interview', label: '模拟面试', description: '模拟面试的课程', tone: 'tag--green' },
  { value: 'networking', label: '人际关系', description: '人际关系的课程', tone: 'tag--purple' },
  { value: 'mock-midterm', label: '模拟期中', description: '模拟期中考试', tone: 'tag--amber' },
  { value: 'basic', label: '基础课程', description: '基础课程', tone: 'tag--indigo' },
]

const positionOptions = [
  'Goldman Sachs · IB Analyst · Hong Kong',
  'Morgan Stanley · IBD Analyst · New York',
  'McKinsey · Business Analyst · Shanghai',
]

const jobContentOptions = ['技术的', '行为训练', '新简历制作', '简历更新', '模拟面试的课程', '人际关系的课程', '模拟期中考试', '咨询案例准备', '其他']
const basicContentOptions = ['技术的', '行为训练', '新简历制作', '简历更新', '咨询案例准备', '其他']

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
