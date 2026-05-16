<template>
  <div class="osg-page mentor-change-review">
    <PageHeader :title-zh="t('admin.users.mentorChangeReview.pageTitle')" title-en="Mentor Profile Change Review" />

    <a-card :bordered="false" class="mcr-filter-card">
      <a-form layout="inline" :model="filters" class="mcr-filter-form">
        <a-form-item :label="t('admin.users.mentorChangeReview.filter.statusLabel')">
          <a-select
            v-model:value="filters.status"
            :placeholder="t('admin.users.mentorChangeReview.filter.statusPlaceholder')"
            allow-clear
            style="width: 160px"
          >
            <a-select-option value="pending">{{ t('admin.users.mentorChangeReview.filter.statuses.pending') }}</a-select-option>
            <a-select-option value="approved">{{ t('admin.users.mentorChangeReview.filter.statuses.approved') }}</a-select-option>
            <a-select-option value="rejected">{{ t('admin.users.mentorChangeReview.filter.statuses.rejected') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadList">
            <template #icon><SearchOutlined /></template>
            {{ t('admin.users.mentorChangeReview.filter.search') }}
          </a-button>
          <a-button style="margin-left: 8px" @click="handleReset">{{ t('admin.users.mentorChangeReview.filter.reset') }}</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false" class="mcr-table-card">
      <a-table
        :columns="columns"
        :data-source="filteredRows"
        :row-key="(record: MentorChangeRequestItem) => record.requestId"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (total: number) => t('admin.users.mentorChangeReview.table.showTotal', { total }) }"
        :scroll="{ x: 1100 }"
        :locale="{ emptyText: t('admin.users.mentorChangeReview.table.empty') }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'changeSummary'">
            <span>{{ formatSummary(record.changeSummary) || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'createTime'">
            <span>{{ formatTime(record.createTime) || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'reviewedAt'">
            <span>{{ formatTime(record.reviewedAt) || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="openDetail(record)">{{ t('admin.users.mentorChangeReview.action.view') }}</a-button>
            <a-button
              v-if="record.status === 'pending'"
              type="link"
              size="small"
              @click="handleApprove(record)"
            >{{ t('admin.users.mentorChangeReview.action.approve') }}</a-button>
            <a-button
              v-if="record.status === 'pending'"
              type="link"
              size="small"
              danger
              @click="openReject(record)"
            >{{ t('admin.users.mentorChangeReview.action.reject') }}</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Detail modal -->
    <a-modal
      v-model:open="detailOpen"
      :title="t('admin.users.mentorChangeReview.detail.title')"
      :footer="null"
      width="640px"
      destroy-on-close
    >
      <div v-if="selectedRecord" class="mcr-detail">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item :label="t('admin.users.mentorChangeReview.detail.labels.requestId')">{{ selectedRecord.requestId }}</a-descriptions-item>
          <a-descriptions-item :label="t('admin.users.mentorChangeReview.detail.labels.userId')">{{ selectedRecord.userId }}</a-descriptions-item>
          <a-descriptions-item :label="t('admin.users.mentorChangeReview.detail.labels.changeSummary')">{{ formatSummary(selectedRecord.changeSummary) || '-' }}</a-descriptions-item>
          <a-descriptions-item :label="t('admin.users.mentorChangeReview.detail.labels.status')">
            <a-tag :color="statusColor(selectedRecord.status)">{{ statusLabel(selectedRecord.status) }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item :label="t('admin.users.mentorChangeReview.detail.labels.requestedBy')">{{ selectedRecord.requestedBy || '-' }}</a-descriptions-item>
          <a-descriptions-item :label="t('admin.users.mentorChangeReview.detail.labels.createTime')">{{ formatTime(selectedRecord.createTime) || '-' }}</a-descriptions-item>
          <a-descriptions-item :label="t('admin.users.mentorChangeReview.detail.labels.reviewer')">{{ selectedRecord.reviewer || '-' }}</a-descriptions-item>
          <a-descriptions-item :label="t('admin.users.mentorChangeReview.detail.labels.reviewedAt')">{{ formatTime(selectedRecord.reviewedAt) || '-' }}</a-descriptions-item>
        </a-descriptions>
        <div class="mcr-detail__payload">
          <div class="mcr-detail__title">{{ t('admin.users.mentorChangeReview.detail.payloadTitle') }}</div>
          <pre class="mcr-detail__pre">{{ formatPayload(selectedRecord.payloadJson) }}</pre>
        </div>
        <div v-if="selectedRecord.status === 'rejected' && selectedRecord.remark" class="mcr-detail__remark">
          <strong>{{ t('admin.users.mentorChangeReview.detail.rejectReasonLabel') }}</strong>{{ selectedRecord.remark }}
        </div>
      </div>
    </a-modal>

    <!-- Reject modal -->
    <a-modal
      v-model:open="rejectOpen"
      :title="t('admin.users.mentorChangeReview.rejectModal.title')"
      :confirm-loading="rejectLoading"
      :ok-text="t('admin.users.mentorChangeReview.rejectModal.okText')"
      :cancel-text="t('admin.users.mentorChangeReview.rejectModal.cancelText')"
      destroy-on-close
      @ok="handleRejectConfirm"
    >
      <a-form layout="vertical" :model="rejectForm" class="osg-modal-form">
        <a-form-item :label="t('admin.users.mentorChangeReview.rejectModal.reasonLabel')" required>
          <a-textarea v-model:value="rejectForm.reason" :placeholder="t('admin.users.mentorChangeReview.rejectModal.reasonPlaceholder')" :rows="4" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import {
  approveMentorChangeRequest,
  listMentorChangeRequests,
  rejectMentorChangeRequest,
  type MentorChangeRequestItem,
} from '@osg/shared/api/admin/mentorChangeReview'

const { t } = useI18n()

const columns = computed(() => [
  { title: t('admin.users.mentorChangeReview.columns.requestId'), dataIndex: 'requestId', key: 'requestId', width: 100, fixed: 'left' as const },
  { title: t('admin.users.mentorChangeReview.columns.userId'), dataIndex: 'userId', key: 'userId', width: 120 },
  { title: t('admin.users.mentorChangeReview.columns.changeSummary'), dataIndex: 'changeSummary', key: 'changeSummary', width: 200 },
  { title: t('admin.users.mentorChangeReview.columns.status'), dataIndex: 'status', key: 'status', width: 100 },
  { title: t('admin.users.mentorChangeReview.columns.requestedBy'), dataIndex: 'requestedBy', key: 'requestedBy', width: 130 },
  { title: t('admin.users.mentorChangeReview.columns.createTime'), dataIndex: 'createTime', key: 'createTime', width: 160 },
  { title: t('admin.users.mentorChangeReview.columns.reviewer'), dataIndex: 'reviewer', key: 'reviewer', width: 130 },
  { title: t('admin.users.mentorChangeReview.columns.reviewedAt'), dataIndex: 'reviewedAt', key: 'reviewedAt', width: 160 },
  { title: t('admin.users.mentorChangeReview.columns.action'), dataIndex: 'action', key: 'action', width: 200, fixed: 'right' as const },
])

const loading = ref(false)
const rows = ref<MentorChangeRequestItem[]>([])
const filters = reactive({
  status: undefined as string | undefined,
})

const detailOpen = ref(false)
const selectedRecord = ref<MentorChangeRequestItem | null>(null)

const rejectOpen = ref(false)
const rejectLoading = ref(false)
const rejectTarget = ref<MentorChangeRequestItem | null>(null)
const rejectForm = reactive({ reason: '' })

const filteredRows = computed(() => rows.value)

async function loadList() {
  loading.value = true
  try {
    const data = await listMentorChangeRequests({ status: filters.status })
    rows.value = Array.isArray(data) ? data : []
  } catch (err) {
    message.error(t('admin.users.mentorChangeReview.messages.loadError'))
  } finally {
    loading.value = false
  }
}

function handleReset() {
  filters.status = undefined
  void loadList()
}

function openDetail(record: MentorChangeRequestItem) {
  selectedRecord.value = record
  detailOpen.value = true
}

function handleApprove(record: MentorChangeRequestItem) {
  Modal.confirm({
    title: t('admin.users.mentorChangeReview.approveModal.title'),
    content: t('admin.users.mentorChangeReview.approveModal.content', { id: record.requestId }),
    okText: t('admin.users.mentorChangeReview.approveModal.okText'),
    cancelText: t('admin.users.mentorChangeReview.approveModal.cancelText'),
    onOk: async () => {
      try {
        await approveMentorChangeRequest(record.requestId)
        message.success(t('admin.users.mentorChangeReview.messages.approveSuccess'))
        await loadList()
      } catch (err) {
        message.error(t('admin.users.mentorChangeReview.messages.approveFail'))
      }
    },
  })
}

function openReject(record: MentorChangeRequestItem) {
  rejectTarget.value = record
  rejectForm.reason = ''
  rejectOpen.value = true
}

async function handleRejectConfirm() {
  if (!rejectTarget.value) {
    return
  }
  const reason = rejectForm.reason.trim()
  if (!reason) {
    message.warning(t('admin.users.mentorChangeReview.messages.rejectReasonRequired'))
    return
  }
  rejectLoading.value = true
  try {
    await rejectMentorChangeRequest(rejectTarget.value.requestId, { reason })
    message.success(t('admin.users.mentorChangeReview.messages.rejectSuccess'))
    rejectOpen.value = false
    await loadList()
  } catch (err) {
    message.error(t('admin.users.mentorChangeReview.messages.rejectFail'))
  } finally {
    rejectLoading.value = false
  }
}

function formatSummary(summary?: string) {
  if (!summary) return ''
  const separator = t('admin.users.mentorChangeReview.table.summarySeparator')
  return summary
    .split(',')
    .map((field) => {
      const key = field.trim()
      const labelKey = `admin.users.mentorChangeReview.fieldLabels.${key}` as never
      return t(labelKey) || key
    })
    .filter(Boolean)
    .join(separator)
}

function formatTime(value?: string) {
  if (!value) return ''
  return value.replace('T', ' ').slice(0, 19)
}

function formatPayload(json?: string) {
  if (!json) return '-'
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    return json
  }
}

function statusLabel(status?: string) {
  if (status === 'pending') return t('admin.users.mentorChangeReview.status.pending')
  if (status === 'approved') return t('admin.users.mentorChangeReview.status.approved')
  if (status === 'rejected') return t('admin.users.mentorChangeReview.status.rejected')
  return '-'
}

function statusColor(status?: string) {
  if (status === 'pending') return 'warning'
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'error'
  return 'default'
}

onMounted(() => {
  void loadList()
})
</script>

<style scoped>
.mentor-change-review {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mcr-filter-card,
.mcr-table-card {
  border-radius: 12px;
}

.mcr-detail__payload {
  margin-top: 16px;
}

.mcr-detail__title {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.mcr-detail__pre {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  max-height: 240px;
  overflow: auto;
}

.mcr-detail__remark {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 13px;
}
</style>
