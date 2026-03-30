<template>
  <div class="positions-page">
    <div class="page-header">
      <div class="positions-page__heading">
        <h2 class="page-title">
          岗位管理
          <span class="page-title-en">Job Tracker</span>
        </h2>
        <p class="page-subtitle">管理各大公司招聘岗位信息，支持批量导入和学员关联追踪</p>
      </div>

      <div class="positions-header-actions">
        <div class="positions-header-actions__top">
          <div class="positions-view-toggle">
            <button
              type="button"
              :class="['positions-view-toggle__button', { 'positions-view-toggle__button--active': viewMode === 'drilldown' }]"
              data-tab="drilldown"
              :aria-pressed="viewMode === 'drilldown'"
              @click="viewMode = 'drilldown'"
            >
              <i class="mdi mdi-file-tree" aria-hidden="true"></i>
              <span>下钻视图</span>
            </button>
            <button
              type="button"
              :class="['positions-view-toggle__button', { 'positions-view-toggle__button--active': viewMode === 'list' }]"
              data-tab="list"
              :aria-pressed="viewMode === 'list'"
              @click="viewMode = 'list'"
            >
              <i class="mdi mdi-format-list-bulleted" aria-hidden="true"></i>
              <span>列表视图</span>
            </button>
          </div>

          <div v-if="meta.trafficSummary" class="positions-page__traffic">
            <i class="mdi mdi-eye" aria-hidden="true"></i>
            <span>总浏览 {{ meta.trafficSummary.totalViews.toLocaleString('en-US') }} 次</span>
          </div>
        </div>

        <div class="positions-header-actions__bottom">
          <button type="button" class="positions-header-button" :disabled="downloading" @click="handleExport(false)">
            <i class="mdi mdi-export" aria-hidden="true"></i>
            <span>{{ downloading ? '导出中...' : '导出' }}</span>
          </button>
          <button
            type="button"
            class="positions-header-button"
            data-surface-trigger="modal-position-upload"
            @click="batchVisible = true"
          >
            <i class="mdi mdi-upload" aria-hidden="true"></i>
            <span>批量上传</span>
          </button>
          <button type="button" class="positions-header-button" :disabled="downloading" @click="handleExport(true)">
            <i class="mdi mdi-download" aria-hidden="true"></i>
            <span>下载模板</span>
          </button>
          <button
            type="button"
            class="positions-header-button positions-header-button--primary"
            data-surface-trigger="modal-new-position"
            @click="openCreateModal()"
          >
            <i class="mdi mdi-plus" aria-hidden="true"></i>
            <span>新增岗位</span>
          </button>
        </div>
      </div>
    </div>

    <section class="positions-stats">
      <article
        v-for="card in statsCards"
        :key="card.key"
        :class="['positions-stats__card', `positions-stats__card--${card.tone}`]"
      >
        <div class="positions-stats__value">{{ card.value }}</div>
        <div class="positions-stats__label">{{ card.label }}</div>
      </article>
    </section>

    <section class="positions-shell">
      <div class="positions-filters">
        <select v-model="filters.positionCategory" class="positions-filter-select" aria-label="岗位分类" data-field-name="类别" @change="handleSearch">
          <option value="">全部分类</option>
          <option v-for="option in meta.categories" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>

        <select v-model="filters.industry" class="positions-filter-select" aria-label="行业" data-field-name="大区" @change="handleSearch">
          <option value="">全部行业</option>
          <option v-for="option in meta.industries" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>

        <select v-model="filters.companyName" class="positions-filter-select" aria-label="公司" data-field-name="公司/银行名称" @change="handleSearch">
          <option value="">全部公司</option>
          <option v-for="option in companyOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>

        <select v-model="filters.city" class="positions-filter-select" aria-label="地区" data-field-name="地区/城市" @change="handleSearch">
          <option value="">全部地区</option>
          <option v-for="option in cityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>

        <select v-model="filters.displayStatus" class="positions-filter-select" aria-label="状态" data-field-name="状态" @change="handleSearch">
          <option value="">全部状态</option>
          <option v-for="option in meta.displayStatuses" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>

        <select v-model="filters.recruitmentCycle" class="positions-filter-select" aria-label="招聘周期" data-field-name="招聘周期" @change="handleSearch">
          <option value="">招聘周期</option>
          <option v-for="option in meta.recruitmentCycles" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>

        <select v-model="publishPreset" class="positions-filter-select" aria-label="发布时间" data-field-name="发布时间" @change="handleSearch">
          <option value="">发布时间</option>
          <option v-for="option in meta.publishPresets" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>

        <button type="button" class="positions-filter-reset" data-field-name="重置" @click="handleReset">
          <i class="mdi mdi-refresh" aria-hidden="true"></i>
          <span>重置</span>
        </button>

        <label class="positions-filter-search" data-field-name="搜索框">
          <i class="mdi mdi-magnify" aria-hidden="true"></i>
          <input
            v-model="filters.keyword"
            type="text"
            class="positions-filter-search__input"
            placeholder="搜索岗位名称..."
            @keydown.enter.prevent="handleSearch"
          />
          <button type="button" class="positions-filter-search__submit" aria-label="搜索" @click="handleSearch">
            <i class="mdi mdi-arrow-right" aria-hidden="true"></i>
          </button>
        </label>
      </div>

      <div v-if="loading" class="positions-loading">
        <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
        <span>正在加载岗位数据...</span>
      </div>

      <template v-else>
        <div v-if="viewMode === 'drilldown'" class="positions-drilldown">
          <section v-if="!drillDownRows.length" class="positions-drilldown__empty">
            当前筛选条件下暂无岗位数据
          </section>

          <section v-for="industry in drillDownRows" :key="industry.industry" class="positions-drilldown__industry">
            <button
              type="button"
              :class="['positions-drilldown__industry-head', `positions-drilldown__industry-head--${getIndustryTone(industry.industry)}`]"
              :aria-expanded="expandedIndustries.has(industry.industry)"
              @click="toggleIndustry(industry.industry)"
            >
              <div class="positions-drilldown__industry-main">
                <i :class="['mdi', expandedIndustries.has(industry.industry) ? 'mdi-chevron-down' : 'mdi-chevron-right']" aria-hidden="true"></i>
                <i :class="['mdi', getIndustryIcon(industry.industry)]" aria-hidden="true"></i>
                <strong>{{ formatIndustry(industry.industry) }}</strong>
                <span class="positions-drilldown__industry-badge positions-drilldown__industry-badge--company">{{ industry.companyCount }} 家公司</span>
                <span class="positions-drilldown__industry-badge positions-drilldown__industry-badge--position">{{ industry.positionCount }} 个岗位</span>
              </div>

              <div class="positions-drilldown__industry-side">
                <span class="positions-drilldown__industry-pill positions-drilldown__industry-pill--success">{{ industry.openCount }} 开放</span>
                <span
                  v-if="industry.positionCount - industry.openCount > 0"
                  class="positions-drilldown__industry-pill positions-drilldown__industry-pill--muted"
                >
                  {{ industry.positionCount - industry.openCount }} 已关闭
                </span>
                <span class="positions-drilldown__industry-students">{{ industry.studentCount }} 学员</span>
              </div>
            </button>

            <div v-if="expandedIndustries.has(industry.industry)" class="positions-drilldown__companies">
              <section v-for="company in industry.companies" :key="`${industry.industry}-${company.companyName}`" class="positions-drilldown__company">
                <div class="positions-drilldown__company-head">
                  <button
                    type="button"
                    class="positions-drilldown__company-main positions-drilldown__company-main-button"
                    :aria-expanded="isCompanyExpanded(industry.industry, company.companyName)"
                    @click="toggleCompany(industry.industry, company.companyName)"
                  >
                    <i :class="['mdi', isCompanyExpanded(industry.industry, company.companyName) ? 'mdi-chevron-down' : 'mdi-chevron-right']" aria-hidden="true"></i>
                    <div :class="['positions-drilldown__company-logo', `positions-drilldown__company-logo--${getIndustryTone(industry.industry)}`]">
                      {{ getCompanyInitials(company.companyName) }}
                    </div>
                    <div>
                      <strong>{{ company.companyName }}</strong>
                      <span>{{ company.positionCount }} 个岗位</span>
                    </div>
                  </button>

                  <div class="positions-drilldown__company-side">
                    <span class="positions-drilldown__company-count"><strong>{{ company.positionCount }}</strong> 个岗位</span>
                    <span class="positions-drilldown__industry-pill positions-drilldown__industry-pill--success">{{ company.openCount }} 开放</span>
                    <button
                      type="button"
                      class="positions-link-button"
                      data-surface-trigger="modal-position-students"
                      :data-surface-sample-key="`position-${company.positions[0]?.positionId || company.companyName}`"
                      data-field-name="关联学员"
                      aria-label="关联学员"
                      @click="openStudentsModal(company.positions[0])"
                    >
                    {{ company.studentCount }}人
                    </button>
                    <a
                      v-if="company.companyWebsite"
                      :href="company.companyWebsite"
                      target="_blank"
                      rel="noreferrer"
                      :title="`${company.companyName} 官网`"
                      :aria-label="`${company.companyName} 官网`"
                      class="positions-drilldown__company-link"
                    >
                      <i class="mdi mdi-web" aria-hidden="true"></i>
                      {{ company.companyName }} 官网
                    </a>
                  </div>
                </div>

                <div v-if="isCompanyExpanded(industry.industry, company.companyName)" class="positions-drilldown__position-list">
                  <table class="positions-drilldown__company-table">
                    <thead>
                      <tr>
                        <th>岗位名称</th>
                        <th>岗位分类</th>
                        <th>部门</th>
                        <th>地区</th>
                        <th>招聘周期</th>
                        <th>发布时间</th>
                        <th>截止时间</th>
                        <th>状态</th>
                        <th>学员</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="position in company.positions" :key="position.positionId">
                        <td>
                          <a v-if="position.positionUrl" :href="position.positionUrl" target="_blank" rel="noreferrer" class="positions-list__link">
                            {{ position.positionName }}
                            <i class="mdi mdi-open-in-new" aria-hidden="true"></i>
                          </a>
                          <span v-else>{{ position.positionName }}</span>
                          <div v-if="position.applicationNote" class="positions-drilldown__note">{{ position.applicationNote }}</div>
                        </td>
                        <td>{{ formatCategory(position.positionCategory) }}</td>
                        <td>{{ position.department || '-' }}</td>
                        <td>{{ position.city }}</td>
                        <td><span class="positions-cycle-pill">{{ formatCycle(position.recruitmentCycle) }}</span></td>
                        <td>{{ formatShortDate(position.publishTime) }}</td>
                        <td :class="{ 'positions-table__deadline--warn': isDeadlineSoon(position.deadline) }">{{ formatShortDate(position.deadline) }}</td>
                        <td>
                          <span :class="['positions-status-pill', `positions-status-pill--${getStatusTone(position.displayStatus)}`]">
                            {{ formatStatus(position.displayStatus) }}
                          </span>
                        </td>
                        <td>
                          <button type="button" class="positions-link-button" @click="openStudentsModal(position)">
                            {{ position.studentCount || 0 }}人
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            class="positions-action-link"
                            data-surface-trigger="modal-edit-position"
                            :data-surface-sample-key="`position-${position.positionId}`"
                            data-field-name="编辑"
                            aria-label="编辑"
                            @click="openEditModal(position)"
                          >
                            编辑岗位
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div class="positions-drilldown__company-footer">
                    <button
                      type="button"
                      class="positions-inline-add"
                      data-surface-trigger="modal-new-position-company"
                      :data-surface-sample-key="company.companyName"
                      :aria-label="`${company.companyName} 添加岗位`"
                      @click="openCreateModal(industry, company)"
                    >
                      <i class="mdi mdi-plus" aria-hidden="true"></i>
                      {{ company.companyName }} 添加岗位
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </section>
        </div>

        <div v-else class="positions-list">
          <table class="positions-table">
            <thead>
              <tr>
                <th>岗位名称</th>
                <th>公司</th>
                <th>行业</th>
                <th>岗位分类</th>
                <th>地区</th>
                <th>招聘周期</th>
                <th>
                  <button type="button" class="positions-sort-button" @click="togglePublishSort">
                    <span>发布时间</span>
                    <i class="mdi mdi-swap-vertical" aria-hidden="true"></i>
                  </button>
                </th>
                <th>截止时间</th>
                <th>状态</th>
                <th>学员</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in sortedListRows" :key="record.positionId">
                <td>
                  <a v-if="record.positionUrl" :href="record.positionUrl" target="_blank" rel="noreferrer" class="positions-list__link">
                    {{ record.positionName }}
                    <i class="mdi mdi-open-in-new" aria-hidden="true"></i>
                  </a>
                  <span v-else>{{ record.positionName }}</span>
                </td>
                <td>
                  <div class="positions-list__company">
                    <div :class="['positions-list__company-logo', `positions-list__company-logo--${getIndustryTone(record.industry)}`]">
                      {{ getCompanyInitials(record.companyName) }}
                    </div>
                    <span>{{ record.companyName }}</span>
                  </div>
                </td>
                <td>
                  <span :class="['positions-industry-pill', `positions-industry-pill--${getIndustryTone(record.industry)}`]">
                    {{ formatIndustry(record.industry) }}
                  </span>
                </td>
                <td>{{ formatCategory(record.positionCategory) }}</td>
                <td>{{ record.city }}</td>
                <td><span class="positions-cycle-pill">{{ formatCycle(record.recruitmentCycle) }}</span></td>
                <td>{{ formatShortDate(record.publishTime) }}</td>
                <td :class="{ 'positions-table__deadline--warn': isDeadlineSoon(record.deadline) }">{{ formatShortDate(record.deadline) }}</td>
                <td>
                  <span :class="['positions-status-pill', `positions-status-pill--${getStatusTone(record.displayStatus)}`]">
                    {{ formatStatus(record.displayStatus) }}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    class="positions-link-button"
                    data-surface-trigger="modal-position-students"
                    :data-surface-sample-key="`position-${record.positionId}`"
                    data-field-name="关联学员"
                    aria-label="关联学员"
                    @click="openStudentsModal(record)"
                  >
                    {{ record.studentCount || 0 }}人
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    class="positions-action-link"
                    data-surface-trigger="modal-edit-position"
                    :data-surface-sample-key="`position-${record.positionId}`"
                    data-field-name="编辑"
                    aria-label="编辑"
                    @click="openEditModal(record)"
                  >
                    编辑
                  </button>
                </td>
              </tr>
              <tr v-if="!sortedListRows.length">
                <td colspan="11" class="positions-empty">当前筛选条件下暂无岗位数据</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="positions-summary">
          <span>共 {{ summary.companyCount }} 家公司</span>
          <span class="positions-summary__divider">|</span>
          <span class="positions-summary__item positions-summary__item--positions">● {{ summary.positionCount }} 个岗位</span>
          <span class="positions-summary__item positions-summary__item--open">● {{ stats.openPositions }} 开放中</span>
          <span class="positions-summary__item positions-summary__item--closed">● {{ stats.closedPositions }} 已关闭</span>
        </div>

        <div class="positions-footer">
          <strong>流程缩写：</strong>
          {{ processGlossaryText }}
        </div>
      </template>
    </section>

    <PositionFormModal
      v-model:visible="formVisible"
      :position="editingPosition"
      :defaults="createDefaults"
      :meta="meta"
      :company-options="companyOptionValues"
      @submit="handleSavePosition"
    />
    <BatchUploadModal
      v-model:visible="batchVisible"
      :upload-rule-copy="meta.uploadRuleCopy"
      :upload-steps="meta.uploadSteps"
      @submit="handleBatchUpload"
    />
    <PositionStudentsModal
      v-model:visible="studentsVisible"
      :company-name="selectedPosition?.companyName || '公司'"
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
import {
  createPosition,
  getPositionCompanyOptions,
  getPositionDrillDown,
  getPositionList,
  getPositionMeta,
  getPositionStats,
  getPositionStudents,
  updatePosition,
  uploadPositionFile,
  type DrillDownCompany,
  type DrillDownIndustry,
  type PositionCompanyOption,
  type PositionListItem,
  type PositionListParams,
  type PositionMeta,
  type PositionMetaOption,
  type PositionPayload,
  type PositionStudentRow,
  type PositionStats
} from '@osg/shared/api/admin/position'
import BatchUploadModal from './components/BatchUploadModal.vue'
import PositionFormModal from './components/PositionFormModal.vue'
import PositionStudentsModal from './components/PositionStudentsModal.vue'

