<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="all-classes-detail-modal"
    :width="750"
    :body-class="'class-detail-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-file-document" aria-hidden="true" />
        <span>{{ headerTitle }}</span>
      </span>
    </template>

    <!-- Basic info 3x3 grid -->
    <section class="info-grid" :class="infoGridClass">
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.allClasses.modal.classId') }}</span>
        <div class="info-value info-value--bold">{{ detail?.classId || `C${detail?.recordId || '--'}` }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.allClasses.modal.source') }}</span>
        <div>
          <span class="source-badge" :style="sourceBadgeStyle">{{ detail?.sourceLabel || '--' }}</span>
        </div>
      </div>
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.allClasses.modal.status') }}</span>
        <div>
          <span class="status-tag" :class="`status-tag--${detail?.displayStatus}`">{{ detail?.displayStatusLabel || '--' }}</span>
        </div>
      </div>
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.allClasses.modal.mentor') }}</span>
        <div class="info-value">{{ detail?.mentorName || '--' }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.allClasses.modal.student') }}</span>
        <div class="info-value">{{ detail?.studentName || '--' }} {{ detail?.studentId ? `(ID: ${detail.studentId})` : '' }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.allClasses.modal.courseType') }}</span>
        <div>
          <span class="type-tag" :class="courseTypeTagClass">{{ detail?.courseTypeLabel || '--' }}</span>
        </div>
      </div>
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.allClasses.modal.date') }}</span>
        <div>{{ formatDate(detail?.classDate) }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.allClasses.modal.duration') }}</span>
        <div class="info-value info-value--bold">{{ detail?.durationHours != null ? t('admin.teaching.allClasses.modal.durationValue', { hours: detail.durationHours }) : '--' }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.allClasses.modal.fee') }}</span>
        <div class="info-value info-value--fee" :class="{ 'info-value--strikethrough': detail?.displayStatus === 'rejected' }">
          {{ detail?.courseFee ? `$${detail.courseFee}` : '--' }}
        </div>
      </div>
    </section>

    <!-- Course topic (entry / written / mock) -->
    <section v-if="detail?.topics && showTopicSection" class="detail-section">
      <label class="section-label">
        <span class="mdi mdi-tag section-label-icon" aria-hidden="true" />
        {{ t('admin.teaching.allClasses.modal.topics') }}
      </label>
      <div class="section-content">{{ detail.topics }}</div>
    </section>

    <!-- Mock interview feedback -->
    <section v-if="modalType === 'mock'" class="feedback-panel feedback-panel--mock">
      <div class="feedback-badge-row">
        <span class="feedback-badge feedback-badge--mock">
          <span class="mdi mdi-comment-text" aria-hidden="true" /> {{ t('admin.teaching.allClasses.modal.mockFeedback') }}
        </span>
      </div>
      <div class="feedback-meta-row">
        <div class="feedback-meta-item">
          <span class="info-label">{{ t('admin.teaching.allClasses.modal.performance') }}</span>
          <div class="feedback-meta-value feedback-meta-value--success">{{ detail?.performanceLabel || '--' }}</div>
        </div>
        <div class="feedback-meta-item">
          <span class="info-label">{{ t('admin.teaching.allClasses.modal.rate') }}</span>
          <div class="feedback-meta-value feedback-meta-value--star">{{ detail?.rate ? `⭐ ${detail.rate}` : '--' }}</div>
        </div>
      </div>
      <div v-if="detail?.feedbackPurpose" class="feedback-field">
        <label class="feedback-field-label">{{ t('admin.teaching.allClasses.modal.purpose') }}</label>
        <div class="feedback-field-content">{{ detail.feedbackPurpose }}</div>
      </div>
      <div v-if="detail?.feedbackKnowledge" class="feedback-field">
        <label class="feedback-field-label">{{ t('admin.teaching.allClasses.modal.knowledge') }}</label>
        <div class="feedback-field-content" v-html="nl2br(detail.feedbackKnowledge)" />
      </div>
      <div v-if="detail?.feedbackImprovement" class="feedback-field">
        <label class="feedback-field-label">{{ t('admin.teaching.allClasses.modal.improvement') }}</label>
        <div class="feedback-field-content" v-html="nl2br(detail.feedbackImprovement)" />
      </div>
      <div v-if="detail?.feedbackSuggestion" class="feedback-field">
        <label class="feedback-field-label">{{ t('admin.teaching.allClasses.modal.suggestion') }}</label>
        <div class="feedback-field-content">{{ detail.feedbackSuggestion }}</div>
      </div>
    </section>

    <!-- On-site interview feedback -->
    <section v-if="modalType === 'entry'" class="feedback-panel feedback-panel--entry">
      <div class="feedback-badge-row">
        <span class="feedback-badge feedback-badge--entry">
          <span class="mdi mdi-briefcase" aria-hidden="true" /> {{ t('admin.teaching.allClasses.modal.entryFeedback') }}
        </span>
      </div>
      <div v-if="detail?.feedbackPurpose" class="feedback-field">
        <label class="feedback-field-label">{{ t('admin.teaching.allClasses.modal.purpose') }}</label>
        <div class="feedback-field-content">{{ detail.feedbackPurpose }}</div>
      </div>
      <div v-if="detail?.feedbackKnowledge" class="feedback-field">
        <label class="feedback-field-label">{{ t('admin.teaching.allClasses.modal.knowledge') }}</label>
        <div class="feedback-field-content" v-html="nl2br(detail.feedbackKnowledge)" />
      </div>
      <div v-if="detail?.feedbackSuggestion" class="feedback-field">
        <label class="feedback-field-label">{{ t('admin.teaching.allClasses.modal.suggestion') }}</label>
        <div class="feedback-field-content">{{ detail.feedbackSuggestion }}</div>
      </div>
    </section>

    <!-- Mock midterm exam feedback -->
    <section v-if="modalType === 'midterm'" class="feedback-panel feedback-panel--midterm">
      <div class="feedback-badge-row">
        <span class="feedback-badge feedback-badge--midterm">
          <span class="mdi mdi-school" aria-hidden="true" /> {{ t('admin.teaching.allClasses.modal.midtermFeedback') }}
        </span>
      </div>
      <div class="midterm-scores">
        <div class="midterm-score-card">
          <div class="midterm-score-label">{{ t('admin.teaching.allClasses.modal.examScore') }}</div>
          <div class="midterm-score-value midterm-score-value--amber">{{ detail?.examScore ?? '--' }}</div>
        </div>
        <div class="midterm-score-card">
          <div class="midterm-score-label">{{ t('admin.teaching.allClasses.modal.performance') }}</div>
          <div class="midterm-score-value midterm-score-value--success">{{ detail?.performanceLabel || '--' }}</div>
        </div>
        <div class="midterm-score-card">
          <div class="midterm-score-label">{{ t('admin.teaching.allClasses.modal.rate') }}</div>
          <div class="midterm-score-value midterm-score-value--star">{{ detail?.rate ? `⭐ ${detail.rate}` : '--' }}</div>
        </div>
      </div>
      <div v-if="detail?.assessmentTopic" class="feedback-field">
        <label class="feedback-field-label">{{ t('admin.teaching.allClasses.modal.assessmentTopic') }}</label>
        <div class="feedback-field-content">{{ detail.assessmentTopic }}</div>
      </div>
      <div v-if="detail?.feedbackContent" class="feedback-field">
        <label class="feedback-field-label">{{ t('admin.teaching.allClasses.modal.detailFeedback') }}</label>
        <div class="feedback-field-content">{{ detail.feedbackContent }}</div>
      </div>
    </section>

    <!-- Networking assessment feedback -->
    <section v-if="modalType === 'networking'" class="feedback-panel feedback-panel--networking">
      <div class="feedback-badge-row">
        <span class="feedback-badge feedback-badge--networking">
          <span class="mdi mdi-account-group" aria-hidden="true" /> {{ t('admin.teaching.allClasses.modal.networkingFeedback') }}
        </span>
      </div>
      <div class="networking-scores">
        <div class="networking-score-card">
          <div class="networking-score-label">{{ t('admin.teaching.allClasses.modal.emailQuality') }}</div>
          <div class="networking-score-value">{{ detail?.emailQuality ?? '--' }}<span class="networking-score-base">/5</span></div>
        </div>
        <div class="networking-score-card">
          <div class="networking-score-label">{{ t('admin.teaching.allClasses.modal.emailEtiquette') }}</div>
          <div class="networking-score-value">{{ detail?.etiquetteScore ?? '--' }}<span class="networking-score-base">/5</span></div>
        </div>
        <div class="networking-score-card">
          <div class="networking-score-label">{{ t('admin.teaching.allClasses.modal.callQuality') }}</div>
          <div class="networking-score-value">{{ detail?.callQuality ?? '--' }}<span class="networking-score-base">/10</span></div>
        </div>
        <div class="networking-score-card">
          <div class="networking-score-label">{{ t('admin.teaching.allClasses.modal.selfIntro') }}</div>
          <div class="networking-score-value">{{ detail?.selfIntroScore ?? '--' }}<span class="networking-score-base">/10</span></div>
        </div>
        <div class="networking-score-card">
          <div class="networking-score-label">{{ t('admin.teaching.allClasses.modal.thankYou') }}</div>
          <div class="networking-score-value">{{ detail?.thankYouScore ?? '--' }}<span class="networking-score-base">/3</span></div>
        </div>
        <div class="networking-score-card">
          <div class="networking-score-label">{{ t('admin.teaching.allClasses.modal.recommend') }}</div>
          <div class="networking-score-value" :class="detail?.recommended ? 'networking-score-value--success' : ''">
            {{ detail?.recommended ? t('admin.teaching.allClasses.modal.recommendYes') : t('admin.teaching.allClasses.modal.recommendNo') }}
          </div>
        </div>
      </div>
      <div v-if="detail?.feedbackContent" class="feedback-field">
        <label class="feedback-field-label">{{ t('admin.teaching.allClasses.modal.additionalNotes') }}</label>
        <div class="feedback-field-content">{{ detail.feedbackContent }}</div>
      </div>
      <!-- Payment info -->
      <div v-if="detail?.displayStatus === 'paid'" class="payment-info">
        <span class="mdi mdi-check-circle" aria-hidden="true" /> {{ t('admin.teaching.allClasses.modal.paid') }}
        <span v-if="detail?.paidDate" class="payment-date">{{ t('admin.teaching.allClasses.modal.paidDate', { date: detail.paidDate }) }}</span>
      </div>
    </section>

    <!-- Written test coaching feedback -->
    <section v-if="modalType === 'written'" class="feedback-panel feedback-panel--written">
      <div class="feedback-badge-row">
        <span class="feedback-badge feedback-badge--written">
          <span class="mdi mdi-pencil" aria-hidden="true" /> {{ t('admin.teaching.allClasses.modal.writtenFeedback') }}
        </span>
      </div>
      <div v-if="detail?.feedbackPurpose" class="feedback-field">
        <label class="feedback-field-label">{{ t('admin.teaching.allClasses.modal.purpose') }}</label>
        <div class="feedback-field-content">{{ detail.feedbackPurpose }}</div>
      </div>
      <div v-if="detail?.feedbackKnowledge" class="feedback-field">
        <label class="feedback-field-label">{{ t('admin.teaching.allClasses.modal.knowledge') }}</label>
        <div class="feedback-field-content" v-html="nl2br(detail.feedbackKnowledge)" />
      </div>
      <div v-if="detail?.feedbackImprovement" class="feedback-field">
        <label class="feedback-field-label">{{ t('admin.teaching.allClasses.modal.improvement') }}</label>
        <div class="feedback-field-content" v-html="nl2br(detail.feedbackImprovement)" />
      </div>
      <div v-if="detail?.feedbackSuggestion" class="feedback-field">
        <label class="feedback-field-label">{{ t('admin.teaching.allClasses.modal.suggestion') }}</label>
        <div class="feedback-field-content">{{ detail.feedbackSuggestion }}</div>
      </div>
    </section>

    <!-- Rejection reason -->
    <section v-if="modalType === 'rejected'" class="feedback-panel feedback-panel--rejected">
      <div class="feedback-badge-row">
        <span class="feedback-badge feedback-badge--rejected">
          <span class="mdi mdi-close-circle" aria-hidden="true" /> {{ t('admin.teaching.allClasses.modal.rejectedReason') }}
        </span>
      </div>
      <div class="rejected-content">
        {{ detail?.reviewRemark || t('admin.teaching.allClasses.modal.noRejectedReason') }}
      </div>
      <div v-if="detail?.rejectedAt" class="rejected-meta">
        <span class="mdi mdi-clock" aria-hidden="true" /> {{ t('admin.teaching.allClasses.modal.rejectedMeta', { time: detail.rejectedAt, name: detail?.reviewerName || 'Admin' }) }}
      </div>
    </section>

    <!-- Review actions (entry / written pending) -->
    <section v-if="isPendingReview" class="review-section">
      <label class="review-label">
        <span class="mdi mdi-comment-edit" aria-hidden="true" /> {{ t('admin.teaching.allClasses.modal.reviewNote') }}
      </label>
      <a-textarea
        v-model:value="reviewRemark"
        :rows="2"
        :placeholder="t('admin.teaching.allClasses.modal.reviewNotePlaceholder')"
      />
    </section>

    <template #footer>
      <a-button @click="handleClose">{{ t('admin.teaching.allClasses.modal.close') }}</a-button>
      <template v-if="isPendingReview">
        <a-button danger @click="handleReject">
          <span class="mdi mdi-close" aria-hidden="true" style="margin-right:4px" />{{ t('admin.teaching.allClasses.modal.reject') }}
        </a-button>
        <a-button type="primary" @click="handleApprove">
          <span class="mdi mdi-check" aria-hidden="true" style="margin-right:4px" />{{ t('admin.teaching.allClasses.modal.approve') }}
        </a-button>
      </template>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { OverlaySurfaceModal } from '@osg/shared/components'
import type { AllClassesDetail } from '@osg/shared/api/admin/allClasses'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  visible: boolean
  detail?: AllClassesDetail | null
}>(), {
  detail: null
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  approve: [payload: { remark?: string }]
  reject: [payload: { remark?: string }]
}>()

const reviewRemark = ref('')

watch(() => props.visible, (val) => {
  if (val) reviewRemark.value = ''
})

const modalType = computed(() => props.detail?.modalType || 'entry')

const headerTitle = computed(() => {
  const ht = t as (k: string) => string
  const titleKey = `admin.teaching.allClasses.modal.headerTitle.${modalType.value}`
  if (props.detail?.displayStatus === 'pending') {
    if (modalType.value === 'entry') return ht('admin.teaching.allClasses.modal.headerTitle.reviewEntry')
    if (modalType.value === 'written') return ht('admin.teaching.allClasses.modal.headerTitle.reviewWritten')
  }
  const key = `admin.teaching.allClasses.modal.headerTitle.${modalType.value}`
  return ht(key) || t('admin.teaching.allClasses.modal.headerTitle.default')
})

const infoGridClass = computed(() => {
  if (props.detail?.displayStatus === 'pending') return 'info-grid--pending'
  if (props.detail?.displayStatus === 'rejected') return 'info-grid--rejected'
  return ''
})

const courseTypeTagClass = computed(() => {
  const map: Record<string, string> = {
    onboarding_interview: 'type-tag--info',
    mock_interview: 'type-tag--success',
    written_test: 'type-tag--purple',
    midterm_exam: 'type-tag--purple',
    communication_midterm: 'type-tag--violet',
    qbank_request: 'type-tag--warning'
  }
  return map[props.detail?.courseType || ''] || 'type-tag--info'
})

const sourceBadgeStyle = computed(() => {
  const colors: Record<string, string> = {
    mentor: '#5a7ba3',
    headteacher: '#059669',
    assistant: '#92400e'
  }
  const bg = colors[props.detail?.source || ''] || '#5a7ba3'
  return { background: bg, color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }
})

const showTopicSection = computed(() => {
  return ['entry', 'written', 'mock'].includes(modalType.value)
})

const isPendingReview = computed(() => {
  return props.detail?.displayStatus === 'pending' && ['entry', 'written'].includes(modalType.value)
})

const handleClose = () => {
  emit('update:visible', false)
}

const handleApprove = () => {
  emit('approve', { remark: reviewRemark.value.trim() || undefined })
}

const handleReject = () => {
  emit('reject', { remark: reviewRemark.value.trim() || undefined })
}

const formatDate = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const y = date.getFullYear()
  return `${m}/${d}/${y}`
}

const nl2br = (text: string) => {
  return text.replace(/\n/g, '<br>')
}
</script>

<style scoped lang="scss">
/* --- Info grid --- */
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 12px;
  background: var(--table-header-bg, #f8fafc);
}

.info-grid--pending {
  background: #fef3c7;
  border: 1px solid #fcd34d;
}

.info-grid--rejected {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.info-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  color: var(--text-secondary, #64748b);
  font-size: 12px;
}

.info-value {
  font-weight: 500;
}

.info-value--bold {
  font-weight: 600;
}

.info-value--fee {
  font-weight: 700;
  color: var(--primary, #3b82f6);
}

.info-value--strikethrough {
  color: var(--text-secondary, #64748b);
  text-decoration: line-through;
}

/* --- Tags --- */
.type-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.type-tag--info { background: #dbeafe; color: #1d4ed8; }
.type-tag--success { background: #dcfce7; color: #166534; }
.type-tag--purple { background: #ede9fe; color: #6d28d9; }
.type-tag--violet { background: #f3e8ff; color: #7c3aed; }
.type-tag--warning { background: #fef3c7; color: #92400e; }

.status-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-tag--pending { background: #fef3c7; color: #92400e; }
.status-tag--unpaid { background: #dbeafe; color: #1d4ed8; }
.status-tag--paid { background: #dcfce7; color: #166534; }
.status-tag--rejected { background: #fee2e2; color: #b91c1c; }

.source-badge {
  display: inline-flex;
  font-size: 12px;
}

/* --- Detail section --- */
.detail-section {
  margin-top: 16px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  margin-bottom: 8px;
}

.section-label-icon {
  color: var(--primary, #3b82f6);
}

.section-content {
  padding: 12px;
  background: var(--table-header-bg, #f8fafc);
  border-radius: 8px;
  border: 1px solid var(--border, #e2e8f0);
}

/* --- Feedback panels --- */
.feedback-panel {
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
}

.feedback-panel--mock { background: #ecfdf5; border: 1px solid #86efac; }
.feedback-panel--entry { background: #eff6ff; border: 1px solid #93c5fd; }
.feedback-panel--midterm { background: #fef3c7; border: 1px solid #fcd34d; }
.feedback-panel--networking { background: #f3e8ff; border: 1px solid #c4b5fd; }
.feedback-panel--written { background: #fce7f3; border: 1px solid #f9a8d4; }
.feedback-panel--rejected { background: #fef2f2; border: 1px solid #fecaca; }

.feedback-badge-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.feedback-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.feedback-badge--mock { background: #22c55e; }
.feedback-badge--entry { background: #3b82f6; }
.feedback-badge--midterm { background: #f59e0b; }
.feedback-badge--networking { background: #8b5cf6; }
.feedback-badge--written { background: #ec4899; }
.feedback-badge--rejected { background: #ef4444; }

.feedback-meta-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.feedback-meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feedback-meta-value {
  font-weight: 600;
}

.feedback-meta-value--success { color: #22c55e; }
.feedback-meta-value--star { color: #f59e0b; }

.feedback-field {
  margin-bottom: 12px;
}

.feedback-field:last-child {
  margin-bottom: 0;
}

.feedback-field-label {
  font-size: 12px;
  color: var(--text-secondary, #64748b);
  display: block;
  margin-bottom: 4px;
}

.feedback-field-content {
  padding: 10px;
  background: #fff;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.6;
}

/* --- Midterm scores --- */
.midterm-scores {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.midterm-score-card {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}

.midterm-score-label {
  font-size: 12px;
  color: var(--text-secondary, #64748b);
}

.midterm-score-value {
  font-weight: 700;
  margin-top: 4px;
}

.midterm-score-value--amber { font-size: 28px; color: #f59e0b; }
.midterm-score-value--success { font-size: 18px; color: #22c55e; }
.midterm-score-value--star { font-size: 18px; color: #f59e0b; }

/* --- Networking scores --- */
.networking-scores {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.networking-score-card {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}

.networking-score-label {
  font-size: 11px;
  color: var(--text-secondary, #64748b);
}

.networking-score-value {
  font-size: 24px;
  font-weight: 700;
  color: #8b5cf6;
  margin-top: 4px;
}

.networking-score-value--success {
  color: #22c55e;
  font-size: 18px;
}

.networking-score-base {
  font-size: 12px;
  color: var(--text-secondary, #64748b);
}

/* --- Payment info --- */
.payment-info {
  margin-top: 16px;
  padding: 12px 16px;
  background: #ecfdf5;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #059669;
  font-size: 13px;
}

.payment-date {
  color: var(--text-secondary, #64748b);
  font-size: 12px;
}

/* --- Rejected content --- */
.rejected-content {
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  color: #dc2626;
}

.rejected-meta {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-secondary, #64748b);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* --- Review section --- */
.review-section {
  margin-top: 20px;
  padding: 16px;
  background: #fffbeb;
  border-radius: 12px;
  border: 1px solid #fcd34d;
}

.review-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 8px;
}

</style>
