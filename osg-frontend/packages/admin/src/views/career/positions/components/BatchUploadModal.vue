<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="position-batch-upload-modal"
    width="520px"
    :body-class="'batch-upload-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="batch-upload-modal__title">
        <span class="mdi mdi-upload" aria-hidden="true"></span>
        <span>批量上传岗位</span>
      </div>
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
        <button type="button" class="batch-upload-modal__choose" @click.stop="fileInputRef?.click()">
          <i class="mdi mdi-file-excel" aria-hidden="true"></i>
          选择Excel文件
        </button>
      </div>

      <div class="batch-upload-modal__rule">
        <i class="mdi mdi-information" aria-hidden="true"></i>
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
      <div class="batch-upload-modal__footer">
        <button type="button" class="batch-upload-modal__secondary" @click="handleClose">取消</button>
        <button type="button" class="batch-upload-modal__primary" :disabled="!selectedFile" @click="handleSubmit">
          <i class="mdi mdi-upload" aria-hidden="true"></i>
          上传文件
        </button>
      </div>
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
.batch-upload-modal__title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #20304a;
}

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

.batch-upload-modal__choose {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  border: 1px solid #cdd7e5;
  border-radius: 10px;
  padding: 10px 16px;
  background: #fff;
  color: #475569;
  font-weight: 600;
  cursor: pointer;
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

.batch-upload-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.batch-upload-modal__secondary,
.batch-upload-modal__primary {
  border-radius: 10px;
  min-height: 40px;
  padding: 0 16px;
  font-weight: 600;
  cursor: pointer;
}

.batch-upload-modal__secondary {
  border: 1px solid #d4deeb;
  background: #fff;
  color: #4a5c78;
}

.batch-upload-modal__primary {
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #6b6ef7 0%, #7b61ff 100%);
  color: #fff;
}

.batch-upload-modal__primary:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
