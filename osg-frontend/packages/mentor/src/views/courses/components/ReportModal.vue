<template>
  <div id="modal-mentor-report" class="modal active" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title"><i class="mdi mdi-clipboard-text" /> 上报课程记录</span>
        <button class="modal-close" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div class="info-banner">
          <i class="mdi mdi-information" />
          请在上课后填写课程记录和反馈，提交后需等待后台审核
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-numeric-1-circle step-icon" /> 选择学员 <span class="req">*</span>
          </label>
          <select id="report-student" v-model="form.studentId" class="form-select full" @change="onStudentSelect">
            <option value="">请选择学员</option>
            <option v-for="s in students" :key="s.userId" :value="String(s.userId)">
              {{ s.nickName }} ({{ s.userId }})
            </option>
          </select>
        </div>

        <div v-if="form.studentId" id="mentor-class-datetime" class="form-group">
          <label class="form-label">
            <i class="mdi mdi-numeric-2-circle step-icon" /> 上课日期和时长
          </label>
          <div class="form-grid">
            <div>
              <label class="form-label">上课日期 <span class="req">*</span></label>
              <input v-model="form.classDate" type="date" class="form-input" />
            </div>
            <div>
              <label class="form-label">学习时长 <span class="req">*</span></label>
              <div style="display:flex;align-items:center;gap:8px">
                <input v-model.number="form.durationHours" type="number" class="form-input" min="0.5" max="8" step="0.5" style="width:100px" />
                <span class="text-muted">小时</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="form.studentId" id="mentor-student-status" class="form-group" style="margin-top:16px">
          <label class="form-label">
            <i class="mdi mdi-numeric-3-circle step-icon" /> 学员状态 <span class="req">*</span>
          </label>
          <div class="status-group">
            <label class="status-option" :class="{ active: form.studentStatus === 'normal', green: form.studentStatus === 'normal' }">
              <input v-model="form.studentStatus" type="radio" name="mentor-student-status" value="normal" @change="onStudentStatusChange('normal')" />
              <div>
                <div class="status-label"><i class="mdi mdi-check-circle" /> 正常上课</div>
                <div class="status-desc">学员按时参加课程</div>
              </div>
            </label>
            <label class="status-option" :class="{ active: form.studentStatus === 'no-show', red: form.studentStatus === 'no-show' }">
              <input v-model="form.studentStatus" type="radio" name="mentor-student-status" value="no-show" @change="onStudentStatusChange('no-show')" />
              <div>
                <div class="status-label" style="color:#991B1B"><i class="mdi mdi-account-off" /> 旷课未到场</div>
                <div class="status-desc">学员未参加课程</div>
              </div>
            </label>
          </div>
          <div v-if="form.studentStatus === 'no-show'" id="mentor-noshow-note" class="noshow-note">
            <label class="form-label" style="color:#991B1B"><i class="mdi mdi-note-text" /> 旷课备注</label>
            <textarea v-model="form.noShowNote" class="form-textarea" rows="2" placeholder="请简要说明旷课情况（可选）..." />
          </div>
        </div>

        <div v-if="form.studentId && form.studentStatus === 'normal'" id="mentor-course-type-section" class="form-group" style="margin-top:16px">
          <label class="form-label">
            <i class="mdi mdi-numeric-4-circle step-icon" /> 课程类型 <span class="req">*</span>
          </label>
          <div class="type-options">
            <label
              v-for="ct in courseTypes"
              :key="ct.value"
              class="type-option"
              :class="{ active: form.coachingType === ct.value }"
            >
              <input v-model="form.coachingType" type="radio" name="mentor-course-type" :value="ct.value" @change="onCourseTypeChange(ct.value)" />
              <span class="tag" :style="{ background: ct.color, color: '#fff' }">{{ ct.label }}</span>
              <span class="type-desc">{{ ct.desc }}</span>
            </label>
          </div>
        </div>

        <div v-if="form.studentId && form.studentStatus === 'normal' && form.coachingType === 'job-coaching'" id="mentor-job-select" class="form-group" style="margin-top:16px">
          <div class="job-card">
            <label class="form-label" style="color:#1E40AF"><i class="mdi mdi-briefcase" /> 选择申请辅导的岗位 <span class="req">*</span></label>
            <select v-model="form.jobPosition" class="form-select" style="margin-top:8px">
              <option value="">请选择岗位</option>
              <option value="gs-ib">Goldman Sachs · IB Analyst · Hong Kong</option>
              <option value="ms-ibd">Morgan Stanley · IBD Analyst · New York</option>
              <option value="mckinsey">McKinsey · Business Analyst · Shanghai</option>
            </select>
          </div>
        </div>

        <div v-if="form.studentId && form.studentStatus === 'normal' && form.coachingType === 'job-coaching'" id="mentor-job-content-type" class="form-group" style="margin-top:16px">
          <label class="form-label"><i class="mdi mdi-format-list-bulleted" /> 课程内容类型 <span class="req">*</span></label>
          <select id="mentor-job-content-select" v-model="form.contentType" class="form-select" style="margin-top:8px" @change="onContentTypeChange(form.contentType)">
            <option value="">请选择课程内容类型</option>
            <option value="technical">技术的</option>
            <option value="behavioral">行为训练</option>
            <option value="new-resume">新简历制作</option>
            <option value="resume-update">简历更新</option>
            <option value="mock-interview-content">模拟面试的课程</option>
            <option value="networking-content">人际关系的课程</option>
            <option value="mock-midterm-content">模拟期中考试</option>
            <option value="case-prep">咨询案例准备</option>
            <option value="other">其他</option>
          </select>
        </div>

        <div v-if="form.studentId && form.studentStatus === 'normal' && form.coachingType === 'basic'" id="mentor-basic-content-type" class="form-group" style="margin-top:16px">
          <label class="form-label"><i class="mdi mdi-format-list-bulleted" /> 基础课内容类型 <span class="req">*</span></label>
          <select id="mentor-basic-content-select" v-model="form.contentType" class="form-select" style="margin-top:8px" @change="onContentTypeChange(form.contentType)">
            <option value="">请选择基础课内容类型</option>
            <option value="technical">技术的</option>
            <option value="behavioral">行为训练</option>
            <option value="new-resume">新简历制作</option>
            <option value="resume-update">简历更新</option>
            <option value="case-prep">咨询案例准备</option>
            <option value="other">其他</option>
          </select>
        </div>

        <div v-if="showGeneralFeedback" id="feedback-general" class="feedback-card">
          <div class="feedback-banner feedback-banner--general">
            <i class="mdi mdi-comment-text" /> 课程反馈
          </div>
          <div class="form-group">
            <label class="form-label">课程反馈 <span class="req">*</span></label>
            <textarea v-model="form.feedback" class="form-textarea" rows="4" placeholder="请详细描述本次课程内容和学员表现..." />
          </div>
        </div>

        <div v-if="showResumeFeedback" id="feedback-resume" class="feedback-card">
          <div class="feedback-banner feedback-banner--resume">📝 简历更新反馈</div>
          <div class="form-group">
            <label class="form-label">课程反馈 <span class="req">*</span></label>
            <textarea v-model="form.feedback" class="form-textarea" rows="3" placeholder="请描述简历修改的主要内容和建议..." />
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">上传原简历 <span class="req">*</span></label>
              <div class="upload-box">
                <input type="file" accept=".pdf,.doc,.docx" @change="handleResumeUpload($event, 'original')" />
                <div class="upload-hint">点击上传原简历</div>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">上传修改后简历 <span class="req">*</span></label>
              <div class="upload-box">
                <input type="file" accept=".pdf,.doc,.docx" @change="handleResumeUpload($event, 'updated')" />
                <div class="upload-hint">点击上传修改后简历</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="showMockInterviewFeedback" id="feedback-mock-interview" class="feedback-card">
          <div class="feedback-banner feedback-banner--mock">🎯 模拟面试反馈</div>
          <div class="form-group">
            <label class="form-label">面试公司/岗位 <span class="req">*</span></label>
            <input v-model="form.companyOrPosition" class="form-input" placeholder="如：Goldman Sachs / IB Analyst" />
          </div>
          <div class="form-group">
            <label class="form-label">课程反馈 <span class="req">*</span></label>
            <textarea v-model="form.feedback" class="form-textarea" rows="4" placeholder="请描述本次辅导的主要内容" />
          </div>
        </div>

        <div v-if="showNetworkingFeedback" id="feedback-networking" class="feedback-card">
          <div class="feedback-banner feedback-banner--networking">🤝 人脉拓展反馈模板</div>
          <div class="form-group">
            <label class="form-label">拓展情况 <span class="req">*</span></label>
            <textarea v-model="form.feedback" class="form-textarea" rows="4" placeholder="请描述本次人脉拓展的情况" />
          </div>
        </div>

        <div v-if="showMidtermFeedback" id="feedback-midterm" class="feedback-card">
          <div class="feedback-banner feedback-banner--midterm">📚 模拟期中考试反馈</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">该学生在这项诊断测试中得了多少分？ <span class="req">*</span></label>
              <input v-model="form.score" type="number" class="form-input" min="0" max="100" placeholder="0" />
            </div>
            <div class="form-group">
              <label class="form-label">学生进度评估 <span class="req">*</span></label>
              <select v-model="form.progress" class="form-select">
                <option value="">请选择</option>
                <option value="awesome">非常棒 - 进展顺利，会取得好成绩</option>
                <option value="great">太好了 - 进展顺利</option>
                <option value="ok">好的 - 需要在一些方面下功夫</option>
                <option value="disappointing">令人失望 - 严重落后</option>
                <option value="na">不适用 - 入学时间太短</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">课程反馈 <span class="req">*</span></label>
            <textarea v-model="form.feedback" class="form-textarea" rows="4" placeholder="请详细描述学员在模拟期中考试中的表现..." />
          </div>
        </div>

        <div v-if="form.studentId && form.studentStatus === 'normal' && form.coachingType === 'job-coaching' && !form.contentType" class="feedback-card">
          <div class="feedback-banner feedback-banner--general">
            <i class="mdi mdi-file-document-outline" /> 请先选择课程内容类型，将显示对应的反馈表单
          </div>
          <div class="form-group">
            <label class="form-label">课程反馈 <span class="req">*</span></label>
            <textarea v-model="form.feedback" class="form-textarea" rows="4" placeholder="请详细描述本次课程内容和学员表现..." />
          </div>
        </div>

        <div v-if="form.durationHours > 0" class="fee-display">
          课时费: <strong>¥{{ computedFee }}</strong> ({{ form.durationHours }}h × ¥{{ hourlyRate }}/h)
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" :disabled="!canSubmit || submitting" @click="handleSubmit">
          <i class="mdi mdi-check" /> {{ submitting ? '提交中...' : '提交记录' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { http } from '@osg/shared/utils/request'

const emit = defineEmits<{ close: []; submitted: [] }>()

const students = ref<any[]>([])
const hourlyRate = ref(600)
const submitting = ref(false)

const form = ref({
  studentId: '',
  classDate: '',
  durationHours: 1,
  studentStatus: 'normal',
  noShowNote: '',
  coachingType: '',
  contentType: '',
  feedback: '',
  companyOrPosition: '',
  score: '',
  progress: '',
  originalResumeName: '',
  updatedResumeName: '',
  jobPosition: '',
})

const courseTypes = [
  { value: 'job-coaching', label: '岗位辅导', color: '#3B82F6', desc: '岗位辅导的课程' },
  { value: 'mock-interview', label: '模拟面试', color: '#22C55E', desc: '模拟面试的课程' },
  { value: 'networking', label: '人际关系', color: '#8B5CF6', desc: '人际关系的课程' },
  { value: 'mock-midterm', label: '模拟期中', color: '#F59E0B', desc: '模拟期中考试' },
  { value: 'basic', label: '基础课程', color: '#6366F1', desc: '基础课程' },
]

const computedFee = computed(() => (form.value.durationHours * hourlyRate.value).toFixed(0))
const selectedStudent = computed(() => students.value.find((student) => String(student.userId) === String(form.value.studentId)) || null)
const canSubmit = computed(() => {
  if (!form.value.studentId || !form.value.classDate || Number(form.value.durationHours) <= 0) {
    return false
  }

  if (form.value.studentStatus === 'no-show') {
    return true
  }

  if (!form.value.coachingType) {
    return false
  }

  if (form.value.coachingType === 'job-coaching') {
    if (!form.value.jobPosition || !form.value.contentType) {
      return false
    }
    if (form.value.contentType === 'resume-update') {
      return Boolean(form.value.feedback && form.value.originalResumeName && form.value.updatedResumeName)
    }
    if (form.value.contentType === 'mock-interview-content') {
      return Boolean(form.value.feedback && form.value.companyOrPosition)
    }
    if (form.value.contentType === 'networking-content') {
      return Boolean(form.value.feedback)
    }
    if (form.value.contentType === 'mock-midterm-content') {
      return Boolean(form.value.feedback && form.value.score && form.value.progress)
    }
    return Boolean(form.value.feedback)
  }

  if (form.value.coachingType === 'mock-interview') {
    return Boolean(form.value.feedback && form.value.companyOrPosition)
  }

  if (form.value.coachingType === 'networking') {
    return Boolean(form.value.feedback)
  }

  if (form.value.coachingType === 'mock-midterm') {
    return Boolean(form.value.feedback && form.value.score && form.value.progress)
  }

  if (form.value.coachingType === 'basic') {
    if (!form.value.contentType) {
      return false
    }
    if (form.value.contentType === 'resume-update') {
      return Boolean(form.value.feedback && form.value.originalResumeName && form.value.updatedResumeName)
    }
    return Boolean(form.value.feedback)
  }

  return Boolean(form.value.feedback)
})

const showGeneralFeedback = computed(() => {
  if (!form.value.studentId || form.value.studentStatus !== 'normal') {
    return false
  }
  if (!form.value.coachingType) {
    return true
  }
  return form.value.coachingType === 'job-coaching' && (!form.value.contentType || form.value.contentType === 'other')
})

const showResumeFeedback = computed(() => form.value.studentId && form.value.studentStatus === 'normal' && form.value.coachingType === 'job-coaching' && form.value.contentType === 'resume-update')
const showMockInterviewFeedback = computed(() => form.value.studentId && form.value.studentStatus === 'normal' && (form.value.coachingType === 'mock-interview' || form.value.contentType === 'mock-interview-content'))
const showNetworkingFeedback = computed(() => form.value.studentId && form.value.studentStatus === 'normal' && (form.value.coachingType === 'networking' || form.value.contentType === 'networking-content'))
const showMidtermFeedback = computed(() => form.value.studentId && form.value.studentStatus === 'normal' && (form.value.coachingType === 'mock-midterm' || form.value.contentType === 'mock-midterm-content'))

function onStudentSelect() {
  form.value.studentStatus = 'normal'
  form.value.coachingType = ''
  form.value.contentType = ''
  form.value.feedback = ''
  form.value.companyOrPosition = ''
  form.value.score = ''
  form.value.progress = ''
  form.value.noShowNote = ''
  form.value.jobPosition = ''
  form.value.originalResumeName = ''
  form.value.updatedResumeName = ''
}

function onStudentStatusChange(status: string) {
  if (status === 'no-show') {
    form.value.coachingType = ''
    form.value.contentType = ''
    form.value.feedback = ''
    form.value.companyOrPosition = ''
    form.value.score = ''
    form.value.progress = ''
    form.value.jobPosition = ''
    form.value.originalResumeName = ''
    form.value.updatedResumeName = ''
  }
}

function onCourseTypeChange(value: string) {
  form.value.coachingType = value
  if (value !== 'job-coaching') {
    form.value.jobPosition = ''
  }
  if (value !== 'job-coaching') {
    form.value.contentType = ''
  }
  if (value === 'mock-interview' || value === 'networking' || value === 'mock-midterm' || value === 'basic') {
    form.value.feedback = ''
  }
}

function onContentTypeChange(value: string) {
  form.value.contentType = value
  if (value !== 'resume-update') {
    form.value.originalResumeName = ''
    form.value.updatedResumeName = ''
  }
}

function handleResumeUpload(event: Event, kind: 'original' | 'updated') {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) {
    return
  }
  if (kind === 'original') {
    form.value.originalResumeName = file.name
  } else {
    form.value.updatedResumeName = file.name
  }
}

function mapCourseTypeForBackend(value: string) {
  return {
    'job-coaching': 'job_coaching',
    'mock-interview': 'mock_interview',
    networking: 'networking',
    'mock-midterm': 'mock_midterm',
    basic: 'basic',
  }[value] || value.replace(/-/g, '_')
}

function mapContentTypeForBackend(value: string) {
  return {
    'new-resume': 'resume_revision',
    'resume-update': 'resume_update',
    'mock-interview-content': 'mock_interview',
    'networking-content': 'networking_midterm',
    'mock-midterm-content': 'mock_midterm',
    'case-prep': 'case_prep',
    technical: 'technical',
    behavioral: 'behavioral',
    other: 'other',
  }[value] || value.replace(/-/g, '_')
}

async function handleSubmit() {
  submitting.value = true
  try {
    const courseType = mapCourseTypeForBackend(form.value.coachingType)
    const contentType = mapContentTypeForBackend(form.value.contentType || form.value.coachingType)
    await http.post('/api/mentor/class-records', {
      studentId: Number(form.value.studentId),
      studentName: selectedStudent.value?.nickName || '',
      classDate: form.value.classDate,
      durationHours: form.value.durationHours,
      weeklyHours: form.value.durationHours,
      studentStatus: form.value.studentStatus === 'no-show' ? 'no_show' : 'normal',
      noShowNote: form.value.noShowNote,
      coachingType: courseType,
      contentType,
      courseType,
      courseSource: 'mentor',
      classStatus: contentType,
      feedback: form.value.feedback,
      feedbackContent: form.value.feedback,
      hourlyRate: hourlyRate.value,
      rate: String(hourlyRate.value),
      totalFee: form.value.durationHours * hourlyRate.value,
      companyOrPosition: form.value.companyOrPosition,
      score: form.value.score,
      progress: form.value.progress,
      jobPosition: form.value.jobPosition,
    })
    try {
      window.alert('课程记录已提交！\n\n等待后台审核后将同步到学员端。')
    } catch {
      // jsdom / browsers without alert hooks should not block submission
    }
    emit('submitted')
  } catch {
    // error handled by interceptor
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    const res = await http.get('/api/mentor/students/list')
    students.value = res.rows || res || []
  } catch {
    students.value = []
  }
})
</script>

