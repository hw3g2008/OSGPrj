<template>
  <div class="step-basic-info osg-modal-form" data-step="basic-info">
    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.basic.studentLabel') }} <span class="required">*</span></label>
      <a-select
        :value="form.studentId || undefined"
        :options="studentOptions"
        :disabled="disabledStudent || isReadonlyStudent"
        :loading="loading"
        :placeholder="t('common.shared.classReport.basic.studentPlaceholder')"
        :not-found-content="resolvedEmptyText"
        @update:value="(v: number) => update('studentId', Number(v))"
      />
      <div v-if="isStudentEmpty && !loading" class="step-basic-info__empty">
        {{ resolvedEmptyText }}
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.basic.dateLabel') }} <span class="required">*</span></label>
      <a-date-picker
        :value="form.classDate || undefined"
        value-format="YYYY-MM-DD"
        format="YYYY-MM-DD"
        :placeholder="t('common.shared.classReport.basic.datePlaceholder')"
        style="width: 100%"
        @update:value="(v: string) => update('classDate', v || '')"
      />
    </div>

    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.basic.durationLabel') }} <span class="required">*</span></label>
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
import { useI18n } from 'vue-i18n'
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
  emptyText: '',
  readonlyFields: () => [],
})

const { t } = useI18n()
const resolvedEmptyText = computed(() => props.emptyText || t('common.shared.classReport.basic.studentEmpty'))

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
  if (status === '1') return t('common.shared.classReport.basic.studentLabelFrozen', { name: s.studentName })
  if (status === '3') return t('common.shared.classReport.basic.studentLabelRefunded', { name: s.studentName })
  if (status === '2') return t('common.shared.classReport.basic.studentLabelEnded', { name: s.studentName })
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
