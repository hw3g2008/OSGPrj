<template>
  <div class="osg-page">
    <PageHeader :title-zh="$t('interpersonal_communication_records')" title-en="Communication Records" :description="$t('view_communication_history_between_stude')">
      <template #actions>
        <a-button @click="handleExport">
          <template #icon><ExportOutlined /></template>
          {{ $t('export') }}
        </a-button>
      </template>
    </PageHeader>

    <a-card :bordered="false">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="keyword" :placeholder="`${$t('search_student_recorder')}...`" allow-clear style="width: 180px" @press-enter="loadData" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterMethod" :placeholder="$t('communication_method')" allow-clear style="width: 120px">
            <a-select-option value="phone">{{ $t('phone') }}</a-select-option>
            <a-select-option value="wechat">{{ $t('wechat') }}</a-select-option>
            <a-select-option value="email">{{ $t('mail') }}</a-select-option>
            <a-select-option value="meeting">{{ $t('in_person_meeting') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterHeadTeacher" :placeholder="$t('all_class_teachers')" allow-clear style="width: 120px">
            <a-select-option value="Jess">Jess</a-select-option>
            <a-select-option value="Amy">Amy</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-date-picker v-model:value="filterDateStart" :placeholder="$t('start_date_2')" value-format="YYYY-MM-DD" style="width: 130px" />
            <span>~</span>
            <a-date-picker v-model:value="filterDateEnd" :placeholder="$t('end_date_2')" value-format="YYYY-MM-DD" style="width: 130px" />
          </a-space>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadData">
            <template #icon><SearchOutlined /></template>
            {{ $t('search') }}
          </a-button>
        </a-form-item>
      </a-form>

      <a-table
        :columns="commColumns"
        :data-source="rows"
        :row-key="(record: CommunicationRow) => record.communicationId"
        :pagination="false"
        :locale="{ emptyText: $t('no_communication_records') }"
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
            <a-tag :color="record.followUpStatus === t('completed') ? 'green' : 'orange'">{{ record.followUpStatus || '--' }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="handleView(record)">{{ $t('details') }}</a-button>
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
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const commColumns = [
  { title: 'ID', dataIndex: 'communicationId', key: 'communicationId', width: 70 },
  { title: t('student'), dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: t('recorded_by'), dataIndex: 'recorderName', key: 'recorderName', width: 100 },
  { title: t('communication_method'), dataIndex: 'communicationMethod', key: 'communicationMethod', width: 100 },
  { title: t('communication_time'), dataIndex: 'communicationTime', key: 'communicationTime', width: 150 },
  { title: t('communication_content'), dataIndex: 'contentPreview', key: 'contentPreview', width: 200, ellipsis: true },
  { title: t('follow_up_items'), dataIndex: 'followUpStatus', key: 'followUpStatus', width: 100 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
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
    message.error(t('failed_to_load_communication_records'))
  }
}

const handleExport = () => {
  message.info(t('export_feature_will_be_available_in_a_fu'))
}

const handleView = (_row: CommunicationRow) => {
  message.info(t('detail_feature_will_be_available_in_a_fu'))
}

const methodColor = (method?: string) => {
  const map: Record<string, string> = {
    [t('wechat')]: 'green',
    [t('email')]: 'blue',
    [t('phone')]: 'default',
    [t('in_person_meeting')]: 'purple'
  }
  return map[method || ''] || 'default'
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped>
</style>

