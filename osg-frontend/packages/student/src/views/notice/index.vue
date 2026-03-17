<template>
  <div id="page-notice" class="notice-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">消息中心 <span>Notifications</span></h1>
            <p class="page-sub">查看系统通知、课程提醒和导师消息</p>
          </div>
          <a-button @click="markAllRead">全部已读</a-button>
        </div>
      </template>

      <div class="stat-grid">
        <button class="stat-card" type="button" @click="activeFilter = 'all'">
          <strong>12</strong>
          <span>全部消息</span>
        </button>
        <button class="stat-card" type="button" @click="activeFilter = 'unread'">
          <strong>5</strong>
          <span>未读消息</span>
        </button>
        <button class="stat-card" type="button" @click="activeFilter = 'course'">
          <strong>4</strong>
          <span>课程通知</span>
        </button>
        <button class="stat-card" type="button" @click="activeFilter = 'system'">
          <strong>3</strong>
          <span>系统通知</span>
        </button>
      </div>

      <section class="notice-shell">
        <div class="notice-head">
          <span>消息列表</span>
          <a-select class="notice-filter" :value="activeFilter" :options="filterOptions" @change="activeFilter = $event" />
        </div>

        <button
          v-for="item in filteredNotices"
          :key="item.title"
          type="button"
          class="notice-item"
          @click="openNotice(item)"
        >
          <div class="notice-main">
            <div class="notice-title-row">
              <strong>{{ item.title }}</strong>
              <a-tag v-if="!item.read" color="error">未读</a-tag>
              <a-tag>{{ item.category }}</a-tag>
            </div>
            <p>{{ item.summary }}</p>
            <span>{{ item.time }}</span>
          </div>
        </button>
      </section>
    </OsgPageContainer>

    <a-modal v-model:open="detailOpen" title="消息详情" :footer="null" width="620px">
      <div v-if="activeNotice" class="detail-stack">
        <div class="detail-banner">
          <div class="detail-title">{{ activeNotice.title }}</div>
          <div class="detail-meta">{{ activeNotice.time }} · {{ activeNotice.category }}</div>
        </div>
        <div class="detail-box">{{ activeNotice.detail }}</div>
      </div>

      <div class="dialog-actions">
        <a-button @click="detailOpen = false">关闭</a-button>
        <a-button type="primary" @click="goToMockPractice">查看详情</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { OsgPageContainer } from '@osg/shared/components'

type NoticeItem = {
  title: string
  category: string
  summary: string
  detail: string
  time: string
  read: boolean
  filter: 'course' | 'system'
}

const router = useRouter()
const notices = ref<NoticeItem[]>([
  {
    title: '模拟面试已安排',
    category: '课程通知',
    summary: '您申请的模拟面试已安排，导师：Jerry Li，时间：01/18/2026 14:00',
    detail: '您申请的模拟面试已安排成功，详情如下：分配导师 Jerry Li，预约时间 2026-01-18 14:00，模拟内容 Goldman Sachs IB 二面。',
    time: '10分钟前',
    read: false,
    filter: 'course'
  },
  {
    title: '导师反馈已提交',
    category: '课程通知',
    summary: '王导师已提交您的期中考试反馈，评分：4分（良好），点击查看详情',
    detail: '导师反馈已经同步到课程反馈页面，请及时查看并安排 follow-up 复盘。',
    time: '2小时前',
    read: false,
    filter: 'course'
  },
  {
    title: '合同即将到期提醒',
    category: '系统通知',
    summary: '您的服务合同将于 30 天后到期，如需续签请联系班主任。',
    detail: '合同将在 02/17/2026 到期，如需续签请提前联系班主任安排后续流程。',
    time: '昨天 10:00',
    read: false,
    filter: 'system'
  },
  {
    title: '欢迎加入OSG',
    category: '系统通知',
    summary: '您的账号已激活，班主任 Test Lead Mentor 将为您提供服务。',
    detail: '欢迎加入 OSG Student。请先完成个人信息检查，并查看首页快捷操作。',
    time: '01/10/2026',
    read: true,
    filter: 'system'
  }
])

const filterOptions = [
  { value: 'all', label: '全部类型' },
  { value: 'course', label: '课程通知' },
  { value: 'system', label: '系统通知' },
  { value: 'unread', label: '未读消息' }
]

const activeFilter = ref<'all' | 'course' | 'system' | 'unread'>('all')
const detailOpen = ref(false)
const activeNotice = ref<NoticeItem | null>(null)

const filteredNotices = computed(() => {
  if (activeFilter.value === 'all') {
    return notices.value
  }
  if (activeFilter.value === 'unread') {
    return notices.value.filter((item) => !item.read)
  }
  return notices.value.filter((item) => item.filter === activeFilter.value)
})

const openNotice = (item: NoticeItem) => {
  item.read = true
  activeNotice.value = item
  detailOpen.value = true
}

const markAllRead = () => {
  notices.value = notices.value.map((item) => ({ ...item, read: true }))
}

const goToMockPractice = () => {
  detailOpen.value = false
  router.push('/mock-practice')
}
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
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

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  border: 1px solid #dbe5f0;
  border-radius: 18px;
  background: #fff;
  padding: 18px;
  text-align: center;
  cursor: pointer;

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

.notice-shell {
  border: 1px solid #dbe5f0;
  border-radius: 20px;
  overflow: hidden;
}

.notice-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 16px 20px;
  font-size: 17px;
  font-weight: 700;
}

.notice-filter {
  width: 140px;
}

.notice-item {
  width: 100%;
  border: 0;
  border-top: 1px solid #e2e8f0;
  background: #fff;
  text-align: left;
  padding: 18px 20px;
  cursor: pointer;
}

.notice-main {
  display: grid;
  gap: 8px;

  p {
    margin: 0;
    color: #475569;
  }

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.notice-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-stack {
  display: grid;
  gap: 16px;
}

.detail-banner,
.detail-box {
  border-radius: 16px;
  background: #f8fafc;
  padding: 16px 18px;
}

.detail-title {
  font-size: 18px;
  font-weight: 700;
}

.detail-meta {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
}

.detail-box {
  line-height: 1.8;
  color: #334155;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
