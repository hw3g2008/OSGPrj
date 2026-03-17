<template>
  <section class="mailjob-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">Profile Center</p>
        <h1>邮件作业</h1>
        <p class="page-subtitle">批量邮件发送管理</p>
      </div>
      <button type="button" class="primary-button" @click="showNewMailJobModal = true">新建任务</button>
    </header>

    <section class="tabs-row">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="tab-pill"
        :class="{ 'tab-pill--active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </section>

    <section v-if="activeTab === 'jobList'" class="table-card">
      <table class="mailjob-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>收件人</th>
            <th>SMTP</th>
            <th>Total</th>
            <th>Pending</th>
            <th>Success</th>
            <th>Fail</th>
            <th>Create Time</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.jobId">
            <td>#{{ row.jobId }}</td>
            <td>{{ row.jobTitle }}</td>
            <td>{{ row.recipientGroup }}</td>
            <td>{{ row.smtpServerName }}</td>
            <td>{{ row.totalCount }}</td>
            <td>{{ row.pendingCount }}</td>
            <td>{{ row.successCount }}</td>
            <td>{{ row.failCount }}</td>
            <td>{{ row.createTime }}</td>
          </tr>
          <tr v-if="!rows.length">
            <td class="empty-row" colspan="9">暂无邮件任务</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-else class="table-card">
      <table class="mailjob-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Server Name</th>
            <th>Host</th>
            <th>Port</th>
            <th>Username</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(server, index) in smtpServers" :key="server.serverName">
            <td>#{{ index + 1 }}</td>
            <td>{{ server.serverName }}</td>
            <td>{{ server.host }}</td>
            <td>{{ server.port }}</td>
            <td>{{ server.username }}</td>
            <td>{{ server.status }}</td>
          </tr>
          <tr v-if="!smtpServers.length">
            <td class="empty-row" colspan="6">暂无 SMTP Server</td>
          </tr>
        </tbody>
      </table>
    </section>

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
import NewMailJobModal from './components/NewMailJobModal.vue'
import {
  createMailJob,
  getMailJobList,
  type CreateMailJobPayload,
  type MailJobRow,
  type SmtpServerRow
} from '@osg/shared/api/admin/mailjob'

const tabs = [
  { key: 'jobList', label: 'Job List' },
  { key: 'smtpServer', label: 'SMTP Server' }
]

const activeTab = ref<'jobList' | 'smtpServer'>('jobList')
const rows = ref<MailJobRow[]>([])
const smtpServers = ref<SmtpServerRow[]>([])
const submitting = ref(false)
const showNewMailJobModal = ref(false)

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

<style scoped lang="scss">
.mailjob-page {
  display: grid;
  gap: 20px;
}

.page-header,
.tabs-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.page-header {
  align-items: flex-start;
  justify-content: space-between;
}

.page-eyebrow {
  margin: 0 0 8px;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  font-size: 34px;
}

.page-subtitle {
  margin: 10px 0 0;
  color: #475569;
}

.tab-pill {
  height: 40px;
  padding: 0 18px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #fff;
  font-weight: 600;
  cursor: pointer;
}

.tab-pill--active {
  color: #fff;
  border-color: #1d4ed8;
  background: #1d4ed8;
}

.table-card {
  padding: 18px 20px;
  border: 1px solid #dbe4f0;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.06);
}

.mailjob-table {
  width: 100%;
  border-collapse: collapse;
}

.mailjob-table th,
.mailjob-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
}

.empty-row {
  text-align: center;
  color: #64748b;
}

.primary-button {
  height: 42px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(135deg, #1d4ed8, #0f766e);
  font-weight: 600;
  cursor: pointer;
}
</style>