const createEmptyMeta = (): PositionMeta => ({
  categories: [],
  displayStatuses: [],
  industries: [],
  companyTypes: [],
  recruitmentCycles: [],
  projectYears: [],
  regions: [],
  citiesByRegion: {},
  publishPresets: [],
  processGlossary: [],
  uploadSteps: [],
  trafficSummary: null
})

const loading = ref(false)
const downloading = ref(false)
const positions = ref<PositionListItem[]>([])
const drillDownRows = ref<DrillDownIndustry[]>([])
const meta = ref<PositionMeta>(createEmptyMeta())
const companyOptions = ref<PositionCompanyOption[]>([])
const studentRows = ref<PositionStudentRow[]>([])
const stats = ref<PositionStats>({
  totalPositions: 0,
  openPositions: 0,
  closingSoonPositions: 0,
  closedPositions: 0,
  studentApplications: 0
})
const viewMode = ref<'drilldown' | 'list'>('list')
const publishSort = ref<'desc' | 'asc'>('desc')
const publishPreset = ref('')
const formVisible = ref(false)
const batchVisible = ref(false)
const studentsVisible = ref(false)
const studentsLoading = ref(false)
const editingPosition = ref<PositionListItem | null>(null)
const selectedPosition = ref<PositionListItem | null>(null)
const createDefaults = ref<Partial<PositionPayload> | null>(null)
const expandedIndustries = ref(new Set<string>())
const expandedCompanies = ref(new Set<string>())

