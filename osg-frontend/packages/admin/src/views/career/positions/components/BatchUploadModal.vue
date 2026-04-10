<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-position-upload"
    width="520px"
    :body-class="'batch-upload-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-upload" aria-hidden="true"></span>
        <span>批量上传岗位</span>
      </span>
    </template>

    <div class="batch-upload-modal__panel">
      <div class="batch-upload-modal__dropzone" @click="fileInputRef?.click()">
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx,.xls"
          class="batch-upload-modal__file-input"
          @change="handleFileSelect"
        />
        <span class="mdi mdi-cloud-upload batch-upload-modal__icon" aria-hidden="true"></span>
        <strong>{{ selectedFile?.name || '拖拽文件到此处，或点击选择文件' }}</strong>
        <p>支持 Excel 文件上传，导入后会直接刷新岗位列表</p>
        <a-button @click.stop="fileInputRef?.click()">
          <span class="mdi mdi-file-excel" aria-hidden="true" style="margin-right:4px"></span>选择Excel文件
        </a-button>
      </div>

      <div class="batch-upload-modal__rule">
        <span class="mdi mdi-information" aria-hidden="true"></span>
        <p><strong>排重规则：</strong>{{ uploadRuleCopy }}</p>
      </div>

      <div class="batch-upload-modal__steps">
        <p>操作步骤：</p>
        <ol>
          <li v-for="step in uploadSteps" :key="step">{{ step }}</li>
        </ol>
      </div>
    </div>

    <template #footer>
      <a-button @click="handleClose">取消</a-button>
      <a-button type="primary" :disabled="!selectedFile" @click="handleSubmit">
        <span class="mdi mdi-upload" aria-hidden="true" style="margin-right:4px"></span>上传文件
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

withDefaults(defineProps<{
  visible: boolean
  uploadRuleCopy?: string
  uploadSteps?: string[]
}>(), {
  uploadRuleCopy: '',
  uploadSteps: () => []
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [file: File]
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)

const handleClose = () => {
  selectedFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
  emit('update:visible', false)
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  if (!/\.xlsx?$/.test(file.name.toLowerCase())) {
    message.error('请上传 Excel 文件')
    return
  }
  selectedFile.value = file
}

const handleSubmit = () => {
  if (!selectedFile.value) {
    message.error('请先选择 Excel 文件')
    return
  }
  emit('submit', selectedFile.value)
}
</script>

<style scoped lang="scss">
.batch-upload-modal__panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.batch-upload-modal__dropzone {
  border: 2px dashed #d8deeb;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  background: #f8fafc;
  cursor: pointer;
}

.batch-upload-modal__file-input {
  display: none;
}

.batch-upload-modal__icon {
  display: block;
  margin-bottom: 10px;
  font-size: 48px;
  color: #94a3b8;
}

.batch-upload-modal__dropzone strong {
  display: block;
  color: #334155;
  font-size: 15px;
}

.batch-upload-modal__dropzone p {
  margin: 12px 0 0;
  color: #64748b;
  font-size: 13px;
}

.batch-upload-modal__rule {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 8px;
  background: #fef3c7;
  color: #92400e;
  font-size: 13px;
}

.batch-upload-modal__rule p {
  margin: 0;
}

.batch-upload-modal__steps {
  color: #475569;
  font-size: 13px;
}

.batch-upload-modal__steps p {
  margin: 0 0 8px;
}

.batch-upload-modal__steps ol {
  margin: 0;
  padding-left: 20px;
  line-height: 1.8;
}

</style>
