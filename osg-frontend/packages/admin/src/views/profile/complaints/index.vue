<template>
  <section class="osg-page">
    <PageHeader :title-zh="$t('complaints_and_suggestions')" :description="$t('handle_complaints_and_suggestions_submit')" />

    <a-form layout="inline" style="gap: 12px; flex-wrap: wrap">
      <a-form-item>
        <a-input v-model:value="keyword" :placeholder="`${$t('search_student_content')}...`" allow-clear style="width: 200px" />
      </a-form-item>
      <a-form-item>
        <a-select v-model:value="statusFilter" :placeholder="$t('all_status')" allow-clear style="width: 120px">
          <a-select-option value="">{{ $t('all_status') }}</a-select-option>
          <a-select-option value="pending">{{ $t('pending') }}</a-select-option>
          <a-select-option value="processing">{{ $t('processing') }}</a-select-option>
          <a-select-option value="completed">{{ $t('completed') }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item>
        <a-select v-model:value="typeFilter" :placeholder="$t('all_types')" allow-clear style="width: 120px">
          <a-select-option value="">{{ $t('all_types') }}</a-select-option>
          <a-select-option value="complaint">{{ $t('complaint') }}</a-select-option>
          <a-select-option value="suggestion">{{ $t('suggestion') }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item>
        <a-button type="primary" @click="loadComplaints">
          <template #icon><SearchOutlined /></template>
          {{ $t('search') }}
        </a-button>
      </a-form-item>
    </a-form>

    <a-card :bordered="true" :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="rows"
        :scroll="{ x: 'max-content' }"
        :row-key="(record: ComplaintRow) => record.complaintId"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'complaintId'">
            {{ record.complaintId }}
          </template>
          <template v-else-if="column.dataIndex === 'studentName'">
            <strong>{{ record.studentName }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'complaintType'">
            <a-tag :color="typeColorMap[record.complaintType]">
              {{ typeLabelMap[record.complaintType] }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'complaintTitle'">
            {{ record.complaintTitle }}
          </template>
          <template v-else-if="column.dataIndex === 'submitTime'">
            {{ record.submitTime }}
          </template>
          <template v-else-if="column.dataIndex === 'processStatus'">
            <a-tag :color="statusColorMap[record.processStatus]">
              {{ statusLabelMap[record.processStatus] }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button
              v-if="record.processStatus !== 'completed'"
              type="link"
              size="small"
              @click="handleProcess(record)"
            >
              {{ $t('handle') }}
            </a-button>
            <a-button
              v-else
              type="link"
              size="small"
              @click="handleView(record)"
            >
              {{ $t('view') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import {
  getComplaintList,
  updateComplaintStatus,
  type ComplaintRow
} from '@osg/shared/api/admin/complaint'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const rows = ref<ComplaintRow[]>([])
const keyword = ref('')
const statusFilter = ref<string>('')
const typeFilter = ref<string>('')

const columns = [
  { title: 'ID', dataIndex: 'complaintId', key: 'complaintId' },
  { title: t('student'), dataIndex: 'studentName', key: 'studentName' },
  { title: t('type'), dataIndex: 'complaintType', key: 'complaintType' },
  { title: t('title'), dataIndex: 'complaintTitle', key: 'complaintTitle' },
  { title: t('submission_time'), dataIndex: 'submitTime', key: 'submitTime' },
  { title: t('status'), dataIndex: 'processStatus', key: 'processStatus' },
  { title: t('operation'), dataIndex: 'action', key: 'action' }
]

const typeLabelMap: Record<string, string> = {
  complaint: t('complaint'),
  suggestion: t('suggestion')
}

const typeColorMap: Record<string, string> = {
  complaint: 'error',
  suggestion: 'processing'
}

const statusLabelMap: Record<string, string> = {
  pending: t('pending'),
  processing: t('processing'),
  completed: t('completed')
}

const statusColorMap: Record<string, string> = {
  pending: 'warning',
  processing: 'processing',
  completed: 'success'
}

const loadComplaints = async () => {
  try {
    const response = await getComplaintList()
    rows.value = response.rows ?? []
  } catch (_error) {
    message.error(t('failed_to_load_complaint_and_suggestion_'))
  }
}

const handleProcess = async (row: ComplaintRow) => {
  try {
    const nextStatus = row.processStatus === 'pending' ? 'processing' : 'completed'
    await updateComplaintStatus(row.complaintId, nextStatus)
    message.success(t('status_updated_successfully'))
    await loadComplaints()
  } catch (_error) {
    // request util handles message
  }
}

const handleView = (_row: ComplaintRow) => {
  // View complaint detail
}

onMounted(() => {
  void loadComplaints()
})
</script>

<style scoped>
</style>

