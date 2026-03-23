<template>
  <div
    v-if="modelValue && preview"
    class="class-detail-resume-modal modal"
    data-surface-id="modal-class-detail-resume"
  >
    <button
      type="button"
      class="class-detail-resume-backdrop"
      data-surface-part="backdrop"
      aria-label="关闭简历修改详情弹层"
      @click="closeModal"
    />

    <div
      class="class-detail-resume-shell modal-content"
      data-surface-part="shell"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="class-detail-resume-header modal-header" data-surface-part="header">
        <span :id="titleId" class="class-detail-resume-title modal-title">
          <i class="mdi mdi-file-document-edit" aria-hidden="true" />
          {{ preview.title }}
        </span>
        <button
          type="button"
          class="modal-close"
          data-surface-part="close-control"
          aria-label="关闭简历修改详情弹层"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <div class="class-detail-resume-body modal-body" data-surface-part="body">
        <div class="class-detail-resume-summary">
          <div>
            <div class="class-detail-resume-student">
              <span class="class-detail-resume-muted">学员: </span>
              <span class="class-detail-resume-student-name">{{ preview.studentName }}</span>
              <span class="class-detail-resume-student-id">{{ preview.studentId }}</span>
            </div>
            <div class="class-detail-resume-meta">
              {{ preview.courseLabel }} · {{ preview.classSchedule }} · {{ preview.duration }}
            </div>
          </div>
          <span class="class-detail-resume-status">{{ preview.statusLabel }}</span>
        </div>

        <div class="class-detail-resume-banner">
          <i class="mdi mdi-file-document-edit" aria-hidden="true" />
          {{ preview.sectionTitle }}
        </div>

        <div class="class-detail-resume-section">
          <p class="class-detail-resume-heading">{{ preview.changeLabel }}</p>
          <p class="class-detail-resume-copy">
            <template v-for="(line, index) in preview.changeLines" :key="line">
              - {{ line }}<br v-if="index < preview.changeLines.length - 1" />
            </template>
          </p>

          <div class="class-detail-resume-metric">
            <span class="class-detail-resume-metric-label">{{ preview.completionLabel }}</span>
            <div class="class-detail-resume-metric-value">{{ preview.completionValue }}</div>
          </div>

          <p class="class-detail-resume-heading">{{ preview.suggestionLabel }}</p>
          <p class="class-detail-resume-copy class-detail-resume-copy--compact">
            <template v-for="(line, index) in preview.suggestionLines" :key="line">
              - {{ line }}<br v-if="index < preview.suggestionLines.length - 1" />
            </template>
          </p>
        </div>

        <div class="class-detail-resume-footer-meta">
          <div>
            <span>导师: </span>
            <span class="class-detail-resume-footer-value">{{ preview.mentorName }}</span>
          </div>
          <div>提交时间: {{ preview.submittedAt }}</div>
        </div>
      </div>

      <div class="class-detail-resume-footer modal-footer">
        <button type="button" class="btn btn-primary" @click="closeModal">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface LeadMentorClassDetailResumePreview {
  title: string
  studentName: string
  studentId: string
  courseLabel: string
  classSchedule: string
  duration: string
  statusLabel: string
  sectionTitle: string
  changeLabel: string
  changeLines: string[]
  completionLabel: string
  completionValue: string
  suggestionLabel: string
  suggestionLines: string[]
  mentorName: string
  submittedAt: string
}

defineProps<{
  modelValue: boolean
  preview: LeadMentorClassDetailResumePreview | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const titleId = 'lead-mentor-class-detail-resume-title'

const closeModal = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss">
.class-detail-resume-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.class-detail-resume-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.5);
}

.class-detail-resume-shell {
  position: relative;
  z-index: 1;
  width: min(90%, 650px);
  max-height: 90vh;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
}

.class-detail-resume-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  box-shadow: inset 0 -1px 0 rgba(148, 163, 184, 0.18);
}

.class-detail-resume-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.class-detail-resume-title .mdi-file-document-edit {
  color: #1d4ed8;
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

.class-detail-resume-body {
  overflow: auto;
  padding: 26px;
}

.class-detail-resume-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.class-detail-resume-muted {
  color: var(--muted);
}

.class-detail-resume-student-name {
  font-weight: 600;
}

.class-detail-resume-student-id {
  margin-left: 8px;
  color: var(--muted);
}

.class-detail-resume-meta {
  margin-top: 4px;
  font-size: 13px;
  color: var(--muted);
}

.class-detail-resume-status {
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

.class-detail-resume-banner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 14px;
  font-weight: 600;
}

.class-detail-resume-section {
  margin-bottom: 20px;
}

.class-detail-resume-heading {
  margin: 0 0 8px;
  color: var(--text);
  font-weight: 600;
}

.class-detail-resume-copy {
  margin: 0 0 16px;
  padding: 12px;
  border-radius: 8px;
  background: var(--bg);
  color: var(--text2);
  line-height: 1.6;
}

.class-detail-resume-copy--compact {
  margin-bottom: 0;
}

.class-detail-resume-metric {
  margin-bottom: 16px;
}

.class-detail-resume-metric-label {
  color: var(--muted);
  font-size: 12px;
}

.class-detail-resume-metric-value {
  margin-top: 4px;
  color: #22c55e;
  font-weight: 600;
}

.class-detail-resume-footer-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 13px;
}

.class-detail-resume-footer-value {
  color: var(--text);
  font-weight: 500;
}

.class-detail-resume-footer {
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
