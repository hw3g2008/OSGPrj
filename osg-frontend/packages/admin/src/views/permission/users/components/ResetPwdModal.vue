<template>
  <OverlaySurfaceModal
    surface-id="modal-reset-password"
    :open="visible"
    width="460px"
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
      <p data-content-part="supporting-text">重置后该用户需使用新密码重新登录，建议立即同步通知对方。</p>
    </div>

    <div class="reset-pwd-modal__identity">
      <span class="reset-pwd-modal__identity-name">
        {{ props.user?.nickName || props.user?.userName || '未选择用户' }}
      </span>
      <span class="reset-pwd-modal__identity-account">@{{ props.user?.userName || 'unknown' }}</span>
    </div>

    <div class="reset-pwd-modal__policy">
      <span>至少 8 位</span>
      <span>必须包含字母</span>
      <span>必须包含数字</span>
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
        <a-button class="reset-pwd-modal__cancel-btn" data-surface-part="cancel-control" @click="handleClose">
          <span>取消</span>
        </a-button>
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

const getIdentityInitials = () => {
  const base = String(props.user?.nickName || props.user?.userName || 'AD').trim()
  return base.slice(0, 2).toUpperCase()
}

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
    }, {
      customErrorMessage: '密码重置失败，请检查输入'
    })

    message.success('密码重置成功')
    emit('success')
    handleClose()
  } catch (error: any) {
    if (error?.errorFields) return
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
  color: #1a2234;
  font-family: 'Space Grotesk', 'Avenir Next', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.reset-pwd-modal__title-icon {
  color: #4f74ff;
  font-size: 18px;
}

.reset-pwd-modal__identity {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
  padding: 0 2px;
}

.reset-pwd-modal__identity-name {
  color: #1a2234;
  font-size: 15px;
  font-weight: 700;
}

.reset-pwd-modal__identity-account {
  color: #69758b;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
  font-size: 12px;
}

.reset-pwd-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #1a2234;
  font-size: 14px;
  font-weight: 700;
}

.reset-pwd-modal__required {
  color: #d35d53;
}

.reset-pwd-modal__warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  margin-bottom: 14px;
  border-radius: 12px;
  background: #eef2ff;
  border: 1px solid rgba(79, 116, 255, 0.12);

  .mdi,
  p {
    color: #4f46e5;
  }

  .mdi {
    font-size: 18px;
    line-height: 1;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
  }
}

.reset-pwd-modal__policy {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;

  span {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(79, 116, 255, 0.08);
    color: #526786;
    font-size: 12px;
    font-weight: 700;
  }
}

.reset-pwd-modal__actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.reset-pwd-modal__cancel-btn {
  min-width: 92px;
  height: 42px;
  border-color: rgba(26, 34, 52, 0.12);
  border-radius: 14px;
  color: #69758b;
  font-weight: 600;
}

.reset-pwd-modal__confirm-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 120px;
  height: 42px;
  border: none !important;
  border-radius: 14px;
  background: linear-gradient(135deg, #3f68ff, #6788ff) !important;
  color: #fff !important;
  font-weight: 700;
  box-shadow: 0 16px 34px rgba(79, 116, 255, 0.2);

  &:hover,
  &:focus {
    background: linear-gradient(135deg, #3f68ff, #6788ff) !important;
    color: #fff !important;
    opacity: 0.96;
  }
}
</style>

<style lang="scss">
.overlay-surface-modal__body.reset-pwd-modal__body .ant-form-item {
  margin-bottom: 0;
}

.overlay-surface-modal__body.reset-pwd-modal__body .ant-input,
.overlay-surface-modal__body.reset-pwd-modal__body .ant-input-affix-wrapper {
  min-height: 46px;
  border-radius: 14px !important;
  border-color: rgba(79, 116, 255, 0.12) !important;
  box-shadow: none !important;
}

.overlay-surface-modal__body.reset-pwd-modal__body .ant-input,
.overlay-surface-modal__body.reset-pwd-modal__body .ant-input-affix-wrapper {
  padding-inline: 14px;
}

.overlay-surface-modal__footer .reset-pwd-modal__confirm-btn {
  background-color: #4f74ff !important;
  background-image: none !important;
  border-color: #4f74ff !important;
  color: #fff !important;
}

.overlay-surface-modal__footer .reset-pwd-modal__confirm-btn:hover,
.overlay-surface-modal__footer .reset-pwd-modal__confirm-btn:focus {
  background-color: #4f74ff !important;
  background-image: none !important;
  border-color: #4f74ff !important;
  color: #fff !important;
}
</style>
