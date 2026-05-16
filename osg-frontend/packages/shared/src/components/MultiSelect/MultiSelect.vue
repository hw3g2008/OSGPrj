<template>
  <a-select
    v-model:value="model"
    mode="multiple"
    :options="options"
    :field-names="fieldNames"
    :placeholder="resolvedPlaceholder"
    :disabled="disabled"
    show-search
    allow-clear
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

type MultiValue = (string | number)[]

const props = withDefaults(defineProps<{
  value?: MultiValue
  options?: readonly unknown[]
  placeholder?: string
  disabled?: boolean
  fieldNames?: { label: string; value: string }
}>(), {
  value: () => [],
  options: () => [],
  placeholder: '',
  disabled: false,
  fieldNames: () => ({ label: 'label', value: 'value' })
})

const { t } = useI18n()
const resolvedPlaceholder = computed(() => props.placeholder || t('common.shared.multiSelect.placeholder'))

const emit = defineEmits<{
  'update:value': [value: MultiValue]
}>()

const model = computed({
  get: () => props.value,
  set: (val) => emit('update:value', val)
})
</script>
