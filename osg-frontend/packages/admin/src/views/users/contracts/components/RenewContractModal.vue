<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="renew-contract-modal"
    width="600px"
    :body-class="'renew-contract-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="renew-contract-modal__title-wrap">
        <div>
          <span class="renew-contract-modal__eyebrow">Renew Contract</span>
          <div class="renew-contract-modal__title">
            <span class="mdi mdi-file-sign" aria-hidden="true"></span>
            <span>{{ modalTitle }}</span>
          </div>
        </div>
        <span class="renew-contract-modal__mode">{{ presetContract ? '列表续签入口' : '顶部新增入口' }}</span>
      </div>
    </template>

    <div class="renew-contract-modal__grid">
      <label class="renew-contract-modal__field">
        <span>学员</span>
        <template v-if="presetContract">
          <div class="renew-contract-modal__locked">{{ presetContract.studentName }} · ID {{ presetContract.studentId }}</div>
        </template>
        <select v-else v-model="form.studentId" class="renew-contract-modal__select">
          <option value="">请选择学员</option>
          <option v-for="option in studentOptions" :key="option.studentId" :value="String(option.studentId)">
            {{ option.studentName }} · ID {{ option.studentId }}
          </option>
        </select>
      </label>

      <label class="renew-contract-modal__field">
        <span>续签金额(¥)</span>
        <input v-model="form.contractAmount" type="number" min="0" step="100" class="renew-contract-modal__input" />
      </label>

      <label class="renew-contract-modal__field">
        <span>续签课时(h)</span>
        <input v-model="form.totalHours" type="number" min="0" step="1" class="renew-contract-modal__input" />
      </label>

      <label class="renew-contract-modal__field">
        <span>开始日期</span>
        <input v-model="form.startDate" type="date" class="renew-contract-modal__input" />
      </label>

      <label class="renew-contract-modal__field">
        <span>结束日期</span>
        <input v-model="form.endDate" type="date" class="renew-contract-modal__input" />
      </label>

      <label class="renew-contract-modal__field renew-contract-modal__field--wide">
        <span>续签原因</span>
        <select v-model="form.renewalReason" class="renew-contract-modal__select">
          <option value="">请选择续签原因</option>
          <option v-for="option in renewalReasonOptions" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>

      <label v-if="requiresOtherReason" class="renew-contract-modal__field renew-contract-modal__field--wide">
        <span>其他原因说明</span>
        <input v-model="form.otherReason" type="text" class="renew-contract-modal__input" placeholder="请输入补充说明" />
      </label>

      <label class="renew-contract-modal__field renew-contract-modal__field--wide">
        <span>合同附件（PDF）</span>
        <div class="renew-contract-modal__upload">
          <input
            ref="fileInputRef"
            type="file"
            accept=".pdf,application/pdf"
            class="renew-contract-modal__file-input"
            @change="handleFileSelect"
          />
          <button type="button" class="renew-contract-modal__upload-button" :disabled="uploading" @click="triggerFileSelect">
            <span class="mdi mdi-paperclip" aria-hidden="true"></span>
            <span>{{ uploading ? '上传中...' : '上传附件' }}</span>
          </button>
          <span v-if="form.attachmentName" class="renew-contract-modal__upload-name">{{ form.attachmentName }}</span>
        </div>
        <div v-if="uploading || form.uploadProgress > 0" class="renew-contract-modal__progress">
          <div class="renew-contract-modal__progress-bar" :style="{ width: `${form.uploadProgress}%` }"></div>
        </div>
      </label>

      <label class="renew-contract-modal__field renew-contract-modal__field--wide">
        <span>备注</span>
        <textarea v-model="form.remark" class="renew-contract-modal__textarea" rows="3" placeholder="选填"></textarea>
      </label>
    </div>

    <template #footer>
      <div class="renew-contract-modal__footer">
        <button type="button" class="renew-contract-modal__secondary" @click="handleClose">取消</button>
        <button type="button" class="renew-contract-modal__primary" :disabled="submitting || uploading" @click="handleSubmit">
          {{ submitting ? '提交中...' : '确认续签' }}
        </button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import {
  renewContract,
  uploadContractAttachment,
  type ContractListItem,
} from '@osg/shared/api/admin/contract'

interface StudentOption {
  studentId: number
  studentName: string
}

const renewalReasonOptions = [
  '课时不足加课',
  '合同到期续签',
  '增加辅导内容',
  '延长服务周期',
  '其他原因',
]

