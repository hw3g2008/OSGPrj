<template>
  <div class="students-filter-bar">
    <div class="students-filter-bar__filters">
      <a-input
        v-model:value="draft.studentName"
        class="students-filter-bar__control students-filter-bar__control--name"
        placeholder="搜索姓名"
        allow-clear
        @pressEnter="emitSearch"
        @clear="handleClearText('studentName')"
      />
      <a-select
        v-model:value="draft.leadMentorId"
        class="students-filter-bar__control students-filter-bar__control--select"
        placeholder="班主任"
        allow-clear
        :options="mentorOptions"
        @change="handleSelectChange('leadMentorId', $event)"
        @clear="handleSelectChange('leadMentorId', undefined)"
      />
      <a-select
        v-model:value="draft.school"
        class="students-filter-bar__control students-filter-bar__control--school"
        placeholder="学校"
        allow-clear
        :options="schoolOptions"
        @change="handleSelectChange('school', $event)"
        @clear="handleSelectChange('school', undefined)"
      />
      <a-select
        v-model:value="draft.graduationYear"
        class="students-filter-bar__control students-filter-bar__control--select"
        placeholder="毕业年份"
        allow-clear
        :options="graduationYearOptions"
        @change="handleSelectChange('graduationYear', $event)"
        @clear="handleSelectChange('graduationYear', undefined)"
      />
      <a-select
        v-model:value="draft.recruitmentCycle"
        class="students-filter-bar__control students-filter-bar__control--select"
        placeholder="项目时间"
        allow-clear
        :options="recruitmentCycleOptions"
        @change="handleSelectChange('recruitmentCycle', $event)"
        @clear="handleSelectChange('recruitmentCycle', undefined)"
      />
      <a-select
        v-model:value="draft.majorDirection"
        class="students-filter-bar__control students-filter-bar__control--select"
        placeholder="主攻方向"
        allow-clear
        :options="majorDirectionOptions"
        @change="handleSelectChange('majorDirection', $event)"
        @clear="handleSelectChange('majorDirection', undefined)"
      />
      <a-select
        v-model:value="draft.accountStatus"
        class="students-filter-bar__control students-filter-bar__control--select"
        placeholder="账号状态"
        allow-clear
        :options="statusOptions"
        @change="handleSelectChange('accountStatus', $event)"
        @clear="handleSelectChange('accountStatus', undefined)"
      />
    </div>
    <div class="students-filter-bar__actions">
      <button type="button" class="filter-action-button filter-action-button--primary" @click="emitSearch">
        <i class="mdi mdi-magnify" aria-hidden="true"></i>
        <span>搜索</span>
      </button>
      <button type="button" class="filter-action-button filter-action-button--secondary" @click="handleReset">
        <i class="mdi mdi-refresh" aria-hidden="true"></i>
        <span>重置</span>
      </button>
      <button type="button" class="filter-action-button filter-action-button--secondary" @click="emit('export')">
        <i class="mdi mdi-download" aria-hidden="true"></i>
        <span>导出</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

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
  }>(),
  {
    mentorOptions: () => [],
    schoolOptions: () => [],
    graduationYearOptions: () => [],
    recruitmentCycleOptions: () => [],
    majorDirectionOptions: () => []
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: StudentFilterModel]
  search: []
  export: []
}>()

const draft = reactive<StudentFilterModel>({})

const statusOptions: FilterOption[] = [
  { label: '正常', value: '0' },
  { label: '冻结', value: '1' },
  { label: '已结束', value: '2' },
  { label: '退费', value: '3' }
]

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
  emitSearch()
}

const handleClearText = (field: keyof StudentFilterModel) => {
  draft[field] = undefined as never
  emitSearch()
}

const handleReset = () => {
  syncDraft({})
  emitSearch()
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
  gap: 16px;
  padding: 20px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
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
  width: 140px;
}

// 筛选操作按钮
.filter-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 88px;
  height: 36px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  i {
    font-size: 16px;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.filter-action-button--primary {
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
  border-color: #7c3aed;
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(124, 58, 237, 0.2);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%);
    border-color: #6d28d9;
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
  }
}

.filter-action-button--secondary {
  background: #ffffff;
  border-color: #d1d5db;
  color: var(--text);

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
    color: var(--text);
  }
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
