<template>
  <div class="restricted-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ $t('restricted_mode') }} <span>Restricted Mode</span></h1>
            <p class="page-sub">{{ $t('when_the_account_is_restricted_only_limi') }}。</p>
          </div>
        </div>
      </template>

      <div class="status-banner">
        <div>
          <h3>{{ $t('account_restricted') }}</h3>
          <p>{{ $t('your_account_is_currently_frozen_you_can') }}。</p>
        </div>
      </div>

      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="home" :tab="$t('home_page')" />
        <a-tab-pane key="myclass" :tab="$t('my_sessions')" />
        <a-tab-pane key="feedback" :tab="$t('course_feedback')" />
      </a-tabs>

      <template v-if="activeTab === 'home'">
        <div class="stat-grid">
          <div class="stat-card"><strong>15.5h</strong><span>{{ $t('remaining_hours') }}</span></div>
          <div class="stat-card"><strong>24.5h</strong><span>{{ $t('sessions_used') }}</span></div>
          <div class="stat-card"><strong>40h</strong><span>{{ $t('total_contract_sessions') }}</span></div>
        </div>

        <section class="panel">
          <div class="panel-title">{{ $t('recent_course_records') }}</div>
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
            <h4>{{ $t('contact_class_advisor') }}</h4>
            <p>{{ $t('if_you_need_to_restore_your_account_or_h') }}</p>
          </div>
          <a-button type="primary">{{ $t('send_message') }}</a-button>
        </section>
      </template>

      <template v-else-if="activeTab === 'myclass'">
        <section class="panel">
          <div class="panel-title">{{ $t('my_sessions') }}</div>
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
          <div class="panel-title">{{ $t('course_feedback') }}</div>
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
                  <a-button type="link" size="small">{{ $t('view_details') }}</a-button>
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
import { OsgPageContainer } from '@osg/shared/components'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const activeTab = ref<'home' | 'myclass' | 'feedback'>('home')

const homeColumns = [
  { title: t('date'), dataIndex: 'date', key: 'date' },
  { title: t('course_type'), dataIndex: 'courseType', key: 'courseType' },
  { title: t('mentor'), dataIndex: 'mentor', key: 'mentor' },
  { title: t('duration'), dataIndex: 'duration', key: 'duration' },
  { title: t('status'), dataIndex: 'status', key: 'status' },
]

const classColumns = [
  { title: t('date'), dataIndex: 'date', key: 'date' },
  { title: t('time'), dataIndex: 'time', key: 'time' },
  { title: t('course_type'), dataIndex: 'courseType', key: 'courseType' },
  { title: t('mentor'), dataIndex: 'mentor', key: 'mentor' },
  { title: t('duration'), dataIndex: 'duration', key: 'duration' },
  { title: t('status'), dataIndex: 'status', key: 'status' },
]

const feedbackColumns = [
  { title: t('date'), dataIndex: 'date', key: 'date' },
  { title: t('course_type'), dataIndex: 'courseType', key: 'courseType' },
  { title: t('mentor'), dataIndex: 'mentor', key: 'mentor' },
  { title: t('feedback'), dataIndex: 'rating', key: 'rating' },
  { title: t('operation'), key: 'action' },
]

const restrictedHomeRows = [
  { date: '2025-12-15', courseType: t('mock_interview'), mentor: 'Jerry Li', duration: '1.5h', status: t('completed') },
  { date: '2025-12-10', courseType: t('resume_revision'), mentor: 'Test Lead Mentor', duration: '1h', status: t('completed') },
  { date: '2025-12-05', courseType: 'Case Study', mentor: 'Jerry Li', duration: '2h', status: t('completed') }
]

const restrictedClassRows = [
  { date: '2025-12-15', time: '14:00-15:30', courseType: t('mock_interview'), mentor: 'Jerry Li', duration: '1.5h', status: t('completed') },
  { date: '2025-12-10', time: '10:00-11:00', courseType: t('resume_revision'), mentor: 'Test Lead Mentor', duration: '1h', status: t('completed') },
  { date: '2025-12-05', time: '15:00-17:00', courseType: 'Case Study', mentor: 'Jerry Li', duration: '2h', status: t('completed') }
]

const restrictedFeedbackRows = [
  { date: '2025-12-15', courseType: t('mock_interview'), mentor: 'Jerry Li', rating: 'Great' },
  { date: '2025-12-10', courseType: t('resume_revision'), mentor: 'Test Lead Mentor', rating: 'Great' },
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
