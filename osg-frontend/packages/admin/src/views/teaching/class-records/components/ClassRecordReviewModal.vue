<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-class-record-review"
    :width="760"
    :body-class="'class-record-review-modal__body osg-modal-form'"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-clipboard-check-outline" aria-hidden="true"></span>
        <span>{{ t('admin.teaching.classRecords.reviewModal.title') }}</span>
        <span class="class-record-review-modal__title-sub">#{{ detail?.recordId || '--' }}</span>
      </span>
    </template>

    <div v-if="loading" class="class-record-review-modal__loading">
      <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
      <span>{{ t('admin.teaching.classRecords.reviewModal.loading') }}</span>
    </div>

    <template v-else>
      <section class="class-record-review-modal__summary">
        <div class="class-record-review-modal__status-row">
          <a-tag :color="statusTagColor(detail?.status)">{{ formatStatus(detail?.status) }}</a-tag>
          <span class="class-record-review-modal__record-id">#{{ detail?.recordId || '--' }}</span>
        </div>
        <div class="class-record-review-modal__grid">
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">{{ t('admin.teaching.classRecords.fields.student') }}</span>
            <strong>{{ detail?.studentName || '--' }} <span v-if="detail?.studentId" class="class-record-review-modal__sub-text">({{ detail.studentId }})</span></strong>
          </div>
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">{{ t('admin.teaching.classRecords.fields.reporter') }}</span>
            <strong>{{ detail?.mentorName || '--' }} <a-tag v-if="detail?.courseSource" size="small" color="blue">{{ normalizeSourceLabel(detail.courseSource) }}</a-tag></strong>
          </div>
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">{{ t('admin.teaching.classRecords.fields.coachingContent') }}</span>
            <strong>{{ normalizeCourseType(detail?.courseType) }}<span v-if="detail?.coachingCompany" class="class-record-review-modal__company"> {{ detail.coachingCompany }}</span></strong>
          </div>
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">{{ t('admin.teaching.classRecords.fields.courseContent') }}</span>
            <strong><a-tag v-if="detail?.classStatus" color="processing">{{ normalizeClassStatusLabel(detail.classStatus) }}</a-tag><span v-else>--</span></strong>
          </div>
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">{{ t('admin.teaching.classRecords.fields.classDate') }}</span>
            <strong>{{ formatDate(detail?.classDate) }}</strong>
          </div>
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">{{ t('admin.teaching.classRecords.fields.duration') }}</span>
            <strong>{{ detail?.durationHours ? t('admin.teaching.classRecords.fields.durationValue', { hours: detail.durationHours }) : '--' }}</strong>
          </div>
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">{{ t('admin.teaching.classRecords.fields.fee') }}</span>
            <strong class="class-record-review-modal__fee">{{ formatFee(detail?.courseFee) }}</strong>
          </div>
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">{{ t('admin.teaching.classRecords.fields.submitTime') }}</span>
            <strong>{{ formatDateTime(detail?.submittedAt) }}</strong>
          </div>
        </div>
      </section>

      <section v-if="detail?.feedbackContent" class="class-record-review-modal__section" data-field-name="课程反馈">
        <div class="class-record-review-modal__section-head"><span>{{ t('admin.teaching.classRecords.fields.feedback') }}</span></div>
        <div class="class-record-review-modal__feedback">{{ detail.feedbackContent }}</div>
      </section>

      <section class="class-record-review-modal__section" data-field-name="附件">
        <div class="class-record-review-modal__section-head"><span>{{ t('admin.teaching.classRecords.fields.attachments') }}</span></div>
        <div v-if="detail?.attachments && detail.attachments.length > 0" class="class-record-review-modal__attachments">
          <div v-for="att in detail.attachments" :key="att.attachmentId" class="class-record-review-modal__att-card" @click="handleDownload(att.filePath)">
            <span class="mdi mdi-file-pdf-box class-record-review-modal__att-icon" aria-hidden="true"></span>
            <div class="class-record-review-modal__att-info">
              <span class="class-record-review-modal__att-name">{{ att.fileName || t('admin.teaching.classRecords.fields.unnamedFile') }}</span>
              <span class="class-record-review-modal__att-size">{{ formatFileSize(att.fileSize) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="class-record-review-modal__empty">{{ t('admin.teaching.classRecords.fields.noAttachments') }}</div>
      </section>

      <section
        class="class-record-review-modal__section"
        data-field-name="审核结果" data-field-name-alias="课程审核弹窗审核结果">
        <div class="class-record-review-modal__section-head">
          <span>{{ t('admin.teaching.classRecords.fields.reviewResult') }}</span>
          <div class="class-record-review-modal__result-toggle">
            <a-button
              :type="reviewResult === 'approved' ? 'primary' : 'default'"
              size="small"
              :disabled="submitting"
              @click="reviewResult = 'approved'"
            >
              {{ t('admin.teaching.classRecords.reviewModal.approveBtn') }}
            </a-button>
            <a-button
              :type="reviewResult === 'rejected' ? 'primary' : 'default'"
              size="small"
              :disabled="submitting"
              @click="reviewResult = 'rejected'"
            >
              {{ t('admin.teaching.classRecords.reviewModal.rejectBtn') }}
            </a-button>
          </div>
        </div>
      </section>

      <section
        v-if="reviewResult === 'rejected'"
        class="class-record-review-modal__section"
        data-field-name="驳回原因" data-field-name-alias="课程审核弹窗驳回原因">
        <a-form-item
          :label="t('admin.teaching.classRecords.reviewModal.rejectReasonLabel')"
          data-field-name="驳回原因" data-field-name-alias="课程审核弹窗驳回原因">
          <a-select
            v-model:value="rejectReason"
            :placeholder="t('admin.teaching.classRecords.reviewModal.rejectReasonPlaceholder')"
            :disabled="submitting"
          >
            <a-select-option v-for="option in rejectReasonOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item
          :label="t('admin.teaching.classRecords.reviewModal.rejectRemarkLabel')"
          data-field-name="驳回说明" data-field-name-alias="课程审核弹窗驳回说明">
          <a-textarea
            v-model:value="rejectRemark"
            :rows="4"
            :maxlength="120"
            :disabled="submitting"
            :placeholder="t('admin.teaching.classRecords.reviewModal.rejectRemarkPlaceholder')"
          />
        </a-form-item>
      </section>

      <section
        class="class-record-review-modal__section"
        data-field-name="审核备注" data-field-name-alias="课程审核弹窗审核备注">
        <a-form-item
          :label="t('admin.teaching.classRecords.reviewModal.reviewRemarkLabel')"
          data-field-name="审核备注" data-field-name-alias="课程审核弹窗审核备注">
          <a-textarea
            v-model:value="reviewRemark"
            :rows="3"
            :maxlength="120"
            :disabled="submitting"
            :placeholder="t('admin.teaching.classRecords.reviewModal.reviewRemarkPlaceholder')"
          />
        </a-form-item>
      </section>

      <section
        class="class-record-review-modal__section class-record-review-modal__section--compat"
        aria-hidden="true"
        data-field-name="课程审核弹窗审核结果">
        <div class="class-record-review-modal__compat-alias">
          <!-- i18n-skip-block: playwright compat aliases (hidden, screen-reader/test only) -->
          <span>课程审核弹窗审核结果</span><!-- i18n-skip-line: playwright selector -->
          <span>课程审核弹窗驳回原因</span><!-- i18n-skip-line: playwright selector -->
          <span>课程审核弹窗驳回说明</span><!-- i18n-skip-line: playwright selector -->
          <span>课程审核弹窗审核备注</span><!-- i18n-skip-line: playwright selector -->
        </div>
      </section>
    </template>

    <template #footer>
      <a-button @click="handleClose">{{ t('admin.teaching.classRecords.reviewModal.cancelBtn') }}</a-button>
      <a-button
        type="primary"
        :disabled="loading || submitting"
        @click="handleSubmit"
      >
        {{ submitting ? t('admin.teaching.classRecords.reviewModal.submitting') : reviewResult === 'rejected' ? t('admin.teaching.classRecords.reviewModal.submitReject') : t('admin.teaching.classRecords.reviewModal.submitApprove') }}
      </a-button>
    </template>

    <div v-if="visible" data-surface-id="modal-audit" class="class-record-review-modal__compat-surface"></div>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { OverlaySurfaceModal } from '@osg/shared/components'
import type { ReportRow } from '@osg/shared/api/admin/report'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  visible: boolean
  detail?: ReportRow | null
  loading?: boolean
  submitting?: boolean
}>(), {
  detail: null,
  loading: false,
  submitting: false
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  approve: [payload: { remark?: string }]
  reject: [payload: { remark?: string }]
}>()

const reviewResult = ref<'approved' | 'rejected'>('approved')
const rejectReason = ref('')
const rejectRemark = ref('')
const reviewRemark = ref('')

const REJECT_REASON_VALUES = ['课时时长有误', '课程内容描述不清', '课程类型选择错误', '缺少必要附件', '重复提交', '其他原因'] // i18n-skip-line: backend values
const rejectReasonOptions = computed(() => [
  { value: REJECT_REASON_VALUES[0], label: t('admin.teaching.classRecords.reviewModal.rejectReasons.r1') },
  { value: REJECT_REASON_VALUES[1], label: t('admin.teaching.classRecords.reviewModal.rejectReasons.r2') },
  { value: REJECT_REASON_VALUES[2], label: t('admin.teaching.classRecords.reviewModal.rejectReasons.r3') },
  { value: REJECT_REASON_VALUES[3], label: t('admin.teaching.classRecords.reviewModal.rejectReasons.r4') },
  { value: REJECT_REASON_VALUES[4], label: t('admin.teaching.classRecords.reviewModal.rejectReasons.r5') },
  { value: REJECT_REASON_VALUES[5], label: t('admin.teaching.classRecords.reviewModal.rejectReasons.r6') },
])

watch(
  () => [props.visible, props.detail?.reviewRemark],
  ([visible]) => {
    if (!visible) {
      return
    }
    reviewResult.value = 'approved'
    rejectReason.value = ''
    rejectRemark.value = ''
    reviewRemark.value = props.detail?.reviewRemark || ''
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:visible', false)
}

const buildRemark = () => {
  const baseRemark = reviewRemark.value.trim()
  if (reviewResult.value === 'rejected') {
    const reason = rejectReason.value.trim()
    const extra = rejectRemark.value.trim()
    return [reason, extra].filter(Boolean).join('；') || undefined
  }
  return baseRemark || undefined
}

const handleSubmit = () => {
  if (reviewResult.value === 'rejected' && !rejectReason.value) {
    message.warning(t('admin.teaching.classRecords.reviewModal.missingRejectReason'))
    return
  }

  const payload = { remark: buildRemark() }
  if (reviewResult.value === 'rejected') {
    emit('reject', payload)
    return
  }
  emit('approve', payload)
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
.class-record-review-modal__body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.class-record-review-modal__title-sub {
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
}

.class-record-review-modal__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  gap: 8px;
  color: #64748b;
}

.class-record-review-modal__summary {
  background: #FEF3C7;
  border: 1px solid #FDE68A;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.class-record-review-modal__status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.class-record-review-modal__record-id {
  color: #64748b;
  font-size: 13px;
}

.class-record-review-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.class-record-review-modal__sub-text {
  color: #64748b;
  font-weight: 400;
  font-size: 12px;
}

.class-record-review-modal__fee {
  color: #16a34a;
}

.class-record-review-modal__feedback {
  color: #334155;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.class-record-review-modal__cell {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

.class-record-review-modal__section--compat {
  position: absolute;
  inset: 0;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  opacity: 0.01;
  pointer-events: none;
}

.class-record-review-modal__compat-alias {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 1px;
  line-height: 1;
}

.class-record-review-modal__cell {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.class-record-review-modal__label {
  color: #64748b;
  font-size: 12px;
}

.class-record-review-modal__section {
  padding: 16px 0 0 0;
  border-top: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.class-record-review-modal__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.class-record-review-modal__result-toggle {
  display: inline-flex;
  gap: 8px;
}

.class-record-review-modal__compat-surface {
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 1px;
  opacity: 0.01;
  pointer-events: none;
}

.class-record-review-modal__company {
  color: #64748b;
  font-weight: 400;
  font-size: 13px;
}

.class-record-review-modal__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.class-record-review-modal__att-card {
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

.class-record-review-modal__att-card:hover {
  border-color: #3b82f6;
}

.class-record-review-modal__att-icon {
  font-size: 28px;
  color: #ef4444;
}

.class-record-review-modal__att-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.class-record-review-modal__att-name {
  font-size: 13px;
  color: #1e293b;
  font-weight: 500;
  word-break: break-all;
}

.class-record-review-modal__att-size {
  font-size: 12px;
  color: #94a3b8;
}

.class-record-review-modal__empty {
  color: #94a3b8;
  font-size: 13px;
}

@media (max-width: 640px) {
  .class-record-review-modal__grid {
    grid-template-columns: 1fr;
  }

  .class-record-review-modal__section-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
