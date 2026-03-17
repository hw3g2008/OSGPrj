<template>
  <div class="job-tracking-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">
          所有学员的岗位追踪
          <span class="page-title-en">Job Tracking</span>
        </h2>
        <p class="page-subtitle">查看全部学员的求职申请进度，可直接更新状态、面试阶段与导师安排备注。</p>
      </div>
      <div class="page-header__actions">
        <span class="job-tracking-page__traffic">{{ rows.length }} 条岗位记录 · {{ stats.interviewingCount }} 条面试中</span>
      </div>
    </div>

    <section class="job-tracking-hero">
      <article
        v-for="card in statCards"
        :key="card.key"
        :class="['job-tracking-card', `job-tracking-card--${card.tone}`]"
      >
        <span class="job-tracking-card__label">{{ card.label }}</span>
        <strong class="job-tracking-card__value">{{ card.value }}</strong>
        <span class="job-tracking-card__meta">{{ card.meta }}</span>
      </article>
    </section>

    <section class="permission-card job-tracking-panel">
      <div class="job-tracking-filters">
        <label class="job-tracking-field">
          <span>学员姓名</span>
          <input v-model="filters.studentName" type="text" class="job-tracking-input" placeholder="搜索学员" />
        </label>
        <label class="job-tracking-field">
          <span>班主任</span>
          <input v-model="filters.leadMentorName" type="text" class="job-tracking-input" placeholder="如 Jess / Amy" />
        </label>
        <label class="job-tracking-field">
          <span>状态</span>
          <select v-model="filters.trackingStatus" class="job-tracking-select">
            <option value="">全部</option>
            <option value="tracking">追踪中</option>
            <option value="interviewing">面试中</option>
            <option value="offer">已获Offer</option>
            <option value="rejected">已拒绝</option>
          </select>
        </label>
        <label class="job-tracking-field">
          <span>公司</span>
          <input v-model="filters.companyName" type="text" class="job-tracking-input" placeholder="搜索公司" />
        </label>
        <label class="job-tracking-field">
          <span>地点</span>
          <input v-model="filters.location" type="text" class="job-tracking-input" placeholder="搜索城市 / 地区" />
        </label>
        <div class="job-tracking-actions">
          <button type="button" class="permission-button permission-button--outline" @click="loadTrackingBoard">搜索</button>
          <button type="button" class="permission-button permission-button--ghost" @click="resetFilters">重置</button>
        </div>
      </div>
    </section>

    <section class="permission-card job-tracking-panel">
      <div v-if="loading" class="job-tracking-loading">
        <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
        <span>正在加载岗位追踪...</span>
      </div>

      <div v-else class="permission-card__body permission-card__body--flush">
        <table class="permission-table job-tracking-table">
          <thead>
            <tr>
              <th>学员</th>
              <th>导师</th>
              <th>公司</th>
              <th>岗位</th>
              <th>地点</th>
              <th>状态</th>
              <th>面试时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.applicationId">
              <td>
                <div class="job-tracking-cell">
                  <strong>{{ row.studentName || '-' }}</strong>
                  <span>ID: {{ row.studentId }}</span>
                </div>
              </td>
              <td>{{ row.mentorName || '未分配' }}</td>
              <td>{{ row.companyName }}</td>
              <td>{{ row.positionName }}</td>
              <td>{{ row.location || '-' }}</td>
              <td>
                <div class="job-tracking-status">
                  <span :class="['job-tracking-tag', `job-tracking-tag--${toneOf(row.trackingStatus)}`]">
                    {{ labelOf(row.trackingStatus) }}
                  </span>
                  <span v-if="row.interviewStage" class="job-tracking-status__stage">{{ stageLabelOf(row.interviewStage) }}</span>
                </div>
              </td>
              <td>
                <div class="job-tracking-cell">
                  <strong>{{ formatDateTime(row.interviewTime) }}</strong>
                  <span>{{ row.preferredMentor || '意向导师未填' }}</span>
                </div>
              </td>
              <td>
                <button type="button" class="job-tracking-link-button" @click="openEditor(row)">编辑</button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="8" class="job-tracking-empty">当前筛选条件下暂无岗位追踪记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="editingVisible" class="job-tracking-modal-backdrop" @click.self="closeEditor">
      <div class="job-tracking-modal">
        <div class="job-tracking-modal__header">
          <div>
            <span class="job-tracking-modal__eyebrow">更新学员求职状态</span>
            <h3>{{ editingRow?.studentName }} · {{ editingRow?.companyName }}</h3>
          </div>
          <button type="button" class="job-tracking-modal__close" @click="closeEditor">
            <i class="mdi mdi-close" aria-hidden="true"></i>
          </button>
        </div>

        <div class="job-tracking-modal__body">
          <label class="job-tracking-field">
            <span>当前状态</span>
            <select v-model="form.trackingStatus" class="job-tracking-select">
              <option value="tracking">追踪中</option>
              <option value="interviewing">面试中</option>
              <option value="offer">已获Offer</option>
              <option value="rejected">已拒绝</option>
            </select>
          </label>

          <template v-if="form.trackingStatus === 'interviewing'">
            <label class="job-tracking-field">
              <span>面试阶段</span>
              <select v-model="form.interviewStage" class="job-tracking-select">
                <option v-for="option in interviewStageOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="job-tracking-field">
              <span>面试日期+时间</span>
              <input v-model="form.interviewTime" type="datetime-local" class="job-tracking-input" />
            </label>

            <label class="job-tracking-field">
              <span>意向导师</span>
              <input v-model="form.preferredMentor" type="text" class="job-tracking-input" placeholder="如 Jess" />
            </label>

            <label class="job-tracking-field">
              <span>排除导师</span>
              <input v-model="form.excludedMentor" type="text" class="job-tracking-input" placeholder="如 Amy" />
            </label>
          </template>

          <label class="job-tracking-field">
            <span>备注</span>
            <textarea v-model="form.note" class="job-tracking-textarea" rows="4" placeholder="补充跟进说明"></textarea>
          </label>
        </div>

        <div class="job-tracking-modal__footer">
          <button type="button" class="permission-button permission-button--ghost" @click="closeEditor">取消</button>
          <button type="button" class="permission-button" :disabled="submitting" @click="submitUpdate">
            {{ submitting ? '提交中' : '保存更新' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  getJobTrackingList,
  updateJobTracking,
  type JobTrackingFilters,
  type JobTrackingRow,
  type JobTrackingStats
} from '@osg/shared/api/admin/jobTracking'

const defaultStats: JobTrackingStats = {
  totalStudentCount: 0,
  trackingCount: 0,
  interviewingCount: 0,
  offerCount: 0,
  rejectedCount: 0
}

const filters = reactive<JobTrackingFilters>({
  studentName: '',
  leadMentorName: '',
  trackingStatus: '',
  companyName: '',
  location: ''
})

const interviewStageOptions = [
  { value: 'hirevue', label: 'HireVue / OA' },
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'first_round', label: 'First Round' },
  { value: 'second_round', label: 'Second Round' },
  { value: 'final', label: 'Final Round' }
]

