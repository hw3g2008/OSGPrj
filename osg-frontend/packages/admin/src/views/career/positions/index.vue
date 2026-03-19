<template>
  <div class="positions-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">
          岗位管理
          <span class="page-title-en">Job Tracker</span>
        </h2>
        <p class="page-subtitle">管理各大公司招聘岗位信息，支持批量导入和学员关联追踪</p>
      </div>
      <div class="page-header__actions">
        <div class="positions-page__toggle">
          <button
            type="button"
            :class="['positions-page__toggle-button', { 'positions-page__toggle-button--active': viewMode === 'drilldown' }]"
            @click="viewMode = 'drilldown'"
          >
            下钻视图
          </button>
          <button
            type="button"
            :class="['positions-page__toggle-button', { 'positions-page__toggle-button--active': viewMode === 'list' }]"
            @click="viewMode = 'list'"
          >
            列表视图
          </button>
        </div>
        <span class="positions-page__traffic">总浏览 12,580 次</span>
        <button type="button" class="permission-button permission-button--outline" :disabled="downloading" @click="handleExport(false)">
          <i class="mdi mdi-download" aria-hidden="true"></i>
          <span>{{ downloading ? '导出中...' : '导出' }}</span>
        </button>
        <button type="button" class="permission-button permission-button--outline" @click="batchVisible = true">
          <i class="mdi mdi-file-excel-box-outline" aria-hidden="true"></i>
          <span>批量上传</span>
        </button>
        <button type="button" class="permission-button permission-button--outline" :disabled="downloading" @click="handleExport(true)">
          <i class="mdi mdi-file-arrow-down-outline" aria-hidden="true"></i>
          <span>下载模板</span>
        </button>
        <button type="button" class="permission-button permission-button--primary" @click="openCreateModal">
          <i class="mdi mdi-plus" aria-hidden="true"></i>
          <span>新增岗位</span>
        </button>
      </div>
    </div>

    <section class="positions-stats">
      <article
        v-for="card in statsCards"
        :key="card.key"
        :class="['positions-stats__card', `positions-stats__card--${card.tone}`]"
      >
        <span class="positions-stats__label">{{ card.label }}</span>
        <strong class="positions-stats__value">{{ card.value }}</strong>
      </article>
    </section>

    <section class="permission-card positions-panel">
      <div class="positions-filters">
        <label class="positions-field">
          <span>岗位分类</span>
          <select v-model="filters.positionCategory" class="positions-select">
            <option value="">全部</option>
            <option value="summer">暑期实习</option>
            <option value="fulltime">全职招聘</option>
            <option value="offcycle">非常规周期</option>
            <option value="spring">春季实习</option>
            <option value="events">招聘活动</option>
          </select>
        </label>
        <label class="positions-field">
          <span>行业</span>
          <select v-model="filters.industry" class="positions-select">
            <option value="">全部</option>
            <option v-for="option in industryOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label class="positions-field">
          <span>公司</span>
          <select v-model="filters.companyName" class="positions-select">
            <option value="">全部</option>
            <option v-for="option in companyOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label class="positions-field">
          <span>地区</span>
          <select v-model="filters.city" class="positions-select">
            <option value="">全部</option>
            <option v-for="option in cityOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label class="positions-field">
          <span>状态</span>
          <select v-model="filters.displayStatus" class="positions-select">
            <option value="">全部</option>
            <option value="visible">展示中</option>
            <option value="hidden">已隐藏</option>
            <option value="expired">已过期</option>
          </select>
        </label>
        <label class="positions-field">
          <span>招聘周期</span>
          <select v-model="filters.recruitmentCycle" class="positions-select">
            <option value="">全部</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </label>
        <label class="positions-field">
          <span>发布时间</span>
          <div class="positions-date-range">
            <input v-model="filters.beginPublishTime" type="date" class="positions-input" />
            <input v-model="filters.endPublishTime" type="date" class="positions-input" />
          </div>
        </label>
        <label class="positions-field positions-field--search">
          <span>搜索</span>
          <input v-model="filters.keyword" type="text" class="positions-input" placeholder="搜索岗位名称..." />
        </label>
        <div class="positions-filters__actions">
          <button type="button" class="permission-button permission-button--outline" @click="handleSearch">搜索</button>
          <button type="button" class="permission-button permission-button--ghost" @click="handleReset">
            <i class="mdi mdi-refresh" aria-hidden="true"></i>
            <span>重置</span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="positions-loading">
        <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
        <span>正在加载岗位数据...</span>
      </div>

      <template v-else>
        <div v-if="viewMode === 'drilldown'" class="positions-drilldown">
          <section v-for="industry in drillDownRows" :key="industry.industry" class="positions-drilldown__industry">
            <button type="button" class="positions-drilldown__industry-head" @click="toggleIndustry(industry.industry)">
              <div>
                <strong>{{ industry.industry }}</strong>
                <span>{{ industry.companyCount }} 家公司 · {{ industry.positionCount }} 个岗位</span>
              </div>
              <div class="positions-drilldown__industry-meta">
                <span class="positions-drilldown__pill positions-drilldown__pill--success">{{ industry.openCount }} 开放中</span>
                <span class="positions-drilldown__pill">{{ industry.studentCount }} 学员申请</span>
                <i :class="['mdi', expandedIndustries.has(industry.industry) ? 'mdi-chevron-down' : 'mdi-chevron-right']" aria-hidden="true"></i>
              </div>
            </button>

            <div v-if="expandedIndustries.has(industry.industry)" class="positions-drilldown__companies">
              <section v-for="company in industry.companies" :key="`${industry.industry}-${company.companyName}`" class="positions-drilldown__company">
                <button type="button" class="positions-drilldown__company-head" @click="toggleCompany(industry.industry, company.companyName)">
                  <div class="positions-drilldown__company-main">
                    <div class="positions-drilldown__logo">{{ getCompanyInitials(company.companyName) }}</div>
                    <div>
                      <strong>{{ company.companyName }}</strong>
                      <span>{{ company.positionCount }} 岗位 · {{ company.openCount }} 开放中 · {{ company.studentCount }} 学员申请</span>
                    </div>
                  </div>
                  <div class="positions-drilldown__company-actions">
                    <a v-if="company.companyWebsite" :href="company.companyWebsite" target="_blank" rel="noreferrer" class="positions-drilldown__link">官网</a>
                    <i :class="['mdi', isCompanyExpanded(industry.industry, company.companyName) ? 'mdi-chevron-down' : 'mdi-chevron-right']" aria-hidden="true"></i>
                  </div>
                </button>

                <div v-if="isCompanyExpanded(industry.industry, company.companyName)" class="positions-drilldown__position-list">
                  <article v-for="position in company.positions" :key="position.positionId" class="positions-drilldown__position-card">
                    <div class="positions-drilldown__position-main">
                      <div>
                        <div class="positions-drilldown__position-name">
                          <a v-if="position.positionUrl" :href="position.positionUrl" target="_blank" rel="noreferrer">{{ position.positionName }}</a>
                          <span v-else>{{ position.positionName }}</span>
                        </div>
                        <p class="positions-drilldown__note">{{ position.applicationNote || '暂无投递备注' }}</p>
                      </div>
                      <div class="positions-drilldown__tags">
                        <span class="positions-tag positions-tag--info">{{ formatCategory(position.positionCategory) }}</span>
                        <span :class="['positions-tag', `positions-tag--${getStatusTone(position.displayStatus)}`]">{{ formatStatus(position.displayStatus) }}</span>
                      </div>
                    </div>
                    <div class="positions-drilldown__position-meta">
                      <span>{{ position.department || '未填写部门' }}</span>
                      <span>{{ position.city }}</span>
                      <span>{{ position.recruitmentCycle }}</span>
                      <span>{{ formatShortDate(position.publishTime) }}</span>
                      <span :class="{ 'positions-drilldown__deadline--warn': isDeadlineSoon(position.deadline) }">{{ formatShortDate(position.deadline) }}</span>
                      <button type="button" class="positions-link-button" @click="openStudentsModal(position)">{{ position.studentCount || 0 }} 学员</button>
                      <button type="button" class="positions-link-button" @click="openEditModal(position)">编辑</button>
                    </div>
                  </article>
                </div>
              </section>
            </div>
          </section>
        </div>

        <div v-else class="permission-card__body permission-card__body--flush">
          <table class="permission-table positions-table">
            <thead>
              <tr>
                <th v-for="column in positionColumns" :key="column.key">
                  <button
                    v-if="column.sortable"
                    type="button"
                    class="positions-sort-button"
                    @click="togglePublishSort"
                  >
                    <span>{{ column.label }}</span>
                    <i class="mdi mdi-swap-vertical" aria-hidden="true"></i>
                  </button>
                  <span v-else>{{ column.label }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in sortedListRows" :key="record.positionId">
                <td>{{ record.industry }}</td>
                <td>
                  <div class="positions-company-cell">
                    <strong>{{ record.companyName }}</strong>
                    <span>{{ record.companyType || '-' }}</span>
                  </div>
                </td>
                <td>
                  <a v-if="record.positionUrl" :href="record.positionUrl" target="_blank" rel="noreferrer" class="positions-link">{{ record.positionName }}</a>
                  <span v-else>{{ record.positionName }}</span>
                </td>
                <td>{{ formatCategory(record.positionCategory) }}</td>
                <td>{{ record.department || '-' }}</td>
                <td>{{ record.city }}</td>
                <td>{{ record.recruitmentCycle }}</td>
                <td>{{ formatShortDate(record.publishTime) }}</td>
                <td :class="{ 'positions-deadline--warn': isDeadlineSoon(record.deadline) }">{{ formatShortDate(record.deadline) }}</td>
                <td>
                  <span :class="['positions-tag', `positions-tag--${getStatusTone(record.displayStatus)}`]">{{ formatStatus(record.displayStatus) }}</span>
                </td>
                <td>
                  <button type="button" class="positions-link-button" @click="openStudentsModal(record)">{{ record.studentCount || 0 }}</button>
                </td>
                <td>
                  <div class="positions-actions">
                    <button type="button" class="positions-link-button" @click="openEditModal(record)">编辑</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!sortedListRows.length">
                <td :colspan="positionColumns.length" class="positions-empty">暂无岗位数据</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="positions-footer">
          <span>共 {{ companyOptions.length }} 家公司 · {{ visibleRowCount }} 个岗位 · {{ stats.openPositions }} 开放中 · {{ stats.closedPositions }} 已关闭</span>
          <span>OA = Online Assessment · VI = Video Interview · HV = Hirevue · AC = Assessment Centre · SD = Super Day</span>
        </div>
      </template>
    </section>

    <PositionFormModal
      v-model:visible="formVisible"
      :position="editingPosition"
      :company-options="companyOptions"
      @submit="handleSavePosition"
    />
    <BatchUploadModal
      v-model:visible="batchVisible"
      @submit="handleBatchUpload"
    />
    <PositionStudentsModal
      v-model:visible="studentsVisible"
      :position-name="selectedPosition?.positionName || '岗位'"
      :loading="studentsLoading"
      :rows="studentRows"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { getToken } from '@osg/shared/utils'
import { getJobOverviewList, type JobOverviewRow } from '@osg/shared/api/admin/jobOverview'
import {
  createPosition,
  getPositionDrillDown,
  getPositionList,
  getPositionStats,
  updatePosition,
  uploadPositionFile,
  type DrillDownIndustry,
  type PositionListItem,
  type PositionListParams,
  type PositionPayload,
  type PositionStats
} from '@osg/shared/api/admin/position'
import { positionColumns } from './columns'
import BatchUploadModal from './components/BatchUploadModal.vue'
import PositionFormModal from './components/PositionFormModal.vue'
import PositionStudentsModal from './components/PositionStudentsModal.vue'

interface PositionStudentRow {
  studentId: number
  studentName: string
  positionName: string
  status: string
  statusTone?: 'info' | 'warning' | 'success' | 'danger' | 'default'
  usedHours: number
}

const loading = ref(false)
const downloading = ref(false)
const positions = ref<PositionListItem[]>([])
const stats = ref<PositionStats>({
  totalPositions: 0,
  openPositions: 0,
  closingSoonPositions: 0,
  closedPositions: 0,
  studentApplications: 0
})
const drillDownRows = ref<DrillDownIndustry[]>([])
const viewMode = ref<'drilldown' | 'list'>('drilldown')
const publishSort = ref<'desc' | 'asc'>('desc')
const formVisible = ref(false)
const batchVisible = ref(false)
const studentsVisible = ref(false)
const studentsLoading = ref(false)
const editingPosition = ref<PositionListItem | null>(null)
const selectedPosition = ref<PositionListItem | null>(null)
const selectedPositionApplications = ref<JobOverviewRow[]>([])
const expandedIndustries = ref<Set<string>>(new Set())
const expandedCompanies = ref<Set<string>>(new Set())

const filters = reactive<PositionListParams>({
  pageNum: 1,
  pageSize: 100,
  keyword: '',
  positionCategory: '',
  industry: '',
  companyName: '',
  city: '',
  displayStatus: '',
  recruitmentCycle: '',
  beginPublishTime: '',
  endPublishTime: ''
})

const industryOptions = computed(() =>
  Array.from(new Set(positions.value.map(item => item.industry).filter(Boolean)))
)

const companyOptions = computed(() =>
  Array.from(new Set(positions.value.map(item => item.companyName).filter(Boolean)))
)

const cityOptions = computed(() =>
  Array.from(new Set(positions.value.map(item => item.city).filter(Boolean)))
)

const statsCards = computed(() => [
  { key: 'total', label: '总岗位数', value: stats.value.totalPositions, tone: 'primary' },
  { key: 'open', label: '开放中', value: stats.value.openPositions, tone: 'success' },
  { key: 'closing', label: '即将截止', value: stats.value.closingSoonPositions, tone: 'warning' },
  { key: 'closed', label: '已关闭', value: stats.value.closedPositions, tone: 'muted' },
  { key: 'students', label: '学员申请', value: stats.value.studentApplications, tone: 'info' }
])

const sortedListRows = computed(() => {
  const rows = [...positions.value]
  rows.sort((left, right) => {
    const leftTime = left.publishTime ? new Date(left.publishTime).getTime() : 0
    const rightTime = right.publishTime ? new Date(right.publishTime).getTime() : 0
    return publishSort.value === 'desc' ? rightTime - leftTime : leftTime - rightTime
  })
  return rows
})

const visibleRowCount = computed(() => positions.value.length)

const studentRows = computed<PositionStudentRow[]>(() => {
  const positionName = selectedPosition.value?.positionName
  if (!positionName) {
    return []
  }
  return selectedPositionApplications.value
    .filter((row) => row.positionName === positionName)
    .map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName || '-',
      positionName: row.positionName,
      status: row.coachingStatus || '未申请',
      statusTone: getStudentStatusTone(row.coachingStatus),
      usedHours: row.hoursUsed || 0
    }))
})

