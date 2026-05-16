<template>
  <section id="page-home" class="assistant-home" data-page-id="assistant-home">
    <div id="assistant-home-hero" class="assistant-home__hero">
      <div class="assistant-home__hero-copy">
        <p class="assistant-home__eyebrow">{{ t('assistant.home.eyebrow') }}</p>
        <h1 class="assistant-home__hero-title">{{ greetingText }}</h1>
        <p class="assistant-home__hero-description">
          {{ t('assistant.home.description') }}
        </p>
      </div>

      <button
        type="button"
        class="assistant-home__hero-cta"
        data-home-action="class-records"
        @click="goTo('/class-records')"
      >
        <i class="mdi mdi-book-open-variant" aria-hidden="true" />
        {{ t('assistant.home.viewClassRecords') }}
      </button>
    </div>

    <section id="assistant-home-primary-metrics" class="assistant-home__metrics" :aria-label="t('assistant.home.metricsAriaLabel')">
      <article
        v-for="metric in primaryMetrics"
        :key="metric.label"
        class="assistant-home__metric-card"
        :class="metric.toneClass"
        :data-home-card="metric.cardId"
      >
        <div class="assistant-home__metric-header">
          <span class="assistant-home__metric-label">{{ metric.label }}</span>
          <i class="mdi assistant-home__metric-icon" :class="metric.iconClass" aria-hidden="true" />
        </div>
        <div class="assistant-home__metric-value">
          {{ metric.value }}
          <span v-if="metric.unit" class="assistant-home__metric-unit">{{ metric.unit }}</span>
        </div>
        <p class="assistant-home__metric-hint">{{ metric.hint }}</p>
      </article>
    </section>

    <section id="assistant-home-summary-stats" class="assistant-home__stats-grid" :aria-label="t('assistant.home.statsAriaLabel')">
      <article
        v-for="stat in secondaryStats"
        :key="stat.label"
        class="assistant-home__stat-card stat-card"
        :data-home-stat="stat.cardId"
      >
        <div class="assistant-home__stat-icon" :class="stat.toneClass">
          <i class="mdi" :class="stat.iconClass" aria-hidden="true" />
        </div>
        <div class="assistant-home__stat-label label">{{ stat.label }}</div>
        <div class="assistant-home__stat-value">
          {{ stat.value }}
          <span v-if="stat.unit" class="assistant-home__stat-unit">{{ stat.unit }}</span>
        </div>
      </article>
    </section>

    <section id="assistant-home-quick-links" class="assistant-home__quick-links card" :aria-label="t('assistant.home.quickLinksAriaLabel')">
      <header class="card-header">
        <div>
          <h2 class="card-title">{{ t('assistant.home.quickLinks.title') }}</h2>
          <p class="assistant-home__section-note">{{ t('assistant.home.quickLinks.note') }}</p>
        </div>
      </header>

      <div class="card-body">
        <div class="assistant-home__quick-grid">
          <button
            v-for="entry in quickEntries"
            :key="entry.label"
            type="button"
            class="assistant-home__quick-card is-hoverable"
            :data-quick-link="entry.route"
            @click="goTo(entry.route)"
          >
            <span class="assistant-home__quick-icon" :class="entry.toneClass">
              <i class="mdi" :class="entry.iconClass" aria-hidden="true" />
            </span>
            <span class="assistant-home__quick-title">{{ entry.label }}</span>
            <span class="assistant-home__quick-description">{{ entry.description }}</span>
          </button>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getUser } from '@osg/shared/utils'

interface HomeMetric {
  cardId: string
  label: string
  value: string
  unit?: string
  hint: string
  iconClass: string
  toneClass: string
}

interface HomeStat {
  cardId: string
  label: string
  value: string
  unit?: string
  iconClass: string
  toneClass: string
}

interface QuickEntry {
  label: string
  route: string
  description: string
  iconClass: string
  toneClass: string
}

const { t } = useI18n()
const router = useRouter()
const userInfo = computed(() =>
  getUser<{
    nickName?: string
    userName?: string
  }>(),
)
const displayName = computed(() => userInfo.value?.nickName || userInfo.value?.userName || t('assistant.home.fallbackName'))
const greetingText = computed(() => t('assistant.home.greeting', { name: displayName.value }))

