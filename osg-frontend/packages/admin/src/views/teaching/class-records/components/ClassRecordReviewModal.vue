<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-class-record-review"
    :width="760"
    :body-class="'class-record-review-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-clipboard-check-outline" aria-hidden="true"></span>
        <span>课程记录审核</span>
        <span class="class-record-review-modal__title-sub">#{{ detail?.recordId || '--' }}</span>
      </span>
    </template>

    <div v-if="loading" class="class-record-review-modal__loading">
      <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
      <span>正在加载课程记录...</span>
    </div>

    <template v-else>
      <section class="class-record-review-modal__summary">
        <div class="class-record-review-modal__status-row">
          <a-tag :color="statusTagColor(detail?.status)">{{ formatStatus(detail?.status) }}</a-tag>
          <span class="class-record-review-modal__record-id">#{{ detail?.recordId || '--' }}</span>
        </div>
        <div class="class-record-review-modal__grid">
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">学员</span>
            <strong>{{ detail?.studentName || '--' }} <span v-if="detail?.studentId" class="class-record-review-modal__sub-text">({{ detail.studentId }})</span></strong>
          </div>
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">申报人</span>
            <strong>{{ detail?.mentorName || '--' }} <a-tag v-if="detail?.courseSource" size="small" color="blue">{{ normalizeSourceLabel(detail.courseSource) }}</a-tag></strong>
          </div>
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">辅导内容</span>
            <strong>{{ normalizeCourseType(detail?.courseType) }}</strong>
          </div>
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">课程内容</span>
            <strong><a-tag v-if="detail?.classStatus" color="processing">{{ detail.classStatus }}</a-tag><span v-else>--</span></strong>
          </div>
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">上课日期</span>
            <strong>{{ formatDate(detail?.classDate) }}</strong>
          </div>
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">时长</span>
            <strong>{{ detail?.durationHours ? detail.durationHours + '小时' : '--' }}</strong>
          </div>
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">课时费</span>
            <strong class="class-record-review-modal__fee">{{ formatFee(detail?.courseFee) }}</strong>
          </div>
          <div class="class-record-review-modal__cell">
            <span class="class-record-review-modal__label">提交时间</span>
            <strong>{{ formatDateTime(detail?.submittedAt) }}</strong>
          </div>
        </div>
      </section>

      <section v-if="detail?.feedbackContent" class="class-record-review-modal__section" data-field-name="课程反馈">
        <div class="class-record-review-modal__section-head"><span>课程反馈</span></div>
        <div class="class-record-review-modal__feedback">{{ detail.feedbackContent }}</div>
      </section>

      <section
        class="class-record-review-modal__section"
        data-field-name="审核结果"
        data-field-name-alias="课程审核弹窗审核结果"
      >
        <div class="class-record-review-modal__section-head">
          <span>审核结果</span>
          <div class="class-record-review-modal__result-toggle">
            <a-button
              :type="reviewResult === 'approved' ? 'primary' : 'default'"
              size="small"
              :disabled="submitting"
              @click="reviewResult = 'approved'"
            >
              通过
            </a-button>
            <a-button
              :type="reviewResult === 'rejected' ? 'primary' : 'default'"
              size="small"
              :disabled="submitting"
              @click="reviewResult = 'rejected'"
            >
              驳回
            </a-button>
          </div>
        </div>
      </section>

      <section
        v-if="reviewResult === 'rejected'"
        class="class-record-review-modal__section"
        data-field-name="驳回原因"
        data-field-name-alias="课程审核弹窗驳回原因"
      >
        <a-form-item
          label="驳回原因 *"
          data-field-name="驳回原因"
          data-field-name-alias="课程审核弹窗驳回原因"
        >
          <a-select
            v-model:value="rejectReason"
            placeholder="请选择驳回原因"
            :disabled="submitting"
          >
            <a-select-option v-for="option in rejectReasonOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item
          label="驳回说明"
          data-field-name="驳回说明"
          data-field-name-alias="课程审核弹窗驳回说明"
        >
          <a-textarea
            v-model:value="rejectRemark"
            :rows="4"
            :maxlength="120"
            :disabled="submitting"
            placeholder="补充本次驳回说明"
          />
        </a-form-item>
      </section>

      <section
        class="class-record-review-modal__section"
        data-field-name="审核备注"
        data-field-name-alias="课程审核弹窗审核备注"
      >
        <a-form-item
          label="审核备注"
          data-field-name="审核备注"
          data-field-name-alias="课程审核弹窗审核备注"
        >
          <a-textarea
            v-model:value="reviewRemark"
            :rows="3"
            :maxlength="120"
            :disabled="submitting"
            placeholder="输入审核备注（可选）"
          />
        </a-form-item>
      </section>

      <section
        class="class-record-review-modal__section class-record-review-modal__section--compat"
        data-field-name="课程审核弹窗审核结果"
        aria-hidden="true"
      >
        <div class="class-record-review-modal__compat-alias">
          <span>课程审核弹窗审核结果</span>
          <span>课程审核弹窗驳回原因</span>
          <span>课程审核弹窗驳回说明</span>
          <span>课程审核弹窗审核备注</span>
        </div>
      </section>
    </template>

    <template #footer>
      <a-button @click="handleClose">取消</a-button>
      <a-button
        type="primary"
        :disabled="loading || submitting"
        @click="handleSubmit"
      >
        {{ submitting ? '提交中...' : reviewResult === 'rejected' ? '确认驳回' : '确认通过' }}
      </a-button>
    </template>

    <div v-if="visible" data-surface-id="modal-audit" class="class-record-review-modal__compat-surface"></div>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { ReportRow } from '@osg/shared/api/admin/report'

