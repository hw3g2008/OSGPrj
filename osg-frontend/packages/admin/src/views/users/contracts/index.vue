<template>
  <div class="osg-page">
    <PageHeader title-zh="合同管理" title-en="Contract">
      <template #actions>
        <a-button type="primary" data-surface-trigger="modal-add-contract" data-surface-sample-key="contracts-add-entry" @click="handleRenewEntry()">
          <template #icon><PlusOutlined /></template>
          新增合同
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

    <a-card :bordered="false" style="box-shadow: var(--card-shadow)">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item label="日期">
          <a-space>
            <a-date-picker v-model:value="filters.startDate" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 140px" />
            <span>~</span>
            <a-date-picker v-model:value="filters.endDate" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 140px" />
          </a-space>
        </a-form-item>
        <a-form-item>
          <a-input v-model:value="filters.studentKeyword" placeholder="姓名或学员ID" allow-clear style="width: 180px" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.contractType" placeholder="合同类型" allow-clear style="width: 120px">
            <a-select-option value="initial">首签</a-select-option>
            <a-select-option value="renew">续签</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.contractStatus" placeholder="合同状态" allow-clear style="width: 130px">
            <a-select-option value="active">有效</a-select-option>
            <a-select-option value="expiring">即将到期</a-select-option>
            <a-select-option value="expired">已结束</a-select-option>
            <a-select-option value="cancelled">已作废</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.leadMentorName" placeholder="班主任" allow-clear style="width: 120px">
            <a-select-option v-for="mentor in mentorOptions" :key="mentor" :value="mentor">{{ mentor }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              搜索
            </a-button>
            <a-button @click="handleReset">重置</a-button>
            <a-button @click="handleExport">
              <template #icon><ExportOutlined /></template>
              导出
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-table
        :columns="contractColumns"
        :data-source="contractRows"
        :row-key="(record: ContractListItem) => record.contractId"
        :pagination="tablePagination"
        :loading="loading"
        @change="handleTableChange"
        :locale="{ emptyText: '暂无合同数据' }"
        :scroll="{ x: 1280 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'contractNo'">
            <span style="font-family: monospace; font-weight: 600">{{ record.contractNo }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'studentName'">
            <a-button type="link" size="small" style="padding: 0; font-weight: 600" data-surface-trigger="modal-contract-detail" :data-surface-sample-key="`contract-${record.contractId}`" @click="handleDetailEntry(record)">
              {{ record.studentName || '-' }}
            </a-button>
          </template>
          <template v-else-if="column.dataIndex === 'leadMentorName'">
            {{ record.leadMentorName || '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'contractType'">
            <a-tag :color="getTypeColor(record.contractType)">{{ formatContractType(record.contractType) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'contractAmount'">
            <template v-if="record.currency === 'GBP'">
              <div><strong>£{{ (record.amountGbp || 0).toLocaleString() }}</strong></div>
              <div style="color: #9ca3af; font-size: 12px">${{ (record.amountUsd || 0).toLocaleString() }} 等值</div>
            </template>
            <template v-else>
              <strong>${{ (record.amountUsd || record.contractAmount || 0).toLocaleString() }}</strong>
            </template>
          </template>
          <template v-else-if="column.dataIndex === 'totalHours'">
            <strong>{{ record.remainingHours ?? record.totalHours }}</strong>
            <span style="color: #9ca3af; font-size: 12px"> / {{ record.totalHours }}h</span>
          </template>
          <template v-else-if="column.dataIndex === 'period'">
            <span style="color: #566178; font-size: 12px">{{ formatDate(record.startDate) }} ~ {{ formatDate(record.endDate) }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'renewalReason'">
            {{ formatRenewalReason(record.renewalReason) || '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'contractStatus'">
            <a-tag :color="getStatusColor(resolveStatus(record))">{{ formatContractStatus(resolveStatus(record)) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space :size="4">
              <a-button type="link" size="small" data-surface-trigger="modal-contract-detail" :data-surface-sample-key="`contract-${record.contractId}`" @click="handleDetailEntry(record)">详情</a-button>
              <a-button type="link" size="small" data-surface-trigger="modal-contract-renew" :data-surface-sample-key="`contract-${record.contractId}-renew`" @click="handleRenewEntry(record)">续签合同</a-button>
            </a-space>
          </template>
        </template>
        <template #footer>
          <a-space :size="24">
            <span><strong>总金额:</strong> {{ formatCurrency(summary.totalAmount) }}</span>
            <span><strong>总课时:</strong> {{ summary.totalHours }}h</span>
            <span><strong>已用:</strong> {{ summary.usedHours }}h</span>
            <span><strong>剩余:</strong> {{ summary.remainingHours }}h</span>
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
import { contractColumns } from './columns'

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

const tablePagination = computed(() => ({
  current: pageNum.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (value: number) => `共 ${value} 条记录`
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

const statsCards = computed(() => {
  return [
    { key: 'total', label: '总合同数', value: String(summaryStats.value.totalContracts), tone: 'total', bg: '#eff3ff' },
    { key: 'active', label: '有效合同', value: String(summaryStats.value.activeContracts), tone: 'active', bg: '#dcfce7' },
    { key: 'expiring', label: '即将到期', value: String(summaryStats.value.expiringContracts), tone: 'expiring', bg: '#fef3c7' },
    { key: 'ended', label: '已结束', value: String(summaryStats.value.endedContracts), tone: 'ended', bg: '#f3f4f6' },
    { key: 'amount', label: '合同总金额', value: formatCurrency(Number(summaryStats.value.totalAmount || 0)), tone: 'amount', bg: '#dbeafe' },
  ]
})

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
      throw new Error('导出请求失败')
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = getExportFilename(response.headers.get('content-disposition'))
    link.click()
    window.URL.revokeObjectURL(downloadUrl)
    message.success('合同列表导出成功')
  } catch (_error) {
    message.error('合同列表导出失败')
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
  if (type === 'renew') return '续签'
  if (type === 'supplement') return '补充'
  return '首签'
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
  if (status === 'expiring') return '即将到期'
  if (status === 'expired') return '已结束'
  if (status === 'cancelled') return '已作废'
  return '有效'
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
  const utf8Match = contentDisposition.match(/filename\\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }
  const plainMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i)
  return plainMatch?.[1] || 'contracts.xlsx'
}

onMounted(async () => {
  void loadRenewalReasonMap()
  await loadContracts()
})
</script>

<style scoped>
</style>
