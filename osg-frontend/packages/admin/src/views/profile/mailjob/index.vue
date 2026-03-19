<template>
  <section class="mailjob-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">邮件作业</h1>
        <p class="page-subtitle">Mail Job - 批量邮件发送管理</p>
      </div>
      <a-button type="primary" @click="showNewMailJobModal = true">
        <template #icon><MailOutlined /></template>
        新建任务
      </a-button>
    </header>

    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="jobList" tab="Job List">
        <div class="filter-bar">
          <a-input
            v-model:value="keyword"
            class="filter-input-sm"
            placeholder="Search"
            allow-clear
          />
          <a-range-picker v-model:value="dateRange" />
          <a-button @click="loadMailJobs">
            <template #icon><SearchOutlined /></template>
            Search
          </a-button>
        </div>

        <a-card :bordered="true" :body-style="{ padding: 0 }" class="table-card">
          <a-table
            :columns="jobColumns"
            :data-source="rows"
            :row-key="(record: MailJobRow) => record.jobId"
            :pagination="false"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'jobId'">
                {{ record.jobId }}
              </template>
              <template v-else-if="column.dataIndex === 'jobTitle'">
                <strong>{{ record.jobTitle }}</strong>
              </template>
              <template v-else-if="column.dataIndex === 'stats'">
                <a-tag color="processing">{{ record.totalCount }}</a-tag>
                <span> | </span>
                <a-tag color="warning">{{ record.pendingCount }}</a-tag>
                <span> | </span>
                <a-tag color="success">{{ record.successCount }}</a-tag>
                <span> | </span>
                <a-tag color="error">{{ record.failCount }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'actionBy'">
                {{ record.actionBy }}
              </template>
              <template v-else-if="column.dataIndex === 'createTime'">
                {{ record.createTime }}
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-button type="link" size="small">查看</a-button>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>

      <a-tab-pane key="smtpServer" tab="SMTP Server">
        <a-card :bordered="true" :body-style="{ padding: 0 }">
          <a-table
            :columns="smtpColumns"
            :data-source="smtpServers"
            :row-key="(record: SmtpServerRow) => record.serverName"
            :pagination="false"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'id'">
                {{ record.id }}
              </template>
              <template v-else-if="column.dataIndex === 'serverName'">
                <strong>{{ record.serverName }}</strong>
              </template>
              <template v-else-if="column.dataIndex === 'host'">
                {{ record.host }}
              </template>
              <template v-else-if="column.dataIndex === 'port'">
                {{ record.port }}
              </template>
              <template v-else-if="column.dataIndex === 'username'">
                {{ record.username }}
              </template>
              <template v-else-if="column.dataIndex === 'status'">
                <a-tag :color="record.status === 'Active' ? 'success' : 'default'">
                  {{ record.status }}
                </a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-button type="link" size="small">编辑</a-button>
                <a-button type="link" size="small">测试</a-button>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>
    </a-tabs>

    <NewMailJobModal
      v-model="showNewMailJobModal"
      :smtp-servers="smtpServers"
      :submitting="submitting"
      @confirm="handleCreateMailJob"
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { MailOutlined, SearchOutlined } from '@ant-design/icons-vue'
import type { Dayjs } from 'dayjs'
import NewMailJobModal from './components/NewMailJobModal.vue'
import {
  createMailJob,
  getMailJobList,
  type CreateMailJobPayload,
  type MailJobRow,
  type SmtpServerRow
} from '@osg/shared/api/admin/mailjob'

const activeTab = ref<string>('jobList')
const rows = ref<MailJobRow[]>([])
const smtpServers = ref<SmtpServerRow[]>([])
const submitting = ref(false)
const showNewMailJobModal = ref(false)
const keyword = ref('')
const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const jobColumns = [
  { title: 'ID', dataIndex: 'jobId', key: 'jobId' },
  { title: 'Title', dataIndex: 'jobTitle', key: 'jobTitle' },
  { title: 'Total | Pending | Success | Fail', dataIndex: 'stats', key: 'stats' },
  { title: 'Action By', dataIndex: 'actionBy', key: 'actionBy' },
  { title: 'Create Time', dataIndex: 'createTime', key: 'createTime' },
  { title: '操作', dataIndex: 'action', key: 'action' }
]

const smtpColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: 'Server Name', dataIndex: 'serverName', key: 'serverName' },
  { title: 'Host', dataIndex: 'host', key: 'host' },
  { title: 'Port', dataIndex: 'port', key: 'port' },
  { title: 'Username', dataIndex: 'username', key: 'username' },
  { title: 'Status', dataIndex: 'status', key: 'status' },
  { title: '操作', dataIndex: 'action', key: 'action' }
]

const loadMailJobs = async () => {
  try {
    const response = await getMailJobList()
    rows.value = response.rows ?? []
    smtpServers.value = response.smtpServers ?? []
  } catch (_error) {
    message.error('邮件作业列表加载失败')
  }
}

const handleCreateMailJob = async (payload: CreateMailJobPayload) => {
  submitting.value = true
  try {
    await createMailJob(payload)
    showNewMailJobModal.value = false
    message.success('邮件任务创建成功')
    await loadMailJobs()
  } catch (_error) {
    // request util handles error message
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadMailJobs()
})
</script>

<style scoped>
.mailjob-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.page-subtitle {
  margin: 4px 0 0;
  color: var(--text-secondary, #64748b);
  font-size: 14px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-input-sm {
  width: 180px;
}

.table-card {
  margin-top: 0;
}
</style>