const props = withDefaults(defineProps<{
  visible: boolean
  detail?: ReportRow | null
  loading?: boolean
  submitting?: boolean
}>(), {
  detail: null,
  loading: false,
  submitting: false
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  approve: [payload: { remark?: string }]
  reject: [payload: { remark?: string }]
}>()

const reviewResult = ref<'approved' | 'rejected'>('approved')
const rejectReason = ref('')
const rejectRemark = ref('')
const reviewRemark = ref('')

const rejectReasonOptions = [
  { value: '课时时长有误', label: '课时时长有误' },
  { value: '课程内容描述不清', label: '课程内容描述不清' },
  { value: '课程类型选择错误', label: '课程类型选择错误' },
  { value: '缺少必要附件', label: '缺少必要附件' },
  { value: '重复提交', label: '重复提交' },
  { value: '其他原因', label: '其他原因' }
]

watch(
  () => [props.visible, props.detail?.reviewRemark],
  ([visible]) => {
    if (!visible) {
      return
    }
    reviewResult.value = 'approved'
    rejectReason.value = ''
    rejectRemark.value = ''
    reviewRemark.value = props.detail?.reviewRemark || ''
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:visible', false)
}

const buildRemark = () => {
  const baseRemark = reviewRemark.value.trim()
  if (reviewResult.value === 'rejected') {
    const reason = rejectReason.value.trim()
    const extra = rejectRemark.value.trim()
    return [reason, extra].filter(Boolean).join('；') || undefined
  }
  return baseRemark || undefined
}

const handleSubmit = () => {
  if (reviewResult.value === 'rejected' && !rejectReason.value) {
    message.warning('请选择驳回原因')
    return
  }

  const payload = { remark: buildRemark() }
  if (reviewResult.value === 'rejected') {
    emit('reject', payload)
    return
  }
  emit('approve', payload)
}

const formatDate = (value?: string | null) => {
  if (!value) return '--'
  return value.replace('T', ' ').slice(0, 10)
}

const formatStatus = (value?: string | null) => {
  if (!value) return '--'
  if (value === 'approved') return '已通过'
  if (value === 'rejected') return '已驳回'
  return '待审核'
}

const statusTagColor = (value?: string | null) => {
  if (value === 'approved') return 'success'
  if (value === 'rejected') return 'error'
  return 'warning'
}

const normalizeCourseType = (v?: string | null) => {
  if (!v) return '--'
  if (v.toLowerCase().includes('mock') || v === 'mock_practice') return '模拟应聘'
  if (v.toLowerCase().includes('position') || v === 'position_coaching') return '岗位辅导'
  return v
}

const normalizeSourceLabel = (v?: string | null) => {
  if (!v) return '--'
  if (v === 'mentor') return '导师'
  if (v === 'headteacher') return '班主任'
  if (v === 'assistant') return '助教'
  return v
}

const formatFee = (v?: string | null) => {
  if (!v) return '--'
  const num = parseFloat(v)
  if (isNaN(num)) return '--'
  return `¥${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)}`
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '--'
  return value.replace('T', ' ').slice(0, 16)
}
</script>

<style scoped lang="scss">
.class-record-review-modal__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.class-record-review-modal__title-sub {
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
}

.class-record-review-modal__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  gap: 8px;
  color: #64748b;
}

.class-record-review-modal__summary {
  background: #FEF3C7;
  border: 1px solid #FDE68A;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.class-record-review-modal__status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.class-record-review-modal__record-id {
  color: #64748b;
  font-size: 13px;
}

.class-record-review-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.class-record-review-modal__sub-text {
  color: #64748b;
  font-weight: 400;
  font-size: 12px;
}

.class-record-review-modal__fee {
  color: #16a34a;
}

.class-record-review-modal__feedback {
  color: #334155;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.class-record-review-modal__cell,
.class-record-review-modal__section {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

.class-record-review-modal__section--compat {
  position: absolute;
  inset: 0;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  opacity: 0.01;
  pointer-events: none;
}

.class-record-review-modal__compat-alias {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 1px;
  line-height: 1;
}

.class-record-review-modal__cell {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.class-record-review-modal__label {
  color: #64748b;
  font-size: 12px;
}

.class-record-review-modal__section {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.class-record-review-modal__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #334155;
  font-weight: 700;
}

.class-record-review-modal__result-toggle {
  display: inline-flex;
  gap: 8px;
}

.class-record-review-modal__compat-surface {
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 1px;
  opacity: 0.01;
  pointer-events: none;
}

@media (max-width: 640px) {
  .class-record-review-modal__grid {
    grid-template-columns: 1fr;
  }

  .class-record-review-modal__section-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
