<template>
  <div class="contracts-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">
          合同管理
          <span class="page-title-en">Contract</span>
        </h2>
        <p class="page-subtitle">查看所有合同记录，为老学员续签添加新合同。新增学员时的合同信息会自动同步到此处。</p>
      </div>
      <div class="page-header__actions">
        <button type="button" class="permission-button permission-button--primary" @click="handleRenewEntry()">
          <i class="mdi mdi-plus" aria-hidden="true"></i>
          <span>续签合同</span>
        </button>
      </div>
    </div>

    <section class="contracts-stats">
      <article
        v-for="card in statsCards"
        :key="card.key"
        :class="['contracts-stats__card', `contracts-stats__card--${card.tone}`]"
      >
        <div class="contracts-stats__value">{{ card.value }}</div>
        <div class="contracts-stats__label">{{ card.label }}</div>
      </article>
    </section>

    <section class="permission-card contracts-panel">
      <div class="contracts-filters">
        <div class="contracts-filter-group contracts-filter-group--date">
          <div class="contracts-date-range">
            <input v-model="filters.startDate" type="date" class="contracts-input" />
            <span class="contracts-separator">~</span>
            <input v-model="filters.endDate" type="date" class="contracts-input" />
          </div>
        </div>
        <div class="contracts-filter-group contracts-filter-group--search">
          <input v-model="filters.studentKeyword" type="text" class="contracts-input" placeholder="姓名或学员ID" />
        </div>
        <div class="contracts-filter-group">
          <select v-model="filters.contractType" class="contracts-select">
            <option value="">合同类型</option>
            <option value="initial">首签</option>
            <option value="renew">续签</option>
          </select>
        </div>
        <div class="contracts-filter-group">
          <select v-model="filters.contractStatus" class="contracts-select">
            <option value="">合同状态</option>
            <option value="active">有效</option>
            <option value="expiring">即将到期</option>
            <option value="expired">已结束</option>
          </select>
        </div>
        <div class="contracts-filter-group">
          <select v-model="filters.leadMentorName" class="contracts-select">
            <option value="">班主任</option>
            <option v-for="mentor in mentorOptions" :key="mentor" :value="mentor">{{ mentor }}</option>
          </select>
        </div>
        <div class="contracts-filters__actions">
          <button type="button" class="permission-button permission-button--outline" @click="handleSearch">
            <i class="mdi mdi-magnify" aria-hidden="true"></i>
            搜索
          </button>
          <button type="button" class="permission-button permission-button--ghost" @click="handleReset">
            <i class="mdi mdi-refresh" aria-hidden="true"></i>
            重置
          </button>
          <button type="button" class="permission-button permission-button--outline" @click="handleExport">
            <i class="mdi mdi-file-export-outline" aria-hidden="true"></i>
            导出
          </button>
        </div>
      </div>

      <div class="permission-card__body permission-card__body--flush">
        <table class="permission-table contracts-table">
          <thead>
            <tr>
              <th v-for="column in contractColumns" :key="column.key">{{ column.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in filteredContracts" :key="record.contractId">
              <!-- 合同编号 -->
              <td>{{ record.contractNo }}</td>

              <!-- 学员 -->
              <td>
                <button type="button" class="contract-link" @click="handleDetailEntry(record)">
                  {{ record.studentName || '-' }}
                </button>
              </td>

              <!-- 班主任 -->
              <td>{{ record.leadMentorName || '-' }}</td>

              <!-- 合同类型 -->
              <td>
                <span :class="['contract-pill', `contract-pill--${getTypeTone(record.contractType)}`]">
                  {{ formatContractType(record.contractType) }}
                </span>
              </td>

              <!-- 金额 -->
              <td>
                <strong class="contract-amount-value">{{ formatCurrency(record.contractAmount) }}</strong>
              </td>

              <!-- 课时 -->
              <td>
                <div class="contract-hours-value">
                  <strong>{{ record.remainingHours ?? record.totalHours }}</strong>
                  <span>/ {{ record.totalHours }}h</span>
                </div>
              </td>

              <!-- 有效期 -->
              <td>
                <div class="contract-cell-block contract-cell-block--period">
                  <span class="contract-date">{{ formatDate(record.startDate) }}</span>
                  <span class="contract-date-separator">~</span>
                  <span class="contract-date">{{ formatDate(record.endDate) }}</span>
                </div>
              </td>

              <!-- 续签原因 -->
              <td>{{ record.renewalReason || '-' }}</td>

              <!-- 状态 -->
              <td>
                <span :class="['contract-status-tag', `contract-status-tag--${getStatusTone(resolveStatus(record))}`]">
                  {{ formatContractStatus(resolveStatus(record)) }}
                </span>
              </td>

              <!-- 操作 -->
              <td>
                <div class="contract-actions">
                  <button type="button" class="contract-action" @click="handleDetailEntry(record)">详情</button>
                  <button type="button" class="contract-action contract-action--primary" @click="handleRenewEntry(record)">
                    续签
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredContracts.length">
              <td :colspan="contractColumns.length" class="contracts-empty">暂无合同数据</td>
            </tr>
          </tbody>
        </table>
        <div class="contracts-summary-bar">
          <span><strong>总金额:</strong> {{ formatCurrency(summary.totalAmount) }}</span>
          <span><strong>总课时:</strong> {{ summary.totalHours }}h</span>
          <span><strong>已用:</strong> {{ summary.usedHours }}h</span>
          <span><strong>剩余:</strong> {{ summary.remainingHours }}h</span>
        </div>
      </div>
    </section>

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
import { contractColumns } from './columns'

interface ContractFilters {
  startDate: string
  endDate: string
  studentKeyword: string
  contractType: string
  contractStatus: string
  leadMentorName: string
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

const filters = reactive<ContractFilters>({
  startDate: '',
  endDate: '',
  studentKeyword: '',
  contractType: '',
  contractStatus: '',
  leadMentorName: '',
})

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

const filteredContracts = computed(() => {
  return contractRows.value.filter((record) => {
    const status = resolveStatus(record)
    const startDate = record.startDate ? new Date(record.startDate).getTime() : 0
    const endDate = record.endDate ? new Date(record.endDate).getTime() : 0
    const rangeStart = filters.startDate ? new Date(filters.startDate).getTime() : null
    const rangeEnd = filters.endDate ? new Date(filters.endDate).getTime() : null
    const keyword = filters.studentKeyword.trim().toLowerCase()

    if (rangeStart && endDate < rangeStart) return false
    if (rangeEnd && startDate > rangeEnd) return false
    if (keyword) {
      const matchesName = (record.studentName || '').toLowerCase().includes(keyword)
      const matchesId = String(record.studentId || '').includes(keyword)
      if (!matchesName && !matchesId) return false
    }
    if (filters.contractType && record.contractType !== filters.contractType) return false
    if (filters.contractStatus && status !== filters.contractStatus) return false
    if (filters.leadMentorName && record.leadMentorName !== filters.leadMentorName) return false
    return true
  })
})

const summary = computed(() =>
  filteredContracts.value.reduce(
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
  const activeContracts = filteredContracts.value.filter((record) => resolveStatus(record) === 'active').length
  const expiringContracts = filteredContracts.value.filter((record) => resolveStatus(record) === 'expiring').length
  const endedContracts = filteredContracts.value.filter((record) => resolveStatus(record) === 'expired').length
  const totalContracts = filteredContracts.value.length || summaryStats.value.totalContracts
  const totalAmount = filteredContracts.value.length ? summary.value.totalAmount : Number(summaryStats.value.totalAmount || 0)

  return [
    { key: 'total', label: '总合同数', value: String(totalContracts), tone: 'total' },
    { key: 'active', label: '有效合同', value: String(activeContracts || summaryStats.value.activeContracts), tone: 'active' },
    { key: 'expiring', label: '即将到期', value: String(expiringContracts || summaryStats.value.expiringContracts), tone: 'expiring' },
    { key: 'ended', label: '已结束', value: String(endedContracts || summaryStats.value.endedContracts), tone: 'ended' },
    { key: 'amount', label: '合同总金额', value: formatCurrency(totalAmount), tone: 'amount' },
  ]
})

const loadContracts = async () => {
  loading.value = true
  try {
    const params: ContractListParams = {
      pageNum: 1,
      pageSize: 200,
      studentName: filters.studentKeyword || undefined,
      contractType: filters.contractType || undefined,
      contractStatus: filters.contractStatus && filters.contractStatus !== 'expiring' ? filters.contractStatus : undefined,
    }

    const [listResponse, statsResponse] = await Promise.all([
      getContractList(params),
      getContractStats(params),
    ])

    contractRows.value = Array.isArray(listResponse?.rows) ? listResponse.rows : []
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
  await loadContracts()
}

const handleReset = async () => {
  filters.startDate = ''
  filters.endDate = ''
  filters.studentKeyword = ''
  filters.contractType = ''
  filters.contractStatus = ''
  filters.leadMentorName = ''
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
    if (filters.studentKeyword.trim()) {
      params.set('studentName', filters.studentKeyword.trim())
    }
    if (filters.contractType) {
      params.set('contractType', filters.contractType)
    }
    if (filters.contractStatus && filters.contractStatus !== 'expiring') {
      params.set('contractStatus', filters.contractStatus)
    }

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

const formatContractStatus = (status: string) => {
  if (status === 'expiring') return '即将到期'
  if (status === 'expired') return '已结束'
  return '有效'
}

const getTypeTone = (type?: string) => {
  if (type === 'renew') return 'renew'
  if (type === 'supplement') return 'supplement'
  return 'initial'
}

const getStatusTone = (status: string) => {
  if (status === 'expiring') return 'warning'
  if (status === 'expired') return 'muted'
  return 'success'
}

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

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
  await loadContracts()
})
</script>

<style scoped lang="scss">
.contracts-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.page-title {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.page-title-en {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text2);
}

.page-subtitle {
  margin: 10px 0 0;
  color: var(--text2);
  font-size: 14px;
}

.page-header__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.permission-button {
  border: none;
  border-radius: 12px;
  padding: 0 18px;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.permission-button:hover {
  transform: translateY(-1px);
}

.permission-button--primary {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.24);
}

.permission-button--outline {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}

.permission-button--ghost {
  background: transparent;
  color: var(--text2);
  border: 1px dashed var(--border);
}

.contracts-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.contracts-stats__card {
  border-radius: 18px;
  padding: 18px 20px;
  border: 1px solid var(--border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  text-align: center;
}

.contracts-stats__card--total {
  background: var(--primary-light);
}

.contracts-stats__card--active {
  background: #dcfce7;
}

.contracts-stats__card--expiring {
  background: #fef3c7;
}

.contracts-stats__card--ended {
  background: var(--bg);
}

.contracts-stats__card--amount {
  background: #dbeafe;
}

.contracts-stats__label {
  font-size: 13px;
  color: var(--text2);
}

.contracts-stats__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 10px;
}

.contracts-panel {
  overflow: hidden;
}

.permission-card {
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border);
  padding: 20px;
}

.permission-card__body--flush {
  overflow-x: auto;
  margin: 0 -20px;
}

.contracts-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.contracts-filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.contracts-filter-group--date {
  min-width: 296px;
}

.contracts-filter-group--search {
  min-width: 200px;
}

.contracts-input,
.contracts-select {
  min-height: 38px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #fff;
  padding: 0 12px;
  color: var(--text);
  outline: none;
  font-size: 13px;
}

.contracts-input:focus,
.contracts-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}

.contracts-date-range {
  display: flex;
  gap: 8px;
  align-items: center;
}

.contracts-date-range .contracts-input {
  width: 140px;
}

.contracts-filter-group--search .contracts-input {
  width: 200px;
}

.contracts-select {
  width: 140px;
}

.contracts-separator {
  color: var(--muted);
  font-size: 13px;
}

.contracts-filters__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.permission-table {
  width: 100%;
  min-width: 1180px;
  border-collapse: collapse;
}

.permission-table th,
.permission-table td {
  padding: 16px 14px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.permission-table thead th {
  background: var(--bg);
  color: var(--text2);
  font-size: 13px;
  font-weight: 700;
}

.contract-cell-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contract-cell-block--period {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.contract-primary-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contract-no {
  font-family: 'SFMono-Regular', 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.contract-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
}

.contract-pill--initial {
  background: var(--primary-light);
  color: var(--primary);
}

.contract-pill--renew {
  background: #dcfce7;
  color: #16a34a;
}

.contract-pill--supplement {
  background: #f3e8ff;
  color: #9333ea;
}

.contract-link {
  border: none;
  background: transparent;
  padding: 0;
  color: var(--primary);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
}

.contract-link:hover {
  text-decoration: underline;
}

.contract-id-badge {
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
}

.contract-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.contract-meta-label {
  color: var(--muted);
}

.contract-meta-value {
  color: var(--text2);
  font-weight: 500;
}

.contract-amount-row,
.contract-hours-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.contract-amount-label,
.contract-hours-label {
  color: var(--muted);
  min-width: 32px;
}

.contract-amount-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.contract-hours-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.contract-hours-value strong {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.contract-hours-value span {
  color: var(--text2);
  font-size: 12px;
}

.contract-date {
  font-size: 13px;
  color: var(--text2);
}

.contract-date-separator {
  color: var(--muted);
}

.contract-status-tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
}

.contract-status-tag--success {
  background: #dcfce7;
  color: #16a34a;
}

.contract-status-tag--warning {
  background: #fef3c7;
  color: #d97706;
}

.contract-status-tag--muted {
  background: var(--bg);
  color: var(--muted);
}

.contract-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.contract-action {
  border: none;
  background: transparent;
  color: var(--text2);
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.contract-action:hover {
  color: var(--text);
}

.contract-action--primary {
  color: var(--primary);
}

.contract-action--primary:hover {
  color: var(--primary-dark);
}

.contracts-empty {
  padding: 34px 16px;
  text-align: center;
  color: var(--muted);
}

.contracts-summary-bar {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--bg);
  color: var(--text2);
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 1280px) {
  .contracts-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }

  .page-header__actions {
    width: 100%;
  }

  .contracts-stats {
    grid-template-columns: 1fr;
  }

  .contracts-filter-group,
  .contracts-filter-group--date,
  .contracts-filter-group--search {
    width: 100%;
    min-width: 0;
  }

  .contracts-date-range {
    width: 100%;
  }

  .contracts-date-range .contracts-input,
  .contracts-filter-group--search .contracts-input,
  .contracts-select {
    width: 100%;
  }

  .contracts-filters__actions {
    align-items: stretch;
    width: 100%;
  }
}
</style>
