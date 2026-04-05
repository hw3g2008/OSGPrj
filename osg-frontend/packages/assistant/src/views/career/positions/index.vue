<template>
  <div id="page-positions" class="page-positions">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          岗位信息
          <span class="page-title-en">Job Tracker</span>
        </h1>
        <p class="page-sub">追踪岗位池与助教学员申请情况，保留只读查看与关联学员明细</p>
      </div>

      <div class="view-switcher">
        <button type="button" class="sort-button" @click="noopSort">
          <i class="mdi mdi-sort-variant" aria-hidden="true" />
          排序
        </button>
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
          <select v-model="filters.category" class="form-select" aria-label="岗位分类">
            <option value="">全部分类</option>
            <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>

          <select v-model="filters.industry" class="form-select" aria-label="行业">
            <option value="">全部行业</option>
            <option v-for="option in industryOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>

          <select v-model="filters.companyName" class="form-select form-select--wide" aria-label="公司">
            <option value="">全部公司</option>
            <option v-for="option in companyOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>

          <select v-model="filters.region" class="form-select" aria-label="地区">
            <option value="">全部地区</option>
            <option v-for="option in regionOptions" :key="option" :value="option">
              {{ option }}
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
            />
          </div>
        </div>
      </div>
    </section>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>岗位数据加载失败</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="btn btn-outline" @click="loadPositions">重新加载</button>
    </section>

    <section v-else-if="loading" class="state-card">
      <h2>岗位数据加载中</h2>
      <p>正在读取岗位池与关联学员关系，请稍候。</p>
    </section>

    <section v-else-if="filteredPositions.length === 0" class="state-card">
      <h2>当前筛选下暂无岗位</h2>
      <p>可以清空关键词或筛选条件，查看完整岗位池。</p>
    </section>

    <template v-else>
      <section
        id="lead-position-drilldown"
        class="card"
        :style="{ display: viewMode === 'drilldown' ? 'block' : 'none' }"
      >
        <div class="card-body card-body--drilldown">
          <article v-for="industry in groupedPositions" :key="industry.industry" class="category-section">
            <button type="button" class="category-header" :style="industry.headerStyle">
              <div class="category-title-group">
                <i class="mdi mdi-chevron-down category-icon" aria-hidden="true" />
                <i class="mdi category-kind-icon" :class="industry.iconClass" aria-hidden="true" />
                <span class="category-title" :style="{ color: industry.accentColor }">{{ industry.industry }}</span>
                <span class="category-badge" :style="{ background: industry.accentColor }">{{ industry.companyCount }} 家公司</span>
                <span class="category-badge category-badge--success">{{ industry.positionCount }} 个岗位</span>
              </div>
              <span class="category-summary" :style="{ color: industry.accentColor }">
                助教学员: {{ industry.studentCount }}人
              </span>
            </button>

            <div class="category-content" :style="{ display: 'block' }">
              <article v-for="company in industry.companies" :key="company.companyName" class="company-section">
                <div class="company-header" role="button" tabindex="0">
                  <div class="company-header__main">
                    <i class="mdi mdi-chevron-down company-icon" aria-hidden="true" />
                    <div class="company-logo" :style="{ background: company.logoColor }">{{ company.logoText }}</div>
                    <div class="company-meta">
                      <div class="company-name">{{ company.companyName }}</div>
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
                      @click.stop="openCompanyStudents(company)"
                    >
                      {{ formatStudentLabel(company.studentCount) }}
                    </button>
                    <span v-else class="company-link company-link--muted">0人</span>
                    <a
                      v-if="company.companyWebsite"
                      class="btn btn-outline btn-sm btn-outline--tiny"
                      :href="company.companyWebsite"
                      target="_blank"
                      rel="noreferrer"
                      @click.stop
                    >
                      <i class="mdi mdi-web" aria-hidden="true" />
                      官网
                    </a>
                  </div>
                </div>

                <div class="company-content" :style="{ display: 'block' }">
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
                          <th>状态</th>
                          <th>我的学员</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="job in company.positions" :key="job.positionId">
                          <td class="table-cell-title">
                            <a
                              v-if="job.positionUrl"
                              class="text-link"
                              :href="job.positionUrl"
                              target="_blank"
                              rel="noreferrer"
                            >
                              {{ job.positionName }}
                              <i class="mdi mdi-open-in-new" aria-hidden="true" />
                            </a>
                            <span v-else>{{ job.positionName }}</span>
                          </td>
                          <td>{{ categoryLabelMap[job.positionCategory] || job.positionCategory || '-' }}</td>
                          <td>{{ job.department || '-' }}</td>
                          <td>{{ formatLocation(job) }}</td>
                          <td>
                            <span class="tag" :class="cycleTone(job.recruitmentCycle)">{{ job.recruitmentCycle || '-' }}</span>
                          </td>
                          <td>{{ formatDate(job.publishTime) }}</td>
                          <td>
                            <span class="tag" :class="statusToneClass(job.displayStatus)">
                              {{ displayStatusLabel(job.displayStatus) }}
                            </span>
                          </td>
                          <td>
                            <button
                              v-if="Number(job.studentCount || 0) > 0"
                              type="button"
                              class="student-link"
                              @click="openStudents(job)"
                            >
                              {{ formatStudentLabel(Number(job.studentCount || 0)) }}
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
                  <th>发布时间</th>
                  <th>状态</th>
                  <th>我的学员</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="job in filteredPositions" :key="job.positionId">
                  <td class="table-cell-title">
                    <a
                      v-if="job.positionUrl"
                      class="text-link text-link--strong"
                      :href="job.positionUrl"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {{ job.positionName }}
                      <i class="mdi mdi-open-in-new" aria-hidden="true" />
                    </a>
                    <span v-else>{{ job.positionName }}</span>
                  </td>
                  <td>
                    <div class="company-listing">
                      <div class="company-logo company-logo--small" :style="{ background: resolveCompanyColor(job.companyName) }">
                        {{ buildLogoText(job.companyName) }}
                      </div>
                      <a
                        v-if="job.companyWebsite"
                        class="company-external"
                        :href="job.companyWebsite"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {{ job.companyName }}
                        <i class="mdi mdi-open-in-new" aria-hidden="true" />
                      </a>
                      <span v-else>{{ job.companyName }}</span>
                    </div>
                  </td>
                  <td><span class="tag" :class="industryTone(job.industry)">{{ job.industry || '-' }}</span></td>
                  <td>{{ categoryLabelMap[job.positionCategory] || job.positionCategory || '-' }}</td>
                  <td>{{ formatLocation(job) }}</td>
                  <td><span class="tag" :class="cycleTone(job.recruitmentCycle)">{{ job.recruitmentCycle || '-' }}</span></td>
                  <td>{{ formatDate(job.publishTime) }}</td>
                  <td>
                    <span class="tag" :class="statusToneClass(job.displayStatus)">
                      {{ displayStatusLabel(job.displayStatus) }}
                    </span>
                  </td>
                  <td>
                    <button
                      v-if="Number(job.studentCount || 0) > 0"
                      type="button"
                      class="student-link"
                      @click="openStudents(job)"
                    >
                      {{ formatStudentLabel(Number(job.studentCount || 0)) }}
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
        <strong>{{ filteredPositions.length }}</strong>
        个岗位
      </span>
      <span class="footer-indicator footer-indicator--open">
        <i class="mdi mdi-circle-small" aria-hidden="true" />
        开放中 {{ openPositionCount }}
      </span>
      <span class="footer-indicator footer-indicator--students">
        <i class="mdi mdi-circle-small" aria-hidden="true" />
        我的学员 {{ linkedStudentCount }}人
      </span>
    </div>

    <div v-if="studentModal.visible" class="modal-backdrop" @click.self="closeStudents">
      <section class="modal-card">
        <header class="modal-card__header">
          <div>
            <h2>关联学员</h2>
            <p>{{ studentModal.position?.positionName || '-' }} · {{ studentModal.position?.companyName || '-' }}</p>
          </div>
          <button type="button" class="icon-button" @click="closeStudents">关闭</button>
        </header>

        <div v-if="studentModal.loading" class="modal-card__body modal-card__body--state">
          正在读取关联学员...
        </div>
        <div v-else-if="studentModal.error" class="modal-card__body modal-card__body--state">
          {{ studentModal.error }}
        </div>
        <div v-else-if="studentModal.rows.length === 0" class="modal-card__body modal-card__body--state">
          当前岗位暂无可展示的关联学员明细。
        </div>
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
                  <div class="student-name">{{ row.studentName }}</div>
                  <div class="student-meta">ID: {{ row.studentId }}</div>
                </td>
                <td>
                  <span class="tag" :class="statusToneClass(row.statusTone)">{{ row.status }}</span>
                </td>
                <td>{{ row.usedHours }} h</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getAssistantPositionDrillDown,
  getAssistantPositionStudents,
  type AssistantPositionIndustry,
  type AssistantPositionStudent,
} from '@osg/shared/api'

