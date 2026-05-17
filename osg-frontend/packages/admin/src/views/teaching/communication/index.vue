<template>
  <div class="osg-page">
    <PageHeader :title-zh="t('admin.teaching.communication.pageTitle')" title-en="Communication Records">
      <template #actions>
        <a-button @click="handleExport">
          <template #icon><ExportOutlined /></template>
          {{ t('admin.teaching.communication.export') }}
        </a-button>
      </template>
    </PageHeader>

    <a-card :bordered="false">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="keyword" :placeholder="t('admin.teaching.communication.searchPlaceholder')" allow-clear style="width: 180px" @press-enter="loadData" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterMethod" :placeholder="t('admin.teaching.communication.methodPlaceholder')" allow-clear style="width: 120px">
            <a-select-option value="phone">{{ t('admin.teaching.communication.method.phone') }}</a-select-option>
            <a-select-option value="wechat">{{ t('admin.teaching.communication.method.wechat') }}</a-select-option>
            <a-select-option value="email">{{ t('admin.teaching.communication.method.email') }}</a-select-option>
            <a-select-option value="meeting">{{ t('admin.teaching.communication.method.meeting') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterHeadTeacher" :placeholder="t('admin.teaching.communication.headTeacherPlaceholder')" allow-clear style="width: 120px">
            <a-select-option value="Jess">Jess</a-select-option>
            <a-select-option value="Amy">Amy</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-date-picker v-model:value="filterDateStart" :placeholder="t('admin.teaching.communication.dateStart')" value-format="YYYY-MM-DD" style="width: 130px" />
            <span>~</span>
            <a-date-picker v-model:value="filterDateEnd" :placeholder="t('admin.teaching.communication.dateEnd')" value-format="YYYY-MM-DD" style="width: 130px" />
          </a-space>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadData">
            <template #icon><SearchOutlined /></template>
            {{ t('admin.teaching.communication.search') }}
          </a-button>
        </a-form-item>
      </a-form>

      <a-table
        :columns="commColumns"
        :data-source="rows"
        :row-key="(record: CommunicationRow) => record.communicationId"
        :pagination="false"
        :locale="{ emptyText: t('admin.teaching.communication.empty') }"
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
            <a-tag :color="record.followUpStatus === '已完成' ? 'green' : 'orange'">{{ record.followUpStatus || '--' }}</a-tag><!-- i18n-skip-line: backend enum value comparison -->
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="handleView(record)">{{ t('admin.teaching.communication.action.detail') }}</a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { getCommunicationList, type CommunicationRow } from '@osg/shared/api/admin/communication'

const { t } = useI18n()

const commColumns = computed(() => [
  { title: 'ID', dataIndex: 'communicationId', key: 'communicationId', width: 70, fixed: 'left' as const },
  { title: t('admin.teaching.communication.columns.student'), dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: t('admin.teaching.communication.columns.recorder'), dataIndex: 'recorderName', key: 'recorderName', width: 100 },
  { title: t('admin.teaching.communication.columns.method'), dataIndex: 'communicationMethod', key: 'communicationMethod', width: 100 },
  { title: t('admin.teaching.communication.columns.time'), dataIndex: 'communicationTime', key: 'communicationTime', width: 150 },
  { title: t('admin.teaching.communication.columns.content'), dataIndex: 'contentPreview', key: 'contentPreview', width: 200, ellipsis: true },
  { title: t('admin.teaching.communication.columns.followUp'), dataIndex: 'followUpStatus', key: 'followUpStatus', width: 100 },
  { title: t('admin.teaching.communication.columns.action'), dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
])

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
  }
}

const handleExport = () => {
  message.info(t('admin.teaching.communication.messages.exportTodo'))
}

const handleView = (_row: CommunicationRow) => {
  message.info(t('admin.teaching.communication.messages.detailTodo'))
}

const methodColor = (method?: string) => {
  const map: Record<string, string> = {
    '微信': 'green', // i18n-skip-line: backend enum value as map key
    '邮件': 'blue', // i18n-skip-line: backend enum value as map key
    '电话': 'default', // i18n-skip-line: backend enum value as map key
    '面谈': 'purple' // i18n-skip-line: backend enum value as map key
  }
  return map[method || ''] || 'default'
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped>
</style>
