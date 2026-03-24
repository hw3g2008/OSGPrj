<template>
  <div id="page-positions" class="career-page page-positions">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          岗位信息
          <span class="page-title-en">Positions</span>
        </h1>
        <p class="page-sub">
          查看岗位池、开放状态和关联申请情况，快速定位需要重点跟进的招聘信息。
        </p>
      </div>

      <div class="page-header__actions">
        <span class="status-pill">岗位总览</span>
        <div class="view-switcher">
          <button
            id="asst-view-drilldown"
            type="button"
            class="view-switcher__button"
            :class="{ 'view-switcher__button--active': viewMode === 'drilldown' }"
            @click="viewMode = 'drilldown'"
          >
            下钻视图
          </button>
          <button
            id="asst-view-list"
            type="button"
            class="view-switcher__button"
            :class="{ 'view-switcher__button--active': viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            列表视图
          </button>
        </div>
      </div>
    </div>

    <section class="summary-grid">
      <article class="summary-card">
        <span class="summary-card__label">筛选后岗位</span>
        <strong class="summary-card__value">{{ filteredPositions.length }}</strong>
        <span class="summary-card__hint">当前视图中的岗位数量</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">开放岗位</span>
        <strong class="summary-card__value summary-card__value--success">{{ openPositionCount }}</strong>
        <span class="summary-card__hint">仍在展示中的岗位</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">关联学员申请</span>
        <strong class="summary-card__value summary-card__value--accent">{{ linkedStudentCount }}</strong>
        <span class="summary-card__hint">岗位已关联的学员申请数</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">公司数</span>
        <strong class="summary-card__value">{{ filteredCompanyCount }}</strong>
        <span class="summary-card__hint">筛选后覆盖的公司范围</span>
      </article>
    </section>

    <section class="toolbar-card">
      <div class="toolbar-card__row">
        <label class="toolbar-field">
          <span class="toolbar-field__label">岗位搜索</span>
          <input
            id="assistant-positions-keyword"
            v-model.trim="filters.keyword"
            class="form-input"
            type="text"
            placeholder="搜索岗位、公司或城市"
          />
        </label>

        <label class="toolbar-field">
          <span class="toolbar-field__label">岗位分类</span>
          <select v-model="filters.category" class="form-select">
            <option value="">全部分类</option>
            <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="toolbar-field">
          <span class="toolbar-field__label">行业</span>
          <select v-model="filters.industry" class="form-select">
            <option value="">全部行业</option>
            <option v-for="option in industryOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </label>

        <label class="toolbar-field">
          <span class="toolbar-field__label">区域</span>
          <select v-model="filters.region" class="form-select">
            <option value="">全部区域</option>
            <option v-for="option in regionOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </label>

        <label class="toolbar-field">
          <span class="toolbar-field__label">展示状态</span>
          <select v-model="filters.displayStatus" class="form-select">
            <option value="">全部状态</option>
            <option value="visible">展示中</option>
            <option value="hidden">已隐藏</option>
            <option value="expired">已过期</option>
          </select>
        </label>
      </div>

      <div class="toolbar-card__meta">
        <span class="toolbar-chip">岗位筛选</span>
        <span class="toolbar-chip">开放状态</span>
        <span class="toolbar-chip">关联学员</span>
        <button type="button" class="ghost-button" @click="resetFilters">重置筛选</button>
      </div>
    </section>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>岗位数据加载失败</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="ghost-button" @click="loadPositions">重新加载</button>
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
      <section v-if="viewMode === 'drilldown'" class="industry-stack">
        <article
          v-for="industry in groupedPositions"
          :key="industry.industry"
          class="industry-card"
        >
          <header class="industry-card__header">
            <div>
              <h2>{{ industry.industry }}</h2>
              <p>
                {{ industry.companyCount }} 家公司
                · {{ industry.positionCount }} 个岗位
                · {{ industry.studentCount }} 个学员关联
              </p>
            </div>
            <span class="industry-card__badge">{{ industry.openCount }} 个展示中</span>
          </header>

          <div class="company-grid">
            <article
              v-for="company in industry.companies"
              :key="`${industry.industry}-${company.companyName}`"
              class="company-card"
            >
              <div class="company-card__header">
                <div>
                  <h3>{{ company.companyName }}</h3>
                  <p>{{ company.companyType || '未标注公司类型' }}</p>
                </div>
                <a
                  v-if="company.companyWebsite"
                  class="link-button"
                  :href="company.companyWebsite"
                  target="_blank"
                  rel="noreferrer"
                >
                  官网
                </a>
              </div>

              <div class="company-card__meta">
                <span>{{ company.positionCount }} 个岗位</span>
                <span>{{ company.studentCount }} 个申请</span>
              </div>

              <table class="data-table">
                <thead>
                  <tr>
                    <th>岗位</th>
                    <th>地区</th>
                    <th>招聘周期</th>
                    <th>状态</th>
                    <th>关联学员</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="position in company.positions" :key="position.positionId">
                    <td>
                      <div class="table-primary">{{ position.positionName }}</div>
                      <a
                        v-if="position.positionUrl"
                        class="table-link"
                        :href="position.positionUrl"
                        target="_blank"
                        rel="noreferrer"
                      >
                        查看岗位链接
                      </a>
                    </td>
                    <td>{{ formatLocation(position) }}</td>
                    <td>{{ position.recruitmentCycle || '-' }}</td>
                    <td>
                      <span class="table-tag" :class="statusToneClass(position.displayStatus)">
                        {{ displayStatusLabel(position.displayStatus) }}
                      </span>
                    </td>
                    <td>
                      <button
                        v-if="Number(position.studentCount || 0) > 0"
                        type="button"
                        class="student-link"
                        @click="openStudents(position)"
                      >
                        {{ position.studentCount }} 人
                      </button>
                      <span v-else class="table-muted">0 人</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </article>
          </div>
        </article>
      </section>

      <section v-else class="table-card">
        <table class="data-table data-table--list">
          <thead>
            <tr>
              <th>岗位</th>
              <th>公司</th>
              <th>行业</th>
              <th>地区</th>
              <th>招聘周期</th>
              <th>发布时间</th>
              <th>状态</th>
              <th>关联学员</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="position in filteredPositions" :key="position.positionId">
              <td>
                <div class="table-primary">{{ position.positionName }}</div>
                <div class="table-muted">{{ position.department || '未标注部门' }}</div>
              </td>
              <td>
                <div class="table-primary">{{ position.companyName }}</div>
                <a
                  v-if="position.companyWebsite"
                  class="table-link"
                  :href="position.companyWebsite"
                  target="_blank"
                  rel="noreferrer"
                >
                  官网
                </a>
              </td>
              <td>{{ position.industry || '-' }}</td>
              <td>{{ formatLocation(position) }}</td>
              <td>{{ position.recruitmentCycle || '-' }}</td>
              <td>{{ formatDate(position.publishTime) }}</td>
              <td>
                <span class="table-tag" :class="statusToneClass(position.displayStatus)">
                  {{ displayStatusLabel(position.displayStatus) }}
                </span>
              </td>
              <td>
                <button
                  v-if="Number(position.studentCount || 0) > 0"
                  type="button"
                  class="student-link"
                  @click="openStudents(position)"
                >
                  {{ position.studentCount }} 人
                </button>
                <span v-else class="table-muted">0 人</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

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
          <table class="data-table data-table--modal">
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
                  <span class="table-tag" :class="statusToneClass(row.statusTone)">
                    {{ row.status }}
                  </span>
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
  displayStartTime?: string
  displayEndTime?: string
  positionUrl?: string
  applicationNote?: string
  studentCount?: number
}

