<template>
  <a-card :bordered="false" class="osg-stat-card">
    <a-statistic :title="label" :value="value" :value-style="computedValueStyle" />
  </a-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value: string | number
  color?: string
}>()

const computedValueStyle = computed(() =>
  props.color ? { color: props.color } : undefined,
)
</script>

<style scoped lang="scss">
.osg-stat-card {
  text-align: center;
}
</style>
