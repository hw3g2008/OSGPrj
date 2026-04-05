<template>
  <div id="page-positions" class="page-positions">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          岗位信息
          <span class="page-title-en">Positions</span>
        </h1>
        <p class="page-sub">追踪岗位池与关联学员申请情况，保持助教视角浏览与明细查看。</p>
      </div>

      <div class="page-header__actions">
        <span class="status-pill">岗位总览</span>
        <div class="view-switcher">
          <button
            id="asst-view-drilldown"
            type="button"
            class="btn btn-sm"
            :class="{ 'btn--active': viewMode === 'drilldown' }"
            @click="viewMode = 'drilldown'"
          >
            <i class="mdi mdi-file-tree" aria-hidden="true" />
            下钻视图
          </button>
          <button
            id="asst-view-list"
            type="button"
            class="btn btn-sm"
            :class="{ 'btn--active': viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            <i class="mdi mdi-format-list-bulleted" aria-hidden="true" />
            列表视图
          </button>
        </div>
      </div>
    </div>

    <section class="summary-grid">
      <article class="summary-card">
        <span class="summary-card__label">筛选后岗位</span>
        <strong class="summary-card__value">{{ footerStats.total }}</strong>
        <span class="summary-card__hint">当前视图中的岗位数量</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">开放岗位</span>
        <strong class="summary-card__value summary-card__value--success">{{ footerStats.open }}</strong>
        <span class="summary-card__hint">仍在展示中的岗位</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">关联学员申请</span>
        <strong class="summary-card__value summary-card__value--accent">{{ footerStats.students }}</strong>
        <span class="summary-card__hint">当前岗位关联的学员申请数</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">公司数</span>
        <strong class="summary-card__value">{{ categories.length ? allCompanies.length : 0 }}</strong>
        <span class="summary-card__hint">筛选后覆盖的公司范围</span>
      </article>
    </section>

    <section class="toolbar-card card">
      <div class="card-body">
        <div class="filter-row">
          <select
            v-model="filters.positionCategory"
            class="form-select"
            aria-label="岗位分类"
            :disabled="isLoading"
          >
            <option value="">全部分类</option>
            <option
              v-for="option in filterOptions.categories"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <select
            v-model="filters.industry"
            class="form-select"
            aria-label="行业"
            :disabled="isLoading"
          >
            <option value="">全部行业</option>
            <option
              v-for="option in filterOptions.industries"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <select
            v-model="filters.companyName"
            class="form-select form-select--wide"
            aria-label="公司"
            :disabled="isLoading"
          >
            <option value="">全部公司</option>
            <option
              v-for="option in filterOptions.companies"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <select
            v-model="filters.region"
            class="form-select"
            aria-label="地区"
            :disabled="isLoading"
          >
            <option value="">全部地区</option>
            <option
              v-for="option in filterOptions.regions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <div class="search-box">
            <i class="mdi mdi-magnify" aria-hidden="true" />
            <input
              id="assistant-positions-keyword"
              v-model.trim="filters.keyword"
              class="form-input"
              type="text"
              placeholder="搜索岗位名称..."
              :disabled="isLoading"
            />
          </div>
        </div>
      </div>
    </section>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>岗位数据加载失败</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="ghost-button" @click="loadPositions">重新加载</button>
    </section>

    <section v-else-if="isLoading" class="state-card">
      <h2>岗位数据加载中</h2>
      <p>正在读取岗位池与关联学员关系，请稍候。</p>
    </section>

    <section v-else-if="!categories.length" class="state-card">
      <h2>当前筛选下暂无岗位</h2>
      <p>可以清空关键词或筛选条件，查看完整岗位池。</p>
    </section>

    <template v-else>
      <section
        id="assistant-position-drilldown"
        class="card"
        :style="{ display: viewMode === 'drilldown' ? 'block' : 'none' }"
      >
        <div class="card-body card-body--drilldown">
          <article
            v-for="category in categories"
            :key="category.id"
            class="category-section"
          >
            <button
              type="button"
              class="category-header"
              :style="category.headerStyle"
              :aria-expanded="isCategoryOpen(category.id)"
              @click="toggleCategory(category.id)"
            >
              <div class="category-title-group">
                <i
                  class="mdi category-icon"
                  :class="isCategoryOpen(category.id) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
                  aria-hidden="true"
                />
                <i class="mdi category-kind-icon" :class="category.iconClass" aria-hidden="true" />
                <span class="category-title" :style="{ color: category.accentColor }">{{ category.label }}</span>
                <span class="category-badge" :style="{ background: category.accentColor }">{{ category.companySummary }}</span>
                <span class="category-badge category-badge--success">{{ category.positionSummary }}</span>
              </div>
              <span class="category-summary" :style="{ color: category.accentColor }">{{ category.studentSummary }}</span>
            </button>

            <div
              :id="`assistant-content-${category.id}`"
              class="category-content"
              :style="{ display: isCategoryOpen(category.id) ? 'block' : 'none' }"
            >
              <article
                v-for="company in category.companies"
                :key="company.id"
                class="company-section"
              >
                <div
                  class="company-header"
                  role="button"
                  tabindex="0"
                  :aria-expanded="isCompanyOpen(company.id)"
                  @click="toggleCompany(company.id)"
                  @keydown.enter.prevent="toggleCompany(company.id)"
                  @keydown.space.prevent="toggleCompany(company.id)"
                >
                  <div class="company-header__main">
                    <i
                      class="mdi company-icon"
                      :class="isCompanyOpen(company.id) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
                      aria-hidden="true"
                    />
                    <div class="company-logo" :style="{ background: company.logoColor }">{{ company.logoText }}</div>
                    <div class="company-meta">
                      <div class="company-name">{{ company.name }}</div>
                      <div class="company-locations">{{ company.locations }}</div>
                    </div>
                  </div>

                  <div class="company-actions">
                    <span class="company-count">
                      <strong>{{ company.positionCount }}</strong>
                      个岗位
                    </span>
                    <button
                      v-if="company.studentCount > 0"
                      type="button"
                      class="company-link"
                      @click.stop="openCompanyStudentsModal(company)"
                    >
                      {{ formatStudentLabel(company.studentCount) }}
                    </button>
                    <span v-else class="company-link company-link--muted">0人</span>
                    <a
                      class="btn btn-outline btn-sm btn-outline--tiny"
                      :href="company.officialUrl"
                      target="_blank"
                      rel="noreferrer"
                      @click.stop
                    >
                      <i class="mdi mdi-web" aria-hidden="true" />
                      官网
                    </a>
                  </div>
                </div>

                <div
                  :id="`assistant-company-${company.id}`"
                  class="company-content"
                  :style="{ display: isCompanyOpen(company.id) ? 'block' : 'none' }"
                >
                  <div class="table-wrap">
                    <table class="table">
                      <thead>
                        <tr>
                          <th>岗位名称</th>
                          <th>岗位分类</th>
                          <th>部门</th>
                          <th>地区</th>
                          <th>招聘周期</th>
                          <th>发布时间</th>
                          <th>展示状态</th>
                          <th>我的学员</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="job in company.jobs" :key="job.id">
                          <td class="table-cell-title">
                            <a
                              v-if="job.positionUrl"
                              class="text-link"
                              :href="job.positionUrl"
                              target="_blank"
                              rel="noreferrer"
                              @click.stop
                            >
                              {{ job.title }}
                              <i class="mdi mdi-open-in-new" aria-hidden="true" />
                            </a>
                            <span v-else class="text-link text-link--static">{{ job.title }}</span>
                          </td>
                          <td>{{ job.jobType }}</td>
                          <td>{{ job.department }}</td>
                          <td>{{ job.location }}</td>
                          <td>
                            <span class="tag" :class="job.cycleTone">{{ job.cycleLabel }}</span>
                          </td>
                          <td>{{ job.publishDate }}</td>
                          <td>
                            <span class="tag" :class="job.displayTone">{{ job.displayLabel }}</span>
                          </td>
                          <td>
                            <button
                              v-if="job.studentCount > 0"
                              type="button"
                              class="student-link"
                              @click="openJobStudentsModal(job)"
                            >
                              {{ formatStudentLabel(job.studentCount) }}
                            </button>
                            <span v-else class="student-link student-link--muted">0人</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </article>
            </div>
          </article>
        </div>
      </section>

      <section
        id="assistant-position-list"
        class="card"
        :style="{ display: viewMode === 'list' ? 'block' : 'none' }"
      >
        <div class="card-body card-body--list">
          <div class="table-wrap">
            <table class="table list-table">
              <thead>
                <tr>
                  <th>岗位名称</th>
                  <th>公司</th>
                  <th>行业</th>
                  <th>岗位分类</th>
                  <th>地区</th>
                  <th>招聘周期</th>
                  <th>
                    <button type="button" class="sort-button" @click="togglePublishSort">
                      发布时间
                      <i class="mdi" :class="publishSortIcon" aria-hidden="true" />
                    </button>
                  </th>
                  <th>展示状态</th>
                  <th>我的学员</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="job in orderedListJobs" :key="job.id">
                  <td class="table-cell-title">
                    <a
                      v-if="job.positionUrl"
                      class="text-link text-link--strong"
                      :href="job.positionUrl"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {{ job.title }}
                      <i class="mdi mdi-open-in-new" aria-hidden="true" />
                    </a>
                    <span v-else class="text-link text-link--strong text-link--static">{{ job.title }}</span>
                  </td>
                  <td>
                    <div class="company-listing">
                      <div class="company-logo company-logo--small" :style="{ background: job.logoColor }">{{ job.logoText }}</div>
                      <a v-if="job.officialUrl" class="company-external" :href="job.officialUrl" target="_blank" rel="noreferrer">
                        {{ job.companyName }}
                        <i class="mdi mdi-open-in-new" aria-hidden="true" />
                      </a>
                      <span v-else class="company-external company-external--static">{{ job.companyName }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="tag" :class="job.industryTone">{{ job.industry }}</span>
                  </td>
                  <td>{{ job.jobType }}</td>
                  <td>{{ job.location }}</td>
                  <td>
                    <span class="tag" :class="job.cycleTone">{{ job.cycleLabel }}</span>
                  </td>
                  <td>{{ job.publishDate }}</td>
                  <td>
                    <span class="tag" :class="job.displayTone">{{ job.displayLabel }}</span>
                  </td>
                  <td>
                    <button
                      v-if="job.studentCount > 0"
                      type="button"
                      class="student-link"
                      @click="openJobStudentsModal(job)"
                    >
                      {{ formatStudentLabel(job.studentCount) }}
                    </button>
                    <span v-else class="student-link student-link--muted">0人</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </template>

    <div class="page-footer-stats">
      <span>
        共
        <strong>{{ footerStats.total }}</strong>
        个岗位
      </span>
      <span class="footer-indicator footer-indicator--open">
        <i class="mdi mdi-circle-small" aria-hidden="true" />
        开放中 {{ footerStats.open }}
      </span>
      <span class="footer-indicator footer-indicator--closed">
        <i class="mdi mdi-circle-small" aria-hidden="true" />
        非展示 {{ footerStats.closed }}
      </span>
      <span class="footer-indicator footer-indicator--students">
        <i class="mdi mdi-circle-small" aria-hidden="true" />
        我的学员 {{ footerStats.students }}人
      </span>
    </div>

    <div v-if="studentModal.visible" class="modal-backdrop" @click.self="closeStudents">
      <section class="modal-card">
        <header class="modal-card__header">
          <div>
            <h2>我的学员</h2>
            <p>{{ studentModal.position?.title || '-' }} · {{ studentModal.position?.companyName || '-' }}</p>
          </div>
          <button type="button" class="icon-button" @click="closeStudents">关闭</button>
        </header>

        <div v-if="studentModal.loading" class="modal-card__body modal-card__body--state">正在读取学员明细...</div>
        <div v-else-if="studentModal.error" class="modal-card__body modal-card__body--state">{{ studentModal.error }}</div>
        <div v-else-if="studentModal.rows.length === 0" class="modal-card__body modal-card__body--state">当前岗位暂无可展示的关联学员明细。</div>
        <div v-else class="modal-card__body">
          <table class="table list-table">
            <thead>
              <tr>
                <th>学员</th>
                <th>当前状态</th>
                <th>已用课时</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in studentModal.rows" :key="`${row.studentId}-${row.positionName}`">
                <td>
                  <div class="table-primary">{{ row.studentName }}</div>
                  <div class="table-muted">ID: {{ row.studentId }}</div>
                </td>
                <td>
                  <span class="tag" :class="studentStatusTone(row.statusTone)">{{ row.status || '-' }}</span>
                </td>
                <td>{{ row.usedHours ?? 0 }}h</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  getAssistantPositionDrillDown,
  getAssistantPositionStudents,
  type AssistantPositionIndustry,
  type AssistantPositionStudent,
} from '@osg/shared/api'

