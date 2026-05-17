<template>
  <div id="page-positions" class="page-positions">
    <PageHeader
      :title-zh="t('leadMentor.positions.k3')"
      title-en="Job Tracker"
    >
      <template #actions>
        <a-radio-group v-model:value="viewMode" button-style="solid" size="small">
          <a-radio-button value="list" id="lead-view-list">
            <i class="mdi mdi-format-list-bulleted" style="margin-right: 4px" aria-hidden="true" />{{ t('leadMentor.positions.k1') }}
          </a-radio-button>
          <a-radio-button value="drilldown" id="lead-view-drilldown">
            <i class="mdi mdi-file-tree" style="margin-right: 4px" aria-hidden="true" />{{ t('leadMentor.positions.k2') }}
          </a-radio-button>
        </a-radio-group>
      </template>
    </PageHeader>

    <a-card :bordered="false" style="margin-top: 12px">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 10px; flex-wrap: wrap">
        <a-form-item>
          <a-select
            v-model:value="filters.positionCategory"
            :placeholder="t('leadMentor.positions.k9')"
            allow-clear
            style="width: 140px"
            :disabled="isLoading"
            @change="handleFilterChange"
          >
            <a-select-option v-for="option in filterOptions.categories" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select
            v-model:value="filters.industry"
            :placeholder="t('leadMentor.positions.k10')"
            allow-clear
            show-search
            option-filter-prop="label"
            style="width: 160px"
            :disabled="isLoading"
            @change="handleFilterChange"
          >
            <a-select-option v-for="option in filterOptions.industries" :key="option.value" :value="option.value" :label="option.label">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select
            v-model:value="filters.companyName"
            :placeholder="t('leadMentor.positions.k11')"
            allow-clear
            show-search
            option-filter-prop="label"
            style="width: 200px"
            :disabled="isLoading"
            @change="handleFilterChange"
          >
            <a-select-option v-for="option in filterOptions.companies" :key="option.value" :value="option.value" :label="option.label">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select
            v-model:value="filters.region"
            :placeholder="t('leadMentor.positions.k12')"
            allow-clear
            style="width: 140px"
            :disabled="isLoading"
            @change="handleFilterChange"
          >
            <a-select-option v-for="option in filterOptions.regions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-input
            v-model:value="filters.keyword"
            :placeholder="t('leadMentor.positions.k13')"
            allow-clear
            style="width: 200px"
            :disabled="isLoading"
            @change="handleFilterChange"
            @press-enter="handleFilterChange"
          >
            <template #prefix><SearchOutlined style="color: rgba(0, 0, 0, 0.45)" /></template>
          </a-input>
        </a-form-item>
      </a-form>

      <a-spin :spinning="isLoading" :tip="t('leadMentor.positions.k14')">
        <div
          id="lead-position-drilldown"
          v-show="viewMode === 'drilldown'"
        >
          <PositionsDrilldown
            :industries="mappedDrilldownIndustries"
            :expanded-industries="expandedIndustriesSet"
            :expanded-companies="expandedCompaniesSet"
            @toggle-industry="toggleCategory"
            @toggle-company="handleDrilldownToggleCompany"
            @open-company-students="handleDrilldownOpenCompanyStudents"
            @open-position-students="handleDrilldownOpenPositionStudents"
          />
        </div>

        <div
          id="lead-position-list"
          v-show="viewMode === 'list'"
        >
          <PositionsListTable
            :positions="mappedListRows"
            :pagination="tablePagination"
            :major-direction-map="majorDirectionMap"
            @change="handleTableChange"
            @open-students="handleListOpenStudents"
          />
        </div>

        <PositionsFooter
          :total="footerStats.total"
          :open="footerStats.open"
          :closed="footerStats.closed"
          :students="footerStats.students"
        />
      </a-spin>
    </a-card>

    <PositionMyStudentsModal
      :model-value="isMyStudentsModalOpen"
      :preview="activeStudentsPreview"
      @update:model-value="handleMyStudentsModalVisibleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { PageHeader } from '@osg/shared/components/PageHeader'
