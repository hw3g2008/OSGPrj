<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="review-student-position-modal"
    width="860px"
    :body-class="'student-review-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="student-review-modal__titlebar">
        <div class="student-review-modal__titlecopy">
          <div class="student-review-modal__title">
            <i class="mdi mdi-briefcase-plus-outline" aria-hidden="true"></i>
            <span>审核岗位</span>
          </div>
        </div>
      </div>
    </template>

    <section class="student-review-modal__hero">
      <div class="student-review-modal__avatar">{{ submitterInitials }}</div>
      <div class="student-review-modal__hero-copy">
        <strong>{{ position?.studentName || '未命名学生' }}</strong>
        <span>ID {{ position?.studentId || '--' }}</span>
        <span>{{ submittedLabel }}</span>
      </div>
      <div class="student-review-modal__hero-meta">
        <span :class="['student-review-modal__status', `student-review-modal__status--${statusTone}`]">{{ statusLabel }}</span>
        <span v-if="position?.hasCoachingRequest === 'yes'" class="student-review-modal__coaching">有辅导申请</span>
      </div>
    </section>

    <div class="student-review-modal__sections">
      <section class="student-review-modal__section-card">
        <header class="student-review-modal__section-head">
          <div class="student-review-modal__section-title">
            <i class="mdi mdi-briefcase-variant-outline" aria-hidden="true"></i>
            <span>基本信息</span>
          </div>
        </header>

        <div class="student-review-modal__grid">
          <label class="student-review-modal__field">
            <span>岗位分类 *</span>
            <select v-model="form.positionCategory" :disabled="!isPending">
              <option value="">请选择</option>
              <option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="student-review-modal__field">
            <span>岗位名称 *</span>
            <input v-model="form.positionName" type="text" placeholder="如 Summer Analyst" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field">
            <span>部门</span>
            <input v-model="form.department" type="text" placeholder="如 Investment Banking Division" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field">
            <span>项目时间 *</span>
            <input v-model="form.projectYear" type="text" placeholder="如 2026" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field student-review-modal__field--wide">
            <span>行业</span>
            <input v-model="form.industry" type="text" placeholder="如 Investment Bank" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field">
            <span>截止日期</span>
            <input v-model="form.deadline" type="datetime-local" :disabled="!isPending" />
          </label>
        </div>

        <div class="student-review-modal__chip-group">
          <span class="student-review-modal__chip-label">招聘周期 *</span>
          <button
            v-for="option in recruitmentCycleOptions"
            :key="option"
            type="button"
            :class="[
              'student-review-modal__cycle-chip',
              { 'student-review-modal__cycle-chip--active': selectedCycles.includes(option) }
            ]"
            :disabled="!isPending"
            @click="toggleCycle(option)"
          >
            {{ option }}
          </button>
        </div>
      </section>

      <section class="student-review-modal__section-card">
        <header class="student-review-modal__section-head">
          <div class="student-review-modal__section-title">
            <i class="mdi mdi-domain" aria-hidden="true"></i>
            <span>公司信息</span>
          </div>
        </header>

        <div class="student-review-modal__grid">
          <label class="student-review-modal__field">
            <span>公司名称 *</span>
            <input v-model="form.companyName" type="text" placeholder="公司名称" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field">
            <span>公司类别</span>
            <input v-model="form.companyType" type="text" placeholder="如 Consulting" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field">
            <span>大区 *</span>
            <select v-model="form.region" :disabled="!isPending">
              <option value="">请选择</option>
              <option v-for="option in regionOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="student-review-modal__field">
            <span>城市 *</span>
            <input v-model="form.city" type="text" placeholder="如 Singapore" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field">
            <span>公司官网</span>
            <input v-model="form.companyWebsite" type="url" placeholder="https://company.com" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field">
            <span>岗位链接</span>
            <input v-model="form.positionUrl" type="url" placeholder="https://company.com/jobs/..." :disabled="!isPending" />
          </label>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="student-review-modal__footer">
        <button type="button" class="student-review-modal__footer-button student-review-modal__footer-button--ghost" @click="handleClose">
          取消
        </button>
        <button v-if="isPending" type="button" class="student-review-modal__footer-button student-review-modal__footer-button--danger" @click="handleRejectRequest">
          拒绝
        </button>
        <button v-if="isPending" type="button" class="student-review-modal__footer-button student-review-modal__footer-button--primary" @click="handleSubmit">
          保存并通过
        </button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { ReviewStudentPositionPayload, StudentPositionListItem } from '@osg/shared/api/admin/studentPosition'

