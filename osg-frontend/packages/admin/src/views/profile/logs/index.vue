<template>
  <section class="osg-page">
    <PageHeader :title-zh="t('admin.profile.logs.title')" :description="t('admin.profile.logs.description')">
      <template #actions>
        <a-button :loading="exporting" @click="handleExport">
          <template #icon><DownloadOutlined /></template>
          {{ t('admin.profile.logs.exportBtn') }}
        </a-button>
      </template>
    </PageHeader>

    <a-form layout="inline" style="gap: 12px; flex-wrap: wrap">
      <a-form-item>
        <a-input v-model:value="keyword" :placeholder="t('admin.profile.logs.filter.searchPlaceholder')" allow-clear style="width: 200px" />
      </a-form-item>
      <a-form-item>
        <a-select v-model:value="typeFilter" :placeholder="t('admin.profile.logs.filter.typePlaceholder')" allow-clear style="width: 120px">
          <a-select-option value="">{{ t('admin.profile.logs.operationType.all') }}</a-select-option>
          <a-select-option value="登录">{{ t('admin.profile.logs.operationType.login') }}</a-select-option><!-- i18n-skip-line: backend enum value -->
          <a-select-option value="新增">{{ t('admin.profile.logs.operationType.create') }}</a-select-option><!-- i18n-skip-line: backend enum value -->
          <a-select-option value="修改">{{ t('admin.profile.logs.operationType.update') }}</a-select-option><!-- i18n-skip-line: backend enum value -->
          <a-select-option value="删除">{{ t('admin.profile.logs.operationType.delete') }}</a-select-option><!-- i18n-skip-line: backend enum value -->
        </a-select>
      </a-form-item>
      <a-form-item>
        <a-range-picker v-model:value="dateRange" />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" @click="loadLogs">
          <template #icon><SearchOutlined /></template>
          {{ t('admin.profile.logs.filter.search') }}
        </a-button>
      </a-form-item>
    </a-form>

    <a-card :bordered="true" :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="rows"
        :scroll="{ x: 'max-content' }"
        :row-key="(record: LogRow) => record.operId"
        :pagination="pagination"
        :locale="{ emptyText: t('admin.profile.logs.empty') }"
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
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import type { Dayjs } from 'dayjs'
import { exportLogs, getLogList, type LogRow } from '@osg/shared/api/admin/log'

const { t } = useI18n()
const rows = ref<LogRow[]>([])
const keyword = ref('')
const typeFilter = ref<string>('')
const dateRange = ref<[Dayjs, Dayjs] | null>(null)
const exporting = ref(false)

const columns = computed(() => [
  { title: t('admin.profile.logs.columns.time'), dataIndex: 'operateTime', key: 'operateTime', width: 120, fixed: 'left' as const },
  { title: t('admin.profile.logs.columns.operator'), dataIndex: 'operatorName', key: 'operatorName' },
  { title: t('admin.profile.logs.columns.role'), dataIndex: 'roleLabel', key: 'roleLabel' },
  { title: t('admin.profile.logs.columns.operationType'), dataIndex: 'operationType', key: 'operationType' },
  { title: t('admin.profile.logs.columns.content'), dataIndex: 'content', key: 'content' },
  { title: t('admin.profile.logs.columns.ip'), dataIndex: 'ipAddress', key: 'ipAddress' }
])

const pagination = computed(() => ({
  pageSize: 15,
  simple: false,
  showSizeChanger: false,
  showTotal: (total: number) => t('admin.profile.logs.total', { total })
}))

const roleColorMap: Record<string, string> = {
  Admin: 'purple',
  Clerk: 'default',
  Accountant: 'default',
  'QBank Admin': 'default'
}

const typeColorMap: Record<string, string> = {
  '登录': 'processing', // i18n-skip-line: backend enum value as map key
  '新增': 'success', // i18n-skip-line: backend enum value as map key
  '修改': 'warning', // i18n-skip-line: backend enum value as map key
  '删除': 'error' // i18n-skip-line: backend enum value as map key
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
    message.error(t('admin.profile.logs.messages.loadFailed'))
  }
}

const handleExport = async () => {
  try {
    exporting.value = true
    await exportLogs(toLogFilters())
    message.success(t('admin.profile.logs.messages.exportSuccess'))
  } catch (_error) {
    message.error(t('admin.profile.logs.messages.exportFailed'))
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
