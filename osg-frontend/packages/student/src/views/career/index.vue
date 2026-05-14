<template>
  <div class="career-page">
    <OsgPageContainer title="岗位信息 / Job Tracker">
      <div class="job-intent-section">
        <span class="intent-label">{{ $t('job_search_preferences') }}：</span>
        <a-tag color="blue">Java{{ $t('development') }}</a-tag>
        <a-tag color="green">{{ $t('beijing') }}</a-tag>
        <a-tag color="orange">15K-25K</a-tag>
        <a class="modify-link" @click="$router.push('/profile')">{{ $t('edit_job_search_preferences') }}</a>
      </div>

      <a-row :gutter="24">
        <a-col :span="16">
          <a-card title="投递记录">
            <a-table :columns="columns" :data-source="applications" :loading="loading" row-key="id">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
                </template>
                <template v-if="column.key === 'actions'">
                  <a-space>
                    <a-button size="small" type="primary" ghost>{{ $t('delivered') }}</a-button>
                    <a-button size="small" :icon="h(StarOutlined)">{{ $t('saved') }}</a-button>
                    <a-button size="small">{{ $t('log_progress') }}</a-button>
                  </a-space>
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
import { ref, h } from 'vue'
import { StarOutlined } from '@ant-design/icons-vue'
import { OsgPageContainer } from '@osg/shared/components'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const loading = ref(false)

const columns = [
  { title: t('company'), dataIndex: 'company', key: 'company' },
  { title: t('position'), dataIndex: 'position', key: 'position' },
  { title: t('application_date'), dataIndex: 'applyTime', key: 'applyTime' },
  { title: t('status'), key: 'status' },
  { title: t('operation'), key: 'actions' }
]

const applications = ref([
  { id: 1, company: t('alibaba'), position: 'Java 开发', applyTime: '2026-01-20', status: t('during_the_interview') },
  { id: 2, company: t('tencent'), position: t('backend_development'), applyTime: '2026-01-22', status: t('delivered') },
  { id: 3, company: t('bytedance'), position: 'Java 开发', applyTime: '2026-01-25', status: t('approved') }
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

<style scoped lang="scss">
.career-page {
  .job-intent-section {
    margin-bottom: 24px;
    padding: 16px;
    background: #fafafa;
    border-radius: 8px;
  }

  .intent-label {
    font-weight: 600;
    margin-right: 8px;
  }

  .modify-link {
    margin-left: 16px;
    color: #1890ff;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
