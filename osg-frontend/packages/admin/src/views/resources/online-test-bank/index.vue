<template>
  <section class="test-bank-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">Assessment Resource Center</p>
        <h1>在线测试题库</h1>
        <p class="page-subtitle">管理HireVue、Pymetrics、SHL等在线测试资源</p>
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
        <p>请优先处理班主任流转过来的在线测试申请。</p>
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
        :placeholder="activeTab === 'banks' ? '搜索题库 / 公司' : '搜索学员 / 岗位'"
      >
      <select v-if="activeTab === 'banks'" v-model="filters.companyName" class="toolbar-select">
        <option value="">全部公司</option>
        <option v-for="option in companyOptions" :key="option" :value="option">{{ option }}</option>
      </select>
      <select v-if="activeTab === 'banks'" v-model="filters.testType" class="toolbar-select">
        <option value="">全部类型</option>
        <option v-for="option in testTypeOptions" :key="option" :value="option">{{ option }}</option>
      </select>
      <button type="button" class="ghost-button" @click="loadRows">搜索</button>
      <button type="button" class="ghost-button ghost-button--light" @click="handleReset">重置</button>
    </section>

    <section class="table-card">
      <table v-if="activeTab === 'banks'" class="resource-table">
        <thead>
          <tr>
            <th>题库名称</th>
            <th>公司</th>
            <th>类型</th>
            <th>题目数</th>
            <th>状态</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.bankId">
            <td class="resource-name-cell">
              <span class="mdi" :class="testTypeIconMap[row.testType]" :style="{ color: testTypeColorMap[row.testType] }" />
              <strong>{{ row.testBankName }}</strong>
            </td>
            <td>{{ row.companyName }}</td>
            <td>
              <span class="type-pill" :class="`type-pill--${row.testType}`">{{ row.testType }}</span>
            </td>
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
            <td colspan="7" class="empty-row">暂无题库记录</td>
          </tr>
        </tbody>
      </table>

      <table v-else class="resource-table">
        <thead>
          <tr>
            <th>申请ID</th>
            <th>学员</th>
            <th>申请岗位</th>
            <th>测试类型</th>
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
            <td>{{ row.testType }}</td>
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

    <TestBankFormModal
      v-model="showFormModal"
      :mode="formMode"
      :initial-value="editingRow"
      :submitting="submitting"
      @confirm="handleSubmit"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import TestBankFormModal from './components/TestBankFormModal.vue'
import {
  createTestBank,
  getTestBankList,
  updateTestBank,
  type SaveTestBankPayload,
  type TestBankRow,
  type TestBankStatus,
  type TestBankTab,
  type TestBankType
} from '@osg/shared/api/admin/testBank'

const testTypeOptions: TestBankType[] = ['HireVue', 'Pymetrics', 'SHL']

const testTypeIconMap: Record<TestBankType, string> = {
  HireVue: 'mdi-video',
  Pymetrics: 'mdi-brain',
  SHL: 'mdi-calculator'
}

const testTypeColorMap: Record<TestBankType, string> = {
  HireVue: '#dc2626',
  Pymetrics: '#7c3aed',
  SHL: '#2563eb'
}

const statusLabelMap: Record<TestBankStatus, string> = {
  enabled: '启用',
  disabled: '禁用'
}

const activeTab = ref<TestBankTab>('banks')
const rows = ref<TestBankRow[]>([])
const companyRegistry = ref<string[]>([])
const pendingCount = ref(0)
const submitting = ref(false)
const showFormModal = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingRow = ref<TestBankRow | null>(null)
const filters = ref({
  keyword: '',
  companyName: '',
  testType: '' as TestBankType | ''
})

const companyOptions = computed(() => companyRegistry.value)

const loadRows = async () => {
  try {
    const response = await getTestBankList({
      tab: activeTab.value,
      keyword: filters.value.keyword || undefined,
      companyName: activeTab.value === 'banks' ? filters.value.companyName || undefined : undefined,
      testType: activeTab.value === 'banks' ? filters.value.testType : ''
    })
    rows.value = response.rows ?? []
    pendingCount.value = response.pendingCount ?? 0

    if (activeTab.value === 'banks') {
      companyRegistry.value = Array.from(
        new Set(
          rows.value
            .map((item) => item.companyName)
            .filter((value): value is string => Boolean(value))
        )
      )
    }
  } catch (_error) {
    message.error(activeTab.value === 'banks' ? '题库列表加载失败' : '学员申请加载失败')
  }
}

const handleReset = () => {
  filters.value = {
    keyword: '',
    companyName: '',
    testType: ''
  }
  void loadRows()
}

const openCreateModal = () => {
  formMode.value = 'create'
  editingRow.value = null
  showFormModal.value = true
}

const openEditModal = (row: TestBankRow) => {
  formMode.value = 'edit'
  editingRow.value = row
  showFormModal.value = true
}

const handleSubmit = async (payload: SaveTestBankPayload) => {
  submitting.value = true
  try {
    if (formMode.value === 'edit' && editingRow.value?.bankId) {
      await updateTestBank({
        bankId: editingRow.value.bankId,
        ...payload
      })
      message.success('题库更新成功')
    } else {
      await createTestBank(payload)
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
.test-bank-page {
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
  color: #7c3aed;
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
  background: linear-gradient(135deg, #fef3c7, #fde68a);
}

.banner-card strong,
.banner-card p {
  margin: 0;
}

.banner-card p {
  margin-top: 8px;
  color: #92400e;
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
  background: #f3e8ff;
  color: #6d28d9;
  padding: 10px 16px;
  cursor: pointer;
}

.tab-pill--active {
  background: #7c3aed;
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
  min-width: 200px;
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
  background: #7c3aed;
  color: #fff;
}

.ghost-button {
  background: #e2e8f0;
  color: #334155;
}

.ghost-button--warn {
  background: transparent;
  border: 1px solid #d97706;
  color: #92400e;
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

.type-pill--HireVue {
  background: #fee2e2;
  color: #b91c1c;
}

.type-pill--Pymetrics {
  background: #ede9fe;
  color: #6d28d9;
}

.type-pill--SHL {
  background: #dbeafe;
  color: #1d4ed8;
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
  color: #7c3aed;
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
