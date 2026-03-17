<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="$emit('update:modelValue', false)">
    <div class="modal-shell">
      <header class="modal-shell__header">
        <div>
          <p class="modal-shell__eyebrow">Notice Center</p>
          <h3>发送通知</h3>
        </div>
        <button type="button" class="modal-shell__close" @click="$emit('update:modelValue', false)">×</button>
      </header>

      <div class="modal-shell__body">
        <label class="field">
          <span>接收人类型</span>
          <select v-model="form.receiverType">
            <option value="all_mentor">全部导师</option>
            <option value="target_mentor">指定导师</option>
            <option value="all_student">全部学员</option>
            <option value="target_student">指定学员</option>
          </select>
        </label>

        <label class="field">
          <span>接收人</span>
          <input
            v-model.trim="form.receiverLabel"
            type="text"
            :placeholder="isTargetReceiver ? '例如：导师A / 学员B' : '将自动带入全部导师 / 全部学员'"
            :disabled="!isTargetReceiver"
          >
        </label>

        <label class="field">
          <span>标题</span>
          <input v-model.trim="form.noticeTitle" type="text" placeholder="请输入通知标题">
        </label>

        <label class="field">
          <span>内容</span>
          <textarea v-model.trim="form.noticeContent" rows="5" placeholder="请输入通知内容"></textarea>
        </label>
      </div>

      <footer class="modal-shell__footer">
        <button type="button" class="ghost-button" @click="$emit('update:modelValue', false)">取消</button>
        <button type="button" class="primary-button" :disabled="submitting" @click="handleConfirm">发送</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { NoticeReceiverType } from '@osg/shared/api/admin/notice'

const props = defineProps<{
  modelValue: boolean
  submitting?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm', payload: {
    receiverType: NoticeReceiverType
    receiverLabel: string
    noticeTitle: string
    noticeContent: string
  }): void
}>()

const form = reactive({
  receiverType: 'all_mentor' as NoticeReceiverType,
  receiverLabel: '',
  noticeTitle: '',
  noticeContent: ''
})

const isTargetReceiver = computed(() => form.receiverType === 'target_mentor' || form.receiverType === 'target_student')

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return
    form.receiverType = 'all_mentor'
    form.receiverLabel = ''
    form.noticeTitle = ''
    form.noticeContent = ''
  },
  { immediate: true }
)

const defaultReceiverLabel = (receiverType: NoticeReceiverType) => {
  return receiverType === 'all_mentor' ? '全部导师' : '全部学员'
}

const handleConfirm = () => {
    emit('confirm', {
      receiverType: form.receiverType,
      receiverLabel: isTargetReceiver.value ? form.receiverLabel : defaultReceiverLabel(form.receiverType),
      noticeTitle: form.noticeTitle,
      noticeContent: form.noticeContent
    })
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.48);
  z-index: 70;
}

.modal-shell {
  width: min(560px, 100%);
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
}

.modal-shell__header,
.modal-shell__body,
.modal-shell__footer {
  padding: 20px 22px;
}

.modal-shell__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #0e7490);
  border-radius: 24px 24px 0 0;
}

.modal-shell__eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.72;
}

.modal-shell__header h3 {
  margin: 0;
}

.modal-shell__close {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 28px;
  cursor: pointer;
}

.modal-shell__body {
  display: grid;
  gap: 14px;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  font-size: 13px;
  font-weight: 600;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
}

.modal-shell__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.primary-button,
.ghost-button {
  height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}

.primary-button {
  border: none;
  color: #fff;
  background: #0f766e;
}

.ghost-button {
  border: 1px solid #cbd5e1;
  background: #fff;
}
</style>
