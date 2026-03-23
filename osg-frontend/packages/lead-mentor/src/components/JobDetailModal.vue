<template>
  <div
    v-if="modelValue && preview"
    class="job-detail-modal modal"
    data-surface-id="modal-job-detail"
  >
    <button
      type="button"
      class="job-detail-backdrop"
      data-surface-part="backdrop"
      aria-label="关闭学员求职详情弹层"
      @click="closeModal"
    />

    <div
      class="job-detail-shell modal-content"
      data-surface-part="shell"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="job-detail-header modal-header" data-surface-part="header">
        <span :id="titleId" class="job-detail-title modal-title">
          <i class="mdi mdi-briefcase-search" aria-hidden="true" />
          学员求职详情
        </span>
        <button
          type="button"
          class="modal-close"
          data-surface-part="close-control"
          aria-label="关闭学员求职详情弹层"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <div class="job-detail-body modal-body" data-surface-part="body">
        <section class="hero-card">
          <div class="hero-block">
            <div class="hero-label">
              <i class="mdi mdi-account" aria-hidden="true" />
              学员信息
            </div>
            <div class="hero-student">
              <div id="jd-student-avatar" class="hero-avatar">{{ preview.studentName }}</div>
              <div>
                <div id="jd-student-name" class="hero-value">{{ preview.studentName }}</div>
                <div class="hero-meta">
                  ID:
                  <span id="jd-student-id">{{ preview.studentId }}</span>
                  · 班主任:
                  <span id="jd-lead-mentor">{{ preview.leadMentorName }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="hero-block">
            <div class="hero-label">
              <i class="mdi mdi-domain" aria-hidden="true" />
              申请岗位
            </div>
            <div id="jd-company" class="hero-value hero-value--brand">{{ preview.companyName }}</div>
            <div id="jd-position" class="hero-meta hero-meta--body">{{ preview.positionName }}</div>
            <div class="hero-meta hero-meta--body">
              招聘周期:
              <span id="jd-cycle">{{ preview.recruitmentCycle }}</span>
            </div>
          </div>
        </section>

        <section class="modal-section">
          <div class="section-title">
            <i class="mdi mdi-timeline-clock" aria-hidden="true" />
            求职进度
          </div>

          <div class="timeline">
            <div class="timeline-step">
              <div class="timeline-badge timeline-badge--done">
                <i class="mdi mdi-check" aria-hidden="true" />
              </div>
              <div class="timeline-copy">已投递<span>01/05</span></div>
            </div>
            <div class="timeline-line timeline-line--done" />
            <div class="timeline-step">
              <div class="timeline-badge timeline-badge--done">
                <i class="mdi mdi-check" aria-hidden="true" />
              </div>
              <div class="timeline-copy">HireVue<span>01/10</span></div>
            </div>
            <div class="timeline-line timeline-line--done" />
            <div class="timeline-step">
              <div class="timeline-badge timeline-badge--current">
                <i class="mdi mdi-clock" aria-hidden="true" />
              </div>
              <div class="timeline-copy timeline-copy--current">First Round<span>当前</span></div>
            </div>
            <div class="timeline-line" />
            <div class="timeline-step timeline-step--future">
              <div class="timeline-badge timeline-badge--future">
                <i class="mdi mdi-circle-outline" aria-hidden="true" />
              </div>
              <div class="timeline-copy">Final</div>
            </div>
            <div class="timeline-line" />
            <div class="timeline-step timeline-step--future">
              <div class="timeline-badge timeline-badge--future">
                <i class="mdi mdi-circle-outline" aria-hidden="true" />
              </div>
              <div class="timeline-copy">Offer</div>
            </div>
          </div>

          <div class="interview-card">
            <i class="mdi mdi-calendar-clock" aria-hidden="true" />
            <div>
              <div>
                面试时间:
                <span id="jd-interview-time">{{ preview.interviewTime }}</span>
              </div>
              <div id="jd-countdown">{{ preview.countdownText }}</div>
            </div>
          </div>
        </section>

        <section class="modal-section">
          <div class="section-title section-title--purple">
            <i class="mdi mdi-school" aria-hidden="true" />
            辅导信息
          </div>

          <div class="coaching-grid">
            <article class="coaching-card">
              <div>辅导状态</div>
              <strong id="jd-coaching-status">{{ preview.coachingStatus }}</strong>
            </article>
            <article class="coaching-card">
              <div>分配导师</div>
              <strong id="jd-mentor">{{ preview.mentorName }}</strong>
            </article>
            <article class="coaching-card">
              <div>已上课时</div>
              <strong id="jd-hours">{{ preview.lessonHours }}</strong>
            </article>
            <article class="coaching-card">
              <div>申请时间</div>
              <strong id="jd-apply-time">{{ preview.applyTime }}</strong>
            </article>
          </div>
        </section>

        <section class="modal-section">
          <div class="section-head">
            <div class="section-title section-title--green">
              <i class="mdi mdi-book-open-variant" aria-hidden="true" />
              课程记录 (最近3条)
            </div>

            <button type="button" class="btn btn-text btn-sm" @click="emit('request-view-all')">
              查看全部
              <i class="mdi mdi-arrow-right" aria-hidden="true" />
            </button>
          </div>

          <div class="records">
            <article
              v-for="record in records"
              :key="`${record.date}-${record.label}`"
              class="record-item"
              :class="record.tone"
            >
              <span class="record-date">{{ record.date }}</span>
              <span class="record-tag" :class="record.tagTone">{{ record.label }}</span>
              <span class="record-hours">{{ record.hours }}</span>
              <span class="record-summary">{{ record.summary }}</span>
              <span class="record-grade" :class="record.tagTone">{{ record.grade }}</span>
            </article>
          </div>
        </section>

        <section class="modal-section modal-section--notes">
          <div class="section-title section-title--amber">
            <i class="mdi mdi-note-text" aria-hidden="true" />
            学员备注
          </div>
          <div id="jd-notes" class="notes-card">{{ preview.notes }}</div>
        </section>
      </div>

      <div class="job-detail-footer modal-footer">
        <button type="button" class="btn btn-outline" @click="closeModal">关闭</button>
        <button
          type="button"
          class="btn job-detail-action"
          data-surface-trigger="modal-assign-mentor"
          @click="emit('request-mentor-change')"
        >
          <i class="mdi mdi-account-switch" aria-hidden="true" />
          更换导师
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface JobDetailPreview {
  studentName: string
  studentId: string
  leadMentorName: string
  companyName: string
  positionName: string
  recruitmentCycle: string
  interviewTime: string
  countdownText: string
  coachingStatus: string
  mentorName: string
  lessonHours: string
  applyTime: string
  notes: string
}

interface CourseRecord {
  date: string
  label: string
  hours: string
  summary: string
  grade: string
  tone: string
  tagTone: string
}

defineProps<{
  modelValue: boolean
  preview: JobDetailPreview | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'request-mentor-change': []
  'request-view-all': []
}>()

const titleId = 'job-detail-modal-title'

const records: CourseRecord[] = [
  {
    date: '01/15',
    label: '模拟面试',
    hours: '2h',
    summary: '表现优秀，建议加强Valuation部分',
    grade: '优秀',
    tone: 'record-item--green',
    tagTone: 'record-tag--green',
  },
  {
    date: '01/12',
    label: '技术讲解',
    hours: '2h',
    summary: '掌握DCF基础，需巩固LBO',
    grade: '良好',
    tone: 'record-item--blue',
    tagTone: 'record-tag--blue',
  },
  {
    date: '01/10',
    label: '简历修改',
    hours: '1h',
    summary: '完成简历优化，突出实习经历',
    grade: '完成',
    tone: 'record-item--purple',
    tagTone: 'record-tag--purple',
  },
]

const closeModal = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss">
.job-detail-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
}