type ViewMode = 'drilldown' | 'list'

interface PositionRecord {
  positionId: number
  positionCategory: string
  industry: string
  companyName: string
  companyType?: string
  companyWebsite?: string
  positionName: string
  department?: string
  region: string
  city: string
  recruitmentCycle: string
  projectYear: string
  publishTime?: string
  deadline?: string
  displayStatus: string
  positionUrl?: string
  studentCount?: number
}

interface GroupedCompany {
  companyName: string
  companyType?: string
  companyWebsite?: string
  logoText: string
  logoColor: string
  positionCount: number
  studentCount: number
  locations: string
  positions: PositionRecord[]
}

interface GroupedIndustry {
  industry: string
  companyCount: number
  positionCount: number
  studentCount: number
  companies: GroupedCompany[]
  iconClass: string
  accentColor: string
  headerStyle: Record<string, string>
}

const viewMode = ref<ViewMode>('drilldown')
const loading = ref(true)
const errorMessage = ref('')
const allPositions = ref<PositionRecord[]>([])

const filters = reactive({
  keyword: '',
  category: '',
  industry: '',
  companyName: '',
  region: '',
})

const studentModal = reactive<{
  visible: boolean
  loading: boolean
  error: string
  rows: AssistantPositionStudent[]
  position: PositionRecord | null
}>({
  visible: false,
  loading: false,
  error: '',
  rows: [],
  position: null,
})

