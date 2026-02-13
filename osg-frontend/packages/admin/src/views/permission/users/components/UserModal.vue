<template>
  <a-modal
    :open="visible"
    :title="isEdit ? '编辑用户' : '新增用户'"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
    width="500px"
  >
    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      :label-col="{ span: 5 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-form-item label="用户名" name="userName">
        <a-input
          v-model:value="formState.userName"
          placeholder="4-20字符，仅字母数字下划线"
          :disabled="isEdit"
        />
      </a-form-item>

      <a-form-item label="姓名" name="nickName">
        <a-input v-model:value="formState.nickName" placeholder="请输入真实姓名" />
      </a-form-item>

      <a-form-item label="邮箱" name="email">
        <a-input v-model:value="formState.email" placeholder="请输入邮箱地址" />
      </a-form-item>

      <a-form-item label="手机号" name="phonenumber">
        <a-input v-model:value="formState.phonenumber" placeholder="选填" />
      </a-form-item>

      <a-form-item label="角色" name="roleIds">
        <a-checkbox-group v-model:value="formState.roleIds">
          <div class="role-checkbox-list">
            <a-checkbox
              v-for="role in roleOptions"
              :key="role.roleId"
              :value="role.roleId"
            >
              {{ role.roleName }}
            </a-checkbox>
          </div>
        </a-checkbox-group>
      </a-form-item>

      <a-form-item v-if="!isEdit" label="初始密码">
        <a-input value="Osg@2025" disabled>
          <template #suffix>
            <span class="default-pwd-tag">系统默认</span>
          </template>
        </a-input>
        <div class="pwd-hint">用户首次登录后需修改密码</div>
      </a-form-item>

      <a-form-item label="备注" name="remark">
        <a-textarea
          v-model:value="formState.remark"
          placeholder="选填，最多200字"
          :maxlength="200"
          :rows="3"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import { addUser, updateUser } from '@/api/user'

interface Props {
  visible: boolean
  user: any | null
  roleOptions: any[]
}

const props = defineProps<Props>()
const emit = defineEmits(['update:visible', 'success'])

const formRef = ref<FormInstance>()
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

const rules: Record<string, Rule[]> = {
  userName: [
    { required: true, message: '请输入用户名' },
    { pattern: /^[a-zA-Z0-9_]{4,20}$/, message: '4-20字符，仅字母数字下划线' }
  ],
  nickName: [{ required: true, message: '请输入姓名' }],
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入正确的邮箱格式' }
  ],
  roleIds: [{ required: true, message: '请至少选择一个角色', type: 'array', min: 1 }]
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.user) {
        // 编辑模式：回填数据
        formState.userId = props.user.userId
        formState.userName = props.user.userName
        formState.nickName = props.user.nickName
        formState.email = props.user.email
        formState.phonenumber = props.user.phonenumber || ''
        formState.roleIds = props.user.roles?.map((r: any) => r.roleId) || []
        formState.remark = props.user.remark || ''
      } else {
        // 新增模式：重置表单
        formState.userId = undefined
        formState.userName = ''
        formState.nickName = ''
        formState.email = ''
        formState.phonenumber = ''
        formState.roleIds = []
        formState.remark = ''
      }
    }
  }
)

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true

    const data = {
      ...formState,
      password: isEdit.value ? undefined : 'Osg@2025'
    }

    if (isEdit.value) {
      await updateUser(data as any)
      message.success('用户更新成功')
    } else {
      await addUser(data as any)
      message.success('用户创建成功')
    }

    emit('update:visible', false)
    emit('success')
  } catch (error: any) {
    if (error?.errorFields) return // 表单验证错误
    message.error(isEdit.value ? '更新失败' : '创建失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
.role-checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.default-pwd-tag {
  color: #999;
  font-size: 12px;
}

.pwd-hint {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}
</style>
