<template>
  <OverlaySurfaceModal
    :surface-id="surfaceId"
    :open="visible"
    width="640px"
    :body-class="bodyClass"
    @cancel="handleClose"
  >
    <template #title>
      <span class="user-modal__title">
        <span
          class="mdi user-modal__title-icon"
          :class="isEdit ? 'mdi-account-edit' : 'mdi-account-plus'"
          aria-hidden="true"
        />
        <span>{{ isEdit ? t('admin.permission.users.modal.titleEdit') : t('admin.permission.users.modal.titleCreate') }}</span>
      </span>
    </template>

    <div class="user-modal__note" data-content-part="supporting-text">
      <span class="mdi mdi-shield-account user-modal__note-icon" aria-hidden="true" />
      <span>
        {{ isEdit
          ? t('admin.permission.users.modal.noteEdit')
          : t('admin.permission.users.modal.noteCreate') }}
      </span>
    </div>

    <a-form
      ref="formRef"
      data-content-part="field-group"
      :model="formState"
      :rules="rules"
      layout="vertical"
      :required-mark="false"
      class="user-modal__grid"
    >
      <a-form-item name="userName" class="user-modal__field">
        <template #label>
          <span class="user-modal__label">
            {{ t('admin.permission.users.modal.usernameLabel') }}<span v-if="!isEdit" class="user-modal__required">*</span>
          </span>
        </template>
        <a-input
          v-model:value="formState.userName"
          :placeholder="t('admin.permission.users.modal.usernamePlaceholder')"
          :disabled="isEdit"
          :class="{ 'user-modal__input--disabled': isEdit }"
        />
        <p class="user-modal__help">{{ isEdit ? t('admin.permission.users.modal.usernameHelpEdit') : t('admin.permission.users.modal.usernameHelpCreate') }}</p>
      </a-form-item>

      <a-form-item name="nickName" class="user-modal__field">
        <template #label>
          <span class="user-modal__label">{{ t('admin.permission.users.modal.nickNameLabel') }}<span class="user-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.nickName" :placeholder="t('admin.permission.users.modal.nickNamePlaceholder')" />
      </a-form-item>

      <a-form-item name="email" class="user-modal__field">
        <template #label>
          <span class="user-modal__label">{{ t('admin.permission.users.modal.emailLabel') }}<span class="user-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.email" :placeholder="t('admin.permission.users.modal.emailPlaceholder')" />
      </a-form-item>

      <a-form-item name="phonenumber" class="user-modal__field">
        <template #label>
          <span class="user-modal__label">{{ t('admin.permission.users.modal.phoneLabel') }}</span>
        </template>
        <a-input v-model:value="formState.phonenumber" :placeholder="t('admin.permission.users.modal.phonePlaceholder')" />
      </a-form-item>

      <a-form-item name="roleIds" class="user-modal__field user-modal__field--span-2">
        <template #label>
          <span class="user-modal__label">
            {{ t('admin.permission.users.modal.roleLabel') }}<span class="user-modal__required">*</span>
            <span class="user-modal__meta">{{ t('admin.permission.users.modal.roleMultiHint') }}</span>
          </span>
        </template>

        <div class="user-modal__role-panel">
          <a-checkbox
            v-for="role in roleOptions"
            :key="role.roleId"
            :checked="formState.roleIds.includes(role.roleId)"
            @change="(e: any) => toggleRole(role.roleId, e.target.checked)"
          >
            {{ role.roleName }}
          </a-checkbox>
        </div>
      </a-form-item>

      <a-form-item v-if="!isEdit" class="user-modal__field user-modal__field--span-2" data-field-name="初始密码">
        <template #label>
          <span class="user-modal__label">{{ t('admin.permission.users.modal.defaultPwdLabel') }}</span>
        </template>
        <div class="user-modal__default-password">
          <div class="user-modal__default-password-input">Osg@2026</div>
          <span class="user-modal__default-password-tag">{{ t('admin.permission.users.modal.defaultPwdTag') }}</span>
        </div>
        <p class="user-modal__help">{{ t('admin.permission.users.modal.defaultPwdHelp') }}</p>
      </a-form-item>

      <a-form-item name="remark" class="user-modal__field user-modal__field--span-2">
        <template #label>
          <span class="user-modal__label">{{ t('admin.permission.users.modal.remarkLabel') }}</span>
        </template>
        <a-textarea
          v-model:value="formState.remark"
          :placeholder="t('admin.permission.users.modal.remarkPlaceholder')"
          :rows="3"
          :maxlength="200"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleClose">{{ t('admin.permission.users.modal.cancel') }}</a-button>
      <a-button type="primary" :loading="loading" @click="handleSubmit">{{ t('admin.permission.users.modal.save') }}</a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { addUser, updateUser } from '@/api/user'