const filters = reactive<PositionListParams>({
  pageNum: 1,
  pageSize: 100,
  keyword: '',
  positionCategory: '',
  industry: '',
  companyName: '',
  city: '',
  displayStatus: '',
  recruitmentCycle: ''
})

const statsCards = computed(() => [
  { key: 'total', label: '总岗位数', value: stats.value.totalPositions, tone: 'primary' },
  { key: 'open', label: '开放中', value: stats.value.openPositions, tone: 'success' },
  { key: 'closing', label: '即将截止', value: stats.value.closingSoonPositions, tone: 'warning' },
  { key: 'closed', label: '已关闭', value: stats.value.closedPositions, tone: 'muted' },
  { key: 'students', label: '学员申请', value: stats.value.studentApplications, tone: 'info' }
])

const companyOptionValues = computed(() => companyOptions.value.map((item) => item.value))

const cityOptions = computed<PositionMetaOption[]>(() => {
  const merged: PositionMetaOption[] = []
  const seen = new Set<string>()
  Object.values(meta.value.citiesByRegion).forEach((items) => {
    items.forEach((item) => {
      if (!seen.has(item.value)) {
        seen.add(item.value)
        merged.push(item)
      }
    })
  })
  return merged
})

const buildOptionMap = (options: PositionMetaOption[]) =>
  new Map(options.map((option) => [option.value, option]))