const props = defineProps<{
  visible: boolean
  position?: StudentPositionListItem | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: ReviewStudentPositionPayload]
  requestReject: []
}>()

const categoryOptions = [
  { value: 'summer', label: '暑期实习' },
  { value: 'fulltime', label: '全职招聘' },
  { value: 'offcycle', label: '非常规周期' },
  { value: 'spring', label: '春季实习' },
  { value: 'events', label: '招聘活动' }
]

const recruitmentCycleOptions = ['2024 Summer', '2025 Summer', '2026 Summer', '2025 Full-time', '2026 Full-time']

const regionOptions = [
  { value: 'na', label: '北美' },
  { value: 'eu', label: '欧洲' },
  { value: 'ap', label: '亚太' },
  { value: 'cn', label: '中国大陆' }
]

const form = reactive({
  positionCategory: '',
  industry: '',
  companyName: '',
  companyType: '',
  companyWebsite: '',
  positionName: '',
  department: '',
  region: '',
  city: '',
  recruitmentCycle: [] as string[],
  projectYear: '',
  deadline: '',
  positionUrl: ''
})

const resetForm = () => {
  form.positionCategory = props.position?.positionCategory || ''
  form.industry = props.position?.industry || ''
  form.companyName = props.position?.companyName || ''
  form.companyType = props.position?.companyType || ''
  form.companyWebsite = props.position?.companyWebsite || ''
  form.positionName = props.position?.positionName || ''
  form.department = props.position?.department || ''
  form.region = props.position?.region || ''
  form.city = props.position?.city || ''
  form.recruitmentCycle = (props.position?.recruitmentCycle || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  form.projectYear = props.position?.projectYear || ''
  form.deadline = toDateTimeLocal(props.position?.deadline)
  form.positionUrl = props.position?.positionUrl || ''
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
    }
  }
)

const selectedCycles = computed(() => form.recruitmentCycle)
const isPending = computed(() => props.position?.status === 'pending')

const submitterInitials = computed(() => {
  const value = props.position?.studentName || '学员'
  return value.slice(0, 2).toUpperCase()
})

const submittedLabel = computed(() => {
  if (!props.position?.submittedAt) return '提交时间待补充'
  return `提交于 ${formatDateTime(props.position.submittedAt)}`
})

const statusLabel = computed(() => {
  if (props.position?.status === 'approved') return '已通过'
  if (props.position?.status === 'rejected') return '已拒绝'
  return '待审核'
})

const statusTone = computed(() => {
  if (props.position?.status === 'approved') return 'approved'
  if (props.position?.status === 'rejected') return 'rejected'
  return 'pending'
})

