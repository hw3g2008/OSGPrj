<template>
  <div class="main-shell">
    <AppSidebar
      :navigation-groups="navigationGroups"
      :display-name="displayName"
      :user-initials="userInitials"
      :role-label="roleLabel"
      :current-path="route.path"
      logo-title="OSG Mentor"
      @nav="handleNavClick"
      @profile-click="handleProfileClick"
      @logout="handleLogout"
    />

    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, ref, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { AppSidebar, type NavigationGroup } from '@osg/shared/components'
import { useIdleLogout } from '@osg/shared/composables'
import { http } from '@osg/shared/utils/request'
import { clearAuth, getUser } from '@osg/shared/utils'

const MENTOR_NAV_BADGE_KEY = Symbol.for('mentor-nav-badges')

type MentorNavBadgeState = {
  jobBadge: Ref<number>
  mockBadge: Ref<number>
  refreshJobBadge: () => Promise<void>
  refreshMockBadge: () => Promise<void>
}

const FALLBACK_NAME = 'Mentor'

const route = useRoute()
const router = useRouter()

// 五端共享：无操作 60 分钟自动退出，活动节流 ping 续期
useIdleLogout()

const jobBadge = ref(0)
const mockBadge = ref(0)

const userInfo = computed(() => getUser<{ nickName?: string; userName?: string }>())
const displayName = computed(
  () => userInfo.value?.nickName || userInfo.value?.userName || FALLBACK_NAME,
)
const userInitials = computed(() => {
  const source = (displayName.value || FALLBACK_NAME).trim()
  if (!source) return 'ME'
  const compact = source.replace(/\s+/g, '')
  return compact.slice(0, 2).toUpperCase()
})
const roleLabel = computed(() => '导师')

// 动态 badge 通过 computed 依赖 jobBadge.value / mockBadge.value，
// 响应式自动生效（badge 刷新后 navigationGroups 会重新计算）。
// AppSidebar 内部按 badge > 0 渲染（hasBadge），因此 0 / undefined 自然不显示。
const navigationGroups = computed<NavigationGroup[]>(() => [
  {
    title: '教学中心 TEACHING',
    items: [
      {
        path: '/courses',
        label: '课程记录 Class Records',
        iconClass: 'mdi-book-open-variant',
        activePaths: ['/courses'],
      },
      {
        path: '/communication',
        label: '人际关系沟通记录 Records',
        iconClass: 'mdi-message-text-clock',
        activePaths: ['/communication'],
        hidden: true,
      },
    ],
  },
  {
    title: '求职中心 JOB CENTER',
    items: [
      {
        path: '/job-overview',
        label: '学员求职总览 Job Overview',
        iconClass: 'mdi-briefcase-search',
        activePaths: ['/job-overview'],
        badge: jobBadge.value > 0 ? jobBadge.value : undefined,
      },
      {
        path: '/mock-practice',
        label: '模拟应聘管理 Mock Practice',
        iconClass: 'mdi-account-voice',
        activePaths: ['/mock-practice'],
        badge: mockBadge.value > 0 ? mockBadge.value : undefined,
      },
    ],
  },
  {
    title: '财务中心 FINANCE',
    items: [
      {
        path: '/settlement',
        label: '课时结算 Settlement',
        iconClass: 'mdi-cash-check',
        activePaths: ['/settlement'],
        hidden: true,
      },
      {
        path: '/expense',
        label: '报销管理 Expense',
        iconClass: 'mdi-receipt',
        activePaths: ['/expense'],
        hidden: true,
      },
    ],
  },
  {
    title: '个人中心 PROFILE',
    items: [
      {
        path: '/profile',
        label: '基本信息 Profile',
        iconClass: 'mdi-account',
        activePaths: ['/profile'],
      },
      {
        path: '/schedule',
        label: '课程排期 Schedule',
        iconClass: 'mdi-calendar-clock',
        activePaths: ['/schedule'],
      },
      {
        path: '/notice',
        label: '消息 Notice',
        iconClass: 'mdi-bell',
        activePaths: ['/notice'],
        hidden: true,
      },
      {
        path: '/faq',
        label: '常见问题 FAQ',
        iconClass: 'mdi-help-circle',
        activePaths: ['/faq'],
        hidden: true,
      },
    ],
  },
])

async function refreshJobBadge() {
  try {
    const res = await http.get('/api/mentor/job-overview/list')
    const rows = Array.isArray((res as any)?.rows) ? (res as any).rows : []
    jobBadge.value = rows.filter((row: Record<string, any>) => row.coachingStatus === 'new').length
  } catch {
    jobBadge.value = 0
  }
}

async function refreshMockBadge() {
  try {
    const res = await http.get('/api/mentor/mock-practice/list')
    const rows = Array.isArray((res as any)?.rows) ? (res as any).rows : []
    mockBadge.value = rows.filter((row: Record<string, any>) => row.status === 'new').length
  } catch {
    mockBadge.value = 0
  }
}

provide<MentorNavBadgeState>(MENTOR_NAV_BADGE_KEY, {
  jobBadge,
  mockBadge,
  refreshJobBadge,
  refreshMockBadge,
})

function handleNavClick(path: string) {
  if (route.path === path) return
  void router.push(path)
}

function handleProfileClick() {
  void router.push('/profile')
}

function handleLogout() {
  clearAuth()
  void router.push('/login')
}

onMounted(() => {
  void refreshJobBadge()
  void refreshMockBadge()
})
</script>

<style scoped lang="scss">
.main-shell {
  --primary: #7399c6;
  --primary-light: #e8f0f8;
  --primary-gradient: linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%);
  --text: #1e293b;
  --text2: #64748b;
  --muted: #94a3b8;
  --border: #e2e8f0;
  --bg: #f8fafc;

  display: flex;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.main {
  flex: 1;
  min-height: 100vh;
  margin-left: 260px;
  background: var(--bg);
  padding: 28px;
}

</style>
