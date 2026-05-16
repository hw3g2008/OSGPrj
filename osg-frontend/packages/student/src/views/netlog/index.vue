<template>
  <div id="page-netlog" class="netlog-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ t('student.netlog.k1') }} <span>Networking Log</span></h1>
          </div>
        </div>
      </template>

      <section class="action-hero">
        <div>
          <h2>{{ t('student.netlog.k2') }}</h2>
          <p>{{ t('student.netlog.k3') }}</p>
        </div>
        <a-button type="primary" size="large" @click="openCreate">
          {{ t('student.netlog.k4') }}
        </a-button>
      </section>

      <div class="card-shell">
        <div class="card-header">
          <span>{{ t('student.netlog.k5') }}</span>
        </div>
        <div class="toolbar">
          <a-input :placeholder="t('student.netlog.k21')" class="toolbar-input" />
          <a-select class="toolbar-select" :placeholder="t('student.netlog.k8')" :options="levelOptions" />
          <a-date-picker class="toolbar-date" />
        </div>

        <div class="table-shell">
          <table class="record-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{{ t('student.netlog.k6') }}</th>
                <th>{{ t('student.netlog.k7') }}</th>
                <th>{{ t('student.netlog.k8') }}</th>
                <th>{{ t('student.netlog.k9') }}</th>
                <th>{{ t('student.netlog.k10') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in networkingLogs" :key="item.id">
                <td>{{ item.id }}</td>
                <td>{{ item.company }}</td>
                <td>{{ item.person }}</td>
                <td>{{ item.level }}</td>
                <td>{{ item.time }}</td>
                <td>
                  <a-button type="link" size="small" @click="openDetail(item)">{{ t('student.netlog.k11') }}</a-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </OsgPageContainer>

    <a-modal v-model:open="detailOpen" :title="t('student.netlog.k22')" :footer="null" width="620px" wrap-class-name="osg-modal-form">
      <div v-if="activeLog" class="detail-grid">
        <div class="detail-row"><span class="detail-label">{{ t('student.netlog.k6') }}</span><span>{{ activeLog.company }}</span></div>
        <div class="detail-row"><span class="detail-label">{{ t('student.netlog.k12') }}</span><span>{{ activeLog.person }}</span></div>
        <div class="detail-row"><span class="detail-label">{{ t('student.netlog.k8') }}</span><span>{{ activeLog.level }}</span></div>
        <div class="detail-row"><span class="detail-label">{{ t('student.netlog.k13') }}</span><span>{{ activeLog.time }}</span></div>
        <div class="detail-row"><span class="detail-label">{{ t('student.netlog.k14') }}</span><span>{{ activeLog.channel }}</span></div>
        <div class="detail-block">
          <div class="detail-label">{{ t('student.netlog.k15') }}</div>
          <div class="detail-box">{{ activeLog.notes }}</div>
        </div>
        <div class="detail-block">
          <div class="detail-label">{{ t('student.netlog.k16') }}</div>
          <div class="detail-box detail-success">{{ activeLog.summary }}</div>
        </div>
      </div>

      <div class="dialog-actions">
        <a-button @click="detailOpen = false">{{ t('student.netlog.k17') }}</a-button>
        <a-button type="primary" @click="editFromDetail">{{ t('student.netlog.k18') }}</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="createOpen" :title="t('student.netlog.k23')" :footer="null" width="640px" wrap-class-name="osg-modal-form">
      <div class="form-grid">
        <a-form-item :label="t('student.netlog.k24')" class="form-item">
          <a-input v-model:value="draftLog.company" :placeholder="t('student.netlog.k25')" />
        </a-form-item>
        <a-form-item :label="t('student.netlog.k12')" class="form-item">
          <a-input v-model:value="draftLog.person" :placeholder="t('student.netlog.k26')" />
        </a-form-item>
        <a-form-item :label="t('student.netlog.k8')" class="form-item">
          <a-select v-model:value="draftLog.level" :options="levelOptions" />
        </a-form-item>
        <a-form-item :label="t('student.netlog.k14')" class="form-item">
          <a-select v-model:value="draftLog.channel" :options="channelOptions" />
        </a-form-item>
        <a-form-item :label="t('student.netlog.k27')" class="form-item full-span">
          <a-date-picker class="full-width" />
        </a-form-item>
        <a-form-item :label="t('student.netlog.k15')" class="form-item full-span">
          <a-textarea v-model:value="draftLog.notes" :rows="4" :placeholder="t('student.netlog.k28')" />
        </a-form-item>
        <a-form-item :label="t('student.netlog.k16')" class="form-item full-span">
          <a-textarea v-model:value="draftLog.summary" :rows="4" :placeholder="t('student.netlog.k29')" />
        </a-form-item>
      </div>

      <div class="dialog-actions">
        <a-button @click="createOpen = false">{{ t('student.netlog.k19') }}</a-button>
        <a-button type="primary" @click="createOpen = false">{{ t('student.netlog.k20') }}</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()

type NetworkingLog = {
  actionId: string
  id: string
  company: string
  person: string
  level: string
  time: string
  channel: string
  notes: string
  summary: string
}

const levelOptions = [
  { value: 'Analyst', label: 'Analyst' },
  { value: 'Associate', label: 'Associate' },
  { value: 'VP', label: 'VP' },
  { value: 'Director', label: 'Director' },
  { value: 'MD', label: 'MD' }
]

const channelOptions = [
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Phone', label: t('student.netlog.k30') },
  { value: 'Email', label: t('student.netlog.k31') },
  { value: 'Meeting', label: t('student.netlog.k32') }
]

const networkingLogs: NetworkingLog[] = [
  {
    actionId: 'log-001',
    id: '#N2025001',
    company: 'Goldman Sachs',
    person: 'John Smith',
    level: 'Associate',
    time: '12/09/2025',
    channel: 'LinkedIn',
    notes: t('student.netlog.k33'),
    summary: t('student.netlog.k34')
  },
  {
    actionId: 'log-002',
    id: '#N2025002',
    company: 'Morgan Stanley',
    person: 'Emily Chen',
    level: 'VP',
    time: '12/05/2025',
    channel: 'Email',
    notes: t('student.netlog.k35'),
    summary: t('student.netlog.k36')
  }
]

const detailOpen = ref(false)
const createOpen = ref(false)
const activeLog = ref<NetworkingLog | null>(null)
const draftLog = reactive({
  company: 'Goldman Sachs',
  person: 'John Smith',
  level: 'Associate',
  channel: 'LinkedIn',
  notes: '',
  summary: ''
})

const openCreate = () => {
  createOpen.value = true
}

const openDetail = (item: NetworkingLog) => {
  activeLog.value = item
  draftLog.company = item.company
  draftLog.person = item.person
  draftLog.level = item.level
  draftLog.channel = item.channel
  draftLog.notes = item.notes
  draftLog.summary = item.summary
  detailOpen.value = true
}

const editFromDetail = () => {
  detailOpen.value = false
  createOpen.value = true
}
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

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

.action-hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  margin-bottom: 20px;
  padding: 22px 24px;
  border-radius: 20px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);

  h2 {
    margin: 0 0 6px;
    font-size: 26px;
    color: #1d4ed8;
  }

  p {
    margin: 0;
    color: #475569;
  }
}

.card-shell {
  border: 1px solid #dbe5f0;
  border-radius: 20px;
  background: #fff;
}

.card-header {
  padding: 18px 20px 0;
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 18px 20px;
}

.toolbar-input {
  width: 220px;
}

.toolbar-select {
  width: 180px;
}

.toolbar-date {
  width: 180px;
}

.table-shell {
  overflow-x: auto;
}

.record-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 14px 20px;
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

.detail-grid {
  display: grid;
  gap: 14px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.detail-block {
  display: grid;
  gap: 8px;
}

.detail-label {
  color: #64748b;
  font-size: 13px;
}

.detail-box {
  border-radius: 12px;
  background: #f8fafc;
  padding: 14px 16px;
  line-height: 1.8;
  white-space: pre-line;
}

.detail-success {
  background: #ecfdf5;
  color: #166534;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.form-item {
  margin-bottom: 0;
}

.full-span {
  grid-column: 1 / -1;
}

.full-width {
  width: 100%;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
