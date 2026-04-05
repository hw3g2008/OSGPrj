<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-class-record-detail"
    :width="760"
    :body-class="'class-record-detail-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="class-record-detail-modal__title">
        <i class="mdi mdi-file-document-outline" aria-hidden="true"></i>
        <span>课程记录详情</span>
        <span class="class-record-detail-modal__title-sub">#{{ detail?.recordId || '--' }}</span>
      </div>
    </template>

    <div v-if="loading" class="class-record-detail-modal__loading">
      <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
      <span>正在加载课程记录详情...</span>
    </div>

    <template v-else>
      <section class="class-record-detail-modal__summary">
        <div class="class-record-detail-modal__cell">
          <span class="class-record-detail-modal__label">学员</span>
          <strong>{{ detail?.studentName || '--' }}</strong>
        </div>
        <div class="class-record-detail-modal__cell">
          <span class="class-record-detail-modal__label">导师</span>
          <strong>{{ detail?.mentorName || '--' }}</strong>
        </div>
        <div class="class-record-detail-modal__cell">
          <span class="class-record-detail-modal__label">课程类型</span>
          <strong>{{ detail?.courseType || '--' }}</strong>
        </div>
        <div class="class-record-detail-modal__cell">
          <span class="class-record-detail-modal__label">课程内容</span>
          <strong>{{ detail?.courseSource || '--' }}</strong>
        </div>
        <div class="class-record-detail-modal__cell">
          <span class="class-record-detail-modal__label">上课日期</span>
          <strong>{{ formatDate(detail?.classDate) }}</strong>
        </div>
        <div class="class-record-detail-modal__cell">
          <span class="class-record-detail-modal__label">状态</span>
          <strong>{{ formatStatus(detail?.status) }}</strong>
        </div>
      </section>

      <section class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__label">课时费</span>
        <strong>{{ formatMoney(detail?.rate) }}</strong>
      </section>

      <section class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__label">Topics</span>
        <div class="class-record-detail-modal__content">{{ detail?.topics || '--' }}</div>
      </section>

      <section class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__label">Comments</span>
        <div class="class-record-detail-modal__content">{{ detail?.comments || '--' }}</div>
      </section>

      <section class="class-record-detail-modal__section">
        <span class="class-record-detail-modal__label">审核备注</span>
        <div class="class-record-detail-modal__content">{{ detail?.reviewRemark || '暂无审核备注' }}</div>
      </section>
    </template>

    <template #footer>
      <div class="class-record-detail-modal__footer">
        <button type="button" class="class-record-detail-modal__button" @click="handleClose">关闭</button>
      </div>
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

const formatMoney = (value?: string | null) => {
  if (!value) return '--'
  return value.startsWith('¥') ? value : `¥${value}`
}
</script>

<style scoped lang="scss">
.class-record-detail-modal__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.class-record-detail-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #1e293b;
  font-size: 18px;
  font-weight: 700;
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
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
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

.class-record-detail-modal__footer {
  display: flex;
  justify-content: flex-end;
}

.class-record-detail-modal__button {
  min-width: 100px;
  height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  color: #334155;
  font-weight: 600;
}

@media (max-width: 960px) {
  .class-record-detail-modal__summary {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
