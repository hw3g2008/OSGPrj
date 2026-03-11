<template>
  <OverlaySurfaceModal
    surface-id="modal-reset-password"
    :open="visible"
    width="400px"
    body-class="reset-pwd-modal__body"
    @cancel="handleClose"
  >
    <template #title>
      <span class="reset-pwd-modal__title">
        <span class="mdi mdi-lock-reset reset-pwd-modal__title-icon" aria-hidden="true" />
        <span>重置密码</span>
      </span>
    </template>

    <div class="reset-pwd-modal__warning" data-content-part="status-banner">
      <span class="mdi mdi-alert" aria-hidden="true" />
      <p data-content-part="supporting-text">重置后该用户需使用新密码登录</p>
    </div>

    <a-form
      ref="formRef"
      data-content-part="field-group"
      :model="formState"
      :rules="rules"
      layout="vertical"
      :required-mark="false"
    >
      <a-form-item name="password">
        <template #label>
          <span class="reset-pwd-modal__label">新密码<span class="reset-pwd-modal__required">*</span></span>
        </template>
        <a-input-password
          v-model:value="formState.password"
          placeholder="8-20字符，包含字母和数字"
          :visibility-toggle="false"
        />
      </a-form-item>

      <a-form-item name="confirmPassword">
        <template #label>
          <span class="reset-pwd-modal__label">确认密码<span class="reset-pwd-modal__required">*</span></span>
        </template>
        <a-input-password
          v-model:value="formState.confirmPassword"
          placeholder="请再次输入新密码"
          :visibility-toggle="false"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <div data-content-part="action-row" class="reset-pwd-modal__actions">
        <a-button class="reset-pwd-modal__cancel-btn" @click="handleClose">取消</a-button>
        <a-button
          type="primary"
          :loading="loading"
          class="reset-pwd-modal__confirm-btn"
          @click="handleSubmit"
        >
          <span class="mdi mdi-check" aria-hidden="true" />
          <span>确认重置</span>
        </a-button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { resetUserPwd } from '@/api/user'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

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
  confirmPassword: '',
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
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    formState.password = ''
    formState.confirmPassword = ''
  },
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    await resetUserPwd({
      userId: props.user.userId,
      password: formState.password,
    })

    message.success('密码重置成功')
    emit('success')
    handleClose()
  } catch (error: any) {
    if (error?.errorFields) return
    message.error(error?.message || '操作失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.reset-pwd-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.reset-pwd-modal__title-icon {
  font-size: 18px;
  line-height: 1;
}

.reset-pwd-modal__label {
  display: inline-flex;
  align-items: center;
  color: var(--text, #1e293b);
  font-size: 14px;
  font-weight: 600;
}

.reset-pwd-modal__required {
  color: #ef4444;
}

.reset-pwd-modal__warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: #fef3c7;

  .anticon,
  p {
    color: #92400e;
  }

  p {
    margin: 0;
    font-size: 13px;
  }
}

.reset-pwd-modal__cancel-btn {
  border-color: var(--border, #d0d7e2);
  border-radius: 10px;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
  min-width: 80px;
}

.reset-pwd-modal__actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.reset-pwd-modal__confirm-btn {
  background-color: var(--warning, #f59e0b);
  border-color: var(--warning, #f59e0b);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover,
  &:focus {
    background-color: var(--warning, #f59e0b);
    border-color: var(--warning, #f59e0b);
    opacity: 0.96;
  }
}
</style>

<style lang="scss">
.overlay-surface-modal__body.reset-pwd-modal__body .ant-form-item {
  margin-bottom: 0;
}

.overlay-surface-modal__footer .reset-pwd-modal__confirm-btn {
  background-color: var(--warning, #f59e0b) !important;
  background-image: none !important;
  border-color: var(--warning, #f59e0b) !important;
  color: #fff !important;
}

.overlay-surface-modal__footer .reset-pwd-modal__confirm-btn:hover,
.overlay-surface-modal__footer .reset-pwd-modal__confirm-btn:focus {
  background-color: var(--warning, #f59e0b) !important;
  background-image: none !important;
  border-color: var(--warning, #f59e0b) !important;
  color: #fff !important;
}
</style>
