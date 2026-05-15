<template>
  <div id="page-myclass">
    <PageHeader
      title-zh="课程记录"
      title-en="Class Records"
    >
      <template #actions>
        <a-button type="primary" @click="showReportModal = true">
          <i class="mdi mdi-plus" style="margin-right:4px" />上报课程记录
        </a-button>
      </template>
    </PageHeader>

    <!-- Tabs -->
    <a-radio-group v-model:value="activeTab" button-style="solid" class="tabs-radio" style="margin-bottom:20px">
      <a-radio-button v-for="tab in tabs" :key="tab.key" :value="tab.key">
        {{ tab.label }}
        <a-badge v-if="tab.badge" :count="tab.badge" :number-style="{ backgroundColor: '#F59E0B' }" :offset="[8, -4]" />
      </a-radio-button>
    </a-radio-group>

    <!-- 筛选 + 表格 -->
    <a-card :bordered="false">
      <a-form layout="inline" class="filter-bar" style="margin-bottom: 16px">
        <a-form-item>
          <a-input
            v-model:value="filters.keyword"
            placeholder="搜索学员姓名/ID..."
            allow-clear
            style="width:200px"
          />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.coachingType" placeholder="辅导类型" style="width:140px" allow-clear>
            <a-select-option value="">辅导类型</a-select-option>
            <a-select-option value="job_coaching">岗位辅导</a-select-option>
            <a-select-option value="mock_interview">模拟应聘</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.contentType" placeholder="课程内容" style="width:160px" allow-clear>
            <a-select-option value="">课程内容</a-select-option>
            <a-select-option v-for="ct in contentTypes" :key="ct" :value="ct">{{ ct }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.timeRange" placeholder="时间范围" style="width:140px" allow-clear>
            <a-select-option value="">时间范围</a-select-option>
            <a-select-option value="this_week">本周</a-select-option>
            <a-select-option value="last_week">上周</a-select-option>
            <a-select-option value="this_month">本月</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button @click="resetFilters">
            <i class="mdi mdi-filter-variant" style="margin-right:4px" />重置
          </a-button>
        </a-form-item>
      </a-form>

      <a-table
        :columns="columns"
        :data-source="filteredRecords"
        :pagination="false"
        :row-key="(r: any) => r.id"
        :locale="{ emptyText: '暂无数据' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'recordNo'">{{ record.recordNo }}</template>
          <template v-else-if="column.key === 'student'">
            <div>
              <strong>{{ record.studentName || '学员' }}</strong>
              <br />
              <span class="text-muted text-sm">ID: {{ record.studentId }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'coachingType'">
            <a-tag :color="coachingTagColor(record.coachingType)">{{ coachingLabel(record.coachingType) }}</a-tag>
            <br v-if="record.contentDetail" />
            <span v-if="record.contentDetail" class="text-sm">{{ record.contentDetail }}</span>
          </template>
          <template v-else-if="column.key === 'contentType'">
            <a-tag :color="contentTagColor(record.contentType)">{{ record.contentType }}</a-tag>
          </template>
          <template v-else-if="column.key === 'classDate'">{{ formatDate(record.classDate) }}</template>
          <template v-else-if="column.key === 'durationHours'">{{ record.durationHours }}h</template>
          <template v-else-if="column.key === 'totalFee'">¥{{ record.totalFee }}</template>
          <template v-else-if="column.key === 'reviewStatus'">
            <ClassRecordStatusTag :status="record.reviewStatus" />
          </template>
          <template v-else-if="column.key === 'studentEvaluation'">
            <a-tag v-if="evaluationTag(record)" :color="evaluationTagColor(record)">{{ evaluationTag(record)?.text }}</a-tag>
            <span v-else class="text-muted">-</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button v-if="record.reviewStatus === 'rejected'" type="link" size="small" @click="showReject(record)">查看原因</a-button>
            <a-button v-else type="link" size="small" @click="showDetail(record)">查看详情</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 上报弹窗（同时承载新建上报 + 驳回后重新提交，复用 shared ClassReportFlowModal） -->
    <ReportModal
      v-if="showReportModal"
      :prefilled-student-id="reportPrefill.studentId"
      :prefilled-reference-type="reportPrefill.referenceType"
      :prefilled-reference-id="reportPrefill.referenceId"
      @close="closeReportModal"
      @submitted="onReportSubmitted"
    />

    <a-modal
      v-model:open="detailModal.visible"
      wrap-class-name="osg-modal-form"
      :width="720"
      :footer="null"
      :title="null"
      :closable="false"
      :body-style="{ padding: 0 }"
      :get-container="false"
      :destroy-on-close="true"
      @cancel="closeDetailModal"
    >
      <div id="modal-class-detail">
        <div class="modal-header">
          <span class="modal-title"><i class="mdi mdi-file-document-outline" /> 课程记录详情</span>
          <button class="modal-close" type="button" @click="closeDetailModal">×</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">记录编号</span>
              <div class="detail-value">{{ detailModal.record?.recordNo || '-' }}</div>
            </div>
            <div class="detail-item">
              <span class="detail-label">学员</span>
              <div class="detail-value">{{ detailModal.record?.studentName || '-' }} ({{ detailModal.record?.studentId || '-' }})</div>
            </div>
            <div class="detail-item">
              <span class="detail-label">辅导内容</span>
              <div class="detail-value">{{ coachingLabel(detailModal.record?.coachingType || '') }}</div>
            </div>
            <div class="detail-item">
              <span class="detail-label">课程内容</span>
              <div class="detail-value">{{ detailModal.record?.contentType || '-' }}</div>
            </div>
            <div class="detail-item">
              <span class="detail-label">上课日期</span>
              <div class="detail-value">{{ formatDate(detailModal.record?.classDate || '') }}</div>
            </div>
          </div>
          <div class="detail-section">
            <div class="detail-label">课程反馈</div>
            <div class="detail-panel">{{ summarizeFeedback(detailModal.record?.feedbackContent) || detailModal.record?.contentDetail || '暂无课程反馈' }}</div>
          </div>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="rejectModal.visible"
      wrap-class-name="osg-modal-form"
      :width="520"
      :footer="null"
      :title="null"
      :closable="false"
      :body-style="{ padding: 0 }"
      :get-container="false"
      :destroy-on-close="true"
      @cancel="closeRejectModal"
    >
      <div id="modal-class-reject">
        <div class="modal-header modal-header--reject">
          <span class="modal-title"><i class="mdi mdi-alert-circle" /> 课程审核驳回</span>
          <button class="modal-close" type="button" @click="closeRejectModal">×</button>
        </div>
        <div class="modal-body">
          <div class="reject-summary">
            <div class="reject-summary-grid">
              <div>
                <span class="reject-summary-label">学员</span>
                <div class="reject-summary-value">{{ rejectModal.record?.studentName || '学员' }} ({{ rejectModal.record?.studentId || '-' }})</div>
              </div>
              <div>
                <span class="reject-summary-label">课程类型</span>
                <div class="reject-summary-value">{{ rejectModal.record?.contentType || rejectModal.record?.coachingType || '-' }}</div>
              </div>
              <div>
                <span class="reject-summary-label">上课时间</span>
                <div class="reject-summary-value">{{ formatDate(rejectModal.record?.classDate || '') }}</div>
              </div>
              <div>
                <span class="reject-summary-label">提交时长</span>
                <div class="reject-summary-value">{{ rejectModal.record?.durationHours ? `${rejectModal.record.durationHours}h` : '-' }}</div>
              </div>
            </div>
          </div>
          <div class="reject-reason">
            <div class="reject-reason-title"><i class="mdi mdi-close-circle" /> 驳回原因</div>
            <div class="detail-panel detail-panel--danger">{{ rejectModal.reason || '暂无驳回原因' }}</div>
          </div>
          <div class="reject-meta">
            <div>审核人:课时审核员 Admin</div>
            <div>驳回时间:{{ rejectModal.record?.reviewedAt ? formatDate(rejectModal.record.reviewedAt) : '12/11/2025 10:30' }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <a-button @click="closeRejectModal">关闭</a-button>
          <a-button type="primary" style="margin-left:8px" @click="openReportModalFromReject">重新提交</a-button>
        </div>
      </div>
    </a-modal>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { ClassRecordStatusTag } from '@osg/shared/components'
import { http } from '@osg/shared/utils/request'
import type { ReferenceType } from '@osg/shared/types/classReport'
import ReportModal from './components/ReportModal.vue'

const activeTab = ref('all')
const showReportModal = ref(false)
const records = ref<any[]>([])
const summaryRecords = ref<any[]>([])
const detailModal = ref<{ visible: boolean; record: any | null }>({ visible: false, record: null })
const rejectModal = ref<{ visible: boolean; reason: string; record: any | null }>({ visible: false, reason: '', record: null })
const reportPrefill = ref<{ studentId?: number; referenceType?: ReferenceType; referenceId?: number }>({})
const filters = ref({ keyword: '', coachingType: '', contentType: '', timeRange: '' })
const fullListParams = { pageNum: 1, pageSize: 1000 }
const contentTypes = ['新简历', '简历更新', 'Case准备', '模拟面试', '人际关系期中考试', '模拟期中考试', 'Behavioral', 'Technical', '其他']

const tabs = computed(() => {
  const pending = summaryRecords.value.filter(r => r.reviewStatus === 'pending').length
  return [
    { key: 'all', label: '全部', badge: 0 },
    { key: 'pending', label: '待审核', badge: pending || 0 },
    { key: 'approved', label: '已通过', badge: 0 },
    { key: 'rejected', label: '已驳回', badge: 0 },
  ]
})

const filteredRecords = computed(() => {
  let list = records.value
  const keyword = filters.value.keyword.trim()
  if (keyword) {
    const loweredKeyword = keyword.toLowerCase()
    list = list.filter((record) => {
      const studentName = String(record.studentName ?? '').toLowerCase()
      const studentId = String(record.studentId ?? '').toLowerCase()
      const recordNo = String(record.recordNo ?? '').toLowerCase()
      return studentName.includes(loweredKeyword) || studentId.includes(loweredKeyword) || recordNo.includes(loweredKeyword)
    })
  }
  if (filters.value.coachingType) list = list.filter(r => r.coachingType === filters.value.coachingType)
  if (filters.value.contentType) list = list.filter(r => r.contentType === filters.value.contentType)
  if (filters.value.timeRange) list = list.filter(r => matchesTimeRange(r.classDate, filters.value.timeRange))
  return list
})

// 课时费列删除 — 用户需求「上报课程记录的页面，不显示最下方的课时费」（导师/班主任/助教三端统一）
const columns = [
  { title: '记录ID', key: 'recordNo', dataIndex: 'recordNo' },
  { title: '学员', key: 'student' },
  { title: '辅导内容', key: 'coachingType' },
  { title: '课程内容', key: 'contentType' },
  { title: '上课日期', key: 'classDate', dataIndex: 'classDate' },
  { title: '时长', key: 'durationHours', dataIndex: 'durationHours' },
  { title: '审核状态', key: 'reviewStatus' },
  { title: '学员评价', key: 'studentEvaluation' },
  { title: '操作', key: 'actions' },
]

function coachingTagColor(t: string) {
  return { job_coaching: 'blue', mock_interview: 'green', networking: 'purple', mock_midterm: 'orange' }[t] || 'blue'
}
function contentTagColor(t: string) {
  return {
    '模拟面试': 'green',
    '模拟期中考试': 'orange',
    '人际关系期中考试': 'purple',
    '简历更新': 'blue',
    'Case准备': 'blue',
    '笔试辅导': 'orange',
    '基础课程': 'blue',
  }[t] || 'blue'
}
function evaluationTagColor(record: Record<string, any>) {
  const tag = evaluationTag(record)
  return tag?.className === 'success' ? 'green' : tag?.className === 'warning' ? 'orange' : 'default'
}

function resetFilters() {
  filters.value = { keyword: '', coachingType: '', contentType: '', timeRange: '' }
  activeTab.value = 'all'
  records.value = summaryRecords.value
}
function formatDate(d: string) {
  if (!d) return ''
  // 优先按字符串截前 10 位（避免 ISO 时区差导致日期偏移）
  const s = String(d).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const date = new Date(s)
  if (Number.isNaN(date.getTime())) return s
  return date.toISOString().slice(0, 10)
}
function coachingLabel(t: string) { return { job_coaching: '岗位辅导', mock_interview: '模拟应聘', networking: '人际关系', mock_midterm: '模拟期中', basic: '基础课程', basic_course: '基础课程' }[t] || t }
function contentLabel(t: string) {
  const normalized = String(t ?? '').trim().replace(/-/g, '_').toLowerCase()
  return {
    // RULE-E: 课程内容字典中文 label（覆盖 courseType / classStatus / courseSource 三个口径）
    job_coaching: '岗位辅导',
    relation_test: '人际关系',
    communication_test: '人际关系',
    networking: '人际关系',
    midterm: '期中考试',
    midterm_test: '期中考试',
    base_course: '基础课程',
    resume_revision: '新简历',
    new_resume: '新简历',
    resume_update: '简历更新',
    case_prep: 'Case准备',
    mock_interview: '模拟面试',
    mock_interview_content: '模拟面试',
    networking_midterm: '人际关系期中考试',
    networking_content: '人际关系期中考试',
    mock_midterm: '模拟期中考试',
    mock_midterm_content: '模拟期中考试',
    written_test: '笔试辅导',
    technical: 'Technical',
    behavioral: 'Behavioral',
    basic: '基础课程',
    basic_course: '基础课程',
    mentor_report: '课程上报',
    student_request: '学员申请',
    other: '其他',
  }[normalized] || t
}
function evaluationTag(record: Record<string, any>) {
  if (record.studentEvaluation !== '' && record.studentEvaluation != null) {
    return { text: `⭐ ${record.studentEvaluation}`, className: 'success' }
  }
  if (record.reviewStatus === 'approved') {
    return { text: '待评价', className: 'warning' }
  }
  return null
}

/**
 * RULE-C: feedbackContent 后端存 JSON 字符串，UI 不能裸显示。
 * 抽取 highlights / narrative / nextSteps 作为人类可读摘要。
 */
function summarizeFeedback(raw: unknown): string {
  if (!raw) return ''
  if (typeof raw !== 'string' && typeof raw !== 'object') return ''
  let obj: any = raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed.startsWith('{')) return trimmed
    try { obj = JSON.parse(trimmed) } catch { return trimmed }
  }
  const parts = [obj?.highlights, obj?.narrative, obj?.improvements, obj?.nextSteps]
    .filter((v) => typeof v === 'string' && v.trim().length > 0)
  return parts.join(' · ').slice(0, 160)
}

function normalizeCourseRecord(record: Record<string, any>) {
  const durationHours = Number(record.durationHours ?? 0)
  const rate = Number(record.rate ?? record.hourlyRate ?? 0)
  const recordId = record.recordId ?? record.id
  const rawContentType = record.contentType ?? record.classStatus ?? record.courseType ?? record.courseSource ?? ''
  const detailFallback = record.contentDetail ?? summarizeFeedback(record.feedbackContent) ?? record.comments ?? record.topics ?? record.reviewRemark ?? ''
  return {
    ...record,
    id: recordId,
    recordId,
    recordNo: record.recordNo ?? record.classId ?? (recordId ? `CR-${recordId}` : '-'),
    coachingType: record.coachingType ?? record.courseType ?? '',
    contentType: contentLabel(rawContentType),
    contentDetail: typeof detailFallback === 'string' ? detailFallback : '',
    reviewStatus: record.reviewStatus ?? record.status ?? '',
    totalFee: record.totalFee ?? (Number.isFinite(durationHours * rate) ? durationHours * rate : 0),
    studentEvaluation: resolveStudentEvaluation(record)
  }
}

function resolveStudentEvaluation(record: Record<string, any>) {
  const explicitEvaluation = record.studentEvaluation ?? record.feedbackRating
  if (explicitEvaluation !== '' && explicitEvaluation != null) {
    return String(explicitEvaluation)
  }

  const reviewStatus = record.reviewStatus ?? record.status ?? ''
  if (reviewStatus !== 'approved') {
    return ''
  }

  const rawRate = String(record.rate ?? '').trim()
  if (!rawRate) {
    return ''
  }

  if (!/^[1-5](?:\.0+)?$/.test(rawRate)) {
    return ''
  }

  return rawRate.replace(/\.0+$/, '')
}

function matchesTimeRange(classDate: string | undefined, timeRange: string) {
  if (!classDate) {
    return false
  }
  const currentDate = new Date()
  const targetDate = new Date(classDate)
  if (Number.isNaN(targetDate.getTime())) {
    return false
  }

  const currentDay = currentDate.getDay()
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
  const startOfThisWeek = new Date(currentDate)
  startOfThisWeek.setHours(0, 0, 0, 0)
  startOfThisWeek.setDate(currentDate.getDate() + mondayOffset)

  const endOfThisWeek = new Date(startOfThisWeek)
  endOfThisWeek.setDate(startOfThisWeek.getDate() + 7)

  if (timeRange === 'this_week') {
    return targetDate >= startOfThisWeek && targetDate < endOfThisWeek
  }

  if (timeRange === 'last_week') {
    const startOfLastWeek = new Date(startOfThisWeek)
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7)
    return targetDate >= startOfLastWeek && targetDate < startOfThisWeek
  }

  if (timeRange === 'this_month') {
    return targetDate.getFullYear() === currentDate.getFullYear() && targetDate.getMonth() === currentDate.getMonth()
  }

  return true
}