.job-detail-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.5);
}

.job-detail-shell {
  position: relative;
  z-index: 1;
  width: min(90%, 700px);
  max-height: 90vh;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
}

.job-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 16px 16px 0 0;
}

.job-detail-title {
  display: inline-flex;
  align-items: center;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}

.job-detail-title .mdi-briefcase-search {
  margin-right: 8px;
}

.modal-close {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.job-detail-body {
  max-height: 75vh;
  overflow-y: auto;
  padding: 26px;
}

.hero-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin: -26px -26px 0;
  padding: 20px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
}

.hero-label {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #3b82f6;
}

.hero-student {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #3b82f6;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.hero-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.hero-value--brand {
  color: #1e40af;
}

.hero-meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.hero-meta--body {
  font-size: 13px;
}

.modal-section {
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.modal-section--notes {
  border-bottom: 0;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.section-title--purple {
  color: #6d28d9;
}

.section-title--green {
  color: #166534;
}

.section-title--amber {
  color: #b45309;
}

.timeline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.timeline-step {
  display: flex;
  align-items: center;
  gap: 6px;
}

.timeline-step--future {
  opacity: 0.55;
}

.timeline-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 10px;
}

.timeline-badge--done {
  background: #22c55e;
}

.timeline-badge--current {
  background: #f59e0b;
}

.timeline-badge--future {
  background: #e5e7eb;
  color: #9ca3af;
}

.timeline-copy {
  font-size: 12px;
  color: var(--text);
}

.timeline-copy span {
  display: block;
  font-size: 10px;
  color: var(--muted);
}

.timeline-copy--current {
  color: #f59e0b;
  font-weight: 600;
}

.timeline-line {
  width: 30px;
  height: 2px;
  background: #e5e7eb;
}

.timeline-line--done {
  background: #22c55e;
}

.interview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #fef3c7;
  color: #92400e;
}

