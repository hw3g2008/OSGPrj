<template>
  <OverlaySurfaceModal
    surface-id="modal-file-auth"
    :open="modelValue"
    width="560px"
    @cancel="close"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-shield-key-outline" aria-hidden="true" />
        <span>文件授权</span>
      </span>
    </template>

    <p style="margin:0 0 16px;color:#64748b">{{ row?.fileName || '当前文件' }} 的可访问范围设置。</p>

    <a-form layout="vertical">
      <a-form-item label="授权类型">
        <a-radio-group v-model:value="authType">
          <a-radio value="all">全部用户</a-radio>
          <a-radio value="class">指定班级</a-radio>
          <a-radio value="user">指定用户</a-radio>
        </a-radio-group>
      </a-form-item>

      <a-form-item v-if="authType === 'class'" label="班级范围">
        <a-checkbox-group v-model:value="authorizedClasses" :options="classOptions" />
      </a-form-item>

      <template v-if="authType === 'user'">
        <a-form-item label="添加用户">
          <div style="display:flex;gap:8px">
            <a-input v-model:value="draftUser" placeholder="添加用户" style="flex:1" @press-enter="addUser" />
            <a-button @click="addUser">添加</a-button>
          </div>
        </a-form-item>
        <div v-if="authorizedUsers.length" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
          <a-tag v-for="user in authorizedUsers" :key="user" closable @close="removeUser(user)">{{ user }}</a-tag>
        </div>
      </template>
    </a-form>

    <template #footer>
      <a-button @click="close">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="submit">保存授权</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FileAuthType, FileRow, UpdateFileAuthPayload } from '@osg/shared/api/admin/file'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

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