type ViewMode = 'drilldown' | 'list'
type DisplayTone = 'info' | 'neutral' | 'success' | 'warning'
type ChipTone = 'info' | 'neutral' | 'industry-bank' | 'industry-consulting' | 'industry-tech'

interface FilterOption {
  value: string
  label: string
}

interface FilterState {
  positionCategory: string
  industry: string
  companyName: string
  region: string
  keyword: string
}

interface FilterOptions {
  categories: FilterOption[]
  industries: FilterOption[]
  companies: FilterOption[]
  regions: FilterOption[]
}

interface PositionRecord {
  positionId: number
  positionCategory?: string
  industry?: string
  companyName?: string
  companyType?: string
  companyWebsite?: string
  positionName?: string
  department?: string
  region?: string
  city?: string
  recruitmentCycle?: string
  projectYear?: string
  publishTime?: string
  displayStatus?: string
  positionUrl?: string
  studentCount?: number
}

interface PositionJob {
  id: string
  positionId: number
  title: string
  industry: string
  industryTone: ChipTone
  jobType: string
  department: string
  location: string
  cycleLabel: string
  cycleTone: ChipTone
  publishDate: string
  publishSortKey: number
  studentCount: number
  companyName: string
  officialUrl: string
  logoText: string
  logoColor: string
  positionUrl: string
  displayLabel: string
  displayTone: DisplayTone
}

