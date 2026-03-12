<template>
  <div class="dashboard-card student-status">
    <div class="dashboard-card__header">
      <span class="dashboard-card__title student-status__title-wrap">
        <span class="mdi mdi-chart-pie student-status__title-icon" />
        <span>学员状态</span>
      </span>
    </div>
    <div v-if="data" class="dashboard-card__body student-status__body">
      <div
        v-for="item in items"
        :key="item.label"
        class="student-status__item"
      >
        <div class="student-status__row">
          <span class="student-status__label">{{ item.label }}</span>
          <span class="student-status__count">{{ item.count }}</span>
        </div>
        <div class="student-status__bar">
          <div
            class="student-status__fill"
            :style="{ width: item.pct + '%', background: item.color }"
          />
        </div>
      </div>
    </div>
    <div v-else class="dashboard-card__body student-status__empty">暂无数据</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StudentStatusData } from '@/api/dashboard'

const props = defineProps<{
  data: StudentStatusData | null
}>()

const items = computed(() => {
  const d = props.data
  if (!d || d.total === 0) return []
  return [
    {
      label: 'Active · Normal',
      count: d.activeNormal,
      pct: Math.round((d.activeNormal / d.total) * 100),
      color: 'var(--success, #22C55E)',
    },
    {
      label: 'Active · Frozen',
      count: d.activeFrozen,
      pct: Math.round((d.activeFrozen / d.total) * 100),
      color: 'var(--warning, #F59E0B)',
    },
    {
      label: 'Done',
      count: d.done,
      pct: Math.round((d.done / d.total) * 100),
      color: 'var(--muted, #94A3B8)',
    },
  ]
})
</script>

<style scoped lang="scss">
.student-status {
  &__title-wrap {
    gap: 0;
  }

  &__title-icon {
    color: var(--text2, #64748B);
    font-size: 18px;
    margin-right: 6px;
  }

  &__body {
    padding: 22px;
  }

  &__item {
    margin-bottom: 16px;
  }

  &__item:last-child {
    margin-bottom: 0;
  }

  &__row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }

  &__label {
    font-size: 13px;
    color: var(--text, #1E293B);
    flex: 1;
    line-height: 18px;
  }

  &__count {
    font-size: 16px;
    font-weight: 600;
    color: var(--text, #1E293B);
    line-height: 18px;
  }

  &__bar {
    height: 8px;
    background: var(--bg, #F8FAFC);
    border-radius: 4px;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.4s ease;
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
