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
        <span>{{ isEdit ? '编辑用户' : '新增用户' }}</span>
      </span>
    </template>

    <div class="user-modal__note" data-content-part="supporting-text">
      <span class="mdi mdi-shield-account user-modal__note-icon" aria-hidden="true" />
      <span>
        {{ isEdit
          ? '编辑模式下可更新用户资料、角色与联系方式，用户名保持锁定。'
          : '新增用户会同步生成默认密码，并将角色与资料直接写入后台台账。' }}
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
            用户名<span v-if="!isEdit" class="user-modal__required">*</span>
          </span>
        </template>
        <a-input
          v-model:value="formState.userName"
          placeholder="4-20字符，仅字母数字下划线"
          :disabled="isEdit"
          :class="{ 'user-modal__input--disabled': isEdit }"
        />
        <p class="user-modal__help">{{ isEdit ? '用户名不可修改' : '用户名创建后不可修改' }}</p>
      </a-form-item>

      <a-form-item name="nickName" class="user-modal__field">
        <template #label>
          <span class="user-modal__label">姓名<span class="user-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.nickName" placeholder="请输入真实姓名" />
      </a-form-item>

      <a-form-item name="email" class="user-modal__field">
        <template #label>
          <span class="user-modal__label">邮箱<span class="user-modal__required">*</span></span>
        </template>
        <a-input v-model:value="formState.email" placeholder="用于接收通知和密码重置" />
      </a-form-item>

      <a-form-item name="phonenumber" class="user-modal__field">
        <template #label>
          <span class="user-modal__label">手机号</span>
        </template>
        <a-input v-model:value="formState.phonenumber" placeholder="选填" />
      </a-form-item>

      <a-form-item name="roleIds" class="user-modal__field user-modal__field--span-2">
        <template #label>
          <span class="user-modal__label">
            角色<span class="user-modal__required">*</span>
            <span class="user-modal__meta">（可多选）</span>
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

      <a-form-item v-if="!isEdit" data-field-name="初始密码" class="user-modal__field user-modal__field--span-2">
        <template #label>
          <span class="user-modal__label">初始密码</span>
        </template>
        <div class="user-modal__default-password">
          <div class="user-modal__default-password-input">Osg@2026</div>
          <span class="user-modal__default-password-tag">系统默认</span>
        </div>
        <p class="user-modal__help">用户首次登录后需修改密码</p>
      </a-form-item>

      <a-form-item name="remark" class="user-modal__field user-modal__field--span-2">
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
      <a-button @click="handleClose">取消</a-button>
      <a-button type="primary" :loading="loading" @click="handleSubmit">保存</a-button>
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
const bodyClass = computed(() =>
  isEdit.value ? 'user-modal__body user-modal__body--edit' : 'user-modal__body user-modal__body--create',
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
        userName: formState.userName,
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
        password: 'Osg@2026',
      })
      message.success('用户新增成功')
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