const categoryLabelMap: Record<string, string> = {
  summer: '暑期实习',
  fulltime: '全职招聘',
  offcycle: 'Off-cycle',
  spring: '春季实习',
  events: '招聘活动',
}

const filteredPositions = computed(() =>
  allPositions.value.filter((position) => {
    const keyword = filters.keyword.trim().toLowerCase()
    const matchesKeyword =
      !keyword ||
      [position.positionName, position.companyName, position.city, position.region]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword))

    return (
      matchesKeyword &&
      (!filters.category || position.positionCategory === filters.category) &&
      (!filters.industry || position.industry === filters.industry) &&
      (!filters.companyName || position.companyName === filters.companyName) &&
      (!filters.region || position.region === filters.region)
    )
  }),
)

const categoryOptions = computed(() =>
  Array.from(new Set(allPositions.value.map((position) => position.positionCategory)))
    .filter(Boolean)
    .map((value) => ({ value, label: categoryLabelMap[value] || value })),
)

const industryOptions = computed(() =>
  Array.from(new Set(allPositions.value.map((position) => position.industry))).filter(Boolean),
)

const companyOptions = computed(() =>
  Array.from(new Set(allPositions.value.map((position) => position.companyName))).filter(Boolean),
)

const regionOptions = computed(() =>
  Array.from(new Set(allPositions.value.map((position) => position.region))).filter(Boolean),
)

const openPositionCount = computed(
  () => filteredPositions.value.filter((position) => position.displayStatus === 'visible').length,
)

const linkedStudentCount = computed(() =>
  filteredPositions.value.reduce((sum, position) => sum + Number(position.studentCount || 0), 0),
)

const groupedPositions = computed<GroupedIndustry[]>(() => {
  const industries = new Map<string, GroupedIndustry>()

  filteredPositions.value.forEach((position) => {
    const industryKey = position.industry || '未归类行业'
    const industry = industries.get(industryKey) || {
      industry: industryKey,
      companyCount: 0,
      positionCount: 0,
      studentCount: 0,
      companies: [],
      iconClass: industryIcon(industryKey),
      accentColor: industryColor(industryKey),
      headerStyle: {
        background: industryGradient(industryKey),
      },
    }

    let company = industry.companies.find((entry) => entry.companyName === position.companyName)
    if (!company) {
      company = {
        companyName: position.companyName,
        companyType: position.companyType,
        companyWebsite: position.companyWebsite,
        logoText: buildLogoText(position.companyName),
        logoColor: resolveCompanyColor(position.companyName),
        positionCount: 0,
        studentCount: 0,
        locations: '',
        positions: [],
      }
      industry.companies.push(company)
    }

    company.positions.push(position)
    company.positionCount += 1
    company.studentCount += Number(position.studentCount || 0)
    company.locations = Array.from(
      new Set(company.positions.map((entry) => formatLocation(entry)).filter(Boolean)),
    ).join(', ')

    industry.positionCount += 1
    industry.studentCount += Number(position.studentCount || 0)
    industries.set(industryKey, industry)
  })

  return Array.from(industries.values())
    .map((industry) => ({
      ...industry,
      companyCount: industry.companies.length,
      companies: industry.companies.sort((left, right) => left.companyName.localeCompare(right.companyName)),
    }))
    .sort((left, right) => left.industry.localeCompare(right.industry))
})

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

function formatDate(value?: string) {
  if (!value) {
    return '-'
  }
  return value.slice(0, 10)
}

