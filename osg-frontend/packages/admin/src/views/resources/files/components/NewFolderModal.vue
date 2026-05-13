<template>
  <OverlaySurfaceModal
    surface-id="modal-new-folder"
    :open="modelValue"
    width="480px"
    @cancel="close"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-folder-plus-outline" aria-hidden="true" />
        <span>新建文件夹</span>
      </span>
    </template>

    <a-form layout="vertical">
      <a-form-item label="Folder Name">
        <a-input v-model:value="form.folderName" placeholder="Folder Name" />
      </a-form-item>
      <a-form-item label="Class">
        <a-select v-model:value="form.className">
          <a-select-option v-for="option in classOptions" :key="option" :value="option">{{ option }}</a-select-option>
        </a-select>
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="close">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="submit">创建文件夹</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { CreateFileFolderPayload } from '@osg/shared/api/admin/file'
import { OverlaySurfaceModal } from '@osg/shared/components'

const classOptions = ['All', '2024Fall', '2025Spring']

const props = withDefaults(defineProps<{
  modelValue: boolean
  submitting?: boolean
}>(), {
  submitting: false
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm', payload: CreateFileFolderPayload): void
}>()

const initialForm = (): CreateFileFolderPayload => ({
  folderName: '',
  className: 'All'
})

const form = reactive<CreateFileFolderPayload>(initialForm())

watch(() => props.modelValue, (open) => {
  if (!open) {
    Object.assign(form, initialForm())
  }
})

const close = () => {
  emit('update:modelValue', false)
}

const submit = () => {
  emit('confirm', {
    folderName: form.folderName,
    className: form.className
  })
}
</script>
