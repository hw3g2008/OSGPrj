<template>
  <div class="screenshot-upload osg-modal-form">
    <a-upload-dragger
      :file-list="fileList"
      :before-upload="beforeUpload"
      :accept="accept"
      :disabled="disabled"
      :multiple="true"
      list-type="picture"
      @change="onChange"
      @remove="onRemove"
    >
      <p class="screenshot-upload__hint">
        <span>{{ t('common.shared.classReport.screenshotUpload.dragHint') }}</span>
      </p>
      <p class="screenshot-upload__sub">
        {{ t('common.shared.classReport.screenshotUpload.spec', { mb: maxSizeMb, count: maxCount }) }}
      </p>
    </a-upload-dragger>
  </div>
</template>

<script setup lang="ts">
/**
 * S-055 §3.5.3 ScreenshotUpload
 *
 * 多文件上传，仅接受 png/jpg/jpeg/pdf。
 * - 单文件 > maxSizeMb（默认 10MB）→ message.error 并 LIST_IGNORE
 * - 总数 > maxCount（默认 10）→ message.error 并 LIST_IGNORE
 * - 上传成功后只把服务端返回 url 追加到 modelValue，不存原始 file 对象
 */
import { computed } from 'vue'
import { Upload, message } from 'ant-design-vue'
import type { UploadFile } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    modelValue?: string[]
    maxCount?: number
    maxSizeMb?: number
    accept?: string
    disabled?: boolean
  }>(),
  {
    modelValue: () => [],
    maxCount: 10,
    maxSizeMb: 10,
    accept: '.png,.jpg,.jpeg,.pdf',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const ALLOWED_EXT = ['png', 'jpg', 'jpeg', 'pdf']
const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
]

const urls = computed<string[]>(() => props.modelValue ?? [])

const fileList = computed<UploadFile[]>(() =>
  urls.value.map((url, idx) => ({
    uid: String(-(idx + 1)),
    name: extractFileName(url, idx),
    status: 'done',
    url,
  })),
)

function extractFileName(url: string, idx: number): string {
  try {
    const last = url.split('?')[0].split('/').pop()
    return last && last.length > 0 ? last : `screenshot-${idx + 1}`
  } catch {
    return `screenshot-${idx + 1}`
  }
}

function beforeUpload(file: File): boolean | typeof Upload.LIST_IGNORE {
  const name = (file.name || '').toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop() || '' : ''
  const mime = (file.type || '').toLowerCase()

  const extOk = ALLOWED_EXT.includes(ext)
  const mimeOk = !mime || ALLOWED_MIME.includes(mime)

  if (!extOk || !mimeOk) {
    message.error(t('common.shared.classReport.screenshotUpload.errors.unsupported', { exts: ALLOWED_EXT.join('/') }))
    return Upload.LIST_IGNORE
  }

  const maxBytes = props.maxSizeMb * 1024 * 1024
  if (file.size > maxBytes) {
    message.error(t('common.shared.classReport.screenshotUpload.errors.tooLarge', { mb: props.maxSizeMb }))
    return Upload.LIST_IGNORE
  }

  if (urls.value.length >= props.maxCount) {
    message.error(t('common.shared.classReport.screenshotUpload.errors.tooMany', { count: props.maxCount }))
    return Upload.LIST_IGNORE
  }

  return true
}

interface ChangeInfo {
  fileList: Array<UploadFile & { response?: { url?: string; data?: { url?: string } } }>
}

function onChange(info: ChangeInfo): void {
  const next = (info.fileList || [])
    .map((f) => {
      if (f.url) return f.url
      const resp = f.response
      if (resp?.url) return resp.url
      if (resp?.data?.url) return resp.data.url
      return ''
    })
    .filter((u): u is string => Boolean(u))

  emit('update:modelValue', next)
}

function onRemove(file: UploadFile): void {
  const target = file.url
  if (!target) return
  emit(
    'update:modelValue',
    urls.value.filter((u) => u !== target),
  )
}
</script>

<style scoped lang="scss">
.screenshot-upload {
  width: 100%;
}

.screenshot-upload__hint {
  margin: 0;
  font-size: 14px;
  color: #1f2937;
}

.screenshot-upload__sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6b7280;
}
</style>
