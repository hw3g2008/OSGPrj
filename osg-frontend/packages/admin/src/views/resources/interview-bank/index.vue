<template>
  <section class="interview-bank-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">Interview Resource Center</p>
        <h1>真人面试题库</h1>
        <p class="page-subtitle">管理真人面试问题集锦，按面试阶段和类型分类</p>
      </div>
      <button
        v-if="activeTab === 'banks'"
        type="button"
        class="primary-button"
        @click="openCreateModal"
      >
        新增题库
      </button>
    </header>

    <section v-if="pendingCount > 0" class="banner-card">
      <div>
        <strong>有 {{ pendingCount }} 个学员题库申请待分配</strong>
        <p>请优先处理班主任流转过来的真人面试题库申请。</p>
      </div>
      <button type="button" class="ghost-button ghost-button--warn" @click="activeTab = 'applications'">查看申请</button>
    </section>

    <section class="tabs-row">
      <button
        type="button"
        class="tab-pill"
        :class="{ 'tab-pill--active': activeTab === 'banks' }"
        @click="activeTab = 'banks'"
      >
        题库列表
      </button>
      <button
        type="button"
        class="tab-pill"
        :class="{ 'tab-pill--active': activeTab === 'applications' }"
        @click="activeTab = 'applications'"
      >
        学员申请
        <span class="tab-pill__count">{{ pendingCount }}</span>
      </button>
    </section>

    <section class="toolbar-card">
      <input
        v-model.trim="filters.keyword"
        class="toolbar-input"
        type="search"
        :placeholder="activeTab === 'banks' ? '搜索题库 / 行业' : '搜索学员 / 岗位'"
      >
      <select v-if="activeTab === 'banks'" v-model="filters.interviewStage" class="toolbar-select">
        <option value="">全部阶段</option>
        <option v-for="option in interviewStageOptions" :key="option" :value="option">{{ option }}</option>
      </select>
      <select v-if="activeTab === 'banks'" v-model="filters.interviewType" class="toolbar-select">
        <option value="">全部类型</option>
        <option v-for="option in interviewTypeOptions" :key="option" :value="option">{{ option }}</option>
      </select>
      <select v-if="activeTab === 'banks'" v-model="filters.industryName" class="toolbar-select">
        <option value="">全部行业</option>
        <option v-for="option in industryOptions" :key="option" :value="option">{{ option }}</option>
      </select>
      <button type="button" class="ghost-button" @click="loadRows">搜索</button>
      <button type="button" class="ghost-button ghost-button--light" @click="handleReset">重置</button>
    </section>

    <section class="table-card">
      <table v-if="activeTab === 'banks'" class="resource-table">
        <thead>
          <tr>
            <th>题库名称</th>
            <th>阶段</th>
            <th>类型</th>
            <th>行业</th>
            <th>题目数</th>
            <th>状态</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.bankId">
            <td class="resource-name-cell">
              <span class="mdi mdi-account-tie" :style="{ color: '#0f766e' }" />
              <strong>{{ row.interviewBankName }}</strong>
            </td>
            <td>{{ row.interviewStage }}</td>
            <td>
              <span class="type-pill" :class="`type-pill--${row.interviewType}`">{{ row.interviewType }}</span>
            </td>
            <td>{{ row.industryName }}</td>
            <td>{{ row.questionCount }}</td>
            <td>
              <span class="status-pill" :class="`status-pill--${row.status}`">{{ statusLabelMap[row.status || 'enabled'] }}</span>
            </td>
            <td>{{ formatTime(row.updatedAt) }}</td>
            <td>
              <button type="button" class="link-button" @click="openEditModal(row)">编辑</button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="8" class="empty-row">暂无题库记录</td>
          </tr>
        </tbody>
      </table>

      <table v-else class="resource-table">
        <thead>
          <tr>
            <th>申请ID</th>
            <th>学员</th>
            <th>申请岗位</th>
            <th>阶段</th>
            <th>申请时间</th>
            <th>来源</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.applicationCode">
            <td class="code-cell">{{ row.applicationCode }}</td>
            <td><strong>{{ row.studentName }}</strong></td>
            <td>{{ row.appliedPosition }}</td>
            <td>{{ row.interviewStage }}</td>
            <td>{{ formatTime(row.applicationTime) }}</td>
            <td>
              <span class="source-pill">{{ row.applicationSource || '班主任流转' }}</span>
            </td>
            <td>
              <button type="button" class="primary-link-button">分配题库</button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="7" class="empty-row">暂无学员申请</td>
          </tr>
        </tbody>
      </table>
    </section>

    <InterviewBankFormModal
      v-model="showFormModal"
      :mode="formMode"
      :initial-value="editingRow"
      :submitting="submitting"
      @confirm="handleSubmit"
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import InterviewBankFormModal from './components/InterviewBankFormModal.vue'
import {
  createInterviewBank,
  getInterviewBankList,
  updateInterviewBank,
  type InterviewBankRow,
  type InterviewBankStatus,
  type InterviewBankTab,
  type InterviewIndustry,
  type InterviewStage,
  type InterviewType,
  type SaveInterviewBankPayload
} from '@osg/shared/api/admin/interviewBank'

