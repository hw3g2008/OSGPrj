<template>
  <a-modal
    :open="visible"
    title="个人设置"
    @cancel="handleClose"
    :footer="null"
    width="480px"
  >
    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="profile" tab="基本信息">
        <a-form
          :model="profileForm"
          layout="vertical"
          @finish="handleUpdateProfile"
        >
          <a-form-item label="昵称" name="nickName">
            <a-input v-model:value="profileForm.nickName" placeholder="请输入昵称" />
          </a-form-item>
          <a-form-item label="邮箱" name="email">
            <a-input v-model:value="profileForm.email" placeholder="请输入邮箱" />
          </a-form-item>
          <a-form-item label="手机号" name="phonenumber">
            <a-input v-model:value="profileForm.phonenumber" placeholder="请输入手机号" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="profileLoading">
              保存修改
            </a-button>
          </a-form-item>
        </a-form>
      </a-tab-pane>

      <a-tab-pane key="password" tab="修改密码">
        <a-form
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          layout="vertical"
          @finish="handleUpdatePassword"
        >
          <a-form-item label="旧密码" name="oldPassword">
            <a-input-password v-model:value="passwordForm.oldPassword" placeholder="请输入旧密码" />
          </a-form-item>
          <a-form-item label="新密码" name="newPassword">
            <a-input-password v-model:value="passwordForm.newPassword" placeholder="8-20位，包含字母和数字" />
          </a-form-item>
          <a-form-item label="确认密码" name="confirmPassword">
            <a-input-password v-model:value="passwordForm.confirmPassword" placeholder="请再次输入新密码" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="passwordLoading">
              修改密码
            </a-button>
          </a-form-item>
        </a-form>
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { http } from '@osg/shared/utils'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const activeTab = ref('profile')
const profileLoading = ref(false)
const passwordLoading = ref(false)
const passwordFormRef = ref()

const profileForm = reactive({
  nickName: '',
  email: '',
  phonenumber: ''
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validatePassword = (_rule: any, value: string) => {
  if (!value) return Promise.reject('请输入新密码')
  if (value.length < 8 || value.length > 20) return Promise.reject('密码长度需为8-20位')
  if (!/[a-zA-Z]/.test(value)) return Promise.reject('密码需包含字母')
  if (!/\d/.test(value)) return Promise.reject('密码需包含数字')
  return Promise.resolve()
}

const validateConfirm = (_rule: any, value: string) => {
  if (!value) return Promise.reject('请确认新密码')
  if (value !== passwordForm.newPassword) return Promise.reject('两次输入的密码不一致')
  return Promise.resolve()
}

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirm, trigger: 'blur' }]
}

const handleUpdateProfile = async () => {
  try {
    profileLoading.value = true
    await http.put('/system/user/profile', profileForm)
    message.success('修改成功')
  } catch (error: any) {
    message.error(error.message || '修改失败')
  } finally {
    profileLoading.value = false
  }
}

const handleUpdatePassword = async () => {
  try {
    passwordLoading.value = true
    await http.put('/system/user/profile/updatePwd', {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    })
    message.success('密码修改成功')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error: any) {
    message.error(error.message || '修改失败')
  } finally {
    passwordLoading.value = false
  }
}

const handleClose = () => {
  emit('update:visible', false)
}
</script>
