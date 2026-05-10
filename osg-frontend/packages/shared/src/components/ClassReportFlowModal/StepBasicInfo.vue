<template>
  <div class="step-basic-info osg-modal-form" data-step="basic-info">
    <div class="form-group">
      <label class="form-label">学员 <span class="required">*</span></label>
      <a-select
        :value="form.studentId || undefined"
        :options="studentOptions"
        :disabled="disabledStudent || isReadonlyStudent"
        :loading="loading"
        placeholder="请选择学员"
        :not-found-content="emptyText"
        @update:value="(v: number) => update('studentId', Number(v))"
      />
      <div v-if="isStudentEmpty && !loading" class="step-basic-info__empty">
        {{ emptyText }}
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">上课日期 <span class="required">*</span></label>
      <a-date-picker
        :value="form.classDate || undefined"
        value-format="YYYY-MM-DD"
        format="YYYY-MM-DD"
        placeholder="请选择上课日期"
        style="width: 100%"
        @update:value="(v: string) => update('classDate', v || '')"
      />
    </div>

    <div class="form-group">
      <label class="form-label">课时时长（小时） <span class="required">*</span></label>
      <a-input-number
        :value="form.durationHours"
        :min="0.5"
        :max="24"
        :step="0.5"
        style="width: 100%"
        @update:value="(v: number) => update('durationHours', Number(v))"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * S-055 §4A.1 / §3.2 Step 1：基本信息
 *
 * - 学员下拉来自 useStudentScopeFinder(end)；空时显示空状态文案
 * - 上课日期、时长：直接 emit update:modelValue 增量
 * - readonlyFields 包含 'student' 时学员选择器 disabled
 */
import { computed } from 'vue'
import type { ClassReportPayload, StudentOption } from '../../types/classReport'

interface Props {
  modelValue: ClassReportPayload
  students: StudentOption[]
  disabledStudent?: boolean
  loading?: boolean
  emptyText?: string
  readonlyFields?: Array<keyof ClassReportPayload | 'student' | 'reference'>
}

const props = withDefaults(defineProps<Props>(), {
  disabledStudent: false,
  loading: false,
  emptyText: '当前账号暂无可上报学员',
  readonlyFields: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: ClassReportPayload]
  validate: [ok: boolean]
}>()

const form = computed(() => props.modelValue)

const isReadonlyStudent = computed(() =>
  (props.readonlyFields || []).includes('student' as never),
)

const isStudentEmpty = computed(() => (props.students || []).length === 0)

function buildStudentLabel(s: StudentOption): string {
  const status = s.accountStatus
  if (status === '1') return `${s.studentName}（冻结，不可申报）`
  if (status === '3') return `${s.studentName}（已退费，不可申报）`
  if (status === '2') return `${s.studentName}（已结束）`
  return s.studentName
}

const studentOptions = computed(() =>
  (props.students || []).map((s) => ({
    label: buildStudentLabel(s),
    value: s.studentId,
    disabled: s.disabled || s.accountStatus === '1' || s.accountStatus === '3',
  })),
)

function update<K extends keyof ClassReportPayload>(
  key: K,
  value: ClassReportPayload[K],
): void {
  const next: ClassReportPayload = { ...props.modelValue, [key]: value }
  emit('update:modelValue', next)
  emit(
    'validate',
    !!next.studentId && next.studentId > 0 && !!next.classDate && !!next.durationHours,
  )
}
</script>

<style scoped lang="scss">
.step-basic-info {
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

.step-basic-info__empty {
  font-size: 12px;
  color: #6b7280;
}
</style>
