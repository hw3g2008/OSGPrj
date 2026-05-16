<template>
  <div id="page-online-test-bank" class="online-test-bank-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ t('student.onlineTestBank.k1') }} <span>Online Test Bank</span></h1>
          </div>
        </div>
      </template>

      <div class="toolbar">
        <a-input :placeholder="t('student.onlineTestBank.k4')" class="toolbar-input" />
        <a-select class="toolbar-select" :placeholder="t('student.onlineTestBank.k5')" :options="companyOptions" />
        <a-select class="toolbar-select" :placeholder="t('student.onlineTestBank.k6')" :options="typeOptions" />
        <a-button>{{ t('student.onlineTestBank.k2') }}</a-button>
      </div>

      <div class="table-shell">
        <a-table
          :columns="bankColumns"
          :data-source="questionBanks"
          :pagination="false"
          :row-key="(record: any) => record.name"
          class="record-table"
        >
          <template #bodyCell="{ column }">
            <template v-if="column.key === 'action'">
              <a-button type="link" size="small">{{ t('student.onlineTestBank.k3') }}</a-button>
            </template>
          </template>
        </a-table>
      </div>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()

const companyOptions = [
  { value: 'gs', label: 'Goldman Sachs' },
  { value: 'jpm', label: 'JP Morgan' },
  { value: 'ms', label: 'Morgan Stanley' },
  { value: 'mck', label: 'McKinsey' }
]

const typeOptions = [
  { value: 'hirevue', label: 'HireVue' },
  { value: 'pymetrics', label: 'Pymetrics' },
  { value: 'shl', label: 'SHL' },
  { value: 'kf', label: 'Korn Ferry' }
]

const bankColumns = [
  { title: t('student.onlineTestBank.k7'), dataIndex: 'name', key: 'name' },
  { title: t('student.onlineTestBank.k5'), dataIndex: 'company', key: 'company' },
  { title: t('student.onlineTestBank.k6'), dataIndex: 'type', key: 'type' },
  { title: t('student.onlineTestBank.k8'), dataIndex: 'count', key: 'count' },
  { title: t('student.onlineTestBank.k9'), dataIndex: 'updatedAt', key: 'updatedAt' },
  { title: t('student.onlineTestBank.k10'), key: 'action' },
]

const questionBanks = [
  { name: 'Goldman Sachs HireVue 2025', company: 'Goldman Sachs', type: 'HireVue', count: '25', updatedAt: '01/10/2026' },
  { name: 'JP Morgan HireVue Questions', company: 'JP Morgan', type: 'HireVue', count: '30', updatedAt: '01/05/2026' },
  { name: 'McKinsey Pymetrics Games', company: 'McKinsey', type: 'Pymetrics', count: '12', updatedAt: '12/28/2025' },
  { name: 'Citi SHL Numerical Test', company: 'Citi', type: 'SHL', count: '40', updatedAt: '12/20/2025' }
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
  width: 180px;
}

.table-shell {
  overflow-x: auto;
  border: 1px solid #dbe5f0;
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
  }

  th {
    background: #f8fafc;
    color: #475569;
    font-size: 13px;
    font-weight: 700;
  }
}
</style>
