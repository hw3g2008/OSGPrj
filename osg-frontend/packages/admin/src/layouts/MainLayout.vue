<template>
  <a-layout class="main-layout">
    <a-layout-sider v-model:collapsed="collapsed" collapsible>
      <div class="logo">
        <span v-if="!collapsed">OSG Admin</span>
        <span v-else>OSG</span>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        theme="dark"
        mode="inline"
      >
        <a-menu-item key="dashboard" @click="$router.push('/dashboard')">
          <template #icon><DashboardOutlined /></template>
          <span>首页</span>
        </a-menu-item>
      </a-menu>
      <div class="sidebar-footer">
        <a-button type="text" block @click="showProfileModal = true">
          <template #icon><UserOutlined /></template>
          <span v-if="!collapsed">{{ userStore.userInfo?.nickName || '个人设置' }}</span>
        </a-button>
      </div>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="header">
        <div class="header-right">
          <span class="user-name">{{ userStore.userInfo?.nickName }}</span>
          <a-button type="link" @click="handleLogout">退出</a-button>
        </div>
      </a-layout-header>
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>

    <!-- 首次登录改密弹窗 -->
    <FirstLoginModal
      v-if="userStore.firstLogin"
      :visible="userStore.firstLogin"
      @success="userStore.setFirstLogin(false)"
    />

    <!-- 个人设置弹窗 -->
    <ProfileModal
      v-model:visible="showProfileModal"
    />
  </a-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { DashboardOutlined, UserOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'
import FirstLoginModal from '@/components/FirstLoginModal.vue'
import ProfileModal from '@/components/ProfileModal.vue'

const router = useRouter()
const userStore = useUserStore()

const collapsed = ref(false)
const selectedKeys = ref(['dashboard'])
const showProfileModal = ref(false)

const handleLogout = async () => {
  await userStore.logout()
  message.success('已退出登录')
  router.push('/login')
}

onMounted(async () => {
  if (!userStore.userInfo) {
    await userStore.getInfo()
  }
})
</script>

<style scoped lang="scss">
.main-layout {
  min-height: 100vh;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.1);
}

.sidebar-footer {
  position: absolute;
  bottom: 48px;
  left: 0;
  right: 0;
  padding: 8px;

  .ant-btn {
    color: rgba(255, 255, 255, 0.65);

    &:hover {
      color: #fff;
    }
  }
}

.header {
  background: #fff;
  padding: 0 24px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;

    .user-name {
      color: #333;
    }
  }
}

.content {
  margin: 24px;
  padding: 24px;
  background: #fff;
  min-height: 280px;
  border-radius: 8px;
}
</style>
