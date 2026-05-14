<template>
  <a-select
    v-model:value="model"
    mode="multiple"
    :options="options"
    :field-names="fieldNames"
    :placeholder="placeholder || $t('please_select')"
    :disabled="disabled"
    show-search
    allow-clear
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value?: string[]
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

const emit = defineEmits<{
  'update:value': [value: string[]]
}>()

const model = computed({
  get: () => props.value,
  set: (val) => emit('update:value', val)
})
</script>
