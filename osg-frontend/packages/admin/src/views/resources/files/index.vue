<template>
  <div class="osg-page">
    <PageHeader title-zh="文件管理" title-en="File Management">
      <template #actions>
        <a-button type="primary" @click="showNewFolderModal = true">
          <template #icon><FolderAddOutlined /></template>
          新建文件夹
        </a-button>
      </template>
    </PageHeader>

    <a-card :bordered="false">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="keyword" placeholder="搜索文件名" allow-clear style="width: 200px" @press-enter="loadFiles" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadFiles">
            <template #icon><SearchOutlined /></template>
            搜索
          </a-button>
        </a-form-item>
      </a-form>

      <a-table :columns="fileColumns" :data-source="rows" :row-key="(r: FileRow) => r.fileId" :pagination="false" :locale="{ emptyText: '暂无文件记录' }" :scroll="{ x: 800 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'fileName'">
            <div style="display: flex; align-items: center; gap: 10px">
              <span class="mdi" :class="fileTypeIconMap[record.fileType]" :style="{ color: fileTypeColorMap[record.fileType], fontSize: '22px' }" />
              <strong>{{ record.fileName }}</strong>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'className'">
            {{ record.className || 'All' }}
          </template>
          <template v-else-if="column.dataIndex === 'authorizedTo'">
            <a-button type="link" size="small" @click="openAuthModal(record)">{{ record.authorizedTo }}</a-button>
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ formatTime(record.createTime) }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="openAuthModal(record)">授权</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <NewFolderModal
      v-model="showNewFolderModal"
      :submitting="submitting"
      @confirm="handleCreateFolder"
    />

    <FileAuthModal
      v-model="showAuthModal"
      :row="selectedRow"
      :submitting="submitting"
      @confirm="handleUpdateAuth"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { FolderAddOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import NewFolderModal from './components/NewFolderModal.vue'
import FileAuthModal from './components/FileAuthModal.vue'
import {
  createFileFolder,
  getFileList,
  updateFileAuth,
  type CreateFileFolderPayload,
  type FileRow,
  type UpdateFileAuthPayload
} from '@osg/shared/api/admin/file'

const fileTypeIconMap: Record<FileRow['fileType'], string> = {
  folder: 'mdi-folder',
  pdf: 'mdi-file-pdf-box',
  word: 'mdi-file-word-box'
}

const fileTypeColorMap: Record<FileRow['fileType'], string> = {
  folder: '#f59e0b',
  pdf: '#dc2626',
  word: '#2563eb'
}

const fileColumns = [
  { title: 'ID', dataIndex: 'fileId', key: 'fileId', width: 80, customRender: ({ text }: { text: number }) => `#${text}`, fixed: 'left' as const },
  { title: '文件名', dataIndex: 'fileName', key: 'fileName', width: 200 },
  { title: '分类', dataIndex: 'className', key: 'className', width: 100 },
  { title: '大小', dataIndex: 'fileSize', key: 'fileSize', width: 100 },
  { title: '授权对象', dataIndex: 'authorizedTo', key: 'authorizedTo', width: 120 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 140 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
]

const rows = ref<FileRow[]>([])
const keyword = ref('')
const showNewFolderModal = ref(false)
const showAuthModal = ref(false)
const submitting = ref(false)
const selectedRow = ref<FileRow | null>(null)

const loadFiles = async () => {
  try {
    const response = await getFileList({ keyword: keyword.value || undefined })
    rows.value = response.rows ?? []
  } catch (_error) {
    message.error('文件列表加载失败')
  }
}

const handleCreateFolder = async (payload: CreateFileFolderPayload) => {
  submitting.value = true
  try {
    await createFileFolder(payload)
    showNewFolderModal.value = false
    message.success('文件夹创建成功')
    await loadFiles()
  } catch (_error) {
    // request helper handles messages
  } finally {
    submitting.value = false
  }
}

const openAuthModal = (row: FileRow) => {
  selectedRow.value = row
  showAuthModal.value = true
}

const handleUpdateAuth = async (payload: UpdateFileAuthPayload) => {
  submitting.value = true
  try {
    await updateFileAuth(payload)
    showAuthModal.value = false
    message.success('文件授权已更新')
    await loadFiles()
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
  void loadFiles()
})
</script>

<style scoped>
</style>
