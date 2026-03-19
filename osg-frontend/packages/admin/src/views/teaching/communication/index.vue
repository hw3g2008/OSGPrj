<template>
  <section class="communication-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">人际关系沟通记录 <span class="page-title-en">Communication Records</span></h1>
        <p class="page-subtitle">查看学员与导师/班主任的沟通历史记录</p>
      </div>
      <button type="button" class="btn-outline" @click="handleExport">
        <span class="mdi mdi-export" aria-hidden="true" /> 导出
      </button>
    </header>

    <!-- 筛选条件 -->
    <div class="filter-row">
      <input v-model.trim="keyword" class="filter-input" type="text" placeholder="搜索学员/记录人..." @keyup.enter="loadData">
      <select v-model="filterMethod" class="filter-select">
        <option value="">沟通方式</option>
        <option value="phone">电话</option>
        <option value="wechat">微信</option>
        <option value="email">邮件</option>
        <option value="meeting">面谈</option>
      </select>
      <select v-model="filterHeadTeacher" class="filter-select">
        <option value="">全部班主任</option>
        <option value="Jess">Jess</option>
        <option value="Amy">Amy</option>
      </select>
      <input v-model="filterDateStart" type="date" class="filter-input filter-input--date">
      <span class="filter-date-sep">~</span>
      <input v-model="filterDateEnd" type="date" class="filter-input filter-input--date">
      <button type="button" class="btn-outline" @click="loadData">
        <span class="mdi mdi-magnify" aria-hidden="true" /> 搜索
      </button>
    </div>

    <!-- 沟通记录表格 -->
    <div class="table-card">
      <div class="table-wrap">
        <table class="communication-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>学员</th>
              <th>记录人</th>
              <th>沟通方式</th>
              <th>沟通时间</th>
              <th>沟通内容</th>
              <th>跟进事项</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.communicationId">
              <td>{{ row.communicationId }}</td>
              <td><strong>{{ row.studentName }}</strong></td>
              <td>{{ row.recorderName || '--' }}</td>
              <td>
                <span class="method-tag" :class="methodTagClass(row.communicationMethod)">
                  {{ row.communicationMethod || '--' }}
                </span>
              </td>
              <td>{{ row.communicationTime || '--' }}</td>
              <td class="content-cell">{{ row.contentPreview || '--' }}</td>
              <td>
                <span class="followup-tag" :class="row.followUpStatus === '已完成' ? 'followup-tag--done' : 'followup-tag--pending'">
                  {{ row.followUpStatus || '--' }}
                </span>
              </td>
              <td>
                <button type="button" class="action-link" @click="handleView(row)">详情</button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td class="empty-row" colspan="8">暂无沟通记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { getCommunicationList, type CommunicationRow } from '@osg/shared/api/admin/communication'

const keyword = ref('')
const filterMethod = ref('')
const filterHeadTeacher = ref('')
const filterDateStart = ref('')
const filterDateEnd = ref('')
const rows = ref<CommunicationRow[]>([])

const loadData = async () => {
  try {
    const response = await getCommunicationList({
      tab: 'record',
      keyword: keyword.value
    })
    rows.value = response.rows ?? []
  } catch (_error) {
    message.error('沟通记录加载失败')
  }
}

const handleExport = () => {
  message.info('导出功能将在后续版本中接入')
}

const handleView = (_row: CommunicationRow) => {
  message.info('详情功能将在后续版本中接入')
}

const methodTagClass = (method?: string) => {
  const map: Record<string, string> = {
    '微信': 'method-tag--info',
    '邮件': 'method-tag--info',
    '电话': 'method-tag--default',
    '面谈': 'method-tag--default'
  }
  return map[method || ''] || 'method-tag--default'
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped lang="scss">
.communication-page {
  display: grid;
  gap: 16px;
}

/* --- Header --- */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  margin: 0;
  color: var(--text-primary, #1e293b);
  font-size: 24px;
  font-weight: 700;
}

.page-title-en {
  font-size: 14px;
  color: var(--text-secondary, #64748b);
  font-weight: 400;
}

.page-subtitle {
  margin: 4px 0 0;
  color: var(--text-secondary, #64748b);
  font-size: 14px;
}

/* --- Buttons --- */
.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  padding: 8px 16px;
  background: var(--card-bg, #ffffff);
  color: var(--text-primary, #1e293b);
  font-weight: 500;
  cursor: pointer;
}

/* --- Filter row --- */
.filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-input {
  width: 180px;
  height: 36px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 0 12px;
  font-size: 14px;
}

.filter-input--date { width: 130px; }

.filter-select {
  width: 140px;
  height: 36px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 0 8px;
  font-size: 14px;
  background: var(--card-bg, #ffffff);
}

.filter-date-sep {
  color: var(--text-secondary, #64748b);
  line-height: 36px;
}

/* --- Table card --- */
.table-card {
  border-radius: 12px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  overflow: hidden;
}

.table-wrap { overflow-x: auto; }

.communication-table {
  width: 100%;
  border-collapse: collapse;
}

.communication-table th,
.communication-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  text-align: left;
  font-size: 14px;
  color: var(--text-primary, #1e293b);
}

.communication-table th {
  background: var(--table-header-bg, #f8fafc);
  font-size: 13px;
  color: var(--text-secondary, #64748b);
  font-weight: 600;
}

/* --- Content cell --- */
.content-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- Tags --- */
.method-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.method-tag--info { background: #dbeafe; color: #1d4ed8; }
.method-tag--default { background: var(--table-header-bg, #f8fafc); color: var(--text-primary, #1e293b); }

.followup-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.followup-tag--done { background: #dcfce7; color: #166534; }
.followup-tag--pending { background: #fef3c7; color: #92400e; }

/* --- Action link --- */
.action-link {
  border: none;
  background: none;
  padding: 0;
  color: var(--primary, #3b82f6);
  font-weight: 500;
  cursor: pointer;
  font-size: 13px;
}

/* --- Empty --- */
.empty-row {
  color: var(--text-secondary, #64748b);
  text-align: center;
}
</style>
