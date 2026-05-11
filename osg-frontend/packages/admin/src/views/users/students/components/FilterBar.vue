<template>
  <div class="students-filter-bar" data-field-name="学员管理页">
    <div class="students-filter-bar__filters">
      <a-input
        v-model:value="draft.studentName"
        class="students-filter-bar__control students-filter-bar__control--name"
        data-field-name="搜索框"
        placeholder="搜索姓名"
        allow-clear
        @pressEnter="emitSearch"
        @clear="handleClearText('studentName')"
      />
      <a-select
        v-model:value="draft.leadMentorId"
        class="students-filter-bar__control students-filter-bar__control--select"
        data-field-name="班主任"
        placeholder="班主任"
        allow-clear
        :options="mentorOptions"
        @change="handleSelectChange('leadMentorId', $event)"
        @clear="handleSelectChange('leadMentorId', undefined)"
      />
      <a-select
        v-model:value="draft.school"
        class="students-filter-bar__control students-filter-bar__control--school"
        data-field-name="学校"
        placeholder="学校"
        allow-clear
        :options="schoolOptions"
        @change="handleSelectChange('school', $event)"
        @clear="handleSelectChange('school', undefined)"
      />
      <a-select
        v-model:value="draft.graduationYear"
        class="students-filter-bar__control students-filter-bar__control--select"
        data-field-name="毕业年份"
        placeholder="毕业年份"
        allow-clear
        :options="graduationYearOptions"
        @change="handleSelectChange('graduationYear', $event)"
        @clear="handleSelectChange('graduationYear', undefined)"
      />
      <a-select
        v-model:value="draft.recruitmentCycle"
        class="students-filter-bar__control students-filter-bar__control--select"
        data-field-name="项目时间"
        placeholder="项目时间"
        allow-clear
        :options="recruitmentCycleOptions"
        @change="handleSelectChange('recruitmentCycle', $event)"
        @clear="handleSelectChange('recruitmentCycle', undefined)"
      />
      <a-select
        v-model:value="draft.majorDirection"
        class="students-filter-bar__control students-filter-bar__control--select"
        data-field-name="主攻方向"
        placeholder="主攻方向"
        allow-clear
        :options="majorDirectionOptions"
        @change="handleSelectChange('majorDirection', $event)"
        @clear="handleSelectChange('majorDirection', undefined)"
      />
      <a-select
        v-model:value="draft.accountStatus"
        class="students-filter-bar__control students-filter-bar__control--select"
        data-field-name="账号状态"
        placeholder="账号状态"
        allow-clear
        :options="statusOptions"
        @change="handleSelectChange('accountStatus', $event)"
        @clear="handleSelectChange('accountStatus', undefined)"
      />
    </div>
    <div class="students-filter-bar__actions">
      <a-button type="primary" @click="emitSearch">
        <template #icon><SearchOutlined /></template>
        搜索
      </a-button>
      <a-button @click="handleReset">重置</a-button>
      <a-button :loading="props.exporting" @click="handleExportClick">
        <template #icon><ExportOutlined /></template>
        导出
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { SearchOutlined, ExportOutlined } from '@ant-design/icons-vue'

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
  // 仅更新本地草稿；用户点搜索按钮才提交查询，避免多条件场景下连续触发
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
