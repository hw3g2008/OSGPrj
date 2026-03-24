<template>
  <div class="main-shell">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon">
            <i class="mdi mdi-account-star" aria-hidden="true" />
          </div>
          <span class="logo-text">OSG Assistant</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <a
          href="#"
          class="nav-item"
          :class="{ active: isActive(['/home']) }"
          @click.prevent="navigate('/home')"
        >
          <i class="mdi mdi-home" aria-hidden="true" />
          <span>首页 Home</span>
        </a>

        <template v-for="group in navigationGroups" :key="group.title">
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
            <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
          </a>
        </template>
      </nav>

      <div class="sidebar-footer">
        <button type="button" class="user-card" @click="showUserMenu = !showUserMenu">
          <div class="user-avatar">{{ userInitials }}</div>
          <div class="user-info">
            <h4>{{ displayName }}</h4>
            <p>{{ roleLabel }}</p>
          </div>
        </button>

        <div v-if="showUserMenu" class="user-menu">
          <a class="user-menu-item" @click="openProfile">
            <i class="mdi mdi-account-cog" aria-hidden="true" />
            个人设置 Profile
          </a>
          <a class="user-menu-item user-menu-item--danger" @click="handleLogout">
            <i class="mdi mdi-logout" aria-hidden="true" />
            退出登录 Logout
          </a>
        </div>
      </div>
    </aside>

    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { clearAuth, getUser } from '@osg/shared/utils'

import '@mdi/font/css/materialdesignicons.css'

interface NavigationItem {
  path: string
  label: string
  iconClass: string
  activePaths: string[]
  badge?: number
}

interface NavigationGroup {
  title: string
  items: NavigationItem[]
}

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
        badge: 1,
      },
      {
        path: '/career/mock-practice',
        label: '模拟应聘管理 Mock Practice',
        iconClass: 'mdi-account-voice',
        activePaths: ['/career/mock-practice'],
        badge: 2,
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
      },
      {
        path: '/expense',
        label: '报销管理 Expense',
        iconClass: 'mdi-receipt-text-clock',
        activePaths: ['/expense'],
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
      },
      {
        path: '/online-test-bank',
        label: '在线测试题库 Online Test',
        iconClass: 'mdi-monitor-cellphone',
        activePaths: ['/online-test-bank'],
      },
      {
        path: '/interview-bank',
        label: '真人面试题库 Interview Bank',
        iconClass: 'mdi-account-tie-voice',
        activePaths: ['/interview-bank'],
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
        badge: 2,
      },
      {
        path: '/faq',
        label: '常见问题 FAQ',
        iconClass: 'mdi-help-circle-outline',
        activePaths: ['/faq'],
      },
    ],
  },
]

const route = useRoute()
const router = useRouter()
const showUserMenu = ref(false)

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

function isActive(paths: string[]) {
  return paths.some((path) => route.path === path || route.path.startsWith(`${path}/`))
}

function navigate(path: string) {
  showUserMenu.value = false
  if (route.path === path) {
    return
  }
  void router.push(path)
}

function openProfile() {
  navigate('/profile')
}

function handleLogout() {
  showUserMenu.value = false
  if (window.confirm('确定要退出登录吗？')) {
    clearAuth()
    void router.push('/login')
  }
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

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 20;
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
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 12px;
  text-align: left;
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

@media (max-width: 900px) {
  .main-shell {
    display: block;
  }

  .sidebar {
    position: static;
    width: 100%;
    height: auto;
  }

  .main {
    margin-left: 0;
    padding: 20px;
  }
}
</style>
