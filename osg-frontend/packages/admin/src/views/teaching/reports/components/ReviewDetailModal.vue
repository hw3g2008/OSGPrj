<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="report-review-detail-modal"
    width="860px"
    :body-class="'report-review-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="report-review-modal__title">
        <span class="mdi mdi-clipboard-text-clock-outline" aria-hidden="true"></span>
        <span>课时审核详情</span>
      </div>
    </template>

    <section class="report-review-modal__hero">
      <div>
        <span class="report-review-modal__eyebrow">Class Record</span>
        <h3>{{ detail?.mentorName || '导师待确认' }} · {{ detail?.studentName || '学员待确认' }}</h3>
        <p>{{ detail?.classId || `记录 #${detail?.recordId || '--'}` }} · {{ detail?.classStatus || '待同步课程状态' }}</p>
      </div>
      <div class="report-review-modal__pill-group">
        <span class="report-review-modal__pill">{{ detail?.courseType || '课程类型待补充' }}</span>
        <span class="report-review-modal__pill report-review-modal__pill--muted">{{ detail?.courseSource || '课程来源待补充' }}</span>
      </div>
    </section>

    <section class="report-review-modal__grid">
      <article class="report-review-modal__card">
        <span>导师</span>
        <strong>{{ detail?.mentorName || '—' }}</strong>
      </article>
      <article class="report-review-modal__card">
        <span>学员</span>
        <strong>{{ detail?.studentName || '—' }}</strong>
      </article>
      <article class="report-review-modal__card">
        <span>课程日期</span>
        <strong>{{ formatDate(detail?.classDate) }}</strong>
      </article>
      <article class="report-review-modal__card">
        <span>学习时长</span>
        <strong>{{ formatHours(detail?.durationHours) }}</strong>
      </article>
      <article class="report-review-modal__card">
        <span>本周累计</span>
        <strong>{{ formatHours(detail?.weeklyHours) }}</strong>
      </article>
      <article class="report-review-modal__card">
        <span>Rate</span>
        <strong>{{ detail?.rate || '—' }}</strong>
      </article>
    </section>

    <section class="report-review-modal__section">
      <h4>Topics</h4>
      <p>{{ detail?.topics || '暂无 Topics 内容' }}</p>
    </section>

    <section class="report-review-modal__section">
      <h4>Comments</h4>
      <p>{{ detail?.comments || '暂无 Comments 内容' }}</p>
    </section>

    <section class="report-review-modal__section">
      <h4>课程反馈</h4>
      <p>{{ detail?.feedbackContent || '暂无 feedbackContent 内容' }}</p>
    </section>

    <section class="report-review-modal__section">
      <label class="report-review-modal__label" for="review-remark">
        <span>审核备注</span>
        <textarea
          id="review-remark"
          v-model="remark"
          class="report-review-modal__textarea"
          rows="4"
          maxlength="160"
          placeholder="填写本次通过/驳回的审核备注"
        />
      </label>
    </section>

    <template #footer>
      <div class="report-review-modal__footer">
        <button type="button" class="permission-button permission-button--outline" @click="handleClose">关闭</button>
        <button type="button" class="permission-button permission-button--ghost-danger" :disabled="submitting" @click="handleReject">
          {{ submitting ? '提交中...' : '驳回' }}
        </button>
        <button type="button" class="permission-button permission-button--primary" :disabled="submitting" @click="handleApprove">
          {{ submitting ? '提交中...' : '通过' }}
        </button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { ReportRow } from '@osg/shared/api/admin/report'

const props = withDefaults(defineProps<{
  visible: boolean
  detail?: ReportRow | null
  submitting?: boolean
}>(), {
  detail: null,
  submitting: false
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  approve: [payload: { remark?: string }]
  reject: [payload: { remark?: string }]
}>()

const remark = ref('')

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      remark.value = props.detail?.reviewRemark || ''
    }
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:visible', false)
}

const buildPayload = () => ({
  remark: remark.value.trim() || undefined
})

const handleApprove = () => {
  emit('approve', buildPayload())
}

const handleReject = () => {
  emit('reject', buildPayload())
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}

const formatHours = (value?: number | null) => {
  if (value === undefined || value === null) return '—'
  return `${value}h`
}
</script>

<style scoped lang="scss">
.report-review-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.report-review-modal__hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(254, 242, 242, 0.92), rgba(253, 230, 138, 0.88));
}

.report-review-modal__eyebrow {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7c2d12;
}

.report-review-modal__hero h3 {
  margin: 6px 0 4px;
  font-size: 22px;
  color: #7c2d12;
}

.report-review-modal__hero p {
  margin: 0;
  color: #9a3412;
}

.report-review-modal__pill-group {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.report-review-modal__pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #7c2d12;
  font-weight: 600;
}

.report-review-modal__pill--muted {
  color: #92400e;
}

.report-review-modal__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.report-review-modal__card {
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.report-review-modal__card span {
  font-size: 12px;
  color: #64748b;
}

.report-review-modal__card strong {
  font-size: 16px;
  color: #0f172a;
}

.report-review-modal__section {
  margin-top: 18px;
  padding: 16px 18px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.report-review-modal__section h4 {
  margin: 0 0 8px;
  font-size: 15px;
  color: #0f172a;
}

.report-review-modal__section p {
  margin: 0;
  line-height: 1.7;
  color: #475569;
}

.report-review-modal__label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #0f172a;
  font-weight: 600;
}

.report-review-modal__textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 12px 14px;
  font: inherit;
  resize: vertical;
}

.report-review-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