const loading = ref(false)
const submitting = ref(false)
const rows = ref<JobTrackingRow[]>([])
const stats = ref<JobTrackingStats>({ ...defaultStats })
const editingVisible = ref(false)
const editingRow = ref<JobTrackingRow | null>(null)
const form = reactive({
  trackingStatus: 'tracking',
  interviewStage: 'first_round',
  interviewTime: '',
  preferredMentor: '',
  excludedMentor: '',
  note: ''
})

const requestFilters = computed<JobTrackingFilters>(() => ({
  studentName: filters.studentName || undefined,
  leadMentorName: filters.leadMentorName || undefined,
  trackingStatus: filters.trackingStatus || undefined,
  companyName: filters.companyName || undefined,
  location: filters.location || undefined
}))

const statCards = computed(() => [
  { key: 'totalStudentCount', label: '全部学员', value: stats.value.totalStudentCount, meta: '唯一学员数', tone: 'blue' },
  { key: 'trackingCount', label: '追踪中', value: stats.value.trackingCount, meta: '已投递待推进', tone: 'slate' },
  { key: 'interviewingCount', label: '面试中', value: stats.value.interviewingCount, meta: '需跟进排期', tone: 'amber' },
  { key: 'offerCount', label: '已获Offer', value: stats.value.offerCount, meta: '转化完成', tone: 'green' },
  { key: 'rejectedCount', label: '已拒绝', value: stats.value.rejectedCount, meta: '待复盘', tone: 'red' }
])

