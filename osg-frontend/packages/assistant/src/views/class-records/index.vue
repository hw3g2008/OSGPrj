<template>
  <section id="page-myclass" class="class-records-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          课程记录
          <span class="page-title-en">Class Records</span>
        </h1>
        <p class="page-sub">
          查看已分配课程记录、审核状态和反馈摘要，快速完成教学跟进与课程回顾。
        </p>
      </div>

      <div class="page-header__actions">
        <span class="status-pill">课程总览</span>
        <span class="readonly-pill">已分配课程 / 反馈摘要</span>
      </div>
    </div>

    <section class="flow-banner">
      <div class="flow-banner__header">
        <h2>课程记录流程</h2>
        <p>围绕课程执行、记录审核和反馈回看，帮助助教快速识别待处理课程。</p>
      </div>
      <div class="flow-banner__steps">
        <span v-for="step in flowSteps" :key="step" class="flow-step">{{ step }}</span>
      </div>
    </section>

    <section class="summary-grid">
      <article v-for="card in summaryCards" :key="card.label" class="summary-card">
        <span class="summary-card__label">{{ card.label }}</span>
        <strong class="summary-card__value" :class="card.valueClass">{{ card.value }}</strong>
        <span class="summary-card__hint">{{ card.hint }}</span>
      </article>
    </section>

    <section class="toolbar-card">
      <div class="toolbar-card__row">
        <label class="toolbar-field toolbar-field--wide">
          <span class="toolbar-field__label">搜索课程 / 学员</span>
          <input
            id="assistant-class-records-keyword"
            v-model.trim="filters.keyword"
            class="form-input"
            type="text"
            placeholder="搜索学员、导师或课程内容"
            @keydown.enter.prevent="handleSearch"
          />
        </label>

        <label class="toolbar-field">
          <span class="toolbar-field__label">审核状态</span>
          <select v-model="filters.status" class="form-select">
            <option value="">全部状态</option>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已驳回</option>
          </select>
        </label>

        <label class="toolbar-field">
          <span class="toolbar-field__label">申报角色</span>
          <select v-model="filters.reporterRole" class="form-select">
            <option value="">全部角色</option>
            <option v-for="option in reporterRoleOptions" :key="option" :value="option">
              {{ reporterRoleLabel(option) }}
            </option>
          </select>
        </label>

        <label class="toolbar-field">
          <span class="toolbar-field__label">辅导类型</span>
          <select v-model="filters.coachingType" class="form-select">
            <option value="">全部类型</option>
            <option v-for="option in coachingTypeOptions" :key="option" :value="option">
              {{ coachingTypeLabel(option) }}
            </option>
          </select>
        </label>
      </div>

      <div class="toolbar-card__meta">
        <span class="toolbar-chip">课程审核</span>
        <span class="toolbar-chip">反馈摘要</span>
        <span class="toolbar-chip">时长与费用</span>
        <button
          id="assistant-class-records-search"
          type="button"
          class="primary-button"
          @click="handleSearch"
        >
          应用筛选
        </button>
        <button
          id="assistant-class-records-reset"
          type="button"
          class="ghost-button"
          @click="resetFilters"
        >
          重置
        </button>
      </div>
    </section>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>课程记录加载失败</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="ghost-button" @click="loadRecords">重新加载</button>
    </section>

    <section v-else-if="loading" class="state-card">
      <h2>课程记录加载中</h2>
      <p>正在读取课程记录、审核状态和反馈摘要，请稍候。</p>
    </section>

    <section v-else-if="filteredRecords.length === 0" class="state-card">
      <h2>当前筛选下暂无课程记录</h2>
      <p>可以清空关键词或筛选条件，再次查看全部课程记录。</p>
    </section>

    <div v-else class="content-grid">
      <section class="panel-card panel-card--table">
        <header class="panel-card__header">
          <div>
            <h2>课程记录列表</h2>
            <p>默认按上课时间倒序显示，便于优先查看最近课程和待审核记录。</p>
          </div>
        </header>

        <div class="panel-card__body">
          <table class="data-table class-records-table">
            <thead>
              <tr>
                <th>课程信息</th>
                <th>学员 / 导师</th>
                <th>辅导内容</th>
                <th>上课时间</th>
                <th>时长 / 费用</th>
                <th>状态</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in filteredRecords"
                :key="record.recordId"
                data-class-record-row
                :class="{ 'is-active': selectedRecord?.recordId === record.recordId }"
              >
                <td>
                  <div class="table-primary">{{ record.courseContent || '未填写课程内容' }}</div>
                  <div class="table-muted">{{ record.recordCode || `#R${record.recordId}` }}</div>
                </td>
                <td>
                  <div class="table-primary">{{ record.studentName || '未命名学员' }}</div>
                  <div class="table-muted">{{ mentorDisplay(record) }}</div>
                </td>
                <td>
                  <span class="table-tag table-tag--info">{{ coachingTypeLabel(record.coachingType) }}</span>
                  <div class="table-muted">{{ reporterRoleLabel(record.reporterRole) }}</div>
                </td>
                <td>
                  <div class="table-primary">{{ formatDateTime(record.classDate || record.submittedAt) }}</div>
                  <div class="table-muted">提交于 {{ formatDateTime(record.submittedAt) }}</div>
                </td>
                <td>
                  <div class="table-primary">{{ formatHours(record.durationHours) }}</div>
                  <div class="table-muted">{{ formatFee(record.courseFee) }}</div>
                </td>
                <td>
                  <span class="table-tag" :class="statusToneClass(record.status)">
                    {{ statusLabel(record.status) }}
                  </span>
                  <div class="table-muted">{{ ratingSummary(record.studentRating) }}</div>
                </td>
                <td>
                  <button
                    type="button"
                    class="link-button"
                    @click="selectRecord(record.recordId)"
                  >
                    查看详情
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="panel-card panel-card--detail">
        <header class="panel-card__header">
          <div>
            <h2>课程详情</h2>
            <p>查看当前课程的审核状态、反馈摘要和课程信息。</p>
          </div>
        </header>

        <div v-if="selectedRecord" class="panel-card__body detail-card">
          <div class="detail-grid">
            <div>
              <span class="detail-label">课程内容</span>
              <div class="detail-value">{{ selectedRecord.courseContent || '未填写课程内容' }}</div>
            </div>
            <div>
              <span class="detail-label">辅导类型</span>
              <div class="detail-value">{{ coachingTypeLabel(selectedRecord.coachingType) }}</div>
            </div>
            <div>
              <span class="detail-label">学员</span>
              <div class="detail-value">{{ selectedRecord.studentName || '未命名学员' }}</div>
            </div>
            <div>
              <span class="detail-label">导师</span>
              <div class="detail-value">{{ selectedRecord.mentorName || '未分配导师' }}</div>
            </div>
            <div>
              <span class="detail-label">申报角色</span>
              <div class="detail-value">{{ reporterRoleLabel(selectedRecord.reporterRole) }}</div>
            </div>
            <div>
              <span class="detail-label">审核状态</span>
              <div class="detail-value">{{ statusLabel(selectedRecord.status) }}</div>
            </div>
            <div>
              <span class="detail-label">上课时间</span>
              <div class="detail-value">{{ formatDateTime(selectedRecord.classDate || selectedRecord.submittedAt) }}</div>
            </div>
            <div>
              <span class="detail-label">课时 / 费用</span>
              <div class="detail-value">{{ formatHours(selectedRecord.durationHours) }} · {{ formatFee(selectedRecord.courseFee) }}</div>
            </div>
          </div>

          <div class="detail-section">
            <span class="detail-label">学员评价</span>
            <div class="detail-panel">{{ ratingSummary(selectedRecord.studentRating) }}</div>
          </div>

          <div class="detail-section">
            <span class="detail-label">反馈摘要</span>
            <div class="detail-panel">{{ feedbackSummary(selectedRecord.reviewRemark) }}</div>
          </div>
        </div>

        <div v-else class="panel-card__body panel-card__body--state">
          选择一条课程记录后，可在这里查看课程详情与反馈摘要。
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getAssistantClassRecordList,
  getAssistantClassRecordStats,
  type AssistantClassRecordRow,
  type AssistantClassRecordStats,
} from '@osg/shared/api'

