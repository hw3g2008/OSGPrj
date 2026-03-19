<template>
  <div id="page-communication" class="communication-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">人际关系沟通记录 <span>Communication Records</span></h1>
            <p class="page-sub">查看与导师/班主任的沟通历史记录</p>
          </div>
        </div>
      </template>

      <div class="toolbar">
        <a-input placeholder="搜索记录..." class="toolbar-input" />
        <a-select class="toolbar-select" placeholder="沟通方式" :options="communicationMethodOptions" />
        <a-button>搜索</a-button>
      </div>

      <div class="table-shell">
        <table class="record-table">
          <thead>
            <tr>
              <th>记录人</th>
              <th>沟通方式</th>
              <th>沟通时间</th>
              <th>沟通内容</th>
              <th>跟进事项</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in communicationRecords" :key="record.id">
              <td><strong>{{ record.owner }}</strong></td>
              <td><a-tag :color="record.methodColor">{{ record.method }}</a-tag></td>
              <td>{{ record.time }}</td>
              <td class="ellipsis">{{ record.summary }}</td>
              <td><a-tag :color="record.followUpColor">{{ record.followUp }}</a-tag></td>
              <td>
                <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </OsgPageContainer>

    <a-modal
      v-model:open="detailOpen"
      title="沟通记录详情"
      :footer="null"
      width="620px"
    >
      <div v-if="activeRecord" class="detail-grid">
        <div class="detail-row">
          <span class="detail-label">记录人</span>
          <span>{{ activeRecord.owner }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">沟通方式</span>
          <span>{{ activeRecord.method }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">沟通时间</span>
          <span>{{ activeRecord.time }}</span>
        </div>
        <div class="detail-block">
          <div class="detail-label">沟通内容</div>
          <div class="detail-box">{{ activeRecord.summary }}</div>
        </div>
        <div class="detail-block">
          <div class="detail-label">跟进事项</div>
          <div class="detail-box">{{ activeRecord.followUpDetail }}</div>
        </div>
      </div>
      <div class="dialog-actions">
        <a-button @click="detailOpen = false">关闭</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'

type CommunicationRecord = {
  id: string
  owner: string
  method: string
  methodColor: string
  time: string
  summary: string
  followUp: string
  followUpColor: string
  followUpDetail: string
}

const communicationMethodOptions = [
  { value: 'wechat', label: '微信' },
  { value: 'phone', label: '电话' },
  { value: 'email', label: '邮件' },
  { value: 'meeting', label: '面谈' }
]

const communicationRecords: CommunicationRecord[] = [
  {
    id: 'COMM-001',
    owner: 'Jess (班主任)',
    method: '微信',
    methodColor: 'processing',
    time: '01/18/2026 10:30',
    summary: '讨论面试准备进度，建议增加模拟面试次数并提前整理近期 networking 收获。',
    followUp: '待跟进',
    followUpColor: 'gold',
    followUpDetail: '本周补充 2 次模拟面试，并在下次辅导前回传最新岗位进展。'
  },
  {
    id: 'COMM-002',
    owner: 'Jerry Li (导师)',
    method: '电话',
    methodColor: 'default',
    time: '01/17/2026 14:00',
    summary: '确认下周课程安排，调整上课时间，并同步技术面试的准备重点。',
    followUp: '已完成',
    followUpColor: 'success',
    followUpDetail: '课程时间已经改到周三 19:00，准备材料已同步到资源中心。'
  },
  {
    id: 'COMM-003',
    owner: 'Jess (班主任)',
    method: '邮件',
    methodColor: 'processing',
    time: '01/15/2026 09:00',
    summary: '发送简历修改建议和面试资料，提醒同步更新个人中心中的求职方向。',
    followUp: '已完成',
    followUpColor: 'success',
    followUpDetail: '简历新版本已上传，求职方向变更进入待审核队列。'
  }
]

const detailOpen = ref(false)
const activeRecord = ref<CommunicationRecord | null>(null)

const openDetail = (record: CommunicationRecord) => {
  activeRecord.value = record
  detailOpen.value = true
}
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;

  span {
    color: #4f6b8a;
    font-weight: 600;
  }
}

.page-sub {
  margin: 10px 0 0;
  color: #64748b;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.toolbar-input {
  width: 220px;
}

.toolbar-select {
  width: 160px;
}

.table-shell {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
}

.record-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 14px 16px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f8fafc;
    color: #475569;
    font-size: 13px;
    font-weight: 700;
  }
}

.ellipsis {
  max-width: 280px;
  color: #475569;
}

.detail-grid {
  display: grid;
  gap: 14px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.detail-block {
  display: grid;
  gap: 8px;
}

.detail-label {
  color: #64748b;
  font-size: 13px;
}

.detail-box {
  border-radius: 12px;
  background: #f8fafc;
  padding: 14px 16px;
  line-height: 1.7;
  color: #334155;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>
