<template>
  <div id="page-interview-bank" class="interview-bank-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">真人面试题库 <span>Interview Question Bank</span></h1>
          </div>
        </div>
      </template>

      <div class="toolbar">
        <a-input placeholder="搜索题库..." class="toolbar-input" />
        <a-select class="toolbar-select" placeholder="面试阶段" :options="stageOptions" />
        <a-select class="toolbar-select" placeholder="类型" :options="typeOptions" />
        <a-select class="toolbar-select" placeholder="行业" :options="industryOptions" />
        <a-button>搜索</a-button>
      </div>

      <div class="table-shell">
        <a-table
          :columns="bankColumns"
          :data-source="interviewQuestionBanks"
          :pagination="false"
          :row-key="(record: any) => record.name"
          class="record-table"
        >
          <template #bodyCell="{ column }">
            <template v-if="column.key === 'action'">
              <a-button type="link" size="small">查看</a-button>
            </template>
          </template>
        </a-table>
      </div>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { OsgPageContainer } from '@osg/shared/components'

const stageOptions = [
  { value: 'screening', label: 'Screening Call' },
  { value: 'first', label: 'First Round' },
  { value: 'second', label: 'Second Round' },
  { value: 'superday', label: 'Superday' }
]

const typeOptions = [
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'technical', label: 'Technical' },
  { value: 'case', label: 'Case' }
]

const industryOptions = [
  { value: 'ib', label: 'Investment Banking' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'pevc', label: 'PE/VC' }
]

const bankColumns = [
  { title: '题库名称', dataIndex: 'name', key: 'name' },
  { title: '面试阶段', dataIndex: 'stage', key: 'stage' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '行业', dataIndex: 'industry', key: 'industry' },
  { title: '题目数', dataIndex: 'count', key: 'count' },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt' },
  { title: '操作', key: 'action' },
]

const interviewQuestionBanks = [
  { name: 'IB Superday Behavioral Questions', stage: 'Superday', type: 'Behavioral', industry: 'Investment Banking', count: '50', updatedAt: '01/12/2026' },
  { name: 'Goldman Sachs Technical Questions', stage: 'Second Round', type: 'Technical', industry: 'Investment Banking', count: '35', updatedAt: '01/08/2026' },
  { name: 'McKinsey Case Interview Guide', stage: 'First Round', type: 'Case', industry: 'Consulting', count: '60', updatedAt: '01/05/2026' },
  { name: 'PE/VC LBO Modeling Questions', stage: 'Second Round', type: 'Technical', industry: 'PE/VC', count: '25', updatedAt: '12/28/2025' }
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
