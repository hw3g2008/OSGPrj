<template>
  <section class="qbank-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">Resources</p>
        <h1>题库管理 Question Bank</h1>
        <p class="page-subtitle">组织和分发题库文件夹，支持授权和过期时间。</p>
      </div>
      <button type="button" class="primary-button" @click="openCreateModal">New Folder</button>
    </header>

    <section class="toolbar-card">
      <input v-model.trim="keyword" class="toolbar-input" type="search" placeholder="File Name">
      <button type="button" class="ghost-button" @click="loadRows">Search</button>
    </section>

    <section class="table-card">
      <table class="qbank-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Size</th>
            <th>Authorized To</th>
            <th>Expired</th>
            <th>Create Time</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.fileId">
            <td>#{{ row.fileId }}</td>
            <td class="qbank-name-cell">
              <span class="mdi mdi-folder" />
              <strong>{{ row.fileName }}</strong>
            </td>
            <td>{{ row.fileSize || '--' }}</td>
            <td>{{ row.authorizedTo || '全部用户' }}</td>
            <td>{{ row.expiryAt || '未设置' }}</td>
            <td>{{ formatTime(row.createTime) }}</td>
            <td>
              <button type="button" class="link-button" @click="openEditModal(row)">Edit + 授权</button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="7" class="empty-row">暂无题库文件夹</td>
          </tr>
        </tbody>
      </table>
    </section>

    <QbankFolderModal
      v-model="showModal"
      :mode="modalMode"
      :row="selectedRow"
      :submitting="submitting"
      @confirm="handleConfirm"
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import QbankFolderModal from './components/QbankFolderModal.vue'
import {
  createQbankFolder,
  getQbankList,
  updateQbankAuth,
  updateQbankExpiry,
  type QbankFolderRow
} from '@osg/shared/api/admin/qbank'

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

<style scoped lang="scss">
.qbank-page {
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
  color: #92400e;
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
  background: #92400e;
  color: #fff;
}

.ghost-button {
  background: #e2e8f0;
  color: #334155;
}

.qbank-table {
  width: 100%;
  border-collapse: collapse;
}

.qbank-table th,
.qbank-table td {
  padding: 14px 10px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: middle;
}

.qbank-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.qbank-name-cell .mdi {
  color: #f59e0b;
  font-size: 22px;
}

.link-button {
  border: none;
  background: transparent;
  color: #0f766e;
  padding: 0;
  cursor: pointer;
  font-weight: 600;
}

.empty-row {
  text-align: center;
  color: #64748b;
}

@media (max-width: 900px) {
  .table-card {
    overflow-x: auto;
  }
}
</style>
