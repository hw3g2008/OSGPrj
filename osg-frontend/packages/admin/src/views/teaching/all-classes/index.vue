<template>
  <section class="all-classes-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">Teaching Center</p>
        <h1>全部课程</h1>
        <p class="page-subtitle">统一查看全部课程记录，按待审核 / 未支付 / 已支付 / 已驳回分组审阅不同课程详情。</p>
      </div>
      <button type="button" class="ghost-button">导出</button>
    </header>

    <section class="flow-banner">
      <div>
        <span class="flow-banner__label">流程说明</span>
        <h2>导师、班主任、助教提交后统一进入超级管理员视图</h2>
      </div>
      <div class="flow-banner__steps">
        <div v-for="step in flowSteps" :key="step" class="flow-banner__step">{{ step }}</div>
      </div>
    </section>

    <section class="classes-shell">
      <div class="classes-toolbar">
        <div class="classes-tabs" role="tablist" aria-label="全部课程筛选">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="classes-tab"
            :class="{ 'classes-tab--active': activeTab === tab.key }"
            @click="switchTab(tab.key)"
          >
            <span>{{ tab.label }}</span>
            <strong>{{ tab.count }}</strong>
          </button>
        </div>

        <div class="classes-search">
          <input
            v-model.trim="keyword"
            class="classes-search__input"
            type="search"
            placeholder="搜索学员 / 导师"
            @keyup.enter="handleSearch"
          >
          <button type="button" class="primary-button" @click="handleSearch">查询</button>
        </div>
      </div>

      <div class="classes-table-wrap">
        <table class="classes-table">
          <thead>
            <tr>
              <th>课程ID</th>
              <th>学员</th>
              <th>导师</th>
              <th>课程类型</th>
              <th>时长</th>
              <th>日期</th>
              <th>来源</th>
              <th>状态</th>
              <th>评价</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.recordId" :class="rowClassName(row.displayStatus)">
              <td>{{ row.classId || `#${row.recordId}` }}</td>
              <td>{{ row.studentName }}</td>
              <td>{{ row.mentorName }}</td>
              <td>
                <span class="type-pill">{{ row.courseTypeLabel }}</span>
              </td>
              <td>{{ formatHours(row.durationHours) }}</td>
              <td>{{ formatDate(row.classDate) }}</td>
              <td>{{ row.sourceLabel }}</td>
              <td>
                <span class="status-pill" :class="`status-pill--${row.displayStatus}`">
                  {{ row.displayStatusLabel }}
                </span>
              </td>
              <td>{{ row.rate ? `⭐ ${row.rate}` : '—' }}</td>
              <td>
                <button type="button" class="link-button" @click="openDetail(row.recordId)">详情</button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td class="empty-row" colspan="10">当前筛选下暂无课程记录</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-bar">
        <span>第 {{ currentPage }} / {{ totalPages }} 页 · 每页 10 条</span>
        <div class="pagination-actions">
          <button type="button" class="ghost-button" :disabled="currentPage <= 1" @click="goPrevPage">上一页</button>
          <button type="button" class="ghost-button" :disabled="currentPage >= totalPages" @click="goNextPage">下一页</button>
        </div>
      </div>
    </section>

    <ClassDetailModal
      :visible="detailVisible"
      :detail="detail"
      @update:visible="detailVisible = $event"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import ClassDetailModal from './components/ClassDetailModal.vue'
import {
  getAllClassesDetail,
  getAllClassesList,
  type AllClassesDetail,
  type AllClassesRow,
  type AllClassesSummary,
  type AllClassesTab
} from '@osg/shared/api/admin/allClasses'

const keyword = ref('')
const activeTab = ref<AllClassesTab>('all')
const currentPage = ref(1)
const pageSize = 10
const total = ref(0)
const rows = ref<AllClassesRow[]>([])
const detailVisible = ref(false)
const detail = ref<AllClassesDetail | null>(null)

const summary = ref<AllClassesSummary>({
  allCount: 0,
  pendingCount: 0,
  unpaidCount: 0,
  paidCount: 0,
  rejectedCount: 0,
  selectedTab: 'all',
  flowSteps: ['导师/班主任/助教提交', '待审核', '未支付', '已支付']
})

