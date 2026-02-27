<template>
  <a-card title="学员状态分布" class="student-status">
    <div class="student-status__list" v-if="data">
      <div
        v-for="item in items"
        :key="item.label"
        class="student-status__item"
      >
        <div class="student-status__row">
          <span class="student-status__label">{{ item.label }}</span>
          <span class="student-status__count">{{ item.count }}</span>
          <span class="student-status__pct">{{ item.pct }}%</span>
        </div>
        <div class="student-status__bar">
          <div
            class="student-status__fill"
            :style="{ width: item.pct + '%', background: item.color }"
          />
        </div>
      </div>
    </div>
    <div v-else class="student-status__empty">暂无数据</div>
  </a-card>
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
  &__list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__label {
    font-size: 13px;
    color: var(--text, #1E293B);
    font-weight: 500;
    flex: 1;
  }

  &__count {
    font-size: 14px;
    font-weight: 600;
    color: var(--text, #1E293B);
  }

  &__pct {
    font-size: 12px;
    color: var(--muted, #94A3B8);
    width: 36px;
    text-align: right;
  }

  &__bar {
    height: 6px;
    background: var(--bg, #F8FAFC);
    border-radius: 3px;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  &__empty {
    text-align: center;
    color: var(--muted, #94A3B8);
    padding: 24px 0;
    font-size: 14px;
  }
}
</style>