async function loadTrackingBoard() {
  loading.value = true
  try {
    const response = await getJobTrackingList(requestFilters.value)
    stats.value = response.stats ?? { ...defaultStats }
    rows.value = response.rows ?? []
  } catch (error) {
    console.error(error)
    message.error('岗位追踪加载失败')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.studentName = ''
  filters.leadMentorName = ''
  filters.trackingStatus = ''
  filters.companyName = ''
  filters.location = ''
  void loadTrackingBoard()
}

function openEditor(row: JobTrackingRow) {
  editingRow.value = row
  form.trackingStatus = row.trackingStatus || 'tracking'
  form.interviewStage = row.interviewStage || 'first_round'
  form.interviewTime = toDatetimeLocal(row.interviewTime)
  form.preferredMentor = row.preferredMentor || ''
  form.excludedMentor = row.excludedMentor || ''
  form.note = row.note || ''
  editingVisible.value = true
}

function closeEditor() {
  editingVisible.value = false
  editingRow.value = null
}

async function submitUpdate() {
  if (!editingRow.value) {
    return
  }

  submitting.value = true
  try {
    await updateJobTracking(editingRow.value.applicationId, {
      trackingStatus: form.trackingStatus,
      interviewStage: form.trackingStatus === 'interviewing' ? form.interviewStage : undefined,
      interviewTime: form.trackingStatus === 'interviewing' && form.interviewTime ? fromDatetimeLocal(form.interviewTime) : undefined,
      preferredMentor: form.trackingStatus === 'interviewing' ? form.preferredMentor : undefined,
      excludedMentor: form.trackingStatus === 'interviewing' ? form.excludedMentor : undefined,
      note: form.note || undefined
    })
    message.success('岗位追踪已更新')
    closeEditor()
    await loadTrackingBoard()
  } catch (error) {
    console.error(error)
    message.error('岗位追踪更新失败')
  } finally {
    submitting.value = false
  }
}

function labelOf(status?: string) {
  switch (status) {
    case 'interviewing':
      return '面试中'
    case 'offer':
      return '已获Offer'
    case 'rejected':
      return '已拒绝'
    default:
      return '追踪中'
  }
}

function toneOf(status?: string) {
  switch (status) {
    case 'interviewing':
      return 'warning'
    case 'offer':
      return 'success'
    case 'rejected':
      return 'danger'
    default:
      return 'info'
  }
}

function stageLabelOf(stage?: string | null) {
  const hit = interviewStageOptions.find((option) => option.value === stage)
  return hit?.label || stage || '-'
}

function formatDateTime(value?: string) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

function toDatetimeLocal(value?: string) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function fromDatetimeLocal(value: string) {
  return value ? `${value}:00` : undefined
}

onMounted(() => {
  void loadTrackingBoard()
})
</script>

<style scoped>
.job-tracking-page {
  display: grid;
  gap: 24px;
}

.job-tracking-page__traffic {
  color: #52606d;
  font-size: 13px;
}

.job-tracking-hero {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.job-tracking-card {
  border-radius: 18px;
  padding: 20px;
  display: grid;
  gap: 10px;
  color: #102a43;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(241, 245, 249, 0.88));
  box-shadow: 0 18px 32px rgba(15, 23, 42, 0.08);
}

.job-tracking-card--blue {
  border: 1px solid rgba(59, 130, 246, 0.18);
}

.job-tracking-card--slate {
  border: 1px solid rgba(71, 85, 105, 0.16);
}

.job-tracking-card--amber {
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.job-tracking-card--green {
  border: 1px solid rgba(34, 197, 94, 0.18);
}

.job-tracking-card--red {
  border: 1px solid rgba(239, 68, 68, 0.18);
}

.job-tracking-card__label,
.job-tracking-card__meta,
.job-tracking-cell span,
.job-tracking-status__stage {
  color: #52606d;
  font-size: 13px;
}

.job-tracking-card__value {
  font-size: 28px;
  line-height: 1;
}

.job-tracking-panel {
  border-radius: 22px;
  overflow: hidden;
}

.job-tracking-filters {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
  align-items: end;
}

.job-tracking-field {
  display: grid;
  gap: 8px;
}

.job-tracking-field span {
  font-size: 13px;
  color: #52606d;
}

.job-tracking-input,
.job-tracking-select,
.job-tracking-textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.96);
  padding: 12px 14px;
  font-size: 14px;
  color: #102a43;
}

.job-tracking-textarea {
  resize: vertical;
  min-height: 120px;
}

.job-tracking-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.job-tracking-loading,
.job-tracking-empty {
  padding: 36px;
  text-align: center;
  color: #52606d;
}

.job-tracking-cell,
.job-tracking-status {
  display: grid;
  gap: 4px;
}

.job-tracking-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 78px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.job-tracking-tag--info {
  color: #0f4c81;
  background: rgba(191, 219, 254, 0.8);
}

.job-tracking-tag--warning {
  color: #92400e;
  background: rgba(253, 230, 138, 0.85);
}

.job-tracking-tag--success {
  color: #166534;
  background: rgba(187, 247, 208, 0.85);
}

.job-tracking-tag--danger {
  color: #991b1b;
  background: rgba(254, 205, 211, 0.85);
}

.job-tracking-link-button {
  border: none;
  background: none;
  color: #0f4c81;
  font-weight: 600;
  cursor: pointer;
}

.job-tracking-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.46);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 20;
}

.job-tracking-modal {
  width: min(720px, 100%);
  border-radius: 24px;
  background: #f8fafc;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
  overflow: hidden;
}

.job-tracking-modal__header,
.job-tracking-modal__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
}

.job-tracking-modal__header {
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
}

.job-tracking-modal__body {
  padding: 24px;
  display: grid;
  gap: 16px;
}

.job-tracking-modal__eyebrow {
  color: #52606d;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.job-tracking-modal__close {
  border: none;
  background: rgba(226, 232, 240, 0.8);
  width: 40px;
  height: 40px;
  border-radius: 999px;
  cursor: pointer;
}

@media (max-width: 1080px) {
  .job-tracking-hero,
  .job-tracking-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .job-tracking-hero,
  .job-tracking-filters {
    grid-template-columns: 1fr;
  }

  .job-tracking-actions,
  .job-tracking-modal__footer {
    flex-direction: column;
  }
}
</style>
