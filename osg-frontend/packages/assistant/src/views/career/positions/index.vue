<template>
  <div class="osg-page page-positions">
    <PageHeader
      title-zh="岗位信息"
      title-en="Job Tracker"
    >
      <template #actions>
        <a-radio-group v-model:value="viewMode" button-style="solid" size="small">
          <a-radio-button value="list">
            <i class="mdi mdi-format-list-bulleted" style="margin-right: 4px" />列表视图
          </a-radio-button>
          <a-radio-button value="drilldown">
            <i class="mdi mdi-file-tree" style="margin-right: 4px" />下钻视图
          </a-radio-button>
        </a-radio-group>
      </template>
    </PageHeader>

    <a-card :bordered="false" style="margin-top: 12px">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 10px; flex-wrap: wrap">
        <a-form-item>
          <a-select
            v-model:value="filters.category"
            placeholder="全部分类"
            allow-clear
            style="width: 140px"
          >
            <a-select-option v-for="option in categoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select
            v-model:value="filters.industry"
            placeholder="全部行业"
            allow-clear
            show-search
            style="width: 160px"
          >
            <a-select-option v-for="option in industryOptions" :key="option" :value="option">
              {{ resolveIndustryGroupMeta(option).label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select
            v-model:value="filters.companyName"
            placeholder="全部公司"
            allow-clear
            show-search
            style="width: 180px"
          >
            <a-select-option v-for="option in companyOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select
            v-model:value="filters.region"
            placeholder="全部地区"
            allow-clear
            style="width: 140px"
          >
            <a-select-option v-for="option in regionOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-input
            id="assistant-positions-keyword"
            v-model:value="filters.keyword"
            placeholder="搜索岗位/公司/城市..."
            allow-clear
            style="width: 200px"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-spin :spinning="loading" tip="正在加载岗位数据...">
        <a-alert
          v-if="errorMessage"
          type="error"
          show-icon
          :message="errorMessage"
          style="margin-bottom: 12px"
        >
          <template #action>
            <a-button size="small" type="primary" @click="loadPositions">重新加载</a-button>
          </template>
        </a-alert>

        <template v-if="viewMode === 'drilldown'">
          <PositionsDrilldown
            :industries="mappedDrilldownIndustries"
            :expanded-industries="expandedIndustries"
            :expanded-companies="expandedCompanies"
            @toggle-industry="toggleIndustry"
            @toggle-company="handleDrilldownToggleCompany"
            @open-company-students="handleDrilldownOpenCompanyStudents"
            @open-position-students="handleDrilldownOpenPositionStudents"
          />
        </template>


        <template v-else>
          <PositionsListTable
            :positions="mappedListRows"
            :pagination="tablePagination"
            @change="handleTableChange"
            @open-students="handleListOpenStudents"
          />
        </template>

        <PositionsFooter
          :total="filteredPositions.length"
          :open="openPositionCount"
          :closed="closedPositionCount"
          :students="linkedStudentCount"
        />
      </a-spin>
    </a-card>

    <a-modal
      v-model:open="studentModal.visible"
      wrap-class-name="osg-modal-form"
      :footer="null"
      width="720px"
      :title="studentModalTitle"
      @cancel="closeStudents"
    >
      <a-spin :spinning="studentModal.loading" tip="正在读取关联学员...">
        <a-alert
          v-if="studentModal.error"
          type="error"
          :message="studentModal.error"
          show-icon
          style="margin-bottom: 12px"
        />
        <a-table
          :columns="studentColumns"
          :data-source="studentModal.rows"
          :row-key="(r: AssistantPositionStudent) => `${r.studentId}-${r.positionName}`"
          :pagination="false"
          :locale="{ emptyText: '当前岗位暂无可展示的关联学员明细' }"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'studentName'">
              <div style="font-weight: 600">{{ record.studentName }}</div>
              <div style="color: #94a3b8; font-size: 12px">ID: {{ record.studentId }}</div>
            </template>
            <template v-else-if="column.dataIndex === 'status'">
              <a-tag :color="studentStatusColor(record.statusTone)">{{ record.status }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'usedHours'">
              {{ record.usedHours }} h
            </template>
          </template>
        </a-table>
      </a-spin>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { useDictFacade, mergeDictWithExistingValues } from '@osg/shared'
import {
  getAssistantPositionList,
  getAssistantPositionStudents,
  type AssistantPositionListItem,
  type AssistantPositionStudent,
} from '@osg/shared/api'
import {
  useIndustryMeta,
  PositionsFooter,
  PositionsListTable,
  PositionsDrilldown,
  resolveDeadlineTone,
  type PositionTableRow,
  type PositionIndustryGroup,
  type PositionCompanyGroup,
  type IndustryTone,
} from '@osg/shared'

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
  targetMajors?: string
  projectYear: string
  publishTime?: string
  deadline?: string
  displayStatus: string
  positionUrl?: string
  studentCount?: number
  myStudentCount?: number
}

interface GroupedCompany {
  companyName: string
  companyType?: string
  companyWebsite?: string
  logoText: string
  positionCount: number
  openCount: number
  studentCount: number
  locations: string
  positions: PositionRecord[]
}

interface GroupedIndustry {
  industryId: string
  industry: string
  tone: string
  iconClass: string
  companyCount: number
  positionCount: number
  openCount: number
  studentCount: number
  companies: GroupedCompany[]
}

const FALLBACK_TONE = 'slate'
const FALLBACK_ICON = 'mdi-briefcase'

const { meta: industryMeta, load: loadIndustryMeta } = useIndustryMeta()

function resolveIndustryGroupMeta(industryRaw: string) {
  const trimmed = industryRaw?.trim() || ''
  const match = industryMeta.value.find((m) => m.value === trimmed)
  if (match) {
    return {
      id: match.value,
      label: match.label,
      tone: match.tone ?? FALLBACK_TONE,
      icon: match.icon ?? FALLBACK_ICON,
    }
  }
  return {
    id: trimmed || 'uncategorized',
    label: trimmed || '未归类',
    tone: FALLBACK_TONE,
    icon: FALLBACK_ICON,
  }
}

const viewMode = ref<ViewMode>('list')
const loading = ref(true)
const errorMessage = ref('')
const allPositions = ref<PositionRecord[]>([])

const filters = reactive({
  keyword: '',
  category: undefined as string | undefined,
  industry: undefined as string | undefined,
  companyName: undefined as string | undefined,
  region: undefined as string | undefined,
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

const expandedIndustries = ref(new Set<string>())
const expandedCompanies = ref(new Set<string>())

const tablePagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total: number) => `共 ${total} 条`,
})

const studentColumns = [
  { title: '学员', dataIndex: 'studentName', key: 'studentName' },
  { title: '当前状态', dataIndex: 'status', key: 'status', width: 140 },
  { title: '已用课时', dataIndex: 'usedHours', key: 'usedHours', width: 110 },
]

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
  Array.from(new Set(allPositions.value.map((p) => p.positionCategory)))
    .filter(Boolean)
    .map((value) => ({ value, label: categoryLabelMap[value] || value })),
)