const categoryMap = computed(() => buildOptionMap(meta.value.categories))
const statusMap = computed(() => buildOptionMap(meta.value.displayStatuses))
const industryMap = computed(() => buildOptionMap(meta.value.industries))
const cycleMap = computed(() => buildOptionMap(meta.value.recruitmentCycles))

const sortedListRows = computed(() => {
  const rows = [...positions.value]
  rows.sort((left, right) => {
    const leftTime = left.publishTime ? new Date(left.publishTime).getTime() : 0
    const rightTime = right.publishTime ? new Date(right.publishTime).getTime() : 0
    return publishSort.value === 'desc' ? rightTime - leftTime : leftTime - rightTime
  })
  return rows
})

const summary = computed(() => ({
  companyCount: new Set(positions.value.map((item) => item.companyName).filter(Boolean)).size,
  positionCount: positions.value.length
}))

const processGlossaryText = computed(() =>
  meta.value.processGlossary.map((item) => `${item.value} = ${item.label}`).join(' · ')
)

const hasExpandedContext = () =>
  Boolean(
    filters.keyword
      || filters.positionCategory
      || filters.companyName
      || filters.industry
      || filters.city
      || filters.displayStatus
      || filters.recruitmentCycle
      || publishPreset.value
  )

const buildPublishRange = () => {
  if (!publishPreset.value) {
    return {}
  }

  const end = new Date()
  const start = new Date(end)
  if (publishPreset.value === 'week') {
    start.setDate(end.getDate() - 7)
  } else if (publishPreset.value === 'month') {
    start.setMonth(end.getMonth() - 1)
  } else {
    start.setMonth(end.getMonth() - 3)
  }

  return {
    beginPublishTime: start.toISOString().slice(0, 10),
    endPublishTime: end.toISOString().slice(0, 10)
  }
}

