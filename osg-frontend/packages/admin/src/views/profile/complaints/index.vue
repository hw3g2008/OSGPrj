<template>
  <section class="complaints-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">投诉建议</h1>
        <p class="page-subtitle">处理学员提交的投诉和建议</p>
      </div>
    </header>

    <div class="filter-bar">
      <a-input
        v-model:value="keyword"
        class="filter-input"
        placeholder="搜索学员/内容..."
        allow-clear
      />
      <a-select
        v-model:value="statusFilter"
        class="filter-select"
        placeholder="全部状态"
        allow-clear
      >
        <a-select-option value="">全部状态</a-select-option>
        <a-select-option value="pending">待处理</a-select-option>
        <a-select-option value="processing">处理中</a-select-option>
        <a-select-option value="completed">已完成</a-select-option>
      </a-select>
      <a-select
        v-model:value="typeFilter"
        class="filter-select"
        placeholder="全部类型"
        allow-clear
      >
        <a-select-option value="">全部类型</a-select-option>
        <a-select-option value="complaint">投诉</a-select-option>
        <a-select-option value="suggestion">建议</a-select-option>
      </a-select>
      <a-button @click="loadComplaints">
        <template #icon><SearchOutlined /></template>
        搜索
      </a-button>
    </div>

    <a-card :bordered="true" :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="rows"
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
              处理
            </a-button>
            <a-button
              v-else
              type="link"
              size="small"
              @click="handleView(record)"
            >
              查看
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
import {
  getComplaintList,
  updateComplaintStatus,
  type ComplaintRow
} from '@osg/shared/api/admin/complaint'

const rows = ref<ComplaintRow[]>([])
const keyword = ref('')
const statusFilter = ref<string>('')
const typeFilter = ref<string>('')

const columns = [
  { title: 'ID', dataIndex: 'complaintId', key: 'complaintId' },
  { title: '学员', dataIndex: 'studentName', key: 'studentName' },
  { title: '类型', dataIndex: 'complaintType', key: 'complaintType' },
  { title: '标题', dataIndex: 'complaintTitle', key: 'complaintTitle' },
  { title: '提交时间', dataIndex: 'submitTime', key: 'submitTime' },
  { title: '状态', dataIndex: 'processStatus', key: 'processStatus' },
  { title: '操作', dataIndex: 'action', key: 'action' }
]

const typeLabelMap: Record<string, string> = {
  complaint: '投诉',
  suggestion: '建议'
}

const typeColorMap: Record<string, string> = {
  complaint: 'error',
  suggestion: 'processing'
}

const statusLabelMap: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成'
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
    message.error('投诉建议列表加载失败')
  }
}

const handleProcess = async (row: ComplaintRow) => {
  try {
    const nextStatus = row.processStatus === 'pending' ? 'processing' : 'completed'
    await updateComplaintStatus(row.complaintId, nextStatus)
    message.success('状态更新成功')
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
.complaints-page {
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
  flex-wrap: wrap;
}

.filter-input {
  width: 200px;
}

.filter-select {
  width: 120px;
}
</style>
