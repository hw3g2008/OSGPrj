<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="report-review-detail-modal"
    :width="700"
    :body-class="'report-review-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-file-document" aria-hidden="true" />
        <span>{{ t('admin.teaching.reports.modal.title') }}</span>
        <span class="modal-title-sub">Report #{{ detail?.recordId || '--' }}</span>
      </span>
    </template>

    <!-- 基本信息 3x3 网格 -->
    <section class="info-grid">
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.reports.modal.mentor') }}</span>
        <div class="info-value">{{ detail?.mentorName || '--' }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.reports.modal.student') }}</span>
        <div class="info-value">{{ detail?.studentName || '--' }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.reports.modal.status') }}</span>
        <div>
          <span :class="['status-tag', `status-tag--${statusTone(detail?.status)}`]">
            {{ formatStatus(detail?.status) }}
          </span>
        </div>
      </div>
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.reports.modal.courseType') }}</span>
        <div>{{ detail?.courseType || '--' }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.reports.modal.date') }}</span>
        <div>{{ formatDate(detail?.classDate) }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">{{ t('admin.teaching.reports.modal.duration') }}</span>
        <div>{{ formatHours(detail?.durationHours) }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">Class ID</span>
        <div>{{ detail?.classId || '--' }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">Class Status</span>
        <div>
          <span class="status-tag status-tag--info">{{ detail?.classStatus || 'Normal' }}</span>
        </div>
      </div>
      <div class="info-cell">
        <span class="info-label">Rate</span>
        <div>{{ detail?.rate || '--' }}</div>
      </div>
    </section>

    <!-- Topics -->
    <section class="detail-section">
      <label class="section-label">Topics</label>
      <div class="section-content">{{ detail?.topics || '--' }}</div>
    </section>

    <!-- Comments -->
    <section class="detail-section">
      <label class="section-label">Comments</label>
      <div class="section-content">{{ detail?.comments || '--' }}</div>
    </section>

    <!-- 课程反馈内容 -->
    <section class="detail-section">
      <label class="section-label">{{ t('admin.teaching.reports.modal.feedbackLabel') }}</label>
      <div class="section-content section-content--tall">{{ detail?.feedbackContent || t('admin.teaching.reports.modal.noFeedback') }}</div>
    </section>

    <!-- 审核备注 -->
    <section class="detail-section">
      <label class="section-label">{{ t('admin.teaching.reports.modal.reviewNote') }}</label>
      <a-textarea
        v-model:value="remark"
        :rows="3"
        :placeholder="t('admin.teaching.reports.modal.reviewNotePlaceholder')"
      />
    </section>

    <template #footer>
      <a-button @click="handleClose">{{ t('admin.teaching.reports.modal.close') }}</a-button>
      <a-button danger :disabled="submitting" @click="handleReject">
        <span class="mdi mdi-close" aria-hidden="true" style="margin-right:4px" />{{ t('admin.teaching.reports.modal.reject') }}
      </a-button>
      <a-button type="primary" :disabled="submitting" @click="handleApprove">
        <span class="mdi mdi-check" aria-hidden="true" style="margin-right:4px" />{{ t('admin.teaching.reports.modal.approve') }}
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { OverlaySurfaceModal } from '@osg/shared/components'
import type { ReportRow } from '@osg/shared/api/admin/report'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  visible: boolean
  detail?: ReportRow | null
  submitting?: boolean
}>(), {
  detail: null,
  submitting: false
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  approve: [payload: { remark?: string }]
  reject: [payload: { remark?: string }]
}>()

const remark = ref('')

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      remark.value = props.detail?.reviewRemark || ''
    }
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:visible', false)
}

const buildPayload = () => ({
  remark: remark.value.trim() || undefined
})

const handleApprove = () => {
  emit('approve', buildPayload())
}

const handleReject = () => {
  emit('reject', buildPayload())
}

const formatDate = (value?: string | null) => {
  if (!value) return '--'
  return value.replace('T', ' ').slice(0, 10)
}

const formatHours = (value?: number | null) => {
  if (value === undefined || value === null) return '--'
  return `${value.toFixed(2)}h`
}

const formatStatus = (value?: string | null) => {
  if (!value) return '--'
  if (value === 'approved') return t('admin.teaching.reports.status.approved')
  if (value === 'rejected') return t('admin.teaching.reports.status.rejected')
  return t('admin.teaching.reports.status.pending')
}

const statusTone = (value?: string | null) => {
  if (!value) return 'info'
  const map: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return map[value] || 'info'
}
</script>

<style scoped lang="scss">
.modal-title-sub {
  color: var(--text-secondary, #64748b);
  font-size: 14px;
  font-weight: 400;
}

/* --- Info grid --- */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
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

/* --- Tags --- */
.status-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-tag--warning { background: #fef3c7; color: #92400e; }
.status-tag--success { background: #dcfce7; color: #166534; }
.status-tag--danger { background: #fee2e2; color: #b91c1c; }
.status-tag--info { background: #dbeafe; color: #1d4ed8; }

/* --- Sections --- */
.detail-section {
  margin-bottom: 16px;
}

.section-label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary, #1e293b);
}

.section-content {
  padding: 12px;
  background: var(--body-bg, #f1f5f9);
  border-radius: 8px;
}

.section-content--tall {
  min-height: 80px;
}

</style>