const industryOptions = computed(() =>
  Array.from(new Set(allPositions.value.map((p) => p.industry))).filter(Boolean),
)

// dict-ssot-remediation §4：公司 / 地区筛选下拉 = 字典 ∪ positions 行数据动态聚合值
const { items: companyDictOptions, load: loadCompanyDict } = useDictFacade('osg_company_name')
const { items: regionDictOptions, load: loadRegionDict } = useDictFacade('osg_region')

const companyOptions = computed(() =>
  mergeDictWithExistingValues(
    companyDictOptions.value,
    Array.from(new Set(allPositions.value.map((p) => p.companyName))).filter(Boolean) as string[]
  )
)

const regionOptions = computed(() =>
  mergeDictWithExistingValues(
    regionDictOptions.value,
    Array.from(new Set(allPositions.value.map((p) => p.region))).filter(Boolean) as string[]
  )
)

const isOpenStatus = (status?: string) => status === 'visible' || status === 'success'

const openPositionCount = computed(
  () => filteredPositions.value.filter((p) => isOpenStatus(p.displayStatus)).length,
)

const closedPositionCount = computed(
  () => filteredPositions.value.filter((p) => !isOpenStatus(p.displayStatus)).length,
)

const linkedStudentCount = computed(() =>
  filteredPositions.value.reduce((sum, p) => sum + Number(p.studentCount || 0), 0),
)

