<template>
  <div
    v-if="modelValue && preview"
    class="assign-mentor-modal modal"
    data-surface-id="modal-assign-mentor"
  >
    <button
      type="button"
      class="assign-mentor-backdrop"
      data-surface-part="backdrop"
      aria-label="关闭导师匹配弹层"
      @click="closeModal"
    />

    <div
      class="assign-mentor-shell modal-content"
      data-surface-part="shell"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="assign-mentor-header modal-header" data-surface-part="header">
        <span :id="titleId" class="assign-mentor-title modal-title">
          <i class="mdi mdi-account-star" aria-hidden="true" />
          为学员匹配辅导导师
        </span>
        <button
          type="button"
          class="modal-close"
          data-surface-part="close-control"
          aria-label="关闭导师匹配弹层"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <div class="assign-mentor-body modal-body" data-surface-part="body">
        <section class="student-card">
          <div class="student-card__main">
            <div class="student-avatar">{{ preview.studentName }}</div>
            <div>
              <div class="student-card__name">
                {{ preview.studentName }}
                <span class="student-card__meta">(ID: {{ preview.studentId }})</span>
              </div>
              <div class="student-card__sub">{{ preview.companyName }} · {{ preview.positionName }}</div>
            </div>
          </div>

          <div class="student-grid">
            <article>
              <span>面试阶段</span>
              <strong>{{ preview.interviewStage }}</strong>
            </article>
            <article>
              <span>面试时间</span>
              <strong>{{ preview.interviewTime }}</strong>
            </article>
            <article>
              <span>需求导师</span>
              <strong class="student-grid__accent">{{ preview.mentorDemand }}</strong>
            </article>
          </div>

          <div class="student-grid student-grid--secondary">
            <article>
              <span>意向导师</span>
              <strong class="student-grid__success">{{ preview.preferredMentor }}</strong>
            </article>
            <article>
              <span>排除导师</span>
              <strong class="student-grid__danger">{{ preview.excludedMentor }}</strong>
            </article>
          </div>
        </section>

        <div class="form-group">
          <label class="form-label">筛选导师</label>
          <div class="filter-row">
            <select v-model="scheduleFilter" class="form-select">
              <option value="available">有空闲时间</option>
              <option value="">全部排期状态</option>
              <option value="busy">排期紧张</option>
            </select>
            <select v-model="mainDirection" class="form-select">
              <option value="">全部主攻方向</option>
              <option value="ib">Investment Bank</option>
              <option value="consulting">Consulting</option>
              <option value="tech">Tech</option>
              <option value="pe">PE/VC</option>
            </select>
            <select v-model="subDirection" class="form-select">
              <option value="">全部子方向</option>
              <option value="m&a">M&A</option>
              <option value="dcm">DCM</option>
              <option value="ecm">ECM</option>
              <option value="s&t">S&T</option>
              <option value="research">Research</option>
            </select>
            <input
              v-model="mentorKeyword"
              class="form-input"
              type="text"
              placeholder="搜索导师姓名..."
            />
          </div>
          <div class="filter-hint">
            <i class="mdi mdi-filter" aria-hidden="true" />
            已按"有空闲时间 + Investment Bank"筛选，共找到 <strong>3</strong> 位导师
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">
            选择导师
            <span class="form-label__meta">(可多选)</span>
          </label>

          <div class="mentor-list">
            <button
              v-for="mentor in mentorOptions"
              :key="mentor.id"
              type="button"
              class="mentor-item"
              :class="{
                'mentor-item--selected': selectedMentorIds.includes(mentor.id),
                'mentor-item--muted': mentor.tone === 'muted',
              }"
              @click="toggleMentor(mentor.id)"
            >
              <input
                class="mentor-item__checkbox"
                type="checkbox"
                :checked="selectedMentorIds.includes(mentor.id)"
                aria-label="选择导师"
                @click.stop="toggleMentor(mentor.id)"
              />
              <div class="mentor-item__avatar" :style="{ background: mentor.avatarColor }">
                {{ mentor.avatarLabel }}
              </div>
              <div class="mentor-item__copy">
                <div class="mentor-item__name">
                  {{ mentor.name }}
                  <span class="mentor-item__badge">{{ mentor.badge }}</span>
                </div>
                <div class="mentor-item__sub">{{ mentor.summary }}</div>
              </div>
              <div class="mentor-item__meta">
                <span class="mentor-item__status" :class="mentor.statusTone">{{ mentor.status }}</span>
                <div class="mentor-item__hours">{{ mentor.hours }}</div>
              </div>
            </button>
          </div>

          <div class="selection-hint">
            <i class="mdi mdi-information" aria-hidden="true" />
            已选择 <strong>{{ selectedMentorIds.length }}</strong> 位导师
          </div>
        </div>

        <div class="form-group form-group--last">
          <label class="form-label">
            备注
            <span class="form-label__meta">(选填)</span>
          </label>
          <textarea
            v-model="notes"
            class="form-input form-input--textarea"
            rows="2"
            placeholder="给导师的特别说明，如学员背景、重点辅导内容等..."
          />
        </div>
      </div>

      <div class="assign-mentor-footer modal-footer">
        <button type="button" class="btn btn-outline" @click="closeModal">取消</button>
        <button type="button" class="btn assign-mentor-action" @click="emit('confirm-match')">
          <i class="mdi mdi-check" aria-hidden="true" />
          确认匹配
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface AssignMentorPreview {
  studentName: string
  studentId: string
  companyName: string
  positionName: string
  interviewStage: string
  interviewTime: string
  mentorDemand: string
  preferredMentor: string
  excludedMentor: string
}

