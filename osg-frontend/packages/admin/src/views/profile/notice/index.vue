<template>
  <section class="notice-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">通知管理</h1>
        <p class="page-subtitle">向学员和导师发送通知</p>
      </div>
      <a-button type="primary" @click="showSendNoticeModal = true">
        <template #icon><BellOutlined /></template>
        发送通知
      </a-button>
    </header>

    <div class="filter-bar">
      <a-input
        v-model:value="keyword"
        class="filter-input"
        placeholder="标题 / 接收人"
        allow-clear
      />
      <a-select
        v-model:value="receiverType"
        class="filter-select"
        placeholder="类型"
        allow-clear
      >
        <a-select-option value="">类型</a-select-option>
        <a-select-option value="Lead">Lead</a-select-option>
        <a-select-option value="Mentor">Mentor</a-select-option>
        <a-select-option value="Student">Student</a-select-option>
      </a-select>
      <a-range-picker v-model:value="dateRange" />
      <a-button @click="loadNotices">
        <template #icon><SearchOutlined /></template>
        搜索
      </a-button>
    </div>

    <a-card :bordered="true" :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="rows"
        :row-key="(record: NoticeRow) => record.noticeId"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'noticeId'">
            {{ record.noticeId }}
          </template>
          <template v-else-if="column.dataIndex === 'receiverLabel'">
            <strong v-if="record.receiverLabel">{{ record.receiverLabel }}</strong>
            <span v-else>--</span>
          </template>
          <template v-else-if="column.dataIndex === 'receiverType'">
            <a-tag v-if="record.receiverType" color="success">
              {{ record.receiverType }}
            </a-tag>
            <span v-else>--</span>
          </template>
          <template v-else-if="column.dataIndex === 'tag'">
            {{ record.tag || '--' }}
          </template>
          <template v-else-if="column.dataIndex === 'noticeTitle'">
            {{ record.noticeTitle }}
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ record.createTime }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="activeNotice = record">
              查看
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <SendNoticeModal
      v-model="showSendNoticeModal"
      :submitting="submitting"
      @confirm="handleSendNotice"
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { BellOutlined, SearchOutlined } from '@ant-design/icons-vue'
import type { Dayjs } from 'dayjs'
import SendNoticeModal from './components/SendNoticeModal.vue'
import {
  getNoticeList,
  sendNotice,
  type NoticeRow,
  type SendNoticePayload
} from '@osg/shared/api/admin/notice'

const rows = ref<NoticeRow[]>([])
const keyword = ref('')
const receiverType = ref<string>('')
const dateRange = ref<[Dayjs, Dayjs] | null>(null)
const submitting = ref(false)
const showSendNoticeModal = ref(false)
const activeNotice = ref<NoticeRow | null>(null)

const columns = [
  { title: 'ID', dataIndex: 'noticeId', key: 'noticeId' },
  { title: '接收人', dataIndex: 'receiverLabel', key: 'receiverLabel' },
  { title: '类型', dataIndex: 'receiverType', key: 'receiverType' },
  { title: 'Tag', dataIndex: 'tag', key: 'tag' },
  { title: '标题', dataIndex: 'noticeTitle', key: 'noticeTitle' },
  { title: '更新时间', dataIndex: 'createTime', key: 'createTime' },
  { title: '操作', dataIndex: 'action', key: 'action' }
]

const loadNotices = async () => {
  try {
    const response = await getNoticeList({
      keyword: keyword.value,
      receiverType: receiverType.value
    })
    rows.value = response.rows ?? []
  } catch (_error) {
    message.error('通知列表加载失败')
  }
}

const handleSendNotice = async (payload: SendNoticePayload) => {
  submitting.value = true
  try {
    await sendNotice(payload)
    showSendNoticeModal.value = false
    message.success('通知发送成功')
    await loadNotices()
  } catch (_error) {
    // request util handles error message
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadNotices()
})
</script>

<style scoped>
.notice-page {
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