// 把 PositionRecord[] 转成共享 PositionsListTable 期望的 PositionTableRow[]
// （增强字段：industryTone / categoryLabel / location / deadlineTone / logoText 等）
const mappedListRows = computed<PositionTableRow[]>(() =>
  filteredPositions.value.map((record) => {
    const meta = resolveIndustryGroupMeta(record.industry)
    return {
      positionId: record.positionId,
      positionName: record.positionName,
      positionUrl: record.positionUrl,
      companyName: record.companyName,
      companyWebsite: record.companyWebsite,
      logoText: buildLogoText(record.companyName),
      industry: meta.label,
      industryTone: meta.tone as IndustryTone,
      positionCategory: categoryLabelMap[record.positionCategory] || record.positionCategory || '-',
      department: record.department,
      location: formatLocation(record),
      recruitmentCycle: record.recruitmentCycle,
      recruitmentCycleTone: cycleTagColor(record.recruitmentCycle),
      projectYear: record.projectYear,
      publishTime: formatDate(record.publishTime),
      deadline: formatDate(record.deadline),
      deadlineTone: resolveDeadlineTone(record.deadline),
      studentCount: record.studentCount,
    }
  }),
)

function handleListOpenStudents(row: PositionTableRow) {
  const position = filteredPositions.value.find((p) => p.positionId === row.positionId)
  if (position) {
    void openStudents(position)
  }
}

const groupedPositions = computed<GroupedIndustry[]>(() => {
  const industries = new Map<string, GroupedIndustry>()

  filteredPositions.value.forEach((position) => {
    const industryKey = position.industry || '未归类行业'
    const meta = resolveIndustryGroupMeta(industryKey)
    const industry =
      industries.get(industryKey) || {
        industryId: industryKey,
        industry: meta.label,
        tone: meta.tone,
        iconClass: meta.icon,
        companyCount: 0,
        positionCount: 0,
        openCount: 0,
        studentCount: 0,
        companies: [] as GroupedCompany[],
      }

    let company = industry.companies.find((entry) => entry.companyName === position.companyName)
    if (!company) {
      company = {
        companyName: position.companyName,
        companyType: position.companyType,
        companyWebsite: position.companyWebsite,
        logoText: buildLogoText(position.companyName),
        positionCount: 0,
        openCount: 0,
        studentCount: 0,
        locations: '',
        positions: [],
      }
      industry.companies.push(company)
    }

    company.positions.push(position)
    company.positionCount += 1
    if (isOpenStatus(position.displayStatus)) {
      company.openCount += 1
      industry.openCount += 1
    }
    company.studentCount += Number(position.studentCount || 0)
    company.locations = Array.from(
      new Set(company.positions.map((entry) => formatLocation(entry)).filter((v) => v && v !== '-')),
    ).join(', ')

    industry.positionCount += 1
    industry.studentCount += Number(position.studentCount || 0)
    industries.set(industryKey, industry)
  })

  return Array.from(industries.values())
    .map((industry) => ({
      ...industry,
      companyCount: industry.companies.length,
      companies: industry.companies.sort((a, b) => a.companyName.localeCompare(b.companyName)),
    }))
    .sort((a, b) => a.industry.localeCompare(b.industry))
})

// 把 Asst 内部 GroupedIndustry[] 转成共享 PositionsDrilldown 的 PositionIndustryGroup[]
const mappedDrilldownIndustries = computed<PositionIndustryGroup[]>(() =>
  groupedPositions.value.map((industry) => ({
    id: industry.industryId,
    label: industry.industry,
    tone: (industry.tone as IndustryTone) || 'slate',
    icon: industry.iconClass,
    companyCount: industry.companyCount,
    positionCount: industry.positionCount,
    studentCount: industry.studentCount,
    companies: industry.companies.map((company) => ({
      id: `${industry.industryId}::${company.companyName}`,
      name: company.companyName,
      locations: company.locations,
      logoText: company.logoText,
      officialUrl: company.companyWebsite,
      positionCount: company.positionCount,
      studentCount: company.studentCount,
      positions: company.positions.map((position) => mapPositionToTableRow(position, industry.tone as IndustryTone)),
    })),
  })),
)

