<template>
  <div id="page-home" class="page-home">
    <div class="home-heading">
      <h1>{{ t('leadMentor.home.greetingAfternoon', { name: 'Jess' }) }}</h1>
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
        <span class="card-title">{{ t('leadMentor.home.quickEntries.title') }}</span>
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
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'

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

const { t } = useI18n()
const showUpcomingToast = inject<() => void>('showUpcomingToast', () => {})

const summaryCards = computed<SummaryCard[]>(() => [
  {
    label: t('leadMentor.home.summary.pendingScheduling'),
    value: '5',
    unit: t('leadMentor.home.summary.pendingSchedulingUnit'),
    footerText: t('leadMentor.home.summary.pendingSchedulingFooter'),
    footerIcon: 'mdi-arrow-right',
    tone: 'summary-card--amber'
  },
  {
    label: t('leadMentor.home.summary.pendingConfirm'),
    value: '3',
    unit: t('leadMentor.home.summary.pendingConfirmUnit'),
    footerText: t('leadMentor.home.summary.pendingConfirmFooter'),
    footerIcon: 'mdi-arrow-right',
    tone: 'summary-card--rose'
  },
  {
    label: t('leadMentor.home.summary.weeklyIncome'),
    value: '$1,250',
    footerText: t('leadMentor.home.summary.weeklyIncomeFooter', { amount: '$320' }),
    tone: 'summary-card--green'
  },
  {
    label: t('leadMentor.home.summary.weeklyHours'),
    value: '12.5',
    unit: t('leadMentor.home.summary.weeklyHoursUnit'),
    footerText: t('leadMentor.home.summary.weeklyHoursFooter', { done: 8, pending: 2 }),
    tone: 'summary-card--blue'
  }
])

const statCards = computed<StatCard[]>(() => [
  {
    label: t('leadMentor.home.stats.myStudents'),
    value: '15',
    unit: t('leadMentor.home.stats.unitPerson'),
    iconClass: 'mdi-account-multiple',
    tone: 'purple'
  },
  {
    label: t('leadMentor.home.stats.weeklySchedule'),
    value: t('leadMentor.home.stats.weeklyScheduleFilled'),
    iconClass: 'mdi-calendar-check',
    tone: 'green',
    compactValue: true
  },
  {
    label: t('leadMentor.home.stats.availableHours'),
    value: '10',
    unit: t('leadMentor.home.stats.unitHour'),
    iconClass: 'mdi-clock-outline',
    tone: 'blue'
  },
  {
    label: t('leadMentor.home.stats.availableDays'),
    value: '4',
    unit: t('leadMentor.home.stats.unitDay'),
    iconClass: 'mdi-calendar',
    tone: 'orange'
  },
  {
    label: t('leadMentor.home.stats.availableMentors'),
    value: '8',
    unit: t('leadMentor.home.stats.unitPerson'),
    iconClass: 'mdi-account-group',
    tone: 'purple'
  }
])

const quickEntries = computed<QuickEntry[]>(() => [
  {
    label: t('leadMentor.home.quickEntries.positionApply'),
    meta: t('leadMentor.home.quickEntries.positionApplyMeta', { count: 8 }),
    iconClass: 'mdi-briefcase-plus',
    tone: 'red',
    urgent: true
  },
  {
    label: t('leadMentor.home.quickEntries.scheduleManage'),
    iconClass: 'mdi-clipboard-list',
    tone: 'amber'
  },
  {
    label: t('leadMentor.home.quickEntries.myClasses'),
    iconClass: 'mdi-book-open-variant',
    tone: 'purple'
  },
  {
    label: t('leadMentor.home.quickEntries.myStudents'),
    iconClass: 'mdi-account-multiple',
    tone: 'blue'
  },
  {
    label: t('leadMentor.home.quickEntries.mySchedule'),
    iconClass: 'mdi-calendar-clock',
    tone: 'green'
  },
  {
    label: t('leadMentor.home.quickEntries.reimbursement'),
    iconClass: 'mdi-receipt',
    tone: 'orange'
  }
])

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