import { useDictFacade, mergeDictWithExistingValues, useI18nDict } from '@osg/shared'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getLeadMentorPositionList,
  getLeadMentorPositionMeta,
  getLeadMentorPositionStudents,
  type LeadMentorPositionListItem,
  type LeadMentorPositionListParams,
  type LeadMentorPositionMeta,
  type LeadMentorPositionMetaOption,
  type LeadMentorPositionStudentRow,
} from '@osg/shared/api'
import {
  useIndustryMeta,
  PositionsFooter,
  PositionsListTable,
  PositionsDrilldown,
  type PositionTableRow,
  type PositionIndustryGroup,
  type PositionCompanyGroup,
  type IndustryTone,
} from '@osg/shared'
import PositionMyStudentsModal, {
  type PositionMyStudentRecord,
  type PositionMyStudentsPreview,
  type PositionStudentStatusTone,
} from '@/components/PositionMyStudentsModal.vue'

const { t } = useI18n()

type ViewMode = 'drilldown' | 'list'
type DeadlineTone = 'normal' | 'urgent' | 'closed'
/**
 * Chip 色系 token：
 * - info / neutral 用于周期、fallback
 * - industry-{gold|violet|blue|amber|teal|indigo|slate} 对应 osg_company_type 字典 css_class 字段
 * 此处使用 string 类型兼容字典未来新增 css_class（前端不必跟字典同步扩枚举）
 */
type ChipTone = string

interface PositionJob {
  id: string
  positionId: number
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
  targetMajors?: string
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
  /** 字典 css_class（如 gold/violet/blue...），用于模板 `.industry-${tone}` class 绑定 */
  tone: string
  /** 字典 list_class（如 mdi-bank/mdi-trophy...），直接作为 icon class 使用 */
  icon: string
  companySummary: string
  positionSummary: string
  studentSummary: string
  companies: PositionCompany[]
}

interface FilterOptions {
  categories: LeadMentorPositionMetaOption[]
  industries: LeadMentorPositionMetaOption[]
  companies: LeadMentorPositionMetaOption[]
  regions: LeadMentorPositionMetaOption[]
}

/**
 * industries 元数据统一从 `useIndustryMeta`（@osg/shared）拉取，消费字典 osg_company_type。
 * 不再本地硬编码 industries 映射表或其 fallback。
 * 对字典缺失或 industry 字段为空的行，统一走 FALLBACK_INDUSTRY_META（slate/briefcase 灰度）。
 */
const FALLBACK_INDUSTRY_META = {
  tone: 'slate',
  icon: 'mdi-briefcase',
  label: t('leadMentor.positions.k4'),
} as const

const COMPANY_COLORS: Record<string, string> = {
  'goldman sachs': 'var(--primary)',
  'morgan stanley': '#1E40AF',
  'jp morgan': '#0369A1',
  'mckinsey': '#7C3AED',
  'bcg': '#059669',
  'google': '#EA4335',
}

const viewMode = ref<ViewMode>('list')
const publishSortDirection = ref<'default' | 'asc' | 'desc'>('default')
const expandedCategories = ref<string[]>([])
const expandedCompanies = ref<string[]>([])
const isMyStudentsModalOpen = ref(false)
const activeStudentsPreview = ref<PositionMyStudentsPreview | null>(null)
const isLoading = ref(false)
const isStudentsLoading = ref(false)

// industries 元数据：消费 @osg/shared 提供的字典（osg_company_type）
// 组件挂载时 load()，`industryMeta.value` 即 PositionMetaOption[]
const { meta: industryMeta, load: loadIndustryMeta } = useIndustryMeta()

const positionRows = ref<LeadMentorPositionListItem[]>([])
const positionMeta = ref<LeadMentorPositionMeta | null>(null)
const filters = reactive<LeadMentorPositionListParams>({
  positionCategory: undefined,
  industry: undefined,
  companyName: undefined,
  region: undefined,
  keyword: '',
})

// dict-ssot-remediation §4：公司 / 地区筛选下拉 = 字典 ∪ positionMeta 历史聚合值
const { items: companyDictOptions, load: loadCompanyDict } = useDictFacade('osg_company_name')
const { items: regionDictOptions, load: loadRegionDict } = useDictFacade('osg_region')
// FIX-C: 主攻方向字典回显（osg_major_direction），用于列表 a-tag 文本映射
const { items: majorDirectionDictOptions, load: loadMajorDirectionDict } = useDictFacade('osg_major_direction')

// i18n 字典翻译：按 locale 取 i18nKey → t()；缺失时 fallback 到后端原 label（zh）
const { tByI18nKey } = useI18nDict('admin.dict')

const regionDictMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const opt of regionDictOptions.value) map[opt.value] = tByI18nKey(opt.i18nKey, opt.label)
  return map
})

const majorDirectionMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const opt of majorDirectionDictOptions.value) map[opt.value] = tByI18nKey(opt.i18nKey, opt.label)
  return map
})

const filterOptions = computed<FilterOptions>(() => ({
  categories: positionMeta.value?.categories ?? [],
  industries: positionMeta.value?.industries ?? [],
  companies: mergeDictWithExistingValues(
    companyDictOptions.value,
    positionMeta.value?.companies ?? []
  ) as FilterOptions['companies'],
  regions: mergeDictWithExistingValues(
    regionDictOptions.value,
    positionMeta.value?.regions ?? []
  ) as FilterOptions['regions'],
}))

const categoryLabelMap = computed(() => buildLabelMap(positionMeta.value?.categories ?? []))

interface IndustryGroupMeta {
  /** 分组 key，用于 expandedCategories 绑定；优先用字典 value，否则用 trimmed label */
  id: string
  /** 分组显示 label（取原始 industry 字段或字典 label） */
  label: string
  /** CSS token（对应字典 css_class） */
  tone: string
  /** MDI icon class（对应字典 list_class） */
  icon: string
}

function resolveIndustryGroupMeta(industryRaw: string): IndustryGroupMeta {
  const trimmed = industryRaw?.trim() || ''
  const match = industryMeta.value.find((m) => m.value === trimmed)
  if (match) {
    return {
      id: match.value,
      label: match.label,
      tone: match.tone ?? FALLBACK_INDUSTRY_META.tone,
      icon: match.icon ?? FALLBACK_INDUSTRY_META.icon,
    }
  }
  // 字典未命中：保留原 industry 字符串作为分组 key 和 label（空值 → "未归类"），走 fallback 灰度样式
  return {
    id: trimmed || 'uncategorized',
    label: trimmed || FALLBACK_INDUSTRY_META.label,
    tone: FALLBACK_INDUSTRY_META.tone,
    icon: FALLBACK_INDUSTRY_META.icon,
  }
}

const categories = computed<PositionCategory[]>(() => {
  const groupedIndustries = new Map<
    string,
    {
      meta: IndustryGroupMeta
      companies: Map<string, PositionCompany>
    }
  >()

  positionRows.value.forEach((row) => {
    const industryRaw = row.industry ?? ''
    const industryGroupMeta = resolveIndustryGroupMeta(industryRaw)
    const industryKey = industryGroupMeta.id
    const companyKey = slugify(row.companyName || `${industryGroupMeta.label}-${row.positionId}`)
    const job = toPositionJob(row, categoryLabelMap.value)

    let industryGroup = groupedIndustries.get(industryKey)
    if (!industryGroup) {
      industryGroup = {
        meta: industryGroupMeta,
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
        locations: Array.from(
          new Set(company.jobs.map((job) => job.location).filter((value) => value && value !== '-')),
        ).join(', ') || '-',
        positionCount: company.jobs.length,
        studentCount: companyStudentCount,
      }
    })

    const positionCount = companies.reduce((sum, company) => sum + company.positionCount, 0)
    const studentCount = companies.reduce((sum, company) => sum + company.studentCount, 0)

    return {
      id: industryGroup.meta.id,
      label: industryGroup.meta.label,
      tone: industryGroup.meta.tone,
      icon: industryGroup.meta.icon,
      companySummary: t('leadMentor.positions.k15', { n: companies.length }),
      positionSummary: t('leadMentor.positions.k16', { n: positionCount }),
      studentSummary: t('leadMentor.positions.k17', { n: studentCount }),
      companies,
    }
  })
})

const allJobs = computed(() =>
  categories.value.flatMap((category) => category.companies.flatMap((company) => company.jobs)),
)

