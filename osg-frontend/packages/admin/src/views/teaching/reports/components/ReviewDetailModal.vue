<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="report-review-detail-modal"
    :width="700"
    :body-class="'report-review-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="modal-title-row">
        <span class="mdi mdi-file-document" aria-hidden="true" />
        <span>课程反馈详情</span>
        <span class="modal-title-sub">Report #{{ detail?.recordId || '--' }}</span>
      </div>
    </template>

    <!-- 基本信息 3x3 网格 -->
    <section class="info-grid">
      <div class="info-cell">
        <span class="info-label">导师</span>
        <div class="info-value">{{ detail?.mentorName || '--' }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">学员</span>
        <div class="info-value">{{ detail?.studentName || '--' }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">状态</span>
        <div>
          <span :class="['status-tag', `status-tag--${statusTone(detail?.status)}`]">
            {{ formatStatus(detail?.status) }}
          </span>
        </div>
      </div>
      <div class="info-cell">
        <span class="info-label">课程类型</span>
        <div>{{ detail?.courseType || '--' }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">日期</span>
        <div>{{ formatDate(detail?.classDate) }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">学习时长</span>
        <div>{{ formatHours(detail?.durationHours) }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">Class ID</span>
        <div>{{ detail?.classId || '--' }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">Class Status</span>
        <div>
          <span class="status-tag status-tag--info">{{ detail?.classStatus || 'Normal' }}</span>
        </div>
      </div>
      <div class="info-cell">
        <span class="info-label">Rate</span>
        <div>{{ detail?.rate || '--' }}</div>
      </div>
    </section>

    <!-- Topics -->
    <section class="detail-section">
      <label class="section-label">Topics</label>
      <div class="section-content">{{ detail?.topics || '--' }}</div>
    </section>

    <!-- Comments -->
    <section class="detail-section">
      <label class="section-label">Comments</label>
      <div class="section-content">{{ detail?.comments || '--' }}</div>
    </section>

    <!-- 课程反馈内容 -->
    <section class="detail-section">
      <label class="section-label">课程反馈内容</label>
      <div class="section-content section-content--tall">{{ detail?.feedbackContent || '暂无课程反馈内容' }}</div>
    </section>

    <!-- 审核备注 -->
    <section class="detail-section">
      <label class="section-label">审核备注</label>
      <textarea
        v-model="remark"
        class="review-textarea"
        rows="3"
        placeholder="输入审核备注（可选）"
      />
    </section>

    <template #footer>
      <div class="modal-footer-row">
        <button type="button" class="btn-outline" @click="handleClose">关闭</button>
        <button type="button" class="btn-outline btn-outline--danger" :disabled="submitting" @click="handleReject">
          <span class="mdi mdi-close" aria-hidden="true" /> 驳回
        </button>
        <button type="button" class="btn-primary" :disabled="submitting" @click="handleApprove">
          <span class="mdi mdi-check" aria-hidden="true" /> 通过
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
  if (!value) return '--'
  return value.replace('T', ' ').slice(0, 10)
}

const formatHours = (value?: number | null) => {
  if (value === undefined || value === null) return '--'
  return `${value.toFixed(2)}h`
}

const formatStatus = (value?: string | null) => {
  if (!value) return '--'
  const map: Record<string, string> = {
    pending: 'Processing',
    approved: 'Approved',
    rejected: 'Rejected'
  }
  return map[value] || value
}

const statusTone = (value?: string | null) => {
  if (!value) return 'info'
  const map: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return map[value] || 'info'
}
</script>

<style scoped lang="scss">
.modal-title-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #1e293b);
}

.modal-title-sub {
  color: var(--text-secondary, #64748b);
  font-size: 14px;
  font-weight: 400;
}

/* --- Info grid --- */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.info-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  color: var(--text-secondary, #64748b);
  font-size: 12px;
}

.info-value {
  font-weight: 500;
}

/* --- Tags --- */
.status-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-tag--warning { background: #fef3c7; color: #92400e; }
.status-tag--success { background: #dcfce7; color: #166534; }
.status-tag--danger { background: #fee2e2; color: #b91c1c; }
.status-tag--info { background: #dbeafe; color: #1d4ed8; }

/* --- Sections --- */
.detail-section {
  margin-bottom: 16px;
}

.section-label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary, #1e293b);
}

.section-content {
  padding: 12px;
  background: var(--body-bg, #f1f5f9);
  border-radius: 8px;
}

.section-content--tall {
  min-height: 80px;
}

.review-textarea {
  width: 100%;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  resize: vertical;
}

/* --- Footer --- */
.modal-footer-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  padding: 8px 16px;
  background: var(--card-bg, #ffffff);
  color: var(--text-primary, #1e293b);
  font-weight: 500;
  cursor: pointer;
}

.btn-outline--danger {
  color: var(--danger, #ef4444);
  border-color: var(--danger, #ef4444);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  background: var(--primary, #3b82f6);
  color: #fff;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:disabled,
.btn-outline:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
