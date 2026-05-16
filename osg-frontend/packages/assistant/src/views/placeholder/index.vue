<template>
  <AssistantPlaceholderShell v-bind="placeholderContent" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
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
const { t } = useI18n()

const placeholderContent = computed<PlaceholderContent>(() => {
  const fallback: PlaceholderContent = {
    pageId: t('assistant.placeholderShell.fallback.pageId'),
    title: t('assistant.placeholderShell.fallback.title'),
    titleEn: t('assistant.placeholderShell.fallback.titleEn'),
    description: t('assistant.placeholderShell.fallback.description'),
    cardTitle: t('assistant.placeholderShell.fallback.cardTitle'),
    cardDescription: t('assistant.placeholderShell.fallback.cardDescription'),
    statusText: t('assistant.placeholderShell.fallback.statusText'),
    bullets: [
      t('assistant.placeholderShell.fallback.bullet1'),
      t('assistant.placeholderShell.fallback.bullet2'),
      t('assistant.placeholderShell.fallback.bullet3'),
    ],
  }

  const metaContent = route.meta.placeholderContent
  if (!metaContent || typeof metaContent !== 'object') {
    return fallback
  }

  const partialContent = metaContent as Partial<PlaceholderContent>
  return {
    ...fallback,
    ...partialContent,
    bullets: Array.isArray(partialContent.bullets) ? partialContent.bullets : fallback.bullets,
  }
})
</script>
