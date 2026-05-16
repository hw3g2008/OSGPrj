<template>
  <div class="students-filter-bar" data-field-name="学员管理页">
    <div class="students-filter-bar__filters">
      <a-input
        v-model:value="draft.studentName"
        class="students-filter-bar__control students-filter-bar__control--name"
        data-field-name="搜索框"
        :placeholder="t('admin.students.filterBar.placeholders.name')"
        allow-clear
        @pressEnter="emitSearch"
        @clear="handleClearText('studentName')"
      />
      <a-select
        v-model:value="draft.leadMentorId"
        class="students-filter-bar__control students-filter-bar__control--select"
        data-field-name="班主任"
        :placeholder="t('admin.students.filterBar.placeholders.leadMentor')"
        allow-clear
        :options="mentorOptions"
        @change="handleSelectChange('leadMentorId', $event)"
        @clear="handleSelectChange('leadMentorId', undefined)"
      />
      <a-select
        v-model:value="draft.school"
        class="students-filter-bar__control students-filter-bar__control--school"
        data-field-name="学校"
        :placeholder="t('admin.students.filterBar.placeholders.school')"
        allow-clear
        :options="schoolOptions"
        @change="handleSelectChange('school', $event)"
        @clear="handleSelectChange('school', undefined)"
      />
      <a-select
        v-model:value="draft.graduationYear"
        class="students-filter-bar__control students-filter-bar__control--select"
        data-field-name="毕业年份"
        :placeholder="t('admin.students.filterBar.placeholders.graduationYear')"
        allow-clear
        :options="graduationYearOptions"
        @change="handleSelectChange('graduationYear', $event)"
        @clear="handleSelectChange('graduationYear', undefined)"
      />
      <a-select
        v-model:value="draft.recruitmentCycle"
        class="students-filter-bar__control students-filter-bar__control--select"
        data-field-name="项目时间"
        :placeholder="t('admin.students.filterBar.placeholders.recruitmentCycle')"
        allow-clear
        :options="recruitmentCycleOptions"
        @change="handleSelectChange('recruitmentCycle', $event)"
        @clear="handleSelectChange('recruitmentCycle', undefined)"
      />
      <a-select
        v-model:value="draft.majorDirection"
        class="students-filter-bar__control students-filter-bar__control--select"
        data-field-name="主攻方向"
        :placeholder="t('admin.students.filterBar.placeholders.majorDirection')"
        allow-clear
        :options="majorDirectionOptions"
        @change="handleSelectChange('majorDirection', $event)"
        @clear="handleSelectChange('majorDirection', undefined)"
      />
      <a-select
        v-model:value="draft.accountStatus"
        class="students-filter-bar__control students-filter-bar__control--select"
        data-field-name="账号状态"
        :placeholder="t('admin.students.filterBar.placeholders.accountStatus')"
        allow-clear
        :options="statusOptions"
        @change="handleSelectChange('accountStatus', $event)"
        @clear="handleSelectChange('accountStatus', undefined)"
      />
    </div>
    <div class="students-filter-bar__actions">
      <a-button type="primary" @click="emitSearch">
        <template #icon><SearchOutlined /></template>
        {{ t('admin.students.filterBar.buttons.search') }}
      </a-button>
      <a-button @click="handleReset">{{ t('admin.students.filterBar.buttons.reset') }}</a-button>
      <a-button :loading="props.exporting" @click="handleExportClick">
        <template #icon><ExportOutlined /></template>
        {{ t('admin.students.filterBar.buttons.export') }}
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SearchOutlined, ExportOutlined } from '@ant-design/icons-vue'

const { t } = useI18n()

type FilterValue = string | number | undefined

interface FilterOption {
  label: string
  value: string | number
}

interface StudentFilterModel {
  studentName?: string
  leadMentorId?: number
  school?: string
  graduationYear?: number
  recruitmentCycle?: string
  majorDirection?: string
  accountStatus?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: StudentFilterModel
    mentorOptions?: FilterOption[]
    schoolOptions?: FilterOption[]
    graduationYearOptions?: FilterOption[]
    recruitmentCycleOptions?: FilterOption[]
    majorDirectionOptions?: FilterOption[]
    exporting?: boolean
  }>(),
  {
    mentorOptions: () => [],
    schoolOptions: () => [],
    graduationYearOptions: () => [],
    recruitmentCycleOptions: () => [],
    majorDirectionOptions: () => [],
    exporting: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: StudentFilterModel]
  search: []
  export: []
}>()

const draft = reactive<StudentFilterModel>({})

const statusOptions = computed(() => [
  { label: t('admin.students.filterBar.status.normal'), value: '0' },
  { label: t('admin.students.filterBar.status.frozen'), value: '1' },
  { label: t('admin.students.filterBar.status.ended'), value: '2' },
  { label: t('admin.students.filterBar.status.refunded'), value: '3' },
])

const syncDraft = (source: StudentFilterModel) => {
  draft.studentName = source.studentName ?? undefined
  draft.leadMentorId = source.leadMentorId ?? undefined
  draft.school = source.school ?? undefined
  draft.graduationYear = source.graduationYear ?? undefined
  draft.recruitmentCycle = source.recruitmentCycle ?? undefined
  draft.majorDirection = source.majorDirection ?? undefined
  draft.accountStatus = source.accountStatus ?? undefined
}

watch(
  () => props.modelValue,
  (value) => {
    syncDraft(value)
  },
  { deep: true, immediate: true }
)

const emitValue = () => {
  emit('update:modelValue', {
    studentName: normalizeText(draft.studentName),
    leadMentorId: draft.leadMentorId,
    school: normalizeText(draft.school),
    graduationYear: draft.graduationYear,
    recruitmentCycle: normalizeText(draft.recruitmentCycle),
    majorDirection: normalizeText(draft.majorDirection),
    accountStatus: normalizeText(draft.accountStatus)
  })
}

const emitSearch = () => {
  emitValue()
  emit('search')
}

const handleSelectChange = (field: keyof StudentFilterModel, value: FilterValue) => {
  draft[field] = value as never
}

const handleClearText = (field: keyof StudentFilterModel) => {
  draft[field] = undefined as never
}

const handleReset = () => {
  syncDraft({})
  emitSearch()
}

const handleExportClick = () => {
  emit('export')
}

const normalizeText = (value?: string) => {
  if (!value) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}
</script>

<style scoped lang="scss">
.students-filter-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.students-filter-bar__filters {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.students-filter-bar__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

.students-filter-bar__control {
  flex: 0 0 auto;
}

.students-filter-bar__control--name {
  width: 160px;
}

.students-filter-bar__control--school {
  width: 140px;
}

.students-filter-bar__control--select {
  width: auto;
  min-width: max-content;
}

@media (max-width: 1200px) {
  .students-filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .students-filter-bar__actions {
    justify-content: flex-end;
  }
}

@media (max-width: 960px) {
  .students-filter-bar {
    padding: 16px;
  }

  .students-filter-bar__control--name,
  .students-filter-bar__control--school,
  .students-filter-bar__control--select {
    width: 120px;
  }
}
</style>
