<template>
  <div class="dashboard">
    <a-row :gutter="16">
      <a-col :span="6"><a-card><a-statistic :title="t('assistant.dashboard.k4')" :value="stats.pendingSchedule" :suffix="t('assistant.dashboard.k5')" /></a-card></a-col>
      <a-col :span="6"><a-card><a-statistic :title="t('assistant.dashboard.k6')" :value="stats.todayConsult" :suffix="t('assistant.dashboard.k7')" /></a-card></a-col>
      <a-col :span="6"><a-card><a-statistic :title="t('assistant.dashboard.k8')" :value="stats.pendingMaterials" :suffix="t('assistant.dashboard.k9')" /></a-card></a-col>
      <a-col :span="6"><a-card><a-statistic :title="t('assistant.dashboard.k10')" :value="stats.pendingFeedback" :suffix="t('assistant.dashboard.k11')" /></a-card></a-col>
    </a-row>
    <a-row :gutter="16" style="margin-top: 24px">
      <a-col :span="12">
        <a-card :title="t('assistant.dashboard.todayTasks')">
          <a-list :data-source="tasks" size="small">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-checkbox>{{ item.content }}</a-checkbox>
                <template #actions><a-tag :color="item.color">{{ item.priority }}</a-tag></template>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card :title="t('assistant.dashboard.quickEntries')">
          <a-space direction="vertical" style="width: 100%">
            <a-button type="primary" block @click="$router.push('/schedule')">{{ t('assistant.dashboard.k1') }}</a-button>
            <a-button block @click="$router.push('/students')">{{ t('assistant.dashboard.k2') }}</a-button>
            <a-button block @click="$router.push('/feedback')">{{ t('assistant.dashboard.k3') }}</a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const stats = ref({ pendingSchedule: 5, todayConsult: 12, pendingMaterials: 3, pendingFeedback: 8 })
const tasks = ref([
  { content: t('assistant.dashboard.k12'), priority: t('assistant.dashboard.k13'), color: 'red' },
  { content: t('assistant.dashboard.k14'), priority: t('assistant.dashboard.k15'), color: 'orange' },
  { content: t('assistant.dashboard.k16'), priority: t('assistant.dashboard.k15'), color: 'orange' },
  { content: t('assistant.dashboard.k17'), priority: t('assistant.dashboard.k18'), color: 'blue' }
])
</script>
