<template>
  <div class="osg-page">
    <PageHeader
      title="模拟应聘管理"
      subtitle="Mock Practice"
      description="处理学员的模拟面试、人际关系测试、期中考试申请"
    />

    <!-- 统计卡片 -->
    <a-row :gutter="12">
      <a-col v-for="card in statsCards" :key="card.key" :xs="12" :sm="12" :md="6">
        <a-card :bordered="false" :body-style="{ textAlign: 'center', padding: '16px' }">
          <div :style="{ fontSize: '28px', fontWeight: 700, color: card.color }">{{ card.value }}</div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">{{ card.label }}</div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 错误提示 -->
    <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" style="border-radius: 8px;">
      <template #action>
        <a-button size="small" @click="loadRecords">重新加载</a-button>
      </template>
    </a-alert>

    <!-- Tab + 表格 -->
    <a-card v-else :bordered="false">
      <template #title>
        <div style="display: flex; gap: 4px; background: var(--bg); padding: 3px; border-radius: 6px; width: fit-content;">
          <button
            id="mock-tab-coaching"
            :class="['mock-tab', activeTab === 'coaching' ? 'mock-tab-active mock-tab-coaching' : '']"
            @click="activeTab = 'coaching'"
          >
            <i class="mdi mdi-school" style="margin-right: 4px;" />我辅导的学员
            <span class="mock-tab-badge">{{ coachingRecords.length }}</span>
          </button>
          <button
            id="mock-tab-managed"
            :class="['mock-tab', activeTab === 'managed' ? 'mock-tab-active mock-tab-managed' : '']"
            @click="activeTab = 'managed'"
          >
            <i class="mdi mdi-account-group" style="margin-right: 4px;" />我管理的学员
            <span class="mock-tab-badge">{{ managedRecords.length }}</span>
          </button>
        </div>
      </template>

      <!-- 辅导 Tab -->
      <template v-if="activeTab === 'coaching'">
        <a-alert type="info" show-icon style="margin-bottom: 12px; border-radius: 8px;">
          <template #message>以下是由您亲自辅导的学员模拟应聘记录</template>
        </a-alert>

        <div class="filters-row">
          <a-select v-model:value="filters.practiceType" placeholder="全部类型" allow-clear style="width: 140px;">
            <a-select-option v-for="option in practiceTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
          <a-select v-model:value="filters.status" placeholder="全部状态" allow-clear style="width: 130px;">
            <a-select-option v-for="option in coachingStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
          <a-input v-model:value="filters.keyword" placeholder="搜索学员姓名/ID" allow-clear style="width: 180px;" @press-enter="handleSearch" />
          <a-button type="primary" @click="handleSearch">
            <template #icon><SearchOutlined /></template>
            筛选
          </a-button>
          <a-button type="text" @click="resetFilters">
            <template #icon><ReloadOutlined /></template>
            重置
          </a-button>
        </div>

        <a-table
          :columns="coachingColumns"
          :data-source="coachingRecords"
          :row-key="(r: AssistantMockPracticeRecord) => r.practiceId"
          :loading="loading"
          :pagination="tablePagination(coachingRecords.length)"
          :scroll="{ x: 900 }"
          :row-class-name="(record: AssistantMockPracticeRecord) => rowClassName(record)"
          :locale="{ emptyText: '当前筛选下没有可展示的模拟应聘记录' }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'studentName'">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div class="avatar" :style="{ background: resolveAvatarColor(record.studentName) }">{{ avatarText(record.studentName) }}</div>
                <div>
                  <div style="font-weight: 600;">{{ record.studentName || '-' }}</div>
                  <div style="font-size: 11px; color: var(--muted);">ID: {{ record.studentId || '-' }}</div>
                </div>
              </div>
            </template>
            <template v-else-if="column.dataIndex === 'practiceType'">
              <a-tag :color="practiceTypeColor(record.practiceType)">{{ practiceTypeLabel(record.practiceType) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'submittedAt'">
              <span style="font-size: 12px;">{{ formatDateTime(record.submittedAt) }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'status'">
              <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'completedHours'">
              <span v-if="record.completedHours" style="font-weight: 600; color: var(--primary);">{{ record.completedHours }}h</span>
              <span v-else style="color: var(--muted);">-</span>
            </template>
            <template v-else-if="column.dataIndex === 'feedback'">
              <div v-if="record.feedbackSummary">
                <div :style="{ fontSize: '12px', color: feedbackColor(record.feedbackRating), fontWeight: 500 }">
                  {{ feedbackLabel(record.feedbackRating) }}
                </div>
                <div style="font-size: 11px; color: var(--muted);">{{ record.feedbackSummary }}</div>
              </div>
              <span v-else style="color: var(--muted);">-</span>
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <a-space :size="8">
                <a-button
                  v-if="isNewAssigned(record)"
                  type="primary"
                  size="small"
                  style="background: #22C55E; border-color: #22C55E;"
                  @click="confirmRecord(record)"
                >
                  <template #icon><CheckOutlined /></template>
                  确认
                </a-button>
                <a-button type="link" size="small" class="link-button" @click="openDetail(record)">查看详情</a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </template>

      <!-- 管理 Tab -->
      <template v-else>
        <a-alert type="success" show-icon style="margin-bottom: 12px; border-radius: 8px;">
          <template #message>以下是您管理的学员的模拟应聘记录（由其他导师辅导）</template>
        </a-alert>

        <div class="filters-row">
          <a-select v-model:value="filters.practiceType" placeholder="全部类型" allow-clear style="width: 140px;">
            <a-select-option v-for="option in practiceTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
          <a-select v-model:value="filters.status" placeholder="全部状态" allow-clear style="width: 130px;">
            <a-select-option v-for="option in managedStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
          <a-input v-model:value="filters.keyword" placeholder="搜索学员姓名/ID" allow-clear style="width: 180px;" @press-enter="handleSearch" />
          <a-input v-model:value="filters.mentor" placeholder="搜索导师姓名" allow-clear style="width: 150px;" @press-enter="handleSearch" />
          <a-button type="primary" @click="handleSearch">
            <template #icon><SearchOutlined /></template>
            筛选
          </a-button>
          <a-button type="text" @click="resetFilters">
            <template #icon><ReloadOutlined /></template>
            重置
          </a-button>
        </div>

        <a-table
          id="mock-content-managed"
          :columns="managedColumns"
          :data-source="managedRecords"
          :row-key="(r: AssistantMockPracticeRecord) => r.practiceId"
          :loading="loading"
          :pagination="tablePagination(managedRecords.length)"
          :scroll="{ x: 1100 }"
          :row-class-name="(record: AssistantMockPracticeRecord) => rowClassName(record)"
          :locale="{ emptyText: '当前筛选下没有可展示的模拟应聘记录' }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'studentName'">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div class="avatar" :style="{ background: resolveAvatarColor(record.studentName) }">{{ avatarText(record.studentName) }}</div>
                <div>
                  <div style="font-weight: 600;">{{ record.studentName || '-' }}</div>
                  <div style="font-size: 11px; color: var(--muted);">ID: {{ record.studentId || '-' }}</div>
                </div>
              </div>
            </template>
            <template v-else-if="column.dataIndex === 'practiceType'">
              <a-tag :color="practiceTypeColor(record.practiceType)">{{ practiceTypeLabel(record.practiceType) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'submittedAt'">
              <span style="font-size: 12px;">{{ formatDateTime(record.submittedAt) }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'status'">
              <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'mentorName'">
              <div>
                <div style="font-weight: 500;">{{ record.mentorNames || '待分配' }}</div>
                <div style="font-size: 11px; color: var(--muted);">{{ record.mentorBackgrounds || '信息待补充' }}</div>
              </div>
            </template>
            <template v-else-if="column.dataIndex === 'completedHours'">
              <span v-if="record.completedHours" style="font-weight: 600; color: var(--primary);">{{ record.completedHours }}h</span>
              <span v-else style="color: var(--muted);">-</span>
            </template>
            <template v-else-if="column.dataIndex === 'feedback'">
              <div v-if="record.feedbackSummary">
                <div :style="{ fontSize: '12px', color: feedbackColor(record.feedbackRating), fontWeight: 500 }">
                  {{ feedbackLabel(record.feedbackRating) }}
                </div>
                <div style="font-size: 11px; color: var(--muted);">{{ record.feedbackSummary }}</div>
              </div>
              <span v-else style="color: var(--muted);">-</span>
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <a-button type="link" size="small" class="link-button" @click="openDetail(record)">查看详情</a-button>
            </template>
          </template>
        </a-table>
      </template>
    </a-card>

    <!-- 详情弹窗 -->
    <a-modal
      v-model:open="detailModal.visible"
      :title="detailModal.record ? `模拟应聘详情 · ${detailModal.record.studentName || '-'}` : '模拟应聘详情'"
      :footer="null"
      width="720px"
      :after-close="onDetailClosed"
    >
      <template v-if="detailModal.record">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="状态">{{ statusLabel(detailModal.record.status) }}</a-descriptions-item>
          <a-descriptions-item label="安排时间">{{ formatDateTime(detailModal.record.scheduledAt || detailModal.record.submittedAt) }}</a-descriptions-item>
          <a-descriptions-item label="导师">{{ detailModal.record.mentorNames || '暂未安排' }}</a-descriptions-item>
          <a-descriptions-item label="已完成课时">{{ detailModal.record.completedHours || 0 }} h</a-descriptions-item>
        </a-descriptions>

        <div class="detail-section">
          <span class="detail-label">申请内容</span>
          <div class="detail-panel">{{ detailModal.record.requestContent || '暂无申请内容' }}</div>
        </div>

        <div class="detail-section">
          <span class="detail-label">反馈摘要</span>
          <div class="detail-panel">{{ detailModal.record.feedbackSummary || '当前记录尚未回填反馈摘要。' }}</div>
        </div>

        <a-alert
          type="info"
          show-icon
          style="margin-top: 16px; border-radius: 8px;"
          message="这里汇总本次模拟应聘的申请内容、安排信息和反馈摘要，便于助教跟进后续沟通与复盘。"
        />
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { CheckOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  getAssistantMockPracticeList,
  type AssistantMockPracticeRecord,
} from '@osg/shared/api'

type ActiveTab = 'coaching' | 'managed'

const practiceTypeOptions = [
  { value: 'mock_interview', label: '模拟面试' },
  { value: 'communication_test', label: '沟通测试' },
  { value: 'relation_test', label: '人际关系测试' },
  { value: 'midterm', label: '期中考试' },
]

const coachingStatusOptions = [
  { value: 'new', label: '新分配' },
  { value: 'pending', label: '待进行' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const managedStatusOptions = [
  { value: 'pending', label: '待进行' },
  { value: 'ongoing', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const coachingColumns = [
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 180, fixed: 'left' as const },
  { title: '类型', dataIndex: 'practiceType', key: 'practiceType', width: 130 },
  { title: '申请时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 130 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
  { title: '已上课时', dataIndex: 'completedHours', key: 'completedHours', width: 100 },
  { title: '课程反馈', dataIndex: 'feedback', key: 'feedback', width: 200 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 170, fixed: 'right' as const },
]

const managedColumns = [
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 180, fixed: 'left' as const },
  { title: '类型', dataIndex: 'practiceType', key: 'practiceType', width: 130 },
  { title: '申请时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 130 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
  { title: '辅导导师', dataIndex: 'mentorName', key: 'mentorName', width: 150 },
  { title: '已上课时', dataIndex: 'completedHours', key: 'completedHours', width: 100 },
  { title: '课程反馈', dataIndex: 'feedback', key: 'feedback', width: 200 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 110, fixed: 'right' as const },
]

const loading = ref(true)
const errorMessage = ref('')
const activeTab = ref<ActiveTab>('coaching')
const records = ref<AssistantMockPracticeRecord[]>([])
const confirmedIds = ref<Set<number>>(new Set())

const filters = reactive({
  keyword: '',
  practiceType: undefined as string | undefined,
  status: undefined as string | undefined,
  mentor: '',
})

const detailModal = reactive<{
  visible: boolean
  record: AssistantMockPracticeRecord | null
}>({
  visible: false,
  record: null,
})

const filteredRecords = computed(() =>
  records.value.filter((record) => {
    const keyword = (filters.keyword || '').trim().toLowerCase()
    const matchesKeyword =
      !keyword ||
      [record.studentName, String(record.studentId || ''), record.requestContent]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))

    const mentorKeyword = (filters.mentor || '').trim().toLowerCase()
    const matchesMentor =
      !mentorKeyword ||
      String(record.mentorNames || '').toLowerCase().includes(mentorKeyword)

    return (
      matchesKeyword &&
      matchesMentor &&
      (!filters.practiceType || record.practiceType === filters.practiceType) &&
      (!filters.status || record.status === filters.status)
    )
  }),
)

const coachingRecords = computed(() => filteredRecords.value)
const managedRecords = computed(() => filteredRecords.value)

function tablePagination(total: number) {
  return {
    total,
    pageSize: 10,
    showSizeChanger: true,
    showTotal: (t: number) => `共 ${t} 条`,
  }
}

const completedCount = computed(
  () => records.value.filter((r) => String(r.status || '').toLowerCase() === 'completed').length,
)

const totalHours = computed(() =>
  records.value.reduce((sum, r) => sum + (Number(r.completedHours) || 0), 0),
)

const statsCards = computed(() => [
  { key: 'coaching', label: '我辅导的', value: coachingRecords.value.length, color: '#3B82F6' },
  { key: 'managed', label: '我管理的', value: managedRecords.value.length, color: '#22C55E' },
  { key: 'completed', label: '已完成', value: completedCount.value, color: '#8B5CF6' },
  { key: 'hours', label: '累计课时', value: `${totalHours.value}h`, color: 'var(--primary)' },
])

function isNewAssigned(record: AssistantMockPracticeRecord) {
  if (confirmedIds.value.has(record.practiceId)) return false
  const status = String(record.status || '').toLowerCase()
  return status === 'new' || status === 'new_assigned'
}

function isMidterm(record: AssistantMockPracticeRecord) {
  const type = String(record.practiceType || '').toLowerCase()
  return type === 'midterm' || type === 'midterm_exam'
}

function rowClassName(record: AssistantMockPracticeRecord): string {
  if (isNewAssigned(record)) return 'row-new'
  if (isMidterm(record)) return 'row-midterm'
  return ''
}

function practiceTypeLabel(value?: string) {
  const labels: Record<string, string> = {
    mock_interview: '模拟面试',
    communication_test: '沟通测试',
    relation_test: '人际关系测试',
    midterm: '期中考试',
    midterm_exam: '期中考试',
  }
  if (!value) return '未标注'
  return labels[value] || value
}

function practiceTypeColor(value?: string): string {
  const v = String(value || '').toLowerCase()
  if (v === 'communication_test' || v === 'relation_test') return 'orange'
  if (v === 'midterm' || v === 'midterm_exam') return 'purple'
  return 'blue'
}

function statusLabel(value?: string) {
  const labels: Record<string, string> = {
    new: '新分配',
    new_assigned: '新分配',
    pending: '待进行',
    scheduled: '待进行',
    ongoing: '进行中',
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消',
  }
  if (!value) return '未标注'
  return labels[value] || value
}

function statusColor(value?: string): string {
  const v = String(value || '').toLowerCase()
  if (v === 'new' || v === 'new_assigned') return 'red'
  if (v === 'completed') return 'green'
  if (v === 'cancelled') return 'default'
  if (v === 'ongoing') return 'blue'
  if (v === 'pending' || v === 'scheduled') return 'orange'
  return 'blue'
}

function feedbackLabel(value?: number | null) {
  if (value == null) return '暂无评分'
  if (value >= 5) return '表现优秀'
  if (value >= 4) return '反馈良好'
  if (value >= 3) return '反馈一般'
  return '需补充反馈'
}

function feedbackColor(value?: number | null): string {
  if (value == null) return 'var(--muted)'
  if (value >= 5) return '#059669'
  if (value >= 4) return '#F59E0B'
  return 'var(--muted)'
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  const hour = String(parsed.getHours()).padStart(2, '0')
  const minute = String(parsed.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hour}:${minute}`
}

function avatarText(name?: string | null) {
  return String(name || '学').trim().slice(0, 1) || '学'
}

function resolveAvatarColor(seed?: string | null) {
  const palette = ['#3B82F6', '#F59E0B', '#22C55E', '#8B5CF6', '#EC4899', '#10B981']
  const source = String(seed || '').trim()
  if (!source) return palette[0]
  const hash = Array.from(source).reduce((total, char) => total + char.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

function resetFilters() {
  filters.keyword = ''
  filters.practiceType = undefined
  filters.status = undefined
  filters.mentor = ''
}

function handleSearch() {
  void loadRecords()
}

function confirmRecord(record: AssistantMockPracticeRecord) {
  confirmedIds.value.add(record.practiceId)
  message.success(`已确认：${record.studentName || '学员'}`)
}

function openDetail(record: AssistantMockPracticeRecord) {
  detailModal.record = record
  detailModal.visible = true
}

function onDetailClosed() {
  detailModal.record = null
}

async function loadRecords() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await getAssistantMockPracticeList()
    records.value = response.rows || []
  } catch (error: any) {
    errorMessage.value = error?.message || '模拟应聘记录暂时无法加载，请稍后重试。'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadRecords()
})
</script>

<style scoped>
/* ---- Tab 按钮（与 Job Overview 一致） ---- */
.mock-tab {
  padding: 6px 14px;
  font-size: 12px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
}
.mock-tab:hover {
  background: #e2e8f0;
}
.mock-tab-active {
  color: #fff;
  font-weight: 600;
}
.mock-tab-coaching.mock-tab-active {
  background: var(--primary);
}
.mock-tab-managed.mock-tab-active {
  background: #8B5CF6;
}
.mock-tab-badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  margin-left: 4px;
}

/* ---- 筛选条件行 ---- */
.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

/* ---- 头像 ---- */
.avatar {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

/* ---- 行高亮（原型设计） ---- */
:deep(.row-new) {
  background: linear-gradient(90deg, #FEE2E2, #FEF2F2);
  border-left: 4px solid #EF4444;
}
:deep(.row-midterm) {
  background: #F3E8FF;
}

/* ---- 详情弹窗内容 ---- */
.detail-section {
  margin-top: 18px;
}
.detail-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 700;
  color: var(--muted);
  font-size: 12px;
}
.detail-panel {
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  padding: 14px 16px;
  line-height: 1.7;
  white-space: pre-wrap;
  font-size: 13px;
}

.link-button {
  padding: 0;
}

@media (max-width: 900px) {
  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }
  .filters-row > * {
    width: 100% !important;
  }
}
</style>
