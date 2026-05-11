<template>
  <div class="osg-page mentor-change-review">
    <PageHeader title-zh="导师资料变更审核" title-en="Mentor Profile Change Review" description="审核导师端提交的资料变更申请" />

    <a-card :bordered="false" class="mcr-filter-card">
      <a-form layout="inline" :model="filters" class="mcr-filter-form">
        <a-form-item label="状态">
          <a-select
            v-model:value="filters.status"
            placeholder="全部状态"
            allow-clear
            style="width: 160px"
          >
            <a-select-option value="pending">待审核</a-select-option>
            <a-select-option value="approved">已通过</a-select-option>
            <a-select-option value="rejected">已驳回</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadList">
            <template #icon><SearchOutlined /></template>
            搜索
          </a-button>
          <a-button style="margin-left: 8px" @click="handleReset">重置</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false" class="mcr-table-card">
      <a-table
        :columns="columns"
        :data-source="filteredRows"
        :row-key="(record: MentorChangeRequestItem) => record.requestId"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (total: number) => `共 ${total} 条` }"
        :scroll="{ x: 1100 }"
        :locale="{ emptyText: '暂无导师资料变更申请' }"
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
            <a-button type="link" size="small" @click="openDetail(record)">查看</a-button>
            <a-button
              v-if="record.status === 'pending'"
              type="link"
              size="small"
              @click="handleApprove(record)"
            >通过</a-button>
            <a-button
              v-if="record.status === 'pending'"
              type="link"
              size="small"
              danger
              @click="openReject(record)"
            >驳回</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 详情弹窗 -->
    <a-modal
      v-model:open="detailOpen"
      title="变更详情"
      :footer="null"
      width="640px"
      destroy-on-close
    >
      <div v-if="selectedRecord" class="mcr-detail">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="请求 ID">{{ selectedRecord.requestId }}</a-descriptions-item>
          <a-descriptions-item label="导师 userId">{{ selectedRecord.userId }}</a-descriptions-item>
          <a-descriptions-item label="变更字段">{{ formatSummary(selectedRecord.changeSummary) || '-' }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="statusColor(selectedRecord.status)">{{ statusLabel(selectedRecord.status) }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="提交人">{{ selectedRecord.requestedBy || '-' }}</a-descriptions-item>
          <a-descriptions-item label="提交时间">{{ formatTime(selectedRecord.createTime) || '-' }}</a-descriptions-item>
          <a-descriptions-item label="审核人">{{ selectedRecord.reviewer || '-' }}</a-descriptions-item>
          <a-descriptions-item label="审核时间">{{ formatTime(selectedRecord.reviewedAt) || '-' }}</a-descriptions-item>
        </a-descriptions>
        <div class="mcr-detail__payload">
          <div class="mcr-detail__title">变更内容（payload）</div>
          <pre class="mcr-detail__pre">{{ formatPayload(selectedRecord.payloadJson) }}</pre>
        </div>
        <div v-if="selectedRecord.status === 'rejected' && selectedRecord.remark" class="mcr-detail__remark">
          <strong>驳回原因：</strong>{{ selectedRecord.remark }}
        </div>
      </div>
    </a-modal>

    <!-- 驳回弹窗 -->
    <a-modal
      v-model:open="rejectOpen"
      title="驳回变更"
      :confirm-loading="rejectLoading"
      ok-text="确认驳回"
      cancel-text="取消"
      destroy-on-close
      @ok="handleRejectConfirm"
    >
      <a-form layout="vertical" :model="rejectForm">
        <a-form-item label="驳回原因" required>
          <a-textarea v-model:value="rejectForm.reason" placeholder="请输入驳回原因" :rows="4" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import {
  approveMentorChangeRequest,
  listMentorChangeRequests,
  rejectMentorChangeRequest,
  type MentorChangeRequestItem,
} from '@osg/shared/api/admin/mentorChangeReview'

const columns = [
  { title: '请求 ID', dataIndex: 'requestId', key: 'requestId', width: 100, fixed: 'left' as const },
  { title: '导师 userId', dataIndex: 'userId', key: 'userId', width: 120 },
  { title: '变更字段', dataIndex: 'changeSummary', key: 'changeSummary', width: 200 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '提交人', dataIndex: 'requestedBy', key: 'requestedBy', width: 130 },
  { title: '提交时间', dataIndex: 'createTime', key: 'createTime', width: 160 },
  { title: '审核人', dataIndex: 'reviewer', key: 'reviewer', width: 130 },
  { title: '审核时间', dataIndex: 'reviewedAt', key: 'reviewedAt', width: 160 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 200, fixed: 'right' as const },
]

const FIELD_LABEL_MAP: Record<string, string> = {
  nickName: '昵称',
  sex: '性别',
  phonenumber: '手机号',
  email: '邮箱',
  remark: '备注',
  region: '地区',
  city: '城市',
}

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
    message.error('加载变更申请失败')
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
    title: '通过变更申请',
    content: `确认通过请求 #${record.requestId}？通过后变更内容会写入导师账号。`,
    okText: '通过',
    cancelText: '取消',
    onOk: async () => {
      try {
        await approveMentorChangeRequest(record.requestId)
        message.success('已通过')
        await loadList()
      } catch (err) {
        message.error('通过失败')
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
    message.warning('请填写驳回原因')
    return
  }
  rejectLoading.value = true
  try {
    await rejectMentorChangeRequest(rejectTarget.value.requestId, { reason })
    message.success('已驳回')
    rejectOpen.value = false
    await loadList()
  } catch (err) {
    message.error('驳回失败')
  } finally {
    rejectLoading.value = false
  }
}

function formatSummary(summary?: string) {
  if (!summary) return ''
  return summary
    .split(',')
    .map((field) => FIELD_LABEL_MAP[field.trim()] || field.trim())
    .filter(Boolean)
    .join('、')
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
  if (status === 'pending') return '待审核'
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已驳回'
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
