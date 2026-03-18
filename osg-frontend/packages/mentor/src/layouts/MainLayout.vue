<template>
  <div class="app-layout">
    <aside class="sidebar">
      <!-- Header -->
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon"><i class="mdi mdi-account-tie" /></div>
          <span class="logo-text">OSG Mentor</span>
        </div>
      </div>

      <!-- Nav -->
      <nav class="sidebar-nav">
        <a class="nav-item" :class="{ active: currentPath === '/dashboard' }" @click="navigate('/dashboard')">
          <i class="mdi mdi-home" /><span>首页 Home</span>
        </a>

        <div class="nav-section">教学中心 TEACHING</div>
        <a class="nav-item" :class="{ active: currentPath === '/courses' }" @click="navigate('/courses')">
          <i class="mdi mdi-book-open-variant" /><span>课程记录 Class Records</span>
        </a>
        <a class="nav-item" :class="{ active: currentPath === '/communication' }" @click="navigate('/communication')">
          <i class="mdi mdi-message-text-clock" /><span>人际关系沟通记录 Records</span>
        </a>

        <div class="nav-section">求职中心 JOB CENTER</div>
        <a class="nav-item" :class="{ active: currentPath === '/job-overview' }" @click="navigate('/job-overview')">
          <i class="mdi mdi-briefcase-search" /><span>学员求职总览 Job Overview</span>
          <span v-if="jobBadge > 0" class="nav-badge">{{ jobBadge }}</span>
        </a>
        <a class="nav-item" :class="{ active: currentPath === '/sim-practice' }" @click="navigate('/sim-practice')">
          <i class="mdi mdi-account-voice" /><span>模拟应聘管理 Mock Practice</span>
          <span v-if="mockBadge > 0" class="nav-badge">{{ mockBadge }}</span>
        </a>

        <div class="nav-section">财务中心 FINANCE</div>
        <a class="nav-item" :class="{ active: currentPath === '/settlement' }" @click="navigate('/settlement')">
          <i class="mdi mdi-cash-check" /><span>课时结算 Settlement</span>
        </a>
        <a class="nav-item" :class="{ active: currentPath === '/expense' }" @click="navigate('/expense')">
          <i class="mdi mdi-receipt" /><span>报销管理 Expense</span>
        </a>

        <div class="nav-section">个人中心 PROFILE</div>
        <a class="nav-item" :class="{ active: currentPath === '/profile' }" @click="navigate('/profile')">
          <i class="mdi mdi-account" /><span>基本信息 Profile</span>
        </a>
        <a class="nav-item" :class="{ active: currentPath === '/schedule' }" @click="navigate('/schedule')">
          <i class="mdi mdi-calendar-clock" /><span>课程排期 Schedule</span>
        </a>
        <a class="nav-item" :class="{ active: currentPath === '/notice' }" @click="navigate('/notice')">
          <i class="mdi mdi-bell" /><span>消息 Notice</span>
        </a>
        <a class="nav-item" :class="{ active: currentPath === '/faq' }" @click="navigate('/faq')">
          <i class="mdi mdi-help-circle" /><span>常见问题 FAQ</span>
        </a>
      </nav>

      <!-- Footer -->
      <div class="sidebar-footer">
        <div class="user-card" @click="showUserMenu = !showUserMenu">
          <div class="user-avatar">{{ userInitials }}</div>
          <div class="user-info">
            <h4>{{ userName }}</h4>
            <p>点击展开</p>
          </div>
        </div>
        <div v-if="showUserMenu" class="user-menu">
          <a class="user-menu-item" @click="navigate('/profile'); showUserMenu = false">
            <i class="mdi mdi-cog" /> 个人设置
          </a>
          <a class="user-menu-item user-menu-item--danger" @click="handleLogout">
            <i class="mdi mdi-logout" /> 退出登录
          </a>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getUser, clearAuth } from '@osg/shared/utils'

const router = useRouter()
const route = useRoute()
const showUserMenu = ref(false)
const jobBadge = ref(1)
const mockBadge = ref(2)

const currentPath = computed(() => route.path)
const user = getUser<{ nickName?: string; userName?: string }>()
const userName = computed(() => user?.nickName || user?.userName || 'Mentor')
const userInitials = computed(() => {
  const name = userName.value
  return name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase()
})

function navigate(path: string) {
  router.push(path)
}

function handleLogout() {
  if (window.confirm('确定要退出登录吗？')) {
    clearAuth()
    router.push('/login')
  }
  showUserMenu.value = false
}
</script>

<style scoped>
.app-layout { display: flex; min-height: 100vh; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

.sidebar {
  width: 260px; background: #fff; border-right: 1px solid #E2E8F0;
  position: fixed; top: 0; left: 0; bottom: 0; z-index: 100;
  display: flex; flex-direction: column;
}
.sidebar-header { padding: 20px; border-bottom: 1px solid #E2E8F0; }
.sidebar-logo { display: flex; align-items: center; gap: 10px; }
.logo-icon {
  width: 40px; height: 40px;
  background: linear-gradient(135deg, #7399C6 0%, #9BB8D9 100%);
  border-radius: 12px; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 20px;
}
.logo-text {
  font-size: 18px; font-weight: 700;
  background: linear-gradient(135deg, #7399C6 0%, #9BB8D9 100%);
  background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

.sidebar-nav { flex: 1; overflow-y: auto; padding: 12px 0; }
.nav-section { padding: 16px 20px 8px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; }
.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 20px; margin: 2px 12px;
  color: #64748B; font-size: 14px; cursor: pointer; border-radius: 10px;
  text-decoration: none; user-select: none;
}
.nav-item:hover { background: #F8FAFC; color: #7399C6; }
.nav-item.active { background: #E8F0F8; color: #7399C6; font-weight: 600; }
.nav-item .mdi { font-size: 20px; width: 24px; text-align: center; }
.nav-badge {
  background: #EF4444; color: #fff; padding: 2px 6px; border-radius: 10px;
  font-size: 10px; font-weight: 600; margin-left: auto;
}

.sidebar-footer { padding: 16px; border-top: 1px solid #E2E8F0; position: relative; }
.user-card {
  display: flex; align-items: center; gap: 12px; padding: 12px;
  background: #E8F0F8; border-radius: 12px; cursor: pointer;
}
.user-avatar {
  width: 40px; height: 40px;
  background: linear-gradient(135deg, #7399C6 0%, #9BB8D9 100%);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 14px;
}
.user-info h4 { font-size: 14px; font-weight: 600; color: #1E293B; }
.user-info p { font-size: 12px; color: #94A3B8; }
.user-menu {
  position: absolute; bottom: 78px; left: 16px; right: 16px;
  background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  overflow: hidden; z-index: 100;
}
.user-menu-item {
  display: flex; align-items: center; gap: 8px; padding: 12px 16px;
  color: #1E293B; cursor: pointer; font-size: 14px; text-decoration: none;
}
.user-menu-item:hover { background: #F8FAFC; }
.user-menu-item--danger { color: #EF4444; border-top: 1px solid #E2E8F0; }

.main-content { flex: 1; margin-left: 260px; padding: 28px; min-height: 100vh; background: #F8FAFC; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from { opacity: 0; transform: translateY(10px); }
.fade-leave-to { opacity: 0; }
</style>