interface PositionCompany {
  id: string
  name: string
  locations: string
  logoText: string
  logoColor: string
  positionCount: number
  studentCount: number
  officialUrl: string
  jobs: PositionJob[]
}

interface PositionCategory {
  id: string
  label: string
  iconClass: string
  accentColor: string
  headerStyle: Record<string, string>
  companySummary: string
  positionSummary: string
  studentSummary: string
  companies: PositionCompany[]
}

interface IndustryUiConfig {
  id: string
  iconClass: string
  accentColor: string
  chipTone: ChipTone
  headerStyle: Record<string, string>
}

const INDUSTRY_UI_CONFIGS: Record<string, IndustryUiConfig> = {
  'investment bank': {
    id: 'ib',
    iconClass: 'mdi-bank',
    accentColor: 'var(--primary)',
    chipTone: 'industry-bank',
    headerStyle: { background: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)' },
  },
  consulting: {
    id: 'consulting',
    iconClass: 'mdi-lightbulb',
    accentColor: '#7C3AED',
    chipTone: 'industry-consulting',
    headerStyle: { background: 'linear-gradient(135deg,#F3E8FF,#E9D5FF)' },
  },
  tech: {
    id: 'tech',
    iconClass: 'mdi-laptop',
    accentColor: '#1D4ED8',
    chipTone: 'industry-tech',
    headerStyle: { background: 'linear-gradient(135deg,#DBEAFE,#BFDBFE)' },
  },
}