const toggleCycle = (value: string) => {
  if (form.recruitmentCycle.includes(value)) {
    form.recruitmentCycle = form.recruitmentCycle.filter((item) => item !== value)
    return
  }
  form.recruitmentCycle = [...form.recruitmentCycle, value]
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleRejectRequest = () => {
  emit('requestReject')
}

const handleSubmit = () => {
  const payload: ReviewStudentPositionPayload = {
    positionCategory: form.positionCategory.trim(),
    industry: form.industry.trim() || undefined,
    companyName: form.companyName.trim(),
    companyType: form.companyType.trim() || undefined,
    companyWebsite: form.companyWebsite.trim() || undefined,
    positionName: form.positionName.trim(),
    department: form.department.trim() || undefined,
    region: form.region.trim(),
    city: form.city.trim(),
    recruitmentCycle: form.recruitmentCycle.join(', '),
    projectYear: form.projectYear.trim(),
    deadline: normalizeDateTimeLocal(form.deadline),
    positionUrl: form.positionUrl.trim() || undefined
  }

  if (
    !payload.positionCategory ||
    !payload.companyName ||
    !payload.positionName ||
    !payload.region ||
    !payload.city ||
    !payload.recruitmentCycle ||
    !payload.projectYear
  ) {
    message.warning('请先补齐岗位分类、公司、岗位、地区、招聘周期和项目时间')
    return
  }

  emit('submit', payload)
}

const toDateTimeLocal = (value?: string) => {
  if (!value) return ''
  return value.slice(0, 16)
}

const formatDateTime = (value: string) => value.replace('T', ' ').slice(0, 16)

const normalizeDateTimeLocal = (value: string) => {
  if (!value) return undefined
  if (value.length === 16) return `${value}:00`
  return value
}
</script>

<style scoped lang="scss">
.student-review-modal__titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.student-review-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #1e293b;
  font-size: 18px;
  font-weight: 700;
}

.student-review-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.student-review-modal__hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.student-review-modal__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #6366f1;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.student-review-modal__hero-copy,
.student-review-modal__hero-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.student-review-modal__hero-copy strong {
  color: #0f172a;
  font-size: 15px;
}

.student-review-modal__hero-copy span,
.student-review-modal__hero-meta span {
  color: #64748b;
  font-size: 12px;
}

.student-review-modal__hero-meta {
  align-items: flex-end;
}

.student-review-modal__status,
.student-review-modal__coaching {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.student-review-modal__status--pending {
  background: #fef3c7;
  color: #92400e;
}

.student-review-modal__status--approved {
  background: #dcfce7;
  color: #166534;
}

.student-review-modal__status--rejected {
  background: #fee2e2;
  color: #b91c1c;
}

.student-review-modal__coaching {
  background: #eef2ff;
  color: #4f46e5;
}

.student-review-modal__sections {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.student-review-modal__section-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid #dbe3ee;
  background: #f8fafc;
}

.student-review-modal__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.student-review-modal__section-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #6366f1;
  font-size: 14px;
  font-weight: 700;
}

.student-review-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
}

.student-review-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.student-review-modal__field--wide {
  grid-column: span 2;
}

.student-review-modal__field span,
.student-review-modal__chip-label {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.student-review-modal__field input,
.student-review-modal__field select {
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #fff;
  color: #0f172a;
  font: inherit;
}

.student-review-modal__field input:disabled,
.student-review-modal__field select:disabled {
  background: #f1f5f9;
  color: #64748b;
}

.student-review-modal__chip-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.student-review-modal__cycle-chip {
  min-height: 36px;
  padding: 0 16px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #fff;
  color: #475569;
  font-size: 14px;
}

.student-review-modal__cycle-chip--active {
  border-color: #6366f1;
  background: #eef2ff;
  color: #4338ca;
  font-weight: 700;
}

.student-review-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.student-review-modal__footer-button {
  min-height: 48px;
  padding: 0 22px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  font-weight: 700;
}

.student-review-modal__footer-button--ghost {
  background: #fff;
  color: #475569;
}

.student-review-modal__footer-button--danger {
  border-color: #ef4444;
  background: #ef4444;
  color: #fff;
}

.student-review-modal__footer-button--primary {
  border-color: #6366f1;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
}

@media (max-width: 900px) {
  .student-review-modal__hero {
    grid-template-columns: 1fr;
  }

  .student-review-modal__hero-meta {
    align-items: flex-start;
  }

  .student-review-modal__grid {
    grid-template-columns: 1fr;
  }

  .student-review-modal__field--wide {
    grid-column: span 1;
  }
}
</style>
