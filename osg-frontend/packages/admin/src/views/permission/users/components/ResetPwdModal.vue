<template>
  <a-modal
    :open="visible"
    title="重置密码"
    width="480px"
    @cancel="handleClose"
    :footer="null"
  >
    <a-alert
      type="warning"
      message="重置后该用户需使用新密码登录"
      show-icon
      style="margin-bottom: 16px"
    />

    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
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

      <div class="modal-footer">
        <a-button @click="handleClose">取消</a-button>
        <a-button
          type="primary"
          :loading="loading"
          style="background-color: #faad14; border-color: #faad14"
          @click="handleSubmit"
        >
          确认重置
        </a-button>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { resetUserPwd } from '@/api/user'

const props = defineProps<{
  visible: boolean
  user: any
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

const formRef = ref()
const loading = ref(false)

const formState = reactive({
  password: '',
  confirmPassword: ''
})

const validatePassword = (_rule: any, value: string) => {
  if (!value) return Promise.reject('请输入新密码')
  if (value.length < 8 || value.length > 20) return Promise.reject('密码长度8-20字符')
  if (!/[a-zA-Z]/.test(value)) return Promise.reject('密码必须包含字母')
  if (!/[0-9]/.test(value)) return Promise.reject('密码必须包含数字')
  return Promise.resolve()
}

const validateConfirmPassword = (_rule: any, value: string) => {
  if (!value) return Promise.reject('请再次输入新密码')
  if (value !== formState.password) return Promise.reject('两次输入的密码不一致')
  return Promise.resolve()
}

const rules = {
  password: [{ required: true, validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }]
}

watch(() => props.visible, (val) => {
  if (val) {
    formState.password = ''
    formState.confirmPassword = ''
  }
})

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    await resetUserPwd({
      userId: props.user.userId,
      password: formState.password
    })

    message.success('密码重置成功')
    emit('success')
    handleClose()
  } catch (error: any) {
    if (error.errorFields) return
    message.error(error.message || '操作失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