const FALLBACK_INDUSTRY_CONFIG: IndustryUiConfig = {
  id: 'other',
  iconClass: 'mdi-domain',
  accentColor: '#0F766E',
  chipTone: 'neutral',
  headerStyle: { background: 'linear-gradient(135deg,#CCFBF1,#99F6E4)' },
}

const COMPANY_COLORS: Record<string, string> = {
  'goldman sachs': 'var(--primary)',
  'morgan stanley': '#1E40AF',
  'jp morgan': '#0369A1',
  'mckinsey': '#7C3AED',
  'bcg': '#059669',
  'google': '#EA4335',
}

const CATEGORY_LABELS: Record<string, string> = {
  summer: '暑期实习',
  fulltime: '全职招聘',
  offcycle: 'Off-cycle',
  spring: '春季实习',
  events: '招聘活动',
}

const viewMode = ref<ViewMode>('drilldown')
const publishSortDirection = ref<'default' | 'asc' | 'desc'>('default')
const expandedCategories = ref<string[]>([])
const expandedCompanies = ref<string[]>([])
const isLoading = ref(true)
const errorMessage = ref('')
const allRows = ref<PositionRecord[]>([])

const filters = reactive<FilterState>({
  positionCategory: '',
  industry: '',
  companyName: '',
  region: '',
  keyword: '',
})

const studentModal = reactive<{
  visible: boolean
  loading: boolean
  error: string
  rows: AssistantPositionStudent[]
  position: PositionJob | null
}>({
  visible: false,
  loading: false,
  error: '',
  rows: [],
  position: null,
})

