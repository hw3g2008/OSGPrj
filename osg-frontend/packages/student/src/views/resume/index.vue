<template>
  <div id="page-resume" class="resume-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">我的简历 <span>My Resume</span></h1>
            <p class="page-sub">管理您的简历版本，支持 PDF、Word 格式</p>
          </div>
          <a-button type="primary" size="large" @click="triggerUpload">上传新简历</a-button>
          <input
            ref="uploadInput"
            type="file"
            accept=".pdf,.doc,.docx"
            class="hidden-input"
            @change="handleUpload"
          />
        </div>
      </template>

      <div class="summary-grid">
        <section class="summary-card student-card">
          <div class="summary-head">我上传的简历</div>
          <div class="summary-body">
            <div class="file-item current">
              <div class="file-meta">
                <strong>Resume_TestStudent_v1.pdf</strong>
                <span>12/01/2025 · 2.1MB · 当前版本</span>
              </div>
              <div class="file-actions">
                <a-button size="small" @click="openPreview(studentResume)">预览</a-button>
                <a-button size="small">下载</a-button>
              </div>
            </div>
            <a-button block class="dashed-button" @click="triggerUpload">点击上传新版本</a-button>
          </div>
        </section>

        <section class="summary-card mentor-card">
          <div class="summary-head">导师修改版本</div>
          <div class="summary-body">
            <div class="file-item mentor">
              <div class="file-meta">
                <strong>Resume_TestStudent_v3_final.pdf</strong>
                <span>12/10/2025 · 2.3MB · 由 Mentor Jess 修改</span>
              </div>
              <div class="file-actions">
                <a-button size="small" @click="openPreview(mentorResume)">预览</a-button>
                <a-button size="small">下载</a-button>
              </div>
            </div>
            <div class="mentor-tip">建议使用导师修改后的版本投递简历</div>
          </div>
        </section>
      </div>

      <section class="version-card">
        <div class="version-head">
          <span>简历版本 Resume Versions</span>
          <span class="version-count">共 4 个版本</span>
        </div>
        <div class="table-shell">
          <table class="record-table">
            <thead>
              <tr>
                <th>版本</th>
                <th>文件名</th>
                <th>来源</th>
                <th>更新时间</th>
                <th>大小</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in resumeVersions" :key="item.fileName">
                <td>{{ item.version }}</td>
                <td>{{ item.fileName }}</td>
                <td>{{ item.source }}</td>
                <td>{{ item.updatedAt }}</td>
                <td>{{ item.size }}</td>
                <td>
                  <a-button type="link" size="small" @click="openPreview(item)">预览</a-button>
                  <a-button type="link" size="small">下载</a-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </OsgPageContainer>

    <a-modal v-model:open="previewOpen" title="简历预览" :footer="null" width="760px">
      <div v-if="activePreview" class="preview-shell">
        <div class="preview-title">{{ activePreview.fileName }}</div>
        <div class="preview-meta">{{ activePreview.updatedAt }} · {{ activePreview.size }} · {{ activePreview.source }}</div>
        <div class="preview-paper">
          <h3>Resume Preview</h3>
          <p>Emily Zhang</p>
          <p>Finance · NYU · 2025</p>
          <p>本页为静态原型还原，用于展示 student 端简历预览壳层。</p>
        </div>
      </div>

      <div class="dialog-actions">
        <a-button @click="previewOpen = false">关闭</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { OsgPageContainer } from '@osg/shared/components'

type ResumeVersion = {
  version: string
  fileName: string
  source: string
  updatedAt: string
  size: string
}

const studentResume: ResumeVersion = {
  version: '当前',
  fileName: 'Resume_TestStudent_v1.pdf',
  source: '学生上传',
  updatedAt: '12/01/2025 14:30',
  size: '2.1MB'
}

const mentorResume: ResumeVersion = {
  version: '导师版',
  fileName: 'Resume_TestStudent_v3_final.pdf',
  source: 'Mentor Jess',
  updatedAt: '12/10/2025 16:20',
  size: '2.3MB'
}

const resumeVersions: ResumeVersion[] = [
  studentResume,
  mentorResume,
  {
    version: 'v2',
    fileName: 'Resume_TestStudent_v2.pdf',
    source: '学生上传',
    updatedAt: '11/25/2025 10:15',
    size: '2.0MB'
  },
  {
    version: 'v1',
    fileName: 'Resume_TestStudent_v1_original.pdf',
    source: '学生上传',
    updatedAt: '11/20/2025 09:00',
    size: '1.8MB'
  }
]

const uploadInput = ref<HTMLInputElement | null>(null)
const previewOpen = ref(false)
const activePreview = ref<ResumeVersion | null>(null)

const triggerUpload = () => {
  uploadInput.value?.click()
}

const handleUpload = () => {
  message.success('简历上传成功！新版本将显示在列表中。')
  if (uploadInput.value) {
    uploadInput.value.value = ''
  }
}

const openPreview = (item: ResumeVersion) => {
  activePreview.value = item
  previewOpen.value = true
}
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;

  span {
    color: #4f6b8a;
  }
}

.page-sub {
  margin: 10px 0 0;
  color: #64748b;
}

.hidden-input {
  display: none;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.summary-card,
.version-card {
  border: 1px solid #dbe5f0;
  border-radius: 20px;
  background: #fff;
}

.summary-head,
.version-head {
  padding: 16px 20px;
  font-size: 17px;
  font-weight: 700;
}

.student-card .summary-head {
  background: linear-gradient(135deg, #7399c6, #5a7ba3);
  color: #fff;
  border-radius: 20px 20px 0 0;
}

.mentor-card .summary-head {
  background: linear-gradient(135deg, #9bb8d9, #7399c6);
  color: #fff;
  border-radius: 20px 20px 0 0;
}

.summary-body {
  padding: 20px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 12px;
}

.current {
  background: #f0fdf4;
  border: 2px solid #22c55e;
}

.mentor {
  background: #e8f0f8;
  border: 2px solid #7399c6;
}

.file-meta {
  display: grid;
  gap: 4px;

  span {
    font-size: 12px;
    color: #64748b;
  }
}

.file-actions {
  display: grid;
  gap: 8px;
}

.dashed-button {
  border-style: dashed;
}

.mentor-tip {
  border-radius: 10px;
  background: #fefce8;
  color: #854d0e;
  padding: 12px 14px;
  font-size: 13px;
}

.version-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.version-count {
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
}

.table-shell {
  overflow-x: auto;
}

.record-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 14px 18px;
    border-top: 1px solid #e2e8f0;
    text-align: left;
  }

  th {
    background: #f8fafc;
    color: #475569;
    font-size: 13px;
    font-weight: 700;
  }
}

.preview-shell {
  display: grid;
  gap: 12px;
}

.preview-title {
  font-size: 18px;
  font-weight: 700;
}

.preview-meta {
  color: #64748b;
  font-size: 13px;
}

.preview-paper {
  border-radius: 18px;
  border: 1px solid #dbe5f0;
  background: #f8fafc;
  padding: 24px;
  min-height: 320px;

  h3 {
    margin-top: 0;
  }

  p {
    color: #475569;
  }
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>
