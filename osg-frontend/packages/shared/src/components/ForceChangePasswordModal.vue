<template>
  <a-modal
    :open="open"
    :closable="false"
    :mask-closable="false"
    :keyboard="false"
    :footer="null"
    width="420px"
    centered
    :destroy-on-close="false"
  >
    <template #title>
      <span class="force-pwd__title">
        <span class="mdi mdi-lock-alert" aria-hidden="true" />
        <span>请修改默认密码</span>
      </span>
    </template>

    <p class="force-pwd__intro">
      您的账号正在使用系统默认密码，出于安全考虑，请先修改密码后再继续使用。
    </p>

    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      :required-mark="false"
    >
      <a-form-item name="newPassword" label="新密码">
        <a-input-password
          v-model:value="formState.newPassword"
          placeholder="8-20 位，须含字母和数字"
          autocomplete="new-password"
        />
      </a-form-item>
      <a-form-item name="confirmPassword" label="确认新密码">
        <a-input-password
          v-model:value="formState.confirmPassword"
          placeholder="请再次输入新密码"
          autocomplete="new-password"
        />
      </a-form-item>
    </a-form>

    <div class="force-pwd__actions">
      <a-button @click="handleLogout">退出登录</a-button>
      <a-button
        type="primary"
        :loading="loading"
        @click="handleSubmit"
      >
        修改并继续
      </a-button>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { updateFirstLoginPwd } from '../api/user'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  success: []
  logout: []
}>()

const formRef = ref()
const loading = ref(false)

const formState = reactive({
  newPassword: '',
  confirmPassword: '',
})

const validateNewPassword = (_rule: any, value: string) => {
  if (!value) return Promise.reject('请输入新密码')
  if (value.length < 8 || value.length > 20) return Promise.reject('密码长度 8-20 位')
  if (!/[a-zA-Z]/.test(value)) return Promise.reject('密码必须包含字母')
  if (!/\d/.test(value)) return Promise.reject('密码必须包含数字')
  if (value === 'Osg@2026') return Promise.reject('新密码不能与系统默认密码相同')
  return Promise.resolve()
}

const validateConfirm = (_rule: any, value: string) => {
  if (!value) return Promise.reject('请再次输入新密码')
  if (value !== formState.newPassword) return Promise.reject('两次输入不一致')
  return Promise.resolve()
}

const rules = {
  newPassword: [{ required: true, validator: validateNewPassword, trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: validateConfirm, trigger: 'blur' }],
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      formState.newPassword = ''
      formState.confirmPassword = ''
    }
  },
)

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true
    await updateFirstLoginPwd(formState.newPassword)
    message.success('密码修改成功')
    emit('success')
  } catch (error: any) {
    if (error?.errorFields) return
  } finally {
    loading.value = false
  }
}

const handleLogout = () => {
  emit('logout')
}
</script>

<style scoped>
.force-pwd__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.force-pwd__title .mdi {
  color: #f59e0b;
  font-size: 20px;
}

.force-pwd__intro {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #fffbeb;
  color: #92400e;
  font-size: 13px;
  line-height: 1.6;
}

.force-pwd__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
</style>
