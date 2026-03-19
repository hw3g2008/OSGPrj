<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="all-classes-detail-modal"
    :width="750"
    :body-class="'class-detail-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="modal-title-row" :style="headerGradientStyle">
        <span class="mdi mdi-file-document" aria-hidden="true" />
        <span>{{ headerTitle }}</span>
      </div>
    </template>

    <!-- 基本信息 3x3 网格 -->
    <section class="info-grid" :class="infoGridClass">
      <div class="info-cell">
        <span class="info-label">课程ID</span>
        <div class="info-value info-value--bold">{{ detail?.classId || `C${detail?.recordId || '--'}` }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">提交来源</span>
        <div>
          <span class="source-badge" :style="sourceBadgeStyle">{{ detail?.sourceLabel || '--' }}</span>
        </div>
      </div>
      <div class="info-cell">
        <span class="info-label">状态</span>
        <div>
          <span class="status-tag" :class="`status-tag--${detail?.displayStatus}`">{{ detail?.displayStatusLabel || '--' }}</span>
        </div>
      </div>
      <div class="info-cell">
        <span class="info-label">导师</span>
        <div class="info-value">{{ detail?.mentorName || '--' }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">学员</span>
        <div class="info-value">{{ detail?.studentName || '--' }} {{ detail?.studentId ? `(ID: ${detail.studentId})` : '' }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">课程类型</span>
        <div>
          <span class="type-tag" :class="courseTypeTagClass">{{ detail?.courseTypeLabel || '--' }}</span>
        </div>
      </div>
      <div class="info-cell">
        <span class="info-label">上课日期</span>
        <div>{{ formatDate(detail?.classDate) }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">课时</span>
        <div class="info-value info-value--bold">{{ detail?.durationHours != null ? `${detail.durationHours} 小时` : '--' }}</div>
      </div>
      <div class="info-cell">
        <span class="info-label">课时费</span>
        <div class="info-value info-value--fee" :class="{ 'info-value--strikethrough': detail?.displayStatus === 'rejected' }">
          {{ detail?.courseFee ? `$${detail.courseFee}` : '--' }}
        </div>
      </div>
    </section>

    <!-- 课程主题 (entry / written / mock) -->
    <section v-if="detail?.topics && showTopicSection" class="detail-section">
      <label class="section-label">
        <span class="mdi mdi-tag section-label-icon" aria-hidden="true" />
        课程主题
      </label>
      <div class="section-content">{{ detail.topics }}</div>
    </section>

    <!-- 模拟面试反馈 (mock) -->
    <section v-if="modalType === 'mock'" class="feedback-panel feedback-panel--mock">
      <div class="feedback-badge-row">
        <span class="feedback-badge feedback-badge--mock">
          <span class="mdi mdi-comment-text" aria-hidden="true" /> 面试辅导反馈
        </span>
      </div>
      <div class="feedback-meta-row">
        <div class="feedback-meta-item">
          <span class="info-label">学员表现</span>
          <div class="feedback-meta-value feedback-meta-value--success">{{ detail?.performanceLabel || '--' }}</div>
        </div>
        <div class="feedback-meta-item">
          <span class="info-label">评分</span>
          <div class="feedback-meta-value feedback-meta-value--star">{{ detail?.rate ? `\u2B50 ${detail.rate}` : '--' }}</div>
        </div>
      </div>
      <div v-if="detail?.feedbackPurpose" class="feedback-field">
        <label class="feedback-field-label">本次课程目的</label>
        <div class="feedback-field-content">{{ detail.feedbackPurpose }}</div>
      </div>
      <div v-if="detail?.feedbackKnowledge" class="feedback-field">
        <label class="feedback-field-label">本次课程涉及的知识点</label>
        <div class="feedback-field-content" v-html="nl2br(detail.feedbackKnowledge)" />
      </div>
      <div v-if="detail?.feedbackImprovement" class="feedback-field">
        <label class="feedback-field-label">学员需要改进的地方</label>
        <div class="feedback-field-content" v-html="nl2br(detail.feedbackImprovement)" />
      </div>
      <div v-if="detail?.feedbackSuggestion" class="feedback-field">
        <label class="feedback-field-label">后续建议</label>
        <div class="feedback-field-content">{{ detail.feedbackSuggestion }}</div>
      </div>
    </section>

    <!-- 入职面试反馈 (entry) -->
    <section v-if="modalType === 'entry'" class="feedback-panel feedback-panel--entry">
      <div class="feedback-badge-row">
        <span class="feedback-badge feedback-badge--entry">
          <span class="mdi mdi-briefcase" aria-hidden="true" /> 入职培训反馈
        </span>
      </div>
      <div v-if="detail?.feedbackPurpose" class="feedback-field">
        <label class="feedback-field-label">本次课程目的</label>
        <div class="feedback-field-content">{{ detail.feedbackPurpose }}</div>
      </div>
      <div v-if="detail?.feedbackKnowledge" class="feedback-field">
        <label class="feedback-field-label">本次课程涉及的知识点</label>
        <div class="feedback-field-content" v-html="nl2br(detail.feedbackKnowledge)" />
      </div>
      <div v-if="detail?.feedbackSuggestion" class="feedback-field">
        <label class="feedback-field-label">后续建议</label>
        <div class="feedback-field-content">{{ detail.feedbackSuggestion }}</div>
      </div>
    </section>

    <!-- 模拟期中考试反馈 (midterm) -->
    <section v-if="modalType === 'midterm'" class="feedback-panel feedback-panel--midterm">
      <div class="feedback-badge-row">
        <span class="feedback-badge feedback-badge--midterm">
          <span class="mdi mdi-school" aria-hidden="true" /> 模拟期中考试反馈
        </span>
      </div>
      <div class="midterm-scores">
        <div class="midterm-score-card">
          <div class="midterm-score-label">考试分数</div>
          <div class="midterm-score-value midterm-score-value--amber">{{ detail?.examScore ?? '--' }}</div>
        </div>
        <div class="midterm-score-card">
          <div class="midterm-score-label">学员表现</div>
          <div class="midterm-score-value midterm-score-value--success">{{ detail?.performanceLabel || '--' }}</div>
        </div>
        <div class="midterm-score-card">
          <div class="midterm-score-label">评分</div>
          <div class="midterm-score-value midterm-score-value--star">{{ detail?.rate ? `\u2B50 ${detail.rate}` : '--' }}</div>
        </div>
      </div>
      <div v-if="detail?.assessmentTopic" class="feedback-field">
        <label class="feedback-field-label">考核题目</label>
        <div class="feedback-field-content">{{ detail.assessmentTopic }}</div>
      </div>
      <div v-if="detail?.feedbackContent" class="feedback-field">
        <label class="feedback-field-label">详细反馈</label>
        <div class="feedback-field-content">{{ detail.feedbackContent }}</div>
      </div>
    </section>

    <!-- 人际关系考核反馈 (networking) -->
    <section v-if="modalType === 'networking'" class="feedback-panel feedback-panel--networking">
      <div class="feedback-badge-row">
        <span class="feedback-badge feedback-badge--networking">
          <span class="mdi mdi-account-group" aria-hidden="true" /> 人际关系考核反馈
        </span>
      </div>
      <div class="networking-scores">
        <div class="networking-score-card">
          <div class="networking-score-label">邮件质量</div>
          <div class="networking-score-value">{{ detail?.emailQuality ?? '--' }}<span class="networking-score-base">/5</span></div>
        </div>
        <div class="networking-score-card">
          <div class="networking-score-label">邮件礼仪</div>
          <div class="networking-score-value">{{ detail?.etiquetteScore ?? '--' }}<span class="networking-score-base">/5</span></div>
        </div>
        <div class="networking-score-card">
          <div class="networking-score-label">通话质量</div>
          <div class="networking-score-value">{{ detail?.callQuality ?? '--' }}<span class="networking-score-base">/10</span></div>
        </div>
        <div class="networking-score-card">
          <div class="networking-score-label">自我介绍</div>
          <div class="networking-score-value">{{ detail?.selfIntroScore ?? '--' }}<span class="networking-score-base">/10</span></div>
        </div>
        <div class="networking-score-card">
          <div class="networking-score-label">感谢邮件</div>
          <div class="networking-score-value">{{ detail?.thankYouScore ?? '--' }}<span class="networking-score-base">/3</span></div>
        </div>
        <div class="networking-score-card">
          <div class="networking-score-label">是否推荐</div>
          <div class="networking-score-value" :class="detail?.recommended ? 'networking-score-value--success' : ''">
            {{ detail?.recommended ? '是' : '否' }}
          </div>
        </div>
      </div>
      <div v-if="detail?.feedbackContent" class="feedback-field">
        <label class="feedback-field-label">补充说明</label>
        <div class="feedback-field-content">{{ detail.feedbackContent }}</div>
      </div>
      <!-- 支付信息 -->
      <div v-if="detail?.displayStatus === 'paid'" class="payment-info">
        <span class="mdi mdi-check-circle" aria-hidden="true" /> 已支付
        <span v-if="detail?.paidDate" class="payment-date">支付日期：{{ detail.paidDate }}</span>
      </div>
    </section>

    <!-- 笔试辅导反馈 (written) -->
    <section v-if="modalType === 'written'" class="feedback-panel feedback-panel--written">
      <div class="feedback-badge-row">
        <span class="feedback-badge feedback-badge--written">
          <span class="mdi mdi-pencil" aria-hidden="true" /> 笔试辅导反馈
        </span>
      </div>
      <div v-if="detail?.feedbackPurpose" class="feedback-field">
        <label class="feedback-field-label">本次课程目的</label>
        <div class="feedback-field-content">{{ detail.feedbackPurpose }}</div>
      </div>
      <div v-if="detail?.feedbackKnowledge" class="feedback-field">
        <label class="feedback-field-label">本次课程涉及的知识点</label>
        <div class="feedback-field-content" v-html="nl2br(detail.feedbackKnowledge)" />
      </div>
      <div v-if="detail?.feedbackImprovement" class="feedback-field">
        <label class="feedback-field-label">学员需要改进的地方</label>
        <div class="feedback-field-content" v-html="nl2br(detail.feedbackImprovement)" />
      </div>
      <div v-if="detail?.feedbackSuggestion" class="feedback-field">
        <label class="feedback-field-label">后续建议</label>
        <div class="feedback-field-content">{{ detail.feedbackSuggestion }}</div>
      </div>
    </section>

    <!-- 驳回原因 (rejected) -->
    <section v-if="modalType === 'rejected'" class="feedback-panel feedback-panel--rejected">
      <div class="feedback-badge-row">
        <span class="feedback-badge feedback-badge--rejected">
          <span class="mdi mdi-close-circle" aria-hidden="true" /> 驳回原因
        </span>
      </div>
      <div class="rejected-content">
        {{ detail?.reviewRemark || '暂无驳回原因' }}
      </div>
      <div v-if="detail?.rejectedAt" class="rejected-meta">
        <span class="mdi mdi-clock" aria-hidden="true" /> 驳回时间：{{ detail.rejectedAt }} | 审核人：{{ detail?.reviewerName || 'Admin' }}
      </div>
    </section>

    <!-- 审核操作区 (entry / written 待审核) -->
    <section v-if="isPendingReview" class="review-section">
      <label class="review-label">
        <span class="mdi mdi-comment-edit" aria-hidden="true" /> 审核备注
      </label>
      <textarea
        v-model="reviewRemark"
        class="review-textarea"
        rows="2"
        placeholder="输入审核备注（可选）"
      />
    </section>

    <template #footer>
      <div class="modal-footer-row">
        <button type="button" class="btn-outline" @click="handleClose">关闭</button>
        <template v-if="isPendingReview">
          <button type="button" class="btn-outline btn-outline--danger" @click="handleReject">
            <span class="mdi mdi-close" aria-hidden="true" /> 驳回
          </button>
          <button type="button" class="btn-primary" @click="handleApprove">
            <span class="mdi mdi-check" aria-hidden="true" /> 通过
          </button>
        </template>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
  approve: [payload: { remark?: string }]
  reject: [payload: { remark?: string }]
}>()

const reviewRemark = ref('')

watch(() => props.visible, (val) => {
  if (val) reviewRemark.value = ''
})

const modalType = computed(() => props.detail?.modalType || 'entry')

const headerTitle = computed(() => {
  const titles: Record<string, string> = {
    mock: '课程详情 - 模拟面试',
    entry: '课程审核 - 入职面试',
    midterm: '课程详情 - 模拟期中考试',
    networking: '课程详情 - 人际关系期中考试',
    written: '课程审核 - 笔试辅导',
    rejected: '课程详情 - 已驳回'
  }
  if (props.detail?.displayStatus === 'pending') {
    const reviewTitles: Record<string, string> = {
      entry: '课程审核 - 入职面试',
      written: '课程审核 - 笔试辅导'
    }
    return reviewTitles[modalType.value] || titles[modalType.value] || '课程详情'
  }
  return titles[modalType.value] || '课程详情'
})

const headerGradientStyle = computed(() => {
  const gradients: Record<string, string> = {
    mock: 'linear-gradient(135deg, #22c55e, #16a34a)',
    entry: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    midterm: 'linear-gradient(135deg, #f59e0b, #d97706)',
    networking: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    written: 'linear-gradient(135deg, #ec4899, #db2777)',
    rejected: 'linear-gradient(135deg, #ef4444, #dc2626)'
  }
  return {} // Header gradient is managed via CSS on the OverlaySurfaceModal; keeping structure
})

const infoGridClass = computed(() => {
  if (props.detail?.displayStatus === 'pending') return 'info-grid--pending'
  if (props.detail?.displayStatus === 'rejected') return 'info-grid--rejected'
  return ''
})

const courseTypeTagClass = computed(() => {
  const map: Record<string, string> = {
    onboarding_interview: 'type-tag--info',
    mock_interview: 'type-tag--success',
    written_test: 'type-tag--purple',
    midterm_exam: 'type-tag--purple',
    communication_midterm: 'type-tag--violet',
    qbank_request: 'type-tag--warning'
  }
  return map[props.detail?.courseType || ''] || 'type-tag--info'
})

const sourceBadgeStyle = computed(() => {
  const colors: Record<string, string> = {
    mentor: '#5a7ba3',
    headteacher: '#059669',
    assistant: '#92400e'
  }
  const bg = colors[props.detail?.source || ''] || '#5a7ba3'
  return { background: bg, color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }
})

const showTopicSection = computed(() => {
  return ['entry', 'written', 'mock'].includes(modalType.value)
})

const isPendingReview = computed(() => {
  return props.detail?.displayStatus === 'pending' && ['entry', 'written'].includes(modalType.value)
})

const handleClose = () => {
  emit('update:visible', false)
}

const handleApprove = () => {
  emit('approve', { remark: reviewRemark.value.trim() || undefined })
}

const handleReject = () => {
  emit('reject', { remark: reviewRemark.value.trim() || undefined })
}

const formatDate = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const y = date.getFullYear()
  return `${m}/${d}/${y}`
}

const nl2br = (text: string) => {
  return text.replace(/\n/g, '<br>')
}
</script>

<style scoped lang="scss">
.modal-title-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

/* --- Info grid --- */
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 12px;
  background: var(--table-header-bg, #f8fafc);
}

.info-grid--pending {
  background: #fef3c7;
  border: 1px solid #fcd34d;
}

.info-grid--rejected {
  background: #fef2f2;
  border: 1px solid #fecaca;
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

.info-value--bold {
  font-weight: 600;
}

.info-value--fee {
  font-weight: 700;
  color: var(--primary, #3b82f6);
}

.info-value--strikethrough {
  color: var(--text-secondary, #64748b);
  text-decoration: line-through;
}

/* --- Tags --- */
.type-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.type-tag--info { background: #dbeafe; color: #1d4ed8; }
.type-tag--success { background: #dcfce7; color: #166534; }
.type-tag--purple { background: #ede9fe; color: #6d28d9; }
.type-tag--violet { background: #f3e8ff; color: #7c3aed; }
.type-tag--warning { background: #fef3c7; color: #92400e; }

.status-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-tag--pending { background: #fef3c7; color: #92400e; }
.status-tag--unpaid { background: #dbeafe; color: #1d4ed8; }
.status-tag--paid { background: #dcfce7; color: #166534; }
.status-tag--rejected { background: #fee2e2; color: #b91c1c; }

.source-badge {
  display: inline-flex;
  font-size: 12px;
}

/* --- Detail section --- */
.detail-section {
  margin-top: 16px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  margin-bottom: 8px;
}

.section-label-icon {
  color: var(--primary, #3b82f6);
}

.section-content {
  padding: 12px;
  background: var(--table-header-bg, #f8fafc);
  border-radius: 8px;
  border: 1px solid var(--border, #e2e8f0);
}

/* --- Feedback panels --- */
.feedback-panel {
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
}

.feedback-panel--mock { background: #ecfdf5; border: 1px solid #86efac; }
.feedback-panel--entry { background: #eff6ff; border: 1px solid #93c5fd; }
.feedback-panel--midterm { background: #fef3c7; border: 1px solid #fcd34d; }
.feedback-panel--networking { background: #f3e8ff; border: 1px solid #c4b5fd; }
.feedback-panel--written { background: #fce7f3; border: 1px solid #f9a8d4; }
.feedback-panel--rejected { background: #fef2f2; border: 1px solid #fecaca; }

.feedback-badge-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.feedback-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.feedback-badge--mock { background: #22c55e; }
.feedback-badge--entry { background: #3b82f6; }
.feedback-badge--midterm { background: #f59e0b; }
.feedback-badge--networking { background: #8b5cf6; }
.feedback-badge--written { background: #ec4899; }
.feedback-badge--rejected { background: #ef4444; }

.feedback-meta-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.feedback-meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feedback-meta-value {
  font-weight: 600;
}

.feedback-meta-value--success { color: #22c55e; }
.feedback-meta-value--star { color: #f59e0b; }

.feedback-field {
  margin-bottom: 12px;
}

.feedback-field:last-child {
  margin-bottom: 0;
}

.feedback-field-label {
  font-size: 12px;
  color: var(--text-secondary, #64748b);
  display: block;
  margin-bottom: 4px;
}

.feedback-field-content {
  padding: 10px;
  background: #fff;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.6;
}

/* --- Midterm scores --- */
.midterm-scores {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.midterm-score-card {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}

.midterm-score-label {
  font-size: 12px;
  color: var(--text-secondary, #64748b);
}

.midterm-score-value {
  font-weight: 700;
  margin-top: 4px;
}

.midterm-score-value--amber { font-size: 28px; color: #f59e0b; }
.midterm-score-value--success { font-size: 18px; color: #22c55e; }
.midterm-score-value--star { font-size: 18px; color: #f59e0b; }

/* --- Networking scores --- */
.networking-scores {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.networking-score-card {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}

.networking-score-label {
  font-size: 11px;
  color: var(--text-secondary, #64748b);
}

.networking-score-value {
  font-size: 24px;
  font-weight: 700;
  color: #8b5cf6;
  margin-top: 4px;
}

.networking-score-value--success {
  color: #22c55e;
  font-size: 18px;
}

.networking-score-base {
  font-size: 12px;
  color: var(--text-secondary, #64748b);
}

/* --- Payment info --- */
.payment-info {
  margin-top: 16px;
  padding: 12px 16px;
  background: #ecfdf5;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #059669;
  font-size: 13px;
}

.payment-date {
  color: var(--text-secondary, #64748b);
  font-size: 12px;
}

/* --- Rejected content --- */
.rejected-content {
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  color: #dc2626;
}

.rejected-meta {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-secondary, #64748b);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* --- Review section --- */
.review-section {
  margin-top: 20px;
  padding: 16px;
  background: #fffbeb;
  border-radius: 12px;
  border: 1px solid #fcd34d;
}

.review-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 8px;
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
</style>
