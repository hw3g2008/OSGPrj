<template>
  <div class="main-shell">
    <AppSidebar
      :navigation-groups="navigationGroups"
      :display-name="displayName"
      :user-initials="userInitials"
      :role-label="roleLabel"
      :current-path="route.path"
      :logo-title="t('assistant.layout.appName')"
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
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { AppSidebar, type NavigationGroup } from '@osg/shared/components'
import { useIdleLogout } from '@osg/shared/composables'
import { clearAuth, getUser } from '@osg/shared/utils'

import '@mdi/font/css/materialdesignicons.css'

const { t } = useI18n()

const FALLBACK_NAME = t('assistant.layout.fallbackName')
const FALLBACK_ROLE = t('assistant.layout.fallbackRole')

const navigationGroups = computed<NavigationGroup[]>(() => [
  {
    title: t('assistant.layout.groups.career'),
    items: [
      {
        path: '/career/positions',
        label: t('assistant.layout.nav.positions'),
        iconClass: 'mdi-briefcase-search',
        activePaths: ['/career/positions'],
      },
      {
        path: '/career/job-overview',
        label: t('assistant.layout.nav.jobOverview'),
        iconClass: 'mdi-briefcase-eye',
        activePaths: ['/career/job-overview'],
      },
      {
        path: '/career/mock-practice',
        label: t('assistant.layout.nav.mockPractice'),
        iconClass: 'mdi-account-voice',
        activePaths: ['/career/mock-practice'],
      },
    ],
  },
  {
    title: t('assistant.layout.groups.students'),
    items: [
      {
        path: '/students',
        label: t('assistant.layout.nav.studentList'),
        iconClass: 'mdi-account-group',
        activePaths: ['/students'],
      },
      {
        path: '/communication',
        label: t('assistant.layout.nav.communication'),
        iconClass: 'mdi-message-text-clock',
        activePaths: ['/communication'],
        hidden: true,
      },
    ],
  },
  {
    title: t('assistant.layout.groups.teaching'),
    items: [
      {
        path: '/class-records',
        label: t('assistant.layout.nav.classRecords'),
        iconClass: 'mdi-book-open-variant',
        activePaths: ['/class-records'],
      },
    ],
  },
  {
    title: t('assistant.layout.groups.finance'),
    items: [
      {
        path: '/settlement',
        label: t('assistant.layout.nav.settlement'),
        iconClass: 'mdi-cash-clock',
        activePaths: ['/settlement'],
        hidden: true,
      },
      {
        path: '/expense',
        label: t('assistant.layout.nav.expense'),
        iconClass: 'mdi-receipt-text-clock',
        activePaths: ['/expense'],
        hidden: true,
      },
    ],
  },
  {
    title: t('assistant.layout.groups.resources'),
    items: [
      {
        path: '/files',
        label: t('assistant.layout.nav.files'),
        iconClass: 'mdi-folder-open',
        activePaths: ['/files'],
        hidden: true,
      },
      {
        path: '/online-test-bank',
        label: t('assistant.layout.nav.onlineTest'),
        iconClass: 'mdi-monitor-cellphone',
        activePaths: ['/online-test-bank'],
        hidden: true,
      },
      {
        path: '/interview-bank',
        label: t('assistant.layout.nav.interviewBank'),
        iconClass: 'mdi-account-tie-voice',
        activePaths: ['/interview-bank'],
        hidden: true,
      },
    ],
  },
  {
    title: t('assistant.layout.groups.profile'),
    items: [
      {
        path: '/profile',
        label: t('assistant.layout.nav.profile'),
        iconClass: 'mdi-account',
        activePaths: ['/profile'],
      },
      {
        path: '/schedule',
        label: t('assistant.layout.nav.schedule'),
        iconClass: 'mdi-calendar-clock',
        activePaths: ['/schedule'],
      },
      {
        path: '/notice',
        label: t('assistant.layout.nav.notice'),
        iconClass: 'mdi-bell-outline',
        activePaths: ['/notice'],
        hidden: true,
      },
      {
        path: '/faq',
        label: t('assistant.layout.nav.faq'),
        iconClass: 'mdi-help-circle-outline',
        activePaths: ['/faq'],
        hidden: true,
      },
    ],
  },
])

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
