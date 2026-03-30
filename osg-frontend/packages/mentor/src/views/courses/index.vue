<template>
  <div id="page-myclass">
    <div class="page-header">
      <div>
        <h1 class="page-title">课程记录 <span class="page-title-en">Class Records</span></h1>
        <p class="page-sub">查看和上报课程记录</p>
      </div>
      <button class="btn btn-primary" @click="showReportModal = true"><i class="mdi mdi-plus" /> 上报课程记录</button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button v-for="tab in tabs" :key="tab.key" class="tab" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.label }}
        <span v-if="tab.badge" class="tag warning" style="margin-left:4px">{{ tab.badge }}</span>
      </button>
    </div>

    <!-- 筛选 -->
    <div class="card">
      <div class="card-body">
        <div class="filter-bar">
          <input v-model="filters.keyword" class="form-input" placeholder="搜索学员姓名/ID..." style="width:180px" />
          <select v-model="filters.coachingType" class="form-select filter-select">
            <option value="">辅导类型</option>
            <option value="job_coaching">岗位辅导</option>
            <option value="mock_interview">模拟应聘</option>
          </select>
          <select v-model="filters.contentType" class="form-select filter-select">
            <option value="">课程内容</option>
            <option v-for="ct in contentTypes" :key="ct" :value="ct">{{ ct }}</option>
          </select>
          <select v-model="filters.timeRange" class="form-select filter-select">
            <option value="">时间范围</option>
            <option value="this_week">本周</option>
            <option value="last_week">上周</option>
            <option value="this_month">本月</option>
          </select>
          <button class="btn btn-outline btn-sm" @click="resetFilters"><i class="mdi mdi-filter-variant" /> 重置</button>
        </div>
      </div>
      <!-- 表格 -->
      <div class="card-body" style="padding:0">
        <table class="table">
          <thead>
            <tr><th>记录ID</th><th>学员</th><th>辅导内容</th><th>课程内容</th><th>上课日期</th><th>时长</th><th>课时费</th><th>审核状态</th><th>学员评价</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in filteredRecords" :key="r.id">
              <td>{{ r.recordNo }}</td>
              <td><strong>{{ r.studentName || '学员' }}</strong><br/><span class="text-muted text-sm">ID: {{ r.studentId }}</span></td>
              <td><span class="tag" :class="coachingTagClass(r.coachingType)">{{ coachingLabel(r.coachingType) }}</span><br/><span class="text-sm">{{ r.contentDetail || '' }}</span></td>
              <td><span class="tag" :class="contentTagClass(r.contentType)">{{ r.contentType }}</span></td>
              <td>{{ formatDate(r.classDate) }}</td>
              <td>{{ r.durationHours }}h</td>
              <td>¥{{ r.totalFee }}</td>
              <td><span class="tag" :class="statusClass(r.reviewStatus)">{{ statusLabel(r.reviewStatus) }}</span></td>
              <td>
                <span v-if="evaluationTag(r)" class="tag" :class="evaluationTag(r)?.className">{{ evaluationTag(r)?.text }}</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <button v-if="r.reviewStatus === 'rejected'" class="btn btn-text btn-sm" @click="showReject(r)">查看原因</button>
                <button v-else class="btn btn-text btn-sm" @click="showDetail(r)">查看详情</button>
              </td>
            </tr>
            <tr v-if="filteredRecords.length === 0"><td colspan="10" style="text-align:center;color:#94A3B8;padding:40px">暂无数据</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 上报弹窗 -->
    <ReportModal v-if="showReportModal" @close="showReportModal = false" @submitted="onReportSubmitted" />

    <div v-if="detailModal.visible" id="modal-class-detail" class="modal active" @click.self="closeDetailModal">
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title"><i class="mdi mdi-file-document-outline" /> 课程记录详情</span>
          <button class="modal-close" @click="closeDetailModal">×</button>
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
            <div class="detail-item">
              <span class="detail-label">课时费</span>
              <div class="detail-value">¥{{ detailModal.record?.totalFee ?? '-' }}</div>
            </div>
          </div>
          <div class="detail-section">
            <div class="detail-label">课程反馈</div>
            <div class="detail-panel">{{ detailModal.record?.contentDetail || '暂无课程反馈' }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="rejectModal.visible" id="modal-class-reject" class="modal active" @click.self="closeRejectModal">
      <div class="modal-content modal-content--narrow">
        <div class="modal-header modal-header--reject">
          <span class="modal-title"><i class="mdi mdi-alert-circle" /> 课程审核驳回</span>
          <button class="modal-close" @click="closeRejectModal">×</button>
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
            <div>审核人：课时审核员 Admin</div>
            <div>驳回时间：{{ rejectModal.record?.reviewedAt ? formatDate(rejectModal.record.reviewedAt) : '12/11/2025 10:30' }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeRejectModal">关闭</button>
          <button class="btn btn-primary" @click="openConfirmModalFromReject">重新提交</button>
        </div>
      </div>
    </div>

    <div v-if="showConfirmModal" id="modal-class-confirm" class="modal active" @click.self="closeConfirmModal">
      <div class="modal-content modal-content--confirm">
        <div class="modal-header modal-header--confirm">
          <span class="modal-title"><i class="mdi mdi-check-circle" /> 确认课程并填写反馈</span>
          <button class="modal-close" @click="closeConfirmModal">×</button>
        </div>
        <div class="modal-body">
          <div class="confirm-meta">
            <div>
              <span class="confirm-meta-label">学员</span>
              <div class="confirm-meta-value">{{ confirmRecord?.studentName || '张三' }} ({{ confirmRecord?.studentId || '12766' }})</div>
            </div>
            <div>
              <span class="confirm-meta-label">预约时间</span>
              <div class="confirm-meta-value">{{ confirmRecord?.classDate ? formatDate(confirmRecord.classDate) : '12/18/2025 14:00' }}</div>
            </div>
            <div>
              <span class="confirm-meta-label">公司/岗位</span>
              <div class="confirm-meta-value">{{ confirmRecord?.contentType || 'Goldman Sachs / IB' }}</div>
            </div>
          </div>

          <div class="form-grid confirm-grid">
            <div class="form-group">
              <label class="form-label">课程类型<span class="req">*</span></label>
              <select id="confirm-class-type" v-model="confirmClassType" class="form-select" @change="switchConfirmFeedbackForm(confirmClassType)">
                <option value="">请选择课程类型</option>
                <option value="mock_interview">模拟面试</option>
                <option value="mock_midterm">模拟期中考试</option>
                <option value="networking">人际关系期中考试</option>
                <option value="written_test">笔试辅导</option>
                <option value="resume_update">简历更新</option>
                <option value="basic">基础课程</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">实际上课日期<span class="req">*</span></label>
              <input id="confirm-class-date" v-model="confirmDate" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">实际上课时长（小时）<span class="req">*</span></label>
              <input id="confirm-class-duration" v-model.number="confirmDuration" type="number" class="form-input" step="0.5" min="0.5" />
            </div>
            <div class="form-group">
              <label class="form-label">学员表现<span class="req">*</span></label>
              <select id="confirm-student-performance" v-model="confirmPerformance" class="form-select">
                <option value="">请选择</option>
                <option>优秀</option>
                <option>良好</option>
                <option>一般</option>
                <option>需改进</option>
              </select>
            </div>
          </div>

          <hr class="confirm-divider" />

          <h4 class="confirm-feedback-title"><i class="mdi mdi-comment-text" /> 课程反馈</h4>

          <div v-if="!confirmClassType" id="feedback-default" class="confirm-feedback-default">
            <i class="mdi mdi-file-document-outline confirm-feedback-icon" />
            <p>请先选择课程类型，将显示对应的反馈表单</p>
          </div>

          <div v-else-if="confirmFeedbackView === 'mock'" id="feedback-mock" class="confirm-feedback-panel">
            <div class="confirm-feedback-banner confirm-feedback-banner--mock">入职面试辅导反馈</div>
            <div class="form-group">
              <label class="form-label">面试公司/岗位<span class="req">*</span></label>
              <input id="confirm-company-position" v-model="confirmCompanyOrPosition" class="form-input" placeholder="如：Goldman Sachs / IB Analyst">
            </div>
            <div class="form-group">
              <label class="form-label">辅导内容<span class="req">*</span></label>
              <textarea id="confirm-feedback" v-model="confirmFeedback" class="form-textarea" rows="3" placeholder="请描述本次辅导的主要内容"></textarea>
            </div>
          </div>

          <div v-else-if="confirmFeedbackView === 'regular'" id="feedback-regular" class="confirm-feedback-panel">
            <div class="confirm-feedback-banner confirm-feedback-banner--regular">笔试辅导反馈</div>
            <div class="form-group">
              <label class="form-label">笔试公司/岗位<span class="req">*</span></label>
              <input id="confirm-company-position" v-model="confirmCompanyOrPosition" class="form-input" placeholder="如：McKinsey / Business Analyst">
            </div>
            <div class="form-group">
              <label class="form-label">辅导内容<span class="req">*</span></label>
              <textarea id="confirm-feedback" v-model="confirmFeedback" class="form-textarea" rows="3" placeholder="请描述本次辅导的主要内容"></textarea>
            </div>
          </div>

          <div v-else-if="confirmFeedbackView === 'networking'" id="feedback-networking" class="confirm-feedback-panel">
            <div class="confirm-feedback-banner confirm-feedback-banner--networking">人脉拓展反馈模板</div>
            <div class="form-group">
              <label class="form-label">拓展情况<span class="req">*</span></label>
              <textarea id="confirm-feedback" v-model="confirmFeedback" class="form-textarea" rows="3" placeholder="请描述本次人脉拓展的情况"></textarea>
            </div>
          </div>

          <div v-else id="feedback-resume" class="confirm-feedback-panel">
            <div class="confirm-feedback-banner confirm-feedback-banner--resume">简历修改反馈模板</div>
            <div class="form-group">
              <label class="form-label">修改要点<span class="req">*</span></label>
              <textarea id="confirm-feedback" v-model="confirmFeedback" class="form-textarea" rows="3" placeholder="请描述本次简历修改的主要内容"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer modal-footer--confirm">
          <button class="btn btn-outline" @click="closeConfirmModal">取消</button>
          <button class="btn btn-primary" :disabled="!confirmCanSubmit || confirmSubmitting" @click="submitConfirm">
            {{ confirmSubmitting ? '提交中...' : '确认并提交反馈' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { http } from '@osg/shared/utils/request'
import ReportModal from './components/ReportModal.vue'

const activeTab = ref('all')
const showReportModal = ref(false)
const showConfirmModal = ref(false)
const records = ref<any[]>([])
const summaryRecords = ref<any[]>([])
const detailModal = ref<{ visible: boolean; record: any | null }>({ visible: false, record: null })
const rejectModal = ref<{ visible: boolean; reason: string; record: any | null }>({ visible: false, reason: '', record: null })
const confirmRecord = ref<any | null>(null)
const filters = ref({ keyword: '', coachingType: '', contentType: '', timeRange: '' })
const fullListParams = { pageNum: 1, pageSize: 1000 }
const contentTypes = ['新简历', '简历更新', 'Case准备', '模拟面试', '人际关系期中考试', '模拟期中考试', 'Behavioral', 'Technical', '其他']
const confirmClassType = ref('')
const confirmDate = ref('')
const confirmDuration = ref(1.5)
const confirmPerformance = ref('')
const confirmCompanyOrPosition = ref('')
const confirmFeedback = ref('')
const confirmScore = ref('')
const confirmProgress = ref('')
const confirmSubmitting = ref(false)
const confirmFeedbackView = computed(() => {
  if (!confirmClassType.value) {
    return 'default'
  }
  if (confirmClassType.value === 'mock_interview') {
    return 'mock'
  }
  if (confirmClassType.value === 'networking') {
    return 'networking'
  }
  if (confirmClassType.value === 'resume_update') {
    return 'resume'
  }
  return 'regular'
})
const confirmCanSubmit = computed(() => {
  if (!confirmClassType.value || !confirmDate.value || Number(confirmDuration.value) <= 0 || !confirmPerformance.value) {
    return false
  }
  if (confirmFeedbackView.value === 'mock' || confirmFeedbackView.value === 'regular') {
    return Boolean(confirmCompanyOrPosition.value && confirmFeedback.value)
  }
  if (confirmFeedbackView.value === 'networking') {
    return Boolean(confirmFeedback.value)
  }
  return Boolean(confirmFeedback.value)
})

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

function resetFilters() {
  filters.value = { keyword: '', coachingType: '', contentType: '', timeRange: '' }
  activeTab.value = 'all'
  records.value = summaryRecords.value
}
function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '' }
function coachingLabel(t: string) { return { job_coaching: '岗位辅导', mock_interview: '模拟应聘', networking: '人际关系', mock_midterm: '模拟期中', basic: '基础课程', basic_course: '基础课程' }[t] || t }
function coachingTagClass(t: string) { return { job_coaching: 'info', mock_interview: 'success', networking: 'purple', mock_midterm: 'warning' }[t] || 'info' }
function contentLabel(t: string) {
  const normalized = String(t ?? '').trim().replace(/-/g, '_').toLowerCase()
  return {
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
function contentTagClass(t: string) {
  return {
    '模拟面试': 'success',
    '模拟期中考试': 'warning',
    '人际关系期中考试': 'purple',
    '简历更新': 'info',
    'Case准备': 'info',
    '笔试辅导': 'warning',
    '基础课程': 'info',
  }[t] || 'info'
}
function statusClass(s: string) { return { pending: 'warning', approved: 'success', rejected: 'danger' }[s] || '' }
function statusLabel(s: string) { return { pending: '待审核', approved: '已通过', rejected: '已驳回' }[s] || s }
function evaluationTag(record: Record<string, any>) {
  if (record.studentEvaluation !== '' && record.studentEvaluation != null) {
    return { text: `⭐ ${record.studentEvaluation}`, className: 'success' }
  }
  if (record.reviewStatus === 'approved') {
    return { text: '待评价', className: 'warning' }
  }
  return null
}

function normalizeCourseRecord(record: Record<string, any>) {
  const durationHours = Number(record.durationHours ?? 0)
  const rate = Number(record.rate ?? record.hourlyRate ?? 0)
  const recordId = record.recordId ?? record.id
  const rawContentType = record.contentType ?? record.classStatus ?? record.courseType ?? record.courseSource ?? ''
  return {
    ...record,
    id: recordId,
    recordId,
    recordNo: record.recordNo ?? record.classId ?? (recordId ? `CR-${recordId}` : '-'),
    coachingType: record.coachingType ?? record.courseType ?? '',
    contentType: contentLabel(rawContentType),
    contentDetail: record.contentDetail ?? record.feedbackContent ?? record.comments ?? record.topics ?? record.reviewRemark ?? '',
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

function openConfirmModalFromReject() {
  confirmRecord.value = rejectModal.value.record
  showConfirmModal.value = true
  resetConfirmForm()
  closeRejectModal()
}

function closeConfirmModal() {
  showConfirmModal.value = false
  confirmRecord.value = null
  resetConfirmForm()
}

function switchConfirmFeedbackForm(value: string) {
  confirmClassType.value = value
  confirmCompanyOrPosition.value = ''
  confirmFeedback.value = ''
  confirmScore.value = ''
  confirmProgress.value = ''
}

function resetConfirmForm() {
  confirmClassType.value = ''
  confirmDate.value = confirmRecord.value?.classDate ? String(confirmRecord.value.classDate).slice(0, 10) : new Date().toISOString().slice(0, 10)
  confirmDuration.value = Number(confirmRecord.value?.durationHours ?? 1.5)
  confirmPerformance.value = ''
  confirmCompanyOrPosition.value = ''
  confirmFeedback.value = ''
  confirmScore.value = ''
  confirmProgress.value = ''
  confirmSubmitting.value = false
}

function mapConfirmClassStatus(value: string) {
  return {
    mock_interview: 'mock_interview',
    mock_midterm: 'mock_midterm',
    networking: 'networking_midterm',
    written_test: 'written_test',
    resume_update: 'resume_update',
    basic: 'basic',
  }[value] || value
}

async function submitConfirm() {
  if (!confirmRecord.value) {
    return
  }

  confirmSubmitting.value = true
  try {
    const duration = Number(confirmDuration.value)
    const rate = Number(confirmRecord.value.rate ?? 600) || 600
    const classStatus = mapConfirmClassStatus(confirmClassType.value)
    await http.post('/api/mentor/class-records', {
      studentId: confirmRecord.value.studentId,
      studentName: confirmRecord.value.studentName,
      classDate: confirmDate.value,
      durationHours: duration,
      weeklyHours: duration,
      courseType: confirmClassType.value,
      courseSource: 'mentor',
      classStatus,
      feedback: confirmFeedback.value,
      feedbackContent: confirmFeedback.value,
      companyOrPosition: confirmCompanyOrPosition.value,
      score: confirmScore.value,
      progress: confirmProgress.value,
      rate: String(rate),
      totalFee: duration * rate,
    })
    window.alert('提交成功！\n\n课程已确认，反馈已提交。')
    closeConfirmModal()
    await fetchSummaryRecords()
    await fetchRecords()
  } finally {
    confirmSubmitting.value = false
  }
}

async function showDetail(record: any) {
  const recordId = record.recordId ?? record.id
  let detailRecord = record
  if (recordId != null) {
    try {
      detailRecord = normalizeCourseRecord(await http.get(`/api/mentor/class-records/${recordId}`))
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
    const res = await http.get('/api/mentor/class-records/list', {
      params: { status: activeTab.value }
    })
    records.value = (res.rows || []).map((record: Record<string, any>) => normalizeCourseRecord(record))
  } catch { records.value = [] }
}

async function fetchSummaryRecords() {
  try {
    const res = await http.get('/api/mentor/class-records/list', {
      params: fullListParams
    })
    summaryRecords.value = (res.rows || []).map((record: Record<string, any>) => normalizeCourseRecord(record))
  } catch {
    summaryRecords.value = []
  }
}

async function onReportSubmitted() {
  showReportModal.value = false
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
.page-header { margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-start; }
.page-title { font-size:26px; font-weight:700; color:#1E293B; }
.page-title-en { font-size:14px; color:#94A3B8; font-weight:400; margin-left:8px; }
.page-sub { font-size:14px; color:#64748B; margin-top:6px; }
.btn { padding:10px 20px; border-radius:10px; font-size:14px; font-weight:500; cursor:pointer; border:none; display:inline-flex; align-items:center; gap:6px; }
.btn-primary { background:linear-gradient(135deg,#7399C6,#9BB8D9); color:#fff; box-shadow:0 4px 12px rgba(115,153,198,0.3); }
.btn-outline { background:#fff; color:#64748B; border:1px solid #E2E8F0; }
.btn-text { background:transparent; color:#7399C6; padding:6px 12px; }
.btn-sm { padding:6px 12px; font-size:13px; }
.tabs { display:inline-flex; background:#F8FAFC; border-radius:12px; padding:4px; margin-bottom:20px; }
.tab { padding:10px 20px; border:none; background:transparent; font-size:14px; color:#64748B; cursor:pointer; border-radius:10px; font-weight:500; }
.tab.active { background:#fff; color:#7399C6; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
.card { background:#fff; border-radius:16px; box-shadow:0 4px 24px rgba(115,153,198,0.12); margin-bottom:20px; }
.card-body { padding:22px; }
.filter-bar { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
.form-input { padding:12px 14px; border:2px solid #E2E8F0; border-radius:10px; font-size:14px; outline:none; box-sizing:border-box; }
.form-input:focus { border-color:#7399C6; box-shadow:0 0 0 4px #E8F0F8; }
.form-select { padding:10px 36px 10px 12px; border:2px solid #E2E8F0; border-radius:10px; font-size:14px; background:#fff; appearance:none; cursor:pointer; }
.filter-select { width:auto; min-width:max-content; }
.table { width:100%; border-collapse:collapse; }
.table th,.table td { padding:14px 16px; text-align:left; border-bottom:1px solid #E2E8F0; font-size:14px; }
.table th { font-weight:600; color:#64748B; font-size:12px; text-transform:uppercase; background:#F8FAFC; }
.table tbody tr:hover { background:#F8FAFC; }
.tag { display:inline-flex; padding:5px 12px; border-radius:20px; font-size:12px; font-weight:600; }
.tag.success { background:#D1FAE5; color:#065F46; }
.tag.warning { background:#FEF3C7; color:#92400E; }
.tag.danger { background:#FEE2E2; color:#991B1B; }
.tag.info { background:#DBEAFE; color:#1E40AF; }
.tag.purple { background:#E8F0F8; color:#5A7BA3; }
.text-muted { color:#94A3B8; }
.text-sm { font-size:12px; }
.modal { position:fixed; inset:0; background:rgba(15,23,42,0.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
.modal-content { width:min(720px, 100%); background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 24px 64px rgba(15,23,42,0.2); }
.modal-content--narrow { width:min(520px, 100%); }
.modal-content--confirm { width:min(750px, 100%); }
.modal-header { padding:20px 24px; background:linear-gradient(135deg,#7399C6,#5A7BA3); color:#fff; display:flex; align-items:center; justify-content:space-between; }
.modal-header--reject { background:#FEE2E2; color:#DC2626; }
.modal-header--confirm { background:linear-gradient(135deg,#7399C6,#5A7BA3); color:#fff; }
.modal-title { display:inline-flex; align-items:center; gap:8px; font-size:18px; font-weight:700; }
.modal-close { width:36px; height:36px; border:none; border-radius:10px; background:rgba(255,255,255,0.16); color:#fff; font-size:20px; cursor:pointer; }
.modal-footer--confirm { background:#F8FAFC; }
.modal-body { padding:24px; }
.reject-summary { background:#FEF2F2; border-radius:12px; padding:16px; margin-bottom:20px; }
.reject-summary-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px; }
.reject-summary-label, .confirm-meta-label { display:block; color:#94A3B8; font-size:12px; }
.reject-summary-value, .confirm-meta-value { font-weight:600; margin-top:4px; color:#1E293B; }
.reject-reason { margin-bottom:16px; }
.reject-reason-title, .confirm-feedback-title { font-size:14px; font-weight:600; margin-bottom:12px; color:#DC2626; display:flex; align-items:center; gap:6px; }
.reject-meta { color:#94A3B8; font-size:13px; margin-top:16px; display:grid; gap:6px; }
.confirm-meta { background:#E8F0F8; border-radius:12px; padding:16px; margin-bottom:20px; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px; }
.confirm-divider { margin:20px 0; border:none; border-top:1px solid #E2E8F0; }
.confirm-feedback-default { text-align:center; padding:32px; color:#94A3B8; background:#FAFAFA; border-radius:12px; border:1px dashed #E2E8F0; }
.confirm-feedback-icon { font-size:48px; opacity:0.5; }
.confirm-feedback-banner { padding:12px; border-radius:8px; margin-bottom:16px; font-size:14px; }
.confirm-feedback-banner--mock { background:#F3E8FF; color:#7C3AED; }
.confirm-feedback-banner--regular { background:#FFF7ED; color:#EA580C; }
.confirm-feedback-banner--networking { background:#ECFDF5; color:#059669; }
.confirm-feedback-banner--resume { background:#EFF6FF; color:#1D4ED8; }
.detail-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:16px; }
.detail-item { background:#F8FAFC; border-radius:12px; padding:16px; }
.detail-label { display:block; font-size:12px; font-weight:600; color:#64748B; margin-bottom:6px; }
.detail-value { font-size:14px; color:#1E293B; line-height:1.6; }
.detail-section { margin-top:20px; }
.detail-panel { background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:16px; color:#334155; line-height:1.7; white-space:pre-wrap; }
.detail-panel--danger { background:#FEF2F2; border-color:#FECACA; color:#991B1B; }
</style>
