<template>
  <div class="profile-page">
    <OsgPageContainer title="个人中心">
      <a-descriptions title="基本信息" :column="2">
        <a-descriptions-item label="用户名">{{ userInfo?.userName }}</a-descriptions-item>
        <a-descriptions-item label="昵称">{{ userInfo?.nickName }}</a-descriptions-item>
        <a-descriptions-item label="手机号">{{ userInfo?.phonenumber || '-' }}</a-descriptions-item>
        <a-descriptions-item label="邮箱">{{ userInfo?.email || '-' }}</a-descriptions-item>
      </a-descriptions>
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
