<template>
  <div id="page-positions" class="page-positions">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          岗位信息
          <span class="page-title-en">Job Tracker</span>
        </h1>
        <p class="page-sub">追踪各大公司招聘岗位信息，查看我的学员申请情况</p>
      </div>

      <div class="view-switcher">
        <button
          id="lead-view-drilldown"
          type="button"
          class="btn btn-sm"
          :class="{ 'btn--active': viewMode === 'drilldown' }"
          @click="viewMode = 'drilldown'"
        >
          <i class="mdi mdi-file-tree" aria-hidden="true" />
          下钻视图
        </button>
        <button
          id="lead-view-list"
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

    <section class="card">
      <div class="card-body">
        <div class="filter-row">
          <select class="form-select" aria-label="岗位分类">
            <option value="">全部分类</option>
            <option value="summer">暑期实习</option>
            <option value="fulltime">全职招聘</option>
            <option value="offcycle">非常规周期</option>
            <option value="spring">春季实习</option>
            <option value="events">招聘活动</option>
          </select>

          <select class="form-select" aria-label="行业">
            <option value="">全部行业</option>
            <option>Investment Bank</option>
            <option>Consulting</option>
            <option>Tech</option>
            <option>PE/VC</option>
          </select>

          <select class="form-select form-select--wide" aria-label="公司">
            <option value="">全部公司</option>
            <option>Goldman Sachs</option>
            <option>JP Morgan</option>
            <option>Morgan Stanley</option>
            <option>McKinsey</option>
            <option>BCG</option>
          </select>

          <select class="form-select" aria-label="地区">
            <option value="">全部地区</option>
            <option>Hong Kong</option>
            <option>New York</option>
            <option>London</option>
            <option>Singapore</option>
          </select>

          <div class="search-box">
            <i class="mdi mdi-magnify" aria-hidden="true" />
            <input class="form-input" type="text" placeholder="搜索岗位名称..." />
          </div>
        </div>
      </div>
    </section>

    <section
      id="lead-position-drilldown"
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
            :id="`lead-content-${category.id}`"
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
                    @click.stop="handleMyStudentsClick"
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
                :id="`lead-content-${company.id}`"
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
                        <th>截止时间</th>
                        <th>我的学员</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="job in company.jobs" :key="job.id">
                        <td class="table-cell-title">
                          <button type="button" class="text-link" @click="handleJobLinkClick">
                            {{ job.title }}
                            <i class="mdi mdi-open-in-new" aria-hidden="true" />
                          </button>
                        </td>
                        <td>{{ job.jobType }}</td>
                        <td>{{ job.location }}</td>
                        <td>
                          <span class="tag" :class="job.cycleTone">{{ job.cycleLabel }}</span>
                        </td>
                        <td>{{ job.recruitYear }}</td>
                        <td>{{ job.publishDate }}</td>
                        <td>
                          <span :class="{ 'deadline-closed': job.deadlineTone === 'closed', 'deadline-open': job.deadlineTone === 'urgent' }">
                            {{ job.deadline }}
                          </span>
                        </td>
                        <td>
                          <button
                            v-if="job.studentCount > 0"
                            type="button"
                            class="student-link"
                            @click="handleMyStudentsClick"
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
      id="lead-position-list"
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
                <th>截止时间</th>
                <th>我的学员</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="job in orderedListJobs" :key="job.id">
                <td class="table-cell-title">
                  <button type="button" class="text-link text-link--strong" @click="handleJobLinkClick">
                    {{ job.title }}
                    <i class="mdi mdi-open-in-new" aria-hidden="true" />
                  </button>
                </td>
                <td>
                  <div class="company-listing">
                    <div class="company-logo company-logo--small" :style="{ background: job.logoColor }">{{ job.logoText }}</div>
                    <a class="company-external" :href="job.officialUrl" target="_blank" rel="noreferrer">
                      {{ job.companyName }}
                      <i class="mdi mdi-open-in-new" aria-hidden="true" />
                    </a>
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
                  <span :class="{ 'deadline-closed': job.deadlineTone === 'closed', 'deadline-open': job.deadlineTone === 'urgent' }">
                    {{ job.deadline }}
                  </span>
                </td>
                <td>
                  <button
                    v-if="job.studentCount > 0"
                    type="button"
                    class="student-link"
                    @click="handleMyStudentsClick"
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

    <div class="page-footer-stats">
      <span>
        共
        <strong>12</strong>
        个岗位
      </span>
      <span class="footer-indicator footer-indicator--open">
        <i class="mdi mdi-circle-small" aria-hidden="true" />
        开放中 10
      </span>
      <span class="footer-indicator footer-indicator--closed">
        <i class="mdi mdi-circle-small" aria-hidden="true" />
        已关闭 2
      </span>
      <span class="footer-indicator footer-indicator--students">
        <i class="mdi mdi-circle-small" aria-hidden="true" />
        我的学员 8人
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'

