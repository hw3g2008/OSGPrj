<template>
  <div class="mock-interview-feedback osg-modal-form" data-feedback="mock-interview">
    <div class="form-group">
      <label class="form-label">模拟面试的目的是什么？</label>
      <a-textarea
        :value="payload.purpose"
        :rows="2"
        placeholder="请描述本次模拟面试的目的..."
        @update:value="update('purpose', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">这次课程主要研究了哪些概念和主题？</label>
      <a-textarea
        :value="payload.concepts"
        :rows="2"
        placeholder="请列出本次课程涉及的概念和主题..."
        @update:value="update('concepts', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">这名学生哪科考的不好？</label>
      <a-textarea
        :value="payload.improvements"
        :rows="2"
        placeholder="请描述学员需要改进的方面..."
        @update:value="update('improvements', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">您如何评价这名学生的表现？</label>
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
          {{ opt.label }}
        </a-radio>
      </a-radio-group>
    </div>

    <div class="form-group">
      <label class="form-label">希望做但没做的事情</label>
      <a-textarea
        :value="payload.wishedToDo"
        :rows="2"
        placeholder="请描述本次模拟面试中希望做但没有做的事情..."
        @update:value="update('wishedToDo', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">补充说明（narrative）</label>
      <a-textarea
        :value="payload.narrative"
        :rows="3"
        placeholder="可选：进一步补充本次课程反馈..."
        @update:value="update('narrative', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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
  { value: 'disappointing', emoji: '😞', label: '令人失望' },
  { value: 'good', emoji: '🙂', label: '好的' },
  { value: 'great', emoji: '😊', label: '伟大的' },
  { value: 'amazing', emoji: '🌟', label: '真棒' },
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
