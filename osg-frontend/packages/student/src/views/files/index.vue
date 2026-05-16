<template>
  <div id="page-files" class="files-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <h1 class="page-title">{{ t('student.files.k1') }} <span>Files</span></h1>
        </div>
      </template>

      <div class="toolbar">
        <a-input :placeholder="t('student.files.k2')" class="toolbar-input" />
        <a-select class="toolbar-select" :placeholder="t('student.files.k3')" :options="fileTypeOptions" />
      </div>

      <div class="table-shell">
        <a-table
          :columns="fileColumns"
          :data-source="fileItems"
          :pagination="false"
          :row-key="(record: any) => record.name"
          class="record-table"
        />
      </div>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()

const fileColumns = [
  { title: 'NAME', dataIndex: 'name', key: 'name' },
  { title: 'TYPE', dataIndex: 'type', key: 'type' },
  { title: 'SIZE', dataIndex: 'size', key: 'size' },
  { title: 'UPLOAD TIME', dataIndex: 'uploadedAt', key: 'uploadedAt' },
]

const fileTypeOptions = [
  { value: 'pdf', label: 'PDF' },
  { value: 'word', label: 'Word' },
  { value: 'folder', label: t('student.files.k4') }
]

const fileItems = [
  { name: 'Case Interview', type: t('student.files.k4'), size: t('student.files.k5'), uploadedAt: '12/01/2025' },
  { name: t('student.files.k6'), type: 'PDF', size: '2.5MB', uploadedAt: '12/05/2025' }
]
</script>

<style scoped lang="scss">
.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;

  span {
    color: #4f6b8a;
  }
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.toolbar-input {
  width: 220px;
}

.toolbar-select {
  width: 160px;
}

.table-shell {
  overflow-x: auto;
  border: 1px solid #dbe5f0;
  border-radius: 18px;
}

.record-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 14px 16px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
  }

  th {
    background: #f8fafc;
    color: #475569;
    font-size: 13px;
    font-weight: 700;
  }
}
</style>
