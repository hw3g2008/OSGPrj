<template>
  <div id="page-mock-practice">
    <PageHeader
      :title-zh="t('mentor.mockPractice.k10')"
      title-en="Mock Practice"
    />

    <!-- 列表 -->
    <a-card :bordered="false">
      <a-form layout="inline" class="filter-bar" style="margin-bottom: 16px">
        <a-form-item :label="t('mentor.mockPractice.k11')">
          <a-input
            v-model:value="filters.company"
            :placeholder="t('mentor.mockPractice.k12')"
            style="width:200px"
            allow-clear
            @change="applyFilters"
          />
        </a-form-item>
        <a-form-item :label="t('mentor.mockPractice.k13')">
          <a-select v-model:value="filters.practiceType" style="width:160px" @change="applyFilters">
            <a-select-option value="">{{ t('mentor.mockPractice.k1') }}</a-select-option>
            <a-select-option value="mock_interview">{{ t('mentor.mockPractice.k2') }}</a-select-option>
            <a-select-option value="relation_test">{{ t('mentor.mockPractice.k3') }}</a-select-option>
            <a-select-option value="midterm_exam">{{ t('mentor.mockPractice.k4') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="t('mentor.mockPractice.k14')">
          <a-range-picker
            v-model:value="filters.scheduledRange"
            style="width:260px"
            value-format="YYYY-MM-DD"
            @change="applyFilters"
          />
        </a-form-item>
        <a-form-item :label="t('mentor.mockPractice.k15')">
          <a-select v-model:value="filters.reported" style="width:140px" @change="applyFilters">
            <a-select-option value="">{{ t('mentor.mockPractice.k1') }}</a-select-option>
            <a-select-option value="true">{{ t('mentor.mockPractice.k5') }}</a-select-option>
            <a-select-option value="false">{{ t('mentor.mockPractice.k6') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="applyFilters">
            <i class="mdi mdi-magnify" style="margin-right:4px" />{{ t('mentor.mockPractice.k7') }}
          </a-button>
        </a-form-item>
        <a-form-item>
          <a-button type="link" @click="resetFilters">
            <i class="mdi mdi-refresh" style="margin-right:4px" />{{ t('mentor.mockPractice.k8') }}
          </a-button>
        </a-form-item>
      </a-form>

      <a-table
        :columns="columns"
        :data-source="filteredList"
        :pagination="false"
        :row-key="(r: any) => r.practiceId ?? r.id"
        :custom-row="customRow"
        :locale="t('mentor.mockPractice.k16')"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'practiceType'">
            <PracticeTypeTag :practice-type="record.practiceType" show-icon />
          </template>
          <template v-else-if="column.key === 'assignedTime'">
            <span class="text-sm">{{ formatDate(record.assignedTime) }}</span>
          </template>
          <template v-else-if="column.key === 'lessonReported'">
            <span style="font-weight:600;color:#1E40AF">{{ record.lessonReported ?? 0 }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="openReportModalFor(record)">{{ t('mentor.mockPractice.k9') }}</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <ReportModal
      v-if="showReportModal"
      v-model:visible="showReportModal"
      :prefilled-student-id="reportPrefill?.studentId"
      :prefilled-reference-type="reportPrefill?.referenceType"
      :prefilled-reference-id="reportPrefill?.referenceId"
      @submitted="onReportSubmitted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { PracticeTypeTag } from '@osg/shared/components'
import { http } from '@osg/shared/utils/request'
import ReportModal from '../courses/components/ReportModal.vue'
import type { ReferenceType } from '@osg/shared/types/classReport'

const { t } = useI18n()

const MENTOR_NAV_BADGE_KEY = Symbol.for('mentor-nav-badges')

type MentorNavBadgeState = {
  mockBadge: Ref<number>
  refreshMockBadge: () => Promise<void>
}

const list = ref<any[]>([])
const filters = ref<{ company: string; practiceType: string; scheduledRange: string[] | null; reported: string }>({
  company: '',
  practiceType: '',
  scheduledRange: null,
  reported: '',
})
const mentorNavBadges = inject<MentorNavBadgeState | null>(MENTOR_NAV_BADGE_KEY, null)
const rowAnchors = ref<Map<number, string>>(new Map())

const showReportModal = ref(false)
const reportPrefill = ref<{ studentId?: number; referenceType?: ReferenceType; referenceId?: number } | null>(null)

const filteredList = computed(() => list.value)

const columns = [
  { title: t('mentor.mockPractice.k17'), key: 'studentId', dataIndex: 'studentId' },
  { title: t('mentor.mockPractice.k18'), key: 'studentName', dataIndex: 'studentName' },
  { title: t('mentor.mockPractice.k19'), key: 'practiceType', dataIndex: 'practiceType' },
  { title: t('mentor.mockPractice.k20'), key: 'assignedTime', dataIndex: 'assignedTime' },
  { title: t('mentor.mockPractice.k21'), key: 'lessonReported', dataIndex: 'lessonReported' },
  { title: t('mentor.mockPractice.k22'), key: 'action' },
]

function customRow(record: any) {
  const id = rowDomId(record)
  return id ? { id, class: rowClass(record) } : { class: rowClass(record) }
}

function resetFilters() {
  filters.value = { company: '', practiceType: '', scheduledRange: null, reported: '' }
  applyFilters()
}
function rowDomId(record: any) { return rowAnchors.value.get(record.practiceId ?? record.id) || '' }
function rowClass(r: any) { return { 'row-new': r.status === 'new', 'row-midterm': r.practiceType === 'midterm_exam' || r.practiceType === 'midterm' } }
function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '' }

function normalizeStatus(status: string | undefined) {
  if (status === 'scheduled') {
    return 'pending'
  }
  if (status === 'confirmed') {
    return 'pending'
  }
  return status || ''
}

function normalizeMockPractice(record: Record<string, any>) {
  const practiceId = record.practiceId ?? record.id
  return {
    ...record,
    id: practiceId,
    practiceId,
    assignedTime: record.assignedTime ?? record.submittedAt ?? record.scheduledAt ?? '',
    status: normalizeStatus(record.status),
    lessonReported: record.lessonReported ?? record.reportedLessonCount ?? 0,
  }
}

function syncRowAnchors(records: any[]) {
  const nextAnchors = new Map<number, string>()
  const usedAnchors = new Set<string>()
  let nextSequence = 1

  records.forEach((record) => {
    const rowId = Number(record.practiceId ?? record.id)
    if (!Number.isFinite(rowId)) {
      return
    }
    const existingAnchor = rowAnchors.value.get(rowId)
    if (existingAnchor) {
      nextAnchors.set(rowId, existingAnchor)
      usedAnchors.add(existingAnchor)
      return
    }
    if (record.status === 'new') {
      while (usedAnchors.has(`mock-new-${nextSequence}`)) {
        nextSequence += 1
      }
      nextAnchors.set(rowId, `mock-new-${nextSequence}`)
      usedAnchors.add(`mock-new-${nextSequence}`)
      nextSequence += 1
    }
  })

  rowAnchors.value = nextAnchors
}

function resolveReportReferenceType(practiceType: string | undefined): ReferenceType | undefined {
  // 1:1 映射 DB osg_mock_practice.practice_type，禁止跨值改写
  if (practiceType === 'mock_interview' || practiceType === t('mentor.mockPractice.k2')) return 'mock_interview'
  if (practiceType === 'communication_test' || practiceType === t('mentor.mockPractice.k3')) return 'communication_test'
  if (practiceType === 'midterm_exam' || practiceType === t('mentor.mockPractice.k4')) return 'midterm_exam'
  return undefined
}

function openReportModalFor(record: any) {
  reportPrefill.value = {
    studentId: record.studentId,
    referenceType: resolveReportReferenceType(record.practiceType),
    referenceId: record.practiceId ?? record.id,
  }
  showReportModal.value = true
}

function onReportSubmitted() {
  showReportModal.value = false
  // 上报后刷新列表，更新已上报课消数
  applyFilters()
}

async function fetchListWithParams(params: Record<string, string>) {
  try {
    const res = await http.get('/mentor/mock-practice/list', { params })
    list.value = (res.rows || []).map((record: Record<string, any>) => normalizeMockPractice(record))
    syncRowAnchors(list.value)
  } catch {}
}

function buildQueryParams() {
  const [scheduledStart = '', scheduledEnd = ''] = filters.value.scheduledRange ?? []
  return {
    company: filters.value.company || '',
    practiceType: filters.value.practiceType || '',
    scheduledStart: scheduledStart || '',
    scheduledEnd: scheduledEnd || '',
    reported: filters.value.reported || '',
  }
}

function applyFilters() {
  fetchListWithParams(buildQueryParams())
}

onMounted(() => {
  fetchListWithParams(buildQueryParams())
  void mentorNavBadges?.refreshMockBadge?.()
})
</script>

<style scoped>
.filter-bar :deep(.ant-form-item){margin-bottom:0;margin-right:12px}
:deep(.row-new) > td{background:linear-gradient(90deg,#FEE2E2,#FEF2F2) !important}
:deep(.row-new) > td:first-child{border-left:4px solid #EF4444}
:deep(.row-midterm) > td{background:#F3E8FF !important}
.text-muted{color:#94A3B8}
.text-sm{font-size:11px}
</style>
