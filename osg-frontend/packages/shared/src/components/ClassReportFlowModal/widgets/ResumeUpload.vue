<template>
  <div class="resume-upload osg-modal-form">
    <div v-if="slotLabel" class="resume-upload__label">{{ slotLabel }}</div>
    <a-upload
      :file-list="fileList"
      :before-upload="beforeUpload"
      :accept="accept"
      :disabled="disabled"
      :multiple="false"
      :max-count="1"
      @change="onChange"
      @remove="onRemove"
    >
      <a-button>
        <template #icon>
          <upload-outlined />
        </template>
        {{ t('common.shared.classReport.resumeUpload.selectFile') }}
      </a-button>
      <span class="resume-upload__hint">
        {{ t('common.shared.classReport.resumeUpload.hint', { mb: maxSizeMb }) }}
      </span>
    </a-upload>
  </div>
</template>

<script setup lang="ts">
/**
 * S-055 §3.5.5 ResumeUpload
 *
 * 单文件简历上传（pdf/doc/docx，≤10MB）。
 * - props.slotLabel 用于区分原简历 / 新简历等不同槽位
 * - 新文件会替换旧 url（单槽位）
 * - remove → update:modelValue(undefined)
 */
import { computed } from 'vue'
import { Upload, message } from 'ant-design-vue'
import type { UploadFile } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    modelValue?: string
    slotLabel?: string
    maxSizeMb?: number
    accept?: string
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    slotLabel: '',
    maxSizeMb: 10,
    accept: '.pdf,.doc,.docx',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

const ALLOWED_EXT = ['pdf', 'doc', 'docx']
const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const fileList = computed<UploadFile[]>(() => {
  const url = props.modelValue
  if (!url) return []
  return [
    {
      uid: '-1',
      name: extractFileName(url),
      status: 'done',
      url,
    },
  ]
})

function extractFileName(url: string): string {
  try {
    const last = url.split('?')[0].split('/').pop()
    return last && last.length > 0 ? last : 'resume'
  } catch {
    return 'resume'
  }
}

function beforeUpload(file: File): boolean | typeof Upload.LIST_IGNORE {
  const name = (file.name || '').toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop() || '' : ''
  const mime = (file.type || '').toLowerCase()

  const extOk = ALLOWED_EXT.includes(ext)
  const mimeOk = !mime || ALLOWED_MIME.includes(mime)

  if (!extOk || !mimeOk) {
    message.error(t('common.shared.classReport.resumeUpload.errors.unsupported', { exts: ALLOWED_EXT.join('/') }))
    return Upload.LIST_IGNORE
  }

  const maxBytes = props.maxSizeMb * 1024 * 1024
  if (file.size > maxBytes) {
    message.error(t('common.shared.classReport.resumeUpload.errors.tooLarge', { mb: props.maxSizeMb }))
    return Upload.LIST_IGNORE
  }

  return true
}

interface ChangeInfo {
  file: UploadFile & { response?: { url?: string; data?: { url?: string } } }
  fileList: UploadFile[]
}

function onChange(info: ChangeInfo): void {
  const f = info.file
  if (!f) return
  if (f.status === 'done') {
    const resp = (f as { response?: { url?: string; data?: { url?: string } } })
      .response
    const url = f.url || resp?.url || resp?.data?.url
    if (url) {
      emit('update:modelValue', url)
    }
  } else if (f.status === 'removed') {
    emit('update:modelValue', undefined)
  }
}

function onRemove(): void {
  emit('update:modelValue', undefined)
}
</script>

<style scoped lang="scss">
.resume-upload {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.resume-upload__label {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.resume-upload__hint {
  margin-left: 12px;
  font-size: 12px;
  color: #6b7280;
}
</style>
