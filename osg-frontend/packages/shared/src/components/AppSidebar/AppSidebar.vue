<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <div class="logo-icon">
          <i class="mdi mdi-account-star" aria-hidden="true" />
        </div>
        <div class="logo-text-group">
          <span class="logo-text">{{ logoTitle }}</span>
          <span v-if="logoSubtitle" class="logo-subtitle">{{ logoSubtitle }}</span>
        </div>
      </div>
    </div>

    <nav class="sidebar-nav">
      <!-- v1: 首页入口暂时隐藏，二期恢复（用 v-if 让 DOM 不渲染，避免被 .nav-item 选择器误中） -->
      <a v-if="false" href="#" class="nav-item" @click.prevent="emit('nav', homePath)">
        <i class="mdi mdi-home" aria-hidden="true" />
        <span>{{ $t('home_page') }} Home</span>
      </a>

      <template v-for="group in filteredNavigationGroups" :key="group.title">
        <div class="nav-section">{{ group.title }}</div>
        <a
          v-for="item in group.items"
          :key="item.path"
          href="#"
          class="nav-item"
          :class="{ active: isActive(item) }"
          @click.prevent="handleNavClick(item)"
        >
          <i class="mdi" :class="item.iconClass" aria-hidden="true" />
          <span>{{ item.label }}</span>
          <span v-if="hasBadge(item)" class="nav-badge">{{ item.badge }}</span>
        </a>
      </template>
    </nav>

    <div class="sidebar-footer">
      <button
        type="button"
        class="user-card"
        aria-haspopup="menu"
        :aria-expanded="showUserMenu ? 'true' : 'false'"
        @click="toggleUserMenu"
      >
        <div class="user-avatar">{{ userInitials }}</div>
        <div class="user-info">
          <h4>{{ displayName }}</h4>
          <p>{{ roleLabel }}</p>
        </div>
      </button>

      <div v-if="showUserMenu" class="user-menu" role="menu">
        <a class="user-menu-item" role="menuitem" @click="handleProfileClick">
          <i class="mdi mdi-account-cog" aria-hidden="true" />
          {{ $t('personal_settings') }} Profile
        </a>
        <a
          class="user-menu-item user-menu-item--danger"
          role="menuitem"
          @click="handleLogoutClick"
        >
          <i class="mdi mdi-logout" aria-hidden="true" />
          {{ $t('log_out') }} Logout
        </a>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Modal } from 'ant-design-vue'

import type { AppSidebarEmits, NavigationGroup, NavigationItem } from './types'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = withDefaults(
  defineProps<{
    navigationGroups: NavigationGroup[]
    displayName: string
    userInitials: string
    roleLabel: string
    currentPath: string
    logoTitle?: string
    logoSubtitle?: string
    userId?: string | number
    homePath?: string
    profilePath?: string
  }>(),
  {
    logoTitle: 'OSG',
    logoSubtitle: '',
    userId: undefined,
    homePath: '/home',
    profilePath: '/profile',
  },
)

const emit = defineEmits<AppSidebarEmits>()

// ====== 内部状态 ======

const showUserMenu = ref(false)

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
}

function closeUserMenu() {
  showUserMenu.value = false
}

// ====== 导航 ======

const filteredNavigationGroups = computed(() =>
  props.navigationGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.hidden) }))
    .filter((group) => group.items.length > 0),
)

function isActive(item: NavigationItem) {
  return item.activePaths.some(
    (prefix) => props.currentPath === prefix || props.currentPath.startsWith(`${prefix}/`),
  )
}

function hasBadge(item: NavigationItem) {
  return typeof item.badge === 'number' && item.badge > 0
}

function handleNavClick(item: NavigationItem) {
  if (item.hidden) return
  closeUserMenu()
  emit('nav', item.path)
}

// ====== user-menu 操作 ======

function handleProfileClick() {
  closeUserMenu()
  emit('profile-click')
}

function handleLogoutClick() {
  closeUserMenu()
  Modal.confirm({
    title: '确定要退出登录吗？',
    okText: t('ok'),
    cancelText: t('cancel'),
    onOk: () => emit('logout'),
  })
}

// ====== 全局监听：外部点击 / ESC 关闭菜单 ======

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target) return
  // 点击发生在 .sidebar-footer 内部时不关闭（user-card 切换由自身 click handler 处理）
  if (target.closest && target.closest('.sidebar-footer')) return
  closeUserMenu()
}

function handleEscKey(event: KeyboardEvent) {
  if (event.key === 'Escape') closeUserMenu()
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
  window.addEventListener('keydown', handleEscKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('keydown', handleEscKey)
})
</script>

<style scoped lang="scss">
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  width: 260px;
  flex-direction: column;
  border-right: 1px solid var(--border, #e2e8f0);
  background: #fff;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border, #e2e8f0);
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
  background: var(--primary-gradient, linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%));
  color: #fff;
  font-size: 20px;
}

.logo-text-group {
  display: flex;
  flex-direction: column;
}

.logo-text {
  background: var(--primary-gradient, linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 18px;
  font-weight: 700;
}

.logo-subtitle {
  color: var(--muted, #94a3b8);
  font-size: 11px;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

.nav-section {
  padding: 16px 20px 8px;
  color: var(--muted, #94a3b8);
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
  color: var(--text2, #64748b);
  font-size: 14px;
  text-decoration: none;
  user-select: none;
  cursor: pointer;
}

.nav-item:hover {
  background: var(--bg, #f8fafc);
  color: var(--primary, #7399c6);
}

.nav-item.active {
  background: var(--primary-light, #e8f0f8);
  color: var(--primary, #7399c6);
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
  border-top: 1px solid var(--border, #e2e8f0);
}

.user-card {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 12px;
  background: #fff;
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.user-avatar {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--primary-gradient, linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%));
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.user-info h4 {
  color: var(--text, #1e293b);
  font-size: 14px;
  font-weight: 600;
}

.user-info p {
  color: var(--muted, #94a3b8);
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
  color: var(--text, #1e293b);
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
}

.user-menu-item:hover {
  background: var(--bg, #f8fafc);
}

.user-menu-item--danger {
  border-top: 1px solid var(--border, #e2e8f0);
  color: #ef4444;
}
</style>
