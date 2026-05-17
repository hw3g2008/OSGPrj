<template>
  <div class="main-shell">
    <aside class="sidebar" data-testid="main-sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon">
            <span class="mdi mdi-shield-crown" aria-hidden="true" />
          </div>
          <span class="logo-text">OSG Admin</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <!-- v1: 首页入口暂时隐藏，二期恢复 -->
        <button
          v-show="false"
          type="button"
          class="nav-item"
          :class="{ active: isActive('/dashboard') }"
          @click="navigate('/dashboard')"
        >
          <span class="mdi mdi-home" aria-hidden="true" />
          <span>{{ t('admin.layout.home') }}</span>
        </button>

        <template v-for="group in filteredMenuGroups" :key="group.key">
          <div class="nav-section">{{ group.title }}</div>
          <button
            v-for="item in group.children"
            :key="item.path"
            type="button"
            class="nav-item"
            :class="{ active: !item.comingSoon && isActive(item.path) }"
            @click="item.comingSoon ? message.info(t('admin.layout.comingSoon')) : navigate(item.path)"
          >
            <span class="mdi" :class="item.iconClass" aria-hidden="true" />
            <OsgEllipsisText :text="item.title" class="nav-item__label" />
            <span v-if="false" class="nav-badge">{{ item.badge }}</span>
          </button>
        </template>
      </nav>

      <div ref="footerMenuRef" class="sidebar-footer">
        <button
          type="button"
          class="user-card__profile-entry"
          data-surface-trigger="modal-setting"
          @click="openProfileSettings"
        >
          {{ t('admin.layout.personalSettings') }}
        </button>
        <button type="button" class="user-card" @click="toggleUserMenu">
          <div class="user-avatar">{{ userInitials }}</div>
          <div class="user-info">
            <h4>{{ displayName }}</h4>
            <p>{{ t('admin.layout.clickToExpand') }}</p>
          </div>
        </button>
        <div v-if="showUserMenu" class="user-menu" role="menu" :aria-label="t('admin.layout.userMenu')">
          <button
            type="button"
            class="user-menu-item"
            data-surface-trigger="modal-setting"
            @click="openProfileSettings"
          >
            {{ t('admin.layout.personalSettings') }}
          </button>
          <button type="button" class="user-menu-item danger" @click="handleLogout">
            {{ t('admin.layout.logout') }}
          </button>
        </div>
      </div>
    </aside>

    <div class="main-panel">
      <main
        class="content"
        :class="{ 'content--dashboard': route.path === '/dashboard' }"
      >
        <router-view />
      </main>
    </div>

    <ProfileModal
      v-model:visible="showProfileModal"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { i18n } from '@osg/shared'
import { useIdleLogout } from '@osg/shared/composables'
import { OsgEllipsisText } from '@osg/shared/components'
import { useUserStore } from '@/stores/user'
import ProfileModal from '@/components/ProfileModal.vue'

const t = (key: string) => (i18n.global.t as unknown as (k: string) => string)(key)

// 五端共享：无操作 60 分钟自动退出，活动节流 ping 续期
useIdleLogout()

const userStore = useUserStore()
const vueRouter = useRouter()
const route = useRoute()

interface MenuItemDef {
  path: string
  i18nKey: string
  permission?: string
  iconClass: string
  badge?: number
  comingSoon?: boolean
}

interface MenuGroupDef {
  key: string
  i18nKey: string
  children: MenuItemDef[]
}

interface MenuItem {
  path: string
  title: string
  permission?: string
  iconClass: string
  badge?: number
  comingSoon?: boolean
}

interface MenuGroup {
  key: string
  title: string
  children: MenuItem[]
}

const showProfileModal = ref(false)
const showUserMenu = ref(false)
const footerMenuRef = ref<HTMLElement | null>(null)

