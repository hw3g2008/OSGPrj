<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-assign-mentor"
    width="720px"
    :body-class="['job-overview-assign-modal__body', 'assign-mentor-modal__body']"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-account-plus-outline" aria-hidden="true"></span>
        <span>{{ $t('assign_a_mentor') }}</span>
      </span>
    </template>

    <a-card
      :bordered="false"
      class="job-overview-assign-modal__hero assign-mentor-modal__hero student-card"
    >
      <a-row :gutter="[16, 12]" align="middle">
        <a-col flex="56px">
          <div class="student-card__avatar job-overview-assign-modal__avatar assign-mentor-modal__avatar">
            {{ studentInitials }}
          </div>
        </a-col>
        <a-col flex="auto">
          <div class="student-card__name">
            {{ row?.studentName || $t('students_to_be_assigned') }}
            <span class="student-card__meta">(ID: {{ row?.studentId || '--' }})</span>
          </div>
          <div class="student-card__sub">
            {{ row?.companyName || '-' }} · {{ row?.positionName || '-' }}
          </div>
        </a-col>
      </a-row>

      <a-divider class="student-card__divider" />

      <a-row :gutter="[16, 12]" class="student-grid">
        <a-col :xs="24" :sm="12">
          <span class="student-grid__label">{{ $t('recommended_allocation') }}</span>
          <strong class="student-grid__accent">{{ requestedCount }} {{ $t('mentors') }}</strong>
        </a-col>
        <a-col :xs="24" :sm="12">
          <span class="student-grid__label">{{ $t('intended_mentor') }}</span>
          <strong class="student-grid__success">{{ preferredMentorLabel }}</strong>
        </a-col>
      </a-row>
    </a-card>

    <div class="form-group">
      <div class="form-label">{{ $t('screening_tutors') }}</div>
      <a-row
        :gutter="[12, 12]"
        class="job-overview-assign-modal__filters filter-row"
      >
        <a-col :xs="24" :sm="12" :md="8">
          <a-select
            v-model:value="scope"
            :placeholder="$t('full_range')"
            allow-clear
            style="width:100%"
            :options="scopeOptions"
            :data-field-name="$t('scheduling_status_filter')"
            :data-field-name-alias="$t('assignment_tutor_pop_up_window_schedulin')"
          />
        </a-col>
        <a-col :xs="24" :sm="12" :md="8">
          <a-select
            v-model:value="majorDirection"
            :placeholder="$t('all_main_directions_of_attack')"
            allow-clear
            style="width:100%"
            :options="majorDirectionOptions"
            :data-field-name="$t('filter_by_main_direction_of_attack')"
            :data-field-name-alias="$t('assign_tutor_pop_up_window_to_select_mai')"
          />
        </a-col>
        <a-col :xs="24" :sm="24" :md="8">
          <a-input
            v-model:value="keyword"
            :placeholder="`${$t('search_for_tutor_name')}...`"
            allow-clear
            :data-field-name="$t('tutor_search')"
            :data-field-name-alias="$t('assign_tutor_pop_up_window_tutor_search')"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>
        </a-col>
      </a-row>
      <div class="filter-hint">
        <FilterOutlined />
        {{ $t('found_mentors_count', { count: filteredMentorOptions.length }) }}
      </div>
    </div>

    <div class="form-group">
      <div class="form-label">
        {{ $t('choose_a_tutor') }}
        <span class="form-label__meta">({{ $t('multiple_selections_possible') }})</span>
      </div>
      <a-empty
        v-if="!filteredMentorOptions.length"
        :description="$t('there_are_currently_no_mentor_candidates')"
        class="job-overview-assign-modal__empty assign-mentor-modal__empty mentor-empty"
      />
      <a-list
        v-else
        class="job-overview-assign-modal__mentor-list assign-mentor-modal__mentor-list mentor-list"
        :data-source="filteredMentorOptions"
        :split="false"
      >
        <template #renderItem="{ item }">
          <a-list-item
            class="mentor-item"
            :class="{
              'mentor-item--selected': selectedMentorIds.includes(item.mentorId),
              'mentor-item--preferred': item.preferred
            }"
            @click="toggleMentor(item.mentorId)"
          >
            <div class="mentor-item__main">
              <a-checkbox
                :checked="selectedMentorIds.includes(item.mentorId)"
                :data-field-name="item.mentorName"
                :data-field-name-alias="$t('assign_mentor_modal_mentor_name', { name: item.mentorName })"

                @click.stop
                @change="toggleMentor(item.mentorId)"
              />
              <div class="mentor-item__avatar">{{ getMentorInitials(item.mentorName) }}</div>
              <div class="mentor-item__copy">
                <div class="mentor-item__name">
                  <strong>{{ item.mentorName }}</strong>
                  <a-tag
                    v-if="item.preferred"
                    color="blue"
                    class="mentor-item__badge"
                  >{{ $t('intended_mentor') }}</a-tag>
                </div>
                <div class="mentor-item__sub">{{ item.hint || $t('assignable_mentors') }}</div>
              </div>
            </div>
          </a-list-item>
        </template>
      </a-list>
      <div class="selection-hint">
        <InfoCircleOutlined />
        {{ $t('selected_mentors_count', { count: selectedMentorIds.length }) }}
      </div>
    </div>

    <div
      class="form-group form-group--last job-overview-assign-modal__note-field"
      :data-field-name="$t('remarks')"
      :data-field-name-alias="$t('assignment_instructor_pop_up_window_note')"
    >
      <div class="form-label">
        {{ $t('remarks') }}
        <span class="form-label__meta">({{ $t('optional') }})</span>
      </div>
      <a-textarea
        v-model:value="assignNote"
        :data-field-name="$t('remarks')"
        :data-field-name-alias="$t('assignment_instructor_pop_up_window_note')"
        :rows="3"
        :maxlength="160"
        :placeholder="`${$t('special_instructions_for_tutors_such_as_')}...`"
      />
      <div class="job-overview-assign-modal__note-meta assign-mentor-modal__note-meta">
        <span>{{ assignNote.length }}/160</span>
      </div>
    </div>

    <template #footer>
      <a-button @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button
        type="primary"
        :disabled="submitting || !selectedMentorIds.length"
        @click="handleSubmit"
      >
        {{ submitting ? $t('submitting') + '...' : $t('confirm_allocation') }}
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  FilterOutlined,
  InfoCircleOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import type { UnassignedJobOverviewRow } from '@osg/shared/api/admin/jobOverview'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
