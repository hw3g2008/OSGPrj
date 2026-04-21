<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-class-record-detail"
    :width="760"
    :body-class="'class-record-detail-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-file-document-outline" aria-hidden="true"></span>
        <span>课程记录详情</span>
        <span class="class-record-detail-modal__title-sub">#{{ detail?.recordId || '--' }}</span>
      </span>
    </template>

    <div v-if="loading" class="class-record-detail-modal__loading">
      <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
      <span>正在加载课程记录详情...</span>
    </div>

    <template v-else>
      <section class="class-record-detail-modal__summary">
        <div class="class-record-detail-modal__status-row">
          <a-tag :color="statusTagColor(detail?.status)">{{ formatStatus(detail?.status) }}</a-tag>
          <span class="class-record-detail-modal__record-id">#{{ detail?.recordId || '--' }}</span>
        </div>
        <div class="class-record-detail-modal__grid">
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">学员</span>
            <strong>{{ detail?.studentName || '--' }} <span v-if="detail?.studentId" class="class-record-detail-modal__sub-text">({{ detail.studentId }})</span></strong>
          </div>
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">申报人</span>
            <strong>{{ detail?.mentorName || '--' }} <a-tag v-if="detail?.courseSource" size="small" color="blue">{{ normalizeSourceLabel(detail.courseSource) }}</a-tag></strong>
          </div>
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">辅导内容</span>
            <strong>{{ normalizeCourseType(detail?.courseType) }}</strong>
          </div>
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">课程内容</span>
            <strong><a-tag v-if="detail?.classStatus" color="processing">{{ detail.classStatus }}</a-tag><span v-else>--</span></strong>
          </div>
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">上课日期</span>
            <strong>{{ formatDate(detail?.classDate) }}</strong>
          </div>
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">时长</span>
            <strong>{{ detail?.durationHours ? detail.durationHours + '小时' : '--' }}</strong>
          </div>
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">课时费</span>
            <strong class="class-record-detail-modal__fee">{{ formatFee(detail?.courseFee) }}</strong>
          </div>
          <div class="class-record-detail-modal__cell">
            <span class="class-record-detail-modal__label">提交时间</span>
            <strong>{{ formatDateTime(detail?.submittedAt) }}</strong>
          </div>
        </div>
      </section>

      <section v-if="detail?.feedbackContent" class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__section-title">课程反馈</span>
        <div class="class-record-detail-modal__content">{{ detail.feedbackContent }}</div>
      </section>

      <section v-if="detail?.rate" class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__section-title">学员评价</span>
        <div>⭐ {{ detail.rate }}</div>
      </section>

      <section v-if="detail?.topics" class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__section-title">Topics</span>
        <div class="class-record-detail-modal__content">{{ detail.topics }}</div>
      </section>

      <section v-if="detail?.comments" class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__section-title">Comments</span>
        <div class="class-record-detail-modal__content">{{ detail.comments }}</div>
      </section>

      <section class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__section-title">审核结果</span>
        <div class="class-record-detail-modal__review-result">
          <a-tag :color="statusTagColor(detail?.status)">{{ formatStatus(detail?.status) }}</a-tag>
          <span v-if="detail?.reviewRemark" class="class-record-detail-modal__content">{{ detail.reviewRemark }}</span>
          <span v-else style="color:#64748b">暂无审核备注</span>
        </div>
      </section>
    </template>

    <template #footer>
      <a-button @click="handleClose">关闭</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { ReportRow } from '@osg/shared/api/admin/report'

defineProps<{
  visible: boolean
  detail?: ReportRow | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const handleClose = () => {
  emit('update:visible', false)
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
.class-record-detail-modal__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.class-record-detail-modal__title-sub {
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
}

.class-record-detail-modal__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  gap: 8px;
  color: #64748b;
}

.class-record-detail-modal__summary {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.class-record-detail-modal__status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.class-record-detail-modal__record-id {
  color: #64748b;
  font-size: 13px;
}

.class-record-detail-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.class-record-detail-modal__sub-text {
  color: #64748b;
  font-weight: 400;
  font-size: 12px;
}

.class-record-detail-modal__fee {
  color: #16a34a;
}

.class-record-detail-modal__section-title {
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.class-record-detail-modal__review-result {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.class-record-detail-modal__cell,
.class-record-detail-modal__section {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

.class-record-detail-modal__cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
}

.class-record-detail-modal__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
}

.class-record-detail-modal__label {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.class-record-detail-modal__content {
  color: #0f172a;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
}

@media (max-width: 640px) {
  .class-record-detail-modal__grid {
    grid-template-columns: 1fr;
  }
}
</style>