interface GroupedCompany {
  companyName: string
  companyType?: string
  companyWebsite?: string
  positionCount: number
  studentCount: number
  positions: PositionRecord[]
}

interface GroupedIndustry {
  industry: string
  companyCount: number
  positionCount: number
  openCount: number
  studentCount: number
  companies: GroupedCompany[]
}

const viewMode = ref<ViewMode>('drilldown')
const loading = ref(true)
const errorMessage = ref('')
const allPositions = ref<PositionRecord[]>([])

const filters = reactive({
  keyword: '',
  category: '',
  industry: '',
  region: '',
  displayStatus: '',
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
      (!filters.region || position.region === filters.region) &&
      (!filters.displayStatus || position.displayStatus === filters.displayStatus)
    )
  }),
)

const categoryOptions = computed(() =>
  Array.from(new Set(allPositions.value.map((position) => position.positionCategory)))
    .filter(Boolean)
    .map((value) => ({
      value,
      label: categoryLabelMap[value] || value,
    })),
)

const industryOptions = computed(() =>
  Array.from(new Set(allPositions.value.map((position) => position.industry))).filter(Boolean),
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

const filteredCompanyCount = computed(
  () => new Set(filteredPositions.value.map((position) => position.companyName)).size,
)

const groupedPositions = computed<GroupedIndustry[]>(() => {
  const industries = new Map<string, GroupedIndustry>()

  filteredPositions.value.forEach((position) => {
    const industryKey = position.industry || '未归类行业'
    const industry = industries.get(industryKey) || {
      industry: industryKey,
      companyCount: 0,
      positionCount: 0,
      openCount: 0,
      studentCount: 0,
      companies: [],
    }

    let company = industry.companies.find((entry) => entry.companyName === position.companyName)
    if (!company) {
      company = {
        companyName: position.companyName,
        companyType: position.companyType,
        companyWebsite: position.companyWebsite,
        positionCount: 0,
        studentCount: 0,
        positions: [],
      }
      industry.companies.push(company)
    }

    company.positions.push(position)
    company.positionCount += 1
    company.studentCount += Number(position.studentCount || 0)

    industry.positionCount += 1
    industry.studentCount += Number(position.studentCount || 0)
    if (position.displayStatus === 'visible') {
      industry.openCount += 1
    }

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
    return 'table-tag--success'
  }
  if (status === 'warning') {
    return 'table-tag--warning'
  }
  if (status === 'danger' || status === 'hidden' || status === 'expired') {
    return 'table-tag--danger'
  }
  if (status === 'info') {
    return 'table-tag--info'
  }
  return 'table-tag--default'
}

function resetFilters() {
  filters.keyword = ''
  filters.category = ''
  filters.industry = ''
  filters.region = ''
  filters.displayStatus = ''
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
.career-page {
  color: var(--text);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.page-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0;
  font-size: 28px;
  font-weight: 700;
}

.page-title-en {
  color: var(--muted);
  font-size: 15px;
  font-weight: 500;
}

.page-sub {
  margin: 8px 0 0;
  color: var(--text2);
  line-height: 1.7;
}

.page-header__actions {
  display: grid;
  justify-items: end;
  gap: 12px;
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

.view-switcher {
  display: inline-flex;
  gap: 6px;
  padding: 4px;
  border-radius: 14px;
  background: #fff;
  box-shadow: var(--card-shadow);
}

.view-switcher__button {
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text2);
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.view-switcher__button--active {
  background: var(--primary);
  color: #fff;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card,
.toolbar-card,
.industry-card,
.table-card,
.state-card,
.modal-card {
  border-radius: 20px;
  background: #fff;
  box-shadow: var(--card-shadow);
}

.summary-card {
  display: grid;
  gap: 10px;
  padding: 20px;
}

.summary-card__label,
.summary-card__hint,
.toolbar-field__label,
.table-muted,
.industry-card__header p,
.company-card__header p,
.company-card__meta,
.modal-card__header p {
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

.toolbar-card {
  display: grid;
  gap: 18px;
  margin-bottom: 20px;
  padding: 20px;
}

.toolbar-card__row {
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) repeat(4, minmax(140px, 1fr));
  gap: 14px;
}

.toolbar-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.toolbar-field {
  display: grid;
  gap: 8px;
}

.toolbar-field__label {
  font-size: 12px;
  font-weight: 700;
}

.form-input,
.form-select {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  color: var(--text);
  padding: 0 14px;
  font-size: 14px;
}

.toolbar-chip,
.industry-card__badge,
.table-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.toolbar-chip {
  background: var(--bg);
  color: var(--text2);
  padding: 8px 12px;
}

.ghost-button,
.link-button,
.student-link,
.icon-button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.ghost-button {
  margin-left: auto;
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
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

.industry-stack {
  display: grid;
  gap: 18px;
}

.industry-card {
  padding: 20px;
}

.industry-card__header,
.company-card__header,
.modal-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.industry-card__header {
  margin-bottom: 18px;
}

.industry-card__header h2,
.company-card__header h3,
.modal-card__header h2 {
  margin: 0;
}

.industry-card__header p,
.company-card__header p,
.modal-card__header p {
  margin: 6px 0 0;
  font-size: 13px;
}

.industry-card__badge {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
  padding: 8px 12px;
}

.company-grid {
  display: grid;
  gap: 16px;
}

.company-card {
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 18px;
}

.company-card__meta {
  display: flex;
  gap: 14px;
  margin: 12px 0 14px;
  font-size: 12px;
}

.link-button,
.student-link,
.table-link {
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  border-bottom: 1px solid var(--border);
  padding: 14px 12px;
  text-align: left;
  vertical-align: top;
}

.data-table th {
  color: var(--text2);
  font-size: 12px;
  font-weight: 700;
}

.data-table tr:last-child td {
  border-bottom: 0;
}

.table-card {
  overflow: hidden;
}

.table-primary {
  font-weight: 700;
}

.table-muted,
.table-link {
  font-size: 12px;
}

.table-link {
  display: inline-block;
  margin-top: 6px;
}

.table-tag {
  padding: 6px 10px;
}

.table-tag--success {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.table-tag--warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.table-tag--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.table-tag--info {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.table-tag--default {
  background: var(--bg);
  color: var(--text2);
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
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--border);
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

  .toolbar-card__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .page-header,
  .page-header__actions,
  .industry-card__header,
  .company-card__header,
  .modal-card__header {
    align-items: stretch;
  }

  .page-header,
  .page-header__actions,
  .industry-card__header,
  .company-card__header,
  .toolbar-card__meta {
    grid-auto-flow: row;
    display: grid;
  }

  .summary-grid,
  .toolbar-card__row {
    grid-template-columns: minmax(0, 1fr);
  }

  .ghost-button {
    margin-left: 0;
    justify-self: start;
  }

  .data-table {
    min-width: 720px;
  }
}
</style>
