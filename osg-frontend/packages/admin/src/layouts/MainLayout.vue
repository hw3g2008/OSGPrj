<template>
  <a-layout class="main-layout">
    <a-layout-sider v-model:collapsed="collapsed" collapsible>
      <div class="logo">
        <span v-if="!collapsed">OSG Admin</span>
        <span v-else>OSG</span>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        v-model:openKeys="openKeys"
        theme="dark"
        mode="inline"
      >
        <!-- 首页（无分组） -->
        <a-menu-item key="/dashboard" @click="$router.push('/dashboard')">
          <template #icon><DashboardOutlined /></template>
          <span>首页</span>
        </a-menu-item>
        <!-- 分组菜单 -->
        <template v-for="group in filteredMenuGroups" :key="group.key">
          <a-sub-menu>
            <template #icon><AppstoreOutlined /></template>
            <template #title>{{ group.title }}</template>
            <a-menu-item
              v-for="item in group.children"
              :key="item.path"
              @click="$router.push(item.path)"
            >
              <span>{{ item.title }}</span>
            </a-menu-item>
          </a-sub-menu>
        </template>
      </a-menu>
      <div class="sidebar-footer">
        <a-button type="text" block @click="showProfileModal = true">
          <template #icon><UserOutlined /></template>
          <span v-if="!collapsed">个人设置</span>
        </a-button>
      </div>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="header">
        <div class="header-right">
          <span class="user-name">{{ userStore.userInfo?.nickName }}</span>
          <a-button type="link" danger @click="handleLogout">退出登录</a-button>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { DashboardOutlined, UserOutlined, AppstoreOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'
import FirstLoginModal from '@/components/FirstLoginModal.vue'
import ProfileModal from '@/components/ProfileModal.vue'

const userStore = useUserStore()
const vueRouter = useRouter()

interface MenuItem {
  path: string
  title: string
  permission?: string
}

interface MenuGroup {
  key: string
  title: string
  children: MenuItem[]
}

const collapsed = ref(false)
const selectedKeys = ref(['/dashboard'])
const openKeys = ref<string[]>([])
const showProfileModal = ref(false)

// 菜单分组定义（与 SRS §7 / §8 一致）
const menuGroups: MenuGroup[] = [
  {
    key: 'permission',
    title: '权限管理',
    children: [
      { path: '/permission/roles', title: '权限配置', permission: 'system:role:list' },
      { path: '/permission/users', title: '后台用户管理', permission: 'system:user:list' },
      { path: '/permission/base-data', title: '基础数据管理', permission: 'system:baseData:list' },
    ]
  },
  {
    key: 'user-center',
    title: '用户中心',
    children: [
      { path: '/users/students', title: '学生列表', permission: 'users:student:list' },
      { path: '/users/contracts', title: '合同管理', permission: 'users:contract:list' },
      { path: '/users/staff', title: '导师列表', permission: 'users:staff:list' },
      { path: '/users/mentor-schedule', title: '导师排期管理', permission: 'users:mentorSchedule:list' },
    ]
  },
  {
    key: 'career',
    title: '求职中心',
    children: [
      { path: '/career/positions', title: '岗位信息', permission: 'career:position:list' },
      { path: '/career/student-positions', title: '学生自添岗位', permission: 'career:studentPosition:list' },
      { path: '/career/job-overview', title: '学员求职总览', permission: 'career:jobOverview:list' },
      { path: '/career/mock-practice', title: '模拟应聘管理', permission: 'career:mockPractice:list' },
    ]
  },
  {
    key: 'teaching',
    title: '教学中心',
    children: [
      { path: '/teaching/class-records', title: '课程记录', permission: 'teaching:classRecord:list' },
      { path: '/teaching/communication', title: '人际关系沟通记录', permission: 'teaching:communication:list' },
    ]
  },
  {
    key: 'finance',
    title: '财务中心',
    children: [
      { path: '/finance/settlement', title: '课时结算', permission: 'finance:settlement:list' },
      { path: '/finance/expense', title: '报销管理', permission: 'finance:expense:list' },
    ]
  },
  {
    key: 'resource',
    title: '资源中心',
    children: [
      { path: '/resource/files', title: '文件', permission: 'resource:file:list' },
      { path: '/resource/online-test-bank', title: '在线测试题库', permission: 'resource:onlineTestBank:list' },
      { path: '/resource/interview-bank', title: '真人面试题库', permission: 'resource:interviewBank:list' },
      { path: '/resource/questions', title: '面试真题', permission: 'resource:question:list' },
    ]
  },
  {
    key: 'profile',
    title: '个人中心',
    children: [
      { path: '/profile/mailjob', title: '邮件', permission: 'profile:mailjob:list' },
      { path: '/profile/notice', title: '消息管理', permission: 'profile:notice:list' },
      { path: '/profile/complaints', title: '投诉建议', permission: 'profile:complaint:list' },
      { path: '/profile/logs', title: '操作日志', permission: 'profile:log:list' },
    ]
  },
]

// 权限过滤后的菜单分组（T-026 将增强此逻辑）
const filteredMenuGroups = computed(() => {
  const perms = userStore.permissions
  const isAdmin = perms.includes('*:*:*')

  return menuGroups
    .map(group => ({
      ...group,
      children: group.children.filter(item => {
        if (isAdmin) return true
        return !item.permission || perms.includes(item.permission)
      })
    }))
    .filter(group => group.children.length > 0)
})

const handleLogout = () => {
  Modal.confirm({
    title: '确认退出',
    content: '确定要退出登录吗？',
    okText: '确定',
    cancelText: '取消',
    async onOk() {
      await userStore.logout()
      message.success('已退出登录')
      vueRouter.push('/login')
    }
  })
}

onMounted(async () => {
  if (!userStore.userInfo) {
    await userStore.fetchInfo()
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