const toRequestParams = (): PositionListParams => ({
  ...filters,
  keyword: filters.keyword?.trim() || undefined,
  positionCategory: filters.positionCategory || undefined,
  industry: filters.industry || undefined,
  companyName: filters.companyName || undefined,
  city: filters.city || undefined,
  displayStatus: filters.displayStatus || undefined,
  recruitmentCycle: filters.recruitmentCycle || undefined,
  beginPublishTime: filters.beginPublishTime || undefined,
  endPublishTime: filters.endPublishTime || undefined
})

const syncExpandedState = (rows: DrillDownIndustry[]) => {
  expandedIndustries.value = new Set(rows.slice(0, 2).map(item => item.industry))
  expandedCompanies.value = new Set(
    rows.flatMap(item => item.companies.slice(0, 1).map(company => `${item.industry}::${company.companyName}`))
  )
}

const loadPage = async () => {
  try {
    loading.value = true
    const params = toRequestParams()
    const [listRes, statsRes, drillRes] = await Promise.all([
      getPositionList(params),
      getPositionStats(params),
      getPositionDrillDown(params)
    ])
    positions.value = listRes.rows || []
    stats.value = statsRes
    drillDownRows.value = drillRes || []
    syncExpandedState(drillDownRows.value)
  } catch (_error) {
    message.error('加载岗位数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  await loadPage()
}

const handleReset = async () => {
  filters.keyword = ''
  filters.positionCategory = ''
  filters.industry = ''
  filters.companyName = ''
  filters.city = ''
  filters.displayStatus = ''
  filters.recruitmentCycle = ''
  filters.beginPublishTime = ''
  filters.endPublishTime = ''
  await loadPage()
}

const openCreateModal = () => {
  editingPosition.value = null
  formVisible.value = true
}

const openEditModal = (record: PositionListItem) => {
  editingPosition.value = record
  formVisible.value = true
}

const openStudentsModal = async (record: PositionListItem) => {
  selectedPosition.value = record
  studentsVisible.value = true
  selectedPositionApplications.value = []
  studentsLoading.value = true
  try {
    const response = await getJobOverviewList({ companyName: record.companyName })
    selectedPositionApplications.value = response.rows || []
  } catch (_error) {
    message.error('加载岗位关联学员失败')
  } finally {
    studentsLoading.value = false
  }
}

const handleSavePosition = async (payload: PositionPayload) => {
  try {
    if (payload.positionId) {
      await updatePosition(payload)
      message.success('岗位已更新')
    } else {
      await createPosition(payload)
      message.success('岗位已新增')
    }
    formVisible.value = false
    await loadPage()
  } catch (_error) {
    message.error(payload.positionId ? '岗位更新失败' : '岗位新增失败')
  }
}

const handleBatchUpload = async (file: File) => {
  try {
    const result = await uploadPositionFile(file)
    batchVisible.value = false
    await loadPage()
    if (result.duplicateCount > 0) {
      message.warning(`导入 ${result.successCount} 条，重复跳过 ${result.duplicateCount} 条`)
    } else {
      message.success(`成功导入 ${result.successCount} 条岗位`)
    }
  } catch (_error) {
    message.error('岗位批量上传失败')
  }
}

const handleExport = async (template: boolean) => {
  try {
    downloading.value = true
    const token = getToken()
    const params = new URLSearchParams()
    Object.entries(toRequestParams()).forEach(([key, value]) => {
      if (!value) {
        return
      }
      params.append(key, String(value))
    })
    if (template) {
      params.append('template', 'true')
    }

    const response = await fetch(`/api/admin/position/export?${params.toString()}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    })

    if (!response.ok) {
      throw new Error('岗位导出失败')
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = getExportFilename(response.headers.get('content-disposition'), template)
    link.click()
    window.URL.revokeObjectURL(downloadUrl)
    message.success(template ? '模板下载成功' : '岗位导出成功')
  } catch (_error) {
    message.error(template ? '模板下载失败' : '岗位导出失败')
  } finally {
    downloading.value = false
  }
}

const toggleIndustry = (industry: string) => {
  const next = new Set(expandedIndustries.value)
  if (next.has(industry)) {
    next.delete(industry)
  } else {
    next.add(industry)
  }
  expandedIndustries.value = next
}

const toggleCompany = (industry: string, companyName: string) => {
  const key = `${industry}::${companyName}`
  const next = new Set(expandedCompanies.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  expandedCompanies.value = next
}

const isCompanyExpanded = (industry: string, companyName: string) => expandedCompanies.value.has(`${industry}::${companyName}`)

const togglePublishSort = () => {
  publishSort.value = publishSort.value === 'desc' ? 'asc' : 'desc'
}

const getCompanyInitials = (companyName: string) =>
  companyName
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')

const formatCategory = (value?: string) => {
  if (value === 'fulltime') return '全职招聘'
  if (value === 'offcycle') return '非常规周期'
  if (value === 'spring') return '春季实习'
  if (value === 'events') return '招聘活动'
  return '暑期实习'
}

const formatStatus = (value?: string) => {
  if (value === 'hidden') return '已隐藏'
  if (value === 'expired') return '已过期'
  return '展示中'
}

const getStatusTone = (value?: string) => {
  if (value === 'hidden') return 'muted'
  if (value === 'expired') return 'warning'
  return 'success'
}

const getStudentStatusTone = (value?: string): PositionStudentRow['statusTone'] => {
  if (value === '辅导中') return 'info'
  if (value === '待审批') return 'warning'
  return 'default'
}

const isDeadlineSoon = (value?: string) => {
  if (!value) {
    return false
  }
  const target = new Date(value).getTime()
  const now = Date.now()
  return target >= now && target - now <= 7 * 24 * 60 * 60 * 1000
}

const formatShortDate = (value?: string) => (value ? value.slice(5, 10) : '—')

const getExportFilename = (contentDisposition: string | null, template: boolean) => {
  if (!contentDisposition) {
    return template ? '岗位导入模板.xlsx' : '岗位列表.xlsx'
  }
  const match = contentDisposition.match(/filename\\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i)
  const encoded = match?.[1] || match?.[2]
  return encoded ? decodeURIComponent(encoded) : (template ? '岗位导入模板.xlsx' : '岗位列表.xlsx')
}

onMounted(() => {
  void loadPage()
})
</script>

<style scoped lang="scss">
.permission-card {
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border, #e2e8f0);
  padding: 20px;
}

.permission-card__body--flush {
  overflow-x: auto;
  margin: 0 -20px;
}

.positions-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.page-title {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
  color: #10213a;
  font-size: 30px;
}

.page-title-en {
  font-size: 16px;
  color: #6b7f98;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.page-subtitle {
  margin: 8px 0 0;
  max-width: 720px;
  color: #62748d;
}

.page-header__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.positions-page__toggle {
  display: inline-flex;
  border: 1px solid #d5deea;
  border-radius: 999px;
  overflow: hidden;
  background: #fff;
}

.positions-page__toggle-button {
  border: none;
  background: transparent;
  color: #3b5168;
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
}

.positions-page__toggle-button--active {
  background: #205493;
  color: #fff;
}

.positions-page__traffic {
  padding: 10px 14px;
  border-radius: 999px;
  background: #edf4fb;
  color: #385675;
  font-size: 13px;
}

.positions-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.positions-stats__card {
  border-radius: 20px;
  padding: 18px;
  color: #10213a;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.positions-stats__card--primary { background: linear-gradient(180deg, #dbeafe 0%, #eff6ff 100%); }
.positions-stats__card--success { background: linear-gradient(180deg, #dcfce7 0%, #f0fdf4 100%); }
.positions-stats__card--warning { background: linear-gradient(180deg, #fef3c7 0%, #fffbeb 100%); }
.positions-stats__card--muted { background: linear-gradient(180deg, #f3f4f6 0%, #f8fafc 100%); }
.positions-stats__card--info { background: linear-gradient(180deg, #dbeafe 0%, #eff6ff 100%); }

.positions-stats__label {
  font-size: 13px;
  color: #61748e;
}

.positions-stats__value {
  display: block;
  margin-top: 8px;
  font-size: 30px;
}

.positions-panel {
  padding: 20px;
}

.positions-filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.positions-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #29405c;
  font-size: 13px;
}

.positions-field--search {
  grid-column: span 2;
}

.positions-input,
.positions-select {
  border: 1px solid #d6dfeb;
  border-radius: 14px;
  min-height: 42px;
  padding: 0 14px;
  background: #fff;
  color: #10213a;
}

.positions-date-range {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.positions-filters__actions {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.positions-loading,
.positions-empty {
  padding: 28px;
  text-align: center;
  color: #60748e;
}

.positions-drilldown {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.positions-drilldown__industry,
.positions-drilldown__company {
  border: 1px solid #e8eef6;
  border-radius: 20px;
  overflow: hidden;
  background: #fff;
}

.positions-drilldown__industry-head,
.positions-drilldown__company-head {
  width: 100%;
  border: none;
  background: linear-gradient(180deg, #fff 0%, #f8fbff 100%);
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  text-align: left;
  cursor: pointer;
}

.positions-drilldown__industry-head strong,
.positions-drilldown__company-head strong {
  display: block;
  color: #10213a;
  font-size: 17px;
}

.positions-drilldown__industry-head span,
.positions-drilldown__company-head span {
  color: #6a7f98;
  font-size: 13px;
}

.positions-drilldown__industry-meta,
.positions-drilldown__company-actions,
.positions-drilldown__company-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.positions-drilldown__pill {
  border-radius: 999px;
  padding: 6px 10px;
  background: #edf2f7;
  color: #415a76;
  font-size: 12px;
  font-weight: 600;
}

.positions-drilldown__pill--success {
  background: #dcfce7;
  color: #15803d;
}

.positions-drilldown__companies {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.positions-drilldown__logo {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #1d4e89 0%, #3b82f6 100%);
  color: #fff;
  font-weight: 700;
}

.positions-drilldown__position-list {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.positions-drilldown__position-card {
  border: 1px solid #edf2f7;
  border-radius: 16px;
  padding: 16px;
  background: #fbfdff;
}

.positions-drilldown__position-main,
.positions-drilldown__position-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.positions-drilldown__position-main {
  align-items: flex-start;
}

.positions-drilldown__position-name a,
.positions-link {
  color: #205493;
  font-weight: 700;
  text-decoration: none;
}

.positions-drilldown__note {
  margin: 6px 0 0;
  color: #84631f;
  font-size: 13px;
}

.positions-drilldown__tags,
.positions-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.positions-tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
}

.positions-tag--info { background: #dbeafe; color: #1d4ed8; }
.positions-tag--success { background: #dcfce7; color: #15803d; }
.positions-tag--warning { background: #fef3c7; color: #92400e; }
.positions-tag--muted { background: #f3f4f6; color: #475569; }

.positions-link-button {
  border: none;
  background: transparent;
  color: #205493;
  font-weight: 600;
  cursor: pointer;
}

.positions-drilldown__deadline--warn,
.positions-deadline--warn {
  color: #c2410c;
  font-weight: 700;
}

.positions-table {
  margin-top: 18px;
}

.positions-company-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.positions-sort-button {
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.positions-footer {
  margin-top: 18px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: #61748e;
  font-size: 13px;
}

@media (max-width: 1280px) {
  .positions-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .positions-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .page-header,
  .positions-footer,
  .positions-drilldown__position-main,
  .positions-drilldown__position-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .positions-stats,
  .positions-filters,
  .positions-date-range {
    grid-template-columns: 1fr;
  }

  .positions-field--search {
    grid-column: auto;
  }
}
</style>
