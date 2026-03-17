<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="$emit('update:modelValue', false)">
    <div class="modal-shell">
      <header class="modal-shell__header">
        <div>
          <p class="modal-shell__eyebrow">Question Bank</p>
          <h3>{{ mode === 'create' ? 'New Folder' : '编辑题库文件夹' }}</h3>
        </div>
        <button type="button" class="modal-shell__close" @click="$emit('update:modelValue', false)">×</button>
      </header>

      <div class="modal-shell__body">
        <label class="field">
          <span>Folder Name</span>
          <input v-model.trim="form.folderName" type="text" placeholder="Folder Name">
        </label>

        <label class="field">
          <span>授权类型</span>
          <select v-model="form.authType">
            <option value="all">全部用户</option>
            <option value="class">指定班级</option>
            <option value="user">指定用户</option>
          </select>
        </label>

        <label v-if="form.authType === 'class'" class="field">
          <span>指定班级</span>
          <input v-model.trim="form.authorizedClasses" type="text" placeholder="例如：2024Fall, 2025Spring">
        </label>

        <label v-if="form.authType === 'user'" class="field">
          <span>指定用户</span>
          <input v-model.trim="form.authorizedUsers" type="text" placeholder="例如：Alice Zhang, Bob Li">
        </label>

        <label class="field">
          <span>过期时间</span>
          <input v-model="form.expiryAt" type="datetime-local">
        </label>
      </div>

      <footer class="modal-shell__footer">
        <button type="button" class="ghost-button" @click="$emit('update:modelValue', false)">取消</button>
        <button type="button" class="primary-button" :disabled="submitting || !form.folderName" @click="handleConfirm">保存</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { QbankAuthType, QbankFolderRow } from '@osg/shared/api/admin/qbank'

const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'edit'
  row?: QbankFolderRow | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm', payload: {
    folderName: string
    authType: QbankAuthType
    authorizedClasses: string[]
    authorizedUsers: string[]
    expiryAt?: string
  }): void
}>()

const form = reactive({
  folderName: '',
  authType: 'all' as QbankAuthType,
  authorizedClasses: '',
  authorizedUsers: '',
  expiryAt: ''
})

watch(
  () => [props.modelValue, props.row, props.mode] as const,
  ([visible, row, mode]) => {
    if (!visible) return
    form.folderName = row?.fileName || ''
    form.authType = (row?.authType || 'all') as QbankAuthType
    form.authorizedClasses = form.authType === 'class' ? row?.authorizedTo || '' : ''
    form.authorizedUsers = form.authType === 'user' ? row?.authorizedTo || '' : ''
    form.expiryAt = row?.expiryAt ? row.expiryAt.replace(' ', 'T') : ''
    if (mode === 'create')
    {
      form.authType = 'all'
      form.authorizedClasses = ''
      form.authorizedUsers = ''
      form.expiryAt = ''
    }
  },
  { immediate: true }
)

const splitCsv = (value: string) => {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const handleConfirm = () => {
  emit('confirm', {
    folderName: form.folderName,
    authType: form.authType,
    authorizedClasses: splitCsv(form.authorizedClasses),
    authorizedUsers: splitCsv(form.authorizedUsers),
    expiryAt: form.expiryAt || undefined
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
  background: linear-gradient(135deg, #0f766e, #0f766e);
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
.field select {
  width: 100%;
  height: 42px;
  padding: 0 12px;
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
