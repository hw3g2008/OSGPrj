<template>
  <div class="main-shell">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon">
            <i class="mdi mdi-school" aria-hidden="true"></i>
          </div>
          <span class="logo-text">OSG Student</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <a
          href="#"
          class="nav-item"
          :class="{ active: isActive(['/dashboard', '/home']) }"
          @click.prevent="navigate('/home')"
        >
          <i class="mdi mdi-home" aria-hidden="true"></i>
          <span>首页 Home</span>
        </a>

        <template v-for="group in menuGroups" :key="group.title">
          <div class="nav-section">{{ group.title }}</div>
          <a
            v-for="item in group.items"
            :key="item.path"
            href="#"
            class="nav-item"
            :class="{ active: isActive(item.activePaths) }"
            @click.prevent="navigate(item.path)"
          >
            <i class="mdi" :class="item.iconClass" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
            <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
          </a>
        </template>
      </nav>

      <div class="sidebar-footer">
        <button type="button" class="user-card" @click="handleLogout">
          <div class="user-avatar">{{ userInitials }}</div>
          <div class="user-info">
            <h4>{{ displayName }}</h4>
            <p>点击退出登录</p>
          </div>
        </button>
      </div>
    </aside>

    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { logout } from '@osg/shared/api'
import { clearAuth, getUser } from '@osg/shared/utils'

const route = useRoute()
const router = useRouter()

interface MenuEntry {
  path: string
  label: string
  iconClass: string
  activePaths: string[]
  badge?: number
}

interface MenuGroup {
  title: string
  items: MenuEntry[]
}

const userInfo = computed(() => getUser())
const displayName = computed(() => userInfo.value?.nickName || 'Test Student')
const userInitials = computed(() => {
  const name = displayName.value.trim()
  if (!name) {
    return 'TS'
  }
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('')
})

const menuGroups: MenuGroup[] = [
  {
    title: '求职中心 Career',
    items: [
      {
        path: '/positions',
        label: '岗位信息 Positions',
        iconClass: 'mdi-briefcase-search',
        activePaths: ['/positions', '/career']
      },
      {
        path: '/job-tracking',
        label: '我的求职 My Applications',
        iconClass: 'mdi-briefcase-clock',
        activePaths: ['/applications', '/job-tracking']
      },
      {
        path: '/mock-practice',
        label: '模拟应聘 Mock Practice',
        iconClass: 'mdi-account-voice',
        activePaths: ['/mock-practice', '/request']
      }
    ]
  },
  {
    title: '学习中心 Learning',
    items: [
      {
        path: '/myclass',
        label: '我的课程 Class Records',
        iconClass: 'mdi-book-open-variant',
        activePaths: ['/courses', '/myclass']
      },
      {
        path: '/communication',
        label: '人际关系沟通记录 Records',
        iconClass: 'mdi-message-text-clock',
        activePaths: ['/communication']
      },
      {
        path: '/ai-interview',
        label: 'AI面试分析 AI Interview',
        iconClass: 'mdi-robot-outline',
        activePaths: ['/ai-interview']
      }
    ]
  },
  {
    title: '简历中心 Resume',
    items: [
      {
        path: '/resume',
        label: '我的简历 My Resume',
        iconClass: 'mdi-file-account',
        activePaths: ['/resume']
      },
      {
        path: '/ai-resume',
        label: 'AI简历分析 AI Analysis',
        iconClass: 'mdi-robot',
        activePaths: ['/ai-resume']
      }
    ]
  },
  {
    title: '资源中心 Resources',
    items: [
      {
        path: '/files',
        label: '文件 Files',
        iconClass: 'mdi-folder-open',
        activePaths: ['/files']
      },
      {
        path: '/online-test-bank',
        label: '在线测试题库 Online Test',
        iconClass: 'mdi-monitor-cellphone',
        activePaths: ['/online-test-bank']
      },
      {
        path: '/interview-bank',
        label: '真人面试题库 Interview Bank',
        iconClass: 'mdi-account-tie-voice',
        activePaths: ['/interview-bank']
      },
      {
        path: '/questions',
        label: '面试真题 Questions',
        iconClass: 'mdi-file-document-edit',
        activePaths: ['/questions']
      }
    ]
  },
  {
    title: '个人中心 Profile',
    items: [
      {
        path: '/profile',
        label: '基本信息 Profile',
        iconClass: 'mdi-account',
        activePaths: ['/profile']
      },
      {
        path: '/notice',
        label: '消息 Notice',
        iconClass: 'mdi-bell',
        activePaths: ['/notice'],
        badge: 5
      },
      {
        path: '/faq',
        label: '常见问题 FAQ',
        iconClass: 'mdi-help-circle',
        activePaths: ['/faq']
      },
      {
        path: '/complaint',
        label: '投诉建议 Complaints',
        iconClass: 'mdi-message-alert',
        activePaths: ['/complaint']
      }
    ]
  }
]

