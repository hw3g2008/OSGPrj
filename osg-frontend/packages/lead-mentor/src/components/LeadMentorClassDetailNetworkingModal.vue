<template>
  <div
    v-if="modelValue && preview"
    class="class-detail-networking-modal modal"
    data-surface-id="modal-class-detail-networking"
  >
    <button
      type="button"
      class="class-detail-networking-backdrop"
      data-surface-part="backdrop"
      aria-label="关闭人脉拓展详情弹层"
      @click="closeModal"
    />

    <div
      class="class-detail-networking-shell modal-content"
      data-surface-part="shell"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="class-detail-networking-header modal-header" data-surface-part="header">
        <span :id="titleId" class="class-detail-networking-title modal-title">
          <i class="mdi mdi-account-group" aria-hidden="true" />
          {{ preview.title }}
        </span>
        <button
          type="button"
          class="modal-close"
          data-surface-part="close-control"
          aria-label="关闭人脉拓展详情弹层"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <div class="class-detail-networking-body modal-body" data-surface-part="body">
        <div class="class-detail-networking-summary">
          <div>
            <div class="class-detail-networking-student">
              <span class="class-detail-networking-muted">学员: </span>
              <span class="class-detail-networking-student-name">{{ preview.studentName }}</span>
              <span class="class-detail-networking-student-id">{{ preview.studentId }}</span>
            </div>
            <div class="class-detail-networking-meta">
              {{ preview.courseLabel }} · {{ preview.classSchedule }} · {{ preview.duration }}
            </div>
          </div>
          <span class="class-detail-networking-status">{{ preview.statusLabel }}</span>
        </div>

        <div class="class-detail-networking-banner">
          <i class="mdi mdi-account-group" aria-hidden="true" />
          {{ preview.sectionTitle }}
        </div>

        <div class="class-detail-networking-section">
          <p class="class-detail-networking-heading">{{ preview.progressLabel }}</p>
          <p class="class-detail-networking-copy">{{ preview.progressText }}</p>

          <div class="class-detail-networking-metrics">
            <div class="class-detail-networking-metric">
              <span class="class-detail-networking-metric-label">{{ preview.contactNameLabel }}</span>
              <div class="class-detail-networking-metric-value">{{ preview.contactNameValue }}</div>
            </div>
            <div class="class-detail-networking-metric">
              <span class="class-detail-networking-metric-label">{{ preview.contactRoleLabel }}</span>
              <div class="class-detail-networking-metric-value">{{ preview.contactRoleValue }}</div>
            </div>
          </div>

          <p class="class-detail-networking-heading">{{ preview.followUpLabel }}</p>
          <p class="class-detail-networking-copy class-detail-networking-copy--compact">
            <template v-for="(line, index) in preview.followUpLines" :key="line">
              - {{ line }}<br v-if="index < preview.followUpLines.length - 1" />
            </template>
          </p>
        </div>

        <div class="class-detail-networking-footer-meta">
          <div>
            <span>导师: </span>
            <span class="class-detail-networking-footer-value">{{ preview.mentorName }}</span>
          </div>
          <div>提交时间: {{ preview.submittedAt }}</div>
        </div>
      </div>

      <div class="class-detail-networking-footer modal-footer">
        <button type="button" class="btn btn-primary" @click="closeModal">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface LeadMentorClassDetailNetworkingPreview {
  title: string
  studentName: string
  studentId: string
  courseLabel: string
  classSchedule: string
  duration: string
  statusLabel: string
  sectionTitle: string
  progressLabel: string
  progressText: string
  contactNameLabel: string
  contactNameValue: string
  contactRoleLabel: string
  contactRoleValue: string
  followUpLabel: string
  followUpLines: string[]
  mentorName: string
  submittedAt: string
}

defineProps<{
  modelValue: boolean
  preview: LeadMentorClassDetailNetworkingPreview | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const titleId = 'lead-mentor-class-detail-networking-title'

const closeModal = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss">
.class-detail-networking-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.class-detail-networking-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.5);
}

.class-detail-networking-shell {
  position: relative;
  z-index: 1;
  width: min(90%, 650px);
  max-height: 90vh;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
}

.class-detail-networking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  box-shadow: inset 0 -1px 0 rgba(148, 163, 184, 0.18);
}

.class-detail-networking-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.class-detail-networking-title .mdi-account-group {
  color: #059669;
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

.class-detail-networking-body {
  overflow: auto;
  padding: 26px;
}

.class-detail-networking-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.class-detail-networking-muted {
  color: var(--muted);
}

.class-detail-networking-student-name {
  font-weight: 600;
}

.class-detail-networking-student-id {
  margin-left: 8px;
  color: var(--muted);
}

.class-detail-networking-meta {
  margin-top: 4px;
  font-size: 13px;
  color: var(--muted);
}

.class-detail-networking-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.class-detail-networking-banner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #ecfdf5;
  color: #059669;
  font-size: 14px;
  font-weight: 600;
}

.class-detail-networking-section {
  margin-bottom: 20px;
}

.class-detail-networking-heading {
  margin: 0 0 8px;
  color: var(--text);
  font-weight: 600;
}

.class-detail-networking-copy {
  margin: 0 0 16px;
  padding: 12px;
  border-radius: 8px;
  background: var(--bg);
  color: var(--text2);
  line-height: 1.6;
}

.class-detail-networking-copy--compact {
  margin-bottom: 0;
}

.class-detail-networking-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.class-detail-networking-metric-label {
  color: var(--muted);
  font-size: 12px;
}

.class-detail-networking-metric-value {
  margin-top: 4px;
  color: var(--text);
  font-weight: 600;
}

.class-detail-networking-footer-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 13px;
}

.class-detail-networking-footer-value {
  color: var(--text);
  font-weight: 500;
}

.class-detail-networking-footer {
  display: flex;
  justify-content: flex-end;
  padding: 18px 26px;
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.18);
}

.btn {
  border: 0;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  background: var(--primary-gradient);
  color: #fff;
  box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
}
</style>
