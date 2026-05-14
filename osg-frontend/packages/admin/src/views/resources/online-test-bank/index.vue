<template>
  <div class="osg-page">
    <PageHeader title-zh="在线测试题库" title-en="Online Test Bank">
      <template #actions>
        <a-button v-if="activeTab === 'banks'" type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          新增题库
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      v-if="pendingCount > 0"
      type="info"
      show-icon
      :message="`有 ${pendingCount} 个学员题库申请待分配`"
      description="请优先处理班主任流转过来的在线测试申请。"
    >
      <template #action>
        <a-button size="small" @click="activeTab = 'applications'">查看申请</a-button>
      </template>
    </a-alert>

    <a-card :bordered="false">
      <a-tabs v-model:activeKey="activeTab" style="margin-bottom: 16px">
        <a-tab-pane key="banks">
          <template #tab>题库列表</template>
        </a-tab-pane>
        <a-tab-pane key="applications">
          <template #tab>
            学员申请
            <a-badge :count="pendingCount" :number-style="{ backgroundColor: '#faad14' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
      </a-tabs>

      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="filters.keyword" :placeholder="activeTab === 'banks' ? '搜索题库 / 公司' : '搜索学员 / 岗位'" allow-clear style="width: 180px" @press-enter="loadRows" />
        </a-form-item>
        <template v-if="activeTab === 'banks'">
          <a-form-item>
            <a-select v-model:value="filters.companyName" placeholder="全部公司" allow-clear style="width: 140px">
              <a-select-option v-for="option in companyOptions" :key="option" :value="option">{{ option }}</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-select v-model:value="filters.testType" placeholder="全部类型" allow-clear style="width: 120px">
              <a-select-option v-for="option in testTypeOptions" :key="option" :value="option">{{ option }}</a-select-option>
            </a-select>
          </a-form-item>
        </template>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="loadRows">
              <template #icon><SearchOutlined /></template>
              搜索
            </a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-table v-if="activeTab === 'banks'" :columns="bankColumns" :data-source="rows" :row-key="(r: TestBankRow) => r.bankId" :pagination="false" :locale="{ emptyText: '暂无题库记录' }" :scroll="{ x: 1000 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'testBankName'">
            <div style="display: flex; align-items: center; gap: 10px">
              <span class="mdi" :class="testTypeIconMap[record.testType]" :style="{ color: testTypeColorMap[record.testType] }" style="font-size: 20px" />
              <strong>{{ record.testBankName }}</strong>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'testType'">
            <a-tag :color="typeColorMap[record.testType] || 'default'">{{ record.testType }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="record.status === 'enabled' ? 'green' : 'default'">{{ statusLabelMap[record.status || 'enabled'] }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'updatedAt'">
            {{ formatTime(record.updatedAt) }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="openEditModal(record)">编辑</a-button>
          </template>
        </template>
      </a-table>

      <a-table v-else :columns="applicationColumns" :data-source="rows" :row-key="(r: TestBankRow) => r.applicationCode" :pagination="false" :locale="{ emptyText: '暂无学员申请' }" :scroll="{ x: 900 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'applicationCode'">
            <span style="font-family: monospace; color: #64748b">{{ record.applicationCode }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'studentName'">
            <strong>{{ record.studentName }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'applicationTime'">
            {{ formatTime(record.applicationTime) }}
          </template>
          <template v-else-if="column.dataIndex === 'applicationSource'">
            <a-tag color="blue">{{ record.applicationSource || '班主任流转' }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'appAction'">
            <a-button type="primary" size="small">分配题库</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <TestBankFormModal
      v-model="showFormModal"
      :mode="formMode"
      :initial-value="editingRow"
      :submitting="submitting"
      @confirm="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
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

const typeColorMap: Record<string, string> = {
  HireVue: 'red',
  Pymetrics: 'purple',
  SHL: 'blue'
}

const bankColumns = [
  { title: '题库名称', dataIndex: 'testBankName', key: 'testBankName', width: 200, fixed: 'left' as const },
  { title: '公司', dataIndex: 'companyName', key: 'companyName', width: 130 },
  { title: '类型', dataIndex: 'testType', key: 'testType', width: 100 },
  { title: '题目数', dataIndex: 'questionCount', key: 'questionCount', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 130 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
]

const applicationColumns = [
  { title: '申请ID', dataIndex: 'applicationCode', key: 'applicationCode', width: 120, fixed: 'left' as const },
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: '申请岗位', dataIndex: 'appliedPosition', key: 'appliedPosition', width: 150 },
  { title: '测试类型', dataIndex: 'testType', key: 'testType', width: 100 },
  { title: '申请时间', dataIndex: 'applicationTime', key: 'applicationTime', width: 130 },
  { title: '来源', dataIndex: 'applicationSource', key: 'applicationSource', width: 110 },
  { title: '操作', dataIndex: 'appAction', key: 'appAction', width: 100, fixed: 'right' as const },
]

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
  companyName: undefined as string | undefined,
  testType: undefined as TestBankType | undefined
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
    companyName: undefined,
    testType: undefined
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

<style scoped>
</style>
