<template>
  <OverlaySurfaceModal
    surface-id="modal-send-notice"
    :open="modelValue"
    width="500px"
    @cancel="$emit('update:modelValue', false)"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-bell-outline" aria-hidden="true" />
        <span>发送通知</span>
      </span>
    </template>
    <a-form :label-col="{ span: 24 }" layout="vertical">
      <a-form-item label="接收人类型" required>
        <a-select v-model:value="form.receiverType">
          <a-select-option value="all_mentor">全部导师</a-select-option>
          <a-select-option value="target_mentor">指定导师</a-select-option>
          <a-select-option value="all_student">全部学员</a-select-option>
          <a-select-option value="target_student">指定学员</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="标题" required>
        <a-input v-model:value="form.noticeTitle" placeholder="输入通知标题" />
      </a-form-item>
      <a-form-item label="内容" required>
        <a-textarea v-model:value="form.noticeContent" :rows="4" placeholder="输入通知内容" />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="$emit('update:modelValue', false)">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="handleConfirm">发送</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
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
  noticeTitle: '',
  noticeContent: ''
})

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return
    form.receiverType = 'all_mentor'
    form.noticeTitle = ''
    form.noticeContent = ''
  },
  { immediate: true }
)

const defaultReceiverLabel = (receiverType: NoticeReceiverType) => {
  const map: Record<string, string> = {
    all_mentor: '全部导师',
    target_mentor: '指定导师',
    all_student: '全部学员',
    target_student: '指定学员'
  }
  return map[receiverType] ?? ''
}

const handleConfirm = () => {
  emit('confirm', {
    receiverType: form.receiverType,
    receiverLabel: defaultReceiverLabel(form.receiverType),
    noticeTitle: form.noticeTitle,
    noticeContent: form.noticeContent
  })
}
</script>
