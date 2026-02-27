<template>
  <a-card class="recent-activity">
    <template #title>
      <div class="recent-activity__header">
        <span>最近活动</span>
        <a class="recent-activity__link" @click="router.push('/logs')">查看全部</a>
      </div>
    </template>
    <div class="recent-activity__list">
      <div
        v-for="(item, idx) in activities"
        :key="idx"
        class="recent-activity__item"
      >
        <div class="recent-activity__icon" :style="{ background: item.iconBg }">
          <span class="mdi" :class="item.icon" :style="{ color: item.iconColor }" />
        </div>
        <div class="recent-activity__content">
          <div class="recent-activity__row">
            <span class="recent-activity__title">{{ item.title }}</span>
            <span class="recent-activity__time">{{ item.time }}</span>
          </div>
          <p class="recent-activity__detail">{{ item.detail }}</p>
        </div>
      </div>
      <div v-if="!activities || activities.length === 0" class="recent-activity__empty">
        暂无活动记录
      </div>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { ActivityItem } from '@/api/dashboard'

defineProps<{
  activities: ActivityItem[] | null
}>()

const router = useRouter()
</script>

<style scoped lang="scss">
.recent-activity {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__link {
    font-size: 13px;
    color: var(--primary, #6366F1);
    cursor: pointer;
    font-weight: 400;

    &:hover {
      text-decoration: underline;
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__item {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  &__icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .mdi {
      font-size: 18px;
    }
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text, #1E293B);
  }

  &__time {
    font-size: 12px;
    color: var(--muted, #94A3B8);
    flex-shrink: 0;
  }

  &__detail {
    font-size: 13px;
    color: var(--text2, #64748B);
    margin: 0;
    line-height: 1.4;
  }

  &__empty {
    text-align: center;
    color: var(--muted, #94A3B8);
    padding: 24px 0;
    font-size: 14px;
  }
}
</style>
