<template>
  <div class="career-page">
    <OsgPageContainer :title="t('student.career.k8')">
      <div class="job-intent-section">
        <span class="intent-label">{{ t('student.career.k1') }}</span>
        <a-tag color="blue">{{ t('student.career.k2') }}</a-tag>
        <a-tag color="green">{{ t('student.career.k3') }}</a-tag>
        <a-tag color="orange">15K-25K</a-tag>
        <a class="modify-link" @click="$router.push('/profile')">{{ t('student.career.k4') }}</a>
      </div>

      <a-row :gutter="24">
        <a-col :span="16">
          <a-card :title="t('student.career.k9')">
            <a-table :columns="columns" :data-source="applications" :loading="loading" row-key="id">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
                </template>
                <template v-if="column.key === 'actions'">
                  <a-space>
                    <a-button size="small" type="primary" ghost>{{ t('student.career.k5') }}</a-button>
                    <a-button size="small" :icon="h(StarOutlined)">{{ t('student.career.k6') }}</a-button>
                    <a-button size="small">{{ t('student.career.k7') }}</a-button>
                  </a-space>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card :title="t('student.career.k10')">
            <a-statistic :title="t('student.career.k11')" :value="12" style="margin-bottom: 16px" />
            <a-statistic :title="t('student.career.k12')" :value="5" style="margin-bottom: 16px" />
            <a-statistic :title="t('student.career.k13')" :value="2" />
          </a-card>
        </a-col>
      </a-row>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { StarOutlined } from '@ant-design/icons-vue'
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()

const loading = ref(false)

const columns = [
  { title: t('student.career.k14'), dataIndex: 'company', key: 'company' },
  { title: t('student.career.k15'), dataIndex: 'position', key: 'position' },
  { title: t('student.career.k16'), dataIndex: 'applyTime', key: 'applyTime' },
  { title: t('student.career.k17'), key: 'status' },
  { title: t('student.career.k18'), key: 'actions' }
]

const applications = ref([
  { id: 1, company: t('student.career.k19'), position: t('student.career.k20'), applyTime: '2026-01-20', status: t('student.career.k21') },
  { id: 2, company: t('student.career.k22'), position: t('student.career.k23'), applyTime: '2026-01-22', status: t('student.career.k5') },
  { id: 3, company: t('student.career.k24'), position: t('student.career.k20'), applyTime: '2026-01-25', status: t('student.career.k25') }
])

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    '已投递': 'blue', // i18n-skip-line: backend enum value
    '面试中': 'orange', // i18n-skip-line: backend enum value
    '已通过': 'green', // i18n-skip-line: backend enum value
    '未通过': 'red', // i18n-skip-line: backend enum value
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
