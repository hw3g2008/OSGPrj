<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="assign-mock-practice-modal"
    width="760px"
    :body-class="['mock-practice-assign-modal__body', 'assign-mock-modal__body']"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-account-voice-outline" aria-hidden="true"></span>
        <span>{{ $t('process_mock_job_applications') }}</span>
      </span>
    </template>

    <section class="mock-practice-assign-modal__hero assign-mock-modal__hero">
      <div class="mock-practice-assign-modal__avatar assign-mock-modal__avatar">{{ studentInitials }}</div>
      <div class="mock-practice-assign-modal__summary assign-mock-modal__summary">
        <strong>{{ row?.studentName || $t('students_to_be_assigned') }}</strong>
        <span>ID {{ row?.studentId || '--' }}</span>
        <span>{{ practiceTypeLabel }}</span>
      </div>
      <div class="mock-practice-assign-modal__meta assign-mock-modal__meta">
        <span class="mock-practice-assign-modal__meta-chip assign-mock-modal__meta-chip">{{ $t('mentor_requested_count', { count: requestedCount }) }}</span>
        <span class="mock-practice-assign-modal__meta-chip mock-practice-assign-modal__meta-chip--accent assign-mock-modal__meta-chip assign-mock-modal__meta-chip--accent">
          {{ preferredMentorLabel }}
        </span>
      </div>
    </section>

    <section class="mock-practice-assign-modal__panel">
      <header class="mock-practice-assign-modal__section-head">
        <div>
          <h3>{{ $t('mentor_candidate_pool') }}</h3>
          <p>{{ $t('intended_tutors_are_given_priority_and_c') }}。</p>
        </div>
        <span class="mock-practice-assign-modal__badge">{{ $t('support_multiple_tutors') }}</span>
      </header>

      <div v-if="mentorOptions.length" class="mock-practice-assign-modal__mentor-list assign-mock-modal__mentor-list">
        <label
          v-for="option in mentorOptions"
          :key="option.mentorId"
          :class="[
            'mock-practice-assign-modal__mentor assign-mock-modal__option',
            {
              'mock-practice-assign-modal__mentor--selected assign-mock-modal__option--selected': selectedMentorIds.includes(option.mentorId),
              'mock-practice-assign-modal__mentor--preferred assign-mock-modal__option--preferred': option.preferred
            }
          ]"
        >
          <a-checkbox
            :checked="selectedMentorIds.includes(option.mentorId)"
            @change="toggleMentor(option.mentorId)"
          />
          <div class="mock-practice-assign-modal__mentor-avatar">{{ getMentorInitials(option.mentorName) }}</div>
          <div class="mock-practice-assign-modal__mentor-copy assign-mock-modal__option-copy">
            <strong>{{ option.mentorName }}</strong>
            <span>{{ option.mentorBackground }}</span>
          </div>
          <span v-if="option.preferred" class="mock-practice-assign-modal__mentor-flag assign-mock-modal__preferred-flag">{{ $t('intended_mentor') }}</span>
        </label>
      </div>
      <div v-else class="mock-practice-assign-modal__empty assign-mock-modal__empty">{{ $t('there_are_currently_no_tutors_available_') }}。</div>
    </section>

    <section class="mock-practice-assign-modal__schedule-grid">
      <label class="mock-practice-assign-modal__field">
        <span>{{ $t('appointment_time') }}</span>
        <a-input v-model:value="scheduledAt" type="datetime-local" />
      </label>

      <label class="mock-practice-assign-modal__field">
        <span>{{ $t('remarks_2') }}</span>
        <a-textarea
          v-model:value="note"
          :rows="4"
          :maxlength="160"
          :placeholder="`${$t('for_example_arrange_behavioral_simulatio')} technical drill。`"
        />
      </label>
    </section>

    <template #footer>
      <a-button @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button type="primary" :disabled="submitting" @click="handleSubmit">
        {{ submitting ? $t('submitting') + '...' : $t('confirm_arrangement') }}
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { MockPracticeListItem } from '@osg/shared/api/admin/mockPractice'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
interface MentorOption {
  mentorId: number
  mentorName: string
  mentorBackground: string
  preferred: boolean
}

const props = withDefaults(defineProps<{
  visible: boolean
  row?: MockPracticeListItem | null
  mentorOptions: MentorOption[]
  submitting?: boolean
}>(), {
  row: null,
  submitting: false
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: {
    mentorIds: number[]
    mentorNames: string[]
    mentorBackgrounds: string[]
    scheduledAt: string
    note: string
  }]
}>()

const selectedMentorIds = ref<number[]>([])
const scheduledAt = ref('')
const note = ref('')

const studentInitials = computed(() => {
  const value = props.row?.studentName || t('student')
  return value.slice(0, 2).toUpperCase()
})

