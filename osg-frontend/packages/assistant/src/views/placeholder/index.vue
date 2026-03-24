<template>
  <AssistantPlaceholderShell v-bind="placeholderContent" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import AssistantPlaceholderShell from '../_shared/AssistantPlaceholderShell.vue'

interface PlaceholderContent {
  pageId: string
  title: string
  titleEn: string
  description: string
  bullets: string[]
  cardTitle?: string
  cardDescription?: string
  statusText?: string
}

const route = useRoute()

const fallbackContent: PlaceholderContent = {
  pageId: 'page-coming-soon',
  title: '敬请期待',
  titleEn: 'Coming Soon',
  description: '当前功能正在准备中，完整内容将在后续版本开放。',
  cardTitle: '功能即将上线',
  cardDescription: '该页面已保留访问入口，后续版本会在这里提供完整内容。',
  statusText: '敬请期待',
  bullets: [
    '入口已保留，方便后续快速访问。',
    '当前版本暂未开放该功能。',
    '完整内容将在后续版本上线。',
  ],
}

const placeholderContent = computed<PlaceholderContent>(() => {
  const metaContent = route.meta.placeholderContent
  if (!metaContent || typeof metaContent !== 'object') {
    return fallbackContent
  }

  const partialContent = metaContent as Partial<PlaceholderContent>
  return {
    ...fallbackContent,
    ...partialContent,
    bullets: Array.isArray(partialContent.bullets) ? partialContent.bullets : fallbackContent.bullets,
  }
})
</script>
