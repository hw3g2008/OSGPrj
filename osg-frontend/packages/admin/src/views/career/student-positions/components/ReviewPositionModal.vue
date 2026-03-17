<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="review-student-position-modal"
    width="920px"
    :body-class="'review-position-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="review-position-modal__title-wrap">
        <div>
          <span class="review-position-modal__eyebrow">Student Added Position</span>
          <div class="review-position-modal__title">
            <span class="mdi mdi-briefcase-search-outline" aria-hidden="true"></span>
            <span>审核学生自添岗位</span>
          </div>
        </div>
        <span class="review-position-modal__hint">校正岗位信息后，再决定通过或拒绝。</span>
      </div>
    </template>

    <div class="review-position-modal__sections">
      <section class="review-position-modal__submitter">
        <div class="review-position-modal__avatar">{{ submitterInitials }}</div>
        <div class="review-position-modal__submitter-copy">
          <strong>{{ position?.studentName || '未命名学生' }}</strong>
          <span>ID {{ position?.studentId || '--' }}</span>
          <span>{{ submittedLabel }}</span>
        </div>
        <div class="review-position-modal__meta">
          <span :class="['review-position-modal__status', `review-position-modal__status--${statusTone}`]">
            {{ statusLabel }}
          </span>
          <span v-if="position?.hasCoachingRequest === 'yes'" class="review-position-modal__coaching">
            有辅导申请
          </span>
        </div>
      </section>

      <section class="review-position-modal__section">
        <header>
          <h3>基本信息</h3>
          <p>审核时可修正岗位分类、岗位名称、部门、招聘周期与项目时间。</p>
        </header>
        <div class="review-position-modal__grid">
          <label class="review-position-modal__field">
            <span>岗位分类</span>
            <select v-model="form.positionCategory" class="review-position-modal__select" :disabled="!isPending">
              <option value="">请选择</option>
              <option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label class="review-position-modal__field">
            <span>岗位名称</span>
            <input v-model="form.positionName" type="text" class="review-position-modal__input" placeholder="例如 Summer Analyst" :disabled="!isPending" />
          </label>
          <label class="review-position-modal__field">
            <span>部门</span>
            <input v-model="form.department" type="text" class="review-position-modal__input" placeholder="例如 Global Markets" :disabled="!isPending" />
          </label>
          <label class="review-position-modal__field">
            <span>项目时间</span>
            <input v-model="form.projectYear" type="text" class="review-position-modal__input" placeholder="例如 2026" :disabled="!isPending" />
          </label>
          <label class="review-position-modal__field review-position-modal__field--wide">
            <span>岗位分类行业</span>
            <input v-model="form.industry" type="text" class="review-position-modal__input" placeholder="例如 Investment Bank" :disabled="!isPending" />
          </label>
          <label class="review-position-modal__field">
            <span>截止日期</span>
            <input v-model="form.deadline" type="datetime-local" class="review-position-modal__input" :disabled="!isPending" />
          </label>
        </div>
        <div class="review-position-modal__chips">
          <span class="review-position-modal__chip-label">招聘周期</span>
          <button
            v-for="option in recruitmentCycleOptions"
            :key="option"
            type="button"
            :class="['review-position-modal__chip', { 'review-position-modal__chip--active': selectedCycles.includes(option) }]"
            :disabled="!isPending"
            @click="toggleCycle(option)"
          >
            {{ option }}
          </button>
        </div>
      </section>

      <section class="review-position-modal__section">
        <header>
          <h3>公司信息</h3>
          <p>核对公司与岗位链接，必要时修正地区与城市。</p>
        </header>
        <div class="review-position-modal__grid">
          <label class="review-position-modal__field">
            <span>公司名称</span>
            <input v-model="form.companyName" type="text" class="review-position-modal__input" placeholder="公司名称" :disabled="!isPending" />
          </label>
          <label class="review-position-modal__field">
            <span>公司类别</span>
            <input v-model="form.companyType" type="text" class="review-position-modal__input" placeholder="例如 Hedge Fund" :disabled="!isPending" />
          </label>
          <label class="review-position-modal__field">
            <span>大区</span>
            <select v-model="form.region" class="review-position-modal__select" :disabled="!isPending">
              <option value="">请选择</option>
              <option v-for="option in regionOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label class="review-position-modal__field">
            <span>城市</span>
            <input v-model="form.city" type="text" class="review-position-modal__input" placeholder="例如 New York" :disabled="!isPending" />
          </label>
          <label class="review-position-modal__field">
            <span>公司官网</span>
            <input v-model="form.companyWebsite" type="url" class="review-position-modal__input" placeholder="https://company.com" :disabled="!isPending" />
          </label>
          <label class="review-position-modal__field">
            <span>岗位链接</span>
            <input v-model="form.positionUrl" type="url" class="review-position-modal__input" placeholder="https://company.com/jobs/..." :disabled="!isPending" />
          </label>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="review-position-modal__footer">
        <button type="button" class="permission-button permission-button--outline" @click="handleClose">
          取消
        </button>
        <button v-if="isPending" type="button" class="permission-button permission-button--danger" @click="handleRejectRequest">
          拒绝
        </button>
        <button v-if="isPending" type="button" class="permission-button permission-button--primary" @click="handleSubmit">
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
  form.recruitmentCycle = (props.position?.recruitmentCycle || '').split(',').map(item => item.trim()).filter(Boolean)
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
  if (!props.position?.submittedAt) {
    return '提交时间待补充'
  }
  return `提交于 ${formatDateTime(props.position.submittedAt)}`
})

