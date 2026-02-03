<template>
  <div class="profile-page">
    <OsgPageContainer title="个人中心">
      <a-row :gutter="24">
        <a-col :span="8">
          <a-card>
            <div class="profile-avatar">
              <a-avatar :size="80">{{ userInfo?.nickName?.[0] || 'M' }}</a-avatar>
              <h2>{{ userInfo?.nickName || '导师' }}</h2>
              <p>{{ userInfo?.email }}</p>
              <a-tag color="green">认证导师</a-tag>
            </div>
          </a-card>
        </a-col>
        <a-col :span="16">
          <a-card title="基本信息">
            <a-descriptions :column="2">
              <a-descriptions-item label="用户名">{{ userInfo?.userName }}</a-descriptions-item>
              <a-descriptions-item label="昵称">{{ userInfo?.nickName }}</a-descriptions-item>
              <a-descriptions-item label="手机号">{{ userInfo?.phonenumber || '-' }}</a-descriptions-item>
              <a-descriptions-item label="邮箱">{{ userInfo?.email || '-' }}</a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
      </a-row>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'
import { getUser } from '@osg/shared/utils'
import type { UserInfo } from '@osg/shared/types'

const userInfo = ref<UserInfo | null>(null)
onMounted(() => { userInfo.value = getUser() })
</script>

<style scoped lang="scss">
.profile-avatar { text-align: center; padding: 24px 0; h2 { margin: 16px 0 8px; } p { color: #999; margin-bottom: 8px; } }
</style>