interface AssignMentorOption {
  mentorId: number
  mentorName: string
  preferred: boolean
  hint?: string
  majorDirection?: string
}

const props = withDefaults(defineProps<{
  visible: boolean
  row?: UnassignedJobOverviewRow | null
  mentorOptions: AssignMentorOption[]
  submitting?: boolean
}>(), {
  row: null,
  submitting: false
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: { mentorIds: number[]; mentorNames: string[]; assignNote: string }]
}>()

const keyword = ref('')
const scope = ref<'preferred' | 'recommended' | undefined>(undefined)
const majorDirection = ref<string | undefined>(undefined)
const selectedMentorIds = ref<number[]>([])
const assignNote = ref('')

const scopeOptions = [
  { value: 'preferred', label: t('intended_mentor') },
  { value: 'recommended', label: t('recommended_by_the_head_teacher') }
] as const

const majorDirectionOptions = computed(() => {
  const values = new Set<string>()
  props.mentorOptions.forEach((option) => {
    const direction = resolveMajorDirection(option)
    if (direction) {
      values.add(direction)
    }
  })

  return [...values]
    .sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))
    .map((value) => ({ value, label: value }))
})

const studentInitials = computed(() => {
  const value = props.row?.studentName || t('student')
  return value.slice(0, 2).toUpperCase()
})

const requestedCount = computed(() => props.row?.requestedMentorCount || 1)
const preferredMentorLabel = computed(() => props.row?.preferredMentorNames || t('there_are_currently_no_prospective_mento'))

const filteredMentorOptions = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  return props.mentorOptions.filter((option) => {
    if (scope.value === 'preferred' && !option.preferred) {
      return false
    }
    if (scope.value === 'recommended' && option.hint !== t('recommended_by_the_head_teacher')) {
      return false
    }
    if (majorDirection.value && resolveMajorDirection(option) !== majorDirection.value) {
      return false
    }
    if (!normalizedKeyword) {
      return true
    }
    return option.mentorName.toLowerCase().includes(normalizedKeyword)
      || String(option.hint || '').toLowerCase().includes(normalizedKeyword)
  })
})