const filterOptions = computed<FilterOptions>(() => ({
  categories: toOptions(uniqueValues(allRows.value.map((row) => row.positionCategory)).map((value) => ({ value, label: CATEGORY_LABELS[value] || value }))),
  industries: toOptions(uniqueValues(allRows.value.map((row) => row.industry)).map((value) => ({ value, label: value }))),
  companies: toOptions(uniqueValues(allRows.value.map((row) => row.companyName)).map((value) => ({ value, label: value }))),
  regions: toOptions(uniqueValues(allRows.value.map((row) => row.region)).map((value) => ({ value, label: value }))),
}))

const filteredRows = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()

  return allRows.value.filter((row) => {
    const searchable = [row.positionName, row.companyName, row.city, row.region]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase())

    return (
      (!keyword || searchable.some((value) => value.includes(keyword))) &&
      (!filters.positionCategory || row.positionCategory === filters.positionCategory) &&
      (!filters.industry || row.industry === filters.industry) &&
      (!filters.companyName || row.companyName === filters.companyName) &&
      (!filters.region || row.region === filters.region)
    )
  })
})

const categories = computed<PositionCategory[]>(() => {
  const groupedIndustries = new Map<
    string,
    {
      label: string
      config: IndustryUiConfig
      companies: Map<string, PositionCompany>
    }
  >()

  filteredRows.value.forEach((row) => {
    const industryLabel = row.industry?.trim() || 'Other'
    const industryConfig = resolveIndustryUiConfig(industryLabel)
    const industryKey = industryConfig.id
    const companyKey = slugify(row.companyName || `${industryLabel}-${row.positionId}`)
    const job = toPositionJob(row)

    let industryGroup = groupedIndustries.get(industryKey)
    if (!industryGroup) {
      industryGroup = {
        label: industryLabel,
        config: industryConfig,
        companies: new Map(),
      }
      groupedIndustries.set(industryKey, industryGroup)
    }

    let company = industryGroup.companies.get(companyKey)
    if (!company) {
      company = {
        id: companyKey,
        name: row.companyName || '-',
        locations: '',
        logoText: buildLogoText(row.companyName || '-'),
        logoColor: resolveCompanyColor(row.companyName || ''),
        positionCount: 0,
        studentCount: 0,
        officialUrl: row.companyWebsite || row.positionUrl || '',
        jobs: [],
      }
      industryGroup.companies.set(companyKey, company)
    }

    company.jobs.push(job)
    if (!company.officialUrl) {
      company.officialUrl = job.officialUrl
    }
  })

  return Array.from(groupedIndustries.values()).map((industryGroup) => {
    const companies = Array.from(industryGroup.companies.values()).map((company) => {
      const companyStudentCount = company.jobs.reduce((sum, job) => sum + job.studentCount, 0)
      return {
        ...company,
        locations: Array.from(new Set(company.jobs.map((job) => job.location).filter((value) => value && value !== '-'))).join(', ') || '-',
        positionCount: company.jobs.length,
        studentCount: companyStudentCount,
      }
    })

    const positionCount = companies.reduce((sum, company) => sum + company.positionCount, 0)
    const studentCount = companies.reduce((sum, company) => sum + company.studentCount, 0)

    return {
      id: industryGroup.config.id,
      label: industryGroup.label,
      iconClass: industryGroup.config.iconClass,
      accentColor: industryGroup.config.accentColor,
      headerStyle: industryGroup.config.headerStyle,
      companySummary: `${companies.length} 家公司`,
      positionSummary: `${positionCount} 个岗位`,
      studentSummary: `我的学员: ${studentCount}人`,
      companies,
    }
  })
})

const allCompanies = computed(() => categories.value.flatMap((category) => category.companies))
const allJobs = computed(() => categories.value.flatMap((category) => category.companies.flatMap((company) => company.jobs)))

const footerStats = computed(() => {
  const total = allJobs.value.length
  const open = allJobs.value.filter((job) => job.displayTone === 'success').length
  const students = allJobs.value.reduce((sum, job) => sum + job.studentCount, 0)

  return {
    total,
    open,
    closed: total - open,
    students,
  }
})

const orderedListJobs = computed(() => {
  const items = [...allJobs.value]
  if (publishSortDirection.value === 'asc') {
    return items.sort((left, right) => left.publishSortKey - right.publishSortKey)
  }
  if (publishSortDirection.value === 'desc') {
    return items.sort((left, right) => right.publishSortKey - left.publishSortKey)
  }
  return items
})