interface MentorOption {
  id: string
  name: string
  badge: string
  summary: string
  status: string
  statusTone: string
  hours: string
  avatarColor: string
  avatarLabel: string
  tone?: 'muted'
}

defineProps<{
  modelValue: boolean
  preview: AssignMentorPreview | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm-match': []
}>()

const titleId = 'assign-mentor-modal-title'
const scheduleFilter = ref('available')
const mainDirection = ref('ib')
const subDirection = ref('')
const mentorKeyword = ref('')
const notes = ref('')
const selectedMentorIds = ref<string[]>(['jerry-li', 'mike-wang'])

const mentorOptions: MentorOption[] = [
  {
    id: 'jerry-li',
    name: 'Jerry Li',
    badge: 'IB · M&A',
    summary: 'Goldman Sachs Ex-VP · 5年经验',
    status: '有空闲',
    statusTone: 'mentor-item__status--success',
    hours: '本周: 8h',
    avatarColor: 'var(--primary)',
    avatarLabel: 'Jerry',
  },
  {
    id: 'mike-wang',
    name: 'Mike Wang',
    badge: 'IB · ECM',
    summary: 'Morgan Stanley · 3年经验',
    status: '有空闲',
    statusTone: 'mentor-item__status--success',
    hours: '本周: 6h',
    avatarColor: '#22c55e',
    avatarLabel: 'Mike',
  },
  {
    id: 'sarah-chen',
    name: 'Sarah Chen',
    badge: 'IB · DCM',
    summary: 'JP Morgan · 4年经验',
    status: '有空闲',
    statusTone: 'mentor-item__status--success',
    hours: '本周: 4h',
    avatarColor: '#f59e0b',
    avatarLabel: 'Sarah',
  },
  {
    id: 'tom-zhang',
    name: 'Tom Zhang',
    badge: 'IB · S&T',
    summary: 'Citi · 2年经验',
    status: '排期紧张',
    statusTone: 'mentor-item__status--warning',
    hours: '本周: 1h',
    avatarColor: '#6b7280',
    avatarLabel: 'Tom',
    tone: 'muted',
  },
]

const closeModal = () => {
  emit('update:modelValue', false)
}