const toRequestParams = (): PositionListParams => {
  const params: PositionListParams = {
    pageNum: filters.pageNum,
    pageSize: filters.pageSize,
    keyword: filters.keyword?.trim() || undefined,
    positionCategory: filters.positionCategory || undefined,
    industry: filters.industry || undefined,
    companyName: filters.companyName || undefined,
    city: filters.city || undefined,
    displayStatus: filters.displayStatus || undefined,
    recruitmentCycle: filters.recruitmentCycle || undefined
  }

  return {
    ...params,
    ...buildPublishRange()
  }
}

const syncExpandedState = (rows: DrillDownIndustry[]) => {
  if (!hasExpandedContext()) {
    expandedIndustries.value = new Set()
    expandedCompanies.value = new Set()
    return
  }

  expandedIndustries.value = new Set(rows.map((item) => item.industry))
  expandedCompanies.value = new Set(
    rows.flatMap((item) => item.companies.map((company) => `${item.industry}::${company.companyName}`))
  )
}

const loadReferenceData = async () => {
  const [metaResponse, companyResponse] = await Promise.all([
    getPositionMeta(),
    getPositionCompanyOptions()
  ])
  meta.value = {
    ...createEmptyMeta(),
    ...metaResponse,
    citiesByRegion: metaResponse.citiesByRegion || {},
    uploadSteps: metaResponse.uploadSteps || [],
    trafficSummary: metaResponse.trafficSummary ?? null
  }
  companyOptions.value = companyResponse || []
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
  publishPreset.value = ''
  await loadPage()
}

const openCreateModal = (industry?: DrillDownIndustry, company?: DrillDownCompany) => {
  editingPosition.value = null
  createDefaults.value = industry || company
    ? {
        industry: industry?.industry || company?.companyType || '',
        companyType: company?.companyType || industry?.industry || '',
        companyName: company?.companyName || '',
        companyWebsite: company?.companyWebsite || ''
      }
    : null
  formVisible.value = true
}

const openEditModal = (record: PositionListItem) => {
  createDefaults.value = null
  editingPosition.value = record
  formVisible.value = true
}

