<template>
  <a-modal
    :open="visible"
    title="重置密码"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
    width="400px"
  >
    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" danger :loading="loading" @click="handleSubmit">
        确认重置
      </a-button>
    </template>

    <a-alert
      message="重置后该用户需使用新密码登录"
      type="warning"
      show-icon
      style="margin-bottom: 16px"
    />

    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 17 }"
    >
      <a-form-item label="新密码" name="password">
        <a-input-password
          v-model:value="formState.password"
          placeholder="8-20字符，包含字母和数字"
        />
      </a-form-item>

      <a-form-item label="确认密码" name="confirmPassword">
        <a-input-password
          v-model:value="formState.confirmPassword"
          placeholder="请再次输入新密码"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import { resetUserPwd } from '@/api/user'

interface Props {
  visible: boolean
  userId: number | null
}

const props = defineProps<Props>()
const emit = defineEmits(['update:visible', 'success'])

const formRef = ref<FormInstance>()
const loading = ref(false)

const formState = reactive({
  password: '',
  confirmPassword: ''
})

// 密码校验：8-20位，包含字母和数字
const validatePassword = (_rule: Rule, value: string) => {
  if (!value) {
    return Promise.reject('请输入新密码')
  }
  if (value.length < 8 || value.length > 20) {
    return Promise.reject('密码长度需为8-20字符')
  }
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return Promise.reject('密码需包含字母和数字')
  }
  return Promise.resolve()
}

const validateConfirmPassword = (_rule: Rule, value: string) => {
  if (!value) {
    return Promise.reject('请再次输入新密码')
  }
  if (value !== formState.password) {
    return Promise.reject('两次输入的密码不一致')
  }
  return Promise.resolve()
}

const rules: Record<string, Rule[]> = {
  password: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      formState.password = ''
      formState.confirmPassword = ''
      formRef.value?.resetFields()
    }
  }
)

const handleSubmit = async () => {
  if (!props.userId) return

  try {
    await formRef.value?.validate()
    loading.value = true

    await resetUserPwd(props.userId, formState.password)
    message.success('密码重置成功')

    emit('update:visible', false)
    emit('success')
  } catch (error: any) {
    if (error?.errorFields) return
    message.error('重置密码失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('update:visible', false)
}
</script>
