<template>
  <div class="job-coaching-feedback osg-modal-form" data-feedback="job-coaching">
    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.jobCoaching.purposeLabel') }}</label>
      <a-textarea
        :value="payload.purpose"
        :rows="2"
        :placeholder="t('common.shared.classReport.jobCoaching.purposePlaceholder')"
        @update:value="update('purpose', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.jobCoaching.conceptsLabel') }}</label>
      <a-textarea
        :value="payload.concepts"
        :rows="2"
        :placeholder="t('common.shared.classReport.jobCoaching.conceptsPlaceholder')"
        @update:value="update('concepts', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.jobCoaching.improvementsLabel') }}</label>
      <a-textarea
        :value="payload.improvements"
        :rows="2"
        :placeholder="t('common.shared.classReport.jobCoaching.improvementsPlaceholder')"
        @update:value="update('improvements', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.jobCoaching.performanceLabel') }}</label>
      <a-radio-group
        :value="payload.performanceLevel"
        @update:value="update('performanceLevel', $event)"
      >
        <a-radio
          v-for="opt in PERFORMANCE_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          <span class="performance-option__emoji">{{ opt.emoji }}</span>
          {{ t(opt.label) }}
        </a-radio>
      </a-radio-group>
    </div>

    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.jobCoaching.narrativeLabel') }}</label>
      <a-textarea
        :value="payload.narrative"
        :rows="3"
        :placeholder="t('common.shared.classReport.jobCoaching.narrativePlaceholder')"
        @update:value="update('narrative', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

export interface JobCoachingFeedbackPayload {
  schemaVersion: 1
  purpose: string
  concepts: string
  improvements: string
  performanceLevel: 'disappointing' | 'good' | 'great' | 'amazing' | ''
  narrative: string
}

const PERFORMANCE_OPTIONS = [
  { value: 'disappointing', emoji: '😞', label: 'common.shared.classReport.jobCoaching.performance.disappointing' },
  { value: 'good', emoji: '🙂', label: 'common.shared.classReport.jobCoaching.performance.good' },
  { value: 'great', emoji: '😊', label: 'common.shared.classReport.jobCoaching.performance.great' },
  { value: 'amazing', emoji: '🌟', label: 'common.shared.classReport.jobCoaching.performance.amazing' },
] as const

const props = defineProps<{
  modelValue?: Partial<JobCoachingFeedbackPayload>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: JobCoachingFeedbackPayload]
}>()

function defaults(): JobCoachingFeedbackPayload {
  return {
    schemaVersion: 1,
    purpose: '',
    concepts: '',
    improvements: '',
    performanceLevel: '',
    narrative: '',
  }
}

const payload = computed<JobCoachingFeedbackPayload>(() => ({
  ...defaults(),
  ...(props.modelValue || {}),
  schemaVersion: 1,
}))

function update<K extends keyof JobCoachingFeedbackPayload>(
  key: K,
  value: JobCoachingFeedbackPayload[K],
) {
  emit('update:modelValue', { ...payload.value, [key]: value })
}
</script>

<style scoped lang="scss">
.job-coaching-feedback {
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

.performance-option__emoji {
  margin-right: 4px;
}
</style>