import { OverlaySurfaceModal } from '@osg/shared/components'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  user: any
  roleOptions: any[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

const formRef = ref()
const loading = ref(false)

const isEdit = computed(() => Boolean(props.user))
const surfaceId = computed(() => (isEdit.value ? 'modal-edit-admin' : 'modal-add-admin'))
const bodyClass = computed(() =>
  isEdit.value ? 'osg-modal-form user-modal__body user-modal__body--edit' : 'osg-modal-form user-modal__body user-modal__body--create',
)

const formState = reactive({
  userId: undefined as number | undefined,
  userName: '',
  nickName: '',
  email: '',
  phonenumber: '',
  roleIds: [] as number[],
  remark: '',
})

const validateUsername = (_rule: any, value: string) => {
  if (!value) return Promise.reject(t('admin.permission.users.modal.validUsernameRequired'))
  if (value.length < 4 || value.length > 20) return Promise.reject(t('admin.permission.users.modal.validUsernameLength'))
  if (!/^[a-zA-Z0-9_]+$/.test(value)) return Promise.reject(t('admin.permission.users.modal.validUsernameChars'))
  return Promise.resolve()
}

const rules = computed(() => ({
  userName: [{ required: true, validator: validateUsername, trigger: 'blur' }],
  nickName: [{ required: true, message: t('admin.permission.users.modal.validNickNameRequired'), trigger: 'blur' }],
  email: [
    { required: true, message: t('admin.permission.users.modal.validEmailRequired'), trigger: 'blur' },
    { type: 'email', message: t('admin.permission.users.modal.validEmailFormat'), trigger: 'blur' },
  ],
  roleIds: [{ required: true, message: t('admin.permission.users.modal.validRoleRequired'), trigger: 'change', type: 'array' }],
}))

const resetFormState = () => {
  formState.userId = undefined
  formState.userName = ''
  formState.nickName = ''
  formState.email = ''
  formState.phonenumber = ''
  formState.roleIds = []
  formState.remark = ''
}

const toggleRole = (roleId: number, checked: boolean) => {
  const next = new Set(formState.roleIds)
  if (checked) next.add(roleId)
  else next.delete(roleId)
  formState.roleIds = Array.from(next)
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return

    if (props.user) {
      formState.userId = props.user.userId
      formState.userName = props.user.userName
      formState.nickName = props.user.nickName || ''
      formState.email = props.user.email || ''
      formState.phonenumber = props.user.phonenumber || ''
      formState.roleIds = props.user.roles?.map((role: any) => role.roleId) || []
      formState.remark = props.user.remark || ''
      return
    }

    resetFormState()
  },
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    if (isEdit.value) {
      await updateUser({
        userId: formState.userId!,
        userName: formState.userName,
        nickName: formState.nickName,
        email: formState.email,
        phonenumber: formState.phonenumber || undefined,
        roleIds: formState.roleIds,
        remark: formState.remark || undefined,
      })
      message.success(t('admin.permission.users.modal.updateSuccess'))
    } else {
      await addUser({
        userName: formState.userName,
        nickName: formState.nickName,
        email: formState.email,
        phonenumber: formState.phonenumber || undefined,
        roleIds: formState.roleIds,
        remark: formState.remark || undefined,
        password: 'Osg@2026',
      })
      message.success(t('admin.permission.users.modal.createSuccess'))
    }

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
.user-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #1a2234;
  font-family: 'Space Grotesk', 'Avenir Next', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.user-modal__title-icon {
  color: #4f74ff;
  font-size: 18px;
  line-height: 1;
}

.user-modal__note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 13px;
  line-height: 1.6;
}

.user-modal__note-icon {
  font-size: 18px;
  line-height: 1;
}

.user-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
}

.user-modal__field--span-2 {
  grid-column: 1 / -1;
}

.user-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #1a2234;
  font-size: 14px;
  font-weight: 600;
}

.user-modal__required {
  color: #d35d53;
}

.user-modal__meta {
  color: #8f99aa;
  font-size: 11px;
  font-weight: 500;
}

.user-modal__input--disabled {
  background-color: #f4f5f7;
}

.user-modal__help {
  margin-top: 4px;
  color: #69758b;
  font-size: 12px;
  line-height: 1.6;
}

.user-modal__role-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 8px;
}

.user-modal__default-password {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-modal__default-password-input {
  flex: 1;
  min-height: 48px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px dashed rgba(79, 116, 255, 0.3);
  background: #f9fbff;
  color: #1a2234;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
  font-size: 14px;
  font-weight: 700;
}

.user-modal__default-password-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 76px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(79, 116, 255, 0.12);
  color: #3f68ff;
  font-size: 12px;
  font-weight: 700;
}

</style>