const footerStats = computed(() => {
  const total = allJobs.value.length
  const closed = allJobs.value.filter((job) => job.deadlineTone === 'closed').length
  const students = allJobs.value.reduce((sum, job) => sum + job.studentCount, 0)

  return {
    total,
    open: total - closed,
    closed,
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
// tone (industry CSS class 或 cycle keyword) → antd a-tag 预设颜色
const TONE_TO_ANTD_COLOR: Record<string, string> = {
  'industry-gold': 'gold',
  'industry-violet': 'purple',
  'industry-blue': 'blue',
  'industry-amber': 'orange',
  'industry-teal': 'cyan',
  'industry-indigo': 'geekblue',
  'industry-slate': 'default',
  info: 'blue',
  neutral: 'default',
}

const toAntdTagColor = (tone: string): string => TONE_TO_ANTD_COLOR[tone] ?? 'default'

// 把 LM 内部 PositionJob[] 转成共享 PositionsListTable 期望的 PositionTableRow[]
// 字段映射：title→positionName / officialUrl→companyWebsite / jobType→positionCategory / cycleLabel→recruitmentCycle / cycleTone→recruitmentCycleTone / publishDate→publishTime / recruitYear→projectYear
// industryTone：LM 内部用 'industry-amber' 这种带前缀的 CSS class 名；共享组件期望纯 tone 名（'amber' 等）
function stripIndustryPrefix(tone: string): IndustryTone {
  const stripped = tone.startsWith('industry-') ? tone.slice('industry-'.length) : tone
  return (stripped as IndustryTone) || 'slate'
}
const mappedListRows = computed<PositionTableRow[]>(() =>
  orderedListJobs.value.map((job) => ({
    positionId: job.positionId,
    positionName: job.title,
    companyName: job.companyName,
    companyWebsite: job.officialUrl,
    logoText: job.logoText,
    // 不传 logoColor：让共享组件按 industryTone 7 色配色（原型一致行为）
    industry: job.industry,
    industryTone: stripIndustryPrefix(job.industryTone),
    positionCategory: job.jobType || '-',
    location: job.location,
    recruitmentCycle: job.cycleLabel,
    recruitmentCycleTone: toAntdTagColor(job.cycleTone),
    projectYear: job.recruitYear,
    publishTime: job.publishDate,
    deadline: job.deadline,
    deadlineTone: job.deadlineTone,
    studentCount: job.studentCount,
    targetMajors: job.targetMajors,
  })),
)

// list 视图分页（与 Asst 一致：客户端分页）
const tablePagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total: number) => t('leadMentor.positions.k18', { n: total }),
})

watch(
  mappedListRows,
  (rows) => {
    tablePagination.total = rows.length
  },
  { immediate: true },
)

function handleTableChange(pagination: { current?: number; pageSize?: number }) {
  tablePagination.current = pagination.current ?? 1
  tablePagination.pageSize = pagination.pageSize ?? 20
}

function handleListOpenStudents(row: PositionTableRow) {
  const job = orderedListJobs.value.find((j) => j.positionId === row.positionId)
  if (job) openJobStudentsModal(job)
}

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

    const nextCompanyIds = new Set(
      nextCategories.flatMap((category) => category.companies.map((company) => company.id)),
    )
    expandedCompanies.value = expandedCompanies.value.filter((entry) => nextCompanyIds.has(entry))
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

// 共享 PositionsDrilldown 期望 Set<string>，LM 用 string[] 维护展开状态
const expandedIndustriesSet = computed(() => new Set(expandedCategories.value))
const expandedCompaniesSet = computed(() => new Set(expandedCompanies.value))

// industryTone：LM 内部用 'gold/violet/...' 纯 tone 名（与共享组件期望一致），无需剥离前缀
function lmStripPrefix(tone: string): IndustryTone {
  const stripped = tone.startsWith('industry-') ? tone.slice('industry-'.length) : tone
  return (stripped as IndustryTone) || 'slate'
}

