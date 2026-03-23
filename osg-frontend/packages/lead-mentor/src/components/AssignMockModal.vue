<template>
  <div
    v-if="modelValue && preview"
    class="assign-mock-modal modal"
    data-surface-id="modal-assign-mock"
  >
    <button
      type="button"
      class="assign-mock-backdrop"
      data-surface-part="backdrop"
      aria-label="关闭处理模拟应聘申请弹层"
      @click="closeModal"
    />

    <div
      class="assign-mock-shell modal-content"
      data-surface-part="shell"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="assign-mock-header modal-header" data-surface-part="header">
        <span :id="titleId" class="assign-mock-title modal-title">
          <i class="mdi mdi-clipboard-check" aria-hidden="true" />
          处理模拟应聘申请
        </span>
        <button
          type="button"
          class="modal-close"
          data-surface-part="close-control"
          aria-label="关闭处理模拟应聘申请弹层"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <div class="assign-mock-body modal-body" data-surface-part="body">
        <section class="request-card">
          <div class="request-avatar" :style="{ background: preview.avatarColor || 'var(--primary)' }">
            {{ preview.studentName }}
          </div>
          <div class="request-copy">
            <div class="request-title">{{ preview.studentName }} · {{ preview.practiceType }}</div>
            <div class="request-meta">{{ preview.companyName }} · {{ preview.mentorDemand }}</div>
          </div>
          <span class="tag tag--info">{{ preview.practiceType }}</span>
        </section>

        <section class="form-group">
          <label class="form-label">分配导师 <span class="req">*</span></label>
          <div class="mentor-list">
            <label
              v-for="mentor in preview.mentorOptions"
              :key="`${mentor.code}-${mentor.name}`"
              class="mentor-option"
              :class="{ 'mentor-option--selected': mentor.selected }"
            >
              <input type="checkbox" :checked="mentor.selected" />
              <div class="mentor-avatar" :style="{ background: mentor.avatarColor }">{{ mentor.code }}</div>
              <div class="mentor-copy">
                <div class="mentor-name">{{ mentor.name }}</div>
                <div class="mentor-meta">{{ mentor.meta }}</div>
              </div>
            </label>
          </div>
        </section>

        <section class="form-group">
          <label class="form-label">预约时间 <span class="req">*</span></label>
          <input class="form-input" type="datetime-local" :value="preview.scheduledAt" />
        </section>

        <section class="form-group form-group--last">
          <label class="form-label">
            备注说明
            <span class="form-label__hint">(选填)</span>
          </label>
          <textarea
            class="form-input form-input--textarea"
            rows="2"
            placeholder="如有其他说明，请在此填写..."
          >{{ preview.note }}</textarea>
        </section>
      </div>

      <div class="assign-mock-footer modal-footer">
        <button type="button" class="btn btn-outline" @click="closeModal">取消</button>
        <button type="button" class="btn btn-primary" @click="emit('request-confirm')">
          <i class="mdi mdi-check" aria-hidden="true" />
          确认安排
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface AssignMockMentorOption {
  code: string
  name: string
  meta: string
  avatarColor: string
  selected: boolean
}

export interface AssignMockPreview {
  studentName: string
  practiceType: string
  companyName: string
  mentorDemand: string
  mentorOptions: AssignMockMentorOption[]
  scheduledAt: string
  note: string
  avatarColor?: string
}

defineProps<{
  modelValue: boolean
  preview: AssignMockPreview | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'request-confirm': []
}>()

const titleId = 'assign-mock-modal-title'

const closeModal = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.assign-mock-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.assign-mock-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.5);
  cursor: pointer;
}

.assign-mock-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(650px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  margin: 24px auto;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
}

.assign-mock-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  background: linear-gradient(135deg, #7399C6, #9BB8D9);
  border-radius: 16px 16px 0 0;
}

.assign-mock-title {
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

.assign-mock-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  overflow-y: auto;
}

.request-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #EEF2FF;
  border-radius: 10px;
}

.request-avatar,
.mentor-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
}

.request-avatar {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  font-size: 14px;
}

.request-copy {
  flex: 1;
  min-width: 0;
}

.request-title,
.mentor-name {
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
}

.request-meta,
.mentor-meta {
  margin-top: 4px;
  color: var(--muted);
  font-size: 13px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group--last {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text2);
  font-size: 13px;
  font-weight: 600;
}

.form-label__hint,
.req {
  color: var(--muted);
  font-size: 12px;
  font-weight: 400;
}

.mentor-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 150px;
  padding: 2px;
  overflow-y: auto;
}

.mentor-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.mentor-option--selected {
  border-width: 2px;
  border-color: var(--primary);
}

.mentor-option input {
  width: 18px;
  height: 18px;
}

.mentor-avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  font-size: 10px;
}

.mentor-copy {
  flex: 1;
}

.form-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  font-size: 14px;
}

.form-input--textarea {
  resize: none;
}

.assign-mock-footer {
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

.btn-primary {
  border: 0;
  background: var(--primary-gradient);
  color: #fff;
  box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
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

.tag--info {
  background: #DBEAFE;
  color: #1D4ED8;
}

@media (max-width: 768px) {
  .assign-mock-shell {
    width: calc(100vw - 20px);
    margin: 10px auto;
  }

  .assign-mock-header,
  .assign-mock-body,
  .assign-mock-footer {
    padding-left: 18px;
    padding-right: 18px;
  }

  .request-card {
    flex-direction: column;
    text-align: center;
  }
}
</style>