.interview-card .mdi-calendar-clock {
  font-size: 24px;
  color: #f59e0b;
}

.interview-card div:first-child {
  font-size: 13px;
  font-weight: 600;
}

#jd-countdown {
  margin-top: 4px;
  font-size: 11px;
  color: #b45309;
}

.coaching-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.coaching-card {
  padding: 12px;
  border-radius: 8px;
  background: #f3e8ff;
  text-align: center;
}

.coaching-card div {
  margin-bottom: 4px;
  font-size: 11px;
  color: #7c3aed;
}

.coaching-card strong {
  color: #6d28d9;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: 0;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}

.btn-outline {
  background: #fff;
  color: var(--text2);
  border: 1px solid var(--border);
}

.btn-text {
  padding: 6px 12px;
  background: transparent;
  color: var(--primary);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 11px;
}

.records {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border-left: 3px solid transparent;
}

.record-item--green {
  border-left-color: #22c55e;
}

.record-item--blue {
  border-left-color: #3b82f6;
}

.record-item--purple {
  border-left-color: #8b5cf6;
}

.record-date,
.record-hours {
  min-width: 50px;
  font-size: 11px;
  color: var(--muted);
}

.record-summary {
  flex: 1;
  font-size: 12px;
  color: var(--text);
}

.record-tag,
.record-grade {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
}

.record-tag--green {
  background: #dcfce7;
  color: #166534;
}

.record-tag--blue {
  background: #dbeafe;
  color: #1e40af;
}

.record-tag--purple {
  background: #f3e8ff;
  color: #7c3aed;
}

.notes-card {
  padding: 12px;
  border-radius: 8px;
  background: #fffbeb;
  font-size: 13px;
  line-height: 1.6;
  color: #92400e;
}

.job-detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 26px;
  background: #f8fafc;
}

.job-detail-action {
  background: #8b5cf6;
  color: #fff;
}

@media (max-width: 768px) {
  .hero-card,
  .coaching-grid {
    grid-template-columns: 1fr;
  }

  .timeline {
    align-items: flex-start;
  }

  .record-item {
    flex-wrap: wrap;
  }
}
</style>
