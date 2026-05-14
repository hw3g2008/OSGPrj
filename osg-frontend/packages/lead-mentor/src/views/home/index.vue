<template>
  <div id="page-home" class="page-home">
    <div class="home-heading">
      <h1>{{ $t('good_afternoon') }}，Jess</h1>
    </div>

    <section class="summary-grid">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="summary-card"
        :class="card.tone"
      >
        <div class="summary-card__label">{{ card.label }}</div>
        <div class="summary-card__value">
          {{ card.value }}
          <span v-if="card.unit" class="summary-card__unit">{{ card.unit }}</span>
        </div>
        <div class="summary-card__footer">
          <span v-if="card.footerIcon" class="mdi" :class="card.footerIcon" aria-hidden="true"></span>
          <span>{{ card.footerText }}</span>
        </div>
      </article>
    </section>

    <section class="stats-grid">
      <article v-for="card in statCards" :key="card.label" class="stat-card">
        <div class="stat-card__icon" :class="card.tone">
          <span class="mdi" :class="card.iconClass" aria-hidden="true"></span>
        </div>
        <div class="stat-card__label">{{ card.label }}</div>
        <div class="stat-card__value" :class="{ compact: !!card.compactValue }">
          {{ card.value }}
          <span v-if="card.unit" class="stat-card__unit">{{ card.unit }}</span>
        </div>
      </article>
    </section>

    <section class="card">
      <div class="card-header">
        <span class="card-title">{{ $t('quick_access') }}</span>
      </div>
      <div class="card-body">
        <div class="quick-grid">
          <article
            v-for="entry in quickEntries"
            :key="entry.label"
            class="quick-entry"
            :class="{ urgent: entry.urgent }"
            role="button"
            tabindex="0"
            @click="handleQuickEntryClick"
          >
            <span class="mdi quick-entry__icon" :class="[entry.iconClass, entry.tone]" aria-hidden="true"></span>
            <div class="quick-entry__label">{{ entry.label }}</div>
            <div v-if="entry.meta" class="quick-entry__meta">{{ entry.meta }}</div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
interface SummaryCard {
  label: string
  value: string
  unit?: string
  footerText: string
  footerIcon?: string
  tone: string
}

interface StatCard {
  label: string
  value: string
  unit?: string
  iconClass: string
  tone: string
  compactValue?: boolean
}

interface QuickEntry {
  label: string
  iconClass: string
  tone: string
  meta?: string
  urgent?: boolean
}

const showUpcomingToast = inject<() => void>('showUpcomingToast', () => {})

const summaryCards: SummaryCard[] = [
  {
    label: t('sessions_to_schedule'),
    value: '5',
    unit: '个',
    footerText: t('assign_mentor'),
    footerIcon: 'mdi-arrow-right',
    tone: 'summary-card--amber'
  },
  {
    label: t('courses_pending_confirmation'),
    value: '3',
    unit: '节',
    footerText: t('confirm_feedback'),
    footerIcon: 'mdi-arrow-right',
    tone: 'summary-card--rose'
  },
  {
    label: '本周收入（已结算）',
    value: '¥1,250',
    footerText: '待结算 ¥20',
    tone: 'summary-card--green'
  },
  {
    label: t('this_weeks_class_hours'),
    value: '12.5',
    unit: 'h',
    footerText: t('completed_8_sessions_2_pending_review'),
    tone: 'summary-card--blue'
  }
]

const statCards: StatCard[] = [
  {
    label: t('my_students'),
    value: '15',
    unit: '人',
    iconClass: 'mdi-account-multiple',
    tone: 'purple'
  },
  {
    label: t('this_week_schedule'),
    value: t('submitted'),
    iconClass: 'mdi-calendar-check',
    tone: 'green',
    compactValue: true
  },
  {
    label: t('available_time'),
    value: '10',
    unit: 'h',
    iconClass: 'mdi-clock-outline',
    tone: 'blue'
  },
  {
    label: t('available_days'),
    value: '4',
    unit: '天',
    iconClass: 'mdi-calendar',
    tone: 'orange'
  },
  {
    label: t('available_mentors'),
    value: '8',
    unit: '人',
    iconClass: 'mdi-account-group',
    tone: 'purple'
  }
]

