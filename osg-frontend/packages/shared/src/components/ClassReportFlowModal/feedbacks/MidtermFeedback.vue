<template>
  <div class="midterm-feedback osg-modal-form" data-feedback="midterm">
    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.midterm.scoreLabel') }}</label>
      <a-input-number
        :value="payload.score"
        :min="0"
        :max="100"
        :step="1"
        placeholder="0"
        style="width: 160px"
        @update:value="updateScore($event)"
      />
      <div v-if="scoreError" class="form-error">{{ scoreError }}</div>
    </div>

    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.midterm.questionAnalysisLabel') }}</label>
      <a-textarea
        :value="payload.questionAnalysis"
        :rows="4"
        :placeholder="t('common.shared.classReport.midterm.questionAnalysisPlaceholder')"
        @update:value="update('questionAnalysis', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.midterm.progressLabel') }}</label>
      <a-radio-group
        :value="payload.progress"
        @update:value="update('progress', $event)"
      >
        <a-radio
          v-for="opt in PROGRESS_OPTIONS"
          :key="opt.value"
          :value="opt.value"
          class="progress-option"
        >
          {{ t(opt.label) }}
        </a-radio>
      </a-radio-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

export type MidtermProgressLevel =
  | 'level1'
  | 'level2'
  | 'level3'
  | 'level4'
  | 'level5'
  | ''

export interface MidtermFeedbackPayload {
  schemaVersion: 1
  score: number | null
  questionAnalysis: string
  progress: MidtermProgressLevel
}

const PROGRESS_OPTIONS: Array<{ value: MidtermProgressLevel; label: string }> = [
  { value: 'level1', label: 'common.shared.classReport.midterm.progress.level1' },
  { value: 'level2', label: 'common.shared.classReport.midterm.progress.level2' },
  { value: 'level3', label: 'common.shared.classReport.midterm.progress.level3' },
  { value: 'level4', label: 'common.shared.classReport.midterm.progress.level4' },
  { value: 'level5', label: 'common.shared.classReport.midterm.progress.level5' },
]

const props = defineProps<{
  modelValue?: Partial<MidtermFeedbackPayload>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: MidtermFeedbackPayload]
}>()

function defaults(): MidtermFeedbackPayload {
  return {
    schemaVersion: 1,
    score: null,
    questionAnalysis: '',
    progress: '',
  }
}

const payload = computed<MidtermFeedbackPayload>(() => ({
  ...defaults(),
  ...(props.modelValue || {}),
  schemaVersion: 1,
}))

const scoreError = ref('')

function update<K extends keyof MidtermFeedbackPayload>(
  key: K,
  value: MidtermFeedbackPayload[K],
) {
  emit('update:modelValue', { ...payload.value, [key]: value })
}

function updateScore(value: number | null) {
  if (value === null || value === undefined || value === ('' as unknown as number)) {
    scoreError.value = ''
    update('score', null)
    return
  }
  const num = Number(value)
  if (Number.isNaN(num)) {
    scoreError.value = t('common.shared.classReport.midterm.errors.invalidNumber')
    return
  }
  if (num < 0 || num > 100) {
    scoreError.value = t('common.shared.classReport.midterm.errors.scoreRange')
    return
  }
  scoreError.value = ''
  update('score', num)
}

watch(
  () => payload.value.score,
  (val) => {
    if (val !== null && val !== undefined && (val < 0 || val > 100)) {
      scoreError.value = t('common.shared.classReport.midterm.errors.scoreRange')
    } else {
      scoreError.value = ''
    }
  },
)
</script>

<style scoped lang="scss">
.midterm-feedback {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.form-error {
  font-size: 12px;
  color: #dc2626;
}

.progress-option {
  margin-right: 12px;
}
</style>
