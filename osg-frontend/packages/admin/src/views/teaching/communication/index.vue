<template>
  <div class="osg-page">
    <PageHeader title-zh="人际关系沟通记录" title-en="Communication Records" description="查看学员与导师/班主任的沟通历史记录">
      <template #actions>
        <a-button @click="handleExport">
          <template #icon><ExportOutlined /></template>
          导出
        </a-button>
      </template>
    </PageHeader>

    <a-card :bordered="false">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="keyword" placeholder="搜索学员/记录人..." allow-clear style="width: 180px" @press-enter="loadData" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterMethod" placeholder="沟通方式" allow-clear style="width: 120px">
            <a-select-option value="phone">电话</a-select-option>
            <a-select-option value="wechat">微信</a-select-option>
            <a-select-option value="email">邮件</a-select-option>
            <a-select-option value="meeting">面谈</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterHeadTeacher" placeholder="全部班主任" allow-clear style="width: 120px">
            <a-select-option value="Jess">Jess</a-select-option>
            <a-select-option value="Amy">Amy</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-date-picker v-model:value="filterDateStart" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 130px" />
            <span>~</span>
            <a-date-picker v-model:value="filterDateEnd" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 130px" />
          </a-space>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadData">
            <template #icon><SearchOutlined /></template>
            搜索
          </a-button>
        </a-form-item>
      </a-form>

      <a-table
        :columns="commColumns"
        :data-source="rows"
        :row-key="(record: CommunicationRow) => record.communicationId"
        :pagination="false"
        :locale="{ emptyText: '暂无沟通记录' }"
        :scroll="{ x: 1000 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'studentName'">
            <strong>{{ record.studentName }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'recorderName'">
            {{ record.recorderName || '--' }}
          </template>
          <template v-else-if="column.dataIndex === 'communicationMethod'">
            <a-tag :color="methodColor(record.communicationMethod)">{{ record.communicationMethod || '--' }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'communicationTime'">
            {{ record.communicationTime || '--' }}
          </template>
          <template v-else-if="column.dataIndex === 'contentPreview'">
            <span style="max-width: 200px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ record.contentPreview || '--' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'followUpStatus'">
            <a-tag :color="record.followUpStatus === '已完成' ? 'green' : 'orange'">{{ record.followUpStatus || '--' }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="handleView(record)">详情</a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { getCommunicationList, type CommunicationRow } from '@osg/shared/api/admin/communication'

const commColumns = [
  { title: 'ID', dataIndex: 'communicationId', key: 'communicationId', width: 70 },
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: '记录人', dataIndex: 'recorderName', key: 'recorderName', width: 100 },
  { title: '沟通方式', dataIndex: 'communicationMethod', key: 'communicationMethod', width: 100 },
  { title: '沟通时间', dataIndex: 'communicationTime', key: 'communicationTime', width: 150 },
  { title: '沟通内容', dataIndex: 'contentPreview', key: 'contentPreview', width: 200, ellipsis: true },
  { title: '跟进事项', dataIndex: 'followUpStatus', key: 'followUpStatus', width: 100 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
]

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

const methodColor = (method?: string) => {
  const map: Record<string, string> = {
    '微信': 'green',
    '邮件': 'blue',
    '电话': 'default',
    '面谈': 'purple'
  }
  return map[method || ''] || 'default'
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped>
</style>
