<template>
  <OverlaySurfaceModal
    surface-id="modal-new-mailjob"
    :open="modelValue"
    width="550px"
    @cancel="$emit('update:modelValue', false)"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-email-outline" aria-hidden="true" />
        <span>{{ $t('new_email_task') }}</span>
      </span>
    </template>
    <a-form :label-col="{ span: 24 }" layout="vertical">
      <a-form-item :label="$t('task_title')" required>
        <a-input v-model:value="form.jobTitle" :placeholder="$t('enter_task_title')" />
      </a-form-item>
      <a-form-item :label="$t('recipients')" required>
        <a-select v-model:value="form.recipientGroup" :placeholder="`${$t('select_recipient_group')}...`">
          <a-select-option :value="$t('all_students')">{{ $t('all_students') }}</a-select-option>
          <a-select-option :value="$t('all_mentors')">{{ $t('all_mentors') }}</a-select-option>
          <a-select-option :value="$t('specific_class')">{{ $t('specific_class') }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item :label="$t('email_subject')" required>
        <a-input v-model:value="form.emailSubject" :placeholder="$t('enter_email_subject')" />
      </a-form-item>
      <a-form-item :label="$t('email_content')" required>
        <a-textarea v-model:value="form.emailContent" :rows="5" :placeholder="$t('enter_email_content')" />
      </a-form-item>
      <a-form-item :label="`SMTP${$t('server')}`">
        <a-select v-model:value="form.smtpServerName">
          <a-select-option
            v-for="server in smtpServers"
            :key="server.serverName"
            :value="server.serverName"
          >
            {{ server.serverName }}
          </a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="$emit('update:modelValue', false)">{{ $t('cancel') }}</a-button>
      <a-button type="primary" :loading="submitting" @click="handleConfirm">{{ $t('create_and_send') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { SmtpServerRow } from '@osg/shared/api/admin/mailjob'

const props = defineProps<{
  modelValue: boolean
  smtpServers: SmtpServerRow[]
  submitting?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm', payload: {
    jobTitle: string
    recipientGroup: string
    emailSubject: string
    emailContent: string
    smtpServerName: string
  }): void
}>()

const form = reactive({
  jobTitle: '',
  recipientGroup: '',
  emailSubject: '',
  emailContent: '',
  smtpServerName: ''
})

watch(
  () => [props.modelValue, props.smtpServers] as const,
  ([visible, smtpServers]) => {
    if (!visible) return
    form.jobTitle = ''
    form.recipientGroup = ''
    form.emailSubject = ''
    form.emailContent = ''
    form.smtpServerName = smtpServers[0]?.serverName || ''
  },
  { immediate: true }
)

const handleConfirm = () => {
  emit('confirm', {
    jobTitle: form.jobTitle,
    recipientGroup: form.recipientGroup,
    emailSubject: form.emailSubject,
    emailContent: form.emailContent,
    smtpServerName: form.smtpServerName
  })
}
</script>

