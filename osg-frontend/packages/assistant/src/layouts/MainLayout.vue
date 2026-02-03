<template>
  <a-layout class="main-layout">
    <a-layout-sider v-model:collapsed="collapsed" collapsible theme="dark">
      <div class="logo"><span v-if="!collapsed">OSG 助教端</span><span v-else>OSG</span></div>
      <a-menu v-model:selectedKeys="selectedKeys" theme="dark" mode="inline" @click="handleMenuClick">
        <a-menu-item key="dashboard"><template #icon><DashboardOutlined /></template><span>工作台</span></a-menu-item>
        <a-menu-item key="schedule"><template #icon><CalendarOutlined /></template><span>排课协助</span></a-menu-item>
        <a-menu-item key="students"><template #icon><TeamOutlined /></template><span>学员服务</span></a-menu-item>
        <a-menu-item key="materials"><template #icon><FolderOutlined /></template><span>资料管理</span></a-menu-item>
        <a-menu-item key="feedback"><template #icon><MessageOutlined /></template><span>反馈收集</span></a-menu-item>
        <a-menu-item key="profile"><template #icon><UserOutlined /></template><span>个人中心</span></a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="main-header">
        <div class="header-right">
          <a-dropdown>
            <a class="user-dropdown" @click.prevent>
              <a-avatar :size="32">{{ userInfo?.nickName?.[0] || 'A' }}</a-avatar>
              <span class="user-name">{{ userInfo?.nickName || '助教' }}</span>
            </a>
            <template #overlay>
              <a-menu>
                <a-menu-item key="profile" @click="$router.push('/profile')">个人中心</a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" @click="handleLogout">退出登录</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>
      <a-layout-content class="main-content"><router-view /></a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { DashboardOutlined, CalendarOutlined, TeamOutlined, FolderOutlined, MessageOutlined, UserOutlined } from '@ant-design/icons-vue'
import { clearAuth, getUser } from '@osg/shared/utils'
import type { UserInfo } from '@osg/shared/types'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const userInfo = ref<UserInfo | null>(getUser())
const selectedKeys = computed(() => { const name = route.name as string; return name ? [name.toLowerCase()] : ['dashboard'] })
const handleMenuClick = ({ key }: { key: string }) => { router.push({ name: key.charAt(0).toUpperCase() + key.slice(1) }) }
const handleLogout = () => { clearAuth(); router.push('/login') }
</script>

<style scoped lang="scss">
.main-layout { min-height: 100vh; }
.logo { height: 64px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; font-weight: 600; background: rgba(255, 255, 255, 0.1); }
.main-header { background: #fff; padding: 0 24px; display: flex; align-items: center; justify-content: flex-end; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08); }
.header-right { display: flex; align-items: center; }
.user-dropdown { display: flex; align-items: center; gap: 8px; color: #333; }
.user-name { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.main-content { margin: 24px; padding: 24px; background: #fff; border-radius: 8px; min-height: 280px; }
</style>
