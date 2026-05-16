<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="mock-practice-feedback-modal"
    width="720px"
    :body-class="'mock-practice-feedback-modal__body osg-modal-form'"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-message-text-outline" aria-hidden="true"></span>
        <span>{{ t('admin.career.mockPractice.feedbackModal.title') }}</span>
      </span>
    </template>

    <section class="mock-practice-feedback-modal__hero">
      <div class="mock-practice-feedback-modal__avatar">{{ studentInitials }}</div>
      <div class="mock-practice-feedback-modal__hero-copy">
        <strong>{{ row?.studentName || t('admin.career.mockPractice.feedbackModal.pendingStudent') }}</strong>
        <span>ID {{ row?.studentId || '--' }}</span>
        <span>{{ practiceTypeLabel }}</span>
      </div>
      <div class="mock-practice-feedback-modal__hero-meta">
        <span class="mock-practice-feedback-modal__rating">{{ feedbackRatingLabel }}</span>
        <span class="mock-practice-feedback-modal__status">{{ statusLabel }}</span>
      </div>
    </section>

    <section class="mock-practice-feedback-modal__summary-grid">
      <article class="mock-practice-feedback-modal__metric">
        <span>{{ t('admin.career.mockPractice.feedbackModal.fields.mentor') }}</span>
        <strong>{{ row?.mentorNames || t('admin.career.mockPractice.feedbackModal.pending') }}</strong>
      </article>
      <article class="mock-practice-feedback-modal__metric">
        <span>{{ t('admin.career.mockPractice.feedbackModal.fields.mentorBackground') }}</span>
        <strong>{{ row?.mentorBackgrounds || '—' }}</strong>
      </article>
      <article class="mock-practice-feedback-modal__metric">
        <span>{{ t('admin.career.mockPractice.feedbackModal.fields.completedHours') }}</span>
        <strong>{{ row?.completedHours ?? 0 }} hrs</strong>
      </article>
      <article class="mock-practice-feedback-modal__metric">
        <span>{{ t('admin.career.mockPractice.feedbackModal.fields.scheduledAt') }}</span>
        <strong>{{ scheduledAtLabel }}</strong>
      </article>
    </section>

    <section class="mock-practice-feedback-modal__section">
      <label class="mock-practice-feedback-modal__label">{{ t('admin.career.mockPractice.feedbackModal.feedbackLabel') }}</label>
      <div class="mock-practice-feedback-modal__panel">{{ row?.feedbackSummary || t('admin.career.mockPractice.feedbackModal.noFeedback') }}</div>
    </section>

    <section v-if="row?.note" class="mock-practice-feedback-modal__section">
      <label class="mock-practice-feedback-modal__label">{{ t('admin.career.mockPractice.feedbackModal.noteLabel') }}</label>
      <div class="mock-practice-feedback-modal__panel mock-practice-feedback-modal__panel--muted">{{ row.note }}</div>
    </section>

    <template #footer>
      <a-button @click="handleClose">{{ t('admin.career.mockPractice.feedbackModal.close') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { OverlaySurfaceModal } from '@osg/shared/components'
import type { MockPracticeListItem } from '@osg/shared/api/admin/mockPractice'
// §D.2 admin mock-practice 反馈模态状态显示接入 SSOT composable
import { deriveMockPracticeStatus } from '@osg/shared/composables'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  visible: boolean
  row?: MockPracticeListItem | null
}>(), {
  row: null
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const studentInitials = computed(() => {
  const value = props.row?.studentName || t('admin.career.mockPractice.studentFallback')
  return value.slice(0, 2).toUpperCase()
})

const practiceTypeLabel = computed(() => {
  const value = props.row?.practiceType
  if (value === 'mock_interview') return t('admin.career.mockPractice.type.mockInterview')
  if (value === 'communication_test') return t('admin.career.mockPractice.type.communicationTest')
  if (value === 'midterm_exam') return t('admin.career.mockPractice.type.midtermExam')
  return t('admin.career.mockPractice.type.default')
})

/** §D.2 接入 deriveMockPracticeStatus（保留 'scheduled' → '已安排' 兼容映射） */
const statusLabel = computed(() => {
  const value = props.row?.status
  if (value === 'scheduled') return t('admin.career.mockPractice.status.scheduled')
  const display = deriveMockPracticeStatus({
    status: value,
    completedHours: props.row?.completedHours,
  })
  return display.label || t('admin.career.mockPractice.status.pending')
})

const feedbackRatingLabel = computed(() => {
  const feedbackRating = props.row?.feedbackRating
  return feedbackRating ? `${feedbackRating}/5` : t('admin.career.mockPractice.feedbackModal.noRating')
})

const scheduledAtLabel = computed(() => formatDateTime(props.row?.scheduledAt))

const handleClose = () => {
  emit('update:visible', false)
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<style scoped lang="scss">
.mock-practice-feedback-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.mock-practice-feedback-modal__hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid #dbeafe;
  background: linear-gradient(145deg, rgba(239, 246, 255, 0.96), rgba(240, 253, 250, 0.96));
}

.mock-practice-feedback-modal__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0f766e, #3b82f6);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.mock-practice-feedback-modal__hero-copy,
.mock-practice-feedback-modal__hero-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mock-practice-feedback-modal__hero-copy strong {
  color: #0f172a;
  font-size: 16px;
}

.mock-practice-feedback-modal__hero-copy span,
.mock-practice-feedback-modal__hero-meta span {
  color: #64748b;
  font-size: 12px;
}

.mock-practice-feedback-modal__hero-meta {
  align-items: flex-end;
}

.mock-practice-feedback-modal__rating,
.mock-practice-feedback-modal__status {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-weight: 600;
}

.mock-practice-feedback-modal__rating {
  background: #fef3c7;
  color: #92400e;
}

.mock-practice-feedback-modal__status {
  background: #ecfeff;
  color: #0f766e;
}

.mock-practice-feedback-modal__summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.mock-practice-feedback-modal__metric {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 88px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.mock-practice-feedback-modal__metric span {
  color: #64748b;
  font-size: 12px;
}

.mock-practice-feedback-modal__metric strong {
  color: #0f172a;
  font-size: 14px;
}

.mock-practice-feedback-modal__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mock-practice-feedback-modal__label {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.mock-practice-feedback-modal__panel {
  padding: 14px 16px;
  border-radius: 12px;
  background: #f8fafc;
  color: #334155;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.mock-practice-feedback-modal__panel--muted {
  color: #475569;
}

@media (max-width: 900px) {
  .mock-practice-feedback-modal__hero {
    grid-template-columns: 1fr;
  }

  .mock-practice-feedback-modal__hero-meta {
    align-items: flex-start;
  }

  .mock-practice-feedback-modal__summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .mock-practice-feedback-modal__summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
