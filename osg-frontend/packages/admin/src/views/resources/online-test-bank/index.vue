<template>
  <div class="osg-page">
    <PageHeader :title-zh="t('admin.resources.onlineTestBank.pageTitle')" title-en="Online Test Bank">
      <template #actions>
        <a-button v-if="activeTab === 'banks'" type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          {{ t('admin.resources.onlineTestBank.createBank') }}
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      v-if="pendingCount > 0"
      type="info"
      show-icon
      :message="t('admin.resources.onlineTestBank.pendingAlert', { count: pendingCount })"
      :description="t('admin.resources.onlineTestBank.pendingAlertDesc')"
    >
      <template #action>
        <a-button size="small" @click="activeTab = 'applications'">{{ t('admin.resources.onlineTestBank.viewApplications') }}</a-button>
      </template>
    </a-alert>

    <a-card :bordered="false">
      <a-tabs v-model:activeKey="activeTab" style="margin-bottom: 16px">
        <a-tab-pane key="banks">
          <template #tab>{{ t('admin.resources.onlineTestBank.tabs.banks') }}</template>
        </a-tab-pane>
        <a-tab-pane key="applications">
          <template #tab>
            {{ t('admin.resources.onlineTestBank.tabs.applications') }}
            <a-badge :count="pendingCount" :number-style="{ backgroundColor: '#faad14' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
      </a-tabs>

      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="filters.keyword" :placeholder="activeTab === 'banks' ? t('admin.resources.onlineTestBank.filter.bankSearchPlaceholder') : t('admin.resources.onlineTestBank.filter.appSearchPlaceholder')" allow-clear style="width: 180px" @press-enter="loadRows" />
        </a-form-item>
        <template v-if="activeTab === 'banks'">
          <a-form-item>
            <a-select v-model:value="filters.companyName" :placeholder="t('admin.resources.onlineTestBank.filter.companyPlaceholder')" allow-clear style="width: 140px">
              <a-select-option v-for="option in companyOptions" :key="option" :value="option">{{ option }}</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-select v-model:value="filters.testType" :placeholder="t('admin.resources.onlineTestBank.filter.typePlaceholder')" allow-clear style="width: 120px">
              <a-select-option v-for="option in testTypeOptions" :key="option" :value="option">{{ option }}</a-select-option>
            </a-select>
          </a-form-item>
        </template>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="loadRows">
              <template #icon><SearchOutlined /></template>
              {{ t('admin.resources.onlineTestBank.filter.search') }}
            </a-button>
            <a-button @click="handleReset">{{ t('admin.resources.onlineTestBank.filter.reset') }}</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-table v-if="activeTab === 'banks'" :columns="bankColumns" :data-source="rows" :row-key="(r: TestBankRow) => r.bankId" :pagination="false" :locale="{ emptyText: t('admin.resources.onlineTestBank.empty') }" :scroll="{ x: 1000 }">
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
            <a-button type="link" size="small" @click="openEditModal(record)">{{ t('admin.resources.onlineTestBank.action.edit') }}</a-button>
          </template>
        </template>
      </a-table>

      <a-table v-else :columns="applicationColumns" :data-source="rows" :row-key="(r: TestBankRow) => r.applicationCode" :pagination="false" :locale="{ emptyText: t('admin.resources.onlineTestBank.appEmpty') }" :scroll="{ x: 900 }">
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
            <a-tag color="blue">{{ record.applicationSource || t('admin.resources.onlineTestBank.sourceFallback') }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'appAction'">
            <a-button type="primary" size="small">{{ t('admin.resources.onlineTestBank.action.assign') }}</a-button>
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
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n()

const typeColorMap: Record<string, string> = {
  HireVue: 'red',
  Pymetrics: 'purple',
  SHL: 'blue'
}

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

const statusLabelMap = computed<Record<TestBankStatus, string>>(() => ({
  enabled: t('admin.resources.onlineTestBank.status.enabled'),
  disabled: t('admin.resources.onlineTestBank.status.disabled')
}))

const bankColumns = computed(() => [
  { title: t('admin.resources.onlineTestBank.bankColumns.name'), dataIndex: 'testBankName', key: 'testBankName', width: 200, fixed: 'left' as const },
  { title: t('admin.resources.onlineTestBank.bankColumns.company'), dataIndex: 'companyName', key: 'companyName', width: 130 },
  { title: t('admin.resources.onlineTestBank.bankColumns.type'), dataIndex: 'testType', key: 'testType', width: 100 },
  { title: t('admin.resources.onlineTestBank.bankColumns.questionCount'), dataIndex: 'questionCount', key: 'questionCount', width: 80 },
  { title: t('admin.resources.onlineTestBank.bankColumns.status'), dataIndex: 'status', key: 'status', width: 80 },
  { title: t('admin.resources.onlineTestBank.bankColumns.updatedAt'), dataIndex: 'updatedAt', key: 'updatedAt', width: 130 },
  { title: t('admin.resources.onlineTestBank.bankColumns.action'), dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
])

const applicationColumns = computed(() => [
  { title: t('admin.resources.onlineTestBank.appColumns.appCode'), dataIndex: 'applicationCode', key: 'applicationCode', width: 120, fixed: 'left' as const },
  { title: t('admin.resources.onlineTestBank.appColumns.student'), dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: t('admin.resources.onlineTestBank.appColumns.position'), dataIndex: 'appliedPosition', key: 'appliedPosition', width: 150 },
  { title: t('admin.resources.onlineTestBank.appColumns.testType'), dataIndex: 'testType', key: 'testType', width: 100 },
  { title: t('admin.resources.onlineTestBank.appColumns.time'), dataIndex: 'applicationTime', key: 'applicationTime', width: 130 },
  { title: t('admin.resources.onlineTestBank.appColumns.source'), dataIndex: 'applicationSource', key: 'applicationSource', width: 110 },
  { title: t('admin.resources.onlineTestBank.appColumns.action'), dataIndex: 'appAction', key: 'appAction', width: 100, fixed: 'right' as const },
])

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
      message.success(t('admin.resources.onlineTestBank.messages.updateSuccess'))
    } else {
      await createTestBank(payload)
      message.success(t('admin.resources.onlineTestBank.messages.createSuccess'))
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