const openStudentsModal = async (record: PositionListItem) => {
  selectedPosition.value = record
  studentsVisible.value = true
  studentsLoading.value = true
  studentRows.value = []

  try {
    studentRows.value = await getPositionStudents(record.positionId)
  } catch (_error) {
    message.error('加载岗位申请学员失败')
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
    createDefaults.value = null
    await Promise.all([loadReferenceData(), loadPage()])
  } catch (_error) {
    message.error(payload.positionId ? '岗位更新失败' : '岗位新增失败')
  }
}

const handleBatchUpload = async (file: File) => {
  try {
    const result = await uploadPositionFile(file)
    batchVisible.value = false
    await Promise.all([loadReferenceData(), loadPage()])
    if (result.duplicateCount > 0) {
      message.warning(`导入 ${result.successCount} 条，重复跳过 ${result.duplicateCount} 条`)
    } else {
      message.success(`成功导入 ${result.successCount} 条岗位`)
    }
  } catch (_error) {
    message.error('岗位批量上传失败')
  }
}

const getExportFilename = (contentDisposition: string | null, template: boolean) => {
  const matched = contentDisposition?.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/)
  const raw = matched?.[1] || matched?.[2]
  if (raw) {
    return decodeURIComponent(raw)
  }
  return template ? 'position-template.xlsx' : 'positions.xlsx'
}

const handleExport = async (template: boolean) => {
  try {
    downloading.value = true
    const params = new URLSearchParams()
    const token = getToken()
    const requestParams = toRequestParams()

    Object.entries(requestParams).forEach(([key, value]) => {
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
      throw new Error('export failed')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = getExportFilename(response.headers.get('content-disposition'), template)
    link.click()
    window.URL.revokeObjectURL(url)
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

const isCompanyExpanded = (industry: string, companyName: string) =>
  expandedCompanies.value.has(`${industry}::${companyName}`)

const togglePublishSort = () => {
  publishSort.value = publishSort.value === 'desc' ? 'asc' : 'desc'
}

const getIndustryMeta = (industry?: string) =>
  industryMap.value.get(industry || '') || { value: industry || 'Other', label: industry || 'Other', tone: 'slate', icon: 'mdi-briefcase-search' }

const getIndustryTone = (industry?: string) => getIndustryMeta(industry).tone
const getIndustryIcon = (industry?: string) => getIndustryMeta(industry).icon
const formatIndustry = (industry?: string) => getIndustryMeta(industry).label

const getCompanyInitials = (companyName: string) =>
  companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')

const formatCategory = (value?: string) => categoryMap.value.get(value || '')?.label || value || '-'

const formatStatus = (value?: string) => statusMap.value.get(value || '')?.label || value || '展示中'

const getStatusTone = (value?: string) => statusMap.value.get(value || '')?.tone || 'success'

const formatCycle = (value?: string) => {
  if (!value) {
    return '-'
  }
  const cycles = value.split(',').map((item) => item.trim()).filter(Boolean)
  const first = cycles[0] || value
  return cycleMap.value.get(first)?.label || first
}

const formatShortDate = (value?: string) => {
  if (!value) {
    return '—'
  }
  if (value.length >= 10) {
    return value.slice(5, 10)
  }
  return value
}

const isDeadlineSoon = (value?: string) => {
  if (!value) {
    return false
  }
  const deadline = new Date(value).getTime()
  const now = Date.now()
  return deadline >= now && deadline - now <= 7 * 24 * 60 * 60 * 1000
}

onMounted(() => {
  void Promise.all([loadReferenceData(), loadPage()])
})
</script>

<style scoped lang="scss">
.positions-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.positions-page__heading {
  min-width: 280px;
}

.page-title {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 12px;
  color: #20304a;
  font-size: 36px;
  font-weight: 800;
}

.page-title-en {
  color: #8aa0c7;
  font-size: 16px;
  font-weight: 600;
}

.page-subtitle {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 15px;
}

.positions-header-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
}

.positions-header-actions__top,
.positions-header-actions__bottom {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.positions-view-toggle {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 6px;
  background: #f3f5fb;
}

.positions-view-toggle__button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  border: none;
  border-radius: 4px;
  padding: 0 12px;
  background: transparent;
  color: #31435c;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.positions-view-toggle__button--active {
  background: linear-gradient(135deg, #6b6ef7 0%, #7b61ff 100%);
  color: #fff;
}

.positions-page__traffic {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #9aaccc;
  font-size: 12px;
  font-weight: 600;
}

.positions-header-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  border: 1px solid #d6deea;
  border-radius: 10px;
  padding: 0 14px;
  background: #fff;
  color: #51637d;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.positions-header-button--primary {
  border: none;
  background: linear-gradient(135deg, #6b6ef7 0%, #7b61ff 100%);
  color: #fff;
}

.positions-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.positions-stats__card {
  padding: 16px;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 255, 0.98) 100%);
  box-shadow: 0 8px 24px rgba(134, 148, 196, 0.1);
  text-align: center;
}

.positions-stats__value {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}

.positions-stats__label {
  margin-top: 4px;
  color: #8a9abb;
  font-size: 12px;
  font-weight: 700;
}

.positions-stats__card--primary .positions-stats__value {
  color: #6b6ef7;
}

.positions-stats__card--success .positions-stats__value {
  color: #22c55e;
}

.positions-stats__card--warning .positions-stats__value {
  color: #f59e0b;
}

.positions-stats__card--muted .positions-stats__value {
  color: #94a3b8;
}

.positions-stats__card--info .positions-stats__value {
  color: #3b82f6;
}

.positions-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f7f9ff 0%, #eef2ff 100%);
}

.positions-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 20px rgba(134, 148, 196, 0.1);
}

