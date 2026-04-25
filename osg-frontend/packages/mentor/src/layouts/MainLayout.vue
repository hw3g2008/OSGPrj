<template>
  <div class="main-shell">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon">
            <i class="mdi mdi-account-tie" aria-hidden="true" />
          </div>
          <span class="logo-text">OSG Mentor</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <!-- v1: 首页入口暂时隐藏，二期恢复 -->
        <a
          v-show="false"
          href="#"
          class="nav-item"
          :class="{ active: isActive(['/dashboard']) }"
          @click.prevent="navigate('/dashboard')"
        >
          <i class="mdi mdi-home" aria-hidden="true" />
          <span>首页 Home</span>
        </a>

        <template v-for="group in filteredNavigationGroups" :key="group.title">
          <div class="nav-section">{{ group.title }}</div>
          <a
            v-for="item in group.items"
            :key="item.path"
            href="#"
            class="nav-item"
            :class="{ active: isActive(item.activePaths) }"
            @click.prevent="navigate(item.path)"
          >
            <i class="mdi" :class="item.iconClass" aria-hidden="true" />
            <span>{{ item.label }}</span>
            <!-- v1: 角标暂时隐藏，二期恢复改回 v-if="item.badge" -->
            <span v-if="false" class="nav-badge">{{ item.badge }}</span>
          </a>
        </template>
      </nav>

      <div class="sidebar-footer">
        <button type="button" class="user-card" @click="showUserMenu = !showUserMenu">
          <div class="user-avatar">{{ userInitials }}</div>
          <div class="user-info">
            <h4>{{ userName }}</h4>
            <p>点击展开</p>
          </div>
        </button>

        <div v-if="showUserMenu" class="user-menu">
          <a class="user-menu-item" @click="openProfile">
            <i class="mdi mdi-cog" aria-hidden="true" />
            个人设置
          </a>
          <a class="user-menu-item user-menu-item--danger" @click="handleLogout">
            <i class="mdi mdi-logout" aria-hidden="true" />
            退出登录
          </a>
        </div>
      </div>
    </aside>

    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, ref, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { http } from '@osg/shared/utils/request'
import { clearAuth, getUser } from '@osg/shared/utils'

interface NavigationItem {
  path: string
  label: string
  iconClass: string
  activePaths: string[]
  badge?: number
  hidden?: boolean
}

interface NavigationGroup {
  title: string
  items: NavigationItem[]
}

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
const showUserMenu = ref(false)
const jobBadge = ref(0)
const mockBadge = ref(0)

const userInfo = computed(() => getUser<{ nickName?: string; userName?: string }>())
const userName = computed(() => userInfo.value?.nickName || userInfo.value?.userName || FALLBACK_NAME)
const userInitials = computed(() => {
  const source = (userName.value || FALLBACK_NAME).trim()
  if (!source) return 'ME'
  const compact = source.replace(/\s+/g, '')
  return compact.slice(0, 2).toUpperCase()
})

// 动态 badge 通过 computed 依赖 jobBadge.value / mockBadge.value，
// 响应式自动生效（badge 刷新后 navigationGroups 会重新计算）
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

const filteredNavigationGroups = computed(() =>
  navigationGroups.value
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.hidden) }))
    .filter((group) => group.items.length > 0)
)

function isActive(paths: string[]) {
  return paths.some((path) => route.path === path || route.path.startsWith(`${path}/`))
}

function navigate(path: string) {
  showUserMenu.value = false
  if (route.path === path) return
  void router.push(path)
}

function openProfile() {
  navigate('/profile')
}

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

function handleLogout() {
  if (window.confirm('确定要退出登录吗？')) {
    clearAuth()
    void router.push('/login')
  }
  showUserMenu.value = false
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

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  width: 260px;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: #fff;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--primary-gradient);
  color: #fff;
  font-size: 20px;
}

.logo-text {
  background: var(--primary-gradient);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 18px;
  font-weight: 700;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

.nav-section {
  padding: 16px 20px 8px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 2px 12px;
  border-radius: 10px;
  padding: 12px 20px;
  color: var(--text2);
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
  user-select: none;
}

.nav-item:hover {
  background: var(--bg);
  color: var(--primary);
}

.nav-item.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 600;
}

.nav-item .mdi {
  width: 24px;
  text-align: center;
  font-size: 20px;
}

.nav-badge {
  margin-left: auto;
  min-width: 18px;
  padding: 2px 6px;
  border-radius: 10px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
}

.sidebar-footer {
  position: relative;
  padding: 16px;
  border-top: 1px solid var(--border);
}

.user-card {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  border: 0;
  border-radius: 12px;
  background: var(--primary-light);
  padding: 12px;
  text-align: left;
  cursor: pointer;
  outline: none;
  font: inherit;
  color: inherit;
}

.user-card:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.user-avatar {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--primary-gradient);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.user-info h4 {
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
}

.user-info p {
  color: var(--muted);
  font-size: 12px;
}

.user-menu {
  position: absolute;
  right: 16px;
  bottom: 78px;
  left: 16px;
  overflow: hidden;
  z-index: 100;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
}

.user-menu-item:hover {
  background: var(--bg);
}

.user-menu-item--danger {
  border-top: 1px solid var(--border);
  color: #ef4444;
}

.main {
  flex: 1;
  min-height: 100vh;
  margin-left: 260px;
  background: var(--bg);
  padding: 28px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
}
</style>
