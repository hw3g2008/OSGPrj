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
        <span>{{ t('admin.profile.notice.modal.title') }}</span>
      </span>
    </template>
    <a-form :label-col="{ span: 24 }" layout="vertical">
      <a-form-item :label="t('admin.profile.notice.modal.receiverTypeLabel')" required>
        <a-select v-model:value="form.receiverType">
          <a-select-option value="all_mentor">{{ t('admin.profile.notice.modal.receiverType.allMentor') }}</a-select-option>
          <a-select-option value="target_mentor">{{ t('admin.profile.notice.modal.receiverType.targetMentor') }}</a-select-option>
          <a-select-option value="all_student">{{ t('admin.profile.notice.modal.receiverType.allStudent') }}</a-select-option>
          <a-select-option value="target_student">{{ t('admin.profile.notice.modal.receiverType.targetStudent') }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item :label="t('admin.profile.notice.modal.titleLabel')" required>
        <a-input v-model:value="form.noticeTitle" :placeholder="t('admin.profile.notice.modal.titlePlaceholder')" />
      </a-form-item>
      <a-form-item :label="t('admin.profile.notice.modal.contentLabel')" required>
        <a-textarea v-model:value="form.noticeContent" :rows="4" :placeholder="t('admin.profile.notice.modal.contentPlaceholder')" />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="$emit('update:modelValue', false)">{{ t('admin.profile.notice.modal.cancel') }}</a-button>
      <a-button type="primary" :loading="submitting" @click="handleConfirm">{{ t('admin.profile.notice.modal.send') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { OverlaySurfaceModal } from '@osg/shared/components'
import type { NoticeReceiverType } from '@osg/shared/api/admin/notice'

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
  const map: Record<string, () => string> = {
    all_mentor: () => t('admin.profile.notice.modal.receiverType.allMentor'),
    target_mentor: () => t('admin.profile.notice.modal.receiverType.targetMentor'),
    all_student: () => t('admin.profile.notice.modal.receiverType.allStudent'),
    target_student: () => t('admin.profile.notice.modal.receiverType.targetStudent')
  }
  return map[receiverType]?.() ?? ''
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
