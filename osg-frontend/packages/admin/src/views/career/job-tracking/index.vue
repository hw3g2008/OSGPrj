<template>
  <div class="osg-page">
    <PageHeader title-zh="所有学员的岗位追踪" title-en="Job Tracking" description="查看全部学员的求职申请进度">
      <template #actions>
        <span style="color: #64748b; font-size: 13px">{{ rows.length }} 条岗位记录 · {{ stats.interviewingCount }} 条面试中</span>
      </template>
    </PageHeader>

    <a-row :gutter="16">
      <a-col v-for="card in statCards" :key="card.key" :span="Math.floor(24 / statCards.length)">
        <a-card :bordered="false" :body-style="{ textAlign: 'center', background: card.bg, borderRadius: '12px' }">
          <a-statistic :title="card.label" :value="card.value" :value-style="{ fontWeight: 700 }" />
          <div style="color: #64748b; font-size: 12px; margin-top: 4px">{{ card.meta }}</div>
        </a-card>
      </a-col>
    </a-row>

    <a-card :bordered="false">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item label="学员姓名">
          <a-input v-model:value="filters.studentName" placeholder="搜索学员" allow-clear style="width: 140px" />
        </a-form-item>
        <a-form-item label="班主任">
          <a-input v-model:value="filters.leadMentorName" placeholder="如 Jess / Amy" allow-clear style="width: 140px" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="filters.trackingStatus" placeholder="全部" allow-clear style="width: 120px">
            <a-select-option value="tracking">追踪中</a-select-option>
            <a-select-option value="applied">已申请</a-select-option>
            <a-select-option value="interviewing">面试中</a-select-option>
            <a-select-option value="offer">已获Offer</a-select-option>
            <a-select-option value="rejected">已拒绝</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="公司">
          <a-input v-model:value="filters.companyName" placeholder="搜索公司" allow-clear style="width: 140px" />
        </a-form-item>
        <a-form-item label="地点">
          <a-input v-model:value="filters.location" placeholder="搜索城市 / 地区" allow-clear style="width: 150px" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="loadTrackingBoard">
              <template #icon><SearchOutlined /></template>
              搜索
            </a-button>
            <a-button @click="resetFilters">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false">
      <a-table
        :columns="trackingColumns"
        :data-source="rows"
        :row-key="(record: JobTrackingRow) => record.applicationId"
        :pagination="false"
        :loading="loading"
        :locale="{ emptyText: '当前筛选条件下暂无岗位追踪记录' }"
        :scroll="{ x: 1100 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'studentName'">
            <div>
              <strong>{{ record.studentName || '-' }}</strong>
              <div style="color: #9ca3af; font-size: 12px">ID: {{ record.studentId }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'mentorName'">
            {{ record.mentorName || '未分配' }}
          </template>
          <template v-else-if="column.dataIndex === 'location'">
            {{ record.location || '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'trackingStatus'">
            <div>
              <a-tag :color="colorOf(record.trackingStatus)">{{ labelOf(record.trackingStatus) }}</a-tag>
              <div v-if="record.interviewStage" style="color: #64748b; font-size: 12px; margin-top: 2px">{{ stageLabelOf(record.interviewStage) }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'interviewTime'">
            <div>
              <strong>{{ formatDateTime(record.interviewTime) }}</strong>
              <div style="color: #9ca3af; font-size: 12px">{{ record.preferredMentor || '意向导师未填' }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="openEditor(record)">编辑</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="editingVisible"
      :title="`更新求职状态 · ${editingRow?.studentName} · ${editingRow?.companyName}`"
      :confirm-loading="submitting"
      ok-text="保存更新"
      cancel-text="取消"
      :width="600"
      @ok="submitUpdate"
      @cancel="closeEditor"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }" style="margin-top: 16px">
        <a-form-item label="当前状态">
          <a-select v-model:value="form.trackingStatus">
            <a-select-option value="not-applied">未申请</a-select-option>
            <a-select-option value="applied">已申请</a-select-option>
            <a-select-option value="tracking">追踪中</a-select-option>
            <a-select-option value="interviewing">面试中</a-select-option>
            <a-select-option value="offer">已获Offer</a-select-option>
            <a-select-option value="rejected">已拒绝</a-select-option>
          </a-select>
        </a-form-item>

        <template v-if="form.trackingStatus === 'interviewing'">
          <a-form-item label="面试阶段">
            <a-select v-model:value="form.interviewStage">
              <a-select-option v-for="option in interviewStageOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="面试时间">
            <a-date-picker v-model:value="form.interviewTime" show-time placeholder="选择面试时间" value-format="YYYY-MM-DDTHH:mm" style="width: 100%" />
          </a-form-item>
          <a-form-item label="意向导师">
            <a-input v-model:value="form.preferredMentor" placeholder="如 Jess" />
          </a-form-item>
          <a-form-item label="排除导师">
            <a-input v-model:value="form.excludedMentor" placeholder="如 Amy" />
          </a-form-item>
        </template>

        <a-form-item label="备注">
          <a-textarea v-model:value="form.note" :rows="4" placeholder="补充跟进说明" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import {
  getJobTrackingList,
  updateJobTracking,
  type JobTrackingFilters,
  type JobTrackingRow,
  type JobTrackingStats
} from '@osg/shared/api/admin/jobTracking'

const trackingColumns = [
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 140 },
  { title: '导师', dataIndex: 'mentorName', key: 'mentorName', width: 100 },
  { title: '公司', dataIndex: 'companyName', key: 'companyName', width: 140 },
  { title: '岗位', dataIndex: 'positionName', key: 'positionName', width: 160 },
  { title: '地点', dataIndex: 'location', key: 'location', width: 100 },
  { title: '状态', dataIndex: 'trackingStatus', key: 'trackingStatus', width: 120 },
  { title: '面试时间', dataIndex: 'interviewTime', key: 'interviewTime', width: 180 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
]

const defaultStats: JobTrackingStats = {
  totalStudentCount: 0,
  trackingCount: 0,
  interviewingCount: 0,
  offerCount: 0,
  rejectedCount: 0
}

const filters = reactive<JobTrackingFilters>({
  studentName: '',
  leadMentorName: '',
  trackingStatus: undefined,
  companyName: '',
  location: ''
})

const interviewStageOptions = [
  { value: 'oa', label: 'OA' },
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'first_round', label: 'First Round' },
  { value: 'final', label: 'Final Round' }
]

const loading = ref(false)
const submitting = ref(false)
const rows = ref<JobTrackingRow[]>([])
const stats = ref<JobTrackingStats>({ ...defaultStats })
const editingVisible = ref(false)
const editingRow = ref<JobTrackingRow | null>(null)
const form = reactive({
  trackingStatus: 'tracking',
  interviewStage: 'first_round',
  interviewTime: '',
  preferredMentor: '',
  excludedMentor: '',
  note: ''
})

const requestFilters = computed<JobTrackingFilters>(() => ({
  studentName: filters.studentName || undefined,
  leadMentorName: filters.leadMentorName || undefined,
  trackingStatus: filters.trackingStatus || undefined,
  companyName: filters.companyName || undefined,
  location: filters.location || undefined
}))

const statCards = computed(() => [
  { key: 'totalStudentCount', label: '全部学员', value: stats.value.totalStudentCount, meta: '唯一学员数', tone: 'blue', bg: '#eff6ff' },
  { key: 'trackingCount', label: '追踪中', value: stats.value.trackingCount, meta: '已投递待推进', tone: 'slate', bg: '#f1f5f9' },
  { key: 'interviewingCount', label: '面试中', value: stats.value.interviewingCount, meta: '需跟进排期', tone: 'amber', bg: '#fffbeb' },
  { key: 'offerCount', label: '已获Offer', value: stats.value.offerCount, meta: '转化完成', tone: 'green', bg: '#f0fdf4' },
  { key: 'rejectedCount', label: '已拒绝', value: stats.value.rejectedCount, meta: '待复盘', tone: 'red', bg: '#fef2f2' }
])

async function loadTrackingBoard() {
  loading.value = true
  try {
    const response = await getJobTrackingList(requestFilters.value)
    stats.value = response.stats ?? { ...defaultStats }
    rows.value = response.rows ?? []
  } catch (error) {
    console.error(error)
    message.error('岗位追踪加载失败')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.studentName = ''
  filters.leadMentorName = ''
  filters.trackingStatus = undefined
  filters.companyName = ''
  filters.location = ''
  void loadTrackingBoard()
}

function openEditor(row: JobTrackingRow) {
  editingRow.value = row
  form.trackingStatus = row.trackingStatus || 'tracking'
  form.interviewStage = row.interviewStage || 'first_round'
  form.interviewTime = toDatetimeLocal(row.interviewTime)
  form.preferredMentor = row.preferredMentor || ''
  form.excludedMentor = row.excludedMentor || ''
  form.note = row.note || ''
  editingVisible.value = true
}

function closeEditor() {
  editingVisible.value = false
  editingRow.value = null
}

async function submitUpdate() {
  if (!editingRow.value) {
    return
  }

  submitting.value = true
  try {
    await updateJobTracking(editingRow.value.applicationId, {
      trackingStatus: form.trackingStatus,
      interviewStage: form.trackingStatus === 'interviewing' ? form.interviewStage : undefined,
      interviewTime: form.trackingStatus === 'interviewing' && form.interviewTime ? fromDatetimeLocal(form.interviewTime) : undefined,
      preferredMentor: form.trackingStatus === 'interviewing' ? form.preferredMentor : undefined,
      excludedMentor: form.trackingStatus === 'interviewing' ? form.excludedMentor : undefined,
      note: form.note || undefined
    })
    message.success('岗位追踪已更新')
    closeEditor()
    await loadTrackingBoard()
  } catch (error) {
    console.error(error)
    message.error('岗位追踪更新失败')
  } finally {
    submitting.value = false
  }
}

function labelOf(status?: string) {
  switch (status) {
    case 'applied':
      return '已申请'
    case 'interviewing':
      return '面试中'
    case 'offer':
      return '已获Offer'
    case 'rejected':
      return '已拒绝'
    default:
      return '追踪中'
  }
}

function colorOf(status?: string) {
  switch (status) {
    case 'applied':
      return 'blue'
    case 'interviewing':
      return 'orange'
    case 'offer':
      return 'green'
    case 'rejected':
      return 'red'
    default:
      return 'blue'
  }
}

function stageLabelOf(stage?: string | null) {
  const hit = interviewStageOptions.find((option) => option.value === stage)
  return hit?.label || stage || '-'
}

function formatDateTime(value?: string) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

function toDatetimeLocal(value?: string) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function fromDatetimeLocal(value: string) {
  return value ? `${value}:00` : undefined
}

onMounted(() => {
  void loadTrackingBoard()
})
</script>

<style scoped>
</style>
