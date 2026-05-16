<template>
  <div id="mentor-home" class="mentor-home">
    <section class="hero-card">
      <div class="hero-copy">
        <div class="hero-eyebrow">Mentor Workspace</div>
        <h1>{{ t('mentor.dashboard.k37', { name: profile.nickName || profile.userName || 'Mentor' }) }}</h1>
        <p>{{ t('mentor.dashboard.k38', { email: profile.email || '-', hours: scheduleHours, count: pendingWorkCount }) }}</p>
      </div>
      <div class="hero-identity">
        <div class="hero-avatar">{{ avatarInitials }}</div>
        <div class="hero-meta">
          <strong>{{ profile.nickName || profile.userName || 'Mentor' }}</strong>
          <span>{{ profile.email || '-' }}</span>
          <span>{{ profile.phonenumber || 'Phone Pending' }}</span>
        </div>
      </div>
    </section>

    <section class="stats-grid">
      <article v-for="item in statCards" :key="item.label" class="stat-card">
        <div class="stat-icon" :class="item.tone">
          <i class="mdi" :class="item.icon"></i>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
          <div class="stat-hint">{{ item.hint }}</div>
        </div>
      </article>
    </section>

    <section class="quick-actions-card">
      <div class="section-head">
        <div>
          <h2>{{ t('mentor.dashboard.k1') }}</h2>
          <p>{{ t('mentor.dashboard.k2') }}</p>
        </div>
      </div>
      <div class="quick-actions">
        <button type="button" class="action-btn action-btn--primary" @click="$router.push('/courses')">{{ t('mentor.dashboard.k3') }}</button>
        <button type="button" class="action-btn" @click="$router.push('/job-overview')">{{ t('mentor.dashboard.k4') }}</button>
        <button type="button" class="action-btn" @click="$router.push('/schedule')">{{ t('mentor.dashboard.k5') }}</button>
        <button type="button" class="action-btn" @click="$router.push('/profile')">{{ t('mentor.dashboard.k6') }}</button>
      </div>
    </section>

    <section class="two-column">
      <article class="panel-card">
        <div class="section-head">
          <div>
            <h2>{{ t('mentor.dashboard.k7') }}</h2>
            <p>{{ t('mentor.dashboard.k8') }}</p>
          </div>
        </div>
        <div class="overview-list">
          <div class="overview-item">
            <span>{{ t('mentor.dashboard.k9') }}</span>
            <strong>{{ jobRows.length }}</strong>
          </div>
          <div class="overview-item">
            <span>{{ t('mentor.dashboard.k10') }}</span>
            <strong>{{ mockRows.length }}</strong>
          </div>
          <div class="overview-item">
            <span>{{ t('mentor.dashboard.k11') }}</span>
            <strong>{{ classRows.length }}</strong>
          </div>
          <div class="overview-item">
            <span>{{ t('mentor.dashboard.k12') }}</span>
            <strong>{{ scheduleHours }}h</strong>
          </div>
        </div>
      </article>

      <article class="panel-card">
        <div class="section-head">
          <div>
            <h2>{{ t('mentor.dashboard.k13') }}</h2>
            <p>{{ t('mentor.dashboard.k14') }}</p>
          </div>
        </div>
        <div class="schedule-summary">
          <div v-for="slot in scheduleRows" :key="slot.label" class="schedule-row">
            <span>{{ slot.label }}</span>
            <strong>{{ slot.value }}</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="two-column">
      <article class="panel-card">
        <div class="section-head">
          <div>
            <h2>{{ t('mentor.dashboard.k15') }}</h2>
            <p>{{ t('mentor.dashboard.k16') }}</p>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('mentor.dashboard.k17') }}</th>
              <th>{{ t('mentor.dashboard.k18') }}</th>
              <th>{{ t('mentor.dashboard.k19') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in recentJobRows" :key="row.id">
              <td>{{ row.studentName || t('mentor.dashboard.k39', { id: row.studentId }) }}</td>
              <td>{{ row.company }} / {{ row.position }}</td>
              <td>{{ row.interviewStage || '-' }}</td>
            </tr>
            <tr v-if="recentJobRows.length === 0">
              <td colspan="3" class="empty-cell">{{ t('mentor.dashboard.k20') }}</td>
            </tr>
          </tbody>
        </table>
      </article>

      <article class="panel-card">
        <div class="section-head">
          <div>
            <h2>{{ t('mentor.dashboard.k21') }}</h2>
            <p>{{ t('mentor.dashboard.k22') }}</p>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('mentor.dashboard.k23') }}</th>
              <th>{{ t('mentor.dashboard.k17') }}</th>
              <th>{{ t('mentor.dashboard.k24') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in recentClassRows" :key="row.id">
              <td>{{ row.recordNo || row.id }}</td>
              <td>{{ row.studentName || t('mentor.dashboard.k39', { id: row.studentId }) }}</td>
              <td>{{ row.contentType || row.coachingType || '-' }}</td>
            </tr>
            <tr v-if="recentClassRows.length === 0">
              <td colspan="3" class="empty-cell">{{ t('mentor.dashboard.k25') }}</td>
            </tr>
          </tbody>
        </table>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { listClassRecords, type ClassRecord } from '@/api/classRecord'
import { listJobOverview, type JobCoaching } from '@/api/jobOverview'
import { listMockPractice, type MockPractice } from '@/api/mockPractice'
import { getMentorProfile } from '@/api/profile'
import { getCurrentSchedule, getLastWeekSchedule, type MentorSchedule } from '@/api/schedule'

const { t } = useI18n()

const profile = reactive<Record<string, any>>({
  userName: '',
  nickName: '',
  email: '',
  phonenumber: '',
})

const schedule = ref<MentorSchedule | null>(null)
const lastWeekSchedule = ref<MentorSchedule | null>(null)
const jobRows = ref<JobCoaching[]>([])
const mockRows = ref<MockPractice[]>([])
const classRows = ref<ClassRecord[]>([])

const avatarInitials = computed(() => {
  const name = String(profile.nickName || profile.userName || 'Mentor').trim()
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'ME'
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('')
})

const scheduleHours = computed(() => Number(schedule.value?.totalHours || 0))
const activeScheduleDays = computed(() => {
  const current = schedule.value
  if (!current) return 0
  return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    .filter((key) => current[key as keyof MentorSchedule] && current[key as keyof MentorSchedule] !== 'unavailable')
    .length
})

const pendingWorkCount = computed(() => jobRows.value.length + mockRows.value.length + classRows.value.length)

const statCards = computed(() => [
  {
    label: t('mentor.dashboard.k26'),
    value: String(classRows.value.length),
    hint: t('mentor.dashboard.k11'),
    icon: 'mdi-file-document-edit-outline',
    tone: 'tone-blue',
  },
  {
    label: t('mentor.dashboard.k27'),
    value: String(jobRows.value.length + mockRows.value.length),
    hint: t('mentor.dashboard.k28'),
    icon: 'mdi-briefcase-clock-outline',
    tone: 'tone-green',
  },
  {
    label: t('mentor.dashboard.k29'),
    value: `${scheduleHours.value}h`,
    hint: t('mentor.dashboard.k40', { days: activeScheduleDays.value }),
    icon: 'mdi-calendar-clock-outline',
    tone: 'tone-amber',
  },
  {
    label: t('mentor.dashboard.k30'),
    value: String(pendingWorkCount.value),
    hint: t('mentor.dashboard.k31'),
    icon: 'mdi-chart-box-outline',
    tone: 'tone-purple',
  },
])

const scheduleRows = computed(() => {
  const current = schedule.value
  const last = lastWeekSchedule.value
  return [
    {
      label: t('mentor.dashboard.k32'),
      value: current?.totalHours ? `${current.totalHours}h` : t('mentor.dashboard.k33'),
    },
    {
      label: t('mentor.dashboard.k34'),
      value: last?.totalHours ? `${last.totalHours}h` : t('mentor.dashboard.k35'),
    },
    {
      label: t('mentor.dashboard.k36'),
      value: t('mentor.dashboard.k41', { n: activeScheduleDays.value }),
    },
  ]
})

const recentJobRows = computed(() => jobRows.value.slice(0, 5))
const recentClassRows = computed(() => classRows.value.slice(0, 5))

async function loadDashboard() {
  const [profileView, scheduleView, lastWeekView, jobOverviewView, mockPracticeView, classRecordsView] =
    await Promise.all([
      getMentorProfile(),
      getCurrentSchedule().catch(() => null),
      getLastWeekSchedule().catch(() => null),
      listJobOverview().catch(() => ({ rows: [] as JobCoaching[] })),
      listMockPractice().catch(() => ({ rows: [] as MockPractice[] })),
      listClassRecords().catch(() => ({ rows: [] as ClassRecord[] })),
    ])

  Object.assign(profile, profileView || {})
  schedule.value = scheduleView
  lastWeekSchedule.value = lastWeekView
  jobRows.value = Array.isArray(jobOverviewView?.rows) ? jobOverviewView.rows : []
  mockRows.value = Array.isArray(mockPracticeView?.rows) ? mockPracticeView.rows : []
  classRows.value = Array.isArray(classRecordsView?.rows) ? classRecordsView.rows : []
}

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped>
.mentor-home {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-card,
.quick-actions-card,
.panel-card,
.stat-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
  border: 1px solid #e2e8f0;
}

.hero-card {
  padding: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  background: linear-gradient(135deg, #eff6ff 0%, #ffffff 55%, #f8fafc 100%);
}

.hero-eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1.4px;
  color: #64748b;
  margin-bottom: 8px;
}

.hero-copy h1 {
  margin: 0 0 10px;
  font-size: 30px;
  color: #0f172a;
}

.hero-copy p {
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.hero-identity {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 260px;
  justify-content: flex-end;
}

.hero-avatar {
  width: 72px;
  height: 72px;
  border-radius: 24px;
  background: linear-gradient(135deg, #7399c6, #9bb8d9);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
}

.hero-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hero-meta strong {
  color: #0f172a;
  font-size: 18px;
}

.hero-meta span {
  color: #64748b;
  font-size: 13px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
}

.tone-blue {
  background: linear-gradient(135deg, #7399c6, #9bb8d9);
}

.tone-green {
  background: linear-gradient(135deg, #16a34a, #4ade80);
}

.tone-amber {
  background: linear-gradient(135deg, #d97706, #fbbf24);
}

.tone-purple {
  background: linear-gradient(135deg, #7c3aed, #a78bfa);
}

.stat-value {
  font-size: 30px;
  font-weight: 800;
  color: #0f172a;
}

.stat-label {
  font-size: 13px;
  color: #475569;
  margin-top: 2px;
}

.stat-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 6px;
}

.quick-actions-card,
.panel-card {
  padding: 24px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.section-head h2 {
  margin: 0 0 6px;
  font-size: 20px;
  color: #0f172a;
}

.section-head p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.action-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 12px;
  padding: 12px 18px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.action-btn--primary {
  background: linear-gradient(135deg, #7399c6, #9bb8d9);
  color: #fff;
  border-color: transparent;
}

.two-column {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.overview-list,
.schedule-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.overview-item,
.schedule-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.overview-item span,
.schedule-row span {
  color: #64748b;
  font-size: 14px;
}

.overview-item strong,
.schedule-row strong {
  color: #0f172a;
  font-size: 16px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.data-table th {
  font-size: 12px;
  color: #64748b;
  text-transform: uppercase;
}

.data-table td {
  font-size: 14px;
  color: #0f172a;
}

.empty-cell {
  text-align: center;
  color: #94a3b8;
  padding: 24px 10px;
}

@media (max-width: 1100px) {
  .stats-grid,
  .two-column {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .hero-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-identity {
    justify-content: flex-start;
    min-width: 0;
  }

  .stats-grid,
  .two-column {
    grid-template-columns: 1fr;
  }
}
</style>