function mapPositionToTableRow(record: PositionRecord, tone: IndustryTone): PositionTableRow {
  return {
    positionId: record.positionId,
    positionName: record.positionName,
    positionUrl: record.positionUrl,
    companyName: record.companyName,
    companyWebsite: record.companyWebsite,
    logoText: buildLogoText(record.companyName),
    industry: record.industry,
    industryTone: tone,
    positionCategory: categoryLabelMap[record.positionCategory] || record.positionCategory || '-',
    department: record.department,
    location: formatLocation(record),
    recruitmentCycle: record.recruitmentCycle,
    recruitmentCycleTone: cycleTagColor(record.recruitmentCycle),
    projectYear: record.projectYear,
    publishTime: formatDate(record.publishTime),
    deadline: formatDate(record.deadline),
    deadlineTone: resolveDeadlineTone(record.deadline),
    studentCount: record.studentCount,
    targetMajors: record.targetMajors,
    myStudentCount: record.myStudentCount,
  }
}

function handleDrilldownToggleCompany(industryId: string, companyId: string) {
  // companyId 形如 "industryId::companyName"，从中拆出 companyName 调用原 toggleCompany
  const prefix = `${industryId}::`
  const companyName = companyId.startsWith(prefix) ? companyId.slice(prefix.length) : companyId
  toggleCompany(industryId, companyName)
}

function handleDrilldownOpenCompanyStudents(company: PositionCompanyGroup) {
  // 从原始 groupedPositions 中找回 GroupedCompany 调用原 openCompanyStudents
  for (const industry of groupedPositions.value) {
    const original = industry.companies.find((c) => `${industry.industryId}::${c.companyName}` === company.id)
    if (original) {
      void openCompanyStudents(original)
      return
    }
  }
}

function handleDrilldownOpenPositionStudents(row: PositionTableRow) {
  const position = filteredPositions.value.find((p) => p.positionId === row.positionId)
  if (position) void openStudents(position)
}

const studentModalTitle = computed(() => {
  const p = studentModal.position
  if (!p) return '关联学员'
  return `关联学员 · ${p.positionName || '-'} · ${p.companyName || '-'}`
})

function formatDate(value?: string) {
  if (!value) return '-'
  return value.slice(0, 10)
}

function formatLocation(position: PositionRecord) {
  return [position.region, position.city].filter(Boolean).join(' / ') || '-'
}

function cycleTagColor(cycle?: string) {
  return cycle?.toLowerCase().includes('off') ? 'default' : 'purple'
}

function studentStatusColor(tone?: string) {
  if (tone === 'success') return 'green'
  if (tone === 'warning') return 'orange'
  if (tone === 'danger') return 'red'
  if (tone === 'info') return 'blue'
  return 'default'
}

function buildLogoText(companyName: string) {
  const parts = (companyName || '')
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean)

  if (!parts.length) return 'OSG'

  return parts
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function toggleIndustry(industryId: string) {
  const next = new Set(expandedIndustries.value)
  if (next.has(industryId)) next.delete(industryId)
  else next.add(industryId)
  expandedIndustries.value = next
}

function toggleCompany(industryId: string, companyName: string) {
  const key = `${industryId}::${companyName}`
  const next = new Set(expandedCompanies.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedCompanies.value = next
}

function handleTableChange(pag: { current?: number; pageSize?: number }) {
  tablePagination.current = pag.current ?? 1
  tablePagination.pageSize = pag.pageSize ?? 20
}

function handleReset() {
  filters.keyword = ''
  filters.category = undefined
  filters.industry = undefined
  filters.companyName = undefined
  filters.region = undefined
  tablePagination.current = 1
}

async function loadPositions() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getAssistantPositionList()
    allPositions.value = (result || []).map(mapListItemToRecord)
  } catch (error: any) {
    errorMessage.value = error?.message || '岗位列表暂时无法加载，请稍后重试。'
  } finally {
    loading.value = false
  }
}

