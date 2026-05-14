<template>
  <div class="osg-page assistant-job-overview">
    <PageHeader title-zh="学员求职总览" title-en="Job Overview">
      <template #actions>
        <a-button @click="handleExport">
          <template #icon><ExportOutlined /></template>
          导出
        </a-button>
      </template>
    </PageHeader>

    <!-- 面试日历 -->
    <InterviewCalendar :events="calendarRecords" />

    <!-- 筛选条件（卡片式） -->
    <a-card :bordered="false" class="ajo-filter-card">
      <a-form layout="vertical" :model="filters" class="ajo-filter-form">
        <a-form-item label="公司">
          <a-select
            v-model:value="filters.companyName"
            placeholder="全部公司"
            allow-clear
            show-search
            :options="companyOptions.map((c) => ({ value: c, label: c }))"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="面试阶段">
          <a-select
            v-model:value="filters.currentStage"
            placeholder="全部状态"
            allow-clear
            :options="stageOptions.map((s) => ({ value: s, label: s }))"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="面试时间">
          <a-range-picker
            v-model:value="filters.interviewRange"
            value-format="YYYY-MM-DD"
            :placeholder="['开始日期', '结束日期']"
            style="width: 100%"
            allow-clear
          />
        </a-form-item>
        <a-form-item label=" " class="ajo-filter-form__actions">
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              搜索
            </a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 错误提示 -->
    <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" style="border-radius: 8px;">
      <template #action>
        <a-button size="small" @click="loadOverview">重新加载</a-button>
      </template>
    </a-alert>

    <!-- 数据卡片 -->
    <a-card v-else :bordered="false" class="ajo-data-card">
      <template #title>
        <div class="ajo-data-card__title">
          <span class="ajo-data-card__title-zh">我管理的学员</span>
          <span class="ajo-data-card__title-en">Managed Students</span>
          <a-tag class="ajo-data-card__count">{{ filteredRecords.length }}</a-tag>
        </div>
      </template>
      <a-table
        id="assistant-job-content-readonly"
        :columns="columns"
        :data-source="filteredRecords"
        :row-key="(record: ExtendedRecord) => (record.coachingId ?? record.id) as number"
        :loading="loading"
        :pagination="tablePagination"
        :scroll="{ x: 1280 }"
        :row-class-name="(record: ExtendedRecord) => rowClassName(record)"
        :locale="{ emptyText: '当前暂无管理学员的求职记录' }"
        class="ajo-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'studentName'">
            <StudentAvatarCell :name="record.studentName" :id="record.studentId" />
          </template>
          <template v-else-if="column.dataIndex === 'position'">
            <div class="ajo-cell-position">
              <span>{{ record.position || record.positionName || '-' }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'company'">
            <div class="ajo-cell-company">
              <span class="ajo-cell-company__name">{{ record.company || record.companyName || '-' }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'location'">
            <span>{{ record.cityLabel || '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'interviewStage'">
            <StageTag :stage="record.interviewStage" />
          </template>
          <template v-else-if="column.dataIndex === 'interviewTime'">
            <InterviewTimeCell :time="formatDateTime(record.interviewTime)" :hint="formatScheduleHint(record.interviewTime)" />
          </template>
          <template v-else-if="column.dataIndex === 'mentorName'">
            <span v-if="record.mentorNames || record.mentorName">{{ record.mentorNames || record.mentorName }}</span>
            <span v-else class="ajo-muted">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'latestRating'">
            <div v-if="record.latestRating" class="ajo-rating">
              <StarFilled />
              <span>{{ record.latestRating }}</span>
            </div>
            <span v-else class="ajo-muted">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" class="ajo-link-button" @click="openDetail(record)">查看详情</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 跟进详情弹窗 -->
    <OverlaySurfaceModal
      :open="detailOpen"
      surface-id="assistant-job-overview-detail"
      title="跟进详情"
      width="880px"
      max-height="78vh"
      variant="default"
      :body-class="['ajo-detail-body', 'osg-modal-form']"
      @close="detailOpen = false"
    >
      <template #title>
        <div class="ajo-detail-header">
          <span class="ajo-detail-header__title">跟进详情</span>
          <span v-if="detailRecord?.studentName" class="ajo-detail-header__sub">
            {{ detailRecord.studentName }}
            <template v-if="detailRecord.studentId">· ID: {{ detailRecord.studentId }}</template>
          </span>
        </div>
      </template>

      <a-spin :spinning="detailLoading">
        <div v-if="detailRecord" class="ajo-detail">
          <!-- 关键信息 -->
          <section class="ajo-detail__summary">
            <div class="ajo-detail__summary-grid">
              <div class="ajo-detail__field">
                <span class="ajo-detail__label">岗位</span>
                <span class="ajo-detail__value">{{ detailRecord.position || detailRecord.positionName || '-' }}</span>
              </div>
              <div class="ajo-detail__field">
                <span class="ajo-detail__label">公司</span>
                <span class="ajo-detail__value">{{ detailRecord.company || detailRecord.companyName || '-' }}</span>
              </div>
              <div class="ajo-detail__field">
                <span class="ajo-detail__label">城市</span>
                <span class="ajo-detail__value">{{ detailRecord.cityLabel || detailRecord.location || '-' }}</span>
              </div>
              <div class="ajo-detail__field">
                <span class="ajo-detail__label">面试阶段</span>
                <span class="ajo-detail__value"><StageTag :stage="detailRecord.interviewStage" /></span>
              </div>
              <div class="ajo-detail__field">
                <span class="ajo-detail__label">面试时间</span>
                <span class="ajo-detail__value">{{ formatDateTime(detailRecord.interviewTime) }}</span>
              </div>
              <div class="ajo-detail__field">
                <span class="ajo-detail__label">导师</span>
                <span class="ajo-detail__value">{{ detailRecord.mentorNames || detailRecord.mentorName || '-' }}</span>
              </div>
            </div>
          </section>

          <!-- KPI -->
          <section class="ajo-detail__metrics">
            <div class="ajo-detail__metric ajo-detail__metric--hours">
              <span class="ajo-detail__metric-label">总课时</span>
              <span class="ajo-detail__metric-value">{{ detailTotals.totalHours }}<small>h</small></span>
            </div>
            <div class="ajo-detail__metric ajo-detail__metric--rating">
              <span class="ajo-detail__metric-label">平均评分</span>
              <span class="ajo-detail__metric-value">
                <template v-if="detailTotals.avgRating !== null">
                  <StarFilled />{{ detailTotals.avgRating }}
                </template>
                <template v-else>-</template>
              </span>
            </div>
            <div class="ajo-detail__metric ajo-detail__metric--count">
              <span class="ajo-detail__metric-label">课消条数</span>
              <span class="ajo-detail__metric-value">{{ detailTotals.lessonCount }}</span>
            </div>
          </section>

          <!-- 课消记录（按导师分组） -->
          <section class="ajo-detail__records">
            <div class="ajo-detail__records-title">课消记录</div>
            <div v-if="!mentorGroups.length" class="ajo-detail__empty">该求职申请暂无课消记录</div>
            <div v-for="group in mentorGroups" :key="group.mentorId ?? 'unknown'" class="ajo-mentor-card">
              <div class="ajo-mentor-card__head">
                <div class="ajo-mentor-card__avatar">{{ mentorInitial(group.mentorName) }}</div>
                <div class="ajo-mentor-card__meta">
                  <div class="ajo-mentor-card__name">{{ group.mentorName || '导师待补' }}</div>
                  <div class="ajo-mentor-card__stats">
                    <span><ClockCircleOutlined />共 {{ Number(group.totalHours || 0) }}h</span>
                    <span v-if="group.avgRating !== null && group.avgRating !== undefined"><StarFilled />平均 {{ group.avgRating }}</span>
                    <span><FileTextOutlined />{{ (group.records || []).length }} 条</span>
                  </div>
                </div>
              </div>
              <a-table
                size="small"
                :columns="recordColumns"
                :data-source="sortedRecords(group.records || [])"
                :row-key="(r: any) => r.recordId"
                :pagination="false"
                class="ajo-mentor-card__table"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'memberStatus'">
                    <a-tag :color="record.memberStatus === 'absent' ? 'red' : 'green'">
                      {{ record.memberStatus === 'absent' ? '旷课' : '出席' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'rate'">
                    <span v-if="record.rate" class="ajo-rating"><StarFilled />{{ record.rate }}</span>
                    <span v-else class="ajo-muted">-</span>
                  </template>
                  <template v-else-if="column.key === 'feedbackContent'">
                    <span :title="record.feedbackContent || ''">{{ record.feedbackContent || '-' }}</span>
                  </template>
                </template>
              </a-table>
            </div>
          </section>
        </div>
      </a-spin>
    </OverlaySurfaceModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  ExportOutlined,
  SearchOutlined,
  StarFilled,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { InterviewCalendar, StageTag, StudentAvatarCell, InterviewTimeCell } from '@osg/shared/components'
import { OverlaySurfaceModal } from '@osg/shared/components'
import {
  getAssistantJobOverviewCalendar,
  getAssistantJobOverviewDetail,
  getAssistantJobOverviewList,
  type AssistantJobOverviewClassRecord,
  type AssistantJobOverviewDetail,
  type AssistantJobOverviewMentorGroup,
  type AssistantJobOverviewRecord,
} from '@osg/shared/api'

interface ExtendedRecord extends AssistantJobOverviewRecord {
  coachingId?: number
}

const columns = [
  { title: '学生 ID', dataIndex: 'studentId', key: 'studentId', width: 100, fixed: 'left' as const },
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 170 },
  { title: '岗位', dataIndex: 'position', key: 'position', width: 160 },
  { title: '公司', dataIndex: 'company', key: 'company', width: 160 },
  { title: '城市', dataIndex: 'location', key: 'location', width: 110 },
  { title: '面试阶段', dataIndex: 'interviewStage', key: 'interviewStage', width: 130 },
  { title: '面试时间', dataIndex: 'interviewTime', key: 'interviewTime', width: 150 },
  { title: '导师', dataIndex: 'mentorName', key: 'mentorName', width: 140 },
  { title: '最近评分', dataIndex: 'latestRating', key: 'latestRating', width: 110 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 100, fixed: 'right' as const },
]

const recordColumns = [
  { title: '上课日期', dataIndex: 'classDate', key: 'classDate', width: 130 },
  { title: '课程类型', dataIndex: 'courseType', key: 'courseType', width: 110 },
  { title: '状态', dataIndex: 'memberStatus', key: 'memberStatus', width: 80 },
  { title: '时长(h)', dataIndex: 'durationHours', key: 'durationHours', width: 80 },
  { title: '评分', dataIndex: 'rate', key: 'rate', width: 90 },
  { title: '反馈', dataIndex: 'feedbackContent', key: 'feedbackContent' },
]

const loading = ref(true)
const errorMessage = ref('')
const records = ref<ExtendedRecord[]>([])
const calendarRecords = ref<AssistantJobOverviewRecord[]>([])

const detailOpen = ref(false)
const detailLoading = ref(false)
const detailRecord = ref<AssistantJobOverviewDetail | null>(null)
const mentorGroups = ref<AssistantJobOverviewMentorGroup[]>([])

const filters = reactive({
  companyName: undefined as string | undefined,
  currentStage: undefined as string | undefined,
  interviewRange: undefined as [string, string] | undefined,
})

const filteredRecords = computed(() => records.value)

const tablePagination = computed(() => ({
  total: filteredRecords.value.length,
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
}))

const companyOptions = computed(() =>
  Array.from(
    new Set(
      records.value
        .map((record) => record.company || record.companyName)
        .filter((value): value is string => !!value),
    ),
  ),
)

const stageOptions = computed(() =>
  Array.from(
    new Set(
      records.value
        .map((record) => record.interviewStage)
        .filter((value): value is string => !!value),
    ),
  ),
)

const detailTotals = computed(() => {
  const groups = mentorGroups.value || []
  const lessonCount = groups.reduce((sum, g) => sum + (g.records?.length || 0), 0)
  const totalHours = groups.reduce((sum, g) => sum + Number(g.totalHours || 0), 0)
  const allRatings = groups
    .flatMap((g) => (g.records || []))
    .filter((r) => r.memberStatus === 'normal' && r.rate)
    .map((r) => Number(r.rate))
    .filter((n) => !Number.isNaN(n))
  const avgRating = allRatings.length
    ? (allRatings.reduce((s, n) => s + n, 0) / allRatings.length).toFixed(2)
    : null
  return {
    lessonCount,
    totalHours: Number(totalHours.toFixed(2)),
    avgRating,
  }
})

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
  const stage = (record.interviewStage || '').toLowerCase()
  if (stage.includes('offer')) return 'row-coaching'
  if (stage.includes('reject') || stage.includes('withdrawn') || stage.includes('withdraw') || stage.includes('cancel') || stage.includes('拒绝') || stage.includes('放弃')) {
    return 'row-ended'
  }
  if (!record.interviewTime) return ''
  const diff = new Date(record.interviewTime).getTime() - Date.now()
  if (diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000) return 'row-new'
  if (diff > 0 && diff <= 14 * 24 * 60 * 60 * 1000) return 'row-pending'
  return ''
}

function handleSearch() {
  void loadOverview()
}

function handleReset() {
  filters.companyName = undefined
  filters.currentStage = undefined
  filters.interviewRange = undefined
  void loadOverview()
}

function mentorInitial(name?: string | null) {
  if (!name) return '?'
  const trimmed = name.trim()
  return trimmed.charAt(0).toUpperCase() || '?'
}

function sortedRecords(records: AssistantJobOverviewClassRecord[]) {
  return [...records].sort((a, b) => {
    if (!a.classDate) return 1
    if (!b.classDate) return -1
    return String(b.classDate).localeCompare(String(a.classDate))
  })
}

async function handleExport() {
  const rows = filteredRecords.value
  if (!rows.length) return

  const header = '学员,公司,岗位,城市,面试阶段,面试时间,导师,最近评分\n'
  const body = rows
    .map((r) =>
      [
        r.studentName,
        r.company || r.companyName,
        r.position || r.positionName,
        r.cityLabel || r.location,
        r.interviewStage,
        r.interviewTime,
        r.mentorNames || r.mentorName,
        r.latestRating,
      ]
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
    const [start, end] = filters.interviewRange || []
    const [listResponse, calendarResponse] = await Promise.all([
      getAssistantJobOverviewList({
        companyName: filters.companyName,
        currentStage: filters.currentStage,
        interviewTimeStart: start || undefined,
        interviewTimeEnd: end || undefined,
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

async function openDetail(record: ExtendedRecord) {
  detailRecord.value = record as AssistantJobOverviewDetail
  mentorGroups.value = []
  detailOpen.value = true

  const applicationId = (record.applicationId ?? record.id) as number | undefined
  if (!applicationId) return

  detailLoading.value = true
  try {
    const detail = await getAssistantJobOverviewDetail(applicationId)
    if (detail) {
      detailRecord.value = detail
      mentorGroups.value = detail.classRecordsByMentor || []
    }
  } catch (error: any) {
    errorMessage.value = error?.message || '加载课消详情失败'
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => {
  void loadOverview()
})
</script>

<style scoped lang="scss">
.assistant-job-overview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ajo-filter-card {
  border-radius: 10px;
  border: 1px solid #eef2f7;
  background: #fff;
}
.ajo-filter-form {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1.4fr auto;
  gap: 16px;
  align-items: end;
}
.ajo-filter-form :deep(.ant-form-item) {
  margin-bottom: 0;
}
.ajo-filter-form :deep(.ant-form-item-label > label) {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  height: 22px;
}
.ajo-filter-form__actions :deep(.ant-form-item-label) {
  visibility: hidden;
}

.ajo-data-card {
  border-radius: 10px;
  border: 1px solid #eef2f7;
}
.ajo-data-card :deep(.ant-card-head) {
  border-bottom: 1px solid #f1f5f9;
  padding: 0 20px;
  min-height: 52px;
}
.ajo-data-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.ajo-data-card__title-zh {
  font-size: 15px;
  color: #0f172a;
}
.ajo-data-card__title-en {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}
.ajo-data-card__count {
  background: #eef2ff;
  border-color: #c7d2fe;
  color: #4338ca;
  font-weight: 600;
}

.ajo-table :deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  font-size: 12.5px;
}
.ajo-table :deep(.ant-table-tbody > tr > td) {
  padding-top: 12px;
  padding-bottom: 12px;
}

.ajo-cell-position {
  font-weight: 600;
  color: #1e293b;
}
.ajo-cell-company__name {
  color: #4338ca;
  font-weight: 500;
}

.ajo-rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #f59e0b;
  font-weight: 600;
}
.ajo-muted {
  color: #94a3b8;
}

.ajo-link-button {
  padding: 0;
  font-weight: 500;
}

:deep(.row-new) { background: linear-gradient(90deg, #fff7ed 0%, #fffbeb 100%); }
:deep(.row-coaching) { background: #ecfdf5; }
:deep(.row-pending) { background: #f5f3ff; }
:deep(.row-ended) { opacity: 0.6; }
:deep(.row-new td),
:deep(.row-coaching td),
:deep(.row-pending td) { border-color: transparent !important; }

/* Detail Modal */
:deep(.ajo-detail-body) {
  padding: 0;
}
.ajo-detail-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.ajo-detail-header__title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}
.ajo-detail-header__sub {
  font-size: 12px;
  color: #64748b;
}

.ajo-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px 24px;
  background: #f8fafc;
}

.ajo-detail__summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 24px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #eef2f7;
  padding: 16px 20px;
}
.ajo-detail__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ajo-detail__label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.ajo-detail__value {
  font-size: 13px;
  color: #0f172a;
  font-weight: 500;
}

.ajo-detail__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.ajo-detail__metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 18px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #eef2f7;
}
.ajo-detail__metric-label {
  font-size: 12px;
  color: #64748b;
}
.ajo-detail__metric-value {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  small {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
  }
  :deep(.anticon) {
    color: #f59e0b;
    margin-right: 4px;
    font-size: 16px;
  }
}
.ajo-detail__metric--hours .ajo-detail__metric-value { color: #4338ca; }
.ajo-detail__metric--rating .ajo-detail__metric-value { color: #f59e0b; }
.ajo-detail__metric--count .ajo-detail__metric-value { color: #10b981; }

.ajo-detail__records {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ajo-detail__records-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.ajo-detail__empty {
  padding: 32px;
  text-align: center;
  background: #fff;
  border-radius: 10px;
  border: 1px dashed #e2e8f0;
  color: #94a3b8;
  font-size: 13px;
}

.ajo-mentor-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #eef2f7;
  overflow: hidden;
}
.ajo-mentor-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(90deg, #eef2ff 0%, #fff 100%);
  border-bottom: 1px solid #f1f5f9;
}
.ajo-mentor-card__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
}
.ajo-mentor-card__name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}
.ajo-mentor-card__stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  :deep(.anticon) {
    color: #94a3b8;
  }
}
.ajo-mentor-card__table :deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  font-size: 12px;
  color: #64748b;
}

@media (max-width: 1180px) {
  .ajo-filter-form { grid-template-columns: 1fr 1fr; }
  .ajo-detail__summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ajo-detail__metrics { grid-template-columns: 1fr; }
}
</style>
