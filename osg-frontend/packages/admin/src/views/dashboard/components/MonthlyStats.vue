<template>
  <div class="dashboard-card monthly-stats">
    <div class="dashboard-card__header">
      <span class="dashboard-card__title monthly-stats__title-wrap">
        <span class="mdi mdi-calendar-month monthly-stats__title-icon" />
        <span>本月统计</span>
      </span>
    </div>
    <div v-if="data" class="dashboard-card__body monthly-stats__body">
      <div
        v-for="item in items"
        :key="item.label"
        class="monthly-stats__item"
      >
        <span class="monthly-stats__label">{{ item.label }}</span>
        <span class="monthly-stats__value" :style="item.style">{{ item.value }}</span>
      </div>
    </div>
    <div v-else class="dashboard-card__body monthly-stats__empty">暂无数据</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MonthlyStatsData } from '@/api/dashboard'

const props = defineProps<{
  data: MonthlyStatsData | null
}>()

const items = computed(() => {
  const d = props.data
  if (!d) return []
  return [
    { label: '新增学员', value: String(d.newStudents), style: {} },
    { label: '新签合同', value: `$${d.newContracts.toLocaleString()}`, style: {} },
    { label: '已审课时', value: `${d.approvedClassHours}条`, style: {} },
    { label: '课时消耗', value: `${d.classHoursConsumed}h`, style: {} },
    { label: '已结算金额', value: `$${d.settledAmount.toLocaleString()}`, style: { color: 'var(--success, #22C55E)' } },
  ]
})
</script>

<style scoped lang="scss">
.monthly-stats {
  &__title-wrap {
    gap: 0;
  }

  &__title-icon {
    color: var(--text2, #64748B);
    font-size: 18px;
    margin-right: 6px;
  }

  &__body {
    display: flex;
    flex-direction: column;
    font-size: 13px;
    padding: 22px;
  }

  &__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  &__item:last-child {
    margin-bottom: 0;
  }

  &__label {
    color: var(--text, #1E293B);
    line-height: 18px;
  }

  &__value {
    font-size: 13px;
    font-weight: 600;
    color: var(--text, #1E293B);
    line-height: 18px;
  }

  &__empty {
    text-align: center;
    color: var(--muted, #94A3B8);
    padding: 24px 0;
    font-size: 14px;
  }
}

.dashboard-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: var(--card-shadow, 0 4px 24px rgba(99, 102, 241, 0.12));
  margin-bottom: 20px;

  &__header {
    padding: 18px 22px;
    border-bottom: 1px solid var(--border, #E2E8F0);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    display: inline-flex;
    align-items: center;
    font-size: 16px;
    font-weight: 600;
    color: var(--text, #1E293B);
  }
}
</style>
