<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="$emit('update:modelValue', false)">
    <div class="modal-shell">
      <header class="modal-shell__header">
        <div>
          <p class="modal-shell__eyebrow">Mail Job Center</p>
          <h3>新建任务</h3>
        </div>
        <button type="button" class="modal-shell__close" @click="$emit('update:modelValue', false)">×</button>
      </header>

      <div class="modal-shell__body">
        <label class="field">
          <span>任务标题</span>
          <input v-model.trim="form.jobTitle" type="text" placeholder="请输入任务标题">
        </label>

        <label class="field">
          <span>收件人</span>
          <select v-model="form.recipientGroup">
            <option value="全部学员">全部学员</option>
            <option value="全部导师">全部导师</option>
            <option value="指定班级">指定班级</option>
          </select>
        </label>

        <label class="field">
          <span>邮件主题</span>
          <input v-model.trim="form.emailSubject" type="text" placeholder="请输入邮件主题">
        </label>

        <label class="field">
          <span>邮件内容</span>
          <textarea v-model.trim="form.emailContent" rows="5" placeholder="请输入邮件内容"></textarea>
        </label>

        <label class="field">
          <span>SMTP服务器</span>
          <select v-model="form.smtpServerName">
            <option v-for="server in smtpServers" :key="server.serverName" :value="server.serverName">
              {{ server.serverName }}
            </option>
          </select>
        </label>
      </div>

      <footer class="modal-shell__footer">
        <button type="button" class="ghost-button" @click="$emit('update:modelValue', false)">取消</button>
        <button type="button" class="primary-button" :disabled="submitting" @click="handleConfirm">创建任务</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
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
  recipientGroup: '全部学员',
  emailSubject: '',
  emailContent: '',
  smtpServerName: ''
})

watch(
  () => [props.modelValue, props.smtpServers] as const,
  ([visible, smtpServers]) => {
    if (!visible) return
    form.jobTitle = ''
    form.recipientGroup = '全部学员'
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
  width: min(620px, 100%);
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
  background: linear-gradient(135deg, #1d4ed8, #0f766e);
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
  background: #1d4ed8;
}

.ghost-button {
  border: 1px solid #cbd5e1;
  background: #fff;
}
</style>