.positions-filter-select,
.positions-filter-reset,
.positions-filter-search {
  min-height: 32px;
  border: 1px solid #d7deea;
  border-radius: 10px;
  background: #fff;
}

.positions-filter-select {
  min-width: 100px;
  padding: 0 10px;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.positions-filter-reset {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.positions-filter-search {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 160px;
  padding: 0 8px 0 10px;
  color: #94a3b8;
}

.positions-filter-search__input {
  flex: 1;
  border: none;
  background: transparent;
  color: #334155;
  font-size: 12px;
  outline: none;
}

.positions-filter-search__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 999px;
  background: #eef2ff;
  color: #5b6ef5;
  cursor: pointer;
}

.positions-loading,
.positions-drilldown__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  color: #64748b;
  font-weight: 700;
  gap: 8px;
}

.positions-drilldown {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.positions-drilldown__industry {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 20px rgba(134, 148, 196, 0.08);
  overflow: hidden;
}

.positions-drilldown__industry-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: none;
  padding: 12px 16px;
  text-align: left;
  cursor: pointer;
}

.positions-drilldown__industry-head--gold {
  background: linear-gradient(90deg, #fff1bf 0%, #fff8e0 45%, #fffdf6 100%);
}

.positions-drilldown__industry-head--violet {
  background: linear-gradient(90deg, #f2e7ff 0%, #efe8ff 40%, #f8f5ff 100%);
}

.positions-drilldown__industry-head--blue {
  background: linear-gradient(90deg, #ddebff 0%, #edf4ff 40%, #f8fbff 100%);
}

.positions-drilldown__industry-head--amber {
  background: linear-gradient(90deg, #fff2c9 0%, #fff8df 40%, #fffdf6 100%);
}

.positions-drilldown__industry-head--slate {
  background: linear-gradient(90deg, #edf2f7 0%, #f8fafc 100%);
}

.positions-drilldown__industry-main,
.positions-drilldown__industry-side,
.positions-drilldown__company-main,
.positions-drilldown__company-side {
  display: flex;
  align-items: center;
  gap: 8px;
}

.positions-drilldown__industry-main strong {
  font-size: 15px;
  color: #9a520e;
}

.positions-drilldown__industry-head--violet .positions-drilldown__industry-main strong,
.positions-drilldown__industry-head--violet .positions-drilldown__industry-side {
  color: #7c3aed;
}

.positions-drilldown__industry-head--blue .positions-drilldown__industry-main strong,
.positions-drilldown__industry-head--blue .positions-drilldown__industry-side {
  color: #1d4ed8;
}

.positions-drilldown__industry-head--amber .positions-drilldown__industry-main strong,
.positions-drilldown__industry-head--amber .positions-drilldown__industry-side {
  color: #d97706;
}

.positions-drilldown__industry-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}

.positions-drilldown__industry-badge--company {
  background: #a85a18;
}

.positions-drilldown__industry-badge--position {
  background: #6b6ef7;
}

.positions-drilldown__industry-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 10px;
  font-weight: 700;
}

.positions-drilldown__industry-pill--success {
  background: #d1fae5;
  color: #15803d;
}

.positions-drilldown__industry-pill--muted {
  background: #eef2f7;
  color: #6b7280;
}

.positions-drilldown__industry-students {
  font-size: 12px;
  font-weight: 700;
}

.positions-drilldown__companies {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 16px;
}

.positions-drilldown__company {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.positions-drilldown__company-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  background: #fff;
}

.positions-drilldown__company-main-button {
  flex: 1;
  border: none;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.positions-drilldown__company-logo,
.positions-list__company-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}

.positions-drilldown__company-logo--gold,
.positions-list__company-logo--gold {
  background: #a85a18;
}

.positions-drilldown__company-logo--violet,
.positions-list__company-logo--violet {
  background: #7c3aed;
}

.positions-drilldown__company-logo--blue,
.positions-list__company-logo--blue {
  background: #2563eb;
}

.positions-drilldown__company-logo--amber,
.positions-list__company-logo--amber {
  background: #d97706;
}

.positions-drilldown__company-logo--slate,
.positions-list__company-logo--slate {
  background: #64748b;
}

.positions-drilldown__company-main strong {
  display: block;
  color: #1f2937;
}

.positions-drilldown__company-main span {
  color: #64748b;
  font-size: 12px;
}

.positions-drilldown__company-count {
  color: #475569;
  font-size: 12px;
}

.positions-drilldown__company-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #d7deea;
  border-radius: 4px;
  padding: 2px 8px;
  color: #4f5f78;
  text-decoration: none;
  font-size: 10px;
  font-weight: 700;
}

.positions-drilldown__position-list {
  margin-left: 44px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.positions-drilldown__company-table,
.positions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.positions-drilldown__company-table thead,
.positions-table thead {
  background: #f7f9fc;
}

.positions-drilldown__company-table th,
.positions-drilldown__company-table td,
.positions-table th,
.positions-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #edf2f7;
  text-align: left;
}

.positions-drilldown__note {
  margin-top: 2px;
  color: #f59e0b;
  font-size: 10px;
}

.positions-drilldown__company-footer {
  display: flex;
  justify-content: flex-end;
  padding: 6px 10px;
  background: #fff;
}

.positions-inline-add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #d7deea;
  border-radius: 4px;
  padding: 4px 10px;
  background: #fff;
  color: #51637d;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.positions-list {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 20px rgba(134, 148, 196, 0.08);
  overflow: hidden;
}

.positions-sort-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.positions-list__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #5b6ef5;
  text-decoration: none;
  font-weight: 700;
}

