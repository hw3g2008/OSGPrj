<template>
  <div class="settlement-page">
    <OsgPageContainer title="课时结算">
      <a-row :gutter="16" style="margin-bottom: 24px">
        <a-col :span="8">
          <a-card><a-statistic title="本月课时" :value="48" suffix="小时" /></a-card>
        </a-col>
        <a-col :span="8">
          <a-card><a-statistic title="课时单价" :value="150" prefix="¥" suffix="/小时" /></a-card>
        </a-col>
        <a-col :span="8">
          <a-card><a-statistic title="本月收入" :value="7200" prefix="¥" /></a-card>
        </a-col>
      </a-row>

      <a-table :columns="columns" :data-source="settlements" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'paid' ? 'green' : 'orange'">
              {{ record.status === 'paid' ? '已结算' : '待结算' }}
            </a-tag>
          </template>
        </template>
      </a-table>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'

const loading = ref(false)
const columns = [
  { title: '结算周期', dataIndex: 'period', key: 'period' },
  { title: '课时数', dataIndex: 'hours', key: 'hours' },
  { title: '金额', dataIndex: 'amount', key: 'amount' },
  { title: '状态', key: 'status' }
]

const settlements = ref([
  { id: 1, period: '2026年1月', hours: 52, amount: '¥7,800', status: 'paid' },
  { id: 2, period: '2026年2月', hours: 48, amount: '¥7,200', status: 'pending' }
])
</script>
