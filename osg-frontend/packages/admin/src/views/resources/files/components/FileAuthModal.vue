<template>
  <div v-if="modelValue" class="auth-modal">
    <div class="auth-modal__backdrop" @click="close" />
    <div class="auth-modal__panel">
      <header class="auth-modal__hero">
        <span class="auth-modal__eyebrow">File Authorization</span>
        <h3>文件授权</h3>
        <p>{{ row?.fileName || '当前文件' }} 的可访问范围设置。</p>
      </header>

      <section class="auth-modal__section">
        <label class="auth-modal__choice">
          <input v-model="authType" type="radio" value="all">
          <span>全部用户</span>
        </label>
        <label class="auth-modal__choice">
          <input v-model="authType" type="radio" value="class">
          <span>指定班级</span>
        </label>
        <label class="auth-modal__choice">
          <input v-model="authType" type="radio" value="user">
          <span>指定用户</span>
        </label>
      </section>

      <section v-if="authType === 'class'" class="auth-modal__section auth-modal__section--stack">
        <strong>班级范围</strong>
        <label v-for="option in classOptions" :key="option" class="auth-modal__choice">
          <input v-model="authorizedClasses" type="checkbox" :value="option">
          <span>{{ option }}</span>
        </label>
      </section>

      <section v-if="authType === 'user'" class="auth-modal__section auth-modal__section--stack">
        <strong>添加用户</strong>
        <div class="auth-modal__adder">
          <input v-model.trim="draftUser" type="text" placeholder="添加用户">
          <button type="button" class="ghost-button" @click="addUser">添加用户</button>
        </div>
        <div class="auth-modal__tags">
          <span v-for="user in authorizedUsers" :key="user" class="auth-modal__tag">
            {{ user }}
            <button type="button" @click="removeUser(user)">×</button>
          </span>
        </div>
      </section>

      <footer class="auth-modal__footer">
        <button type="button" class="ghost-button" @click="close">取消</button>
        <button type="button" class="primary-button" :disabled="submitting" @click="submit">保存授权</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FileAuthType, FileRow, UpdateFileAuthPayload } from '@osg/shared/api/admin/file'

const classOptions = ['2024Fall', '2025Spring']

const props = withDefaults(defineProps<{
  modelValue: boolean
  row?: FileRow | null
  submitting?: boolean
}>(), {
  row: null,
  submitting: false
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm', payload: UpdateFileAuthPayload): void
}>()

const authType = ref<FileAuthType>('all')
const authorizedClasses = ref<string[]>([])
const authorizedUsers = ref<string[]>([])
const draftUser = ref('')

watch(() => [props.modelValue, props.row] as const, ([open, row]) => {
  if (!open) {
    authType.value = 'all'
    authorizedClasses.value = []
    authorizedUsers.value = []
    draftUser.value = ''
    return
  }

  authType.value = row?.authType ?? 'all'
  authorizedClasses.value = row?.authType === 'class' && row.authorizedTo ? row.authorizedTo.split(', ').filter(Boolean) : []
  authorizedUsers.value = row?.authType === 'user' && row.authorizedTo ? row.authorizedTo.split(', ').filter(Boolean) : []
  draftUser.value = ''
}, { immediate: true })

const close = () => {
  emit('update:modelValue', false)
}

const addUser = () => {
  if (!draftUser.value || authorizedUsers.value.includes(draftUser.value)) return
  authorizedUsers.value = [...authorizedUsers.value, draftUser.value]
  draftUser.value = ''
}

const removeUser = (user: string) => {
  authorizedUsers.value = authorizedUsers.value.filter((item) => item !== user)
}

const submit = () => {
  if (!props.row) return

  emit('confirm', {
    fileId: props.row.fileId,
    authType: authType.value,
    authorizedClasses: authType.value === 'class' ? authorizedClasses.value : undefined,
    authorizedUsers: authType.value === 'user' ? authorizedUsers.value : undefined
  })
}
</script>

<style scoped lang="scss">
.auth-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
}

.auth-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
}

.auth-modal__panel {
  position: relative;
  z-index: 1;
  width: min(620px, calc(100vw - 32px));
  margin: 52px auto;
  border-radius: 24px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 26px 70px rgba(15, 23, 42, 0.2);
}

.auth-modal__hero {
  padding: 24px;
  color: #eff6ff;
  background: linear-gradient(135deg, #1d4ed8, #0f172a);
}

.auth-modal__hero h3,
.auth-modal__hero p {
  margin: 0;
}

.auth-modal__eyebrow {
  display: inline-flex;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.auth-modal__section {
  display: flex;
  gap: 16px;
  padding: 24px 24px 0;
  flex-wrap: wrap;
}

.auth-modal__section--stack {
  display: grid;
  gap: 12px;
}

.auth-modal__choice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.auth-modal__adder {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.auth-modal__adder input {
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 10px 12px;
  font: inherit;
}

.auth-modal__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.auth-modal__tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  padding: 8px 12px;
}

.auth-modal__tag button {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.auth-modal__footer {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 24px;
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
  background: #1d4ed8;
  color: #fff;
}
</style>
