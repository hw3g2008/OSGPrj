<template>
  <a-select
    v-model:value="model"
    mode="multiple"
    :options="options"
    :field-names="fieldNames"
    :max-tag-count="'responsive'"
    :placeholder="placeholder"
    :disabled="disabled"
    allow-clear
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SelectProps } from 'ant-design-vue'

interface Option {
  value: string
  label: string
  [key: string]: unknown
}

const props = withDefaults(defineProps<{
  value?: string[]
  options?: Option[]
  placeholder?: string
  disabled?: boolean
  fieldNames?: { label: string; value: string }
}>(), {
  value: () => [],
  options: () => [],
  placeholder: '请选择',
  disabled: false,
  fieldNames: () => ({ label: 'label', value: 'value' })
})

const emit = defineEmits<{
  'update:value': [value: string[]]
}>()

const model = computed({
  get: () => props.value,
  set: (val) => emit('update:value', val)
})
</script>
