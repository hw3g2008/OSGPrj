<template>
  <a-modal
    :open="visible"
    :title="isEdit ? '编辑用户' : '新增用户'"
    width="600px"
    @cancel="handleClose"
    @ok="handleSubmit"
    :confirmLoading="loading"
  >
    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
    >
      <a-form-item label="用户名" name="userName">
        <a-input
          v-model:value="formState.userName"
          placeholder="4-20字符，仅字母数字下划线"
          :disabled="isEdit"
          :class="{ 'disabled-input': isEdit }"
        />
      </a-form-item>

      <a-form-item label="姓名" name="nickName">
        <a-input v-model:value="formState.nickName" placeholder="请输入姓名" />
      </a-form-item>

      <a-form-item label="邮箱" name="email">
        <a-input v-model:value="formState.email" placeholder="请输入邮箱" />
      </a-form-item>

      <a-form-item label="手机号" name="phonenumber">
        <a-input v-model:value="formState.phonenumber" placeholder="请输入手机号（选填）" />
      </a-form-item>

      <a-form-item label="角色" name="roleIds">
        <a-checkbox-group v-model:value="formState.roleIds">
          <a-checkbox
            v-for="role in roleOptions"
            :key="role.roleId"
            :value="role.roleId"
          >
            {{ role.roleName }}
          </a-checkbox>
        </a-checkbox-group>
      </a-form-item>

      <a-form-item v-if="!isEdit" label="初始密码">
        <a-input value="Osg@2025" disabled>
          <template #suffix>
            <a-tag color="blue">系统默认</a-tag>
          </template>
        </a-input>
        <p class="tip">用户首次登录后需修改密码</p>
      </a-form-item>

      <a-form-item label="备注" name="remark">
        <a-textarea
          v-model:value="formState.remark"
          placeholder="请输入备注（选填）"
          :rows="3"
          :maxlength="200"
          show-count
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import { addUser, updateUser } from '@/api/user'

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

const isEdit = computed(() => !!props.user)

const formState = reactive({
  userId: undefined as number | undefined,
  userName: '',
  nickName: '',
  email: '',
  phonenumber: '',
  roleIds: [] as number[],
  remark: ''
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
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  roleIds: [{ required: true, message: '请选择角色', trigger: 'change', type: 'array' }]
}

watch(() => props.visible, (val) => {
  if (val) {
    if (props.user) {
      formState.userId = props.user.userId
      formState.userName = props.user.userName
      formState.nickName = props.user.nickName || ''
      formState.email = props.user.email || ''
      formState.phonenumber = props.user.phonenumber || ''
      formState.roleIds = props.user.roles?.map((r: any) => r.roleId) || []
      formState.remark = props.user.remark || ''
    } else {
      formState.userId = undefined
      formState.userName = ''
      formState.nickName = ''
      formState.email = ''
      formState.phonenumber = ''
      formState.roleIds = []
      formState.remark = ''
    }
  }
})

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
        remark: formState.remark || undefined
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
        password: 'Osg@2025'
      })
      message.success('用户新增成功')
    }

    emit('success')
    handleClose()
  } catch (error: any) {
    if (error.errorFields) return
    message.error(error.message || '操作失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.disabled-input {
  background-color: #f5f5f5;
}

.tip {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
  margin-bottom: 0;
}
</style>
