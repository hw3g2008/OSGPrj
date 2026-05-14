<template>
  <section class="osg-page">
    <PageHeader :title-zh="$t('operation_log')" :description="$t('view_system_operation_logs')">
      <template #actions>
        <a-button :loading="exporting" @click="handleExport">
          <template #icon><DownloadOutlined /></template>
          {{ $t('export_logs') }}
        </a-button>
      </template>
    </PageHeader>

    <a-form layout="inline" style="gap: 12px; flex-wrap: wrap">
      <a-form-item>
        <a-input v-model:value="keyword" :placeholder="`${$t('search_operator_content')}...`" allow-clear style="width: 200px" />
      </a-form-item>
      <a-form-item>
        <a-select v-model:value="typeFilter" :placeholder="$t('all_types')" allow-clear style="width: 120px">
          <a-select-option value="">{{ $t('all_types') }}</a-select-option>
          <a-select-option :value="$t('login')">{{ $t('login') }}</a-select-option>
          <a-select-option :value="$t('add')">{{ $t('add') }}</a-select-option>
          <a-select-option :value="$t('edit_2')">{{ $t('edit_2') }}</a-select-option>
          <a-select-option :value="$t('delete')">{{ $t('delete') }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item>
        <a-range-picker v-model:value="dateRange" />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" @click="loadLogs">
          <template #icon><SearchOutlined /></template>
          {{ $t('search') }}
        </a-button>
      </a-form-item>
    </a-form>

    <a-card :bordered="true" :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="rows"
        :scroll="{ x: 'max-content' }"
        :row-key="(record: LogRow) => record.operId"
        :pagination="{
          pageSize: 15,
          simple: false,
          showSizeChanger: false,
          showTotal: (total: number) => `${t('in_total')} ${total} ${t('records')}`
        }"
        :locale="{ emptyText: $t('no_operation_logs') }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'operateTime'">
            {{ record.operateTime }}
          </template>
          <template v-else-if="column.dataIndex === 'operatorName'">
            <strong>{{ record.operatorName }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'roleLabel'">
            <a-tag :color="roleColorMap[record.roleLabel] ?? 'default'">
              {{ record.roleLabel }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'operationType'">
            <a-tag :color="typeColorMap[record.operationType] ?? 'default'">
              {{ record.operationType }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'content'">
            {{ record.content }}
          </template>
          <template v-else-if="column.dataIndex === 'ipAddress'">
            {{ record.ipAddress }}
          </template>
        </template>
      </a-table>
    </a-card>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import type { Dayjs } from 'dayjs'
import { exportLogs, getLogList, type LogRow } from '@osg/shared/api/admin/log'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const rows = ref<LogRow[]>([])
const keyword = ref('')
const typeFilter = ref<string>('')
const dateRange = ref<[Dayjs, Dayjs] | null>(null)
const exporting = ref(false)

const columns = [
  { title: t('time'), dataIndex: 'operateTime', key: 'operateTime' },
  { title: t('operator'), dataIndex: 'operatorName', key: 'operatorName' },
  { title: t('role'), dataIndex: 'roleLabel', key: 'roleLabel' },
  { title: t('operation_type'), dataIndex: 'operationType', key: 'operationType' },
  { title: t('operation_content'), dataIndex: 'content', key: 'content' },
  { title: t('ip_address'), dataIndex: 'ipAddress', key: 'ipAddress' }
]

const roleColorMap: Record<string, string> = {
  Admin: 'purple',
  Clerk: 'default',
  Accountant: 'default',
  'QBank Admin': 'default'
}

const typeColorMap: Record<string, string> = {
  [t('login')]: 'processing',
  [t('add')]: 'success',
  [t('edit_2')]: 'warning',
  [t('delete')]: 'error'
}

const toLogFilters = () => ({
  keyword: keyword.value || undefined,
  operationType: typeFilter.value || undefined,
  beginTime: dateRange.value?.[0]?.format('YYYY-MM-DD'),
  endTime: dateRange.value?.[1]?.format('YYYY-MM-DD')
})

const loadLogs = async () => {
  try {
    const response = await getLogList(toLogFilters())
    rows.value = response.rows ?? []
  } catch (_error) {
    message.error(t('failed_to_load_operation_logs'))
  }
}

const handleExport = async () => {
  try {
    exporting.value = true
    await exportLogs(toLogFilters())
    message.success(t('operation_logs_exported_successfully'))
  } catch (_error) {
    message.error(t('failed_to_export_operation_logs'))
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  void loadLogs()
})
</script>

<style scoped>
</style>