const requestedCount = computed(() => props.row?.requestedMentorCount || 1)
const preferredMentorLabel = computed(() => props.row?.preferredMentorNames || t('no_intention_of_mentoring_yet'))
const practiceTypeLabel = computed(() => formatPracticeType(props.row?.practiceType))

watch(
  () => [props.visible, props.row?.practiceId] as const,
  ([visible]) => {
    if (!visible) {
      selectedMentorIds.value = []
      scheduledAt.value = ''
      note.value = ''
      return
    }

    selectedMentorIds.value = props.mentorOptions
      .filter((option) => option.preferred)
      .slice(0, requestedCount.value)
      .map((option) => option.mentorId)
    scheduledAt.value = ''
    note.value = ''
  },
  { immediate: true }
)

const toggleMentor = (mentorId: number) => {
  const index = selectedMentorIds.value.indexOf(mentorId)
  if (index === -1) {
    selectedMentorIds.value.push(mentorId)
  } else {
    selectedMentorIds.value.splice(index, 1)
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!selectedMentorIds.value.length) {
    message.warning(t('please_select_at_least_1_tutor'))
    return
  }
  if (!scheduledAt.value) {
    message.warning(t('please_select_an_appointment_time'))
    return
  }

  const selected = props.mentorOptions.filter((option) => selectedMentorIds.value.includes(option.mentorId))
  emit('submit', {
    mentorIds: selected.map((option) => option.mentorId),
    mentorNames: selected.map((option) => option.mentorName),
    mentorBackgrounds: selected.map((option) => option.mentorBackground),
    scheduledAt: scheduledAt.value,
    note: note.value.trim()
  })
}

function formatPracticeType(value?: string) {
  if (value === 'mock_interview') return t('mock_interview')
  if (value === 'communication_test') return t('interpersonal_test')
  if (value === 'midterm_exam') return t('midterm_exam')
  return t('mock_application')
}

const getMentorInitials = (value: string) => value.slice(0, 2).toUpperCase()
</script>

<style scoped lang="scss">
.mock-practice-assign-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.mock-practice-assign-modal__hero,
.assign-mock-modal__hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid #ccfbf1;
  background: #f0fdfa;
}

.mock-practice-assign-modal__avatar,
.assign-mock-modal__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.mock-practice-assign-modal__summary strong {
  display: block;
  color: #0f172a;
  font-size: 16px;
}

.mock-practice-assign-modal__summary span {
  display: block;
  color: #64748b;
  font-size: 12px;
}

.mock-practice-assign-modal__meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.mock-practice-assign-modal__meta-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.mock-practice-assign-modal__meta-chip--accent {
  background: #ecfeff;
  color: #0f766e;
}

.mock-practice-assign-modal__panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mock-practice-assign-modal__section-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.mock-practice-assign-modal__section-head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
}

.mock-practice-assign-modal__section-head p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
}

.mock-practice-assign-modal__badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #ecfeff;
  color: #0f766e;
  font-size: 12px;
  font-weight: 600;
}

.mock-practice-assign-modal__mentor-list,
.assign-mock-modal__mentor-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mock-practice-assign-modal__mentor,
.assign-mock-modal__option {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 70px;
  padding: 12px 14px;
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  background: #fff;
}

.mock-practice-assign-modal__mentor--selected,
.assign-mock-modal__option--selected {
  border-color: #0f766e;
  background: #f0fdfa;
}

.mock-practice-assign-modal__mentor--preferred,
.assign-mock-modal__option--preferred {
  background: linear-gradient(145deg, rgba(240, 253, 250, 0.96), rgba(236, 253, 245, 0.98));
}

.mock-practice-assign-modal__mentor-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: #0f766e;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.mock-practice-assign-modal__mentor-copy strong {
  display: block;
  color: #0f172a;
  font-size: 14px;
}

.mock-practice-assign-modal__mentor-copy span {
  color: #64748b;
  font-size: 12px;
}

.mock-practice-assign-modal__mentor-flag,
.assign-mock-modal__preferred-flag {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #ccfbf1;
  color: #0f766e;
  font-size: 12px;
  font-weight: 600;
}

.mock-practice-assign-modal__schedule-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.mock-practice-assign-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mock-practice-assign-modal__field span {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.mock-practice-assign-modal__empty,
.assign-mock-modal__empty {
  padding: 18px;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}

@media (max-width: 860px) {
  .mock-practice-assign-modal__hero,
  .assign-mock-modal__hero {
    grid-template-columns: 1fr;
  }

  .mock-practice-assign-modal__meta {
    align-items: flex-start;
  }

  .mock-practice-assign-modal__schedule-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .mock-practice-assign-modal__mentor,
  .assign-mock-modal__option {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .mock-practice-assign-modal__mentor-flag,
  .assign-mock-modal__preferred-flag {
    grid-column: span 2;
    justify-self: start;
  }
}
</style>

