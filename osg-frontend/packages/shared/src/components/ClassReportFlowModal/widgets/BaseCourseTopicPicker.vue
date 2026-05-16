<template>
  <div class="base-course-topic-picker osg-modal-form">
    <template v-if="category === 'tech'">
      <div class="base-course-topic-picker__group">
        <div class="base-course-topic-picker__title">{{ t('common.shared.classReport.topicPicker.techRequiredTitle') }}</div>
        <MultiSelect
          :value="selected"
          :options="techRequiredOptions"
          :disabled="disabled"
          :placeholder="t('common.shared.classReport.topicPicker.techRequiredPlaceholder')"
          @update:value="onUpdate"
        />
      </div>
      <div class="base-course-topic-picker__group">
        <div class="base-course-topic-picker__title">{{ t('common.shared.classReport.topicPicker.techOptionalTitle') }}</div>
        <MultiSelect
          :value="selected"
          :options="techOptionalOptions"
          :disabled="disabled"
          :placeholder="t('common.shared.classReport.topicPicker.techOptionalPlaceholder')"
          @update:value="onUpdate"
        />
      </div>
    </template>
    <template v-else>
      <div class="base-course-topic-picker__group">
        <div class="base-course-topic-picker__title">{{ t('common.shared.classReport.topicPicker.behaviorTitle') }}</div>
        <MultiSelect
          :value="selected"
          :options="behaviorOptions"
          :disabled="disabled"
          :placeholder="t('common.shared.classReport.topicPicker.behaviorPlaceholder')"
          @update:value="onUpdate"
        />
      </div>
    </template>
    <div v-if="fallbackTags.length > 0" class="base-course-topic-picker__fallback">
      <span class="base-course-topic-picker__fallback-label">{{ t('common.shared.classReport.topicPicker.fallbackLabel') }}</span>
      <a-tag v-for="tag in fallbackTags" :key="tag">{{ tag }}</a-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * S-055 §3.5.5 / §4A.1 BaseCourseTopicPicker
 *
 * - props: modelValue:string[]、category:'tech'|'behavior'、disabled?:boolean
 * - emits: update:modelValue
 * - tech 渲染必修组（T01-T19）+ 选修组（T20-T24）；behavior 渲染 B0-B7
 * - 必须使用 @osg/shared MultiSelect，不直接 a-select mode="multiple"
 * - dictValue → dictLabel；找不到回退 dictValue
 */
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { MultiSelect } from '../../../components'

const { t } = useI18n()
import { useBaseCourseTopic } from '../../../composables/useBaseCourseTopic'

const props = withDefaults(
  defineProps<{
    modelValue?: string[]
    category: 'tech' | 'behavior'
    disabled?: boolean
  }>(),
  {
    modelValue: () => [],
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const { techRequired, techOptional, behavior, options, load } = useBaseCourseTopic()

onMounted(() => {
  void load()
})

watch(
  () => props.category,
  () => {
    void load()
  },
)

interface Option {
  label: string
  value: string
}

const techRequiredOptions = computed<Option[]>(() =>
  techRequired.value.map((o) => ({ label: o.label || o.value, value: o.value })),
)
const techOptionalOptions = computed<Option[]>(() =>
  techOptional.value.map((o) => ({ label: o.label || o.value, value: o.value })),
)
const behaviorOptions = computed<Option[]>(() =>
  behavior.value.map((o) => ({ label: o.label || o.value, value: o.value })),
)

const selected = computed<string[]>(() => props.modelValue ?? [])

const knownValues = computed<Set<string>>(() => {
  const set = new Set<string>()
  options.value.forEach((o) => set.add(o.value))
  return set
})

const fallbackTags = computed<string[]>(() =>
  selected.value.filter((v) => !knownValues.value.has(v)),
)

function onUpdate(next: (string | number)[]): void {
  emit(
    'update:modelValue',
    next.map((v) => String(v)),
  )
}
</script>

<style scoped lang="scss">
.base-course-topic-picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.base-course-topic-picker__group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.base-course-topic-picker__title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.base-course-topic-picker__fallback {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.base-course-topic-picker__fallback-label {
  margin-right: 4px;
}
</style>