interface FilterState {
  keyword: string
  status: string
  reporterRole: string
  coachingType: string
}

const loading = ref(true)
const errorMessage = ref('')
const records = ref<AssistantClassRecordRow[]>([])
const stats = ref<AssistantClassRecordStats | null>(null)
const selectedRecordId = ref<number | null>(null)
let latestLoadRequestId = 0

const filters = reactive<FilterState>({
  keyword: '',
  status: '',
  reporterRole: '',
  coachingType: '',
})

const defaultFlowSteps = [
  '课程执行',
  '记录提交',
  '审核处理',
  '反馈回看',
]

const flowSteps = computed(() => {
  const steps = stats.value?.flowSteps?.filter(Boolean) || []
  return steps.length ? steps : defaultFlowSteps
})

const reporterRoleOptions = computed(() =>
  Array.from(new Set(records.value.map((record) => record.reporterRole).filter(Boolean))) as string[],
)

const coachingTypeOptions = computed(() =>
  Array.from(new Set(records.value.map((record) => record.coachingType).filter(Boolean))) as string[],
)

const filteredRecords = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()

  return [...records.value]
    .filter((record) => {
      const matchesKeyword =
        !keyword ||
        [
          record.studentName,
          record.mentorName,
          record.courseContent,
          record.recordCode,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))

      return (
        matchesKeyword &&
        (!filters.status || normalizeStatus(record.status) === filters.status) &&
        (!filters.reporterRole || record.reporterRole === filters.reporterRole) &&
        (!filters.coachingType || record.coachingType === filters.coachingType)
      )
    })
    .sort((left, right) =>
      String(right.classDate || right.submittedAt || '').localeCompare(
        String(left.classDate || left.submittedAt || ''),
      ),
    )
})

