<template>
  <div v-if="modelValue" class="folder-modal">
    <div class="folder-modal__backdrop" @click="close" />
    <div class="folder-modal__panel">
      <header class="folder-modal__hero">
        <span class="folder-modal__eyebrow">Resource Files</span>
        <h3>New Folder</h3>
        <p>新建学习资料文件夹，并指定默认班级。</p>
      </header>

      <div class="folder-modal__grid">
        <label class="folder-modal__field">
          <span>Folder Name</span>
          <input v-model.trim="form.folderName" type="text" placeholder="Folder Name">
        </label>

        <label class="folder-modal__field">
          <span>Class</span>
          <select v-model="form.className">
            <option v-for="option in classOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
      </div>

      <footer class="folder-modal__footer">
        <button type="button" class="ghost-button" @click="close">取消</button>
        <button type="button" class="primary-button" :disabled="submitting" @click="submit">创建文件夹</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { CreateFileFolderPayload } from '@osg/shared/api/admin/file'

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

<style scoped lang="scss">
.folder-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
}

.folder-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
}

.folder-modal__panel {
  position: relative;
  z-index: 1;
  width: min(560px, calc(100vw - 32px));
  margin: 72px auto;
  border-radius: 24px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 26px 70px rgba(15, 23, 42, 0.2);
}

.folder-modal__hero {
  padding: 24px;
  color: #eef2ff;
  background: linear-gradient(135deg, #0f766e, #0ea5e9);
}

.folder-modal__hero h3,
.folder-modal__hero p {
  margin: 0;
}

.folder-modal__eyebrow {
  display: inline-flex;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.folder-modal__grid {
  display: grid;
  gap: 16px;
  padding: 24px;
}

.folder-modal__field {
  display: grid;
  gap: 8px;
}

.folder-modal__field input,
.folder-modal__field select {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 10px 12px;
  font: inherit;
}

.folder-modal__footer {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 0 24px 24px;
}

.ghost-button,
.primary-button {
  border: none;
  border-radius: 14px;
  padding: 12px 16px;
  font-weight: 600;
  cursor: pointer;
}

.ghost-button {
  background: #f1f5f9;
  color: #334155;
}

.primary-button {
  background: #0f766e;
  color: #fff;
}
</style>
