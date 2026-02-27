<template>
  <a-card title="本月统计" class="monthly-stats">
    <div class="monthly-stats__list" v-if="data">
      <div
        v-for="item in items"
        :key="item.label"
        class="monthly-stats__item"
      >
        <span class="monthly-stats__label">{{ item.label }}</span>
        <span class="monthly-stats__value" :style="item.style">{{ item.value }}</span>
      </div>
    </div>
    <div v-else class="monthly-stats__empty">暂无数据</div>
  </a-card>
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
  &__list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--border, #E2E8F0);

    &:last-child {
      border-bottom: none;
    }
  }

  &__label {
    font-size: 14px;
    color: var(--text2, #64748B);
  }

  &__value {
    font-size: 16px;
    font-weight: 600;
    color: var(--text, #1E293B);
  }

  &__empty {
    text-align: center;
    color: var(--muted, #94A3B8);
    padding: 24px 0;
    font-size: 14px;
  }
}
</style>
