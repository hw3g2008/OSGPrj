<template>
  <section class="communication-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">Teaching Center</p>
        <h1>人际关系沟通记录</h1>
        <p class="page-subtitle">查看学员沟通历史和 Networking 记录，追踪后续跟进状态与联系人信息。</p>
      </div>
      <button type="button" class="ghost-button">导出</button>
    </header>

    <section class="communication-shell">
      <div class="communication-toolbar">
        <div class="communication-tabs" role="tablist" aria-label="沟通记录类型">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="communication-tab"
            :class="{ 'communication-tab--active': activeTab === tab.key }"
            @click="switchTab(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>

        <p class="communication-status-hint">跟进状态：待跟进 / 已完成</p>

        <div class="communication-search">
          <input
            v-model.trim="keyword"
            class="communication-search__input"
            type="search"
            placeholder="搜索学员 / 联系人 / 记录人"
            @keyup.enter="loadData"
          >
          <button type="button" class="primary-button" @click="loadData">查询</button>
        </div>
      </div>

      <div class="communication-table-wrap">
        <table class="communication-table">
          <thead>
            <tr v-if="activeTab === 'record'">
              <th>ID</th>
              <th>学员</th>
              <th>记录人</th>
              <th>沟通方式</th>
              <th>沟通时间</th>
              <th>沟通内容</th>
              <th>跟进事项</th>
            </tr>
            <tr v-else>
              <th>学员</th>
              <th>联系人</th>
              <th>联系人公司</th>
              <th>联系人职位</th>
              <th>沟通类型</th>
              <th>沟通日期</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.communicationId">
              <template v-if="activeTab === 'record'">
                <td>#{{ row.communicationId }}</td>
                <td>{{ row.studentName }}</td>
                <td>{{ row.recorderName || '--' }}</td>
                <td>{{ row.communicationMethod || '--' }}</td>
                <td>{{ row.communicationTime || '--' }}</td>
                <td>{{ row.contentPreview || '--' }}</td>
                <td>
                  <span class="badge" :class="row.followUpStatus === '已完成' ? 'badge--positive' : 'badge--warning'">
                    {{ row.followUpStatus || '--' }}
                  </span>
                </td>
              </template>
              <template v-else>
                <td>{{ row.studentName }}</td>
                <td>{{ row.contactName || '--' }}</td>
                <td>{{ row.contactCompany || '--' }}</td>
                <td>{{ row.contactPosition || '--' }}</td>
                <td>{{ row.networkingType || '--' }}</td>
                <td>{{ row.communicationTime || '--' }}</td>
                <td>
                  <span class="badge" :class="row.statusLabel === '已完成' ? 'badge--positive' : 'badge--warning'">
                    {{ row.statusLabel || '--' }}
                  </span>
                </td>
              </template>
            </tr>
            <tr v-if="!rows.length">
              <td class="empty-row" :colspan="activeTab === 'record' ? 7 : 7">暂无沟通记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { getCommunicationList, type CommunicationRow, type CommunicationTab } from '@osg/shared/api/admin/communication'

const keyword = ref('')
const activeTab = ref<CommunicationTab>('record')
const rows = ref<CommunicationRow[]>([])

const tabs = [
  { key: 'record' as const, label: '沟通记录' },
  { key: 'networking' as const, label: 'Networking' }
]

const loadData = async () => {
  try {
    const response = await getCommunicationList({
      tab: activeTab.value,
      keyword: keyword.value
    })
    rows.value = response.rows ?? []
  } catch (_error) {
    message.error('沟通记录加载失败')
  }
}

const switchTab = (tab: CommunicationTab) => {
  activeTab.value = tab
  void loadData()
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped lang="scss">
.communication-page {
  display: grid;
  gap: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-eyebrow {
  margin: 0 0 6px;
  color: #7c3aed;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 32px;
}

.page-subtitle {
  margin: 8px 0 0;
  max-width: 720px;
  color: #475569;
}

.ghost-button,
.primary-button {
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 600;
  cursor: pointer;
}

.ghost-button {
  background: #f3e8ff;
  color: #6b21a8;
}

.primary-button {
  background: #0f766e;
  color: #fff;
}

.communication-shell {
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.communication-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.communication-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.communication-tab {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 10px 16px;
  background: #fff;
  color: #334155;
  cursor: pointer;
}

.communication-tab--active {
  border-color: #7c3aed;
  background: #f3e8ff;
  color: #6b21a8;
}

.communication-search {
  display: flex;
  gap: 10px;
}

.communication-status-hint {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}

.communication-search__input {
  min-width: 280px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 10px 14px;
}

.communication-table-wrap {
  overflow-x: auto;
}

.communication-table {
  width: 100%;
  border-collapse: collapse;
}

.communication-table th,
.communication-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  white-space: nowrap;
}

.communication-table th {
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.badge--positive {
  background: #dcfce7;
  color: #166534;
}

.badge--warning {
  background: #fef3c7;
  color: #92400e;
}

.empty-row {
  padding: 24px 0;
  text-align: center;
  color: #64748b;
}

@media (max-width: 768px) {
  .page-header,
  .communication-toolbar,
  .communication-search {
    flex-direction: column;
    align-items: stretch;
  }

  .communication-search__input {
    min-width: 0;
    width: 100%;
  }
}
</style>
