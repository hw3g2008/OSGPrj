<template>
  <PlaceholderPage :title="t('mentor.placeholderView.communication')" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PlaceholderPage from '@/components/PlaceholderPage.vue'
const { t } = useI18n()
</script>
