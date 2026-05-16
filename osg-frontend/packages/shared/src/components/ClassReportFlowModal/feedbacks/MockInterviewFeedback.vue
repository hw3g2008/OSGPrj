<template>
  <div class="mock-interview-feedback osg-modal-form" data-feedback="mock-interview">
    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.mockInterview.purposeLabel') }}</label>
      <a-textarea
        :value="payload.purpose"
        :rows="2"
        :placeholder="t('common.shared.classReport.mockInterview.purposePlaceholder')"
        @update:value="update('purpose', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.mockInterview.conceptsLabel') }}</label>
      <a-textarea
        :value="payload.concepts"
        :rows="2"
        :placeholder="t('common.shared.classReport.mockInterview.conceptsPlaceholder')"
        @update:value="update('concepts', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.mockInterview.improvementsLabel') }}</label>
      <a-textarea
        :value="payload.improvements"
        :rows="2"
        :placeholder="t('common.shared.classReport.mockInterview.improvementsPlaceholder')"
        @update:value="update('improvements', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.mockInterview.performanceLabel') }}</label>
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
      <label class="form-label">{{ t('common.shared.classReport.mockInterview.wishedToDoLabel') }}</label>
      <a-textarea
        :value="payload.wishedToDo"
        :rows="2"
        :placeholder="t('common.shared.classReport.mockInterview.wishedToDoPlaceholder')"
        @update:value="update('wishedToDo', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">{{ t('common.shared.classReport.mockInterview.narrativeLabel') }}</label>
      <a-textarea
        :value="payload.narrative"
        :rows="3"
        :placeholder="t('common.shared.classReport.mockInterview.narrativePlaceholder')"
        @update:value="update('narrative', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

export interface MockInterviewFeedbackPayload {
  schemaVersion: 1
  purpose: string
  concepts: string
  improvements: string
  performanceLevel: 'disappointing' | 'good' | 'great' | 'amazing' | ''
  wishedToDo: string
  narrative: string
}

const PERFORMANCE_OPTIONS = [
  { value: 'disappointing', emoji: '😞', label: 'common.shared.classReport.mockInterview.performance.disappointing' },
  { value: 'good', emoji: '🙂', label: 'common.shared.classReport.mockInterview.performance.good' },
  { value: 'great', emoji: '😊', label: 'common.shared.classReport.mockInterview.performance.great' },
  { value: 'amazing', emoji: '🌟', label: 'common.shared.classReport.mockInterview.performance.amazing' },
] as const

const props = defineProps<{
  modelValue?: Partial<MockInterviewFeedbackPayload>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: MockInterviewFeedbackPayload]
}>()

function defaults(): MockInterviewFeedbackPayload {
  return {
    schemaVersion: 1,
    purpose: '',
    concepts: '',
    improvements: '',
    performanceLevel: '',
    wishedToDo: '',
    narrative: '',
  }
}

const payload = computed<MockInterviewFeedbackPayload>(() => ({
  ...defaults(),
  ...(props.modelValue || {}),
  schemaVersion: 1,
}))

function update<K extends keyof MockInterviewFeedbackPayload>(
  key: K,
  value: MockInterviewFeedbackPayload[K],
) {
  emit('update:modelValue', { ...payload.value, [key]: value })
}
</script>

<style scoped lang="scss">
.mock-interview-feedback {
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