const publishSortIcon = computed(() => {
  if (publishSortDirection.value === 'asc') {
    return 'mdi-sort-ascending'
  }
  if (publishSortDirection.value === 'desc') {
    return 'mdi-sort-descending'
  }
  return 'mdi-swap-vertical'
})

watch(
  categories,
  (nextCategories) => {
    if (!nextCategories.length) {
      expandedCategories.value = []
      expandedCompanies.value = []
      return
    }

    const nextCategoryIds = new Set(nextCategories.map((category) => category.id))
    expandedCategories.value = expandedCategories.value.filter((entry) => nextCategoryIds.has(entry))
    if (!expandedCategories.value.length) {
      expandedCategories.value = [nextCategories[0].id]
    }

    const nextCompanyIds = new Set(nextCategories.flatMap((category) => category.companies.map((company) => company.id)))
    expandedCompanies.value = expandedCompanies.value.filter((entry) => nextCompanyIds.has(entry))
    if (!expandedCompanies.value.length) {
      expandedCompanies.value = nextCategories[0].companies.length ? [nextCategories[0].companies[0].id] : []
    }
  },
  { immediate: true },
)

const isCategoryOpen = (categoryId: string) => expandedCategories.value.includes(categoryId)
const isCompanyOpen = (companyId: string) => expandedCompanies.value.includes(companyId)

const toggleCategory = (categoryId: string) => {
  expandedCategories.value = isCategoryOpen(categoryId)
    ? expandedCategories.value.filter((entry) => entry !== categoryId)
    : [...expandedCategories.value, categoryId]
}

const toggleCompany = (companyId: string) => {
  expandedCompanies.value = isCompanyOpen(companyId)
    ? expandedCompanies.value.filter((entry) => entry !== companyId)
    : [...expandedCompanies.value, companyId]
}

const togglePublishSort = () => {
  if (publishSortDirection.value === 'default') {
    publishSortDirection.value = 'asc'
  } else if (publishSortDirection.value === 'asc') {
    publishSortDirection.value = 'desc'
  } else {
    publishSortDirection.value = 'asc'
  }
}

const formatStudentLabel = (count: number) => `${count}人`

async function loadPositions() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const industries = await getAssistantPositionDrillDown({})
    allRows.value = flattenIndustries(industries)
  } catch (error: any) {
    allRows.value = []
    errorMessage.value = error?.message || '岗位列表暂时无法加载，请稍后重试。'
  } finally {
    isLoading.value = false
  }
}

async function openJobStudentsModal(job: PositionJob) {
  studentModal.visible = true
  studentModal.loading = true
  studentModal.error = ''
  studentModal.rows = []
  studentModal.position = job

  try {
    studentModal.rows = await getAssistantPositionStudents(job.positionId)
  } catch (error: any) {
    studentModal.error = error?.message || '关联学员暂时无法加载。'
  } finally {
    studentModal.loading = false
  }
}

function openCompanyStudentsModal(company: PositionCompany) {
  const jobWithStudents = company.jobs.find((entry) => entry.studentCount > 0)
  if (!jobWithStudents) {
    return
  }

  void openJobStudentsModal(jobWithStudents)
}

function closeStudents() {
  studentModal.visible = false
  studentModal.loading = false
  studentModal.error = ''
  studentModal.rows = []
  studentModal.position = null
}

function studentStatusTone(statusTone?: string) {
  if (statusTone === 'success') {
    return 'industry-tech'
  }
  if (statusTone === 'warning') {
    return 'industry-consulting'
  }
  if (statusTone === 'danger') {
    return 'neutral'
  }
  return 'industry-bank'
}

function flattenIndustries(industries: AssistantPositionIndustry[]): PositionRecord[] {
  return industries.flatMap((industry) =>
    industry.companies.flatMap((company) =>
      company.positions.map((position) => ({
        ...position,
        industry: position.industry || industry.industry,
        companyName: position.companyName || company.companyName,
        companyType: position.companyType || company.companyType,
        companyWebsite: position.companyWebsite || company.companyWebsite,
      })),
    ),
  )
}