const menuGroupDefs: MenuGroupDef[] = [
  {
    key: 'permission',
    i18nKey: 'admin.layout.sections.permission',
    children: [
      { path: '/permission/menu', i18nKey: 'admin.layout.menus.menuManagement', permission: 'system:menu:list', iconClass: 'mdi-file-tree' },
      { path: '/permission/roles', i18nKey: 'admin.layout.menus.permissionConfig', permission: 'system:role:list', iconClass: 'mdi-key' },
      { path: '/permission/users', i18nKey: 'admin.layout.menus.adminUserManagement', permission: 'system:user:list', iconClass: 'mdi-shield-account' },
      { path: '/permission/dicts', i18nKey: 'admin.layout.menus.dictManagement', permission: 'system:dict:list', iconClass: 'mdi-database-cog' },
    ],
  },
  {
    key: 'user-center',
    i18nKey: 'admin.layout.sections.userCenter',
    children: [
      { path: '/users/students', i18nKey: 'admin.layout.menus.studentList', permission: 'admin:students:list', iconClass: 'mdi-account-school', badge: 2 },
      { path: '/users/contracts', i18nKey: 'admin.layout.menus.contractManagement', permission: 'admin:contracts:list', iconClass: 'mdi-file-sign' },
      { path: '/users/staff', i18nKey: 'admin.layout.menus.mentorList', permission: 'admin:staff:list', iconClass: 'mdi-account-tie' },
      { path: '/users/mentor-schedule', i18nKey: 'admin.layout.menus.mentorScheduleManagement', permission: 'admin:mentor-schedule:list', iconClass: 'mdi-calendar-clock' },
      { path: '/users/mentor-change-review', i18nKey: 'admin.layout.menus.mentorChangeReview', permission: 'admin:mentor-change-review:list', iconClass: 'mdi-account-edit-outline' },
    ],
  },
  {
    key: 'career',
    i18nKey: 'admin.layout.sections.career',
    children: [
      { path: '/career/positions', i18nKey: 'admin.layout.menus.positionInfo', permission: 'admin:positions:list', iconClass: 'mdi-briefcase-search' },
      { path: '/career/student-positions', i18nKey: 'admin.layout.menus.studentSelfAddedPositions', permission: 'admin:student-positions:list', iconClass: 'mdi-briefcase-plus', badge: 3 },
      { path: '/career/job-overview', i18nKey: 'admin.layout.menus.studentJobOverview', permission: 'admin:job-overview:list', iconClass: 'mdi-briefcase-eye', badge: 8 },
      { path: '/career/mock-practice', i18nKey: 'admin.layout.menus.mockPracticeManagement', permission: 'admin:mock-practice:list', iconClass: 'mdi-account-voice', badge: 3 },
    ],
  },
  {
    key: 'teaching',
    i18nKey: 'admin.layout.sections.teaching',
    children: [
      { path: '/teaching/class-records', i18nKey: 'admin.layout.menus.classRecords', permission: 'admin:class-records:list', iconClass: 'mdi-book-open-variant' },
      { path: '/teaching/communication', i18nKey: 'admin.layout.menus.communicationRecords', permission: 'admin:communication:list', iconClass: 'mdi-message-text-clock', comingSoon: true },
    ],
  },
  {
    key: 'finance',
    i18nKey: 'admin.layout.sections.finance',
    children: [
      { path: '/finance/settlement', i18nKey: 'admin.layout.menus.hourSettlement', permission: 'finance:settlement:list', iconClass: 'mdi-cash-check', comingSoon: true },
      { path: '/finance/expense', i18nKey: 'admin.layout.menus.expenseManagement', permission: 'finance:expense:list', iconClass: 'mdi-receipt', comingSoon: true },
    ],
  },
  {
    key: 'resource',
    i18nKey: 'admin.layout.sections.resource',
    children: [
      { path: '/resource/files', i18nKey: 'admin.layout.menus.files', permission: 'resource:file:list', iconClass: 'mdi-folder', comingSoon: true },
      { path: '/resource/online-test-bank', i18nKey: 'admin.layout.menus.onlineTestBank', permission: 'resource:onlineTestBank:list', iconClass: 'mdi-monitor-cellphone', badge: 5, comingSoon: true },
      { path: '/resource/interview-bank', i18nKey: 'admin.layout.menus.interviewBank', permission: 'resource:interviewBank:list', iconClass: 'mdi-account-tie-voice', badge: 3, comingSoon: true },
      { path: '/resource/questions', i18nKey: 'admin.layout.menus.interviewQuestions', permission: 'resource:question:list', iconClass: 'mdi-file-document-edit', badge: 5, comingSoon: true },
    ],
  },
  {
    key: 'profile',
    i18nKey: 'admin.layout.sections.profile',
    children: [
      { path: '/profile/mailjob', i18nKey: 'admin.layout.menus.email', permission: 'profile:mailjob:list', iconClass: 'mdi-email-outline', comingSoon: true },
      { path: '/profile/notice', i18nKey: 'admin.layout.menus.messageManagement', permission: 'profile:notice:list', iconClass: 'mdi-bell', comingSoon: true },
      { path: '/profile/complaints', i18nKey: 'admin.layout.menus.complaints', permission: 'profile:complaint:list', iconClass: 'mdi-message-alert', comingSoon: true },
      { path: '/profile/logs', i18nKey: 'admin.layout.menus.operationLogs', permission: 'admin:logs:list', iconClass: 'mdi-history' },
    ],
  },
]

