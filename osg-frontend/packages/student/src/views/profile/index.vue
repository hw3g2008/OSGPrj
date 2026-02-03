<template>
  <div class="profile-page">
    <OsgPageContainer title="个人中心">
      <a-row :gutter="24">
        <a-col :span="8">
          <a-card>
            <div class="profile-avatar">
              <a-avatar :size="80">{{ userInfo?.nickName?.[0] || 'U' }}</a-avatar>
              <h2>{{ userInfo?.nickName || '用户' }}</h2>
              <p>{{ userInfo?.email }}</p>
            </div>
          </a-card>
        </a-col>
        <a-col :span="16">
          <a-card title="基本信息">
            <a-form :model="formState" layout="vertical">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="用户名">
                    <a-input v-model:value="formState.userName" disabled />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="昵称">
                    <a-input v-model:value="formState.nickName" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="手机号">
                    <a-input v-model:value="formState.phonenumber" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="邮箱">
                    <a-input v-model:value="formState.email" />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item>
                <a-button type="primary" @click="handleSave">保存修改</a-button>
              </a-form-item>
            </a-form>
          </a-card>
        </a-col>
      </a-row>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { OsgPageContainer } from '@osg/shared/components'
import { getUser } from '@osg/shared/utils'
import type { UserInfo } from '@osg/shared/types'

const userInfo = ref<UserInfo | null>(null)

const formState = reactive({
  userName: '',
  nickName: '',
  phonenumber: '',
  email: ''
})

onMounted(() => {
  userInfo.value = getUser()
  if (userInfo.value) {
    formState.userName = userInfo.value.userName
    formState.nickName = userInfo.value.nickName
    formState.phonenumber = userInfo.value.phonenumber || ''
    formState.email = userInfo.value.email || ''
  }
})

const handleSave = () => {
  message.success('保存成功')
}
</script>

<style scoped lang="scss">
.profile-avatar {
  text-align: center;
  padding: 24px 0;

  h2 {
    margin: 16px 0 8px;
  }

  p {
    color: #999;
  }
}
</style>
