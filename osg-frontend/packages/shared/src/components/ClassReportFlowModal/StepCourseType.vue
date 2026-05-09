<template>
  <div class="step-course-type osg-modal-form" data-step="course-type">
    <div class="form-group">
      <label class="form-label">课程类型 <span class="required">*</span></label>
      <a-radio-group
        :value="modelValue"
        :disabled="disabled || readonly"
        @update:value="onChange"
      >
        <a-radio
          v-for="opt in COURSE_TYPE_OPTIONS"
          :key="opt.value"
          :value="opt.value"
          :data-course-type="opt.value"
        >
          {{ opt.label }}
        </a-radio>
      </a-radio-group>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * S-055 §4A.1 / §3.2 Step 2：课程类型 5 选 1
 *
 * - 选项来自 shared/constants/classReport.ts 的 COURSE_TYPE_OPTIONS
 * - readonly/disabled 时 RadioGroup 禁用但仍显示已选值
 * - emit change(next, prev) 给父组件清理不适用 reference/baseCourse 字段
 */
import { COURSE_TYPE_OPTIONS } from '../../constants/classReport'
import type { CourseType } from '../../types/classReport'

interface Props {
  modelValue?: CourseType
  disabled?: boolean
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  disabled: false,
  readonly: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: CourseType]
  change: [next: CourseType, prev?: CourseType]
}>()

function onChange(value: CourseType): void {
  const prev = props.modelValue
  emit('update:modelValue', value)
  emit('change', value, prev)
}
</script>

<style scoped lang="scss">
.step-course-type {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.required {
  color: #ef4444;
  margin-left: 2px;
}

:deep(.ant-radio-wrapper) {
  margin-right: 16px;
  margin-bottom: 8px;
}
</style>
