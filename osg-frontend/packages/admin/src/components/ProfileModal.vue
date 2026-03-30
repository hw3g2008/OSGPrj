<template>
  <OverlaySurfaceModal
    surface-id="modal-setting"
    :open="visible"
    width="520px"
    body-class="profile-modal__body"
    @cancel="handleClose"
  >
    <template #title>
      <span class="profile-modal__title">
        <span class="mdi mdi-account-cog profile-modal__title-icon" aria-hidden="true" />
        <span>个人设置</span>
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
          <span class="profile-modal__label">姓名<span class="profile-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.name" placeholder="请输入姓名" allow-clear />
      </a-form-item>

      <a-form-item name="account" data-field-name="账号">
        <template #label>
          <span class="profile-modal__label">账号</span>
        </template>
        <a-input
          v-model:value="formState.account"
          class="profile-modal__read-only"
          placeholder="当前登录账号"
          disabled
        />
      </a-form-item>

      <div class="profile-modal__password-section">
        <div class="profile-modal__section-badge" data-content-part="status-banner">
          <span class="mdi mdi-lock-reset" aria-hidden="true" />
          <span>修改密码时需先填写旧密码</span>
        </div>

        <a-form-item name="oldPassword" data-field-name="旧密码">
          <template #label>
            <span class="profile-modal__label">旧密码</span>
          </template>
          <a-input-password
            v-model:value="formState.oldPassword"
            placeholder="修改密码时请输入旧密码"
            :visibility-toggle="false"
          />
        </a-form-item>

        <a-form-item name="newPassword" data-field-name="新密码">
          <template #label>
            <span class="profile-modal__label">新密码</span>
          </template>
          <a-input-password
            v-model:value="formState.newPassword"
            placeholder="8-20位，包含字母和数字"
            :visibility-toggle="false"
          />
        </a-form-item>

        <a-form-item name="confirmPassword" data-field-name="确认密码">
          <template #label>
            <span class="profile-modal__label">确认密码</span>
          </template>
          <a-input-password
            v-model:value="formState.confirmPassword"
            placeholder="请再次输入新密码"
            :visibility-toggle="false"
          />
        </a-form-item>
      </div>
    </a-form>

    <template #footer>
      <div data-content-part="action-row" class="profile-modal__actions">
        <a-button class="profile-modal__cancel-btn" data-surface-part="cancel-control" @click="handleClose">取消</a-button>
        <a-button type="primary" class="profile-modal__confirm-btn" :loading="saving" @click="handleSave">
          <span class="mdi mdi-check" aria-hidden="true" />
          <span>保存</span>
        </a-button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { http } from '@osg/shared/utils'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { useUserStore } from '@/stores/user'

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
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const hasPasswordChange = computed(() =>
  Boolean(formState.oldPassword || formState.newPassword || formState.confirmPassword),
)

const validatePassword = (_rule: any, value: string) => {
  if (!hasPasswordChange.value && !value) return Promise.resolve()
  if (!value) return Promise.reject('请输入新密码')
  if (value.length < 8 || value.length > 20) return Promise.reject('密码长度需为8-20位')
  if (!/[a-zA-Z]/.test(value)) return Promise.reject('密码需包含字母')
  if (!/\d/.test(value)) return Promise.reject('密码需包含数字')
  return Promise.resolve()
}

const validateOldPassword = (_rule: any, value: string) => {
  if (!hasPasswordChange.value && !value) return Promise.resolve()
  if (!value) return Promise.reject('请输入旧密码')
  return Promise.resolve()
}

const validateConfirm = (_rule: any, value: string) => {
  if (!hasPasswordChange.value && !value) return Promise.resolve()
  if (!value) return Promise.reject('请确认新密码')
  if (value !== formState.newPassword) return Promise.reject('两次输入的密码不一致')
  return Promise.resolve()
}

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
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
        customErrorMessage: '密码修改失败，请检查输入信息',
      })
    }

    await http.put('/system/user/profile', {
      nickName: formState.name,
      email: userStore.userInfo?.email || '',
      phonenumber: userStore.userInfo?.phonenumber || '',
      sex: userStore.userInfo?.sex,
    }, {
      customErrorMessage: '个人资料修改失败，请检查输入信息',
    })

    await userStore.fetchInfo()
    message.success('保存成功')
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
.profile-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.profile-modal__title-icon {
  font-size: 18px;
  line-height: 1;
}

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

.profile-modal__actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.profile-modal__cancel-btn {
  min-width: 80px;
  border-color: var(--border, #d0d7e2);
  border-radius: 10px;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
}

.profile-modal__confirm-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.profile-modal__read-only :deep(.ant-input[disabled]) {
  color: var(--text-secondary, #64748b);
  background: #f8fafc;
}
</style>
