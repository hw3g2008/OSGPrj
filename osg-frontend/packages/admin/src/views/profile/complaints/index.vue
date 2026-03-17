<template>
  <section class="complaints-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">Profile Center</p>
        <h1>投诉建议</h1>
        <p class="page-subtitle">处理学员提交的投诉和建议</p>
      </div>
    </header>

    <section class="table-card">
      <table class="complaint-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>学生</th>
            <th>类型</th>
            <th>标题</th>
            <th>提交时间</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.complaintId">
            <td>#{{ row.complaintId }}</td>
            <td>{{ row.studentName }}</td>
            <td>
              <span class="type-pill" :class="`type-pill--${row.complaintType}`">
                {{ typeLabelMap[row.complaintType] }}
              </span>
            </td>
            <td>
              <div class="title-cell">{{ row.complaintTitle }}</div>
              <p class="content-cell">{{ row.complaintContent }}</p>
            </td>
            <td>{{ row.submitTime }}</td>
            <td>
              <span class="status-pill" :class="`status-pill--${row.processStatus}`">
                {{ statusLabelMap[row.processStatus] }}
              </span>
            </td>
            <td>
              <button
                v-if="row.processStatus === 'pending'"
                type="button"
                class="action-button"
                @click="handleStatusChange(row, 'processing')"
              >
                处理中
              </button>
              <button
                v-else-if="row.processStatus === 'processing'"
                type="button"
                class="action-button action-button--primary"
                @click="handleStatusChange(row, 'completed')"
              >
                已完成
              </button>
              <span v-else class="done-text">已完成</span>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td class="empty-row" colspan="7">暂无投诉建议</td>
          </tr>
        </tbody>
      </table>
    </section>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  getComplaintList,
  updateComplaintStatus,
  type ComplaintRow
} from '@osg/shared/api/admin/complaint'

const rows = ref<ComplaintRow[]>([])

const typeLabelMap: Record<ComplaintRow['complaintType'], string> = {
  complaint: '投诉',
  suggestion: '建议'
}

const statusLabelMap: Record<ComplaintRow['processStatus'], string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成'
}

const loadComplaints = async () => {
  try {
    const response = await getComplaintList()
    rows.value = response.rows ?? []
  } catch (_error) {
    message.error('投诉建议列表加载失败')
  }
}

const handleStatusChange = async (
  row: ComplaintRow,
  nextStatus: ComplaintRow['processStatus']
) => {
  try {
    await updateComplaintStatus(row.complaintId, nextStatus)
    message.success('状态更新成功')
    await loadComplaints()
  } catch (_error) {
    // request util handles message
  }
}

onMounted(() => {
  void loadComplaints()
})
</script>

<style scoped lang="scss">
.complaints-page {
  display: grid;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.page-eyebrow {
  margin: 0 0 8px;
  color: #c2410c;
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

.table-card {
  padding: 18px 20px;
  border: 1px solid #dbe4f0;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.06);
}

.complaint-table {
  width: 100%;
  border-collapse: collapse;
}

.complaint-table th,
.complaint-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
}

.type-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.type-pill--complaint {
  color: #fff;
  background: #dc2626;
}

.type-pill--suggestion {
  color: #1d4ed8;
  background: #dbeafe;
}

.status-pill--pending {
  color: #92400e;
  background: #fef3c7;
}

.status-pill--processing {
  color: #1d4ed8;
  background: #dbeafe;
}

.status-pill--completed {
  color: #166534;
  background: #dcfce7;
}

.title-cell {
  font-weight: 600;
}

.content-cell {
  margin: 6px 0 0;
  color: #64748b;
}

.action-button {
  height: 34px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #fff;
  font-weight: 600;
  cursor: pointer;
}

.action-button--primary {
  color: #fff;
  border-color: #0f766e;
  background: #0f766e;
}

.done-text,
.empty-row {
  color: #64748b;
}
</style>
