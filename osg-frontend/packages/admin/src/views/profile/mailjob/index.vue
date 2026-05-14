<template>
  <section class="osg-page">
    <PageHeader :title-zh="$t('email_jobs')" title-en="Mail Job" :description="$t('bulk_email_send_management')">
      <template #actions>
        <a-button type="primary" @click="showNewMailJobModal = true">
          <template #icon><MailOutlined /></template>
          {{ $t('new_task') }}
        </a-button>
      </template>
    </PageHeader>

    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="jobList" tab="Job List">
        <a-form layout="inline" style="gap: 12px; flex-wrap: wrap; margin-bottom: 16px">
          <a-form-item>
            <a-input v-model:value="keyword" placeholder="Search" allow-clear style="width: 180px" />
          </a-form-item>
          <a-form-item>
            <a-range-picker v-model:value="dateRange" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" @click="loadMailJobs">
              <template #icon><SearchOutlined /></template>
              Search
            </a-button>
          </a-form-item>
        </a-form>

        <a-card :bordered="true" :body-style="{ padding: 0 }">
          <a-table
            :columns="jobColumns"
            :data-source="rows"
            :scroll="{ x: 'max-content' }"
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
                <a-button type="link" size="small">{{ $t('view') }}</a-button>
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
            :scroll="{ x: 'max-content' }"
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
                <a-button type="link" size="small">{{ $t('edit') }}</a-button>
                <a-button type="link" size="small">{{ $t('test') }}</a-button>
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
import { PageHeader } from '@osg/shared/components/PageHeader'
import type { Dayjs } from 'dayjs'
import NewMailJobModal from './components/NewMailJobModal.vue'
import {
  createMailJob,
  getMailJobList,
  type CreateMailJobPayload,
  type MailJobRow,
  type SmtpServerRow
} from '@osg/shared/api/admin/mailjob'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
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
  { title: t('operation'), dataIndex: 'action', key: 'action' }
]

const smtpColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: 'Server Name', dataIndex: 'serverName', key: 'serverName' },
  { title: 'Host', dataIndex: 'host', key: 'host' },
  { title: 'Port', dataIndex: 'port', key: 'port' },
  { title: 'Username', dataIndex: 'username', key: 'username' },
  { title: 'Status', dataIndex: 'status', key: 'status' },
  { title: t('operation'), dataIndex: 'action', key: 'action' }
]

const loadMailJobs = async () => {
  try {
    const response = await getMailJobList()
    rows.value = response.rows ?? []
    smtpServers.value = response.smtpServers ?? []
  } catch (_error) {
    message.error(t('failed_to_load_email_job_list'))
  }
}

const handleCreateMailJob = async (payload: CreateMailJobPayload) => {
  submitting.value = true
  try {
    await createMailJob(payload)
    showNewMailJobModal.value = false
    message.success(t('email_task_created_successfully'))
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
</style>
