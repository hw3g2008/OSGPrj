<template>
  <div class="main-shell">
    <AppSidebar
      :navigation-groups="navigationGroups"
      :display-name="displayName"
      :user-initials="userInitials"
      :role-label="roleLabel"
      :current-path="route.path"
      logo-title="OSG Lead Mentor"
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
import { computed, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

import { AppSidebar, type NavigationGroup } from '@osg/shared/components'
import { useIdleLogout } from '@osg/shared/composables'
import { clearAuth, getUser } from '@osg/shared/utils'

const FALLBACK_USER_NAME = 'Jess (Lead Mentor)'
const FALLBACK_USER_INITIALS = 'JL'
const FALLBACK_ROLE = '培训主管'

const AVAILABLE_NAVIGATION_PATHS = new Set([
  '/career/positions',
  '/career/job-overview',
  '/career/mock-practice',
  '/teaching/students',
  '/teaching/class-records',
  '/profile/basic',
  '/profile/schedule',
])

const route = useRoute()
const router = useRouter()

// 五端共享：无操作 60 分钟自动退出，活动节流 ping 续期
useIdleLogout()

const navigationGroups: NavigationGroup[] = [
  {
    title: '求职中心 Career',
    items: [
      {
        path: '/career/positions',
        label: '岗位信息 Positions',
        iconClass: 'mdi-briefcase-search',
        activePaths: ['/career/positions'],
      },
      {
        path: '/career/job-overview',
        label: '学员求职总览 Job Overview',
        iconClass: 'mdi-briefcase-eye',
        activePaths: ['/career/job-overview'],
      },
      {
        path: '/career/mock-practice',
        label: '模拟应聘管理 Mock Practice',
        iconClass: 'mdi-account-voice',
        activePaths: ['/career/mock-practice'],
      },
    ],
  },
  {
    title: '学员中心 Student Center',
    items: [
      {
        path: '/teaching/students',
        label: '学员列表 Student List',
        iconClass: 'mdi-account-group',
        activePaths: ['/teaching/students'],
      },
    ],
  },
  {
    title: '教学中心 Teaching',
    items: [
      {
        path: '/teaching/class-records',
        label: '课程记录 Class Records',
        iconClass: 'mdi-book-open-variant',
        activePaths: ['/teaching/class-records'],
      },
      {
        path: '/teaching/communication',
        label: '人际关系沟通记录 Records',
        iconClass: 'mdi-message-text-clock',
        activePaths: ['/teaching/communication'],
        hidden: true,
      },
    ],
  },
  {
    title: '财务中心 Finance',
    items: [
      {
        path: '/finance/settlement',
        label: '课时结算 Settlement',
        iconClass: 'mdi-cash-check',
        activePaths: ['/finance/settlement'],
        hidden: true,
      },
      {
        path: '/finance/expense',
        label: '报销管理 Expense',
        iconClass: 'mdi-receipt',
        activePaths: ['/finance/expense'],
        hidden: true,
      },
    ],
  },
  {
    title: '资源中心 Resources',
    items: [
      {
        path: '/resources/files',
        label: '文件 Files',
        iconClass: 'mdi-folder-multiple',
        activePaths: ['/resources/files'],
        hidden: true,
      },
      {
        path: '/resources/online-tests',
        label: '在线测试题库 Online Tests',
        iconClass: 'mdi-clipboard-list',
        activePaths: ['/resources/online-tests'],
        hidden: true,
      },
      {
        path: '/resources/interview-bank',
        label: '真人面试题库 Interview Bank',
        iconClass: 'mdi-account-question',
        activePaths: ['/resources/interview-bank'],
        hidden: true,
      },
    ],
  },
  {
    title: '个人中心 Profile',
    items: [
      {
        path: '/profile/basic',
        label: '基本信息 Profile',
        iconClass: 'mdi-account',
        activePaths: ['/profile/basic', '/profile'],
      },
      {
        path: '/profile/schedule',
        label: '课程排期 Schedule',
        iconClass: 'mdi-calendar-clock',
        activePaths: ['/profile/schedule', '/schedule'],
      },
      {
        path: '/profile/notice',
        label: '消息 Notice',
        iconClass: 'mdi-bell',
        activePaths: ['/profile/notice'],
        hidden: true,
      },
      {
        path: '/profile/faq',
        label: '常见问题 FAQ',
        iconClass: 'mdi-help-circle',
        activePaths: ['/profile/faq'],
        hidden: true,
      },
    ],
  },
]

const userInfo = computed(() => getUser<{ nickName?: string; userName?: string }>())
const displayName = computed(
  () => userInfo.value?.nickName || userInfo.value?.userName || FALLBACK_USER_NAME,
)
const roleLabel = computed(() => FALLBACK_ROLE)
const userInitials = computed(() => {
  const name = displayName.value.trim()
  if (!name || name === FALLBACK_USER_NAME) {
    return FALLBACK_USER_INITIALS
  }

  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
})

// LM 端特有：子视图通过 inject 复用统一的"敬请期待" toast
const showUpcomingToast = () => {
  message.info('敬请期待')
}
provide('showUpcomingToast', showUpcomingToast)

function handleNavClick(path: string) {
  if (AVAILABLE_NAVIGATION_PATHS.has(path)) {
    if (path !== route.path) void router.push(path)
    return
  }
  // 未在白名单的路径统一走"敬请期待" toast（保留 LM 拦截语义）
  message.info('敬请期待')
}

function handleProfileClick() {
  // LM 个人设置本期未实现，统一走"敬请期待" toast（沿用旧 handleSettingsClick 意图）
  message.info('敬请期待')
}

function handleLogout() {
  clearAuth()
  void router.push('/login')
}
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
  --card-shadow: 0 4px 24px rgba(115, 153, 198, 0.12);

  display: flex;
  min-height: 100vh;
  background: var(--bg);
  overflow-x: clip;
}

.main {
  flex: 1;
  min-width: 0;
  margin-left: 260px;
  min-height: 100vh;
  padding: 28px;
  overflow-x: hidden;
  background: var(--bg);
}

@media (max-width: 900px) {
  .main-shell {
    display: block;
  }

  .main {
    margin-left: 0;
    padding: 20px;
  }
}
</style>
