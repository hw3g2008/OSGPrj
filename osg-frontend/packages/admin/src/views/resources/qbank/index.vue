<template>
  <div class="osg-page">
    <PageHeader :title-zh="t('admin.resources.qbank.pageTitle')" title-en="Question Bank">
      <template #actions>
        <a-button type="primary" @click="openCreateModal">
          <template #icon><FolderAddOutlined /></template>
          {{ t('admin.resources.qbank.createFolder') }}
        </a-button>
      </template>
    </PageHeader>

    <a-card :bordered="false">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="keyword" :placeholder="t('admin.resources.qbank.searchPlaceholder')" allow-clear style="width: 200px" @press-enter="loadRows" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadRows">
            <template #icon><SearchOutlined /></template>
            {{ t('admin.resources.qbank.search') }}
          </a-button>
        </a-form-item>
      </a-form>

      <a-table :columns="qbankColumns" :data-source="rows" :row-key="(r: QbankFolderRow) => r.fileId" :pagination="false" :locale="{ emptyText: t('admin.resources.qbank.empty') }" :scroll="{ x: 800 }">
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
            {{ record.authorizedTo || t('admin.resources.qbank.allUsers') }}
          </template>
          <template v-else-if="column.dataIndex === 'expiryAt'">
            {{ record.expiryAt || t('admin.resources.qbank.notSet') }}
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ formatTime(record.createTime) }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="openEditModal(record)">{{ t('admin.resources.qbank.action.editAuth') }}</a-button>
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
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n()

const qbankColumns = computed(() => [
  { title: 'ID', dataIndex: 'fileId', key: 'fileId', width: 80, customRender: ({ text }: { text: number }) => `#${text}`, fixed: 'left' as const },
  { title: t('admin.resources.qbank.columns.name'), dataIndex: 'fileName', key: 'fileName', width: 200 },
  { title: t('admin.resources.qbank.columns.size'), dataIndex: 'fileSize', key: 'fileSize', width: 100 },
  { title: t('admin.resources.qbank.columns.authorizedTo'), dataIndex: 'authorizedTo', key: 'authorizedTo', width: 120 },
  { title: t('admin.resources.qbank.columns.expiryAt'), dataIndex: 'expiryAt', key: 'expiryAt', width: 130 },
  { title: t('admin.resources.qbank.columns.createTime'), dataIndex: 'createTime', key: 'createTime', width: 140 },
  { title: t('admin.resources.qbank.columns.action'), dataIndex: 'action', key: 'action', width: 100, fixed: 'right' as const },
])

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
    message.success(modalMode.value === 'create' ? t('admin.resources.qbank.messages.createSuccess') : t('admin.resources.qbank.messages.updateSuccess'))
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