function toPositionJob(row: PositionRecord): PositionJob {
  const industryLabel = row.industry?.trim() || 'Other'
  const industryConfig = resolveIndustryUiConfig(industryLabel)
  const companyName = row.companyName || '-'

  return {
    id: String(row.positionId),
    positionId: row.positionId,
    title: row.positionName || '-',
    industry: industryLabel,
    industryTone: industryConfig.chipTone,
    jobType: CATEGORY_LABELS[row.positionCategory || ''] || row.positionCategory || '-',
    department: row.department || '-',
    location: formatLocation(row),
    cycleLabel: row.recruitmentCycle || row.projectYear || '-',
    cycleTone: resolveCycleTone(row.recruitmentCycle),
    publishDate: formatShortDate(row.publishTime),
    publishSortKey: toSortKey(row.publishTime),
    studentCount: normalizeStudentCount(row),
    companyName,
    officialUrl: row.companyWebsite || row.positionUrl || '',
    logoText: buildLogoText(companyName),
    logoColor: resolveCompanyColor(companyName),
    positionUrl: row.positionUrl || '',
    displayLabel: displayStatusLabel(row.displayStatus),
    displayTone: displayTone(row.displayStatus),
  }
}

function resolveIndustryUiConfig(industry: string): IndustryUiConfig {
  return INDUSTRY_UI_CONFIGS[industry.trim().toLowerCase()] ?? FALLBACK_INDUSTRY_CONFIG
}

function resolveCycleTone(recruitmentCycle?: string): ChipTone {
  const normalized = recruitmentCycle?.trim().toLowerCase() || ''
  if (normalized.includes('off')) {
    return 'neutral'
  }
  return 'info'
}

function displayStatusLabel(status?: string) {
  if (status === 'visible') {
    return '展示中'
  }
  if (status === 'hidden') {
    return '已隐藏'
  }
  if (status === 'expired') {
    return '已过期'
  }
  return status || '未标注'
}

function displayTone(status?: string): DisplayTone {
  if (status === 'visible') {
    return 'success'
  }
  if (status === 'hidden') {
    return 'warning'
  }
  return 'neutral'
}

function formatLocation(position: PositionRecord) {
  return [position.region, position.city].filter(Boolean).join(' / ') || '-'
}

function formatShortDate(value?: string) {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

function toSortKey(value?: string) {
  if (!value) {
    return 0
  }
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function normalizeStudentCount(row: PositionRecord) {
  const rawValue = row.studentCount ?? 0
  return Number.isFinite(rawValue) ? Number(rawValue) : 0
}

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function toOptions(options: FilterOption[]) {
  return options.sort((left, right) => left.label.localeCompare(right.label))
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'position'
}

function buildLogoText(companyName: string) {
  const parts = companyName
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean)

  if (!parts.length) {
    return 'OSG'
  }

  return parts
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function resolveCompanyColor(companyName: string) {
  return COMPANY_COLORS[companyName.trim().toLowerCase()] ?? '#64748B'
}

onMounted(() => {
  void loadPositions()
})
</script>

<style scoped lang="scss">
.page-positions {
  display: block;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.page-header__actions {
  display: grid;
  justify-items: end;
  gap: 12px;
}

.page-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
}

.page-title-en {
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}

.page-sub {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text2);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(115, 153, 198, 0.12);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card {
  display: grid;
  gap: 10px;
  padding: 20px;
  border-radius: 20px;
  background: #fff;
  box-shadow: var(--card-shadow);
}

.summary-card__label,
.summary-card__hint,
.state-card p,
.modal-card__header p,
.table-muted,
.company-locations {
  color: var(--text2);
}

.summary-card__label {
  font-size: 13px;
  font-weight: 600;
}

.summary-card__value {
  font-size: 30px;
  font-weight: 700;
}

.summary-card__value--success {
  color: #16a34a;
}

.summary-card__value--accent {
  color: var(--primary);
}

.summary-card__hint {
  font-size: 12px;
}

.view-switcher {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 6px;
  background: var(--bg);
}

.btn {
  border: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 4px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
}

.btn--active {
  background: var(--primary);
  color: #fff;
}

.btn-outline {
  background: #fff;
  color: var(--text2);
  box-shadow: inset 0 0 0 1px var(--border);
}

.btn-outline--tiny {
  padding: 2px 8px;
  font-size: 10px;
}

.card,
.toolbar-card,
.modal-card,
.state-card {
  margin-bottom: 16px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--card-shadow);
}

.card-body {
  padding: 12px 16px;
}

.card-body--drilldown {
  padding: 16px;
}

.card-body--list {
  padding: 0;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.form-select,
.form-input {
  height: 32px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  color: var(--text);
  font-size: 11px;
}

.form-select {
  width: 100px;
  padding: 0 8px;
}

.form-select--wide {
  width: 110px;
}

.search-box {
  position: relative;
  margin-left: auto;
}

.search-box .mdi {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--muted);
}

.form-input {
  width: 160px;
  padding: 0 14px 0 28px;
}

.state-card {
  display: grid;
  gap: 8px;
  padding: 28px;
}

.state-card--error {
  border: 1px solid rgba(239, 68, 68, 0.14);
  background: #fff7f7;
}

.ghost-button,
.company-link,
.student-link,
.text-link,
.sort-button,
.icon-button {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.ghost-button,
.company-link,
.student-link,
.text-link {
  color: var(--primary);
  font-weight: 600;
}

.company-link--muted,
.student-link--muted {
  color: var(--muted);
  font-weight: 400;
}

.category-section {
  margin-bottom: 12px;
}

.category-header,
.company-header {
  width: 100%;
  border: 0;
  cursor: pointer;
  text-align: left;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
}

.category-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-icon {
  font-size: 20px;
  color: inherit;
}

.category-kind-icon {
  font-size: 18px;
  color: inherit;
}

.category-title {
  font-size: 15px;
  font-weight: 600;
}

.category-badge {
  padding: 2px 8px;
  border-radius: 10px;
  color: #fff;
  font-size: 11px;
}

.category-badge--success {
  background: #22c55e;
}

.category-summary {
  font-size: 12px;
}

.category-content {
  margin-top: 8px;
  padding-left: 20px;
}

.company-section {
  margin-bottom: 8px;
}

.company-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #fff;
  box-shadow: inset 0 0 0 1px var(--border);
}

.company-header__main,
.company-actions,
.company-listing {
  display: flex;
  align-items: center;
}

.company-header__main {
  gap: 10px;
}

.company-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
}

