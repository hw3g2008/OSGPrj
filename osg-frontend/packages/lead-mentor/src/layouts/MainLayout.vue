<template>
  <div class="main-shell">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon"><i class="mdi mdi-account-star" aria-hidden="true" /></div>
          <span class="logo-text">OSG Lead Mentor</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <a
          href="#"
          class="nav-item"
          :class="{ active: isActive(['/home', '/dashboard']) }"
          @click.prevent="showUpcomingToast()"
        >
          <i class="mdi mdi-home" aria-hidden="true" />
          <span>首页 Home</span>
        </a>

        <template v-for="group in navigationGroups" :key="group.title">
          <div class="nav-section">{{ group.title }}</div>
          <a
            v-for="item in group.items"
            :key="item.label"
            href="#"
            class="nav-item"
            :class="{ active: isActive(item.activePaths) }"
            @click.prevent="handleUpcomingNavigation(item.path)"
          >
            <i class="mdi" :class="item.iconClass" aria-hidden="true"></i>
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
            <p>点击展开</p>
          </div>
        </button>

        <div v-if="showUserMenu" class="user-menu">
          <a class="user-menu-item" @click="handleSettingsClick">
            <i class="mdi mdi-cog" aria-hidden="true" /> 个人设置
          </a>
          <a class="user-menu-item user-menu-item--danger" @click="handleLogout">
            <i class="mdi mdi-logout" aria-hidden="true" /> 退出登录
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
import { computed, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { clearAuth, getUser } from '@osg/shared/utils'

interface NavigationItem {
  label: string
  iconClass: string
  path: string
  activePaths: string[]
  badge?: number
}

interface NavigationGroup {
  title: string
  items: NavigationItem[]
}

const FALLBACK_USER_NAME = 'Jess (Lead Mentor)'
const FALLBACK_USER_INITIALS = 'JL'
const AVAILABLE_NAVIGATION_PATHS = new Set(['/career/positions'])

const route = useRoute()
const router = useRouter()
const showUserMenu = ref(false)

const navigationGroups: NavigationGroup[] = [
  {
    title: '求职中心 Career',
    items: [
      {
        path: '/career/positions',
        label: '岗位信息 Positions',
        iconClass: 'mdi-briefcase-search',
        activePaths: ['/career/positions']
      },
      {
        path: '/career/job-overview',
        label: '学员求职总览 Job Overview',
        iconClass: 'mdi-briefcase-eye',
        activePaths: ['/career/job-overview'],
        badge: 1
      },
      {
        path: '/career/mock-practice',
        label: '模拟应聘管理 Mock Practice',
        iconClass: 'mdi-account-voice',
        activePaths: ['/career/mock-practice'],
        badge: 2
      }
    ]
  },
  {
    title: '教学中心 Teaching',
    items: [
      {
        path: '/teaching/students',
        label: '学员列表 Student List',
        iconClass: 'mdi-account-group',
        activePaths: ['/teaching/students']
      },
      {
        path: '/teaching/class-records',
        label: '课程记录 Class Records',
        iconClass: 'mdi-book-open-variant',
        activePaths: ['/teaching/class-records']
      },
      {
        path: '/teaching/communication',
        label: '人际关系沟通记录 Records',
        iconClass: 'mdi-message-text-clock',
        activePaths: ['/teaching/communication']
      }
    ]
  },
  {
    title: '财务中心 Finance',
    items: [
      {
        path: '/finance/settlement',
        label: '课时结算 Settlement',
        iconClass: 'mdi-cash-check',
        activePaths: ['/finance/settlement']
      },
      {
        path: '/finance/expense',
        label: '报销管理 Expense',
        iconClass: 'mdi-receipt',
        activePaths: ['/finance/expense']
      }
    ]
  },
  {
    title: '资源中心 Resources',
    items: [
      {
        path: '/resources/files',
        label: '文件 Files',
        iconClass: 'mdi-folder-multiple',
        activePaths: ['/resources/files']
      },
      {
        path: '/resources/online-tests',
        label: '在线测试题库 Online Tests',
        iconClass: 'mdi-clipboard-list',
        activePaths: ['/resources/online-tests']
      },
      {
        path: '/resources/interview-bank',
        label: '真人面试题库 Interview Bank',
        iconClass: 'mdi-account-question',
        activePaths: ['/resources/interview-bank']
      }
    ]
  },
  {
    title: '个人中心 Profile',
    items: [
      {
        path: '/profile/basic',
        label: '基本信息 Profile',
        iconClass: 'mdi-account',
        activePaths: ['/profile/basic', '/profile']
      },
      {
        path: '/profile/schedule',
        label: '课程排期 Schedule',
        iconClass: 'mdi-calendar-clock',
        activePaths: ['/profile/schedule', '/schedule']
      },
      {
        path: '/profile/notice',
        label: '消息 Notice',
        iconClass: 'mdi-bell',
        activePaths: ['/profile/notice']
      },
      {
        path: '/profile/faq',
        label: '常见问题 FAQ',
        iconClass: 'mdi-help-circle',
        activePaths: ['/profile/faq']
      }
    ]
  }
]

const currentPath = computed(() => route.path)
const userInfo = computed(() => getUser<{ nickName?: string; userName?: string }>())
const displayName = computed(() => userInfo.value?.nickName || userInfo.value?.userName || FALLBACK_USER_NAME)
const userInitials = computed(() => {
  const name = displayName.value.trim()
  if (!name || name === FALLBACK_USER_NAME) {
    return FALLBACK_USER_INITIALS
  }

  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('')
})

const isActive = (paths: string[]) => paths.some((path) => currentPath.value === path || currentPath.value.startsWith(`${path}/`))

const showUpcomingToast = () => {
  showUserMenu.value = false
  message.info('敬请期待')
}

provide('showUpcomingToast', showUpcomingToast)

const handleUpcomingNavigation = (_path: string) => {
  showUserMenu.value = false
  if (AVAILABLE_NAVIGATION_PATHS.has(_path)) {
    if (_path !== currentPath.value) {
      void router.push(_path)
    }
    return
  }

  message.info('敬请期待')
}

const handleSettingsClick = () => {
  showUserMenu.value = false
  message.info('敬请期待')
}

const handleLogout = () => {
  showUserMenu.value = false
  if (window.confirm('确定要退出登录吗？')) {
    clearAuth()
    router.push('/login')
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
  --card-shadow: 0 4px 24px rgba(115, 153, 198, 0.12);

  display: flex;
  min-height: 100vh;
  background: var(--bg);
  overflow-x: clip;
}

.sidebar {
  width: 260px;
  background: #fff;
  border-right: 1px solid var(--border);
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
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
  width: 40px;
  height: 40px;
  background: var(--primary-gradient);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  background: var(--primary-gradient);
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
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  margin: 2px 12px;
  border-radius: 10px;
  color: var(--text2);
  font-size: 14px;
  text-decoration: none;
  user-select: none;
  cursor: pointer;
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
  font-size: 20px;
  width: 24px;
  text-align: center;
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
  padding: 16px;
  border-top: 1px solid var(--border);
  position: relative;
}

.user-card {
  width: 100%;
  border: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: var(--primary-light);
  text-align: left;
  cursor: pointer;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-gradient);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
}

.user-info h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.user-info p {
  font-size: 12px;
  color: var(--muted);
}

.user-menu {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 78px;
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
  cursor: pointer;
}

.user-menu-item:hover {
  background: var(--bg);
}

.user-menu-item--danger {
  color: #ef4444;
  border-top: 1px solid var(--border);
}

.main {
  flex: 1;
  margin-left: 260px;
  min-height: 100vh;
  padding: 28px;
  background: var(--bg);
}

@media (max-width: 1100px) {
  .sidebar {
    position: sticky;
  }
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