const primaryMetrics = computed<HomeMetric[]>(() => [
  {
    cardId: 'pending-classes',
    label: t('assistant.home.primary.pendingClasses'),
    value: '3',
    unit: t('assistant.home.primary.pendingClassesUnit'),
    hint: t('assistant.home.primary.pendingClassesHint'),
    iconClass: 'mdi-book-clock-outline',
    toneClass: 'assistant-home__metric-card--warm',
  },
  {
    cardId: 'weekly-hours',
    label: t('assistant.home.primary.weeklyHours'),
    value: '12.5',
    unit: t('assistant.home.primary.weeklyHoursUnit'),
    hint: t('assistant.home.primary.weeklyHoursHint'),
    iconClass: 'mdi-clock-outline',
    toneClass: 'assistant-home__metric-card--cool',
  },
  {
    cardId: 'mock-followups',
    label: t('assistant.home.primary.mockFollowups'),
    value: '2',
    unit: t('assistant.home.primary.mockFollowupsUnit'),
    hint: t('assistant.home.primary.mockFollowupsHint'),
    iconClass: 'mdi-account-voice',
    toneClass: 'assistant-home__metric-card--accent',
  },
])

const secondaryStats = computed<HomeStat[]>(() => [
  {
    cardId: 'student-count',
    label: t('assistant.home.stats.studentCount'),
    value: '15',
    unit: t('assistant.home.stats.studentCountUnit'),
    iconClass: 'mdi-account-group',
    toneClass: 'assistant-home__stat-icon--primary',
  },
  {
    cardId: 'schedule-status',
    label: t('assistant.home.stats.weeklySchedule'),
    value: t('assistant.home.stats.weeklyScheduleFilled'),
    iconClass: 'mdi-calendar-check',
    toneClass: 'assistant-home__stat-icon--success',
  },
  {
    cardId: 'position-followups',
    label: t('assistant.home.stats.positionFollowups'),
    value: '6',
    unit: t('assistant.home.stats.positionFollowupsUnit'),
    iconClass: 'mdi-briefcase-search',
    toneClass: 'assistant-home__stat-icon--info',
  },
  {
    cardId: 'today-classes',
    label: t('assistant.home.stats.todayClasses'),
    value: '2',
    unit: t('assistant.home.stats.todayClassesUnit'),
    iconClass: 'mdi-calendar-clock',
    toneClass: 'assistant-home__stat-icon--warning',
  },
])

const quickEntries = computed<QuickEntry[]>(() => [
  {
    label: t('assistant.home.quick.positions'),
    route: '/career/positions',
    description: t('assistant.home.quick.positionsDesc'),
    iconClass: 'mdi-briefcase-search',
    toneClass: 'assistant-home__quick-icon--primary',
  },
  {
    label: t('assistant.home.quick.students'),
    route: '/students',
    description: t('assistant.home.quick.studentsDesc'),
    iconClass: 'mdi-account-group',
    toneClass: 'assistant-home__quick-icon--info',
  },
  {
    label: t('assistant.home.quick.classRecords'),
    route: '/class-records',
    description: t('assistant.home.quick.classRecordsDesc'),
    iconClass: 'mdi-book-open-variant',
    toneClass: 'assistant-home__quick-icon--success',
  },
  {
    label: t('assistant.home.quick.schedule'),
    route: '/schedule',
    description: t('assistant.home.quick.scheduleDesc'),
    iconClass: 'mdi-calendar-clock',
    toneClass: 'assistant-home__quick-icon--warning',
  },
])

function goTo(path: string) {
  void router.push(path)
}
</script>

<style scoped lang="scss">
.assistant-home {
  --home-primary: #7399c6;
  --home-primary-dark: #5a7ba3;
  --home-primary-light: #e8f0f8;
  --home-border: #e2e8f0;
  --home-text: #1e293b;
  --home-text-soft: #64748b;
  --home-muted: #94a3b8;
  --home-surface: #ffffff;
  --home-shadow: 0 18px 40px rgba(115, 153, 198, 0.14);

  display: grid;
  gap: 24px;
  color: var(--home-text);
}

.assistant-home__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.2), transparent 34%),
    linear-gradient(135deg, var(--home-primary-dark) 0%, var(--home-primary) 48%, #9bb8d9 100%);
  padding: 32px;
  color: #fff;
  box-shadow: var(--home-shadow);
}

.assistant-home__hero-copy {
  max-width: 640px;
}

.assistant-home__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.8;
}

