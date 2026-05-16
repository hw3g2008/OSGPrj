<template>
  <div class="reports-page">
    <OsgPageContainer :title="t('leadMentor.reports.k1')">
      <a-empty :description="t('leadMentor.reports.k2')" />
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { OsgPageContainer } from '@osg/shared/components'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