const interviewStageOptions: InterviewStage[] = ['Screening Call', 'First Round', 'Second Round', 'Superday']
const interviewTypeOptions: InterviewType[] = ['Behavioral', 'Technical', 'Case']
const industryOptions: InterviewIndustry[] = ['Investment Banking', 'Consulting', 'PE', 'VC']

const statusLabelMap: Record<InterviewBankStatus, string> = {
  enabled: '启用',
  disabled: '禁用'
}

const activeTab = ref<InterviewBankTab>('banks')
const rows = ref<InterviewBankRow[]>([])
const pendingCount = ref(0)
const submitting = ref(false)
const showFormModal = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingRow = ref<InterviewBankRow | null>(null)
const filters = ref({
  keyword: '',
  interviewStage: '' as InterviewStage | '',
  interviewType: '' as InterviewType | '',
  industryName: '' as InterviewIndustry | ''
})

const loadRows = async () => {
  try {
    const response = await getInterviewBankList({
      tab: activeTab.value,
      keyword: filters.value.keyword || undefined,
      interviewStage: activeTab.value === 'banks' ? filters.value.interviewStage : '',
      interviewType: activeTab.value === 'banks' ? filters.value.interviewType : '',
      industryName: activeTab.value === 'banks' ? filters.value.industryName : ''
    })
    rows.value = response.rows ?? []
    pendingCount.value = response.pendingCount ?? 0
  } catch (_error) {
    message.error(activeTab.value === 'banks' ? '题库列表加载失败' : '学员申请加载失败')
  }
}

const handleReset = () => {
  filters.value = {
    keyword: '',
    interviewStage: '',
    interviewType: '',
    industryName: ''
  }
  void loadRows()
}

const openCreateModal = () => {
  formMode.value = 'create'
  editingRow.value = null
  showFormModal.value = true
}

const openEditModal = (row: InterviewBankRow) => {
  formMode.value = 'edit'
  editingRow.value = row
  showFormModal.value = true
}

const handleSubmit = async (payload: SaveInterviewBankPayload) => {
  submitting.value = true
  try {
    if (formMode.value === 'edit' && editingRow.value?.bankId) {
      await updateInterviewBank({
        bankId: editingRow.value.bankId,
        ...payload
      })
      message.success('题库更新成功')
    } else {
      await createInterviewBank(payload)
      message.success('题库创建成功')
    }
    showFormModal.value = false
    await loadRows()
  } catch (_error) {
    // request util handles error message
  } finally {
    submitting.value = false
  }
}

const formatTime = (value?: string | null) => {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}

watch(activeTab, () => {
  void loadRows()
})

onMounted(() => {
  void loadRows()
})
</script>

<style scoped lang="scss">
.interview-bank-page {
  display: grid;
  gap: 20px;
}

.page-header,
.tabs-row,
.toolbar-card {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.page-header {
  align-items: flex-start;
  justify-content: space-between;
}

.page-eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1,
.page-subtitle {
  margin: 0;
}

.page-subtitle {
  margin-top: 8px;
  color: #64748b;
}

.banner-card,
.toolbar-card,
.table-card {
  border-radius: 24px;
  background: #fff;
  padding: 20px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.banner-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
}

.banner-card strong,
.banner-card p {
  margin: 0;
}

.banner-card p {
  margin-top: 8px;
  color: #1e3a8a;
}

.tab-pill,
.toolbar-input,
.toolbar-select,
.ghost-button,
.primary-button,
.link-button,
.primary-link-button {
  border-radius: 14px;
  font: inherit;
}

.tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: #dbeafe;
  color: #1d4ed8;
  padding: 10px 16px;
  cursor: pointer;
}

.tab-pill--active {
  background: #2563eb;
  color: #fff;
}

.tab-pill__count {
  min-width: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
  text-align: center;
}

.toolbar-card {
  align-items: center;
}

.toolbar-input,
.toolbar-select {
  min-width: 180px;
  border: 1px solid #cbd5e1;
  padding: 10px 12px;
  background: #fff;
}

.primary-button,
.ghost-button {
  border: none;
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 600;
}

.primary-button {
  background: #0f766e;
  color: #fff;
}

.ghost-button {
  background: #e2e8f0;
  color: #334155;
}

.ghost-button--warn {
  background: transparent;
  border: 1px solid #1d4ed8;
  color: #1e3a8a;
}

.ghost-button--light {
  background: #f8fafc;
}

.resource-table {
  width: 100%;
  border-collapse: collapse;
}

.resource-table th,
.resource-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: middle;
}

.resource-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.type-pill,
.status-pill,
.source-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.type-pill--Behavioral {
  background: #dbeafe;
  color: #1d4ed8;
}

.type-pill--Technical {
  background: #fef3c7;
  color: #b45309;
}

.type-pill--Case {
  background: #ede9fe;
  color: #6d28d9;
}

.status-pill--enabled {
  background: #dcfce7;
  color: #15803d;
}

.status-pill--disabled {
  background: #e2e8f0;
  color: #475569;
}

.source-pill {
  background: #dbeafe;
  color: #1d4ed8;
}

.link-button,
.primary-link-button {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font-weight: 600;
}

.link-button {
  color: #0f766e;
}

.primary-link-button {
  color: #2563eb;
}

.code-cell {
  font-family: 'SFMono-Regular', Consolas, monospace;
  color: #64748b;
}

.empty-row {
  text-align: center;
  color: #64748b;
}
</style>
