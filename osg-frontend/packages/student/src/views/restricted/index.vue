<template>
  <div class="restricted-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">受限模式 <span>Restricted Mode</span></h1>
          </div>
        </div>
      </template>

      <div class="status-banner">
        <div>
          <h3>账号状态受限</h3>
          <p>您的账号当前处于冻结状态，仅可查看课时管理相关功能。如有疑问请联系您的班主任。</p>
        </div>
      </div>

      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="home" tab="首页" />
        <a-tab-pane key="myclass" tab="我的课程" />
        <a-tab-pane key="feedback" tab="课程反馈" />
      </a-tabs>

      <template v-if="activeTab === 'home'">
        <div class="stat-grid">
          <div class="stat-card"><strong>15.5h</strong><span>剩余课时</span></div>
          <div class="stat-card"><strong>24.5h</strong><span>已使用课时</span></div>
          <div class="stat-card"><strong>40h</strong><span>合同总课时</span></div>
        </div>

        <section class="panel">
          <div class="panel-title">最近课程记录</div>
          <div class="table-shell">
            <a-table
              :columns="homeColumns"
              :data-source="restrictedHomeRows"
              :pagination="false"
              :row-key="(record: any) => record.date + record.courseType"
              class="record-table"
            />
          </div>
        </section>

        <section class="contact-card">
          <div>
            <h4>联系班主任</h4>
            <p>如需恢复账号或有其他问题，请联系班主任</p>
          </div>
          <a-button type="primary">发送消息</a-button>
        </section>
      </template>

      <template v-else-if="activeTab === 'myclass'">
        <section class="panel">
          <div class="panel-title">我的课程</div>
          <div class="table-shell">
            <a-table
              :columns="classColumns"
              :data-source="restrictedClassRows"
              :pagination="false"
              :row-key="(record: any) => record.date + record.time"
              class="record-table"
            />
          </div>
        </section>
      </template>

      <template v-else>
        <section class="panel">
          <div class="panel-title">课程反馈</div>
          <div class="table-shell">
            <a-table
              :columns="feedbackColumns"
              :data-source="restrictedFeedbackRows"
              :pagination="false"
              :row-key="(record: any) => record.date + record.courseType"
              class="record-table"
            >
              <template #bodyCell="{ column }">
                <template v-if="column.key === 'action'">
                  <a-button type="link" size="small">查看详情</a-button>
                </template>
              </template>
            </a-table>
          </div>
        </section>
      </template>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'

const activeTab = ref<'home' | 'myclass' | 'feedback'>('home')

const homeColumns = [
  { title: '日期', dataIndex: 'date', key: 'date' },
  { title: '课程类型', dataIndex: 'courseType', key: 'courseType' },
  { title: '导师', dataIndex: 'mentor', key: 'mentor' },
  { title: '时长', dataIndex: 'duration', key: 'duration' },
  { title: '状态', dataIndex: 'status', key: 'status' },
]

const classColumns = [
  { title: '日期', dataIndex: 'date', key: 'date' },
  { title: '时间', dataIndex: 'time', key: 'time' },
  { title: '课程类型', dataIndex: 'courseType', key: 'courseType' },
  { title: '导师', dataIndex: 'mentor', key: 'mentor' },
  { title: '时长', dataIndex: 'duration', key: 'duration' },
  { title: '状态', dataIndex: 'status', key: 'status' },
]

const feedbackColumns = [
  { title: '日期', dataIndex: 'date', key: 'date' },
  { title: '课程类型', dataIndex: 'courseType', key: 'courseType' },
  { title: '导师', dataIndex: 'mentor', key: 'mentor' },
  { title: '评价', dataIndex: 'rating', key: 'rating' },
  { title: '操作', key: 'action' },
]

const restrictedHomeRows = [
  { date: '2025-12-15', courseType: '面试测试', mentor: 'Jerry Li', duration: '1.5h', status: '已完成' },
  { date: '2025-12-10', courseType: '简历修改', mentor: 'Test Lead Mentor', duration: '1h', status: '已完成' },
  { date: '2025-12-05', courseType: 'Case Study', mentor: 'Jerry Li', duration: '2h', status: '已完成' }
]

const restrictedClassRows = [
  { date: '2025-12-15', time: '14:00-15:30', courseType: '面试测试', mentor: 'Jerry Li', duration: '1.5h', status: '已完成' },
  { date: '2025-12-10', time: '10:00-11:00', courseType: '简历修改', mentor: 'Test Lead Mentor', duration: '1h', status: '已完成' },
  { date: '2025-12-05', time: '15:00-17:00', courseType: 'Case Study', mentor: 'Jerry Li', duration: '2h', status: '已完成' }
]

const restrictedFeedbackRows = [
  { date: '2025-12-15', courseType: '面试测试', mentor: 'Jerry Li', rating: 'Great' },
  { date: '2025-12-10', courseType: '简历修改', mentor: 'Test Lead Mentor', rating: 'Great' },
  { date: '2025-12-05', courseType: 'Case Study', mentor: 'Jerry Li', rating: 'Good' }
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

.page-sub {
  margin: 10px 0 0;
  color: #64748b;
}

.status-banner {
  border-radius: 20px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  padding: 22px 24px;
  margin-bottom: 20px;

  h3 {
    margin: 0 0 8px;
    color: #92400e;
  }

  p {
    margin: 0;
    color: #78350f;
  }
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 18px;
  background: #f8fafc;
  padding: 18px;
  text-align: center;

  strong {
    display: block;
    font-size: 32px;
    color: #2563eb;
  }

  span {
    color: #64748b;
    font-size: 13px;
  }
}

.panel {
  border: 1px solid #dbe5f0;
  border-radius: 20px;
  background: #fff;
  overflow: hidden;
  margin-bottom: 20px;
}

.panel-title {
  padding: 16px 20px;
  font-size: 17px;
  font-weight: 700;
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

.contact-card {
  border: 1px solid #dbe5f0;
  border-radius: 20px;
  background: #fff;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;

  h4 {
    margin: 0 0 6px;
  }

  p {
    margin: 0;
    color: #64748b;
  }
}
</style>
