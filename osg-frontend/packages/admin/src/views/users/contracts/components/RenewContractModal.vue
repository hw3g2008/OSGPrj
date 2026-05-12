<template>
  <OverlaySurfaceModal
    :open="visible"
    :surface-id="surfaceId"
    width="720px"
    :body-class="'renew-contract-modal__body osg-modal-form'"
    @cancel="handleClose"
  >
    <template #title>
      <span class="renew-contract-modal__header-title">
        <span class="mdi mdi-file-document-plus renew-contract-modal__header-icon" aria-hidden="true"></span>
        <span>{{ reactivateAccount ? '重新加入 · 续签合同' : '续费/新增合同' }}</span>
      </span>
    </template>

    <a-form
      ref="formRef"
      :model="form"
      layout="vertical"
      :required-mark="false"
    >
      <!-- ══ 学员选择 ══ -->
      <div class="renew-contract-modal__section">
        <a-form-item>
          <template #label>
            <span class="renew-contract-modal__label">
              学员 Student
              <span class="renew-contract-modal__required">*</span>
            </span>
          </template>
          <template v-if="presetContract">
            <div class="renew-contract-modal__student-card">
              <div class="renew-contract-modal__avatar">{{ studentInitials }}</div>
              <div class="renew-contract-modal__student-info">
                <div class="renew-contract-modal__student-name">{{ presetContract.studentName }}</div>
                <div class="renew-contract-modal__student-meta">ID: {{ presetContract.studentId }} · 剩余 {{ presetContract.remainingHours ?? 0 }}h</div>
              </div>
            </div>
          </template>
          <a-select
            v-else
            v-model:value="form.studentId"
            placeholder="请输入学员姓名搜索"
            show-search
            :filter-option="false"
            :loading="studentSearching"
            :not-found-content="studentSearching ? '搜索中…' : '无匹配学员'"
            @search="onStudentSearch"
          >
            <a-select-option v-for="option in remoteStudentOptions" :key="option.studentId" :value="String(option.studentId)">
              {{ option.studentName }} · ID {{ option.studentId }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </div>

      <!-- ══ 合同金额 ══ -->
      <div class="renew-contract-modal__part-title">
        <div class="renew-contract-modal__part-title-heading">
          <i class="mdi mdi-cash-multiple" aria-hidden="true"></i>
          <strong>合同金额</strong>
        </div>
        <p>选择币种并填写金额信息</p>
      </div>

      <div class="renew-contract-modal__section">
        <div class="renew-contract-modal__grid">
          <a-form-item class="renew-contract-modal__field--wide">
            <template #label>
              <span class="renew-contract-modal__label">
                币种
                <span class="renew-contract-modal__required">*</span>
              </span>
            </template>
            <a-radio-group v-model:value="form.currency" class="renew-contract-modal__radio-group">
              <a-radio-button value="USD">美元 (USD)</a-radio-button>
              <a-radio-button value="GBP">英镑 (GBP)</a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item v-if="form.currency === 'GBP'">
            <template #label>
              <span class="renew-contract-modal__label">
                英镑金额
                <span class="renew-contract-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="form.amountGbp"
              class="renew-contract-modal__number"
              :min="0"
              :max="MAX_AMOUNT"
              :precision="2"
              :controls="false"
              placeholder="£ 请输入英镑金额"
            />
          </a-form-item>

          <a-form-item>
            <template #label>
              <span class="renew-contract-modal__label">
                {{ form.currency === 'GBP' ? '美元等值金额' : '金额 Amount' }}
                <span class="renew-contract-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="form.amountUsd"
              class="renew-contract-modal__number"
              :min="0"
              :max="MAX_AMOUNT"
              :precision="2"
              :controls="false"
              :placeholder="form.currency === 'GBP' ? '$ 请输入美元等值金额' : '$ 请输入美元金额'"
            />
          </a-form-item>

          <a-form-item>
            <template #label>
              <span class="renew-contract-modal__label">
                新增课时 / New Hours
                <span class="renew-contract-modal__required">*</span>
              </span>
            </template>
            <a-input-number
              v-model:value="form.totalHours"
              class="renew-contract-modal__number"
              :min="1"
              :max="MAX_CONTRACT_HOURS"
              :precision="0"
              :controls="false"
              placeholder="如 50（本次新增课时数）"
            />
          </a-form-item>
        </div>
      </div>

      <!-- ══ 合同期限 & 续签原因 ══ -->
      <div class="renew-contract-modal__part-title">
        <div class="renew-contract-modal__part-title-heading">
          <i class="mdi mdi-calendar-range" aria-hidden="true"></i>
          <strong>合同期限与原因</strong>
        </div>
        <p>设置合同有效期和续签原因</p>
      </div>

      <div class="renew-contract-modal__section">
        <div class="renew-contract-modal__grid">
          <a-form-item>
            <template #label>
              <span class="renew-contract-modal__label">
                开始日期
                <span class="renew-contract-modal__required">*</span>
              </span>
            </template>
            <a-date-picker v-model:value="form.startDate" style="width: 100%" value-format="YYYY-MM-DD" />
          </a-form-item>

          <a-form-item>
            <template #label>
              <span class="renew-contract-modal__label">
                结束日期
                <span class="renew-contract-modal__required">*</span>
              </span>
            </template>
            <a-date-picker v-model:value="form.endDate" style="width: 100%" value-format="YYYY-MM-DD" />
          </a-form-item>

          <a-form-item class="renew-contract-modal__field--wide">
            <template #label>
              <span class="renew-contract-modal__label">
                续签原因
                <span class="renew-contract-modal__required">*</span>
              </span>
            </template>
            <a-select v-model:value="form.renewalReason" placeholder="请选择续签原因">
              <a-select-option v-for="option in renewalReasonOptions" :key="option.dictValue" :value="option.dictValue">{{ option.dictLabel }}</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item v-if="requiresOtherReason" class="renew-contract-modal__field--wide">
            <template #label>
              <span class="renew-contract-modal__label">
                其他原因说明
                <span class="renew-contract-modal__required">*</span>
              </span>
            </template>
            <a-input v-model:value="form.otherReason" placeholder="请输入补充说明" allow-clear />
          </a-form-item>
        </div>
      </div>

      <!-- ══ 附件 & 备注 ══ -->
      <div class="renew-contract-modal__section">
        <div class="renew-contract-modal__grid">
          <a-form-item class="renew-contract-modal__field--wide">
            <template #label>
              <span class="renew-contract-modal__label">
                合同附件
                <span class="renew-contract-modal__required">*</span>
              </span>
            </template>
            <a-upload-dragger
              :action="uploadAction"
              :headers="uploadHeaders"
              name="file"
              :max-count="1"
              :file-list="fileList"
              accept=".pdf,.jpg,.jpeg,.png"
              :before-upload="beforeUpload"
              @change="handleUploadChange"
            >
              <p class="ant-upload-drag-icon">
                <i class="mdi mdi-cloud-upload" style="font-size: 28px; color: #4f74ff"></i>
              </p>
              <p class="ant-upload-text">点击或拖拽上传合同附件（PDF / JPG / PNG）</p>
              <p class="ant-upload-hint">合同附件为必填项</p>
            </a-upload-dragger>
          </a-form-item>

          <a-form-item class="renew-contract-modal__field--wide">
            <template #label>
              <span class="renew-contract-modal__label">备注</span>
            </template>
            <a-textarea
              v-model:value="form.remark"
              placeholder="选填，可填写特殊约定等"
              :rows="2"
              allow-clear
            />
          </a-form-item>
        </div>
      </div>
    </a-form>

    <template #footer>
      <a-button :disabled="submitting" @click="handleClose">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="handleSubmit">
        <span class="mdi mdi-check" aria-hidden="true" style="margin-right:4px"></span>
        {{ presetContract ? '保存续签合同' : '创建合同' }}
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import type { UploadChangeParam } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import {
  renewContract,
  type ContractListItem,
} from '@osg/shared/api/admin/contract'
import { getStudentList } from '@osg/shared/api/admin/student'
import { getToken } from '@osg/shared/utils/storage'
import { MAX_AMOUNT, MAX_AMOUNT_MESSAGE, MAX_CONTRACT_HOURS, MAX_CONTRACT_HOURS_MESSAGE } from '@osg/shared/utils'
import { getAdminDictOptions, type AdminDictListRow } from '@/api/adminDict'

interface StudentOption {
  studentId: number
  studentName: string
}

const renewalReasonOptions = ref<AdminDictListRow[]>([])

const props = defineProps<{
  visible: boolean
  studentOptions: StudentOption[]
  presetContract?: ContractListItem | null
  /**
   * 批次 7.5「重新加入」：true 时提交时附带 reactivateAccount=true，
   * 后端在续签事务内把退费学员账号置回正常（accountStatus=0 + frozen=0）。
   * 见 docs/plans/stage-coaching-request/09-rule-a-alignment-fix-plan.md §13.6
   */
  reactivateAccount?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submitted: []
}>()

const resolveCurrency = (preset: ContractListItem | null | undefined): 'USD' | 'GBP' => {
  if (preset?.currency === 'GBP') return 'GBP'
  if (preset?.currency === 'USD') return 'USD'
  if (preset && Number(preset.amountGbp) > 0) return 'GBP'
  return 'USD'
}

const toFiniteNumber = (v: unknown): number | undefined => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const formRef = ref()
const submitting = ref(false)
const fileList = ref<any[]>([])

const uploadAction = '/api/admin/contract/upload'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${getToken() || ''}`,
}))

const form = reactive({
  studentId: '',
  currency: 'USD' as 'USD' | 'GBP',
  amountUsd: undefined as number | undefined,
  amountGbp: undefined as number | undefined,
  totalHours: undefined as number | undefined,
  startDate: '',
  endDate: '',
  renewalReason: '',
  otherReason: '',
  attachmentPath: '',
  remark: '',
})

const presetContract = computed(() => props.presetContract || null)
const studentInitials = computed(() => {
  const name = presetContract.value?.studentName || ''
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
})
const requiresOtherReason = computed(() => form.renewalReason === 'other')
const surfaceId = computed(() => (presetContract.value ? 'modal-contract-renew' : 'modal-add-contract'))

const resetForm = () => {
  const todayStr = dayjs().format('YYYY-MM-DD')
  const nextYearMay31 = `${new Date().getFullYear() + 1}-05-31`
  form.studentId = presetContract.value ? String(presetContract.value.studentId) : ''
  form.currency = resolveCurrency(presetContract.value)
  form.amountUsd = undefined
  form.amountGbp = undefined
  form.totalHours = undefined
  form.startDate = todayStr
  form.endDate = nextYearMay31
  form.renewalReason = ''
  form.otherReason = ''
  form.attachmentPath = ''
  form.remark = ''
  submitting.value = false
  fileList.value = []
}

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE_BYTES = 150 * 1024 * 1024

const beforeUpload = (file: File) => {
  if (!ALLOWED_MIME.includes(file.type)) {
    message.error('仅支持 PDF / JPG / PNG 类型附件')
    return false
  }
  if (file.size > MAX_SIZE_BYTES) {
    message.error('单文件不超过 150MB')
    return false
  }
  if (fileList.value.length >= 1) {
    message.error('合同附件只允许上传 1 个')
    return false
  }
  return true
}

const handleUploadChange = (info: UploadChangeParam) => {
  fileList.value = info.fileList.slice(-1)
  if (info.file.status === 'done') {
    const res = info.file.response
    const attachmentPath = res?.attachmentPath ?? res?.data?.attachmentPath
    if (attachmentPath) {
      form.attachmentPath = attachmentPath
      message.success('合同附件上传成功')
    }
  } else if (info.file.status === 'error') {
    message.error('附件上传失败')
  }
}

const remoteStudentOptions = ref<StudentOption[]>([])
const studentSearching = ref(false)
let studentSearchTimer: ReturnType<typeof setTimeout> | null = null
let studentSearchSeq = 0

const fetchStudentOptions = async (keyword: string) => {
  const seq = ++studentSearchSeq
  studentSearching.value = true
  try {
    const res = await getStudentList({ pageNum: 1, pageSize: 20, studentName: keyword || undefined })
    if (seq !== studentSearchSeq) return
    remoteStudentOptions.value = (res.rows || []).map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
    }))
  } catch (e) {
    if (seq === studentSearchSeq) remoteStudentOptions.value = []
  } finally {
    if (seq === studentSearchSeq) studentSearching.value = false
  }
}

const onStudentSearch = (keyword: string) => {
  if (studentSearchTimer) clearTimeout(studentSearchTimer)
  studentSearchTimer = setTimeout(() => fetchStudentOptions(keyword.trim()), 300)
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
  if (!form.amountUsd) {
    message.error(form.currency === 'GBP' ? '请输入美元等值金额' : '请输入美元金额')
    return
  }
  if (form.currency === 'GBP' && !form.amountGbp) {
    message.error('请输入英镑金额')
    return
  }
  if ((form.amountUsd ?? 0) > MAX_AMOUNT || (form.amountGbp ?? 0) > MAX_AMOUNT) {
    message.error(MAX_AMOUNT_MESSAGE)
    return
  }
  if ((form.totalHours ?? 0) > MAX_CONTRACT_HOURS) {
    message.error(MAX_CONTRACT_HOURS_MESSAGE)
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
  if (!form.attachmentPath) {
    message.error('请上传合同附件')
    return
  }

  submitting.value = true
  try {
    const amountUsd = toFiniteNumber(form.amountUsd)
    const amountGbp = toFiniteNumber(form.amountGbp)
    const contractAmount = amountUsd ?? 0
    await renewContract({
      studentId,
      currency: form.currency,
      amountUsd,
      amountGbp: form.currency === 'GBP' ? amountGbp : undefined,
      contractAmount,
      totalHours: toFiniteNumber(form.totalHours) ?? 0,
      startDate: String(form.startDate).slice(0, 10),
      endDate: String(form.endDate).slice(0, 10),
      renewalReason: form.renewalReason,
      otherReason: form.otherReason.trim() || undefined,
      attachmentPath: form.attachmentPath || undefined,
      remark: form.remark.trim() || undefined,
      // 批次 7.5：退费学员「重新加入」走该 flag，由后端在同事务内激活账号
      reactivateAccount: props.reactivateAccount === true ? true : undefined,
    })
    message.success(props.reactivateAccount ? '学员已通过续签合同重新加入' : '续签合同成功')
    emit('submitted')
    emit('update:visible', false)
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  renewalReasonOptions.value = await getAdminDictOptions('osg_renewal_reason')
})

watch(() => props.visible, (visible) => {
  if (visible) {
    resetForm()
    if (!presetContract.value) {
      remoteStudentOptions.value = []
      fetchStudentOptions('')
    }
  }
}, { immediate: true })
</script>

<style scoped lang="scss">
/* ── Header ── */
:global([data-surface-id="modal-contract-renew"] [data-surface-part="header"]) {
  background: #fff !important;
  border-bottom: 1px solid rgba(79, 116, 255, 0.1) !important;
}

:global([data-surface-id="modal-contract-renew"] .overlay-surface-modal__close) {
  background: #f5f7ff !important;
  color: #69758b !important;

  &:hover {
    background: #eef2ff !important;
    color: #4f74ff !important;
  }
}

.renew-contract-modal__header-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #1a2234;
  font-family: 'Space Grotesk', 'Avenir Next', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.renew-contract-modal__header-icon {
  color: #4f74ff;
  font-size: 18px;
}

/* ── Body ── */
.renew-contract-modal__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fff;
}


/* ── Part title banners ── */
.renew-contract-modal__part-title {
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fef9e7 0%, #fff8e1 100%);
  border: 1px solid rgba(197, 106, 38, 0.15);
  color: #92400e;

  p {
    margin: 4px 0 0;
    font-size: 13px;
    color: #78716c;
  }
}

.renew-contract-modal__part-title-heading {
  display: flex;
  align-items: center;
  gap: 8px;

  i {
    font-size: 18px;
  }

  strong {
    font-size: 16px;
    font-weight: 700;
  }
}

/* ── Section cards ── */
.renew-contract-modal__section {
  background: #fafafa;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

/* ── Grid layout ── */
.renew-contract-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.renew-contract-modal__field--wide {
  grid-column: 1 / -1;
}

/* ── Labels ── */
.renew-contract-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #1a2234;
  font-size: 13px;
  font-weight: 600;
}

.renew-contract-modal__required {
  color: #dc2626;
}

/* ── Radio group ── */
.renew-contract-modal__radio-group {
  display: flex;
  gap: 0;

  :deep(.ant-radio-button-wrapper) {
    border-radius: 999px;
    border: 1px solid #cbd5e1;
    margin-inline-start: 0;
    height: 30px;
    padding-inline: 10px;
    line-height: 28px;
    font-size: 11px;
  }

  :deep(.ant-radio-button-wrapper:not(:first-child)::before) {
    display: none;
  }
}

/* ── Number input full width ── */
.renew-contract-modal__number {
  width: 100%;
  height: 32px !important;

  :deep(.ant-input-number-input-wrap),
  :deep(.ant-input-number-input) {
    height: 100% !important;
  }
}

/* ── Student card ── */
.renew-contract-modal__student-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f7f9fc;
  border-radius: 10px;
  border: 2px solid #e2e8f0;
}

.renew-contract-modal__avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c5cfc, #a78bfa);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

.renew-contract-modal__student-info {
  flex: 1;
  min-width: 0;
}

.renew-contract-modal__student-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a2234;
  line-height: 1.3;
}

.renew-contract-modal__student-meta {
  font-size: 13px;
  color: #69758b;
  margin-top: 2px;
}

@media (max-width: 720px) {
  .renew-contract-modal__grid {
    grid-template-columns: 1fr;
  }

}
</style>