function formatLocation(position: PositionRecord) {
  return [position.region, position.city].filter(Boolean).join(' / ') || '-'
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

function statusToneClass(status?: string) {
  if (status === 'visible' || status === 'success') {
    return 'success'
  }
  if (status === 'warning') {
    return 'warning'
  }
  if (status === 'danger' || status === 'hidden' || status === 'expired') {
    return 'danger'
  }
  if (status === 'info') {
    return 'info'
  }
  return 'neutral'
}

function cycleTone(cycle?: string) {
  return cycle?.toLowerCase().includes('off') ? 'neutral' : 'info'
}

function industryTone(industry?: string) {
  const normalized = String(industry || '').toLowerCase()
  if (normalized.includes('bank')) {
    return 'industry-bank'
  }
  if (normalized.includes('consult')) {
    return 'industry-consulting'
  }
  if (normalized.includes('tech')) {
    return 'industry-tech'
  }
  return 'neutral'
}

function industryIcon(industry?: string) {
  const normalized = String(industry || '').toLowerCase()
  if (normalized.includes('bank')) {
    return 'mdi-bank'
  }
  if (normalized.includes('consult')) {
    return 'mdi-lightbulb'
  }
  if (normalized.includes('tech')) {
    return 'mdi-laptop'
  }
  return 'mdi-domain'
}

function industryColor(industry?: string) {
  const normalized = String(industry || '').toLowerCase()
  if (normalized.includes('bank')) {
    return 'var(--primary)'
  }
  if (normalized.includes('consult')) {
    return '#7C3AED'
  }
  if (normalized.includes('tech')) {
    return '#1D4ED8'
  }
  return '#0F766E'
}

function industryGradient(industry?: string) {
  const normalized = String(industry || '').toLowerCase()
  if (normalized.includes('bank')) {
    return 'linear-gradient(135deg,#EEF2FF,#E0E7FF)'
  }
  if (normalized.includes('consult')) {
    return 'linear-gradient(135deg,#F3E8FF,#E9D5FF)'
  }
  if (normalized.includes('tech')) {
    return 'linear-gradient(135deg,#DBEAFE,#BFDBFE)'
  }
  return 'linear-gradient(135deg,#CCFBF1,#99F6E4)'
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
  const normalized = companyName.trim().toLowerCase()
  if (normalized.includes('goldman')) {
    return 'var(--primary)'
  }
  if (normalized.includes('morgan')) {
    return '#1E40AF'
  }
  if (normalized.includes('mckinsey')) {
    return '#7C3AED'
  }
  return '#64748B'
}

function formatStudentLabel(count: number) {
  return `${count}人`
}

async function loadPositions() {
  loading.value = true
  errorMessage.value = ''

  try {
    const industries = await getAssistantPositionDrillDown()
    allPositions.value = flattenIndustries(industries)
  } catch (error: any) {
    errorMessage.value = error?.message || '岗位列表暂时无法加载，请稍后重试。'
  } finally {
    loading.value = false
  }
}

async function openStudents(position: PositionRecord) {
  studentModal.visible = true
  studentModal.loading = true
  studentModal.error = ''
  studentModal.rows = []
  studentModal.position = position

  try {
    studentModal.rows = await getAssistantPositionStudents(position.positionId)
  } catch (error: any) {
    studentModal.error = error?.message || '关联学员暂时无法加载。'
  } finally {
    studentModal.loading = false
  }
}

function openCompanyStudents(company: GroupedCompany) {
  const position = company.positions.find((entry) => Number(entry.studentCount || 0) > 0)
  if (!position) {
    return
  }
  void openStudents(position)
}

function noopSort() {
  return undefined
}

function closeStudents() {
  studentModal.visible = false
  studentModal.loading = false
  studentModal.error = ''
  studentModal.rows = []
  studentModal.position = null
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

.sort-button,
.btn {  border: 0;
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

.sort-button {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text2);
}

.btn--active {  background: var(--primary);
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
.state-card,
.modal-card {
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
  width: 120px;
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
  width: 180px;
  padding: 0 14px 0 28px;
}

.state-card {
  display: grid;
  gap: 8px;
  padding: 28px;
  color: var(--text2);
}

.state-card--error {
  border: 1px solid rgba(239, 68, 68, 0.14);
  background: #fff7f7;
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

.category-badge,
.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
}

.category-badge {
  color: #fff;
  font-size: 11px;
}

.category-badge--success,
.success {
  background: #22c55e;
  color: #fff;
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

.company-name,
.student-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.company-locations,
.student-meta {
  font-size: 11px;
  color: var(--muted);
}

.company-count strong {
  color: var(--primary);
}

.company-link,
.student-link,
.text-link {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
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

.warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
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

.modal-card__header h2,
.modal-card__header p {
  margin: 0;
}

.modal-card__header p {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text2);
}

.modal-card__body {
  padding: 20px 24px 24px;
}

.modal-card__body--state,
.icon-button {
  color: var(--text2);
}

.icon-button {
  border: 0;
  background: transparent;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
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
