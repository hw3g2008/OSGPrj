<template>
  <section class="osg-page">
    <PageHeader title-zh="操作日志" description="查看系统操作记录">
      <template #actions>
        <a-button :loading="exporting" @click="handleExport">
          <template #icon><DownloadOutlined /></template>
          导出日志
        </a-button>
      </template>
    </PageHeader>

    <a-form layout="inline" style="gap: 12px; flex-wrap: wrap">
      <a-form-item>
        <a-input v-model:value="keyword" placeholder="搜索操作人/内容..." allow-clear style="width: 200px" />
      </a-form-item>
      <a-form-item>
        <a-select v-model:value="typeFilter" placeholder="全部类型" allow-clear style="width: 120px">
          <a-select-option value="">全部类型</a-select-option>
          <a-select-option value="登录">登录</a-select-option>
          <a-select-option value="新增">新增</a-select-option>
          <a-select-option value="修改">修改</a-select-option>
          <a-select-option value="删除">删除</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item>
        <a-range-picker v-model:value="dateRange" />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" @click="loadLogs">
          <template #icon><SearchOutlined /></template>
          搜索
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
          showTotal: (total: number) => `共 ${total} 条记录`
        }"
        :locale="{ emptyText: '暂无操作日志' }"
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

const rows = ref<LogRow[]>([])
const keyword = ref('')
const typeFilter = ref<string>('')
const dateRange = ref<[Dayjs, Dayjs] | null>(null)
const exporting = ref(false)

const columns = [
  { title: '时间', dataIndex: 'operateTime', key: 'operateTime', width: 120, fixed: 'left' as const },
  { title: '操作人', dataIndex: 'operatorName', key: 'operatorName' },
  { title: '角色', dataIndex: 'roleLabel', key: 'roleLabel' },
  { title: '操作类型', dataIndex: 'operationType', key: 'operationType' },
  { title: '操作内容', dataIndex: 'content', key: 'content' },
  { title: 'IP地址', dataIndex: 'ipAddress', key: 'ipAddress' }
]

const roleColorMap: Record<string, string> = {
  Admin: 'purple',
  Clerk: 'default',
  Accountant: 'default',
  'QBank Admin': 'default'
}

const typeColorMap: Record<string, string> = {
  '登录': 'processing',
  '新增': 'success',
  '修改': 'warning',
  '删除': 'error'
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
    message.error('操作日志加载失败')
  }
}

const handleExport = async () => {
  try {
    exporting.value = true
    await exportLogs(toLogFilters())
    message.success('操作日志导出成功')
  } catch (_error) {
    message.error('操作日志导出失败')
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
