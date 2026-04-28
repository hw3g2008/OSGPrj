<template>
  <a-config-provider :auto-insert-space-in-button="false">
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
        <a-row :gutter="16" class="hero-row">
          <a-col :xs="24" :md="12">
            <div class="hero-card hero-card--student">
              <div class="hero-label">
                <i class="mdi mdi-account" aria-hidden="true" />
                学员信息
              </div>
              <div class="hero-student">
                <a-avatar
                  id="jd-student-avatar"
                  class="hero-avatar"
                  :size="48"
                  :style="{ backgroundColor: '#3b82f6' }"
                >
                  {{ studentInitial }}
                </a-avatar>
                <div class="hero-student-info">
                  <div id="jd-student-name" class="hero-value" :title="preview.studentName">
                    {{ preview.studentName }}
                  </div>
                  <div class="hero-meta">
                    ID: <span id="jd-student-id">{{ preview.studentId }}</span>
                    · 班主任: <span id="jd-lead-mentor">{{ preview.leadMentorName }}</span>
                  </div>
                </div>
              </div>
            </div>
          </a-col>

          <a-col :xs="24" :md="12">
            <div class="hero-card hero-card--position">
              <div class="hero-label">
                <i class="mdi mdi-domain" aria-hidden="true" />
                申请岗位
              </div>
              <div id="jd-company" class="hero-value hero-value--brand" :title="preview.companyName">
                {{ preview.companyName }}
              </div>
              <div id="jd-position" class="hero-meta hero-meta--body">{{ preview.positionName }}</div>
              <div class="hero-meta hero-meta--body">
                招聘周期: <span id="jd-cycle">{{ preview.recruitmentCycle }}</span>
              </div>
            </div>
          </a-col>
        </a-row>

        <section class="modal-section">
          <div class="section-title">
            <i class="mdi mdi-timeline-clock" aria-hidden="true" />
            求职进度
          </div>

          <a-steps
            :current="2"
            size="small"
            class="job-steps"
            label-placement="vertical"
            :items="stepItems"
          />

          <div class="interview-card">
            <i class="mdi mdi-calendar-clock" aria-hidden="true" />
            <div class="interview-card__body">
              <div class="interview-card__title">
                面试时间: <span id="jd-interview-time">{{ preview.interviewTime }}</span>
              </div>
              <div id="jd-countdown" class="interview-card__meta">{{ preview.countdownText }}</div>
            </div>
          </div>
        </section>

        <section class="modal-section">
          <div class="section-title section-title--purple">
            <i class="mdi mdi-school" aria-hidden="true" />
            辅导信息
          </div>

          <a-row :gutter="[12, 12]" class="coaching-row">
            <a-col :xs="12" :sm="6">
              <div class="coaching-card">
                <div class="coaching-card__label">辅导状态</div>
                <strong id="jd-coaching-status" class="coaching-card__value">
                  {{ preview.coachingStatus }}
                </strong>
              </div>
            </a-col>
            <a-col :xs="12" :sm="6">
              <div class="coaching-card">
                <div class="coaching-card__label">分配导师</div>
                <strong id="jd-mentor" class="coaching-card__value">{{ preview.mentorName }}</strong>
              </div>
            </a-col>
            <a-col :xs="12" :sm="6">
              <div class="coaching-card">
                <div class="coaching-card__label">已上课时</div>
                <strong id="jd-hours" class="coaching-card__value">{{ preview.lessonHours }}</strong>
              </div>
            </a-col>
            <a-col :xs="12" :sm="6">
              <div class="coaching-card">
                <div class="coaching-card__label">申请时间</div>
                <strong id="jd-apply-time" class="coaching-card__value">{{ preview.applyTime }}</strong>
              </div>
            </a-col>
          </a-row>
        </section>

        <section class="modal-section">
          <div class="section-head">
            <div class="section-title section-title--green">
              <i class="mdi mdi-book-open-variant" aria-hidden="true" />
              课程记录 (最近3条)
            </div>

            <a-button type="link" size="small" class="view-all-btn" @click="emit('request-view-all')">
              查看全部
              <i class="mdi mdi-arrow-right" aria-hidden="true" />
            </a-button>
          </div>

          <div class="records">
            <article
              v-for="record in records"
              :key="`${record.date}-${record.label}`"
              class="record-item"
              :class="record.tone"
            >
              <span class="record-date">{{ record.date }}</span>
              <a-tag class="record-tag" :class="record.tagTone" :bordered="false">
                {{ record.label }}
              </a-tag>
              <span class="record-hours">{{ record.hours }}</span>
              <span class="record-summary">{{ record.summary }}</span>
              <a-tag class="record-grade" :class="record.tagTone" :bordered="false">
                {{ record.grade }}
              </a-tag>
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
        <a-button class="footer-btn" @click="closeModal">关闭</a-button>
        <a-button
          type="primary"
          class="footer-btn job-detail-action"
          data-surface-trigger="modal-assign-mentor"
          @click="emit('request-mentor-change')"
        >
          <template #icon>
            <i class="mdi mdi-account-switch" aria-hidden="true" />
          </template>
          更换导师
        </a-button>
      </div>
    </div>
  </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'

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

