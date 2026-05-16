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
        <span>{{ t('common.shared.forceChangePassword.title') }}</span>
      </span>
    </template>

    <p class="force-pwd__intro">
      {{ t('common.shared.forceChangePassword.intro') }}
    </p>

    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      :required-mark="false"
    >
      <a-form-item name="newPassword" :label="t('common.shared.forceChangePassword.newPasswordLabel')">
        <a-input-password
          v-model:value="formState.newPassword"
          :placeholder="t('common.shared.forceChangePassword.newPasswordPlaceholder')"
          autocomplete="new-password"
        />
      </a-form-item>
      <a-form-item name="confirmPassword" :label="t('common.shared.forceChangePassword.confirmLabel')">
        <a-input-password
          v-model:value="formState.confirmPassword"
          :placeholder="t('common.shared.forceChangePassword.confirmPlaceholder')"
          autocomplete="new-password"
        />
      </a-form-item>
    </a-form>

    <div class="force-pwd__actions">
      <a-button @click="handleLogout">{{ t('common.shared.sidebar.logout') }}</a-button>
      <a-button
        type="primary"
        :loading="loading"
        @click="handleSubmit"
      >
        {{ t('common.shared.forceChangePassword.submitButton') }}
      </a-button>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { updateFirstLoginPwd } from '../api/user'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  success: []
  logout: []
}>()

const { t } = useI18n()
const formRef = ref()
const loading = ref(false)

const formState = reactive({
  newPassword: '',
  confirmPassword: '',
})

const validateNewPassword = (_rule: any, value: string) => {
  if (!value) return Promise.reject(t('common.shared.forceChangePassword.errors.newPasswordRequired'))
  if (value.length < 8 || value.length > 20) return Promise.reject(t('common.shared.forceChangePassword.errors.passwordLength'))
  if (!/[a-zA-Z]/.test(value)) return Promise.reject(t('common.shared.forceChangePassword.errors.needLetter'))
  if (!/\d/.test(value)) return Promise.reject(t('common.shared.forceChangePassword.errors.needDigit'))
  if (value === 'Osg@2026') return Promise.reject(t('common.shared.forceChangePassword.errors.notDefault'))
  return Promise.resolve()
}

const validateConfirm = (_rule: any, value: string) => {
  if (!value) return Promise.reject(t('common.shared.forceChangePassword.errors.confirmRequired'))
  if (value !== formState.newPassword) return Promise.reject(t('common.shared.forceChangePassword.errors.confirmMismatch'))
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
    message.success(t('common.shared.forceChangePassword.successMessage'))
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
