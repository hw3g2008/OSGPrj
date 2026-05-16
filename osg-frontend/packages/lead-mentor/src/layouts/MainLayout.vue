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
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'

import { AppSidebar, type NavigationGroup } from '@osg/shared/components'
import { useIdleLogout } from '@osg/shared/composables'
import { clearAuth, getUser } from '@osg/shared/utils'

const FALLBACK_USER_NAME = 'Jess (Lead Mentor)'
const FALLBACK_USER_INITIALS = 'JL'

const AVAILABLE_NAVIGATION_PATHS = new Set([
  '/career/positions',
  '/career/job-overview',
  '/career/mock-practice',
  '/teaching/students',
  '/teaching/class-records',
  '/profile/basic',
  '/profile/schedule',
])

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

useIdleLogout()

const navigationGroups = computed<NavigationGroup[]>(() => [
  {
    title: t('leadMentor.layout.nav.career.title'),
    items: [
      {
        path: '/career/positions',
        label: t('leadMentor.layout.nav.career.positions'),
        iconClass: 'mdi-briefcase-search',
        activePaths: ['/career/positions'],
      },
      {
        path: '/career/job-overview',
        label: t('leadMentor.layout.nav.career.jobOverview'),
        iconClass: 'mdi-briefcase-eye',
        activePaths: ['/career/job-overview'],
      },
      {
        path: '/career/mock-practice',
        label: t('leadMentor.layout.nav.career.mockPractice'),
        iconClass: 'mdi-account-voice',
        activePaths: ['/career/mock-practice'],
      },
    ],
  },
  {
    title: t('leadMentor.layout.nav.studentCenter.title'),
    items: [
      {
        path: '/teaching/students',
        label: t('leadMentor.layout.nav.studentCenter.studentList'),
        iconClass: 'mdi-account-group',
        activePaths: ['/teaching/students'],
      },
    ],
  },
  {
    title: t('leadMentor.layout.nav.teaching.title'),
    items: [
      {
        path: '/teaching/class-records',
        label: t('leadMentor.layout.nav.teaching.classRecords'),
        iconClass: 'mdi-book-open-variant',
        activePaths: ['/teaching/class-records'],
      },
      {
        path: '/teaching/communication',
        label: t('leadMentor.layout.nav.teaching.communicationRecords'),
        iconClass: 'mdi-message-text-clock',
        activePaths: ['/teaching/communication'],
        hidden: true,
      },
    ],
  },
  {
    title: t('leadMentor.layout.nav.finance.title'),
    items: [
      {
        path: '/finance/settlement',
        label: t('leadMentor.layout.nav.finance.settlement'),
        iconClass: 'mdi-cash-check',
        activePaths: ['/finance/settlement'],
        hidden: true,
      },
      {
        path: '/finance/expense',
        label: t('leadMentor.layout.nav.finance.expense'),
        iconClass: 'mdi-receipt',
        activePaths: ['/finance/expense'],
        hidden: true,
      },
    ],
  },
  {
    title: t('leadMentor.layout.nav.resources.title'),
    items: [
      {
        path: '/resources/files',
        label: t('leadMentor.layout.nav.resources.files'),
        iconClass: 'mdi-folder-multiple',
        activePaths: ['/resources/files'],
        hidden: true,
      },
      {
        path: '/resources/online-tests',
        label: t('leadMentor.layout.nav.resources.onlineTests'),
        iconClass: 'mdi-clipboard-list',
        activePaths: ['/resources/online-tests'],
        hidden: true,
      },
      {
        path: '/resources/interview-bank',
        label: t('leadMentor.layout.nav.resources.interviewBank'),
        iconClass: 'mdi-account-question',
        activePaths: ['/resources/interview-bank'],
        hidden: true,
      },
    ],
  },
  {
    title: t('leadMentor.layout.nav.profile.title'),
    items: [
      {
        path: '/profile/basic',
        label: t('leadMentor.layout.nav.profile.basic'),
        iconClass: 'mdi-account',
        activePaths: ['/profile/basic', '/profile'],
      },
      {
        path: '/profile/schedule',
        label: t('leadMentor.layout.nav.profile.schedule'),
        iconClass: 'mdi-calendar-clock',
        activePaths: ['/profile/schedule', '/schedule'],
      },
      {
        path: '/profile/notice',
        label: t('leadMentor.layout.nav.profile.notice'),
        iconClass: 'mdi-bell',
        activePaths: ['/profile/notice'],
        hidden: true,
      },
      {
        path: '/profile/faq',
        label: t('leadMentor.layout.nav.profile.faq'),
        iconClass: 'mdi-help-circle',
        activePaths: ['/profile/faq'],
        hidden: true,
      },
    ],
  },
])

const userInfo = computed(() => getUser<{ nickName?: string; userName?: string }>())
const displayName = computed(
  () => userInfo.value?.nickName || userInfo.value?.userName || FALLBACK_USER_NAME,
)
const roleLabel = computed(() => t('leadMentor.layout.roleLabel'))
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

const showUpcomingToast = () => {
  message.info(t('leadMentor.layout.comingSoon'))
}
provide('showUpcomingToast', showUpcomingToast)

function handleNavClick(path: string) {
  if (AVAILABLE_NAVIGATION_PATHS.has(path)) {
    if (path !== route.path) void router.push(path)
    return
  }
  message.info(t('leadMentor.layout.comingSoon'))
}

function handleProfileClick() {
  message.info(t('leadMentor.layout.comingSoon'))
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