const props = defineProps<{
  modelValue: boolean
  preview: JobDetailPreview | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'request-mentor-change': []
  'request-view-all': []
}>()

const titleId = 'job-detail-modal-title'

const studentInitial = computed(() => {
  const name = props.preview?.studentName?.trim() ?? ''
  if (!name) return ''
  const ascii = /^[\x00-\x7F]+$/.test(name)
  if (ascii) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return name.slice(0, 1)
})

const stepIcon = (cls: string) =>
  h('i', { class: `mdi ${cls}`, 'aria-hidden': 'true' })

const stepItems = [
  {
    title: '已投递',
    description: '01/05',
    icon: stepIcon('mdi-check'),
  },
  {
    title: 'HireVue',
    description: '01/10',
    icon: stepIcon('mdi-check'),
  },
  {
    title: 'First Round',
    description: '当前',
    icon: stepIcon('mdi-clock'),
  },
  {
    title: 'Final',
    description: ' ',
  },
  {
    title: 'Offer',
    description: ' ',
  },
]

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
  width: min(92%, 760px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
}

.job-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
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
  font-size: 20px;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.32);
  }
}

.job-detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px 24px;
  background: #fff;
}

.hero-row {
  margin: 0 0 4px !important;
}

.hero-card {
  height: 100%;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
}

.hero-card--position {
  background: linear-gradient(135deg, #eef2ff, #e0e7ff);
}

.hero-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #3b82f6;
}

.hero-card--position .hero-label {
  color: #4f46e5;
}

.hero-student {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.hero-avatar {
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 700;
}

.hero-student-info {
  min-width: 0;
  flex: 1;
}

.hero-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-value--brand {
  color: #1e40af;
}

.hero-meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-meta--body {
  font-size: 13px;
  color: var(--text2);
}

.modal-section {
  padding: 20px 0;
  border-bottom: 1px solid var(--border);
}

.modal-section--notes {
  border-bottom: 0;
  padding-bottom: 4px;
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

.section-head .section-title {
  margin-bottom: 0;
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

.job-steps {
  margin: 4px 0 16px;

  :deep(.ant-steps-item-icon) {
    .mdi {
      font-size: 14px;
    }
  }

  :deep(.ant-steps-item-title) {
    font-size: 13px;
  }

  :deep(.ant-steps-item-description) {
    font-size: 11px;
    color: var(--muted);
  }
}

.interview-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

.interview-card .mdi-calendar-clock {
  flex-shrink: 0;
  font-size: 26px;
  color: #d97706;
}

.interview-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.interview-card__title {
  font-size: 13px;
  font-weight: 600;
  color: #92400e;
}

.interview-card__meta {
  font-size: 12px;
  color: #b45309;
}

.coaching-card {
  height: 100%;
  padding: 14px 12px;
  border-radius: 10px;
  background: #f5f3ff;
  text-align: center;
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.12);
  }
}

.coaching-card__label {
  margin-bottom: 6px;
  font-size: 12px;
  color: #7c3aed;
}

.coaching-card__value {
  display: block;
  font-size: 15px;
  color: #5b21b6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.view-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;

  .mdi {
    font-size: 14px;
  }
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
  padding: 10px 14px;
  border-radius: 10px;
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

.record-date {
  flex-shrink: 0;
  min-width: 42px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.record-hours {
  flex-shrink: 0;
  min-width: 32px;
  font-size: 12px;
  color: var(--muted);
}

.record-summary {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text);
}

.record-tag,
.record-grade {
  flex-shrink: 0;
  margin: 0;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
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
  padding: 14px 16px;
  border-radius: 10px;
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
  font-size: 13px;
  line-height: 1.7;
  color: #92400e;
}

.job-detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid var(--border);
}

.footer-btn {
  min-width: 96px;
}

.job-detail-action {
  background: #8b5cf6;
  border-color: #8b5cf6;

  &:hover,
  &:focus {
    background: #7c3aed !important;
    border-color: #7c3aed !important;
  }
}

@media (max-width: 640px) {
  .job-detail-shell {
    width: 96%;
  }

  .record-item {
    flex-wrap: wrap;
  }
}
</style>
