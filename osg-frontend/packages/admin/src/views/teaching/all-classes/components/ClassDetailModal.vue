<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="all-classes-detail-modal"
    width="920px"
    :body-class="'class-detail-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="class-detail-modal__title">
        <span class="mdi mdi-book-open-page-variant" aria-hidden="true" />
        <span>{{ resolvedTitle }}</span>
      </div>
    </template>

    <section :class="heroClasses">
      <div>
        <span class="class-detail-modal__eyebrow">All Classes</span>
        <h3>{{ detail?.studentName || '学员待确认' }} · {{ detail?.mentorName || '导师待确认' }}</h3>
        <p>{{ detail?.classId || `记录 #${detail?.recordId || '--'}` }} · {{ detail?.displayStatusLabel || '状态待同步' }}</p>
      </div>
      <div class="class-detail-modal__pill-group">
        <span class="class-detail-modal__pill">{{ detail?.courseTypeLabel || '课程类型待同步' }}</span>
        <span class="class-detail-modal__pill class-detail-modal__pill--muted">{{ detail?.sourceLabel || '来源待同步' }}</span>
      </div>
    </section>

    <section class="class-detail-modal__grid">
      <article class="class-detail-modal__card">
        <span>课程类型</span>
        <strong>{{ detail?.courseTypeLabel || '—' }}</strong>
      </article>
      <article class="class-detail-modal__card">
        <span>状态</span>
        <strong>{{ detail?.displayStatusLabel || '—' }}</strong>
      </article>
      <article class="class-detail-modal__card">
        <span>课程日期</span>
        <strong>{{ formatDate(detail?.classDate) }}</strong>
      </article>
      <article class="class-detail-modal__card">
        <span>时长</span>
        <strong>{{ formatHours(detail?.durationHours) }}</strong>
      </article>
      <article class="class-detail-modal__card">
        <span>本周累计</span>
        <strong>{{ formatHours(detail?.weeklyHours) }}</strong>
      </article>
      <article class="class-detail-modal__card">
        <span>评分</span>
        <strong>{{ detail?.rate || '—' }}</strong>
      </article>
    </section>

    <section class="class-detail-modal__section">
      <h4>Topics</h4>
      <p>{{ detail?.topics || '暂无 Topics 内容' }}</p>
    </section>

    <section class="class-detail-modal__section">
      <h4>Comments</h4>
      <p>{{ detail?.comments || '暂无 Comments 内容' }}</p>
    </section>

    <section class="class-detail-modal__section">
      <h4>课程反馈</h4>
      <p>{{ detail?.feedbackContent || '暂无课程反馈内容' }}</p>
    </section>

    <section v-if="detail?.displayStatus === 'rejected'" class="class-detail-modal__section">
      <h4>驳回原因</h4>
      <p>{{ detail?.reviewRemark || '暂无驳回原因' }}</p>
    </section>

    <template #footer>
      <div class="class-detail-modal__footer">
        <button type="button" class="permission-button permission-button--outline" @click="handleClose">关闭</button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { AllClassesDetail } from '@osg/shared/api/admin/allClasses'

const props = withDefaults(defineProps<{
  visible: boolean
  detail?: AllClassesDetail | null
}>(), {
  detail: null
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const modalTitleCatalog = {
  entry: '入职面试',
  mock: '模拟面试',
  midterm: '模拟期中考试',
  networking: '人际关系期中',
  written: '笔试辅导',
  rejected: '已驳回'
} as const

const heroClasses = computed(() => [
  'class-detail-modal__hero',
  `class-detail-modal__hero--${props.detail?.modalType || 'entry'}`
])

const resolvedTitle = computed(() => {
  const modalType = props.detail?.modalType || 'entry'
  return props.detail?.headerTitle || modalTitleCatalog[modalType as keyof typeof modalTitleCatalog]
})

const handleClose = () => {
  emit('update:visible', false)
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
.class-detail-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.class-detail-modal__hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 20px;
}

.class-detail-modal__hero--entry {
  background: linear-gradient(135deg, rgba(219, 234, 254, 0.96), rgba(191, 219, 254, 0.92));
}

.class-detail-modal__hero--mock {
  background: linear-gradient(135deg, rgba(220, 252, 231, 0.96), rgba(167, 243, 208, 0.92));
}

.class-detail-modal__hero--midterm {
  background: linear-gradient(135deg, rgba(254, 243, 199, 0.96), rgba(253, 230, 138, 0.92));
}

.class-detail-modal__hero--networking {
  background: linear-gradient(135deg, rgba(237, 233, 254, 0.96), rgba(221, 214, 254, 0.92));
}

.class-detail-modal__hero--written {
  background: linear-gradient(135deg, rgba(251, 207, 232, 0.96), rgba(244, 114, 182, 0.88));
}

.class-detail-modal__hero--rejected {
  background: linear-gradient(135deg, rgba(254, 226, 226, 0.96), rgba(252, 165, 165, 0.9));
}

.class-detail-modal__eyebrow {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #334155;
}

.class-detail-modal__hero h3 {
  margin: 6px 0 4px;
  font-size: 22px;
  color: #0f172a;
}

.class-detail-modal__hero p {
  margin: 0;
  color: #475569;
}

.class-detail-modal__pill-group {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.class-detail-modal__pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #0f172a;
  font-weight: 600;
}

.class-detail-modal__pill--muted {
  color: #475569;
}

.class-detail-modal__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.class-detail-modal__card {
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.class-detail-modal__card span {
  font-size: 12px;
  color: #64748b;
}

.class-detail-modal__card strong {
  font-size: 16px;
  color: #0f172a;
}

.class-detail-modal__section {
  margin-top: 18px;
  padding: 16px 18px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.class-detail-modal__section h4 {
  margin: 0 0 8px;
  font-size: 15px;
  color: #0f172a;
}

.class-detail-modal__section p {
  margin: 0;
  line-height: 1.7;
  color: #475569;
}

.class-detail-modal__footer {
  display: flex;
  justify-content: flex-end;
}
</style>
