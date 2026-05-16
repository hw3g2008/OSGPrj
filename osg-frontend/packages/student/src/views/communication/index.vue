<template>
  <div id="page-communication" class="communication-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ t('student.communication.k1') }} <span>Communication Records</span></h1>
          </div>
        </div>
      </template>

      <div class="toolbar">
        <a-input :placeholder="t('student.communication.k10')" class="toolbar-input" />
        <a-select class="toolbar-select" :placeholder="t('student.communication.k5')" :options="communicationMethodOptions" />
        <a-button>{{ t('student.communication.k2') }}</a-button>
      </div>

      <div class="table-shell">
        <a-table
          :columns="recordColumns"
          :data-source="communicationRecords"
          :pagination="false"
          :row-key="(record: any) => record.id"
          class="record-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'owner'">
              <strong>{{ record.owner }}</strong>
            </template>
            <template v-else-if="column.key === 'method'">
              <a-tag :color="record.methodColor">{{ record.method }}</a-tag>
            </template>
            <template v-else-if="column.key === 'summary'">
              <span class="ellipsis">{{ record.summary }}</span>
            </template>
            <template v-else-if="column.key === 'followUp'">
              <a-tag :color="record.followUpColor">{{ record.followUp }}</a-tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" size="small" @click="openDetail(record)">{{ t('student.communication.k3') }}</a-button>
            </template>
          </template>
        </a-table>
      </div>
    </OsgPageContainer>

    <a-modal
      v-model:open="detailOpen"
      wrap-class-name="osg-modal-form"
      :title="t('student.communication.k11')"
      :footer="null"
      width="620px"
    >
      <div v-if="activeRecord" class="detail-grid">
        <div class="detail-row">
          <span class="detail-label">{{ t('student.communication.k4') }}</span>
          <span>{{ activeRecord.owner }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('student.communication.k5') }}</span>
          <span>{{ activeRecord.method }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('student.communication.k6') }}</span>
          <span>{{ activeRecord.time }}</span>
        </div>
        <div class="detail-block">
          <div class="detail-label">{{ t('student.communication.k7') }}</div>
          <div class="detail-box">{{ activeRecord.summary }}</div>
        </div>
        <div class="detail-block">
          <div class="detail-label">{{ t('student.communication.k8') }}</div>
          <div class="detail-box">{{ activeRecord.followUpDetail }}</div>
        </div>
      </div>
      <div class="dialog-actions">
        <a-button @click="detailOpen = false">{{ t('student.communication.k9') }}</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()

const recordColumns = [
  { title: t('student.communication.k4'), key: 'owner' },
  { title: t('student.communication.k5'), key: 'method' },
  { title: t('student.communication.k6'), dataIndex: 'time', key: 'time' },
  { title: t('student.communication.k7'), key: 'summary' },
  { title: t('student.communication.k8'), key: 'followUp' },
  { title: t('student.communication.k12'), key: 'action' },
]

type CommunicationRecord = {
  id: string
  owner: string
  method: string
  methodColor: string
  time: string
  summary: string
  followUp: string
  followUpColor: string
  followUpDetail: string
}

const communicationMethodOptions = [
  { value: 'wechat', label: t('student.communication.k13') },
  { value: 'phone', label: t('student.communication.k14') },
  { value: 'email', label: t('student.communication.k15') },
  { value: 'meeting', label: t('student.communication.k16') }
]

const communicationRecords: CommunicationRecord[] = [
  {
    id: 'COMM-001',
    owner: t('student.communication.k17'),
    method: t('student.communication.k13'),
    methodColor: 'processing',
    time: '01/18/2026 10:30',
    summary: t('student.communication.k18'),
    followUp: t('student.communication.k19'),
    followUpColor: 'gold',
    followUpDetail: t('student.communication.k20')
  },
  {
    id: 'COMM-002',
    owner: t('student.communication.k21'),
    method: t('student.communication.k14'),
    methodColor: 'default',
    time: '01/17/2026 14:00',
    summary: t('student.communication.k22'),
    followUp: t('student.communication.k23'),
    followUpColor: 'success',
    followUpDetail: t('student.communication.k24')
  },
  {
    id: 'COMM-003',
    owner: t('student.communication.k17'),
    method: t('student.communication.k15'),
    methodColor: 'processing',
    time: '01/15/2026 09:00',
    summary: t('student.communication.k25'),
    followUp: t('student.communication.k23'),
    followUpColor: 'success',
    followUpDetail: t('student.communication.k26')
  }
]

const detailOpen = ref(false)
const activeRecord = ref<CommunicationRecord | null>(null)

const openDetail = (record: CommunicationRecord) => {
  activeRecord.value = record
  detailOpen.value = true
}
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;

  span {
    color: #4f6b8a;
    font-weight: 600;
  }
}

.page-sub {
  margin: 10px 0 0;
  color: #64748b;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.toolbar-input {
  width: 220px;
}

.toolbar-select {
  width: 160px;
}

.table-shell {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
}

.record-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 14px 16px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f8fafc;
    color: #475569;
    font-size: 13px;
    font-weight: 700;
  }
}

.ellipsis {
  max-width: 280px;
  color: #475569;
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
  line-height: 1.7;
  color: #334155;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>
