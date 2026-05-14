<template>
  <OverlaySurfaceModal
    surface-id="modal-setting"
    :open="visible"
    width="520px"
    body-class="profile-modal__body"
    @cancel="handleClose"
  >
    <template #title>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span class="mdi mdi-account-cog" aria-hidden="true" />
        <span>{{ $t('personal_settings') }}</span>
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
      <a-form-item name="name" :data-field-name="$t('name')">
        <template #label>
          <span class="profile-modal__label">{{ $t('name') }}<span class="profile-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.name" :placeholder="$t('please_enter_name')" allow-clear />
      </a-form-item>

      <a-form-item name="account" :data-field-name="$t('account_number')">
        <template #label>
          <span class="profile-modal__label">{{ $t('account_number') }}</span>
        </template>
        <a-input
          v-model:value="formState.account"
          class="profile-modal__read-only"
          :placeholder="$t('current_login_account')"
          disabled
        />
      </a-form-item>

      <a-form-item name="email" :data-field-name="$t('email')">
        <template #label>
          <span class="profile-modal__label">{{ $t('email') }}</span>
        </template>
        <a-input
          v-model:value="formState.email"
          :placeholder="$t('please_enter_your_email')"
          allow-clear
        />
      </a-form-item>

      <div class="profile-modal__password-section">
        <div class="profile-modal__section-badge" data-content-part="status-banner">
          <span class="mdi mdi-lock-reset" aria-hidden="true" />
          <span>{{ $t('when_changing_the_password_you_need_to_f') }}</span>
        </div>

        <a-form-item name="oldPassword" :data-field-name="$t('old_password')">
          <template #label>
            <span class="profile-modal__label">{{ $t('old_password') }}</span>
          </template>
          <a-input-password
            v-model:value="formState.oldPassword"
            :placeholder="$t('please_enter_the_old_password_when_chang')"
            :visibility-toggle="false"
          />
        </a-form-item>

        <a-form-item name="newPassword" :data-field-name="$t('new_password')">
          <template #label>
            <span class="profile-modal__label">{{ $t('new_password') }}</span>
          </template>
          <a-input-password
            v-model:value="formState.newPassword"
            :placeholder="`8-20${$t('bits_including_letters_and_numbers')}`"
            :visibility-toggle="false"
          />
        </a-form-item>

        <a-form-item name="confirmPassword" :data-field-name="$t('confirm_password')">
          <template #label>
            <span class="profile-modal__label">{{ $t('confirm_password') }}</span>
          </template>
          <a-input-password
            v-model:value="formState.confirmPassword"
            :placeholder="$t('please_enter_new_password_again')"
            :visibility-toggle="false"
          />
        </a-form-item>
      </div>
    </a-form>

    <template #footer>
      <a-button data-surface-part="cancel-control" @click="handleClose">{{ $t('cancel') }}</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">
        <span class="mdi mdi-check" aria-hidden="true" />
        <span>{{ $t('save') }}</span>
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { http } from '@osg/shared/utils'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'

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

const validateEmail = (_rule: any, value: string) => {
  if (!value) return Promise.resolve()
  if (!/^[\w.!#$%&'*+/=?^`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(value)) {
    return Promise.reject(t('please_enter_a_valid_email_address'))
  }
  return Promise.resolve()
}

const hasPasswordChange = computed(() =>
  Boolean(formState.oldPassword || formState.newPassword || formState.confirmPassword),
)

const validatePassword = (_rule: any, value: string) => {
  if (!hasPasswordChange.value && !value) return Promise.resolve()
  if (!value) return Promise.reject(t('please_enter_new_password'))
  if (value.length < 8 || value.length > 20) return Promise.reject(t('password_length_needs_to_be_8_20_charact_2'))
  if (!/[a-zA-Z]/.test(value)) return Promise.reject(t('password_must_contain_letters'))
  if (!/\d/.test(value)) return Promise.reject(t('password_must_contain_numbers'))
  return Promise.resolve()
}

const validateOldPassword = (_rule: any, value: string) => {
  if (!hasPasswordChange.value && !value) return Promise.resolve()
  if (!value) return Promise.reject(t('please_enter_old_password'))
  return Promise.resolve()
}

const validateConfirm = (_rule: any, value: string) => {
  if (!hasPasswordChange.value && !value) return Promise.resolve()
  if (!value) return Promise.reject(t('please_confirm_new_password'))
  if (value !== formState.newPassword) return Promise.reject(t('the_passwords_entered_twice_are_inconsis'))
  return Promise.resolve()
}

const rules = {
  name: [{ required: true, message: t('please_enter_name'), trigger: 'blur' }],
  email: [{ validator: validateEmail, trigger: 'blur' }],
  oldPassword: [{ validator: validateOldPassword, trigger: 'blur' }],
  newPassword: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirm, trigger: 'blur' }],
}

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
        customErrorMessage: t('password_modification_failed_please_chec'),
      })
    }

    await http.put('/system/user/profile', {
      nickName: formState.name,
      email: formState.email,
      phonenumber: userStore.userInfo?.phonenumber || '',
      sex: userStore.userInfo?.sex,
    }, {
      customErrorMessage: t('profile_modification_failed_please_check'),
    })

    await userStore.fetchInfo()
    message.success(t('saved_successfully'))
    handleClose()
  } catch (error: any) {
    if (error?.errorFields) return
    // 移除组件内的错误提示，让拦截器处理
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

