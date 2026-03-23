<template>
  <div
    v-if="modelValue && preview"
    class="lead-mock-feedback-modal modal"
    data-surface-id="modal-lead-mock-feedback"
  >
    <button
      type="button"
      class="lead-mock-feedback-backdrop"
      data-surface-part="backdrop"
      aria-label="关闭模拟反馈弹层"
      @click="closeModal"
    />

    <div
      class="lead-mock-feedback-shell modal-content"
      data-surface-part="shell"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="lead-mock-feedback-header modal-header" data-surface-part="header">
        <span :id="titleId" class="lead-mock-feedback-title modal-title">
          <i class="mdi mdi-comment-check" aria-hidden="true" />
          查看模拟反馈
        </span>
        <button
          type="button"
          class="modal-close"
          data-surface-part="close-control"
          aria-label="关闭模拟反馈弹层"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <div class="lead-mock-feedback-body modal-body" data-surface-part="body">
        <section class="feedback-hero">
          <div class="feedback-avatar" :style="{ background: preview.avatarColor || '#22C55E' }">
            {{ preview.studentName }}
          </div>
          <div class="feedback-hero__copy">
            <div class="feedback-hero__title">{{ preview.studentName }} · {{ preview.practiceType }}</div>
            <div class="feedback-hero__meta">
              {{ preview.companyName }} · {{ preview.sessionTime }} · 导师: {{ preview.mentorName }}
            </div>
          </div>
          <span class="tag tag--success">{{ preview.status }}</span>
        </section>

        <section class="score-card">
          <div class="score-card__number">
            <div class="score-card__value">{{ preview.score }}</div>
            <div class="score-card__unit">/ 5 分</div>
          </div>
          <div class="score-card__divider" />
          <div class="score-card__copy">
            <div class="score-card__label">{{ preview.scoreLabel }}</div>
            <div class="score-card__duration">实际时长: {{ preview.actualDuration }}</div>
          </div>
        </section>

        <section class="content-card">
          <div class="section-title section-title--primary">
            <i class="mdi mdi-comment-text" aria-hidden="true" />
            详细反馈
          </div>
          <p>{{ preview.feedback }}</p>
        </section>

        <section class="content-card content-card--warning">
          <div class="section-title section-title--warning">
            <i class="mdi mdi-lightbulb" aria-hidden="true" />
            改进建议
          </div>
          <ul>
            <li v-for="suggestion in preview.suggestions" :key="suggestion">{{ suggestion }}</li>
          </ul>
        </section>

        <section class="recommendation-card">
          <i class="mdi mdi-check-circle" aria-hidden="true" />
          <span>{{ preview.recommendation }}</span>
        </section>
      </div>

      <div class="lead-mock-feedback-footer modal-footer">
        <button type="button" class="btn btn-outline" @click="closeModal">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface MockFeedbackPreview {
  studentName: string
  practiceType: string
  companyName: string
  sessionTime: string
  mentorName: string
  status: string
  score: number
  scoreLabel: string
  actualDuration: string
  feedback: string
  suggestions: string[]
  recommendation: string
  avatarColor?: string
}

defineProps<{
  modelValue: boolean
  preview: MockFeedbackPreview | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const titleId = 'lead-mock-feedback-modal-title'

const closeModal = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.lead-mock-feedback-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.lead-mock-feedback-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.5);
  cursor: pointer;
}

.lead-mock-feedback-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(700px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  margin: 24px auto;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
}

.lead-mock-feedback-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  background: linear-gradient(135deg, #22C55E, #16A34A);
  border-radius: 16px 16px 0 0;
}

.lead-mock-feedback-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}

.modal-close {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}

.lead-mock-feedback-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  overflow-y: auto;
}

.feedback-hero {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #F0FDF4;
  border-radius: 10px;
}

.feedback-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.feedback-hero__copy {
  flex: 1;
  min-width: 0;
}

.feedback-hero__title {
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
}

.feedback-hero__meta {
  margin-top: 4px;
  color: var(--muted);
  font-size: 13px;
}

.score-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #DCFCE7, #BBF7D0);
  border-radius: 12px;
}

.score-card__number {
  text-align: center;
}

.score-card__value {
  color: #166534;
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
}

.score-card__unit,
.score-card__duration {
  color: #166534;
  font-size: 14px;
}

.score-card__divider {
  width: 1px;
  height: 60px;
  background: #86EFAC;
}

.score-card__label {
  color: #166534;
  font-size: 18px;
  font-weight: 600;
}

.content-card {
  padding: 20px;
  background: #FAFAFA;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.content-card--warning {
  background: #FEF3C7;
  border-color: #FDE68A;
}

.content-card p,
.content-card ul {
  margin: 0;
  color: var(--text);
  font-size: 14px;
  line-height: 1.8;
}

.content-card ul {
  padding-left: 20px;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
}

.section-title--primary {
  color: var(--primary);
}

.section-title--warning {
  color: #92400E;
}

.recommendation-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #DCFCE7;
  border-radius: 10px;
  color: #166534;
  font-size: 15px;
  font-weight: 600;
}

.recommendation-card .mdi {
  font-size: 24px;
}

.lead-mock-feedback-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 26px;
  background: #F8FAFC;
  border-radius: 0 0 16px 16px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-outline {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text2);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.tag--success {
  background: #DCFCE7;
  color: #166534;
}

@media (max-width: 768px) {
  .lead-mock-feedback-shell {
    width: calc(100vw - 20px);
    margin: 10px auto;
  }

  .lead-mock-feedback-header,
  .lead-mock-feedback-body,
  .lead-mock-feedback-footer {
    padding-left: 18px;
    padding-right: 18px;
  }

  .feedback-hero,
  .score-card {
    flex-direction: column;
    text-align: center;
  }

  .score-card__divider {
    width: 100%;
    height: 1px;
  }
}
</style>