const props = defineProps<{
  visible: boolean
  studentOptions: StudentOption[]
  presetContract?: ContractListItem | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submitted: []
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const submitting = ref(false)

const form = reactive({
  studentId: '',
  contractAmount: '5000',
  totalHours: '20',
  startDate: '',
  endDate: '',
  renewalReason: '',
  otherReason: '',
  attachmentPath: '',
  attachmentName: '',
  uploadProgress: 0,
  remark: '',
})

const presetContract = computed(() => props.presetContract || null)
const requiresOtherReason = computed(() => form.renewalReason === '其他原因')
const modalTitle = computed(() => presetContract.value ? `为 ${presetContract.value.studentName} 续签合同` : '续签合同')

const resetForm = () => {
  const today = new Date()
  const after90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
  form.studentId = presetContract.value ? String(presetContract.value.studentId) : ''
  form.contractAmount = presetContract.value?.contractAmount ? String(presetContract.value.contractAmount) : '5000'
  form.totalHours = presetContract.value?.totalHours ? String(presetContract.value.totalHours) : '20'
  form.startDate = today.toISOString().slice(0, 10)
  form.endDate = after90Days.toISOString().slice(0, 10)
  form.renewalReason = ''
  form.otherReason = ''
  form.attachmentPath = ''
  form.attachmentName = ''
  form.uploadProgress = 0
  form.remark = ''
  uploading.value = false
  submitting.value = false
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  form.uploadProgress = 25
  try {
    const result = await uploadContractAttachment(file)
    form.uploadProgress = 100
    form.attachmentPath = result.attachmentPath
    form.attachmentName = file.name
    message.success('合同附件上传成功')
  } catch (_error) {
    form.uploadProgress = 0
  } finally {
    uploading.value = false
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  const studentId = Number(form.studentId)
  if (!studentId) {
    message.error('请选择学员')
    return
  }
  if (!form.startDate || !form.endDate) {
    message.error('请选择合同起止日期')
    return
  }
  if (!form.renewalReason) {
    message.error('请选择续签原因')
    return
  }
  if (requiresOtherReason.value && !form.otherReason.trim()) {
    message.error('请填写其他原因说明')
    return
  }

  submitting.value = true
  try {
    await renewContract({
      studentId,
      contractAmount: Number(form.contractAmount || 0),
      totalHours: Number(form.totalHours || 0),
      startDate: form.startDate,
      endDate: form.endDate,
      renewalReason: form.renewalReason,
      otherReason: form.otherReason.trim() || undefined,
      attachmentPath: form.attachmentPath || undefined,
      remark: form.remark.trim() || undefined,
    })
    message.success('续签合同成功')
    emit('submitted')
    emit('update:visible', false)
  } finally {
    submitting.value = false
  }
}

watch(() => props.visible, (visible) => {
  if (visible) {
    resetForm()
  }
}, { immediate: true })
</script>

<style scoped lang="scss">
/* ── Header (override OverlaySurfaceModal header) ── */
:global([data-surface-id="renew-contract-modal"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #F59E0B, #FBBF24) !important;
  border-bottom: none !important;
  border-radius: 16px 16px 0 0;
  padding: 22px 26px !important;
}

:global([data-surface-id="renew-contract-modal"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;

  &:hover {
    background: rgba(255, 255, 255, 0.35) !important;
  }
}

.renew-contract-modal__title-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.renew-contract-modal__eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.85);
}

.renew-contract-modal__title {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.renew-contract-modal__mode {
  border-radius: 999px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.85);
  color: #92400E;
  font-size: 12px;
  font-weight: 700;
}

.renew-contract-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.renew-contract-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #40536d;
  font-size: 13px;
  font-weight: 600;
}

.renew-contract-modal__field--wide {
  grid-column: 1 / -1;
}

.renew-contract-modal__input,
.renew-contract-modal__select,
.renew-contract-modal__textarea,
.renew-contract-modal__locked {
  min-height: 42px;
  border-radius: 12px;
  border: 1px solid #d5dfeb;
  background: #fff;
  padding: 0 14px;
  color: #1f3552;
}

.renew-contract-modal__textarea {
  padding: 12px 14px;
}

.renew-contract-modal__locked {
  display: flex;
  align-items: center;
  background: #f7f9fc;
}

.renew-contract-modal__upload {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.renew-contract-modal__file-input {
  display: none;
}

.renew-contract-modal__upload-button,
.renew-contract-modal__secondary,
.renew-contract-modal__primary {
  border: none;
  border-radius: 12px;
  min-height: 42px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 600;
}

.renew-contract-modal__upload-button,
.renew-contract-modal__secondary {
  background: #f7f9fc;
  color: #1d3552;
  border: 1px solid #d8e1ed;
}

.renew-contract-modal__primary {
  background: linear-gradient(135deg, #F59E0B, #D97706);
  color: #fff;
}

.renew-contract-modal__upload-name {
  font-size: 12px;
  color: #5b708d;
}

.renew-contract-modal__progress {
  margin-top: 10px;
  height: 8px;
  border-radius: 999px;
  background: #eaf0f6;
  overflow: hidden;
}

.renew-contract-modal__progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #F59E0B, #D97706);
  transition: width 0.18s ease;
}

.renew-contract-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 900px) {
  .renew-contract-modal__title-wrap {
    flex-direction: column;
    align-items: flex-start;
  }

  .renew-contract-modal__grid {
    grid-template-columns: 1fr;
  }
}
</style>
