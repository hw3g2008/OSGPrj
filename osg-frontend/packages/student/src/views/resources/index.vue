<template>
  <div class="resources-page">
    <OsgPageContainer :title="t('student.resources.k2')">
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="docs" :tab="t('student.resources.k3')">
          <a-list :data-source="docs" :loading="loading">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta :title="item.title" :description="item.description" />
                <template #actions>
                  <a-button type="link">{{ t('student.resources.k1') }}</a-button>
                </template>
              </a-list-item>
            </template>
          </a-list>
        </a-tab-pane>
        <a-tab-pane key="questions" :tab="t('student.resources.k4')">
          <a-empty :description="t('student.resources.k5')" />
        </a-tab-pane>
        <a-tab-pane key="interviews" :tab="t('student.resources.k6')">
          <a-empty :description="t('student.resources.k7')" />
        </a-tab-pane>
      </a-tabs>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()

const activeTab = ref('docs')
const loading = ref(false)

const docs = ref([
  { id: 1, title: t('student.resources.k8'), description: t('student.resources.k9') },
  { id: 2, title: t('student.resources.k10'), description: t('student.resources.k11') },
  { id: 3, title: t('student.resources.k12'), description: t('student.resources.k13') }
])
</script>