function closeDetailModal() {
  detailModal.value = { visible: false, record: null }
}

function closeRejectModal() {
  rejectModal.value = { visible: false, reason: '', record: null }
}

// FIX-3 (2026-05-15): 驳回后"重新提交"改走 shared ClassReportFlowModal（经 ReportModal 包装），
// 不再裸 POST /mentor/class-records 绕过 validator。原 inline confirm modal 含 courseType
// 映射不全 + classStatus / referenceType / referenceId 缺失，触发 backend validator 400。
function openReportModalFromReject() {
  const record = rejectModal.value.record
  reportPrefill.value = {
    studentId: record?.studentId ?? undefined,
    referenceType: (record?.referenceType ?? undefined) as ReferenceType | undefined,
    referenceId: record?.referenceId ?? undefined,
  }
  showReportModal.value = true
  closeRejectModal()
}

function closeReportModal() {
  showReportModal.value = false
  reportPrefill.value = {}
}

async function showDetail(record: any) {
  const recordId = record.recordId ?? record.id
  let detailRecord = record
  if (recordId != null) {
    try {
      detailRecord = normalizeCourseRecord(await http.get(`/mentor/class-records/${recordId}`))
    } catch {
      detailRecord = normalizeCourseRecord(record)
    }
  }
  detailModal.value = { visible: true, record: normalizeCourseRecord(detailRecord) }
}