type ViewMode = 'drilldown' | 'list'
type DeadlineTone = 'normal' | 'urgent' | 'closed'
type ChipTone = 'info' | 'neutral' | 'industry-bank' | 'industry-consulting' | 'industry-tech'

interface PositionJob {
  id: string
  title: string
  industry: string
  industryTone: ChipTone
  jobType: string
  location: string
  cycleLabel: string
  cycleTone: ChipTone
  recruitYear: string
  publishDate: string
  publishSortKey: number
  deadline: string
  deadlineTone: DeadlineTone
  studentCount: number
  companyName: string
  companyId: string
  officialUrl: string
  logoText: string
  logoColor: string
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

const showUpcomingToast = inject<() => void>('showUpcomingToast', () => {})
const viewMode = ref<ViewMode>('drilldown')
const publishSortDirection = ref<'default' | 'asc' | 'desc'>('default')
const expandedCategories = ref<string[]>(['ib'])
const expandedCompanies = ref<string[]>([])

const categories: PositionCategory[] = [
  {
    id: 'ib',
    label: 'Investment Bank',
    iconClass: 'mdi-bank',
    accentColor: 'var(--primary)',
    headerStyle: {
      background: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)',
    },
    companySummary: '3 家公司',
    positionSummary: '7 个岗位',
    studentSummary: '我的学员: 6人',
    companies: [
      {
        id: 'gs',
        name: 'Goldman Sachs',
        locations: 'Hong Kong, New York',
        logoText: 'GS',
        logoColor: 'var(--primary)',
        positionCount: 3,
        studentCount: 2,
        officialUrl: 'https://goldmansachs.com/careers',
        jobs: [
          {
            id: 'ib-analyst',
            title: 'IB Analyst',
            industry: 'Investment Bank',
            industryTone: 'industry-bank',
            jobType: '暑期实习',
            location: 'Hong Kong',
            cycleLabel: '2025 Summer',
            cycleTone: 'info',
            recruitYear: '2025',
            publishDate: '09-15',
            publishSortKey: 915,
            deadline: '12-31',
            deadlineTone: 'urgent',
            studentCount: 2,
            companyName: 'Goldman Sachs',
            companyId: 'gs',
            officialUrl: 'https://goldmansachs.com/careers',
            logoText: 'GS',
            logoColor: 'var(--primary)',
          },
          {
            id: 'st-analyst-gs',
            title: 'S&T Analyst',
            industry: 'Investment Bank',
            industryTone: 'industry-bank',
            jobType: '全职招聘',
            location: 'New York',
            cycleLabel: '2025 Summer',
            cycleTone: 'info',
            recruitYear: '2025',
            publishDate: '10-01',
            publishSortKey: 1001,
            deadline: '01-15',
            deadlineTone: 'normal',
            studentCount: 0,
            companyName: 'Goldman Sachs',
            companyId: 'gs',
            officialUrl: 'https://goldmansachs.com/careers',
            logoText: 'GS',
            logoColor: 'var(--primary)',
          },
          {
            id: 'quant-researcher',
            title: 'Quant Researcher',
            industry: 'Investment Bank',
            industryTone: 'industry-bank',
            jobType: '暑期实习',
            location: 'London',
            cycleLabel: '2025 Full-time',
            cycleTone: 'info',
            recruitYear: '2025',
            publishDate: '08-01',
            publishSortKey: 801,
            deadline: '11-30',
            deadlineTone: 'normal',
            studentCount: 0,
            companyName: 'Goldman Sachs',
            companyId: 'gs',
            officialUrl: 'https://goldmansachs.com/careers',
            logoText: 'GS',
            logoColor: 'var(--primary)',
          },
        ],
      },
      {
        id: 'ms',
        name: 'Morgan Stanley',
        locations: 'New York, Hong Kong',
        logoText: 'MS',
        logoColor: '#1E40AF',
        positionCount: 2,
        studentCount: 3,
        officialUrl: 'https://morganstanley.com/careers',
        jobs: [
          {
            id: 'ibd-summer-analyst',
            title: 'IBD Summer Analyst',
            industry: 'Investment Bank',
            industryTone: 'industry-bank',
            jobType: '暑期实习',
            location: 'New York',
            cycleLabel: '2025 Summer',
            cycleTone: 'info',
            recruitYear: '2025',
            publishDate: '09-01',
            publishSortKey: 901,
            deadline: '01-15',
            deadlineTone: 'normal',
            studentCount: 3,
            companyName: 'Morgan Stanley',
            companyId: 'ms',
            officialUrl: 'https://morganstanley.com/careers',
            logoText: 'MS',
            logoColor: '#1E40AF',
          },
          {
            id: 'wealth-management',
            title: 'Wealth Management',
            industry: 'Investment Bank',
            industryTone: 'industry-bank',
            jobType: '非常规周期',
            location: 'Hong Kong',
            cycleLabel: 'Off-cycle',
            cycleTone: 'neutral',
            recruitYear: '2024',
            publishDate: '07-01',
            publishSortKey: 701,
            deadline: '10-31',
            deadlineTone: 'closed',
            studentCount: 0,
            companyName: 'Morgan Stanley',
            companyId: 'ms',
            officialUrl: 'https://morganstanley.com/careers',
            logoText: 'MS',
            logoColor: '#1E40AF',
          },
        ],
      },
      {
        id: 'jpm',
        name: 'JP Morgan',
        locations: 'London, New York',
        logoText: 'JPM',
        logoColor: '#0369A1',
        positionCount: 2,
        studentCount: 1,
        officialUrl: 'https://jpmorgan.com/careers',
        jobs: [
          {
            id: 'st-analyst-jpm',
            title: 'S&T Analyst',
            industry: 'Investment Bank',
            industryTone: 'industry-bank',
            jobType: '暑期实习',
            location: 'London',
            cycleLabel: '2025 Summer',
            cycleTone: 'info',
            recruitYear: '2025',
            publishDate: '09-20',
            publishSortKey: 920,
            deadline: '12-15',
            deadlineTone: 'normal',
            studentCount: 1,
            companyName: 'JP Morgan',
            companyId: 'jpm',
            officialUrl: 'https://jpmorgan.com/careers',
            logoText: 'JPM',
            logoColor: '#0369A1',
          },
          {
            id: 'asset-management',
            title: 'Asset Management',
            industry: 'Investment Bank',
            industryTone: 'industry-bank',
            jobType: '暑期实习',
            location: 'New York',
            cycleLabel: '2025 Summer',
            cycleTone: 'info',
            recruitYear: '2025',
            publishDate: '10-01',
            publishSortKey: 1001,
            deadline: '01-31',
            deadlineTone: 'normal',
            studentCount: 0,
            companyName: 'JP Morgan',
            companyId: 'jpm',
            officialUrl: 'https://jpmorgan.com/careers',
            logoText: 'JPM',
            logoColor: '#0369A1',
          },
        ],
      },
    ],
  },
  {
    id: 'consulting',
    label: 'Consulting',
    iconClass: 'mdi-lightbulb',
    accentColor: '#7C3AED',
    headerStyle: {
      background: 'linear-gradient(135deg,#F3E8FF,#E9D5FF)',
    },
    companySummary: '2 家公司',
    positionSummary: '3 个岗位',
    studentSummary: '我的学员: 2人',
    companies: [
      {
        id: 'mck',
        name: 'McKinsey',
        locations: 'Shanghai, Beijing',
        logoText: 'MCK',
        logoColor: '#7C3AED',
        positionCount: 2,
        studentCount: 2,
        officialUrl: 'https://mckinsey.com/careers',
        jobs: [
          {
            id: 'business-analyst',
            title: 'Business Analyst',
            industry: 'Consulting',
            industryTone: 'industry-consulting',
            jobType: '暑期实习',
            location: 'Shanghai',
            cycleLabel: '2025 Summer',
            cycleTone: 'info',
            recruitYear: '2025',
            publishDate: '07-01',
            publishSortKey: 701,
            deadline: '10-31',
            deadlineTone: 'closed',
            studentCount: 2,
            companyName: 'McKinsey',
            companyId: 'mck',
            officialUrl: 'https://mckinsey.com/careers',
            logoText: 'MCK',
            logoColor: '#7C3AED',
          },
          {
            id: 'associate-intern-mck',
            title: 'Associate Intern',
            industry: 'Consulting',
            industryTone: 'industry-consulting',
            jobType: '暑期实习',
            location: 'Beijing',
            cycleLabel: '2025 Summer',
            cycleTone: 'info',
            recruitYear: '2025',
            publishDate: '09-01',
            publishSortKey: 901,
            deadline: '12-15',
            deadlineTone: 'normal',
            studentCount: 0,
            companyName: 'McKinsey',
            companyId: 'mck',
            officialUrl: 'https://mckinsey.com/careers',
            logoText: 'MCK',
            logoColor: '#7C3AED',
          },
        ],
      },
      {
        id: 'bcg',
        name: 'BCG',
        locations: 'Beijing',
        logoText: 'BCG',
        logoColor: '#059669',
        positionCount: 1,
        studentCount: 0,
        officialUrl: 'https://bcg.com/careers',
        jobs: [
          {
            id: 'associate-intern-bcg',
            title: 'Associate Intern',
            industry: 'Consulting',
            industryTone: 'industry-consulting',
            jobType: '暑期实习',
            location: 'Beijing',
            cycleLabel: '2025 Summer',
            cycleTone: 'info',
            recruitYear: '2025',
            publishDate: '09-15',
            publishSortKey: 915,
            deadline: '11-30',
            deadlineTone: 'normal',
            studentCount: 0,
            companyName: 'BCG',
            companyId: 'bcg',
            officialUrl: 'https://bcg.com/careers',
            logoText: 'BCG',
            logoColor: '#059669',
          },
        ],
      },
    ],
  },
  {
    id: 'tech',
    label: 'Tech',
    iconClass: 'mdi-laptop',
    accentColor: '#1D4ED8',
    headerStyle: {
      background: 'linear-gradient(135deg,#DBEAFE,#BFDBFE)',
    },
    companySummary: '1 家公司',
    positionSummary: '2 个岗位',
    studentSummary: '我的学员: 0人',
    companies: [
      {
        id: 'google',
        name: 'Google',
        locations: 'San Francisco',
        logoText: 'G',
        logoColor: '#EA4335',
        positionCount: 2,
        studentCount: 0,
        officialUrl: 'https://careers.google.com',
        jobs: [
          {
            id: 'software-engineer',
            title: 'Software Engineer',
            industry: 'Tech',
            industryTone: 'industry-tech',
            jobType: '暑期实习',
            location: 'San Francisco',
            cycleLabel: '2025 Summer',
            cycleTone: 'info',
            recruitYear: '2025',
            publishDate: '10-01',
            publishSortKey: 1001,
            deadline: '01-31',
            deadlineTone: 'normal',
            studentCount: 0,
            companyName: 'Google',
            companyId: 'google',
            officialUrl: 'https://careers.google.com',
            logoText: 'G',
            logoColor: '#EA4335',
          },
          {
            id: 'product-manager',
            title: 'Product Manager',
            industry: 'Tech',
            industryTone: 'industry-tech',
            jobType: '暑期实习',
            location: 'Singapore',
            cycleLabel: '2025 Summer',
            cycleTone: 'info',
            recruitYear: '2025',
            publishDate: '10-15',
            publishSortKey: 1015,
            deadline: '02-15',
            deadlineTone: 'normal',
            studentCount: 0,
            companyName: 'Google',
            companyId: 'google',
            officialUrl: 'https://careers.google.com',
            logoText: 'G',
            logoColor: '#EA4335',
          },
        ],
      },
    ],
  },
]

const allJobs = computed(() => categories.flatMap((category) => category.companies.flatMap((company) => company.jobs)))
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
const handleJobLinkClick = () => showUpcomingToast()
const handleMyStudentsClick = () => showUpcomingToast()
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

.card {
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

.company-locations {
  font-size: 11px;
  color: var(--muted);
}

.company-count strong {
  color: var(--primary);
}

.company-link,
.student-link,
.text-link,
.sort-button {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

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

.text-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.text-link--strong {
  font-weight: 600;
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

.deadline-open {
  color: #ef4444;
  font-weight: 600;
}

.deadline-closed {
  color: var(--muted);
  text-decoration: line-through;
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

@media (max-width: 1100px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
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
}
</style>