// 把 LM 内部 PositionCategory[] 转成共享 PositionsDrilldown 的 PositionIndustryGroup[]
const mappedDrilldownIndustries = computed<PositionIndustryGroup[]>(() =>
  categories.value.map((category) => {
    const positionCount = category.companies.reduce((sum, c) => sum + c.jobs.length, 0)
    const studentCount = category.companies.reduce((sum, c) => sum + c.studentCount, 0)
    const tone = lmStripPrefix(category.tone)
    return {
      id: category.id,
      label: category.label,
      tone,
      icon: category.icon,
      companyCount: category.companies.length,
      positionCount,
      studentCount,
      companies: category.companies.map<PositionCompanyGroup>((company) => ({
        id: company.id,
        name: company.name,
        locations: company.locations,
        logoText: company.logoText,
        // 不传 logoColor：让共享组件按 industryTone 7 色配色（避免 LM 旧 COMPANY_COLORS 灰色 fallback 覆盖 industry tone）
        officialUrl: company.officialUrl,
        positionCount: company.positionCount,
        studentCount: company.studentCount,
        positions: company.jobs.map<PositionTableRow>((job) => ({
          positionId: job.positionId,
          positionName: job.title,
          companyName: job.companyName,
          companyWebsite: job.officialUrl,
          logoText: job.logoText,
          industry: job.industry,
          industryTone: lmStripPrefix(job.industryTone),
          positionCategory: job.jobType || '-',
          location: job.location,
          recruitmentCycle: job.cycleLabel,
          recruitmentCycleTone: toAntdTagColor(job.cycleTone),
          projectYear: job.recruitYear,
          publishTime: job.publishDate,
          deadline: job.deadline,
          deadlineTone: job.deadlineTone,
          studentCount: job.studentCount,
        })),
      })),
    }
  }),
)

function handleDrilldownToggleCompany(_industryId: string, companyId: string) {
  toggleCompany(companyId)
}

function handleDrilldownOpenCompanyStudents(company: PositionCompanyGroup) {
  // 从原始 categories 中找回 PositionCompany 调用 openCompanyStudentsModal
  for (const category of categories.value) {
    const original = category.companies.find((c) => c.id === company.id)
    if (original) {
      openCompanyStudentsModal(original)
      return
    }
  }
}

function handleDrilldownOpenPositionStudents(row: PositionTableRow) {
  const job = allJobs.value.find((j) => j.positionId === row.positionId)
  if (job) openJobStudentsModal(job)
}

const buildListParams = (): LeadMentorPositionListParams => {
  const nextParams: LeadMentorPositionListParams = {}

  Object.entries(filters).forEach(([key, value]) => {
    if (!value) {
      return
    }

    nextParams[key as keyof LeadMentorPositionListParams] = value
  })

  return nextParams
}

const loadPositionMeta = async () => {
  try {
    positionMeta.value = await getLeadMentorPositionMeta()
  } catch (_error) {
    positionMeta.value = null
    message.error(t('leadMentor.positions.k5'))
  }
}

const loadPositions = async () => {
  isLoading.value = true

  try {
    const response = await getLeadMentorPositionList(buildListParams())
    positionRows.value = Array.isArray(response?.rows) ? response.rows : []
  } catch (_error) {
    positionRows.value = []
    activeStudentsPreview.value = null
    isMyStudentsModalOpen.value = false
    message.error(t('leadMentor.positions.k6'))
  } finally {
    isLoading.value = false
  }
}

const loadPageData = async () => {
  await Promise.all([loadPositionMeta(), loadPositions()])
}

const handleFilterChange = () => {
  void loadPositions()
}

const handleMyStudentsModalVisibleChange = (visible: boolean) => {
  isMyStudentsModalOpen.value = visible
  if (!visible) {
    activeStudentsPreview.value = null
  }
}

const openJobStudentsModal = async (job: PositionJob) => {
  if (isStudentsLoading.value) {
    return
  }

  isStudentsLoading.value = true

  try {
    const students = await getLeadMentorPositionStudents(job.positionId)
    activeStudentsPreview.value = {
      companyName: job.companyName,
      jobTitle: job.title,
      students: students.map((student) => toMyStudentRecord(student, job.title)),
    }
    isMyStudentsModalOpen.value = true
  } catch (_error) {
    activeStudentsPreview.value = null
    isMyStudentsModalOpen.value = false
    message.error(t('leadMentor.positions.k7'))
  } finally {
    isStudentsLoading.value = false
  }
}

const openCompanyStudentsModal = (company: PositionCompany) => {
  const jobWithStudents = company.jobs.find((entry) => entry.studentCount > 0)
  if (!jobWithStudents) {
    return
  }

  void openJobStudentsModal(jobWithStudents)
}

onMounted(() => {
  void loadIndustryMeta()
  void loadCompanyDict().catch(() => undefined)
  void loadRegionDict().catch(() => undefined)
  void loadMajorDirectionDict().catch(() => undefined)
  void loadPageData()
})

function buildLabelMap(options: LeadMentorPositionMetaOption[]) {
  return options.reduce<Record<string, string>>((result, option) => {
    result[option.value] = option.label
    return result
  }, {})
}

