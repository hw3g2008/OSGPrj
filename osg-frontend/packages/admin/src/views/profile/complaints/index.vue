<template>
  <section class="osg-page">
    <PageHeader :title-zh="t('admin.profile.complaints.title')" />

    <a-form layout="inline" style="gap: 12px; flex-wrap: wrap">
      <a-form-item>
        <a-input v-model:value="keyword" :placeholder="t('admin.profile.complaints.filter.searchPlaceholder')" allow-clear style="width: 200px" />
      </a-form-item>
      <a-form-item>
        <a-select v-model:value="statusFilter" :placeholder="t('admin.profile.complaints.filter.statusPlaceholder')" allow-clear style="width: 120px">
          <a-select-option value="">{{ t('admin.profile.complaints.status.all') }}</a-select-option>
          <a-select-option value="pending">{{ t('admin.profile.complaints.status.pending') }}</a-select-option>
          <a-select-option value="processing">{{ t('admin.profile.complaints.status.processing') }}</a-select-option>
          <a-select-option value="completed">{{ t('admin.profile.complaints.status.completed') }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item>
        <a-select v-model:value="typeFilter" :placeholder="t('admin.profile.complaints.filter.typePlaceholder')" allow-clear style="width: 120px">
          <a-select-option value="">{{ t('admin.profile.complaints.type.all') }}</a-select-option>
          <a-select-option value="complaint">{{ t('admin.profile.complaints.type.complaint') }}</a-select-option>
          <a-select-option value="suggestion">{{ t('admin.profile.complaints.type.suggestion') }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item>
        <a-button type="primary" @click="loadComplaints">
          <template #icon><SearchOutlined /></template>
          {{ t('admin.profile.complaints.filter.search') }}
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
              {{ t('admin.profile.complaints.action.process') }}
            </a-button>
            <a-button
              v-else
              type="link"
              size="small"
              @click="handleView(record)"
            >
              {{ t('admin.profile.complaints.action.view') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import {
  getComplaintList,
  updateComplaintStatus,
  type ComplaintRow
} from '@osg/shared/api/admin/complaint'

const { t } = useI18n()
const rows = ref<ComplaintRow[]>([])
const keyword = ref('')
const statusFilter = ref<string>('')
const typeFilter = ref<string>('')

const columns = computed(() => [
  { title: 'ID', dataIndex: 'complaintId', key: 'complaintId', width: 120, fixed: 'left' as const },
  { title: t('admin.profile.complaints.columns.student'), dataIndex: 'studentName', key: 'studentName' },
  { title: t('admin.profile.complaints.columns.type'), dataIndex: 'complaintType', key: 'complaintType' },
  { title: t('admin.profile.complaints.columns.title'), dataIndex: 'complaintTitle', key: 'complaintTitle' },
  { title: t('admin.profile.complaints.columns.submitTime'), dataIndex: 'submitTime', key: 'submitTime' },
  { title: t('admin.profile.complaints.columns.status'), dataIndex: 'processStatus', key: 'processStatus' },
  { title: t('admin.profile.complaints.columns.action'), dataIndex: 'action', key: 'action', width: 120, fixed: 'right' as const }
])

const typeLabelMap = computed<Record<string, string>>(() => ({
  complaint: t('admin.profile.complaints.type.complaint'),
  suggestion: t('admin.profile.complaints.type.suggestion')
}))

const typeColorMap: Record<string, string> = {
  complaint: 'error',
  suggestion: 'processing'
}

const statusLabelMap = computed<Record<string, string>>(() => ({
  pending: t('admin.profile.complaints.status.pending'),
  processing: t('admin.profile.complaints.status.processing'),
  completed: t('admin.profile.complaints.status.completed')
}))

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
  }
}

const handleProcess = async (row: ComplaintRow) => {
  try {
    const nextStatus = row.processStatus === 'pending' ? 'processing' : 'completed'
    await updateComplaintStatus(row.complaintId, nextStatus)
    message.success(t('admin.profile.complaints.messages.updateSuccess'))
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