const toggleMentor = (mentorId: string) => {
  if (selectedMentorIds.value.includes(mentorId)) {
    selectedMentorIds.value = selectedMentorIds.value.filter((id) => id !== mentorId)
    return
  }
  selectedMentorIds.value = [...selectedMentorIds.value, mentorId]
}
</script>

<style scoped lang="scss">
.assign-mentor-modal {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.assign-mentor-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.5);
}

.assign-mentor-shell {
  position: relative;
  z-index: 1;
  width: min(100%, 650px);
  max-height: min(90vh, 840px);
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
}

.assign-mentor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.assign-mentor-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}

.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}

.assign-mentor-body {
  max-height: 70vh;
  overflow-y: auto;
  padding: 26px;
}

.student-card {
  margin-bottom: 20px;
  border-radius: 12px;
  background: #f3e8ff;
  padding: 16px;
}

.student-card__main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.student-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  background: #8b5cf6;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.student-card__name {
  font-size: 15px;
  font-weight: 600;
}

.student-card__meta {
  margin-left: 4px;
  font-size: 12px;
  color: var(--muted);
}

.student-card__sub {
  font-size: 13px;
  color: var(--muted);
}

.student-grid {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(139, 92, 246, 0.2);
}

.student-grid--secondary article {
  flex: 1;
}

.student-grid article {
  min-width: 0;
}

.student-grid span {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--muted);
}

.student-grid strong {
  font-size: 13px;
  font-weight: 600;
}

.student-grid__accent {
  color: var(--primary);
}

.student-grid__success {
  color: #22c55e;
}

.student-grid__danger {
  color: #ef4444;
}

.form-group {
  margin-bottom: 16px;
}

.form-group--last {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text2);
  font-size: 13px;
  font-weight: 600;
}

.form-label__meta {
  margin-left: 4px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 400;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 8px;
}

.form-select,
.form-input {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  color: var(--text);
  font-size: 14px;
}

.form-select {
  width: 130px;
  padding: 10px 36px 10px 12px;
}

.form-input {
  width: 140px;
  padding: 12px 14px;
}

.form-input--textarea {
  width: 100%;
  min-height: 72px;
  resize: none;
}

.filter-hint,
.selection-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: 11px;
}

.selection-hint {
  margin-top: 8px;
  font-size: 12px;
}

.mentor-list {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.mentor-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: #fff;
  padding: 12px 16px;
  text-align: left;
  cursor: pointer;
}

.mentor-item:last-child {
  border-bottom: 0;
}

.mentor-item--selected {
  background: #f0fdf4;
}

.mentor-item--muted {
  opacity: 0.6;
}

.mentor-item__checkbox {
  width: 18px;
  height: 18px;
  accent-color: #8b5cf6;
}

.mentor-item__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.mentor-item__copy {
  flex: 1;
  min-width: 0;
}

.mentor-item__name {
  font-size: 13px;
  font-weight: 600;
}

.mentor-item__badge {
  margin-left: 4px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  padding: 2px 6px;
  font-size: 9px;
}

.mentor-item__sub {
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}

.mentor-item__meta {
  text-align: right;
}

.mentor-item__status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 10px;
}

.mentor-item__status--success {
  background: #dcfce7;
  color: #166534;
}

.mentor-item__status--warning {
  background: #fef3c7;
  color: #92400e;
}

.mentor-item__hours {
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
}

.assign-mentor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 26px;
  background: #f8fafc;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-outline {
  background: #fff;
  color: var(--text2);
  box-shadow: inset 0 0 0 1px var(--border);
}

.assign-mentor-action {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #fff;
}

@media (max-width: 768px) {
  .assign-mentor-modal {
    padding: 16px;
  }

  .assign-mentor-shell {
    width: 100%;
  }

  .assign-mentor-body {
    padding: 20px;
  }

  .student-grid {
    flex-direction: column;
    gap: 10px;
  }

  .filter-row {
    flex-direction: column;
  }

  .form-select,
  .form-input {
    width: 100%;
  }

  .mentor-item {
    align-items: flex-start;
  }

  .mentor-item__meta {
    min-width: 72px;
  }
}
</style>