const isActive = (paths: string[]) => {
  return paths.some(path => route.path === path || route.path.startsWith(`${path}/`))
}

const navigate = (path: string) => {
  if (route.path !== path) {
    router.push(path)
  }
}

const handleLogout = async () => {
  try {
    await logout()
  } catch {
    // Ignore API failures and always clear local auth state.
  }
  clearAuth()
  router.push('/login')
}
</script>

<style scoped lang="scss">
.main-shell {
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
}

.nav-item {
  width: calc(100% - 24px);
  margin: 2px 12px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text2);
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  position: relative;

  .mdi {
    font-size: 20px;
    width: 24px;
  }

  &:hover {
    background: var(--bg);
    color: var(--primary);
  }

  &.active {
    background: var(--primary-light);
    color: var(--primary);
    font-weight: 600;
  }
}

.nav-badge {
  position: absolute;
  top: 8px;
  left: 28px;
  width: 18px;
  height: 18px;
  background: var(--danger);
  color: #fff;
  border-radius: 50%;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border);
}

.user-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: none;
  background: var(--primary-light);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: var(--primary-gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  flex-shrink: 0;
}

.user-info {
  h4 {
    font-size: 14px;
    font-weight: 600;
  }

  p {
    font-size: 12px;
    color: var(--muted);
  }
}

.main {
  flex: 1;
  min-width: 0;
  margin-left: 260px;
  padding: 28px;
  min-height: 100vh;
  overflow-x: hidden;
}

:deep([id^='page-']) {
  display: block;
  min-width: 0;
  max-width: 100%;
}

:deep(.page-header) {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

:deep(.page-title) {
  font-size: 26px;
  font-weight: 700;
}

:deep(.page-title-en),
:deep(.page-title span) {
  font-size: 14px;
  color: var(--muted);
  font-weight: 400;
  margin-left: 8px;
}

:deep(.page-sub) {
  font-size: 14px;
  color: var(--text2);
  margin-top: 6px;
}

:deep(.card) {
  background: #fff;
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  margin-bottom: 20px;
}

:deep(.card-header) {
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

:deep(.card-title) {
  font-size: 16px;
  font-weight: 600;
}

:deep(.card-body) {
  padding: 22px;
}

:deep(.header-actions),
:deep(.ant-space),
:deep(.ant-space-item),
:deep(.ant-card),
:deep(.ant-card-body),
:deep(.ant-tabs),
:deep(.ant-tabs-content-holder),
:deep(.ant-tabs-tabpane),
:deep(.ant-collapse),
:deep(.ant-collapse-content-box),
:deep(.ant-table-wrapper),
:deep(.ant-table-container) {
  min-width: 0;
  max-width: 100%;
}

:deep(.ant-table-wrapper) {
  overflow-x: auto;
}

:deep(.table) {
  width: 100%;
  border-collapse: collapse;
}

:deep(.table th),
:deep(.table td) {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}

:deep(.table th) {
  font-weight: 600;
  color: var(--text2);
  font-size: 12px;
  text-transform: uppercase;
  background: var(--bg);
}

:deep(.tag) {
  display: inline-flex;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

:deep(.tag.success) {
  background: #d1fae5;
  color: #065f46;
}

:deep(.tag.warning) {
  background: #fef3c7;
  color: #92400e;
}

:deep(.tag.danger) {
  background: #fee2e2;
  color: #991b1b;
}

:deep(.tag.info) {
  background: #dbeafe;
  color: #1e40af;
}

:deep(.tag.purple) {
  background: var(--primary-light);
  color: var(--primary-dark);
}

:deep(.btn) {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

:deep(.btn-primary) {
  background: var(--primary-gradient);
  color: #fff;
  box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
}

:deep(.btn-outline) {
  background: #fff;
  color: var(--text2);
  border: 1px solid var(--border);
}

:deep(.btn-text) {
  background: transparent;
  color: var(--primary);
  padding: 6px 12px;
}

:deep(.btn-sm) {
  padding: 6px 12px;
  font-size: 13px;
}

@media (max-width: 1024px) {
  .sidebar {
    position: static;
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }

  .main-shell {
    flex-direction: column;
  }

  .main {
    margin-left: 0;
    padding: 20px;
  }
}
</style>
