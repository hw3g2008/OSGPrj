<template>
  <div
    v-if="modelValue && preview"
    class="class-reject-modal modal"
    data-surface-id="modal-class-reject"
  >
    <button
      type="button"
      class="class-reject-backdrop"
      data-surface-part="backdrop"
      aria-label="关闭课程审核驳回弹层"
      @click="closeModal"
    />

    <div
      class="class-reject-shell modal-content"
      data-surface-part="shell"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="class-reject-header modal-header" data-surface-part="header">
        <span :id="titleId" class="class-reject-title modal-title">
          <i class="mdi mdi-alert-circle" aria-hidden="true" />
          {{ preview.title }}
        </span>
        <button
          type="button"
          class="modal-close"
          data-surface-part="close-control"
          aria-label="关闭课程审核驳回弹层"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <div class="class-reject-body modal-body" data-surface-part="body">
        <div class="class-reject-summary-card">
          <div class="class-reject-summary-grid">
            <div class="class-reject-summary-item">
              <span class="class-reject-summary-label">学员</span>
              <div class="class-reject-summary-value">{{ preview.studentName }} ({{ preview.studentId }})</div>
            </div>
            <div class="class-reject-summary-item">
              <span class="class-reject-summary-label">{{ preview.courseTypeLabel }}</span>
              <div class="class-reject-summary-value">{{ preview.courseTypeValue }}</div>
            </div>
            <div class="class-reject-summary-item">
              <span class="class-reject-summary-label">{{ preview.classTimeLabel }}</span>
              <div class="class-reject-summary-value">{{ preview.classTimeValue }}</div>
            </div>
            <div class="class-reject-summary-item">
              <span class="class-reject-summary-label">{{ preview.submittedDurationLabel }}</span>
              <div class="class-reject-summary-value">{{ preview.submittedDurationValue }}</div>
            </div>
          </div>
        </div>

        <div class="class-reject-reason-section">
          <div class="class-reject-reason-title">
            <i class="mdi mdi-close-circle" aria-hidden="true" />
            {{ preview.reasonTitle }}
          </div>
          <div class="class-reject-reason-copy">{{ preview.reasonText }}</div>
        </div>

        <div class="class-reject-meta">
          <div>审核人：{{ preview.reviewerName }}</div>
          <div>驳回时间：{{ preview.rejectedAt }}</div>
        </div>
      </div>

      <div class="class-reject-footer modal-footer">
        <button type="button" class="btn btn-outline" @click="closeModal">关闭</button>
        <button type="button" class="btn btn-primary" @click="handleResubmit">重新提交</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface LeadMentorClassRejectPreview {
  title: string
  studentName: string
  studentId: string
  courseTypeLabel: string
  courseTypeValue: string
  classTimeLabel: string
  classTimeValue: string
  submittedDurationLabel: string
  submittedDurationValue: string
  reasonTitle: string
  reasonText: string
  reviewerName: string
  rejectedAt: string
}

defineProps<{
  modelValue: boolean
  preview: LeadMentorClassRejectPreview | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  resubmit: []
}>()

const titleId = 'lead-mentor-class-reject-title'

const closeModal = () => {
  emit('update:modelValue', false)
}

const handleResubmit = () => {
  emit('update:modelValue', false)
  emit('resubmit')
}
</script>

<style scoped lang="scss">
.class-reject-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.class-reject-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.5);
}

.class-reject-shell {
  position: relative;
  z-index: 1;
  width: min(90%, 500px);
  max-height: 90vh;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
}

.class-reject-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  background: #fee2e2;
  border-radius: 12px 12px 0 0;
}

.class-reject-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #dc2626;
}

.class-reject-title .mdi-alert-circle {
  font-size: 20px;
}

.modal-close {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: var(--bg);
  color: var(--muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.class-reject-body {
  overflow: auto;
  padding: 26px;
}

.class-reject-summary-card {
  margin-bottom: 20px;
  border-radius: 12px;
  background: #fef2f2;
  padding: 16px;
}

.class-reject-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.class-reject-summary-label {
  display: block;
  margin-bottom: 4px;
  color: var(--muted);
  font-size: 12px;
}

.class-reject-summary-value {
  font-weight: 600;
  color: var(--text);
}

.class-reject-reason-section {
  margin-bottom: 16px;
}

.class-reject-reason-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: #dc2626;
  font-weight: 600;
}

.class-reject-reason-copy {
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  padding: 12px;
  color: var(--text2);
  line-height: 1.6;
}

.class-reject-meta {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.class-reject-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 26px;
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.18);
}
</style>
