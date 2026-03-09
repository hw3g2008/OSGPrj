<template>
  <OverlaySurfaceModal
    :surface-id="surfaceId"
    :open="visible"
    width="500px"
    @cancel="handleClose"
  >
    <template #title>
      <span class="user-modal__title">
        <span
          class="mdi user-modal__title-icon"
          :class="isEdit ? 'mdi-account-edit' : 'mdi-account-plus'"
          aria-hidden="true"
        />
        <span>{{ isEdit ? '编辑用户' : '新增用户' }}</span>
      </span>
    </template>

    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      :required-mark="false"
      class="user-modal__grid"
    >
      <a-form-item name="userName">
        <template #label>
          <span class="user-modal__label">用户名<span class="user-modal__required">*</span></span>
        </template>
        <a-input
          v-model:value="formState.userName"
          placeholder="4-20字符，仅字母数字下划线"
          :disabled="isEdit"
          :class="{ 'user-modal__input--disabled': isEdit }"
        />
        <p class="user-modal__help">用户名创建后不可修改</p>
      </a-form-item>

      <a-form-item name="nickName">
        <template #label>
          <span class="user-modal__label">姓名<span class="user-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.nickName" placeholder="请输入真实姓名" />
      </a-form-item>

      <a-form-item name="email">
        <template #label>
          <span class="user-modal__label">邮箱<span class="user-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.email" placeholder="用于接收通知和密码重置" />
      </a-form-item>

      <a-form-item name="phonenumber">
        <template #label>
          <span class="user-modal__label">手机号</span>
        </template>
        <a-input v-model:value="formState.phonenumber" placeholder="选填" />
      </a-form-item>

      <a-form-item name="roleIds">
        <template #label>
          <span class="user-modal__label">
            {{ isEdit ? '角色' : '角色（可多选）' }}<span class="user-modal__required">*</span>
          </span>
        </template>
        <a-select
          v-if="isEdit"
          v-model:value="selectedRoleId"
          placeholder="请选择角色"
          size="large"
        >
          <a-select-option v-for="role in roleOptions" :key="role.roleId" :value="role.roleId">
            {{ role.roleName }}
          </a-select-option>
        </a-select>

        <div v-else class="user-modal__role-panel">
          <label
            v-for="role in roleOptions"
            :key="role.roleId"
            class="user-modal__role-item"
          >
            <input
              type="checkbox"
              :checked="formState.roleIds.includes(role.roleId)"
              @change="toggleRole(role.roleId, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ role.roleName }}</span>
          </label>
        </div>
      </a-form-item>

      <a-form-item v-if="!isEdit">
        <template #label>
          <span class="user-modal__label">初始密码</span>
        </template>
        <div class="user-modal__default-password">
          <span class="user-modal__default-password-text">Osg@2025</span>
          <span class="user-modal__default-password-tag">系统默认</span>
        </div>
        <p class="user-modal__help">用户首次登录后需修改密码</p>
      </a-form-item>

      <a-form-item name="remark">
        <template #label>
          <span class="user-modal__label">备注</span>
        </template>
        <a-textarea
          v-model:value="formState.remark"
          placeholder="选填，最多200字"
          :rows="3"
          :maxlength="200"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button class="user-modal__cancel-btn" @click="handleClose">取消</a-button>
      <a-button class="user-modal__confirm-btn" :loading="loading" @click="handleSubmit">
        <span class="mdi mdi-check" aria-hidden="true" />
        <span>保存</span>
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { addUser, updateUser } from '@/api/user'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

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

const formState = reactive({
  userId: undefined as number | undefined,
  userName: '',
  nickName: '',
  email: '',
  phonenumber: '',
  roleIds: [] as number[],
  remark: '',
})

const selectedRoleId = computed<number | undefined>({
  get: () => formState.roleIds[0],
  set: (value) => {
    formState.roleIds = value ? [value] : []
  },
})

const validateUsername = (_rule: any, value: string) => {
  if (!value) return Promise.reject('请输入用户名')
  if (value.length < 4 || value.length > 20) return Promise.reject('用户名长度4-20字符')
  if (!/^[a-zA-Z0-9_]+$/.test(value)) return Promise.reject('仅允许字母、数字和下划线')
  return Promise.resolve()
}

const rules = {
  userName: [{ required: true, validator: validateUsername, trigger: 'blur' }],
  nickName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  roleIds: [{ required: true, message: '请选择角色', trigger: 'change', type: 'array' }],
}

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
        nickName: formState.nickName,
        email: formState.email,
        phonenumber: formState.phonenumber || undefined,
        roleIds: formState.roleIds,
        remark: formState.remark || undefined,
      })
      message.success('用户修改成功')
    } else {
      await addUser({
        userName: formState.userName,
        nickName: formState.nickName,
        email: formState.email,
        phonenumber: formState.phonenumber || undefined,
        roleIds: formState.roleIds,
        remark: formState.remark || undefined,
        password: 'Osg@2025',
      })
      message.success('用户新增成功')
    }

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
.user-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.user-modal__title-icon {
  font-size: 18px;
  line-height: 1;
}

.user-modal__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text, #1e293b);
  font-size: 14px;
  font-weight: 600;
}

.user-modal__required {
  color: #ef4444;
}

.user-modal__grid {
  display: grid;
  grid-template-columns: 1fr;
}

.user-modal__input--disabled {
  background-color: var(--bg, #f8fafc);
}

.user-modal__help {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--text-secondary, #94a3b8);
}

.user-modal__role-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid var(--border, #e2e8f0);
}

.user-modal__role-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}

.user-modal__default-password {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 12px;
  background: var(--bg, #f8fafc);
}

.user-modal__default-password-text {
  font-weight: 600;
  color: var(--text, #1e293b);
}

.user-modal__default-password-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 68px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.12);
  color: var(--primary, #6366f1);
  font-size: 12px;
  font-weight: 600;
}

.user-modal__cancel-btn {
  border-color: var(--border, #d0d7e2);
  border-radius: 10px;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
  min-width: 88px;
}

.user-modal__confirm-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 112px;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  background: var(--primary-gradient, linear-gradient(135deg, #4f46e5, #8b5cf6));
  box-shadow: none;

  &:hover,
  &:focus {
    color: #fff;
    background: var(--primary-gradient, linear-gradient(135deg, #4f46e5, #8b5cf6));
    opacity: 0.96;
  }
}
</style>