const quickEntries: QuickEntry[] = [
  {
    label: t('position_applications'),
    meta: '8待处理',
    iconClass: 'mdi-briefcase-plus',
    tone: 'red',
    urgent: true
  },
  {
    label: t('schedule_management'),
    iconClass: 'mdi-clipboard-list',
    tone: 'amber'
  },
  {
    label: t('my_sessions'),
    iconClass: 'mdi-book-open-variant',
    tone: 'purple'
  },
  {
    label: t('my_students'),
    iconClass: 'mdi-account-multiple',
    tone: 'blue'
  },
  {
    label: t('my_schedule'),
    iconClass: 'mdi-calendar-clock',
    tone: 'green'
  },
  {
    label: t('reimbursement_management'),
    iconClass: 'mdi-receipt',
    tone: 'orange'
  }
]

const handleQuickEntryClick = () => {
  showUpcomingToast()
}
</script>

<style scoped lang="scss">
.page-home {
  display: block;
}

.home-heading {
  margin-bottom: 24px;
}

.home-heading h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.summary-card {
  border-radius: 16px;
  padding: 24px;
  color: #fff;
  box-shadow: var(--card-shadow);
}

.summary-card--amber {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.summary-card--rose {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.summary-card--green {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.summary-card--blue {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.summary-card__label {
  margin-bottom: 8px;
  font-size: 13px;
  opacity: 0.9;
}

.summary-card__value {
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
}

.summary-card__unit {
  margin-left: 2px;
  font-size: 18px;
  font-weight: 400;
}

.summary-card__footer {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  opacity: 0.9;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 22px;
  box-shadow: var(--card-shadow);
}

.stat-card__icon {
  width: 44px;
  height: 44px;
  margin-bottom: 14px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.stat-card__icon.purple {
  background: var(--primary-light);
  color: var(--primary);
}

.stat-card__icon.green {
  background: #d1fae5;
  color: #059669;
}

.stat-card__icon.blue {
  background: #dbeafe;
  color: #2563eb;
}

.stat-card__icon.orange {
  background: #fef3c7;
  color: #d97706;
}

.stat-card__label {
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--muted);
}

.stat-card__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
}

.stat-card__value.compact {
  font-size: 18px;
  color: #22c55e;
}

.stat-card__unit {
  margin-left: 2px;
  font-size: 14px;
  font-weight: 400;
}

.card {
  margin-bottom: 20px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--card-shadow);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.card-body {
  padding: 22px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.quick-entry {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  background: #fff;
  text-align: center;
  box-shadow: inset 0 0 0 1px transparent;
}

.quick-entry.urgent {
  border-color: #ef4444;
  background: #fef2f2;
}

.quick-entry__icon {
  font-size: 24px;
}

.quick-entry__icon.red {
  color: #ef4444;
}

.quick-entry__icon.amber {
  color: #f59e0b;
}

.quick-entry__icon.purple {
  color: var(--primary);
}

.quick-entry__icon.blue {
  color: #3b82f6;
}

.quick-entry__icon.green {
  color: #22c55e;
}

.quick-entry__icon.orange {
  color: #d97706;
}

.quick-entry__label {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text);
}

.quick-entry.urgent .quick-entry__label,
.quick-entry__meta {
  color: #ef4444;
}

.quick-entry__meta {
  margin-top: 2px;
  font-size: 10px;
  font-weight: 600;
}

@media (max-width: 1280px) {
  .summary-grid,
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quick-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .summary-grid,
  .stats-grid,
  .quick-grid {
    grid-template-columns: 1fr;
  }
}
</style>
