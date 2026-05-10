<template>
  <div id="page-mock-practice">
    <PageHeader
      title-zh="模拟应聘管理"
      title-en="Mock Practice"
      description="查看分配给我的模拟面试、人际关系测试、期中考试"
    />

    <!-- 列表 -->
    <a-card :bordered="false">
      <a-form layout="inline" class="filter-bar" style="margin-bottom: 16px">
        <a-form-item label="公司">
          <a-input
            v-model:value="filters.company"
            placeholder="请输入公司名称"
            style="width:200px"
            allow-clear
            @change="applyFilters"
          />
        </a-form-item>
        <a-form-item label="面试阶段">
          <a-select v-model:value="filters.practiceType" style="width:160px" @change="applyFilters">
            <a-select-option value="">全部</a-select-option>
            <a-select-option value="mock_interview">模拟面试</a-select-option>
            <a-select-option value="relation_test">人际关系测试</a-select-option>
            <a-select-option value="midterm_exam">期中考试</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="面试时间">
          <a-range-picker
            v-model:value="filters.scheduledRange"
            style="width:260px"
            value-format="YYYY-MM-DD"
            @change="applyFilters"
          />
        </a-form-item>
        <a-form-item label="是否上报课消">
          <a-select v-model:value="filters.reported" style="width:140px" @change="applyFilters">
            <a-select-option value="">全部</a-select-option>
            <a-select-option value="true">已上报</a-select-option>
            <a-select-option value="false">未上报</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="applyFilters">
            <i class="mdi mdi-magnify" style="margin-right:4px" />筛选
          </a-button>
        </a-form-item>
        <a-form-item>
          <a-button type="link" @click="resetFilters">
            <i class="mdi mdi-refresh" style="margin-right:4px" />重置
          </a-button>
        </a-form-item>
      </a-form>

      <a-table
        :columns="columns"
        :data-source="filteredList"
        :pagination="false"
        :row-key="(r: any) => r.practiceId ?? r.id"
        :custom-row="customRow"
        :locale="{ emptyText: '暂无匹配的模拟应聘记录' }"
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
            <a-space :size="4">
              <a-button
                v-if="record.status === 'new'"
                type="primary"
                size="small"
                class="btn-confirm"
                @click="confirmMock(record)"
              >
                <i class="mdi mdi-check" style="margin-right:4px" />确认
              </a-button>
              <a-button type="link" size="small" @click="openReportModalFor(record)">上报课消</a-button>
            </a-space>
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
import { PageHeader } from '@osg/shared/components/PageHeader'
import { PracticeTypeTag } from '@osg/shared/components'
import { http } from '@osg/shared/utils/request'
import ReportModal from '../courses/components/ReportModal.vue'
import type { ReferenceType } from '@osg/shared/types/classReport'

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
  { title: '学生 ID', key: 'studentId', dataIndex: 'studentId' },
  { title: '学生姓名', key: 'studentName', dataIndex: 'studentName' },
  { title: '类型', key: 'practiceType', dataIndex: 'practiceType' },
  { title: '分配时间', key: 'assignedTime', dataIndex: 'assignedTime' },
  { title: '已上报课消数', key: 'lessonReported', dataIndex: 'lessonReported' },
  { title: '操作', key: 'action' },
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

async function confirmMock(r: any) {
  const practiceId = r.practiceId ?? r.id
  const rowId = Number(practiceId)
  if (Number.isFinite(rowId) && !rowAnchors.value.get(rowId)) {
    const newCount = Array.from(rowAnchors.value.values()).filter((value) => value.startsWith('mock-new-')).length
    rowAnchors.value.set(rowId, `mock-new-${newCount + 1}`)
  }
  try { await http.put(`/api/mentor/mock-practice/${practiceId}/confirm`); r.status = 'pending' } catch {}
  syncRowAnchors(list.value)
  try { await mentorNavBadges?.refreshMockBadge?.() } catch {}
}

function resolveReportReferenceType(practiceType: string | undefined): ReferenceType | undefined {
  if (practiceType === 'mock_interview' || practiceType === '模拟面试') return 'mock_interview'
  if (practiceType === 'relation_test' || practiceType === '人际关系测试') return 'relation_test'
  if (practiceType === 'communication_test' || practiceType === 'midterm_exam' || practiceType === '期中考试') return 'communication_test'
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
    const res = await http.get('/api/mentor/mock-practice/list', { params })
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
.btn-confirm{background:#22C55E !important;border-color:#22C55E !important}
.btn-confirm:hover{background:#16A34A !important;border-color:#16A34A !important}
.text-muted{color:#94A3B8}
.text-sm{font-size:11px}
</style>