watch(
  () => [props.visible, props.mentorOptions, props.row?.requestedMentorCount] as const,
  ([visible]) => {
    if (!visible) {
      keyword.value = ''
      scope.value = undefined
      majorDirection.value = undefined
      selectedMentorIds.value = []
      assignNote.value = ''
      return
    }

    keyword.value = ''
    scope.value = undefined
    majorDirection.value = undefined
    selectedMentorIds.value = props.mentorOptions
      .filter((option) => option.preferred)
      .slice(0, requestedCount.value)
      .map((option) => option.mentorId)
    assignNote.value = ''
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

  const selectedOptions = props.mentorOptions.filter((option) => selectedMentorIds.value.includes(option.mentorId))
  emit('submit', {
    mentorIds: selectedOptions.map((option) => option.mentorId),
    mentorNames: selectedOptions.map((option) => option.mentorName),
    assignNote: assignNote.value.trim()
  })
}

const getMentorInitials = (value: string) => value.slice(0, 2).toUpperCase()

const resolveMajorDirection = (option: AssignMentorOption) => {
  if (option.majorDirection) {
    return option.majorDirection.trim()
  }

  const [direction] = String(option.hint || '')
    .split('/')
    .map((item) => item.trim())
  return direction || ''
}
</script>

<style scoped lang="scss">
.job-overview-assign-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.job-overview-assign-modal__hero,
.assign-mentor-modal__hero {
  margin-bottom: 4px;
  background: #eff6ff;
  border-radius: 12px;
}

.job-overview-assign-modal__hero :deep(.ant-card-body) {
  padding: 16px 18px;
}

.student-card__avatar,
.job-overview-assign-modal__avatar,
.assign-mentor-modal__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.student-card__name {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.student-card__meta {
  margin-left: 6px;
  font-size: 12px;
  color: #64748b;
  font-weight: 400;
}

.student-card__sub {
  margin-top: 2px;
  font-size: 13px;
  color: #64748b;
}

.student-card__divider {
  margin: 12px 0;
  border-color: rgba(99, 102, 241, 0.2);
}

.student-grid__label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: #64748b;
}

.student-grid strong {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.student-grid__accent {
  color: #4f46e5;
}

.student-grid__success {
  color: #22c55e;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group--last {
  margin-bottom: 0;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.form-label__meta {
  margin-left: 4px;
  font-size: 12px;
  font-weight: 400;
  color: #94a3b8;
}

.job-overview-assign-modal__filters,
.filter-row {
  margin: 0;
}

.filter-hint,
.selection-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
}

.filter-hint strong,
.selection-hint strong {
  color: #4f46e5;
}

.job-overview-assign-modal__mentor-list,
.assign-mentor-modal__mentor-list,
.mentor-list {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.mentor-list :deep(.ant-list-item) {
  padding: 0;
  border: 0;
}

.mentor-item {
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f3f4f6;
}

.mentor-item:last-child {
  border-bottom: 0;
}

.mentor-item:hover {
  background: #eff6ff;
}

.mentor-item--selected {
  background: #f8faff;
}

.mentor-item--preferred {
  background: linear-gradient(145deg, rgba(238, 242, 255, 0.92), rgba(248, 250, 252, 0.96));
}

.mentor-item--preferred.mentor-item--selected {
  background: #f8faff;
}

.mentor-item__main {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
}

.mentor-item__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: #6366f1;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.mentor-item__copy {
  flex: 1;
  min-width: 0;
}

.mentor-item__name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.mentor-item__name strong {
  color: #0f172a;
}

.mentor-item__badge {
  font-size: 11px;
  margin-right: 0;
}

.mentor-item__sub {
  margin-top: 2px;
  font-size: 12px;
  color: #64748b;
}

.mentor-empty,
.job-overview-assign-modal__empty,
.assign-mentor-modal__empty {
  padding: 24px 0;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
}

.job-overview-assign-modal__note-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.job-overview-assign-modal__note-meta,
.assign-mentor-modal__note-meta {
  display: flex;
  justify-content: flex-end;
  color: #94a3b8;
  font-size: 12px;
}

@media (max-width: 640px) {
  .student-grid > .ant-col {
    width: 100%;
  }
}
</style>

