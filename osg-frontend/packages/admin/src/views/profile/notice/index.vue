<template>
  <section class="notice-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">Profile Center</p>
        <h1>通知管理</h1>
        <p class="page-subtitle">向学员和导师发送通知</p>
      </div>
      <button type="button" class="primary-button" @click="showSendNoticeModal = true">发送通知</button>
    </header>

    <section class="toolbar-card">
      <input v-model.trim="keyword" class="toolbar-input" type="search" placeholder="搜索标题 / 接收人">
      <select v-model="receiverType" class="toolbar-select">
        <option value="">全部类型</option>
        <option value="all_mentor">全部导师</option>
        <option value="target_mentor">指定导师</option>
        <option value="all_student">全部学员</option>
        <option value="target_student">指定学员</option>
      </select>
      <button type="button" class="ghost-button" @click="loadNotices">刷新</button>
    </section>

    <section class="table-card">
      <table class="notice-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>接收人</th>
            <th>类型</th>
            <th>标题</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.noticeId">
            <td>#{{ row.noticeId }}</td>
            <td>{{ row.receiverLabel }}</td>
            <td>{{ receiverTypeLabelMap[row.receiverType] }}</td>
            <td>{{ row.noticeTitle }}</td>
            <td>{{ row.createTime }}</td>
            <td>
              <button type="button" class="link-button" @click="activeNotice = row">查看</button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td class="empty-row" colspan="6">暂无通知</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-if="activeNotice" class="preview-card">
      <div>
        <p class="preview-card__eyebrow">Notice Preview</p>
        <h3>{{ activeNotice.noticeTitle }}</h3>
      </div>
      <dl class="preview-grid">
        <div>
          <dt>接收人</dt>
          <dd>{{ activeNotice.receiverLabel }}</dd>
        </div>
        <div>
          <dt>类型</dt>
          <dd>{{ receiverTypeLabelMap[activeNotice.receiverType] }}</dd>
        </div>
        <div>
          <dt>内容</dt>
          <dd>{{ activeNotice.noticeContent || '—' }}</dd>
        </div>
      </dl>
    </section>

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
import SendNoticeModal from './components/SendNoticeModal.vue'
import {
  getNoticeList,
  sendNotice,
  type NoticeReceiverType,
  type NoticeRow,
  type SendNoticePayload
} from '@osg/shared/api/admin/notice'

const receiverTypeLabelMap: Record<NoticeReceiverType, string> = {
  all_mentor: '全部导师',
  target_mentor: '指定导师',
  all_student: '全部学员',
  target_student: '指定学员'
}

const rows = ref<NoticeRow[]>([])
const keyword = ref('')
const receiverType = ref<NoticeReceiverType | ''>('')
const submitting = ref(false)
const showSendNoticeModal = ref(false)
const activeNotice = ref<NoticeRow | null>(null)

const loadNotices = async () => {
  try {
    const response = await getNoticeList({
      keyword: keyword.value,
      receiverType: receiverType.value
    })
    rows.value = response.rows ?? []
    if (!activeNotice.value && rows.value.length) {
      activeNotice.value = rows.value[0]
    }
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

<style scoped lang="scss">
.notice-page {
  display: grid;
  gap: 20px;
}

.page-header,
.toolbar-card {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.page-header {
  align-items: flex-start;
  justify-content: space-between;
}

.page-eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
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

.toolbar-card,
.table-card,
.preview-card {
  padding: 18px 20px;
  border: 1px solid #dbe4f0;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.06);
}

.toolbar-input,
.toolbar-select {
  min-width: 220px;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
}

.notice-table {
  width: 100%;
  border-collapse: collapse;
}

.notice-table th,
.notice-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
}

.empty-row {
  text-align: center;
  color: #64748b;
}

.preview-card__eyebrow {
  margin: 0 0 8px;
  color: #0e7490;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview-card h3 {
  margin: 0;
}

.preview-grid {
  display: grid;
  gap: 14px;
  margin: 16px 0 0;
}

.preview-grid dt {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.preview-grid dd {
  margin: 6px 0 0;
  color: #0f172a;
}

.primary-button,
.ghost-button,
.link-button {
  height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}

.primary-button {
  border: none;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #0e7490);
}

.ghost-button {
  border: 1px solid #cbd5e1;
  background: #fff;
}

.link-button {
  height: 32px;
  border: none;
  color: #0f766e;
  background: rgba(15, 118, 110, 0.12);
}
</style>
