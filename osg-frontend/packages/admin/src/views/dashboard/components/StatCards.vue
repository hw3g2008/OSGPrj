<template>
  <div class="stat-cards">
    <div
      v-for="card in cards"
      :key="card.label"
      class="stat-card"
      @click="handleClick(card.route)"
    >
      <div class="stat-card__icon" :style="{ background: card.iconBg }">
        <span class="mdi" :class="card.icon" :style="{ color: card.iconColor }" />
      </div>
      <div class="stat-card__info">
        <span class="stat-card__label">{{ card.label }}</span>
        <span class="stat-card__value">{{ card.value }}</span>
        <span class="stat-card__sub" :style="card.subStyle">{{ card.sub }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { DashboardStats } from '@/api/dashboard'

const props = defineProps<{
  stats: DashboardStats | null
}>()

const router = useRouter()

const cards = computed(() => {
  const s = props.stats
  if (!s) return []
  return [
    {
      icon: 'mdi-account-group',
      iconColor: '#6366F1',
      iconBg: '#EEF2FF',
      label: '学员总数',
      value: String(s.studentCount),
      sub: `↑ 本月新增 ${s.newStudentsThisMonth}`,
      subStyle: { color: '#22C55E' },
      route: '/students',
    },
    {
      icon: 'mdi-account-tie',
      iconColor: '#3B82F6',
      iconBg: '#DBEAFE',
      label: '导师总数',
      value: String(s.mentorCount),
      sub: `Lead ${s.leadMentorCount} · Mentor ${s.mentorOnlyCount}`,
      subStyle: {},
      route: '/staff',
    },
    {
      icon: 'mdi-clipboard-clock',
      iconColor: '#F59E0B',
      iconBg: '#FEF3C7',
      label: '待审课时',
      value: String(s.pendingClassHours),
      sub: `⏰ 最早 ${s.earliestPendingDays}天前`,
      subStyle: { color: '#F59E0B' },
      route: '/reports',
    },
    {
      icon: 'mdi-cash-check',
      iconColor: '#22C55E',
      iconBg: '#D1FAE5',
      label: '待结算',
      value: `$${s.pendingSettlement.toLocaleString()}`,
      sub: `Report $${s.settlementReport.toLocaleString()} · Other $${s.settlementOther.toLocaleString()}`,
      subStyle: {},
      route: '/finance',
    },
    {
      icon: 'mdi-receipt-text-clock',
      iconColor: '#EF4444',
      iconBg: '#FEE2E2',
      label: '待审报销',
      value: String(s.pendingExpense),
      sub: `共计 $${s.expenseTotal.toLocaleString()}`,
      subStyle: {},
      route: '/expense',
    },
  ]
})

function handleClick(route: string) {
  router.push(route)
}
</script>

<style scoped lang="scss">
.stat-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 22px;
  box-shadow: var(--card-shadow, 0 4px 24px rgba(99, 102, 241, 0.12));
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  align-items: flex-start;
  gap: 16px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.18);
  }

  &__icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .mdi {
      font-size: 22px;
    }
  }

  &__info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__label {
    font-size: 13px;
    color: var(--muted, #94A3B8);
    margin-bottom: 4px;
  }

  &__value {
    font-size: 28px;
    font-weight: 700;
    color: var(--text, #1E293B);
    line-height: 1.2;
    margin-bottom: 4px;
  }

  &__sub {
    font-size: 12px;
    color: var(--text2, #64748B);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