function showReject(record: any) {
  const normalizedRecord = normalizeCourseRecord(record)
  rejectModal.value = {
    visible: true,
    reason: record.reviewRemark || record.remark || '暂无驳回原因',
    record: normalizedRecord
  }
}

async function fetchRecords() {
  try {
    if (activeTab.value === 'all') {
      records.value = summaryRecords.value
      return
    }
    const res = await http.get('/mentor/class-records/list', {
      params: { status: activeTab.value }
    })
    records.value = (res.rows || []).map((record: Record<string, any>) => normalizeCourseRecord(record))
  } catch { records.value = [] }
}

async function fetchSummaryRecords() {
  try {
    const res = await http.get('/mentor/class-records/list', {
      params: fullListParams
    })
    summaryRecords.value = (res.rows || []).map((record: Record<string, any>) => normalizeCourseRecord(record))
  } catch {
    summaryRecords.value = []
  }
}

async function onReportSubmitted() {
  closeReportModal()
  await fetchSummaryRecords()
  await fetchRecords()
}

watch(activeTab, async () => {
  await fetchRecords()
})

onMounted(async () => {
  await fetchSummaryRecords()
  await fetchRecords()
})
</script>

<style scoped>
.tabs-radio :deep(.ant-radio-button-wrapper){padding:0 16px}
.filter-bar :deep(.ant-form-item){margin-bottom:0;margin-right:12px}
.text-muted{color:#94A3B8}
.text-sm{font-size:12px}
.form-grid{display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:16px}
.form-group{margin-bottom:12px}
.form-label{display:block;font-size:13px;font-weight:600;color:#1E293B;margin-bottom:6px}
.form-input{padding:8px 12px;border:1px solid #E2E8F0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;width:100%}
.form-input:focus{border-color:#7399C6;box-shadow:0 0 0 4px #E8F0F8}
.form-select{padding:8px 36px 8px 12px;border:1px solid #E2E8F0;border-radius:8px;font-size:14px;background:#fff;appearance:none;cursor:pointer;width:100%}
.req{color:#EF4444;margin-left:2px}
.modal-header{padding:20px 24px;background:linear-gradient(135deg,#7399C6,#5A7BA3);color:#fff;display:flex;align-items:center;justify-content:space-between}
.modal-header--reject{background:#FEE2E2;color:#DC2626}
.modal-header--confirm{background:linear-gradient(135deg,#7399C6,#5A7BA3);color:#fff}
.modal-title{display:inline-flex;align-items:center;gap:8px;font-size:18px;font-weight:700}
.modal-close{width:36px;height:36px;border:none;border-radius:10px;background:rgba(255,255,255,0.16);color:#fff;font-size:20px;cursor:pointer}
.modal-body{padding:24px}
.modal-footer{padding:16px 24px;display:flex;justify-content:flex-end;border-top:1px solid #E2E8F0}
.modal-footer--confirm{background:#F8FAFC}
.reject-summary{background:#FEF2F2;border-radius:12px;padding:16px;margin-bottom:20px}
.reject-summary-grid{display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:12px}
.reject-summary-label,.confirm-meta-label{display:block;color:#94A3B8;font-size:12px}
.reject-summary-value,.confirm-meta-value{font-weight:600;margin-top:4px;color:#1E293B}
.reject-reason{margin-bottom:16px}
.reject-reason-title,.confirm-feedback-title{font-size:14px;font-weight:600;margin-bottom:12px;color:#DC2626;display:flex;align-items:center;gap:6px}
.reject-meta{color:#94A3B8;font-size:13px;margin-top:16px;display:grid;gap:6px}
.confirm-meta{background:#E8F0F8;border-radius:12px;padding:16px;margin-bottom:20px;display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:12px}
.confirm-divider{margin:20px 0;border:none;border-top:1px solid #E2E8F0}
.confirm-feedback-default{text-align:center;padding:32px;color:#94A3B8;background:#FAFAFA;border-radius:12px;border:1px dashed #E2E8F0}
.confirm-feedback-icon{font-size:48px;opacity:0.5}
.confirm-feedback-banner{padding:12px;border-radius:8px;margin-bottom:16px;font-size:14px}
.confirm-feedback-banner--mock{background:#F3E8FF;color:#7C3AED}
.confirm-feedback-banner--regular{background:#FFF7ED;color:#EA580C}
.confirm-feedback-banner--networking{background:#ECFDF5;color:#059669}
.confirm-feedback-banner--resume{background:#EFF6FF;color:#1D4ED8}
.detail-grid{display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:16px}
.detail-item{background:#F8FAFC;border-radius:12px;padding:16px}
.detail-label{display:block;font-size:12px;font-weight:600;color:#64748B;margin-bottom:6px}
.detail-value{font-size:14px;color:#1E293B;line-height:1.6}
.detail-section{margin-top:20px}
.detail-panel{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;color:#334155;line-height:1.7;white-space:pre-wrap}
.detail-panel--danger{background:#FEF2F2;border-color:#FECACA;color:#991B1B}
</style>
