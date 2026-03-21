<template>
  <div class="modal active" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title"><i class="mdi mdi-clipboard-text" /> 上报课程记录</span>
        <button class="modal-close" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div class="info-banner"><i class="mdi mdi-information" /> 请在上课后填写课程记录和反馈，提交后需等待后台审核</div>

        <!-- Step 1: 选择学员 -->
        <div class="form-group">
          <label class="form-label"><i class="mdi mdi-numeric-1-circle step-icon" /> 选择学员 <span class="req">*</span></label>
          <select v-model="form.studentId" class="form-select full" @change="onStudentSelect">
            <option value="">请选择学员</option>
            <option v-for="s in students" :key="s.userId" :value="s.userId">{{ s.nickName }} ({{ s.userId }})</option>
          </select>
        </div>

        <!-- Step 2: 日期时长 -->
        <div v-if="form.studentId" class="form-group">
          <label class="form-label"><i class="mdi mdi-numeric-2-circle step-icon" /> 上课日期和时长</label>
          <div class="form-grid">
            <div><label class="form-label">上课日期 <span class="req">*</span></label><input v-model="form.classDate" type="date" class="form-input" /></div>
            <div><label class="form-label">学习时长 <span class="req">*</span></label>
              <div style="display:flex;align-items:center;gap:8px"><input v-model.number="form.durationHours" type="number" class="form-input" min="0.5" max="8" step="0.5" style="width:100px" /><span class="text-muted">小时</span></div>
            </div>
          </div>
        </div>

        <!-- Step 3: 学员状态 -->
        <div v-if="form.studentId" class="form-group" style="margin-top:16px">
          <label class="form-label"><i class="mdi mdi-numeric-3-circle step-icon" /> 学员状态 <span class="req">*</span></label>
          <div class="status-group">
            <label class="status-option" :class="{ active: form.studentStatus === 'normal', green: form.studentStatus === 'normal' }" @click="form.studentStatus = 'normal'">
              <input type="radio" v-model="form.studentStatus" value="normal" />
              <div><div class="status-label"><i class="mdi mdi-check-circle" /> 正常上课</div><div class="status-desc">学员按时参加课程</div></div>
            </label>
            <label class="status-option" :class="{ active: form.studentStatus === 'no_show', red: form.studentStatus === 'no_show' }" @click="form.studentStatus = 'no_show'">
              <input type="radio" v-model="form.studentStatus" value="no_show" />
              <div><div class="status-label" style="color:#991B1B"><i class="mdi mdi-account-off" /> 旷课未到场</div><div class="status-desc">学员未参加课程</div></div>
            </label>
          </div>
          <div v-if="form.studentStatus === 'no_show'" class="noshow-note">
            <label class="form-label" style="color:#991B1B"><i class="mdi mdi-note-text" /> 旷课备注</label>
            <textarea v-model="form.noShowNote" class="form-textarea" rows="2" placeholder="请简要说明旷课情况（可选）..." />
          </div>
        </div>

        <!-- Step 4: 课程类型 -->
        <div v-if="form.studentId && form.studentStatus === 'normal'" class="form-group" style="margin-top:16px">
          <label class="form-label"><i class="mdi mdi-numeric-4-circle step-icon" /> 课程类型 <span class="req">*</span></label>
          <div class="type-options">
            <label v-for="ct in courseTypes" :key="ct.value" class="type-option" :class="{ active: form.coachingType === ct.value }">
              <input type="radio" v-model="form.coachingType" :value="ct.value" />
              <span class="tag" :style="{ background: ct.color, color: '#fff' }">{{ ct.label }}</span>
              <span class="type-desc">{{ ct.desc }}</span>
            </label>
          </div>
        </div>

        <!-- 课程反馈 -->
        <div v-if="form.coachingType && form.studentStatus === 'normal'" class="form-group" style="margin-top:16px">
          <label class="form-label">课程反馈 <span class="req">*</span></label>
          <textarea v-model="form.feedback" class="form-textarea" rows="3" placeholder="请输入课程反馈..." />
        </div>

        <!-- 课时费 -->
        <div v-if="form.durationHours > 0" class="fee-display">
          课时费: <strong>¥{{ computedFee }}</strong> ({{ form.durationHours }}h × ¥{{ hourlyRate }}/h)
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" :disabled="!canSubmit || submitting" @click="handleSubmit">
          <i class="mdi mdi-check" /> {{ submitting ? '提交中...' : '提交' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
})

const courseTypes = [
  { value: 'job_coaching', label: '岗位辅导', color: '#3B82F6', desc: '岗位辅导的课程' },
  { value: 'mock_interview', label: '模拟面试', color: '#22C55E', desc: '模拟面试的课程' },
  { value: 'networking', label: '人际关系', color: '#8B5CF6', desc: '人际关系的课程' },
  { value: 'mock_midterm', label: '模拟期中', color: '#F59E0B', desc: '模拟期中考试' },
  { value: 'basic', label: '基础课程', color: '#6366F1', desc: '基础课程' },
]

const computedFee = computed(() => (form.value.durationHours * hourlyRate.value).toFixed(0))
const canSubmit = computed(() => form.value.studentId && form.value.classDate && form.value.durationHours > 0 &&
  (form.value.studentStatus === 'no_show' || (form.value.coachingType && form.value.feedback)))
const selectedStudent = computed(() => students.value.find((student) => String(student.userId) === String(form.value.studentId)) || null)

function onStudentSelect() { /* load student positions if needed */ }

async function handleSubmit() {
  submitting.value = true
  try {
    await http.post('/api/mentor/class-records', {
      ...form.value,
      studentName: selectedStudent.value?.nickName || '',
      courseType: form.value.coachingType,
      courseSource: 'mentor',
      weeklyHours: form.value.durationHours,
      classStatus: form.value.studentStatus === 'no_show' ? 'no_show' : 'normal',
      feedbackContent: form.value.feedback,
      hourlyRate: hourlyRate.value,
      rate: String(hourlyRate.value),
      totalFee: form.value.durationHours * hourlyRate.value,
      contentType: form.value.coachingType
    })
    emit('submitted')
  } catch { /* error handled by interceptor */ }
  finally { submitting.value = false }
}

onMounted(async () => {
  try { const res = await http.get('/api/mentor/students/list'); students.value = res.rows || res || [] }
  catch { students.value = [] }
})
</script>

<style scoped>
.modal { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
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
.fee-display { padding:16px; background:#F0FDF4; border-radius:10px; font-size:14px; color:#166534; margin-top:16px; }
.fee-display strong { font-size:18px; }
.btn { padding:10px 20px; border-radius:10px; font-size:14px; font-weight:500; cursor:pointer; border:none; display:inline-flex; align-items:center; gap:6px; }
.btn-primary { background:linear-gradient(135deg,#7399C6,#9BB8D9); color:#fff; }
.btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
.btn-outline { background:#fff; color:#64748B; border:1px solid #E2E8F0; }
.text-muted { color:#94A3B8; }
</style>
