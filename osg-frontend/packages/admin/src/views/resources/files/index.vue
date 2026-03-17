<template>
  <section class="file-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">Resource Center</p>
        <h1>文件管理</h1>
        <p class="page-subtitle">管理学习文件</p>
      </div>
      <button type="button" class="primary-button" @click="showNewFolderModal = true">New Folder</button>
    </header>

    <section class="toolbar-card">
      <input v-model.trim="keyword" class="toolbar-input" type="search" placeholder="File Name">
      <button type="button" class="ghost-button" @click="loadFiles">Search</button>
    </section>

    <section class="table-card">
      <table class="file-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Class</th>
            <th>Size</th>
            <th>Authorized To</th>
            <th>Create Time</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.fileId">
            <td>#{{ row.fileId }}</td>
            <td class="file-name-cell">
              <span class="mdi" :class="fileTypeIconMap[row.fileType]" :style="{ color: fileTypeColorMap[row.fileType] }" />
              <strong>{{ row.fileName }}</strong>
            </td>
            <td>{{ row.className || 'All' }}</td>
            <td>{{ row.fileSize }}</td>
            <td>
              <button type="button" class="link-button" @click="openAuthModal(row)">{{ row.authorizedTo }}</button>
            </td>
            <td>{{ formatTime(row.createTime) }}</td>
            <td class="file-table__actions">
              <button type="button" class="link-button" @click="openAuthModal(row)">授权</button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="7" class="empty-row">暂无文件记录</td>
          </tr>
        </tbody>
      </table>
    </section>

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
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
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

<style scoped lang="scss">
.file-page {
  display: grid;
  gap: 20px;
}

.page-header,
.toolbar-card {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.page-header {
  align-items: flex-start;
  justify-content: space-between;
}

.page-eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1,
.page-subtitle {
  margin: 0;
}

.page-subtitle {
  margin-top: 8px;
  color: #64748b;
}

.toolbar-card,
.table-card {
  border-radius: 24px;
  background: #fff;
  padding: 20px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.toolbar-card {
  align-items: center;
}

.toolbar-input,
.ghost-button,
.primary-button,
.link-button {
  border-radius: 14px;
  font: inherit;
}

.toolbar-input {
  min-width: 260px;
  border: 1px solid #cbd5e1;
  padding: 10px 12px;
}

.primary-button,
.ghost-button {
  border: none;
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 600;
}

.primary-button {
  background: #0f766e;
  color: #fff;
}

.ghost-button {
  background: #e2e8f0;
  color: #334155;
}

.file-table {
  width: 100%;
  border-collapse: collapse;
}

.file-table th,
.file-table td {
  padding: 14px 10px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: middle;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-name-cell .mdi {
  font-size: 22px;
}

.link-button {
  border: none;
  background: transparent;
  color: #0f766e;
  cursor: pointer;
  padding: 0;
}

.file-table__actions {
  display: inline-flex;
  gap: 12px;
}

.empty-row {
  text-align: center;
  color: #94a3b8;
}
</style>