const menuGroups = computed<MenuGroup[]>(() =>
  menuGroupDefs.map((g) => ({
    key: g.key,
    title: t(g.i18nKey),
    children: g.children.map((c) => ({
      path: c.path,
      title: t(c.i18nKey),
      permission: c.permission,
      iconClass: c.iconClass,
      badge: c.badge,
      comingSoon: c.comingSoon,
    })),
  })),
)

const filteredMenuGroups = computed(() => {
  const perms = userStore.permissions
  const isAdmin = perms.includes('*:*:*')

  return menuGroups.value
    .map((group) => ({
      ...group,
      children: group.children.filter((item) => {
        if (item.comingSoon) return false
        if (isAdmin) return true
        return !item.permission || perms.includes(item.permission)
      }),
    }))
    .filter((group) => group.children.length > 0)
})

const displayName = computed(() => userStore.userInfo?.nickName || userStore.userInfo?.userName || t('admin.layout.superAdmin'))
const userInitials = computed(() => {
  if (userStore.permissions.includes('*:*:*')) return 'SA'
  const name = displayName.value.trim()
  if (!name) return 'SA'
  return name.slice(0, 2).toUpperCase()
})

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(`${path}/`)
}

const navigate = (path: string) => {
  if (route.path !== path) {
    vueRouter.push(path)
  }
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const openProfileSettings = () => {
  showUserMenu.value = false
  showProfileModal.value = true
}

const handleLogout = () => {
  showUserMenu.value = false
  Modal.confirm({
    title: t('admin.layout.confirmLogout'),
    content: t('admin.layout.confirmLogoutContent'),
    okText: t('admin.layout.confirm'),
    cancelText: t('admin.layout.cancel'),
    async onOk() {
      await userStore.logout()
      message.success(t('admin.layout.loggedOut'))
      vueRouter.push('/login')
    },
  })
}

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node | null
  if (!target) return
  if (footerMenuRef.value?.contains(target)) return
  showUserMenu.value = false
}

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  if (!userStore.userInfo) {
    await userStore.fetchInfo()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped lang="scss">
.main-shell {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
}

.sidebar {
  width: 260px;
  height: 100vh;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  position: fixed;
  left: 0;
  top: 0;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.logo-icon .mdi {
  font-size: 20px;
  line-height: 1;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

.nav-section {
  padding: 16px 20px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}

.nav-item {
  width: calc(100% - 24px);
  margin: 2px 12px;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.nav-item .mdi {
  width: 24px;
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.nav-item__label {
  flex: 1;
  min-width: 0;
}

.nav-item:hover {
  background: #f8fafc;
  color: #6366f1;
}

.nav-item.active {
  background: #eef2ff;
  color: #6366f1;
  font-weight: 600;
}

.nav-badge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  line-height: 18px;
  text-align: center;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e2e8f0;
  position: relative;
}

.user-card__profile-entry {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  margin: 0 0 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #6366f1;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  cursor: pointer;
}

.user-card {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: #eef2ff;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  text-align: left;
}

.user-menu {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: calc(100% + 8px);
  padding: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 30;
}

.user-menu-item {
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.user-menu-item:hover {
  background: #f8fafc;
  color: #4f46e5;
}

.user-menu-item.danger {
  color: #dc2626;
}

.user-menu-item.danger:hover {
  background: #fef2f2;
  color: #b91c1c;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  flex-shrink: 0;
}

.user-info h4 {
  margin: 0;
  color: #1e293b;
  font-size: 14px;
  font-weight: 600;
}

.user-info p {
  margin: 2px 0 0;
  color: #94a3b8;
  font-size: 12px;
}

.main-panel {
  min-width: 0;
  flex: 1;
  margin-left: 260px;
  overflow-y: auto;
  height: 100vh;
}

.content {
  padding: 20px 24px 24px;

  &.content--dashboard {
    padding: 28px;
  }
}
</style>
