<template>
  <div class="osg-page">
    <PageHeader title-zh="学员求职总览" title-en="Job Overview" description="查看我管理的学员求职进度">
      <template #actions>
        <a-button @click="handleExport">
          <template #icon><ExportOutlined /></template>
          导出
        </a-button>
      </template>
    </PageHeader>

    <!-- 面试日历 -->
    <InterviewCalendar :events="calendarRecords" />

    <!-- 筛选条件 -->
    <div class="filters-row">
      <a-input v-model:value="filters.keyword" placeholder="搜索学员姓名..." allow-clear style="width: 180px;" @press-enter="handleSearch" />
      <a-select v-model:value="filters.company" placeholder="全部公司" allow-clear style="width: 140px;">
        <a-select-option v-for="option in companyOptions" :key="option" :value="option">{{ option }}</a-select-option>
      </a-select>
      <a-select v-model:value="filters.stage" placeholder="全部状态" allow-clear style="width: 140px;">
        <a-select-option v-for="option in stageOptions" :key="option" :value="option">{{ option }}</a-select-option>
      </a-select>
      <a-button type="primary" @click="handleSearch">
        <template #icon><SearchOutlined /></template>
        搜索
      </a-button>
    </div>

    <!-- 错误提示 -->
    <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" style="border-radius: 8px;">
      <template #action>
        <a-button size="small" @click="loadOverview">重新加载</a-button>
      </template>
    </a-alert>

    <!-- 单栏：我管理的学员 -->
    <a-card v-else :bordered="false">
      <template #title>
        <span class="page-title">我管理的学员 Managed Students</span>
      </template>
      <a-table
        id="assistant-job-content-readonly"
        :columns="columns"
        :data-source="filteredRecords"
        :row-key="resolveRowKey"
        :loading="loading"
        :pagination="tablePagination"
        :scroll="{ x: 1200 }"
        :row-class-name="(record: ExtendedRecord) => rowClassName(record)"
        :locale="{ emptyText: '当前暂无管理学员的求职记录' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'studentName'">
            <StudentAvatarCell :name="record.studentName" :id="record.studentId" />
          </template>
          <template v-else-if="column.dataIndex === 'company'">
            <CompanyPositionCell :company="record.company" :position="record.position" />
          </template>
          <template v-else-if="column.dataIndex === 'location'">
            <span>{{ record.location || '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'interviewStage'">
            <StageTag :stage="record.interviewStage" />
          </template>
          <template v-else-if="column.dataIndex === 'interviewTime'">
            <InterviewTimeCell :time="formatDateTime(record.interviewTime)" :hint="formatScheduleHint(record.interviewTime)" />
          </template>
          <template v-else-if="column.dataIndex === 'mentorName'">
            <span>{{ record.mentorName || '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'latestRating'">
            <span v-if="record.latestRating" style="font-weight: 600; color: var(--primary);">{{ record.latestRating }}</span>
            <span v-else style="color: var(--muted);">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" class="link-button" @click="selectedId = resolveRowKey(record)">查看详情</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 跟进详情 -->
    <a-card v-if="selectedRecord" :bordered="false" title="跟进详情">
      <template #extra>
        <span style="color: var(--muted); font-size: 12px;">{{ selectedRecord.studentName || '-' }}</span>
      </template>
      <div class="detail-grid">
        <div><span class="detail-label">学员</span><div class="detail-value">{{ selectedRecord.studentName || '-' }}</div></div>
        <div><span class="detail-label">岗位</span><div class="detail-value">{{ selectedRecord.position || '-' }}</div></div>
        <div><span class="detail-label">公司</span><div class="detail-value">{{ selectedRecord.company || '-' }}</div></div>
        <div><span class="detail-label">城市</span><div class="detail-value">{{ selectedRecord.location || '-' }}</div></div>
        <div><span class="detail-label">阶段</span><div class="detail-value">{{ selectedRecord.interviewStage || '未更新' }}</div></div>
        <div><span class="detail-label">面试时间</span><div class="detail-value">{{ formatDateTime(selectedRecord.interviewTime) }}</div></div>
        <div><span class="detail-label">导师</span><div class="detail-value">{{ selectedRecord.mentorName || '-' }}</div></div>
        <div><span class="detail-label">最近评分</span><div class="detail-value">{{ selectedRecord.latestRating || '-' }}</div></div>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { InterviewCalendar, StageTag, StudentAvatarCell, CompanyPositionCell, InterviewTimeCell } from '@osg/shared/components'
import {
  getAssistantJobOverviewCalendar,
  getAssistantJobOverviewList,
  type AssistantJobOverviewRecord,
} from '@osg/shared/api'

interface ExtendedRecord extends AssistantJobOverviewRecord {
  coachingId?: number
  mentorName?: string
  latestRating?: string | number | null
}

const columns = [
  { title: '学生 ID', dataIndex: 'studentId', key: 'studentId', width: 100, fixed: 'left' as const },
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 160 },
  { title: '公司/岗位', dataIndex: 'company', key: 'company', width: 200 },
  { title: '城市', dataIndex: 'location', key: 'location', width: 110 },
  { title: '面试阶段', dataIndex: 'interviewStage', key: 'interviewStage', width: 130 },
  { title: '面试时间', dataIndex: 'interviewTime', key: 'interviewTime', width: 140 },
  { title: '导师', dataIndex: 'mentorName', key: 'mentorName', width: 120 },
  { title: '最近评分', dataIndex: 'latestRating', key: 'latestRating', width: 110 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 90, fixed: 'right' as const },
]

const loading = ref(true)
const errorMessage = ref('')
const records = ref<ExtendedRecord[]>([])
const calendarRecords = ref<AssistantJobOverviewRecord[]>([])
const selectedId = ref<string | number | null>(null)

const filters = reactive({
  keyword: '',
  company: undefined as string | undefined,
  stage: undefined as string | undefined,
})

function resolveRowKey(record: ExtendedRecord): string | number {
  return record.coachingId ?? record.id
}

const filteredRecords = computed(() =>
  records.value.filter((record) => {
    const keyword = (filters.keyword || '').trim().toLowerCase()
    const matchesKeyword =
      !keyword ||
      [record.studentName, record.company, record.position]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))

    return (
      matchesKeyword &&
      (!filters.company || record.company === filters.company) &&
      (!filters.stage || record.interviewStage === filters.stage)
    )
  }),
)

const tablePagination = computed(() => ({
  total: filteredRecords.value.length,
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
}))

const selectedRecord = computed(
  () => filteredRecords.value.find((record) => resolveRowKey(record) === selectedId.value) || null,
)

const companyOptions = computed(() =>
  Array.from(new Set(records.value.map((record) => record.company).filter(Boolean))) as string[],
)

const stageOptions = computed(() =>
  Array.from(new Set(records.value.map((record) => record.interviewStage).filter(Boolean))) as string[],
)

function formatDateTime(value?: string) {
  if (!value) return '未安排'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatScheduleHint(value?: string) {
  if (!value) return '尚未安排面试'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间待解析'
  const diff = date.getTime() - Date.now()
  const day = Math.ceil(diff / (24 * 60 * 60 * 1000))
  if (day < 0) return '已过面试时间'
  if (day === 0) return '今天'
  return `还剩 ${day} 天`
}

function rowClassName(record: ExtendedRecord): string {
  const status = (record.coachingStatus || '').toLowerCase()
  if (status.includes('新') || status.includes('new')) return 'row-new'
  if (status.includes('辅导') || status.includes('coach')) return 'row-coaching'
  if (status.includes('待') || status.includes('pending')) return 'row-pending'
  const stage = (record.interviewStage || '').toLowerCase()
  if (stage.includes('offer') || stage.includes('reject') || stage.includes('withdrawn') || stage.includes('拒绝') || stage.includes('放弃')) return 'row-ended'
  return ''
}

function handleSearch() {
  void loadOverview()
}

async function handleExport() {
  const rows = filteredRecords.value
  if (!rows.length) return

  const header = '学员,公司,岗位,城市,面试阶段,面试时间,导师,最近评分\n'
  const body = rows
    .map((r) =>
      [r.studentName, r.company, r.position, r.location, r.interviewStage, r.interviewTime, r.mentorName, r.latestRating]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n')

  const blob = new Blob(['﻿' + header + body], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `求职总览_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

async function loadOverview() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [listResponse, calendarResponse] = await Promise.all([
      getAssistantJobOverviewList({
        company: filters.company,
        coachingStatus: filters.stage,
      }),
      getAssistantJobOverviewCalendar(),
    ])

    records.value = (listResponse.rows || []) as ExtendedRecord[]
    calendarRecords.value = calendarResponse || []
  } catch (error: any) {
    errorMessage.value = error?.message || '求职总览暂时无法加载，请稍后重试。'
  } finally {
    loading.value = false
  }
}

watch(
  filteredRecords,
  (value) => {
    if (!value.length) {
      selectedId.value = null
      return
    }
    if (!value.some((record) => resolveRowKey(record) === selectedId.value)) {
      selectedId.value = resolveRowKey(value[0])
    }
  },
  { immediate: true },
)

onMounted(() => {
  void loadOverview()
})
</script>

<style scoped>
.page-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.filters-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

:deep(.row-new) { background: linear-gradient(90deg, #FEE2E2, #FEF2F2); border-left: 4px solid #EF4444; }
:deep(.row-coaching) { background: #F3E8FF; }
:deep(.row-pending) { background: #FEF3C7; }
:deep(.row-ended) { opacity: 0.7; }

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.detail-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 700;
  color: var(--muted);
  font-size: 12px;
}
.detail-value {
  font-weight: 600;
}
.link-button {
  padding: 0;
}

@media (max-width: 900px) {
  .detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
