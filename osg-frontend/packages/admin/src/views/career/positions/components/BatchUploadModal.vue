<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="position-batch-upload-modal"
    width="640px"
    :body-class="'batch-upload-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="batch-upload-modal__title-wrap">
        <div>
          <span class="batch-upload-modal__eyebrow">Batch Upload</span>
          <div class="batch-upload-modal__title">
            <span class="mdi mdi-file-excel-box-outline" aria-hidden="true"></span>
            <span>批量上传岗位</span>
          </div>
        </div>
      </div>
    </template>

    <div class="batch-upload-modal__panel">
      <div class="batch-upload-modal__dropzone">
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx,.xls"
          class="batch-upload-modal__file-input"
          @change="handleFileSelect"
        />
        <div class="batch-upload-modal__icon">
          <span class="mdi mdi-cloud-upload-outline" aria-hidden="true"></span>
        </div>
        <strong>{{ selectedFile?.name || '选择 Excel 文件或拖拽到这里' }}</strong>
        <p>排重规则：公司名称 + 岗位名称 + 地区 + 项目时间</p>
        <button type="button" class="batch-upload-modal__choose" @click="fileInputRef?.click()">选择文件</button>
      </div>

      <ul class="batch-upload-modal__steps">
        <li>1. 先下载模板，按字段填好岗位信息</li>
        <li>2. 上传 Excel，系统会自动去重</li>
        <li>3. 成功导入后，岗位页会立即刷新</li>
      </ul>
    </div>

    <template #footer>
      <div class="batch-upload-modal__footer">
        <button type="button" class="batch-upload-modal__secondary" @click="handleClose">取消</button>
        <button type="button" class="batch-upload-modal__primary" :disabled="!selectedFile" @click="handleSubmit">
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

const props = defineProps<{
  visible: boolean
}>()

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
  gap: 18px;
}

.batch-upload-modal__title {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #10213a;
}

.batch-upload-modal__eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #7a8ea8;
}

.batch-upload-modal__dropzone {
  border: 1px dashed #7ea2d0;
  border-radius: 20px;
  padding: 28px;
  text-align: center;
  background: linear-gradient(180deg, #f7fbff 0%, #ffffff 100%);
}

.batch-upload-modal__file-input {
  display: none;
}

.batch-upload-modal__icon {
  font-size: 40px;
  color: #205493;
}

.batch-upload-modal__dropzone strong {
  display: block;
  margin-top: 8px;
  font-size: 18px;
  color: #10213a;
}

.batch-upload-modal__dropzone p {
  margin: 8px 0 0;
  color: #62748d;
}

.batch-upload-modal__choose,
.batch-upload-modal__secondary,
.batch-upload-modal__primary {
  border: none;
  border-radius: 14px;
  min-height: 42px;
  padding: 0 18px;
  font-weight: 600;
  cursor: pointer;
}

.batch-upload-modal__choose {
  margin-top: 16px;
  background: #205493;
  color: #fff;
}

.batch-upload-modal__steps {
  margin: 0;
  padding-left: 18px;
  color: #435a74;
  line-height: 1.7;
}

.batch-upload-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.batch-upload-modal__secondary {
  background: #edf2f7;
  color: #203449;
}

.batch-upload-modal__primary {
  background: linear-gradient(135deg, #1d4e89 0%, #3875b7 100%);
  color: #fff;
}
</style>
