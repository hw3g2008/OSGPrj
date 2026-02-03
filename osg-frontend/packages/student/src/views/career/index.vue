<template>
  <div class="career-page">
    <OsgPageContainer title="求职中心">
      <a-row :gutter="24">
        <a-col :span="16">
          <a-card title="求职进度" style="margin-bottom: 24px">
            <a-steps :current="careerStep" size="small">
              <a-step title="简历准备" />
              <a-step title="投递中" />
              <a-step title="面试中" />
              <a-step title="已入职" />
            </a-steps>
          </a-card>
          
          <a-card title="投递记录">
            <a-table :columns="columns" :data-source="applications" :loading="loading" row-key="id">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card title="求职统计">
            <a-statistic title="投递数" :value="12" style="margin-bottom: 16px" />
            <a-statistic title="面试邀约" :value="5" style="margin-bottom: 16px" />
            <a-statistic title="Offer 数" :value="2" />
          </a-card>
        </a-col>
      </a-row>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'

const loading = ref(false)
const careerStep = ref(2)

const columns = [
  { title: '公司', dataIndex: 'company', key: 'company' },
  { title: '岗位', dataIndex: 'position', key: 'position' },
  { title: '投递时间', dataIndex: 'applyTime', key: 'applyTime' },
  { title: '状态', key: 'status' }
]

const applications = ref([
  { id: 1, company: '阿里巴巴', position: 'Java 开发', applyTime: '2026-01-20', status: '面试中' },
  { id: 2, company: '腾讯', position: '后端开发', applyTime: '2026-01-22', status: '已投递' },
  { id: 3, company: '字节跳动', position: 'Java 开发', applyTime: '2026-01-25', status: '已通过' }
])

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    '已投递': 'blue',
    '面试中': 'orange',
    '已通过': 'green',
    '未通过': 'red'
  }
  return colors[status] || 'default'
}
</script>
