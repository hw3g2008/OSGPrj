<template>
  <div class="osg-page">
    <PageHeader :title-zh="$t('question_bank_management')" title-en="Question Bank" :description="$t('organize_and_distribute_question_bank_fo')">
      <template #actions>
        <a-button type="primary" @click="openCreateModal">
          <template #icon><FolderAddOutlined /></template>
          {{ $t('new_folder') }}
        </a-button>
      </template>
    </PageHeader>

    <a-card :bordered="false">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="keyword" :placeholder="$t('search_file_name')" allow-clear style="width: 200px" @press-enter="loadRows" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadRows">
            <template #icon><SearchOutlined /></template>
            {{ $t('search') }}
          </a-button>
        </a-form-item>
      </a-form>

      <a-table :columns="qbankColumns" :data-source="rows" :row-key="(r: QbankFolderRow) => r.fileId" :pagination="false" :locale="{ emptyText: $t('no_question_bank_folders') }" :scroll="{ x: 800 }">
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
            {{ record.authorizedTo || $t('all_users') }}
          </template>
          <template v-else-if="column.dataIndex === 'expiryAt'">
            {{ record.expiryAt || $t('not_set') }}
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ formatTime(record.createTime) }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="openEditModal(record)">{{ $t('edit_authorize') }}</a-button>
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
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const qbankColumns = [
  { title: 'ID', dataIndex: 'fileId', key: 'fileId', width: 80, customRender: ({ text }: { text: number }) => `#${text}` },
  { title: t('name_2'), dataIndex: 'fileName', key: 'fileName', width: 200 },
  { title: t('size'), dataIndex: 'fileSize', key: 'fileSize', width: 100 },
  { title: t('authorized_target'), dataIndex: 'authorizedTo', key: 'authorizedTo', width: 120 },
  { title: t('expiration_date'), dataIndex: 'expiryAt', key: 'expiryAt', width: 130 },
  { title: t('created_at'), dataIndex: 'createTime', key: 'createTime', width: 140 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 100 },
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
    message.error(t('failed_to_load_question_bank_list'))
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
    message.success(modalMode.value === 'create' ? t('question_bank_folder_created_successfull') : t('question_bank_folder_updated'))
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
