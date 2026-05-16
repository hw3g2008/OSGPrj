<template>
  <div class="restricted-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ t('student.restricted.k1') }} <span>Restricted Mode</span></h1>
          </div>
        </div>
      </template>

      <div class="status-banner">
        <div>
          <h3>{{ t('student.restricted.k2') }}</h3>
          <p>{{ t('student.restricted.k3') }}</p>
        </div>
      </div>

      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="home" :tab="t('student.restricted.k14')" />
        <a-tab-pane key="myclass" :tab="t('student.restricted.k11')" />
        <a-tab-pane key="feedback" :tab="t('student.restricted.k12')" />
      </a-tabs>

      <template v-if="activeTab === 'home'">
        <div class="stat-grid">
          <div class="stat-card"><strong>15.5h</strong><span>{{ t('student.restricted.k4') }}</span></div>
          <div class="stat-card"><strong>24.5h</strong><span>{{ t('student.restricted.k5') }}</span></div>
          <div class="stat-card"><strong>40h</strong><span>{{ t('student.restricted.k6') }}</span></div>
        </div>

        <section class="panel">
          <div class="panel-title">{{ t('student.restricted.k7') }}</div>
          <div class="table-shell">
            <a-table
              :columns="homeColumns"
              :data-source="restrictedHomeRows"
              :pagination="false"
              :row-key="(record: any) => record.date + record.courseType"
              class="record-table"
            />
          </div>
        </section>

        <section class="contact-card">
          <div>
            <h4>{{ t('student.restricted.k8') }}</h4>
            <p>{{ t('student.restricted.k9') }}</p>
          </div>
          <a-button type="primary">{{ t('student.restricted.k10') }}</a-button>
        </section>
      </template>

      <template v-else-if="activeTab === 'myclass'">
        <section class="panel">
          <div class="panel-title">{{ t('student.restricted.k11') }}</div>
          <div class="table-shell">
            <a-table
              :columns="classColumns"
              :data-source="restrictedClassRows"
              :pagination="false"
              :row-key="(record: any) => record.date + record.time"
              class="record-table"
            />
          </div>
        </section>
      </template>

      <template v-else>
        <section class="panel">
          <div class="panel-title">{{ t('student.restricted.k12') }}</div>
          <div class="table-shell">
            <a-table
              :columns="feedbackColumns"
              :data-source="restrictedFeedbackRows"
              :pagination="false"
              :row-key="(record: any) => record.date + record.courseType"
              class="record-table"
            >
              <template #bodyCell="{ column }">
                <template v-if="column.key === 'action'">
                  <a-button type="link" size="small">{{ t('student.restricted.k13') }}</a-button>
                </template>
              </template>
            </a-table>
          </div>
        </section>
      </template>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()

const activeTab = ref<'home' | 'myclass' | 'feedback'>('home')

const homeColumns = [
  { title: t('student.restricted.k15'), dataIndex: 'date', key: 'date' },
  { title: t('student.restricted.k16'), dataIndex: 'courseType', key: 'courseType' },
  { title: t('student.restricted.k17'), dataIndex: 'mentor', key: 'mentor' },
  { title: t('student.restricted.k18'), dataIndex: 'duration', key: 'duration' },
  { title: t('student.restricted.k19'), dataIndex: 'status', key: 'status' },
]

const classColumns = [
  { title: t('student.restricted.k15'), dataIndex: 'date', key: 'date' },
  { title: t('student.restricted.k20'), dataIndex: 'time', key: 'time' },
  { title: t('student.restricted.k16'), dataIndex: 'courseType', key: 'courseType' },
  { title: t('student.restricted.k17'), dataIndex: 'mentor', key: 'mentor' },
  { title: t('student.restricted.k18'), dataIndex: 'duration', key: 'duration' },
  { title: t('student.restricted.k19'), dataIndex: 'status', key: 'status' },
]

const feedbackColumns = [
  { title: t('student.restricted.k15'), dataIndex: 'date', key: 'date' },
  { title: t('student.restricted.k16'), dataIndex: 'courseType', key: 'courseType' },
  { title: t('student.restricted.k17'), dataIndex: 'mentor', key: 'mentor' },
  { title: t('student.restricted.k21'), dataIndex: 'rating', key: 'rating' },
  { title: t('student.restricted.k22'), key: 'action' },
]

const restrictedHomeRows = [
  { date: '2025-12-15', courseType: t('student.restricted.k23'), mentor: 'Jerry Li', duration: '1.5h', status: t('student.restricted.k24') },
  { date: '2025-12-10', courseType: t('student.restricted.k25'), mentor: 'Test Lead Mentor', duration: '1h', status: t('student.restricted.k24') },
  { date: '2025-12-05', courseType: 'Case Study', mentor: 'Jerry Li', duration: '2h', status: t('student.restricted.k24') }
]

const restrictedClassRows = [
  { date: '2025-12-15', time: '14:00-15:30', courseType: t('student.restricted.k23'), mentor: 'Jerry Li', duration: '1.5h', status: t('student.restricted.k24') },
  { date: '2025-12-10', time: '10:00-11:00', courseType: t('student.restricted.k25'), mentor: 'Test Lead Mentor', duration: '1h', status: t('student.restricted.k24') },
  { date: '2025-12-05', time: '15:00-17:00', courseType: 'Case Study', mentor: 'Jerry Li', duration: '2h', status: t('student.restricted.k24') }
]

const restrictedFeedbackRows = [
  { date: '2025-12-15', courseType: t('student.restricted.k23'), mentor: 'Jerry Li', rating: 'Great' },
  { date: '2025-12-10', courseType: t('student.restricted.k25'), mentor: 'Test Lead Mentor', rating: 'Great' },
  { date: '2025-12-05', courseType: 'Case Study', mentor: 'Jerry Li', rating: 'Good' }
]
</script>

<style scoped lang="scss">
.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;

  span {
    color: #4f6b8a;
  }
}

.page-sub {
  margin: 10px 0 0;
  color: #64748b;
}

.status-banner {
  border-radius: 20px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  padding: 22px 24px;
  margin-bottom: 20px;

  h3 {
    margin: 0 0 8px;
    color: #92400e;
  }

  p {
    margin: 0;
    color: #78350f;
  }
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 18px;
  background: #f8fafc;
  padding: 18px;
  text-align: center;

  strong {
    display: block;
    font-size: 32px;
    color: #2563eb;
  }

  span {
    color: #64748b;
    font-size: 13px;
  }
}

.panel {
  border: 1px solid #dbe5f0;
  border-radius: 20px;
  background: #fff;
  overflow: hidden;
  margin-bottom: 20px;
}

.panel-title {
  padding: 16px 20px;
  font-size: 17px;
  font-weight: 700;
}

.table-shell {
  overflow-x: auto;
}

.record-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 14px 18px;
    border-top: 1px solid #e2e8f0;
    text-align: left;
  }

  th {
    background: #f8fafc;
    color: #475569;
    font-size: 13px;
    font-weight: 700;
  }
}

.contact-card {
  border: 1px solid #dbe5f0;
  border-radius: 20px;
  background: #fff;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;

  h4 {
    margin: 0 0 6px;
  }

  p {
    margin: 0;
    color: #64748b;
  }
}
</style>
