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
        <span>{{ t('admin.profile.mailjob.modal.title') }}</span>
      </span>
    </template>
    <a-form :label-col="{ span: 24 }" layout="vertical">
      <a-form-item :label="t('admin.profile.mailjob.modal.jobTitle')" required>
        <a-input v-model:value="form.jobTitle" :placeholder="t('admin.profile.mailjob.modal.jobTitlePlaceholder')" />
      </a-form-item>
      <a-form-item :label="t('admin.profile.mailjob.modal.recipients')" required>
        <a-select v-model:value="form.recipientGroup" :placeholder="t('admin.profile.mailjob.modal.recipientsPlaceholder')">
          <a-select-option value="全部学员">{{ t('admin.profile.mailjob.modal.recipientGroup.allStudents') }}</a-select-option><!-- i18n-skip-line: backend contract value -->
          <a-select-option value="全部导师">{{ t('admin.profile.mailjob.modal.recipientGroup.allMentors') }}</a-select-option><!-- i18n-skip-line: backend contract value -->
          <a-select-option value="指定班级">{{ t('admin.profile.mailjob.modal.recipientGroup.specificClass') }}</a-select-option><!-- i18n-skip-line: backend contract value -->
        </a-select>
      </a-form-item>
      <a-form-item :label="t('admin.profile.mailjob.modal.emailSubject')" required>
        <a-input v-model:value="form.emailSubject" :placeholder="t('admin.profile.mailjob.modal.emailSubjectPlaceholder')" />
      </a-form-item>
      <a-form-item :label="t('admin.profile.mailjob.modal.emailContent')" required>
        <a-textarea v-model:value="form.emailContent" :rows="5" :placeholder="t('admin.profile.mailjob.modal.emailContentPlaceholder')" />
      </a-form-item>
      <a-form-item :label="t('admin.profile.mailjob.modal.smtpServer')">
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
      <a-button @click="$emit('update:modelValue', false)">{{ t('admin.profile.mailjob.modal.cancel') }}</a-button>
      <a-button type="primary" :loading="submitting" @click="handleConfirm">{{ t('admin.profile.mailjob.modal.createAndSend') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { OverlaySurfaceModal } from '@osg/shared/components'
import type { SmtpServerRow } from '@osg/shared/api/admin/mailjob'

const { t } = useI18n()

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
