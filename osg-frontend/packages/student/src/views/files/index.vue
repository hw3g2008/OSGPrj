<template>
  <div id="page-files" class="files-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <h1 class="page-title">文件 <span>Files</span></h1>
        </div>
      </template>

      <div class="toolbar">
        <a-input placeholder="搜索文件名..." class="toolbar-input" />
        <a-select class="toolbar-select" placeholder="类型" :options="fileTypeOptions" />
      </div>

      <div class="table-shell">
        <table class="record-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>TYPE</th>
              <th>SIZE</th>
              <th>UPLOAD TIME</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in fileItems" :key="item.name">
              <td>{{ item.name }}</td>
              <td>{{ item.type }}</td>
              <td>{{ item.size }}</td>
              <td>{{ item.uploadedAt }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { OsgPageContainer } from '@osg/shared/components'

const fileTypeOptions = [
  { value: 'pdf', label: 'PDF' },
  { value: 'word', label: 'Word' },
  { value: 'folder', label: '文件夹' }
]

const fileItems = [
  { name: 'Case Interview', type: '文件夹', size: '8项', uploadedAt: '12/01/2025' },
  { name: '咨询行业概览.pdf', type: 'PDF', size: '2.5MB', uploadedAt: '12/05/2025' }
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
