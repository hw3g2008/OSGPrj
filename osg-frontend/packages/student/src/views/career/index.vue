<template>
  <div class="career-page">
    <OsgPageContainer title="岗位信息 / Job Tracker">
      <div class="job-intent-section">
        <span class="intent-label">求职意向：</span>
        <a-tag color="blue">Java开发</a-tag>
        <a-tag color="green">北京</a-tag>
        <a-tag color="orange">15K-25K</a-tag>
        <a class="modify-link" @click="$router.push('/profile')">修改求职意向</a>
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
                    <a-button size="small" type="primary" ghost>已投递</a-button>
                    <a-button size="small" :icon="h(StarOutlined)">收藏</a-button>
                    <a-button size="small">记录进度</a-button>
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

const loading = ref(false)

const columns = [
  { title: '公司', dataIndex: 'company', key: 'company' },
  { title: '岗位', dataIndex: 'position', key: 'position' },
  { title: '投递时间', dataIndex: 'applyTime', key: 'applyTime' },
  { title: '状态', key: 'status' },
  { title: '操作', key: 'actions' }
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
