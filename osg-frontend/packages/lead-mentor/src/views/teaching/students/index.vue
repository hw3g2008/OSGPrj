<template>
  <div id="page-student-list" class="page-student-list">
    <PageHeader
      :title-zh="t('leadMentor.students.k30')"
      title-en="Student List"
    />

    <section class="filters">
      <input
        v-model="filters.keyword"
        class="form-input"
        type="text"
        :placeholder="t('leadMentor.students.k31')"
      />
      <select v-model="filters.relation" class="form-select">
        <option value="">{{ t('leadMentor.students.k13') }}</option>
        <option
          v-for="option in meta.relationOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ resolveRelationLabel(option.value, option.label) }}
        </option>
      </select>
      <select v-model="filters.school" class="form-select">
        <option value="">{{ t('leadMentor.students.k14') }}</option>
        <option
          v-for="option in mergedSchoolOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <select v-model="filters.direction" class="form-select">
        <option value="">{{ t('leadMentor.students.k15') }}</option>
        <option
          v-for="option in mergedMajorDirectionOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ resolveDictLabel(option as { value: string; label: string; i18nKey?: string }) }}
        </option>
      </select>
      <button type="button" class="btn" @click="handleSearch">
        <i class="mdi mdi-magnify" aria-hidden="true" />
        {{ t('leadMentor.students.k16') }}
      </button>
      <button type="button" class="btn btn-text" @click="handleReset">
        <i class="mdi mdi-refresh" aria-hidden="true" />
        {{ t('leadMentor.students.k17') }}
      </button>
    </section>

    <section class="card">
      <div class="card-body">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{{ t('leadMentor.students.k18') }}</th>
                <th>{{ t('leadMentor.students.k19') }}</th>
                <th>{{ t('leadMentor.students.k20') }}</th>
                <th>{{ t('leadMentor.students.k14') }}</th>
                <th>{{ t('leadMentor.students.k15') }}</th>
                <th>{{ t('leadMentor.students.k21') }}</th>
                <th>{{ t('leadMentor.students.k22') }}</th>
                <th>OFFER</th>
                <th>{{ t('leadMentor.students.k23') }}</th>
                <th>{{ t('leadMentor.students.k24') }}</th>
                <th>{{ t('leadMentor.students.k25') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in studentRows" :key="row.studentId">
                <td>{{ row.studentId }}</td>
                <td class="name-cell">
                  <button type="button" class="name-link" @click="handleViewJob(row)">
                    {{ row.studentName }}
                  </button>
                </td>
                <td class="email-cell">{{ row.email }}</td>
                <td>
                  <div class="relation-tags">
                    <span
                      v-for="relation in row.relations"
                      :key="relation.value"
                      class="relation-tag"
                      :class="relation.tone"
                    >
                      {{ resolveRelationLabel(relation.value, relation.label) }}
                    </span>
                  </div>
                </td>
                <td>{{ row.school }}</td>
                <td>
                  <span class="direction-tag" :class="row.directionTone">{{ row.direction }}</span>
                </td>
                <td class="metric metric--delivery">{{ row.applyCount }}</td>
                <td class="metric metric--interview">{{ row.interviewCount }}</td>
                <td class="metric metric--offer">{{ row.offerCount }}</td>
                <td><RemainingHoursCell :hours="row.rawRemainingHours" /></td>
                <td>
                  <StudentStatusTag :account-status="row.rawAccountStatus" />
                </td>
                <td>
                  <button
                    type="button"
                    class="btn btn-link"
                    data-action="view-job-overview"
                    @click="handleViewJob(row)"
                  >
                    {{ t('leadMentor.students.k26') }}
                  </button>
                </td>
              </tr>
              <tr v-if="studentRows.length === 0">
                <td colspan="12" class="empty-state">{{ t('leadMentor.students.k27') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div class="page-footer">
      <span class="page-total">{{ t('leadMentor.students.k35', { count: studentRows.length }) }}</span>
      <div class="pagination">
        <button type="button" class="pager-btn" disabled>{{ t('leadMentor.students.k28') }}</button>
        <button type="button" class="pager-btn pager-btn--active">1</button>
        <button type="button" class="pager-btn" disabled>{{ t('leadMentor.students.k29') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { StudentStatusTag, RemainingHoursCell } from '@osg/shared/components'
import { useDictFacade, mergeDictWithExistingValues, useI18nDict } from '@osg/shared'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  getLeadMentorStudentList,
  getLeadMentorStudentMeta,
  type LeadMentorStudentListItem,
  type LeadMentorStudentListParams,
  type LeadMentorStudentMeta,
} from '@osg/shared/api'

const { t, te } = useI18n()
const { tByI18nKey } = useI18nDict('admin.dict')

function resolveRelationLabel(value?: string, fallback?: string): string {
  const key = `leadMentor.students.relationOption.${value ?? ''}`
  return value && te(key) ? (t(key) as string) : (fallback ?? '-')
}

function resolveDictLabel(option: { value: string; label: string; i18nKey?: string }): string {
  return tByI18nKey(option.i18nKey, option.label)
}

interface RelationTag {
  value: string
  label: string
  tone: string
}

interface StudentRow {
  studentId: number
  studentName: string
  email: string
  relations: RelationTag[]
  school: string
  direction: string
  directionTone: string
  applyCount: number
  interviewCount: number
  offerCount: number
  rawRemainingHours: number
  rawAccountStatus: string
  accountStatusLabel: string
}

interface SelectOption {
  value: string
  label: string
}

type StudentFilters = {
  keyword: string
  relation: '' | 'coaching' | 'managed' | 'dual'
  school: string
  direction: string
}

const showUpcomingToast = inject<() => void>('showUpcomingToast', () => {})
const router = useRouter()
const rows = ref<LeadMentorStudentListItem[]>([])
const meta = reactive<LeadMentorStudentMeta>({
  relationOptions: [],
  schools: [],
  majorDirections: [],
  accountStatuses: [],
})

const filters = reactive<StudentFilters>({
  keyword: '',
  relation: '',
  school: '',
  direction: '',
})

const studentRows = computed<StudentRow[]>(() =>
  rows.value.map((row) => ({
    studentId: row.studentId,
    studentName: row.studentName || '-',
    email: row.email || '-',
    relations: normalizeRelations(row.relations),
    school: row.school || '-',
    direction: row.majorDirection || '-',
    directionTone: resolveDirectionTone(row.majorDirection),
    applyCount: Number(row.applyCount ?? 0),
    interviewCount: Number(row.interviewCount ?? 0),
    offerCount: Number(row.offerCount ?? 0),
    rawRemainingHours: Number(row.remainingHours ?? 0),
    rawAccountStatus: String(row.accountStatus ?? ''),
    accountStatusLabel: String(row.accountStatusLabel ?? ''),
  })),
)

const buildListParams = (): LeadMentorStudentListParams => {
  const params: LeadMentorStudentListParams = {}

  if (filters.keyword) {
    params.keyword = filters.keyword
  }
  if (filters.relation) {
    params.relation = filters.relation
  }
  if (filters.school) {
    params.school = filters.school
  }
  if (filters.direction) {
    params.majorDirection = filters.direction
  }

  return params
}

const loadMeta = async () => {
  const response = await getLeadMentorStudentMeta()
  meta.relationOptions = normalizeOptions(response?.relationOptions)
  meta.schools = normalizeOptions(response?.schools)
  meta.majorDirections = normalizeOptions(response?.majorDirections)
  meta.accountStatuses = normalizeOptions(response?.accountStatuses)
}

const loadRows = async () => {
  const response = await getLeadMentorStudentList(buildListParams())
  rows.value = Array.isArray(response?.rows) ? response.rows : []
}

// dict-ssot-remediation §4：学校 / 主攻方向筛选下拉 = 字典 ∪ meta 历史聚合值
const { items: schoolDictOptions, load: loadSchoolDict } = useDictFacade('osg_school')
const { items: majorDirectionDictOptions, load: loadMajorDirectionDict } = useDictFacade('osg_major_direction')
const mergedSchoolOptions = computed(() =>
  mergeDictWithExistingValues(schoolDictOptions.value, meta.schools)
)
const mergedMajorDirectionOptions = computed(() =>
  mergeDictWithExistingValues(majorDirectionDictOptions.value, meta.majorDirections)
)

const loadPage = async () => {
  // 字典加载失败不阻断主流程：合并策略 ∪ 会降级为只用 meta 历史值
  void loadSchoolDict().catch(() => undefined)
  void loadMajorDirectionDict().catch(() => undefined)
  try {
    await Promise.all([loadMeta(), loadRows()])
  } catch (_error) {
    rows.value = []
    message.error(t('leadMentor.students.k32'))
  }
}

const handleSearch = () => {
  void loadRows()
}

const handleReset = () => {
  filters.keyword = ''
  filters.relation = ''
  filters.school = ''
  filters.direction = ''
  void loadRows()
}

const handleViewJob = (row: StudentRow) => {
  if (!row.studentName || row.studentName === '-') {
    showUpcomingToast()
    return
  }
  void router.push({
    path: '/career/job-overview',
    query: { studentName: row.studentName },
  })
}

onMounted(() => {
  void loadPage()
})

function normalizeRelations(relations?: LeadMentorStudentListItem['relations']) {
  if (!Array.isArray(relations) || relations.length === 0) {
    return [{ value: 'managed', label: t('leadMentor.students.k33'), tone: 'relation-tag--warning' }]
  }

  return relations.map((relation) => ({
    value: relation.value,
    label: relation.label,
    tone: resolveRelationTone(relation.value, relation.tone),
  }))
}

function normalizeOptions(options?: SelectOption[]) {
  return Array.isArray(options) ? options : []
}

function resolveRelationTone(value?: string, tone?: string) {
  if (tone === 'primary' || value === 'coaching') {
    return 'relation-tag--primary'
  }
  if (tone === 'warning' || value === 'managed') {
    return 'relation-tag--warning'
  }
  return 'relation-tag--primary'
}

function resolveDirectionTone(direction?: string) {
  const normalized = (direction || '').toLowerCase()
  if (normalized.includes('tech') || normalized.includes(t('leadMentor.students.k34'))) {
    return 'direction-tag--tech'
  }
  return 'direction-tag--finance'
}


</script>

<style scoped lang="scss">
.page-student-list {
  display: block;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
}

.page-title-en {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}

.page-sub {
  margin-top: 8px;
  color: var(--text2);
  font-size: 14px;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.form-input,
.form-select {
  height: 46px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  color: var(--text);
  font-size: 14px;
  box-shadow: 0 10px 24px rgba(148, 163, 184, 0.08);
}

.form-input {
  width: 160px;
  padding: 0 14px;
}

.form-select {
  min-width: 128px;
  padding: 0 36px 0 12px;
  appearance: none;
  background: #fff
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")
    no-repeat right 12px center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 42px;
  padding: 10px 20px;
  border: 0;
  border-radius: 10px;
  background: #fff;
  color: #5b7fab;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 10px 24px rgba(148, 163, 184, 0.08);
  cursor: pointer;
}

.btn-text {
  padding: 10px 12px;
  color: #7399c6;
  box-shadow: none;
}

.btn-link {
  height: auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: #7399c6;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.card {
  margin-bottom: 20px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.card-body {
  padding: 0;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.table th,
.table td {
  padding: 16px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.table th {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  background: #f8fbff;
}

.table tbody tr:last-child td {
  border-bottom: 0;
}

.name-cell {
  min-width: 96px;
}

.name-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: #7399c6;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.email-cell {
  font-size: 12px;
  color: #475569;
}

.relation-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.relation-tag,
.direction-tag,
.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.relation-tag--primary {
  background: #dbeafe;
  color: #5f82bb;
}

.relation-tag--warning {
  background: #fef3c7;
  color: #d48b22;
}

.direction-tag {
  min-width: 82px;
}

.direction-tag--finance {
  background: #dbe8f8;
  color: #6b86af;
}

.direction-tag--tech {
  background: #fef3c7;
  color: #d48b22;
}

.metric {
  font-weight: 700;
}

.metric--delivery {
  color: #1d8fe8;
}

.metric--interview {
  color: #f59e0b;
}

.metric--offer {
  color: #22c55e;
}

.remaining-hours {
  font-weight: 700;
}

.remaining-hours--success {
  color: #22c55e;
}

.remaining-hours--warning {
  color: #f59e0b;
}

.status-tag--active {
  background: #d1fae5;
  color: #16a34a;
}

.status-tag--frozen {
  background: #dbeafe;
  color: #5f82bb;
}

.page-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.page-total {
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
}

.pagination {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.pager-btn {
  min-width: 48px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.pager-btn:disabled {
  opacity: 1;
}

.pager-btn--active {
  min-width: 36px;
  background: #7399c6;
  border-color: #7399c6;
  color: #fff;
}

@media (max-width: 960px) {
  .filters {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-input,
  .form-select,
  .btn,
  .btn-text {
    width: 100%;
  }

  .page-footer {
    align-items: stretch;
  }

  .pagination {
    justify-content: flex-end;
  }
}

@media (max-width: 720px) {
  .filters {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
  }

  .table th,
  .table td {
    padding: 12px 10px;
  }
}
</style>
