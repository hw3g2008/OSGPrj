<template>
  <div class="step-reference osg-modal-form" data-step="reference">
    <!-- 关联申请分支：job_coaching / mock_interview / communication_test -->
    <template v-if="isReferenceBranch">
      <div class="form-group">
        <label class="form-label">关联类型</label>
        <a-radio-group
          :value="form.referenceType || referenceTypeFromCourse"
          :disabled="isReadonlyReference"
          @update:value="(v: ReferenceType) => onReferenceTypeChange(v)"
        >
          <a-radio v-for="opt in referenceTypeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </a-radio>
        </a-radio-group>
      </div>

      <div class="form-group">
        <label class="form-label">关联申请</label>
        <a-select
          :value="form.referenceId || undefined"
          :options="referenceOptions"
          :disabled="isReadonlyReference"
          :loading="referenceLoading"
          placeholder="请选择关联申请"
          :not-found-content="referenceEmptyText"
          @update:value="(v: number) => update('referenceId', Number(v))"
        />
        <div v-if="!referenceLoading && referenceOptions.length === 0" class="step-reference__empty">
          {{ referenceEmptyText }}
        </div>
      </div>
    </template>

    <!-- 基础课程分支：base_course -->
    <template v-else-if="courseType === 'base_course'">
      <div class="form-group">
        <label class="form-label">基础课程类别 <span class="required">*</span></label>
        <a-select
          :value="form.baseCourseCategory || undefined"
          :options="baseCategoryOptions"
          placeholder="请选择基础课程类别"
          @update:value="(v: BaseCategory) => update('baseCourseCategory', v)"
        />
      </div>

      <div
        v-if="form.baseCourseCategory === 'tech' || form.baseCourseCategory === 'behavior'"
        class="form-group"
      >
        <label class="form-label">主题选择</label>
        <BaseCourseTopicPicker
          :model-value="form.baseCourseTopics || []"
          :category="(form.baseCourseCategory as 'tech' | 'behavior')"
          @update:model-value="(v: string[]) => update('baseCourseTopics', v)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * S-055 §4A.1 / §3.2 Step 3：关联申请 / 基础课二级类型 + topic
 *
 * - reference 分支：通过 useReferenceFinder(end) 加载候选
 * - base_course 分支：渲染 BASE_CATEGORY_OPTIONS + BaseCourseTopicPicker (tech/behavior)
 * - readonlyFields 含 'reference' 时 reference select disabled
 */
import { computed, watch } from 'vue'
import {
  BASE_CATEGORY_OPTIONS,
} from '../../constants/classReport'
import { useReferenceFinder } from '../../composables/useReferenceFinder'
import type { ClassReportEnd } from '../../api/class-records'
import type {
  BaseCategory,
  ClassReportPayload,
  CourseType,
  ReferenceType,
} from '../../types/classReport'
import BaseCourseTopicPicker from './widgets/BaseCourseTopicPicker.vue'

interface Props {
  modelValue: ClassReportPayload
  courseType?: CourseType
  studentId?: number
  end: ClassReportEnd
  readonlyFields?: Array<keyof ClassReportPayload | 'student' | 'reference'>
}

const props = withDefaults(defineProps<Props>(), {
  courseType: undefined,
  studentId: 0,
  readonlyFields: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: ClassReportPayload]
}>()

const form = computed(() => props.modelValue)

const isReadonlyReference = computed(() =>
  (props.readonlyFields || []).includes('reference' as never),
)

const isReferenceBranch = computed(() =>
  props.courseType === 'job_coaching' ||
  props.courseType === 'mock_interview' ||
  props.courseType === 'communication_test',
)

// referenceType 选项按 courseType 过滤：job_coaching → job_coaching（指向 osg_coaching 阶段记录）；其它对齐 courseType
const referenceTypeOptions = computed<{ value: ReferenceType; label: string }[]>(() => {
  switch (props.courseType) {
    case 'job_coaching':
      return [{ value: 'job_coaching', label: '求职辅导申请' }]
    case 'mock_interview':
      return [{ value: 'mock_interview', label: '模拟面试' }]
    case 'communication_test':
      return [{ value: 'communication_test', label: '沟通测评' }]
    default:
      return []
  }
})

const referenceTypeFromCourse = computed<ReferenceType | undefined>(() => {
  const opts = referenceTypeOptions.value
  return opts.length > 0 ? opts[0].value : undefined
})

const baseCategoryOptions = computed(() =>
  BASE_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
)

const {
  references,
  loading: referenceLoading,
  refresh: refreshReferences,
} = useReferenceFinder(props.end)

const referenceOptions = computed(() =>
  (references.value || []).map((r) => ({
    label: r.label,
    value: r.referenceId,
    disabled: r.disabled,
  })),
)

const referenceEmptyText = computed(() => {
  if (!props.studentId || props.studentId <= 0) return '请先选择学员'
  return '暂无可关联的申请'
})

function update<K extends keyof ClassReportPayload>(
  key: K,
  value: ClassReportPayload[K],
): void {
  // D: 切换 baseCourseCategory 时如果不是 'resume' 类目，清掉 resumeSubType
  const patch: Partial<ClassReportPayload> = { [key]: value }
  if (key === 'baseCourseCategory' && value !== 'resume') {
    patch.resumeSubType = undefined
  }
  // 切走 tech/behavior 时清 baseCourseTopics
  if (key === 'baseCourseCategory' && value !== 'tech' && value !== 'behavior') {
    patch.baseCourseTopics = undefined
  }
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

function onReferenceTypeChange(next: ReferenceType): void {
  emit('update:modelValue', {
    ...props.modelValue,
    referenceType: next,
    referenceId: undefined,
  })
}

// 监听 studentId / referenceType 变化，刷新候选
watch(
  () => [
    props.studentId,
    props.modelValue.referenceType ?? referenceTypeFromCourse.value,
    props.courseType,
  ],
  ([sid, refType]) => {
    if (!isReferenceBranch.value) return
    void refreshReferences(Number(sid) || 0, (refType as ReferenceType) || undefined)
  },
  { immediate: true },
)

// radio 用 referenceTypeFromCourse 做 fallback 显示「已选」，但 formState.referenceType 不会被 set，
// 后端 referenceType=null + courseType=job_coaching 触发「课程类型与关联类型不一致」。
// courseType 变化时若 referenceType 未填，自动派生填入，与 UI radio 显示对齐。
watch(
  () => [props.courseType, isReferenceBranch.value],
  () => {
    if (!isReferenceBranch.value) return
    if (props.modelValue.referenceType) return
    const derived = referenceTypeFromCourse.value
    if (!derived) return
    emit('update:modelValue', { ...props.modelValue, referenceType: derived })
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.step-reference {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.step-reference__empty {
  font-size: 12px;
  color: #6b7280;
}
</style>
