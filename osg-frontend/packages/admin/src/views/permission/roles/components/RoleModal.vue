<template>
  <a-modal
    :open="visible"
    :title="isEdit ? '编辑角色' : '新增角色'"
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
      <a-form-item label="角色名称" name="roleName">
        <a-input v-model:value="formState.roleName" placeholder="请输入角色名称，如：运营专员" />
      </a-form-item>

      <a-form-item label="角色描述" name="remark">
        <a-textarea
          v-model:value="formState.remark"
          placeholder="请输入角色描述"
          :rows="3"
          :maxlength="200"
          show-count
        />
      </a-form-item>

      <a-form-item label="权限模块" name="menuIds">
        <p class="tip">勾选该角色可访问的功能模块，点击分组名称可全选/取消该分组</p>
        <a-tree
          v-model:checkedKeys="formState.menuIds"
          :tree-data="menuTree"
          checkable
          :field-names="{ title: 'label', key: 'id', children: 'children' }"
          :default-expand-all="true"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import { addRole, updateRole, getRoleMenuIds } from '@/api/role'

const props = defineProps<{
  visible: boolean
  role: any
  menuTree: any[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

const formRef = ref()
const loading = ref(false)

const isEdit = computed(() => !!props.role)

const formState = reactive({
  roleId: undefined as number | undefined,
  roleName: '',
  roleKey: '',
  remark: '',
  menuIds: [] as number[]
})

const rules = {
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  menuIds: [{ required: true, message: '请选择权限模块', trigger: 'change', type: 'array' }]
}

watch(() => props.visible, async (val) => {
  if (val) {
    if (props.role) {
      formState.roleId = props.role.roleId
      formState.roleName = props.role.roleName
      formState.roleKey = props.role.roleKey
      formState.remark = props.role.remark || ''
      // 获取已分配的菜单
      try {
        const res = await getRoleMenuIds(props.role.roleId)
        formState.menuIds = res.checkedKeys || []
      } catch (error) {
        formState.menuIds = []
      }
    } else {
      formState.roleId = undefined
      formState.roleName = ''
      formState.roleKey = ''
      formState.remark = ''
      formState.menuIds = []
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

    const data = {
      ...formState,
      roleKey: formState.roleKey || formState.roleName.toLowerCase().replace(/\s+/g, '_')
    }

    if (isEdit.value) {
      await updateRole(data)
      message.success('角色修改成功')
    } else {
      await addRole(data)
      message.success('角色新增成功')
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
.tip {
  color: #999;
  font-size: 12px;
  margin-bottom: 8px;
}
</style>