function mapListItemToRecord(item: AssistantPositionListItem): PositionRecord {
  return {
    positionId: item.positionId,
    positionCategory: item.positionCategory || '',
    industry: item.industry || '',
    companyName: item.companyName || '',
    companyType: item.companyType,
    companyWebsite: item.companyWebsite,
    positionName: item.positionName || '',
    department: item.department,
    region: item.region || '',
    city: item.city || '',
    recruitmentCycle: item.recruitmentCycle || '',
    targetMajors: item.targetMajors,
    projectYear: item.projectYear || '',
    publishTime: item.publishTime,
    deadline: item.deadline,
    displayStatus: item.displayStatus || 'visible',
    positionUrl: item.positionUrl,
    studentCount: item.myStudentCount,
    myStudentCount: item.myStudentCount,
  }
}

async function openStudents(position: PositionRecord) {
  studentModal.visible = true
  studentModal.loading = true
  studentModal.error = ''
  studentModal.rows = []
  studentModal.position = position

  try {
    const result = await getAssistantPositionStudents(position.positionId)
    studentModal.rows = result.rows
  } catch (error: any) {
    studentModal.error = error?.message || '关联学员暂时无法加载。'
  } finally {
    studentModal.loading = false
  }
}

function openCompanyStudents(company: GroupedCompany) {
  const position = company.positions.find((entry) => Number(entry.studentCount || 0) > 0)
  if (!position) return
  void openStudents(position)
}

function closeStudents() {
  studentModal.visible = false
  studentModal.loading = false
  studentModal.error = ''
  studentModal.rows = []
  studentModal.position = null
}

onMounted(() => {
  void loadIndustryMeta()
  void loadCompanyDict().catch(() => undefined)
  void loadRegionDict().catch(() => undefined)
  void loadPositions()
})
</script>

<style scoped lang="scss">
.deadline-urgent {
  color: #ef4444;
  font-weight: 600;
}

.deadline-closed {
  color: #94a3b8;
  text-decoration: line-through;
}

.positions-drilldown {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.positions-drilldown__industry {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 4px 12px rgba(134, 148, 196, 0.08);
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

.positions-drilldown__industry-head--gold   { background: linear-gradient(90deg, #fff1bf 0%, #fffdf6 100%); }
.positions-drilldown__industry-head--violet { background: linear-gradient(90deg, #f2e7ff 0%, #f8f5ff 100%); }
.positions-drilldown__industry-head--blue   { background: linear-gradient(90deg, #ddebff 0%, #f8fbff 100%); }
.positions-drilldown__industry-head--amber  { background: linear-gradient(90deg, #fff2c9 0%, #fffdf6 100%); }
.positions-drilldown__industry-head--teal   { background: linear-gradient(90deg, #ccfbf1 0%, #f0fdfa 100%); }
.positions-drilldown__industry-head--indigo { background: linear-gradient(90deg, #e0e7ff 0%, #f5f7ff 100%); }
.positions-drilldown__industry-head--slate  { background: linear-gradient(90deg, #edf2f7 0%, #f8fafc 100%); }

.positions-drilldown__industry-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.positions-drilldown__industry-main strong {
  font-size: 15px;
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
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.positions-drilldown__company-meta strong {
  display: block;
  color: #1f2937;
}

.positions-drilldown__company-meta span {
  color: #64748b;
  font-size: 12px;
}

.positions-drilldown__company-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.positions-drilldown__company-logo--gold   { background: #a85a18; }
.positions-drilldown__company-logo--violet { background: #7c3aed; }
.positions-drilldown__company-logo--blue   { background: #2563eb; }
.positions-drilldown__company-logo--amber  { background: #d97706; }
.positions-drilldown__company-logo--teal   { background: #0f766e; }
.positions-drilldown__company-logo--indigo { background: #4f46e5; }
.positions-drilldown__company-logo--slate  { background: #64748b; }

.positions-drilldown__position-list {
  margin-left: 44px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}


@media (max-width: 1120px) {
  .positions-drilldown__industry-head,
  .positions-drilldown__company-head {
    flex-direction: column;
    align-items: flex-start;
  }
  .positions-drilldown__position-list {
    margin-left: 0;
  }
}
</style>
