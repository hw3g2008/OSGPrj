<template>
  <section class="class-records-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">Teaching Center</p>
        <h1>课程记录</h1>
        <p class="page-subtitle">查看所有学员的课程记录，审核导师/班主任/助教提交的上课记录。</p>
      </div>
      <button type="button" class="ghost-button">导出</button>
    </header>

    <section class="process-banner">
      <div class="banner-copy">
        <span class="banner-label">流程说明</span>
        <h2>5 步流程覆盖课程申报到结算</h2>
      </div>
      <div class="banner-steps">
        <div
          v-for="(step, index) in flowSteps"
          :key="step"
          class="banner-step"
        >
          <span class="banner-step-index">{{ index + 1 }}</span>
          <span>{{ step }}</span>
        </div>
      </div>
    </section>

    <section class="stats-grid">
      <article
        v-for="card in statCards"
        :key="card.label"
        class="stat-card"
      >
        <p class="stat-card__label">{{ card.label }}</p>
        <p class="stat-card__value">{{ card.value }}</p>
      </article>
    </section>

    <section class="records-shell">
      <div class="records-toolbar">
        <input
          v-model.trim="keyword"
          class="records-search"
          type="search"
          placeholder="搜索学员 / 申报人"
          @keyup.enter="loadData"
        >
        <button type="button" class="primary-button" @click="loadData">查询</button>
      </div>

      <div class="records-table-wrap">
        <table class="records-table">
          <thead>
            <tr>
              <th v-for="column in columns" :key="column.key">{{ column.title }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.recordId">
              <td>{{ row.recordCode || `#R${row.recordId}` }}</td>
              <td>{{ row.studentName }} / {{ row.studentId }}</td>
              <td>{{ row.mentorName }} · {{ row.reporterRole }}</td>
              <td>
                <span class="pill" :class="row.coachingType === '模拟应聘' ? 'pill--green' : 'pill--blue'">
                  {{ row.coachingType }}
                </span>
              </td>
              <td>{{ row.courseContent }}</td>
              <td>{{ formatDate(row.classDate) }}</td>
              <td>{{ formatHours(row.durationHours) }}</td>
              <td>{{ formatFee(row.courseFee) }}</td>
              <td class="rating-cell">
                <span v-if="row.studentRating">⭐ {{ row.studentRating }}</span>
                <span v-else>—</span>
              </td>
              <td>
                <span class="status-badge" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td class="empty-row" :colspan="columns.length">暂无课程记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { getClassRecordList, getClassRecordStats, type ClassRecordRow, type ClassRecordStats } from '@osg/shared/api/admin/classRecord'

const keyword = ref('')
const rows = ref<ClassRecordRow[]>([])
const stats = ref<ClassRecordStats | null>(null)
const flowSteps = computed(() => stats.value?.flowSteps ?? [])

const statCards = computed(() => {
  const current = stats.value
  if (!current) {
    return []
  }

  return [
    { label: '总记录数', value: String(current.totalCount) },
    { label: '待审核', value: String(current.pendingCount) },
    { label: '已通过', value: String(current.approvedCount) },
    { label: '已驳回', value: String(current.rejectedCount) },
    { label: '待结算金额', value: formatFee(current.pendingSettlementAmount) }
  ]
})

const columns = [
  { key: 'recordCode', title: '记录ID' },
  { key: 'student', title: '学员' },
  { key: 'reporter', title: '申报人' },
  { key: 'coachingType', title: '辅导类型' },
  { key: 'courseContent', title: '课程内容' },
  { key: 'classDate', title: '上课日期' },
  { key: 'durationHours', title: '时长' },
  { key: 'courseFee', title: '课时费' },
  { key: 'studentRating', title: '学员评价' },
  { key: 'status', title: '审核状态' }
]

const loadData = async () => {
  try {
    const [listResponse, statsResponse] = await Promise.all([
      getClassRecordList({ keyword: keyword.value }),
      getClassRecordStats({ keyword: keyword.value })
    ])

    rows.value = listResponse.rows ?? []
    stats.value = statsResponse
  } catch (_error) {
    message.error('课程记录加载失败')
  }
}

const formatDate = (value?: string | null) => {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString('zh-CN')
}

const formatHours = (value?: number | null) => {
  return value == null ? '--' : `${value}h`
}

const formatFee = (value?: string | null) => {
  if (!value) {
    return '¥0'
  }
  const amount = Number(value)
  if (Number.isNaN(amount)) {
    return `¥${value}`
  }
  return `¥${amount.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
}

const statusLabel = (status: string) => {
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已驳回'
  return '待审核'
}

const statusClass = (status: string) => {
  if (status === 'approved') return 'status-badge--approved'
  if (status === 'rejected') return 'status-badge--rejected'
  return 'status-badge--pending'
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped lang="scss">
.class-records-page {
  display: grid;
  gap: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-eyebrow {
  margin: 0 0 6px;
  color: #6366f1;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 32px;
}

.page-subtitle {
  margin: 8px 0 0;
  max-width: 640px;
  color: #475569;
}

.ghost-button,
.primary-button {
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 600;
  cursor: pointer;
}

.ghost-button {
  background: #eef2ff;
  color: #4338ca;
}

.primary-button {
  background: #0f766e;
  color: #fff;
}

.process-banner {
  display: grid;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 24px;
  background: linear-gradient(135deg, #eef2ff, #e0e7ff);
}

.banner-label {
  display: inline-flex;
  margin-bottom: 8px;
  color: #4338ca;
  font-size: 12px;
  font-weight: 700;
}

.process-banner h2 {
  margin: 0;
  color: #1e1b4b;
}

.banner-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.banner-step {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  color: #312e81;
}

.banner-step-index {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #4338ca;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.stat-card {
  padding: 18px 20px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.stat-card__label {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}

.stat-card__value {
  margin: 10px 0 0;
  color: #0f172a;
  font-size: 28px;
  font-weight: 700;
}

.records-shell {
  padding: 20px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.records-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.records-search {
  flex: 1;
  min-width: 0;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
}

.records-table-wrap {
  overflow-x: auto;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
}

.records-table th,
.records-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
}

.records-table th {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.pill,
.status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
}

.pill--blue {
  background: #dbeafe;
  color: #1d4ed8;
}

.pill--green {
  background: #dcfce7;
  color: #15803d;
}

.status-badge--pending {
  background: #fef3c7;
  color: #b45309;
}

.status-badge--approved {
  background: #dcfce7;
  color: #15803d;
}

.status-badge--rejected {
  background: #fee2e2;
  color: #b91c1c;
}

.rating-cell {
  color: #b45309;
  font-weight: 700;
}

.empty-row {
  color: #94a3b8;
  text-align: center;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }

  .records-toolbar {
    flex-direction: column;
  }
}
</style>
