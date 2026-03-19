<template>
  <div id="page-netlog" class="netlog-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">沟通记录 <span>Networking Log</span></h1>
            <p class="page-sub">完成Network沟通后，请填写记录</p>
          </div>
        </div>
      </template>

      <section class="action-hero">
        <div>
          <h2>完成了一次沟通？</h2>
          <p>记录你的Networking成果</p>
        </div>
        <a-button type="primary" size="large" @click="openCreate">
          填写记录
        </a-button>
      </section>

      <div class="card-shell">
        <div class="card-header">
          <span>沟通记录 My Logs</span>
        </div>
        <div class="toolbar">
          <a-input placeholder="搜索公司/对方..." class="toolbar-input" />
          <a-select class="toolbar-select" placeholder="级别" :options="levelOptions" />
          <a-date-picker class="toolbar-date" />
        </div>

        <div class="table-shell">
          <table class="record-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>公司</th>
                <th>对方</th>
                <th>级别</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in networkingLogs" :key="item.id">
                <td>{{ item.id }}</td>
                <td>{{ item.company }}</td>
                <td>{{ item.person }}</td>
                <td>{{ item.level }}</td>
                <td>{{ item.time }}</td>
                <td>
                  <a-button type="link" size="small" @click="openDetail(item)">查看</a-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </OsgPageContainer>

    <a-modal v-model:open="detailOpen" title="沟通记录详情" :footer="null" width="620px">
      <div v-if="activeLog" class="detail-grid">
        <div class="detail-row"><span class="detail-label">公司</span><span>{{ activeLog.company }}</span></div>
        <div class="detail-row"><span class="detail-label">对方姓名</span><span>{{ activeLog.person }}</span></div>
        <div class="detail-row"><span class="detail-label">级别</span><span>{{ activeLog.level }}</span></div>
        <div class="detail-row"><span class="detail-label">沟通时间</span><span>{{ activeLog.time }}</span></div>
        <div class="detail-row"><span class="detail-label">沟通方式</span><span>{{ activeLog.channel }}</span></div>
        <div class="detail-block">
          <div class="detail-label">沟通内容</div>
          <div class="detail-box">{{ activeLog.notes }}</div>
        </div>
        <div class="detail-block">
          <div class="detail-label">收获与总结</div>
          <div class="detail-box detail-success">{{ activeLog.summary }}</div>
        </div>
      </div>

      <div class="dialog-actions">
        <a-button @click="detailOpen = false">关闭</a-button>
        <a-button type="primary" @click="editFromDetail">编辑</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="createOpen" title="填写沟通记录" :footer="null" width="640px">
      <div class="form-grid">
        <a-form-item label="公司 Company" class="form-item">
          <a-input v-model:value="draftLog.company" placeholder="如：Goldman Sachs" />
        </a-form-item>
        <a-form-item label="对方姓名" class="form-item">
          <a-input v-model:value="draftLog.person" placeholder="如：John Smith" />
        </a-form-item>
        <a-form-item label="级别" class="form-item">
          <a-select v-model:value="draftLog.level" :options="levelOptions" />
        </a-form-item>
        <a-form-item label="沟通方式" class="form-item">
          <a-select v-model:value="draftLog.channel" :options="channelOptions" />
        </a-form-item>
        <a-form-item label="沟通日期" class="form-item full-span">
          <a-date-picker class="full-width" />
        </a-form-item>
        <a-form-item label="沟通内容" class="form-item full-span">
          <a-textarea v-model:value="draftLog.notes" :rows="4" placeholder="记录本次 networking 的沟通内容" />
        </a-form-item>
        <a-form-item label="收获与总结" class="form-item full-span">
          <a-textarea v-model:value="draftLog.summary" :rows="4" placeholder="总结你的收获、下一步行动和 follow-up" />
        </a-form-item>
      </div>

      <div class="dialog-actions">
        <a-button @click="createOpen = false">取消</a-button>
        <a-button type="primary" @click="createOpen = false">提交记录</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'

