<template>
  <div :id="pageId" class="assistant-page" data-page-shell>
    <PageHeader :title-zh="title" :title-en="titleEn" :description="description">
      <template #actions>
        <span class="status-pill">{{ statusText || $t('stay_tuned') }}</span>
      </template>
    </PageHeader>

    <section class="placeholder-card">
      <div class="placeholder-icon">
        <i class="mdi mdi-rocket-launch-outline" aria-hidden="true" />
      </div>
      <div class="placeholder-copy">
        <h2>{{ cardTitle || $t('stay_tuned') }}</h2>
        <p>{{ cardDescription }}</p>
      </div>
      <ul class="placeholder-list">
        <li v-for="item in bullets" :key="item" data-placeholder-bullet>{{ item }}</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import '@mdi/font/css/materialdesignicons.css'
import { PageHeader } from '@osg/shared/components/PageHeader'
withDefaults(
  defineProps<{
    pageId: string
    title: string
    titleEn: string
    description: string
    bullets: string[]
    cardTitle?: string
    cardDescription?: string
    statusText?: string
  }>(),
  {
    cardDescription: '该页面已保留访问入口，完整内容将在后续版本开放。',
  },
)
</script>

<style scoped lang="scss">
.assistant-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: #e8f0f8;
  color: #7399c6;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
}

.placeholder-card {
  display: grid;
  gap: 18px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 4px 24px rgba(115, 153, 198, 0.12);
  padding: 28px;
}

.placeholder-icon {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%);
  color: #fff;
  font-size: 28px;
}

.placeholder-copy h2 {
  margin: 0 0 8px;
  color: #1e293b;
  font-size: 20px;
  font-weight: 700;
}

.placeholder-copy p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
}

.placeholder-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 20px;
  color: #475569;
  font-size: 14px;
}

</style>