const selectedRecord = computed(
  () => filteredRecords.value.find((record) => record.recordId === selectedRecordId.value) || null,
)

const summaryCards = computed(() => {
  const current = stats.value
  const fallbackRecords = filteredRecords.value

  const totalCount = current?.totalCount ?? fallbackRecords.length
  const pendingCount =
    current?.pendingCount ??
    fallbackRecords.filter((record) => normalizeStatus(record.status) === 'pending').length
  const approvedCount =
    current?.approvedCount ??
    fallbackRecords.filter((record) => normalizeStatus(record.status) === 'approved').length
  const rejectedCount =
    current?.rejectedCount ??
    fallbackRecords.filter((record) => normalizeStatus(record.status) === 'rejected').length

  return [
    {
      label: '全部课程',
      value: String(totalCount),
      hint: '当前账号下可查看的课程记录总数',
      valueClass: '',
    },
    {
      label: '待审核',
      value: String(pendingCount),
      hint: '仍需重点关注的课程记录',
      valueClass: 'summary-card__value--warning',
    },
    {
      label: '已通过',
      value: String(approvedCount),
      hint: '已完成审核的课程记录',
      valueClass: 'summary-card__value--success',
    },
    {
      label: '待结算金额',
      value: formatFee(current?.pendingSettlementAmount || 0),
      hint: rejectedCount > 0 ? `另有 ${rejectedCount} 条记录待补充后再处理` : '当前记录可继续跟进后续处理',
      valueClass: 'summary-card__value--accent',
    },
  ]
})

function normalizeStatus(status?: string | null) {
  const normalized = String(status || '').trim().toLowerCase()
  if (
    normalized.includes('completed') ||
    normalized.includes('done') ||
    normalized.includes('finish')
  ) {
    return 'approved'
  }
  if (normalized.includes('approved') || normalized.includes('通过')) {
    return 'approved'
  }
  if (normalized.includes('rejected') || normalized.includes('驳回')) {
    return 'rejected'
  }
  return 'pending'
}

function statusLabel(status?: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === 'approved') {
    return '已通过'
  }
  if (normalized === 'rejected') {
    return '已驳回'
  }
  return '待审核'
}

function statusToneClass(status?: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === 'approved') {
    return 'table-tag--success'
  }
  if (normalized === 'rejected') {
    return 'table-tag--danger'
  }
  return 'table-tag--warning'
}

