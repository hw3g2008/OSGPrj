<template>
  <div class="main-shell">
    <AppSidebar
      :navigation-groups="navigationGroups"
      :display-name="displayName"
      :user-initials="userInitials"
      :role-label="roleLabel"
      :current-path="route.path"
      logo-title="OSG Assistant"
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
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { AppSidebar, type NavigationGroup } from '@osg/shared/components'
import { useIdleLogout } from '@osg/shared/composables'
import { clearAuth, getUser } from '@osg/shared/utils'

import '@mdi/font/css/materialdesignicons.css'

const FALLBACK_NAME = 'Assistant User'
const FALLBACK_ROLE = 'Assistant'

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
    title: '学员中心 Students',
    items: [
      {
        path: '/students',
        label: '学员列表 Student List',
        iconClass: 'mdi-account-group',
        activePaths: ['/students'],
      },
      {
        path: '/communication',
        label: '人际关系沟通记录 Communication',
        iconClass: 'mdi-message-text-clock',
        activePaths: ['/communication'],
        hidden: true,
      },
    ],
  },
  {
    title: '教学中心 Teaching',
    items: [
      {
        path: '/class-records',
        label: '课程记录 Class Records',
        iconClass: 'mdi-book-open-variant',
        activePaths: ['/class-records'],
      },
    ],
  },
  {
    title: '财务中心 Finance',
    items: [
      {
        path: '/settlement',
        label: '课时结算 Settlement',
        iconClass: 'mdi-cash-clock',
        activePaths: ['/settlement'],
        hidden: true,
      },
      {
        path: '/expense',
        label: '报销管理 Expense',
        iconClass: 'mdi-receipt-text-clock',
        activePaths: ['/expense'],
        hidden: true,
      },
    ],
  },
  {
    title: '资源中心 Resources',
    items: [
      {
        path: '/files',
        label: '文件 Files',
        iconClass: 'mdi-folder-open',
        activePaths: ['/files'],
        hidden: true,
      },
      {
        path: '/online-test-bank',
        label: '在线测试题库 Online Test',
        iconClass: 'mdi-monitor-cellphone',
        activePaths: ['/online-test-bank'],
        hidden: true,
      },
      {
        path: '/interview-bank',
        label: '真人面试题库 Interview Bank',
        iconClass: 'mdi-account-tie-voice',
        activePaths: ['/interview-bank'],
        hidden: true,
      },
    ],
  },
  {
    title: '个人中心 Profile',
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
        iconClass: 'mdi-bell-outline',
        activePaths: ['/notice'],
        hidden: true,
      },
      {
        path: '/faq',
        label: '常见问题 FAQ',
        iconClass: 'mdi-help-circle-outline',
        activePaths: ['/faq'],
        hidden: true,
      },
    ],
  },
]

const route = useRoute()
const router = useRouter()

// 五端共享：无操作 60 分钟自动退出，活动节流 ping 续期
useIdleLogout()

const userInfo = computed(() =>
  getUser<{
    nickName?: string
    userName?: string
    roles?: Array<string | { roleName?: string; roleKey?: string }>
  }>(),
)

const displayName = computed(() => userInfo.value?.nickName || userInfo.value?.userName || FALLBACK_NAME)
const roleLabel = computed(() => {
  const firstRole = userInfo.value?.roles?.[0]
  if (!firstRole) {
    return FALLBACK_ROLE
  }

  if (typeof firstRole === 'string') {
    return firstRole.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  }

  const roleName = typeof firstRole.roleName === 'string' ? firstRole.roleName.trim() : ''
  if (roleName) {
    return roleName
  }

  const roleKey = typeof firstRole.roleKey === 'string' ? firstRole.roleKey : ''
  if (!roleKey) {
    return FALLBACK_ROLE
  }

  return roleKey.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
})

const userInitials = computed(() => {
  const source = (displayName.value || FALLBACK_NAME).trim()
  if (!source) {
    return 'AS'
  }

  const compact = source.replace(/\s+/g, '')
  return compact.slice(0, 2).toUpperCase()
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
  background: var(--bg);
  overflow-x: clip;
}

.main {
  flex: 1;
  min-width: 0;
  min-height: 100vh;
  margin-left: 260px;
  overflow-x: hidden;
  background: var(--bg);
  padding: 28px;
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
