<template>
  <div class="osg-page">
    <PageHeader title-zh="题库管理" title-en="Question Bank">
      <template #actions>
        <a-button type="primary" @click="openCreateModal">
          <template #icon><FolderAddOutlined /></template>
          新建文件夹
        </a-button>
      </template>
    </PageHeader>

    <a-card :bordered="false">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="keyword" placeholder="搜索文件名" allow-clear style="width: 200px" @press-enter="loadRows" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadRows">
            <template #icon><SearchOutlined /></template>
            搜索
          </a-button>
        </a-form-item>
      </a-form>

      <a-table :columns="qbankColumns" :data-source="rows" :row-key="(r: QbankFolderRow) => r.fileId" :pagination="false" :locale="{ emptyText: '暂无题库文件夹' }" :scroll="{ x: 800 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'fileName'">
            <div style="display: flex; align-items: center; gap: 10px">
              <span class="mdi mdi-folder" style="color: #f59e0b; font-size: 22px" />
              <strong>{{ record.fileName }}</strong>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'fileSize'">
            {{ record.fileSize || '--' }}
          </template>
          <template v-else-if="column.dataIndex === 'authorizedTo'">
            {{ record.authorizedTo || '全部用户' }}
          </template>
          <template v-else-if="column.dataIndex === 'expiryAt'">
            {{ record.expiryAt || '未设置' }}
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ formatTime(record.createTime) }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="openEditModal(record)">编辑 + 授权</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <QbankFolderModal
      v-model="showModal"
      :mode="modalMode"
      :row="selectedRow"
      :submitting="submitting"
      @confirm="handleConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { FolderAddOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import QbankFolderModal from './components/QbankFolderModal.vue'
import {
  createQbankFolder,
  getQbankList,
  updateQbankAuth,
  updateQbankExpiry,
  type QbankFolderRow
} from '@osg/shared/api/admin/qbank'

const qbankColumns = [
  { title: 'ID', dataIndex: 'fileId', key: 'fileId', width: 80, customRender: ({ text }: { text: number }) => `#${text}` },
  { title: '名称', dataIndex: 'fileName', key: 'fileName', width: 200 },
  { title: '大小', dataIndex: 'fileSize', key: 'fileSize', width: 100 },
  { title: '授权对象', dataIndex: 'authorizedTo', key: 'authorizedTo', width: 120 },
  { title: '过期时间', dataIndex: 'expiryAt', key: 'expiryAt', width: 130 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 140 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 100 },
]

const rows = ref<QbankFolderRow[]>([])
const keyword = ref('')
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const selectedRow = ref<QbankFolderRow | null>(null)
const submitting = ref(false)

const loadRows = async () => {
  try {
    const response = await getQbankList(keyword.value || undefined)
    rows.value = response.rows ?? []
  } catch (_error) {
    message.error('题库列表加载失败')
  }
}

const openCreateModal = () => {
  modalMode.value = 'create'
  selectedRow.value = null
  showModal.value = true
}

const openEditModal = (row: QbankFolderRow) => {
  modalMode.value = 'edit'
  selectedRow.value = row
  showModal.value = true
}

const handleConfirm = async (payload: {
  folderName: string
  authType: 'all' | 'class' | 'user'
  authorizedClasses: string[]
  authorizedUsers: string[]
  expiryAt?: string
}) => {
  submitting.value = true
  try {
    let fileId = selectedRow.value?.fileId

    if (modalMode.value === 'create')
    {
      const created = await createQbankFolder({ folderName: payload.folderName })
      fileId = created.fileId
    }

    if (!fileId)
    {
      throw new Error('fileId is required')
    }

    await updateQbankAuth({
      fileId,
      authType: payload.authType,
      authorizedClasses: payload.authorizedClasses,
      authorizedUsers: payload.authorizedUsers
    })

    if (payload.expiryAt)
    {
      await updateQbankExpiry({ fileId, expiryAt: payload.expiryAt })
    }

    showModal.value = false
    message.success(modalMode.value === 'create' ? '题库文件夹创建成功' : '题库文件夹已更新')
    await loadRows()
  } catch (_error) {
    // request helper handles messages
  } finally {
    submitting.value = false
  }
}

const formatTime = (value?: string | null) => {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}

onMounted(() => {
  void loadRows()
})
</script>

<style scoped>
</style>