const statusLabel = computed(() => {
  if (props.position?.status === 'approved') {
    return '已通过'
  }
  if (props.position?.status === 'rejected') {
    return '已拒绝'
  }
  return '待审核'
})

const statusTone = computed(() => {
  if (props.position?.status === 'approved') {
    return 'approved'
  }
  if (props.position?.status === 'rejected') {
    return 'rejected'
  }
  return 'pending'
})

const toggleCycle = (value: string) => {
  if (form.recruitmentCycle.includes(value)) {
    form.recruitmentCycle = form.recruitmentCycle.filter(item => item !== value)
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
  if (!value) {
    return ''
  }
  return value.slice(0, 16)
}

const formatDateTime = (value: string) => {
  return value.replace('T', ' ').slice(0, 16)
}

const normalizeDateTimeLocal = (value: string) => {
  if (!value) {
    return undefined
  }
  if (value.length === 16) {
    return `${value}:00`
  }
  return value
}
</script>

<style scoped lang="scss">
.review-position-modal__title-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.review-position-modal__eyebrow {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(219, 234, 254, 0.72);
  color: #1d4ed8;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.review-position-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.review-position-modal__hint {
  color: #475569;
  font-size: 13px;
}

.review-position-modal__sections {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.review-position-modal__submitter {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(219, 234, 254, 0.78), rgba(239, 246, 255, 0.96));
}

.review-position-modal__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(145deg, #2563eb, #1d4ed8);
  color: #eff6ff;
  font-size: 18px;
  font-weight: 700;
}

.review-position-modal__submitter-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #334155;
}

.review-position-modal__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.review-position-modal__status,
.review-position-modal__coaching {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.review-position-modal__status--pending {
  background: rgba(254, 243, 199, 0.9);
  color: #9a3412;
}

.review-position-modal__status--approved {
  background: rgba(220, 252, 231, 0.92);
  color: #166534;
}

.review-position-modal__status--rejected {
  background: rgba(254, 226, 226, 0.9);
  color: #b91c1c;
}

.review-position-modal__coaching {
  background: rgba(219, 234, 254, 0.88);
  color: #1d4ed8;
}

.review-position-modal__section {
  padding: 20px;
  border: 1px solid rgba(226, 232, 240, 0.88);
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
}

.review-position-modal__section header {
  margin-bottom: 16px;
}

.review-position-modal__section h3 {
  margin: 0 0 6px;
  font-size: 18px;
  color: #0f172a;
}

.review-position-modal__section p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}

.review-position-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.review-position-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.review-position-modal__field--wide {
  grid-column: 1 / -1;
}

.review-position-modal__field span {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.review-position-modal__input,
.review-position-modal__select {
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  background: #fff;
  color: #0f172a;
  font-size: 14px;
}

.review-position-modal__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.review-position-modal__chip-label {
  display: inline-flex;
  align-items: center;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.review-position-modal__chip {
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: rgba(239, 246, 255, 0.9);
  color: #1d4ed8;
  padding: 8px 12px;
  font-size: 13px;
}

.review-position-modal__chip--active {
  border-color: #2563eb;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #eff6ff;
}

.review-position-modal__chip:disabled,
.review-position-modal__input:disabled,
.review-position-modal__select:disabled {
  cursor: not-allowed;
  opacity: 0.72;
  background: #f8fafc;
}

.review-position-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 900px) {
  .review-position-modal__title-wrap,
  .review-position-modal__submitter {
    grid-template-columns: 1fr;
    display: grid;
  }

  .review-position-modal__meta {
    align-items: flex-start;
  }

  .review-position-modal__grid {
    grid-template-columns: 1fr;
  }

  .review-position-modal__footer {
    flex-wrap: wrap;
  }
}
</style>
