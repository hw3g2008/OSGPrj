<template>
  <OverlaySurfaceModal
    surface-id="modal-qbank-folder"
    :open="modelValue"
    width="520px"
    @cancel="$emit('update:modelValue', false)"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-folder-cog-outline" aria-hidden="true" />
        <span>{{ mode === 'create' ? $t('new_question_bank_folder') : $t('edit_question_bank_folder') }}</span>
      </span>
    </template>

    <a-form layout="vertical">
      <a-form-item label="Folder Name">
        <a-input v-model:value="form.folderName" placeholder="Folder Name" />
      </a-form-item>

      <a-form-item :label="$t('authorization_type')">
        <a-select v-model:value="form.authType">
          <a-select-option value="all">{{ $t('all_users') }}</a-select-option>
          <a-select-option value="class">{{ $t('specific_class') }}</a-select-option>
          <a-select-option value="user">{{ $t('specific_users') }}</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item v-if="form.authType === 'class'" :label="$t('specific_class')">
        <a-input v-model:value="form.authorizedClasses" :placeholder="`${$t('for_example')}：2024Fall, 2025Spring`" />
      </a-form-item>

      <a-form-item v-if="form.authType === 'user'" :label="$t('specific_users')">
        <a-input v-model:value="form.authorizedUsers" :placeholder="`${$t('for_example')}：Alice Zhang, Bob Li`" />
      </a-form-item>

      <a-form-item :label="$t('expiration_date')">
        <a-input v-model:value="form.expiryAt" type="datetime-local" />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="$emit('update:modelValue', false)">{{ $t('cancel') }}</a-button>
      <a-button type="primary" :loading="submitting" :disabled="!form.folderName" @click="handleConfirm">{{ $t('save') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { QbankAuthType, QbankFolderRow } from '@osg/shared/api/admin/qbank'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

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