function reporterRoleLabel(role?: string | null) {
  const normalized = String(role || '').trim().toLowerCase()
  if (!normalized) {
    return '未标注角色'
  }
  if (normalized.includes('assistant') || normalized.includes('助教')) {
    return '助教'
  }
  if (normalized.includes('headteacher') || normalized.includes('班主任')) {
    return '班主任'
  }
  if (normalized.includes('mentor') || normalized.includes('导师')) {
    return '导师'
  }
  return String(role)
}

function coachingTypeLabel(type?: string | null) {
  const normalized = String(type || '').trim().toLowerCase()
  if (!normalized) {
    return '未标注类型'
  }
  if (normalized.includes('mock') || normalized.includes('模拟')) {
    return '模拟应聘'
  }
  if (normalized.includes('position') || normalized.includes('岗位')) {
    return '岗位辅导'
  }
  if (normalized.includes('course') || normalized.includes('课程')) {
    return '课程辅导'
  }
  return String(type)
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '未安排'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value).replace('T', ' ').slice(0, 16)
  }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const date = String(parsed.getDate()).padStart(2, '0')
  const hours = String(parsed.getHours()).padStart(2, '0')
  const minutes = String(parsed.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${date} ${hours}:${minutes}`
}

function formatHours(value?: number | null) {
  if (value == null) {
    return '--'
  }
  return `${value}h`
}

function formatFee(value?: string | number | null) {
  if (value == null || value === '') {
    return '¥0'
  }
  const amount = Number(value)
  if (Number.isNaN(amount)) {
    return `¥${value}`
  }
  return `¥${amount.toLocaleString('zh-CN')}`
}

function ratingSummary(value?: string | null) {
  if (!value) {
    return '暂无学员评价'
  }
  return `学员评价：${value}`
}

function feedbackSummary(value?: string | null) {
  if (!value) {
    return '当前记录暂无反馈备注，可继续关注后续审核结果。'
  }
  return value
}

function mentorDisplay(record: AssistantClassRecordRow) {
  const mentorName = record.mentorName || '未分配导师'
  return `${mentorName} · ${reporterRoleLabel(record.reporterRole)}`
}

function selectRecord(recordId: number) {
  selectedRecordId.value = recordId
}

async function loadRecords() {
  const requestId = ++latestLoadRequestId
  loading.value = true
  errorMessage.value = ''
  stats.value = null

  try {
    const keyword = filters.keyword || undefined
    void loadStats(keyword, requestId)
    const listResponse = await getAssistantClassRecordList({ keyword })

    if (requestId !== latestLoadRequestId) {
      return
    }

    records.value = listResponse.rows || []

    const availableIds = new Set(records.value.map((record) => record.recordId))
    if (!selectedRecordId.value || !availableIds.has(selectedRecordId.value)) {
      selectedRecordId.value = records.value[0]?.recordId ?? null
    }
  } catch (error: any) {
    if (requestId !== latestLoadRequestId) {
      return
    }
    errorMessage.value = error?.message || '课程记录暂时无法加载，请稍后重试。'
  } finally {
    if (requestId === latestLoadRequestId) {
      loading.value = false
    }
  }
}

async function loadStats(keyword: string | undefined, requestId: number) {
  try {
    const statsResponse = await getAssistantClassRecordStats({ keyword })
    if (requestId !== latestLoadRequestId) {
      return
    }
    stats.value = statsResponse
  } catch {
    if (requestId === latestLoadRequestId) {
      stats.value = null
    }
  }
}

async function handleSearch() {
  await loadRecords()
}

async function resetFilters() {
  filters.keyword = ''
  filters.status = ''
  filters.reporterRole = ''
  filters.coachingType = ''
  await loadRecords()
}

onMounted(() => {
  void loadRecords()
})
</script>

<style scoped lang="scss">
.class-records-page {
  display: grid;
  gap: 24px;
  color: #1f2937;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 30px;
  border-radius: 24px;
  background: linear-gradient(135deg, #f7fafc 0%, #eef4ff 100%);
  border: 1px solid #d8e4f5;
}

.page-title {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  color: #111827;
}

.page-title-en {
  margin-left: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #6b7280;
}

.page-sub {
  margin: 12px 0 0;
  max-width: 680px;
  line-height: 1.7;
  color: #475569;
}

.page-header__actions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}

.status-pill,
.readonly-pill,
.toolbar-chip,
.table-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.status-pill {
  padding: 10px 14px;
  background: #dbeafe;
  color: #1d4ed8;
}

.readonly-pill {
  padding: 10px 14px;
  background: #ecfdf5;
  color: #047857;
}

.flow-banner,
.toolbar-card,
.panel-card,
.state-card {
  border-radius: 24px;
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
}

.flow-banner {
  display: grid;
  gap: 18px;
  padding: 24px 28px;
}

.flow-banner__header h2,
.panel-card__header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.flow-banner__header p,
.panel-card__header p,
.state-card p {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.flow-banner__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.flow-step {
  padding: 10px 14px;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #dbe4f0;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  display: grid;
  gap: 10px;
  padding: 22px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.05);
}

.summary-card__label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.summary-card__value {
  font-size: 30px;
  font-weight: 700;
  color: #111827;
}

.summary-card__value--warning {
  color: #d97706;
}

.summary-card__value--success {
  color: #059669;
}

.summary-card__value--accent {
  color: #1d4ed8;
}

.summary-card__hint {
  font-size: 13px;
  line-height: 1.6;
  color: #94a3b8;
}

.toolbar-card {
  display: grid;
  gap: 18px;
  padding: 24px 28px;
}

.toolbar-card__row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.toolbar-field {
  display: grid;
  gap: 8px;
}

.toolbar-field__label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.form-input,
.form-select {
  width: 100%;
  min-height: 44px;
  border-radius: 14px;
  border: 1px solid #d7dee9;
  background: #fff;
  padding: 0 14px;
  color: #111827;
  font-size: 14px;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #7c9cc9;
  box-shadow: 0 0 0 3px rgba(124, 156, 201, 0.16);
}

.toolbar-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.toolbar-chip {
  padding: 8px 12px;
  background: #eff6ff;
  color: #315b96;
}

.primary-button,
.ghost-button,
.link-button {
  border: 0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.primary-button,
.ghost-button {
  min-height: 42px;
  padding: 0 16px;
}

.primary-button {
  background: #2f5e9d;
  color: #fff;
}

.ghost-button {
  background: #eef2f7;
  color: #334155;
}

.state-card {
  padding: 28px 30px;
}

.state-card h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.state-card--error {
  border-color: #fecaca;
  background: #fff7f7;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.9fr);
  gap: 20px;
  align-items: start;
}

.panel-card--table,
.panel-card--detail {
  min-width: 0;
}

.panel-card__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 0;
}

.panel-card__body {
  padding: 20px 24px 24px;
}

.panel-card--table .panel-card__body {
  overflow-x: auto;
}

.panel-card__body--state {
  color: #64748b;
  line-height: 1.7;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.class-records-table {
  min-width: 860px;
}

.data-table th,
.data-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #edf2f7;
  text-align: left;
  vertical-align: top;
}

.data-table th {
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
}

.data-table tbody tr {
  transition: background 0.2s ease;
}

.data-table tbody tr:hover,
.data-table tbody tr.is-active {
  background: #f8fbff;
}

.table-primary {
  font-weight: 600;
  color: #111827;
}

.table-muted {
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.table-tag {
  padding: 7px 10px;
}

.table-tag--info {
  background: #e0f2fe;
  color: #0f766e;
}

.table-tag--success {
  background: #dcfce7;
  color: #15803d;
}

.table-tag--warning {
  background: #fef3c7;
  color: #b45309;
}

.table-tag--danger {
  background: #fee2e2;
  color: #b91c1c;
}

.link-button {
  background: transparent;
  color: #2f5e9d;
  padding: 0;
}

.detail-card {
  display: grid;
  gap: 18px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
}

.detail-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #64748b;
  text-transform: uppercase;
}

.detail-value {
  color: #111827;
  line-height: 1.6;
}

.detail-section {
  display: grid;
  gap: 8px;
}

.detail-panel {
  padding: 16px;
  border-radius: 16px;
  background: #f8fafc;
  color: #334155;
  line-height: 1.7;
}

@media (max-width: 1200px) {
  .summary-grid,
  .toolbar-card__row,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-header,
  .toolbar-card,
  .panel-card__header,
  .panel-card__body,
  .state-card {
    padding-left: 18px;
    padding-right: 18px;
  }

  .page-header {
    flex-direction: column;
  }

  .data-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