.positions-list__company {
  display: flex;
  align-items: center;
  gap: 8px;
}

.positions-industry-pill,
.positions-cycle-pill,
.positions-status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
}

.positions-industry-pill--gold {
  background: #fef3c7;
  color: #92400e;
}

.positions-industry-pill--violet {
  background: #f3e8ff;
  color: #7c3aed;
}

.positions-industry-pill--blue {
  background: #dbeafe;
  color: #1d4ed8;
}

.positions-industry-pill--amber {
  background: #ffedd5;
  color: #c2410c;
}

.positions-industry-pill--slate {
  background: #e2e8f0;
  color: #475569;
}

.positions-cycle-pill {
  background: #eef2ff;
  color: #4f46e5;
}

.positions-status-pill--success {
  background: #dcfce7;
  color: #15803d;
}

.positions-status-pill--muted {
  background: #f3f4f6;
  color: #6b7280;
}

.positions-status-pill--danger {
  background: #fee2e2;
  color: #991b1b;
}

.positions-table__deadline--warn {
  color: #dc2626;
  font-weight: 700;
}

.positions-link-button,
.positions-action-link {
  border: none;
  padding: 0;
  background: transparent;
  color: #5b6ef5;
  font-weight: 700;
  cursor: pointer;
}

.positions-action-link {
  color: #475569;
}

.positions-empty {
  text-align: center;
  color: #94a3b8;
}

.positions-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 2px 0;
  color: #6e80a4;
  font-size: 13px;
  font-weight: 700;
}

.positions-summary__divider {
  color: #c1cad9;
}

.positions-summary__item--positions {
  color: #6b6ef7;
}

.positions-summary__item--open {
  color: #22c55e;
}

.positions-summary__item--closed {
  color: #94a3b8;
}

.positions-footer {
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(230, 236, 255, 0.92);
  color: #5b6ef5;
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 1400px) {
  .positions-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1120px) {
  .page-header {
    flex-direction: column;
  }

  .positions-header-actions,
  .positions-header-actions__top,
  .positions-header-actions__bottom {
    align-items: flex-start;
    justify-content: flex-start;
  }

  .positions-filter-search {
    margin-left: 0;
    width: 100%;
  }

  .positions-drilldown__industry-head,
  .positions-drilldown__company-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .positions-drilldown__position-list {
    margin-left: 0;
  }
}

@media (max-width: 900px) {
  .positions-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .positions-summary {
    flex-wrap: wrap;
  }
}

@media (max-width: 640px) {
  .page-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    font-size: 30px;
  }

  .positions-stats {
    grid-template-columns: 1fr;
  }

  .positions-filters {
    padding: 14px;
  }

  .positions-filter-select,
  .positions-filter-reset,
  .positions-filter-search {
    width: 100%;
  }

  .positions-filter-search {
    min-width: 0;
  }
}
</style>