.company-icon {
  font-size: 18px;
  color: var(--muted);
}

.company-logo {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.company-logo--small {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 9px;
}

.company-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.company-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.company-count strong {
  color: var(--primary);
}

.company-content {
  margin-top: 6px;
  margin-left: 42px;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  margin: 0;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px var(--border);
}

.table thead {
  background: var(--bg);
}

.table th,
.table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  text-align: left;
  white-space: nowrap;
}

.list-table th,
.list-table td {
  padding: 12px 16px;
}

.table tbody tr:last-child td {
  border-bottom: 0;
}

.table-cell-title {
  min-width: 180px;
}

.table-primary {
  font-weight: 700;
}

.text-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  text-decoration: none;
}

.text-link--strong {
  font-weight: 600;
}

.text-link--static,
.company-external--static {
  color: var(--text);
  cursor: default;
}

.company-external {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text);
  font-weight: 500;
  text-decoration: none;
}

.company-listing {
  gap: 8px;
}

.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
}

.info {
  background: #dbeafe;
  color: #2563eb;
}

.neutral {
  background: #e5e7eb;
  color: #6b7280;
}

.success {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.industry-bank {
  background: #eef2ff;
  color: var(--primary);
}

.industry-consulting {
  background: #f3e8ff;
  color: #7c3aed;
}

.industry-tech {
  background: #dbeafe;
  color: #1d4ed8;
}

.sort-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: var(--text);
}

.sort-button .mdi {
  font-size: 12px;
  color: var(--muted);
}

.page-footer-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  color: var(--muted);
  font-size: 13px;
}

.page-footer-stats strong {
  color: var(--text);
}

.footer-indicator {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
}

.footer-indicator .mdi {
  font-size: 16px;
}

.footer-indicator--open {
  color: #16a34a;
}

.footer-indicator--closed {
  color: var(--muted);
}

.footer-indicator--students {
  color: var(--primary);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.35);
  padding: 20px;
}

.modal-card {
  width: min(820px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
}

.modal-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--border);
}

.modal-card__header h2 {
  margin: 0;
}

.modal-card__header p {
  margin: 6px 0 0;
  font-size: 13px;
}

.modal-card__body {
  padding: 20px 24px 24px;
}

.modal-card__body--state {
  color: var(--text2);
}

.icon-button {
  color: var(--text2);
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 1280px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .page-header__actions {
    justify-items: start;
  }

  .search-box {
    margin-left: 0;
  }
}

@media (max-width: 900px) {
  .filter-row {
    align-items: stretch;
  }

  .search-box,
  .form-select,
  .form-select--wide,
  .form-input {
    width: 100%;
  }

  .company-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .company-actions {
    justify-content: flex-start;
  }

  .company-content,
  .category-content {
    margin-left: 0;
    padding-left: 0;
  }

  .summary-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