const tabs = computed(() => ([
  { key: 'all' as const, label: '全部', count: summary.value.allCount },
  { key: 'pending' as const, label: '待审核', count: summary.value.pendingCount },
  { key: 'unpaid' as const, label: '未支付', count: summary.value.unpaidCount },
  { key: 'paid' as const, label: '已支付', count: summary.value.paidCount },
  { key: 'rejected' as const, label: '已驳回', count: summary.value.rejectedCount }
]))

const flowSteps = computed(() => summary.value.flowSteps)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const loadData = async () => {
  try {
    const response = await getAllClassesList({
      tab: activeTab.value,
      keyword: keyword.value,
      pageNum: currentPage.value,
      pageSize
    })
    rows.value = response.rows ?? []
    summary.value = response.summary
    total.value = response.total ?? 0
  } catch (_error) {
    message.error('全部课程加载失败')
  }
}

const handleSearch = () => {
  currentPage.value = 1
  void loadData()
}

const switchTab = (tab: AllClassesTab) => {
  activeTab.value = tab
  currentPage.value = 1
  void loadData()
}

const goPrevPage = () => {
  if (currentPage.value <= 1) return
  currentPage.value -= 1
  void loadData()
}

const goNextPage = () => {
  if (currentPage.value >= totalPages.value) return
  currentPage.value += 1
  void loadData()
}

const openDetail = async (recordId: number) => {
  try {
    detail.value = await getAllClassesDetail(recordId)
    detailVisible.value = true
  } catch (_error) {
    message.error('课程详情加载失败')
  }
}

const formatDate = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('zh-CN')
}

const formatHours = (value?: number | null) => {
  return value == null ? '--' : `${value}h`
}

const rowClassName = (displayStatus: string) => `classes-row classes-row--${displayStatus}`

onMounted(() => {
  void loadData()
})
</script>

<style scoped lang="scss">
.all-classes-page {
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
  color: #2563eb;
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
  max-width: 760px;
  color: #475569;
}

.ghost-button,
.primary-button,
.link-button {
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 600;
  cursor: pointer;
}

.ghost-button {
  background: #eff6ff;
  color: #1d4ed8;
}

.ghost-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.primary-button {
  background: #0f766e;
  color: #fff;
}

.link-button {
  padding: 0;
  background: transparent;
  color: #2563eb;
}

.flow-banner {
  display: grid;
  gap: 16px;
  padding: 22px 24px;
  border-radius: 24px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
}

.flow-banner__label {
  display: inline-flex;
  margin-bottom: 8px;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.flow-banner h2 {
  margin: 0;
  color: #0f172a;
}

.flow-banner__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.flow-banner__step {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.75);
  color: #1e3a8a;
  font-weight: 600;
}

.classes-shell {
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.classes-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
}

.classes-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.classes-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  padding: 10px 16px;
  background: #fff;
  color: #334155;
  cursor: pointer;
}

.classes-tab strong {
  color: #1d4ed8;
}

.classes-tab--active {
  background: #dbeafe;
  border-color: #93c5fd;
}

.classes-search {
  display: flex;
  gap: 10px;
}

.classes-search__input {
  min-width: 280px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 10px 14px;
}

.classes-table-wrap {
  overflow-x: auto;
}

.classes-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1040px;
}

.classes-table th,
.classes-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  color: #0f172a;
}

.classes-table th {
  font-size: 13px;
  color: #475569;
}

.classes-row--pending {
  background: #fffbeb;
}

.classes-row--unpaid {
  background: #eff6ff;
}

.classes-row--rejected {
  background: #fff7ed;
}

.type-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.type-pill {
  background: #e0f2fe;
  color: #0c4a6e;
}

.status-pill--pending {
  background: #fef3c7;
  color: #92400e;
}

.status-pill--unpaid {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-pill--paid {
  background: #dcfce7;
  color: #166534;
}

.status-pill--rejected {
  background: #fed7aa;
  color: #c2410c;
}

.empty-row {
  color: #64748b;
  text-align: center;
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #475569;
}

.pagination-actions {
  display: flex;
  gap: 10px;
}
</style>