.assistant-home__hero-title {
  margin: 0;
  font-size: clamp(28px, 4vw, 36px);
  font-weight: 700;
  line-height: 1.15;
}

.assistant-home__hero-description {
  margin: 12px 0 0;
  max-width: 560px;
  font-size: 15px;
  line-height: 1.7;
  opacity: 0.92;
}

.assistant-home__hero-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 14px;
  background: #fff;
  color: var(--home-primary-dark);
  padding: 14px 22px;
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 10px 26px rgba(16, 24, 40, 0.12);
  cursor: pointer;
}

.assistant-home__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.assistant-home__metric-card {
  display: grid;
  gap: 16px;
  min-height: 184px;
  border-radius: 20px;
  padding: 24px;
  background: var(--home-surface);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.assistant-home__metric-card--warm {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
}

.assistant-home__metric-card--cool {
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  color: #fff;
}

.assistant-home__metric-card--accent {
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  color: #fff;
}

.assistant-home__metric-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.assistant-home__metric-label {
  font-size: 14px;
  font-weight: 600;
  opacity: 0.92;
}

.assistant-home__metric-icon {
  font-size: 24px;
  opacity: 0.95;
}

.assistant-home__metric-value {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.assistant-home__metric-unit {
  font-size: 18px;
  font-weight: 600;
  opacity: 0.9;
}

.assistant-home__metric-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  opacity: 0.9;
}

.assistant-home__stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.assistant-home__stat-card {
  display: grid;
  gap: 10px;
  border-radius: 18px;
  background: var(--home-surface);
  padding: 22px;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
}

.assistant-home__stat-icon {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  font-size: 22px;
}

.assistant-home__stat-icon--primary {
  background: var(--home-primary-light);
  color: var(--home-primary-dark);
}

.assistant-home__stat-icon--success {
  background: #dcfce7;
  color: #15803d;
}

.assistant-home__stat-icon--info {
  background: #dbeafe;
  color: #2563eb;
}

.assistant-home__stat-icon--warning {
  background: #fef3c7;
  color: #d97706;
}

.assistant-home__stat-label {
  margin-bottom: 4px;
  color: var(--home-text-soft);
  font-size: 13px;
  font-weight: 500;
}

.assistant-home__stat-value {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 24px;
  font-weight: 800;
}

.assistant-home__stat-unit {
  font-size: 14px;
  font-weight: 600;
  color: var(--home-muted);
}

.card {
  border-radius: 20px;
  background: var(--home-surface);
  box-shadow: var(--home-shadow);
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 24px 0;
}

.card-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.assistant-home__section-note {
  margin: 6px 0 0;
  color: var(--home-text-soft);
  font-size: 13px;
}

.card-body {
  padding: 22px 24px 24px;
}

.assistant-home__quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.assistant-home__quick-card {
  display: grid;
  justify-items: start;
  gap: 12px;
  min-height: 164px;
  border: 1px solid var(--home-border);
  border-radius: 18px;
  background: #fff;
  padding: 22px;
  text-align: left;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  cursor: pointer;
}

.assistant-home__quick-card.is-hoverable:hover {
  border-color: var(--home-primary);
  box-shadow: 0 12px 30px rgba(115, 153, 198, 0.15);
  transform: translateY(-4px);
}

.assistant-home__quick-icon {
  display: inline-flex;
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  font-size: 26px;
}

.assistant-home__quick-icon--primary {
  background: var(--home-primary-light);
  color: var(--home-primary-dark);
}

.assistant-home__quick-icon--info {
  background: #dbeafe;
  color: #2563eb;
}

.assistant-home__quick-icon--success {
  background: #d1fae5;
  color: #059669;
}

.assistant-home__quick-icon--warning {
  background: #fef3c7;
  color: #d97706;
}

.assistant-home__quick-title {
  font-size: 16px;
  font-weight: 700;
}

.assistant-home__quick-description {
  color: var(--home-text-soft);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 1200px) {
  .assistant-home__metrics,
  .assistant-home__quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .assistant-home__stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .assistant-home__hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 24px;
  }

  .assistant-home__hero-cta {
    width: 100%;
  }

  .assistant-home__metrics,
  .assistant-home__stats-grid,
  .assistant-home__quick-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .card-header,
  .card-body {
    padding-left: 18px;
    padding-right: 18px;
  }
}
</style>
