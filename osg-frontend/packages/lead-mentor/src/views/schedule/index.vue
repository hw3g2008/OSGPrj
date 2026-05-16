<template>
  <div class="schedule-page">
    <OsgPageContainer :title="t('leadMentor.schedule.k43')">
      <a-calendar />
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { OsgPageContainer } from '@osg/shared/components'


const { t } = useI18n()</script>