<style scoped>
.modal { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
.modal-content { background:#fff; border-radius:20px; width:90%; max-width:800px; max-height:90vh; overflow-y:auto; }
.modal-header { padding:22px 26px; background:linear-gradient(135deg,#7399C6,#5A7BA3); color:#fff; border-radius:20px 20px 0 0; display:flex; justify-content:space-between; align-items:center; }
.modal-title { font-size:18px; font-weight:700; display:flex; align-items:center; gap:8px; }
.modal-close { width:36px; height:36px; border-radius:10px; border:none; background:rgba(255,255,255,0.2); cursor:pointer; font-size:20px; color:#fff; }
.modal-body { padding:26px; }
.modal-footer { padding:18px 26px; border-top:1px solid #E2E8F0; display:flex; justify-content:flex-end; gap:12px; }
.info-banner { background:#E8F0F8; border-radius:12px; padding:16px; margin-bottom:20px; font-size:13px; color:#7399C6; display:flex; align-items:center; gap:6px; }
.step-icon { color:#7399C6; margin-right:4px; }
.form-group { margin-bottom:16px; }
.form-label { display:block; font-size:13px; font-weight:600; margin-bottom:6px; color:#64748B; }
.req { color:#EF4444; margin-left:2px; }
.form-input,.form-select { width:100%; padding:12px 14px; border:2px solid #E2E8F0; border-radius:10px; font-size:14px; outline:none; box-sizing:border-box; }
.form-select.full { width:100%; }
.form-textarea { width:100%; padding:12px 14px; border:2px solid #E2E8F0; border-radius:10px; font-size:14px; min-height:80px; resize:vertical; outline:none; box-sizing:border-box; }
.form-input:focus,.form-select:focus,.form-textarea:focus { border-color:#7399C6; box-shadow:0 0 0 4px #E8F0F8; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.status-group { display:flex; gap:12px; margin-top:8px; }
.status-option { flex:1; display:flex; align-items:center; gap:10px; padding:14px 16px; border:2px solid #E2E8F0; border-radius:10px; cursor:pointer; }
.status-option.active.green { border-color:#22C55E; background:#F0FDF4; }
.status-option.active.red { border-color:#EF4444; background:#FEF2F2; }
.status-option input { width:18px; height:18px; }
.status-label { font-weight:600; color:#166534; display:flex; align-items:center; gap:4px; }
.status-desc { font-size:12px; color:#94A3B8; }
.noshow-note { background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:16px; margin-top:12px; }
.type-options { display:grid; gap:8px; margin-top:8px; }
.type-option { display:flex; align-items:center; gap:10px; padding:12px 14px; border:2px solid #E2E8F0; border-radius:8px; cursor:pointer; }
.type-option.active { border-color:#7399C6; background:#F8FAFC; }
.type-option input { width:16px; height:16px; }
.type-desc { font-size:13px; }
.tag { display:inline-flex; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600; }
.feedback-card { margin-top:16px; }
.feedback-banner { padding:12px; border-radius:8px; margin-bottom:16px; font-size:14px; }
.feedback-banner--general { background:#FAFAFA; color:#64748B; border:1px dashed #E2E8F0; }
.feedback-banner--resume { background:#EFF6FF; color:#1D4ED8; }
.feedback-banner--mock { background:#F3E8FF; color:#7C3AED; }
.feedback-banner--networking { background:#ECFDF5; color:#059669; }
.feedback-banner--midterm { background:#FFF7ED; color:#EA580C; }
.job-card { background:#EFF6FF; border:1px solid #BFDBFE; border-radius:10px; padding:16px; }
.upload-box { position:relative; border:2px dashed #E2E8F0; border-radius:10px; padding:20px; text-align:center; background:#FAFAFA; }
.upload-box input { width:100%; opacity:0; position:absolute; inset:0; cursor:pointer; }
.upload-hint { font-size:12px; color:#94A3B8; }
.fee-display { padding:16px; background:#F0FDF4; border-radius:10px; font-size:14px; color:#166534; margin-top:16px; }
.fee-display strong { font-size:18px; }
.btn { padding:10px 20px; border-radius:10px; font-size:14px; font-weight:500; cursor:pointer; border:none; display:inline-flex; align-items:center; gap:6px; }
.btn-primary { background:linear-gradient(135deg,#7399C6,#9BB8D9); color:#fff; }
.btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
.btn-outline { background:#fff; color:#64748B; border:1px solid #E2E8F0; }
.text-muted { color:#94A3B8; }
</style>
