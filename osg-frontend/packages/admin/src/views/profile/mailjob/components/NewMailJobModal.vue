<template>
  <a-modal
    :open="modelValue"
    :width="550"
    :confirm-loading="submitting"
    ok-text="创建并发送"
    cancel-text="取消"
    @ok="handleConfirm"
    @cancel="$emit('update:modelValue', false)"
  >
    <template #title>
      <span><MailOutlined style="margin-right: 8px" />新建邮件任务</span>
    </template>
    <a-form :label-col="{ span: 24 }" layout="vertical">
      <a-form-item label="任务标题" required>
        <a-input v-model:value="form.jobTitle" placeholder="输入任务标题" />
      </a-form-item>
      <a-form-item label="收件人" required>
        <a-select v-model:value="form.recipientGroup" placeholder="选择收件人组...">
          <a-select-option value="全部学员">全部学员</a-select-option>
          <a-select-option value="全部导师">全部导师</a-select-option>
          <a-select-option value="指定班级">指定班级</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="邮件主题" required>
        <a-input v-model:value="form.emailSubject" placeholder="输入邮件主题" />
      </a-form-item>
      <a-form-item label="邮件内容" required>
        <a-textarea v-model:value="form.emailContent" :rows="5" placeholder="输入邮件内容" />
      </a-form-item>
      <a-form-item label="SMTP服务器">
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
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { MailOutlined } from '@ant-design/icons-vue'
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