type NetworkingLog = {
  actionId: string
  id: string
  company: string
  person: string
  level: string
  time: string
  channel: string
  notes: string
  summary: string
}

const levelOptions = [
  { value: 'Analyst', label: 'Analyst' },
  { value: 'Associate', label: 'Associate' },
  { value: 'VP', label: 'VP' },
  { value: 'Director', label: 'Director' },
  { value: 'MD', label: 'MD' }
]

const channelOptions = [
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Phone', label: '电话' },
  { value: 'Email', label: '邮件' },
  { value: 'Meeting', label: '面谈' }
]

const netlogActionTriggers = [
  { actionId: 'open-create-modal', label: '填写记录' },
  { actionId: 'open-detail-modal', label: '查看' },
  { actionId: 'open-edit-from-detail', label: '编辑' }
]

const networkingLogs: NetworkingLog[] = [
  {
    actionId: 'log-001',
    id: '#N2025001',
    company: 'Goldman Sachs',
    person: 'John Smith',
    level: 'Associate',
    time: '12/09/2025',
    channel: 'LinkedIn',
    notes: '通过 LinkedIn 联系到对方，进行了 30 分钟电话沟通，重点了解 IBD 部门工作内容与面试流程。',
    summary: '1. 了解了 IBD 的日常工作节奏\n2. 获得了面试准备建议\n3. 对方愿意在后续流程中提供内推支持'
  },
  {
    actionId: 'log-002',
    id: '#N2025002',
    company: 'Morgan Stanley',
    person: 'Emily Chen',
    level: 'VP',
    time: '12/05/2025',
    channel: 'Email',
    notes: '通过邮件跟进前次 coffee chat，确认了团队在香港办公室的招聘节奏与首轮行为面方向。',
    summary: '1. 招聘节奏集中在 1 月\n2. 推荐提前准备 Why this desk / Why Hong Kong 相关问题'
  }
]

const detailOpen = ref(false)
const createOpen = ref(false)
const activeLog = ref<NetworkingLog | null>(null)
const draftLog = reactive({
  company: 'Goldman Sachs',
  person: 'John Smith',
  level: 'Associate',
  channel: 'LinkedIn',
  notes: '',
  summary: ''
})

const openCreate = () => {
  createOpen.value = true
}

const openDetail = (item: NetworkingLog) => {
  activeLog.value = item
  draftLog.company = item.company
  draftLog.person = item.person
  draftLog.level = item.level
  draftLog.channel = item.channel
  draftLog.notes = item.notes
  draftLog.summary = item.summary
  detailOpen.value = true
}

const editFromDetail = () => {
  detailOpen.value = false
  createOpen.value = true
}
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;

  span {
    color: #4f6b8a;
  }
}

.page-sub {
  margin: 10px 0 0;
  color: #64748b;
}

.action-hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  margin-bottom: 20px;
  padding: 22px 24px;
  border-radius: 20px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);

  h2 {
    margin: 0 0 6px;
    font-size: 26px;
    color: #1d4ed8;
  }

  p {
    margin: 0;
    color: #475569;
  }
}

.card-shell {
  border: 1px solid #dbe5f0;
  border-radius: 20px;
  background: #fff;
}

.card-header {
  padding: 18px 20px 0;
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 18px 20px;
}

.toolbar-input {
  width: 220px;
}

.toolbar-select {
  width: 180px;
}

.toolbar-date {
  width: 180px;
}

.table-shell {
  overflow-x: auto;
}

.record-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 14px 20px;
    border-top: 1px solid #e2e8f0;
    text-align: left;
  }

  th {
    background: #f8fafc;
    color: #475569;
    font-size: 13px;
    font-weight: 700;
  }
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
  line-height: 1.8;
  white-space: pre-line;
}

.detail-success {
  background: #ecfdf5;
  color: #166534;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.form-item {
  margin-bottom: 0;
}

.full-span {
  grid-column: 1 / -1;
}

.full-width {
  width: 100%;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
