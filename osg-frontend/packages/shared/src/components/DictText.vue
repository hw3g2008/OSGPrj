<template>
  <span class="osg-dict-text">{{ resolved }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDictText } from '../composables/useDictText'

/**
 * Render a translated dict label given dict type + value.
 *
 * Convention: i18n key shape `dictText.<type>.<value>`, see useDictText.
 * For user-entered free text, render `{{ record.field }}` directly.
 *
 * @example
 *   <DictText type="coaching_type" :value="record.coachingType"/>
 *   <DictText type="coaching_status" :value="record.coachingStatus" fallback="—"/>
 */
const props = defineProps<{
  type: string
  value?: string | null
  fallback?: string | null
}>()

const { tDict } = useDictText()
const resolved = computed(() => tDict(props.type, props.value ?? null, props.fallback ?? null))
</script>
