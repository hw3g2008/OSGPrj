<template>
  <div class="rating-input osg-modal-form" :class="{ 'rating-input--error': showError }">
    <a-input
      :value="modelValue ?? ''"
      :placeholder="resolvedPlaceholder"
      :disabled="disabled"
      allow-clear
      @update:value="onUpdate"
    />
    <div v-if="showError" class="rating-input__error">{{ t('common.shared.classReport.ratingInput.errorEmpty') }}</div>
  </div>
</template>

<script setup lang="ts">
/**
 * S-055 §3.6 RatingInput
 *
 * 统一评分输入：单 input，不限制分制，不强制 number parse；
 * 仅 trim 后字符串透传到 rate 字段。
 *
 * - props: modelValue?:string、required?:boolean、disabled?:boolean、placeholder?:string
 * - emits: update:modelValue
 * - 暴露 validate(): boolean，required=true 且 trim(modelValue)=="" 时返回 false 并展示错误
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    required?: boolean
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    modelValue: '',
    required: false,
    disabled: false,
    placeholder: '',
  },
)

const { t } = useI18n()
const resolvedPlaceholder = computed(() => props.placeholder || t('common.shared.classReport.ratingInput.placeholder'))

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const errorVisible = ref(false)

const isEmpty = computed(() => !((props.modelValue ?? '').trim()))

const showError = computed(() => errorVisible.value && props.required && isEmpty.value)

function onUpdate(value: string | undefined): void {
  const next = value ?? ''
  if (next.trim()) {
    errorVisible.value = false
  }
  emit('update:modelValue', next)
}

function validate(): boolean {
  if (props.required && isEmpty.value) {
    errorVisible.value = true
    return false
  }
  errorVisible.value = false
  return true
}

defineExpose({ validate })
</script>

<style scoped lang="scss">
.rating-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rating-input__error {
  font-size: 12px;
  color: #ff4d4f;
  line-height: 1.4;
}

.rating-input--error :deep(.ant-input) {
  border-color: #ff4d4f;
}
</style>
