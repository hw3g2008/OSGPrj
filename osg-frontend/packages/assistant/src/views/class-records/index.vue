<template>
  <div id="page-myclass" class="page-class-records">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          课程记录
          <span class="page-title-en">Class Records</span>
        </h1>
        <p class="page-sub">查看和上报课程记录（包括我的申报和我管理的学员）</p>
      </div>

      <button
        id="assistant-class-records-create"
        type="button"
        class="btn btn-primary"
        @click="toggleReportForm"
      >
        <i class="mdi mdi-plus" aria-hidden="true" />
        上报课程记录
      </button>
    </div>

    <div class="scope-switch">
      <button
        id="assistant-class-tab-mine"
        type="button"
        class="scope-button"
        :class="{ active: activeScope === 'mine' }"
        @click="activeScope = 'mine'"
      >
        <i class="mdi mdi-account" aria-hidden="true" />
        我的申报
        <span class="scope-count">{{ mineRows.length }}</span>
      </button>
      <button
        id="assistant-class-tab-managed"
        type="button"
        class="scope-button"
        :class="{ active: activeScope === 'managed' }"
        @click="activeScope = 'managed'"
      >
        <i class="mdi mdi-account-group" aria-hidden="true" />
        我管理的学员
        <span class="scope-count scope-count--muted">{{ managedRows.length }}</span>
      </button>
    </div>

    <section
      id="assistant-class-content-mine"
      class="scope-panel"
      :style="{ display: activeScope === 'mine' ? 'block' : 'none' }"
    >
      <div class="tabs">
        <button
          v-for="tab in mineTabs"
          :key="tab.value"
          type="button"
          class="tab"
          :class="{ active: activeStatuses.mine === tab.value }"
          @click="activeStatuses.mine = tab.value"
        >
          {{ tab.label }}
          <span class="tab-badge">{{ tab.count }}</span>
        </button>
      </div>

      <section v-if="showReportForm" class="card card--report">
        <div class="card-body card-body--report">
          <div class="report-grid">
            <label class="field">
              <span class="field-label">学员</span>
              <select id="assistant-class-record-student" v-model="reportDraft.studentId" class="form-select">
                <option value="">请选择学员</option>
                <option v-for="student in reportStudentOptions" :key="student.studentId" :value="String(student.studentId)">
                  {{ student.studentName }}
                </option>
              </select>
            </label>
            <label class="field">
              <span class="field-label">辅导类型</span>
              <select id="assistant-class-record-course-type" v-model="reportDraft.courseType" class="form-select">
                <option value="position_coaching">岗位辅导</option>
                <option value="mock_practice">模拟应聘</option>
              </select>
            </label>
            <label class="field">
              <span class="field-label">课程内容</span>
              <select id="assistant-class-record-class-status" v-model="reportDraft.classStatus" class="form-select">
                <option value="case_prep">Case准备</option>
                <option value="resume_revision">新简历</option>
                <option value="mock_interview">模拟面试</option>
                <option value="behavioral">Behavioral</option>
              </select>
            </label>
            <label class="field">
              <span class="field-label">上课时间</span>
              <input id="assistant-class-record-date" v-model="reportDraft.classDate" class="form-input" type="datetime-local" />
            </label>
            <label class="field">
              <span class="field-label">时长（小时）</span>
              <input
                id="assistant-class-record-duration"
                v-model="reportDraft.durationHours"
                class="form-input"
                type="number"
                min="0.5"
                step="0.5"
              />
            </label>
          </div>

          <label class="field">
            <span class="field-label">课程反馈</span>
            <textarea
              id="assistant-class-record-feedback"
              v-model.trim="reportDraft.feedbackContent"
              class="form-textarea"
              rows="4"
              placeholder="请输入本次课程反馈"
            />
          </label>

          <div class="form-footer">
            <button type="button" class="btn btn-outline" @click="toggleReportForm">取消</button>
            <button
              id="assistant-class-record-submit"
              type="button"
              class="btn btn-primary"
              :disabled="submittingReport"
              @click="submitReport"
            >
              {{ submittingReport ? '提交中...' : '提交记录' }}
            </button>
          </div>
        </div>
      </section>

      <section v-if="errorMessage" class="state-card state-card--error">
        <h2>课程记录加载失败</h2>
        <p>{{ errorMessage }}</p>
        <button type="button" class="btn btn-text" @click="loadRecords">重新加载</button>
      </section>

      <section v-else class="card">
        <div class="card-body">
          <div class="filter-row">
            <input
              id="assistant-class-records-keyword"
              v-model.trim="filters.keyword"
              class="form-input form-input--keyword"
              type="text"
              placeholder="搜索学员姓名/ID..."
              @keydown.enter.prevent="handleSearch"
            />
            <button id="assistant-class-records-search" type="button" class="btn btn-outline btn-sm" @click="handleSearch">
              <i class="mdi mdi-magnify" aria-hidden="true" />
              搜索
            </button>
            <button id="assistant-class-records-reset" type="button" class="btn btn-outline btn-sm btn-reset" @click="resetFilters">
              <i class="mdi mdi-filter-variant" aria-hidden="true" />
              重置
            </button>
          </div>
        </div>

        <div class="card-body card-body--table">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>记录ID</th>
                  <th>学员</th>
                  <th>辅导内容</th>
                  <th>课程内容</th>
                  <th>上课日期</th>
                  <th>时长</th>
                  <th>课时费</th>
                  <th>审核状态</th>
                  <th>学员评价</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in visibleMineRows" :key="row.recordId" data-class-record-row>
                  <td>{{ formatRecordId(row.recordId) }}</td>
                  <td>
                    <div class="stack-cell">
                      <strong>{{ row.studentName }}</strong>
                      <span class="meta-text">ID: {{ row.studentId }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="stack-cell">
                      <span class="tag" :class="coachingTone(row.coachingType)">{{ coachingTypeLabel(row.coachingType) }}</span>
                      <span class="detail-text">{{ row.mentorName || '助教提交' }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="tag" :class="contentTone(row.courseType)">{{ row.courseContent || courseTypeLabel(row.courseType) }}</span>
                  </td>
                  <td>{{ formatDateTime(row.classDate || row.submittedAt) }}</td>
                  <td>{{ formatHours(row.durationHours) }}</td>
                  <td>{{ formatFee(row.courseFee) }}</td>
                  <td><span class="tag" :class="statusToneClass(row.status)">{{ statusLabel(row.status) }}</span></td>
                  <td>
                    <span v-if="row.studentRating" class="tag tag--success">{{ row.studentRating }}</span>
                    <span v-else class="meta-text">-</span>
                  </td>
                  <td>
                    <button type="button" class="btn btn-text btn-sm" @click="openDetail(row)">查看详情</button>
                  </td>
                </tr>
                <tr v-if="visibleMineRows.length === 0">
                  <td colspan="10" class="empty-state">暂无可查看课程记录</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>

    <section
      id="assistant-class-content-managed"
      class="scope-panel"
      :style="{ display: activeScope === 'managed' ? 'block' : 'none' }"
    >
      <div class="tabs">
        <button
          v-for="tab in managedTabs"
          :key="tab.value"
          type="button"
          class="tab"
          :class="{ active: activeStatuses.managed === tab.value }"
          @click="activeStatuses.managed = tab.value"
        >
          {{ tab.label }}
          <span class="tab-badge">{{ tab.count }}</span>
        </button>
      </div>

      <section v-if="errorMessage" class="state-card state-card--error">
        <h2>课程记录加载失败</h2>
        <p>{{ errorMessage }}</p>
        <button type="button" class="btn btn-text" @click="loadRecords">重新加载</button>
      </section>

      <section v-else class="card">
        <div class="card-body">
          <div class="filter-row">
            <input
              v-model.trim="filters.keyword"
              class="form-input form-input--keyword"
              type="text"
              placeholder="搜索学员姓名/ID..."
              @keydown.enter.prevent="handleSearch"
            />
            <button type="button" class="btn btn-outline btn-sm" @click="handleSearch">
              <i class="mdi mdi-magnify" aria-hidden="true" />
              搜索
            </button>
            <button type="button" class="btn btn-outline btn-sm btn-reset" @click="resetFilters">
              <i class="mdi mdi-filter-variant" aria-hidden="true" />
              重置
            </button>
          </div>
        </div>

        <div class="card-body card-body--table">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>记录ID</th>
                  <th>学员</th>
                  <th>申报人</th>
                  <th>辅导内容</th>
                  <th>课程内容</th>
                  <th>上课日期</th>
                  <th>时长</th>
                  <th>审核状态</th>
                  <th>学员评价</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in visibleManagedRows" :key="row.recordId" data-class-record-row>
                  <td>{{ formatRecordId(row.recordId) }}</td>
                  <td>
                    <div class="stack-cell">
                      <strong>{{ row.studentName }}</strong>
                      <span class="meta-text">ID: {{ row.studentId }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="stack-cell">
                      <strong>{{ reporterRoleLabel(row.reporterRole) }}</strong>
                      <span class="meta-text">{{ row.mentorName || '-' }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="stack-cell">
                      <span class="tag" :class="coachingTone(row.coachingType)">{{ coachingTypeLabel(row.coachingType) }}</span>
                      <span class="detail-text">{{ row.mentorName || '助教提交' }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="tag" :class="contentTone(row.courseType)">{{ row.courseContent || courseTypeLabel(row.courseType) }}</span>
                  </td>
                  <td>{{ formatDateTime(row.classDate || row.submittedAt) }}</td>
                  <td>{{ formatHours(row.durationHours) }}</td>
                  <td><span class="tag" :class="statusToneClass(row.status)">{{ statusLabel(row.status) }}</span></td>
                  <td>
                    <span v-if="row.studentRating" class="tag tag--success">{{ row.studentRating }}</span>
                    <span v-else class="meta-text">-</span>
                  </td>
                  <td>
                    <button type="button" class="btn btn-text btn-sm" @click="openDetail(row)">查看详情</button>
                  </td>
                </tr>
                <tr v-if="visibleManagedRows.length === 0">
                  <td colspan="10" class="empty-state">暂无可查看课程记录</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>

    <div v-if="detailRecord" class="detail-panel">
      <div class="detail-panel__title">课程详情</div>
      <div class="detail-panel__body">
        <div>{{ detailRecord.courseContent || '未填写课程内容' }}</div>
        <div>{{ feedbackSummary(detailRecord.reviewRemark) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  createAssistantClassRecord,
  getAssistantClassRecordList,
  getAssistantClassRecordStats,
  getAssistantStudentList,
  type AssistantClassRecordCreatePayload,
  type AssistantClassRecordRow,
  type AssistantStudentListItem,
} from '@osg/shared/api'

type ScopeKey = 'mine' | 'managed'
type StatusKey = 'all' | 'pending' | 'approved' | 'rejected'

const loading = ref(true)
const errorMessage = ref('')
const records = ref<AssistantClassRecordRow[]>([])
const activeScope = ref<ScopeKey>('mine')
const activeStatuses = reactive<Record<ScopeKey, StatusKey>>({ mine: 'all', managed: 'all' })
const showReportForm = ref(false)
const submittingReport = ref(false)
const reportStudentOptions = ref<AssistantStudentListItem[]>([])
const detailRecord = ref<AssistantClassRecordRow | null>(null)

const filters = reactive({ keyword: '' })
const reportDraft = reactive({
  studentId: '',
  courseType: 'position_coaching',
  classStatus: 'case_prep',
  classDate: '',
  durationHours: '1.5',
  feedbackContent: '',
  topics: '',
  comments: '',
})

const mineRows = computed(() => records.value.filter((row) => normalizeReporterRole(row.reporterRole) === 'assistant'))
const managedRows = computed(() => records.value.filter((row) => normalizeReporterRole(row.reporterRole) !== 'assistant'))
const mineTabs = computed(() => buildTabs(mineRows.value))
const managedTabs = computed(() => buildTabs(managedRows.value))
const visibleMineRows = computed(() => filterRows(mineRows.value, activeStatuses.mine))
const visibleManagedRows = computed(() => filterRows(managedRows.value, activeStatuses.managed))

function buildTabs(rows: AssistantClassRecordRow[]) {
  return [
    { value: 'all' as const, label: '全部', count: rows.length },
    { value: 'pending' as const, label: '待审核', count: rows.filter((row) => normalizeStatus(row.status) === 'pending').length },
    { value: 'approved' as const, label: '已通过', count: rows.filter((row) => normalizeStatus(row.status) === 'approved').length },
    { value: 'rejected' as const, label: '已驳回', count: rows.filter((row) => normalizeStatus(row.status) === 'rejected').length },
  ]
}

function filterRows(rows: AssistantClassRecordRow[], status: StatusKey) {
  if (status === 'all') {
    return rows
  }
  return rows.filter((row) => normalizeStatus(row.status) === status)
}

function normalizeStatus(status?: string | null): Exclude<StatusKey, 'all'> {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('approved') || normalized.includes('completed') || normalized.includes('done') || normalized.includes('通过')) {
    return 'approved'
  }
  if (normalized.includes('rejected') || normalized.includes('驳回')) {
    return 'rejected'
  }
  return 'pending'
}

function normalizeReporterRole(role?: string | null) {
  const normalized = String(role || '').toLowerCase()
  if (normalized.includes('assistant') || normalized.includes('助教')) {
    return 'assistant'
  }
  if (normalized.includes('mentor') || normalized.includes('导师')) {
    return 'mentor'
  }
  return 'other'
}

function reporterRoleLabel(role?: string | null) {
  const normalized = normalizeReporterRole(role)
  if (normalized === 'assistant') return '助教'
  if (normalized === 'mentor') return '导师'
  return '班主任'
}

function coachingTypeLabel(type?: string | null) {
  const normalized = String(type || '').toLowerCase()
  if (normalized.includes('mock')) return '模拟应聘'
  if (normalized.includes('position')) return '岗位辅导'
  return '课程辅导'
}

function coachingTone(type?: string | null) {
  return String(type || '').toLowerCase().includes('mock') ? 'tag--success' : 'tag--info'
}

function courseTypeLabel(type?: string | null) {
  const normalized = String(type || '').toLowerCase()
  if (normalized.includes('case')) return 'Case准备'
  if (normalized.includes('resume')) return '简历修改'
  if (normalized.includes('mock')) return '模拟面试'
  if (normalized.includes('behavior')) return 'Behavioral'
  return '其他'
}

function contentTone(type?: string | null) {
  const normalized = String(type || '').toLowerCase()
  if (normalized.includes('resume')) return 'tag--resume'
  if (normalized.includes('case')) return 'tag--case'
  if (normalized.includes('mock')) return 'tag--success'
  return 'tag--info'
}

function statusLabel(status?: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === 'approved') return '已通过'
  if (normalized === 'rejected') return '已驳回'
  return '待审核'
}

function statusToneClass(status?: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === 'approved') return 'tag--success'
  if (normalized === 'rejected') return 'tag--danger'
  return 'tag--warning'
}

function formatDateTime(value?: string | null) {
  if (!value) return '未安排'
  return String(value).replace('T', ' ').slice(0, 16)
}

function formatHours(value?: number | null) {
  if (value == null) return '--'
  return `${value}h`
}

function formatFee(value?: string | number | null) {
  if (value == null || value === '') return '¥0'
  return `¥${value}`
}

function formatRecordId(value: number) {
  return `#R${value}`
}

function feedbackSummary(value?: string | null) {
  return value || '暂无学员评价'
}

function openDetail(row: AssistantClassRecordRow) {
  detailRecord.value = row
}

function toggleReportForm() {
  showReportForm.value = !showReportForm.value
}

async function loadRecords() {
  loading.value = true
  errorMessage.value = ''

  try {
    const keyword = filters.keyword || undefined
    await getAssistantClassRecordStats({ keyword }).catch(() => null)
    const listResponse = await getAssistantClassRecordList({ keyword })
    records.value = listResponse.rows || []
    detailRecord.value = records.value[0] || null
  } catch (error: any) {
    errorMessage.value = error?.message || '课程记录暂时无法加载，请稍后重试。'
  } finally {
    loading.value = false
  }
}

async function loadReportStudents() {
  const response = await getAssistantStudentList({ pageNum: 1, pageSize: 100 })
  reportStudentOptions.value = response.rows || []
}

async function handleSearch() {
  await loadRecords()
}

async function resetFilters() {
  filters.keyword = ''
  activeStatuses.mine = 'all'
  activeStatuses.managed = 'all'
  await loadRecords()
}

async function submitReport() {
  if (!reportDraft.studentId || !reportDraft.classDate || !reportDraft.feedbackContent.trim()) {
    errorMessage.value = '请先完整填写学员、上课时间和课程反馈。'
    return
  }

  const payload: AssistantClassRecordCreatePayload = {
    studentId: Number(reportDraft.studentId),
    courseType: reportDraft.courseType,
    classStatus: reportDraft.classStatus,
    classDate: reportDraft.classDate,
    durationHours: Number(reportDraft.durationHours),
    feedbackContent: reportDraft.feedbackContent.trim(),
    topics: reportDraft.topics.trim(),
    comments: reportDraft.comments.trim(),
  }

  submittingReport.value = true
  errorMessage.value = ''
  try {
    await createAssistantClassRecord(payload)
    showReportForm.value = false
    reportDraft.studentId = ''
    reportDraft.courseType = 'position_coaching'
    reportDraft.classStatus = 'case_prep'
    reportDraft.classDate = ''
    reportDraft.durationHours = '1.5'
    reportDraft.feedbackContent = ''
    reportDraft.topics = ''
    reportDraft.comments = ''
    await loadRecords()
  } catch (error: any) {
    errorMessage.value = error?.message || '课程记录提交失败，请稍后重试。'
  } finally {
    submittingReport.value = false
  }
}

onMounted(() => {
  void Promise.all([loadRecords(), loadReportStudents()])
})
</script>

<style scoped lang="scss">
.page-class-records {
  display: block;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
}

.page-title-en {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}

.page-sub {
  margin: 8px 0 0;
  color: var(--text2);
  font-size: 14px;
}

.scope-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.scope-button {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.scope-button.active {
  background: var(--primary);
  color: #fff;
  border-color: transparent;
}

.scope-count {
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.3);
  font-size: 12px;
}

.scope-button:not(.active) .scope-count {
  background: var(--bg);
}

.scope-count--muted {
  color: inherit;
}

.tabs {
  display: inline-flex;
  background: var(--bg);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
  gap: 4px;
}

.tab {
  border: none;
  background: transparent;
  color: var(--text2);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tab.active {
  background: var(--primary);
  color: #fff;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f59e0b;
  color: #fff;
  font-size: 12px;
  line-height: 1.2;
}

.card,
.state-card,
.detail-panel {
  background: #fff;
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  margin-bottom: 20px;
  overflow: hidden;
}

.card-body {
  padding: 22px;
}

.card-body--table {
  padding: 0;
}

.card-body--report {
  display: grid;
  gap: 16px;
}

.filter-row,
.form-footer {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: grid;
  gap: 8px;
}

.field-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text2);
}

.form-input,
.form-select,
.form-textarea {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  font-size: 14px;
  border-radius: 10px;
  width: 100%;
}

.form-input,
.form-select {
  min-height: 44px;
  padding: 10px 14px;
}

.form-input--keyword {
  width: 220px;
}

.form-textarea {
  padding: 12px 14px;
  resize: vertical;
}

.btn {
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}

.btn-primary {
  background: var(--primary-gradient);
  color: #fff;
  box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
}

.btn-outline {
  background: #fff;
  color: var(--text2);
  border: 1px solid var(--border);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
  min-height: 44px;
}

.btn-text {
  background: transparent;
  color: var(--primary);
  padding: 6px 12px;
}

.btn-reset {
  min-height: 44px;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table thead th {
  padding: 14px 16px;
  text-align: left;
  color: var(--text2);
  background: #f8fafc;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.table tbody td {
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f7;
  vertical-align: top;
  color: var(--text);
  white-space: nowrap;
}

.stack-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-text,
.empty-state {
  color: var(--muted);
  font-size: 12px;
}

.detail-text {
  color: var(--text);
  font-size: 12px;
}

.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
}

.tag--info {
  background: #e0f2fe;
  color: #0369a1;
}

.tag--success {
  background: #dcfce7;
  color: #15803d;
}

.tag--warning {
  background: #fef3c7;
  color: #92400e;
}

.tag--danger {
  background: #fee2e2;
  color: #dc2626;
}

.tag--case {
  background: #dbeafe;
  color: #1d4ed8;
}

.tag--resume {
  background: #fef3c7;
  color: #92400e;
}

.detail-panel {
  padding: 18px 20px;
}

.detail-panel__title {
  font-weight: 700;
  margin-bottom: 10px;
}

.detail-panel__body {
  display: grid;
  gap: 8px;
  color: var(--text2);
}

.state-card {
  padding: 24px;
}

.state-card--error {
  background: #fff7f7;
}

.state-card h2 {
  margin: 0 0 8px;
}

.state-card p {
  margin: 0 0 12px;
  color: var(--text2);
}

@media (max-width: 1100px) {
  .page-header {
    flex-direction: column;
  }

  .scope-switch,
  .filter-row,
  .form-footer {
    flex-wrap: wrap;
  }

  .form-input--keyword,
  .form-select {
    width: 100%;
    min-width: 0;
  }

  .report-grid {
    grid-template-columns: 1fr;
  }
}
</style>
