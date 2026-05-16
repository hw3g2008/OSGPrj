<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="modal-assign-mentor"
    width="720px"
    :body-class="['job-overview-assign-modal__body', 'assign-mentor-modal__body', 'osg-modal-form']"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-account-plus-outline" aria-hidden="true"></span>
        <span>{{ t('admin.career.jobOverview.assignMentor.title') }}</span>
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
            {{ row?.studentName || t('admin.career.jobOverview.assignMentor.unassigned') }}
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
          <span class="student-grid__label">{{ t('admin.career.jobOverview.assignMentor.suggested') }}</span>
          <strong class="student-grid__accent">{{ t('admin.career.jobOverview.assignMentor.mentorsUnit', { count: requestedCount }) }}</strong>
        </a-col>
        <a-col :xs="24" :sm="12">
          <span class="student-grid__label">{{ t('admin.career.jobOverview.assignMentor.preferredMentor') }}</span>
          <strong class="student-grid__success">{{ preferredMentorLabel }}</strong>
        </a-col>
      </a-row>
    </a-card>

    <div class="form-group">
      <div class="form-label">{{ t('admin.career.jobOverview.assignMentor.filterMentors') }}</div>
      <a-row
        :gutter="[12, 12]"
        class="job-overview-assign-modal__filters filter-row"
      >
        <a-col :xs="24" :sm="12" :md="8">
          <a-select
            v-model:value="scope"
            :placeholder="t('admin.career.jobOverview.assignMentor.allScopes')"
            allow-clear
            style="width:100%"
            :options="scopeOptions"
            data-field-name="排期状态筛选" <!-- i18n-skip-line: playwright selector -->
            data-field-name-alias="分配导师弹窗排期状态筛选" <!-- i18n-skip-line: playwright selector -->
          />
        </a-col>
        <a-col :xs="24" :sm="12" :md="8">
          <a-select
            v-model:value="majorDirection"
            :placeholder="t('admin.career.jobOverview.assignMentor.allDirections')"
            allow-clear
            style="width:100%"
            :options="majorDirectionOptions"
            data-field-name="主攻方向筛选" <!-- i18n-skip-line: playwright selector -->
            data-field-name-alias="分配导师弹窗主攻方向筛选" <!-- i18n-skip-line: playwright selector -->
          />
        </a-col>
        <a-col :xs="24" :sm="24" :md="8">
          <a-input
            v-model:value="keyword"
            :placeholder="t('admin.career.jobOverview.assignMentor.searchMentor')"
            allow-clear
            data-field-name="导师搜索" <!-- i18n-skip-line: playwright selector -->
            data-field-name-alias="分配导师弹窗导师搜索" <!-- i18n-skip-line: playwright selector -->
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>
        </a-col>
      </a-row>
      <div class="filter-hint">
        <FilterOutlined />
        {{ t('admin.career.jobOverview.assignMentor.foundMentors', { count: filteredMentorOptions.length }) }}
      </div>
    </div>

    <div class="form-group">
      <div class="form-label">
        {{ t('admin.career.jobOverview.assignMentor.selectMentors') }}
        <span class="form-label__meta">({{ t('admin.career.jobOverview.assignMentor.multiSelect') }})</span>
      </div>
      <a-empty
        v-if="!filteredMentorOptions.length"
        :description="t('admin.career.jobOverview.assignMentor.noMentors')"
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
                :data-field-name-alias="`分配导师弹窗${item.mentorName}`" <!-- i18n-skip-line: playwright selector -->
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
                  >{{ t('admin.career.jobOverview.assignMentor.preferredMentor') }}</a-tag>
                </div>
                <div class="mentor-item__sub">{{ item.hint || t('admin.career.jobOverview.assignMentor.available') }}</div>
              </div>
            </div>
          </a-list-item>
        </template>
      </a-list>
      <div class="selection-hint">
        <InfoCircleOutlined />
        {{ t('admin.career.jobOverview.assignMentor.selectedMentors', { count: selectedMentorIds.length }) }}
      </div>
    </div>

    <div
      class="form-group form-group--last job-overview-assign-modal__note-field"
      data-field-name="备注" <!-- i18n-skip-line: playwright selector -->
      data-field-name-alias="分配导师弹窗备注" <!-- i18n-skip-line: playwright selector -->
    >
      <div class="form-label">
        {{ t('admin.career.jobOverview.assignMentor.note') }}
        <span class="form-label__meta">({{ t('admin.career.jobOverview.assignMentor.optional') }})</span>
      </div>
      <a-textarea
        v-model:value="assignNote"
        data-field-name="备注" <!-- i18n-skip-line: playwright selector -->
        data-field-name-alias="分配导师弹窗备注" <!-- i18n-skip-line: playwright selector -->
        :rows="3"
        :maxlength="160"
        :placeholder="t('admin.career.jobOverview.assignMentor.notePlaceholder')"
      />
      <div class="job-overview-assign-modal__note-meta assign-mentor-modal__note-meta">
        <span>{{ assignNote.length }}/160</span>
      </div>
    </div>

    <template #footer>
      <a-button @click="handleClose">{{ t('admin.career.jobOverview.assignMentor.cancel') }}</a-button>
      <a-button
        type="primary"
        :disabled="submitting || !selectedMentorIds.length"
        @click="handleSubmit"
      >
        {{ submitting ? t('admin.career.jobOverview.assignMentor.submitting') : t('admin.career.jobOverview.assignMentor.confirm') }}
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
import { i18n } from '@osg/shared'
import { OverlaySurfaceModal } from '@osg/shared/components'
import type { UnassignedJobOverviewRow, UnassignedCoachingRow } from '@osg/shared/api/admin/jobOverview'

const t = (key: string, named?: Record<string, unknown>) =>
  named
    ? (i18n.global.t as unknown as (k: string, n: Record<string, unknown>) => string)(key, named)
    : (i18n.global.t as unknown as (k: string) => string)(key)

interface AssignMentorOption {
  mentorId: number
  mentorName: string
  preferred: boolean
  hint?: string
  majorDirection?: string
}

const props = withDefaults(defineProps<{
  visible: boolean
  row?: UnassignedJobOverviewRow | UnassignedCoachingRow | null
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
  { value: 'preferred', label: t('admin.career.jobOverview.assignMentor.preferredMentor') },
  { value: 'recommended', label: t('admin.career.jobOverview.assignMentor.recommended') }
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
  const value = props.row?.studentName || t('admin.career.jobOverview.assignMentor.student')
  return value.slice(0, 2).toUpperCase()
})

const requestedCount = computed(() => props.row?.requestedMentorCount || 1)
const preferredMentorLabel = computed(() => props.row?.preferredMentorNames || t('admin.career.jobOverview.assignMentor.noPreferredMentor'))

const filteredMentorOptions = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  return props.mentorOptions.filter((option) => {
    if (scope.value === 'preferred' && !option.preferred) {
      return false
    }
    if (scope.value === 'recommended' && option.hint !== t('admin.career.jobOverview.assignMentor.recommended')) {
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
    message.warning(t('admin.career.jobOverview.assignMentor.selectAtLeastOne'))
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
