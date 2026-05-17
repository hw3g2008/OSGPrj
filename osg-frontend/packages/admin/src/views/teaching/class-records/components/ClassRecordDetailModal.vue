<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-class-record-detail"
    :width="760"
    :body-class="'class-record-detail-modal__body osg-modal-form'"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-file-document-outline" aria-hidden="true"></span>
        <span>{{ t('admin.teaching.classRecords.detailModal.title') }}</span>
        <span class="class-record-detail-modal__title-sub">#{{ detail?.recordId || '--' }}</span>
      </span>
    </template>

    <div v-if="loading" class="class-record-detail-modal__loading">
      <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
      <span>{{ t('admin.teaching.classRecords.detailModal.loading') }}</span>
    </div>

    <template v-else>
      <section class="class-record-detail-modal__summary">
        <div class="class-record-detail-modal__status-row">
          <a-tag :color="statusTagColor(detail?.status)">{{ formatStatus(detail?.status) }}</a-tag>
          <span class="class-record-detail-modal__record-id">#{{ detail?.recordId || '--' }}</span>
        </div>
        <div class="class-record-detail-modal__grid">
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">{{ t('admin.teaching.classRecords.fields.student') }}</span>
            <strong>{{ detail?.studentName || '--' }} <span v-if="detail?.studentId" class="class-record-detail-modal__sub-text">({{ detail.studentId }})</span></strong>
          </div>
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">{{ t('admin.teaching.classRecords.fields.reporter') }}</span>
            <strong>{{ detail?.mentorName || '--' }} <a-tag v-if="detail?.courseSource" size="small" color="blue">{{ normalizeSourceLabel(detail.courseSource) }}</a-tag></strong>
          </div>
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">{{ t('admin.teaching.classRecords.fields.coachingContent') }}</span>
            <strong>{{ normalizeCourseType(detail?.courseType) }}<span v-if="detail?.coachingCompany" class="class-record-detail-modal__company"> {{ detail.coachingCompany }}</span></strong>
          </div>
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">{{ t('admin.teaching.classRecords.fields.courseContent') }}</span>
            <strong><a-tag v-if="detail?.classStatus" color="processing">{{ normalizeClassStatusLabel(detail.classStatus) }}</a-tag><span v-else>--</span></strong>
          </div>
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">{{ t('admin.teaching.classRecords.fields.classDate') }}</span>
            <strong>{{ formatDate(detail?.classDate) }}</strong>
          </div>
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">{{ t('admin.teaching.classRecords.fields.duration') }}</span>
            <strong>{{ detail?.durationHours ? t('admin.teaching.classRecords.fields.durationValue', { hours: detail.durationHours }) : '--' }}</strong>
          </div>
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">{{ t('admin.teaching.classRecords.fields.fee') }}</span>
            <strong class="class-record-detail-modal__fee">{{ formatFee(detail?.courseFee) }}</strong>
          </div>
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">{{ t('admin.teaching.classRecords.fields.submitTime') }}</span>
            <strong>{{ formatDateTime(detail?.submittedAt) }}</strong>
          </div>
        </div>
      </section>

      <section v-if="detail?.feedbackContent" class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__section-title">{{ t('admin.teaching.classRecords.fields.feedback') }}</span>
        <div class="class-record-detail-modal__content">{{ detail.feedbackContent }}</div>
      </section>

      <section class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__section-title">{{ t('admin.teaching.classRecords.fields.attachments') }}</span>
        <div v-if="detail?.attachments && detail.attachments.length > 0" class="class-record-detail-modal__attachments">
          <div v-for="att in detail.attachments" :key="att.attachmentId" class="class-record-detail-modal__att-card" @click="handleDownload(att.filePath)">
            <span class="mdi mdi-file-pdf-box class-record-detail-modal__att-icon" aria-hidden="true"></span>
            <div class="class-record-detail-modal__att-info">
              <span class="class-record-detail-modal__att-name">{{ att.fileName || t('admin.teaching.classRecords.fields.unnamedFile') }}</span>
              <span class="class-record-detail-modal__att-size">{{ formatFileSize(att.fileSize) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="class-record-detail-modal__empty">{{ t('admin.teaching.classRecords.fields.noAttachments') }}</div>
      </section>

      <section v-if="detail?.rate" class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__section-title">{{ t('admin.teaching.classRecords.fields.studentRating') }}</span>
        <div>⭐ {{ detail.rate }}</div>
      </section>

      <section v-if="detail?.topics" class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__section-title">Topics</span>
        <div class="class-record-detail-modal__content">{{ detail.topics }}</div>
      </section>

      <section v-if="detail?.comments" class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__section-title">Comments</span>
        <div class="class-record-detail-modal__content">{{ detail.comments }}</div>
      </section>

      <section class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__section-title">{{ t('admin.teaching.classRecords.fields.reviewResult') }}</span>
        <div class="class-record-detail-modal__review-result">
          <a-tag :color="statusTagColor(detail?.status)">{{ formatStatus(detail?.status) }}</a-tag>
          <span v-if="detail?.reviewRemark" class="class-record-detail-modal__content">{{ detail.reviewRemark }}</span>
          <span v-else style="color:#64748b">{{ t('admin.teaching.classRecords.fields.noReviewRemark') }}</span>
        </div>
      </section>
    </template>

    <template #footer>
      <a-button @click="handleClose">{{ t('admin.teaching.classRecords.detailModal.close') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { OverlaySurfaceModal } from '@osg/shared/components'
import type { ReportRow } from '@osg/shared/api/admin/report'

const { t } = useI18n()

defineProps<{
  visible: boolean
  detail?: ReportRow | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const handleClose = () => {
  emit('update:visible', false)
}

const formatDate = (value?: string | null) => {
  if (!value) return '--'
  return value.replace('T', ' ').slice(0, 10)
}

const formatStatus = (value?: string | null) => {
  if (!value) return '--'
  if (value === 'approved') return t('admin.teaching.classRecords.status.approved')
  if (value === 'rejected') return t('admin.teaching.classRecords.status.rejected')
  return t('admin.teaching.classRecords.status.pending')
}

const statusTagColor = (value?: string | null) => {
  if (value === 'approved') return 'success'
  if (value === 'rejected') return 'error'
  return 'warning'
}

const normalizeCourseType = (v?: string | null) => {
  if (!v) return '--'
  if (v.toLowerCase().includes('mock') || v === 'mock_practice') return t('admin.teaching.classRecords.courseTypes.mock')
  if (v.toLowerCase().includes('position') || v === 'position_coaching') return t('admin.teaching.classRecords.courseTypes.position')
  return v
}

const normalizeSourceLabel = (v?: string | null) => {
  if (!v) return '--'
  if (v === 'mentor') return t('admin.teaching.classRecords.sources.mentor')
  if (v === 'headteacher') return t('admin.teaching.classRecords.sources.headteacher')
  if (v === 'assistant') return t('admin.teaching.classRecords.sources.assistant')
  return v
}

// class_status raw enum (后端 OsgClassRecordServiceImpl.deriveClassStatus 派生) → 本地化 label
const normalizeClassStatusLabel = (v?: string | null) => {
  if (!v) return '--'
  const key = `admin.teaching.classRecords.classStatus.${v.trim().toLowerCase()}`
  const label = t(key)
  return label === key ? v : label
}

const formatFee = (v?: string | null) => {
  if (!v) return '--'
  const num = parseFloat(v)
  if (isNaN(num)) return '--'
  return `¥${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)}`
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '--'
  return value.replace('T', ' ').slice(0, 16)
}

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const handleDownload = (filePath?: string) => {
  if (!filePath) return
  const url = `/common/download/resource?resource=${encodeURIComponent(filePath)}`
  window.open(url, '_blank')
}
</script>

<style scoped lang="scss">
.class-record-detail-modal__body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.class-record-detail-modal__title-sub {
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
}

.class-record-detail-modal__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  gap: 8px;
  color: #64748b;
}

.class-record-detail-modal__summary {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.class-record-detail-modal__status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.class-record-detail-modal__record-id {
  color: #64748b;
  font-size: 13px;
}

.class-record-detail-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.class-record-detail-modal__sub-text {
  color: #64748b;
  font-weight: 400;
  font-size: 12px;
}

.class-record-detail-modal__fee {
  color: #16a34a;
}

.class-record-detail-modal__section-title {
  color: #334155;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 4px;
}

.class-record-detail-modal__review-result {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.class-record-detail-modal__cell {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
}

.class-record-detail-modal__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 0 0 0;
  border-top: 1px solid #f1f5f9;
}

.class-record-detail-modal__label {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.class-record-detail-modal__content {
  color: #0f172a;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.class-record-detail-modal__company {
  color: #64748b;
  font-weight: 400;
  font-size: 13px;
}

.class-record-detail-modal__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.class-record-detail-modal__att-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  transition: border-color 0.2s;
}

.class-record-detail-modal__att-card:hover {
  border-color: #3b82f6;
}

.class-record-detail-modal__att-icon {
  font-size: 28px;
  color: #ef4444;
}

.class-record-detail-modal__att-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.class-record-detail-modal__att-name {
  font-size: 13px;
  color: #1e293b;
  font-weight: 500;
  word-break: break-all;
}

.class-record-detail-modal__att-size {
  font-size: 12px;
  color: #94a3b8;
}

.class-record-detail-modal__empty {
  color: #94a3b8;
  font-size: 13px;
}

@media (max-width: 640px) {
  .class-record-detail-modal__grid {
    grid-template-columns: 1fr;
  }
}
</style>
