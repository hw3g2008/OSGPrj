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
        <span>{{ $t('send_notification') }}</span>
      </span>
    </template>
    <a-form :label-col="{ span: 24 }" layout="vertical">
      <a-form-item :label="$t('recipient_type')" required>
        <a-select v-model:value="form.receiverType">
          <a-select-option value="all_mentor">{{ $t('all_mentors') }}</a-select-option>
          <a-select-option value="target_mentor">{{ $t('specific_mentor') }}</a-select-option>
          <a-select-option value="all_student">{{ $t('all_students') }}</a-select-option>
          <a-select-option value="target_student">{{ $t('specific_student') }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item :label="$t('title')" required>
        <a-input v-model:value="form.noticeTitle" :placeholder="$t('enter_notification_title')" />
      </a-form-item>
      <a-form-item :label="$t('content')" required>
        <a-textarea v-model:value="form.noticeContent" :rows="4" :placeholder="$t('enter_notification_content')" />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="$emit('update:modelValue', false)">{{ $t('cancel') }}</a-button>
      <a-button type="primary" :loading="submitting" @click="handleConfirm">{{ $t('send') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { NoticeReceiverType } from '@osg/shared/api/admin/notice'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
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
    all_mentor: t('all_mentors'),
    target_mentor: t('specific_mentor'),
    all_student: t('all_students'),
    target_student: t('specific_student')
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
