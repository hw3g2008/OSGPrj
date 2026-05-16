<template>
  <div class="osg-page">
    <PageHeader :title-zh="t('admin.users.contracts.pageTitle')" title-en="Contract">
      <template #actions>
        <a-button type="primary" data-surface-trigger="modal-add-contract" data-surface-sample-key="contracts-add-entry" @click="handleRenewEntry()">
          <template #icon><PlusOutlined /></template>
          {{ t('admin.users.contracts.add') }}
        </a-button>
      </template>
    </PageHeader>

    <div style="display: flex; gap: 12px;">
      <div v-for="card in statsCards" :key="card.key" style="flex: 1; min-width: 0;">
        <a-card :bordered="false" :body-style="{ padding: '16px', textAlign: 'center', background: card.bg, borderRadius: '12px' }">
          <a-statistic :title="card.label" :value="card.value" :value-style="{ fontWeight: 700 }" />
        </a-card>
      </div>
    </div>

    <a-card :bordered="false">
      <a-form layout="inline" style="gap: var(--osg-space-3); flex-wrap: wrap">
        <a-form-item :label="t('admin.users.contracts.filter.dateLabel')">
          <a-space>
            <a-date-picker v-model:value="filters.startDate" :placeholder="t('admin.users.contracts.filter.dateStart')" value-format="YYYY-MM-DD" style="width: 140px" />
            <span>~</span>
            <a-date-picker v-model:value="filters.endDate" :placeholder="t('admin.users.contracts.filter.dateEnd')" value-format="YYYY-MM-DD" style="width: 140px" />
          </a-space>
        </a-form-item>
        <a-form-item>
          <a-input v-model:value="filters.studentKeyword" :placeholder="t('admin.users.contracts.filter.studentKeyword')" allow-clear style="width: 180px" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.contractType" :placeholder="t('admin.users.contracts.filter.contractTypePlaceholder')" allow-clear style="width: 120px">
            <a-select-option value="initial">{{ t('admin.users.contracts.filter.contractTypes.initial') }}</a-select-option>
            <a-select-option value="renew">{{ t('admin.users.contracts.filter.contractTypes.renew') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.contractStatus" :placeholder="t('admin.users.contracts.filter.contractStatusPlaceholder')" allow-clear style="width: 130px">
            <a-select-option value="active">{{ t('admin.users.contracts.filter.contractStatuses.active') }}</a-select-option>
            <a-select-option value="expiring">{{ t('admin.users.contracts.filter.contractStatuses.expiring') }}</a-select-option>
            <a-select-option value="expired">{{ t('admin.users.contracts.filter.contractStatuses.expired') }}</a-select-option>
            <a-select-option value="cancelled">{{ t('admin.users.contracts.filter.contractStatuses.cancelled') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.leadMentorName" :placeholder="t('admin.users.contracts.filter.leadMentorPlaceholder')" allow-clear style="width: 120px">
            <a-select-option v-for="mentor in mentorOptions" :key="mentor" :value="mentor">{{ mentor }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              {{ t('admin.users.contracts.filter.search') }}
            </a-button>
            <a-button @click="handleReset">{{ t('admin.users.contracts.filter.reset') }}</a-button>
            <a-button @click="handleExport">
              <template #icon><ExportOutlined /></template>
              {{ t('admin.users.contracts.filter.export') }}
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false">
      <a-table
        :columns="contractColumns"
        :data-source="contractRows"
        :row-key="(record: ContractListItem) => record.contractId"
        :pagination="tablePagination"
        :loading="loading"
        @change="handleTableChange"
        :locale="{ emptyText: t('admin.users.contracts.table.empty') }"
        :scroll="{ x: 1680 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'contractNo'">
            <a-tooltip :title="record.contractNo || '-'">
              <span style="font-family: monospace; font-weight: 600; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ record.contractNo }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'studentName'">
            <a-tooltip :title="record.studentName || '-'">
              <a
                style="display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; color: #1677ff; cursor: pointer"
                data-surface-trigger="modal-contract-detail"
                :data-surface-sample-key="`contract-${record.contractId}`"
                @click="handleDetailEntry(record)"
              >
                {{ record.studentName || '-' }}
              </a>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'leadMentorName'">
            <a-tooltip :title="record.leadMentorName || '-'">
              <span style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ record.leadMentorName || '-' }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'contractType'">
            <a-tag :color="getTypeColor(record.contractType)">{{ formatContractType(record.contractType) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'amountUsd'">
            <template v-if="record.amountUsd != null && Number(record.amountUsd) > 0">
              <strong>${{ Number(record.amountUsd).toLocaleString() }}</strong>
            </template>
            <span v-else style="color: #9ca3af">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'amountGbp'">
            <template v-if="record.amountGbp != null && Number(record.amountGbp) > 0">
              <strong>£{{ Number(record.amountGbp).toLocaleString() }}</strong>
            </template>
            <span v-else style="color: #9ca3af">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'totalHours'">
            {{ record.totalHours ?? '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'usedHours'">
            {{ record.usedHours ?? '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'remainingHours'">
            <strong>{{ record.remainingHours ?? '-' }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'startDate'">
            {{ formatDate(record.startDate) }}
          </template>
          <template v-else-if="column.dataIndex === 'endDate'">
            {{ formatDate(record.endDate) }}
          </template>
          <template v-else-if="column.dataIndex === 'renewalReason'">
            <a-tooltip :title="formatRenewalReason(record.renewalReason) || '-'">
              <span style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ formatRenewalReason(record.renewalReason) || '-' }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'contractStatus'">
            <a-tag :color="getStatusColor(resolveStatus(record))">{{ formatContractStatus(resolveStatus(record)) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space :size="4">
              <a-button type="link" size="small" data-surface-trigger="modal-contract-detail" :data-surface-sample-key="`contract-${record.contractId}`" @click="handleDetailEntry(record)">{{ t('admin.users.contracts.action.detail') }}</a-button>
              <a-button type="link" size="small" data-surface-trigger="modal-contract-renew" :data-surface-sample-key="`contract-${record.contractId}-renew`" @click="handleRenewEntry(record)">{{ t('admin.users.contracts.action.renew') }}</a-button>
            </a-space>
          </template>
        </template>
        <template #footer>
          <a-space :size="24">
            <span><strong>{{ t('admin.users.contracts.table.footer.total') }}:</strong> {{ formatCurrency(summary.totalAmount) }}</span>
            <span><strong>{{ t('admin.users.contracts.table.footer.hours') }}:</strong> {{ summary.totalHours }}h</span>
            <span><strong>{{ t('admin.users.contracts.table.footer.used') }}:</strong> {{ summary.usedHours }}h</span>
            <span><strong>{{ t('admin.users.contracts.table.footer.remaining') }}:</strong> {{ summary.remainingHours }}h</span>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <ContractDetailModal
      v-model:visible="detailVisible"
      :student-id="selectedContract?.studentId ?? null"
      :student-name="selectedContract?.studentName"
      @request-renew="handleRenewEntry(selectedContract || undefined)"
    />
    <RenewContractModal
      v-model:visible="renewVisible"
      :student-options="renewStudentOptions"
      :preset-contract="renewTarget"
      @submitted="handleRenewSubmitted"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { ExportOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import ContractDetailModal from './components/ContractDetailModal.vue'
import RenewContractModal from './components/RenewContractModal.vue'
import {
  getContractList,
  getContractStats,
  type ContractListItem,
  type ContractListParams,
  type ContractStats,
} from '@osg/shared/api/admin/contract'
import { getToken } from '@osg/shared/utils'
import { getAdminDictOptions } from '@/api/adminDict'
import { contractColumnDefs } from './columns'

const { t } = useI18n()

const EXPORT_REQUEST_FAILED = 'export_request_failed'

interface ContractFilters {
  startDate: string
  endDate: string
  studentKeyword: string
  contractType?: string
  contractStatus?: string
  leadMentorName?: string
}

const contractRows = ref<ContractListItem[]>([])
const loading = ref(false)
const detailVisible = ref(false)
const renewVisible = ref(false)
const selectedContract = ref<ContractListItem | null>(null)
const renewTarget = ref<ContractListItem | null>(null)
const summaryStats = ref<ContractStats>({
  totalContracts: 0,
  activeContracts: 0,
  expiringContracts: 0,
  endedContracts: 0,
  totalAmount: 0,
  totalHours: 0,
  usedHours: 0,
  remainingHours: 0,
})

const pageNum = ref(1)
const pageSize = ref(20)
const total = ref(0)

const filters = reactive<ContractFilters>({
  startDate: '',
  endDate: '',
  studentKeyword: '',
  contractType: undefined,
  contractStatus: undefined,
  leadMentorName: undefined,
})

const contractColumns = computed(() =>
  contractColumnDefs.map(def => ({
    ...def,
    title: t(`admin.users.contracts.columns.${def.dataIndex}` as never)
  }))
)

const tablePagination = computed(() => ({
  current: pageNum.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (value: number) => t('admin.users.contracts.table.showTotal', { total: value })
}))

const handleTableChange = (pag: { current?: number; pageSize?: number }) => {
  pageNum.value = pag.current ?? 1
  pageSize.value = pag.pageSize ?? 20
  void loadContracts()
}

const mentorOptions = computed(() =>
  Array.from(
    new Set(
      contractRows.value
        .map((item) => item.leadMentorName || '')
        .filter((item) => item)
    )
  )
)

const renewStudentOptions = computed(() =>
  Array.from(
    new Map(
      contractRows.value.map((item) => [item.studentId, { studentId: item.studentId, studentName: item.studentName }])
    ).values()
  )
)

const summary = computed(() =>
  contractRows.value.reduce(
    (acc, record) => {
      acc.totalAmount += Number(record.contractAmount || 0)
      acc.totalHours += Number(record.totalHours || 0)
      acc.usedHours += Number(record.usedHours || 0)
      acc.remainingHours += Number(record.remainingHours ?? record.totalHours ?? 0)
      return acc
    },
    { totalAmount: 0, totalHours: 0, usedHours: 0, remainingHours: 0 }
  )
)

const statsCards = computed(() => [
  { key: 'total', label: t('admin.users.contracts.stats.total'), value: String(summaryStats.value.totalContracts), tone: 'total', bg: '#eff3ff' },
  { key: 'active', label: t('admin.users.contracts.stats.active'), value: String(summaryStats.value.activeContracts), tone: 'active', bg: '#dcfce7' },
  { key: 'expiring', label: t('admin.users.contracts.stats.expiring'), value: String(summaryStats.value.expiringContracts), tone: 'expiring', bg: '#fef3c7' },
  { key: 'ended', label: t('admin.users.contracts.stats.ended'), value: String(summaryStats.value.endedContracts), tone: 'ended', bg: '#f3f4f6' },
  { key: 'amount', label: t('admin.users.contracts.stats.amount'), value: formatCurrency(Number(summaryStats.value.totalAmount || 0)), tone: 'amount', bg: '#dbeafe' },
])

const buildParams = (): ContractListParams => {
  const params: ContractListParams = {
    pageNum: pageNum.value,
    pageSize: pageSize.value,
    studentName: filters.studentKeyword?.trim() || undefined,
    contractType: filters.contractType || undefined,
    contractStatus: filters.contractStatus || undefined,
    leadMentorName: filters.leadMentorName || undefined,
  }
  if (filters.startDate) {
    params['params[beginTime]'] = filters.startDate
  }
  if (filters.endDate) {
    params['params[endTime]'] = filters.endDate
  }
  return params
}

const loadContracts = async () => {
  loading.value = true
  try {
    const params = buildParams()

    const [listResponse, statsResponse] = await Promise.all([
      getContractList(params),
      getContractStats(params),
    ])

    contractRows.value = Array.isArray(listResponse?.rows) ? listResponse.rows : []
    total.value = listResponse?.total || 0
    summaryStats.value = {
      totalContracts: Number(statsResponse?.totalContracts || 0),
      activeContracts: Number(statsResponse?.activeContracts || 0),
      expiringContracts: Number(statsResponse?.expiringContracts || 0),
      endedContracts: Number(statsResponse?.endedContracts || 0),
      totalAmount: Number(statsResponse?.totalAmount || 0),
      totalHours: Number(statsResponse?.totalHours || 0),
      usedHours: Number(statsResponse?.usedHours || 0),
      remainingHours: Number(statsResponse?.remainingHours || 0),
    }
  } catch (_error) {
    contractRows.value = []
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  pageNum.value = 1
  await loadContracts()
}

const handleReset = async () => {
  filters.startDate = ''
  filters.endDate = ''
  filters.studentKeyword = ''
  filters.contractType = undefined
  filters.contractStatus = undefined
  filters.leadMentorName = undefined
  pageNum.value = 1
  await loadContracts()
}

const handleDetailEntry = (record: ContractListItem) => {
  selectedContract.value = record
  detailVisible.value = true
}

const handleRenewEntry = (record?: ContractListItem) => {
  renewTarget.value = record || null
  renewVisible.value = true
}

const handleExport = async () => {
  if (loading.value) return

  try {
    const params = new URLSearchParams()
    const exportParams = buildParams()
    Object.entries(exportParams).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, String(value))
      }
    })

    const token = getToken()
    const response = await fetch(`/api/admin/contract/export?${params.toString()}`, {
      method: 'GET',
      headers: token
        ? {
            Authorization: `Bearer ${token}`
          }
        : undefined
    })

    if (!response.ok) {
      throw new Error(EXPORT_REQUEST_FAILED)
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const errJson = await response.json().catch(() => null)
      throw new Error(errJson?.msg || t('admin.users.contracts.messages.exportAuthFail'))
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = getExportFilename(response.headers.get('content-disposition'))
    link.rel = 'noopener'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
    message.success(t('admin.users.contracts.messages.exportSuccess'))
  } catch (error) {
    const reason = error instanceof Error && error.message && error.message !== EXPORT_REQUEST_FAILED
      ? error.message
      : ''
    message.error(t('admin.users.contracts.messages.exportFail') + (reason ? `：${reason}` : ''))
  }
}

const handleRenewSubmitted = async () => {
  await loadContracts()
  if (selectedContract.value) {
    const refreshed = contractRows.value.find((item) => item.studentId === selectedContract.value?.studentId)
    if (refreshed) {
      selectedContract.value = refreshed
    }
  }
}

const resolveStatus = (record: ContractListItem) => {
  if (record.contractStatus === 'expired' || record.contractStatus === 'cancelled') {
    return 'expired'
  }
  const remainingHours = Number(record.remainingHours ?? record.totalHours ?? 0)
  const endDate = record.endDate ? new Date(record.endDate).getTime() : 0
  const daysUntilEnd = Math.ceil((endDate - Date.now()) / (24 * 60 * 60 * 1000))
  if (remainingHours <= 0 || daysUntilEnd < 0) {
    return 'expired'
  }
  if (daysUntilEnd <= 30) {
    return 'expiring'
  }
  return 'active'
}

const formatContractType = (type?: string) => {
  if (type === 'renew') return t('admin.users.contracts.types.renew')
  if (type === 'supplement') return t('admin.users.contracts.types.supplement')
  return t('admin.users.contracts.types.initial')
}

const renewalReasonMap = ref<Record<string, string>>({})
const loadRenewalReasonMap = async () => {
  try {
    const items = await getAdminDictOptions('osg_renewal_reason')
    const map: Record<string, string> = {}
    for (const it of items || []) {
      if (it?.dictValue != null) map[String(it.dictValue)] = it.dictLabel || String(it.dictValue)
    }
    renewalReasonMap.value = map
  } catch { /* ignore */ }
}

const formatRenewalReason = (value?: string | null) => {
  if (!value) return ''
  return renewalReasonMap.value[value] || value
}

const formatContractStatus = (status: string) => {
  if (status === 'expiring') return t('admin.users.contracts.statuses.expiring')
  if (status === 'expired') return t('admin.users.contracts.statuses.expired')
  if (status === 'cancelled') return t('admin.users.contracts.statuses.cancelled')
  return t('admin.users.contracts.statuses.active')
}

const getTypeColor = (type?: string) => {
  if (type === 'renew') return 'green'
  if (type === 'supplement') return 'purple'
  return 'blue'
}

const getStatusColor = (status: string) => {
  if (status === 'expiring') return 'orange'
  if (status === 'expired') return 'default'
  return 'green'
}

const formatCurrency = (value?: number, curr: string = 'USD') => {
  const num = Number(value || 0)
  if (curr === 'GBP') return `£${num.toLocaleString()}`
  return `$${num.toLocaleString()}`
}

const formatDate = (value?: string) => {
  if (!value) return '-'
  return value.slice(0, 10)
}

const getExportFilename = (contentDisposition?: string | null) => {
  if (!contentDisposition) {
    return 'contracts.xlsx'
  }
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }
  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1] || 'contracts.xlsx'
}

onMounted(async () => {
  void loadRenewalReasonMap()
  await loadContracts()
})
</script>

<style scoped>
</style>
