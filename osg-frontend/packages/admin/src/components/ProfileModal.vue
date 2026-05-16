<template>
  <OverlaySurfaceModal
    surface-id="modal-setting"
    :open="visible"
    width="520px"
    body-class="profile-modal__body osg-modal-form"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-account-cog" aria-hidden="true" />
        <span>{{ t('admin.profile.modal.title') }}</span>
      </span>
    </template>

    <a-form
      ref="formRef"
      data-content-part="field-group"
      :model="formState"
      :rules="rules"
      layout="vertical"
      :required-mark="false"
      class="profile-modal__form"
    >
      <a-form-item name="name" data-field-name="姓名">
        <template #label>
          <span class="profile-modal__label">{{ t('admin.profile.modal.fields.name.label') }}<span class="profile-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.name" :placeholder="t('admin.profile.modal.fields.name.placeholder')" allow-clear />
      </a-form-item>

      <a-form-item name="account" data-field-name="账号">
        <template #label>
          <span class="profile-modal__label">{{ t('admin.profile.modal.fields.account.label') }}</span>
        </template>
        <a-input
          v-model:value="formState.account"
          class="profile-modal__read-only"
          :placeholder="t('admin.profile.modal.fields.account.placeholder')"
          disabled
        />
      </a-form-item>

      <a-form-item name="email" data-field-name="邮箱">
        <template #label>
          <span class="profile-modal__label">{{ t('admin.profile.modal.fields.email.label') }}</span>
        </template>
        <a-input
          v-model:value="formState.email"
          class="profile-modal__read-only"
          :placeholder="t('admin.profile.modal.fields.email.placeholder')"
          disabled
        />
      </a-form-item>

      <div class="profile-modal__password-section">
        <div class="profile-modal__section-badge" data-content-part="status-banner">
          <span class="mdi mdi-lock-reset" aria-hidden="true" />
          <span>{{ t('admin.profile.modal.passwordSection.hint') }}</span>
        </div>

        <a-form-item name="oldPassword" data-field-name="旧密码">
          <template #label>
            <span class="profile-modal__label">{{ t('admin.profile.modal.fields.oldPassword.label') }}</span>
          </template>
          <a-input-password
            v-model:value="formState.oldPassword"
            :placeholder="t('admin.profile.modal.fields.oldPassword.placeholder')"
            :visibility-toggle="false"
          />
        </a-form-item>

        <a-form-item name="newPassword" data-field-name="新密码">
          <template #label>
            <span class="profile-modal__label">{{ t('admin.profile.modal.fields.newPassword.label') }}</span>
          </template>
          <a-input-password
            v-model:value="formState.newPassword"
            :placeholder="t('admin.profile.modal.fields.newPassword.placeholder')"
            :visibility-toggle="false"
          />
        </a-form-item>

        <a-form-item name="confirmPassword" data-field-name="确认密码">
          <template #label>
            <span class="profile-modal__label">{{ t('admin.profile.modal.fields.confirmPassword.label') }}</span>
          </template>
          <a-input-password
            v-model:value="formState.confirmPassword"
            :placeholder="t('admin.profile.modal.fields.confirmPassword.placeholder')"
            :visibility-toggle="false"
          />
        </a-form-item>
      </div>
    </a-form>

    <template #footer>
      <a-button data-surface-part="cancel-control" @click="handleClose">{{ t('admin.profile.modal.cancel') }}</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">
        <span class="mdi mdi-check" aria-hidden="true" />
        <span>{{ t('admin.profile.modal.save') }}</span>
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { http } from '@osg/shared/utils'
import { OverlaySurfaceModal } from '@osg/shared/components'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const userStore = useUserStore()
const formRef = ref()
const saving = ref(false)

const formState = reactive({
  name: '',
  account: '',
  email: '',
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const hasPasswordChange = computed(() =>
  Boolean(formState.oldPassword || formState.newPassword || formState.confirmPassword),
)

const validatePassword = (_rule: any, value: string) => {
  if (!hasPasswordChange.value && !value) return Promise.resolve()
  if (!value) return Promise.reject(t('admin.profile.modal.validation.newPasswordRequired'))
  if (value.length < 8 || value.length > 20) return Promise.reject(t('admin.profile.modal.validation.passwordLength'))
  if (!/[a-zA-Z]/.test(value)) return Promise.reject(t('admin.profile.modal.validation.passwordNeedsLetter'))
  if (!/\d/.test(value)) return Promise.reject(t('admin.profile.modal.validation.passwordNeedsNumber'))
  return Promise.resolve()
}

const validateOldPassword = (_rule: any, value: string) => {
  if (!hasPasswordChange.value && !value) return Promise.resolve()
  if (!value) return Promise.reject(t('admin.profile.modal.validation.oldPasswordRequired'))
  return Promise.resolve()
}

const validateConfirm = (_rule: any, value: string) => {
  if (!hasPasswordChange.value && !value) return Promise.resolve()
  if (!value) return Promise.reject(t('admin.profile.modal.validation.confirmPasswordRequired'))
  if (value !== formState.newPassword) return Promise.reject(t('admin.profile.modal.validation.passwordMismatch'))
  return Promise.resolve()
}

const rules = computed(() => ({
  name: [{ required: true, message: t('admin.profile.modal.validation.nameRequired'), trigger: 'blur' }],
  oldPassword: [{ validator: validateOldPassword, trigger: 'blur' }],
  newPassword: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirm, trigger: 'blur' }],
}))

const resetPasswordFields = () => {
  formState.oldPassword = ''
  formState.newPassword = ''
  formState.confirmPassword = ''
}

const syncFormState = async () => {
  if (!userStore.userInfo) {
    await userStore.fetchInfo()
  }

  formState.name = userStore.userInfo?.nickName || ''
  formState.account = userStore.userInfo?.userName || ''
  formState.email = userStore.userInfo?.email || ''
  resetPasswordFields()

  await nextTick()
  formRef.value?.clearValidate?.()
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    void syncFormState()
  },
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSave = async () => {
  try {
    await formRef.value?.validate()
    saving.value = true

    if (hasPasswordChange.value) {
      await http.put('/system/user/profile/updatePwd', {
        oldPassword: formState.oldPassword,
        newPassword: formState.newPassword,
      }, {
        customErrorMessage: t('admin.profile.modal.errors.passwordChangeFailed'),
      })
    }

    await http.put('/system/user/profile', {
      nickName: formState.name,
      email: userStore.userInfo?.email || '',
      phonenumber: userStore.userInfo?.phonenumber || '',
      sex: userStore.userInfo?.sex,
    }, {
      customErrorMessage: t('admin.profile.modal.errors.profileUpdateFailed'),
    })

    await userStore.fetchInfo()
    message.success(t('admin.profile.modal.messages.saveSuccess'))
    handleClose()
  } catch (error: any) {
    if (error?.errorFields) return
    // suppress error here, interceptor handles it
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.profile-modal__form {
  display: grid;
  gap: 12px;
}

.profile-modal__label {
  display: inline-flex;
  align-items: center;
  color: var(--text, #1e293b);
  font-size: 14px;
  font-weight: 600;
}

.profile-modal__required {
  color: #ef4444;
}

.profile-modal__password-section {
  display: grid;
  gap: 12px;
}

.profile-modal__section-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 500;
}

.profile-modal__read-only :deep(.ant-input[disabled]) {
  color: var(--text-secondary, #64748b);
  background: #f8fafc;
}
</style>
