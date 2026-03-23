<template>
  <div
    v-if="modelValue && preview"
    class="class-detail-regular-modal modal"
    data-surface-id="modal-class-detail-regular"
  >
    <button
      type="button"
      class="class-detail-regular-backdrop"
      data-surface-part="backdrop"
      aria-label="关闭常规辅导详情弹层"
      @click="closeModal"
    />

    <div
      class="class-detail-regular-shell modal-content"
      data-surface-part="shell"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="class-detail-regular-header modal-header" data-surface-part="header">
        <span :id="titleId" class="class-detail-regular-title modal-title">
          <i class="mdi mdi-book-education" aria-hidden="true" />
          {{ preview.title }}
        </span>
        <button
          type="button"
          class="modal-close"
          data-surface-part="close-control"
          aria-label="关闭常规辅导详情弹层"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <div class="class-detail-regular-body modal-body" data-surface-part="body">
        <div class="class-detail-regular-summary">
          <div>
            <div class="class-detail-regular-student">
              <span class="class-detail-regular-muted">学员: </span>
              <span class="class-detail-regular-student-name">{{ preview.studentName }}</span>
              <span class="class-detail-regular-student-id">{{ preview.studentId }}</span>
            </div>
            <div class="class-detail-regular-meta">
              {{ preview.courseLabel }} · {{ preview.classSchedule }} · {{ preview.duration }}
            </div>
          </div>
          <span class="class-detail-regular-status">{{ preview.statusLabel }}</span>
        </div>

        <div class="class-detail-regular-banner">
          <i class="mdi mdi-book-education" aria-hidden="true" />
          {{ preview.sectionTitle }}
        </div>

        <div class="class-detail-regular-section">
          <p class="class-detail-regular-heading">{{ preview.lessonLabel }}</p>
          <p class="class-detail-regular-copy">
            <template v-for="(line, index) in preview.lessonLines" :key="line">
              - {{ line }}<br v-if="index < preview.lessonLines.length - 1" />
            </template>
          </p>

          <p class="class-detail-regular-heading">{{ preview.performanceLabel }}</p>
          <p class="class-detail-regular-copy">{{ preview.performanceText }}</p>

          <p class="class-detail-regular-heading">{{ preview.nextPlanLabel }}</p>
          <p class="class-detail-regular-copy class-detail-regular-copy--compact">
            <template v-for="(line, index) in preview.nextPlanLines" :key="line">
              - {{ line }}<br v-if="index < preview.nextPlanLines.length - 1" />
            </template>
          </p>
        </div>

        <div class="class-detail-regular-footer-meta">
          <div>
            <span>导师: </span>
            <span class="class-detail-regular-footer-value">{{ preview.mentorName }}</span>
          </div>
          <div>提交时间: {{ preview.submittedAt }}</div>
        </div>
      </div>

      <div class="class-detail-regular-footer modal-footer">
        <button type="button" class="btn btn-primary" @click="closeModal">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface LeadMentorClassDetailRegularPreview {
  title: string
  studentName: string
  studentId: string
  courseLabel: string
  classSchedule: string
  duration: string
  statusLabel: string
  sectionTitle: string
  lessonLabel: string
  lessonLines: string[]
  performanceLabel: string
  performanceText: string
  nextPlanLabel: string
  nextPlanLines: string[]
  mentorName: string
  submittedAt: string
}

defineProps<{
  modelValue: boolean
  preview: LeadMentorClassDetailRegularPreview | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const titleId = 'lead-mentor-class-detail-regular-title'

const closeModal = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss">
.class-detail-regular-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.class-detail-regular-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.5);
}

.class-detail-regular-shell {
  position: relative;
  z-index: 1;
  width: min(90%, 650px);
  max-height: 90vh;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
}

.class-detail-regular-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  box-shadow: inset 0 -1px 0 rgba(148, 163, 184, 0.18);
}

.class-detail-regular-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.class-detail-regular-title .mdi-book-education {
  color: #ea580c;
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

.class-detail-regular-body {
  overflow: auto;
  padding: 26px;
}

.class-detail-regular-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.class-detail-regular-muted {
  color: var(--muted);
}

.class-detail-regular-student-name {
  font-weight: 600;
}

.class-detail-regular-student-id {
  margin-left: 8px;
  color: var(--muted);
}

.class-detail-regular-meta {
  margin-top: 4px;
  font-size: 13px;
  color: var(--muted);
}

.class-detail-regular-status {
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

.class-detail-regular-banner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #fff7ed;
  color: #ea580c;
  font-size: 14px;
  font-weight: 600;
}

.class-detail-regular-section {
  margin-bottom: 20px;
}

.class-detail-regular-heading {
  margin: 0 0 8px;
  color: var(--text);
  font-weight: 600;
}

.class-detail-regular-copy {
  margin: 0 0 16px;
  padding: 12px;
  border-radius: 8px;
  background: var(--bg);
  color: var(--text2);
  line-height: 1.6;
  white-space: normal;
}

.class-detail-regular-copy--compact {
  margin-bottom: 0;
}

.class-detail-regular-footer-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 13px;
}

.class-detail-regular-footer-value {
  color: var(--text);
  font-weight: 500;
}

.class-detail-regular-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 26px;
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.18);
}
</style>
