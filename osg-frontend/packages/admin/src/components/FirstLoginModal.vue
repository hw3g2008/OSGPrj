<template>
  <a-modal
    :open="visible"
    title="首次登录 - 请修改密码"
    :closable="false"
    :maskClosable="false"
    :keyboard="false"
    :footer="null"
    width="400px"
  >
    <div class="first-login-modal">
      <p class="tip">为确保账号安全，请设置您的新密码</p>

      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        @finish="handleSubmit"
      >
        <a-form-item name="newPassword" label="新密码">
          <a-input-password
            v-model:value="formState.newPassword"
            placeholder="8-20位，包含字母和数字"
            size="large"
          />
        </a-form-item>

        <a-form-item name="confirmPassword" label="确认密码">
          <a-input-password
            v-model:value="formState.confirmPassword"
            placeholder="请再次输入新密码"
            size="large"
          />
        </a-form-item>

        <div class="password-rules">
          <p>密码规则：</p>
          <ul>
            <li :class="{ valid: rules8to20 }">8-20位字符</li>
            <li :class="{ valid: hasLetter }">包含字母</li>
            <li :class="{ valid: hasNumber }">包含数字</li>
          </ul>
        </div>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="loading"
          >
            确认修改
          </a-button>
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import { http } from '@osg/shared/utils'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  success: []
}>()

const formRef = ref()
const loading = ref(false)

const formState = reactive({
  newPassword: '',
  confirmPassword: ''
})

// 密码规则校验
const rules8to20 = computed(() => {
  const len = formState.newPassword.length
  return len >= 8 && len <= 20
})

const hasLetter = computed(() => /[a-zA-Z]/.test(formState.newPassword))
const hasNumber = computed(() => /\d/.test(formState.newPassword))

const validatePassword = (_rule: any, value: string) => {
  if (!value) {
    return Promise.reject('请输入新密码')
  }
  if (value.length < 8 || value.length > 20) {
    return Promise.reject('密码长度需为8-20位')
  }
  if (!/[a-zA-Z]/.test(value)) {
    return Promise.reject('密码需包含字母')
  }
  if (!/\d/.test(value)) {
    return Promise.reject('密码需包含数字')
  }
  return Promise.resolve()
}

const validateConfirm = (_rule: any, value: string) => {
  if (!value) {
    return Promise.reject('请确认新密码')
  }
  if (value !== formState.newPassword) {
    return Promise.reject('两次输入的密码不一致')
  }
  return Promise.resolve()
}

const rules = {
  newPassword: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirm, trigger: 'blur' }]
}

const handleSubmit = async () => {
  try {
    loading.value = true

    await http.put('/system/user/profile/updateFirstLoginPwd', {
      newPassword: formState.newPassword
    })

    message.success('密码修改成功')
    emit('success')
  } catch (error: any) {
    message.error(error.message || '修改失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.first-login-modal {
  .tip {
    color: #666;
    margin-bottom: 24px;
  }

  .password-rules {
    background: #e6f7ff;
    border: 1px solid #91d5ff;
    border-radius: 4px;
    padding: 12px 16px;
    margin-bottom: 24px;

    p {
      margin: 0 0 8px;
      font-weight: 500;
    }

    ul {
      margin: 0;
      padding-left: 20px;

      li {
        color: #666;

        &.valid {
          color: #52c41a;
        }
      }
    }
  }
}
</style>