function toPositionJob(
  row: LeadMentorPositionListItem,
  categoryLabels: Record<string, string>,
): PositionJob {
  const industryMetaResolved = resolveIndustryGroupMeta(row.industry ?? '')
  const companyName = row.companyName || '-'

  return {
    id: String(row.positionId),
    positionId: row.positionId,
    title: row.positionName || '-',
    // industry 对外展示用字典 label（命中时用字典 label，未命中时用原始字符串或"未归类"）
    industry: industryMetaResolved.label,
    // industryTone 直接作为 CSS class 使用：`industry-${tone}`，绑定字典 css_class 字段
    industryTone: `industry-${industryMetaResolved.tone}`,
    jobType: categoryLabels[row.positionCategory] || row.positionCategory || '-',
    // FIX-C: 地区优先取字典 label（osg_region），未命中则回退 department/city/原值
    location:
      regionDictMap.value[row.region ?? ''] ||
      row.department ||
      row.city ||
      row.region ||
      '-',
    cycleLabel: row.recruitmentCycle || row.projectYear || '-',
    cycleTone: resolveCycleTone(row.recruitmentCycle),
    recruitYear: row.projectYear || '-',
    publishDate: formatShortDate(row.publishTime),
    publishSortKey: toSortKey(row.publishTime),
    deadline: formatShortDate(row.deadline),
    deadlineTone: resolveDeadlineTone(row.deadline),
    studentCount: normalizeStudentCount(row),
    companyName,
    companyId: slugify(companyName),
    officialUrl: row.companyWebsite || row.positionUrl || '',
    logoText: buildLogoText(companyName),
    logoColor: resolveCompanyColor(companyName),
    targetMajors: row.targetMajors || undefined,
  }
}

function resolveCycleTone(recruitmentCycle?: string): ChipTone {
  const normalized = recruitmentCycle?.trim().toLowerCase() || ''
  if (normalized.includes('off')) {
    return 'neutral'
  }

  return 'info'
}

function resolveDeadlineTone(deadline?: string): DeadlineTone {
  if (!deadline) {
    return 'normal'
  }

  const deadlineTime = new Date(deadline).getTime()
  if (Number.isNaN(deadlineTime)) {
    return 'normal'
  }

  const now = Date.now()
  if (deadlineTime < now) {
    return 'closed'
  }

  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (deadlineTime - now <= sevenDays) {
    return 'urgent'
  }

  return 'normal'
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

function normalizeStudentCount(row: LeadMentorPositionListItem) {
  const rawValue = row.myStudentCount ?? row.studentCount ?? 0
  return Number.isFinite(rawValue) ? Number(rawValue) : 0
}

function toMyStudentRecord(
  row: LeadMentorPositionStudentRow,
  fallbackJobTitle: string,
): PositionMyStudentRecord {
  return {
    studentId: String(row.studentId),
    studentName: row.studentName || '-',
    jobTitle: row.positionName || fallbackJobTitle,
    statusLabel: row.currentStage || row.status || row.statusRemark || t('leadMentor.positions.k8'),
    statusTone: mapStudentTone(row.statusTone),
    lessonHours: `${row.usedHours ?? 0}h`,
  }
}

function mapStudentTone(statusTone?: LeadMentorPositionStudentRow['statusTone']): PositionStudentStatusTone {
  if (statusTone === 'success') {
    return 'offer'
  }
  if (statusTone === 'warning') {
    return 'interviewing'
  }
  return 'applied'
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'position'
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

/*
 * 按字典 osg_company_type 的 css_class 字段命名（7 色系 token）：
 *   gold | violet | blue | amber | teal | indigo | slate
 *
 * 过渡期说明：设计方案 TBD 前统一使用中性灰度，等 §五 未决问题 1（7 种公司分类各自的图标/配色规则）
 * 有结论后再补具体色值。此期间 7 个 tone 视觉一致，靠 label 文本区分。
 *
 * 同一 class 复用于 chip 场景（`.tag.industry-{tone}`）和 category header 场景（`.category-header.industry-{tone}`）。
 */
.industry-gold,
.industry-violet,
.industry-blue,
.industry-amber,
.industry-teal,
.industry-indigo,
.industry-slate {
  background: #f3f4f6;
  color: #4b5563;
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
