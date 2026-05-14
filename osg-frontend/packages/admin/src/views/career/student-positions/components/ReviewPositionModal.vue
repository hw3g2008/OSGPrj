<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-edit-student-position"
    width="860px"
    :body-class="'student-review-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-briefcase-plus-outline" aria-hidden="true"></span>
        <span>{{ modalTitle }}</span>
      </span>
    </template>

    <section class="student-review-modal__hero">
      <div class="student-review-modal__avatar">{{ submitterInitials }}</div>
      <div class="student-review-modal__hero-copy">
        <strong>{{ position?.studentName || $t('unnamed_student_2') }}</strong>
        <span>ID {{ position?.studentId || '--' }}</span>
        <span>{{ submittedLabel }}</span>
      </div>
      <div class="student-review-modal__hero-meta">
        <span :class="['student-review-modal__status', `student-review-modal__status--${statusTone}`]">{{ statusLabel }}</span>
        <span v-if="position?.hasCoachingRequest === 'yes'" class="student-review-modal__coaching">{{ $t('has_coaching_request') }}</span>
      </div>
    </section>

    <div class="student-review-modal__sections">
      <section class="student-review-modal__section-card">
        <header class="student-review-modal__section-head">
          <div class="student-review-modal__section-title">
            <span class="mdi mdi-briefcase-variant-outline" aria-hidden="true"></span>
            <span>{{ $t('basic_info') }}</span>
          </div>
        </header>

        <div class="student-review-modal__grid">
          <fieldset class="student-review-modal__field" :data-field-name="$t('job_classification')">
            <span>{{ $t('job_classification') }} *</span>
            <a-select v-model:value="form.positionCategory" :placeholder="$t('please_select')" :disabled="!isPending">
              <a-select-option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
            </a-select>
          </fieldset>

          <label class="student-review-modal__field" :data-field-name="$t('job_title')">
            <span>{{ $t('job_title') }} *</span>
            <a-input v-model:value="form.positionName" :placeholder="$t('example_summer_analyst')" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field" :data-field-name="$t('department')">
            <span>{{ $t('department') }}</span>
            <a-input v-model:value="form.department" :placeholder="$t('example_m_a_global_markets')" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field" :data-field-name="$t('program_period')">
            <span>{{ $t('program_period') }} *</span>
            <a-input v-model:value="form.projectYear" :placeholder="$t('example_year_2026')" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field student-review-modal__field--wide" :data-field-name="$t('industry')">
            <span>{{ $t('industry') }}</span>
            <a-input v-model:value="form.industry" :placeholder="$t('example_bulge_bracket_buyside_consulting')" :disabled="!isPending" />
          </label>

          <fieldset class="student-review-modal__field" :data-field-name="$t('deadline_2')">
            <span>{{ $t('deadline_2') }}</span>
            <a-input v-model:value="form.deadline" type="datetime-local" :disabled="!isPending" />
          </fieldset>
        </div>

        <fieldset class="student-review-modal__chip-group" :data-field-name="$t('recruitment_cycle')">
          <span class="student-review-modal__chip-label">{{ $t('recruitment_cycle') }} *</span>
          <a-button
            v-for="option in recruitmentCycleOptions"
            :key="option"
            :type="selectedCycles.includes(option) ? 'primary' : 'default'"
            size="small"
            :disabled="!isPending"
            @click="toggleCycle(option)"
          >
            {{ option }}
          </a-button>
        </fieldset>
      </section>

      <section class="student-review-modal__section-card">
        <header class="student-review-modal__section-head">
          <div class="student-review-modal__section-title">
            <span class="mdi mdi-domain" aria-hidden="true"></span>
            <span>{{ $t('company_info') }}</span>
          </div>
        </header>

        <div class="student-review-modal__grid">
          <label class="student-review-modal__field" :data-field-name="$t('company_name')">
            <span>{{ $t('company_name') }} *</span>
            <a-input v-model:value="form.companyName" :placeholder="$t('company_name')" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field" :data-field-name="$t('company_type')">
            <span>{{ $t('company_type') }}</span>
            <a-input v-model:value="form.companyType" :placeholder="$t('example_company_type_values')" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field" :data-field-name="$t('region')">
            <span>{{ $t('region') }} *</span>
            <a-select v-model:value="form.region" :placeholder="$t('please_select')" :disabled="!isPending">
              <a-select-option v-for="option in regionOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
            </a-select>
          </label>

          <label class="student-review-modal__field" :data-field-name="$t('city')">
            <span>{{ $t('city') }} *</span>
            <a-input v-model:value="form.city" :placeholder="$t('example_singapore')" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field" :data-field-name="$t('company_website')">
            <span>{{ $t('company_website') }}</span>
            <a-input v-model:value="form.companyWebsite" placeholder="https://company.com" :disabled="!isPending" />
          </label>

          <label class="student-review-modal__field" :data-field-name="$t('position_link')">
            <span>{{ $t('position_link') }}</span>
            <a-input v-model:value="form.positionUrl" placeholder="https://company.com/jobs/..." :disabled="!isPending" />
          </label>
        </div>
      </section>
    </div>

    <template #footer>
      <a-button data-surface-part="cancel-control" @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button
        v-if="isPending"
        danger
        data-surface-part="reject-control"
        data-surface-trigger="modal-reject-position"
        :data-surface-sample-key="props.position ? `student-position-${props.position.studentPositionId}` : 'student-position'"
        @click="handleRejectRequest"
      >
        {{ $t('reject_position') }}
      </a-button>
      <a-button
        v-if="isPending"
        type="primary"
        data-surface-part="confirm-control"
        @click="handleSubmit"
      >
        {{ $t('save_and_approve') }}
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { ReviewStudentPositionPayload, StudentPositionListItem } from '@osg/shared/api/admin/studentPosition'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
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
  { value: 'summer', label: t('summer_internship') },
  { value: 'fulltime', label: t('full_time_recruitment') },
  { value: 'offcycle', label: t('non_standard_cycle') },
  { value: 'spring', label: t('spring_internship') },
  { value: 'events', label: t('recruitment_event') }
]

const recruitmentCycleOptions = ['2024 Summer', '2025 Summer', '2026 Summer', '2025 Full-time', '2026 Full-time']

const regionOptions = [
  { value: 'na', label: t('north_america') },
  { value: 'eu', label: t('europe') },
  { value: 'ap', label: t('asia_pacific') },
  { value: 'cn', label: t('mainland_china') }
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
const modalTitle = computed(() => (isPending.value ? t('edit_student_submitted_position') : t('student_submitted_position_result')))

const submitterInitials = computed(() => {
  const value = props.position?.studentName || t('student')
  return value.slice(0, 2).toUpperCase()
})

const submittedLabel = computed(() => {
  if (!props.position?.submittedAt) return t('submission_time_pending')
  return t('submitted_at_time', { time: formatDateTime(props.position.submittedAt) })
})

const statusLabel = computed(() => {
  if (props.position?.status === 'approved') return t('approved')
  if (props.position?.status === 'rejected') return t('rejected')
  return t('pending_review')
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
    message.warning(t('please_complete_position_category_compan'))
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
  margin: 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;
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

.student-review-modal__chip-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;
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
