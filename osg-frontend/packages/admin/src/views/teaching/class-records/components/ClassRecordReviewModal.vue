<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-class-record-review"
    :width="760"
    :body-class="'class-record-review-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="class-record-review-modal__title">
        <i class="mdi mdi-clipboard-check-outline" aria-hidden="true"></i>
        <span>课程记录审核</span>
        <span class="class-record-review-modal__title-sub">#{{ detail?.recordId || '--' }}</span>
      </div>
    </template>

    <div v-if="loading" class="class-record-review-modal__loading">
      <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
      <span>正在加载课程记录...</span>
    </div>

    <template v-else>
      <section class="class-record-review-modal__summary">
        <div class="class-record-review-modal__cell">
          <span class="class-record-review-modal__label">学员</span>
          <strong>{{ detail?.studentName || '--' }}</strong>
        </div>
        <div class="class-record-review-modal__cell">
          <span class="class-record-review-modal__label">导师</span>
          <strong>{{ detail?.mentorName || '--' }}</strong>
        </div>
        <div class="class-record-review-modal__cell">
          <span class="class-record-review-modal__label">课程类型</span>
          <strong>{{ detail?.courseType || '--' }}</strong>
        </div>
        <div class="class-record-review-modal__cell">
          <span class="class-record-review-modal__label">课程内容</span>
          <strong>{{ detail?.courseSource || '--' }}</strong>
        </div>
        <div class="class-record-review-modal__cell">
          <span class="class-record-review-modal__label">上课日期</span>
          <strong>{{ formatDate(detail?.classDate) }}</strong>
        </div>
        <div class="class-record-review-modal__cell">
          <span class="class-record-review-modal__label">状态</span>
          <strong>{{ formatStatus(detail?.status) }}</strong>
        </div>
      </section>

      <section
        class="class-record-review-modal__section"
        data-field-name="审核结果"
        data-field-name-alias="课程审核弹窗审核结果"
      >
        <div class="class-record-review-modal__section-head">
          <span>审核结果</span>
          <div class="class-record-review-modal__result-toggle">
            <button
              type="button"
              :class="['class-record-review-modal__toggle', { 'class-record-review-modal__toggle--active': reviewResult === 'approved' }]"
              :disabled="submitting"
              @click="reviewResult = 'approved'"
            >
              通过
            </button>
            <button
              type="button"
              :class="['class-record-review-modal__toggle', { 'class-record-review-modal__toggle--active': reviewResult === 'rejected' }]"
              :disabled="submitting"
              @click="reviewResult = 'rejected'"
            >
              驳回
            </button>
          </div>
        </div>
      </section>

      <section
        v-if="reviewResult === 'rejected'"
        class="class-record-review-modal__section"
        data-field-name="驳回原因"
        data-field-name-alias="课程审核弹窗驳回原因"
      >
        <label
          class="class-record-review-modal__field"
          data-field-name="驳回原因"
          data-field-name-alias="课程审核弹窗驳回原因"
        >
          <span>驳回原因 *</span>
          <select
            v-model="rejectReason"
            data-field-name="驳回原因"
            data-field-name-alias="课程审核弹窗驳回原因"
            :disabled="submitting"
          >
            <option value="">请选择驳回原因</option>
            <option v-for="option in rejectReasonOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>

        <label
          class="class-record-review-modal__field"
          data-field-name="驳回说明"
          data-field-name-alias="课程审核弹窗驳回说明"
        >
          <span>驳回说明</span>
          <textarea
            v-model="rejectRemark"
            data-field-name="驳回说明"
            data-field-name-alias="课程审核弹窗驳回说明"
            rows="4"
            maxlength="120"
            :disabled="submitting"
            placeholder="补充本次驳回说明"
          />
        </label>
      </section>

      <section
        class="class-record-review-modal__section"
        data-field-name="审核备注"
        data-field-name-alias="课程审核弹窗审核备注"
      >
        <label
          class="class-record-review-modal__field"
          data-field-name="审核备注"
          data-field-name-alias="课程审核弹窗审核备注"
        >
          <span>审核备注</span>
          <textarea
            v-model="reviewRemark"
            data-field-name="审核备注"
            data-field-name-alias="课程审核弹窗审核备注"
            rows="3"
            maxlength="120"
            :disabled="submitting"
            placeholder="输入审核备注（可选）"
          />
        </label>
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
      <div class="class-record-review-modal__footer">
        <button type="button" class="class-record-review-modal__button class-record-review-modal__button--ghost" @click="handleClose">
          取消
        </button>
        <button
          type="button"
          class="class-record-review-modal__button class-record-review-modal__button--primary"
          :disabled="loading || submitting"
          @click="handleSubmit"
        >
          {{ submitting ? '提交中...' : reviewResult === 'rejected' ? '确认驳回' : '确认通过' }}
        </button>
      </div>
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
  { value: '内容不符', label: '内容不符' },
  { value: '时间异常', label: '时间异常' },
  { value: '重复记录', label: '重复记录' },
  { value: '其他', label: '其他' }
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
</script>

<style scoped lang="scss">
.class-record-review-modal__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.class-record-review-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #1e293b;
  font-size: 18px;
  font-weight: 700;
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
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
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

.class-record-review-modal__toggle {
  min-height: 32px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0 12px;
  background: #fff;
  color: #475569;
  font-weight: 600;
  cursor: pointer;
}

.class-record-review-modal__toggle--active {
  border-color: #6366f1;
  background: #eef2ff;
  color: #4338ca;
}

.class-record-review-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.class-record-review-modal__field select,
.class-record-review-modal__field textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
  color: #0f172a;
  font: inherit;
}

.class-record-review-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.class-record-review-modal__button {
  min-height: 40px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 0 16px;
  font-weight: 700;
}

.class-record-review-modal__button--ghost {
  background: #fff;
  color: #475569;
}

.class-record-review-modal__button--primary {
  border-color: #6366f1;
  background: #6366f1;
  color: #fff;
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

@media (max-width: 960px) {
  .class-record-review-modal__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .class-record-review-modal__summary {
    grid-template-columns: 1fr;
  }

  .class-record-review-modal__section-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
